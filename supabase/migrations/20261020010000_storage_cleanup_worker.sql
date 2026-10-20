-- V2 social viral loop: abandoned cover cleanup and atomic Storage queue ownership.
-- The Storage object identity is always (bucket_id, object_path).
BEGIN;

ALTER TABLE public.storage_cleanup_queue
  DROP CONSTRAINT IF EXISTS storage_cleanup_queue_reason_check;
ALTER TABLE public.storage_cleanup_queue
  ADD CONSTRAINT storage_cleanup_queue_reason_check
  CHECK (reason IN ('VISIBILITY_DOWNGRADE', 'ASSET_REPLACED', 'ASSET_REJECTED', 'ABANDONED_UPLOAD'));

ALTER TABLE public.storage_cleanup_queue
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS lock_token uuid,
  ADD COLUMN IF NOT EXISTS lease_until timestamptz;

CREATE TABLE IF NOT EXISTS public.ops_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ops_event ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ops_event FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.ops_event TO service_role;

CREATE OR REPLACE FUNCTION public.record_storage_cleanup_schedule_failure(
  p_stage text, p_sqlstate text, p_message text
)
RETURNS bigint
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_id bigint;
BEGIN
  INSERT INTO public.ops_event(event_type, severity, details)
  VALUES (
    'STORAGE_CLEANUP_SCHEDULE_FAILED',
    'ERROR',
    jsonb_build_object('stage', p_stage, 'sqlstate', p_sqlstate, 'message', left(p_message, 500))
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE INDEX IF NOT EXISTS goal_cover_asset_abandoned_idx
  ON public.goal_cover_asset(created_at)
  WHERE status = 'UPLOADING';

CREATE INDEX IF NOT EXISTS goal_cover_asset_tombstone_idx
  ON public.goal_cover_asset(created_at)
  WHERE status = 'DELETED';

CREATE INDEX IF NOT EXISTS storage_cleanup_queue_claimable_idx
  ON public.storage_cleanup_queue(status, lease_until, created_at)
  WHERE status IN ('PENDING', 'FAILED');

CREATE OR REPLACE FUNCTION public.purge_abandoned_goal_covers(
  p_older_than interval DEFAULT interval '24 hours'
)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_count integer := 0;
BEGIN
  WITH target AS (
    SELECT a.id, a.goal_id, a.quarantine_path
    FROM public.goal_cover_asset AS a
    WHERE a.status = 'UPLOADING'
      AND a.created_at < now() - p_older_than
      AND NOT EXISTS (
        SELECT 1 FROM public.goal AS g
        WHERE g.active_cover_asset_id = a.id
      )
    FOR UPDATE SKIP LOCKED
  ), queued AS (
    INSERT INTO public.storage_cleanup_queue (goal_id, bucket_id, object_path, reason)
    SELECT t.goal_id, 'goal-cover-quarantine', t.quarantine_path, 'ABANDONED_UPLOAD'
    FROM target AS t
    RETURNING 1
  ), marked AS (
    UPDATE public.goal_cover_asset AS a
    SET status = 'DELETED'
    WHERE a.id IN (SELECT id FROM target)
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM marked;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.requeue_orphan_cover_tombstones(
  p_older_than interval DEFAULT interval '24 hours'
)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_count integer := 0;
BEGIN
  WITH target AS (
    SELECT a.id, a.goal_id, a.quarantine_path
    FROM public.goal_cover_asset AS a
    WHERE a.status = 'DELETED'
      AND a.created_at < now() - p_older_than
      AND NOT EXISTS (
        SELECT 1 FROM public.storage_cleanup_queue AS q
        WHERE q.bucket_id = 'goal-cover-quarantine'
          AND q.object_path = a.quarantine_path
          AND q.status IN ('PENDING', 'FAILED')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.goal AS g
        WHERE g.active_cover_asset_id = a.id
      )
    FOR UPDATE SKIP LOCKED
  ), queued AS (
    INSERT INTO public.storage_cleanup_queue (goal_id, bucket_id, object_path, reason)
    SELECT t.goal_id, 'goal-cover-quarantine', t.quarantine_path, 'ABANDONED_UPLOAD'
    FROM target AS t
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM queued;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_storage_cleanup_batch(
  p_limit integer DEFAULT 200,
  p_lease interval DEFAULT interval '15 minutes'
)
RETURNS TABLE(id bigint, bucket_id text, object_path text, lock_token uuid)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_token uuid := extensions.gen_random_uuid();
BEGIN
  RETURN QUERY
  WITH target AS (
    SELECT q.id
    FROM public.storage_cleanup_queue AS q
    WHERE q.status IN ('PENDING', 'FAILED')
      AND q.attempts < 5
      AND (q.lease_until IS NULL OR q.lease_until < now())
    ORDER BY q.created_at
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.storage_cleanup_queue AS q
  SET locked_at = now(), lease_until = now() + p_lease, lock_token = v_token
  WHERE q.id IN (SELECT t.id FROM target AS t)
  RETURNING q.id, q.bucket_id, q.object_path, q.lock_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_storage_cleanup(
  p_id bigint, p_lock_token uuid, p_ok boolean
)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_hit integer; v_path text; v_bucket text; v_attempts integer;
BEGIN
  UPDATE public.storage_cleanup_queue AS q
  SET status       = CASE WHEN p_ok THEN 'DONE' ELSE 'FAILED' END,
      attempts     = CASE WHEN p_ok THEN q.attempts ELSE q.attempts + 1 END,
      completed_at = CASE WHEN p_ok THEN now() ELSE NULL END,
      locked_at    = NULL,
      lease_until  = NULL,
      lock_token   = NULL
  WHERE q.id = p_id
    AND q.lock_token = p_lock_token
  RETURNING q.object_path, q.bucket_id, q.attempts INTO v_path, v_bucket, v_attempts;
  GET DIAGNOSTICS v_hit = ROW_COUNT;
  IF v_hit <> 1 THEN RETURN false; END IF;

  IF p_ok THEN
    DELETE FROM public.goal_cover_asset AS a
    WHERE v_bucket = 'goal-cover-quarantine'
      AND a.quarantine_path = v_path
      AND a.status = 'DELETED'
      AND NOT EXISTS (
        SELECT 1 FROM public.goal AS g WHERE g.active_cover_asset_id = a.id
      );
  ELSIF v_attempts >= 5 THEN
    INSERT INTO public.ops_event(event_type, severity, details)
    VALUES (
      'STORAGE_CLEANUP_DEAD_LETTER',
      'ERROR',
      jsonb_build_object('queue_id', p_id, 'bucket_id', v_bucket, 'object_path', v_path, 'attempts', v_attempts)
    );
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_abandoned_goal_covers(interval) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.requeue_orphan_cover_tombstones(interval) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_storage_cleanup_batch(integer, interval) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_storage_cleanup(bigint, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_storage_cleanup_schedule_failure(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_abandoned_goal_covers(interval) TO service_role;
GRANT EXECUTE ON FUNCTION public.requeue_orphan_cover_tombstones(interval) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_storage_cleanup_batch(integer, interval) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_storage_cleanup(bigint, uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_storage_cleanup_schedule_failure(text, text, text) TO service_role;

DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN insufficient_privilege OR feature_not_supported OR undefined_file THEN
    PERFORM public.record_storage_cleanup_schedule_failure('pg_cron', SQLSTATE, SQLERRM);
    RETURN;
  END;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-abandoned-goal-covers') THEN
    PERFORM cron.schedule(
      'purge-abandoned-goal-covers',
      '17 4 * * *',
      $CRON$SELECT public.purge_abandoned_goal_covers(); SELECT public.requeue_orphan_cover_tombstones();$CRON$
    );
  END IF;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drain-storage-cleanup-queue') THEN
      PERFORM cron.schedule(
        'drain-storage-cleanup-queue',
        '*/10 * * * *',
        $CRON$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'storage_cleanup_worker_url'),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'edge_invoke_publishable_key'),
            'x-cleanup-internal-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'storage_cleanup_internal_token')
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 55000
        );
        $CRON$
      );
    END IF;
  EXCEPTION WHEN insufficient_privilege OR feature_not_supported OR undefined_file OR undefined_table OR invalid_schema_name THEN
    PERFORM public.record_storage_cleanup_schedule_failure('pg_net_or_vault', SQLSTATE, SQLERRM);
  END;
EXCEPTION WHEN undefined_table OR invalid_schema_name OR insufficient_privilege THEN
  PERFORM public.record_storage_cleanup_schedule_failure('cron_registration', SQLSTATE, SQLERRM);
END $$;

COMMIT;
