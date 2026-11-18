-- Round 3 review: provider-confirmed refund quantity is authoritative.
-- Production application remains gated by explicit deployment approval.
BEGIN;

CREATE OR REPLACE FUNCTION public.reverse_store_purchase(
  p_provider text,
  p_provider_transaction_id text,
  p_provider_event_id text,
  p_payload_hash text,
  p_refund_transaction_id text DEFAULT NULL,
  p_refund_amount_minor integer DEFAULT NULL,
  p_refund_clover_amount integer DEFAULT NULL,
  p_currency text DEFAULT NULL,
  p_refund_scope text DEFAULT NULL,
  p_occurred_at timestamptz DEFAULT NULL
)
RETURNS TABLE(purchase_id bigint, status text, clover_recovered integer, clover_shortfall integer, is_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_purchase public.store_purchase%ROWTYPE;
  v_owner_id uuid;
  v_balance integer;
  v_recovered integer;
  v_shortfall integer;
  v_refund_amount integer;
  v_refund_clover integer;
  v_total_refunded_amount integer;
  v_total_refunded_clover integer;
  v_expected_scope text;
  v_result_status text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_payload_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'invalid_payload_hash' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_purchase FROM public.store_purchase
  WHERE provider = p_provider AND provider_transaction_id = p_provider_transaction_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'purchase_not_found' USING ERRCODE = 'P0002'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.store_purchase_event
    WHERE provider = p_provider AND provider_event_id = p_provider_event_id
  ) THEN
    RETURN QUERY SELECT v_purchase.id, v_purchase.status, 0, 0, true;
    RETURN;
  END IF;

  IF p_refund_amount_minor IS NULL OR p_refund_amount_minor <= 0
     OR p_refund_clover_amount IS NULL OR p_refund_clover_amount <= 0 THEN
    RAISE EXCEPTION 'provider_refund_quantity_required' USING ERRCODE = '22023';
  END IF;
  v_refund_amount := p_refund_amount_minor;
  v_refund_clover := p_refund_clover_amount;
  v_total_refunded_amount := v_purchase.refunded_amount_minor + v_refund_amount;
  v_total_refunded_clover := v_purchase.refunded_clover_amount + v_refund_clover;
  IF v_total_refunded_amount > v_purchase.gross_amount_minor
     OR v_total_refunded_clover > v_purchase.clover_amount
     OR COALESCE(p_currency, v_purchase.currency) <> v_purchase.currency THEN
    RAISE EXCEPTION 'invalid_refund_amount' USING ERRCODE = '22023';
  END IF;

  v_expected_scope := CASE
    WHEN v_total_refunded_clover = v_purchase.clover_amount THEN 'FULL'
    ELSE 'PARTIAL'
  END;
  IF p_refund_scope IS NULL OR p_refund_scope <> v_expected_scope THEN
    RAISE EXCEPTION 'refund_scope_mismatch' USING ERRCODE = '22023';
  END IF;

  SELECT g.member_id INTO v_owner_id FROM public.goal AS g WHERE g.id = v_purchase.goal_id;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cashout_member:' || v_owner_id::text, 0)
  );
  INSERT INTO public.clover_balance(member_id, clover_count)
  VALUES (v_owner_id, 0) ON CONFLICT (member_id) DO NOTHING;
  SELECT clover_count INTO v_balance FROM public.clover_balance
  WHERE member_id = v_owner_id FOR UPDATE;

  v_recovered := LEAST(COALESCE(v_balance, 0), v_refund_clover);
  v_shortfall := v_refund_clover - v_recovered;
  IF v_recovered > 0 THEN
    INSERT INTO public.clover_ledger(member_id, entry_type, clover_delta, ref_type, ref_id, balance_after)
    VALUES (v_owner_id, 'REFUND_REVERSAL', -v_recovered, 'store_purchase', v_purchase.id, v_balance - v_recovered);
  END IF;

  UPDATE public.clover_maturity AS maturity
  SET clover_amount = CASE
        WHEN maturity.clover_amount <= v_refund_clover THEN maturity.clover_amount
        ELSE maturity.clover_amount - v_refund_clover
      END,
      reversed_at = CASE
        WHEN maturity.clover_amount <= v_refund_clover THEN COALESCE(maturity.reversed_at, now())
        ELSE maturity.reversed_at
      END
  WHERE maturity.purchase_id = v_purchase.id;

  v_result_status := CASE
    WHEN v_shortfall > 0 THEN 'RECOVERY_REQUIRED'
    WHEN v_total_refunded_clover = v_purchase.clover_amount THEN 'REFUNDED'
    ELSE 'PARTIALLY_REFUNDED'
  END;

  UPDATE public.cheer AS refunded_cheer
  SET status = CASE WHEN v_total_refunded_clover = v_purchase.clover_amount THEN 'REFUNDED' ELSE refunded_cheer.status END
  WHERE refunded_cheer.id = v_purchase.cheer_id
    AND refunded_cheer.status <> 'REFUNDED';

  IF v_shortfall > 0 THEN
    INSERT INTO public.store_recovery_case(purchase_id, member_id, clover_shortfall)
    VALUES (v_purchase.id, v_owner_id, v_shortfall)
    ON CONFLICT ON CONSTRAINT store_recovery_case_purchase_id_key DO UPDATE
    SET clover_shortfall = public.store_recovery_case.clover_shortfall + EXCLUDED.clover_shortfall,
        status = 'OPEN', resolved_at = NULL;
  END IF;

  UPDATE public.store_purchase
  SET status = v_result_status,
      refunded_amount_minor = v_total_refunded_amount,
      refunded_clover_amount = v_total_refunded_clover,
      refunded_at = CASE WHEN v_total_refunded_clover = clover_amount THEN COALESCE(refunded_at, now()) ELSE refunded_at END,
      updated_at = now()
  WHERE id = v_purchase.id;

  INSERT INTO public.store_purchase_event(
    purchase_id, provider, provider_event_id, provider_transaction_id,
    refund_transaction_id, event_type, refund_amount_minor, currency,
    refund_scope, occurred_at, normalization_status, payload_hash, result_code
  ) VALUES (
    v_purchase.id, p_provider, p_provider_event_id, p_provider_transaction_id,
    p_refund_transaction_id, 'REFUND', v_refund_amount, v_purchase.currency,
    v_expected_scope, COALESCE(p_occurred_at, now()), 'VERIFIED', p_payload_hash, v_result_status
  );

  RETURN QUERY SELECT v_purchase.id, v_result_status, v_recovered, v_shortfall, false;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_store_purchase(text,text,text,text,text,integer,integer,text,text,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_store_purchase(text,text,text,text,text,integer,integer,text,text,timestamptz)
  TO service_role;

COMMENT ON FUNCTION public.reverse_store_purchase(text,text,text,text,text,integer,integer,text,text,timestamptz)
  IS 'Uses provider-confirmed incremental refund quantity; never derives clover from refund amount.';

COMMIT;
