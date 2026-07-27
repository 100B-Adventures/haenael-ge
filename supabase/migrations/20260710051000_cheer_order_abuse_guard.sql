-- =============================================================================
-- cheer_order_abuse_guard — public cheer-order 남용 방지
-- =============================================================================
-- Purpose:
--   cheer-order EF는 anon bearer로 공개 호출 가능하다. rate limit·요청 멱등·stale
--   행 정리가 없으면 자동화 호출로 버려진 payment/cheer 행이 무한 생성될 수 있다.
--   기존 아키텍처(원자 로직 = DB RPC, service_role 전용)를 유지한 채 DB 레벨에서
--   최소 안전장치를 추가한다. 서버리스 EF는 인스턴스 간 상태 공유가 없으므로
--   임의 인메모리 rate limit은 무의미 — 전부 DB 기반으로 구현한다.
--
-- 담는 것:
--   1) payment.request_key — 클라이언트 제공 요청 멱등키(선택). 동일 키 재요청은
--      새 행을 만들지 않고 기존 주문을 반환한다.
--   2) expire_stale_cheer_payments() — 30분 넘게 READY로 방치된 payment + 대응
--      PENDING cheer를 EXPIRED로 전이(payment_log 감사 기록 포함).
--   3) create_cheer_order 재정의 — 진입 시 opportunistic 정리 호출 + 동일
--      pg_customer_key/goal 기준 최근 10분 내 READY 주문 수 상한 + 멱등키 처리.
--   4) pg_cron 가용 시 주기 정리 등록(가용하지 않으면 조용히 skip — opportunistic
--      정리만으로도 안전).
-- =============================================================================

-- =====================
-- 1. request_key 컬럼
-- =====================

ALTER TABLE payment ADD COLUMN IF NOT EXISTS request_key text;
COMMENT ON COLUMN payment.request_key IS
  '클라이언트 제공 요청 멱등키(선택, 8~128자). 동일 키 재요청 시 새 주문을 만들지 않고 기존 주문을 반환한다. order_id UNIQUE는 서버가 생성한 값이라 클라이언트 재시도 방어가 안 되기 때문에 별도로 둔다.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_request_key_unique
  ON payment(request_key)
  WHERE request_key IS NOT NULL;

-- =====================
-- 2. stale 정리
-- =====================

CREATE OR REPLACE FUNCTION expire_stale_cheer_payments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired_count integer := 0;
  v_payment_id bigint;
BEGIN
  -- FOR UPDATE SKIP LOCKED: 동시에 confirm_cheer_payment가 같은 행을 잠그고 있으면
  -- (사용자가 지금 막 결제 승인 중) 건너뛴다 — 다음 opportunistic 호출에서 재시도되므로
  -- 안전하고, confirm 트랜잭션과 데드락하지 않는다.
  FOR v_payment_id IN
    SELECT id FROM payment
    WHERE status = 'READY'
      AND created_at < now() - interval '30 minutes'
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE payment
    SET status = 'EXPIRED'
    WHERE id = v_payment_id;

    UPDATE cheer
    SET status = 'EXPIRED'
    WHERE payment_id = v_payment_id
      AND status = 'PENDING';

    INSERT INTO payment_log (payment_id, from_status, to_status, detail)
    VALUES (
      v_payment_id,
      'READY',
      'EXPIRED',
      jsonb_build_object('source', 'expire_stale_cheer_payments', 'reason', 'stale_ready_30m')
    );

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN v_expired_count;
END;
$$;

COMMENT ON FUNCTION expire_stale_cheer_payments() IS
  '30분 넘게 READY로 방치된 payment + 대응 PENDING cheer를 EXPIRED로 전이. create_cheer_order 진입 시 opportunistic 호출 + (가용 시) pg_cron 주기 호출.';

REVOKE ALL ON FUNCTION expire_stale_cheer_payments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION expire_stale_cheer_payments() TO service_role;

-- =====================
-- 3. create_cheer_order 재정의 (rate limit + 멱등 + opportunistic 정리)
-- =====================
-- 시그니처가 바뀌므로(파라미터 1개 추가) CREATE OR REPLACE로는 기존 8-인자 함수가
-- 남아있게 된다(오버로드) — 그 구버전은 rate limit/멱등이 없으므로 반드시 먼저 DROP한다.
DROP FUNCTION IF EXISTS create_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text
);

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
  v_existing_payment payment%ROWTYPE;
  v_existing_cheer_id bigint;
  v_recent_customer_count integer;
  v_recent_goal_count integer;
  -- 보수적 상한: 정상 사용자는 절대 안 걸리게, 자동화 남용만 막는 수치.
  c_customer_window_limit CONSTANT integer := 5;
  c_goal_window_limit CONSTANT integer := 20;
BEGIN
  -- opportunistic 정리: 스케줄러 없이도 stale 행이 rate limit 카운트를 오염시키지 않게
  -- 매 진입마다 먼저 정리한다. 실패해도(이론상 거의 없음) 주문 생성 자체는 막지 않는다.
  PERFORM expire_stale_cheer_payments();

  IF p_order_id IS NULL OR p_order_id !~ '^[A-Za-z0-9_=.-]{6,64}$' THEN
    RAISE EXCEPTION 'invalid_order_id' USING ERRCODE = '22023';
  END IF;

  IF p_amount_krw NOT IN (1000, 3000, 5000, 10000) THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;

  IF p_clover_amount != p_amount_krw THEN
    RAISE EXCEPTION 'amount_mismatch' USING ERRCODE = '22023';
  END IF;

  IF p_message IS NOT NULL AND length(p_message) > 140 THEN
    RAISE EXCEPTION 'message_too_long' USING ERRCODE = '22023';
  END IF;

  IF p_request_key IS NOT NULL AND p_request_key !~ '^[A-Za-z0-9_-]{8,128}$' THEN
    RAISE EXCEPTION 'invalid_request_key' USING ERRCODE = '22023';
  END IF;

  -- 요청 멱등: 동일 request_key가 이미 있으면 새로 만들지 않고 기존 주문을 반환.
  -- (order_id UNIQUE는 서버가 새로 생성한 값이라 클라이언트 재시도를 못 막는다 — 이게 그 방어.)
  IF p_request_key IS NOT NULL THEN
    SELECT * INTO v_existing_payment
    FROM payment
    WHERE request_key = p_request_key
    FOR UPDATE;

    IF v_existing_payment.id IS NOT NULL THEN
      IF v_existing_payment.amount_krw != p_amount_krw THEN
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

  v_customer_key := COALESCE(NULLIF(p_pg_customer_key, ''), 'ANONYMOUS');

  -- rate limit ①: 동일 pg_customer_key 기준 최근 10분 내 미결(READY) 주문 수 상한.
  SELECT count(*) INTO v_recent_customer_count
  FROM payment p
  WHERE p.pg_customer_key = v_customer_key
    AND p.status = 'READY'
    AND p.created_at > now() - interval '10 minutes';

  IF v_recent_customer_count >= c_customer_window_limit THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';  -- 기본 raise_exception 클래스(P0004=assert_failure는 WHEN OTHERS로 잡히지 않아 피함)
  END IF;

  -- rate limit ②: 동일 goal 기준 최근 10분 내 미결(READY) 주문 수 상한.
  -- customer_key는 클라이언트가 자유롭게 재생성할 수 있으므로(①만으로는 우회 가능),
  -- goal 단위 상한을 같이 걸어 "한 목표에 무한 행 쌓기" 남용을 막는다.
  SELECT count(*) INTO v_recent_goal_count
  FROM payment p
  JOIN cheer c ON c.payment_id = p.id
  WHERE c.goal_id = p_goal_id
    AND p.status = 'READY'
    AND p.created_at > now() - interval '10 minutes';

  IF v_recent_goal_count >= c_goal_window_limit THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';  -- 기본 raise_exception 클래스(P0004=assert_failure는 WHEN OTHERS로 잡히지 않아 피함)
  END IF;

  INSERT INTO payment (
    order_id,
    amount_krw,
    status,
    pg_customer_key,
    request_key
  )
  VALUES (
    p_order_id,
    p_amount_krw,
    'READY',
    v_customer_key,
    p_request_key
  )
  RETURNING id INTO v_payment_id;

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
    p_clover_amount,
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
  '응원 주문 생성. 진입 시 opportunistic stale 정리 + customer_key/goal 이중 rate limit + request_key 멱등 재생. service_role 전용.';

REVOKE ALL ON FUNCTION create_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION create_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text, text
) TO service_role;

-- =====================
-- 4. pg_cron 주기 정리 (가용할 때만 — 없어도 opportunistic 정리로 안전)
-- =====================
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN insufficient_privilege OR feature_not_supported OR undefined_file THEN
    RAISE NOTICE 'pg_cron 확장을 사용할 수 없어 주기 정리 등록을 건너뜁니다 (opportunistic 정리는 계속 동작).';
    RETURN;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'expire-stale-cheer-payments'
  ) THEN
    PERFORM cron.schedule(
      'expire-stale-cheer-payments',
      '*/10 * * * *',
      $CRON$SELECT public.expire_stale_cheer_payments();$CRON$
    );
  END IF;
END $$;
