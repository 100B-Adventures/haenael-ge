BEGIN;

SELECT plan(13);

INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_anonymous
)
VALUES
  (
    'd1000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'security-a@test.local',
    '', now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
  ),
  (
    'd1000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'security-b@test.local',
    '', now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
  );

INSERT INTO public.member(id, provider, provider_id, nickname)
VALUES (
  'd1000000-0000-0000-0000-000000000001',
  'kakao', 'security-provider-a', '보안사용자A'
);

SELECT has_index(
  'public', 'member', 'member_provider_identity_unique',
  'AUTH-DB-01: provider와 provider_id 복합 유일 인덱스가 존재한다'
);

SELECT throws_ok(
  $$INSERT INTO public.member(id, provider, provider_id, nickname)
    VALUES (
      'd1000000-0000-0000-0000-000000000002',
      'kakao', 'security-provider-a', '중복사용자'
    )$$,
  '23505',
  NULL,
  'AUTH-NEG-04: 같은 provider 식별자는 중복 저장할 수 없다'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"d1000000-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT lives_ok(
  $$UPDATE public.member
    SET nickname = '변경된닉네임'
    WHERE id = 'd1000000-0000-0000-0000-000000000001'$$,
  'AUTH-DB-02: 본인은 허용된 프로필 컬럼을 수정할 수 있다'
);

SELECT throws_ok(
  $$UPDATE public.member
    SET provider = 'attacker'
    WHERE id = 'd1000000-0000-0000-0000-000000000001'$$,
  '42501',
  NULL,
  'AUTH-NEG-05: 사용자는 provider를 바꿀 수 없다'
);

SELECT throws_ok(
  $$UPDATE public.member
    SET provider_id = 'attacker-id'
    WHERE id = 'd1000000-0000-0000-0000-000000000001'$$,
  '42501',
  NULL,
  'AUTH-NEG-06: 사용자는 provider_id를 바꿀 수 없다'
);

SELECT throws_ok(
  $$SELECT public.claim_toss_webhook(
      'forbidden-transmission', 'PAYMENT_STATUS_CHANGED', 'payment-forbidden'
    )$$,
  '42501',
  NULL,
  'PAY-NEG-01: authenticated는 웹훅 영수증 claim RPC를 호출할 수 없다'
);

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT is(
  public.claim_toss_webhook(
    'transmission-security-1', 'PAYMENT_STATUS_CHANGED', 'payment-security-1'
  ),
  'claimed',
  'PAY-DB-01: 첫 transmission-id는 원자 claim된다'
);

SELECT is(
  public.claim_toss_webhook(
    'transmission-security-1', 'PAYMENT_STATUS_CHANGED', 'payment-security-1'
  ),
  'in_progress',
  'PAY-NEG-02: 처리 중인 같은 transmission-id는 중복 claim되지 않는다'
);

SELECT lives_ok(
  $$SELECT public.complete_toss_webhook('transmission-security-1')$$,
  'PAY-DB-02: 처리 완료를 영수증에 기록한다'
);

SELECT is(
  public.claim_toss_webhook(
    'transmission-security-1', 'PAYMENT_STATUS_CHANGED', 'payment-security-1'
  ),
  'processed',
  'PAY-NEG-03: 완료된 transmission-id 재전송은 중복으로 판정한다'
);

SELECT is(
  public.claim_toss_webhook(
    'transmission-security-2', 'PAYMENT_STATUS_CHANGED', 'payment-security-2'
  ),
  'claimed',
  'PAY-DB-03: 실패 재시도용 별도 transmission-id를 claim한다'
);

SELECT lives_ok(
  $$SELECT public.release_toss_webhook('transmission-security-2')$$,
  'PAY-DB-04: 상태 전이 실패 시 미완료 claim을 해제한다'
);

SELECT is(
  public.claim_toss_webhook(
    'transmission-security-2', 'PAYMENT_STATUS_CHANGED', 'payment-security-2'
  ),
  'claimed',
  'PAY-DB-05: 해제한 transmission-id는 재시도에서 다시 claim된다'
);

SELECT finish();

ROLLBACK;
