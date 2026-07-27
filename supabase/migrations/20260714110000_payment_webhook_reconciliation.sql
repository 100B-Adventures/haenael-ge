-- Idempotent cancellation reconciliation for Toss PAYMENT_STATUS_CHANGED.

CREATE OR REPLACE FUNCTION reconcile_canceled_payment(
  p_order_id text,
  p_payment_key text,
  p_amount_krw integer,
  p_detail jsonb
)
RETURNS TABLE(payment_id bigint, payment_status payment_status_enum, idempotent boolean)
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
  IF v_payment.amount_krw != p_amount_krw THEN RAISE EXCEPTION 'amount_mismatch' USING ERRCODE = '22023'; END IF;
  IF v_payment.payment_key IS NOT NULL AND v_payment.payment_key != p_payment_key THEN
    RAISE EXCEPTION 'payment_key_mismatch' USING ERRCODE = '22023';
  END IF;

  IF v_payment.status = 'CANCELED' THEN
    RETURN QUERY SELECT v_payment.id, v_payment.status, true;
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
      RAISE EXCEPTION 'insufficient_clover_for_refund' USING ERRCODE = '22023';
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

  RETURN QUERY SELECT v_payment.id, 'CANCELED'::payment_status_enum, false;
END;
$$;

REVOKE ALL ON FUNCTION reconcile_canceled_payment(text, text, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reconcile_canceled_payment(text, text, integer, jsonb) TO service_role;

