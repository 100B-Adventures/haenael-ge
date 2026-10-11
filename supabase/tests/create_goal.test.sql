-- =============================================================================
-- create_goal.test.sql — 다중 목표 생성 RPC pgTAP
-- 검증축: 함수 계약, 상한 3개, 4번째 거부, 마감 지난 목표 상한 제외,
--         authenticated의 goal 직접 INSERT 거부, 동시 삽입 직렬화
-- due_date는 상대값(now()+n) 대신 명시값으로 고정한다(설계 §4.3 후기 —
-- 상한 계산이 오늘 날짜에 의존해 상대값을 쓰면 시간이 지나며 테스트가 깨진다).
-- =============================================================================

BEGIN;

SELECT plan(10);

SELECT has_function(
  'public',
  'create_goal',
  ARRAY['text', 'text', 'date'],
  'create_goal RPC가 요구된 인자 시그니처로 존재함'
);

-- 픽스처: 계정 A(상한 테스트), 계정 B(직접 INSERT 거부 테스트)
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_anonymous
)
VALUES
  ('37777777-a000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'create_goal_a@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false),
  ('37777777-a000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'create_goal_b@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false);

INSERT INTO member (id, nickname, kyc_status)
VALUES
  ('37777777-a000-0000-0000-000000000001', '다목표A', 'NONE'),
  ('37777777-a000-0000-0000-000000000002', '다목표B', 'NONE');

-- ── A: 목표 2개 생성 성공 ────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"37777777-a000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT lives_ok(
  $$SELECT public.create_goal('편입 평점 4.0', '이유1', DATE '2030-01-01')$$,
  'CG1: 진행 중 목표가 0개면 생성 성공'
);

SELECT lives_ok(
  $$SELECT public.create_goal('토익 900', '이유2', DATE '2030-02-01')$$,
  'CG2: 진행 중 목표가 1개면 두 번째 생성도 성공'
);

RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.goal
   WHERE member_id = '37777777-a000-0000-0000-000000000001'),
  2,
  'CG3: 계정 A에 목표 2개가 실제로 저장됨'
);

-- ── 3번째 생성(상한 3 안쪽) 성공, 4번째 거부 ────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"37777777-a000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT lives_ok(
  $$SELECT public.create_goal('자격증', '이유3', DATE '2030-03-01')$$,
  'CG4: 진행 중 목표가 2개면 세 번째 생성도 성공(상한=3)'
);

SELECT throws_ok(
  $$SELECT public.create_goal('네번째', '이유4', DATE '2030-04-01')$$,
  '55000',
  'goal_limit_reached',
  'CG5: 진행 중 목표가 3개면 네 번째 생성은 goal_limit_reached로 거부됨'
);

RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.goal
   WHERE member_id = '37777777-a000-0000-0000-000000000001'),
  3,
  'CG6: 4번째 거부 후에도 계정 A 목표 수는 3개로 유지됨(부분삽입 없음)'
);

-- ── 마감 지난 목표는 상한에서 제외 ───────────────────────────────────────────
-- 계정 A의 목표 중 하나(자격증)를 명시적으로 과거 마감으로 만들어 진행 중 개수를
-- 2개로 되돌린다. 그러면 4번째가 다시 성공해야 한다.
UPDATE public.goal
SET due_date = DATE '2020-01-01'
WHERE member_id = '37777777-a000-0000-0000-000000000001'
  AND title = '자격증 해낼게';

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"37777777-a000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT lives_ok(
  $$SELECT public.create_goal('다섯번째', '이유5', DATE '2030-05-01')$$,
  'CG7: 마감 지난 목표는 상한 계산에서 제외되어 새 목표 생성이 다시 허용됨'
);

-- ── authenticated의 goal 직접 INSERT 거부 ───────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"37777777-a000-0000-0000-000000000002","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$INSERT INTO public.goal (member_id, title, due_date)
    VALUES ('37777777-a000-0000-0000-000000000002', '직접삽입 해낼게', DATE '2030-01-01')$$,
  '42501',
  NULL,
  'CG8: authenticated는 goal 테이블에 직접 INSERT할 수 없음(REVOKE)'
);

-- ── 인증 없이 호출 시 거부 ──────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$SELECT public.create_goal('익명', '이유', DATE '2030-01-01')$$,
  '42501',
  '권한 없음',
  'CG9: auth.uid()가 없으면 생성이 거부됨'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
