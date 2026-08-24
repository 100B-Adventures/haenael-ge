-- 환전 중 클로버 잠금(A안). 회장 확정 원문(2026-08-21): "A안이지 실제로 빠져나갔을때 빠져나가야지".
-- 설계 정본: docs/fdd-haenael-ge-cashout-clover-lock-v1.0.0-opus5.md (§6 D1~D4, §7 전이표, §9 API 계약)
--
-- 변경 요지:
--   1. create_cashout_request  : 신청은 총량 불변 — CASHOUT_HOLD delta=0, balance_after=변경 전 총량 (D1=A-1)
--   2. admin_mark_cashout_paid : 입금 완료가 총량이 줄어드는 유일한 시점 — CASHOUT_SETTLED delta=-N
--   3. admin_reject_cashout    : 반려는 잠금 해제일 뿐 잔액 불변 — CASHOUT_REVERSAL delta=0
--   4. clover_eligibility      : locked_amount·available_amount 신규 반환(D3=C-1), payable_amount에서 잠김 차감
--
-- 불변(건드리지 않음): 계좌 마스킹, request_key 멱등, advisory lock, KYC 게이트, 계산식(§6-(c)),
-- 계좌 열람 10분 게이트(cashout_account_access_log)·v_actor_id NULL 거부·account_purged_at
-- 파기 가드(20260802010000_cashout_security_hardening.sql 원문 그대로 복원, 컨트롤러 재검증 MAJOR2).
-- 백필 없음(D2=B-1): 운영 DB 실조회 결과 cashout_request 0건 · CASHOUT_* 원장 0건(§11).
--
-- 5. request_manual_cashout(text) 폐기(컨트롤러 재검증 MAJOR1): B안 그대로 총량을 즉시
--    깎는 구 RPC가 20260821000000에서 CREATE OR REPLACE + authenticated GRANT로 살아있었다.
--    UI가 안 부른다는 것은 PostgREST 앞단 접근 제어가 아니다 — DROP으로 호출 경로 자체를 없앤다.

BEGIN;

DROP FUNCTION IF EXISTS public.request_manual_cashout(text);

-- ---------------------------------------------------------------------------
-- 1. clover_eligibility — RETURNS TABLE 컬럼 추가라 DROP 후 재생성 필요(§9 R5).
--    GRANT 재부여를 빠뜨리면 즉시 403 — 아래에서 반드시 재확인한다.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.clover_eligibility(uuid);

CREATE FUNCTION public.clover_eligibility(p_member_id uuid)
RETURNS TABLE(
  total_balance      integer,
  welcome_amount     integer,
  locked_amount      integer,
  available_amount   integer,
  payable_amount     integer,
  min_cashout_clover integer,
  reached_threshold  boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total integer;
  v_welcome integer;
  v_locked integer;
  v_min integer := public.min_cashout_clover();
BEGIN
  -- SECURITY DEFINER 함수 안의 current_user는 호출자가 아니라 함수 소유자다.
  -- Supabase 호출자 권한은 auth.role()/auth.uid() JWT 클레임으로 판정한다.
  IF current_user IS DISTINCT FROM 'service_role'
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND auth.uid() IS DISTINCT FROM p_member_id THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(cb.clover_count, 0)
  INTO v_total
  FROM public.clover_balance AS cb
  WHERE cb.member_id = p_member_id;
  v_total := COALESCE(v_total, 0);

  SELECT COALESCE(sum(cl.clover_delta), 0)::integer
  INTO v_welcome
  FROM public.clover_ledger AS cl
  WHERE cl.member_id = p_member_id
    AND cl.entry_type IN ('WELCOME_GRANT', 'WELCOME_REVERSAL');
  v_welcome := GREATEST(COALESCE(v_welcome, 0), 0);

  -- 진행 중 신청의 clover_amount 합 = 잠긴 클로버(§8-3). 이 상태 집합은
  -- create_cashout_request의 중복 신청 차단 집합·admin_mark_cashout_paid/
  -- admin_reject_cashout의 종결 가드(status='REQUESTED')와 반드시 같은 집합이어야
  -- 한다(I3, §16-R6). 컨트롤러 재검증 MINOR 수정: 이번 슬라이스(수동 정산, §0-1)는
  -- KYC_PENDING/APPROVED/PAYOUT_SENT로 전이시키는 RPC가 하나도 없다(grep 실측 — enum
  -- 값은 존재하나 자동 지급대행 슬라이스를 위해 예약된 미사용 값). 종결 RPC 두 개가
  -- 여전히 'REQUESTED'만 가드하는 상태에서 저 3개 상태까지 "진행 중"으로 세면, 만에
  -- 하나 그 상태로 전이되는 경로가 생겼을 때 지급도 반려도 못 하는 채 클로버가 영구
  -- 잠기고 새 신청도 영구 차단되는 탈출구 없는 함정이 된다. REQUESTED로 좁혀 이 슬라이스
  -- 전체에서 그 함정 자체를 없앤다. 자동 지급대행을 도입하는 다음 슬라이스가 실제 전이
  -- RPC를 만들 때, 이 집합과 종결 가드를 "함께" 넓히는 것을 그 설계의 책임으로 넘긴다.
  SELECT COALESCE(sum(cr.clover_amount), 0)::integer
  INTO v_locked
  FROM public.cashout_request AS cr
  WHERE cr.member_id = p_member_id
    AND cr.status = 'REQUESTED';
  v_locked := COALESCE(v_locked, 0);

  RETURN QUERY SELECT
    v_total,
    v_welcome,
    v_locked,
    GREATEST(v_total - v_locked, 0),                 -- available_amount (I1)
    GREATEST(v_total - v_welcome - v_locked, 0),      -- payable_amount (의미 변경: 잠김도 차감)
    v_min,
    (v_total >= v_min);                               -- reached_threshold: total 기준 유지 (D4-D1)
END;
$$;

COMMENT ON FUNCTION public.clover_eligibility(uuid) IS
  '환전 자격/잔액 파생. total/welcome/locked/available/payable을 한 스냅샷에서 계산한다(balance conflation 방지, §15 Formance).';

REVOKE ALL ON FUNCTION public.clover_eligibility(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clover_eligibility(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. create_cashout_request — 원장 기록 규칙만 변경(§9.3). 시그니처·검증·멱등·
--    암호화·마스킹·advisory lock·KYC 게이트는 20260821000000 정의를 한 글자도 바꾸지 않는다.
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
  '환전 신청(A안): 총량은 건드리지 않고 잠금만 건다(CASHOUT_HOLD delta=0). 총량 감소는 admin_mark_cashout_paid 하나뿐.';

REVOKE ALL ON FUNCTION public.create_cashout_request(
  uuid, integer, text, text, text, text, smallint, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_cashout_request(
  uuid, integer, text, text, text, text, smallint, text, text
) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. admin_mark_cashout_paid — 총량이 줄어드는 유일한 지점(§9.4).
--    ⚠️ R1: 이중 실행 = 이중 차감. 상태 가드(status='REQUESTED') + 유니크 인덱스
--    (cashout_terminal_ledger_unique) 2겹 방어. 음수 방어는 명시적 에러로(CHECK에 의존 X).
--    ⚠️ 컨트롤러 재검증 MAJOR2 수정: base를 20260802010000_cashout_security_hardening.sql로
--    다시 잡아 그 3개 보안 게이트(계좌열람 10분 게이트·v_actor_id NULL 거부·
--    account_purged_at 파기 가드)를 원문 그대로 복원했다. A안 변경은 총량 감소(delta=-N)
--    한 곳뿐이고, 그 외 검증 순서·에러코드는 20260802010000과 라인 단위로 동일하다.
-- ---------------------------------------------------------------------------

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
  v_new_balance integer;
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

  -- 계좌 열람 10분 게이트(20260802010000 복원): 같은 관리자가 이 요청의 계좌를 최근
  -- 10분 안에 열람(admin_reveal_cashout_account)한 감사기록이 없으면 지급 확정을 거부한다.
  -- 송금 감사추적(누가 계좌를 실제로 보고 보냈는가)을 지급 확정과 강하게 결합시키는 장치다.
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

  -- 상태 가드(방어 1/2): 동시 2회 호출 중 한 트랜잭션만 REQUESTED→PAID 전이에 성공한다.
  -- account_purged_at IS NULL(20260802010000 복원): 90일 파기 스케줄러가 계좌 암호문을
  -- 이미 지운 요청은 지급 완료로 전이할 수 없다(원문 없이 "지급했다"고 기록되는 사고 방지).
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

  v_new_balance := COALESCE(v_balance, 0) - v_request.clover_amount;
  IF v_new_balance < 0 THEN
    -- clover_balance CHECK(clover_count >= 0)가 최종 백스톱이지만, 여기서 먼저
    -- 명시적 에러로 실패한다(§9.4 build 필수 권고 — CHECK 위반 메시지에 의존 금지).
    RAISE EXCEPTION 'cashout_settle_would_go_negative' USING ERRCODE = '55000';
  END IF;

  -- 총량 감소 지점(I4: 환전 경로 한정 유일한 감소, §16-R2). 유니크 인덱스
  -- cashout_terminal_ledger_unique(entry_type, ref_id)가 두 번째 SETTLED를 차단한다(방어 2/2).
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
    -v_request.clover_amount,
    'cashout_request',
    v_request.id,
    v_new_balance
  );

  RETURN QUERY SELECT v_request.id, v_request.status, v_request.paid_at;
END;
$$;

COMMENT ON FUNCTION public.admin_mark_cashout_paid(bigint, text) IS
  '환전 입금 확정(A안): 총량이 줄어드는 유일한 시점. CASHOUT_SETTLED delta=-clover_amount. '
  '이중 실행은 상태가드+유니크 인덱스 2겹 방어. 지급 전 계좌 열람 10분 게이트·파기 가드는 20260802010000 그대로 유지.';

REVOKE ALL ON FUNCTION public.admin_mark_cashout_paid(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_cashout_paid(bigint, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. admin_reject_cashout — 잠금 해제. 총량은 애초에 안 줄었으므로 되돌릴 것이 없다(§9.5).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_reject_cashout(
  p_request_id bigint,
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
  IF NOT public.is_admin() THEN
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
    processed_by = auth.uid(),
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

  -- 반려 = 잠금 해제 표식만. 총량은 애초에 줄지 않았으므로 delta=0, balance_after=현재값 그대로.
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
    0,
    'cashout_request',
    v_request.id,
    COALESCE(v_balance, 0)
  );

  RETURN QUERY SELECT v_request.id, v_request.status, v_request.rejected_at;
END;
$$;

COMMENT ON FUNCTION public.admin_reject_cashout(bigint, text) IS
  '환전 반려(A안): 잠금 해제일 뿐 잔액 불변. CASHOUT_REVERSAL delta=0(복원이 아니라 표식).';

REVOKE ALL ON FUNCTION public.admin_reject_cashout(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_cashout(bigint, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. my_cashout_status — 컨트롤러 재검증 MAJOR1 수정.
--    입금완료 화면이 "감소 전 총량"을 라이브 clover_eligibility에서 역산(total + clover_amount)
--    하면, 지급 이후 새 응원이 도착하거나 조회가 실패하는 순간 존재한 적 없는 숫자가 나온다
--    (예: 지급 후 EARN 10 도착 → "60개에서 30개가 됐어요"의 60은 허구). 확정 시점 값은
--    CASHOUT_SETTLED 원장 행에 이미 박혀 있다 — balance_after가 감소 후, balance_after - clover_delta가
--    감소 전이다(clover_delta가 음수이므로 뺄셈이 곧 덧셈). RETURNS TABLE 컬럼 추가라 DROP 필요.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.my_cashout_status();

CREATE FUNCTION public.my_cashout_status()
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
  processing_note text,
  settled_balance_before integer,
  settled_balance_after integer
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
    cr.processing_note,
    (settled.balance_after - settled.clover_delta) AS settled_balance_before,
    settled.balance_after AS settled_balance_after
  FROM public.cashout_request AS cr
  LEFT JOIN public.clover_ledger AS settled
    ON settled.ref_type = 'cashout_request'
   AND settled.ref_id = cr.id
   AND settled.entry_type = 'CASHOUT_SETTLED'
  WHERE cr.member_id = auth.uid()
  ORDER BY
    CASE WHEN cr.status = 'REQUESTED' THEN 0 ELSE 1 END,
    cr.requested_at DESC,
    cr.id DESC
  LIMIT 1
$$;

COMMENT ON FUNCTION public.my_cashout_status() IS
  'A안: settled_balance_before/after는 PAID 확정 시점 CASHOUT_SETTLED 원장 스냅샷(라이브 재계산 금지, MAJOR1). REQUESTED/REJECTED는 NULL.';

REVOKE ALL ON FUNCTION public.my_cashout_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_cashout_status() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. 원장 해석 시점 규칙 박제(§11-2). 소급 수정하지 않는다 — 시간 축으로 해석이 갈린다.
-- ---------------------------------------------------------------------------

COMMENT ON TYPE public.clover_entry_type_enum IS
  '환전 원장 해석은 시점으로 갈린다: 2026-08-22 이전 CASHOUT_HOLD는 delta<0(즉시 차감, B안). '
  '이후 CASHOUT_HOLD는 delta=0(잠금 표식, A안), CASHOUT_SETTLED가 delta<0(총량 감소는 PAID 하나뿐).';

COMMIT;
