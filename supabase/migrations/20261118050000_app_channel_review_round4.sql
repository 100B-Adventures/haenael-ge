-- App-channel review round 4: server-owned alternative checkout, durable
-- compensation recovery, resumable account deletion, and Apple revocation.
-- Additive/local-first. Production application requires explicit approval.
BEGIN;

CREATE TABLE public.alternative_checkout_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id uuid NOT NULL UNIQUE REFERENCES public.store_purchase_intent(id) ON DELETE RESTRICT,
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  order_id text NOT NULL UNIQUE CHECK (order_id ~ '^[A-Za-z0-9_=-]{6,64}$'),
  return_url text NOT NULL CHECK (length(return_url) BETWEEN 12 AND 500),
  expires_at timestamptz NOT NULL,
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alternative_checkout_session ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.alternative_checkout_session FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.alternative_checkout_session TO service_role;

ALTER TABLE public.store_recovery_case
  ALTER COLUMN purchase_id DROP NOT NULL,
  ADD COLUMN intent_id uuid REFERENCES public.store_purchase_intent(id) ON DELETE RESTRICT,
  ADD COLUMN provider_transaction_id text,
  ADD COLUMN provider_order_id text,
  ADD COLUMN request_key text CHECK (
    request_key IS NULL OR request_key ~ '^[A-Za-z0-9_-]{8,128}$'
  ),
  ADD CONSTRAINT store_recovery_case_origin_check CHECK (
    (purchase_id IS NOT NULL AND intent_id IS NULL)
    OR (purchase_id IS NULL AND intent_id IS NOT NULL)
  );
CREATE UNIQUE INDEX store_recovery_case_intent_idx
  ON public.store_recovery_case(intent_id) WHERE intent_id IS NOT NULL;

CREATE TABLE public.apple_token_revocation (
  member_id uuid PRIMARY KEY REFERENCES public.member(id) ON DELETE RESTRICT,
  token_enc bytea,
  status text NOT NULL CHECK (
    status IN ('READY', 'RETRY_REQUIRED', 'MANUAL_REQUIRED', 'REVOKED')
  ),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error_code text,
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'REVOKED') = (revoked_at IS NOT NULL))
);
ALTER TABLE public.apple_token_revocation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.apple_token_revocation FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.apple_token_revocation TO service_role;

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
REVOKE ALL ON FUNCTION public.record_alternative_payment_recovery(uuid,uuid,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_alternative_payment_recovery(uuid,uuid,text,text,text)
  TO service_role;

-- Keep the previously reviewed destructive preparation body intact and put a
-- resume guard in front of it. A new client request key can resume the one open
-- PREPARED/AUTH_DELETED request for the same member.
ALTER FUNCTION public.prepare_account_deletion(uuid,text)
  RENAME TO prepare_account_deletion_v1;
REVOKE ALL ON FUNCTION public.prepare_account_deletion_v1(uuid,text)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.prepare_account_deletion(
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
  RETURN QUERY SELECT * FROM public.prepare_account_deletion_v1(p_member_id, p_request_key);
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_account_deletion(
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
  UPDATE public.account_deletion_request
  SET status = 'AUTH_DELETED', auth_deleted_at = COALESCE(auth_deleted_at, now()),
      last_error_code = NULL, updated_at = now()
  WHERE id = (
    SELECT id FROM public.account_deletion_request
    WHERE member_id = p_member_id AND status IN ('PREPARED', 'AUTH_DELETED')
    ORDER BY (request_key = p_request_key) DESC, prepared_at DESC, id DESC
    LIMIT 1
  );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'account_deletion_request_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_account_deletion(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_account_deletion(uuid,text) TO service_role;

COMMENT ON TABLE public.alternative_checkout_session IS
  'Opaque one-time checkout session. Amount and product are resolved from the server catalog.';
COMMENT ON TABLE public.apple_token_revocation IS
  'Encrypted Sign in with Apple revocation credential and retry/manual audit state.';
COMMENT ON FUNCTION public.record_alternative_payment_recovery(uuid,uuid,text,text,text) IS
  'Atomically records an open recovery case and payment event after approval and cancel both fail.';

COMMIT;
