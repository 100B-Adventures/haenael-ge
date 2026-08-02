-- =============================================================================
-- member.phone 개인정보/RLS/형식 회귀 (pgTAP)
-- =============================================================================

BEGIN;

SELECT plan(8);

SELECT has_column('public', 'member', 'phone', 'member.phone 컬럼이 존재한다');

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
)
VALUES
  ('a11a11a1-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alimtalk-a@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false),
  ('b22b22b2-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'alimtalk-b@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false);

INSERT INTO member (id, nickname, phone)
VALUES
  ('a11a11a1-0000-0000-0000-000000000001', '알림A', '01012345678'),
  ('b22b22b2-0000-0000-0000-000000000002', '알림B', '01087654321');

SELECT throws_ok(
  $$UPDATE member SET phone = '82-10-1234' WHERE id = 'a11a11a1-0000-0000-0000-000000000001'$$,
  '23514', NULL,
  '정규화되지 않은 전화번호는 CHECK 제약으로 거부한다'
);

SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT phone FROM member$$,
  '42501', NULL,
  'anon은 member.phone을 읽을 수 없다'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"a11a11a1-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT is(
  (SELECT phone FROM member WHERE id = 'a11a11a1-0000-0000-0000-000000000001'),
  '01012345678',
  '본인은 자기 phone을 읽을 수 있다'
);

SELECT is(
  (SELECT count(*)::integer FROM member WHERE id = 'b22b22b2-0000-0000-0000-000000000002'),
  0,
  '인증 사용자는 다른 회원 행을 읽을 수 없다'
);
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT is(
  (SELECT phone FROM member WHERE id = 'b22b22b2-0000-0000-0000-000000000002'),
  '01087654321',
  'service_role은 알림 발송을 위해 phone을 읽을 수 있다'
);

SELECT lives_ok(
  $$UPDATE member SET phone = '01099998888' WHERE id = 'b22b22b2-0000-0000-0000-000000000002'$$,
  'service_role은 카카오 최신 번호로 phone을 갱신할 수 있다'
);
RESET ROLE;

SELECT is(
  (SELECT phone FROM member WHERE id = 'b22b22b2-0000-0000-0000-000000000002'),
  '01099998888',
  'service_role 갱신 결과가 저장된다'
);

SELECT * FROM finish();
ROLLBACK;
