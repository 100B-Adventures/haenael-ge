-- cashout_manual.test.sql — 확정 계약 §0-1-6 T1~T14
BEGIN;

-- A안(환전 클로버 잠금) + 인증 게이트 완화 반영: plan 31 → 44. 추가분: C3(HOLD delta=0)·A-I4(신청 직후
-- 총량 불변)·C4(SETTLED delta/잔액 감소 2건)·C5(신청 직후 불변)·C6(REVERSAL delta=0)·
-- A-I2 회귀 3건(컨트롤러 재검증 MINOR, 잠금 중 웰컴 회수)·중간상태 0건 회귀 1건·
-- KYC-GATE 가입 직후 통과 1건·확인된 미성년 차단 1건·최신 성인 판정 우선 1건.
SELECT plan(44);

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
  ('ca500000-0000-0000-0000-000000000005'::uuid, 'cashout-admin@test.local'),
  ('ca500000-0000-0000-0000-000000000007'::uuid, 'cashout-signup@test.local'),
  ('ca500000-0000-0000-0000-000000000008'::uuid, 'cashout-minor@test.local')
) AS seed(id, email);

-- W-7 검증을 위해 일반 회원은 KYC 행 없이 시드한다.
INSERT INTO public.member (id, nickname, kyc_status)
VALUES
  ('ca500000-0000-0000-0000-000000000001', '미달회원', 'NONE'),
  ('ca500000-0000-0000-0000-000000000002', '웰컴회원', 'NONE'),
  ('ca500000-0000-0000-0000-000000000003', '지급회원', 'NONE'),
  ('ca500000-0000-0000-0000-000000000004', '반려회원', 'NONE'),
  ('ca500000-0000-0000-0000-000000000005', '환전관리자', 'NONE');

-- auth-kakao 신규 가입과 같은 상태: provider 식별값만 있고 kyc_status는 기본 NONE,
-- kyc_verification 행은 없다. 미성년 fixture도 회원 기본값에서 시작한 뒤 확인 행만 추가한다.
INSERT INTO public.member (id, provider, provider_id, nickname)
VALUES
  ('ca500000-0000-0000-0000-000000000007', 'kakao', 'cashout-signup', '가입직후회원'),
  ('ca500000-0000-0000-0000-000000000008', 'kakao', 'cashout-minor', '미성년확인회원');

INSERT INTO public.kyc_verification (member_id, is_adult, provider, verified_at)
VALUES (
  'ca500000-0000-0000-0000-000000000008', false, 'PASS',
  '2026-08-24T00:00:00+09:00'::timestamptz
);

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
  ('ca500000-0000-0000-0000-000000000004', 'EARN', 40, 'test', 5, 40),
  ('ca500000-0000-0000-0000-000000000007', 'EARN', 30, 'test', 6, 30),
  ('ca500000-0000-0000-0000-000000000008', 'EARN', 30, 'test', 7, 30);

-- 설정 함수는 앱 역할에 공개하지 않은 내부 토글이다. migration owner 권한에서
-- 값을 검증한 뒤, 실제 신청 RPC는 아래 service_role 권한으로 검증한다.
SELECT is(public.cashout_require_kyc(), false, 'W-7: KYC 게이트는 한 줄 설정 함수로 비활성');

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

SELECT is(
  (SELECT status::text FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000007', 30, 'KB', repeat('7', 12),
    '가입직후회원', 'cashout-signup-none', 1::smallint, repeat('k', 40), repeat('f', 40)
  )),
  'REQUESTED',
  'KYC-GATE-01 정상 경로: 가입 직후 NONE·확인 행 없음 계정도 환전 신청 성공'
);

SELECT throws_ok(
  $$SELECT * FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000008', 30, 'KB', repeat('8', 12),
    '미성년확인회원', 'cashout-minor-block', 1::smallint, repeat('k', 40), repeat('f', 40)
  )$$,
  '42501', 'cashout_minor_not_allowed',
  'KYC-GATE-02 거절 경로: 미성년 확인 행의 최신 is_adult=false는 신청 차단'
);

INSERT INTO public.kyc_verification (member_id, is_adult, provider, verified_at)
VALUES (
  'ca500000-0000-0000-0000-000000000008', true, 'PASS',
  '2026-08-25T00:00:00+09:00'::timestamptz
);

SELECT is(
  (SELECT status::text FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000008', 30, 'KB', repeat('8', 12),
    '미성년확인회원', 'cashout-latest-adult', 1::smallint, repeat('k', 40), repeat('f', 40)
  )),
  'REQUESTED',
  'KYC-GATE-03 경계값: 과거 false 뒤 최신 is_adult=true 판정이면 신청 성공'
);

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
  (SELECT (gross_krw, fee_krw, withholding_krw, net_krw)
   FROM public.cashout_request WHERE request_key = 'cashout-t4-replay'),
  (30000::bigint, 3300::bigint, 881::bigint, 25819::bigint),
  'C1: 서비스 이용료 10%+VAT 및 이용료 차감 후 3.3% 원천징수 정수 절사'
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

-- C3(D1=A-1): 잠금은 delta=0으로 기록되고 balance_after는 신청 전 총량(50)이어야 한다(총량 불변).
SELECT is(
  (SELECT (clover_delta, balance_after) FROM public.clover_ledger
   WHERE entry_type = 'CASHOUT_HOLD'
     AND ref_id = (SELECT id FROM public.cashout_request WHERE request_key='cashout-t4-replay')),
  (0, 50),
  'C3: CASHOUT_HOLD는 delta=0·balance_after=신청 전 총량(A안, 총량 불변)'
);
SELECT is(
  (SELECT clover_count FROM public.clover_balance
   WHERE member_id = 'ca500000-0000-0000-0000-000000000003'),
  50,
  'A-I4: 신청 직후에도 총량은 그대로(52처럼 줄지 않음) — 감소는 PAID뿐'
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

-- C5(§14 #1 재작성 준비): 신청 직후에도 총량은 그대로(40) — 뒤의 반려 후 검증과
-- 두 시점 모두 불변임을 짝으로 증명한다(가짜 통과 방지: 중간 시점 단언 필수).
SELECT is(
  (SELECT clover_count FROM public.clover_balance
   WHERE member_id='ca500000-0000-0000-0000-000000000004'),
  40,
  'C5: 신청 직후 총량은 40으로 그대로(잠금은 표식일 뿐 총량을 건드리지 않음)'
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

-- C4(이중 지급 방어 회귀 · §16-R1): 총량이 줄어드는 유일한 지점 — PAID된 30클로버만큼 정확히 감소.
SELECT is(
  (SELECT clover_delta FROM public.clover_ledger
   WHERE entry_type='CASHOUT_SETTLED'
     AND ref_id=current_setting('test.cashout_paid_request_id')::bigint),
  -30,
  'C4: CASHOUT_SETTLED delta=-clover_amount(A안, 총량 감소 지점)'
);
SELECT is(
  (SELECT clover_count FROM public.clover_balance
   WHERE member_id='ca500000-0000-0000-0000-000000000003'),
  20,
  'C4: PAID 후 총량은 신청 전 50에서 신청량 30만큼 정확히 1회만 감소(50-30=20)'
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
  (SELECT clover_delta FROM public.clover_ledger
   WHERE entry_type='CASHOUT_REVERSAL'
     AND ref_id=current_setting('test.cashout_rejected_request_id')::bigint),
  0,
  'C6/T10: CASHOUT_REVERSAL은 delta=0(A안 — 복원이 아니라 잠금 해제 표식)'
);
SELECT is(
  (SELECT clover_count FROM public.clover_balance
   WHERE member_id='ca500000-0000-0000-0000-000000000004'),
  40,
  'T10(재작성, §14 #1): 반려 후에도 총량은 40 그대로 — 신청 직후(C5)와 반려 후 두 시점 모두 불변'
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

-- ---------------------------------------------------------------------------
-- A-I2 회귀(컨트롤러 재검증 MINOR 3): "잠금 중 웰컴 회수가 불변식을 안 깬다"는
-- payable = total − welcome − locked 공식의 §8-5 증명에만 기대고 있어 그 공식이
-- 바뀌면 조용히 깨진다. FDD §13.1 A-I2 그대로 회귀 테스트로 고정한다.
-- 시나리오: 웰컴3 + 친구49 = 총52, 40 신청(잠김) → 웰컴 3 회수 → 총49, 잠김 40,
-- available = 9(음수 아님), clover_balance CHECK(>=0) 위반 없음.
-- ---------------------------------------------------------------------------
RESET ROLE;
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
) VALUES (
  'ca500000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'cashout-a-i2@test.local', '',
  now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
);
INSERT INTO public.member (id, nickname, kyc_status)
VALUES ('ca500000-0000-0000-0000-000000000006', 'A-I2회귀회원', 'NONE');
INSERT INTO public.clover_ledger (
  member_id, entry_type, clover_delta, ref_type, ref_id, balance_after
) VALUES
  ('ca500000-0000-0000-0000-000000000006', 'WELCOME_GRANT', 3, 'test', 900, 3),
  ('ca500000-0000-0000-0000-000000000006', 'EARN', 49, 'test', 901, 52);

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT is(
  (SELECT status::text FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000006', 40, 'KB', repeat('6', 12),
    'A-I2회귀회원', 'a-i2-regression', 1::smallint, repeat('k', 40), repeat('f', 40)
  )),
  'REQUESTED',
  'A-I2 회귀: 총52·웰컴3 회원이 40 신청(잠김) 성공'
);
INSERT INTO public.clover_ledger (
  member_id, entry_type, clover_delta, ref_type, ref_id, balance_after
) VALUES (
  'ca500000-0000-0000-0000-000000000006', 'WELCOME_REVERSAL', -3, 'test', 902, 49
);
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ca500000-0000-0000-0000-000000000006"}',
  true
);
SELECT is(
  (SELECT (total_balance, locked_amount, available_amount)
   FROM public.clover_eligibility('ca500000-0000-0000-0000-000000000006')),
  (49, 40, 9),
  'A-I2 회귀: 잠금 중 웰컴 3 회수 후에도 available=9(음수 아님) — payable 공식이 바뀌면 이 값이 먼저 깨진다'
);
SELECT is(
  (SELECT clover_count FROM public.clover_balance
   WHERE member_id = 'ca500000-0000-0000-0000-000000000006'),
  49,
  'A-I2 회귀: clover_balance CHECK(>=0) 위반 없이 49로 정합'
);
RESET ROLE;

-- ---------------------------------------------------------------------------
-- MINOR(컨트롤러 재검증): 잠금 상태 집합을 REQUESTED로 좁힌 판단은 옳지만 그
-- 집행 장치가 주석뿐이었다. clover_eligibility.locked·create_cashout_request의
-- 중복차단이 모두 'REQUESTED'만 세는데, 다음 슬라이스가 KYC_PENDING/APPROVED/
-- PAYOUT_SENT로 전이시키는 함수 하나만 추가하면 그 상태의 요청은 잠김으로 안
-- 세어져 같은 클로버로 이중 신청이 가능해진다. 이 회귀는 코드가 아니라
-- "지금 이 세 상태로 전이하는 행이 실제로 0건"이라는 데이터 사실을 고정해,
-- 중간 상태를 실제로 쓰기 시작하는 순간 이 단언이 먼저 빨개지게 만든다.
-- ---------------------------------------------------------------------------
SELECT is(
  (SELECT count(*)::integer FROM public.cashout_request
   WHERE status IN ('KYC_PENDING', 'APPROVED', 'PAYOUT_SENT')),
  0,
  'MINOR 회귀: 중간 상태(KYC_PENDING/APPROVED/PAYOUT_SENT)로 전이된 행 0건 — 이 값이 늘면 잠김 집합과 종결 가드를 함께 넓혀야 한다'
);

SELECT * FROM finish();
ROLLBACK;
