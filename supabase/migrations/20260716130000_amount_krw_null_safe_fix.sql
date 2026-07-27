-- =============================================================================
-- amount_krw_null_safe_fix — reconcile_canceled_payment amount_krw NULL 우회 방지
-- =============================================================================
-- 배경: 3번째 독립 Codex 컨텍스트 리뷰(2026-07-16)에서 20260716120000이 고친
-- payment_key_mismatch(IS NOT NULL AND != → IS DISTINCT FROM)와 정확히 동일한
-- 패턴의 결함이 바로 다음 줄 amount_mismatch 검증에 남아있음을 발견:
--   IF v_payment.amount_krw != p_amount_krw THEN RAISE EXCEPTION 'amount_mismatch' ...
-- p_amount_krw가 NULL이면 `!=` 비교 자체가 NULL(=false 취급)로 평가되어 금액
-- 불일치 검증을 그대로 통과시켜버린다. 유일 호출부인 toss-webhook-handler.ts →
-- toss.ts::getPayment가 이미 Number.isInteger(totalAmount)를 강제해 현재
-- 실도달 경로는 없으나, 회장 결정에 따라 같은 함수·같은 클래스의 결함을
-- 하나만 고치는 비일관성을 남기지 않기 위해 이번 라운드에서 함께 정리한다.
--
-- 이 마이그레이션은 reconcile_canceled_payment(20260716120000이 정의한 최신
-- 버전 — RETURNS TABLE(payment_id bigint, payment_status payment_status_enum,
-- idempotent boolean, review_required boolean))의 amount_mismatch predicate
-- 한 줄만 IS DISTINCT FROM으로 교체한다. 반환 시그니처 변경이 없으므로
-- CREATE OR REPLACE로 충분 — DROP 불필요. payment_key 비교·잔액부족 durable
-- 마커·CANCELED 전이·리턴 컬럼 4개 등 나머지 로직은 20260716120000과 완전히
-- 동일하게 유지한다.
-- =============================================================================

CREATE OR REPLACE FUNCTION reconcile_canceled_payment(
  p_order_id text,
  p_payment_key text,
  p_amount_krw integer,
  p_detail jsonb
)
RETURNS TABLE(payment_id bigint, payment_status payment_status_enum, idempotent boolean, review_required boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment payment%ROWTYPE;
  v_cheer cheer%ROWTYPE;
  v_goal goal%ROWTYPE;
  v_balance integer;
BEGIN
  SELECT * INTO v_payment FROM payment WHERE order_id = p_order_id FOR UPDATE;
  IF v_payment.id IS NULL THEN RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002'; END IF;

  -- p_amount_krw가 NULL이면 기존 `!=` 비교는 NULL(=false 취급)로 평가돼
  -- 금액불일치 검증을 통과시켜버렸다(20260716120000이 고친 payment_key_mismatch
  -- 와 동일 클래스 결함). IS DISTINCT FROM으로 양쪽 NULL도, 한쪽만 NULL도,
  -- 값이 다른 경우도 전부 정확히 판정한다.
  IF v_payment.amount_krw IS DISTINCT FROM p_amount_krw THEN
    RAISE EXCEPTION 'amount_mismatch' USING ERRCODE = '22023';
  END IF;

  IF v_payment.payment_key IS DISTINCT FROM p_payment_key THEN
    RAISE EXCEPTION 'payment_key_mismatch' USING ERRCODE = '22023';
  END IF;

  IF v_payment.status = 'CANCELED' THEN
    RETURN QUERY SELECT v_payment.id, v_payment.status, true, false;
    RETURN;
  END IF;

  IF v_payment.cancel_reconcile_required_at IS NOT NULL THEN
    RETURN QUERY SELECT v_payment.id, v_payment.status, true, true;
    RETURN;
  END IF;

  IF v_payment.status NOT IN ('READY', 'DONE') THEN
    RAISE EXCEPTION 'invalid_payment_status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_cheer FROM cheer WHERE cheer.payment_id = v_payment.id FOR UPDATE;
  IF v_cheer.id IS NULL THEN RAISE EXCEPTION 'cheer_not_found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_goal FROM goal WHERE id = v_cheer.goal_id;

  IF v_payment.status = 'DONE' THEN
    SELECT clover_count INTO v_balance FROM clover_balance WHERE member_id = v_goal.member_id FOR UPDATE;
    IF v_balance IS NULL OR v_balance < v_cheer.clover_amount THEN
      UPDATE payment SET cancel_reconcile_required_at = now(),
        raw_response = COALESCE(raw_response, '{}'::jsonb)
          || jsonb_build_object('cancelReconcileRequired', COALESCE(p_detail, '{}'::jsonb))
        WHERE id = v_payment.id;
      INSERT INTO risk_event(member_id, type, detail)
        VALUES (v_goal.member_id, 'PAYMENT_CANCEL_BALANCE_INSUFFICIENT',
          COALESCE(p_detail, '{}'::jsonb) || jsonb_build_object(
            'orderId', p_order_id, 'balance', v_balance, 'required', v_cheer.clover_amount
          ));
      RETURN QUERY SELECT v_payment.id, v_payment.status, false, true;
      RETURN;
    END IF;
    UPDATE clover_balance
      SET clover_count = clover_count - v_cheer.clover_amount, updated_at = now()
      WHERE member_id = v_goal.member_id;
    INSERT INTO clover_ledger(member_id, entry_type, clover_delta, ref_type, ref_id, balance_after)
      VALUES (v_goal.member_id, 'REFUND_REVERSAL', -v_cheer.clover_amount, 'cheer', v_cheer.id, v_balance - v_cheer.clover_amount);
  END IF;

  UPDATE cheer SET status = 'REFUNDED' WHERE id = v_cheer.id;
  UPDATE payment SET status = 'CANCELED', payment_key = COALESCE(payment_key, p_payment_key),
    raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object('webhookCancellation', COALESCE(p_detail, '{}'::jsonb))
    WHERE id = v_payment.id;
  INSERT INTO payment_log(payment_id, from_status, to_status, detail)
    VALUES (v_payment.id, v_payment.status, 'CANCELED', COALESCE(p_detail, '{}'::jsonb) || jsonb_build_object('source', 'toss-webhook'));

  RETURN QUERY SELECT v_payment.id, 'CANCELED'::payment_status_enum, false, false;
END;
$$;

-- CREATE OR REPLACE는 기존 REVOKE/GRANT 권한을 그대로 유지하지만, 이 함수가
-- SECURITY DEFINER + 금전 RPC임을 감안해 명시적으로 재선언해 권한 표류를
-- 방지한다(20260716120000과 동일한 방어적 관례).
REVOKE ALL ON FUNCTION reconcile_canceled_payment(text, text, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reconcile_canceled_payment(text, text, integer, jsonb) TO service_role;
