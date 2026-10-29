-- =============================================================================
-- haenael-ge: RLS 정책 실검증 (pgTAP)
-- 진실원: docs/qa/test-plan.md §7 SEC-1~4 + design-patterns §2 defense-in-depth
-- 실 Postgres 위에서 역할 전환 — mock 없음 (헌법 §3)
-- =============================================================================

BEGIN;

SELECT plan(63);

-- =========================================================================
-- 픽스처 설정 (postgres = superuser, RLS bypass)
-- =========================================================================

-- auth.users 픽스처 (Supabase auth 스키마)
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_anonymous
)
VALUES
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user_a@test.local',
    '', now(), now(),
    '', '', '', '{}'::jsonb, '{}'::jsonb,
    false, false
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user_b@test.local',
    '', now(), now(),
    '', '', '', '{}'::jsonb, '{}'::jsonb,
    false, false
  ),
  (
    'cccccccc-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user_c@test.local',
    '', now(), now(),
    '', '', '', '{}'::jsonb, '{}'::jsonb,
    false, false
  );

-- member 픽스처
INSERT INTO member (id, nickname, kyc_status)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '사용자A', 'NONE'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '사용자B', 'NONE'),
  ('cccccccc-0000-0000-0000-000000000003', '사용자C', 'NONE');

-- goal 픽스처 (slug 트리거 자동 실행)
INSERT INTO goal (member_id, slug, title, due_date, status, deleted_at)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'goal-a-live',    'A의 목표(활성)',   now()::date + 30, 'ACTIVE',  NULL),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'goal-a-deleted', 'A의 목표(삭제됨)', now()::date + 30, 'ACTIVE',  now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'goal-b-live',    'B의 목표(활성)',   now()::date + 30, 'ACTIVE',  NULL),
  ('cccccccc-0000-0000-0000-000000000003', 'goal-c-live',    'C의 목표(활성)',   now()::date + 30, 'ACTIVE',  NULL);

-- 웰컴 클로버 성장훅(2026-07-18) 트리거가 위 goal INSERT마다 자동 발동해 웰컴
-- cheer/ledger/balance를 만들었다 — 기존 픽스처는 잔액을 직접 세팅하므로 그 부산물을
-- 걷어내고 원래 의도(클린 슬레이트)로 되돌린다. 웰컴 훅 자체는
-- supabase/tests/welcome_clover.test.sql이 전담 검증한다.
DELETE FROM clover_ledger WHERE entry_type = 'WELCOME_GRANT';
DELETE FROM cheer WHERE is_welcome = true;
DELETE FROM clover_balance;

-- clover_balance 픽스처 (원장 트리거 없이 직접 삽입)
INSERT INTO clover_balance (member_id, clover_count)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 150),
  ('bbbbbbbb-0000-0000-0000-000000000002', 300);

-- cashout_request 픽스처
INSERT INTO cashout_request (
  member_id, clover_amount, gross_krw, fee_krw, withholding_krw, net_krw, status
)
VALUES
  ('bbbbbbbb-0000-0000-0000-000000000002', 100, 10000, 500, 330, 9170, 'REQUESTED');

-- =========================================================================
-- SEC-2: goal_public 뷰에 금액/클로버 컬럼 부재 확인 (금액 3층 a)
-- =========================================================================

SELECT hasnt_column(
  'public', 'goal_public', 'amount_krw',
  'SEC-2: goal_public에 amount_krw 컬럼 없음'
);

SELECT hasnt_column(
  'public', 'goal_public', 'clover_count',
  'SEC-2: goal_public에 clover_count 컬럼 없음'
);

SELECT hasnt_column(
  'public', 'goal_public', 'gross_krw',
  'SEC-2: goal_public에 gross_krw 컬럼 없음'
);

SELECT hasnt_column(
  'public', 'goal_public', 'fee_krw',
  'SEC-2: goal_public에 fee_krw 컬럼 없음'
);

SELECT hasnt_column(
  'public', 'goal_public', 'net_krw',
  'SEC-2: goal_public에 net_krw 컬럼 없음'
);

-- goal_public에 cheer_count 컬럼 있어야 함
SELECT has_column(
  'public', 'goal_public', 'cheer_count',
  'SEC-2: goal_public에 cheer_count 컬럼 있음'
);

-- =========================================================================
-- Soft-delete: deleted 목표는 goal_public에서 제외
-- =========================================================================

SELECT is(
  (SELECT count(*)::integer FROM goal_public WHERE slug = 'goal-a-deleted'),
  0,
  'Soft-delete: deleted_at 있는 목표는 goal_public에서 제외됨'
);

-- 활성 목표는 goal_public에서 보임
SELECT is(
  (SELECT count(*)::integer FROM goal_public WHERE slug = 'goal-a-live'),
  1,
  'Soft-delete: 활성 목표는 goal_public에서 조회됨'
);

-- =========================================================================
-- SEC-3a: anon은 payment에 INSERT 불가
-- =========================================================================

SET LOCAL ROLE anon;

SELECT throws_ok(
  $$INSERT INTO payment (order_id, amount_krw, status, pg_customer_key)
    VALUES ('anon-test-order', 5000, 'READY', 'ANONYMOUS')$$,
  '42501',
  NULL,
  'SEC-3a: anon은 payment에 INSERT 불가'
);

RESET ROLE;

-- =========================================================================
-- SEC-3b: authenticated는 clover_ledger에 INSERT 불가
-- =========================================================================

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$INSERT INTO clover_ledger (member_id, entry_type, clover_delta, balance_after)
    VALUES (
      'aaaaaaaa-0000-0000-0000-000000000001',
      'EARN', 10, 160
    )$$,
  '42501',
  NULL,
  'SEC-3b: authenticated는 clover_ledger에 INSERT 불가 (service_role EF만)'
);

RESET ROLE;

-- =========================================================================
-- SEC-3c: authenticated는 payment에 INSERT 불가
-- =========================================================================

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$INSERT INTO payment (order_id, amount_krw, status, pg_customer_key)
    VALUES ('auth-test-order', 5000, 'READY', 'ANONYMOUS')$$,
  '42501',
  NULL,
  'SEC-3c: authenticated는 payment에 INSERT 불가 (service_role EF만)'
);

RESET ROLE;

-- =========================================================================
-- SEC-3d: 결제 RPC는 service_role Edge Function 전용
-- =========================================================================

SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM create_cheer_order(
    (SELECT id FROM goal WHERE slug = 'goal-a-live' LIMIT 1),
    'hnl_anon_rpc_blocked',
    3000,
    3,
    'anon',
    true,
    'blocked',
    'anonymous_test'
  )$$,
  '42501',
  NULL,
  'SEC-3d: anon은 create_cheer_order RPC 직접 실행 불가'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$SELECT * FROM confirm_cheer_payment(
    'hnl_auth_rpc_blocked',
    'payment_key_blocked',
    3000,
    'CARD',
    now(),
    NULL,
    '{}'::jsonb
  )$$,
  '42501',
  NULL,
  'SEC-3d: authenticated는 confirm_cheer_payment RPC 직접 실행 불가'
);

RESET ROLE;

-- =========================================================================
-- SEC-3e: authenticated는 payment 직접 SELECT 불가 (영수증은 EF/뷰로만)
-- =========================================================================

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$SELECT * FROM payment$$,
  '42501',
  NULL,
  'SEC-3e: authenticated는 payment raw row SELECT 불가'
);

RESET ROLE;

-- =========================================================================
-- SEC-4a: 사용자A는 사용자B의 clover_balance 조회 불가 (0행 반환)
-- =========================================================================

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT is(
  (SELECT count(*)::integer
   FROM clover_balance
   WHERE member_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0,
  'SEC-4a: 사용자A는 사용자B의 clover_balance 조회 불가'
);

-- 사용자A는 자신의 clover_balance 조회 가능
SELECT is(
  (SELECT count(*)::integer
   FROM clover_balance
   WHERE member_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'SEC-4a: 사용자A는 자신의 clover_balance 조회 가능'
);

RESET ROLE;

-- =========================================================================
-- SEC-4b: 사용자A는 사용자B의 cashout_request 조회 불가
-- =========================================================================

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT is(
  (SELECT count(*)::integer
   FROM cashout_request
   WHERE member_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0,
  'SEC-4b: 사용자A는 사용자B의 cashout_request 조회 불가'
);

RESET ROLE;

-- =========================================================================
-- SEC-4c: 사용자A는 사용자B의 goal 조회 불가 (직접 테이블 — goal_public X)
-- =========================================================================

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT is(
  (SELECT count(*)::integer
   FROM goal
   WHERE member_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0,
  'SEC-4c: 사용자A는 사용자B의 goal 직접 테이블 조회 불가'
);

-- 사용자A는 자신의 goal 조회 가능
SELECT is(
  (SELECT count(*)::integer
   FROM goal
   WHERE member_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'SEC-4c: 사용자A는 자신의 활성 goal 조회 가능 (deleted=1건 제외)'
);

RESET ROLE;

-- =========================================================================
-- SEC-1: anon은 clover_balance SELECT 불가 (권한 없음)
-- =========================================================================

SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM clover_balance$$,
  '42501',
  NULL,
  'SEC-1: anon은 clover_balance SELECT 불가'
);

SELECT throws_ok(
  $$SELECT * FROM cashout_request$$,
  '42501',
  NULL,
  'SEC-1: anon은 cashout_request SELECT 불가'
);

RESET ROLE;

-- =========================================================================
-- goal_public: anon이 활성 목표 조회 가능 (금액 없이)
-- =========================================================================

SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::integer FROM goal_public WHERE slug = 'goal-a-live'),
  1,
  'goal_public: anon이 활성 목표 조회 가능'
);

RESET ROLE;

-- =========================================================================
-- SEC-5: cheer.clover_amount 개별 금액은 소유자만 (High 유출 차단, 결정 B)
-- 근거: docs/design/design-cheer-amount-privacy-v0.1.0.md §3/§4,
--       migration 20260719000000_cheer_amount_privacy.sql
-- =========================================================================

-- 픽스처: A 목표에 CONFIRMED 응원 1건 (payment FK 선행, service_role=postgres로 직접 삽입)
INSERT INTO payment (order_id, amount_krw, status, method, pg_customer_key)
VALUES ('hnl_sec5_pay', 5000, 'DONE', 'CARD', 'ANONYMOUS');

INSERT INTO cheer (goal_id, supporter_ci, display_name, is_anonymous,
                   message, clover_amount, payment_id, status)
SELECT
  (SELECT id FROM goal WHERE slug = 'goal-a-live'),
  'ci_supporter_secret', '응원친구', false,
  '넌 할 수 있어', 5,
  (SELECT id FROM payment WHERE order_id = 'hnl_sec5_pay'),
  'CONFIRMED';

-- SEC-5a: anon은 cheer 테이블 직접 SELECT 불가 (grant 회수)
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT clover_amount FROM cheer$$,
  '42501',
  NULL,
  'SEC-5a: anon은 cheer 직접 SELECT 불가 (개별 금액·CI 차단)'
);
RESET ROLE;

-- SEC-5b: 사용자B(로그인, 비소유자)는 A 목표의 개별 응원 금액 조회 불가 (0행)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"bbbbbbbb-0000-0000-0000-000000000002","iss":"supabase-demo"}', true);
SELECT is(
  (SELECT count(*)::integer FROM cheer
   WHERE goal_id = (SELECT id FROM goal WHERE slug = 'goal-a-live')),
  0,
  'SEC-5b: 비소유자 authenticated는 남의 목표 개별 응원(금액) 조회 불가'
);
RESET ROLE;

-- SEC-5c: 소유자 A는 자기 목표의 개별 응원 금액 조회 가능 (기능 보존)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}', true);
-- payment_id 서브쿼리로 조인하지 않는다: 20260710042000_payment_compensation_audit.sql이
-- authenticated의 payment SELECT를 REVOKE했기 때문에(별개 하드닝, 본 마이그레이션 무관)
-- payment 서브쿼리를 authenticated로 실행하면 42501이 난다. cheer 자체 컬럼(message)으로
-- 픽스처 행을 특정해 payment 테이블 접근을 피한다.
SELECT is(
  (SELECT clover_amount FROM cheer
   WHERE goal_id = (SELECT id FROM goal WHERE slug = 'goal-a-live')
     AND message = '넌 할 수 있어'
   LIMIT 1),
  5,
  'SEC-5c: 소유자는 자기 목표 개별 응원 금액 조회 가능(본인만 노출 — 결정 B)'
);
RESET ROLE;

-- SEC-5d: 공개 뷰 cheer_public에 clover_amount·supporter_ci 컬럼 부재 (금액 3층 a 확장)
SELECT hasnt_column('public', 'cheer_public', 'clover_amount',
  'SEC-5d: cheer_public에 clover_amount 컬럼 없음');
SELECT hasnt_column('public', 'cheer_public', 'supporter_ci',
  'SEC-5d: cheer_public에 supporter_ci 컬럼 없음');

-- SEC-5e: 공개면 집계(goal_public.cheer_count)·워드맵은 정책 제거 후에도 동작 (회귀 방어)
-- 기대값 1 = 이 블록에서 삽입한 SEC-5 픽스처 1건. 웰컴 클로버 자동 cheer(goal INSERT
-- 트리거, 20260718000100_welcome_clover.sql grant_welcome_clover)는 파일 상단(§픽스처
-- 설정)에서 `DELETE FROM cheer WHERE is_welcome = true`로 이미 걷어냈고 SEC-5 이전
-- 어디서도 재생성되지 않는다 — 이전 기대값 2는 그 클린업을 반영하지 못한 오기(수정).
SET LOCAL ROLE anon;
SELECT is(
  (SELECT cheer_count FROM goal_public WHERE slug = 'goal-a-live'),
  1,
  'SEC-5e: anon은 goal_public 집계 cheer_count 정상 조회(뷰=정의자권한, 개별금액 아님)');
RESET ROLE;

-- =========================================================================
-- clover_ledger 트리거: INSERT 시 clover_balance 동기화 확인
-- (서비스롤로 직접 테스트 — 트리거 동작 검증)
-- =========================================================================

-- service_role 상당 = postgres (superuser)로 실행
INSERT INTO clover_ledger (member_id, entry_type, clover_delta, ref_type, balance_after)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'EARN', 50, 'cheer', 200);

SELECT is(
  (SELECT clover_count FROM clover_balance
   WHERE member_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  200,
  '트리거: clover_ledger INSERT 후 clover_balance 동기화됨'
);

-- =========================================================================
-- B2 테스트 결제 RPC: 주문 생성 -> 승인 -> 원장 적립 -> 멱등
-- =========================================================================

SELECT is(
  (SELECT count(*)::integer FROM create_cheer_order(
    (SELECT id FROM goal WHERE slug = 'goal-a-live' LIMIT 1),
    'hnl_test_rpc_001',
    3000,
    3,
    '응원자',
    false,
    '테스트 응원',
    'anonymous_test'
  )),
  1,
  'B2-PAY1: create_cheer_order RPC가 payment+cheer 주문을 생성함'
);

SELECT is(
  (SELECT status FROM payment WHERE order_id = 'hnl_test_rpc_001'),
  'READY'::payment_status_enum,
  'B2-PAY2: 생성된 payment는 READY 상태'
);

SELECT is(
  (SELECT status FROM cheer WHERE payment_id = (SELECT id FROM payment WHERE order_id = 'hnl_test_rpc_001')),
  'PENDING'::cheer_status_enum,
  'B2-PAY3: 생성된 cheer는 PENDING 상태'
);

SELECT is(
  (SELECT count(*)::integer FROM confirm_cheer_payment(
    'hnl_test_rpc_001',
    'payment_key_test_001',
    3000,
    'CARD',
    now(),
    'https://receipt.test',
    '{"status":"DONE"}'::jsonb
  )),
  1,
  'B2-PAY4: confirm_cheer_payment RPC가 승인 전이를 완료함'
);

SELECT is(
  (SELECT status FROM payment WHERE order_id = 'hnl_test_rpc_001'),
  'DONE'::payment_status_enum,
  'B2-PAY5: 승인 후 payment는 DONE 상태'
);

SELECT is(
  (SELECT status FROM cheer WHERE payment_id = (SELECT id FROM payment WHERE order_id = 'hnl_test_rpc_001')),
  'CONFIRMED'::cheer_status_enum,
  'B2-PAY6: 승인 후 cheer는 CONFIRMED 상태'
);

SELECT is(
  (SELECT count(*)::integer FROM clover_ledger
   WHERE ref_type = 'cheer'
     AND ref_id = (SELECT id FROM cheer WHERE payment_id = (SELECT id FROM payment WHERE order_id = 'hnl_test_rpc_001'))),
  1,
  'B2-PAY7: 승인 원장은 한 번만 적립됨'
);

SELECT is(
  (SELECT count(*)::integer FROM confirm_cheer_payment(
    'hnl_test_rpc_001',
    'payment_key_test_001',
    3000,
    'CARD',
    now(),
    'https://receipt.test',
    '{"status":"DONE","retry":true}'::jsonb
  )),
  1,
  'B2-PAY8: 이미 승인된 주문 재승인은 성공 응답으로 멱등 처리됨'
);

SELECT is(
  (SELECT count(*)::integer FROM clover_ledger
   WHERE ref_type = 'cheer'
     AND ref_id = (SELECT id FROM cheer WHERE payment_id = (SELECT id FROM payment WHERE order_id = 'hnl_test_rpc_001'))),
  1,
  'B2-PAY9: 재승인 후에도 원장 중복 적립 없음'
);

SELECT throws_ok(
  $$SELECT * FROM confirm_cheer_payment(
    'hnl_test_rpc_001',
    'payment_key_test_mismatch',
    3000,
    'CARD',
    now(),
    'https://receipt.test/mismatch',
    '{"status":"DONE","retry":true}'::jsonb
  )$$,
  '22023',
  NULL,
  'B2-PAY10: 이미 승인된 주문은 다른 payment_key로 재승인 불가'
);

SELECT is(
  (SELECT count(*)::integer FROM create_cheer_order(
    (SELECT id FROM goal WHERE slug = 'goal-a-live' LIMIT 1),
    'hnl_test_rpc_002',
    3000,
    3,
    '응원자2',
    false,
    '테스트 응원2',
    'anonymous_test_2'
  )),
  1,
  'B2-PAY11: payment_key 유니크 검증용 주문 생성'
);

SELECT throws_ok(
  $$UPDATE payment
    SET payment_key = 'payment_key_test_001'
    WHERE order_id = 'hnl_test_rpc_002'$$,
  '23505',
  NULL,
  'B2-PAY12: 같은 Toss payment_key를 다른 주문에 중복 기록할 수 없음'
);

SELECT throws_ok(
  $$SELECT * FROM confirm_cheer_payment(
    'hnl_test_rpc_001',
    'payment_key_test_001',
    5000,
    'CARD',
    now(),
    'https://receipt.test',
    '{"status":"DONE","tamperedAmount":true}'::jsonb
  )$$,
  '22023',
  'amount_mismatch',
  'B2-PAY13: successUrl amount 위변조는 DB RPC에서 거부됨'
);

SELECT lives_ok(
  $case$
  DO $$
  BEGIN
    PERFORM * FROM create_cheer_order(
      (SELECT id FROM goal WHERE slug = 'goal-c-live' LIMIT 1),
      'hnl_test_rpc_no_balance',
      3000,
      3,
      '첫응원자',
      false,
      '첫 결제',
      'anonymous_test'
    );

    PERFORM * FROM confirm_cheer_payment(
      'hnl_test_rpc_no_balance',
      'payment_key_no_balance',
      3000,
      'CARD',
      now(),
      'https://receipt.test',
      '{"status":"DONE"}'::jsonb
    );
  END $$;
  $case$,
  'B2-PAY14: 잔액 row가 없는 목표도 첫 결제 승인이 성공함'
);

SELECT is(
  (SELECT clover_count FROM clover_balance
   WHERE member_id = 'cccccccc-0000-0000-0000-000000000003'),
  3,
  'B2-PAY15: 첫 결제 후 clover_balance가 신규 생성됨'
);

SELECT is(
  (SELECT count(*)::integer FROM clover_ledger
   WHERE ref_type = 'cheer'
     AND ref_id = (SELECT id FROM cheer WHERE payment_id = (SELECT id FROM payment WHERE order_id = 'hnl_test_rpc_no_balance'))),
  1,
  'B2-PAY16: 첫 결제 원장도 한 번만 적립됨'
);

SELECT is(
  (SELECT count(*)::integer FROM create_cheer_order(
    (SELECT id FROM goal WHERE slug = 'goal-a-live' LIMIT 1),
    'hnl_test_comp_cancel',
    3000,
    3,
    '보상취소',
    false,
    '보상 테스트',
    'anonymous_comp'
  )),
  1,
  'B2-PAY17: 보상 취소 검증용 주문 생성'
);

SELECT is(
  (SELECT status FROM record_payment_compensation(
    'hnl_test_comp_cancel',
    'payment_key_comp_cancel',
    3000,
    'CANCELED',
    '{"reason":"db_reflect_failed","compensation":"toss_cancelled"}'::jsonb
  )),
  'CANCELED'::payment_status_enum,
  'B2-PAY18: Toss 취소 성공 보상은 payment CANCELED로 영구 기록됨'
);

SELECT is(
  (SELECT count(*)::integer FROM payment_log
   WHERE payment_id = (SELECT id FROM payment WHERE order_id = 'hnl_test_comp_cancel')
     AND to_status = 'CANCELED'),
  1,
  'B2-PAY19: Toss 취소 성공 보상은 payment_log에 남음'
);

SELECT is(
  (SELECT count(*)::integer FROM create_cheer_order(
    (SELECT id FROM goal WHERE slug = 'goal-a-live' LIMIT 1),
    'hnl_test_comp_failed',
    3000,
    3,
    '보상실패',
    false,
    '수동정산 테스트',
    'anonymous_comp_failed'
  )),
  1,
  'B2-PAY20: 수동정산 검증용 주문 생성'
);

SELECT is(
  (SELECT status FROM record_payment_compensation(
    'hnl_test_comp_failed',
    'payment_key_comp_failed',
    3000,
    'FAILED',
    '{"reason":"db_reflect_failed","compensation":"manual_reconcile_required"}'::jsonb
  )),
  'FAILED'::payment_status_enum,
  'B2-PAY21: Toss 취소 실패 보상은 payment FAILED로 영구 기록됨'
);

SELECT is(
  (SELECT count(*)::integer FROM risk_event
   WHERE type = 'PAYMENT_RECONCILE_REQUIRED'
     AND detail->>'paymentKey' = 'payment_key_comp_failed'),
  1,
  'B2-PAY22: Toss 취소 실패 보상은 수동 정산 risk_event를 남김'
);

SELECT is(
  (SELECT count(*)::integer FROM create_cheer_order(
    (SELECT id FROM goal WHERE slug = 'goal-a-live' LIMIT 1),
    'hnl_test_comp_2000',
    2000,
    2,
    '2천원 보상취소',
    false,
    '자유 금액 보상 테스트',
    'anonymous_comp_2000'
  )),
  1,
  'B2-PAY23: 2,000원 보상 취소 검증용 주문 생성'
);

SELECT is(
  (SELECT status FROM record_payment_compensation(
    'hnl_test_comp_2000',
    'payment_key_comp_2000',
    2000,
    'CANCELED',
    '{"source":"toss-webhook","reason":"unsupported_payment_method","paymentKey":"spoofed_key","targetStatus":"FAILED"}'::jsonb
  )),
  'CANCELED'::payment_status_enum,
  'B2-PAY24: 주문이 허용한 2,000원도 보상 취소와 감사 기록이 성공함'
);

SELECT is(
  (SELECT count(*)::integer FROM payment_log
   WHERE payment_id = (SELECT id FROM payment WHERE order_id = 'hnl_test_comp_2000')
     AND to_status = 'CANCELED'
     AND detail->>'source' = 'toss-webhook'
     AND detail->>'paymentKey' = 'payment_key_comp_2000'
     AND detail->>'targetStatus' = 'CANCELED'),
  1,
  'B2-PAY25: webhook 출처는 보존하고 시스템 결제키·상태는 호출자 detail보다 우선함'
);

SELECT is(
  (SELECT status FROM record_payment_compensation(
    'hnl_test_comp_2000',
    'payment_key_comp_2000',
    2000,
    'FAILED',
    '{"source":"toss-confirm-compensation","reason":"late_duplicate_cancel"}'::jsonb
  )),
  'CANCELED'::payment_status_enum,
  'B2-PAY26: 늦은 실패 보상은 이미 취소된 결제를 FAILED로 되돌리지 않음'
);

SELECT is(
  (SELECT count(*)::integer FROM payment_log
   WHERE payment_id = (SELECT id FROM payment WHERE order_id = 'hnl_test_comp_2000')
     AND to_status = 'FAILED'),
  0,
  'B2-PAY27: 이미 취소된 결제의 중복 보상은 거짓 FAILED 감사기록을 만들지 않음'
);

-- =========================================================================
-- 완료
-- =========================================================================

-- =========================================================================
-- 슬라이스 #10: 신고(report) RLS — INSERT 허용·SELECT 차단
-- =========================================================================

-- report INSERT: anon 가능 (report_insert_any 정책)
SET LOCAL ROLE anon;

SELECT lives_ok(
  $$INSERT INTO report (target_type, target_id, reason)
    VALUES ('GOAL', 1, 'anon 신고 테스트')$$,
  '#10-R1a: anon은 report에 INSERT 가능 (report_insert_any 정책)'
);

RESET ROLE;

-- report INSERT: authenticated 가능
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT lives_ok(
  $$INSERT INTO report (target_type, target_id, reason, reporter_ref)
    VALUES ('CHEER', 1, '인증 유저 신고 테스트', 'aaaaaaaa-0000-0000-0000-000000000001')$$,
  '#10-R1b: authenticated는 report에 INSERT 가능'
);

RESET ROLE;

-- report SELECT: anon 불가 (정책 없음 = 차단)
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT * FROM report$$,
  '42501',
  NULL,
  '#10-R1c: anon은 report SELECT 불가 (운영자 전용)'
);

RESET ROLE;

-- report SELECT: authenticated 불가 (정책 없음 = 차단)
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}',
  true
);

SELECT throws_ok(
  $$SELECT * FROM report$$,
  '42501',
  NULL,
  '#10-R1d: authenticated는 report SELECT 불가 (service_role 전용)'
);

RESET ROLE;

-- =========================================================================
-- 슬라이스 #10: cheer soft-delete → get_wordmap 제외 검증
-- =========================================================================

-- goal 픽스처에서 goal-a-live의 id를 확인해 cheer 삽입
-- cheer.payment_id NOT NULL → payment 픽스처 먼저 삽입 (postgres=service_role)
DO $$
DECLARE
  v_goal_id   bigint;
  v_payment1  bigint;
  v_payment2  bigint;
BEGIN
  SELECT id INTO v_goal_id FROM goal WHERE slug = 'goal-a-live' LIMIT 1;

  -- payment 픽스처 2건 (서비스롤 직접 삽입)
  INSERT INTO payment (order_id, amount_krw, status, pg_customer_key)
  VALUES ('test-order-del-001', 5000, 'DONE', 'ANONYMOUS')
  RETURNING id INTO v_payment1;

  INSERT INTO payment (order_id, amount_krw, status, pg_customer_key)
  VALUES ('test-order-live-001', 5000, 'DONE', 'ANONYMOUS')
  RETURNING id INTO v_payment2;

  -- 삭제된 cheer (message 있음, deleted_at 설정)
  INSERT INTO cheer (goal_id, payment_id, is_anonymous, clover_amount, status, message, deleted_at)
  VALUES (v_goal_id, v_payment1, false, 1, 'CONFIRMED', '삭제된응원메시지', now());

  -- 살아있는 cheer (message 있음)
  INSERT INTO cheer (goal_id, payment_id, is_anonymous, clover_amount, status, message, deleted_at)
  VALUES (v_goal_id, v_payment2, false, 1, 'CONFIRMED', '살아있는응원메시지', NULL);
END $$;

-- get_wordmap RPC: 삭제된 cheer 메시지 제외 확인
SELECT is(
  (SELECT count(*)::integer
   FROM get_wordmap((SELECT id FROM goal WHERE slug = 'goal-a-live' LIMIT 1))
   WHERE word = '삭제된응원메시지'),
  0,
  '#10-SD1: soft-deleted cheer 메시지는 get_wordmap에서 제외됨'
);

-- get_wordmap RPC: 살아있는 cheer 메시지 포함 확인
SELECT is(
  (SELECT count(*)::integer
   FROM get_wordmap((SELECT id FROM goal WHERE slug = 'goal-a-live' LIMIT 1))
   WHERE word = '살아있는응원메시지'),
  1,
  '#10-SD2: 활성 cheer 메시지는 get_wordmap에 포함됨'
);

-- goal soft-delete 후 goal_public 제외 (이미 goal-a-deleted로 검증됨, 추가 확인)
SELECT is(
  (SELECT count(*)::integer FROM goal_public WHERE slug = 'goal-a-deleted'),
  0,
  '#10-SD3: soft-deleted goal은 goal_public에서 제외됨 (기존 케이스 재확인)'
);

-- =========================================================================
-- 완료
-- =========================================================================

SELECT finish();

ROLLBACK;
