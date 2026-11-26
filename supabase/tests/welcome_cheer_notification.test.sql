-- welcome_cheer_notification.test.sql — 목표 생성 웰컴 응원 알림 claim 계약

BEGIN;

SELECT plan(8);

SELECT has_table(
  'public',
  'welcome_cheer_notification_delivery',
  'WCN-01 목표별 알림 claim 표식 테이블이 존재한다'
);

SELECT has_function(
  'public',
  'claim_welcome_cheer_notification',
  ARRAY['text'],
  'WCN-02 인증 회원용 웰컴 응원 알림 claim 함수가 존재한다'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
)
VALUES
  ('6a110000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'welcome-notify-a@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false),
  ('6a110000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'welcome-notify-b@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false);

INSERT INTO public.member (id, nickname, kyc_status)
VALUES
  ('6a110000-0000-4000-8000-000000000001', '알림A', 'NONE'),
  ('6a110000-0000-4000-8000-000000000002', '알림B', 'NONE');

INSERT INTO public.goal (member_id, slug, title, due_date, status)
VALUES
  ('6a110000-0000-4000-8000-000000000001', 'welcome-notify-own', '본인 목표 해낼게', current_date + 30, 'ACTIVE'),
  ('6a110000-0000-4000-8000-000000000001', 'welcome-notify-old', '오래된 목표 해낼게', current_date + 30, 'ACTIVE'),
  ('6a110000-0000-4000-8000-000000000002', 'welcome-notify-other', '남의 목표 해낼게', current_date + 30, 'ACTIVE');

UPDATE public.goal
SET created_at = now() - interval '6 minutes'
WHERE slug = 'welcome-notify-old';

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"6a110000-0000-4000-8000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT is(
  (SELECT count(*)::integer FROM public.claim_welcome_cheer_notification('welcome-notify-other')),
  0,
  'WCN-03 다른 회원 목표는 claim할 수 없다'
);

SELECT results_eq(
  $$SELECT goal_title FROM public.claim_welcome_cheer_notification('welcome-notify-own')$$,
  $$VALUES ('본인 목표 해낼게'::text)$$,
  'WCN-04 생성 5분 이내 본인 목표는 한 번 claim된다'
);

SELECT is(
  (SELECT count(*)::integer FROM public.claim_welcome_cheer_notification('welcome-notify-own')),
  0,
  'WCN-05 같은 목표의 두 번째 claim은 빈 결과다'
);

SELECT is(
  (SELECT count(*)::integer FROM public.claim_welcome_cheer_notification('welcome-notify-old')),
  0,
  'WCN-06 생성 5분이 지난 목표는 claim할 수 없다'
);

SELECT throws_ok(
  $$SELECT * FROM public.welcome_cheer_notification_delivery$$,
  '42501',
  NULL,
  'WCN-07 authenticated는 내부 claim 표식을 직접 읽을 수 없다'
);

RESET ROLE;

SELECT is(
  (SELECT count(*)::integer FROM public.welcome_cheer_notification_delivery),
  1,
  'WCN-08 성공한 본인 목표 claim만 정확히 한 건 남는다'
);

SELECT * FROM finish();
ROLLBACK;
