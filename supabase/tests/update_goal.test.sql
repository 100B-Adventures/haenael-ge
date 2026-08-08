-- =============================================================================
-- update_goal.test.sql — 목표 수정 RPC pgTAP
-- 검증축: 함수 계약, 본인 수정, 비본인 거부, 입력 경계, ACTIVE 상태 제한
-- =============================================================================

BEGIN;

SELECT plan(12);

SELECT has_function(
  'public',
  'update_goal',
  ARRAY['bigint', 'text', 'text', 'date'],
  'update_goal RPC가 요구된 인자 시그니처로 존재함'
);

SELECT function_returns(
  'public',
  'update_goal',
  ARRAY['bigint', 'text', 'text', 'date'],
  'void',
  'update_goal RPC 반환형은 void'
);

-- 픽스처: 목표 소유자 A, 비소유자 B.
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_anonymous
)
VALUES
  ('27777777-a000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'update_goal_a@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false),
  ('27777777-a000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'update_goal_b@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false);

INSERT INTO member (id, nickname, kyc_status)
VALUES
  ('27777777-a000-0000-0000-000000000001', '수정A', 'NONE'),
  ('27777777-a000-0000-0000-000000000002', '수정B', 'NONE');

INSERT INTO goal (id, member_id, slug, title, reason, due_date, status)
OVERRIDING SYSTEM VALUE
VALUES (
  277777770001,
  '27777777-a000-0000-0000-000000000001',
  'update-goal-a',
  '원래 목표 해낼게',
  '원래 이유',
  DATE '2026-08-01',
  'ACTIVE'
);

-- #1 본인 수정: 생성 경로와 같은 suffix 저장 + 빈 reason NULL + due_date 반영.
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"27777777-a000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT lives_ok(
  $$SELECT public.update_goal(
    (SELECT id FROM public.goal WHERE slug = 'update-goal-a'),
    '  체력 만들기  ',
    '   ',
    DATE '2026-09-30'
  )$$,
  'UG1: 본인은 ACTIVE 목표를 수정할 수 있음'
);

SELECT is(
  (SELECT title FROM public.goal WHERE slug = 'update-goal-a'),
  '체력 만들기 해낼게',
  'UG2: title은 trim 후 생성 경로와 동일하게 " 해낼게" suffix를 붙여 저장함'
);

SELECT is(
  (SELECT reason FROM public.goal WHERE slug = 'update-goal-a'),
  NULL,
  'UG3: 공백 reason은 NULL로 저장함'
);

SELECT is(
  (SELECT due_date FROM public.goal WHERE slug = 'update-goal-a'),
  DATE '2026-09-30',
  'UG4: due_date를 전달값으로 수정함'
);

-- #2 비본인 거부.
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"27777777-a000-0000-0000-000000000002","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$SELECT public.update_goal(
    277777770001,
    '남의 목표',
    '바꾸기',
    DATE '2026-10-31'
  )$$,
  '42501',
  '권한 없음',
  'UG5: 비소유자는 목표 수정을 거부당함'
);

-- 비소유자 RLS에서는 goal 행 자체가 보이지 않으므로, 저장값 검증은 migration
-- owner 권한으로 전환한다. 그래야 NULL 가시성 검사가 아니라 실제 행 보존을 검증한다.
RESET ROLE;
SELECT is(
  (SELECT title FROM public.goal WHERE slug = 'update-goal-a'),
  '체력 만들기 해낼게',
  'UG6: 비소유자 거부 후 기존 title이 유지됨'
);

-- #3 빈 title 및 2자 미만 경계 거부.
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"27777777-a000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$SELECT public.update_goal(
    (SELECT id FROM public.goal WHERE slug = 'update-goal-a'),
    '   ',
    NULL,
    DATE '2026-10-31'
  )$$,
  '22023',
  '목표는 2자 이상 입력해 주세요',
  'UG7: 공백 title은 거부함'
);

SELECT throws_ok(
  $$SELECT public.update_goal(
    (SELECT id FROM public.goal WHERE slug = 'update-goal-a'),
    '한',
    NULL,
    DATE '2026-10-31'
  )$$,
  '22023',
  '목표는 2자 이상 입력해 주세요',
  'UG8: trim 후 1자인 title은 거부함'
);

SELECT throws_ok(
  $$SELECT public.update_goal(
    (SELECT id FROM public.goal WHERE slug = 'update-goal-a'),
    '마감일 검사',
    NULL,
    NULL
  )$$,
  '22004',
  '마감일은 필수입니다',
  'UG9: NULL due_date는 거부함'
);

-- ACTIVE가 아닌 목표는 소유자여도 수정할 수 없음.
RESET ROLE;
UPDATE public.goal SET status = 'CLOSED' WHERE slug = 'update-goal-a';

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"27777777-a000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$SELECT public.update_goal(
    (SELECT id FROM public.goal WHERE slug = 'update-goal-a'),
    '닫힌 목표',
    NULL,
    DATE '2026-10-31'
  )$$,
  '55000',
  '활성 목표만 수정할 수 있습니다',
  'UG10: 소유자여도 CLOSED 목표는 수정할 수 없음'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
