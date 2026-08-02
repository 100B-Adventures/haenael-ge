-- cashout_manual.test.sql — 확정 계약 §0-1-6 T1~T14
BEGIN;

SELECT plan(31);

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
  ('ca500000-0000-0000-0000-000000000001'::uuid, 'cashout-t1@test.local'),
  ('ca500000-0000-0000-0000-000000000002'::uuid, 'cashout-t2@test.local'),
  ('ca500000-0000-0000-0000-000000000003'::uuid, 'cashout-t3@test.local'),
  ('ca500000-0000-0000-0000-000000000004'::uuid, 'cashout-t7@test.local'),
  ('ca500000-0000-0000-0000-000000000005'::uuid, 'cashout-admin@test.local')
) AS seed(id, email);

-- W-7 검증을 위해 일반 회원은 KYC 행 없이 시드한다.
INSERT INTO public.member (id, nickname, kyc_status)
VALUES
  ('ca500000-0000-0000-0000-000000000001', '미달회원', 'NONE'),
  ('ca500000-0000-0000-0000-000000000002', '웰컴회원', 'NONE'),
  ('ca500000-0000-0000-0000-000000000003', '지급회원', 'NONE'),
  ('ca500000-0000-0000-0000-000000000004', '반려회원', 'NONE'),
  ('ca500000-0000-0000-0000-000000000005', '환전관리자', 'NONE');

INSERT INTO public.admin_member(member_id)
VALUES ('ca500000-0000-0000-0000-000000000005');

INSERT INTO public.clover_ledger (
  member_id, entry_type, clover_delta, ref_type, ref_id, balance_after
)
VALUES
  ('ca500000-0000-0000-0000-000000000001', 'EARN', 29, 'test', 1, 29),
  ('ca500000-0000-0000-0000-000000000002', 'WELCOME_GRANT', 30, 'test', 2, 30),
  ('ca500000-0000-0000-0000-000000000003', 'WELCOME_GRANT', 10, 'test', 3, 10),
  ('ca500000-0000-0000-0000-000000000003', 'EARN', 40, 'test', 4, 50),
  ('ca500000-0000-0000-0000-000000000004', 'EARN', 40, 'test', 5, 40);

-- 설정 함수는 앱 역할에 공개하지 않은 내부 토글이다. migration owner 권한에서
-- 값을 검증한 뒤, 실제 신청 RPC는 아래 service_role 권한으로 검증한다.
SELECT is(public.cashout_require_kyc(), false, 'W-7: KYC 게이트는 한 줄 설정 함수로 비활성');

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000001', 29, 'KB', repeat('1', 12),
    '미달회원', 'cashout-t1-below', 1::smallint, repeat('k', 40), repeat('f', 40)
  )$$,
  '22023', 'cashout_below_minimum',
  'T1: 총 29클로버 신청은 cashout_below_minimum'
);

SELECT throws_ok(
  $$SELECT * FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000002', 30, 'KB', repeat('2', 12),
    '웰컴회원', 'cashout-t2-welcome', 1::smallint, repeat('k', 40), repeat('f', 40)
  )$$,
  '22023', 'cashout_insufficient_balance',
  'T2: 총 30이 전부 웰컴이면 payable=0으로 거부'
);

SELECT throws_ok(
  $$SELECT * FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000003', 41, 'KB', repeat('3', 12),
    '지급회원', 'cashout-t3-over', 1::smallint, repeat('k', 40), repeat('f', 40)
  )$$,
  '22023', 'cashout_insufficient_balance',
  'T3: clover_eligibility payable=40 초과 요청은 거부'
);

SELECT is(
  (SELECT status::text FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000003', 30, 'KB', repeat('3', 12),
    '지급회원', 'cashout-t4-replay', 1::smallint, repeat('k', 40), repeat('f', 40)
  )),
  'REQUESTED',
  'W-7: KYC 행이 없어도 현재 계약에서는 신청 성공'
);

SELECT is(
  (SELECT (gross_krw, withholding_krw, net_krw)
   FROM public.cashout_request WHERE request_key = 'cashout-t4-replay'),
  (30000, 990, 29010),
  'C1: 3.3% 원천징수 정수 절사를 유지'
);

SELECT is(
  (SELECT is_replay FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000003', 30, 'KB', repeat('3', 12),
    '지급회원', 'cashout-t4-replay', 1::smallint, repeat('k', 40), repeat('f', 40)
  )),
  true,
  'T4: 같은 request_key와 입력은 is_replay=true'
);

SELECT is(
  (SELECT count(*)::integer FROM public.clover_ledger
   WHERE entry_type = 'CASHOUT_HOLD'
     AND ref_id = (SELECT id FROM public.cashout_request WHERE request_key='cashout-t4-replay')),
  1,
  'T4: 멱등 재시도는 HOLD를 중복 생성하지 않음'
);

SELECT throws_ok(
  $$SELECT * FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000003', 30, 'KB', repeat('9', 12),
    '지급회원', 'cashout-t4-replay', 1::smallint, repeat('k', 40), repeat('f', 40)
  )$$,
  '22023', 'request_key_conflict',
  'T5: 같은 request_key에 다른 계좌는 conflict'
);

SELECT throws_ok(
  $$SELECT * FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000003', 30, 'KB', repeat('3', 12),
    '지급회원', 'cashout-t6-second', 1::smallint, repeat('k', 40), repeat('f', 40)
  )$$,
  '55000', 'cashout_already_requested',
  'T6: 진행 중 신청이 있으면 새 신청 차단'
);

SELECT is(
  (SELECT status::text FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000004', 30, 'SHINHAN', '123-456 78-9012',
    '  반려   회원  ', 'cashout-t7-normal', 1::smallint,
    repeat('k', 40), repeat('f', 40)
  )),
  'REQUESTED',
  'T7: 계좌 하이픈·공백과 예금주 공백을 서버가 정규화'
);

SELECT is(
  (SELECT (account_masked, account_holder, key_version)
   FROM public.cashout_request WHERE request_key='cashout-t7-normal'),
  ('••••••9012'::text, '반려 회원'::text, 1::smallint),
  'T7: 마스킹은 고정 길이로 마지막 4자리만 남기고 key_version=1 저장'
);

-- 이후 authenticated 관리자 역할은 RLS상 타인의 cashout_request를 직접 SELECT할
-- 수 없다. service_role 신청 구간에서 ID를 트랜잭션 로컬 설정에 고정해, 관리자
-- RPC 인자 조회가 RLS 결과(NULL)에 의존하지 않게 한다.
SELECT set_config(
  'test.cashout_paid_request_id',
  (SELECT id::text FROM public.cashout_request WHERE request_key='cashout-t4-replay'),
  true
);
SELECT set_config(
  'test.cashout_rejected_request_id',
  (SELECT id::text FROM public.cashout_request WHERE request_key='cashout-t7-normal'),
  true
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ca500000-0000-0000-0000-000000000001"}',
  true
);

SELECT throws_ok(
  $$SELECT * FROM public.admin_list_cashouts_v2(100)$$,
  '42501', 'admin_forbidden',
  'T8: 비관리자는 관리자 목록 호출 불가'
);
SELECT throws_ok(
  $$SELECT * FROM public.admin_mark_cashout_paid(1, NULL)$$,
  '42501', 'admin_forbidden',
  'T8: 비관리자는 지급완료 호출 불가'
);
SELECT throws_ok(
  $$SELECT * FROM public.admin_reject_cashout(1, '반려 사유')$$,
  '42501', 'admin_forbidden',
  'T8: 비관리자는 반려 호출 불가'
);

SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ca500000-0000-0000-0000-000000000005"}',
  true
);

SELECT ok(
  (SELECT bool_and(account_masked IS NOT NULL)
   FROM public.admin_list_cashouts_v2(100)),
  'W-8: 관리자 목록은 복호화 없이 마스킹만 반환'
);

-- 계좌 원문 복호화는 운영 계약상 service_role 전용이다. authenticated에
-- EXECUTE를 추가하지 않고 실제 Server Action과 같은 호출 역할로 전환한다.
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

SELECT is(
  (SELECT public.admin_reveal_cashout_account(
    current_setting('test.cashout_rejected_request_id')::bigint,
    'ca500000-0000-0000-0000-000000000005',
    jsonb_build_object('1', repeat('k', 40))
  )),
  '123456789012',
  'T12: 명시적 계좌 열람은 정규화된 원문 1건 반환'
);

-- 지급완료 대상도 같은 관리자가 최근 성공 열람한 감사기록을 갖춰야 한다.
SELECT set_config(
  'test.cashout_paid_account',
  public.admin_reveal_cashout_account(
    current_setting('test.cashout_paid_request_id')::bigint,
    'ca500000-0000-0000-0000-000000000005',
    jsonb_build_object('1', repeat('k', 40))
  ),
  true
);

-- 감사로그 테이블은 service_role에도 직접 공개하지 않는다. 함수가 남긴 행은
-- migration owner 컨텍스트에서만 검증해 운영 ACL을 넓히지 않는다.
RESET ROLE;
SELECT is(
  (SELECT count(*)::integer FROM public.cashout_account_access_log
   WHERE request_id=current_setting('test.cashout_rejected_request_id')::bigint),
  1,
  'T12: 계좌 열람 1회마다 감사 로그 1행'
);

-- 목록·지급·반려는 authenticated 관리자 JWT 전용 계약으로 복귀한다.
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ca500000-0000-0000-0000-000000000005"}',
  true
);

SELECT is(
  (SELECT status::text FROM public.admin_mark_cashout_paid(
    current_setting('test.cashout_paid_request_id')::bigint,
    '은행 송금 완료'
  )),
  'PAID',
  'T9: REQUESTED를 PAID로 전이'
);
SELECT throws_ok(
  $$SELECT * FROM public.admin_mark_cashout_paid(
    current_setting('test.cashout_paid_request_id')::bigint,
    '중복 송금 시도'
  )$$,
  '23505', 'cashout_already_paid',
  'T9: 지급완료 2회차 차단'
);

-- 원장 테이블은 authenticated 관리자에게도 직접 공개하지 않는다. 처리 RPC를
-- 검증한 뒤 service_role로 전환해 정확히 한 번 기록됐는지만 확인한다.
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

SELECT is(
  (SELECT count(*)::integer FROM public.clover_ledger
   WHERE entry_type='CASHOUT_SETTLED'
     AND ref_id=current_setting('test.cashout_paid_request_id')::bigint),
  1,
  'T9: CASHOUT_SETTLED는 정확히 1건'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ca500000-0000-0000-0000-000000000005"}',
  true
);

SELECT throws_ok(
  $$SELECT * FROM public.admin_reject_cashout(
    current_setting('test.cashout_rejected_request_id')::bigint, ''
  )$$,
  '22023', 'processing_note_required',
  'T11: 반려 note 미입력 차단'
);
SELECT is(
  (SELECT status::text FROM public.admin_reject_cashout(
    current_setting('test.cashout_rejected_request_id')::bigint,
    '예금주 불일치'
  )),
  'REJECTED',
  'T10: REQUESTED를 REJECTED로 전이'
);
SELECT throws_ok(
  $$SELECT * FROM public.admin_reject_cashout(
    current_setting('test.cashout_rejected_request_id')::bigint,
    '중복 반려 시도'
  )$$,
  '55000', 'invalid_cashout_status',
  'T10: 반려 2회차 차단'
);

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

SELECT is(
  (SELECT count(*)::integer FROM public.clover_ledger
   WHERE entry_type='CASHOUT_REVERSAL'
     AND ref_id=current_setting('test.cashout_rejected_request_id')::bigint),
  1,
  'T10: CASHOUT_REVERSAL은 정확히 1건'
);
SELECT is(
  (SELECT clover_count FROM public.clover_balance
   WHERE member_id='ca500000-0000-0000-0000-000000000004'),
  40,
  'T10: 반려 잔액은 정확히 1회만 복원'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ca500000-0000-0000-0000-000000000003"}',
  true
);
SELECT ok(
  NOT ((SELECT to_jsonb(s) FROM public.my_cashout_status() AS s) ? 'account_no_enc'),
  'T13: my_cashout_status 응답에 account_no_enc 미포함'
);
SELECT ok(
  NOT ((SELECT to_jsonb(h) FROM public.my_cashout_history(20) AS h LIMIT 1) ? 'account_no_enc'),
  'T13: my_cashout_history 응답에 account_no_enc 미포함'
);
SELECT is(
  (SELECT count(*)::integer FROM public.my_cashout_history(20)),
  1,
  'T14: 사용자 이력은 auth.uid 본인 신청만 반환'
);

SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ca500000-0000-0000-0000-000000000002"}',
  true
);
SELECT is(
  (SELECT count(*)::integer FROM public.my_cashout_status()),
  0,
  'T14: 타인 신청은 상태 조회에서 빈 결과'
);
SELECT is(
  (SELECT count(*)::integer FROM public.my_cashout_history(20)),
  0,
  'T14: 타인 신청은 이력 조회에서 빈 결과'
);

SELECT * FROM finish();
ROLLBACK;
