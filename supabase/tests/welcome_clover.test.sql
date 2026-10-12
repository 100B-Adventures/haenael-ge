-- =============================================================================
-- welcome_clover.test.sql — 웰컴 클로버 성장훅 (pgTAP, 실 Postgres)
-- 진실원: docs/eng-design/architecture.md + 회장·컨트롤러 확정(2026-07-18)
-- 검증축: ①웰컴 자동삽입·목표당 1회 멱등 ②도달판정=웰컴포함 vs 지급액=웰컴제외
--         ③경계(웰컴만/친구만/혼합/0) ④권한 ⑤기존 결제 하드닝 무회귀(CHECK 제약)
-- =============================================================================

BEGIN;

SELECT plan(20);

-- =========================================================================
-- 픽스처
-- =========================================================================

INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_anonymous
)
VALUES
  ('11111111-a000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'welcome_a@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false),
  ('11111111-a000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'welcome_b@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false),
  ('11111111-a000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'welcome_c@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false),
  ('11111111-a000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'welcome_d@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false);

INSERT INTO member (id, nickname, kyc_status)
VALUES
  ('11111111-a000-0000-0000-000000000001', '웰컴A', 'NONE'),
  ('11111111-a000-0000-0000-000000000002', '웰컴B', 'NONE'),
  ('11111111-a000-0000-0000-000000000003', '웰컴C', 'NONE'),
  ('11111111-a000-0000-0000-000000000004', '웰컴D', 'NONE');

-- =========================================================================
-- #1 웰컴 자동삽입 — 목표 생성 시 cheer(is_welcome=true, 무결제) + ledger(WELCOME_GRANT)
-- =========================================================================

INSERT INTO goal (member_id, slug, title, due_date, status)
VALUES ('11111111-a000-0000-0000-000000000001', 'welcome-goal-a', 'A의 목표', now()::date + 30, 'ACTIVE');

SELECT is(
  (SELECT count(*)::integer FROM cheer
   WHERE goal_id = (SELECT id FROM goal WHERE slug = 'welcome-goal-a')
     AND is_welcome = true),
  1,
  'W1: 목표 생성 시 웰컴 cheer가 정확히 1건 생성됨'
);

SELECT is(
  (SELECT payment_id FROM cheer
   WHERE goal_id = (SELECT id FROM goal WHERE slug = 'welcome-goal-a') AND is_welcome = true),
  NULL,
  'W2: 웰컴 cheer는 payment_id가 NULL(무결제)'
);

SELECT is(
  (SELECT status::text FROM cheer
   WHERE goal_id = (SELECT id FROM goal WHERE slug = 'welcome-goal-a') AND is_welcome = true),
  'CONFIRMED',
  'W3: 웰컴 cheer는 즉시 CONFIRMED (워드맵·응원수에 바로 반영)'
);

SELECT is(
  (SELECT clover_amount FROM cheer
   WHERE goal_id = (SELECT id FROM goal WHERE slug = 'welcome-goal-a') AND is_welcome = true),
  welcome_clover_amount(),
  'W4: 웰컴 clover_amount = welcome_clover_amount()(=3)'
);

SELECT is(
  (SELECT count(*)::integer FROM clover_ledger
   WHERE member_id = '11111111-a000-0000-0000-000000000001'
     AND entry_type = 'WELCOME_GRANT'),
  1,
  'W5: clover_ledger에 WELCOME_GRANT 1건 기입됨'
);

SELECT is(
  (SELECT clover_count FROM clover_balance WHERE member_id = '11111111-a000-0000-0000-000000000001'),
  welcome_clover_amount(),
  'W6: clover_balance가 웰컴만큼 즉시 반영됨(3)'
);

-- =========================================================================
-- #2 목표당 1회 멱등 — 같은 목표에 웰컴 cheer 중복 삽입은 유니크 인덱스가 최종 방어
--    (grant_welcome_clover()의 EXISTS 가드가 1차 방어, 유니크 인덱스가 2차 방어 —
--     둘 다 같은 사고를 막으므로 DB 레벨 제약 위반으로 관측 가능한 것은 이쪽)
-- =========================================================================

SELECT throws_ok(
  $$INSERT INTO cheer (goal_id, payment_id, display_name, is_anonymous, message, clover_amount, status, is_welcome)
    VALUES ((SELECT id FROM goal WHERE slug = 'welcome-goal-a'), NULL, '해낼게', false, '중복', 3, 'CONFIRMED', true)$$,
  '23505',
  NULL,
  'W7: 같은 목표에 웰컴 cheer 중복 INSERT는 유니크 인덱스로 거부됨(목표당 1회 보장)'
);

SELECT is(
  (SELECT count(*)::integer FROM cheer
   WHERE goal_id = (SELECT id FROM goal WHERE slug = 'welcome-goal-a') AND is_welcome = true),
  1,
  'W8: 중복 시도 후에도 웰컴 cheer는 여전히 1건'
);

SELECT is(
  (SELECT clover_count FROM clover_balance WHERE member_id = '11111111-a000-0000-0000-000000000001'),
  welcome_clover_amount(),
  'W9: 중복 시도 후에도 잔액은 여전히 3(중복 적립 없음)'
);

-- =========================================================================
-- #3 도달판정(웰컴 포함) vs 지급액(웰컴 제외) — clover_eligibility() 3분해
-- =========================================================================

-- 시나리오: 회원B — 웰컴(3) + 친구 EARN(30) = 총 33. 지급가능=33-3=30(임계=정확히 도달).
INSERT INTO goal (member_id, slug, title, due_date, status)
VALUES ('11111111-a000-0000-0000-000000000002', 'welcome-goal-b', 'B의 목표', now()::date + 30, 'ACTIVE');

INSERT INTO clover_ledger (member_id, entry_type, clover_delta, ref_type, ref_id, balance_after)
VALUES (
  '11111111-a000-0000-0000-000000000002', 'EARN', 30, 'cheer',
  (SELECT id FROM cheer WHERE goal_id = (SELECT id FROM goal WHERE slug = 'welcome-goal-b') AND is_welcome = true),
  33
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-a000-0000-0000-000000000002","iss":"supabase-demo"}', true);

SELECT is(
  (SELECT (total_balance, welcome_amount, payable_amount, reached_threshold)
   FROM clover_eligibility('11111111-a000-0000-0000-000000000002')),
  (33, 3, 30, true),
  'W10: 혼합(웰컴3+친구30) — total=33/welcome=3/payable=30/도달=TRUE(임계 정확히 도달)'
);

RESET ROLE;

-- --- 경계: 웰컴만 있고 친구 응원 0 → 환전 불가(도달판정 자체가 실패) ---
INSERT INTO goal (member_id, slug, title, due_date, status)
VALUES ('11111111-a000-0000-0000-000000000003', 'welcome-goal-c', 'C의 목표', now()::date + 30, 'ACTIVE');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-a000-0000-0000-000000000003","iss":"supabase-demo"}', true);

SELECT is(
  (SELECT (total_balance, welcome_amount, payable_amount, reached_threshold)
   FROM clover_eligibility('11111111-a000-0000-0000-000000000003')),
  (3, 3, 0, false),
  'W11: 경계(웰컴만·친구0) — total=3/welcome=3/payable=0/도달=FALSE(전액 웰컴이어도 임계 미달)'
);

RESET ROLE;

-- --- 경계: 목표 자체가 없는(웰컴도 없는) 신규 회원 = 0/0/0/false ---
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-a000-0000-0000-000000000004","iss":"supabase-demo"}', true);

SELECT is(
  (SELECT (total_balance, welcome_amount, payable_amount, reached_threshold)
   FROM clover_eligibility('11111111-a000-0000-0000-000000000004')),
  (0, 0, 0, false),
  'W12: 경계(0) — 목표/웰컴 자체가 없는 회원은 total/welcome/payable=0, 도달 FALSE'
);

RESET ROLE;

-- --- 경계: 친구만(가상 — 웰컴 없이 EARN만 있는 레거시 회원) → payable = total ---
-- (레거시 상황 시뮬레이션: WELCOME_GRANT 없이 EARN만 존재하면 welcome_amount=0이어야 함)
INSERT INTO clover_balance (member_id, clover_count) VALUES ('11111111-a000-0000-0000-000000000004', 40)
  ON CONFLICT (member_id) DO UPDATE SET clover_count = 40;
INSERT INTO clover_ledger (member_id, entry_type, clover_delta, ref_type, balance_after)
VALUES ('11111111-a000-0000-0000-000000000004', 'EARN', 40, 'cheer', 40);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-a000-0000-0000-000000000004","iss":"supabase-demo"}', true);

SELECT is(
  (SELECT (total_balance, welcome_amount, payable_amount, reached_threshold)
   FROM clover_eligibility('11111111-a000-0000-0000-000000000004')),
  (40, 0, 40, true),
  'W13: 경계(친구만, 웰컴 없음) — payable = total(웰컴 0이면 전액 지급 가능), 도달=TRUE'
);

RESET ROLE;

-- =========================================================================
-- #4 권한 — 본인 아닌 다른 member_id로 clover_eligibility 호출 시 거부
-- =========================================================================

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-a000-0000-0000-000000000002","iss":"supabase-demo"}', true);

SELECT throws_ok(
  $$SELECT * FROM clover_eligibility('11111111-a000-0000-0000-000000000003')$$,
  '42501',
  NULL,
  'W14: 본인이 아닌 member_id로 clover_eligibility 호출 시 forbidden'
);

RESET ROLE;

-- anon은 아예 EXECUTE 권한이 없어야 함
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT * FROM clover_eligibility('11111111-a000-0000-0000-000000000002')$$,
  '42501',
  NULL,
  'W15: anon은 clover_eligibility 실행 권한 자체가 없음'
);
RESET ROLE;

-- =========================================================================
-- #5 CHECK 제약 — is_welcome/payment_id 불일치는 DB 레벨에서 거부(기존 결제 하드닝 무회귀)
-- =========================================================================

SELECT throws_ok(
  $$INSERT INTO cheer (goal_id, payment_id, clover_amount, status, is_welcome)
    VALUES ((SELECT id FROM goal WHERE slug = 'welcome-goal-a'), NULL, 3, 'CONFIRMED', false)$$,
  '23514',
  NULL,
  'W16: is_welcome=false인데 payment_id NULL이면 CHECK 위반(친구 응원은 결제 필수 그대로)'
);

SELECT throws_ok(
  $$INSERT INTO cheer (goal_id, payment_id, clover_amount, status, is_welcome)
    VALUES ((SELECT id FROM goal WHERE slug = 'welcome-goal-a'), 999999, 3, 'CONFIRMED', true)$$,
  NULL,
  NULL,
  'W17: is_welcome=true인데 payment_id 값이 있으면 CHECK 또는 FK 위반(웰컴은 무결제 그대로)'
);

-- =========================================================================
-- #6 기존 결제 RPC 무회귀 — create_cheer_order/confirm_cheer_payment는 웰컴과 무관하게 정상 동작
-- =========================================================================

SELECT is(
  (SELECT count(*)::integer FROM create_cheer_order(
    (SELECT id FROM goal WHERE slug = 'welcome-goal-a'),
    'hnl_welcome_regress_001', 3000, 3, '친구1', false, '응원해요', 'anonymous_wc_1'
  )),
  1,
  'W18: 웰컴이 이미 있는 목표에도 친구 결제 주문(create_cheer_order)이 정상 생성됨'
);

SELECT lives_ok(
  $$SELECT * FROM confirm_cheer_payment(
    'hnl_welcome_regress_001', 'payment_key_welcome_regress_001', 3000,
    'CARD', now(), 'https://receipt.test/welcome-regress', '{"status":"DONE"}'::jsonb
  )$$,
  'W19: 웰컴이 이미 있는 목표에도 친구 결제 승인(confirm_cheer_payment)이 정상 동작'
);

-- 친구 결제 후: total = 웰컴(3) + 친구(3000) = 3003, payable = 3000(웰컴 3 제외)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-a000-0000-0000-000000000001","iss":"supabase-demo"}', true);

SELECT is(
  (SELECT (total_balance, welcome_amount, payable_amount)
   FROM clover_eligibility('11111111-a000-0000-0000-000000000001')),
  (6, 3, 3),
  'W20: 웰컴+친구결제 혼합 후에도 3분해가 정확함(total=6/welcome=3/payable=3)'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
