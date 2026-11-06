BEGIN;

SELECT plan(8);

SELECT has_function(
  'public',
  'claim_payment_conversion',
  ARRAY['text', 'text'],
  'PAY-CONV-01: 브라우저 전환 claim RPC가 존재한다'
);

INSERT INTO public.payment(
  order_id, payment_key, amount_krw, status, pg_customer_key, raw_response
) VALUES (
  'payment-conversion-claim-1',
  'payment_key_conversion_claim_1',
  3000,
  'DONE',
  'customer-conversion-claim-1',
  '{"source":"toss-webhook","status":"DONE"}'::jsonb
);

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.claim_payment_conversion(
      'payment-conversion-claim-1', 'payment_key_conversion_claim_1'
    )$$,
  '42501',
  NULL,
  'PAY-CONV-NEG-01: authenticated는 전환 claim RPC를 호출할 수 없다'
);

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT is(
  public.claim_payment_conversion(
    'payment-conversion-claim-1', 'payment_key_conversion_claim_1'
  ),
  true,
  'PAY-CONV-02: 웹훅 선확정 뒤 첫 브라우저 callback은 전환을 claim한다'
);

SELECT ok(
  (SELECT raw_response ? 'browserConversionClaimedAt'
   FROM public.payment WHERE order_id = 'payment-conversion-claim-1'),
  'PAY-CONV-03: durable claim 시각이 결제 행에 기록된다'
);

SELECT is(
  public.claim_payment_conversion(
    'payment-conversion-claim-1', 'payment_key_conversion_claim_1'
  ),
  false,
  'PAY-CONV-NEG-02: 같은 결제의 브라우저 replay는 중복 claim되지 않는다'
);

SELECT throws_ok(
  $$SELECT public.claim_payment_conversion(
      'payment-conversion-claim-1', 'different_payment_key'
    )$$,
  '22023',
  'payment_key_mismatch',
  'PAY-CONV-NEG-03: 다른 payment key는 거부한다'
);

UPDATE public.payment
SET status = 'READY', raw_response = '{}'::jsonb
WHERE order_id = 'payment-conversion-claim-1';

SELECT throws_ok(
  $$SELECT public.claim_payment_conversion(
      'payment-conversion-claim-1', 'payment_key_conversion_claim_1'
    )$$,
  '22023',
  'invalid_payment_status',
  'PAY-CONV-NEG-04: DONE이 아닌 결제는 전환을 claim할 수 없다'
);

SELECT throws_ok(
  $$SELECT public.claim_payment_conversion(
      'missing-payment-conversion', 'missing_payment_key'
    )$$,
  'P0002',
  'payment_not_found',
  'PAY-CONV-NEG-05: 없는 결제는 거부한다'
);

SELECT * FROM finish();
ROLLBACK;
