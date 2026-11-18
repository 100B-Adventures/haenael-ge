-- App channels review round 6: one credit entry point for every payment channel.
-- Production application requires a separately approved migration.

BEGIN;

CREATE TABLE public.purchase_credit_operation (
  operation_key text PRIMARY KEY,
  channel text NOT NULL CHECK (channel IN (
    'APPLE', 'GOOGLE_PLAY', 'GOOGLE_ALTERNATIVE', 'TOSS_IAP', 'WEB_TOSS'
  )),
  reference_id text NOT NULL,
  supporter_member_id uuid REFERENCES public.member(id) ON DELETE RESTRICT,
  recipient_member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE RESTRICT,
  store_intent_id uuid REFERENCES public.store_purchase_intent(id) ON DELETE RESTRICT,
  payment_id bigint REFERENCES public.payment(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'VERIFYING' CHECK (status IN (
    'VERIFYING', 'CREDITED', 'CANCELED', 'RECOVERY_REQUIRED'
  )),
  ownership_fingerprint text NOT NULL CHECK (ownership_fingerprint ~ '^[a-f0-9]{64}$'),
  started_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((store_intent_id IS NOT NULL)::integer + (payment_id IS NOT NULL)::integer = 1),
  CHECK ((status IN ('CREDITED', 'CANCELED')) = (settled_at IS NOT NULL)),
  UNIQUE (channel, reference_id)
);

CREATE INDEX purchase_credit_operation_supporter_open_idx
  ON public.purchase_credit_operation(supporter_member_id, status)
  WHERE status IN ('VERIFYING', 'RECOVERY_REQUIRED');
CREATE INDEX purchase_credit_operation_recipient_open_idx
  ON public.purchase_credit_operation(recipient_member_id, status)
  WHERE status IN ('VERIFYING', 'RECOVERY_REQUIRED');

ALTER TABLE public.purchase_credit_operation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.purchase_credit_operation FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.purchase_credit_operation TO service_role;

COMMENT ON TABLE public.purchase_credit_operation IS
  'Server-owned provider-verification and credit operation. Every payment channel must enter through credit_purchase.';

CREATE OR REPLACE FUNCTION public.account_deletion_has_pending_payment(
  p_member_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.purchase_credit_operation AS operation
    WHERE (operation.supporter_member_id = p_member_id
        OR operation.recipient_member_id = p_member_id)
      AND operation.status IN ('VERIFYING', 'RECOVERY_REQUIRED')
  ) OR EXISTS (
    SELECT 1
    FROM public.alternative_payment_confirmation AS confirmation
    WHERE confirmation.member_id = p_member_id
      AND confirmation.status IN (
        'CONFIRMING', 'RECONCILIATION_REQUIRED', 'RECOVERY_REQUIRED'
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.store_purchase_intent AS intent
    JOIN public.goal AS target_goal ON target_goal.id = intent.goal_id
    WHERE (intent.supporter_member_id = p_member_id
        OR target_goal.member_id = p_member_id)
      AND intent.status = 'CREATED'
  ) OR EXISTS (
    SELECT 1
    FROM public.payment AS pending_payment
    JOIN public.cheer AS pending_cheer ON pending_cheer.payment_id = pending_payment.id
    JOIN public.goal AS target_goal ON target_goal.id = pending_cheer.goal_id
    LEFT JOIN public.social_cheer_member_attribution AS attribution
      ON attribution.cheer_id = pending_cheer.id
    WHERE (target_goal.member_id = p_member_id
        OR attribution.supporter_member_id = p_member_id)
      AND pending_payment.status = 'READY'
  ) OR EXISTS (
    SELECT 1
    FROM public.store_recovery_case AS recovery
    WHERE recovery.member_id = p_member_id
      AND recovery.status = 'OPEN'
  );
$$;

CREATE OR REPLACE FUNCTION public.account_deletion_assert_nonpayment_clear(
  p_member_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance integer;
BEGIN
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
    WHERE member_id = p_member_id
      AND status IN ('PROVIDER_PENDING', 'PENDING_RECONCILIATION')
  ) THEN
    RAISE EXCEPTION 'account_settlement_pending' USING ERRCODE = '55000';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_account_deletion(
  p_member_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job public.account_deletion_job%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || p_member_id::text, 0)
  );
  PERFORM 1 FROM public.member WHERE id = p_member_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.account_deletion_job(member_id, status)
  VALUES (p_member_id, 'REQUESTED')
  ON CONFLICT (member_id) DO NOTHING;
  SELECT * INTO v_job FROM public.account_deletion_job
  WHERE member_id = p_member_id FOR UPDATE;
  IF v_job.status IN ('EXTERNAL_REVOKED', 'DATA_DELETED', 'AUTH_DELETED') THEN
    RETURN v_job.status;
  END IF;

  PERFORM public.account_deletion_assert_nonpayment_clear(p_member_id);
  IF public.account_deletion_has_pending_payment(p_member_id) THEN
    UPDATE public.account_deletion_job
    SET status = 'BLOCKED_PENDING_PAYMENT',
        blocked_reason = 'account_settlement_pending', updated_at = now()
    WHERE member_id = p_member_id;
    RETURN 'BLOCKED_PENDING_PAYMENT';
  END IF;

  UPDATE public.account_deletion_job
  SET status = 'REQUESTED', blocked_reason = NULL, last_error_code = NULL,
      updated_at = now()
  WHERE member_id = p_member_id;
  RETURN 'REQUESTED';
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_account_deletion_external_revoked(
  p_member_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || p_member_id::text, 0)
  );
  SELECT status INTO v_status FROM public.account_deletion_job
  WHERE member_id = p_member_id FOR UPDATE;
  IF v_status IN ('EXTERNAL_REVOKED', 'DATA_DELETED', 'AUTH_DELETED') THEN
    RETURN v_status;
  END IF;
  IF v_status NOT IN ('REQUESTED', 'BLOCKED_PENDING_PAYMENT') THEN
    RAISE EXCEPTION 'account_deletion_state_invalid' USING ERRCODE = '55000';
  END IF;
  PERFORM public.account_deletion_assert_nonpayment_clear(p_member_id);
  IF public.account_deletion_has_pending_payment(p_member_id) THEN
    UPDATE public.account_deletion_job
    SET status = 'BLOCKED_PENDING_PAYMENT',
        blocked_reason = 'account_settlement_pending', updated_at = now()
    WHERE member_id = p_member_id;
    RETURN 'BLOCKED_PENDING_PAYMENT';
  END IF;
  UPDATE public.account_deletion_job
  SET status = 'EXTERNAL_REVOKED', external_revoked_at = COALESCE(external_revoked_at, now()),
      blocked_reason = NULL, last_error_code = NULL, updated_at = now()
  WHERE member_id = p_member_id;
  RETURN 'EXTERNAL_REVOKED';
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_account_data(
  p_member_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || p_member_id::text, 0)
  );
  SELECT status INTO v_status FROM public.account_deletion_job
  WHERE member_id = p_member_id FOR UPDATE;
  IF v_status IN ('DATA_DELETED', 'AUTH_DELETED') THEN
    RETURN v_status;
  END IF;
  IF v_status IS NULL OR v_status <> 'EXTERNAL_REVOKED' THEN
    RAISE EXCEPTION 'account_deletion_state_invalid' USING ERRCODE = '55000';
  END IF;
  PERFORM public.account_deletion_assert_nonpayment_clear(p_member_id);
  IF public.account_deletion_has_pending_payment(p_member_id) THEN
    RAISE EXCEPTION 'account_settlement_pending' USING ERRCODE = '55000';
  END IF;

  UPDATE public.store_purchase_intent SET status = 'CANCELED'
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
  DELETE FROM public.profile_avatar_asset WHERE owner_member_id = p_member_id;
  DELETE FROM public.goal_cover_asset WHERE owner_member_id = p_member_id;

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
  SET detail = pg_catalog.jsonb_build_object('accountDeleted', true)
  WHERE member_id = p_member_id;
  UPDATE public.member
  SET provider = NULL, provider_id = NULL, nickname = NULL,
      profile_image = NULL, birth_date = NULL, kyc_status = 'NONE',
      ci = NULL, phone = NULL, bio = NULL,
      deleted_at = COALESCE(deleted_at, now())
  WHERE id = p_member_id;
  UPDATE public.account_deletion_job
  SET status = 'DATA_DELETED', data_deleted_at = COALESCE(data_deleted_at, now()),
      updated_at = now()
  WHERE member_id = p_member_id;
  RETURN 'DATA_DELETED';
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_purchase(
  p_action text,
  p_channel text,
  p_reference text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_secret bytea DEFAULT NULL
)
RETURNS TABLE(
  operation_status text,
  purchase_id bigint,
  cheer_id bigint,
  member_id uuid,
  clover_amount integer,
  available_at timestamptz,
  is_replay boolean,
  report_status text,
  goal_title text,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_intent public.store_purchase_intent%ROWTYPE;
  v_payment public.payment%ROWTYPE;
  v_cheer public.cheer%ROWTYPE;
  v_goal public.goal%ROWTYPE;
  v_operation public.purchase_credit_operation%ROWTYPE;
  v_supporter uuid;
  v_recipient uuid;
  v_store_credit record;
  v_alt_credit record;
  v_web_credit record;
  v_operation_key text;
  v_fingerprint text;
  v_first uuid;
  v_second uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('BEGIN', 'CREDIT', 'CANCELED', 'RECOVERY_REQUIRED')
     OR p_channel NOT IN ('APPLE', 'GOOGLE_PLAY', 'GOOGLE_ALTERNATIVE', 'TOSS_IAP', 'WEB_TOSS')
     OR length(COALESCE(p_reference, '')) < 1 THEN
    RAISE EXCEPTION 'invalid_credit_operation' USING ERRCODE = '22023';
  END IF;

  v_operation_key := p_channel || ':' || p_reference;
  IF p_channel = 'WEB_TOSS' THEN
    SELECT * INTO v_payment FROM public.payment
    WHERE order_id = p_reference;
    IF v_payment.id IS NULL THEN
      RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
    END IF;
    SELECT * INTO v_cheer FROM public.cheer
    WHERE payment_id = v_payment.id;
    SELECT * INTO v_goal FROM public.goal
    WHERE id = v_cheer.goal_id;
    SELECT attribution.supporter_member_id INTO v_supporter
    FROM public.social_cheer_member_attribution AS attribution
    WHERE attribution.cheer_id = v_cheer.id;
    v_recipient := v_goal.member_id;
    v_fingerprint := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
      p_channel || ':' || v_payment.id::text || ':' || v_cheer.id::text || ':' || v_recipient::text || ':' || COALESCE(v_supporter::text, 'ANONYMOUS'),
      'UTF8'), 'sha256'), 'hex');
  ELSE
    BEGIN
      SELECT * INTO v_intent FROM public.store_purchase_intent
      WHERE id = p_reference::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'purchase_intent_invalid' USING ERRCODE = '22023';
    END;
    IF v_intent.id IS NULL THEN
      RAISE EXCEPTION 'purchase_intent_invalid' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_goal FROM public.goal WHERE id = v_intent.goal_id;
    IF v_intent.provider <> p_channel THEN
      RAISE EXCEPTION 'purchase_intent_invalid' USING ERRCODE = '22023';
    END IF;
    v_supporter := v_intent.supporter_member_id;
    v_recipient := v_goal.member_id;
    v_fingerprint := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
      p_channel || ':' || v_intent.id::text || ':' || v_supporter::text || ':' || v_recipient::text || ':' || v_intent.account_binding::text || ':' || v_intent.request_key,
      'UTF8'), 'sha256'), 'hex');
  END IF;

  IF v_supporter IS NULL OR v_supporter = v_recipient THEN
    v_first := v_recipient;
    v_second := NULL;
  ELSIF v_supporter::text < v_recipient::text THEN
    v_first := v_supporter;
    v_second := v_recipient;
  ELSE
    v_first := v_recipient;
    v_second := v_supporter;
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('member_settlement:' || v_first::text, 0)
  );
  IF v_second IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('member_settlement:' || v_second::text, 0)
    );
  END IF;

  IF p_channel = 'WEB_TOSS' THEN
    SELECT * INTO v_payment FROM public.payment
    WHERE order_id = p_reference FOR UPDATE;
    SELECT * INTO v_cheer FROM public.cheer
    WHERE payment_id = v_payment.id FOR UPDATE;
    SELECT * INTO v_goal FROM public.goal
    WHERE id = v_cheer.goal_id FOR UPDATE;
    IF v_payment.id IS NULL OR v_goal.member_id <> v_recipient THEN
      RAISE EXCEPTION 'transaction_owner_mismatch' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT * INTO v_intent FROM public.store_purchase_intent
    WHERE id = p_reference::uuid FOR UPDATE;
    SELECT * INTO v_goal FROM public.goal WHERE id = v_intent.goal_id FOR UPDATE;
    IF v_intent.provider <> p_channel
       OR v_intent.supporter_member_id <> v_supporter
       OR v_goal.member_id <> v_recipient
       OR NULLIF(p_payload->>'verified_member_id', '')::uuid IS DISTINCT FROM v_supporter
       OR NULLIF(p_payload->>'account_binding', '')::uuid IS DISTINCT FROM v_intent.account_binding
       OR COALESCE(p_payload->>'request_key', '') <> v_intent.request_key THEN
      RAISE EXCEPTION 'transaction_owner_mismatch' USING ERRCODE = '23514';
    END IF;
  END IF;

  SELECT * INTO v_operation FROM public.purchase_credit_operation
  WHERE operation_key = v_operation_key FOR UPDATE;

  IF p_action = 'BEGIN' THEN
    IF NOT (p_channel = 'WEB_TOSS' AND v_payment.status = 'DONE') AND EXISTS (
      SELECT 1 FROM public.account_deletion_job AS deletion_job
      WHERE deletion_job.member_id IN (v_recipient, v_supporter)
    ) THEN
      RAISE EXCEPTION 'account_deletion_in_progress' USING ERRCODE = '55000';
    END IF;
    IF v_operation.operation_key IS NOT NULL THEN
      IF v_operation.ownership_fingerprint <> v_fingerprint THEN
        RAISE EXCEPTION 'transaction_owner_mismatch' USING ERRCODE = '23514';
      END IF;
      RETURN QUERY SELECT v_operation.status, NULL::bigint, NULL::bigint,
        v_recipient, NULL::integer, NULL::timestamptz,
        (v_operation.status = 'CREDITED'), NULL::text, NULL::text, NULL::text;
      RETURN;
    END IF;
    INSERT INTO public.purchase_credit_operation(
      operation_key, channel, reference_id, supporter_member_id,
      recipient_member_id, store_intent_id, payment_id, status,
      ownership_fingerprint, settled_at
    ) VALUES (
      v_operation_key, p_channel, p_reference, v_supporter, v_recipient,
      CASE WHEN p_channel = 'WEB_TOSS' THEN NULL ELSE v_intent.id END,
      CASE WHEN p_channel = 'WEB_TOSS' THEN v_payment.id ELSE NULL END,
      CASE WHEN p_channel = 'WEB_TOSS' AND v_payment.status = 'DONE'
        THEN 'CREDITED' ELSE 'VERIFYING' END,
      v_fingerprint,
      CASE WHEN p_channel = 'WEB_TOSS' AND v_payment.status = 'DONE'
        THEN now() ELSE NULL END
    );
    IF p_channel = 'GOOGLE_ALTERNATIVE' THEN
      PERFORM public.begin_alternative_payment_confirmation(
        v_intent.id, v_supporter, v_intent.request_key
      );
    END IF;
    RETURN QUERY SELECT CASE WHEN p_channel = 'WEB_TOSS' AND v_payment.status = 'DONE'
        THEN 'CREDITED' ELSE 'VERIFYING' END,
      NULL::bigint, NULL::bigint,
      v_recipient, NULL::integer, NULL::timestamptz,
      false, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_operation.operation_key IS NULL
     OR v_operation.ownership_fingerprint <> v_fingerprint THEN
    RAISE EXCEPTION 'payment_confirmation_not_started' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.account_deletion_job AS deletion_job
    WHERE deletion_job.member_id IN (v_recipient, v_supporter)
      AND deletion_job.status <> 'BLOCKED_PENDING_PAYMENT'
  ) THEN
    RAISE EXCEPTION 'account_deletion_in_progress' USING ERRCODE = '55000';
  END IF;

  IF p_action IN ('CANCELED', 'RECOVERY_REQUIRED') THEN
    IF p_action = 'CANCELED' AND p_channel = 'GOOGLE_ALTERNATIVE' THEN
      PERFORM public.settle_alternative_payment_confirmation(
        v_intent.id, v_supporter, 'CANCELED'
      );
    ELSIF p_action = 'CANCELED' AND p_channel <> 'WEB_TOSS' THEN
      UPDATE public.store_purchase_intent
      SET status = 'CANCELED'
      WHERE id = v_intent.id AND status = 'CREATED';
    ELSIF p_action = 'RECOVERY_REQUIRED'
       AND p_channel = 'GOOGLE_ALTERNATIVE'
       AND NULLIF(p_payload->>'payment_key', '') IS NOT NULL
       AND NULLIF(p_payload->>'order_id', '') IS NOT NULL THEN
      PERFORM public.record_alternative_payment_recovery(
        v_intent.id,
        v_supporter,
        p_payload->>'payment_key',
        p_payload->>'order_id',
        v_intent.request_key
      );
    END IF;
    UPDATE public.purchase_credit_operation
    SET status = p_action,
        settled_at = CASE WHEN p_action = 'CANCELED' THEN now() ELSE NULL END,
        updated_at = now()
    WHERE operation_key = v_operation_key;
    RETURN QUERY SELECT p_action, NULL::bigint, NULL::bigint,
      v_recipient, NULL::integer, NULL::timestamptz,
      false, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_operation.status NOT IN ('VERIFYING', 'CREDITED') THEN
    RAISE EXCEPTION 'payment_confirmation_state_invalid' USING ERRCODE = '55000';
  END IF;

  IF p_channel IN ('APPLE', 'GOOGLE_PLAY', 'TOSS_IAP') THEN
    SELECT * INTO v_store_credit FROM public.credit_store_purchase(
      v_intent.id,
      (p_payload->>'verified_member_id')::uuid,
      (p_payload->>'account_binding')::uuid,
      p_channel,
      p_payload->>'provider_transaction_id',
      p_payload->>'environment',
      p_payload->>'product_id',
      p_payload->>'currency',
      (p_payload->>'gross_amount_minor')::integer,
      (p_payload->>'clover_amount')::integer,
      COALESCE(p_payload->>'message', ''),
      COALESCE((p_payload->>'is_anonymous')::boolean, false),
      p_payload->>'request_key',
      (p_payload->>'purchased_at')::timestamptz,
      NULLIF(p_payload->>'policy_risk', '')
    );
    UPDATE public.purchase_credit_operation SET status = 'CREDITED',
      settled_at = COALESCE(settled_at, now()), updated_at = now()
    WHERE operation_key = v_operation_key;
    RETURN QUERY SELECT 'CREDITED', v_store_credit.purchase_id,
      v_store_credit.cheer_id, v_recipient, v_store_credit.clover_amount,
      v_store_credit.available_at, v_store_credit.is_replay,
      NULL::text, v_goal.title, NULL::text;
    RETURN;
  ELSIF p_channel = 'GOOGLE_ALTERNATIVE' THEN
    SELECT * INTO v_alt_credit FROM public.credit_alternative_store_purchase(
      v_intent.id,
      (p_payload->>'verified_member_id')::uuid,
      (p_payload->>'account_binding')::uuid,
      p_payload->>'payment_key',
      p_payload->>'order_id',
      p_payload->>'product_id',
      p_payload->>'environment',
      COALESCE(p_payload->>'message', ''),
      COALESCE((p_payload->>'is_anonymous')::boolean, false),
      p_payload->>'request_key',
      (p_payload->>'purchased_at')::timestamptz,
      p_secret,
      p_payload->>'user_tax_region'
    );
    UPDATE public.purchase_credit_operation SET status = 'CREDITED',
      settled_at = COALESCE(settled_at, now()), updated_at = now()
    WHERE operation_key = v_operation_key;
    RETURN QUERY SELECT 'CREDITED', v_alt_credit.purchase_id,
      v_alt_credit.cheer_id, v_recipient, v_alt_credit.clover_amount,
      v_alt_credit.available_at, v_alt_credit.is_replay,
      v_alt_credit.report_status, v_goal.title, NULL::text;
    RETURN;
  ELSE
    SELECT * INTO v_web_credit FROM public.confirm_cheer_payment(
      p_reference,
      p_payload->>'payment_key',
      (p_payload->>'amount_krw')::integer,
      p_payload->>'method',
      NULLIF(p_payload->>'approved_at', '')::timestamptz,
      p_payload->>'receipt_url',
      COALESCE(p_payload->'raw_response', '{}'::jsonb)
    );
    UPDATE public.purchase_credit_operation SET status = 'CREDITED',
      settled_at = COALESCE(settled_at, now()), updated_at = now()
    WHERE operation_key = v_operation_key;
    RETURN QUERY SELECT 'CREDITED', v_payment.id,
      v_web_credit.cheer_id, v_web_credit.member_id,
      v_cheer.clover_amount, NULL::timestamptz,
      (v_payment.status = 'DONE'), NULL::text,
      v_web_credit.goal_title, v_web_credit.display_name;
    RETURN;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_store_purchase(
  uuid,uuid,uuid,text,text,text,text,text,integer,integer,text,boolean,text,timestamptz,text
) FROM service_role;
REVOKE ALL ON FUNCTION public.credit_alternative_store_purchase(
  uuid,uuid,uuid,text,text,text,text,text,boolean,text,timestamptz,bytea,text
) FROM service_role;
REVOKE ALL ON FUNCTION public.confirm_cheer_payment(
  text,text,integer,text,timestamptz,text,jsonb
) FROM service_role;
REVOKE ALL ON FUNCTION public.begin_alternative_payment_confirmation(uuid,uuid,text),
  public.settle_alternative_payment_confirmation(uuid,uuid,text),
  public.record_alternative_payment_recovery(uuid,uuid,text,text,text)
  FROM service_role;

REVOKE ALL ON FUNCTION public.account_deletion_assert_nonpayment_clear(uuid),
  public.credit_purchase(text,text,text,jsonb,bytea)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_purchase(text,text,text,jsonb,bytea)
  TO service_role;

COMMIT;
