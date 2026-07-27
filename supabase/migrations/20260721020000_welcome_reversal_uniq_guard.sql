-- =============================================================================
-- welcome_reversal_uniq_guard — WELCOME_REVERSAL 1cheer당 1회를 DB 레벨로 강제
-- =============================================================================
-- 배경: Codex 2nd-pass 리뷰(2026-07-21, 20260721010100 마이그레이션 대상)에서
--   지적된 Medium 항목 — 백필/트리거 모두 NOT EXISTS 가드로 중복 상쇄를 막고
--   있으나, clover_ledger(ref_type, ref_id)는 비유니크 인덱스라 동시성 경합
--   시(수동 개입·향후 코드 경로 포함) 이중 INSERT를 완전히 막지 못함. 이 파일이
--   그 최종 방어선을 부분 유니크 인덱스로 추가한다 —
--   grant_welcome_clover()의 cheer_goal_welcome_uniq(목표당 웰컴 1건 보장)와
--   동일한 방어 패턴.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS clover_ledger_welcome_reversal_uniq
  ON clover_ledger (ref_id)
  WHERE entry_type = 'WELCOME_REVERSAL' AND ref_type = 'cheer';

COMMENT ON INDEX clover_ledger_welcome_reversal_uniq IS
  '웰컴 cheer 1건당 WELCOME_REVERSAL은 최대 1건만 허용(이중 상쇄 DB 레벨 최종 방어). NOT EXISTS 가드(백필 DO블록·reverse_welcome_clover_on_goal_delete 트리거)의 경합 조건을 이 유니크 인덱스가 최종 차단.';
