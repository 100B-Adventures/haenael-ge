BEGIN;

SELECT plan(8);

SELECT has_table(
  'public', 'kakao_oauth_callback_claim',
  'KAKAO-CALLBACK-01: callback claim 테이블이 존재한다'
);
SELECT has_function(
  'public', 'claim_kakao_oauth_callback', ARRAY['text'],
  'KAKAO-CALLBACK-02: callback claim RPC가 존재한다'
);

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.claim_kakao_oauth_callback(repeat('a', 64))$$,
  '42501', NULL,
  'KAKAO-CALLBACK-NEG-01: authenticated는 claim RPC를 호출할 수 없다'
);

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT is(
  public.claim_kakao_oauth_callback(repeat('a', 64)), true,
  'KAKAO-CALLBACK-03: 첫 callback은 claim을 얻는다'
);
SELECT is(
  public.claim_kakao_oauth_callback(repeat('a', 64)), false,
  'KAKAO-CALLBACK-04: 같은 code의 두 번째 callback은 거절한다'
);
SELECT is(
  public.claim_kakao_oauth_callback(repeat('b', 64)), true,
  'KAKAO-CALLBACK-05: 다른 code는 독립적으로 claim한다'
);
SELECT throws_ok(
  $$SELECT public.claim_kakao_oauth_callback('raw-kakao-code')$$,
  '22023', 'invalid_code_hash',
  'KAKAO-CALLBACK-NEG-02: 원문 code와 잘못된 hash는 거절한다'
);
SELECT is(
  (SELECT count(*) FROM public.kakao_oauth_callback_claim), 2::bigint,
  'KAKAO-CALLBACK-06: 원문 code가 아니라 hash만 저장한다'
);

SELECT * FROM finish();
ROLLBACK;
