-- Mobile channel server endpoints: alternative payment atomic credit/reporting,
-- push-token ownership, and in-app account deletion with financial retention.
-- D-056/D-047. Local/staging first; production application requires approval.
BEGIN;

ALTER TABLE public.member
  ADD COLUMN deleted_at timestamptz;

ALTER TABLE public.device_push_token
  ADD COLUMN last_request_key text CHECK (
    last_request_key IS NULL OR last_request_key ~ '^[A-Za-z0-9_-]{8,128}$'
  );
CREATE UNIQUE INDEX device_push_token_member_request_idx
  ON public.device_push_token(member_id, last_request_key)
  WHERE last_request_key IS NOT NULL;

CREATE TABLE public.account_deletion_request (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE RESTRICT,
  request_key text NOT NULL CHECK (request_key ~ '^[A-Za-z0-9_-]{8,128}$'),
  status text NOT NULL CHECK (status IN ('PREPARED', 'AUTH_DELETED', 'FAILED')),
  prepared_at timestamptz NOT NULL DEFAULT now(),
  auth_deleted_at timestamptz,
  last_error_code text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, request_key)
);

ALTER TABLE public.account_deletion_request ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.account_deletion_request FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.account_deletion_request TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.account_deletion_request_id_seq TO service_role;

-- A hard Auth deletion must not cascade away finance/tax records. New members
-- still need a real auth.users row, enforced by the insert trigger below.
ALTER TABLE public.member DROP CONSTRAINT member_id_fkey;

CREATE OR REPLACE FUNCTION public.tombstone_member_before_auth_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.member AS m WHERE m.id = OLD.id) THEN
    RETURN OLD;
  END IF;

  INSERT INTO public.storage_cleanup_queue(
    profile_avatar_asset_id, bucket_id, object_path, reason, available_at
  )
  SELECT
    avatar.id,
    'profile-avatars',
    avatar.object_path,
    'PROFILE_AVATAR_ABANDONED',
    GREATEST(now(), avatar.created_at + interval '2 hours 5 minutes')
  FROM public.profile_avatar_asset AS avatar
  WHERE avatar.owner_member_id = OLD.id
    AND NOT EXISTS (
      SELECT 1 FROM public.storage_cleanup_queue AS queue
      WHERE queue.profile_avatar_asset_id = avatar.id
        AND queue.status IN ('PENDING', 'PROCESSING', 'FAILED')
    );
  UPDATE public.profile_avatar_asset
  SET status = 'DELETED', owner_member_id = NULL
  WHERE owner_member_id = OLD.id;

  DELETE FROM public.device_push_token WHERE member_id = OLD.id;
  DELETE FROM public.member_preference WHERE member_id = OLD.id;
  DELETE FROM public.notification WHERE member_id = OLD.id;
  DELETE FROM public.friend_connection
  WHERE member_low_id = OLD.id OR member_high_id = OLD.id;
  DELETE FROM public.friend_invite
  WHERE inviter_member_id = OLD.id OR accepted_by = OLD.id;
  DELETE FROM public.social_cheer_member_attribution WHERE supporter_member_id = OLD.id;
  DELETE FROM public.kyc_verification WHERE member_id = OLD.id;
  DELETE FROM public.admin_member WHERE member_id = OLD.id;

  UPDATE public.goal
  SET title = '삭제된 목표', reason = NULL, slug = 'deleted-' || id::text,
      status = 'DELETED', deleted_at = COALESCE(deleted_at, now()),
      active_cover_asset_id = NULL
  WHERE member_id = OLD.id;
  UPDATE public.cashout_request
  SET bank_code = NULL, account_no_enc = NULL, account_holder = NULL,
      account_masked = NULL, contact = NULL,
      account_purged_at = COALESCE(account_purged_at, now())
  WHERE member_id = OLD.id;
  UPDATE public.risk_event
  SET detail = jsonb_build_object('accountDeleted', true)
  WHERE member_id = OLD.id;
  UPDATE public.member
  SET provider = NULL, provider_id = NULL, nickname = NULL,
      profile_image = NULL, birth_date = NULL, kyc_status = 'NONE',
      ci = NULL, phone = NULL, bio = NULL,
      deleted_at = COALESCE(deleted_at, now())
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER tombstone_member_before_auth_delete
BEFORE DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tombstone_member_before_auth_delete();

REVOKE ALL ON FUNCTION public.tombstone_member_before_auth_delete()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.require_auth_user_for_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users AS u WHERE u.id = NEW.id) THEN
    RAISE EXCEPTION 'auth_user_not_found' USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER require_auth_user_for_member
BEFORE INSERT ON public.member
FOR EACH ROW EXECUTE FUNCTION public.require_auth_user_for_member();

CREATE OR REPLACE FUNCTION public.require_active_member_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_member_id uuid;
BEGIN
  v_member_id := COALESCE(
    (to_jsonb(NEW)->>'supporter_member_id')::uuid,
    (to_jsonb(NEW)->>'member_id')::uuid
  );
  IF NOT EXISTS (
    SELECT 1
    FROM public.member AS m
    JOIN auth.users AS u ON u.id = m.id
    WHERE m.id = v_member_id AND m.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'account_deleted' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER require_active_member_store_purchase_intent
BEFORE INSERT ON public.store_purchase_intent
FOR EACH ROW EXECUTE FUNCTION public.require_active_member_reference();
CREATE TRIGGER require_active_member_cashout
BEFORE INSERT ON public.cashout_request
FOR EACH ROW EXECUTE FUNCTION public.require_active_member_reference();
CREATE TRIGGER require_active_member_gift_exchange
BEFORE INSERT ON public.gift_exchange
FOR EACH ROW EXECUTE FUNCTION public.require_active_member_reference();

CREATE OR REPLACE FUNCTION public.credit_alternative_store_purchase(
  p_intent_id uuid,
  p_verified_member_id uuid,
  p_account_binding uuid,
  p_payment_key text,
  p_order_id text,
  p_product_id text,
  p_environment text,
  p_message text,
  p_is_anonymous boolean,
  p_request_key text,
  p_purchased_at timestamptz,
  p_external_transaction_token_enc bytea,
  p_user_tax_region text
)
RETURNS TABLE(
  purchase_id bigint,
  cheer_id bigint,
  clover_amount integer,
  available_at timestamptz,
  is_replay boolean,
  report_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_intent public.store_purchase_intent%ROWTYPE;
  v_catalog public.store_product_catalog%ROWTYPE;
  v_credit record;
  v_existing public.google_external_transaction%ROWTYPE;
  v_pretax integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF length(COALESCE(p_payment_key, '')) < 6
     OR length(COALESCE(p_order_id, '')) < 6
     OR p_external_transaction_token_enc IS NULL
     OR octet_length(p_external_transaction_token_enc) < 13
     OR p_user_tax_region !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid_alternative_payment' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_intent
  FROM public.store_purchase_intent
  WHERE id = p_intent_id
  FOR UPDATE;
  IF NOT FOUND OR v_intent.provider <> 'GOOGLE_ALTERNATIVE' THEN
    RAISE EXCEPTION 'purchase_intent_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_catalog
  FROM public.store_product_catalog AS catalog
  WHERE catalog.provider = 'GOOGLE_ALTERNATIVE'
    AND catalog.product_id = v_intent.product_id
    AND catalog.clover_amount = v_intent.clover_amount
    AND catalog.active;
  IF NOT FOUND OR v_catalog.product_id <> p_product_id THEN
    RAISE EXCEPTION 'product_catalog_mismatch' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing
  FROM public.google_external_transaction AS external_tx
  WHERE external_tx.external_transaction_id = p_order_id
  FOR UPDATE;
  IF FOUND AND v_existing.purchase_id <> COALESCE((
    SELECT purchase.id FROM public.store_purchase AS purchase
    WHERE purchase.intent_id = p_intent_id
  ), -1) THEN
    RAISE EXCEPTION 'transaction_binding_mismatch' USING ERRCODE = '23505';
  END IF;

  SELECT * INTO v_credit
  FROM public.credit_store_purchase(
    p_intent_id,
    p_verified_member_id,
    p_account_binding,
    'GOOGLE_ALTERNATIVE',
    p_payment_key,
    p_environment,
    v_catalog.product_id,
    v_catalog.currency,
    v_catalog.gross_amount_minor,
    v_catalog.clover_amount,
    p_message,
    p_is_anonymous,
    p_request_key,
    p_purchased_at,
    'GOOGLE_USER_CHOICE_BILLING'
  );

  v_pretax := (v_catalog.gross_amount_minor::bigint * 10 / 11)::integer;
  INSERT INTO public.google_external_transaction(
    purchase_id,
    external_transaction_token_enc,
    external_transaction_id,
    transaction_time,
    pretax_amount_minor,
    tax_amount_minor,
    user_tax_region,
    report_due_at,
    next_attempt_at
  ) VALUES (
    v_credit.purchase_id,
    p_external_transaction_token_enc,
    p_order_id,
    p_purchased_at,
    v_pretax,
    v_catalog.gross_amount_minor - v_pretax,
    p_user_tax_region,
    p_purchased_at + interval '24 hours',
    now()
  )
  ON CONFLICT ON CONSTRAINT google_external_transaction_pkey DO NOTHING;

  SELECT * INTO v_existing
  FROM public.google_external_transaction AS external_tx
  WHERE external_tx.purchase_id = v_credit.purchase_id;
  IF v_existing.external_transaction_id <> p_order_id THEN
    RAISE EXCEPTION 'transaction_binding_mismatch' USING ERRCODE = '23505';
  END IF;

  UPDATE public.payment AS payment
  SET payment_key = COALESCE(payment.payment_key, p_payment_key),
      raw_response = COALESCE(payment.raw_response, '{}'::jsonb) ||
        jsonb_build_object('tossOrderId', p_order_id, 'source', 'confirm-alternative-payment')
  WHERE payment.id = (
    SELECT purchase.payment_id FROM public.store_purchase AS purchase
    WHERE purchase.id = v_credit.purchase_id
  );

  RETURN QUERY SELECT
    v_credit.purchase_id,
    v_credit.cheer_id,
    v_credit.clover_amount,
    v_credit.available_at,
    v_credit.is_replay,
    v_existing.report_status;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_alternative_store_purchase(
  uuid,uuid,uuid,text,text,text,text,text,boolean,text,timestamptz,bytea,text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_alternative_store_purchase(
  uuid,uuid,uuid,text,text,text,text,text,boolean,text,timestamptz,bytea,text
) TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_account_deletion(
  p_member_id uuid,
  p_request_key text
)
RETURNS TABLE(status text, is_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_member public.member%ROWTYPE;
  v_existing public.account_deletion_request%ROWTYPE;
  v_balance integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_request_key !~ '^[A-Za-z0-9_-]{8,128}$' THEN
    RAISE EXCEPTION 'invalid_request_key' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('account_delete:' || p_member_id::text, 0)
  );
  SELECT * INTO v_member FROM public.member WHERE id = p_member_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_existing
  FROM public.account_deletion_request
  WHERE member_id = p_member_id AND request_key = p_request_key
  FOR UPDATE;
  IF FOUND AND v_existing.status IN ('PREPARED', 'AUTH_DELETED') THEN
    RETURN QUERY SELECT v_existing.status, true;
    RETURN;
  END IF;
  IF v_member.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'account_deletion_in_progress' USING ERRCODE = '55000';
  END IF;

  SELECT COALESCE(clover_count, 0) INTO v_balance
  FROM public.clover_balance WHERE member_id = p_member_id FOR UPDATE;
  IF COALESCE(v_balance, 0) <> 0 THEN
    RAISE EXCEPTION 'account_balance_remaining' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.cashout_request
    WHERE member_id = p_member_id
      AND status IN ('REQUESTED', 'KYC_PENDING', 'APPROVED', 'PAYOUT_SENT')
  ) THEN
    RAISE EXCEPTION 'cashout_in_progress' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.clover_maturity
    WHERE member_id = p_member_id AND released_at IS NULL AND reversed_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM public.gift_exchange
    WHERE member_id = p_member_id AND status IN ('PROVIDER_PENDING', 'PENDING_RECONCILIATION')
  ) OR EXISTS (
    SELECT 1 FROM public.store_recovery_case
    WHERE member_id = p_member_id AND status = 'OPEN'
  ) THEN
    RAISE EXCEPTION 'account_settlement_pending' USING ERRCODE = '55000';
  END IF;

  INSERT INTO public.account_deletion_request(member_id, request_key, status)
  VALUES (p_member_id, p_request_key, 'PREPARED')
  ON CONFLICT (member_id, request_key) DO UPDATE
  SET status = 'PREPARED', last_error_code = NULL, updated_at = now();

  UPDATE public.store_purchase_intent
  SET status = 'CANCELED'
  WHERE supporter_member_id = p_member_id AND status = 'CREATED';
  DELETE FROM public.device_push_token WHERE member_id = p_member_id;
  DELETE FROM public.member_preference WHERE member_id = p_member_id;
  DELETE FROM public.notification WHERE member_id = p_member_id;
  DELETE FROM public.friend_connection
  WHERE member_low_id = p_member_id OR member_high_id = p_member_id;
  DELETE FROM public.friend_invite
  WHERE inviter_member_id = p_member_id OR accepted_by = p_member_id;
  DELETE FROM public.social_cheer_member_attribution WHERE supporter_member_id = p_member_id;
  DELETE FROM public.kyc_verification WHERE member_id = p_member_id;
  DELETE FROM public.admin_member WHERE member_id = p_member_id;

  UPDATE public.goal
  SET title = '삭제된 목표', reason = NULL, slug = 'deleted-' || id::text,
      status = 'DELETED', deleted_at = COALESCE(deleted_at, now()),
      active_cover_asset_id = NULL
  WHERE member_id = p_member_id;

  UPDATE public.cashout_request
  SET bank_code = NULL, account_no_enc = NULL, account_holder = NULL,
      account_masked = NULL, contact = NULL,
      account_purged_at = COALESCE(account_purged_at, now())
  WHERE member_id = p_member_id;
  UPDATE public.risk_event
  SET detail = jsonb_build_object('accountDeleted', true)
  WHERE member_id = p_member_id;
  UPDATE public.member
  SET provider = NULL, provider_id = NULL, nickname = NULL,
      profile_image = NULL, birth_date = NULL, kyc_status = 'NONE',
      ci = NULL, phone = NULL, bio = NULL, deleted_at = now()
  WHERE id = p_member_id;

  RETURN QUERY SELECT 'PREPARED'::text, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_account_deletion(
  p_member_id uuid,
  p_request_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.account_deletion_request
  SET status = 'AUTH_DELETED', auth_deleted_at = COALESCE(auth_deleted_at, now()),
      last_error_code = NULL, updated_at = now()
  WHERE member_id = p_member_id AND request_key = p_request_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'account_deletion_request_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid,text),
  public.complete_account_deletion(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(uuid,text),
  public.complete_account_deletion(uuid,text) TO service_role;

COMMENT ON TABLE public.account_deletion_request IS
  'In-app account deletion audit state. It contains no profile or credential data.';
COMMENT ON COLUMN public.member.deleted_at IS
  'Account deletion tombstone. Financial rows retain this pseudonymous key after auth.users is removed.';
COMMENT ON FUNCTION public.prepare_account_deletion(uuid,text) IS
  'Blocks unsettled money, removes nonfinancial personal data and push tokens, and prepares hard Auth deletion.';

COMMIT;
