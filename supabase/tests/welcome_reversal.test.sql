-- =============================================================================
-- welcome_reversal.test.sql — 삭제 목표 웰컴 클로버 무효화 (pgTAP, 실 Postgres)
-- 진실원: supabase/migrations/20260721000100_welcome_dedup_cleanup.sql + 회장 지적 2026-07-21
-- 검증축: ①목표 삭제 시 웰컴 자동 상쇄(트리거) ②재삭제(재트리거)해도 중복 상쇄 없음(멱등)
--         ③삭제 후 새 활성 목표의 웰컴은 정상 적립(과거 상쇄와 무관하게 순수 신규)
--         ④clover_eligibility가 상쇄된 웰컴을 이중 차감하지 않음
-- =============================================================================

BEGIN;

SELECT plan(9);

INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_anonymous
)
VALUES
  ('22222222-b000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'reversal_a@test.local', '', now(), now(),
   '', '', '', '{}'::jsonb, '{}'::jsonb, false, false);

INSERT INTO member (id, nickname, kyc_status)
VALUES ('22222222-b000-0000-0000-000000000001', '리버설A', 'NONE');

-- =========================================================================
-- #1 목표 삭제 → 웰컴 자동 상쇄
-- =========================================================================

INSERT INTO goal (member_id, slug, title, due_date, status)
VALUES ('22222222-b000-0000-0000-000000000001', 'reversal-goal-1', '삭제될 목표', now()::date + 30, 'ACTIVE');

SELECT is(
  (SELECT clover_count FROM clover_balance WHERE member_id = '22222222-b000-0000-0000-000000000001'),
  welcome_clover_amount(),
  'R1: 목표 생성 직후 웰컴(3)만큼 잔액 적립'
);

UPDATE goal SET status = 'DELETED', deleted_at = now()
WHERE slug = 'reversal-goal-1';

SELECT is(
  (SELECT count(*)::integer FROM clover_ledger
   WHERE member_id = '22222222-b000-0000-0000-000000000001' AND entry_type = 'WELCOME_REVERSAL'),
  1,
  'R2: 목표 삭제 시 WELCOME_REVERSAL 1건 자동 기입'
);

SELECT is(
  (SELECT clover_delta FROM clover_ledger
   WHERE member_id = '22222222-b000-0000-0000-000000000001' AND entry_type = 'WELCOME_REVERSAL'),
  -welcome_clover_amount(),
  'R3: WELCOME_REVERSAL delta = -웰컴 원금(GRANT를 정확히 상쇄)'
);

SELECT is(
  (SELECT clover_count FROM clover_balance WHERE member_id = '22222222-b000-0000-0000-000000000001'),
  0,
  'R4: 삭제 후 잔액이 0으로 복귀(웰컴 무효화 반영)'
);

-- =========================================================================
-- #2 재삭제(재트리거) — 이미 DELETED인 행을 다시 UPDATE해도 이중 상쇄 없음
-- =========================================================================

UPDATE goal SET deleted_at = now()
WHERE slug = 'reversal-goal-1';

SELECT is(
  (SELECT count(*)::integer FROM clover_ledger
   WHERE member_id = '22222222-b000-0000-0000-000000000001' AND entry_type = 'WELCOME_REVERSAL'),
  1,
  'R5: deleted_at 재갱신(재트리거) 후에도 WELCOME_REVERSAL은 여전히 1건(멱등)'
);

SELECT is(
  (SELECT clover_count FROM clover_balance WHERE member_id = '22222222-b000-0000-0000-000000000001'),
  0,
  'R6: 재트리거 후에도 잔액 0 유지(이중 차감 없음)'
);

-- =========================================================================
-- #3 삭제 후 새 활성 목표 — 웰컴이 순수 신규로 정상 적립(과거 상쇄와 독립)
-- =========================================================================

INSERT INTO goal (member_id, slug, title, due_date, status)
VALUES ('22222222-b000-0000-0000-000000000001', 'reversal-goal-2', '새 목표', now()::date + 30, 'ACTIVE');

SELECT is(
  (SELECT clover_count FROM clover_balance WHERE member_id = '22222222-b000-0000-0000-000000000001'),
  welcome_clover_amount(),
  'R7: 삭제 이력이 있어도 새 활성 목표의 웰컴은 정확히 3만 적립(과거 상쇄분과 합산 오염 없음)'
);

-- =========================================================================
-- #4 clover_eligibility — 상쇄된 웰컴을 이중 차감하지 않음
-- =========================================================================

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"22222222-b000-0000-0000-000000000001","iss":"supabase-demo"}', true);

SELECT is(
  (SELECT (total_balance, welcome_amount, payable_amount, reached_threshold)
   FROM clover_eligibility('22222222-b000-0000-0000-000000000001')),
  (3, 3, 0, false),
  'R8: 삭제 1건+활성 1건 후에도 welcome_amount=3(순합산, 이중차감 없음)/payable=0/미도달'
);

RESET ROLE;

-- 활성 목표도 삭제 → 최종 잔액 0, 웰컴 순합산도 0
UPDATE goal SET status = 'DELETED', deleted_at = now()
WHERE slug = 'reversal-goal-2';

SELECT is(
  (SELECT clover_count FROM clover_balance WHERE member_id = '22222222-b000-0000-0000-000000000001'),
  0,
  'R9: 활성 목표까지 삭제되면 잔액 0으로 완전 수렴(웰컴 2건 모두 상쇄)'
);

SELECT * FROM finish();
ROLLBACK;
