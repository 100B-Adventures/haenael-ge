-- cashout_security_hardening.test.sql — 배포차단 보안/경계 회귀
BEGIN;

SELECT plan(32);

SELECT ok(
  (
    SELECT p.proconfig IS NOT NULL
      AND 'search_path=""' = ANY (p.proconfig)
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'sync_clover_balance'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
  ),
  'sync_clover_balance는 호출자와 무관한 빈 search_path를 고정'
);

SELECT like(
  (
    SELECT p.prosrc
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'sync_clover_balance'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
  ),
  '%INSERT INTO public.clover_balance%',
  'sync_clover_balance 내부 테이블 참조는 public 스키마로 한정'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
)
SELECT
  id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  email,
  '', now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
FROM (VALUES
  ('ca5e0000-0000-0000-0000-000000000001'::uuid, 'secure-a@test.local'),
  ('ca5e0000-0000-0000-0000-000000000002'::uuid, 'secure-b@test.local'),
  ('ca5e0000-0000-0000-0000-000000000003'::uuid, 'overflow@test.local'),
  ('ca5e0000-0000-0000-0000-000000000004'::uuid, 'purge@test.local'),
  ('ca5e0000-0000-0000-0000-000000000005'::uuid, 'admin-a@test.local'),
  ('ca5e0000-0000-0000-0000-000000000006'::uuid, 'admin-b@test.local')
) AS seed(id, email);

INSERT INTO public.member (id, nickname, kyc_status)
VALUES
  ('ca5e0000-0000-0000-0000-000000000001', '보안회원A', 'NONE'),
  ('ca5e0000-0000-0000-0000-000000000002', '보안회원B', 'NONE'),
  ('ca5e0000-0000-0000-0000-000000000003', '경계회원', 'NONE'),
  ('ca5e0000-0000-0000-0000-000000000004', '파기회원', 'NONE'),
  ('ca5e0000-0000-0000-0000-000000000005', '관리자A', 'NONE'),
  ('ca5e0000-0000-0000-0000-000000000006', '관리자B', 'NONE');

INSERT INTO public.admin_member(member_id)
VALUES
  ('ca5e0000-0000-0000-0000-000000000005'),
  ('ca5e0000-0000-0000-0000-000000000006');

INSERT INTO public.clover_ledger (
  member_id, entry_type, clover_delta, ref_type, ref_id, balance_after
)
VALUES
  ('ca5e0000-0000-0000-0000-000000000001', 'EARN', 30, 'security_test', 1, 30),
  ('ca5e0000-0000-0000-0000-000000000002', 'EARN', 30, 'security_test', 2, 30),
  ('ca5e0000-0000-0000-0000-000000000003', 'EARN', 65076, 'security_test', 3, 65076),
  ('ca5e0000-0000-0000-0000-000000000004', 'EARN', 30, 'security_test', 4, 30);

SELECT col_type_is('public', 'cashout_request', 'gross_krw', 'bigint',
  '원화 gross 컬럼은 bigint');
SELECT col_type_is('public', 'cashout_request', 'fee_krw', 'bigint',
  '원화 fee 컬럼은 bigint');
SELECT col_type_is('public', 'cashout_request', 'withholding_krw', 'bigint',
  '원화 withholding 컬럼은 bigint');
SELECT col_type_is('public', 'cashout_request', 'net_krw', 'bigint',
  '원화 net 컬럼은 bigint');

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

SELECT is(
  (SELECT status::text FROM public.create_cashout_request(
    'ca5e0000-0000-0000-0000-000000000001', 30, 'KB', '12345678',
    '보안회원A', 'secure-account-a', 2::smallint,
    repeat('n', 40), repeat('f', 40)
  )),
  'REQUESTED',
  'HMAC/key_version 신규 시그니처로 신청 성공'
);

SELECT ok(
  (SELECT request_fingerprint ? 'account_no_hmac_sha256'
   FROM public.cashout_request WHERE request_key = 'secure-account-a'),
  'fingerprint는 account_no_hmac_sha256 필드를 저장'
);
SELECT ok(
  (SELECT NOT (request_fingerprint ? 'account_no_sha256')
   FROM public.cashout_request WHERE request_key = 'secure-account-a'),
  'fingerprint에 평문 SHA-256 필드가 남지 않음'
);
SELECT is(
  (SELECT request_fingerprint ->> 'account_no_hmac_sha256'
   FROM public.cashout_request WHERE request_key = 'secure-account-a'),
  encode(extensions.hmac('12345678', repeat('f', 40), 'sha256'), 'hex'),
  '계좌 fingerprint는 별도 비밀키 HMAC-SHA-256과 정확히 일치'
);
SELECT isnt(
  (SELECT request_fingerprint ->> 'account_no_hmac_sha256'
   FROM public.cashout_request WHERE request_key = 'secure-account-a'),
  encode(extensions.digest('12345678', 'sha256'), 'hex'),
  '계좌 HMAC은 평문 SHA-256과 다름'
);
SELECT is(
  (SELECT (account_masked, key_version)
   FROM public.cashout_request WHERE request_key = 'secure-account-a'),
  ('••••••5678'::text, 2::smallint),
  '8자리 계좌도 고정 길이 마스크와 활성 key_version=2 저장'
);

SELECT is(
  (SELECT status::text FROM public.create_cashout_request(
    'ca5e0000-0000-0000-0000-000000000002', 30, 'KB', '12345678901234567890',
    '보안회원B', 'secure-account-b', 1::smallint,
    repeat('o', 40), repeat('f', 40)
  )),
  'REQUESTED',
  '20자리 계좌 신청 성공'
);
SELECT is(
  (SELECT account_masked FROM public.cashout_request WHERE request_key = 'secure-account-b'),
  '••••••7890',
  '20자리 계좌도 8자리 계좌와 같은 마스크 길이'
);

SELECT throws_ok(
  $$SELECT public.admin_reveal_cashout_account(
    (SELECT id FROM public.cashout_request WHERE request_key = 'secure-account-a'),
    'ca5e0000-0000-0000-0000-000000000005',
    jsonb_build_object('1', repeat('o', 40))
  )$$,
  '55000', 'cashout_key_version_unavailable',
  '저장된 key_version이 keyring에 없으면 복호화 거부'
);

SELECT set_config(
  'test.secure_request_id',
  (SELECT id::text FROM public.cashout_request WHERE request_key = 'secure-account-a'),
  true
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ca5e0000-0000-0000-0000-000000000005"}',
  true
);

SELECT throws_ok(
  $$SELECT * FROM public.admin_mark_cashout_paid(
    current_setting('test.secure_request_id')::bigint, '열람 없이 송금'
  )$$,
  '55000', 'cashout_account_reveal_required',
  '같은 관리자의 최근 성공 열람 없이는 PAID 전이 거부'
);

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

SELECT is(
  public.admin_reveal_cashout_account(
    current_setting('test.secure_request_id')::bigint,
    'ca5e0000-0000-0000-0000-000000000006',
    jsonb_build_object('1', repeat('o', 40), '2', repeat('n', 40))
  ),
  '12345678',
  '다른 관리자는 버전별 keyring으로 전체 계좌 열람 가능'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ca5e0000-0000-0000-0000-000000000005"}',
  true
);
SELECT throws_ok(
  $$SELECT * FROM public.admin_mark_cashout_paid(
    current_setting('test.secure_request_id')::bigint, '다른 관리자 열람 뒤 송금'
  )$$,
  '55000', 'cashout_account_reveal_required',
  '다른 관리자의 열람 로그로는 PAID 전이 불가'
);

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT is(
  public.admin_reveal_cashout_account(
    current_setting('test.secure_request_id')::bigint,
    'ca5e0000-0000-0000-0000-000000000005',
    jsonb_build_object('1', repeat('o', 40), '2', repeat('n', 40))
  ),
  '12345678',
  '지급 처리 관리자 본인의 성공 열람은 전체 계좌를 반환'
);

RESET ROLE;
SELECT is(
  (SELECT count(*)::integer
   FROM public.cashout_account_access_log
   WHERE request_id = current_setting('test.secure_request_id')::bigint
     AND actor_id = 'ca5e0000-0000-0000-0000-000000000005'),
  1,
  '성공 열람은 해당 관리자 감사로그 1건으로 기록'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ca5e0000-0000-0000-0000-000000000005"}',
  true
);
SELECT is(
  (SELECT status::text FROM public.admin_mark_cashout_paid(
    current_setting('test.secure_request_id')::bigint, '실제 송금 완료'
  )),
  'PAID',
  '같은 관리자의 최근 성공 열람 후 PAID 전이 성공'
);

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT throws_ok(
  $$SELECT public.admin_reveal_cashout_account(
    current_setting('test.secure_request_id')::bigint,
    'ca5e0000-0000-0000-0000-000000000005',
    jsonb_build_object('2', repeat('n', 40))
  )$$,
  '55000', 'cashout_account_unavailable',
  'PAID 종결 즉시 과거 계좌 재열람 차단'
);

SELECT is(
  (SELECT status::text FROM public.create_cashout_request(
    'ca5e0000-0000-0000-0000-000000000003', 65076, 'KB', repeat('3', 12),
    '경계회원', 'overflow-65076', 1::smallint,
    repeat('o', 40), repeat('f', 40)
  )),
  'REQUESTED',
  '65,076클로버 오버플로 경계 신청 성공'
);
SELECT is(
  (SELECT (gross_krw, withholding_krw, net_krw)
   FROM public.cashout_request WHERE request_key = 'overflow-65076'),
  (65076000::bigint, 2147508::bigint, 62928492::bigint),
  '65,076클로버 원화/원천징수/실지급 bigint 계산 정확'
);

SELECT is(
  (SELECT status::text FROM public.create_cashout_request(
    'ca5e0000-0000-0000-0000-000000000004', 30, 'KB', repeat('4', 12),
    '파기회원', 'purge-account', 1::smallint,
    repeat('o', 40), repeat('f', 40)
  )),
  'REQUESTED',
  '90일 파기 fixture 신청 성공'
);

RESET ROLE;
UPDATE public.cashout_request
SET status = 'PAID', paid_at = now() - interval '89 days'
WHERE request_key = 'purge-account';

SELECT is(
  public.purge_expired_cashout_accounts(100),
  0,
  '종결 90일 전 계좌는 파기하지 않음'
);
SELECT ok(
  (SELECT account_no_enc IS NOT NULL AND account_purged_at IS NULL
   FROM public.cashout_request WHERE request_key = 'purge-account'),
  '90일 전 계좌 암호문은 유지'
);

UPDATE public.cashout_request
SET paid_at = now() - interval '90 days 1 second'
WHERE request_key = 'purge-account';

SELECT is(
  public.purge_expired_cashout_accounts(100),
  1,
  '종결 90일 경과 계좌를 1건 파기'
);
SELECT ok(
  (SELECT account_no_enc IS NULL
      AND account_masked IS NULL
      AND account_holder IS NULL
      AND account_purged_at IS NOT NULL
      AND NOT (request_fingerprint ? 'account_no_hmac_sha256')
   FROM public.cashout_request WHERE request_key = 'purge-account'),
  '파기 시 암호문·마스크·예금주·계좌 HMAC 제거와 파기시각 기록'
);
SELECT is(
  public.purge_expired_cashout_accounts(100),
  0,
  '계좌 파기 함수 재실행은 0건인 멱등 동작'
);

SELECT ok(
  NOT has_table_privilege(
    'service_role', 'public.cashout_account_access_log', 'UPDATE'
  ),
  'service_role은 감사 로그 UPDATE 권한 없음'
);
SELECT ok(
  NOT has_table_privilege(
    'service_role', 'public.cashout_account_access_log', 'DELETE'
  ),
  'service_role은 감사 로그 DELETE 권한 없음'
);

SELECT * FROM finish();
ROLLBACK;
