-- =============================================================================
-- haenael-ge: RLS 정책 실검증 (pgTAP)
-- 진실원: docs/test-plan.md §7 SEC-1~4 + design-patterns §2 defense-in-depth
-- 실 Postgres 위에서 역할 전환 — mock 없음 (헌법 §3)
-- =============================================================================

BEGIN;

SELECT plan(27);

-- =========================================================================
-- 픽스처 설정 (postgres = superuser, RLS bypass)
-- =========================================================================

-- auth.users 픽스처 (Supabase auth 스키마)
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_anonymous
)
VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user_a@test.local',
    '', now(), now(),
    '', '', '', '{}'::jsonb, '{}'::jsonb,
    false, false
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user_b@test.local',
    '', now(), now(),
    '', '', '', '{}'::jsonb, '{}'::jsonb,
    false, false
  );

-- member 픽스처
INSERT INTO member (id, nickname, kyc_status)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '사용자A', 'NONE'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '사용자B', 'NONE');

-- goal 픽스처 (slug 트리거 자동 실행)
INSERT INTO goal (member_id, slug, title, due_date, status, deleted_at)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'goal-a-live',    'A의 목표(활성)',   now()::date + 30, 'ACTIVE',  NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'goal-a-deleted', 'A의 목표(삭제됨)', now()::date + 30, 'ACTIVE',  now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'goal-b-live',    'B의 목표(활성)',   now()::date + 30, 'ACTIVE',  NULL);

-- clover_balance 픽스처 (원장 트리거 없이 직접 삽입)
INSERT INTO clover_balance (member_id, clover_count)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 150),
  ('bbbbbbbb-0000-0000-0000-000000000002', 300);

-- cashout_request 픽스처
INSERT INTO cashout_request (
  member_id, clover_amount, gross_krw, fee_krw, withholding_krw, net_krw, status
)
VALUES
  ('bbbbbbbb-0000-0000-0000-000000000002', 100, 10000, 500, 330, 9170, 'REQUESTED');

-- =========================================================================
-- SEC-2: goal_public 뷰에 금액/클로버 컬럼 부재 확인 (금액 3층 a)
-- =========================================================================

SELECT hasnt_column(
  'public', 'goal_public', 'amount_krw',
  'SEC-2: goal_public에 amount_krw 컬럼 없음'
);

SELECT hasnt_column(
  'public', 'goal_public', 'clover_count',
  'SEC-2: goal_public에 clover_count 컬럼 없음'
);

SELECT hasnt_column(
  'public', 'goal_public', 'gross_krw',
  'SEC-2: goal_public에 gross_krw 컬럼 없음'
);

SELECT hasnt_column(
  'public', 'goal_public', 'fee_krw',
  'SEC-2: goal_public에 fee_krw 컬럼 없음'
);

SELECT hasnt_column(
  'public', 'goal_public', 'net_krw',
  'SEC-2: goal_public에 net_krw 컬럼 없음'
);

-- goal_public에 cheer_count 컬럼 있어야 함
SELECT has_column(
  'public', 'goal_public', 'cheer_count',
  'SEC-2: goal_public에 cheer_count 컬럼 있음'
);

-- =========================================================================
-- Soft-delete: deleted 목표는 goal_public에서 제외
-- =========================================================================

SELECT is(
  (SELECT count(*)::integer FROM goal_public WHERE slug = 'goal-a-deleted'),
  0,
  'Soft-delete: deleted_at 있는 목표는 goal_public에서 제외됨'
);

-- 활성 목표는 goal_public에서 보임
SELECT is(
  (SELECT count(*)::integer FROM goal_public WHERE slug = 'goal-a-live'),
  1,
  'Soft-delete: 활성 목표는 goal_public에서 조회됨'
);

-- =========================================================================
-- SEC-3a: anon은 payment에 INSERT 불가
-- =========================================================================

SET LOCAL ROLE anon;

SELECT throws_ok(
  $$INSERT INTO payment (order_id, amount_krw, status, pg_customer_key)
    VALUES ('anon-test-order', 5000, 'READY', 'ANONYMOUS')$$,
  '42501',
  NULL,
  'SEC-3a: anon은 payment에 INSERT 불가'
);

RESET ROLE;

-- =========================================================================
-- SEC-3b: authenticated는 clover_ledger에 INSERT 불가
-- =========================================================================

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$INSERT INTO clover_ledger (member_id, entry_type, clover_delta, balance_after)
    VALUES (
      'aaaaaaaa-0000-0000-0000-000000000001',
      'EARN', 10, 160
    )$$,
  '42501',
  NULL,
  'SEC-3b: authenticated는 clover_ledger에 INSERT 불가 (service_role EF만)'
);

RESET ROLE;

-- =========================================================================
-- SEC-3c: authenticated는 payment에 INSERT 불가
-- =========================================================================

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$INSERT INTO payment (order_id, amount_krw, status, pg_customer_key)
    VALUES ('auth-test-order', 5000, 'READY', 'ANONYMOUS')$$,
  '42501',
  NULL,
  'SEC-3c: authenticated는 payment에 INSERT 불가 (service_role EF만)'
);

RESET ROLE;

-- =========================================================================
-- SEC-4a: 사용자A는 사용자B의 clover_balance 조회 불가 (0행 반환)
-- =========================================================================

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT is(
  (SELECT count(*)::integer
   FROM clover_balance
   WHERE member_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0,
  'SEC-4a: 사용자A는 사용자B의 clover_balance 조회 불가'
);

-- 사용자A는 자신의 clover_balance 조회 가능
SELECT is(
  (SELECT count(*)::integer
   FROM clover_balance
   WHERE member_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'SEC-4a: 사용자A는 자신의 clover_balance 조회 가능'
);

RESET ROLE;

-- =========================================================================
-- SEC-4b: 사용자A는 사용자B의 cashout_request 조회 불가
-- =========================================================================

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT is(
  (SELECT count(*)::integer
   FROM cashout_request
   WHERE member_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0,
  'SEC-4b: 사용자A는 사용자B의 cashout_request 조회 불가'
);

RESET ROLE;

-- =========================================================================
-- SEC-4c: 사용자A는 사용자B의 goal 조회 불가 (직접 테이블 — goal_public X)
-- =========================================================================

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT is(
  (SELECT count(*)::integer
   FROM goal
   WHERE member_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0,
  'SEC-4c: 사용자A는 사용자B의 goal 직접 테이블 조회 불가'
);

-- 사용자A는 자신의 goal 조회 가능
SELECT is(
  (SELECT count(*)::integer
   FROM goal
   WHERE member_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'SEC-4c: 사용자A는 자신의 활성 goal 조회 가능 (deleted=1건 제외)'
);

RESET ROLE;

-- =========================================================================
-- SEC-1: anon은 clover_balance SELECT 불가 (권한 없음)
-- =========================================================================

SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM clover_balance$$,
  '42501',
  NULL,
  'SEC-1: anon은 clover_balance SELECT 불가'
);

SELECT throws_ok(
  $$SELECT * FROM cashout_request$$,
  '42501',
  NULL,
  'SEC-1: anon은 cashout_request SELECT 불가'
);

RESET ROLE;

-- =========================================================================
-- goal_public: anon이 활성 목표 조회 가능 (금액 없이)
-- =========================================================================

SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::integer FROM goal_public WHERE slug = 'goal-a-live'),
  1,
  'goal_public: anon이 활성 목표 조회 가능'
);

RESET ROLE;

-- =========================================================================
-- clover_ledger 트리거: INSERT 시 clover_balance 동기화 확인
-- (서비스롤로 직접 테스트 — 트리거 동작 검증)
-- =========================================================================

-- service_role 상당 = postgres (superuser)로 실행
INSERT INTO clover_ledger (member_id, entry_type, clover_delta, ref_type, balance_after)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'EARN', 50, 'cheer', 200);

SELECT is(
  (SELECT clover_count FROM clover_balance
   WHERE member_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  200,
  '트리거: clover_ledger INSERT 후 clover_balance 동기화됨'
);

-- =========================================================================
-- 완료
-- =========================================================================

-- =========================================================================
-- 슬라이스 #10: 신고(report) RLS — INSERT 허용·SELECT 차단
-- =========================================================================

-- report INSERT: anon 가능 (report_insert_any 정책)
SET LOCAL ROLE anon;

SELECT lives_ok(
  $$INSERT INTO report (target_type, target_id, reason)
    VALUES ('GOAL', 1, 'anon 신고 테스트')$$,
  '#10-R1a: anon은 report에 INSERT 가능 (report_insert_any 정책)'
);

RESET ROLE;

-- report INSERT: authenticated 가능
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT lives_ok(
  $$INSERT INTO report (target_type, target_id, reason, reporter_ref)
    VALUES ('CHEER', 1, '인증 유저 신고 테스트', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  '#10-R1b: authenticated는 report에 INSERT 가능'
);

RESET ROLE;

-- report SELECT: anon 불가 (정책 없음 = 차단)
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM report$$,
  '42501',
  NULL,
  '#10-R1c: anon은 report SELECT 불가 (운영자 전용)'
);

RESET ROLE;

-- report SELECT: authenticated 불가 (정책 없음 = 차단)
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$SELECT * FROM report$$,
  '42501',
  NULL,
  '#10-R1d: authenticated는 report SELECT 불가 (service_role 전용)'
);

RESET ROLE;

-- =========================================================================
-- 슬라이스 #10: cheer soft-delete → get_wordmap 제외 검증
-- =========================================================================

-- goal 픽스처에서 goal-a-live의 id를 확인해 cheer 삽입
-- cheer.payment_id NOT NULL → payment 픽스처 먼저 삽입 (postgres=service_role)
DO $$
DECLARE
  v_goal_id   bigint;
  v_payment1  bigint;
  v_payment2  bigint;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-a-live' LIMIT 1;

  -- payment 픽스처 2건 (서비스롤 직접 삽입)
  INSERT INTO payment (order_id, amount_krw, status, pg_customer_key)
  VALUES ('test-order-del-001', 5000, 'DONE', 'ANONYMOUS')
  RETURNING id INTO v_payment1;

  INSERT INTO payment (order_id, amount_krw, status, pg_customer_key)
  VALUES ('test-order-live-001', 5000, 'DONE', 'ANONYMOUS')
  RETURNING id INTO v_payment2;

  -- 삭제된 cheer (message 있음, deleted_at 설정)
  INSERT INTO cheer (goal_id, payment_id, is_anonymous, clover_amount, status, message, deleted_at)
  VALUES (v_goal_id, v_payment1, false, 1, 'CONFIRMED', '삭제된응원메시지', now());

  -- 살아있는 cheer (message 있음)
  INSERT INTO cheer (goal_id, payment_id, is_anonymous, clover_amount, status, message, deleted_at)
  VALUES (v_goal_id, v_payment2, false, 1, 'CONFIRMED', '살아있는응원메시지', NULL);
END $$;

-- get_wordmap RPC: 삭제된 cheer 메시지 제외 확인
SELECT is(
  (SELECT count(*)::integer
   FROM get_wordmap((SELECT id FROM goal WHERE slug = 'goal-a-live' LIMIT 1))
   WHERE word = '삭제된응원메시지'),
  0,
  '#10-SD1: soft-deleted cheer 메시지는 get_wordmap에서 제외됨'
);

-- get_wordmap RPC: 살아있는 cheer 메시지 포함 확인
SELECT is(
  (SELECT count(*)::integer
   FROM get_wordmap((SELECT id FROM goal WHERE slug = 'goal-a-live' LIMIT 1))
   WHERE word = '살아있는응원메시지'),
  1,
  '#10-SD2: 활성 cheer 메시지는 get_wordmap에 포함됨'
);

-- goal soft-delete 후 goal_public 제외 (이미 goal-a-deleted로 검증됨, 추가 확인)
SELECT is(
  (SELECT count(*)::integer FROM goal_public WHERE slug = 'goal-a-deleted'),
  0,
  '#10-SD3: soft-deleted goal은 goal_public에서 제외됨 (기존 케이스 재확인)'
);

-- =========================================================================
-- 완료
-- =========================================================================

SELECT finish();

ROLLBACK;
