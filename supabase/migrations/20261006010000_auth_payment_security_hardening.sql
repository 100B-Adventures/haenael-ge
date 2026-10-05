-- =============================================================================
-- 인증·결제 보안 보정
-- 1) (provider, provider_id) 유일성
-- 2) authenticated의 provider 식별자 수정 차단
-- 3) Toss 웹훅 transmission-id 원자 claim/완료 영수증
-- =============================================================================

BEGIN;

CREATE UNIQUE INDEX member_provider_identity_unique
  ON public.member(provider, provider_id)
  WHERE provider IS NOT NULL AND provider_id IS NOT NULL;

DROP POLICY IF EXISTS "member_update_own" ON public.member;
CREATE POLICY "member_update_own" ON public.member
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- RLS는 행 경계만 통제하므로 provider 식별자는 컬럼 권한으로 함께 잠근다.
-- service_role의 기존 테이블 UPDATE 권한은 유지되어 auth-kakao만 갱신할 수 있다.
REVOKE UPDATE ON TABLE public.member FROM authenticated;
GRANT UPDATE (nickname, profile_image, birth_date, phone)
  ON TABLE public.member TO authenticated;

CREATE TABLE public.toss_webhook_receipt (
  transmission_id text PRIMARY KEY,
  event_type text NOT NULL,
  payment_key text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  processed_at timestamptz,
  CONSTRAINT toss_webhook_receipt_transmission_id_length
    CHECK (length(transmission_id) BETWEEN 1 AND 255),
  CONSTRAINT toss_webhook_receipt_event_type_length
    CHECK (length(event_type) BETWEEN 1 AND 100),
  CONSTRAINT toss_webhook_receipt_payment_key_length
    CHECK (length(payment_key) BETWEEN 1 AND 200)
);

ALTER TABLE public.toss_webhook_receipt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.toss_webhook_receipt
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_toss_webhook(
  p_transmission_id text,
  p_event_type text,
  p_payment_key text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted text;
  v_claimed_at timestamptz;
  v_processed_at timestamptz;
BEGIN
  IF p_transmission_id IS NULL
     OR length(p_transmission_id) NOT BETWEEN 1 AND 255
     OR p_event_type IS NULL
     OR length(p_event_type) NOT BETWEEN 1 AND 100
     OR p_payment_key IS NULL
     OR length(p_payment_key) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'invalid_webhook_receipt' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.toss_webhook_receipt(
    transmission_id, event_type, payment_key
  )
  VALUES (p_transmission_id, p_event_type, p_payment_key)
  ON CONFLICT (transmission_id) DO NOTHING
  RETURNING transmission_id INTO v_inserted;

  IF v_inserted IS NOT NULL THEN
    RETURN 'claimed';
  END IF;

  SELECT claimed_at, processed_at
    INTO v_claimed_at, v_processed_at
  FROM public.toss_webhook_receipt
  WHERE transmission_id = p_transmission_id
  FOR UPDATE;

  IF v_processed_at IS NOT NULL THEN
    RETURN 'processed';
  END IF;

  -- 10초 응답 권고를 크게 넘긴 고아 claim만 회수한다. 정상 처리 중인 중복은
  -- in_progress로 거부해 원 결제 상태 전이가 끝나기 전에 200으로 삼키지 않는다.
  IF v_claimed_at < clock_timestamp() - interval '2 minutes' THEN
    UPDATE public.toss_webhook_receipt
      SET event_type = p_event_type,
          payment_key = p_payment_key,
          claimed_at = clock_timestamp()
    WHERE transmission_id = p_transmission_id;
    RETURN 'claimed';
  END IF;

  RETURN 'in_progress';
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_toss_webhook(
  p_transmission_id text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.toss_webhook_receipt
  SET processed_at = COALESCE(processed_at, clock_timestamp())
  WHERE transmission_id = p_transmission_id;
$$;

CREATE OR REPLACE FUNCTION public.release_toss_webhook(
  p_transmission_id text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.toss_webhook_receipt
  WHERE transmission_id = p_transmission_id
    AND processed_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.claim_toss_webhook(text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_toss_webhook(text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_toss_webhook(text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_toss_webhook(text, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_toss_webhook(text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.release_toss_webhook(text)
  TO service_role;

COMMENT ON TABLE public.toss_webhook_receipt IS
  'Toss tosspayments-webhook-transmission-id 원자 claim 영수증. service_role RPC 전용.';

COMMIT;
