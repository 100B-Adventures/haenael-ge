-- =============================================================================
-- welcome_clover — 웰컴 클로버 성장훅 (콜드스타트 완화)
-- =============================================================================
-- 진실원: docs/architecture.md(자금흐름·SECURITY DEFINER·원장) + 회장·컨트롤러
-- 확정(2026-07-18):
--   1. 목표 생성 시 시스템이 "웰컴 응원"(따뜻한 메시지 + 클로버 3개)을 자동 삽입.
--      목표당 1회 멱등. 무결제(payment_id NULL) — cheer.payment_id를 NULLABLE로
--      완화하고, is_welcome=true인 행만 NULL을 허용한다(CHECK로 강제).
--   2. 환전 최소액(30클로버=30,000원) 도달판정에는 웰컴 포함.
--      실제 지급 계산(친구 응원분만)에서는 웰컴 제외.
--      → clover_entry_type_enum에 WELCOME_GRANT 추가(별도 파일, 선행 적용) +
--        clover_eligibility() RPC가 total/welcome/payable 3분해를 SECURITY DEFINER로 계산.
--   3. 기존 결제·환전 하드닝 로직(payment_rpc·payment_hardening 등)은 훼손하지 않음
--      — 이 마이그레이션은 cheer/goal에만 컬럼 추가 + 신규 트리거/함수만 얹는다.
-- =============================================================================

-- =====================
-- 1. 상수 (스칼라 함수로 노출 — pgTAP·EF·RPC가 동일 값을 참조)
-- =====================

CREATE OR REPLACE FUNCTION welcome_clover_amount()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 3 $$;

COMMENT ON FUNCTION welcome_clover_amount() IS '목표 생성 시 자동 삽입되는 웰컴 클로버 개수. 단일 진실원(회장 확정 2026-07-18).';

CREATE OR REPLACE FUNCTION min_cashout_clover()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 30 $$;

COMMENT ON FUNCTION min_cashout_clover() IS '환전 최소 클로버(30개=30,000원, 1클로버=1,000원 등가). 도달판정=웰컴 포함 총량 기준.';

-- =====================
-- 2. cheer — 웰컴 응원을 위한 스키마 완화
-- =====================

ALTER TABLE cheer ALTER COLUMN payment_id DROP NOT NULL;
ALTER TABLE cheer ADD COLUMN is_welcome boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN cheer.is_welcome IS '시스템 자동삽입 웰컴 응원(무결제). true면 payment_id는 항상 NULL.';

-- payment_id NULL은 웰컴 행에서만 허용 — 결제 하드닝 로직(friend cheer)은 그대로 NOT NULL 강제.
ALTER TABLE cheer ADD CONSTRAINT cheer_welcome_payment_consistency
  CHECK (
    (is_welcome = true  AND payment_id IS NULL)
    OR
    (is_welcome = false AND payment_id IS NOT NULL)
  );

-- 목표당 웰컴 응원 1건만(멱등 보장의 DB 레벨 최종 방어선).
CREATE UNIQUE INDEX cheer_goal_welcome_uniq ON cheer(goal_id) WHERE is_welcome = true;

-- =====================
-- 3. 웰컴 자동삽입 트리거 (goal INSERT 직후, 같은 트랜잭션)
-- =====================

CREATE OR REPLACE FUNCTION grant_welcome_clover()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cheer_id      bigint;
  v_amount        integer := welcome_clover_amount();
  v_prev_balance  integer;
  v_next_balance  integer;
BEGIN
  -- 멱등: 이미 웰컴이 있으면(재실행·백필 등) 스킵.
  IF EXISTS (SELECT 1 FROM cheer WHERE goal_id = NEW.id AND is_welcome = true) THEN
    RETURN NEW;
  END IF;

  INSERT INTO cheer (
    goal_id, payment_id, display_name, is_anonymous, message,
    clover_amount, status, is_welcome
  )
  VALUES (
    NEW.id, NULL, '해낼게', false,
    '첫 클로버는 저희가 먼저 건넬게요. 다음 응원은 곧 친구들 차례예요 🍀',
    v_amount, 'CONFIRMED', true
  )
  RETURNING id INTO v_cheer_id;

  -- clover_balance 행 보장 + 행 잠금(동시 웰컴 삽입은 없지만 confirm_cheer_payment와
  -- 동일한 패턴을 따라 잔액 갱신 경합을 원천 차단).
  INSERT INTO clover_balance (member_id, clover_count, updated_at)
  VALUES (NEW.member_id, 0, now())
  ON CONFLICT (member_id) DO NOTHING;

  SELECT clover_count INTO v_prev_balance
  FROM clover_balance
  WHERE member_id = NEW.member_id
  FOR UPDATE;

  v_prev_balance := COALESCE(v_prev_balance, 0);
  v_next_balance := v_prev_balance + v_amount;

  INSERT INTO clover_ledger (
    member_id, entry_type, clover_delta, ref_type, ref_id, balance_after
  )
  VALUES (
    NEW.member_id, 'WELCOME_GRANT', v_amount, 'cheer', v_cheer_id, v_next_balance
  );
  -- clover_ledger AFTER INSERT 트리거(sync_clover_balance)가 clover_balance를 갱신한다.

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION grant_welcome_clover() IS
  '목표 생성 시 웰컴 cheer+ledger를 같은 트랜잭션에서 원자적으로 삽입. 목표당 1회 멱등(EXISTS 가드 + 유니크 인덱스 2중 방어).';

CREATE TRIGGER goal_grant_welcome_clover
  AFTER INSERT ON goal
  FOR EACH ROW
  EXECUTE FUNCTION grant_welcome_clover();

-- =====================
-- 4. clover_eligibility — 환전 도달판정(웰컴 포함) vs 지급액(웰컴 제외) 3분해
-- =====================

CREATE OR REPLACE FUNCTION clover_eligibility(p_member_id uuid)
RETURNS TABLE(
  total_balance      integer,  -- 전체 잔액(웰컴+친구), 도달판정 기준
  welcome_amount     integer,  -- 잔여 웰컴분(항상 friend 지급에서 차감)
  payable_amount     integer,  -- 실제 지급 가능액(친구 응원분만) = GREATEST(total-welcome, 0)
  min_cashout_clover integer,  -- 환전 최소 클로버(도달판정 임계값)
  reached_threshold  boolean   -- total_balance >= min_cashout_clover
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total   integer;
  v_welcome integer;
  v_min     integer := min_cashout_clover();
BEGIN
  IF auth.uid() IS DISTINCT FROM p_member_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(cb.clover_count, 0) INTO v_total
  FROM clover_balance cb
  WHERE cb.member_id = p_member_id;
  v_total := COALESCE(v_total, 0);

  SELECT COALESCE(SUM(cl.clover_delta), 0) INTO v_welcome
  FROM clover_ledger cl
  WHERE cl.member_id = p_member_id
    AND cl.entry_type = 'WELCOME_GRANT';

  RETURN QUERY SELECT
    v_total,
    v_welcome,
    GREATEST(v_total - v_welcome, 0),
    v_min,
    (v_total >= v_min);
END;
$$;

COMMENT ON FUNCTION clover_eligibility(uuid) IS
  '환전 도달판정(총량=웰컴포함)과 실제 지급액(친구분만=웰컴제외)을 분해. 본인만 호출 가능(auth.uid() 일치).';

REVOKE ALL ON FUNCTION clover_eligibility(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION clover_eligibility(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION welcome_clover_amount() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION min_cashout_clover() TO anon, authenticated, service_role;
