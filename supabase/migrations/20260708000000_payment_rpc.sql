-- =============================================================================
-- payment_rpc — B2 test payment order/confirm transaction helpers
-- =============================================================================
-- Purpose:
--   Edge Functions call these SECURITY DEFINER functions with service_role only.
--   The database keeps payment -> cheer -> ledger transitions atomic.
-- =============================================================================

CREATE OR REPLACE FUNCTION create_cheer_order(
  p_goal_id bigint,
  p_order_id text,
  p_amount_krw integer,
  p_clover_amount integer,
  p_display_name text,
  p_is_anonymous boolean,
  p_message text,
  p_pg_customer_key text
)
RETURNS TABLE(payment_id bigint, cheer_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_goal_id bigint;
  v_payment_id bigint;
  v_cheer_id bigint;
BEGIN
  IF p_order_id IS NULL OR p_order_id !~ '^[A-Za-z0-9_=.-]{6,64}$' THEN
    RAISE EXCEPTION 'invalid_order_id' USING ERRCODE = '22023';
  END IF;

  IF p_amount_krw NOT IN (1000, 3000, 5000, 10000) THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;

  IF p_clover_amount != p_amount_krw THEN
    RAISE EXCEPTION 'amount_mismatch' USING ERRCODE = '22023';
  END IF;

  IF p_message IS NOT NULL AND length(p_message) > 140 THEN
    RAISE EXCEPTION 'message_too_long' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_goal_id
  FROM goal
  WHERE id = p_goal_id
    AND status = 'ACTIVE'
    AND deleted_at IS NULL
  FOR SHARE;

  IF v_goal_id IS NULL THEN
    RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO payment (
    order_id,
    amount_krw,
    status,
    pg_customer_key
  )
  VALUES (
    p_order_id,
    p_amount_krw,
    'READY',
    COALESCE(NULLIF(p_pg_customer_key, ''), 'ANONYMOUS')
  )
  RETURNING id INTO v_payment_id;

  INSERT INTO cheer (
    goal_id,
    payment_id,
    display_name,
    is_anonymous,
    message,
    clover_amount,
    status
  )
  VALUES (
    p_goal_id,
    v_payment_id,
    CASE WHEN p_is_anonymous THEN NULL ELSE NULLIF(left(trim(COALESCE(p_display_name, '')), 30), '') END,
    COALESCE(p_is_anonymous, false),
    NULLIF(left(trim(COALESCE(p_message, '')), 140), ''),
    p_clover_amount,
    'PENDING'
  )
  RETURNING id INTO v_cheer_id;

  INSERT INTO payment_log (payment_id, from_status, to_status, detail)
  VALUES (v_payment_id, NULL, 'READY', jsonb_build_object('source', 'create_cheer_order'));

  RETURN QUERY SELECT v_payment_id, v_cheer_id;
END;
$$;

CREATE OR REPLACE FUNCTION confirm_cheer_payment(
  p_order_id text,
  p_payment_key text,
  p_amount_krw integer,
  p_method text,
  p_approved_at timestamptz,
  p_receipt_url text,
  p_raw_response jsonb
)
RETURNS TABLE(
  payment_id bigint,
  cheer_id bigint,
  member_id uuid,
  goal_title text,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment payment%ROWTYPE;
  v_cheer cheer%ROWTYPE;
  v_goal goal%ROWTYPE;
  v_prev_balance integer;
  v_next_balance integer;
BEGIN
  SELECT * INTO v_payment
  FROM payment
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.amount_krw != p_amount_krw THEN
    RAISE EXCEPTION 'amount_mismatch' USING ERRCODE = '22023';
  END IF;

  IF p_payment_key IS NULL OR length(trim(p_payment_key)) = 0 OR length(p_payment_key) > 200 THEN
    RAISE EXCEPTION 'invalid_payment_key' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_cheer
  FROM cheer
  WHERE cheer.payment_id = v_payment.id
  FOR UPDATE;

  IF v_cheer.id IS NULL THEN
    RAISE EXCEPTION 'cheer_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_goal
  FROM goal
  WHERE id = v_cheer.goal_id
  FOR UPDATE;

  IF v_goal.id IS NULL THEN
    RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.status = 'DONE' THEN
    RETURN QUERY SELECT
      v_payment.id,
      v_cheer.id,
      v_goal.member_id,
      v_goal.title,
      COALESCE(v_cheer.display_name, '익명의 누군가');
    RETURN;
  END IF;

  IF v_payment.status != 'READY' THEN
    RAISE EXCEPTION 'invalid_payment_status' USING ERRCODE = '22023';
  END IF;

  INSERT INTO clover_balance (member_id, clover_count, updated_at)
  VALUES (v_goal.member_id, 0, now())
  ON CONFLICT (member_id) DO NOTHING;

  SELECT COALESCE(clover_count, 0) INTO v_prev_balance
  FROM clover_balance
  WHERE clover_balance.member_id = v_goal.member_id
  FOR UPDATE;

  v_prev_balance := COALESCE(v_prev_balance, 0);
  v_next_balance := v_prev_balance + v_cheer.clover_amount;

  UPDATE payment
  SET
    status = 'DONE',
    payment_key = p_payment_key,
    method = NULLIF(p_method, ''),
    approved_at = COALESCE(p_approved_at, now()),
    receipt_url = NULLIF(p_receipt_url, ''),
    raw_response = COALESCE(p_raw_response, '{}'::jsonb)
  WHERE id = v_payment.id;

  UPDATE cheer
  SET status = 'CONFIRMED'
  WHERE id = v_cheer.id;

  INSERT INTO payment_log (payment_id, from_status, to_status, detail)
  VALUES (
    v_payment.id,
    'READY',
    'DONE',
    jsonb_build_object('source', 'confirm_cheer_payment', 'paymentKey', p_payment_key)
  );

  INSERT INTO clover_ledger (
    member_id,
    entry_type,
    clover_delta,
    ref_type,
    ref_id,
    balance_after
  )
  VALUES (
    v_goal.member_id,
    'EARN',
    v_cheer.clover_amount,
    'cheer',
    v_cheer.id,
    v_next_balance
  );

  RETURN QUERY SELECT
    v_payment.id,
    v_cheer.id,
    v_goal.member_id,
    v_goal.title,
    COALESCE(v_cheer.display_name, '익명의 누군가');
END;
$$;

REVOKE ALL ON FUNCTION create_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION confirm_cheer_payment(
  text, text, integer, text, timestamptz, text, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION create_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text
) TO service_role;

GRANT EXECUTE ON FUNCTION confirm_cheer_payment(
  text, text, integer, text, timestamptz, text, jsonb
) TO service_role;
