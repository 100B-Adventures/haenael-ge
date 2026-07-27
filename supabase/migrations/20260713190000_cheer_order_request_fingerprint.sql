-- =============================================================================
-- cheer_order_request_fingerprint — request_key replay를 amount 단독이 아니라
-- 요청 전체 의미(semantic)로 비교하도록 강화
-- =============================================================================
-- 배경: Codex 3차 결제 리뷰(2026-07-13)가 20260713180819_cheer_order_concurrency_fix.sql
-- 의 request_key replay 판정이 amount_krw만 비교한다고 지적했다(95~117행 fast-path,
-- 193~215행 INSERT 경합 안전망). 동일 request_key를 다른 goal_id/customer_key/
-- displayName/isAnonymous/message로 재사용해도 기존 주문을 그대로 성공 반환하는
-- 문제 — 멱등키가 원 요청의 "의도" 전체가 아니라 금액에만 바인딩돼 있었다.
--
-- 수정: payment.request_fingerprint jsonb 컬럼을 신설해 create_cheer_order가 이미
-- cheer 테이블에 쓰는 정규화 표현(display_name/message/is_anonymous)과
-- customer_key/goal_id/amount_krw를 묶어 저장하고, replay 판정을 amount_krw 단일
-- 비교에서 request_fingerprint IS DISTINCT FROM 비교로 교체한다. IS DISTINCT FROM을
-- 쓰는 이유: `=` 연산자는 NULL과 비교하면 NULL(참도 거짓도 아님)을 반환해 message나
-- displayName이 NULL인 흔한 케이스에서 불일치를 못 잡는다 — IS DISTINCT FROM은
-- NULL도 다른 값과 동일하게 정확히 비교한다.
--
-- v_customer_key 계산(기존엔 goal 조회 이후, rate-limit 직전에 위치)을 함수 맨 앞
-- (포맷 검증 직후, request_key fast-path 이전)으로 끌어올린다 — fast-path에서도
-- fingerprint를 계산해 비교해야 하기 때문. v_customer_key := COALESCE(NULLIF(
-- p_pg_customer_key, ''), 'ANONYMOUS')는 p_pg_customer_key 인자에만 의존하고 goal
-- 조회 결과에 의존하지 않으므로 이 순서 이동은 안전하다(goal 미존재 시 fast-path
-- 에서 조기 반환되면 goal 조회 자체가 아예 실행되지 않는 경로가 생기지만, 그건
-- 의도된 최적화 — 원래도 fast-path는 goal 조회 이전에 있었다).
--
-- goal_id를 fingerprint에 그대로 포함하는 이유: replay 비교는 "원 요청과 이번
-- 요청이 같은 의도인가"를 판정하는 것이지 goal의 현재 유효성(ACTIVE/삭제 여부)을
-- 재검증하는 것이 아니다. goal이 나중에 상태가 바뀌어도(예: 삭제) 이미 존재하는
-- payment 행의 request_fingerprint는 생성 시점 goal_id를 그대로 보존하므로 replay
-- 판정 로직 자체는 goal 상태 변화에 영향받지 않는다.
--
-- 시그니처는 기존과 동일(9-인자) — CREATE OR REPLACE로 재정의, DROP 불필요.
-- =============================================================================

ALTER TABLE payment ADD COLUMN IF NOT EXISTS request_fingerprint jsonb;

COMMENT ON COLUMN payment.request_fingerprint IS
  'request_key 멱등 replay 판정용 정규화 스냅샷(goal_id/customer_key/amount_krw/
   display_name/is_anonymous/message). request_key가 NULL인 일반 주문은 NULL.
   비교는 IS DISTINCT FROM(NULL-safe). (2026-07-13 request fingerprint 강화)';

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
  -- 보수적 상한: 정상 사용자는 절대 안 걸리게, 자동화 남용만 막는 수치.
  c_customer_window_limit CONSTANT integer := 5;
  c_goal_window_limit CONSTANT integer := 20;
BEGIN
  -- opportunistic 정리: 스케줄러 없이도 stale 행이 rate limit 카운트를 오염시키지 않게
  -- 매 진입마다 먼저 정리한다. expire_stale_cheer_payments() 자체는 FOR UPDATE
  -- SKIP LOCKED로 내부적으로 동시성 안전 — 이 잠금 스코프 밖에 있어도 무방.
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

  -- v_customer_key 계산을 함수 맨 앞으로 끌어올림(기존엔 goal 조회 이후에 위치).
  -- p_pg_customer_key 인자에만 의존 — goal 조회 결과와 무관하므로 순서 이동 안전.
  v_customer_key := COALESCE(NULLIF(p_pg_customer_key, ''), 'ANONYMOUS');

  -- request fingerprint: cheer 테이블에 실제 저장될 정규화 표현을 그대로 재사용해
  -- 중복 정의로 인한 드리프트를 막는다(아래 cheer INSERT의 CASE/NULLIF 식과 동일).
  v_request_fingerprint := jsonb_build_object(
    'goal_id', p_goal_id,
    'customer_key', v_customer_key,
    'amount_krw', p_amount_krw,
    'display_name', CASE WHEN p_is_anonymous THEN NULL ELSE NULLIF(left(trim(COALESCE(p_display_name, '')), 30), '') END,
    'is_anonymous', COALESCE(p_is_anonymous, false),
    'message', NULLIF(left(trim(COALESCE(p_message, '')), 140), '')
  );

  -- 요청 멱등 fast path(최적화): 이미 커밋된 request_key가 있으면 goal 조회·
  -- rate-limit 카운트를 거치지 않고 조기 반환한다. 진짜 동시 경합(아래 두 트랜잭션이
  -- 동시에 이 SELECT를 통과)은 여기서 못 잡아도 아래쪽 INSERT ON CONFLICT 안전망이
  -- 최종적으로 처리하므로 정확성에는 영향 없다 — 순수 비용 절감용.
  --
  -- 비교는 request_fingerprint IS DISTINCT FROM(amount_krw 단독 비교였던 걸 교체) —
  -- 원 요청과 goal_id/customer_key/displayName/isAnonymous/message 중 하나라도
  -- 다르면 같은 request_key라도 conflict로 거부한다. IS DISTINCT FROM은 NULL을
  -- 포함해도 정확히 비교하므로(= 였다면 NULL 비교가 항상 거짓이 되어 불일치를
  -- 놓쳤을 것) message/displayName이 NULL인 흔한 케이스에서도 안전하다.
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

  -- 동시성 직렬화 ①: customer_key 기준 잠금 → 그 다음 goal 기준 잠금. 순서를 항상
  -- 고정(customer 먼저, goal 나중)해 두 호출이 반대 순서로 잠가 데드락하는 경우를
  -- 없앤다 — create_cheer_order가 이 두 잠금을 획득하는 유일한 경로이므로 이 함수
  -- 안에서 순서가 절대 바뀌지 않으면 데드락 불가능하다. pg_advisory_xact_lock은
  -- 트랜잭션(=이 함수 호출) COMMIT/ROLLBACK 시 자동 해제되므로 명시적 unlock 불필요.
  PERFORM pg_advisory_xact_lock(hashtextextended('cheer_rl_customer:' || v_customer_key, 0));

  -- rate limit ①: 동일 pg_customer_key 기준 최근 10분 내 미결(READY) 주문 수 상한.
  -- 잠금을 쥔 채로 count를 세고 이 함수 끝(아래 INSERT)까지 잠금이 유지되므로
  -- 동일 customer_key로 동시에 들어온 다른 호출은 이 지점에서 순차화된다.
  SELECT count(*) INTO v_recent_customer_count
  FROM payment p
  WHERE p.pg_customer_key = v_customer_key
    AND p.status = 'READY'
    AND p.created_at > now() - interval '10 minutes';

  IF v_recent_customer_count >= c_customer_window_limit THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';  -- 기본 raise_exception 클래스(P0004=assert_failure는 WHEN OTHERS로 잡히지 않아 피함)
  END IF;

  -- 동시성 직렬화 ②: goal_id 기준 잠금(customer 잠금 다음 순서 고정).
  PERFORM pg_advisory_xact_lock(hashtextextended('cheer_rl_goal:' || p_goal_id::text, 0));

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

  -- 동시성 안전망: SELECT-then-INSERT 대신 INSERT ... ON CONFLICT DO NOTHING을 쓴다.
  -- request_key가 NULL이면 부분 유니크 인덱스가 그 행을 아예 색인하지 않으므로 충돌
  -- 자체가 발생하지 않고(DO NOTHING은 효과 없음, 정상 INSERT), request_key가
  -- NOT NULL인데 동시에 같은 키로 커밋 중인 다른 트랜잭션이 있으면 그 트랜잭션이
  -- 끝날 때까지 자동 대기한 뒤 충돌을 판정한다(Postgres 표준 upsert 안전성) — 그래서
  -- "SELECT는 없다고 봤는데 나중에 23505로 터지는" 레이스가 이 패턴에서는 발생하지
  -- 않는다.
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
    -- 경합 패배: p_request_key IS NOT NULL인 경우에만 도달 가능(NULL은 절대 충돌
    -- 안 함). 동시에 커밋된 승자 행을 조회해 fast path와 동일한 규칙(fingerprint
    -- IS DISTINCT FROM)으로 수렴시킨다 — 일치 시 replay 응답, 불일치 시
    -- request_key_conflict.
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
  '응원 주문 생성. 진입 시 opportunistic stale 정리 + customer_key/goal 이중 rate limit
   (advisory xact lock으로 count+insert 직렬화, customer→goal 고정 순서) +
   request_key 멱등 재생(INSERT ... ON CONFLICT DO NOTHING 기반 동시성 안전,
   request_fingerprint jsonb로 goal_id/customer_key/amount/displayName/isAnonymous/
   message 전체를 비교해 semantic replay만 허용). service_role 전용.
   (2026-07-13 request fingerprint 강화)';

REVOKE ALL ON FUNCTION create_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION create_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text, text
) TO service_role;
