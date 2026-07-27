-- =============================================================================
-- release_v1_hardening_fix — v1.0.0 출시 직전 Codex money-code 2nd-pass REJECT 4건 수정
-- =============================================================================
-- 배경: qa-verifier가 20260714110000_payment_webhook_reconciliation.sql /
-- 20260714130000_release_review_fixes.sql에 Codex 2nd-pass를 처음 실행해
-- REJECT 4건을 발견(2026-07-16). 회장 결정: 4건 전부 수정 후에만 재승인.
-- 기존 적용 마이그레이션 파일은 직접 수정하지 않는다 — 전부 신규 마이그레이션.
--
-- 담는 것:
--   1) reconcile_canceled_payment — p_payment_key NULL 우회 방지
--      (IS NOT NULL AND != → IS DISTINCT FROM, record_partial_cancel_review와
--      동일한 NULL-safe 패턴).
--   2) reconcile_canceled_payment — DONE 취소 시 잔액부족을 예외로 영구 롤백하는
--      대신 durable risk marker(payment.cancel_reconcile_required_at)로 수렴.
--      Toss는 CANCELED인데 DB가 DONE에 영구 고착되고 웹훅 재시도가 매번 500으로
--      실패하던 문제 해소. 반환 시그니처에 review_required 컬럼 추가 —
--      호출자(toss-webhook-handler.ts)가 "정상 취소완료"와 "수동검토 필요"를
--      구분할 수 있게 한다. 반환 타입이 바뀌므로 CREATE OR REPLACE 불가 —
--      DROP FUNCTION 후 재생성(REVOKE/GRANT 재선언 포함).
--   3) capture_lead — NULL/빈 submitter_hash 가드를 advisory lock 획득 전에 추가.
--      EF가 이미 503으로 막고 있어 실도달은 없지만, SECURITY DEFINER 금전/개인정보
--      인접 RPC는 호출자를 신뢰하면 안 된다(향후 다른 호출자 대비).
--   4) capture_lead — 이메일/인스타그램 SELECT-then-INSERT 레이스 수정.
--      create_cheer_order의 customer→goal 고정순서 advisory lock과 동일 원칙으로
--      email 먼저 → instagram 나중 순서를 항상 고정해 잠그고, 그 안에서
--      SELECT-then-INSERT를 직렬화한다. 방어적으로 INSERT를 unique_violation
--      예외 처리로 감싸 raw 23505가 호출자에게 노출되는 경로를 0으로 만든다.
-- =============================================================================

-- =====================
-- 3+4. capture_lead — NULL 가드 + advisory lock 기반 dedup 레이스 방지
-- =====================
-- 시그니처(10-인자: text,text,timestamptz,text,text,text,text,text,text,text)와
-- 반환 타입(TABLE(lead_id bigint, is_duplicate boolean))이 기존과 동일하므로
-- CREATE OR REPLACE로 충분 — DROP 불필요, 기존 GRANT도 유지된다.

CREATE OR REPLACE FUNCTION capture_lead(
  p_email text, p_instagram_handle text, p_consented_at timestamptz,
  p_source text, p_medium text, p_campaign text, p_content text,
  p_referrer text, p_landing_path text, p_submitter_hash text
)
RETURNS TABLE(lead_id bigint, is_duplicate boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id bigint;
BEGIN
  -- (3) 빈 해시로 advisory lock을 거는 것 자체가 무의미하므로 잠금 획득 전에 가드.
  IF p_submitter_hash IS NULL OR p_submitter_hash = '' THEN
    RAISE EXCEPTION 'submitter_hash_required' USING ERRCODE = '22023';
  END IF;

  -- (4) 동일 이메일(또는 동일 인스타그램)로 오는 동시 신규 제출 레이스 방지.
  -- create_cheer_order(20260713180819)의 customer→goal 고정순서 잠금과 동일
  -- 원칙: 이 함수가 이 두 잠금을 획득하는 유일한 경로이므로 email 먼저 →
  -- instagram 나중 순서가 모든 호출에서 절대 바뀌지 않는다 → 데드락 불가능.
  -- pg_advisory_xact_lock은 트랜잭션(=이 함수 호출) COMMIT/ROLLBACK 시 자동
  -- 해제되므로 명시적 unlock 불필요.
  IF p_email IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('lead:email:' || lower(p_email), 0));
  END IF;
  IF p_instagram_handle IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('lead:ig:' || lower(p_instagram_handle), 0));
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('lead:' || p_submitter_hash, 0));
  IF (SELECT count(*) FROM lead WHERE submitter_hash = p_submitter_hash AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'lead_rate_limited' USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_id FROM lead
    WHERE (p_email IS NOT NULL AND lower(email) = lower(p_email))
       OR (p_instagram_handle IS NOT NULL AND lower(instagram_handle) = lower(p_instagram_handle))
    LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN QUERY SELECT v_id, true; RETURN; END IF;

  BEGIN
    INSERT INTO lead(email, instagram_handle, consented_at, source, medium, campaign, content, referrer, landing_path, submitter_hash)
      VALUES(p_email, p_instagram_handle, p_consented_at, p_source, p_medium, p_campaign, p_content, p_referrer, p_landing_path, p_submitter_hash)
      RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    -- 방어적 안전망: 위 advisory lock이 email/instagram 값 기준으로 이미
    -- 이 지점을 직렬화하므로 정상 경로에서는 도달하지 않는다. 그래도 raw
    -- 23505가 호출자에게 노출되는 경로를 0으로 만들기 위해 유지한다.
    SELECT id INTO v_id FROM lead
      WHERE (p_email IS NOT NULL AND lower(email) = lower(p_email))
         OR (p_instagram_handle IS NOT NULL AND lower(instagram_handle) = lower(p_instagram_handle))
      LIMIT 1;
    RETURN QUERY SELECT v_id, true; RETURN;
  END;

  RETURN QUERY SELECT v_id, false;
END $$;

-- =====================
-- 1+2. reconcile_canceled_payment — NULL-safe payment_key 비교 + durable 잔액부족 마커
-- =====================

ALTER TABLE payment ADD COLUMN IF NOT EXISTS cancel_reconcile_required_at timestamptz;
COMMENT ON COLUMN payment.cancel_reconcile_required_at IS
  'Toss 취소가 확인됐지만 클로버 잔액 부족으로 자동 원장 역산이 불가능해 수동검토가 필요함을 표시하는 durable 마커. record_partial_cancel_review의 partial_cancel_reviewed_at과 동일 원칙 — 세팅되면 같은 order_id 재시도는 risk_event를 다시 쌓지 않고 멱등하게 review_required=true를 반환한다.';

-- 반환 타입이 바뀌므로(review_required 컬럼 추가) CREATE OR REPLACE 불가 —
-- 먼저 DROP한다(시그니처는 4-인자로 기존과 동일).
DROP FUNCTION IF EXISTS reconcile_canceled_payment(text, text, integer, jsonb);

CREATE FUNCTION reconcile_canceled_payment(
  p_order_id text,
  p_payment_key text,
  p_amount_krw integer,
  p_detail jsonb
)
RETURNS TABLE(payment_id bigint, payment_status payment_status_enum, idempotent boolean, review_required boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment payment%ROWTYPE;
  v_cheer cheer%ROWTYPE;
  v_goal goal%ROWTYPE;
  v_balance integer;
BEGIN
  SELECT * INTO v_payment FROM payment WHERE order_id = p_order_id FOR UPDATE;
  IF v_payment.id IS NULL THEN RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_payment.amount_krw != p_amount_krw THEN RAISE EXCEPTION 'amount_mismatch' USING ERRCODE = '22023'; END IF;

  -- (1) p_payment_key가 NULL이면 기존 `IS NOT NULL AND !=` 비교는 AND 전체가
  -- NULL(=false 취급)로 평가돼 불일치 검증을 통과시켜버렸다(웹훅 위조/오배달
  -- 우회 경로). record_partial_cancel_review가 이미 쓰는 NULL-safe 패턴으로 교체 —
  -- 양쪽 NULL도, 한쪽만 NULL도, 값이 다른 경우도 전부 정확히 판정한다.
  IF v_payment.payment_key IS DISTINCT FROM p_payment_key THEN
    RAISE EXCEPTION 'payment_key_mismatch' USING ERRCODE = '22023';
  END IF;

  IF v_payment.status = 'CANCELED' THEN
    RETURN QUERY SELECT v_payment.id, v_payment.status, true, false;
    RETURN;
  END IF;

  -- (2) 이미 잔액부족으로 수동검토 마킹된 결제의 웹훅 재시도 — risk_event를
  -- 다시 쌓지 않고 멱등하게 review_required=true만 반환한다
  -- (record_partial_cancel_review의 partial_cancel_reviewed_at IS NOT NULL THEN
  -- RETURN true와 동일한 멱등 원칙).
  IF v_payment.cancel_reconcile_required_at IS NOT NULL THEN
    RETURN QUERY SELECT v_payment.id, v_payment.status, true, true;
    RETURN;
  END IF;

  IF v_payment.status NOT IN ('READY', 'DONE') THEN
    RAISE EXCEPTION 'invalid_payment_status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_cheer FROM cheer WHERE cheer.payment_id = v_payment.id FOR UPDATE;
  IF v_cheer.id IS NULL THEN RAISE EXCEPTION 'cheer_not_found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_goal FROM goal WHERE id = v_cheer.goal_id;

  IF v_payment.status = 'DONE' THEN
    SELECT clover_count INTO v_balance FROM clover_balance WHERE member_id = v_goal.member_id FOR UPDATE;
    IF v_balance IS NULL OR v_balance < v_cheer.clover_amount THEN
      -- (2) 예외로 롤백하면 Toss=CANCELED인데 DB는 DONE에 영구 고착되고 웹훅이
      -- 재시도할 때마다 매번 500이 반복된다. 대신 durable risk marker로
      -- 수렴시키고 트랜잭션은 커밋한다 — record_partial_cancel_review와 동일 원칙.
      UPDATE payment SET cancel_reconcile_required_at = now(),
        raw_response = COALESCE(raw_response, '{}'::jsonb)
          || jsonb_build_object('cancelReconcileRequired', COALESCE(p_detail, '{}'::jsonb))
        WHERE id = v_payment.id;
      INSERT INTO risk_event(member_id, type, detail)
        VALUES (v_goal.member_id, 'PAYMENT_CANCEL_BALANCE_INSUFFICIENT',
          COALESCE(p_detail, '{}'::jsonb) || jsonb_build_object(
            'orderId', p_order_id, 'balance', v_balance, 'required', v_cheer.clover_amount
          ));
      RETURN QUERY SELECT v_payment.id, v_payment.status, false, true;
      RETURN;
    END IF;
    UPDATE clover_balance
      SET clover_count = clover_count - v_cheer.clover_amount, updated_at = now()
      WHERE member_id = v_goal.member_id;
    INSERT INTO clover_ledger(member_id, entry_type, clover_delta, ref_type, ref_id, balance_after)
      VALUES (v_goal.member_id, 'REFUND_REVERSAL', -v_cheer.clover_amount, 'cheer', v_cheer.id, v_balance - v_cheer.clover_amount);
  END IF;

  UPDATE cheer SET status = 'REFUNDED' WHERE id = v_cheer.id;
  UPDATE payment SET status = 'CANCELED', payment_key = COALESCE(payment_key, p_payment_key),
    raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object('webhookCancellation', COALESCE(p_detail, '{}'::jsonb))
    WHERE id = v_payment.id;
  INSERT INTO payment_log(payment_id, from_status, to_status, detail)
    VALUES (v_payment.id, v_payment.status, 'CANCELED', COALESCE(p_detail, '{}'::jsonb) || jsonb_build_object('source', 'toss-webhook'));

  RETURN QUERY SELECT v_payment.id, 'CANCELED'::payment_status_enum, false, false;
END;
$$;

REVOKE ALL ON FUNCTION reconcile_canceled_payment(text, text, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reconcile_canceled_payment(text, text, integer, jsonb) TO service_role;
