BEGIN;
SELECT plan(37);

SELECT has_table('public', 'account_deletion_job', 'APP-SRV-DB-01 회원당 서버 계정 삭제 작업이 있다');
SELECT has_table('public', 'alternative_checkout_session', 'APP-SRV-DB-01-1 서버 체크아웃 세션 원장이 있다');
SELECT has_table('public', 'apple_token_revocation', 'APP-SRV-DB-01-2 Apple 토큰 폐기 원장이 있다');
SELECT has_column('public', 'apple_token_revocation', 'token_type_hint',
  'APP-SRV-DB-01-4 Apple 폐기 토큰 종류를 함께 저장한다');
SELECT hasnt_column('public', 'alternative_checkout_session', 'amount',
  'APP-SRV-DB-01-3 체크아웃 세션은 클라이언트 금액을 저장하지 않는다');
SELECT has_column('public', 'member', 'deleted_at', 'APP-SRV-DB-02 회원 삭제 시각이 있다');
SELECT has_function('public', 'credit_alternative_store_purchase', ARRAY[
  'uuid','uuid','uuid','text','text','text','text','text','boolean','text','timestamp with time zone','bytea','text'
], 'APP-SRV-DB-03 대체결제 적립과 외부거래 보고를 묶는 RPC가 있다');
SELECT has_function('public', 'request_account_deletion', ARRAY['uuid'],
  'APP-SRV-DB-04 JWT 회원 ID 기반 계정 삭제 요청 RPC가 있다');
SELECT has_function('public', 'record_alternative_payment_recovery',
  ARRAY['uuid','uuid','text','text','text'],
  'APP-SRV-DB-04-3 승인·취소 동시 실패 복구 RPC가 있다');
SELECT has_function('public', 'claim_google_external_transaction_batch', ARRAY['integer'],
  'APP-SRV-DB-04-1 Google 외부 거래 보고 큐 claim RPC가 있다');
SELECT has_function('public', 'settle_google_external_transaction', ARRAY['bigint','boolean','boolean','text'],
  'APP-SRV-DB-04-2 Google 외부 거래 보고 정산 RPC가 있다');
SELECT has_function('public', 'delete_account_data', ARRAY['uuid'],
  'APP-SRV-DB-04-6 개인정보 삭제 직전 정산 재검사 RPC가 있다');
SELECT matches(
  pg_get_functiondef('public.record_alternative_payment_recovery(uuid,uuid,text,text,text)'::regprocedure),
  'member_settlement:',
  'APP-SRV-DB-04-4 복구 건 생성은 회원 정산 advisory lock을 사용한다'
);
SELECT matches(
  pg_get_functiondef('public.request_account_deletion(uuid)'::regprocedure),
  'member_settlement:',
  'APP-SRV-DB-04-5 계정 삭제도 같은 회원 정산 advisory lock을 사용한다'
);

INSERT INTO auth.users(id, email) VALUES
  ('00000000-0000-0000-0000-000000000101', 'mobile-delete@example.test'),
  ('00000000-0000-0000-0000-000000000102', 'mobile-other@example.test');
INSERT INTO public.member(id, provider, provider_id, nickname, phone) VALUES
  ('00000000-0000-0000-0000-000000000101', 'KAKAO', 'delete-me', '삭제회원', '01012345678'),
  ('00000000-0000-0000-0000-000000000102', 'KAKAO', 'other', '다른회원', '01087654321');

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
INSERT INTO public.device_push_token(member_id, device_id, platform, token_enc)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'device-delete-0001', 'IOS', decode('aa','hex')),
  ('00000000-0000-0000-0000-000000000102', 'device-other-0001', 'ANDROID', decode('bb','hex'));
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
SELECT is((SELECT count(*)::integer FROM public.device_push_token), 1,
  'APP-SRV-DB-05 RLS는 본인 푸시 토큰만 조회시킨다');
SELECT throws_ok(
  $$INSERT INTO public.device_push_token(member_id, device_id, platform, token_enc)
    VALUES ('00000000-0000-0000-0000-000000000101','device-write-0001','IOS',decode('cc','hex'))$$,
  '42501', NULL, 'APP-SRV-DB-06 인증 회원은 토큰 원장을 직접 쓰지 못한다'
);
RESET ROLE;

INSERT INTO auth.users(id, email) VALUES
  ('00000000-0000-0000-0000-000000000103', 'alternative-supporter@example.test'),
  ('00000000-0000-0000-0000-000000000104', 'alternative-owner@example.test');
INSERT INTO public.member(id, nickname) VALUES
  ('00000000-0000-0000-0000-000000000103', '대체결제응원자'),
  ('00000000-0000-0000-0000-000000000104', '대체결제수취인');
INSERT INTO public.goal(member_id, slug, title, due_date)
VALUES ('00000000-0000-0000-0000-000000000104', 'alternative-server-test', '대체결제 서버 시험', current_date + 30)
RETURNING id AS alternative_goal_id \gset
UPDATE public.app_channel_release_gate SET sandbox_enabled = true
WHERE channel = 'GOOGLE_ALTERNATIVE';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
SELECT * FROM public.create_store_purchase_intent(
  :alternative_goal_id, 'GOOGLE_ALTERNATIVE', 'haenael.cheer.clover.1', 1, 'alternative-request-0001'
) \gset alternative_intent_
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT public.begin_alternative_payment_confirmation(
  :'alternative_intent_intent_id',
  '00000000-0000-0000-0000-000000000103',
  'alternative-request-0001'
) \gset alternative_confirmation_
CREATE TEMP TABLE alternative_credit AS
SELECT * FROM public.credit_alternative_store_purchase(
  :'alternative_intent_intent_id',
  '00000000-0000-0000-0000-000000000103',
  :'alternative_intent_account_binding',
  'alternative-payment-key-0001',
  'alternative-order-0001',
  'haenael.cheer.clover.1',
  'SANDBOX',
  '대체결제 시험',
  false,
  'alternative-request-0001',
  now(),
  decode(repeat('ab', 32), 'hex'),
  'KR'
);
SELECT is((SELECT clover_amount FROM alternative_credit), 1,
  'APP-SRV-DB-07 대체결제는 서버 카탈로그 수량으로 적립한다');
SELECT is((SELECT gross_amount_minor FROM public.store_purchase
  WHERE provider_transaction_id='alternative-payment-key-0001'), 1100,
  'APP-SRV-DB-08 대체결제 금액은 서버 카탈로그 1,100원이다');
SELECT is((SELECT report_status FROM public.google_external_transaction
  WHERE external_transaction_id='alternative-order-0001'), 'PENDING',
  'APP-SRV-DB-09 외부거래 보고를 같은 트랜잭션에 생성한다');
SELECT is((SELECT is_replay FROM public.credit_alternative_store_purchase(
  :'alternative_intent_intent_id',
  '00000000-0000-0000-0000-000000000103',
  :'alternative_intent_account_binding',
  'alternative-payment-key-0001',
  'alternative-order-0001',
  'haenael.cheer.clover.1',
  'SANDBOX',
  '대체결제 시험',
  false,
  'alternative-request-0001',
  now(),
  decode(repeat('cd', 32), 'hex'),
  'KR'
)), true, 'APP-SRV-DB-10 같은 결제 승인 재전송은 멱등 재생된다');

CREATE TEMP TABLE claimed_external AS
SELECT * FROM public.claim_google_external_transaction_batch(10);
SELECT is((SELECT attempt_count FROM claimed_external
  WHERE external_transaction_id='alternative-order-0001'), 1,
  'APP-SRV-DB-10-1 외부 거래 보고 claim은 한 번의 시도만 예약한다');
SELECT ok(public.settle_google_external_transaction(
  (SELECT purchase_id FROM claimed_external WHERE external_transaction_id='alternative-order-0001'),
  true, false, NULL
), 'APP-SRV-DB-10-2 Google 보고 성공 정산이 큐 행 하나에 적용된다');
SELECT is((SELECT report_status FROM public.google_external_transaction
  WHERE external_transaction_id='alternative-order-0001'), 'REPORTED',
  'APP-SRV-DB-10-3 Google 보고 성공은 REPORTED 상태로 남는다');

RESET ROLE;
INSERT INTO auth.users(id, email) VALUES
  ('00000000-0000-0000-0000-000000000105', 'alternative-recovery@example.test');
INSERT INTO public.member(id, nickname) VALUES
  ('00000000-0000-0000-0000-000000000105', '대체결제복구회원');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000105', true);
SELECT * FROM public.create_store_purchase_intent(
  :alternative_goal_id, 'GOOGLE_ALTERNATIVE', 'haenael.cheer.clover.1', 1,
  'alternative-recovery-0001'
) \gset recovery_intent_
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT public.begin_alternative_payment_confirmation(
  :'recovery_intent_intent_id',
  '00000000-0000-0000-0000-000000000105',
  'alternative-recovery-0001'
) \gset recovery_confirmation_
SELECT ok(public.record_alternative_payment_recovery(
  :'recovery_intent_intent_id',
  '00000000-0000-0000-0000-000000000105',
  'alternative-payment-failed-0001',
  'alternative-order-failed-0001',
  'alternative-recovery-0001'
) IS NOT NULL, 'APP-SRV-DB-10-4 보상 실패를 원자 복구 RPC로 기록한다');
SELECT is((SELECT status FROM public.store_recovery_case
  WHERE intent_id=:'recovery_intent_intent_id'), 'OPEN',
  'APP-SRV-DB-10-5 보상 실패는 OPEN 복구 건으로 남는다');
SELECT is((SELECT event_type FROM public.store_purchase_event
  WHERE provider_event_id='compensation:alternative-payment-failed-0001'),
  'PAYMENT_COMPENSATION_FAILED', 'APP-SRV-DB-10-6 보상 실패 결제 이벤트를 함께 남긴다');
SELECT is(public.request_account_deletion(
    '00000000-0000-0000-0000-000000000105'),
  'BLOCKED_PENDING_PAYMENT',
  'APP-SRV-DB-10-7 OPEN 대체결제 복구 건은 계정 삭제를 차단한다'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
SELECT * FROM public.create_store_purchase_intent(
  :alternative_goal_id, 'GOOGLE_ALTERNATIVE', 'haenael.cheer.clover.1', 1,
  'alternative-delete-race-0001'
) \gset delete_race_intent_
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT is(public.request_account_deletion(
    '00000000-0000-0000-0000-000000000101'),
  'BLOCKED_PENDING_PAYMENT',
  'APP-SRV-DB-10-8 진행 중 대체결제가 있으면 계정 삭제를 차단한다'
);
UPDATE public.store_purchase_intent SET status='CANCELED'
WHERE id=:'delete_race_intent_intent_id';

INSERT INTO public.clover_balance(member_id, clover_count)
VALUES ('00000000-0000-0000-0000-000000000101', 3)
ON CONFLICT (member_id) DO UPDATE SET clover_count = 3;
SELECT throws_ok(
  $$SELECT public.request_account_deletion(
    '00000000-0000-0000-0000-000000000101')$$,
  '55000', 'account_balance_remaining',
  'APP-SRV-DB-11 클로버 잔액이 남으면 계정 삭제를 거절한다'
);

UPDATE public.clover_balance SET clover_count = 0
WHERE member_id = '00000000-0000-0000-0000-000000000101';

SELECT is(
  public.request_account_deletion('00000000-0000-0000-0000-000000000101'),
  'REQUESTED', 'APP-SRV-DB-12 정산 항목이 없으면 서버 삭제 작업을 시작한다'
);
SELECT public.mark_account_deletion_external_revoked(
  '00000000-0000-0000-0000-000000000101') \gset deletion_external_
SELECT public.delete_account_data(
  '00000000-0000-0000-0000-000000000101') \gset deletion_data_
SELECT is((SELECT count(*)::integer FROM public.device_push_token
  WHERE member_id='00000000-0000-0000-0000-000000000101'), 0,
  'APP-SRV-DB-13 삭제 준비가 푸시 토큰을 제거한다');
SELECT ok((SELECT deleted_at IS NOT NULL AND nickname IS NULL AND provider_id IS NULL
  FROM public.member WHERE id='00000000-0000-0000-0000-000000000101'),
  'APP-SRV-DB-14 회원 개인정보를 비식별화한다');
SELECT is(
  public.request_account_deletion('00000000-0000-0000-0000-000000000101'),
  'DATA_DELETED', 'APP-SRV-DB-14-1 새 클라이언트 키 없이 서버 삭제 작업을 재개한다'
);

RESET ROLE;
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000101';
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT lives_ok(
  $$SELECT public.complete_account_deletion_auth(
    '00000000-0000-0000-0000-000000000101')$$,
  'APP-SRV-DB-14-2 Auth 삭제 뒤 서버 작업을 완료 처리한다'
);
SELECT is((SELECT count(*)::integer FROM public.member
  WHERE id='00000000-0000-0000-0000-000000000101'), 1,
  'APP-SRV-DB-15 Auth 삭제 뒤 비식별 금융 회원 키를 보존한다');
SELECT throws_ok(
  $$INSERT INTO public.member(id,nickname)
    VALUES ('00000000-0000-0000-0000-000000000199','고아회원')$$,
  '23503', 'auth_user_not_found',
  'APP-SRV-DB-16 새 회원은 Auth 사용자 없이 생성할 수 없다'
);
SELECT is((SELECT status FROM public.account_deletion_job
  WHERE member_id='00000000-0000-0000-0000-000000000101'), 'AUTH_DELETED',
  'APP-SRV-DB-17 삭제 요청 상태를 감사 원장에 남긴다');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
