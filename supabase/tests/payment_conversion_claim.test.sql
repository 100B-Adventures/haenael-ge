BEGIN;

SELECT plan(18);

SELECT has_function('public', 'lease_payment_conversion', ARRAY['text', 'text', 'integer'],
  'PAY-CONV-01: 브라우저 전환 delivery lease RPC가 존재한다');
SELECT has_function('public', 'ack_payment_conversion', ARRAY['text', 'text', 'text', 'text'],
  'PAY-CONV-02: provider enqueue ack RPC가 존재한다');

INSERT INTO public.payment(
  order_id, payment_key, amount_krw, status, pg_customer_key, raw_response
) VALUES (
  'payment-conversion-lease-1', 'payment_key_conversion_lease_1', 3000, 'DONE',
  'customer-conversion-lease-1', '{"source":"toss-webhook","status":"DONE"}'::jsonb
);

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT * FROM public.lease_payment_conversion(
      'payment-conversion-lease-1', 'payment_key_conversion_lease_1', 300
    )$$,
  '42501', NULL,
  'PAY-CONV-NEG-01: authenticated는 lease RPC를 호출할 수 없다'
);
SELECT throws_ok(
  $$SELECT public.ack_payment_conversion(
      'payment-conversion-lease-1', 'payment_key_conversion_lease_1', 'lease', 'event'
    )$$,
  '42501', NULL,
  'PAY-CONV-NEG-02: authenticated는 ack RPC를 호출할 수 없다'
);

RESET ROLE;
SET LOCAL ROLE service_role;

CREATE TEMP TABLE first_lease AS
SELECT * FROM public.lease_payment_conversion(
  'payment-conversion-lease-1', 'payment_key_conversion_lease_1', 300
);

SELECT is((SELECT eligible FROM first_lease), true,
  'PAY-CONV-03: 웹훅 선확정 뒤 첫 브라우저 callback은 lease를 받는다');
SELECT is((SELECT delivery_state FROM first_lease), 'pending',
  'PAY-CONV-04: provider enqueue 전 상태는 pending이다');
SELECT is((SELECT event_id FROM first_lease), 'haenael-purchase:payment-conversion-lease-1',
  'PAY-CONV-05: provider dedupe event id가 발급된다');
SELECT ok((SELECT lease_token IS NOT NULL AND expires_at > clock_timestamp() FROM first_lease),
  'PAY-CONV-06: lease token과 미래 만료시각이 발급된다');

SELECT is(
  (SELECT eligible FROM public.lease_payment_conversion(
    'payment-conversion-lease-1', 'payment_key_conversion_lease_1', 300
  )), false,
  'PAY-CONV-NEG-03: 활성 lease 중복 발급은 차단한다'
);
SELECT throws_ok(
  $$SELECT * FROM public.lease_payment_conversion(
      'payment-conversion-lease-1', 'different_payment_key', 300
    )$$,
  '22023', 'payment_key_mismatch',
  'PAY-CONV-NEG-04: 다른 payment key는 거부한다'
);

UPDATE public.payment
SET raw_response = jsonb_set(
  raw_response, '{browserConversionDelivery,leaseExpiresAt}',
  to_jsonb((clock_timestamp() - interval '1 second')::text)
)
WHERE order_id = 'payment-conversion-lease-1';

CREATE TEMP TABLE retry_lease AS
SELECT * FROM public.lease_payment_conversion(
  'payment-conversion-lease-1', 'payment_key_conversion_lease_1', 300
);

SELECT is((SELECT eligible FROM retry_lease), true,
  'PAY-CONV-07: 만료된 pending은 재시도 lease를 받는다');
SELECT is((SELECT event_id FROM retry_lease), (SELECT event_id FROM first_lease),
  'PAY-CONV-08: 재시도에도 provider dedupe event id는 고정된다');
SELECT isnt((SELECT lease_token FROM retry_lease), (SELECT lease_token FROM first_lease),
  'PAY-CONV-09: 재시도 lease token은 새로 발급된다');
SELECT is(
  public.ack_payment_conversion(
    'payment-conversion-lease-1', 'payment_key_conversion_lease_1',
    (SELECT lease_token FROM first_lease), (SELECT event_id FROM first_lease)
  ), false,
  'PAY-CONV-NEG-05: 교체된 이전 lease는 ack할 수 없다'
);
SELECT is(
  public.ack_payment_conversion(
    'payment-conversion-lease-1', 'payment_key_conversion_lease_1',
    (SELECT lease_token FROM retry_lease), (SELECT event_id FROM retry_lease)
  ), true,
  'PAY-CONV-10: 현재 lease의 provider enqueue ack는 sent로 전환한다'
);
SELECT is(
  (SELECT raw_response #>> '{browserConversionDelivery,state}'
   FROM public.payment WHERE order_id = 'payment-conversion-lease-1'), 'sent',
  'PAY-CONV-11: sent 상태가 결제 행에 durable하게 남는다'
);
SELECT is(
  (SELECT eligible FROM public.lease_payment_conversion(
    'payment-conversion-lease-1', 'payment_key_conversion_lease_1', 300
  )), false,
  'PAY-CONV-NEG-06: sent 이후에는 새 lease와 중복 전송을 차단한다'
);

UPDATE public.payment SET status = 'READY', raw_response = '{}'::jsonb
WHERE order_id = 'payment-conversion-lease-1';
SELECT throws_ok(
  $$SELECT * FROM public.lease_payment_conversion(
      'payment-conversion-lease-1', 'payment_key_conversion_lease_1', 300
    )$$,
  '22023', 'invalid_payment_status',
  'PAY-CONV-NEG-07: DONE이 아닌 결제는 lease를 받을 수 없다'
);

SELECT * FROM finish();
ROLLBACK;
