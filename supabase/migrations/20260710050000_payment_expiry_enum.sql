-- =============================================================================
-- payment_expiry_enum — EXPIRED terminal states for stale abandoned orders
-- =============================================================================
-- Purpose:
--   cheer-order abuse guard (다음 마이그레이션)가 30분 넘게 방치된 READY payment /
--   PENDING cheer를 EXPIRED로 전이한다. 그 상태값을 먼저 별도 마이그레이션으로 추가한다.
--
-- 왜 별도 파일인가:
--   Postgres는 ALTER TYPE ... ADD VALUE로 추가한 enum 값을 "같은 트랜잭션" 안에서
--   바로 사용(예: 그 값을 쓰는 함수 정의·INSERT)할 수 없다. supabase migration은
--   파일 1개 = 트랜잭션 1개로 적용되므로, enum 추가와 사용을 다른 파일로 분리해야
--   `supabase migration up`이 안전하게 통과한다.
-- =============================================================================

ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE cheer_status_enum ADD VALUE IF NOT EXISTS 'EXPIRED';
