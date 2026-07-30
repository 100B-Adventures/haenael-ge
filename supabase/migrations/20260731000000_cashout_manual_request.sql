-- 수동 정산(환전) 신청 — 지급대행 승인 전 임시 운영.
-- 주인공이 최소 30클로버 도달 시 신청 → cashout_request(REQUESTED) + 친구분 클로버 CASHOUT_HOLD.
-- 실지급은 회장이 오프라인(계좌이체). 계좌번호는 우리 DB에 저장하지 않고(PII 최소화) contact로 연락받아 오프라인 수집.
-- ⚠️ 머니코드: 원장 HOLD로 잔액 차감(중복신청·이중지급 방지). SECURITY DEFINER 본인확인.

BEGIN;

-- 연락처 컬럼(신청 시 회장이 연락할 수단). 계좌는 저장 안 함.
ALTER TABLE public.cashout_request
  ADD COLUMN IF NOT EXISTS contact text;

CREATE OR REPLACE FUNCTION public.request_manual_cashout(p_contact text)
RETURNS TABLE(request_id bigint, net_krw integer, clover_amount integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member   uuid := auth.uid();
  v_total    integer;
  v_payable  integer;
  v_reached  boolean;
  v_min      integer := min_cashout_clover();
  v_gross    integer;
  v_withhold integer;
  v_net      integer;
  v_new_bal  integer;
  v_id       bigint;
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

  -- 금액 계산(1클로버=1,000원, 원천징수 3.3%, take-rate 미정=fee 0).
  -- bigint 중간계산으로 곱셈 overflow 회피. integer 컬럼 범위 초과(≈21.4억원)면 신청 거부.
  IF (v_payable::bigint * 1000) > 2000000000 THEN
    RAISE EXCEPTION '환전 가능 한도를 초과했어요. 나눠서 신청해 주세요' USING ERRCODE = '22003';
  END IF;
  v_gross    := (v_payable::bigint * 1000)::integer;
  v_withhold := floor(v_gross::bigint * 33 / 1000)::integer;
  v_net      := v_gross - v_withhold;

  INSERT INTO cashout_request(
    member_id, clover_amount, gross_krw, fee_krw, withholding_krw, net_krw, status, contact
  ) VALUES (
    v_member, v_payable, v_gross, 0, v_withhold, v_net, 'REQUESTED', btrim(p_contact)
  ) RETURNING id INTO v_id;

  -- 친구분 클로버 HOLD(잔액 차감 — 트리거가 clover_balance 동기화). 웰컴은 잔존.
  v_new_bal := v_total - v_payable;
  INSERT INTO clover_ledger(member_id, entry_type, clover_delta, ref_type, ref_id, balance_after)
  VALUES (v_member, 'CASHOUT_HOLD', -v_payable, 'cashout', v_id, v_new_bal);

  RETURN QUERY SELECT v_id, v_net, v_payable;
END;
$$;

COMMENT ON FUNCTION public.request_manual_cashout(text) IS
  '수동 정산 환전 신청: 본인 도달 시 cashout_request(REQUESTED)+친구분 CASHOUT_HOLD. 실지급은 오프라인.';

REVOKE ALL ON FUNCTION public.request_manual_cashout(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_manual_cashout(text) TO authenticated;

COMMIT;
