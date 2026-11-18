-- Independent review fixes for app-channel purchase safety.
-- Additive only. Production application remains gated by explicit deployment approval.
BEGIN;

CREATE TABLE public.store_product_catalog (
  provider text NOT NULL CHECK (provider IN ('APPLE', 'GOOGLE_PLAY', 'GOOGLE_ALTERNATIVE', 'TOSS_IAP')),
  product_id text NOT NULL CHECK (length(product_id) BETWEEN 3 AND 160),
  clover_amount integer NOT NULL CHECK (clover_amount IN (1, 3, 5, 10)),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  gross_amount_minor integer NOT NULL CHECK (gross_amount_minor > 0),
  maturity_days integer NOT NULL DEFAULT 30 CHECK (maturity_days BETWEEN 0 AND 365),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, product_id),
  UNIQUE (provider, clover_amount)
);

INSERT INTO public.store_product_catalog(provider, product_id, clover_amount, currency, gross_amount_minor)
SELECT provider, 'haenael.cheer.clover.' || amount::text, amount, 'KRW', unit_price * amount
FROM (VALUES
  ('APPLE', 1200),
  ('GOOGLE_PLAY', 1200),
  ('GOOGLE_ALTERNATIVE', 1100),
  ('TOSS_IAP', 1200)
) AS channel(provider, unit_price)
CROSS JOIN (VALUES (1), (3), (5), (10)) AS bundle(amount);

ALTER TABLE public.store_product_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.store_product_catalog FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.store_product_catalog TO service_role;

DROP POLICY IF EXISTS store_purchase_select_own ON public.store_purchase;
CREATE POLICY store_purchase_select_own ON public.store_purchase
  FOR SELECT TO authenticated
  USING (supporter_member_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_store_purchase_intent(
  p_goal_id bigint,
  p_provider text,
  p_product_id text,
  p_clover_amount integer,
  p_request_key text
)
RETURNS TABLE(intent_id uuid, account_binding uuid, expires_at timestamptz, is_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_goal_owner uuid;
  v_catalog public.store_product_catalog%ROWTYPE;
  v_existing public.store_purchase_intent%ROWTYPE;
  v_intent public.store_purchase_intent%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF p_provider NOT IN ('APPLE', 'GOOGLE_PLAY', 'GOOGLE_ALTERNATIVE', 'TOSS_IAP')
     OR p_request_key !~ '^[A-Za-z0-9_-]{8,128}$' THEN
    RAISE EXCEPTION 'invalid_purchase_intent' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.app_channel_release_gate AS gate
    WHERE gate.channel = p_provider
      AND CASE
        WHEN p_provider = 'TOSS_IAP' THEN gate.production_enabled
        ELSE gate.sandbox_enabled OR gate.production_enabled
      END
  ) THEN
    RAISE EXCEPTION 'channel_release_disabled' USING ERRCODE = '55000';
  END IF;

  SELECT * INTO v_catalog
  FROM public.store_product_catalog AS catalog
  WHERE catalog.provider = p_provider
    AND catalog.product_id = p_product_id
    AND catalog.active;
  IF NOT FOUND OR v_catalog.clover_amount <> p_clover_amount THEN
    RAISE EXCEPTION 'product_catalog_mismatch' USING ERRCODE = '22023';
  END IF;

  SELECT member_id INTO v_goal_owner FROM public.goal
  WHERE id = p_goal_id AND status = 'ACTIVE' AND deleted_at IS NULL;
  IF v_goal_owner IS NULL THEN RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_goal_owner = v_uid THEN RAISE EXCEPTION 'self_support_forbidden' USING ERRCODE = '22023'; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('store_purchase_intent:' || v_uid::text || ':' || p_request_key, 0)
  );
  SELECT * INTO v_existing FROM public.store_purchase_intent
  WHERE supporter_member_id = v_uid AND request_key = p_request_key FOR UPDATE;
  IF FOUND THEN
    IF v_existing.goal_id <> p_goal_id OR v_existing.provider <> p_provider
       OR v_existing.product_id <> p_product_id OR v_existing.clover_amount <> v_catalog.clover_amount THEN
      RAISE EXCEPTION 'request_key_conflict' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.account_binding, v_existing.expires_at, true;
    RETURN;
  END IF;

  INSERT INTO public.store_purchase_intent(supporter_member_id, goal_id, provider, product_id, clover_amount, request_key)
  VALUES (v_uid, p_goal_id, p_provider, p_product_id, v_catalog.clover_amount, p_request_key)
  RETURNING * INTO v_intent;
  RETURN QUERY SELECT v_intent.id, v_intent.account_binding, v_intent.expires_at, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_store_purchase_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.store_product_catalog AS catalog
    WHERE catalog.provider = NEW.provider
      AND catalog.product_id = NEW.product_id
      AND catalog.clover_amount = NEW.clover_amount
      AND catalog.currency = NEW.currency
      AND catalog.gross_amount_minor = NEW.gross_amount_minor
      AND catalog.active
  ) THEN
    RAISE EXCEPTION 'product_catalog_mismatch' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_store_purchase_catalog ON public.store_purchase;
CREATE TRIGGER enforce_store_purchase_catalog
BEFORE INSERT OR UPDATE OF provider, product_id, clover_amount, currency, gross_amount_minor
ON public.store_purchase
FOR EACH ROW EXECUTE FUNCTION public.enforce_store_purchase_catalog();

CREATE OR REPLACE FUNCTION public.reverse_store_purchase(
  p_provider text,
  p_provider_transaction_id text,
  p_provider_event_id text,
  p_payload_hash text,
  p_refund_transaction_id text DEFAULT NULL,
  p_refund_amount_minor integer DEFAULT NULL,
  p_refund_clover_amount integer DEFAULT NULL,
  p_currency text DEFAULT NULL,
  p_refund_scope text DEFAULT NULL,
  p_occurred_at timestamptz DEFAULT NULL
)
RETURNS TABLE(purchase_id bigint, status text, clover_recovered integer, clover_shortfall integer, is_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_purchase public.store_purchase%ROWTYPE;
  v_owner_id uuid;
  v_balance integer;
  v_recovered integer;
  v_shortfall integer;
  v_refund_amount integer;
  v_refund_clover integer;
  v_total_refunded_amount integer;
  v_total_refunded_clover integer;
  v_expected_scope text;
  v_result_status text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_payload_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'invalid_payload_hash' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_purchase FROM public.store_purchase
  WHERE provider = p_provider AND provider_transaction_id = p_provider_transaction_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'purchase_not_found' USING ERRCODE = 'P0002'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.store_purchase_event
    WHERE provider = p_provider AND provider_event_id = p_provider_event_id
  ) THEN
    RETURN QUERY SELECT v_purchase.id, v_purchase.status, 0, 0, true;
    RETURN;
  END IF;

  v_refund_amount := COALESCE(
    p_refund_amount_minor,
    v_purchase.gross_amount_minor - v_purchase.refunded_amount_minor
  );
  v_total_refunded_amount := v_purchase.refunded_amount_minor + v_refund_amount;
  IF v_refund_amount <= 0
     OR v_total_refunded_amount > v_purchase.gross_amount_minor
     OR COALESCE(p_currency, v_purchase.currency) <> v_purchase.currency THEN
    RAISE EXCEPTION 'invalid_refund_amount' USING ERRCODE = '22023';
  END IF;

  v_total_refunded_clover := (
    v_total_refunded_amount::bigint * v_purchase.clover_amount::bigint
    / v_purchase.gross_amount_minor::bigint
  )::integer;
  v_refund_clover := v_total_refunded_clover - v_purchase.refunded_clover_amount;
  IF v_refund_clover < 0
     OR (p_refund_clover_amount IS NOT NULL AND p_refund_clover_amount <> v_refund_clover) THEN
    RAISE EXCEPTION 'invalid_refund_clover_amount' USING ERRCODE = '22023';
  END IF;

  v_expected_scope := CASE
    WHEN v_total_refunded_amount = v_purchase.gross_amount_minor THEN 'FULL'
    ELSE 'PARTIAL'
  END;
  IF p_refund_scope IS NOT NULL AND p_refund_scope <> v_expected_scope THEN
    RAISE EXCEPTION 'refund_scope_mismatch' USING ERRCODE = '22023';
  END IF;

  SELECT g.member_id INTO v_owner_id FROM public.goal AS g WHERE g.id = v_purchase.goal_id;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cashout_member:' || v_owner_id::text, 0)
  );
  INSERT INTO public.clover_balance(member_id, clover_count)
  VALUES (v_owner_id, 0) ON CONFLICT (member_id) DO NOTHING;
  SELECT clover_count INTO v_balance FROM public.clover_balance
  WHERE member_id = v_owner_id FOR UPDATE;

  v_recovered := LEAST(COALESCE(v_balance, 0), v_refund_clover);
  v_shortfall := v_refund_clover - v_recovered;
  IF v_recovered > 0 THEN
    INSERT INTO public.clover_ledger(member_id, entry_type, clover_delta, ref_type, ref_id, balance_after)
    VALUES (v_owner_id, 'REFUND_REVERSAL', -v_recovered, 'store_purchase', v_purchase.id, v_balance - v_recovered);
  END IF;

  IF v_refund_clover > 0 THEN
    UPDATE public.clover_maturity AS maturity
    SET clover_amount = CASE
          WHEN maturity.clover_amount <= v_refund_clover THEN maturity.clover_amount
          ELSE maturity.clover_amount - v_refund_clover
        END,
        reversed_at = CASE
          WHEN maturity.clover_amount <= v_refund_clover THEN COALESCE(maturity.reversed_at, now())
          ELSE maturity.reversed_at
        END
    WHERE maturity.purchase_id = v_purchase.id;
  END IF;

  v_result_status := CASE
    WHEN v_shortfall > 0 THEN 'RECOVERY_REQUIRED'
    WHEN v_total_refunded_clover = v_purchase.clover_amount THEN 'REFUNDED'
    ELSE 'PARTIALLY_REFUNDED'
  END;

  UPDATE public.cheer AS refunded_cheer
  SET status = CASE WHEN v_total_refunded_clover = v_purchase.clover_amount THEN 'REFUNDED' ELSE refunded_cheer.status END
  WHERE refunded_cheer.id = v_purchase.cheer_id
    AND refunded_cheer.status <> 'REFUNDED';

  IF v_shortfall > 0 THEN
    INSERT INTO public.store_recovery_case(purchase_id, member_id, clover_shortfall)
    VALUES (v_purchase.id, v_owner_id, v_shortfall)
    ON CONFLICT ON CONSTRAINT store_recovery_case_purchase_id_key DO UPDATE
    SET clover_shortfall = public.store_recovery_case.clover_shortfall + EXCLUDED.clover_shortfall,
        status = 'OPEN',
        resolved_at = NULL;
  END IF;

  UPDATE public.store_purchase
  SET status = v_result_status,
      refunded_amount_minor = v_total_refunded_amount,
      refunded_clover_amount = v_total_refunded_clover,
      refunded_at = CASE WHEN v_total_refunded_amount = gross_amount_minor THEN COALESCE(refunded_at, now()) ELSE refunded_at END,
      updated_at = now()
  WHERE id = v_purchase.id;

  INSERT INTO public.store_purchase_event(
    purchase_id, provider, provider_event_id, provider_transaction_id,
    refund_transaction_id, event_type, refund_amount_minor, currency,
    refund_scope, occurred_at, normalization_status, payload_hash, result_code
  ) VALUES (
    v_purchase.id, p_provider, p_provider_event_id, p_provider_transaction_id,
    p_refund_transaction_id, 'REFUND', v_refund_amount, v_purchase.currency,
    v_expected_scope, COALESCE(p_occurred_at, now()), 'VERIFIED', p_payload_hash, v_result_status
  );

  RETURN QUERY SELECT v_purchase.id, v_result_status, v_recovered, v_shortfall, false;
END;
$$;

DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    CREATE EXTENSION IF NOT EXISTS pg_net;
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-store-purchases-daily') THEN
      PERFORM cron.schedule(
        'reconcile-store-purchases-daily',
        '27 3 * * *',
        $CRON$
        DO $reconcile$
        DECLARE
          v_url text;
          v_apikey text;
          v_token text;
        BEGIN
          SELECT
            max(decrypted_secret) FILTER (WHERE name='store_purchase_reconcile_url'),
            max(decrypted_secret) FILTER (WHERE name='edge_invoke_publishable_key'),
            max(decrypted_secret) FILTER (WHERE name='store_purchase_reconcile_internal_token')
          INTO v_url, v_apikey, v_token
          FROM vault.decrypted_secrets
          WHERE name IN ('store_purchase_reconcile_url','edge_invoke_publishable_key','store_purchase_reconcile_internal_token');
          IF v_url IS NOT NULL AND v_apikey IS NOT NULL AND v_token IS NOT NULL THEN
            PERFORM net.http_post(
              url := v_url,
              headers := jsonb_build_object(
                'Content-Type','application/json',
                'apikey',v_apikey,
                'x-reconcile-internal-token',v_token
              ),
              body := '{}'::jsonb,
              timeout_milliseconds := 55000
            );
          ELSE
            RAISE WARNING 'store purchase reconciliation Vault secrets are incomplete';
          END IF;
        END
        $reconcile$;
        $CRON$
      );
    END IF;
  EXCEPTION WHEN insufficient_privilege OR feature_not_supported OR undefined_file OR undefined_table OR invalid_schema_name THEN
    RAISE NOTICE 'daily store purchase reconciliation schedule registration skipped: %', SQLERRM;
  END;
END $$;

COMMIT;
