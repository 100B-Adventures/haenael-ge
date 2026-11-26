-- friend_goal_created_inapp.test.sql — D-063 친구 새 목표 INAPP 계약

BEGIN;

SELECT plan(16);

SELECT ok(
  'FRIEND_GOAL_CREATED' = ANY(enum_range(NULL::public.notification_type_enum)::text[]),
  'FGN-01 친구 목표 전용 알림 타입이 존재한다'
);
SELECT has_column('public', 'notification', 'actor_member_id', 'FGN-02 actor 메타데이터가 존재한다');
SELECT has_column('public', 'notification', 'goal_id', 'FGN-03 목표 메타데이터가 존재한다');
SELECT has_column('public', 'notification', 'message', 'FGN-04 표시 문구가 존재한다');
SELECT has_trigger('public', 'goal', 'goal_notify_friends_created', 'FGN-05 목표 INSERT 트리거가 존재한다');
SELECT has_function(
  'public',
  'create_goal',
  ARRAY['text', 'text', 'date', 'text', 'text'],
  'FGN-05A 생성 RPC가 공개범위를 같은 트랜잭션에서 받는다'
);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
)
SELECT
  format('6a120000-0000-4000-8000-%s', lpad(suffix::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  format('friend-goal-%s@test.local', suffix), '', now(), now(),
  '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
FROM generate_series(1, 5) AS suffix;

INSERT INTO public.member (id, nickname, kyc_status)
VALUES
  ('6a120000-0000-4000-8000-000000000001', '새봄', 'NONE'),
  ('6a120000-0000-4000-8000-000000000002', '활성친구A', 'NONE'),
  ('6a120000-0000-4000-8000-000000000003', '활성친구B', 'NONE'),
  ('6a120000-0000-4000-8000-000000000004', '해제친구', 'NONE'),
  ('6a120000-0000-4000-8000-000000000005', '차단친구', 'NONE');

INSERT INTO public.friend_connection (
  member_low_id, member_high_id, status, blocked_by_member_id
)
VALUES
  ('6a120000-0000-4000-8000-000000000001', '6a120000-0000-4000-8000-000000000002', 'ACTIVE', NULL),
  ('6a120000-0000-4000-8000-000000000001', '6a120000-0000-4000-8000-000000000003', 'ACTIVE', NULL),
  ('6a120000-0000-4000-8000-000000000001', '6a120000-0000-4000-8000-000000000004', 'REMOVED', NULL),
  ('6a120000-0000-4000-8000-000000000001', '6a120000-0000-4000-8000-000000000005', 'BLOCKED', '6a120000-0000-4000-8000-000000000005');

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"6a120000-0000-4000-8000-000000000001","iss":"supabase-demo"}',
  true
);
SELECT public.create_goal(
  'RPC 비공개 목표',
  '',
  current_date + 31,
  NULL::text,
  'PRIVATE'
);
RESET ROLE;

SELECT is(
  (SELECT count(*)::integer FROM public.notification
   WHERE type = 'FRIEND_GOAL_CREATED'),
  0,
  'FGN-05B 생성 RPC의 PRIVATE 목표는 INSERT 시점에도 알리지 않는다'
);

INSERT INTO public.goal (member_id, slug, title, due_date, status, visibility)
VALUES (
  '6a120000-0000-4000-8000-000000000001',
  'friend-goal-public',
  '새 목표 해낼게',
  current_date + 30,
  'ACTIVE',
  'PUBLIC'
);

SELECT is(
  (SELECT count(*)::integer FROM public.notification
   WHERE type = 'FRIEND_GOAL_CREATED'),
  2,
  'FGN-06 PUBLIC 목표는 ACTIVE 친구에게만 한 건씩 알린다'
);
SELECT results_eq(
  $$SELECT member_id FROM public.notification
    WHERE type = 'FRIEND_GOAL_CREATED' ORDER BY member_id$$,
  $$VALUES
    ('6a120000-0000-4000-8000-000000000002'::uuid),
    ('6a120000-0000-4000-8000-000000000003'::uuid)$$,
  'FGN-07 해제·차단·비친구는 수신하지 않는다'
);
SELECT is(
  (SELECT count(*)::integer FROM public.notification
   WHERE type = 'FRIEND_GOAL_CREATED'
     AND message = '친구 새봄님이 새 목표를 만들었어요'),
  2,
  'FGN-08 모든 수신자에게 확정 문구를 저장한다'
);
SELECT is(
  (SELECT count(*)::integer FROM public.notification
   WHERE type = 'FRIEND_GOAL_CREATED'
     AND channel = 'INAPP'
     AND alimtalk_status IS NULL),
  2,
  'FGN-09 카카오 경로 없이 INAPP으로만 기록한다'
);

INSERT INTO public.notification (
  member_id, type, channel, actor_member_id, goal_id, message
)
SELECT member_id, type, channel, actor_member_id, goal_id, message
FROM public.notification
WHERE type = 'FRIEND_GOAL_CREATED'
ON CONFLICT (member_id, type, goal_id) DO NOTHING;

SELECT is(
  (SELECT count(*)::integer FROM public.notification
   WHERE type = 'FRIEND_GOAL_CREATED'),
  2,
  'FGN-10 같은 목표·수신자 알림은 멱등이다'
);

INSERT INTO public.goal (member_id, slug, title, due_date, status, visibility)
VALUES (
  '6a120000-0000-4000-8000-000000000001',
  'friend-goal-private',
  '비공개 목표 해낼게',
  current_date + 30,
  'ACTIVE',
  'PRIVATE'
);

SELECT is(
  (SELECT count(*)::integer FROM public.notification
   WHERE type = 'FRIEND_GOAL_CREATED'),
  2,
  'FGN-11 PRIVATE 목표는 알리지 않는다'
);

SELECT is(
  (SELECT count(*)::integer
   FROM information_schema.column_privileges
   WHERE table_schema = 'public'
     AND table_name = 'notification'
     AND grantee = 'authenticated'
     AND privilege_type = 'UPDATE'
     AND column_name = 'read'),
  1,
  'FGN-12 수신자는 읽음 상태를 갱신할 수 있다'
);
SELECT is(
  (SELECT count(*)::integer
   FROM information_schema.column_privileges
   WHERE table_schema = 'public'
     AND table_name = 'notification'
     AND grantee = 'authenticated'
     AND privilege_type = 'UPDATE'
     AND column_name IN ('actor_member_id', 'goal_id', 'message')),
  0,
  'FGN-13 수신자는 알림 메타데이터를 변조할 수 없다'
);

ALTER TABLE public.notification
  ADD CONSTRAINT notification_test_reject_friend_goal
  CHECK (type <> 'FRIEND_GOAL_CREATED') NOT VALID;

INSERT INTO public.goal (member_id, slug, title, due_date, status, visibility)
VALUES (
  '6a120000-0000-4000-8000-000000000001',
  'friend-goal-notification-failure',
  '알림 실패에도 남는 목표 해낼게',
  current_date + 30,
  'ACTIVE',
  'FRIENDS'
);

SELECT is(
  (SELECT count(*)::integer FROM public.goal
   WHERE slug = 'friend-goal-notification-failure'),
  1,
  'FGN-14 알림 저장 실패가 목표 생성을 막지 않는다'
);

ALTER TABLE public.notification
  DROP CONSTRAINT notification_test_reject_friend_goal;

SELECT * FROM finish();
ROLLBACK;
