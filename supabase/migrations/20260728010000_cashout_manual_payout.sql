-- =============================================================================
-- cashout_manual_payout — 회장 수동 송금 환전
--
-- 확정 운영 모델:
--   사용자 신청 → 계좌번호 pgcrypto 암호화 + CASHOUT_HOLD → REQUESTED
--   회장 은행 송금 → 관리자 RPC로 PAID / 반려 → REJECTED + HOLD 복원
-- 자동 지급대행(TossPayoutClient)은 이 슬라이스에서 호출하지 않는다.
-- =============================================================================

BEGIN;

ALTER TABLE public.cashout_request
  ADD COLUMN IF NOT EXISTS account_holder text,
  ADD COLUMN IF NOT EXISTS processing_note text,
  ADD COLUMN IF NOT EXISTS request_key text,
  ADD COLUMN IF NOT EXISTS request_fingerprint jsonb,
  ADD COLUMN IF NOT EXISTS processed_by uuid REFERENCES public.member(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

COMMENT ON COLUMN public.cashout_request.account_holder IS
  '환전 계좌 예금주명. 관리자 수동 송금 확인용.';
COMMENT ON COLUMN public.cashout_request.processing_note IS
  '관리자 지급/반려 처리 메모. 계좌번호 등 민감정보 입력 금지.';
COMMENT ON COLUMN public.cashout_request.request_key IS
  '클라이언트 재시도 멱등키. 동일 키+동일 fingerprint는 기존 요청을 재생.';
COMMENT ON COLUMN public.cashout_request.request_fingerprint IS
  '환전 요청 fingerprint. 계좌번호 원문 대신 SHA-256 digest만 포함.';

CREATE UNIQUE INDEX IF NOT EXISTS cashout_request_request_key_unique
  ON public.cashout_request(request_key)
  WHERE request_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cashout_terminal_ledger_unique
  ON public.clover_ledger(entry_type, ref_id)
  WHERE ref_type = 'cashout_request'
    AND entry_type IN ('CASHOUT_SETTLED', 'CASHOUT_REVERSAL');

CREATE OR REPLACE FUNCTION public.create_cashout_request(
  p_member_id uuid,
  p_clover_amount integer,
  p_bank_code text,
  p_account_no text,
  p_account_holder text,
  p_request_key text,
  p_account_key text
)
RETURNS TABLE(
  cashout_request_id bigint,
  status public.cashout_status_enum,
  clover_amount integer,
  gross_krw integer,
  fee_krw integer,
  withholding_krw integer,
  net_krw integer,
  requested_at timestamptz,
  is_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total integer := 0;
  v_welcome integer := 0;
  v_payable integer := 0;
  v_min integer := public.min_cashout_clover();
  v_gross integer;
  v_withholding integer;
  v_net integer;
  v_request_fingerprint jsonb;
  v_existing public.cashout_request%ROWTYPE;
  v_request_id bigint;
  v_requested_at timestamptz;
BEGIN
  IF p_member_id IS NULL THEN
    RAISE EXCEPTION 'invalid_member' USING ERRCODE = '22023';
  END IF;
  IF p_clover_amount IS NULL OR p_clover_amount < v_min THEN
    RAISE EXCEPTION 'cashout_below_minimum' USING ERRCODE = '22023';
  END IF;
  IF p_bank_code IS NULL OR p_bank_code !~ '^[A-Za-z0-9_-]{2,20}$' THEN
    RAISE EXCEPTION 'invalid_bank_code' USING ERRCODE = '22023';
  END IF;
  IF p_account_no IS NULL OR p_account_no !~ '^[0-9]{8,20}$' THEN
    RAISE EXCEPTION 'invalid_account_number' USING ERRCODE = '22023';
  END IF;
  IF p_account_holder IS NULL
     OR length(btrim(p_account_holder)) < 2
     OR length(btrim(p_account_holder)) > 40 THEN
    RAISE EXCEPTION 'invalid_account_holder' USING ERRCODE = '22023';
  END IF;
  IF p_request_key IS NULL OR p_request_key !~ '^[A-Za-z0-9_-]{8,128}$' THEN
    RAISE EXCEPTION 'invalid_request_key' USING ERRCODE = '22023';
  END IF;
  IF p_account_key IS NULL OR length(p_account_key) < 32 THEN
    RAISE EXCEPTION 'cashout_encryption_unavailable' USING ERRCODE = '55000';
  END IF;

  v_request_fingerprint := jsonb_build_object(
    'member_id', p_member_id,
    'clover_amount', p_clover_amount,
    'bank_code', upper(p_bank_code),
    'account_no_sha256', encode(extensions.digest(p_account_no, 'sha256'), 'hex'),
    'account_holder', btrim(p_account_holder)
  );

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cashout_member:' || p_member_id::text, 0)
  );

  SELECT *
  INTO v_existing
  FROM public.cashout_request AS cr
  WHERE cr.request_key = p_request_key;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.request_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RAISE EXCEPTION 'request_key_conflict' USING ERRCODE = '22023';
    END IF;

    RETURN QUERY SELECT
      v_existing.id,
      v_existing.status,
      v_existing.clover_amount,
      v_existing.gross_krw,
      v_existing.fee_krw,
      v_existing.withholding_krw,
      v_existing.net_krw,
      v_existing.requested_at,
      true;
    RETURN;
  END IF;

  SELECT COALESCE(cb.clover_count, 0)
  INTO v_total
  FROM public.clover_balance AS cb
  WHERE cb.member_id = p_member_id
  FOR UPDATE;
  v_total := COALESCE(v_total, 0);

  SELECT COALESCE(sum(cl.clover_delta), 0)::integer
  INTO v_welcome
  FROM public.clover_ledger AS cl
  WHERE cl.member_id = p_member_id
    AND cl.entry_type IN ('WELCOME_GRANT', 'WELCOME_REVERSAL');
  v_welcome := GREATEST(COALESCE(v_welcome, 0), 0);
  v_payable := GREATEST(v_total - v_welcome, 0);

  IF v_total < v_min THEN
    RAISE EXCEPTION 'cashout_below_minimum' USING ERRCODE = '22023';
  END IF;
  IF p_clover_amount > v_payable THEN
    RAISE EXCEPTION 'cashout_insufficient_balance' USING ERRCODE = '22023';
  END IF;

  v_gross := p_clover_amount * 1000;
  -- 원천징수는 요청 총액의 3.3%. 양수 정수 나눗셈으로 원 미만을 절사한다.
  v_withholding := (v_gross * 33) / 1000;
  v_net := v_gross - v_withholding;

  INSERT INTO public.cashout_request (
    member_id,
    clover_amount,
    gross_krw,
    fee_krw,
    withholding_krw,
    net_krw,
    status,
    bank_code,
    account_no_enc,
    account_holder,
    risk_flag,
    request_key,
    request_fingerprint
  )
  VALUES (
    p_member_id,
    p_clover_amount,
    v_gross,
    0,
    v_withholding,
    v_net,
    'REQUESTED',
    upper(p_bank_code),
    extensions.pgp_sym_encrypt(
      p_account_no,
      p_account_key,
      'cipher-algo=aes256,compress-algo=0'
    ),
    btrim(p_account_holder),
    'CLEAR',
    p_request_key,
    v_request_fingerprint
  )
  ON CONFLICT (request_key) WHERE request_key IS NOT NULL DO NOTHING
  RETURNING id, cashout_request.requested_at
  INTO v_request_id, v_requested_at;

  IF v_request_id IS NULL THEN
    SELECT *
    INTO v_existing
    FROM public.cashout_request AS cr
    WHERE cr.request_key = p_request_key;

    IF v_existing.request_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RAISE EXCEPTION 'request_key_conflict' USING ERRCODE = '22023';
    END IF;

    RETURN QUERY SELECT
      v_existing.id,
      v_existing.status,
      v_existing.clover_amount,
      v_existing.gross_krw,
      v_existing.fee_krw,
      v_existing.withholding_krw,
      v_existing.net_krw,
      v_existing.requested_at,
      true;
    RETURN;
  END IF;

  INSERT INTO public.clover_ledger (
    member_id,
    entry_type,
    clover_delta,
    ref_type,
    ref_id,
    balance_after
  )
  VALUES (
    p_member_id,
    'CASHOUT_HOLD',
    -p_clover_amount,
    'cashout_request',
    v_request_id,
    v_total - p_clover_amount
  );

  RETURN QUERY SELECT
    v_request_id,
    'REQUESTED'::public.cashout_status_enum,
    p_clover_amount,
    v_gross,
    0,
    v_withholding,
    v_net,
    v_requested_at,
    false;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_cashouts_secure(
  p_actor_id uuid,
  p_account_key text,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  id bigint,
  member_id uuid,
  nickname text,
  clover_amount integer,
  gross_krw integer,
  fee_krw integer,
  withholding_krw integer,
  net_krw integer,
  bank_code text,
  account_no text,
  account_holder text,
  status public.cashout_status_enum,
  processing_note text,
  requested_at timestamptz,
  paid_at timestamptz,
  rejected_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_member AS am WHERE am.member_id = p_actor_id
  ) THEN
    RAISE EXCEPTION 'admin_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_account_key IS NULL OR length(p_account_key) < 32 THEN
    RAISE EXCEPTION 'cashout_encryption_unavailable' USING ERRCODE = '55000';
  END IF;

  RETURN QUERY
  SELECT
    cr.id,
    cr.member_id,
    m.nickname,
    cr.clover_amount,
    cr.gross_krw,
    cr.fee_krw,
    cr.withholding_krw,
    cr.net_krw,
    cr.bank_code,
    extensions.pgp_sym_decrypt(cr.account_no_enc, p_account_key),
    cr.account_holder,
    cr.status,
    cr.processing_note,
    cr.requested_at,
    cr.paid_at,
    cr.rejected_at
  FROM public.cashout_request AS cr
  JOIN public.member AS m ON m.id = cr.member_id
  ORDER BY
    CASE WHEN cr.status = 'REQUESTED' THEN 0 ELSE 1 END,
    cr.requested_at ASC,
    cr.id ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reveal_cashout_account(
  p_request_id bigint,
  p_actor_id uuid,
  p_account_key text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_no text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_member AS am WHERE am.member_id = p_actor_id
  ) THEN
    RAISE EXCEPTION 'admin_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_account_key IS NULL OR length(p_account_key) < 32 THEN
    RAISE EXCEPTION 'cashout_encryption_unavailable' USING ERRCODE = '55000';
  END IF;

  SELECT extensions.pgp_sym_decrypt(cr.account_no_enc, p_account_key)
  INTO v_account_no
  FROM public.cashout_request AS cr
  WHERE cr.id = p_request_id;

  IF v_account_no IS NULL THEN
    RAISE EXCEPTION 'cashout_not_found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_account_no;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_cashout_paid(
  p_request_id bigint,
  p_actor_id uuid,
  p_processing_note text DEFAULT NULL
)
RETURNS TABLE(
  cashout_request_id bigint,
  status public.cashout_status_enum,
  paid_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.cashout_request%ROWTYPE;
  v_balance integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_member AS am WHERE am.member_id = p_actor_id
  ) THEN
    RAISE EXCEPTION 'admin_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_processing_note IS NOT NULL AND length(p_processing_note) > 500 THEN
    RAISE EXCEPTION 'processing_note_too_long' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cashout_request:' || p_request_id::text, 0)
  );

  UPDATE public.cashout_request AS cr
  SET
    status = 'PAID',
    paid_at = pg_catalog.now(),
    processed_by = p_actor_id,
    processing_note = NULLIF(btrim(p_processing_note), '')
  WHERE cr.id = p_request_id
    AND cr.status = 'REQUESTED'
  RETURNING cr.* INTO v_request;

  IF v_request.id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.cashout_request AS cr
      WHERE cr.id = p_request_id AND cr.status = 'PAID'
    ) THEN
      RAISE EXCEPTION 'cashout_already_paid' USING ERRCODE = '23505';
    END IF;
    RAISE EXCEPTION 'invalid_cashout_status' USING ERRCODE = '55000';
  END IF;

  SELECT COALESCE(cb.clover_count, 0)
  INTO v_balance
  FROM public.clover_balance AS cb
  WHERE cb.member_id = v_request.member_id
  FOR UPDATE;

  INSERT INTO public.clover_ledger (
    member_id,
    entry_type,
    clover_delta,
    ref_type,
    ref_id,
    balance_after
  )
  VALUES (
    v_request.member_id,
    'CASHOUT_SETTLED',
    0,
    'cashout_request',
    v_request.id,
    COALESCE(v_balance, 0)
  );

  RETURN QUERY SELECT v_request.id, v_request.status, v_request.paid_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_cashout(
  p_request_id bigint,
  p_actor_id uuid,
  p_processing_note text
)
RETURNS TABLE(
  cashout_request_id bigint,
  status public.cashout_status_enum,
  rejected_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.cashout_request%ROWTYPE;
  v_balance integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_member AS am WHERE am.member_id = p_actor_id
  ) THEN
    RAISE EXCEPTION 'admin_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_processing_note IS NULL
     OR length(btrim(p_processing_note)) < 2
     OR length(p_processing_note) > 500 THEN
    RAISE EXCEPTION 'processing_note_required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cashout_request:' || p_request_id::text, 0)
  );

  UPDATE public.cashout_request AS cr
  SET
    status = 'REJECTED',
    rejected_at = pg_catalog.now(),
    processed_by = p_actor_id,
    processing_note = btrim(p_processing_note)
  WHERE cr.id = p_request_id
    AND cr.status = 'REQUESTED'
  RETURNING cr.* INTO v_request;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'invalid_cashout_status' USING ERRCODE = '55000';
  END IF;

  SELECT COALESCE(cb.clover_count, 0)
  INTO v_balance
  FROM public.clover_balance AS cb
  WHERE cb.member_id = v_request.member_id
  FOR UPDATE;

  INSERT INTO public.clover_ledger (
    member_id,
    entry_type,
    clover_delta,
    ref_type,
    ref_id,
    balance_after
  )
  VALUES (
    v_request.member_id,
    'CASHOUT_REVERSAL',
    v_request.clover_amount,
    'cashout_request',
    v_request.id,
    COALESCE(v_balance, 0) + v_request.clover_amount
  );

  RETURN QUERY SELECT v_request.id, v_request.status, v_request.rejected_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_cashout_request(
  uuid, integer, text, text, text, text, text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_cashouts_secure(
  uuid, text, integer
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_reveal_cashout_account(
  bigint, uuid, text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_mark_cashout_paid(
  bigint, uuid, text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_reject_cashout(
  bigint, uuid, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_cashout_request(
  uuid, integer, text, text, text, text, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_cashouts_secure(
  uuid, text, integer
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reveal_cashout_account(
  bigint, uuid, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_cashout_paid(
  bigint, uuid, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_cashout(
  bigint, uuid, text
) TO service_role;

COMMIT;
