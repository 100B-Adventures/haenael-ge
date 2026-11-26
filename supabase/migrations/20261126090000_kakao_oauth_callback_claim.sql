-- 동일한 카카오 authorization code는 서버에서 원자적으로 한 번만 소비한다.
-- 브라우저의 중복 callback이 auth-kakao EF를 두 번 호출해 앞 magic-link token을
-- 무효화하지 못하도록 service_role 전용 claim RPC를 둔다.
BEGIN;

CREATE TABLE public.kakao_oauth_callback_claim (
  code_hash text PRIMARY KEY,
  claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT kakao_oauth_callback_claim_hash_format
    CHECK (code_hash ~ '^[0-9a-f]{64}$')
);

ALTER TABLE public.kakao_oauth_callback_claim ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.kakao_oauth_callback_claim
  FROM PUBLIC, anon, authenticated, service_role;

CREATE INDEX kakao_oauth_callback_claim_claimed_at_idx
  ON public.kakao_oauth_callback_claim (claimed_at);

CREATE OR REPLACE FUNCTION public.claim_kakao_oauth_callback(
  p_code_hash text
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted integer;
BEGIN
  IF p_code_hash IS NULL OR p_code_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid_code_hash' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.kakao_oauth_callback_claim
  WHERE claimed_at < clock_timestamp() - interval '15 minutes';

  INSERT INTO public.kakao_oauth_callback_claim (code_hash)
  VALUES (p_code_hash)
  ON CONFLICT (code_hash) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_kakao_oauth_callback(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_kakao_oauth_callback(text)
  TO service_role;

COMMENT ON FUNCTION public.claim_kakao_oauth_callback(text) IS
  '카카오 authorization code SHA-256을 15분 동안 원자적으로 한 번만 claim한다. service_role 전용.';

COMMIT;
