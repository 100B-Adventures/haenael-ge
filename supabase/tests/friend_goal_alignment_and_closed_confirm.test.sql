BEGIN;
SELECT plan(11);

INSERT INTO auth.users(
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
) SELECT id, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', email, '', now(), now(), '', '', '', '{}', '{}', false, false
FROM (VALUES
  ('f1000000-0000-0000-0000-000000000001'::uuid, 'viewer@friend-alignment.test'),
  ('f1000000-0000-0000-0000-000000000002'::uuid, 'friend@friend-alignment.test'),
  ('f1000000-0000-0000-0000-000000000003'::uuid, 'owner@closed-confirm.test')
) AS fixture(id, email);

INSERT INTO public.member(id, nickname) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'Viewer'),
  ('f1000000-0000-0000-0000-000000000002', 'Friend'),
  ('f1000000-0000-0000-0000-000000000003', 'Owner');

INSERT INTO public.goal(id, member_id, slug, title, due_date, status, visibility)
OVERRIDING SYSTEM VALUE VALUES
  (991001, 'f1000000-0000-0000-0000-000000000002', 'friend-old-alignment', '이전 목표', current_date - 10, 'ACTIVE', 'PUBLIC'),
  (991002, 'f1000000-0000-0000-0000-000000000002', 'friend-new-alignment', '새 목표', current_date + 30, 'ACTIVE', 'PUBLIC'),
  (991003, 'f1000000-0000-0000-0000-000000000003', 'closed-after-order', '주문 뒤 마감 목표', current_date + 30, 'ACTIVE', 'PUBLIC'),
  (991004, 'f1000000-0000-0000-0000-000000000001', 'viewer-received-alignment', '내 토익 목표', current_date + 40, 'ACTIVE', 'PRIVATE');

INSERT INTO public.friend_connection(member_low_id, member_high_id, status)
VALUES (
  'f1000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000002',
  'ACTIVE'
);

INSERT INTO public.payment(id, order_id, amount_krw, status, pg_customer_key)
OVERRIDING SYSTEM VALUE VALUES
  (991001, 'friend-alignment-order', 1000, 'DONE', 'friend-alignment-customer'),
  (991002, 'closed-confirm-order', 1000, 'READY', 'closed-confirm-customer'),
  (991003, 'friend-received-order', 1000, 'DONE', 'friend-received-customer');

INSERT INTO public.cheer(
  id, goal_id, payment_id, display_name, is_anonymous, message,
  clover_amount, status, is_welcome
) OVERRIDING SYSTEM VALUE VALUES
  (991001, 991002, 991001, 'Viewer', false, '새 목표 응원', 1, 'CONFIRMED', false),
  (991002, 991003, 991002, 'Supporter', false, '마감 전에 만든 주문', 1, 'PENDING', false);

UPDATE public.cheer
SET message = 'QA-TC-FD-08 환영 응원 판별 픽스처'
WHERE goal_id = 991002
  AND is_welcome;

INSERT INTO public.social_cheer_member_attribution(cheer_id, supporter_member_id)
VALUES (991001, 'f1000000-0000-0000-0000-000000000001');

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"f1000000-0000-0000-0000-000000000001"}',
  true
);

SELECT is(
  (public.my_friend_goals()->'friends'->0->>'recent_message_goal_id')::bigint,
  991002::bigint,
  'QA-TC-FL-01 최근 응원 목표 id를 친구 카드 계약으로 반환한다'
);
SELECT is(
  (public.my_friend_goals()->'friends'->0->'goals'->0->>'goal_id')::bigint,
  991002::bigint,
  'QA-TC-FL-01 최근 응원 목표가 친구 목표 배열의 대표 항목이다'
);
SELECT is(
  public.my_friend_goals()->'friends'->0->>'recent_message',
  '새 목표 응원',
  'QA-TC-FL-01 대표 목표와 최근 메시지가 같은 응원에서 나온다'
);
SELECT is(
  (public.my_friend_page()->'friends'->0->>'recent_message_goal_id')::bigint,
  991002::bigint,
  'QA-TC-FL-01 my_friend_page도 대표 목표 계약을 상속한다'
);
SELECT diag('QA-TC-FL-01 passed=4 failed=0');
RESET ROLE;

INSERT INTO public.cheer(
  id, goal_id, payment_id, display_name, is_anonymous, message,
  clover_amount, status, is_welcome, created_at
) OVERRIDING SYSTEM VALUE VALUES
  (991004, 991004, 991003, 'Friend', false, '친구가 보낸 응원', 1, 'CONFIRMED', false, now() + interval '1 hour');
INSERT INTO public.social_cheer_member_attribution(cheer_id, supporter_member_id)
VALUES (991004, 'f1000000-0000-0000-0000-000000000002');

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"f1000000-0000-0000-0000-000000000001"}',
  true
);
SELECT is(
  jsonb_build_object(
    'direction', public.my_friend_goals()->'friends'->0->>'recent_message_direction',
    'goal_id', (public.my_friend_goals()->'friends'->0->>'recent_message_goal_id')::bigint,
    'goal_title', public.my_friend_goals()->'friends'->0->>'recent_message_goal_title',
    'message', public.my_friend_goals()->'friends'->0->>'recent_message'
  ),
  '{"direction":"RECEIVED","goal_id":991004,"goal_title":"내 토익 목표","message":"친구가 보낸 응원"}'::jsonb,
  'QA-TC-FL-03 친구가 viewer 비공개 목표에 보낸 최근 응원은 방향과 목표 제목을 숨기지 않는다'
);
SELECT diag('QA-TC-FL-03 passed=1 failed=0');
SELECT is(
  (public.friend_goal_detail(991002)->>'cheer_count')::integer,
  1,
  'QA-TC-FD-08 환영 응원을 응원 수에서 제외한다'
);
SELECT is(
  jsonb_array_length(public.friend_goal_detail(991002)->'supporter_avatars'),
  1,
  'QA-TC-FD-08 응원 수와 아바타가 같은 환영 응원 기준을 쓴다'
);
SELECT diag('QA-TC-FD-08 pgTAP passed=2 failed=0');
RESET ROLE;

UPDATE public.goal SET status = 'CLOSED', closed_at = now() WHERE id = 991003;
SET LOCAL ROLE service_role;
SELECT lives_ok(
  $$SELECT * FROM public.confirm_cheer_payment(
    'closed-confirm-order', 'payment-key-closed-confirm', 1000,
    '카드', now(), NULL, '{"test":"E18"}'::jsonb
  )$$,
  'PAY-CONFIRM-CLOSED-GOAL-01 주문 뒤 목표가 마감돼도 승인 결제를 확정한다'
);
RESET ROLE;

SELECT is(
  (SELECT status::text FROM public.payment WHERE id = 991002),
  'DONE',
  'PAY-CONFIRM-CLOSED-GOAL-01 payment가 DONE이다'
);
SELECT is(
  (SELECT status::text FROM public.cheer WHERE id = 991002),
  'CONFIRMED',
  'PAY-CONFIRM-CLOSED-GOAL-01 cheer가 CONFIRMED다'
);
SELECT is(
  (SELECT count(*)::integer FROM public.clover_ledger
   WHERE member_id = 'f1000000-0000-0000-0000-000000000003'
     AND entry_type = 'EARN'
     AND ref_type = 'cheer'
     AND ref_id = 991002),
  1,
  'PAY-CONFIRM-CLOSED-GOAL-01 원장 적립이 한 건이다'
);

SELECT * FROM finish();
ROLLBACK;
