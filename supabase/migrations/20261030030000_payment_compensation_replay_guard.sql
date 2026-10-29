-- Make repeated compensation callbacks idempotent without weakening key checks.
-- The previous compensation migrations are immutable because staging applied them.
CREATE OR REPLACE FUNCTION record_payment_compensation(
  p_order_id text,
  p_payment_key text,
  p_amount_krw integer,
  p_target_status payment_status_enum,
  p_detail jsonb
)
RETURNS TABLE(payment_id bigint, status payment_status_enum)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment payment%ROWTYPE;
  v_goal_member_id uuid;
  v_next_detail jsonb;
  v_from_status payment_status_enum;
  c_max_amount_krw CONSTANT integer := 100000000;
BEGIN
  IF p_order_id IS NULL OR p_order_id !~ '^[A-Za-z0-9_=.-]{6,64}$' THEN
    RAISE EXCEPTION 'invalid_order_id' USING ERRCODE = '22023';
  END IF;

  IF p_payment_key IS NULL OR p_payment_key !~ '^[A-Za-z0-9_=.-]{6,200}$' THEN
    RAISE EXCEPTION 'invalid_payment_key' USING ERRCODE = '22023';
  END IF;

  IF p_amount_krw IS NULL OR p_amount_krw <= 0
     OR p_amount_krw % 1000 != 0
     OR p_amount_krw > c_max_amount_krw THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;

  IF p_target_status NOT IN ('CANCELED', 'FAILED') THEN
    RAISE EXCEPTION 'invalid_compensation_status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_payment
  FROM payment p
  WHERE p.order_id = p_order_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.amount_krw IS DISTINCT FROM p_amount_krw THEN
    RAISE EXCEPTION 'amount_mismatch' USING ERRCODE = '22023';
  END IF;

  IF v_payment.payment_key IS NOT NULL
     AND v_payment.payment_key IS DISTINCT FROM p_payment_key THEN
    RAISE EXCEPTION 'payment_key_mismatch' USING ERRCODE = '22023';
  END IF;

  IF v_payment.status = 'DONE' THEN
    RAISE EXCEPTION 'payment_already_done' USING ERRCODE = '22023';
  END IF;

  IF v_payment.status = 'CANCELED'
     OR (v_payment.status = 'FAILED' AND p_target_status = 'FAILED') THEN
    UPDATE payment
    SET payment_key = COALESCE(payment.payment_key, p_payment_key)
    WHERE id = v_payment.id
    RETURNING * INTO v_payment;
    RETURN QUERY SELECT v_payment.id, v_payment.status;
    RETURN;
  END IF;

  v_from_status := v_payment.status;
  v_next_detail := jsonb_build_object(
      'source', 'toss-confirm-compensation'
    ) || COALESCE(p_detail, '{}'::jsonb)
      || jsonb_build_object(
        'paymentKey', p_payment_key,
        'targetStatus', p_target_status
      );

  UPDATE payment
  SET
    status = p_target_status,
    payment_key = COALESCE(payment.payment_key, p_payment_key),
    raw_response = COALESCE(payment.raw_response, '{}'::jsonb)
      || jsonb_build_object('compensation', v_next_detail)
  WHERE id = v_payment.id
  RETURNING * INTO v_payment;

  INSERT INTO payment_log (payment_id, from_status, to_status, detail)
  VALUES (v_payment.id, v_from_status, p_target_status, v_next_detail);

  IF p_target_status = 'FAILED' THEN
    SELECT g.member_id INTO v_goal_member_id
    FROM cheer c
    JOIN goal g ON g.id = c.goal_id
    WHERE c.payment_id = v_payment.id
    LIMIT 1;

    IF v_goal_member_id IS NOT NULL THEN
      INSERT INTO risk_event (member_id, type, detail)
      VALUES (
        v_goal_member_id,
        'PAYMENT_RECONCILE_REQUIRED',
        v_next_detail
      );
    END IF;
  END IF;

  RETURN QUERY SELECT v_payment.id, v_payment.status;
END;
$$;

REVOKE ALL ON FUNCTION record_payment_compensation(
  text, text, integer, payment_status_enum, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION record_payment_compensation(
  text, text, integer, payment_status_enum, jsonb
) TO service_role;
