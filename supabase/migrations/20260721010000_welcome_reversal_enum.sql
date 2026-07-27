-- =============================================================================
-- welcome_reversal_enum — clover_entry_type_enum에 WELCOME_REVERSAL 추가
-- =============================================================================
-- 배경(회장 지적 2026-07-21): 활성 목표 1개인데 웰컴 클로버가 36개 누적 —
--   과거 삭제된 목표 11개분 웰컴(3클로버×11=33)이 잔액에서 무효화되지 않고 남아있었음.
-- 이 파일은 enum 값만 추가한다. PostgreSQL은 ALTER TYPE ... ADD VALUE로 추가한 값을
-- **같은 트랜잭션 내에서 즉시 사용할 수 없어** — 사용부(20260721000100)는 별도
-- 마이그레이션 파일(=별도 트랜잭션)로 분리한다. 20260718000000_welcome_clover_enum.sql이
-- 이미 이 패턴을 확립함(WELCOME_GRANT도 동일하게 선행 분리).
-- =============================================================================

ALTER TYPE clover_entry_type_enum ADD VALUE IF NOT EXISTS 'WELCOME_REVERSAL';

COMMENT ON TYPE clover_entry_type_enum IS
  'clover_ledger.entry_type. WELCOME_REVERSAL = 목표 삭제로 무효화된 웰컴 클로버(WELCOME_GRANT 상쇄, ref_type=cheer/ref_id=웰컴 cheer.id).';
