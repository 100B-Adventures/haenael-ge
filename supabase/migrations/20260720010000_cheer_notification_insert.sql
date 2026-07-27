-- 20260720010000_cheer_notification_insert.sql
-- 갭 수선: 응원 결제 성공(cheer CONFIRMED) 시 받는사람(goal 소유자)에게
-- 인앱 알림(notification INSERT)이 전혀 생성되지 않던 결함.
-- api-contract.md N1/N2 설계엔 있으나 미구현 상태였음 — notify EF는 존재하나
-- toss-confirm/RPC 어디서도 호출되지 않아 NotificationBadge가 영구 empty였다.
--
-- 방식(a) 채택 — confirm_cheer_payment RPC 트랜잭션 내부에서 notification INSERT:
--   결제확정(payment DONE)·응원확정(cheer CONFIRMED)·원장적립(clover_ledger EARN)과
--   같은 트랜잭션 안에 묶어 원자성을 보장한다. EF에서 별도 INSERT(방식 b)를 택하면
--   RPC 성공 후 EF가 죽거나 네트워크 실패 시 결제는 확정됐는데 알림만 누락되는
--   창(window)이 생긴다 — RPC 내부 삽입은 그 창을 구조적으로 없앤다.
--   필요한 데이터(v_goal.member_id, v_goal.title, v_cheer.display_name)가 이미
--   같은 함수 스코프에 있어 추가 조회 비용도 없다.
--
-- 멱등성: 위 IF v_payment.status = 'DONE' THEN ... RETURN; END IF; 블록이 결제
-- 재시도(order_id UNIQUE + payment_key 재확인)를 이미 여기서 조기 반환시킨다.
-- notification INSERT는 이 조기 반환 "이후" 블록(최초 1회만 실행되는 구간)에
-- 위치하므로, toss-confirm의 idempotent replay(existingPayment.status==='DONE')
-- 경로에서도 notification이 중복 생성되지 않는다.
--
-- channel=INAPP 고정, alimtalk_status=NULL — N2(카카오 알림톡)는 member.phone
-- 컬럼이 스키마에 없어 이번 스코프에서 미구현(TODO: phone 확보 후 notify EF 연동,
-- 알림톡 채널로 전환). 메시지 문구는 클라이언트(NotificationBadge.tsx)가
-- notification.type만 보고 렌더링하므로 이 INSERT는 금액을 전혀 다루지 않는다
-- (api-contract 금액 3층 정책 — 알림엔 금액 노출 금지).

BEGIN;

CREATE OR REPLACE FUNCTION confirm_cheer_payment(
  p_order_id text,
  p_payment_key text,
  p_amount_krw integer,
  p_method text,
  p_approved_at timestamptz,
  p_receipt_url text,
  p_raw_response jsonb
)
RETURNS TABLE(
  payment_id bigint,
  cheer_id bigint,
  member_id uuid,
  goal_title text,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment payment%ROWTYPE;
  v_cheer cheer%ROWTYPE;
  v_goal goal%ROWTYPE;
  v_prev_balance integer;
  v_next_balance integer;
BEGIN
  IF p_order_id IS NULL OR p_order_id !~ '^[A-Za-z0-9_=.-]{6,64}$' THEN
    RAISE EXCEPTION 'invalid_order_id' USING ERRCODE = '22023';
  END IF;

  IF p_payment_key IS NULL OR p_payment_key !~ '^[A-Za-z0-9_=.-]{6,200}$' THEN
    RAISE EXCEPTION 'invalid_payment_key' USING ERRCODE = '22023';
  END IF;

  IF p_amount_krw NOT IN (1000, 3000, 5000, 10000) THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_payment
  FROM payment p
  WHERE p.order_id = p_order_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.amount_krw != p_amount_krw THEN
    RAISE EXCEPTION 'amount_mismatch' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_cheer
  FROM cheer c
  WHERE c.payment_id = v_payment.id
  FOR UPDATE;

  IF v_cheer.id IS NULL THEN
    RAISE EXCEPTION 'cheer_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_goal
  FROM goal g
  WHERE g.id = v_cheer.goal_id
  FOR UPDATE;

  IF v_goal.id IS NULL THEN
    RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.status = 'DONE' THEN
    IF v_payment.payment_key IS NOT NULL AND v_payment.payment_key != p_payment_key THEN
      RAISE EXCEPTION 'payment_key_mismatch' USING ERRCODE = '22023';
    END IF;

    RETURN QUERY SELECT
      v_payment.id,
      v_cheer.id,
      v_goal.member_id,
      v_goal.title,
      COALESCE(v_cheer.display_name, '익명의 누군가');
    RETURN;
  END IF;

  IF v_payment.status != 'READY' THEN
    RAISE EXCEPTION 'invalid_payment_status' USING ERRCODE = '22023';
  END IF;

  -- Serialize all balance changes for a receiver, including the first balance row.
  PERFORM 1
  FROM member m
  WHERE m.id = v_goal.member_id
  FOR UPDATE;

  SELECT COALESCE(cb.clover_count, 0) INTO v_prev_balance
  FROM clover_balance cb
  WHERE cb.member_id = v_goal.member_id
  FOR UPDATE;

  v_prev_balance := COALESCE(v_prev_balance, 0);
  v_next_balance := v_prev_balance + v_cheer.clover_amount;

  UPDATE payment
  SET
    status = 'DONE',
    payment_key = p_payment_key,
    method = NULLIF(p_method, ''),
    approved_at = COALESCE(p_approved_at, now()),
    receipt_url = NULLIF(p_receipt_url, ''),
    raw_response = COALESCE(p_raw_response, '{}'::jsonb)
  WHERE id = v_payment.id;

  UPDATE cheer
  SET status = 'CONFIRMED'
  WHERE id = v_cheer.id;

  INSERT INTO payment_log (payment_id, from_status, to_status, detail)
  VALUES (
    v_payment.id,
    'READY',
    'DONE',
    jsonb_build_object('source', 'confirm_cheer_payment', 'paymentKey', p_payment_key)
  );

  INSERT INTO clover_ledger (
    member_id,
    entry_type,
    clover_delta,
    ref_type,
    ref_id,
    balance_after
  )
  VALUES (
    v_goal.member_id,
    'EARN',
    v_cheer.clover_amount,
    'cheer',
    v_cheer.id,
    v_next_balance
  );

  -- 받는사람(goal 소유자)에게 인앱 알림 — 1회(위 DONE 조기반환 이후 구간이라 재시도 안전).
  -- 금액 미포함(3층 정책), 알림톡(ALIMTALK)은 TODO(phone 컬럼 부재로 이번 스코프 제외).
  INSERT INTO notification (
    member_id,
    type,
    channel,
    alimtalk_status,
    read
  )
  VALUES (
    v_goal.member_id,
    'CHEER_RECEIVED',
    'INAPP',
    NULL,
    false
  );

  RETURN QUERY SELECT
    v_payment.id,
    v_cheer.id,
    v_goal.member_id,
    v_goal.title,
    COALESCE(v_cheer.display_name, '익명의 누군가');
END;
$$;

COMMENT ON FUNCTION confirm_cheer_payment(text, text, integer, text, timestamptz, text, jsonb) IS
  '결제 서버승인 확정 트랜잭션: payment DONE + cheer CONFIRMED + clover_ledger EARN + notification(CHEER_RECEIVED, INAPP) — 2026-07-20 알림 갭 수선.';

COMMIT;
