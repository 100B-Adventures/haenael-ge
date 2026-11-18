-- App-channel review round 5: shared payment/deletion serialization and
-- Apple access-token revocation fallback. Production application requires
-- explicit approval.
BEGIN;

ALTER TABLE public.apple_token_revocation
  ADD COLUMN token_type_hint text NOT NULL DEFAULT 'refresh_token'
  CHECK (token_type_hint IN ('refresh_token', 'access_token'));

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
    AND provider = 'GOOGLE_ALTERNATIVE'
  FOR UPDATE;
  IF NOT FOUND OR v_intent.request_key <> p_request_key THEN
    RAISE EXCEPTION 'transaction_binding_mismatch' USING ERRCODE = '23514';
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
  RETURN v_case_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_account_deletion(
  p_member_id uuid,
  p_request_key text
)
RETURNS TABLE(status text, is_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_open public.account_deletion_request%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_request_key !~ '^[A-Za-z0-9_-]{8,128}$' THEN
    RAISE EXCEPTION 'invalid_request_key' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || p_member_id::text, 0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('account_delete:' || p_member_id::text, 0)
  );
  SELECT * INTO v_open
  FROM public.account_deletion_request AS deletion_request
  WHERE deletion_request.member_id = p_member_id
    AND deletion_request.status IN ('PREPARED', 'AUTH_DELETED')
  ORDER BY deletion_request.prepared_at DESC, deletion_request.id DESC
  LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    RETURN QUERY SELECT v_open.status, true;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.store_purchase_intent AS intent
    WHERE intent.supporter_member_id = p_member_id
      AND intent.provider = 'GOOGLE_ALTERNATIVE'
      AND intent.status = 'CREATED'
      AND intent.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'account_settlement_pending' USING ERRCODE = '55000';
  END IF;
  RETURN QUERY SELECT * FROM public.prepare_account_deletion_v1(p_member_id, p_request_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_account_deletion_settled(
  p_member_id uuid,
  p_request_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || p_member_id::text, 0)
  );
  IF NOT EXISTS (
    SELECT 1 FROM public.account_deletion_request AS deletion_request
    WHERE deletion_request.member_id = p_member_id
      AND deletion_request.status = 'PREPARED'
      AND deletion_request.request_key = p_request_key
  ) OR EXISTS (
    SELECT 1 FROM public.store_recovery_case AS recovery
    WHERE recovery.member_id = p_member_id AND recovery.status = 'OPEN'
  ) THEN
    RAISE EXCEPTION 'account_settlement_pending' USING ERRCODE = '55000';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_alternative_payment_recovery(uuid,uuid,text,text,text),
  public.prepare_account_deletion(uuid,text),
  public.assert_account_deletion_settled(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_alternative_payment_recovery(uuid,uuid,text,text,text),
  public.prepare_account_deletion(uuid,text),
  public.assert_account_deletion_settled(uuid,text)
  TO service_role;

COMMENT ON FUNCTION public.assert_account_deletion_settled(uuid,text) IS
  'Rechecks the shared member settlement fence immediately before Auth deletion.';

COMMIT;
