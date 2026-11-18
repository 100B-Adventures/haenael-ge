BEGIN;
SELECT plan(24);

SELECT has_table('public', 'store_purchase', 'AP-DB-01 스토어 구매 원장이 있다');
SELECT has_table('public', 'clover_maturity', 'AP-DB-02 환전 보류 원장이 있다');
SELECT has_table('public', 'store_recovery_case', 'AP-DB-03 환불 회수 큐가 있다');
SELECT has_table('public', 'google_external_transaction', 'AP-DB-04 외부 거래 보고 큐가 있다');
SELECT has_table('public', 'device_push_token', 'AP-DB-05 푸시 토큰 테이블이 있다');
SELECT has_table('public', 'gift_exchange', 'AP-DB-06 기프티콘 교환 테이블이 있다');
SELECT has_table('public', 'store_purchase_intent', 'AP-DB-07 구매 의도와 계정 결합 테이블이 있다');
SELECT has_table('public', 'app_channel_release_gate', 'AP-DB-08 채널 출시 게이트가 있다');

SELECT has_function('public', 'credit_store_purchase', ARRAY[
  'uuid','uuid','uuid','text','text','text','text','text','integer','integer','text','boolean','text','timestamp with time zone','text'
], 'AP-DB-09 검증 후 적립 RPC가 있다');
SELECT has_function('public', 'reverse_store_purchase', ARRAY[
  'text','text','text','text','text','integer','integer','text','text','timestamp with time zone'
], 'AP-DB-10 환불 RPC가 있다');

INSERT INTO auth.users(id, email) VALUES
  ('00000000-0000-0000-0000-000000000071', 'app-supporter@example.test'),
  ('00000000-0000-0000-0000-000000000072', 'app-owner@example.test');
INSERT INTO public.member(id, nickname) VALUES
  ('00000000-0000-0000-0000-000000000071', '응원자'),
  ('00000000-0000-0000-0000-000000000072', '수취인');
INSERT INTO public.goal(member_id, slug, title, due_date)
VALUES ('00000000-0000-0000-0000-000000000072', 'app-channel-test', '앱 채널 테스트', current_date + 30)
RETURNING id AS app_goal_id \gset

UPDATE public.app_channel_release_gate SET sandbox_enabled = true WHERE channel = 'APPLE';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000071', true);
SELECT throws_ok(
  format(
    'SELECT * FROM public.create_store_purchase_intent(%s, %L, %L, %s, %L)',
    :app_goal_id, 'TOSS_IAP', 'haenael_cheer_clover_1', 1, 'toss-gate-off-0001'
  ),
  '55000',
  'channel_release_disabled',
  'TC-TOSS-04-3 운영 게이트 OFF면 실제 결제창 전에 구매 의도를 거절한다'
);
SELECT * FROM public.create_store_purchase_intent(
  :app_goal_id, 'APPLE', 'haenael.cheer.clover.3', 3, 'app-request-0001'
) \gset purchase_
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);

CREATE TEMP TABLE first_credit AS
SELECT * FROM public.credit_store_purchase(
  :'purchase_intent_id', '00000000-0000-0000-0000-000000000071', :'purchase_account_binding',
  'APPLE', 'sandbox-transaction-0001', 'SANDBOX', 'haenael.cheer.clover.3',
  'KRW', 3600, 3, '같이 해낼게', false, 'app-request-0001', now(), NULL
);

SELECT is((SELECT status FROM public.store_purchase_intent WHERE id=:'purchase_intent_id'), 'CONSUMED', 'AP-DB-11 구매 의도는 한 번 소비된다');
SELECT is((SELECT clover_amount FROM first_credit), 3, 'AP-DB-12 정상 구매는 3클로버를 적립한다');
SELECT is((SELECT count(*)::integer FROM public.store_purchase WHERE provider_transaction_id='sandbox-transaction-0001'), 1, 'AP-DB-13 구매 원장 1건');
SELECT is((SELECT count(*)::integer FROM public.cheer WHERE id=(SELECT cheer_id FROM first_credit) AND status='CONFIRMED'), 1, 'AP-DB-14 확정 응원 1건');
SELECT is((SELECT clover_count FROM public.clover_balance WHERE member_id='00000000-0000-0000-0000-000000000072'), 6, 'AP-DB-15 웰컴 3과 구매 3을 합쳐 총잔액 6');
SELECT is((SELECT maturity_locked_amount FROM public.clover_eligibility('00000000-0000-0000-0000-000000000072')), 3, 'RF-DB-01 30일 보류 3');
SELECT is((SELECT payable_amount FROM public.clover_eligibility('00000000-0000-0000-0000-000000000072')), 0, 'RF-DB-02 보류분은 지급가능 0');

SELECT is((SELECT is_replay FROM public.credit_store_purchase(
  :'purchase_intent_id', '00000000-0000-0000-0000-000000000071', :'purchase_account_binding',
  'APPLE', 'sandbox-transaction-0001', 'SANDBOX', 'haenael.cheer.clover.3',
  'KRW', 3600, 3, '같이 해낼게', false, 'app-request-0001', now(), NULL
)), true, 'AP-DB-13 같은 거래는 멱등 재생');
SELECT is((SELECT count(*)::integer FROM public.clover_ledger WHERE ref_type='store_purchase'), 1, 'AP-DB-14 재생 뒤 적립 원장 1건');

SELECT is((SELECT status FROM public.reverse_store_purchase(
  'APPLE', 'sandbox-transaction-0001', 'refund-event-0001', repeat('a',64)
)), 'REFUNDED', 'RF-DB-03 환불은 회수 완료');
SELECT is((SELECT clover_count FROM public.clover_balance WHERE member_id='00000000-0000-0000-0000-000000000072'), 3, 'RF-DB-04 환불 뒤 구매분만 회수되고 웰컴 3 유지');
SELECT is((SELECT maturity_locked_amount FROM public.clover_eligibility('00000000-0000-0000-0000-000000000072')), 0, 'RF-DB-04-1 전액 환불된 구매는 30일 보류에서 제외한다');
SELECT is((SELECT is_replay FROM public.reverse_store_purchase(
  'APPLE', 'sandbox-transaction-0001', 'refund-event-0001', repeat('a',64)
)), true, 'RF-DB-05 같은 환불 이벤트는 멱등 재생');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
