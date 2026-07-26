-- =============================================================================
-- clover_amount_krw_fix — 클로버 환산 버그 수정: 1클로버 = 1,000원
-- =============================================================================
-- 배경(회장 실 테스트결제로 발견, 2026-07-20): create_cheer_order가 cheer.clover_amount
-- 컬럼에 결제금액(원)을 그대로(p_clover_amount = p_amount_krw) 저장하고 있었다.
-- 그 결과 1,000원 응원이 1,000클로버로 적립되어 home의 원화환산(clover_count * 1,000,
-- min_cashout_clover 코멘트 "30클로버=30,000원, 1클로버=1,000원 등가")과 1000배 어긋났다.
--
-- 설계 진실원(이미 코드베이스 전반에 박혀 있던 의도):
--   1클로버 = 1,000원. 따라서 1,000원→1클로버, 3,000→3, 5,000→5, 10,000→10.
--   (min_cashout_clover()=30개=30,000원 코멘트, home krwEquivalent=cloverCount*1000이 근거.)
--
-- 수정 2곳(이 함수 안에서만; confirm_cheer_payment는 cheer.clover_amount를 그대로
-- 읽어 원장에 적립하므로 create 단계가 올바르면 자동 정합 — 변경 불필요):
--   ① 검증: p_clover_amount != p_amount_krw  →  p_clover_amount != p_amount_krw / 1000
--      (EF가 amountKrw/1000으로 계산해 넘긴 값과 RPC 재계산값의 일치를 확인하는 심층방어)
--   ② 저장: cheer.clover_amount 컬럼값 p_clover_amount → p_amount_krw / 1000
--      (서버가 저장값의 유일 진실원 — 클라이언트/EF 입력을 신뢰하지 않고 항상 재계산.
--       p_amount_krw는 위에서 (1000,3000,5000,10000)로 이미 검증되어 전부 1000의 배수 →
--       정수 나눗셈에 나머지 없음.)
--
-- p_amount_krw NOT IN (1000,3000,5000,10000) 검증은 원단위 그대로 유지(결제 금액 검증이지
-- 클로버 검증이 아님). request_fingerprint는 amount_krw 기반이라 변경 없음.
-- welcome_clover(payment_id NULL, is_welcome=true)는 이 함수를 거치지 않으므로 무영향.
--
-- 시그니처 동일(9-인자) — CREATE OR REPLACE, DROP 불필요. 20260713190000_cheer_order_
-- request_fingerprint.sql 최신본 기준으로 위 2줄만 변경한 완전 재정의.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_cheer_order(
  p_goal_id bigint,
  p_order_id text,
  p_amount_krw integer,
  p_clover_amount integer,
  p_display_name text,
  p_is_anonymous boolean,
  p_message text,
  p_pg_customer_key text,
  p_request_key text DEFAULT NULL
)
RETURNS TABLE(payment_id bigint, cheer_id bigint, order_id text, is_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_goal_id bigint;
  v_payment_id bigint;
  v_cheer_id bigint;
  v_customer_key text;
  v_request_fingerprint jsonb;
  v_existing_payment payment%ROWTYPE;
  v_existing_cheer_id bigint;
  v_recent_customer_count integer;
  v_recent_goal_count integer;
  c_customer_window_limit CONSTANT integer := 5;
  c_goal_window_limit CONSTANT integer := 20;
BEGIN
  PERFORM expire_stale_cheer_payments();

  IF p_order_id IS NULL OR p_order_id !~ '^[A-Za-z0-9_=.-]{6,64}$' THEN
    RAISE EXCEPTION 'invalid_order_id' USING ERRCODE = '22023';
  END IF;

  IF p_amount_krw NOT IN (1000, 3000, 5000, 10000) THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;

  -- 클로버 환산 심층방어(2026-07-20 수정): 1클로버=1,000원. EF가 넘긴 p_clover_amount가
  -- 서버 재계산값(p_amount_krw/1000)과 일치하는지 확인. 저장값 자체는 아래에서 재계산.
  IF p_clover_amount != p_amount_krw / 1000 THEN
    RAISE EXCEPTION 'amount_mismatch' USING ERRCODE = '22023';
  END IF;

  IF p_message IS NOT NULL AND length(p_message) > 140 THEN
    RAISE EXCEPTION 'message_too_long' USING ERRCODE = '22023';
  END IF;

  IF p_request_key IS NOT NULL AND p_request_key !~ '^[A-Za-z0-9_-]{8,128}$' THEN
    RAISE EXCEPTION 'invalid_request_key' USING ERRCODE = '22023';
  END IF;

  v_customer_key := COALESCE(NULLIF(p_pg_customer_key, ''), 'ANONYMOUS');

  v_request_fingerprint := jsonb_build_object(
    'goal_id', p_goal_id,
    'customer_key', v_customer_key,
    'amount_krw', p_amount_krw,
    'display_name', CASE WHEN p_is_anonymous THEN NULL ELSE NULLIF(left(trim(COALESCE(p_display_name, '')), 30), '') END,
    'is_anonymous', COALESCE(p_is_anonymous, false),
    'message', NULLIF(left(trim(COALESCE(p_message, '')), 140), '')
  );

  IF p_request_key IS NOT NULL THEN
    SELECT * INTO v_existing_payment
    FROM payment
    WHERE request_key = p_request_key;

    IF v_existing_payment.id IS NOT NULL THEN
      IF v_existing_payment.request_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
        RAISE EXCEPTION 'request_key_conflict' USING ERRCODE = '22023';
      END IF;

      SELECT c.id INTO v_existing_cheer_id
      FROM cheer c
      WHERE c.payment_id = v_existing_payment.id
      LIMIT 1;

      RETURN QUERY SELECT
        v_existing_payment.id,
        v_existing_cheer_id,
        v_existing_payment.order_id,
        true;
      RETURN;
    END IF;
  END IF;

  SELECT id INTO v_goal_id
  FROM goal
  WHERE id = p_goal_id
    AND status = 'ACTIVE'
    AND deleted_at IS NULL
  FOR SHARE;

  IF v_goal_id IS NULL THEN
    RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('cheer_rl_customer:' || v_customer_key, 0));

  SELECT count(*) INTO v_recent_customer_count
  FROM payment p
  WHERE p.pg_customer_key = v_customer_key
    AND p.status = 'READY'
    AND p.created_at > now() - interval '10 minutes';

  IF v_recent_customer_count >= c_customer_window_limit THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('cheer_rl_goal:' || p_goal_id::text, 0));

  SELECT count(*) INTO v_recent_goal_count
  FROM payment p
  JOIN cheer c ON c.payment_id = p.id
  WHERE c.goal_id = p_goal_id
    AND p.status = 'READY'
    AND p.created_at > now() - interval '10 minutes';

  IF v_recent_goal_count >= c_goal_window_limit THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO payment (
    order_id,
    amount_krw,
    status,
    pg_customer_key,
    request_key,
    request_fingerprint
  )
  VALUES (
    p_order_id,
    p_amount_krw,
    'READY',
    v_customer_key,
    p_request_key,
    v_request_fingerprint
  )
  ON CONFLICT (request_key) WHERE request_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_payment_id;

  IF v_payment_id IS NULL THEN
    SELECT * INTO v_existing_payment
    FROM payment
    WHERE request_key = p_request_key;

    IF v_existing_payment.request_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RAISE EXCEPTION 'request_key_conflict' USING ERRCODE = '22023';
    END IF;

    SELECT c.id INTO v_existing_cheer_id
    FROM cheer c
    WHERE c.payment_id = v_existing_payment.id
    LIMIT 1;

    RETURN QUERY SELECT
      v_existing_payment.id,
      v_existing_cheer_id,
      v_existing_payment.order_id,
      true;
    RETURN;
  END IF;

  INSERT INTO cheer (
    goal_id,
    payment_id,
    display_name,
    is_anonymous,
    message,
    clover_amount,
    status
  )
  VALUES (
    p_goal_id,
    v_payment_id,
    CASE WHEN p_is_anonymous THEN NULL ELSE NULLIF(left(trim(COALESCE(p_display_name, '')), 30), '') END,
    COALESCE(p_is_anonymous, false),
    NULLIF(left(trim(COALESCE(p_message, '')), 140), ''),
    p_amount_krw / 1000,  -- 서버 재계산(1클로버=1,000원). 클라이언트/EF 입력 미신뢰. (2026-07-20 수정)
    'PENDING'
  )
  RETURNING id INTO v_cheer_id;

  INSERT INTO payment_log (payment_id, from_status, to_status, detail)
  VALUES (v_payment_id, NULL, 'READY', jsonb_build_object('source', 'create_cheer_order'));

  RETURN QUERY SELECT v_payment_id, v_cheer_id, p_order_id, false;
END;
$$;

COMMENT ON FUNCTION create_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text, text
) IS
  '응원 주문 생성. 클로버 환산 1클로버=1,000원(cheer.clover_amount=amount_krw/1000, 서버 재계산) +
   opportunistic stale 정리 + customer_key/goal 이중 rate limit + request_key 멱등(fingerprint).
   service_role 전용. (2026-07-20 clover_amount_krw_fix)';

REVOKE ALL ON FUNCTION create_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION create_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text, text
) TO service_role;
