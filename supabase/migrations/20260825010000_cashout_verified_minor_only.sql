-- 환전 신청 시 PASS 완료를 요구하지 않고, 미성년으로 확인된 회원만 차단한다.
-- 회장 결정(2026-08-25): 카카오 로그인으로 신청자를 식별하고 주민등록번호는 실제 지급 단계에서 수집한다.
--
-- 변경 범위는 create_cashout_request의 연령 게이트뿐이다.
-- 함수 시그니처, advisory lock, request_key 멱등, 계좌 암호화·마스킹,
-- status='REQUESTED' 중복 차단, A안 잠금, 수수료·부가세·원천징수 계산은
-- 20260822000000_cashout_clover_lock_a1.sql 정의를 그대로 유지한다.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_cashout_request(
  p_member_id uuid,
  p_clover_amount integer,
  p_bank_code text,
  p_account_no text,
  p_account_holder text,
  p_request_key text,
  p_account_key_version smallint,
  p_account_key text,
  p_account_fingerprint_key text
)
RETURNS TABLE(
  cashout_request_id bigint,
  status public.cashout_status_enum,
  clover_amount integer,
  gross_krw bigint,
  fee_krw bigint,
  withholding_krw bigint,
  net_krw bigint,
  requested_at timestamptz,
  is_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total integer := 0;
  v_payable integer := 0;
  v_min integer := public.min_cashout_clover();
  v_account_no text;
  v_account_holder text;
  v_account_masked text;
  v_gross bigint;
  v_fee bigint;
  v_vat bigint;
  v_fee_total bigint;
  v_withholding bigint;
  v_net bigint;
  v_request_fingerprint jsonb;
  v_existing public.cashout_request%ROWTYPE;
  v_request_id bigint;
  v_requested_at timestamptz;
BEGIN
  PERFORM public.purge_expired_cashout_accounts(100);

  v_account_no := pg_catalog.regexp_replace(
    COALESCE(p_account_no, ''),
    '[[:space:]-]',
    '',
    'g'
  );
  v_account_holder := pg_catalog.regexp_replace(
    pg_catalog.btrim(normalize(COALESCE(p_account_holder, ''), NFKC)),
    '[[:space:]]+',
    ' ',
    'g'
  );

  IF p_member_id IS NULL THEN
    RAISE EXCEPTION 'invalid_member' USING ERRCODE = '22023';
  END IF;
  IF p_clover_amount IS NULL OR p_clover_amount < v_min THEN
    RAISE EXCEPTION 'cashout_below_minimum' USING ERRCODE = '22023';
  END IF;
  IF p_bank_code IS NULL OR p_bank_code !~ '^[A-Za-z0-9_-]{2,20}$' THEN
    RAISE EXCEPTION 'invalid_bank_code' USING ERRCODE = '22023';
  END IF;
  IF v_account_no !~ '^[0-9]{8,20}$' THEN
    RAISE EXCEPTION 'invalid_account_number' USING ERRCODE = '22023';
  END IF;
  IF length(v_account_holder) < 2 OR length(v_account_holder) > 40 THEN
    RAISE EXCEPTION 'invalid_account_holder' USING ERRCODE = '22023';
  END IF;
  IF p_request_key IS NULL OR p_request_key !~ '^[A-Za-z0-9_-]{8,128}$' THEN
    RAISE EXCEPTION 'invalid_request_key' USING ERRCODE = '22023';
  END IF;
  IF p_account_key_version IS NULL OR p_account_key_version < 1 THEN
    RAISE EXCEPTION 'cashout_key_version_unavailable' USING ERRCODE = '55000';
  END IF;
  IF p_account_key IS NULL OR length(p_account_key) < 32 THEN
    RAISE EXCEPTION 'cashout_encryption_unavailable' USING ERRCODE = '55000';
  END IF;
  IF p_account_fingerprint_key IS NULL OR length(p_account_fingerprint_key) < 32 THEN
    RAISE EXCEPTION 'cashout_fingerprint_unavailable' USING ERRCODE = '55000';
  END IF;

  v_request_fingerprint := pg_catalog.jsonb_build_object(
    'member_id', p_member_id,
    'clover_amount', p_clover_amount,
    'bank_code', pg_catalog.upper(p_bank_code),
    'account_no_hmac_sha256', pg_catalog.encode(
      extensions.hmac(v_account_no, p_account_fingerprint_key, 'sha256'),
      'hex'
    ),
    'account_holder', v_account_holder
  );

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cashout_member:' || p_member_id::text, 0)
  );

  -- 가입 직후처럼 연령 확인 기록이 없으면 통과한다. 확인 기록이 여러 건이면
  -- 가장 최근 결과만 사용해 과거 미성년 판정이 성인 재확인 뒤 남는 것을 막는다.
  IF (
    SELECT kv.is_adult
    FROM public.kyc_verification AS kv
    WHERE kv.member_id = p_member_id
    ORDER BY kv.verified_at DESC, kv.id DESC
    LIMIT 1
  ) IS FALSE THEN
    RAISE EXCEPTION 'cashout_minor_not_allowed' USING ERRCODE = '42501';
  END IF;

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

  -- I3: 진행 상태 집합은 clover_eligibility의 locked 계산·종결 RPC 가드와 반드시
  -- 같은 집합('REQUESTED'만, 컨트롤러 재검증 MINOR 수정 근거는 clover_eligibility 주석 참조).
  IF EXISTS (
    SELECT 1
    FROM public.cashout_request AS cr
    WHERE cr.member_id = p_member_id
      AND cr.status = 'REQUESTED'
  ) THEN
    RAISE EXCEPTION 'cashout_already_requested' USING ERRCODE = '55000';
  END IF;

  PERFORM 1
  FROM public.clover_balance AS cb
  WHERE cb.member_id = p_member_id
  FOR UPDATE;

  -- clover_eligibility가 locked를 포함해 payable을 계산한다(§10 build 필수 순서 규약:
  -- advisory lock → clover_balance FOR UPDATE → clover_eligibility 조회, 이 순서를 바꾸지 말 것).
  SELECT ce.total_balance, ce.payable_amount, ce.min_cashout_clover
  INTO v_total, v_payable, v_min
  FROM public.clover_eligibility(p_member_id) AS ce;

  IF v_total < v_min THEN
    RAISE EXCEPTION 'cashout_below_minimum' USING ERRCODE = '22023';
  END IF;
  IF p_clover_amount > v_payable THEN
    RAISE EXCEPTION 'cashout_insufficient_balance' USING ERRCODE = '22023';
  END IF;

  v_gross := p_clover_amount::bigint * 1000::bigint;
  v_fee := (v_gross * 10::bigint) / 100::bigint;
  v_vat := (v_fee * 10::bigint) / 100::bigint;
  v_fee_total := v_fee + v_vat;
  v_withholding := ((v_gross - v_fee_total) * 33::bigint) / 1000::bigint;
  v_net := v_gross - v_fee_total - v_withholding;
  v_account_masked := pg_catalog.repeat('•', 6) || pg_catalog.right(v_account_no, 4);

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
    account_masked,
    key_version,
    risk_flag,
    request_key,
    request_fingerprint
  )
  VALUES (
    p_member_id,
    p_clover_amount,
    v_gross,
    v_fee_total,
    v_withholding,
    v_net,
    'REQUESTED',
    pg_catalog.upper(p_bank_code),
    extensions.pgp_sym_encrypt(
      v_account_no,
      p_account_key,
      'cipher-algo=aes256,compress-algo=0'
    ),
    v_account_holder,
    v_account_masked,
    p_account_key_version,
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

  -- ══════════════════════════════════════════════════════════════════════
  -- D1=A-1 채택분 (설계문서 §6 D1). 잠금을 원장에 남기되 총량은 건드리지 않는다:
  -- clover_delta=0, balance_after=신청 전 총량(v_total 그대로). 감사·CS 대응용 시각 기록.
  -- 회장이 A-2(원장 미기록)를 고르면 이 INSERT 블록만 삭제하면 된다(§9 계약·전이표는 불변).
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
    0,
    'cashout_request',
    v_request_id,
    v_total
  );
  -- ══════════════════════════════════════════════════════════════════════

  RETURN QUERY SELECT
    v_request_id,
    'REQUESTED'::public.cashout_status_enum,
    p_clover_amount,
    v_gross,
    v_fee_total,
    v_withholding,
    v_net,
    v_requested_at,
    false;
END;
$$;

COMMENT ON FUNCTION public.create_cashout_request(
  uuid, integer, text, text, text, text, smallint, text, text
) IS
  '환전 신청(A안): 가입 직후 계정은 통과하고 확인된 미성년만 차단한다. 총량은 유지하고 CASHOUT_HOLD delta=0으로 잠근다.';

REVOKE ALL ON FUNCTION public.create_cashout_request(
  uuid, integer, text, text, text, text, smallint, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_cashout_request(
  uuid, integer, text, text, text, text, smallint, text, text
) TO service_role;

COMMIT;
