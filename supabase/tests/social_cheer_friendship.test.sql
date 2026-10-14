BEGIN;
SELECT plan(13);

INSERT INTO auth.users(
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
)
SELECT id, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', email, '', now(), now(), '', '', '', '{}', '{}', false, false
FROM (VALUES
  ('57000000-0000-0000-0000-000000000001'::uuid, 'owner@friendship.test'),
  ('57000000-0000-0000-0000-000000000002'::uuid, 'supporter@friendship.test'),
  ('57000000-0000-0000-0000-000000000003'::uuid, 'removed@friendship.test'),
  ('57000000-0000-0000-0000-000000000004'::uuid, 'blocked@friendship.test'),
  ('57000000-0000-0000-0000-000000000005'::uuid, 'history@friendship.test'),
  ('57000000-0000-0000-0000-000000000006'::uuid, 'deleted@friendship.test'),
  ('57000000-0000-0000-0000-000000000007'::uuid, 'welcome@friendship.test')
) AS fixture(id, email);

INSERT INTO public.member(id, nickname) VALUES
  ('57000000-0000-0000-0000-000000000001', 'Owner'),
  ('57000000-0000-0000-0000-000000000002', 'Supporter'),
  ('57000000-0000-0000-0000-000000000003', 'Removed'),
  ('57000000-0000-0000-0000-000000000004', 'Blocked'),
  ('57000000-0000-0000-0000-000000000005', 'History'),
  ('57000000-0000-0000-0000-000000000006', 'DeletedGoalSupporter'),
  ('57000000-0000-0000-0000-000000000007', 'WelcomeSupporter');

INSERT INTO public.goal(member_id, slug, title, due_date, status, visibility)
VALUES
  ('57000000-0000-0000-0000-000000000001', 'friendship-goal', '친구가 되는 응원 목표', '2026-12-31', 'ACTIVE', 'PUBLIC'),
  ('57000000-0000-0000-0000-000000000001', 'friendship-deleted-goal', '삭제된 과거 목표', '2026-12-31', 'ACTIVE', 'PUBLIC');

INSERT INTO public.payment(order_id, amount_krw, status, pg_customer_key)
SELECT 'friendship-' || suffix, 1000, 'READY', 'FRIENDSHIP-PGTAP'
FROM unnest(ARRAY['normal', 'self', 'removed', 'blocked', 'history', 'deleted']) AS suffix;

INSERT INTO public.cheer(
  goal_id, payment_id, display_name, is_anonymous, message, clover_amount, status
)
SELECT goal.id, payment.id, payment.order_id, false, '함께 해내요', 1,
  CASE WHEN payment.order_id = 'friendship-history' THEN 'CONFIRMED'::public.cheer_status_enum
    ELSE 'PENDING'::public.cheer_status_enum END
FROM public.payment AS payment
JOIN public.goal AS goal ON goal.slug = CASE
  WHEN payment.order_id = 'friendship-deleted' THEN 'friendship-deleted-goal'
  ELSE 'friendship-goal'
END
WHERE payment.order_id LIKE 'friendship-%';

INSERT INTO public.friend_connection(member_low_id, member_high_id, status)
VALUES (
  '57000000-0000-0000-0000-000000000001',
  '57000000-0000-0000-0000-000000000003',
  'REMOVED'
);

INSERT INTO public.friend_connection(
  member_low_id, member_high_id, status, blocked_by_member_id
)
VALUES (
  '57000000-0000-0000-0000-000000000001',
  '57000000-0000-0000-0000-000000000004',
  'BLOCKED',
  '57000000-0000-0000-0000-000000000001'
);

INSERT INTO public.social_cheer_member_attribution(cheer_id, supporter_member_id)
SELECT cheer.id,
  CASE cheer.display_name
    WHEN 'friendship-normal' THEN '57000000-0000-0000-0000-000000000002'::uuid
    WHEN 'friendship-self' THEN '57000000-0000-0000-0000-000000000001'::uuid
    WHEN 'friendship-removed' THEN '57000000-0000-0000-0000-000000000003'::uuid
    WHEN 'friendship-blocked' THEN '57000000-0000-0000-0000-000000000004'::uuid
    WHEN 'friendship-history' THEN '57000000-0000-0000-0000-000000000005'::uuid
    WHEN 'friendship-deleted' THEN '57000000-0000-0000-0000-000000000006'::uuid
  END
FROM public.cheer AS cheer
WHERE cheer.display_name LIKE 'friendship-%';

INSERT INTO public.social_cheer_member_attribution(cheer_id, supporter_member_id)
SELECT cheer.id, '57000000-0000-0000-0000-000000000007'
FROM public.cheer AS cheer
JOIN public.goal AS goal ON goal.id = cheer.goal_id
WHERE goal.slug = 'friendship-goal' AND cheer.is_welcome;

SELECT ok(
  (SELECT count(*) = 3
   FROM pg_catalog.pg_trigger
   WHERE tgname IN (
     'cheer_confirmed_friendship_trigger',
     'cheer_attribution_friendship_trigger',
     'cheer_attribution_immutable_trigger'
   ) AND NOT tgisinternal),
  'PG-FRIEND-01 확정과 attribution 순서 양쪽 trigger와 immutable guard가 설치된다'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS proc
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'public'
      AND proc.proname IN (
        'social_connect_cheer_members',
        'social_connect_confirmed_cheer_trigger',
        'social_connect_attributed_cheer_trigger',
        'social_reject_attribution_update_trigger',
        'social_backfill_confirmed_cheer_friendships'
      )
      AND (NOT proc.prosecdef OR proc.proconfig IS NULL OR NOT ('search_path=""' = ANY(proc.proconfig)))
  ),
  'PG-FRIEND-02 D-024 함수는 SECURITY DEFINER와 빈 search_path를 강제한다'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.social_connect_cheer_members(bigint)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.social_connect_cheer_members(bigint)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.social_backfill_confirmed_cheer_friendships()', 'EXECUTE'),
  'PG-FRIEND-03 client 역할은 projector와 backfill을 직접 실행할 수 없다'
);

UPDATE public.cheer SET status = 'CONFIRMED'
WHERE display_name = 'friendship-normal';

SELECT is(
  (SELECT status FROM public.friend_connection
   WHERE member_low_id = '57000000-0000-0000-0000-000000000001'
     AND member_high_id = '57000000-0000-0000-0000-000000000002'),
  'ACTIVE',
  'PG-FRIEND-04 확정 응원은 정규화된 양방향 친구 1행을 만든다'
);

SELECT public.social_connect_cheer_members(cheer.id)
FROM public.cheer AS cheer
WHERE cheer.display_name = 'friendship-normal';
SELECT public.social_connect_cheer_members(cheer.id)
FROM public.cheer AS cheer
WHERE cheer.display_name = 'friendship-normal';

SELECT is(
  (SELECT count(*)::integer FROM public.friend_connection
   WHERE member_low_id = '57000000-0000-0000-0000-000000000001'
     AND member_high_id = '57000000-0000-0000-0000-000000000002'),
  1,
  'PG-FRIEND-05 projector 재실행도 canonical pair 1행으로 멱등이다'
);

UPDATE public.cheer SET status = 'CONFIRMED'
WHERE display_name = 'friendship-self';

SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.friend_connection WHERE member_low_id = member_high_id),
  'PG-FRIEND-06 자기 목표 응원은 친구 관계를 만들지 않는다'
);

UPDATE public.cheer SET status = 'CONFIRMED'
WHERE display_name IN ('friendship-removed', 'friendship-blocked');

SELECT is(
  (SELECT status FROM public.friend_connection
   WHERE member_low_id = '57000000-0000-0000-0000-000000000001'
     AND member_high_id = '57000000-0000-0000-0000-000000000003'),
  'REMOVED',
  'PG-FRIEND-07 응원은 해제된 관계를 임의로 되살리지 않는다'
);

SELECT is(
  (SELECT status FROM public.friend_connection
   WHERE member_low_id = '57000000-0000-0000-0000-000000000001'
     AND member_high_id = '57000000-0000-0000-0000-000000000004'),
  'BLOCKED',
  'PG-FRIEND-08 응원은 차단 관계를 덮어쓰지 않는다'
);

SELECT is(
  (SELECT status FROM public.friend_connection
   WHERE member_low_id = '57000000-0000-0000-0000-000000000001'
     AND member_high_id = '57000000-0000-0000-0000-000000000005'),
  'ACTIVE',
  'PG-FRIEND-09 확정 뒤 attribution이 저장돼도 친구 관계가 누락되지 않는다'
);

SELECT throws_ok(
  $$UPDATE public.social_cheer_member_attribution
    SET supporter_member_id = '57000000-0000-0000-0000-000000000002'
    WHERE cheer_id = (
      SELECT id FROM public.cheer WHERE display_name = 'friendship-history'
    )$$,
  '55000',
  'social_attribution_immutable',
  'PG-FRIEND-10 attribution 정정은 ghost friendship을 만들지 않도록 거부한다'
);

UPDATE public.cheer
SET status = 'REFUNDED', deleted_at = now()
WHERE display_name = 'friendship-history';
UPDATE public.payment
SET status = 'CANCELED'
WHERE order_id = 'friendship-history';
INSERT INTO public.payment_log(payment_id, from_status, to_status, detail)
SELECT id, 'READY', 'DONE', '{"fixture":"historical-confirmation"}'::jsonb
FROM public.payment
WHERE order_id = 'friendship-history';

DELETE FROM public.friend_connection
WHERE member_low_id = '57000000-0000-0000-0000-000000000001'
  AND member_high_id = '57000000-0000-0000-0000-000000000005';
SELECT public.social_backfill_confirmed_cheer_friendships();

SELECT is(
  (SELECT status FROM public.friend_connection
   WHERE member_low_id = '57000000-0000-0000-0000-000000000001'
     AND member_high_id = '57000000-0000-0000-0000-000000000005'),
  'ACTIVE',
  'PG-FRIEND-11 migration과 같은 backfill 진입점이 환불·soft-delete 전 확정 이력을 소급한다'
);

UPDATE public.goal
SET status = 'DELETED', deleted_at = now()
WHERE slug = 'friendship-deleted-goal';
UPDATE public.cheer SET status = 'CONFIRMED'
WHERE display_name = 'friendship-deleted';

SELECT is(
  (SELECT status FROM public.friend_connection
   WHERE member_low_id = '57000000-0000-0000-0000-000000000001'
     AND member_high_id = '57000000-0000-0000-0000-000000000006'),
  'ACTIVE',
  'PG-FRIEND-12 삭제된 과거 목표의 확정 응원도 소급 계약에서 빠지지 않는다'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.friend_connection
    WHERE member_low_id = '57000000-0000-0000-0000-000000000001'
      AND member_high_id = '57000000-0000-0000-0000-000000000007'
  ),
  'PG-FRIEND-13 welcome 응원은 attribution이 있어도 친구 관계를 만들지 않는다'
);

SELECT * FROM finish();
ROLLBACK;
