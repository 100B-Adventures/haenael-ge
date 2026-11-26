BEGIN;

SELECT plan(9);

SELECT has_column(
  'public', 'member', 'analytics_consent',
  'AN-CONSENT-DB-01: member에 분석 동의 선택 컬럼이 있다'
);
SELECT has_column(
  'public', 'member', 'analytics_consent_updated_at',
  'AN-CONSENT-DB-02: member에 분석 동의 선택 시각 컬럼이 있다'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_anonymous
)
VALUES
  (
    'ac000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'analytics-a@test.local',
    '', now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
  ),
  (
    'ac000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'analytics-b@test.local',
    '', now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
  );

INSERT INTO public.member(id, nickname)
VALUES
  ('ac000000-0000-0000-0000-000000000001', '분석사용자A'),
  ('ac000000-0000-0000-0000-000000000002', '분석사용자B');

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ac000000-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT lives_ok(
  $$UPDATE public.member
    SET analytics_consent = 'denied'
    WHERE id = 'ac000000-0000-0000-0000-000000000001'$$,
  'AN-CONSENT-DB-03: 본인은 분석 동의 선택을 저장할 수 있다'
);
SELECT is(
  (SELECT analytics_consent FROM public.member
    WHERE id = 'ac000000-0000-0000-0000-000000000001'),
  'denied',
  'AN-CONSENT-DB-04: 저장한 선택은 본인 프로필에서 읽힌다'
);
SELECT ok(
  (SELECT analytics_consent_updated_at IS NOT NULL FROM public.member
    WHERE id = 'ac000000-0000-0000-0000-000000000001'),
  'AN-CONSENT-DB-05: 선택 시각은 DB가 함께 기록한다'
);
UPDATE public.member SET analytics_consent = 'granted'
WHERE id = 'ac000000-0000-0000-0000-000000000002';

RESET ROLE;
SELECT is(
  (SELECT analytics_consent FROM public.member
    WHERE id = 'ac000000-0000-0000-0000-000000000002'),
  NULL,
  'AN-CONSENT-DB-06: 다른 회원의 선택은 수정할 수 없다'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ac000000-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);
SELECT is(
  (SELECT count(*)::integer FROM public.member
    WHERE id = 'ac000000-0000-0000-0000-000000000002'),
  0,
  'AN-CONSENT-DB-07: 다른 회원의 프로필은 읽을 수 없다'
);
SELECT throws_ok(
  $$UPDATE public.member
    SET analytics_consent_updated_at = now()
    WHERE id = 'ac000000-0000-0000-0000-000000000001'$$,
  '42501',
  NULL,
  'AN-CONSENT-DB-08: 회원은 선택 시각을 직접 바꿀 수 없다'
);
SELECT throws_ok(
  $$UPDATE public.member
    SET analytics_consent = 'unknown'
    WHERE id = 'ac000000-0000-0000-0000-000000000001'$$,
  '23514',
  NULL,
  'AN-CONSENT-DB-09: 허용하지 않은 선택값은 거절한다'
);

SELECT finish();

ROLLBACK;
