-- 20260719000000_cheer_amount_privacy.sql
-- High 개인정보 유출 차단: cheer 개별 clover_amount·supporter_ci를 소유자로 격리.
-- 회장 결정 B(2026-07-19). 옵션A. 설계 진실원: docs/design/design-cheer-amount-privacy-v0.1.0.md
-- 의존처 전수분석(설계노트 §1): 이 변경으로 깨지는 기능 0개 확인
--   (goal_public 뷰·get_wordmap RPC는 정의자 권한으로 cheer를 우회 조회하므로 anon base grant 불필요,
--    소유자 조회 3경로는 cheer_select_goal_owner 정책으로 계속 커버됨).

BEGIN;

-- (1) PUBLIC(anon + authenticated 비소유자)에 개별 응원 전체(금액·CI 포함)를 열어주던
--     정책 제거. goal_public 집계(뷰=정의자권한)·get_wordmap(SECURITY DEFINER)는 영향 없음.
DROP POLICY IF EXISTS "cheer_select_confirmed" ON cheer;

-- (2) anon의 base 테이블 직접 SELECT 권한 회수. 공개면은 goal_public 뷰 +
--     get_wordmap RPC + 아래 (4) cheer_public 뷰로만 서빙.
REVOKE SELECT ON cheer FROM anon;

-- (3) authenticated base grant는 유지한다 (회수하지 않음).
--     이유: home/[slug]/wordmap의 소유자 조회(cheer_select_goal_owner 정책, init:447)가
--     GRANT + 정책 둘 다 필요 — grant만 회수하면 소유자 조회까지 42501로 깨진다.
--     비소유자는 정책이 0행으로 막으므로 base grant 유지 자체는 노출이 아니다.
--     (SEC-5b pgTAP으로 비소유자 0행을 회귀 고정 — 정책이 유일 방어선이 되지 않게 이중화)

-- (4) 공개 응원자 목록용 금액 제외 뷰 (g/[slug]/page.tsx:178 계획 대비 선제 확보).
--     clover_amount·supporter_ci 컬럼 자체가 SELECT 목록에 없음 → 실수로도 금액이 안 샌다.
--     뷰는 기본 security_invoker=OFF(정의자 권한)로 생성되므로 anon base grant 없이도
--     내부적으로 cheer를 읽을 수 있다.
CREATE OR REPLACE VIEW cheer_public AS
SELECT
  c.id,
  c.goal_id,
  CASE WHEN c.is_anonymous THEN NULL ELSE c.display_name END AS display_name,
  c.is_anonymous,
  c.message,
  c.created_at
FROM cheer c
WHERE c.status = 'CONFIRMED'
  AND c.deleted_at IS NULL;

COMMENT ON VIEW cheer_public IS
  '공개 응원자 목록 뷰. clover_amount·supporter_ci 컬럼 부재(금액 3층 a 확장). 익명이면 display_name NULL. anon SELECT 허용.';

GRANT SELECT ON cheer_public TO anon, authenticated;

COMMIT;

-- =====================================================================
-- 되돌림 (필요 시 수동 실행 — 이 마이그레이션 파일 자체는 되돌리지 않음)
-- =====================================================================
-- BEGIN;
-- DROP VIEW IF EXISTS cheer_public;
-- GRANT SELECT ON cheer TO anon;
-- CREATE POLICY "cheer_select_confirmed" ON cheer
--   FOR SELECT
--   USING (status = 'CONFIRMED' AND deleted_at IS NULL);
-- COMMIT;
