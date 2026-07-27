-- 20260720000000_goal_one_active_per_member.sql
-- 회장 결정 A (2026-07-20): 1계정 1목표 강제 — 활성 목표(status != 'DELETED') 1개.
-- 앱레벨(OnboardingGoalForm.saveGoalToDB)에서 이미 사전 SELECT로 막지만,
-- DB 제약을 정본으로 두어 동시요청/우회 경로에서도 무결성 보장(defense in depth).
--
-- 적용 전 확인(2026-07-20, 로컬 db): 기존 데이터 중 activity 상태 member_id 중복
-- 0건 확인 완료 — SELECT member_id, count(*) FROM goal WHERE status != 'DELETED'
-- GROUP BY member_id HAVING count(*) > 1; → 0 rows. prod 적용 전 동일 스캔 재확인 필요.

BEGIN;

CREATE UNIQUE INDEX goal_one_active_per_member
  ON goal (member_id)
  WHERE status != 'DELETED';

COMMENT ON INDEX goal_one_active_per_member IS
  '1계정 1활성목표 강제(회장 결정 A, 2026-07-20). status=DELETED는 예외(재생성 허용).';

COMMIT;
