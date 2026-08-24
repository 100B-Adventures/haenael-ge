-- 환전 서비스 이용료 10% 도입 (기존 fee_krw = 0 → 10% + VAT 10%).
-- ⚠️ 머니코드. 20260731000000_cashout_manual_request.sql 의 request_manual_cashout 을
--    CREATE OR REPLACE 로 교체한다(기존 마이그레이션 파일은 수정하지 않는다).
--
-- 확정 계산식 (절사 순서가 곧 계약이다):
--   fee      = floor(gross * 10 / 100)
--   vat      = floor(fee * 10 / 100)
--   feeTotal = fee + vat
--   withhold = floor((gross - feeTotal) * 33 / 1000)   -- 이용료(VAT 포함) 차감 후 기준
--   net      = gross - feeTotal - withhold
--
-- 기준값: 30,000 → 3,300 / 881 / 25,819   50,000 → 5,500 / 1,468 / 43,032
--         100,000 → 11,000 / 2,937 / 86,063
-- 정본 동치 대상: supabase/functions/_shared/withholding.ts, web/src/lib/cashout-fee.ts
--
-- 변경점 요약(기존 대비):
--   1. fee_krw 리터럴 0 → v_fee_total (이용료 + 부가세)
--   2. 원천징수 기준 gross → (gross - feeTotal)
--   3. net = gross - feeTotal - withhold
-- 유지: bigint 중간계산 overflow 가드, integer 컬럼 범위 체크, 잔액 행 잠금, 중복 신청 차단.

BEGIN;

CREATE OR REPLACE FUNCTION public.request_manual_cashout(p_contact text)
RETURNS TABLE(request_id bigint, net_krw integer, clover_amount integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member    uuid := auth.uid();
  v_total     integer;
  v_payable   integer;
  v_reached   boolean;
  v_min       integer := min_cashout_clover();
  v_gross     integer;
  v_fee       integer;
  v_vat       integer;
  v_fee_total integer;
  v_withhold  integer;
  v_net       integer;
  v_new_bal   integer;
  v_id        bigint;
BEGIN
  IF v_member IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_contact IS NULL OR btrim(p_contact) = '' THEN
    RAISE EXCEPTION '연락받을 수단을 입력해 주세요' USING ERRCODE = '22023';
  END IF;

  -- 잔액 행 잠금(동시 신청 직렬화 — 같은 member 두 신청 중 하나가 대기).
  PERFORM 1 FROM clover_balance cb WHERE cb.member_id = v_member FOR UPDATE;

  -- 표시값과 100% 동일하게 clover_eligibility(단일 소스)에서 도달·payable을 가져온다.
  -- (웰컴 순합산=GRANT+REVERSAL은 clover_eligibility가 이미 처리 — 재구현 금지.)
  SELECT total_balance, payable_amount, reached_threshold
    INTO v_total, v_payable, v_reached
  FROM clover_eligibility(v_member);

  IF NOT COALESCE(v_reached, false) THEN
    RAISE EXCEPTION '최소 % 클로버부터 환전 신청할 수 있어요', v_min USING ERRCODE = '22003';
  END IF;
  IF COALESCE(v_payable, 0) <= 0 THEN
    RAISE EXCEPTION '지급 가능한 친구 응원분이 없어요' USING ERRCODE = '22003';
  END IF;

  -- 진행 중 신청 중복 차단.
  IF EXISTS (
    SELECT 1 FROM cashout_request cr
    WHERE cr.member_id = v_member
      AND cr.status IN ('REQUESTED','KYC_PENDING','APPROVED','PAYOUT_SENT')
  ) THEN
    RAISE EXCEPTION '이미 처리 중인 환전 신청이 있어요' USING ERRCODE = '55000';
  END IF;

  -- 금액 계산(1클로버=1,000원, 서비스 이용료 10%+VAT 10%, 원천징수 3.3%).
  -- bigint 중간계산으로 곱셈 overflow 회피. integer 컬럼 범위 초과(≈21.4억원)면 신청 거부.
  IF (v_payable::bigint * 1000) > 2000000000 THEN
    RAISE EXCEPTION '환전 가능 한도를 초과했어요. 나눠서 신청해 주세요' USING ERRCODE = '22003';
  END IF;
  v_gross     := (v_payable::bigint * 1000)::integer;
  v_fee       := floor(v_gross::bigint * 10 / 100)::integer;
  v_vat       := floor(v_fee::bigint * 10 / 100)::integer;
  v_fee_total := v_fee + v_vat;
  v_withhold  := floor((v_gross - v_fee_total)::bigint * 33 / 1000)::integer;
  v_net       := v_gross - v_fee_total - v_withhold;

  INSERT INTO cashout_request(
    member_id, clover_amount, gross_krw, fee_krw, withholding_krw, net_krw, status, contact
  ) VALUES (
    v_member, v_payable, v_gross, v_fee_total, v_withhold, v_net, 'REQUESTED', btrim(p_contact)
  ) RETURNING id INTO v_id;

  -- 친구분 클로버 HOLD(잔액 차감 — 트리거가 clover_balance 동기화). 웰컴은 잔존.
  v_new_bal := v_total - v_payable;
  INSERT INTO clover_ledger(member_id, entry_type, clover_delta, ref_type, ref_id, balance_after)
  VALUES (v_member, 'CASHOUT_HOLD', -v_payable, 'cashout', v_id, v_new_bal);

  RETURN QUERY SELECT v_id, v_net, v_payable;
END;
$$;

COMMENT ON FUNCTION public.request_manual_cashout(text) IS
  '수동 정산 환전 신청: 본인 도달 시 cashout_request(REQUESTED)+친구분 CASHOUT_HOLD. 서비스 이용료 10%+VAT, 원천징수는 이용료 차감 후 3.3%. 실지급은 오프라인.';

REVOKE ALL ON FUNCTION public.request_manual_cashout(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_manual_cashout(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- create_cashout_request — 실사용 환전 RPC.
--
-- web/src/app/(receiver)/cashout/actions.ts 가 호출하는 것은 위의
-- request_manual_cashout 이 아니라 이 함수다(ManualCashoutForm.tsx 는 임포터 0건인 사망 코드).
-- 20260802010000_cashout_security_hardening.sql 의 정의를 CREATE OR REPLACE 로 교체한다.
--
-- ⚠️ 산술만 바꾼다. advisory lock, KYC 게이트, request_key 멱등 처리, 계좌 암호화·fingerprint,
--    중복 신청 차단, ON CONFLICT 재조회, 원장 HOLD 는 원본을 한 줄도 바꾸지 않았다.
--
-- 변경점 3개:
--   1. v_fee / v_vat / v_fee_total 계산 추가
--   2. v_withholding 기준 gross → (gross - fee_total)
--   3. fee_krw 기록·반환 0::bigint → v_fee_total (INSERT 1곳, RETURN QUERY 1곳)
--
-- 이 함수의 금액 변수는 bigint 이고 request_manual_cashout 은 integer 다. 양수 구간에서
-- Postgres bigint 정수나눗셈은 0 방향 절삭 = floor 이므로 두 함수의 절사 결과는 동일하다.
-- (음수는 두 함수 모두 도달 불가: clover_amount > 0 이고 fee_total < gross.)
-- ---------------------------------------------------------------------------

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
  -- cron이 없는 로컬/제한 환경에서도 정상 트래픽이 있으면 파기가 수렴한다.
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

  IF public.cashout_require_kyc() AND NOT EXISTS (
    SELECT 1
    FROM public.member AS m
    JOIN public.kyc_verification AS kv ON kv.member_id = m.id
    WHERE m.id = p_member_id
      AND m.kyc_status = 'VERIFIED'
      AND kv.is_adult = true
  ) THEN
    RAISE EXCEPTION 'cashout_kyc_required' USING ERRCODE = '42501';
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

  SELECT ce.total_balance, ce.payable_amount, ce.min_cashout_clover
  INTO v_total, v_payable, v_min
  FROM public.clover_eligibility(p_member_id) AS ce;

  IF v_total < v_min THEN
    RAISE EXCEPTION 'cashout_below_minimum' USING ERRCODE = '22023';
  END IF;
  IF p_clover_amount > v_payable THEN
    RAISE EXCEPTION 'cashout_insufficient_balance' USING ERRCODE = '22023';
  END IF;

  -- cast를 곱셈 전에 적용한다. 65,076클로버 경계에서도 32비트 중간값이 없다.
  -- 서비스 이용료 10% + 그에 대한 부가가치세 10%, 원천징수는 이용료(VAT 포함) 차감 후 3.3%.
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
  '환전 신청(실사용 RPC): 서비스 이용료 10%+VAT를 fee_krw에 기록하고, 원천징수는 이용료 차감 후 3.3%.';

-- CREATE OR REPLACE 는 기존 ACL을 보존하지만(로컬 실측 확인), SECURITY DEFINER 함수라
-- 권한이 유실되면 즉시 사고다. 20260802010000 과 동일한 권한을 멱등하게 재확인한다.
REVOKE ALL ON FUNCTION public.create_cashout_request(
  uuid, integer, text, text, text, text, smallint, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_cashout_request(
  uuid, integer, text, text, text, text, smallint, text, text
) TO service_role;

COMMIT;
