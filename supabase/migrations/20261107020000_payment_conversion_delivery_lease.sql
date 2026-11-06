-- 브라우저 광고 전환 전달은 영구 claim이 아니라 만료 가능한 lease 후 provider enqueue 성공 ack로 닫는다.
-- event_id는 lease 재발급에도 고정해 Meta eventID와 GA4 transaction_id 중복 제거에 사용한다.
BEGIN;

REVOKE ALL ON FUNCTION public.claim_payment_conversion(text, text)
  FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION public.claim_payment_conversion(text, text);

CREATE OR REPLACE FUNCTION public.lease_payment_conversion(
  p_order_id text,
  p_payment_key text,
  p_lease_seconds integer DEFAULT 300
)
RETURNS TABLE(
  eligible boolean,
  lease_token text,
  event_id text,
  expires_at timestamptz,
  delivery_state text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment public.payment%ROWTYPE;
  v_raw_response jsonb;
  v_delivery jsonb;
  v_now timestamptz := clock_timestamp();
  v_token uuid;
  v_event_id text;
  v_expires_at timestamptz;
BEGIN
  IF p_order_id IS NULL OR length(trim(p_order_id)) = 0
     OR p_payment_key IS NULL OR length(trim(p_payment_key)) = 0
     OR p_lease_seconds < 30 OR p_lease_seconds > 900 THEN
    RAISE EXCEPTION 'validation_error' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_payment
  FROM public.payment
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_payment.status <> 'DONE' THEN
    RAISE EXCEPTION 'invalid_payment_status' USING ERRCODE = '22023';
  END IF;
  IF v_payment.payment_key IS DISTINCT FROM p_payment_key THEN
    RAISE EXCEPTION 'payment_key_mismatch' USING ERRCODE = '22023';
  END IF;

  v_raw_response := CASE
    WHEN jsonb_typeof(v_payment.raw_response) = 'object' THEN v_payment.raw_response
    ELSE '{}'::jsonb
  END;
  v_delivery := v_raw_response -> 'browserConversionDelivery';
  v_event_id := COALESCE(v_delivery ->> 'eventId', 'haenael-purchase:' || p_order_id);

  IF v_delivery ->> 'state' = 'sent' THEN
    RETURN QUERY SELECT false, NULL::text, v_event_id, NULL::timestamptz, 'sent'::text;
    RETURN;
  END IF;

  IF v_delivery ->> 'state' = 'pending'
     AND NULLIF(v_delivery ->> 'leaseExpiresAt', '')::timestamptz > v_now THEN
    RETURN QUERY SELECT
      false,
      NULL::text,
      v_event_id,
      (v_delivery ->> 'leaseExpiresAt')::timestamptz,
      'pending'::text;
    RETURN;
  END IF;

  v_token := gen_random_uuid();
  v_expires_at := v_now + make_interval(secs => p_lease_seconds);

  UPDATE public.payment
  SET raw_response = (v_raw_response - 'browserConversionClaimedAt') || jsonb_build_object(
    'browserConversionDelivery', jsonb_build_object(
      'state', 'pending',
      'eventId', v_event_id,
      'leaseToken', v_token::text,
      'leaseStartedAt', v_now,
      'leaseExpiresAt', v_expires_at
    )
  )
  WHERE id = v_payment.id;

  RETURN QUERY SELECT true, v_token::text, v_event_id, v_expires_at, 'pending'::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.ack_payment_conversion(
  p_order_id text,
  p_payment_key text,
  p_lease_token text,
  p_event_id text
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment public.payment%ROWTYPE;
  v_raw_response jsonb;
  v_delivery jsonb;
BEGIN
  IF p_order_id IS NULL OR length(trim(p_order_id)) = 0
     OR p_payment_key IS NULL OR length(trim(p_payment_key)) = 0
     OR p_lease_token IS NULL OR length(trim(p_lease_token)) = 0
     OR p_event_id IS NULL OR length(trim(p_event_id)) = 0 THEN
    RAISE EXCEPTION 'validation_error' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_payment
  FROM public.payment
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_payment.status <> 'DONE' THEN
    RAISE EXCEPTION 'invalid_payment_status' USING ERRCODE = '22023';
  END IF;
  IF v_payment.payment_key IS DISTINCT FROM p_payment_key THEN
    RAISE EXCEPTION 'payment_key_mismatch' USING ERRCODE = '22023';
  END IF;

  v_raw_response := CASE
    WHEN jsonb_typeof(v_payment.raw_response) = 'object' THEN v_payment.raw_response
    ELSE '{}'::jsonb
  END;
  v_delivery := v_raw_response -> 'browserConversionDelivery';

  IF v_delivery ->> 'state' = 'sent' THEN
    RETURN v_delivery ->> 'eventId' = p_event_id;
  END IF;
  IF v_delivery ->> 'state' <> 'pending'
     OR v_delivery ->> 'leaseToken' <> p_lease_token
     OR v_delivery ->> 'eventId' <> p_event_id THEN
    RETURN false;
  END IF;

  UPDATE public.payment
  SET raw_response = v_raw_response || jsonb_build_object(
    'browserConversionDelivery', (v_delivery - 'leaseToken' - 'leaseExpiresAt') || jsonb_build_object(
      'state', 'sent',
      'sentAt', clock_timestamp()
    )
  )
  WHERE id = v_payment.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.lease_payment_conversion(text, text, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ack_payment_conversion(text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lease_payment_conversion(text, text, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.ack_payment_conversion(text, text, text, text)
  TO service_role;

COMMENT ON FUNCTION public.lease_payment_conversion(text, text, integer) IS
  'DONE 결제의 브라우저 전환 전달 lease를 발급한다. SELECT FOR UPDATE, service_role 전용.';
COMMENT ON FUNCTION public.ack_payment_conversion(text, text, text, text) IS
  'provider enqueue가 끝난 동일 lease와 event id를 sent로 전환한다. service_role 전용.';

COMMIT;
