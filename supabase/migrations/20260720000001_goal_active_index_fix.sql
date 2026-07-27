-- 20260720000001_goal_active_index_fix.sql
-- QA 회귀: 20260720000000의 partial unique index predicate가 `status != 'DELETED'`뿐이라
-- 이 repo가 병행 사용 중인 소프트삭제(deleted_at IS NOT NULL)와 충돌했다.
-- 픽스처 goal-a-deleted(status='ACTIVE', deleted_at=now())가 index 관점에서 "활성"으로
-- 오인되어, 같은 member_id의 goal-a-live(status='ACTIVE', deleted_at=NULL)와 함께
-- unique violation(23505, goal_one_active_per_member)을 유발 — pgTAP 전체 회귀.
--
-- "활성 목표"의 단일 정의를 status != 'DELETED' AND deleted_at IS NULL 로 통일한다
-- (goal_public 뷰·앱 쿼리와 동일 정의). prod에 이미 20260720000000이 적용된 상태이므로
-- 되돌리지 않고 후속 마이그레이션으로 index를 재생성한다.
--
-- 적용 전 재확인 필요(prod): 기존 활성(신정의) 목표 중 member_id 중복 0건인지 재스캔.
--   SELECT member_id, count(*) FROM goal
--   WHERE status != 'DELETED' AND deleted_at IS NULL
--   GROUP BY member_id HAVING count(*) > 1; → 0 rows 기대.

BEGIN;

DROP INDEX IF EXISTS goal_one_active_per_member;

CREATE UNIQUE INDEX goal_one_active_per_member
  ON goal (member_id)
  WHERE status != 'DELETED' AND deleted_at IS NULL;

COMMENT ON INDEX goal_one_active_per_member IS
  '1계정 1활성목표 강제(회장 결정 A, 2026-07-20). 활성 정의 = status != DELETED AND deleted_at IS NULL(2026-07-20 fix — 소프트삭제 시맨틱 정합).';

COMMIT;
