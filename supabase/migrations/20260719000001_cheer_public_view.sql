-- 20260719000001_cheer_public_view.sql
-- 20260719000000의 pgdelta 부분적용 복구: cheer_public 뷰 + GRANT만 재적용.
-- (앞 마이그레이션에서 정책 DROP·REVOKE anon은 적용됐으나 CREATE VIEW/GRANT가
--  pgdelta 트랜잭션 중단으로 미적용됨 — prod anon 조회 PGRST205로 확인.)
-- 동일 SQL(설계 진실원 docs/design/design-cheer-amount-privacy-v0.1.0.md, Codex 2nd-pass 통과분)의 뷰 부분만.

BEGIN;

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
