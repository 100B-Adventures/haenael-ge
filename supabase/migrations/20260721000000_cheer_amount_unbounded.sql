-- =============================================================================
-- cheer_amount_unbounded — 클로버 개수 자유입력 지원 (회장 지시 2026-07-21)
-- =============================================================================
-- 배경: "클로버를 보내는데 1000개가 아니고 1개, 더 큰 금액 예 1만개도 보낼 수
-- 있게" — 기존엔 amount_krw가 (1000,3000,5000,10000) 4종 화이트리스트로 고정돼
-- 있어 1클로버(1,000원) 미만 프리셋 밖 금액이나 1만 클로버(1,000만원) 같은 큰
-- 직접입력이 전부 invalid_amount로 거부됐다.
--
-- 변경: 4종 화이트리스트 → "1,000원의 배수 + 상한" 범위 검증으로 완화.
--   1클로버=1,000원 규약(clover.ts KRW_PER_CLOVER)은 그대로 유지 — 정수 나눗셈에
--   나머지가 남지 않게 1000의 배수만 허용한다. 상한 1억원(=100,000클로버)은
--   결제 게이트웨이 한도·정수 오버플로 방지용 안전판(회장 지시 "1만개" 요구를
--   충분히 상회하면서도 무제한은 아님).
--
-- 영향 함수 2개 — 각각 최신 정의(create_cheer_order=20260720020000,
-- confirm_cheer_payment=20260720010000)를 기준으로 금액 검증 줄만 교체한
-- 완전 재정의(CREATE OR REPLACE, 시그니처 동일 — DROP 불필요).
-- confirm_cheer_payment는 v_payment.amount_krw(=주문 생성 시 검증된 값)와
-- p_amount_krw(토스 서버승인 응답 금액) 일치를 이미 별도로 검증하므로, 여기서
-- p_amount_krw 자체의 화이트리스트를 완화해도 위조 결제 금액을 승인시킬 수 없다.
--
-- pgTAP 회귀(payment_abuse_guard.test.sql/welcome_clover.test.sql)는 기존
-- 1000/3000/5000/10000 고정값만 사용하므로 이 완화로 깨지지 않는다(상한 내 포함).
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
  -- 클로버 자유입력 상한: 1,000원의 배수 + 최대 1억원(=100,000클로버).
  c_max_amount_krw CONSTANT integer := 100000000;
BEGIN
  PERFORM expire_stale_cheer_payments();

  IF p_order_id IS NULL OR p_order_id !~ '^[A-Za-z0-9_=.-]{6,64}$' THEN
    RAISE EXCEPTION 'invalid_order_id' USING ERRCODE = '22023';
  END IF;

  -- 2026-07-21: 4종 화이트리스트 → 1,000원 배수 + 상한 범위 검증으로 완화(자유 클로버 개수 입력).
  IF p_amount_krw IS NULL OR p_amount_krw <= 0
     OR p_amount_krw % 1000 != 0
     OR p_amount_krw > c_max_amount_krw THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;

  -- 클로버 환산 심층방어: 1클로버=1,000원. EF가 넘긴 p_clover_amount가
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
    p_amount_krw / 1000,  -- 서버 재계산(1클로버=1,000원). 클라이언트/EF 입력 미신뢰.
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
   금액은 1,000원 배수 + 최대 1억원(자유 클로버 개수 입력, 2026-07-21) +
   opportunistic stale 정리 + customer_key/goal 이중 rate limit + request_key 멱등(fingerprint).
   service_role 전용.';

REVOKE ALL ON FUNCTION create_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION create_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text, text
) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION confirm_cheer_payment(
  p_order_id text,
  p_payment_key text,
  p_amount_krw integer,
  p_method text,
  p_approved_at timestamptz,
  p_receipt_url text,
  p_raw_response jsonb
)
RETURNS TABLE(
  payment_id bigint,
  cheer_id bigint,
  member_id uuid,
  goal_title text,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment payment%ROWTYPE;
  v_cheer cheer%ROWTYPE;
  v_goal goal%ROWTYPE;
  v_prev_balance integer;
  v_next_balance integer;
  c_max_amount_krw CONSTANT integer := 100000000;
BEGIN
  IF p_order_id IS NULL OR p_order_id !~ '^[A-Za-z0-9_=.-]{6,64}$' THEN
    RAISE EXCEPTION 'invalid_order_id' USING ERRCODE = '22023';
  END IF;

  IF p_payment_key IS NULL OR p_payment_key !~ '^[A-Za-z0-9_=.-]{6,200}$' THEN
    RAISE EXCEPTION 'invalid_payment_key' USING ERRCODE = '22023';
  END IF;

  -- 2026-07-21: 4종 화이트리스트 → 1,000원 배수 + 상한 범위 검증으로 완화(자유 클로버 개수 입력).
  -- 위조 방어는 아래 v_payment.amount_krw != p_amount_krw(주문 생성 시 검증된 원 금액과의
  -- 일치 확인)가 그대로 담당하므로 이 완화가 결제 무결성을 약화시키지 않는다.
  IF p_amount_krw IS NULL OR p_amount_krw <= 0
     OR p_amount_krw % 1000 != 0
     OR p_amount_krw > c_max_amount_krw THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_payment
  FROM payment p
  WHERE p.order_id = p_order_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.amount_krw != p_amount_krw THEN
    RAISE EXCEPTION 'amount_mismatch' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_cheer
  FROM cheer c
  WHERE c.payment_id = v_payment.id
  FOR UPDATE;

  IF v_cheer.id IS NULL THEN
    RAISE EXCEPTION 'cheer_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_goal
  FROM goal g
  WHERE g.id = v_cheer.goal_id
  FOR UPDATE;

  IF v_goal.id IS NULL THEN
    RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.status = 'DONE' THEN
    IF v_payment.payment_key IS NOT NULL AND v_payment.payment_key != p_payment_key THEN
      RAISE EXCEPTION 'payment_key_mismatch' USING ERRCODE = '22023';
    END IF;

    RETURN QUERY SELECT
      v_payment.id,
      v_cheer.id,
      v_goal.member_id,
      v_goal.title,
      COALESCE(v_cheer.display_name, '익명의 누군가');
    RETURN;
  END IF;

  IF v_payment.status != 'READY' THEN
    RAISE EXCEPTION 'invalid_payment_status' USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM member m
  WHERE m.id = v_goal.member_id
  FOR UPDATE;

  SELECT COALESCE(cb.clover_count, 0) INTO v_prev_balance
  FROM clover_balance cb
  WHERE cb.member_id = v_goal.member_id
  FOR UPDATE;

  v_prev_balance := COALESCE(v_prev_balance, 0);
  v_next_balance := v_prev_balance + v_cheer.clover_amount;

  UPDATE payment
  SET
    status = 'DONE',
    payment_key = p_payment_key,
    method = NULLIF(p_method, ''),
    approved_at = COALESCE(p_approved_at, now()),
    receipt_url = NULLIF(p_receipt_url, ''),
    raw_response = COALESCE(p_raw_response, '{}'::jsonb)
  WHERE id = v_payment.id;

  UPDATE cheer
  SET status = 'CONFIRMED'
  WHERE id = v_cheer.id;

  INSERT INTO payment_log (payment_id, from_status, to_status, detail)
  VALUES (
    v_payment.id,
    'READY',
    'DONE',
    jsonb_build_object('source', 'confirm_cheer_payment', 'paymentKey', p_payment_key)
  );

  INSERT INTO clover_ledger (
    member_id,
    entry_type,
    clover_delta,
    ref_type,
    ref_id,
    balance_after
  )
  VALUES (
    v_goal.member_id,
    'EARN',
    v_cheer.clover_amount,
    'cheer',
    v_cheer.id,
    v_next_balance
  );

  INSERT INTO notification (
    member_id,
    type,
    channel,
    alimtalk_status,
    read
  )
  VALUES (
    v_goal.member_id,
    'CHEER_RECEIVED',
    'INAPP',
    NULL,
    false
  );

  RETURN QUERY SELECT
    v_payment.id,
    v_cheer.id,
    v_goal.member_id,
    v_goal.title,
    COALESCE(v_cheer.display_name, '익명의 누군가');
END;
$$;

COMMENT ON FUNCTION confirm_cheer_payment(text, text, integer, text, timestamptz, text, jsonb) IS
  '결제 서버승인 확정 트랜잭션: payment DONE + cheer CONFIRMED + clover_ledger EARN +
   notification(CHEER_RECEIVED, INAPP). 금액은 1,000원 배수 + 최대 1억원(자유 클로버
   개수 입력, 2026-07-21) — 위조 방어는 v_payment.amount_krw 일치 검증이 담당.';
