-- =============================================================================
-- 전화번호 없는 수취인: 결제 확정 후 기존 INAPP 알림 유지 (pgTAP)
-- =============================================================================

BEGIN;

SELECT plan(7);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
)
VALUES (
  'fa11baac-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'alimtalk-fallback@test.local', '', now(), now(),
  '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
);

INSERT INTO member (id, nickname, phone)
VALUES ('fa11baac-0000-0000-0000-000000000001', '인앱폴백', NULL);

INSERT INTO goal (id, member_id, slug, title, due_date, status)
OVERRIDING SYSTEM VALUE
VALUES (980001, 'fa11baac-0000-0000-0000-000000000001', 'alimtalk-fallback', '인앱 알림 해낼게', current_date + 7, 'ACTIVE');

-- 목표 생성 웰컴 훅 부산물은 이 결제 픽스처와 무관하므로 제거한다.
DELETE FROM clover_ledger WHERE member_id = 'fa11baac-0000-0000-0000-000000000001';
DELETE FROM cheer WHERE goal_id = 980001 AND is_welcome = true;
DELETE FROM clover_balance WHERE member_id = 'fa11baac-0000-0000-0000-000000000001';

INSERT INTO payment (id, order_id, amount_krw, status, pg_customer_key)
OVERRIDING SYSTEM VALUE
VALUES (980001, 'hnl_alimtalk_fallback_01', 1000, 'READY', 'alimtalk-fallback-customer');

INSERT INTO cheer (id, goal_id, payment_id, display_name, is_anonymous, clover_amount, status)
OVERRIDING SYSTEM VALUE
VALUES (980001, 980001, 980001, '응원자', false, 1, 'PENDING');

SELECT is((SELECT phone FROM member WHERE id = 'fa11baac-0000-0000-0000-000000000001'), NULL,
  '폴백 픽스처의 member.phone은 NULL이다');

SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$SELECT * FROM confirm_cheer_payment(
    'hnl_alimtalk_fallback_01', 'payment_alimtalk_fallback_01', 1000,
    'CARD', now(), NULL, '{"test":"alimtalk-fallback"}'::jsonb
  )$$,
  '전화번호가 없어도 결제 확정 RPC는 성공한다'
);
RESET ROLE;

SELECT is((SELECT status::text FROM payment WHERE id = 980001), 'DONE',
  '전화번호 부재가 payment DONE을 막지 않는다');
SELECT is((SELECT status::text FROM cheer WHERE id = 980001), 'CONFIRMED',
  '전화번호 부재가 cheer CONFIRMED를 막지 않는다');
SELECT is((SELECT count(*)::integer FROM notification
  WHERE member_id = 'fa11baac-0000-0000-0000-000000000001'
    AND type = 'CHEER_RECEIVED' AND channel = 'INAPP'), 1,
  '전화번호 없는 경우 기존 INAPP 알림이 정확히 1건 생성된다');
SELECT is((SELECT count(*)::integer FROM notification
  WHERE member_id = 'fa11baac-0000-0000-0000-000000000001'
    AND channel = 'ALIMTALK'), 0,
  '전화번호 없는 경우 ALIMTALK 알림 행은 생성되지 않는다');
SELECT is((SELECT count(*)::integer FROM clover_ledger
  WHERE member_id = 'fa11baac-0000-0000-0000-000000000001'
    AND entry_type = 'EARN'), 1,
  '인앱 폴백과 무관하게 원장 EARN은 정확히 1건이다');

SELECT * FROM finish();
ROLLBACK;
