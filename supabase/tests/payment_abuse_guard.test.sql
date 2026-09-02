-- =============================================================================
-- haenael-ge: cheer-order 남용 방지 실검증 (pgTAP)
-- 진실원: Codex money-code 2nd-pass 결함2 — 공개 cheer-order rate limit / 요청
-- 멱등 / stale 정리. 실 Postgres 위에서 create_cheer_order·expire_stale_cheer_payments
-- 를 직접 호출 — mock 없음 (헌법 §3).
-- =============================================================================

BEGIN;

SELECT plan(20);

-- =========================================================================
-- 픽스처 설정 (postgres = superuser, RLS bypass)
-- =========================================================================

-- 회장 결정 A(1계정 1활성목표, goal_one_active_per_member) 이후(2026-07-20 fix):
-- 같은 member_id로 ACTIVE goal 3개를 만들 수 없다 — 시나리오 격리용 goal 3개를
-- 서로 다른 member로 분리한다(슬러그/참조 로직은 그대로, member만 d/d2/d3로 분산).
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_anonymous
)
VALUES
  (
    'dddddddd-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user_d@test.local',
    '', now(), now(),
    '', '', '', '{}'::jsonb, '{}'::jsonb,
    false, false
  ),
  (
    'dddddddd-0000-0000-0000-000000000014',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user_d2@test.local',
    '', now(), now(),
    '', '', '', '{}'::jsonb, '{}'::jsonb,
    false, false
  ),
  (
    'dddddddd-0000-0000-0000-000000000024',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user_d3@test.local',
    '', now(), now(),
    '', '', '', '{}'::jsonb, '{}'::jsonb,
    false, false
  );

INSERT INTO member (id, nickname, kyc_status)
VALUES
  ('dddddddd-0000-0000-0000-000000000004', '사용자D', 'NONE'),
  ('dddddddd-0000-0000-0000-000000000014', '사용자D2', 'NONE'),
  ('dddddddd-0000-0000-0000-000000000024', '사용자D3', 'NONE');

-- 서로 다른 시나리오를 goal 단위로 격리(카운트 계산이 서로 오염되지 않게)
INSERT INTO goal (member_id, slug, title, due_date, status, deleted_at)
VALUES
  ('dddddddd-0000-0000-0000-000000000004', 'goal-abuse-guard-1', '남용방지 테스트1', now()::date + 30, 'ACTIVE', NULL),
  ('dddddddd-0000-0000-0000-000000000014', 'goal-abuse-guard-2', '남용방지 테스트2', now()::date + 30, 'ACTIVE', NULL),
  ('dddddddd-0000-0000-0000-000000000024', 'goal-abuse-guard-3', '남용방지 테스트3', now()::date + 30, 'ACTIVE', NULL);

-- =========================================================================
-- #AG-1: customer_key 기준 rate limit — 상한(5) 초과 시 6번째 주문 거부
-- =========================================================================
DO $$
DECLARE
  v_goal_id  bigint;
  v_customer text := 'rl_test_customer_001';
  v_result   record;
  v_i        integer;
  v_rejected boolean := false;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-abuse-guard-1' LIMIT 1;

  FOR v_i IN 1..5 LOOP
    SELECT * INTO v_result FROM create_cheer_order(
      v_goal_id, 'rl-order-' || v_i, 3000, 3, '', false, '', v_customer, NULL
    );
  END LOOP;

  BEGIN
    SELECT * INTO v_result FROM create_cheer_order(
      v_goal_id, 'rl-order-6', 3000, 3, '', false, '', v_customer, NULL
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'rate_limited' THEN
      v_rejected := true;
    END IF;
  END;

  PERFORM set_config('pgtap.ag_customer_rate_limited', v_rejected::text, true);
END $$;

SELECT is(
  current_setting('pgtap.ag_customer_rate_limited'),
  'true',
  '#AG-1: 동일 pg_customer_key로 rate limit 상한(5) 초과 시 6번째 주문 거부(rate_limited)'
);

SELECT is(
  (SELECT count(*)::integer FROM payment WHERE order_id LIKE 'rl-order-%'),
  5,
  '#AG-1b: 거부된 6번째 주문은 payment 행을 만들지 않음'
);

-- =========================================================================
-- #AG-6: goal 기준 rate limit — customer_key를 다 다르게 써도 goal 상한(20) 초과 시 거부
-- =========================================================================
DO $$
DECLARE
  v_goal_id  bigint;
  v_result   record;
  v_i        integer;
  v_rejected boolean := false;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-abuse-guard-2' LIMIT 1;

  FOR v_i IN 1..20 LOOP
    SELECT * INTO v_result FROM create_cheer_order(
      v_goal_id, 'grl-order-' || v_i, 1000, 1, '', true, '', 'grl_customer_' || v_i, NULL
    );
  END LOOP;

  BEGIN
    SELECT * INTO v_result FROM create_cheer_order(
      v_goal_id, 'grl-order-21', 1000, 1, '', true, '', 'grl_customer_21', NULL
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'rate_limited' THEN
      v_rejected := true;
    END IF;
  END;

  PERFORM set_config('pgtap.ag_goal_rate_limited', v_rejected::text, true);
END $$;

SELECT is(
  current_setting('pgtap.ag_goal_rate_limited'),
  'true',
  '#AG-6: customer_key를 매번 새로 써도(개별 상한 회피) 동일 goal 상한(20) 초과 시 거부'
);

SELECT is(
  (SELECT status::text FROM payment WHERE order_id = 'grl-order-1'),
  'READY',
  '#AG-6b: 방금 생성된 READY 주문은 오탐으로 거부·정리되지 않음'
);

-- =========================================================================
-- #AG-2~5: 요청 멱등키 — 동일 request_key 재요청은 기존 주문을 반환
-- =========================================================================
DO $$
DECLARE
  v_goal_id bigint;
  v_first   record;
  v_second  record;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-abuse-guard-1' LIMIT 1;

  SELECT * INTO v_first FROM create_cheer_order(
    v_goal_id, 'idem-order-A', 5000, 5, '멱등테스트', false, '동일메시지', 'idem_customer_001', 'idem-request-key-001'
  );

  -- 재시도: 클라이언트가 새 order_id를 생성해 보내더라도(요청 본문의 나머지
  -- 필드는 원 요청과 동일하게 재전송 — 이것이 request fingerprint가 허용하는
  -- 유일한 정당한 재시도 형태) request_key가 같으면 새 행을 만들지 않고 최초
  -- 주문을 반환해야 한다. (fingerprint 도입 전에는 message가 '첫 시도'/'재시도'로
  -- 달랐어도 amount만 비교해 통과했지만, 지금은 message도 fingerprint에 포함되므로
  -- 진짜 재시도 시나리오를 표현하려면 메시지도 동일해야 한다 — 다른 메시지 케이스는
  -- 아래 #FP-6이 별도로 검증한다.)
  SELECT * INTO v_second FROM create_cheer_order(
    v_goal_id, 'idem-order-B', 5000, 5, '멱등테스트', false, '동일메시지', 'idem_customer_001', 'idem-request-key-001'
  );

  PERFORM set_config('pgtap.ag_idem_first_payment', v_first.payment_id::text, true);
  PERFORM set_config('pgtap.ag_idem_second_payment', v_second.payment_id::text, true);
  PERFORM set_config('pgtap.ag_idem_second_order_id', v_second.order_id, true);
  PERFORM set_config('pgtap.ag_idem_second_replay', v_second.is_replay::text, true);
END $$;

SELECT is(
  current_setting('pgtap.ag_idem_second_payment'),
  current_setting('pgtap.ag_idem_first_payment'),
  '#AG-2: 동일 request_key 재요청은 최초와 같은 payment_id를 반환'
);

SELECT is(
  current_setting('pgtap.ag_idem_second_order_id'),
  'idem-order-A',
  '#AG-3: 동일 request_key 재요청은 최초 order_id를 반환 (재시도가 보낸 새 order_id는 버림)'
);

SELECT is(
  current_setting('pgtap.ag_idem_second_replay'),
  'true',
  '#AG-4: 재요청 결과의 is_replay=true'
);

SELECT is(
  (SELECT count(*)::integer FROM payment WHERE order_id IN ('idem-order-A', 'idem-order-B')),
  1,
  '#AG-5: 재요청은 새 payment 행을 만들지 않음 (idem-order-B 행 없음)'
);

-- request_key 포맷 검증
DO $$
DECLARE
  v_goal_id  bigint;
  v_result   record;
  v_rejected boolean := false;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-abuse-guard-1' LIMIT 1;
  BEGIN
    SELECT * INTO v_result FROM create_cheer_order(
      v_goal_id, 'badkey-order-1', 1000, 1, '', true, '', 'badkey_customer', 'ab'
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'invalid_request_key' THEN
      v_rejected := true;
    END IF;
  END;
  PERFORM set_config('pgtap.ag_invalid_request_key', v_rejected::text, true);
END $$;

SELECT is(
  current_setting('pgtap.ag_invalid_request_key'),
  'true',
  '#AG-7: 포맷이 유효하지 않은 request_key(8자 미만)는 invalid_request_key로 거부'
);

-- request_key 재사용 + 금액 다름 = conflict
DO $$
DECLARE
  v_goal_id  bigint;
  v_result   record;
  v_rejected boolean := false;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-abuse-guard-1' LIMIT 1;
  BEGIN
    SELECT * INTO v_result FROM create_cheer_order(
      v_goal_id, 'idem-order-C', 10000, 10, '', true, '', 'idem_customer_999', 'idem-request-key-001'
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'request_key_conflict' THEN
      v_rejected := true;
    END IF;
  END;
  PERFORM set_config('pgtap.ag_request_key_conflict', v_rejected::text, true);
END $$;

SELECT is(
  current_setting('pgtap.ag_request_key_conflict'),
  'true',
  '#AG-8: 동일 request_key라도 금액이 다르면 request_key_conflict로 거부'
);

-- =========================================================================
-- #AG-9~11: stale 정리 — 30분 넘게 READY로 방치된 주문은 EXPIRED로 전이
-- =========================================================================
DO $$
DECLARE
  v_goal_id       bigint;
  v_result        record;
  v_payment_id    bigint;
  v_cheer_id      bigint;
  v_expired_count integer;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-abuse-guard-3' LIMIT 1;

  SELECT * INTO v_result FROM create_cheer_order(
    v_goal_id, 'stale-order-1', 3000, 3, '', true, '', 'stale_customer_001', NULL
  );
  v_payment_id := v_result.payment_id;
  v_cheer_id := v_result.cheer_id;

  -- 30분 경과를 흉내낸다: 실서비스에선 시간이 흐르길 기다리지만, 테스트에선
  -- superuser로 created_at을 과거로 백데이트해 동일한 조건을 재현한다.
  UPDATE payment SET created_at = now() - interval '31 minutes' WHERE id = v_payment_id;

  SELECT expire_stale_cheer_payments() INTO v_expired_count;

  PERFORM set_config('pgtap.ag_stale_payment_status', (SELECT status::text FROM payment WHERE id = v_payment_id), true);
  PERFORM set_config('pgtap.ag_stale_cheer_status', (SELECT status::text FROM cheer WHERE id = v_cheer_id), true);
  PERFORM set_config('pgtap.ag_stale_expired_count_ge1', (v_expired_count >= 1)::text, true);
END $$;

SELECT is(
  current_setting('pgtap.ag_stale_payment_status'),
  'EXPIRED',
  '#AG-9: 30분 넘게 방치된 READY payment는 expire_stale_cheer_payments() 호출 시 EXPIRED로 전이'
);

SELECT is(
  current_setting('pgtap.ag_stale_cheer_status'),
  'EXPIRED',
  '#AG-10: 대응하는 PENDING cheer도 함께 EXPIRED로 전이'
);

-- opportunistic 정리: 새 주문 생성 진입만으로 stale 행이 자동 정리되는지 확인
DO $$
DECLARE
  v_goal_id    bigint;
  v_result     record;
  v_payment_id bigint;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-abuse-guard-3' LIMIT 1;

  SELECT * INTO v_result FROM create_cheer_order(
    v_goal_id, 'stale-order-2', 3000, 3, '', true, '', 'stale_customer_002', NULL
  );
  v_payment_id := v_result.payment_id;
  UPDATE payment SET created_at = now() - interval '31 minutes' WHERE id = v_payment_id;

  -- 스케줄러 없이도: 다음 create_cheer_order 진입 시 opportunistic 정리가 먼저 돈다.
  PERFORM * FROM create_cheer_order(
    v_goal_id, 'stale-order-3', 3000, 3, '', true, '', 'stale_customer_003', NULL
  );

  PERFORM set_config(
    'pgtap.ag_opportunistic_expired',
    (SELECT status::text FROM payment WHERE id = v_payment_id),
    true
  );
END $$;

SELECT is(
  current_setting('pgtap.ag_opportunistic_expired'),
  'EXPIRED',
  '#AG-11: pg_cron 없이도 — 다음 create_cheer_order 진입 시 opportunistic 정리로 stale 주문이 자동 EXPIRED 전이'
);

-- =========================================================================
-- #FP-1~6: request fingerprint — request_key replay가 amount뿐 아니라
-- goal_id/customer_key/displayName/isAnonymous/message 전체를 비교하는지 검증
-- (Codex 3차 money-code 리뷰 2026-07-13 REJECT 사유: replay가 amount만 비교해
-- 다른 goal_id/customer_key/displayName/isAnonymous/message로 재사용해도 기존
-- 주문을 그대로 성공 반환하던 결함 — 20260713190000 fingerprint 강화 검증)
-- =========================================================================
-- goal_one_active_per_member: member_id=...004는 이미 goal-abuse-guard-1을 보유 —
-- 새 member(d4)로 분리해 goal-abuse-guard-4를 생성한다.
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_anonymous
)
VALUES (
  'dddddddd-0000-0000-0000-000000000034',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'user_d4@test.local',
  '', now(), now(),
  '', '', '', '{}'::jsonb, '{}'::jsonb,
  false, false
);

INSERT INTO member (id, nickname, kyc_status)
VALUES ('dddddddd-0000-0000-0000-000000000034', '사용자D4', 'NONE');

INSERT INTO goal (member_id, slug, title, due_date, status, deleted_at)
VALUES
  ('dddddddd-0000-0000-0000-000000000034', 'goal-abuse-guard-4', '남용방지 테스트4(핑거프린트 goal_id diff)', now()::date + 30, 'ACTIVE', NULL);

-- FP-1: 완전히 동일한 goal_id/customer_key/displayName/isAnonymous/message로 재요청
-- → replay 성공(같은 payment_id, is_replay=true)
DO $$
DECLARE
  v_goal_id bigint;
  v_first   record;
  v_second  record;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-abuse-guard-1' LIMIT 1;

  SELECT * INTO v_first FROM create_cheer_order(
    v_goal_id, 'fp-order-A', 5000, 5, '핑거프린트', false, '동일메시지', 'fp_customer_001', 'fp-request-key-001'
  );
  SELECT * INTO v_second FROM create_cheer_order(
    v_goal_id, 'fp-order-B', 5000, 5, '핑거프린트', false, '동일메시지', 'fp_customer_001', 'fp-request-key-001'
  );

  PERFORM set_config('pgtap.fp_match_first_payment', v_first.payment_id::text, true);
  PERFORM set_config('pgtap.fp_match_second_payment', v_second.payment_id::text, true);
  PERFORM set_config('pgtap.fp_match_second_replay', v_second.is_replay::text, true);
END $$;

SELECT is(
  current_setting('pgtap.fp_match_second_payment'),
  current_setting('pgtap.fp_match_first_payment'),
  '#FP-1: 동일 request_key + 완전히 동일한 goal_id/customer_key/displayName/isAnonymous/message → replay 성공(같은 payment_id)'
);

SELECT is(
  current_setting('pgtap.fp_match_second_replay'),
  'true',
  '#FP-1b: 위 재요청의 is_replay=true'
);

-- FP-2: 동일 request_key, goal_id만 다름 → request_key_conflict
DO $$
DECLARE
  v_goal_id_1 bigint;
  v_goal_id_4 bigint;
  v_result    record;
  v_rejected  boolean := false;
BEGIN
  SELECT id INTO v_goal_id_1 FROM goal WHERE slug = 'goal-abuse-guard-1' LIMIT 1;
  SELECT id INTO v_goal_id_4 FROM goal WHERE slug = 'goal-abuse-guard-4' LIMIT 1;

  PERFORM * FROM create_cheer_order(
    v_goal_id_1, 'fp-order-goal-base', 5000, 5, '고정', false, '고정메시지', 'fp_customer_goal', 'fp-request-key-goal'
  );

  BEGIN
    SELECT * INTO v_result FROM create_cheer_order(
      v_goal_id_4, 'fp-order-goal-diff', 5000, 5, '고정', false, '고정메시지', 'fp_customer_goal', 'fp-request-key-goal'
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'request_key_conflict' THEN
      v_rejected := true;
    END IF;
  END;

  PERFORM set_config('pgtap.fp_goal_diff_rejected', v_rejected::text, true);
END $$;

SELECT is(
  current_setting('pgtap.fp_goal_diff_rejected'),
  'true',
  '#FP-2: 동일 request_key, goal_id만 다름 → request_key_conflict로 거부'
);

-- FP-3: 동일 request_key, customer_key(pg_customer_key)만 다름 → request_key_conflict
DO $$
DECLARE
  v_goal_id  bigint;
  v_result   record;
  v_rejected boolean := false;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-abuse-guard-1' LIMIT 1;

  PERFORM * FROM create_cheer_order(
    v_goal_id, 'fp-order-cust-base', 5000, 5, '고정', false, '고정메시지', 'fp_customer_a', 'fp-request-key-cust'
  );

  BEGIN
    SELECT * INTO v_result FROM create_cheer_order(
      v_goal_id, 'fp-order-cust-diff', 5000, 5, '고정', false, '고정메시지', 'fp_customer_b', 'fp-request-key-cust'
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'request_key_conflict' THEN
      v_rejected := true;
    END IF;
  END;

  PERFORM set_config('pgtap.fp_customer_diff_rejected', v_rejected::text, true);
END $$;

SELECT is(
  current_setting('pgtap.fp_customer_diff_rejected'),
  'true',
  '#FP-3: 동일 request_key, customer_key만 다름 → request_key_conflict로 거부'
);

-- FP-4: 동일 request_key, displayName만 다름(익명 아님) → request_key_conflict
DO $$
DECLARE
  v_goal_id  bigint;
  v_result   record;
  v_rejected boolean := false;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-abuse-guard-1' LIMIT 1;

  PERFORM * FROM create_cheer_order(
    v_goal_id, 'fp-order-name-base', 5000, 5, '기준이름', false, '고정메시지', 'fp_customer_name', 'fp-request-key-name'
  );

  BEGIN
    SELECT * INTO v_result FROM create_cheer_order(
      v_goal_id, 'fp-order-name-diff', 5000, 5, '다른이름', false, '고정메시지', 'fp_customer_name', 'fp-request-key-name'
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'request_key_conflict' THEN
      v_rejected := true;
    END IF;
  END;

  PERFORM set_config('pgtap.fp_name_diff_rejected', v_rejected::text, true);
END $$;

SELECT is(
  current_setting('pgtap.fp_name_diff_rejected'),
  'true',
  '#FP-4: 동일 request_key, displayName만 다름(익명 아님) → request_key_conflict로 거부'
);

-- FP-5: 동일 request_key, isAnonymous만 다름 → request_key_conflict
DO $$
DECLARE
  v_goal_id  bigint;
  v_result   record;
  v_rejected boolean := false;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-abuse-guard-1' LIMIT 1;

  PERFORM * FROM create_cheer_order(
    v_goal_id, 'fp-order-anon-base', 5000, 5, '고정이름', false, '고정메시지', 'fp_customer_anon', 'fp-request-key-anon'
  );

  BEGIN
    SELECT * INTO v_result FROM create_cheer_order(
      v_goal_id, 'fp-order-anon-diff', 5000, 5, '고정이름', true, '고정메시지', 'fp_customer_anon', 'fp-request-key-anon'
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'request_key_conflict' THEN
      v_rejected := true;
    END IF;
  END;

  PERFORM set_config('pgtap.fp_anon_diff_rejected', v_rejected::text, true);
END $$;

SELECT is(
  current_setting('pgtap.fp_anon_diff_rejected'),
  'true',
  '#FP-5: 동일 request_key, isAnonymous만 다름 → request_key_conflict로 거부'
);

-- FP-6: 동일 request_key, message만 다름(둘 다 익명) → request_key_conflict
DO $$
DECLARE
  v_goal_id  bigint;
  v_result   record;
  v_rejected boolean := false;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-abuse-guard-1' LIMIT 1;

  PERFORM * FROM create_cheer_order(
    v_goal_id, 'fp-order-msg-base', 5000, 5, '', true, '기준메시지', 'fp_customer_msg', 'fp-request-key-msg'
  );

  BEGIN
    SELECT * INTO v_result FROM create_cheer_order(
      v_goal_id, 'fp-order-msg-diff', 5000, 5, '', true, '다른메시지', 'fp_customer_msg', 'fp-request-key-msg'
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'request_key_conflict' THEN
      v_rejected := true;
    END IF;
  END;

  PERFORM set_config('pgtap.fp_message_diff_rejected', v_rejected::text, true);
END $$;

SELECT is(
  current_setting('pgtap.fp_message_diff_rejected'),
  'true',
  '#FP-6: 동일 request_key, message만 다름 → request_key_conflict로 거부'
);

-- =========================================================================
-- 완료
-- =========================================================================

SELECT finish();

ROLLBACK;
