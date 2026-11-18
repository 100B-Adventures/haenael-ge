-- App-channel review round 6: replace client-key deletion patches with one
-- server-owned deletion job per member and a shared payment/deletion fence.
-- Production application requires explicit approval.
BEGIN;

CREATE TABLE public.account_deletion_job (
  member_id uuid PRIMARY KEY REFERENCES public.member(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN (
    'REQUESTED',
    'BLOCKED_PENDING_PAYMENT',
    'EXTERNAL_REVOKED',
    'DATA_DELETED',
    'AUTH_DELETED'
  )),
  blocked_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  external_revoked_at timestamptz,
  data_deleted_at timestamptz,
  auth_deleted_at timestamptz,
  last_error_code text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.alternative_payment_confirmation (
  intent_id uuid PRIMARY KEY REFERENCES public.store_purchase_intent(id) ON DELETE RESTRICT,
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE RESTRICT,
  request_key text NOT NULL CHECK (request_key ~ '^[A-Za-z0-9_-]{8,128}$'),
  status text NOT NULL CHECK (status IN (
    'CONFIRMING',
    'RECONCILIATION_REQUIRED',
    'CREDITED',
    'RECOVERY_REQUIRED',
    'CANCELED'
  )),
  started_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX alternative_payment_confirmation_member_status_idx
  ON public.alternative_payment_confirmation(member_id, status);

-- Access tokens are short lived and cannot be the durable deletion credential.
-- Existing fallback rows must reauthenticate; all future rows are refresh-only.
UPDATE public.apple_token_revocation
SET token_enc = NULL,
    token_type_hint = 'refresh_token',
    status = 'MANUAL_REQUIRED',
    last_error_code = 'provider_refresh_token_missing',
    revoked_at = NULL,
    updated_at = now()
WHERE token_type_hint = 'access_token'
  AND status <> 'REVOKED';
UPDATE public.apple_token_revocation
SET token_type_hint = 'refresh_token'
WHERE token_type_hint = 'access_token';
ALTER TABLE public.apple_token_revocation
  DROP CONSTRAINT apple_token_revocation_token_type_hint_check,
  ADD CONSTRAINT apple_token_revocation_token_type_hint_check
    CHECK (token_type_hint = 'refresh_token');

ALTER TABLE public.account_deletion_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alternative_payment_confirmation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.account_deletion_job,
  public.alternative_payment_confirmation FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.account_deletion_job,
  public.alternative_payment_confirmation TO service_role;

INSERT INTO public.account_deletion_job(
  member_id, status, requested_at, auth_deleted_at, last_error_code, updated_at
)
SELECT DISTINCT ON (legacy.member_id)
  legacy.member_id,
  CASE WHEN legacy.status = 'AUTH_DELETED' THEN 'AUTH_DELETED' ELSE 'REQUESTED' END,
  legacy.prepared_at,
  legacy.auth_deleted_at,
  legacy.last_error_code,
  legacy.updated_at
FROM public.account_deletion_request AS legacy
ORDER BY legacy.member_id,
  CASE WHEN legacy.status = 'AUTH_DELETED' THEN 0 ELSE 1 END,
  legacy.updated_at DESC;

COMMENT ON TABLE public.account_deletion_request IS
  'Legacy client-key audit rows. New deletion execution uses account_deletion_job only.';
COMMENT ON TABLE public.account_deletion_job IS
  'Server-owned account deletion state machine. Exactly one row per member; no client request key.';
COMMENT ON TABLE public.alternative_payment_confirmation IS
  'Server record that keeps provider confirmation active across intent expiry and serializes it with deletion.';

CREATE OR REPLACE FUNCTION public.account_deletion_has_pending_payment(
  p_member_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.alternative_payment_confirmation AS confirmation
    WHERE confirmation.member_id = p_member_id
      AND confirmation.status IN (
        'CONFIRMING', 'RECONCILIATION_REQUIRED', 'RECOVERY_REQUIRED'
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.store_purchase_intent AS intent
    WHERE intent.supporter_member_id = p_member_id
      AND intent.status = 'CREATED'
      AND intent.expires_at > now()
  ) OR EXISTS (
    SELECT 1
    FROM public.store_recovery_case AS recovery
    WHERE recovery.member_id = p_member_id
      AND recovery.status = 'OPEN'
  );
$$;

CREATE OR REPLACE FUNCTION public.request_account_deletion(
  p_member_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job public.account_deletion_job%ROWTYPE;
  v_balance integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || p_member_id::text, 0)
  );
  PERFORM 1 FROM public.member WHERE id = p_member_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.account_deletion_job(member_id, status)
  VALUES (p_member_id, 'REQUESTED')
  ON CONFLICT (member_id) DO NOTHING;
  SELECT * INTO v_job FROM public.account_deletion_job
  WHERE member_id = p_member_id FOR UPDATE;
  IF v_job.status IN ('EXTERNAL_REVOKED', 'DATA_DELETED', 'AUTH_DELETED') THEN
    RETURN v_job.status;
  END IF;

  SELECT COALESCE(clover_count, 0) INTO v_balance
  FROM public.clover_balance WHERE member_id = p_member_id FOR UPDATE;
  IF COALESCE(v_balance, 0) <> 0 THEN
    RAISE EXCEPTION 'account_balance_remaining' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cashout_request
    WHERE member_id = p_member_id
      AND status IN ('REQUESTED', 'KYC_PENDING', 'APPROVED', 'PAYOUT_SENT')
  ) THEN
    RAISE EXCEPTION 'cashout_in_progress' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.clover_maturity
    WHERE member_id = p_member_id AND released_at IS NULL AND reversed_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.gift_exchange
    WHERE member_id = p_member_id
      AND status IN ('PROVIDER_PENDING', 'PENDING_RECONCILIATION')
  ) THEN
    RAISE EXCEPTION 'account_settlement_pending' USING ERRCODE = '55000';
  END IF;

  UPDATE public.store_purchase_intent AS intent
  SET status = 'EXPIRED'
  WHERE intent.supporter_member_id = p_member_id
    AND intent.status = 'CREATED'
    AND intent.expires_at <= now()
    AND NOT EXISTS (
      SELECT 1 FROM public.alternative_payment_confirmation AS confirmation
      WHERE confirmation.intent_id = intent.id
        AND confirmation.status IN (
          'CONFIRMING', 'RECONCILIATION_REQUIRED', 'RECOVERY_REQUIRED'
        )
    );

  IF public.account_deletion_has_pending_payment(p_member_id) THEN
    UPDATE public.account_deletion_job
    SET status = 'BLOCKED_PENDING_PAYMENT',
        blocked_reason = 'account_settlement_pending',
        updated_at = now()
    WHERE member_id = p_member_id;
    RETURN 'BLOCKED_PENDING_PAYMENT';
  END IF;

  UPDATE public.account_deletion_job
  SET status = 'REQUESTED', blocked_reason = NULL, last_error_code = NULL,
      updated_at = now()
  WHERE member_id = p_member_id;
  RETURN 'REQUESTED';
END;
$$;

CREATE OR REPLACE FUNCTION public.begin_alternative_payment_confirmation(
  p_intent_id uuid,
  p_member_id uuid,
  p_request_key text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_intent public.store_purchase_intent%ROWTYPE;
  v_existing public.alternative_payment_confirmation%ROWTYPE;
  v_job_status text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || p_member_id::text, 0)
  );
  SELECT * INTO v_existing FROM public.alternative_payment_confirmation
  WHERE intent_id = p_intent_id FOR UPDATE;
  SELECT status INTO v_job_status FROM public.account_deletion_job
  WHERE member_id = p_member_id FOR UPDATE;
  IF v_job_status IS NOT NULL AND NOT (
    v_job_status = 'BLOCKED_PENDING_PAYMENT'
    AND v_existing.intent_id IS NOT NULL
    AND v_existing.status IN ('CONFIRMING', 'RECONCILIATION_REQUIRED')
  ) THEN
    RAISE EXCEPTION 'account_deletion_in_progress' USING ERRCODE = '55000';
  END IF;
  SELECT * INTO v_intent FROM public.store_purchase_intent
  WHERE id = p_intent_id AND supporter_member_id = p_member_id FOR UPDATE;
  IF NOT FOUND OR v_intent.provider <> 'GOOGLE_ALTERNATIVE'
     OR v_intent.request_key <> p_request_key
     OR v_intent.status <> 'CREATED'
     OR (v_intent.expires_at <= now() AND v_existing.intent_id IS NULL) THEN
    RAISE EXCEPTION 'purchase_intent_invalid' USING ERRCODE = '22023';
  END IF;
  IF v_existing.status IN ('CREDITED', 'RECOVERY_REQUIRED', 'CANCELED') THEN
    RETURN v_existing.status;
  END IF;
  INSERT INTO public.alternative_payment_confirmation(
    intent_id, member_id, request_key, status
  ) VALUES (p_intent_id, p_member_id, p_request_key, 'CONFIRMING')
  ON CONFLICT (intent_id) DO UPDATE
  SET status = 'CONFIRMING', updated_at = now();
  RETURN 'CONFIRMING';
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_alternative_payment_confirmation(
  p_intent_id uuid,
  p_member_id uuid,
  p_status text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('CANCELED', 'RECONCILIATION_REQUIRED') THEN
    RAISE EXCEPTION 'invalid_confirmation_status' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || p_member_id::text, 0)
  );
  UPDATE public.alternative_payment_confirmation
  SET status = p_status,
      settled_at = CASE WHEN p_status = 'CANCELED' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE intent_id = p_intent_id AND member_id = p_member_id
    AND status IN ('CONFIRMING', 'RECONCILIATION_REQUIRED');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_confirmation_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF p_status = 'CANCELED' THEN
    UPDATE public.store_purchase_intent SET status = 'CANCELED'
    WHERE id = p_intent_id AND supporter_member_id = p_member_id
      AND status = 'CREATED';
  END IF;
  RETURN p_status;
END;
$$;

ALTER FUNCTION public.credit_alternative_store_purchase(
  uuid,uuid,uuid,text,text,text,text,text,boolean,text,timestamptz,bytea,text
) RENAME TO credit_alternative_store_purchase_v1;

CREATE FUNCTION public.credit_alternative_store_purchase(
  p_intent_id uuid,
  p_verified_member_id uuid,
  p_account_binding uuid,
  p_payment_key text,
  p_order_id text,
  p_product_id text,
  p_environment text,
  p_message text,
  p_is_anonymous boolean,
  p_request_key text,
  p_purchased_at timestamptz,
  p_external_transaction_token_enc bytea,
  p_user_tax_region text
)
RETURNS TABLE(
  purchase_id bigint,
  cheer_id bigint,
  clover_amount integer,
  available_at timestamptz,
  is_replay boolean,
  report_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_confirmation public.alternative_payment_confirmation%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || p_verified_member_id::text, 0)
  );
  SELECT * INTO v_confirmation FROM public.alternative_payment_confirmation
  WHERE intent_id = p_intent_id AND member_id = p_verified_member_id FOR UPDATE;
  IF NOT FOUND OR v_confirmation.request_key <> p_request_key
     OR v_confirmation.status NOT IN ('CONFIRMING', 'CREDITED') THEN
    RAISE EXCEPTION 'payment_confirmation_not_started' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.account_deletion_job
    WHERE member_id = p_verified_member_id
      AND status IN ('REQUESTED', 'EXTERNAL_REVOKED', 'DATA_DELETED', 'AUTH_DELETED')
  ) THEN
    RAISE EXCEPTION 'account_deletion_in_progress' USING ERRCODE = '55000';
  END IF;
  IF v_confirmation.status = 'CONFIRMING' THEN
    UPDATE public.store_purchase_intent
    SET expires_at = GREATEST(expires_at, now() + interval '1 minute')
    WHERE id = p_intent_id AND status = 'CREATED';
  END IF;
  RETURN QUERY SELECT * FROM public.credit_alternative_store_purchase_v1(
    p_intent_id, p_verified_member_id, p_account_binding, p_payment_key,
    p_order_id, p_product_id, p_environment, p_message, p_is_anonymous,
    p_request_key, p_purchased_at, p_external_transaction_token_enc,
    p_user_tax_region
  );
  UPDATE public.alternative_payment_confirmation
  SET status = 'CREDITED', settled_at = COALESCE(settled_at, now()),
      updated_at = now()
  WHERE intent_id = p_intent_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_alternative_payment_recovery(
  p_intent_id uuid,
  p_member_id uuid,
  p_payment_key text,
  p_order_id text,
  p_request_key text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_intent public.store_purchase_intent%ROWTYPE;
  v_case_id bigint;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || p_member_id::text, 0)
  );
  SELECT * INTO v_intent FROM public.store_purchase_intent
  WHERE id = p_intent_id AND supporter_member_id = p_member_id
    AND provider = 'GOOGLE_ALTERNATIVE' FOR UPDATE;
  IF NOT FOUND OR v_intent.request_key <> p_request_key THEN
    RAISE EXCEPTION 'transaction_binding_mismatch' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.account_deletion_job
    WHERE member_id = p_member_id
      AND status IN ('EXTERNAL_REVOKED', 'DATA_DELETED', 'AUTH_DELETED')
  ) THEN
    RAISE EXCEPTION 'account_deletion_in_progress' USING ERRCODE = '55000';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.alternative_payment_confirmation
    WHERE intent_id = p_intent_id AND member_id = p_member_id
      AND status IN ('CONFIRMING', 'RECONCILIATION_REQUIRED', 'RECOVERY_REQUIRED')
  ) THEN
    RAISE EXCEPTION 'payment_confirmation_not_started' USING ERRCODE = '55000';
  END IF;

  INSERT INTO public.store_recovery_case(
    purchase_id, intent_id, member_id, clover_shortfall, status,
    provider_transaction_id, provider_order_id, request_key
  ) VALUES (
    NULL, p_intent_id, p_member_id, v_intent.clover_amount, 'OPEN',
    p_payment_key, p_order_id, p_request_key
  )
  ON CONFLICT (intent_id) WHERE intent_id IS NOT NULL DO UPDATE
  SET provider_transaction_id = EXCLUDED.provider_transaction_id,
      provider_order_id = EXCLUDED.provider_order_id,
      request_key = EXCLUDED.request_key
  RETURNING id INTO v_case_id;

  INSERT INTO public.store_purchase_event(
    purchase_id, provider, provider_event_id, provider_transaction_id,
    event_type, occurred_at, normalization_status, payload_hash, result_code
  ) VALUES (
    NULL, 'GOOGLE_ALTERNATIVE', 'compensation:' || p_payment_key,
    p_payment_key, 'PAYMENT_COMPENSATION_FAILED', now(), 'RETRY',
    pg_catalog.encode(extensions.digest(
      pg_catalog.convert_to(p_intent_id::text || ':' || p_order_id, 'UTF8'),
      'sha256'
    ), 'hex'),
    'CANCEL_FAILED'
  ) ON CONFLICT (provider, provider_event_id) DO NOTHING;

  UPDATE public.alternative_payment_confirmation
  SET status = 'RECOVERY_REQUIRED', updated_at = now()
  WHERE intent_id = p_intent_id;
  UPDATE public.account_deletion_job
  SET status = 'BLOCKED_PENDING_PAYMENT',
      blocked_reason = 'account_settlement_pending', updated_at = now()
  WHERE member_id = p_member_id
    AND status IN ('REQUESTED', 'BLOCKED_PENDING_PAYMENT');
  RETURN v_case_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_account_deletion_external_revoked(
  p_member_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || p_member_id::text, 0)
  );
  SELECT status INTO v_status FROM public.account_deletion_job
  WHERE member_id = p_member_id FOR UPDATE;
  IF v_status IN ('EXTERNAL_REVOKED', 'DATA_DELETED', 'AUTH_DELETED') THEN
    RETURN v_status;
  END IF;
  IF v_status NOT IN ('REQUESTED', 'BLOCKED_PENDING_PAYMENT') THEN
    RAISE EXCEPTION 'account_deletion_state_invalid' USING ERRCODE = '55000';
  END IF;
  IF public.account_deletion_has_pending_payment(p_member_id) THEN
    UPDATE public.account_deletion_job
    SET status = 'BLOCKED_PENDING_PAYMENT',
        blocked_reason = 'account_settlement_pending', updated_at = now()
    WHERE member_id = p_member_id;
    RETURN 'BLOCKED_PENDING_PAYMENT';
  END IF;
  UPDATE public.account_deletion_job
  SET status = 'EXTERNAL_REVOKED', external_revoked_at = COALESCE(external_revoked_at, now()),
      blocked_reason = NULL, last_error_code = NULL, updated_at = now()
  WHERE member_id = p_member_id;
  RETURN 'EXTERNAL_REVOKED';
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_account_data(
  p_member_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || p_member_id::text, 0)
  );
  SELECT status INTO v_status FROM public.account_deletion_job
  WHERE member_id = p_member_id FOR UPDATE;
  IF v_status IN ('DATA_DELETED', 'AUTH_DELETED') THEN
    RETURN v_status;
  END IF;
  IF v_status IS NULL OR v_status <> 'EXTERNAL_REVOKED' THEN
    RAISE EXCEPTION 'account_deletion_state_invalid' USING ERRCODE = '55000';
  END IF;
  IF public.account_deletion_has_pending_payment(p_member_id) THEN
    RAISE EXCEPTION 'account_settlement_pending' USING ERRCODE = '55000';
  END IF;

  UPDATE public.store_purchase_intent SET status = 'CANCELED'
  WHERE supporter_member_id = p_member_id AND status = 'CREATED';
  DELETE FROM public.device_push_token WHERE member_id = p_member_id;
  DELETE FROM public.member_preference WHERE member_id = p_member_id;
  DELETE FROM public.notification WHERE member_id = p_member_id;
  DELETE FROM public.friend_connection
  WHERE member_low_id = p_member_id OR member_high_id = p_member_id;
  DELETE FROM public.friend_invite
  WHERE inviter_member_id = p_member_id OR accepted_by = p_member_id;
  DELETE FROM public.social_cheer_member_attribution WHERE supporter_member_id = p_member_id;
  DELETE FROM public.kyc_verification WHERE member_id = p_member_id;
  DELETE FROM public.admin_member WHERE member_id = p_member_id;
  DELETE FROM public.profile_avatar_asset WHERE owner_member_id = p_member_id;
  DELETE FROM public.goal_cover_asset WHERE owner_member_id = p_member_id;

  UPDATE public.goal
  SET title = '삭제된 목표', reason = NULL, slug = 'deleted-' || id::text,
      status = 'DELETED', deleted_at = COALESCE(deleted_at, now()),
      active_cover_asset_id = NULL
  WHERE member_id = p_member_id;
  UPDATE public.cashout_request
  SET bank_code = NULL, account_no_enc = NULL, account_holder = NULL,
      account_masked = NULL, contact = NULL,
      account_purged_at = COALESCE(account_purged_at, now())
  WHERE member_id = p_member_id;
  UPDATE public.risk_event
  SET detail = pg_catalog.jsonb_build_object('accountDeleted', true)
  WHERE member_id = p_member_id;
  UPDATE public.member
  SET provider = NULL, provider_id = NULL, nickname = NULL,
      profile_image = NULL, birth_date = NULL, kyc_status = 'NONE',
      ci = NULL, phone = NULL, bio = NULL,
      deleted_at = COALESCE(deleted_at, now())
  WHERE id = p_member_id;
  UPDATE public.account_deletion_job
  SET status = 'DATA_DELETED', data_deleted_at = COALESCE(data_deleted_at, now()),
      updated_at = now()
  WHERE member_id = p_member_id;
  RETURN 'DATA_DELETED';
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_account_deletion_auth(
  p_member_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || p_member_id::text, 0)
  );
  SELECT status INTO v_status FROM public.account_deletion_job
  WHERE member_id = p_member_id FOR UPDATE;
  IF v_status = 'AUTH_DELETED' THEN RETURN v_status; END IF;
  IF v_status <> 'DATA_DELETED' THEN
    RAISE EXCEPTION 'account_deletion_state_invalid' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = p_member_id) THEN
    RAISE EXCEPTION 'account_auth_still_present' USING ERRCODE = '55000';
  END IF;
  UPDATE public.account_deletion_job
  SET status = 'AUTH_DELETED', auth_deleted_at = COALESCE(auth_deleted_at, now()),
      updated_at = now()
  WHERE member_id = p_member_id;
  RETURN 'AUTH_DELETED';
END;
$$;

DROP FUNCTION IF EXISTS public.prepare_account_deletion(uuid,text);
DROP FUNCTION IF EXISTS public.prepare_account_deletion_v1(uuid,text);
DROP FUNCTION IF EXISTS public.assert_account_deletion_settled(uuid,text);
DROP FUNCTION IF EXISTS public.complete_account_deletion(uuid,text);

REVOKE ALL ON FUNCTION public.account_deletion_has_pending_payment(uuid),
  public.request_account_deletion(uuid),
  public.begin_alternative_payment_confirmation(uuid,uuid,text),
  public.settle_alternative_payment_confirmation(uuid,uuid,text),
  public.credit_alternative_store_purchase(uuid,uuid,uuid,text,text,text,text,text,boolean,text,timestamptz,bytea,text),
  public.record_alternative_payment_recovery(uuid,uuid,text,text,text),
  public.mark_account_deletion_external_revoked(uuid),
  public.delete_account_data(uuid),
  public.complete_account_deletion_auth(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_deletion_has_pending_payment(uuid),
  public.request_account_deletion(uuid),
  public.begin_alternative_payment_confirmation(uuid,uuid,text),
  public.settle_alternative_payment_confirmation(uuid,uuid,text),
  public.credit_alternative_store_purchase(uuid,uuid,uuid,text,text,text,text,text,boolean,text,timestamptz,bytea,text),
  public.record_alternative_payment_recovery(uuid,uuid,text,text,text),
  public.mark_account_deletion_external_revoked(uuid),
  public.delete_account_data(uuid),
  public.complete_account_deletion_auth(uuid)
  TO service_role;

COMMIT;
