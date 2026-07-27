-- =============================================================================
-- welcome_dedup_cleanup — 삭제 목표 웰컴 클로버 무효화 (회장 승인 2026-07-21)
-- =============================================================================
-- 배경: 활성 목표 1개(웰컴 3클로버)인데 clover_balance에 웰컴이 36개 누적되어 있었음.
--   원인 = 20260720030000에서 정리한 "중복 활성 goal"(11개)이 DELETED로 전환됐지만,
--   그 목표들이 goal INSERT 시 자동 삽입받은 웰컴 cheer+ledger(WELCOME_GRANT)는 그대로
--   clover_balance에 남아 잔액을 부풀림. 전량 회장 테스트 데이터 — 실사용자 영향 없음.
--
-- 이 파일이 하는 일 (한 트랜잭션):
--   1) clover_eligibility() 재정의 — payable 계산의 웰컴 차감을 WELCOME_GRANT 단독
--      합산에서 WELCOME_GRANT+WELCOME_REVERSAL 순합산으로 고침. 고치지 않으면 아래
--      2)/3)에서 웰컴을 무효화한 뒤에도 이 RPC가 이미 상쇄된 웰컴을 또 차감해
--      payable_amount를 실제보다 낮게 계산하는 2차 버그가 생긴다.
--   2) 삭제 목표(status='DELETED' OR deleted_at IS NOT NULL)에 딸린 웰컴 cheer의
--      WELCOME_GRANT를 clover_ledger에 WELCOME_REVERSAL(음수 델타)로 상쇄 —
--      원장은 삭제하지 않고(감사추적 보존) 상쇄 항목만 추가. clover_balance는
--      기존 clover_ledger_sync_balance 트리거가 INSERT마다 자동 동기화.
--   3) 향후 목표 삭제 시 자동 무효 트리거 — goal UPDATE로 DELETED 전환/deleted_at
--      set 시 그 목표의 웰컴을 같은 방식으로 즉시 상쇄. 활성 유지 중인 목표(가장
--      최근 1개)는 절대 건드리지 않는다.
--
-- 멱등성: 2)는 "그 웰컴 cheer.id를 ref_id로 하는 WELCOME_REVERSAL이 아직 없는" 행만
--   대상 — 재실행해도 이미 상쇄된 행은 NOT EXISTS에서 자동 제외. 3)의 트리거 함수도
--   동일 NOT EXISTS 가드로 이중 상쇄를 원천 차단.
--
-- 기반: supabase/migrations/20260718000100_welcome_clover.sql(웰컴 grant 로직),
--   20260720030000_dedup_goal_and_clover_backfill.sql(중복 목표 정리 선행 조치),
--   회장 2026-07-21 "활성목표 1개인데 웰컴 36개" 지적.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1) clover_eligibility — 웰컴 차감을 순합산(GRANT+REVERSAL)으로 수정
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION clover_eligibility(p_member_id uuid)
RETURNS TABLE(
  total_balance      integer,
  welcome_amount     integer,
  payable_amount     integer,
  min_cashout_clover integer,
  reached_threshold  boolean
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

  -- 순 웰컴 잔액 = WELCOME_GRANT + WELCOME_REVERSAL(음수) 합산.
  -- 삭제 목표분은 REVERSAL로 상쇄되어 있으므로 여기서 자동으로 0이 되고,
  -- 활성 목표의 웰컴(미상쇄)만 남는다.
  SELECT COALESCE(SUM(cl.clover_delta), 0) INTO v_welcome
  FROM clover_ledger cl
  WHERE cl.member_id = p_member_id
    AND cl.entry_type IN ('WELCOME_GRANT', 'WELCOME_REVERSAL');
  v_welcome := GREATEST(v_welcome, 0);

  RETURN QUERY SELECT
    v_total,
    v_welcome,
    GREATEST(v_total - v_welcome, 0),
    v_min,
    (v_total >= v_min);
END;
$$;

COMMENT ON FUNCTION clover_eligibility(uuid) IS
  '환전 도달판정(총량)과 실제 지급액(친구분만)을 분해. 웰컴은 WELCOME_GRANT+WELCOME_REVERSAL 순합산 — 삭제 목표분은 REVERSAL로 상쇄되어 0. 본인만 호출 가능(auth.uid() 일치).';

-- ─────────────────────────────────────────────────────────────────────────
-- 2) 백필 — 이미 삭제된 목표의 웰컴을 상쇄 (idempotent)
-- ─────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
  v_current_balance integer;
  v_delta integer;
  v_next_balance integer;
BEGIN
  FOR r IN
    SELECT gl.member_id, gl.clover_delta, gl.ref_id AS cheer_id, gl.created_at
    FROM clover_ledger gl
    JOIN cheer c ON c.id = gl.ref_id AND gl.ref_type = 'cheer'
    JOIN goal g ON g.id = c.goal_id
    WHERE gl.entry_type = 'WELCOME_GRANT'
      AND c.is_welcome = true
      AND (g.status = 'DELETED' OR g.deleted_at IS NOT NULL)
      AND NOT EXISTS (
        SELECT 1 FROM clover_ledger rv
        WHERE rv.entry_type = 'WELCOME_REVERSAL'
          AND rv.ref_type = 'cheer'
          AND rv.ref_id = gl.ref_id
      )
    ORDER BY gl.member_id, gl.created_at, gl.id
  LOOP
    SELECT COALESCE(clover_count, 0) INTO v_current_balance
    FROM clover_balance
    WHERE member_id = r.member_id
    FOR UPDATE;

    v_current_balance := COALESCE(v_current_balance, 0);
    v_delta := -r.clover_delta;
    v_next_balance := v_current_balance + v_delta;

    INSERT INTO clover_ledger (member_id, entry_type, clover_delta, ref_type, ref_id, balance_after)
    VALUES (r.member_id, 'WELCOME_REVERSAL', v_delta, 'cheer', r.cheer_id, v_next_balance);
    -- clover_ledger_sync_balance(AFTER INSERT) 트리거가 clover_balance.clover_count를
    -- v_next_balance로 즉시 동기화 — 다음 루프 반복의 v_current_balance 조회에 반영됨.
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3) 향후 목표 삭제 시 자동 무효화 트리거
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION reverse_welcome_clover_on_goal_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cheer_id        bigint;
  v_grant_delta     integer;
  v_current_balance integer;
  v_next_balance    integer;
BEGIN
  -- 이 목표의 웰컴 cheer 찾기 (없으면 웰컴 자체가 없던 목표 — 아무 것도 안 함)
  SELECT id INTO v_cheer_id
  FROM cheer
  WHERE goal_id = NEW.id AND is_welcome = true;

  IF v_cheer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT clover_delta INTO v_grant_delta
  FROM clover_ledger
  WHERE entry_type = 'WELCOME_GRANT' AND ref_type = 'cheer' AND ref_id = v_cheer_id;

  IF v_grant_delta IS NULL THEN
    RETURN NEW;
  END IF;

  -- 멱등: 이미 상쇄됐으면 재상쇄 금지 (같은 트랜잭션 내 다중 UPDATE 등)
  IF EXISTS (
    SELECT 1 FROM clover_ledger
    WHERE entry_type = 'WELCOME_REVERSAL' AND ref_type = 'cheer' AND ref_id = v_cheer_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(clover_count, 0) INTO v_current_balance
  FROM clover_balance
  WHERE member_id = NEW.member_id
  FOR UPDATE;

  v_current_balance := COALESCE(v_current_balance, 0);
  v_next_balance := v_current_balance - v_grant_delta;

  INSERT INTO clover_ledger (member_id, entry_type, clover_delta, ref_type, ref_id, balance_after)
  VALUES (NEW.member_id, 'WELCOME_REVERSAL', -v_grant_delta, 'cheer', v_cheer_id, v_next_balance);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION reverse_welcome_clover_on_goal_delete() IS
  '목표가 DELETED로 전환(또는 deleted_at set)되면 그 목표의 웰컴 클로버(WELCOME_GRANT)를 WELCOME_REVERSAL로 즉시 상쇄. NOT EXISTS 가드로 재실행/재트리거 시 이중 상쇄 방지.';

DROP TRIGGER IF EXISTS goal_reverse_welcome_clover_on_delete ON goal;

CREATE TRIGGER goal_reverse_welcome_clover_on_delete
  AFTER UPDATE ON goal
  FOR EACH ROW
  WHEN (
    (NEW.status = 'DELETED' OR NEW.deleted_at IS NOT NULL)
    AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
  )
  EXECUTE FUNCTION reverse_welcome_clover_on_goal_delete();

COMMIT;
