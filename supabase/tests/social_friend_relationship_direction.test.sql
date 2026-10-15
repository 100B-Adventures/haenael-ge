BEGIN;
SELECT plan(6);

INSERT INTO auth.users(
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
)
SELECT id, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', email, '', now(), now(), '', '', '', '{}', '{}', false, false
FROM (VALUES
  ('58000000-0000-0000-0000-000000000001'::uuid, 'viewer@direction.test'),
  ('58000000-0000-0000-0000-000000000002'::uuid, 'outgoing@direction.test'),
  ('58000000-0000-0000-0000-000000000003'::uuid, 'incoming@direction.test'),
  ('58000000-0000-0000-0000-000000000004'::uuid, 'mutual@direction.test'),
  ('58000000-0000-0000-0000-000000000005'::uuid, 'invited@direction.test')
) AS fixture(id, email);

INSERT INTO public.member(id, nickname) VALUES
  ('58000000-0000-0000-0000-000000000001', 'Viewer'),
  ('58000000-0000-0000-0000-000000000002', 'Outgoing'),
  ('58000000-0000-0000-0000-000000000003', 'Incoming'),
  ('58000000-0000-0000-0000-000000000004', 'Mutual'),
  ('58000000-0000-0000-0000-000000000005', 'Invited');

INSERT INTO public.goal(member_id, slug, title, due_date, status, visibility) VALUES
  ('58000000-0000-0000-0000-000000000001', 'direction-viewer', 'Viewer goal', '2026-12-31', 'ACTIVE', 'PUBLIC'),
  ('58000000-0000-0000-0000-000000000002', 'direction-outgoing', 'Outgoing goal', '2026-12-31', 'ACTIVE', 'PUBLIC'),
  ('58000000-0000-0000-0000-000000000003', 'direction-incoming', 'Incoming goal', '2026-12-31', 'ACTIVE', 'PUBLIC'),
  ('58000000-0000-0000-0000-000000000004', 'direction-mutual', 'Mutual goal', '2026-12-31', 'ACTIVE', 'PUBLIC'),
  ('58000000-0000-0000-0000-000000000005', 'direction-invited', 'Invited goal', '2026-12-31', 'ACTIVE', 'PUBLIC');

INSERT INTO public.payment(order_id, amount_krw, status, pg_customer_key)
SELECT 'direction-' || suffix, 1000, 'READY', 'DIRECTION-PGTAP'
FROM unnest(ARRAY['viewer-to-outgoing', 'incoming-to-viewer', 'viewer-to-mutual', 'mutual-to-viewer']) AS suffix;

INSERT INTO public.cheer(goal_id, payment_id, display_name, is_anonymous, message, clover_amount, status)
SELECT goal.id, payment.id, payment.order_id, false, '함께 해내요', 1, 'CONFIRMED'
FROM public.payment AS payment
JOIN public.goal AS goal ON goal.slug = CASE payment.order_id
  WHEN 'direction-viewer-to-outgoing' THEN 'direction-outgoing'
  WHEN 'direction-incoming-to-viewer' THEN 'direction-viewer'
  WHEN 'direction-viewer-to-mutual' THEN 'direction-mutual'
  WHEN 'direction-mutual-to-viewer' THEN 'direction-viewer'
END
WHERE payment.order_id LIKE 'direction-%';

INSERT INTO public.social_cheer_member_attribution(cheer_id, supporter_member_id)
SELECT cheer.id, CASE cheer.display_name
  WHEN 'direction-viewer-to-outgoing' THEN '58000000-0000-0000-0000-000000000001'::uuid
  WHEN 'direction-incoming-to-viewer' THEN '58000000-0000-0000-0000-000000000003'::uuid
  WHEN 'direction-viewer-to-mutual' THEN '58000000-0000-0000-0000-000000000001'::uuid
  WHEN 'direction-mutual-to-viewer' THEN '58000000-0000-0000-0000-000000000004'::uuid
END
FROM public.cheer AS cheer
WHERE cheer.display_name LIKE 'direction-%';

INSERT INTO public.friend_connection(member_low_id, member_high_id, status)
VALUES (
  '58000000-0000-0000-0000-000000000001',
  '58000000-0000-0000-0000-000000000005',
  'ACTIVE'
);

SELECT ok(
  NOT has_function_privilege('authenticated', 'public.social_has_confirmed_cheer(uuid,uuid)', 'EXECUTE'),
  'PG-DIRECTION-01 내부 방향 predicate는 client가 직접 실행할 수 없다'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"58000000-0000-0000-0000-000000000001"}', true);

SELECT ok(public.my_friend_goals()->'friends' @> '[{"friend_member_id":"58000000-0000-0000-0000-000000000002","relationship_direction":"I_CHEERED"}]'::jsonb,
  'PG-DIRECTION-02 내가 친구 목표를 응원했으면 I_CHEERED');
SELECT ok(public.my_friend_goals()->'friends' @> '[{"friend_member_id":"58000000-0000-0000-0000-000000000003","relationship_direction":"CHEERED_ME"}]'::jsonb,
  'PG-DIRECTION-03 친구가 내 목표를 응원했으면 CHEERED_ME');
SELECT ok(public.my_friend_goals()->'friends' @> '[{"friend_member_id":"58000000-0000-0000-0000-000000000004","relationship_direction":"MUTUAL"}]'::jsonb,
  'PG-DIRECTION-04 양방향 유효 응원이 있으면 MUTUAL');
SELECT ok(public.my_friend_goals()->'friends' @> '[{"friend_member_id":"58000000-0000-0000-0000-000000000005","relationship_direction":"INVITED"}]'::jsonb,
  'PG-DIRECTION-05 응원 기록 없는 초대 관계는 INVITED');
SELECT is(jsonb_array_length(public.my_friend_goals()->'friends'), 4,
  'PG-DIRECTION-06 ACTIVE 친구 네 명을 중복 없이 반환한다');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
