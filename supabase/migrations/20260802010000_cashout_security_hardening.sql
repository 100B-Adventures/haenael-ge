-- =============================================================================
-- cashout_security_hardening — 수동환전 배포차단 결함 7건 해소
--
-- 1. 계좌 fingerprint를 별도 비밀키 HMAC-SHA-256으로 전환
-- 2. 계좌 마스크를 원 계좌 길이와 무관한 고정 길이로 전환
-- 3. 같은 관리자의 최근 성공 열람 없이는 PAID 전이 금지
-- 4. 원화 컬럼/계산/함수 반환형을 bigint로 전환
-- 5. 종결 90일 뒤 계좌정보 멱등 파기 + 종결/파기 계좌 복호화 차단
-- 6. 암호화 key_version과 버전별 keyring 복호화 지원
-- 7. 감사 로그의 service_role 직접 수정/삭제 권한 명시적 회수
-- =============================================================================

BEGIN;

-- 구 SHA-256 fingerprint는 짧은 계좌번호의 후보 대입에 악용될 수 있으므로
-- 신규 키가 없어도 migration 시점에 즉시 제거한다. 종결 요청은 재시도 대상이
-- 아니며, 진행 중 구 요청의 동일 request_key 재시도는 안전하게 conflict 된다.
UPDATE public.cashout_request
SET request_fingerprint = request_fingerprint - 'account_no_sha256'
WHERE request_fingerprint ? 'account_no_sha256';

-- 원 계좌 자릿수를 노출하지 않도록 마지막 4자리 앞의 마스크 길이를 6자로 고정한다.
UPDATE public.cashout_request
SET account_masked = pg_catalog.repeat('•', 6) || pg_catalog.right(account_masked, 4)
WHERE account_masked IS NOT NULL
  AND account_purged_at IS NULL;

-- 반환형 변경 전 기존 함수를 제거한다. 구 보안 시그니처가 오버로드로 남으면
-- HMAC/keyring 검증 없이 호출될 수 있으므로 구 함수도 함께 제거한다.
DROP FUNCTION IF EXISTS public.create_cashout_request(
  uuid, integer, text, text, text, text, text
);
DROP FUNCTION IF EXISTS public.create_cashout_request(
  uuid, integer, text, text, text, text, smallint, text, text
);
DROP FUNCTION IF EXISTS public.admin_list_cashouts(integer);
DROP FUNCTION IF EXISTS public.admin_list_cashouts_v2(integer);
DROP FUNCTION IF EXISTS public.admin_reveal_cashout_account(bigint, uuid, text);
DROP FUNCTION IF EXISTS public.admin_reveal_cashout_account(bigint, uuid, jsonb);
DROP FUNCTION IF EXISTS public.my_cashout_status();
DROP FUNCTION IF EXISTS public.my_cashout_history(integer);

ALTER TABLE public.cashout_request
  ALTER COLUMN gross_krw TYPE bigint USING gross_krw::bigint,
  ALTER COLUMN fee_krw TYPE bigint USING fee_krw::bigint,
  ALTER COLUMN withholding_krw TYPE bigint USING withholding_krw::bigint,
  ALTER COLUMN net_krw TYPE bigint USING net_krw::bigint;

COMMENT ON COLUMN public.cashout_request.account_masked IS
  '표시 전용 고정 길이 마스크. 원 계좌 길이와 무관하게 • 6자 + 마지막 4자리.';
COMMENT ON COLUMN public.cashout_request.key_version IS
  '계좌 암호화 키링 버전. 신규 신청은 활성 버전을 저장하고 복호화는 해당 버전 키만 사용한다.';
COMMENT ON COLUMN public.cashout_request.request_fingerprint IS
  '환전 멱등 fingerprint. 계좌번호는 별도 비밀키 HMAC-SHA-256만 포함하며 암호화 키와 분리한다.';

-- 종결 90일 뒤 계좌 관련 개인정보를 물리적으로 제거한다. SKIP LOCKED와
-- account_purged_at 조건으로 병렬/반복 실행해도 같은 건을 두 번 처리하지 않는다.
CREATE OR REPLACE FUNCTION public.purge_expired_cashout_accounts(
  p_limit integer DEFAULT 500
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_purged integer := 0;
BEGIN
  WITH purge_targets AS (
    SELECT cr.id
    FROM public.cashout_request AS cr
    WHERE cr.status IN ('PAID', 'REJECTED')
      AND cr.account_purged_at IS NULL
      AND cr.account_no_enc IS NOT NULL
      AND COALESCE(cr.paid_at, cr.rejected_at) <= pg_catalog.now() - interval '90 days'
    ORDER BY COALESCE(cr.paid_at, cr.rejected_at), cr.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 500), 1), 5000)
  )
  UPDATE public.cashout_request AS cr
  SET
    account_no_enc = NULL,
    account_holder = NULL,
    account_masked = NULL,
    request_fingerprint = (cr.request_fingerprint - 'account_no_hmac_sha256' - 'account_holder'),
    account_purged_at = pg_catalog.now()
  FROM purge_targets AS pt
  WHERE cr.id = pt.id;

  GET DIAGNOSTICS v_purged = ROW_COUNT;
  RETURN v_purged;
END;
$$;

COMMENT ON FUNCTION public.purge_expired_cashout_accounts(integer) IS
  'PAID/REJECTED 종결 후 90일 지난 계좌 암호문·마스크·예금주·계좌 HMAC을 멱등 파기한다.';

REVOKE ALL ON FUNCTION public.purge_expired_cashout_accounts(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_cashout_accounts(integer)
  TO service_role;

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
  v_gross := p_clover_amount::bigint * 1000::bigint;
  v_withholding := (v_gross * 33::bigint) / 1000::bigint;
  v_net := v_gross - v_withholding;
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
    0::bigint,
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
    0::bigint,
    v_withholding,
    v_net,
    v_requested_at,
    false;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_cashouts(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id bigint,
  member_id uuid,
  nickname text,
  clover_amount integer,
  gross_krw bigint,
  fee_krw bigint,
  withholding_krw bigint,
  net_krw bigint,
  status public.cashout_status_enum,
  requested_at timestamptz,
  paid_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_forbidden' USING ERRCODE = '42501';
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
    cr.status,
    cr.requested_at,
    cr.paid_at
  FROM public.cashout_request AS cr
  JOIN public.member AS m ON m.id = cr.member_id
  ORDER BY cr.requested_at DESC, cr.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_cashouts_v2(p_limit integer DEFAULT 100)
RETURNS TABLE(
  id bigint,
  member_id uuid,
  nickname text,
  clover_amount integer,
  gross_krw bigint,
  fee_krw bigint,
  withholding_krw bigint,
  net_krw bigint,
  bank_code text,
  account_masked text,
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
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_forbidden' USING ERRCODE = '42501';
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
    cr.account_masked,
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
  p_account_keys jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_no_enc bytea;
  v_key_version smallint;
  v_account_key text;
  v_account_no text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_member AS am WHERE am.member_id = p_actor_id
  ) THEN
    RAISE EXCEPTION 'admin_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_account_keys IS NULL OR pg_catalog.jsonb_typeof(p_account_keys) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'cashout_encryption_unavailable' USING ERRCODE = '55000';
  END IF;

  SELECT cr.account_no_enc, cr.key_version
  INTO v_account_no_enc, v_key_version
  FROM public.cashout_request AS cr
  WHERE cr.id = p_request_id
    AND cr.status = 'REQUESTED'
    AND cr.account_purged_at IS NULL
    AND cr.account_no_enc IS NOT NULL;

  IF v_account_no_enc IS NULL THEN
    RAISE EXCEPTION 'cashout_account_unavailable' USING ERRCODE = '55000';
  END IF;

  v_account_key := p_account_keys ->> v_key_version::text;
  IF v_account_key IS NULL OR length(v_account_key) < 32 THEN
    RAISE EXCEPTION 'cashout_key_version_unavailable' USING ERRCODE = '55000';
  END IF;

  v_account_no := extensions.pgp_sym_decrypt(v_account_no_enc, v_account_key);

  INSERT INTO public.cashout_account_access_log (
    request_id,
    actor_id,
    purpose
  ) VALUES (
    p_request_id,
    p_actor_id,
    'payout'
  );

  RETURN v_account_no;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_cashout_paid(
  p_request_id bigint,
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
  v_actor_id uuid := auth.uid();
BEGIN
  IF NOT public.is_admin() OR v_actor_id IS NULL THEN
    RAISE EXCEPTION 'admin_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_processing_note IS NOT NULL AND length(p_processing_note) > 500 THEN
    RAISE EXCEPTION 'processing_note_too_long' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cashout_request:' || p_request_id::text, 0)
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.cashout_account_access_log AS al
    WHERE al.request_id = p_request_id
      AND al.actor_id = v_actor_id
      AND al.purpose = 'payout'
      AND al.accessed_at >= pg_catalog.now() - interval '10 minutes'
  ) THEN
    RAISE EXCEPTION 'cashout_account_reveal_required' USING ERRCODE = '55000';
  END IF;

  UPDATE public.cashout_request AS cr
  SET
    status = 'PAID',
    paid_at = pg_catalog.now(),
    processed_by = v_actor_id,
    processing_note = NULLIF(pg_catalog.btrim(p_processing_note), '')
  WHERE cr.id = p_request_id
    AND cr.status = 'REQUESTED'
    AND cr.account_purged_at IS NULL
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

CREATE OR REPLACE FUNCTION public.my_cashout_status()
RETURNS TABLE(
  id bigint,
  status public.cashout_status_enum,
  clover_amount integer,
  net_krw bigint,
  bank_code text,
  account_masked text,
  account_holder text,
  requested_at timestamptz,
  paid_at timestamptz,
  rejected_at timestamptz,
  processing_note text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    cr.id,
    cr.status,
    cr.clover_amount,
    cr.net_krw,
    cr.bank_code,
    cr.account_masked,
    cr.account_holder,
    cr.requested_at,
    cr.paid_at,
    cr.rejected_at,
    cr.processing_note
  FROM public.cashout_request AS cr
  WHERE cr.member_id = auth.uid()
  ORDER BY
    CASE WHEN cr.status = 'REQUESTED' THEN 0 ELSE 1 END,
    cr.requested_at DESC,
    cr.id DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.my_cashout_history(p_limit integer DEFAULT 20)
RETURNS TABLE(
  id bigint,
  status public.cashout_status_enum,
  clover_amount integer,
  net_krw bigint,
  bank_code text,
  account_masked text,
  account_holder text,
  requested_at timestamptz,
  paid_at timestamptz,
  rejected_at timestamptz,
  processing_note text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    cr.id,
    cr.status,
    cr.clover_amount,
    cr.net_krw,
    cr.bank_code,
    cr.account_masked,
    cr.account_holder,
    cr.requested_at,
    cr.paid_at,
    cr.rejected_at,
    cr.processing_note
  FROM public.cashout_request AS cr
  WHERE cr.member_id = auth.uid()
  ORDER BY cr.requested_at DESC, cr.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100)
$$;

REVOKE ALL ON FUNCTION public.create_cashout_request(
  uuid, integer, text, text, text, text, smallint, text, text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_cashouts(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_cashouts_v2(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reveal_cashout_account(
  bigint, uuid, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_mark_cashout_paid(bigint, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_cashout_status() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_cashout_history(integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_cashout_request(
  uuid, integer, text, text, text, text, smallint, text, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_cashouts(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_cashouts_v2(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reveal_cashout_account(
  bigint, uuid, jsonb
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_mark_cashout_paid(bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_cashout_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_cashout_history(integer) TO authenticated;

-- 감사 로그는 SECURITY DEFINER 함수만 append한다. service_role을 포함한 Data API
-- 역할에는 테이블/identity sequence 직접 권한을 한 건도 남기지 않는다.
REVOKE ALL ON TABLE public.cashout_account_access_log
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.cashout_account_access_log_id_seq
  FROM PUBLIC, anon, authenticated, service_role;

-- pg_cron 가용 환경은 매일 03:17 UTC에 파기한다. 확장이 없는 로컬/제한 환경은
-- create_cashout_request 진입의 opportunistic 호출로 안전하게 수렴한다.
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN insufficient_privilege OR feature_not_supported OR undefined_file THEN
    RAISE NOTICE 'pg_cron 확장을 사용할 수 없어 계좌 파기 스케줄 등록을 건너뜁니다.';
    RETURN;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-cashout-accounts'
  ) THEN
    PERFORM cron.schedule(
      'purge-expired-cashout-accounts',
      '17 3 * * *',
      $CRON$SELECT public.purge_expired_cashout_accounts(5000);$CRON$
    );
  END IF;
EXCEPTION WHEN undefined_table OR invalid_schema_name OR insufficient_privilege THEN
  RAISE NOTICE 'pg_cron job 등록 권한이 없어 계좌 파기 스케줄을 건너뜁니다.';
END $$;

COMMIT;
