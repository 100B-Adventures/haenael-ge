-- Google User Choice Billing external transaction reporting worker.
-- Production scheduling remains inert until Vault values are explicitly provisioned.
BEGIN;

CREATE OR REPLACE FUNCTION public.claim_google_external_transaction_batch(
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  purchase_id bigint,
  external_transaction_token_enc bytea,
  external_transaction_id text,
  transaction_time timestamptz,
  pretax_amount_minor integer,
  tax_amount_minor integer,
  user_tax_region text,
  attempt_count integer
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH target AS (
    SELECT queue.purchase_id
    FROM public.google_external_transaction AS queue
    WHERE queue.report_status = 'PENDING'
      AND queue.next_attempt_at <= now()
      AND queue.attempt_count < 12
    ORDER BY queue.report_due_at, queue.purchase_id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.google_external_transaction AS queue
  SET attempt_count = queue.attempt_count + 1,
      next_attempt_at = now() + interval '5 minutes'
  WHERE queue.purchase_id IN (SELECT target.purchase_id FROM target)
  RETURNING
    queue.purchase_id,
    queue.external_transaction_token_enc,
    queue.external_transaction_id,
    queue.transaction_time,
    queue.pretax_amount_minor,
    queue.tax_amount_minor,
    queue.user_tax_region,
    queue.attempt_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_google_external_transaction(
  p_purchase_id bigint,
  p_success boolean,
  p_permanent boolean DEFAULT false,
  p_error_code text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hit integer;
  v_due_at timestamptz;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.google_external_transaction AS queue
  SET report_status = CASE
        WHEN p_success THEN 'REPORTED'
        WHEN p_permanent OR queue.attempt_count >= 12 THEN 'PERMANENT_FAILURE'
        ELSE 'PENDING'
      END,
      reported_at = CASE WHEN p_success THEN now() ELSE queue.reported_at END,
      next_attempt_at = CASE
        WHEN p_success OR p_permanent OR queue.attempt_count >= 12
          THEN queue.next_attempt_at
        ELSE now() + (
          LEAST(3600, 30 * power(2, LEAST(queue.attempt_count, 7)))::integer *
          interval '1 second'
        )
      END,
      last_error_code = CASE WHEN p_success THEN NULL ELSE left(COALESCE(p_error_code, 'google_report_failed'), 120) END
  WHERE queue.purchase_id = p_purchase_id
    AND queue.report_status = 'PENDING'
  RETURNING queue.report_due_at INTO v_due_at;
  GET DIAGNOSTICS v_hit = ROW_COUNT;
  IF v_hit = 1 AND NOT p_success AND v_due_at <= now() THEN
    INSERT INTO public.ops_event(event_type, severity, details)
    VALUES (
      'GOOGLE_EXTERNAL_TRANSACTION_REPORT_OVERDUE',
      'ERROR',
      jsonb_build_object(
        'purchase_id', p_purchase_id,
        'permanent', p_permanent,
        'error_code', left(COALESCE(p_error_code, 'google_report_failed'), 120)
      )
    );
  END IF;
  RETURN v_hit = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_google_external_transaction_batch(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_google_external_transaction(bigint,boolean,boolean,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_google_external_transaction_batch(integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_google_external_transaction(bigint,boolean,boolean,text)
  TO service_role;

DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    CREATE EXTENSION IF NOT EXISTS pg_net;
    IF NOT EXISTS (
      SELECT 1 FROM cron.job
      WHERE jobname = 'report-google-external-transactions'
    ) THEN
      PERFORM cron.schedule(
        'report-google-external-transactions',
        '*/10 * * * *',
        $CRON$
        DO $report$
        DECLARE
          v_url text;
          v_apikey text;
          v_token text;
        BEGIN
          SELECT
            max(decrypted_secret) FILTER (WHERE name='google_external_report_url'),
            max(decrypted_secret) FILTER (WHERE name='edge_invoke_publishable_key'),
            max(decrypted_secret) FILTER (WHERE name='google_external_report_internal_token')
          INTO v_url, v_apikey, v_token
          FROM vault.decrypted_secrets
          WHERE name IN (
            'google_external_report_url',
            'edge_invoke_publishable_key',
            'google_external_report_internal_token'
          );
          IF v_url IS NOT NULL AND v_apikey IS NOT NULL AND v_token IS NOT NULL THEN
            PERFORM net.http_post(
              url := v_url,
              headers := jsonb_build_object(
                'Content-Type','application/json',
                'apikey',v_apikey,
                'x-google-report-internal-token',v_token
              ),
              body := '{}'::jsonb,
              timeout_milliseconds := 55000
            );
          ELSE
            RAISE WARNING 'Google external transaction report Vault secrets are incomplete';
          END IF;
        END
        $report$;
        $CRON$
      );
    END IF;
  EXCEPTION WHEN insufficient_privilege OR feature_not_supported OR undefined_file
    OR undefined_table OR invalid_schema_name THEN
    RAISE NOTICE 'Google external transaction report schedule registration skipped: %', SQLERRM;
  END;
END $$;

COMMIT;
