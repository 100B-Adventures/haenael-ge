-- 실제 Toss CANCELED webhook이 성공하면 선행 보상 실패의 수동 정산 표식도 함께 해소한다.
-- 이미 CANCELED로 수렴한 결제의 webhook 재시도도 이전 배포에서 남은 표식을 정리한다.

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

  IF v_payment.amount_krw IS DISTINCT FROM p_amount_krw THEN
    RAISE EXCEPTION 'amount_mismatch' USING ERRCODE = '22023';
  END IF;

  IF v_payment.payment_key IS DISTINCT FROM p_payment_key THEN
    RAISE EXCEPTION 'payment_key_mismatch' USING ERRCODE = '22023';
  END IF;

  IF v_payment.status = 'CANCELED' THEN
    UPDATE risk_event
      SET resolved = true,
          detail = COALESCE(detail, '{}'::jsonb) || jsonb_build_object(
            'resolvedBy', 'toss-canceled-webhook',
            'resolvedOrderId', p_order_id
          )
      WHERE type = 'PAYMENT_RECONCILE_REQUIRED'
        AND resolved = false
        AND detail->>'paymentKey' = p_payment_key;
    RETURN QUERY SELECT v_payment.id, v_payment.status, true, false;
    RETURN;
  END IF;

  IF v_payment.cancel_reconcile_required_at IS NOT NULL THEN
    RETURN QUERY SELECT v_payment.id, v_payment.status, true, true;
    RETURN;
  END IF;

  IF v_payment.status NOT IN ('READY', 'DONE', 'FAILED') THEN
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

  UPDATE risk_event
    SET resolved = true,
        detail = COALESCE(detail, '{}'::jsonb) || jsonb_build_object(
          'resolvedBy', 'toss-canceled-webhook',
          'resolvedOrderId', p_order_id
        )
    WHERE type = 'PAYMENT_RECONCILE_REQUIRED'
      AND resolved = false
      AND detail->>'paymentKey' = p_payment_key;

  RETURN QUERY SELECT v_payment.id, 'CANCELED'::payment_status_enum, false, false;
END;
$$;

REVOKE ALL ON FUNCTION reconcile_canceled_payment(text, text, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reconcile_canceled_payment(text, text, integer, jsonb) TO service_role;
