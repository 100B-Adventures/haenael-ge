BEGIN;

SELECT plan(5);

SELECT ok(
  'GOAL_CREATED' = ANY(enum_range(NULL::public.notification_type_enum)::text[]),
  'GCN-DB-01 notification_type_enum에 GOAL_CREATED가 존재한다'
);

SELECT has_function(
  'public',
  'claim_goal_created_notification',
  ARRAY['text'],
  'GCN-DB-02 서버 metadata를 함께 claim하는 함수가 존재한다'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
)
VALUES
  ('6a120000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'goal-created-a@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false),
  ('6a120000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'goal-created-b@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false);

INSERT INTO public.member (id, nickname, phone, kyc_status)
VALUES
  ('6a120000-0000-4000-8000-000000000001', '목표회원A', '01012345678', 'NONE'),
  ('6a120000-0000-4000-8000-000000000002', '목표회원B', '01087654321', 'NONE');

INSERT INTO public.goal (member_id, slug, title, due_date, status)
VALUES
  ('6a120000-0000-4000-8000-000000000001', 'goal-created-own', '서버 목표 제목', current_date + 30, 'ACTIVE'),
  ('6a120000-0000-4000-8000-000000000002', 'goal-created-other', '남의 목표 제목', current_date + 30, 'ACTIVE');

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"6a120000-0000-4000-8000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT is(
  (SELECT count(*)::integer FROM public.claim_goal_created_notification('goal-created-other')),
  0,
  'GCN-DB-03 다른 회원 목표는 claim할 수 없다'
);

SELECT results_eq(
  $$
    SELECT goal_title, goal_slug, member_nickname, member_phone
    FROM public.claim_goal_created_notification('goal-created-own')
  $$,
  $$VALUES ('서버 목표 제목'::text, 'goal-created-own'::text, '목표회원A'::text, '01012345678'::text)$$,
  'GCN-DB-04 claim과 같은 원자 경로에서 서버 metadata를 반환한다'
);

SELECT is(
  (SELECT count(*)::integer FROM public.claim_goal_created_notification('goal-created-own')),
  0,
  'GCN-DB-05 같은 목표의 두 번째 claim은 빈 결과다'
);

SELECT * FROM finish();
ROLLBACK;
