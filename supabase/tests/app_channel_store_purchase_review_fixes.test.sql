BEGIN;
SELECT plan(15);

SELECT has_table('public', 'store_product_catalog', 'AP-RV-01 서버 상품 카탈로그가 있다');
SELECT is(
  (SELECT count(*)::integer FROM public.store_product_catalog
   WHERE provider IN ('APPLE', 'GOOGLE_PLAY') AND active),
  8,
  'AP-RV-02 Apple·Google SKU 1·3·5·10을 서버가 소유한다'
);

INSERT INTO auth.users(id, email) VALUES
  ('00000000-0000-0000-0000-000000000081', 'review-supporter@example.test'),
  ('00000000-0000-0000-0000-000000000082', 'review-owner@example.test');
INSERT INTO public.member(id, nickname) VALUES
  ('00000000-0000-0000-0000-000000000081', '검토 응원자'),
  ('00000000-0000-0000-0000-000000000082', '검토 수취인');
INSERT INTO public.goal(member_id, slug, title, due_date)
VALUES ('00000000-0000-0000-0000-000000000082', 'app-review-fixes', '앱 리뷰 수정 시험', current_date + 30)
RETURNING id AS review_goal_id \gset

UPDATE public.app_channel_release_gate
SET sandbox_enabled = true
WHERE channel IN ('APPLE', 'GOOGLE_PLAY');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000081', true);

SELECT throws_ok(
  format(
    'SELECT * FROM public.create_store_purchase_intent(%s, %L, %L, %s, %L)',
    :review_goal_id, 'APPLE', 'haenael.cheer.clover.1', 10, 'catalog-mismatch-0001'
  ),
  '22023',
  'product_catalog_mismatch',
  'AP-RV-03 클라이언트가 SKU 수량을 위조하면 intent를 만들지 않는다'
);

SELECT * FROM public.create_store_purchase_intent(
  :review_goal_id, 'APPLE', 'haenael.cheer.clover.10', 10, 'review-request-0001'
) \gset review_intent_

SELECT is(
  (SELECT is_replay FROM public.create_store_purchase_intent(
    :review_goal_id, 'APPLE', 'haenael.cheer.clover.10', 10, 'review-request-0001'
  )),
  true,
  'AP-RV-04 같은 intent 요청은 순차 재전송에서 멱등 재생된다'
);
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
CREATE TEMP TABLE review_credit AS
SELECT * FROM public.credit_store_purchase(
  :'review_intent_intent_id', '00000000-0000-0000-0000-000000000081', :'review_intent_account_binding',
  'APPLE', 'review-apple-transaction-0001', 'SANDBOX', 'haenael.cheer.clover.10',
  'KRW', 12000, 10, '리뷰 수정', false, 'review-request-0001', now(), NULL
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000082', true);
SELECT is(
  (SELECT count(*)::integer FROM public.store_purchase WHERE provider_transaction_id='review-apple-transaction-0001'),
  0,
  'AP-RV-05 목표 소유자는 응원자의 원시 구매 행을 조회하지 못한다'
);
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT is((SELECT clover_recovered FROM public.reverse_store_purchase(
  'APPLE', 'review-apple-transaction-0001', 'review-refund-event-0001', repeat('b',64),
  'review-refund-transaction-0001', 1200, NULL, 'KRW', 'PARTIAL', now()
)), 1, 'RF-RV-01 10퍼센트 부분환불은 10클로버 중 1클로버만 회수한다');
SELECT is(
  (SELECT refunded_clover_amount FROM public.store_purchase WHERE provider_transaction_id='review-apple-transaction-0001'),
  1,
  'RF-RV-02 부분환불 누적 클로버는 비례 수량이다'
);
SELECT is(
  (SELECT status FROM public.store_purchase WHERE provider_transaction_id='review-apple-transaction-0001'),
  'PARTIALLY_REFUNDED',
  'RF-RV-03 부분환불은 전액환불 상태가 되지 않는다'
);
SELECT throws_ok(
  $$SELECT * FROM public.reverse_store_purchase(
    'APPLE', 'review-apple-transaction-0001', 'review-refund-event-scope-0001', repeat('c',64),
    'review-refund-transaction-scope-0001', 1200, NULL, 'KRW', 'FULL', now()
  )$$,
  '22023',
  'refund_scope_mismatch',
  'RF-RV-04 부분 금액을 FULL scope로 제출하면 거절한다'
);

UPDATE public.clover_balance SET clover_count = 0
WHERE member_id = '00000000-0000-0000-0000-000000000082';
SELECT is((SELECT clover_shortfall FROM public.reverse_store_purchase(
  'APPLE', 'review-apple-transaction-0001', 'review-refund-event-0002', repeat('d',64),
  'review-refund-transaction-0002', 1200, NULL, 'KRW', 'PARTIAL', now() - interval '2 days'
)), 1, 'RF-RV-05 잔액 부족이면 비례 회수 부족분을 회수 큐에 남긴다');
SELECT is(
  (SELECT refunded_amount_minor FROM public.store_purchase WHERE provider_transaction_id='review-apple-transaction-0001'),
  2400,
  'RF-RV-06 발생 시각이 역순이어도 서로 다른 이벤트의 누적 금액은 보존한다'
);
SELECT is((SELECT is_replay FROM public.reverse_store_purchase(
  'APPLE', 'review-apple-transaction-0001', 'review-refund-event-0002', repeat('d',64),
  'review-refund-transaction-0002', 1200, NULL, 'KRW', 'PARTIAL', now() - interval '2 days'
)), true, 'RF-RV-07 같은 환불 이벤트 재전송은 멱등 재생된다');
SELECT is(
  (SELECT count(*)::integer FROM public.store_purchase_event WHERE provider_event_id='review-refund-event-0002'),
  1,
  'RF-RV-08 환불 이벤트 재전송 뒤 원장 행은 1건이다'
);
SELECT throws_ok(
  $$SELECT * FROM public.reverse_store_purchase(
    'GOOGLE_PLAY', 'review-apple-transaction-0001', 'review-refund-event-provider-0001', repeat('e',64)
  )$$,
  'P0002',
  'purchase_not_found',
  'RF-RV-09 공급자가 다른 거래 ID는 원 구매에 결합되지 않는다'
);
SELECT is(
  (SELECT clover_shortfall FROM public.store_recovery_case
   WHERE purchase_id=(SELECT id FROM public.store_purchase WHERE provider_transaction_id='review-apple-transaction-0001')),
  1,
  'RF-RV-10 회수 큐에는 실제 부족 수량만 기록한다'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
