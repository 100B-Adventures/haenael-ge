ALTER TABLE lead ADD COLUMN IF NOT EXISTS submitter_hash text;
CREATE INDEX IF NOT EXISTS lead_submitter_recent_idx ON lead(submitter_hash, created_at DESC) WHERE submitter_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION capture_lead(
  p_email text, p_instagram_handle text, p_consented_at timestamptz,
  p_source text, p_medium text, p_campaign text, p_content text,
  p_referrer text, p_landing_path text, p_submitter_hash text
)
RETURNS TABLE(lead_id bigint, is_duplicate boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('lead:' || p_submitter_hash, 0));
  IF (SELECT count(*) FROM lead WHERE submitter_hash = p_submitter_hash AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'lead_rate_limited' USING ERRCODE = 'P0001';
  END IF;
  SELECT id INTO v_id FROM lead
    WHERE (p_email IS NOT NULL AND lower(email) = lower(p_email))
       OR (p_instagram_handle IS NOT NULL AND lower(instagram_handle) = lower(p_instagram_handle))
    LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN QUERY SELECT v_id, true; RETURN; END IF;
  INSERT INTO lead(email, instagram_handle, consented_at, source, medium, campaign, content, referrer, landing_path, submitter_hash)
    VALUES(p_email, p_instagram_handle, p_consented_at, p_source, p_medium, p_campaign, p_content, p_referrer, p_landing_path, p_submitter_hash)
    RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, false;
END $$;
REVOKE ALL ON FUNCTION capture_lead(text,text,timestamptz,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION capture_lead(text,text,timestamptz,text,text,text,text,text,text,text) TO service_role;

ALTER TABLE payment ADD COLUMN IF NOT EXISTS partial_cancel_reviewed_at timestamptz;

CREATE OR REPLACE FUNCTION record_partial_cancel_review(
  p_order_id text, p_payment_key text, p_amount_krw integer, p_detail jsonb
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_payment payment%ROWTYPE; v_member_id uuid;
BEGIN
  SELECT * INTO v_payment FROM payment WHERE order_id = p_order_id FOR UPDATE;
  IF v_payment.id IS NULL THEN RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_payment.payment_key IS DISTINCT FROM p_payment_key OR v_payment.amount_krw != p_amount_krw THEN
    RAISE EXCEPTION 'payment_identity_mismatch' USING ERRCODE = '22023';
  END IF;
  IF v_payment.partial_cancel_reviewed_at IS NOT NULL THEN RETURN true; END IF;
  SELECT g.member_id INTO v_member_id FROM cheer c JOIN goal g ON g.id = c.goal_id WHERE c.payment_id = v_payment.id;
  IF v_member_id IS NULL THEN RAISE EXCEPTION 'payment_owner_not_found' USING ERRCODE = 'P0002'; END IF;
  UPDATE payment SET partial_cancel_reviewed_at = now(), raw_response = COALESCE(raw_response, '{}'::jsonb)
    || jsonb_build_object('partialCancelReview', COALESCE(p_detail, '{}'::jsonb)) WHERE id = v_payment.id;
  INSERT INTO risk_event(member_id, type, detail)
    VALUES(v_member_id, 'PARTIAL_CANCEL_REVIEW_REQUIRED', COALESCE(p_detail, '{}'::jsonb) || jsonb_build_object('orderId', p_order_id));
  RETURN false;
END $$;
REVOKE ALL ON FUNCTION record_partial_cancel_review(text,text,integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_partial_cancel_review(text,text,integer,jsonb) TO service_role;
