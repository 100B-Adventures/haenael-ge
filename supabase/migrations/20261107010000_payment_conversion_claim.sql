-- 광고 전환은 브라우저 저장소가 아니라 결제 행에서 원자적으로 한 번만 claim한다.
-- 웹훅 선확정 뒤 첫 브라우저 callback은 claim=true, 이후 replay는 false다.
BEGIN;

CREATE OR REPLACE FUNCTION public.claim_payment_conversion(
  p_order_id text,
  p_payment_key text
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
BEGIN
  IF p_order_id IS NULL OR length(trim(p_order_id)) = 0
     OR p_payment_key IS NULL OR length(trim(p_payment_key)) = 0 THEN
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
  IF v_raw_response ? 'browserConversionClaimedAt' THEN
    RETURN false;
  END IF;

  UPDATE public.payment
  SET raw_response = v_raw_response || jsonb_build_object(
    'browserConversionClaimedAt', clock_timestamp()
  )
  WHERE id = v_payment.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_payment_conversion(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_conversion(text, text)
  TO service_role;

COMMENT ON FUNCTION public.claim_payment_conversion(text, text) IS
  'DONE 결제의 브라우저 광고 전환을 payment 행 잠금으로 한 번만 claim한다. service_role 전용.';

COMMIT;
