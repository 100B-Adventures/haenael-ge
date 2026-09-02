-- =============================================================================
-- ⛔ 회수 필요: 실행 전 회장/컨트롤러 확인 요망.
--   확인할 것:
--   (1) 이 스크립트는 PROD에서 이미 잘못 적립된(1,000배 부풀려진) 결제 클로버를
--       1클로버=1,000원 기준으로 보정한다. 실행 = clover_ledger·cheer·clover_balance를
--       되돌리기 어렵게 변경. 반드시 PROD DB 백업/스냅샷 확보 후 실행.
--   (2) 실행 전 아래 "관찰 SELECT ①②"를 먼저 돌려 영향 행 수·before 값을 회장에게 보고,
--       승인받은 뒤에만 BEGIN~COMMIT 본문을 실행할 것.
--   (3) 절대 supabase/migrations/ 로 옮기지 말 것 — 옮기면 db push 때 전 환경에
--       무단 자동 실행된다. 이 파일은 수동 1회성 운영 스크립트다.
--   (4) ★동시성: 반드시 결제 유입을 멈춘 유지보수 창에서 실행. 실행 직전
--       PAYMENTS_ENABLED=false(kill switch)로 confirm_cheer_payment 유입을 차단하고,
--       완료 후 되돌린다. 그렇지 않으면 재계산 스냅샷 이후 커밋된 confirm의 올바른
--       clover_balance가 이 스크립트의 stale 최종캐시 갱신에 덮일 수 있다
--       (Codex 결제 리뷰 2026-07-20 지적).
-- =============================================================================
-- 대상 버그: create_cheer_order가 cheer.clover_amount에 결제금액(원)을 그대로 저장해
--   1,000원 응원이 1,000클로버로 적립됨(20260720020000_clover_amount_krw_fix.sql로 코드는 수정).
--   이미 쌓인 과거 데이터는 코드 수정으로 고쳐지지 않으므로 이 스크립트로 소급 보정.
--
-- 멱등/안전장치:
--   · 보정 대상은 "clover_delta(또는 clover_amount) >= 1000 AND % 1000 = 0" 인 행만 —
--     정상값(1/3/5/10)은 <1000이라 절대 안 걸림. 재실행해도 이미 보정된 행(<1000)은
--     스킵되어 이중 나눗셈이 발생하지 않는다.
--   · welcome_clover(is_welcome=true, entry_type='WELCOME_GRANT', delta=3)는 조건에서
--     자동 제외(delta<1000 + entry_type 필터 + is_welcome 필터 3중).
--   · balance_after/clover_balance는 델타 보정 후 원장 전체를 시간순 누적 재생해
--     재계산하므로 "이후 항목 balance_after가 밀려 틀어지는" 문제까지 함께 해소.
--   · 단일 트랜잭션 — 중간 실패 시 전체 롤백.
-- =============================================================================

-- ─── 관찰 SELECT ① (실행 전: 영향받을 cheer/ledger 행 수와 값 분포) ───────────
--   BEGIN 전에 단독 실행해 보고에 캡처.
--   ★버그 증명(Codex 리뷰 2026-07-20): 단순 "1000의 배수" 휴리스틱은 정상 1,000클로버를
--     오분류할 수 있으므로, 불변값 payment.amount_krw와의 등식(clover=amount_krw=delta)으로
--     "KRW를 클로버로 잘못 저장한 행"임을 증명한 행만 대상으로 삼는다.
-- SELECT 'cheer_inflated' AS what, count(*)
-- FROM cheer c JOIN payment p ON p.id = c.payment_id
-- WHERE c.is_welcome = false AND c.status = 'CONFIRMED' AND p.status = 'DONE'
--   AND c.clover_amount = p.amount_krw AND c.clover_amount >= 1000
-- UNION ALL
-- SELECT 'ledger_earn_inflated', count(*)
-- FROM clover_ledger cl
--   JOIN cheer c ON c.id = cl.ref_id
--   JOIN payment p ON p.id = c.payment_id
-- WHERE cl.entry_type = 'EARN' AND cl.ref_type = 'cheer'
--   AND c.is_welcome = false AND p.status = 'DONE'
--   AND cl.clover_delta = p.amount_krw AND cl.clover_delta >= 1000;

-- ─── 관찰 SELECT ② (영향받을 member별 balance before) ─────────────────────────
-- SELECT member_id, clover_count FROM clover_balance ORDER BY clover_count DESC;

BEGIN;

-- 1) cheer.clover_amount 보정: KRW를 클로버로 잘못 저장한 것이 "증명된" 결제 cheer만.
--    증명 = 불변값 payment.amount_krw 와 정확히 일치(= 버그 시절 저장식 clover_amount=amount_krw).
--    payment.amount_krw는 절대 나눠지지 않는 원단위 진실원이므로 step2와 순서 무관.
UPDATE cheer c
SET clover_amount = c.clover_amount / 1000
FROM payment p
WHERE p.id = c.payment_id
  AND c.is_welcome = false
  AND c.status = 'CONFIRMED'
  AND p.status = 'DONE'
  AND c.clover_amount = p.amount_krw   -- 버그 서명: clover가 원금액과 동일
  AND c.clover_amount >= 1000;

-- 2) clover_ledger EARN(응원 적립) delta 보정: 마찬가지로 payment.amount_krw 등식으로 증명된 행만.
--    WELCOME_GRANT/SPEND/CASHOUT 및 정상 소액(1/3/5/10)은 등식·임계값에서 자동 제외.
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

-- 3) balance_after 전면 재계산: member별 (created_at, id) 순 누적합.
--    델타를 고친 뒤이므로 모든 스냅샷이 올바른 누적값으로 수렴한다.
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

-- 4) clover_balance 캐시 = member별 최종(가장 최근) balance_after 로 재동기화.
WITH finals AS (
  SELECT DISTINCT ON (member_id)
    member_id, balance_after
  FROM clover_ledger
  ORDER BY member_id, created_at DESC, id DESC
)
UPDATE clover_balance cb
SET clover_count = f.balance_after,
    updated_at = now()
FROM finals f
WHERE cb.member_id = f.member_id
  AND cb.clover_count IS DISTINCT FROM f.balance_after;

-- ─── 검산(트랜잭션 내부, 커밋 전 확인) ────────────────────────────────────────
-- clover_balance.clover_count 가 원장 누적합과 정확히 일치하는지 0건이어야 정상.
-- SELECT cb.member_id, cb.clover_count, s.sum_delta
-- FROM clover_balance cb
-- JOIN (SELECT member_id, SUM(clover_delta) sum_delta FROM clover_ledger GROUP BY member_id) s
--   ON s.member_id = cb.member_id
-- WHERE cb.clover_count IS DISTINCT FROM s.sum_delta;

COMMIT;
