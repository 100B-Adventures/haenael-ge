-- =============================================================================
-- haenael-ge: RLS 정책 실검증 (pgTAP)
-- 진실원: docs/test-plan.md §7 SEC-1~4 + design-patterns §2 defense-in-depth
-- 실 Postgres 위에서 역할 전환 — mock 없음 (헌법 §3)
-- =============================================================================

BEGIN;

SELECT plan(20);

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

SELECT finish();

ROLLBACK;
