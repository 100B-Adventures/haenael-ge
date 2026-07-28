-- =============================================================================
-- cashout_manual.test.sql — 회장 수동 지급 환전 (pgTAP)
-- 검증: 최소 미달·잔액 초과·3.3%·암호화·멱등·RLS·PAID 이중전이·REJECT 복원
-- =============================================================================

BEGIN;

SELECT plan(20);

INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_anonymous
)
VALUES
  (
    'ca500000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'cashout-a@test.local',
    '', now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
  ),
  (
    'ca500000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'cashout-b@test.local',
    '', now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
  ),
  (
    'ca500000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'cashout-admin@test.local',
    '', now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
  );

INSERT INTO public.member (id, nickname, kyc_status)
VALUES
  ('ca500000-0000-0000-0000-000000000001', '환전A', 'NONE'),
  ('ca500000-0000-0000-0000-000000000002', '환전B', 'NONE'),
  ('ca500000-0000-0000-0000-000000000003', '환전관리자', 'NONE');

INSERT INTO public.admin_member(member_id)
VALUES ('ca500000-0000-0000-0000-000000000003');

INSERT INTO public.clover_ledger (
  member_id, entry_type, clover_delta, ref_type, ref_id, balance_after
)
VALUES
  ('ca500000-0000-0000-0000-000000000001', 'EARN', 50, 'test', 1, 50),
  ('ca500000-0000-0000-0000-000000000002', 'EARN', 40, 'test', 2, 40);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ca500000-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$SELECT * FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000001', 30, 'KB', repeat('1', 12),
    '환전A', 'cashout-auth-denied', repeat('k', 40)
  )$$,
  '42501',
  NULL,
  'C1: authenticated는 service_role 전용 환전 신청 RPC를 직접 호출할 수 없음'
);

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT throws_ok(
  $$SELECT * FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000001', 29, 'KB', repeat('1', 12),
    '환전A', 'cashout-below-min', repeat('k', 40)
  )$$,
  '22023',
  NULL,
  'C2: 최소 30클로버 미달은 거부'
);

SELECT is(
  (SELECT count(*)::integer FROM public.cashout_request
   WHERE request_key = 'cashout-below-min'),
  0,
  'C3: 최소 미달 거부는 cashout_request/HOLD를 남기지 않음'
);

SELECT throws_ok(
  $$SELECT * FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000001', 60, 'KB', repeat('1', 12),
    '환전A', 'cashout-over-balance', repeat('k', 40)
  )$$,
  '22023',
  NULL,
  'C4: 보유 지급가능 잔액을 초과한 요청은 거부'
);

SELECT is(
  (SELECT status::text FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000001', 30, 'KB', repeat('1', 12),
    '환전A', 'cashout-request-a', repeat('k', 40)
  )),
  'REQUESTED',
  'C5: 정확히 30클로버 요청은 REQUESTED로 생성'
);

SELECT is(
  (
    SELECT (gross_krw, fee_krw, withholding_krw, net_krw)
    FROM public.cashout_request
    WHERE request_key = 'cashout-request-a'
  ),
  (30000, 0, 990, 29010),
  'C6: 30,000원 → 수수료 0원·원천징수 990원·실지급 29,010원'
);

SELECT ok(
  (
    SELECT position(repeat('1', 12) IN encode(account_no_enc, 'escape')) = 0
    FROM public.cashout_request
    WHERE request_key = 'cashout-request-a'
  ),
  'C7: account_no_enc에는 계좌번호 평문이 남지 않음'
);

SELECT is(
  (SELECT clover_count FROM public.clover_balance
   WHERE member_id = 'ca500000-0000-0000-0000-000000000001'),
  20,
  'C8: 신청과 같은 트랜잭션에서 30클로버 HOLD 후 잔액 20'
);

SELECT is(
  (SELECT count(*)::integer FROM public.clover_ledger
   WHERE entry_type = 'CASHOUT_HOLD'
     AND ref_id = (
       SELECT id FROM public.cashout_request WHERE request_key = 'cashout-request-a'
     )),
  1,
  'C9: 환전 요청당 CASHOUT_HOLD는 1건'
);

SELECT is(
  (SELECT is_replay FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000001', 30, 'KB', repeat('1', 12),
    '환전A', 'cashout-request-a', repeat('k', 40)
  )),
  true,
  'C10: 동일 request_key+fingerprint 재시도는 기존 요청 재생'
);

SELECT is(
  (SELECT count(*)::integer FROM public.cashout_request
   WHERE request_key = 'cashout-request-a'),
  1,
  'C11: 멱등 재시도 후 요청 행은 1건'
);

SELECT throws_ok(
  $$SELECT * FROM public.create_cashout_request(
    'ca500000-0000-0000-0000-000000000001', 31, 'KB', repeat('1', 12),
    '환전A', 'cashout-request-a', repeat('k', 40)
  )$$,
  '22023',
  NULL,
  'C12: 동일 request_key를 다른 금액에 재사용하면 conflict'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ca500000-0000-0000-0000-000000000002","iss":"supabase-demo"}',
  true
);

SELECT is(
  (SELECT count(*)::integer FROM public.cashout_request
   WHERE member_id = 'ca500000-0000-0000-0000-000000000001'),
  0,
  'C13: RLS는 다른 회원의 환전 요청 조회를 차단'
);

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT is(
  (
    SELECT account_no
    FROM public.admin_list_cashouts_secure(
      'ca500000-0000-0000-0000-000000000003',
      repeat('k', 40),
      100
    )
    WHERE id = (
      SELECT id FROM public.cashout_request WHERE request_key = 'cashout-request-a'
    )
  ),
  repeat('1', 12),
  'C14: allowlist 관리자 secure RPC만 계좌번호 복호화 가능'
);

SELECT is(
  (
    SELECT status::text
    FROM public.admin_mark_cashout_paid(
      (SELECT id FROM public.cashout_request WHERE request_key = 'cashout-request-a'),
      'ca500000-0000-0000-0000-000000000003',
      '테스트 송금 완료'
    )
  ),
  'PAID',
  'C15: 관리자는 REQUESTED를 PAID로 전이'
);

SELECT is(
  (SELECT count(*)::integer FROM public.clover_ledger
   WHERE entry_type = 'CASHOUT_SETTLED'
     AND ref_id = (
       SELECT id FROM public.cashout_request WHERE request_key = 'cashout-request-a'
     )),
  1,
  'C16: PAID 전이는 CASHOUT_SETTLED 감사 원장을 정확히 1건 남김'
);

SELECT throws_ok(
  $$SELECT * FROM public.admin_mark_cashout_paid(
    (SELECT id FROM public.cashout_request WHERE request_key = 'cashout-request-a'),
    'ca500000-0000-0000-0000-000000000003',
    '중복 지급 시도'
  )$$,
  '23505',
  NULL,
  'C17: 동일 요청 PAID 재진입은 차단'
);

SELECT * FROM public.create_cashout_request(
  'ca500000-0000-0000-0000-000000000002', 30, 'SHINHAN', repeat('2', 12),
  '환전B', 'cashout-request-b', repeat('k', 40)
);

SELECT is(
  (
    SELECT status::text
    FROM public.admin_reject_cashout(
      (SELECT id FROM public.cashout_request WHERE request_key = 'cashout-request-b'),
      'ca500000-0000-0000-0000-000000000003',
      '테스트 반려'
    )
  ),
  'REJECTED',
  'C18: 관리자는 REQUESTED를 REJECTED로 전이'
);

SELECT is(
  (SELECT clover_count FROM public.clover_balance
   WHERE member_id = 'ca500000-0000-0000-0000-000000000002'),
  40,
  'C19: 반려 시 CASHOUT_REVERSAL로 보류 클로버 전액 복원'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"ca500000-0000-0000-0000-000000000003","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$SELECT * FROM public.admin_mark_cashout_paid(
    1, 'ca500000-0000-0000-0000-000000000003', '직접호출'
  )$$,
  '42501',
  NULL,
  'C20: allowlist 회원이어도 authenticated 클라이언트는 상태전이 RPC 직접 호출 불가'
);

SELECT * FROM finish();

ROLLBACK;
