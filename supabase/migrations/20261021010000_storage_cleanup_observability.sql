-- Keep storage cleanup observable even when pg_net only accepts a request and
-- the remote worker never drains the queue.
BEGIN;

CREATE OR REPLACE FUNCTION public.monitor_storage_cleanup_drain(
  p_stale_after interval DEFAULT interval '20 minutes'
)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_stalled integer;
  v_oldest timestamptz;
BEGIN
  SELECT count(*)::integer, min(q.created_at)
  INTO v_stalled, v_oldest
  FROM public.storage_cleanup_queue AS q
  WHERE q.status IN ('PENDING', 'FAILED')
    AND q.attempts < 5
    AND q.created_at < now() - p_stale_after
    AND (q.lease_until IS NULL OR q.lease_until < now());

  IF v_stalled > 0 AND NOT EXISTS (
    SELECT 1
    FROM public.ops_event AS e
    WHERE e.event_type = 'STORAGE_CLEANUP_DRAIN_STALLED'
      AND e.created_at >= now() - interval '10 minutes'
  ) THEN
    INSERT INTO public.ops_event(event_type, severity, details)
    VALUES (
      'STORAGE_CLEANUP_DRAIN_STALLED',
      'ERROR',
      jsonb_build_object(
        'stalled_count', v_stalled,
        'oldest_created_at', v_oldest,
        'stale_after_seconds', extract(epoch FROM p_stale_after)::bigint
      )
    );
  END IF;

  RETURN v_stalled;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'storage_cleanup_drain_monitor_failed sqlstate=% message=%', SQLSTATE, SQLERRM;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.monitor_storage_cleanup_drain(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monitor_storage_cleanup_drain(interval) TO service_role;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'drain-storage-cleanup-queue';

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.alter_job(
      v_job_id,
      command := $CRON$
      DO $cleanup$
      DECLARE
        v_url text;
        v_apikey text;
        v_internal_token text;
        v_missing text;
      BEGIN
        SELECT
          max(decrypted_secret) FILTER (WHERE name = 'storage_cleanup_worker_url'),
          max(decrypted_secret) FILTER (WHERE name = 'edge_invoke_publishable_key'),
          max(decrypted_secret) FILTER (WHERE name = 'storage_cleanup_internal_token')
        INTO v_url, v_apikey, v_internal_token
        FROM vault.decrypted_secrets
        WHERE name IN (
          'storage_cleanup_worker_url',
          'edge_invoke_publishable_key',
          'storage_cleanup_internal_token'
        );

        SELECT string_agg(name, ', ' ORDER BY name)
        INTO v_missing
        FROM (VALUES
          ('storage_cleanup_worker_url', v_url),
          ('edge_invoke_publishable_key', v_apikey),
          ('storage_cleanup_internal_token', v_internal_token)
        ) AS required_secret(name, secret_value)
        WHERE secret_value IS NULL OR secret_value = '';

        IF v_missing IS NOT NULL THEN
          PERFORM public.record_storage_cleanup_schedule_failure(
            'runtime_secret_missing',
            'P0001',
            'missing Vault secret names: ' || v_missing
          );
        ELSE
          PERFORM net.http_post(
            url := v_url,
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'apikey', v_apikey,
              'x-cleanup-internal-token', v_internal_token
            ),
            body := '{}'::jsonb,
            timeout_milliseconds := 55000
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        BEGIN
          PERFORM public.record_storage_cleanup_schedule_failure('runtime_dispatch', SQLSTATE, SQLERRM);
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'storage_cleanup_schedule_failure_unrecorded stage=runtime_dispatch sqlstate=% message=%', SQLSTATE, SQLERRM;
          RAISE;
        END;
      END
      $cleanup$;
      $CRON$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monitor-storage-cleanup-drain') THEN
    PERFORM cron.schedule(
      'monitor-storage-cleanup-drain',
      '*/10 * * * *',
      $CRON$SELECT public.monitor_storage_cleanup_drain(interval '20 minutes');$CRON$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    PERFORM public.record_storage_cleanup_schedule_failure('observability_registration', SQLSTATE, SQLERRM);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'storage_cleanup_schedule_failure_unrecorded stage=observability_registration sqlstate=% message=%', SQLSTATE, SQLERRM;
    RAISE;
  END;
END $$;

COMMIT;
