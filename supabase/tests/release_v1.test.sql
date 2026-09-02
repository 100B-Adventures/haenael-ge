BEGIN;

SELECT plan(38);

SELECT has_table('public', 'lead', 'lead table exists');

SET LOCAL ROLE anon;
SELECT throws_ok(
  $$INSERT INTO public.lead(email, consented_at) VALUES ('anon@example.com', now())$$,
  '42501',
  'permission denied for table lead',
  'anon cannot insert leads directly'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT * FROM public.lead$$,
  '42501',
  'permission denied for table lead',
  'authenticated users cannot read leads'
);
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$INSERT INTO public.lead(email, consented_at, source) VALUES ('launch@example.com', now(), 'pgtap')$$,
  'service role can store a lead'
);
RESET ROLE;

SELECT is((SELECT count(*)::integer FROM lead WHERE email = 'launch@example.com'), 1, 'lead row was stored');

SELECT has_function('public', 'capture_lead', ARRAY['text','text','timestamptz','text','text','text','text','text','text','text'], 'lead capture RPC exists');
SELECT lives_ok(
  $$SELECT * FROM capture_lead('rate-1@example.com', NULL, now(), 'test', NULL, NULL, NULL, NULL, '/', 'rate-hash')$$,
  'first lead from a submitter is accepted'
);
SELECT lives_ok(
  $$SELECT * FROM capture_lead('rate-2@example.com', NULL, now(), 'test', NULL, NULL, NULL, NULL, '/', 'rate-hash');
    SELECT * FROM capture_lead('rate-3@example.com', NULL, now(), 'test', NULL, NULL, NULL, NULL, '/', 'rate-hash');
    SELECT * FROM capture_lead('rate-4@example.com', NULL, now(), 'test', NULL, NULL, NULL, NULL, '/', 'rate-hash');
    SELECT * FROM capture_lead('rate-5@example.com', NULL, now(), 'test', NULL, NULL, NULL, NULL, '/', 'rate-hash')$$,
  'five leads per hour are accepted'
);
SELECT throws_ok(
  $$SELECT * FROM capture_lead('rate-6@example.com', NULL, now(), 'test', NULL, NULL, NULL, NULL, '/', 'rate-hash')$$,
  'P0001', 'lead_rate_limited', 'sixth lead in one hour is rejected'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, raw_app_meta_data,
  raw_user_meta_data, is_super_admin, is_anonymous
) VALUES (
  'dddddddd-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'refund@test.local', '', now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
);
INSERT INTO member(id, nickname) VALUES ('dddddddd-0000-0000-0000-000000000004', '환불테스트');
INSERT INTO goal(id, member_id, slug, title, due_date)
  OVERRIDING SYSTEM VALUE VALUES (900001, 'dddddddd-0000-0000-0000-000000000004', 'refund-test', '환불 목표', current_date + 7);
INSERT INTO payment(id, order_id, payment_key, amount_krw, status, pg_customer_key)
  OVERRIDING SYSTEM VALUE VALUES (900001, 'hnl_refund_test_000001', 'payment_refund_test_000001', 1000, 'DONE', 'refund_customer');
INSERT INTO cheer(id, goal_id, payment_id, clover_amount, status)
  OVERRIDING SYSTEM VALUE VALUES (900001, 900001, 900001, 1000, 'CONFIRMED');
-- 웰컴 클로버 성장훅(2026-07-18) 트리거가 위 goal(900001) INSERT에서 자동 발동해
-- 웰컴 cheer/ledger/balance를 만들었다 — 이 픽스처는 잔액을 직접 세팅하므로 걷어낸다.
DELETE FROM clover_ledger WHERE entry_type = 'WELCOME_GRANT' AND member_id = 'dddddddd-0000-0000-0000-000000000004';
DELETE FROM cheer WHERE is_welcome = true AND goal_id = 900001;
DELETE FROM clover_balance WHERE member_id = 'dddddddd-0000-0000-0000-000000000004';
INSERT INTO clover_balance(member_id, clover_count) VALUES ('dddddddd-0000-0000-0000-000000000004', 1000);
INSERT INTO clover_ledger(member_id, entry_type, clover_delta, ref_type, ref_id, balance_after)
  VALUES ('dddddddd-0000-0000-0000-000000000004', 'EARN', 1000, 'cheer', 900001, 1000);

SELECT has_function('public', 'reconcile_canceled_payment', ARRAY['text', 'text', 'integer', 'jsonb'], 'refund reconciliation RPC exists');
SELECT lives_ok(
  $$SELECT * FROM reconcile_canceled_payment('hnl_refund_test_000001', 'payment_refund_test_000001', 1000, '{"test":true}'::jsonb)$$,
  'DONE payment cancellation reconciles'
);
SELECT is((SELECT status::text FROM payment WHERE id = 900001), 'CANCELED', 'payment becomes CANCELED');
SELECT is((SELECT status::text FROM cheer WHERE id = 900001), 'REFUNDED', 'cheer becomes REFUNDED');
SELECT is((SELECT clover_count FROM clover_balance WHERE member_id = 'dddddddd-0000-0000-0000-000000000004'), 0, 'clover balance is reversed');
SELECT is((SELECT count(*)::integer FROM clover_ledger WHERE ref_id = 900001 AND entry_type = 'REFUND_REVERSAL'), 1, 'one refund ledger entry is appended');

SELECT lives_ok(
  $$SELECT * FROM reconcile_canceled_payment('hnl_refund_test_000001', 'payment_refund_test_000001', 1000, '{"retry":true}'::jsonb)$$,
  'duplicate cancellation webhook is idempotent'
);
SELECT is((SELECT count(*)::integer FROM clover_ledger WHERE ref_id = 900001 AND entry_type = 'REFUND_REVERSAL'), 1, 'retry does not append another reversal');

INSERT INTO payment(id, order_id, payment_key, amount_krw, status, pg_customer_key)
  OVERRIDING SYSTEM VALUE VALUES (900002, 'hnl_partial_test_000001', 'payment_partial_test_000001', 2000, 'DONE', 'partial_customer');
INSERT INTO cheer(id, goal_id, payment_id, clover_amount, status)
  OVERRIDING SYSTEM VALUE VALUES (900002, 900001, 900002, 2000, 'CONFIRMED');

SELECT has_function('public', 'record_partial_cancel_review', ARRAY['text','text','integer','jsonb'], 'partial cancellation review RPC exists');
SELECT is(
  (SELECT record_partial_cancel_review('hnl_partial_test_000001', 'payment_partial_test_000001', 2000, '{"test":true}'::jsonb)),
  false, 'first partial cancellation creates a review marker'
);
SELECT ok((SELECT partial_cancel_reviewed_at IS NOT NULL FROM payment WHERE id = 900002), 'payment has durable partial cancellation marker');
SELECT is((SELECT count(*)::integer FROM risk_event WHERE type = 'PARTIAL_CANCEL_REVIEW_REQUIRED' AND detail->>'orderId' = 'hnl_partial_test_000001'), 1, 'one partial cancellation risk event is appended');
SELECT is(
  (SELECT record_partial_cancel_review('hnl_partial_test_000001', 'payment_partial_test_000001', 2000, '{"retry":true}'::jsonb)),
  true, 'duplicate partial cancellation is recognized'
);
SELECT is((SELECT count(*)::integer FROM risk_event WHERE type = 'PARTIAL_CANCEL_REVIEW_REQUIRED' AND detail->>'orderId' = 'hnl_partial_test_000001'), 1, 'retry does not append another risk event');

-- =============================================================================
-- release_v1_hardening_fix (20260716120000) 회귀 — Codex 2nd-pass REJECT 4건
-- =============================================================================

-- --- #1: p_payment_key NULL 우회 방지 (payment_key_mismatch, IS DISTINCT FROM) ---
INSERT INTO payment(id, order_id, payment_key, amount_krw, status, pg_customer_key)
  OVERRIDING SYSTEM VALUE VALUES (900003, 'hnl_nullkey_test_000001', 'payment_nullkey_test_000001', 1500, 'DONE', 'nullkey_customer');
INSERT INTO cheer(id, goal_id, payment_id, clover_amount, status)
  OVERRIDING SYSTEM VALUE VALUES (900003, 900001, 900003, 1500, 'CONFIRMED');

SELECT throws_ok(
  $$SELECT * FROM reconcile_canceled_payment('hnl_nullkey_test_000001', NULL, 1500, '{"test":true}'::jsonb)$$,
  '22023', 'payment_key_mismatch',
  'NULL p_payment_key against a non-null stored payment_key is rejected (fixes AND-with-NULL bypass)'
);

-- --- #2: 잔액부족 → durable risk marker로 수렴(예외 없이 커밋) + 재시도 멱등 ---
SELECT has_column('public', 'payment', 'cancel_reconcile_required_at', 'payment has durable cancel-reconcile-required marker column');

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, raw_app_meta_data,
  raw_user_meta_data, is_super_admin, is_anonymous
) VALUES (
  'dddddddd-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'balance-insufficient@test.local', '', now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
);
INSERT INTO member(id, nickname) VALUES ('dddddddd-0000-0000-0000-000000000005', '잔액부족테스트');
INSERT INTO goal(id, member_id, slug, title, due_date)
  OVERRIDING SYSTEM VALUE VALUES (900004, 'dddddddd-0000-0000-0000-000000000005', 'balance-insufficient-test', '잔액부족 목표', current_date + 7);
INSERT INTO payment(id, order_id, payment_key, amount_krw, status, pg_customer_key)
  OVERRIDING SYSTEM VALUE VALUES (900004, 'hnl_balance_test_000001', 'payment_balance_test_000001', 5000, 'DONE', 'balance_customer');
INSERT INTO cheer(id, goal_id, payment_id, clover_amount, status)
  OVERRIDING SYSTEM VALUE VALUES (900004, 900004, 900004, 5000, 'CONFIRMED');
-- 웰컴 클로버 성장훅(2026-07-18) 트리거가 위 goal(900004) INSERT에서 자동 발동했다 — 걷어낸다.
DELETE FROM clover_ledger WHERE entry_type = 'WELCOME_GRANT' AND member_id = 'dddddddd-0000-0000-0000-000000000005';
DELETE FROM cheer WHERE is_welcome = true AND goal_id = 900004;
DELETE FROM clover_balance WHERE member_id = 'dddddddd-0000-0000-0000-000000000005';
-- clover_amount(5000)보다 낮은 잔액을 인위로 픽스처화 — DONE 취소 시 원장 역산 불가 상황.
INSERT INTO clover_balance(member_id, clover_count) VALUES ('dddddddd-0000-0000-0000-000000000005', 100);
INSERT INTO clover_ledger(member_id, entry_type, clover_delta, ref_type, ref_id, balance_after)
  VALUES ('dddddddd-0000-0000-0000-000000000005', 'EARN', 100, 'cheer', 900004, 100);

SELECT is(
  (SELECT review_required FROM reconcile_canceled_payment('hnl_balance_test_000001', 'payment_balance_test_000001', 5000, '{"test":true}'::jsonb)),
  true, 'insufficient-balance cancellation commits without exception and reports review_required=true'
);
SELECT is((SELECT status::text FROM payment WHERE id = 900004), 'DONE', 'payment stays DONE (not force-CANCELED) when balance cannot be reversed automatically');
SELECT is((SELECT status::text FROM cheer WHERE id = 900004), 'CONFIRMED', 'cheer status is left untouched when reconciliation requires manual review');
SELECT ok((SELECT cancel_reconcile_required_at IS NOT NULL FROM payment WHERE id = 900004), 'payment has durable cancel-reconcile-required marker set');
SELECT is((SELECT count(*)::integer FROM risk_event WHERE type = 'PAYMENT_CANCEL_BALANCE_INSUFFICIENT' AND detail->>'orderId' = 'hnl_balance_test_000001'), 1, 'one balance-insufficient risk event is appended');

SELECT is(
  (SELECT review_required FROM reconcile_canceled_payment('hnl_balance_test_000001', 'payment_balance_test_000001', 5000, '{"retry":true}'::jsonb)),
  true, 'retry after marker is set still reports review_required=true'
);
SELECT is(
  (SELECT idempotent FROM reconcile_canceled_payment('hnl_balance_test_000001', 'payment_balance_test_000001', 5000, '{"retry2":true}'::jsonb)),
  true, 'retry after marker is set reports idempotent=true'
);
SELECT is((SELECT count(*)::integer FROM risk_event WHERE type = 'PAYMENT_CANCEL_BALANCE_INSUFFICIENT' AND detail->>'orderId' = 'hnl_balance_test_000001'), 1, 'retries do not append another balance-insufficient risk event (idempotent)');

-- =============================================================================
-- amount_krw_null_safe_fix (20260716130000) 회귀 — amount_mismatch NULL 우회 방지
-- =============================================================================

-- --- #5: p_amount_krw NULL 우회 방지 (amount_mismatch, IS DISTINCT FROM) ---
INSERT INTO payment(id, order_id, payment_key, amount_krw, status, pg_customer_key)
  OVERRIDING SYSTEM VALUE VALUES (900005, 'hnl_nullamount_test_000001', 'payment_nullamount_test_000001', 1800, 'DONE', 'nullamount_customer');
INSERT INTO cheer(id, goal_id, payment_id, clover_amount, status)
  OVERRIDING SYSTEM VALUE VALUES (900005, 900001, 900005, 1800, 'CONFIRMED');

SELECT throws_ok(
  $$SELECT * FROM reconcile_canceled_payment('hnl_nullamount_test_000001', 'payment_nullamount_test_000001', NULL, '{"test":true}'::jsonb)$$,
  '22023', 'amount_mismatch',
  'NULL p_amount_krw against a non-null stored amount_krw is rejected (fixes AND-with-NULL bypass)'
);

-- --- #3: capture_lead NULL/빈 submitter_hash 가드 ---
SELECT throws_ok(
  $$SELECT * FROM capture_lead('null-hash@example.com', NULL, now(), 'test', NULL, NULL, NULL, NULL, '/', NULL)$$,
  '22023', 'submitter_hash_required', 'capture_lead rejects NULL submitter_hash'
);
SELECT throws_ok(
  $$SELECT * FROM capture_lead('empty-hash@example.com', NULL, now(), 'test', NULL, NULL, NULL, NULL, '/', '')$$,
  '22023', 'submitter_hash_required', 'capture_lead rejects empty submitter_hash'
);

-- --- #4: 이메일 dedup 회귀(순차 실행 — 실제 레이스는 concurrency/lead_dedup_race.sh가 담당) ---
SELECT lives_ok(
  $$SELECT * FROM capture_lead('dup-email-seq@example.com', NULL, now(), 'test', NULL, NULL, NULL, NULL, '/', 'dup-hash-seq-1')$$,
  'first submission for a new email is accepted'
);
SELECT is(
  (SELECT is_duplicate FROM capture_lead('dup-email-seq@example.com', NULL, now(), 'test', NULL, NULL, NULL, NULL, '/', 'dup-hash-seq-2')),
  true, 'second submission with the same email (different submitter) is flagged duplicate'
);

SELECT * FROM finish();
ROLLBACK;
