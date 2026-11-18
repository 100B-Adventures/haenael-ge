-- V2 app channels: verified store purchases, 30-day maturity lock, refunds,
-- Google alternative-billing reporting, device push tokens, and gift-provider gate.
-- D-056/D-055/D-054/D-047. Additive migration; production application requires approval.

BEGIN;

CREATE TABLE public.app_channel_release_gate (
  channel text PRIMARY KEY CHECK (channel IN ('APPLE', 'GOOGLE_PLAY', 'GOOGLE_ALTERNATIVE', 'TOSS_IAP')),
  sandbox_enabled boolean NOT NULL DEFAULT false,
  production_enabled boolean NOT NULL DEFAULT false,
  approval_reference text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT production_enabled OR approval_reference IS NOT NULL)
);
INSERT INTO public.app_channel_release_gate(channel) VALUES
  ('APPLE'), ('GOOGLE_PLAY'), ('GOOGLE_ALTERNATIVE'), ('TOSS_IAP');

CREATE TABLE public.store_purchase_intent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supporter_member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE RESTRICT,
  goal_id bigint NOT NULL REFERENCES public.goal(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('APPLE', 'GOOGLE_PLAY', 'GOOGLE_ALTERNATIVE', 'TOSS_IAP')),
  product_id text NOT NULL CHECK (length(product_id) BETWEEN 3 AND 160),
  clover_amount integer NOT NULL CHECK (clover_amount IN (1, 3, 5, 10)),
  account_binding uuid NOT NULL DEFAULT gen_random_uuid(),
  request_key text NOT NULL CHECK (request_key ~ '^[A-Za-z0-9_-]{8,128}$'),
  status text NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'CONSUMED', 'EXPIRED', 'CANCELED')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  CHECK ((status = 'CONSUMED') = (consumed_at IS NOT NULL)),
  UNIQUE (supporter_member_id, request_key),
  UNIQUE (account_binding)
);

CREATE TABLE public.store_purchase (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supporter_member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE RESTRICT,
  intent_id uuid NOT NULL UNIQUE REFERENCES public.store_purchase_intent(id) ON DELETE RESTRICT,
  goal_id bigint NOT NULL REFERENCES public.goal(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('APPLE', 'GOOGLE_PLAY', 'GOOGLE_ALTERNATIVE', 'TOSS_IAP')),
  provider_transaction_id text NOT NULL CHECK (length(provider_transaction_id) BETWEEN 6 AND 512),
  environment text NOT NULL CHECK (environment IN ('SANDBOX', 'PRODUCTION')),
  product_id text NOT NULL CHECK (length(product_id) BETWEEN 3 AND 160),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  gross_amount_minor integer NOT NULL CHECK (gross_amount_minor > 0),
  refunded_amount_minor integer NOT NULL DEFAULT 0 CHECK (
    refunded_amount_minor >= 0 AND refunded_amount_minor <= gross_amount_minor
  ),
  clover_amount integer NOT NULL CHECK (clover_amount IN (1, 3, 5, 10)),
  refunded_clover_amount integer NOT NULL DEFAULT 0 CHECK (
    refunded_clover_amount >= 0 AND refunded_clover_amount <= clover_amount
  ),
  status text NOT NULL DEFAULT 'VERIFIED'
    CHECK (status IN ('VERIFIED', 'CREDITED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED', 'RECOVERY_REQUIRED')),
  payment_id bigint REFERENCES public.payment(id) ON DELETE RESTRICT,
  cheer_id bigint REFERENCES public.cheer(id) ON DELETE RESTRICT,
  request_key text NOT NULL CHECK (request_key ~ '^[A-Za-z0-9_-]{8,128}$'),
  policy_risk text,
  purchased_at timestamptz NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_transaction_id),
  UNIQUE (supporter_member_id, request_key)
);

CREATE TABLE public.store_purchase_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  purchase_id bigint REFERENCES public.store_purchase(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('APPLE', 'GOOGLE_PLAY', 'GOOGLE_ALTERNATIVE', 'TOSS_IAP')),
  provider_event_id text NOT NULL,
  provider_transaction_id text NOT NULL,
  refund_transaction_id text,
  event_type text NOT NULL,
  refund_amount_minor integer CHECK (refund_amount_minor IS NULL OR refund_amount_minor > 0),
  currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  refund_scope text CHECK (refund_scope IS NULL OR refund_scope IN ('FULL', 'PARTIAL')),
  occurred_at timestamptz,
  normalization_status text NOT NULL DEFAULT 'VERIFIED'
    CHECK (normalization_status IN ('VERIFIED', 'REJECTED', 'RETRY')),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  result_code text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE public.clover_maturity (
  purchase_id bigint PRIMARY KEY REFERENCES public.store_purchase(id) ON DELETE RESTRICT,
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE RESTRICT,
  clover_amount integer NOT NULL CHECK (clover_amount > 0),
  available_at timestamptz NOT NULL,
  released_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (released_at IS NULL OR reversed_at IS NULL)
);

CREATE TABLE public.store_recovery_case (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  purchase_id bigint NOT NULL UNIQUE REFERENCES public.store_purchase(id) ON DELETE RESTRICT,
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE RESTRICT,
  clover_shortfall integer NOT NULL CHECK (clover_shortfall > 0),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'WAIVED')),
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE public.google_external_transaction (
  purchase_id bigint PRIMARY KEY REFERENCES public.store_purchase(id) ON DELETE RESTRICT,
  external_transaction_token_enc bytea NOT NULL,
  external_transaction_id text NOT NULL UNIQUE,
  transaction_time timestamptz NOT NULL,
  pretax_amount_minor integer NOT NULL CHECK (pretax_amount_minor >= 0),
  tax_amount_minor integer NOT NULL CHECK (tax_amount_minor >= 0),
  user_tax_region text NOT NULL,
  report_status text NOT NULL DEFAULT 'PENDING'
    CHECK (report_status IN ('PENDING', 'REPORTED', 'PERMANENT_FAILURE', 'REFUND_PENDING', 'REFUNDED')),
  report_due_at timestamptz NOT NULL,
  reported_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.device_push_token (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  device_id text NOT NULL CHECK (length(device_id) BETWEEN 8 AND 160),
  platform text NOT NULL CHECK (platform IN ('IOS', 'ANDROID')),
  token_enc bytea NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, device_id)
);

CREATE TABLE public.gift_exchange (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE RESTRICT,
  catalog_item_id text NOT NULL,
  clover_amount integer NOT NULL CHECK (clover_amount > 0),
  status text NOT NULL CHECK (status IN ('PROVIDER_PENDING', 'PENDING_RECONCILIATION', 'SENT', 'FAILED_CONFIRMED')),
  destination_enc bytea NOT NULL,
  destination_masked text NOT NULL,
  request_key text NOT NULL CHECK (request_key ~ '^[A-Za-z0-9_-]{8,128}$'),
  provider_order_id text,
  provider_idempotency_key text NOT NULL UNIQUE,
  last_status_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, request_key)
);

CREATE TABLE public.gift_exchange_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gift_exchange_id bigint NOT NULL REFERENCES public.gift_exchange(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('REQUESTED', 'RECONCILING', 'SENT', 'FAILED_CONFIRMED')),
  result_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_purchase_goal_idx ON public.store_purchase(goal_id, created_at DESC);
CREATE INDEX store_purchase_supporter_idx ON public.store_purchase(supporter_member_id, created_at DESC);
CREATE INDEX store_purchase_status_idx ON public.store_purchase(status, updated_at);
CREATE INDEX clover_maturity_member_idx ON public.clover_maturity(member_id, available_at)
  WHERE released_at IS NULL AND reversed_at IS NULL;
CREATE INDEX google_external_due_idx ON public.google_external_transaction(report_due_at)
  WHERE reported_at IS NULL;
CREATE INDEX gift_exchange_pending_idx ON public.gift_exchange(member_id, created_at)
  WHERE status = 'PROVIDER_PENDING';

ALTER TABLE public.store_purchase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_channel_release_gate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_purchase_intent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_purchase_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clover_maturity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_recovery_case ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_external_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_push_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_exchange ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_exchange_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_purchase_select_own ON public.store_purchase
  FOR SELECT TO authenticated USING (
    supporter_member_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.goal AS g
      WHERE g.id = store_purchase.goal_id AND g.member_id = auth.uid()
    )
  );
CREATE POLICY store_purchase_intent_select_own ON public.store_purchase_intent
  FOR SELECT TO authenticated USING (supporter_member_id = auth.uid());
CREATE POLICY clover_maturity_select_own ON public.clover_maturity
  FOR SELECT TO authenticated USING (member_id = auth.uid());
CREATE POLICY device_push_token_select_own ON public.device_push_token
  FOR SELECT TO authenticated USING (member_id = auth.uid());
CREATE POLICY gift_exchange_select_own ON public.gift_exchange
  FOR SELECT TO authenticated USING (member_id = auth.uid());

REVOKE ALL ON TABLE public.app_channel_release_gate, public.store_purchase_intent,
  public.store_purchase, public.store_purchase_event,
  public.clover_maturity, public.store_recovery_case,
  public.google_external_transaction, public.device_push_token,
  public.gift_exchange, public.gift_exchange_event FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.store_purchase_intent, public.store_purchase, public.clover_maturity,
  public.device_push_token, public.gift_exchange TO authenticated;
GRANT ALL ON TABLE public.app_channel_release_gate, public.store_purchase_intent,
  public.store_purchase, public.store_purchase_event,
  public.clover_maturity, public.store_recovery_case,
  public.google_external_transaction, public.device_push_token,
  public.gift_exchange, public.gift_exchange_event TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

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
  v_existing public.store_purchase_intent%ROWTYPE;
  v_intent public.store_purchase_intent%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF p_provider NOT IN ('APPLE', 'GOOGLE_PLAY', 'GOOGLE_ALTERNATIVE', 'TOSS_IAP')
     OR p_clover_amount NOT IN (1,3,5,10)
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
  SELECT member_id INTO v_goal_owner FROM public.goal
  WHERE id = p_goal_id AND status = 'ACTIVE' AND deleted_at IS NULL;
  IF v_goal_owner IS NULL THEN RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_goal_owner = v_uid THEN RAISE EXCEPTION 'self_support_forbidden' USING ERRCODE = '22023'; END IF;

  SELECT * INTO v_existing FROM public.store_purchase_intent
  WHERE supporter_member_id = v_uid AND request_key = p_request_key FOR UPDATE;
  IF FOUND THEN
    IF v_existing.goal_id <> p_goal_id OR v_existing.provider <> p_provider
       OR v_existing.product_id <> p_product_id OR v_existing.clover_amount <> p_clover_amount THEN
      RAISE EXCEPTION 'request_key_conflict' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.account_binding, v_existing.expires_at, true;
    RETURN;
  END IF;

  INSERT INTO public.store_purchase_intent(supporter_member_id, goal_id, provider, product_id, clover_amount, request_key)
  VALUES (v_uid, p_goal_id, p_provider, p_product_id, p_clover_amount, p_request_key)
  RETURNING * INTO v_intent;
  RETURN QUERY SELECT v_intent.id, v_intent.account_binding, v_intent.expires_at, false;
END;
$$;

REVOKE ALL ON FUNCTION public.create_store_purchase_intent(bigint,text,text,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_store_purchase_intent(bigint,text,text,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.credit_store_purchase(
  p_intent_id uuid,
  p_verified_member_id uuid,
  p_account_binding uuid,
  p_provider text,
  p_provider_transaction_id text,
  p_environment text,
  p_product_id text,
  p_currency text,
  p_gross_amount_minor integer,
  p_clover_amount integer,
  p_message text,
  p_is_anonymous boolean,
  p_request_key text,
  p_purchased_at timestamptz,
  p_policy_risk text DEFAULT NULL
)
RETURNS TABLE(
  purchase_id bigint,
  cheer_id bigint,
  clover_amount integer,
  available_at timestamptz,
  is_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing public.store_purchase%ROWTYPE;
  v_intent public.store_purchase_intent%ROWTYPE;
  v_goal public.goal%ROWTYPE;
  v_purchase_id bigint;
  v_payment_id bigint;
  v_cheer_id bigint;
  v_balance integer;
  v_available_at timestamptz;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_intent FROM public.store_purchase_intent
  WHERE id = p_intent_id FOR UPDATE;
  IF NOT FOUND
     OR v_intent.status NOT IN ('CREATED', 'CONSUMED')
     OR (v_intent.status = 'CREATED' AND v_intent.expires_at <= now()) THEN
    RAISE EXCEPTION 'purchase_intent_invalid' USING ERRCODE = '22023';
  END IF;
  IF v_intent.supporter_member_id <> p_verified_member_id
     OR v_intent.account_binding <> p_account_binding
     OR v_intent.provider <> p_provider
     OR v_intent.product_id <> p_product_id
     OR v_intent.clover_amount <> p_clover_amount
     OR v_intent.request_key <> p_request_key THEN
    RAISE EXCEPTION 'transaction_owner_mismatch' USING ERRCODE = '22023';
  END IF;
  IF p_provider NOT IN ('APPLE', 'GOOGLE_PLAY', 'GOOGLE_ALTERNATIVE', 'TOSS_IAP')
     OR p_environment NOT IN ('SANDBOX', 'PRODUCTION')
     OR p_clover_amount NOT IN (1, 3, 5, 10)
     OR p_gross_amount_minor < 1
     OR p_request_key !~ '^[A-Za-z0-9_-]{8,128}$'
     OR length(COALESCE(p_message, '')) > 140 THEN
    RAISE EXCEPTION 'invalid_purchase' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing
  FROM public.store_purchase
  WHERE provider = p_provider AND provider_transaction_id = p_provider_transaction_id
  FOR UPDATE;
  IF FOUND THEN
    IF v_existing.supporter_member_id <> v_intent.supporter_member_id
       OR v_existing.goal_id <> v_intent.goal_id
       OR v_existing.product_id <> p_product_id
       OR v_existing.clover_amount <> p_clover_amount THEN
      RAISE EXCEPTION 'transaction_binding_mismatch' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.cheer_id, v_existing.clover_amount,
      (SELECT cm.available_at FROM public.clover_maturity AS cm WHERE cm.purchase_id = v_existing.id), true;
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.app_channel_release_gate AS gate
    WHERE gate.channel = p_provider
      AND CASE WHEN p_environment = 'SANDBOX' THEN gate.sandbox_enabled ELSE gate.production_enabled END
  ) THEN
    RAISE EXCEPTION 'channel_release_disabled' USING ERRCODE = '55000';
  END IF;
  IF v_intent.status <> 'CREATED' THEN
    RAISE EXCEPTION 'purchase_intent_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_goal FROM public.goal
  WHERE id = v_intent.goal_id AND status = 'ACTIVE' AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_goal.member_id = v_intent.supporter_member_id THEN
    RAISE EXCEPTION 'self_support_forbidden' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.member WHERE id = v_intent.supporter_member_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'supporter_not_found' USING ERRCODE = 'P0002'; END IF;

  INSERT INTO public.store_purchase(
    supporter_member_id, intent_id, goal_id, provider, provider_transaction_id,
    environment, product_id, currency, gross_amount_minor, clover_amount,
    status, request_key, policy_risk, purchased_at
  ) VALUES (
    v_intent.supporter_member_id, v_intent.id, v_intent.goal_id, p_provider, p_provider_transaction_id,
    p_environment, p_product_id, upper(p_currency), p_gross_amount_minor, p_clover_amount,
    'VERIFIED', p_request_key, p_policy_risk, p_purchased_at
  ) RETURNING id INTO v_purchase_id;

  INSERT INTO public.payment(
    order_id, amount_krw, method, status, pg_customer_key, approved_at, raw_response, request_key
  ) VALUES (
    'STORE-' || v_purchase_id::text,
    GREATEST(p_gross_amount_minor, 1000),
    p_provider,
    'READY',
    'MEMBER:' || v_intent.supporter_member_id::text,
    p_purchased_at,
    jsonb_build_object('storePurchaseId', v_purchase_id, 'environment', p_environment),
    'store-' || v_purchase_id::text
  ) RETURNING id INTO v_payment_id;

  INSERT INTO public.payment_log(payment_id, from_status, to_status, detail)
  VALUES (v_payment_id, 'READY', 'DONE', jsonb_build_object('source', 'credit_store_purchase'));

  UPDATE public.payment SET status = 'DONE' WHERE id = v_payment_id;

  INSERT INTO public.cheer(
    goal_id, display_name, is_anonymous, message, clover_amount, payment_id, status
  ) VALUES (
    v_intent.goal_id, NULL, COALESCE(p_is_anonymous, false), NULLIF(btrim(p_message), ''),
    p_clover_amount, v_payment_id, 'PENDING'
  ) RETURNING id INTO v_cheer_id;

  INSERT INTO public.social_cheer_member_attribution(cheer_id, supporter_member_id)
  VALUES (v_cheer_id, v_intent.supporter_member_id);

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cashout_member:' || v_goal.member_id::text, 0)
  );
  INSERT INTO public.clover_balance(member_id, clover_count)
  VALUES (v_goal.member_id, 0)
  ON CONFLICT (member_id) DO NOTHING;
  SELECT clover_count INTO v_balance FROM public.clover_balance
  WHERE member_id = v_goal.member_id FOR UPDATE;
  v_balance := COALESCE(v_balance, 0) + p_clover_amount;

  INSERT INTO public.clover_ledger(member_id, entry_type, clover_delta, ref_type, ref_id, balance_after)
  VALUES (v_goal.member_id, 'EARN', p_clover_amount, 'store_purchase', v_purchase_id, v_balance);

  v_available_at := p_purchased_at + interval '30 days';
  INSERT INTO public.clover_maturity(purchase_id, member_id, clover_amount, available_at)
  VALUES (v_purchase_id, v_goal.member_id, p_clover_amount, v_available_at);

  UPDATE public.cheer SET status = 'CONFIRMED' WHERE id = v_cheer_id;
  UPDATE public.store_purchase
  SET status = 'CREDITED', payment_id = v_payment_id, cheer_id = v_cheer_id, updated_at = now()
  WHERE id = v_purchase_id;
  UPDATE public.store_purchase_intent
  SET status = 'CONSUMED', consumed_at = now()
  WHERE id = v_intent.id;

  RETURN QUERY SELECT v_purchase_id, v_cheer_id, p_clover_amount, v_available_at, false;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_store_purchase(
  uuid, uuid, uuid, text, text, text, text, text, integer, integer, text, boolean, text, timestamptz, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_store_purchase(
  uuid, uuid, uuid, text, text, text, text, text, integer, integer, text, boolean, text, timestamptz, text
) TO service_role;

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

  v_refund_amount := COALESCE(p_refund_amount_minor, v_purchase.gross_amount_minor);
  v_refund_clover := COALESCE(p_refund_clover_amount, v_purchase.clover_amount);
  IF v_refund_amount <= 0
     OR v_refund_clover <= 0
     OR v_purchase.refunded_amount_minor + v_refund_amount > v_purchase.gross_amount_minor
     OR v_purchase.refunded_clover_amount + v_refund_clover > v_purchase.clover_amount
     OR COALESCE(p_currency, v_purchase.currency) <> v_purchase.currency
     OR COALESCE(p_refund_scope, CASE WHEN v_refund_amount = v_purchase.gross_amount_minor THEN 'FULL' ELSE 'PARTIAL' END)
        NOT IN ('FULL', 'PARTIAL') THEN
    RAISE EXCEPTION 'invalid_refund_amount' USING ERRCODE = '22023';
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
  v_total_refunded_amount := v_purchase.refunded_amount_minor + v_refund_amount;
  v_total_refunded_clover := v_purchase.refunded_clover_amount + v_refund_clover;
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
    ON CONFLICT (purchase_id) DO UPDATE
    SET clover_shortfall = public.store_recovery_case.clover_shortfall + EXCLUDED.clover_shortfall,
        status = 'OPEN',
        resolved_at = NULL;
  END IF;

  UPDATE public.store_purchase
  SET status = v_result_status,
      refunded_amount_minor = v_total_refunded_amount,
      refunded_clover_amount = v_total_refunded_clover,
      refunded_at = CASE WHEN v_total_refunded_clover = clover_amount THEN COALESCE(refunded_at, now()) ELSE refunded_at END,
      updated_at = now()
  WHERE id = v_purchase.id;

  INSERT INTO public.store_purchase_event(
    purchase_id, provider, provider_event_id, provider_transaction_id,
    refund_transaction_id, event_type, refund_amount_minor, currency,
    refund_scope, occurred_at, normalization_status, payload_hash, result_code
  ) VALUES (
    v_purchase.id, p_provider, p_provider_event_id, p_provider_transaction_id,
    p_refund_transaction_id, 'REFUND', v_refund_amount, v_purchase.currency,
    COALESCE(p_refund_scope, CASE WHEN v_total_refunded_amount = v_purchase.gross_amount_minor THEN 'FULL' ELSE 'PARTIAL' END),
    COALESCE(p_occurred_at, now()), 'VERIFIED', p_payload_hash, v_result_status
  );

  RETURN QUERY SELECT v_purchase.id, v_result_status, v_recovered, v_shortfall, false;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_store_purchase(text, text, text, text, text, integer, integer, text, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_store_purchase(text, text, text, text, text, integer, integer, text, text, timestamptz) TO service_role;

DROP FUNCTION IF EXISTS public.clover_eligibility(uuid);
CREATE FUNCTION public.clover_eligibility(p_member_id uuid)
RETURNS TABLE(
  total_balance integer,
  welcome_amount integer,
  locked_amount integer,
  available_amount integer,
  payable_amount integer,
  min_cashout_clover integer,
  reached_threshold boolean,
  maturity_locked_amount integer,
  gift_locked_amount integer,
  next_maturity_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total integer;
  v_welcome integer;
  v_cashout_locked integer;
  v_maturity_locked integer;
  v_gift_locked integer;
  v_next_maturity timestamptz;
  v_min integer := public.min_cashout_clover();
BEGIN
  IF current_user IS DISTINCT FROM 'service_role'
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND auth.uid() IS DISTINCT FROM p_member_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(cb.clover_count, 0) INTO v_total
  FROM public.clover_balance AS cb WHERE cb.member_id = p_member_id;
  v_total := COALESCE(v_total, 0);
  SELECT COALESCE(sum(cl.clover_delta), 0)::integer INTO v_welcome
  FROM public.clover_ledger AS cl
  WHERE cl.member_id = p_member_id AND cl.entry_type IN ('WELCOME_GRANT', 'WELCOME_REVERSAL');
  v_welcome := GREATEST(COALESCE(v_welcome, 0), 0);
  SELECT COALESCE(sum(cr.clover_amount), 0)::integer INTO v_cashout_locked
  FROM public.cashout_request AS cr WHERE cr.member_id = p_member_id AND cr.status = 'REQUESTED';
  SELECT COALESCE(sum(cm.clover_amount), 0)::integer, min(cm.available_at)
    INTO v_maturity_locked, v_next_maturity
  FROM public.clover_maturity AS cm
  WHERE cm.member_id = p_member_id AND cm.released_at IS NULL AND cm.reversed_at IS NULL
    AND cm.available_at > now();
  SELECT COALESCE(sum(ge.clover_amount), 0)::integer INTO v_gift_locked
  FROM public.gift_exchange AS ge
  WHERE ge.member_id = p_member_id AND ge.status IN ('PROVIDER_PENDING', 'PENDING_RECONCILIATION');

  v_cashout_locked := COALESCE(v_cashout_locked, 0);
  v_maturity_locked := COALESCE(v_maturity_locked, 0);
  v_gift_locked := COALESCE(v_gift_locked, 0);

  RETURN QUERY SELECT
    v_total,
    v_welcome,
    v_cashout_locked,
    GREATEST(v_total - v_cashout_locked - v_maturity_locked - v_gift_locked, 0),
    GREATEST(v_total - v_welcome - v_cashout_locked - v_maturity_locked - v_gift_locked, 0),
    v_min,
    (v_total >= v_min),
    v_maturity_locked,
    v_gift_locked,
    v_next_maturity;
END;
$$;

REVOKE ALL ON FUNCTION public.clover_eligibility(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clover_eligibility(uuid) TO authenticated, service_role;

COMMIT;
