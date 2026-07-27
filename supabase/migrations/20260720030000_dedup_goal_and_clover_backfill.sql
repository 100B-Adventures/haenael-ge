-- =============================================================================
-- dedup_goal_and_clover_backfill — prod 후속조치 3종 단일 트랜잭션 (회장 승인 2026-07-20)
-- =============================================================================
-- 배경: 20260720000001(goal_one_active_per_member 재정의: 활성=status!='DELETED' AND
--   deleted_at IS NULL)이 prod에 SQLSTATE 23505로 실패. 원인 = prod에 회장 테스트
--   데이터로 생긴 member_id 중복 활성 goal. 이후 마이그레이션(20260720020000 clover
--   fix 포함) 적용이 이 실패로 막혀 있음. 전량 회장 테스트 데이터 — 실사용자 없음.
--
-- 이 파일이 하는 일 (트랜잭션 1개, 순서 중요):
--   1) 중복 활성 goal 정리 — member_id별 최신 created_at 1개만 남기고 나머지 DELETED.
--   2) goal_one_active_per_member 재생성 — 1)로 중복이 제거됐으므로 이제 성공.
--   3) 클로버 잔액 보정 — create_cheer_order 구버전이 결제금액(원)을 그대로
--      cheer.clover_amount에 저장한 버그(20260720020000_clover_amount_krw_fix.sql로
--      코드는 이미 수정)로 부풀려진 과거 결제분(payment_id NOT NULL)을 /1000 보정.
--      welcome cheer(is_welcome=true, payment_id NULL, delta=3)는 조건에서 구조적으로
--      배제 — 이중보정 불가능.
--
-- 멱등성: 1)은 이미 1개만 남은 member_id에 대해선 아무 행도 갱신하지 않는다(중복 없으면
--   UPDATE 0). 3)은 "clover_amount = payment.amount_krw(원단위 불변값)" 등식으로 버그
--   서명을 증명한 행만 대상 — 이미 보정된 행(clover_amount < amount_krw)은 재실행해도
--   등식이 깨져 자동 스킵된다(이중 나눗셈 불가).
--
-- 기반: supabase/migrations/20260720000001_goal_active_index_fix.sql,
--   supabase/migrations/20260720020000_clover_amount_krw_fix.sql,
--   supabase/manual/20260720_clover_amount_backfill.sql(Codex 리뷰로 검증된
--   "payment.amount_krw 등식 증명" 휴리스틱을 그대로 계승), 회장 승인 2026-07-20.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1) 중복 활성 goal 정리 — member_id별 최신 1개만 남기고 나머지 소프트삭제
--    "활성" 정의는 goal_one_active_per_member 신정의와 동일: status != 'DELETED'
--    AND deleted_at IS NULL. 최신 판정은 created_at DESC, 동률 시 id DESC(더 나중에
--    생성된 행 우선)로 완전 결정.
-- ─────────────────────────────────────────────────────────────────────────

WITH ranked_active_goals AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY member_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM goal
  WHERE status != 'DELETED'
    AND deleted_at IS NULL
)
UPDATE goal g
SET status = 'DELETED',
    deleted_at = now()
FROM ranked_active_goals r
WHERE g.id = r.id
  AND r.rn > 1;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) index 재생성 — 1)로 중복이 제거됐으므로 이제 성공해야 정상.
-- ─────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS goal_one_active_per_member;

CREATE UNIQUE INDEX goal_one_active_per_member
  ON goal (member_id)
  WHERE status != 'DELETED' AND deleted_at IS NULL;

COMMENT ON INDEX goal_one_active_per_member IS
  '1계정 1활성목표 강제(회장 결정 A, 2026-07-20). 활성 정의 = status != DELETED AND deleted_at IS NULL. prod 중복은 20260720030000에서 최신 1개만 남기고 정리됨.';

-- ─────────────────────────────────────────────────────────────────────────
-- 3) 클로버 잔액 보정 — KRW를 클로버로 잘못 저장한 결제분(payment_id NOT NULL)만.
--    증명 = 불변값 payment.amount_krw와 정확히 일치(버그 시절 저장식 clover_amount=
--    amount_krw). welcome(is_welcome=true, payment_id NULL)은 이 JOIN 조건에 애초에
--    걸릴 수 없다 — 이중보정 구조적으로 불가능.
-- ─────────────────────────────────────────────────────────────────────────

-- 3-a) cheer.clover_amount 보정
UPDATE cheer c
SET clover_amount = c.clover_amount / 1000
FROM payment p
WHERE p.id = c.payment_id
  AND c.is_welcome = false
  AND c.status = 'CONFIRMED'
  AND p.status = 'DONE'
  AND c.clover_amount = p.amount_krw   -- 버그 서명: clover가 원금액과 동일
  AND c.clover_amount >= 1000;

-- 3-b) clover_ledger EARN(응원 적립) delta 보정 — 동일 등식으로 증명된 행만.
--      WELCOME_GRANT/SPEND/CASHOUT 및 이미 보정된 정상 소액(1/3/5/10)은
--      entry_type/ref_type 필터와 등식·임계값에서 자동 제외.
UPDATE clover_ledger cl
SET clover_delta = cl.clover_delta / 1000
FROM cheer c
  JOIN payment p ON p.id = c.payment_id
WHERE c.id = cl.ref_id
  AND cl.entry_type = 'EARN'
  AND cl.ref_type = 'cheer'
  AND c.is_welcome = false
  AND p.status = 'DONE'
  AND cl.clover_delta = p.amount_krw   -- 버그 서명: delta가 원금액과 동일
  AND cl.clover_delta >= 1000;

-- 3-c) balance_after 전면 재계산 — member별 (created_at, id) 순 누적합.
--      델타를 고친 뒤이므로 모든 스냅샷이 올바른 누적값으로 수렴한다. 보정 대상이
--      0건이었던 member는 값이 이미 정합이라 IS DISTINCT FROM에서 자동 스킵.
WITH recomputed AS (
  SELECT
    id,
    SUM(clover_delta) OVER (
      PARTITION BY member_id
      ORDER BY created_at, id
      ROWS UNBOUNDED PRECEDING
    ) AS new_balance_after
  FROM clover_ledger
)
UPDATE clover_ledger cl
SET balance_after = r.new_balance_after
FROM recomputed r
WHERE cl.id = r.id
  AND cl.balance_after IS DISTINCT FROM r.new_balance_after;

-- 3-d) clover_balance 캐시 = member별 최종(가장 최근) balance_after로 재동기화.
--    UPSERT(UPDATE-only 아님) — clover_ledger엔 항목이 있으나 clover_balance 캐시 행이
--    아직 없는 member(정상 트리거 밖에서 생긴 원장, 또는 트리거 도입 이전 레거시)도
--    이번 재계산으로 캐시 행이 생성되어 원장·캐시 정합이 보장된다. (Codex 2nd-pass High
--    지적 반영, 2026-07-20 — 기존 UPDATE-only는 캐시 행 없는 member를 조용히 누락시켰다.)
WITH finals AS (
  SELECT DISTINCT ON (member_id)
    member_id, balance_after
  FROM clover_ledger
  ORDER BY member_id, created_at DESC, id DESC
)
INSERT INTO clover_balance (member_id, clover_count, updated_at)
SELECT f.member_id, f.balance_after, now()
FROM finals f
ON CONFLICT (member_id) DO UPDATE
  SET clover_count = EXCLUDED.clover_count,
      updated_at = now()
  WHERE clover_balance.clover_count IS DISTINCT FROM EXCLUDED.clover_count;

COMMIT;
