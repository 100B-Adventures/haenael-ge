BEGIN;
SELECT plan(12);

INSERT INTO auth.users(
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
)
SELECT id, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', email, '', now(), now(), '', '', '', '{}', '{}', false, false
FROM (VALUES
  ('56000000-0000-0000-0000-000000000001'::uuid, 'owner@my.test'),
  ('56000000-0000-0000-0000-000000000002'::uuid, 'friend@my.test'),
  ('56000000-0000-0000-0000-000000000003'::uuid, 'other@my.test')
) AS fixture(id, email);

INSERT INTO public.member(id, nickname) VALUES
  ('56000000-0000-0000-0000-000000000001', 'Owner'),
  ('56000000-0000-0000-0000-000000000002', 'Friend'),
  ('56000000-0000-0000-0000-000000000003', 'Other');

INSERT INTO public.goal(member_id, slug, title, due_date, status, visibility)
VALUES
  ('56000000-0000-0000-0000-000000000001', 'my-active', '내 진행 목표', '2026-12-31', 'ACTIVE', 'PUBLIC'),
  ('56000000-0000-0000-0000-000000000001', 'my-closed', '내 달성 목표', '2026-09-30', 'CLOSED', 'PUBLIC'),
  ('56000000-0000-0000-0000-000000000002', 'friend-public', '이미 응원한 목표', '2026-11-30', 'ACTIVE', 'PUBLIC'),
  ('56000000-0000-0000-0000-000000000002', 'friend-friends', '아직 응원 안 한 목표', '2026-12-20', 'ACTIVE', 'FRIENDS'),
  ('56000000-0000-0000-0000-000000000002', 'friend-private', '친구 비공개 목표', '2026-12-20', 'ACTIVE', 'PRIVATE'),
  ('56000000-0000-0000-0000-000000000003', 'other-public', '비친구 목표', '2026-12-20', 'ACTIVE', 'PUBLIC');

INSERT INTO public.friend_connection(member_low_id, member_high_id, status)
VALUES (
  '56000000-0000-0000-0000-000000000001',
  '56000000-0000-0000-0000-000000000002',
  'ACTIVE'
);

INSERT INTO public.payment(order_id, amount_krw, status, pg_customer_key)
VALUES
  ('my-achievement-1', 1000, 'DONE', 'MY-PGTAP'),
  ('my-achievement-2', 1000, 'DONE', 'MY-PGTAP'),
  ('my-achievement-3', 1000, 'DONE', 'MY-PGTAP'),
  ('my-achievement-4', 1000, 'DONE', 'MY-PGTAP');

INSERT INTO public.cheer(
  goal_id, payment_id, display_name, is_anonymous, message, clover_amount, status
)
SELECT g.id, p.id, '응원자', false, '응원해', 1, 'CONFIRMED'
FROM (VALUES
  ('my-active', 'my-achievement-1'),
  ('my-closed', 'my-achievement-2')
) AS fixture(slug, order_id)
JOIN public.goal AS g ON g.slug = fixture.slug
JOIN public.payment AS p ON p.order_id = fixture.order_id;

INSERT INTO public.cheer(
  goal_id, payment_id, display_name, is_anonymous, message, clover_amount, status
)
SELECT g.id, p.id, 'Owner', false, '친구 응원', 1, 'CONFIRMED'
FROM public.goal AS g
JOIN public.payment AS p ON p.order_id = 'my-achievement-3'
WHERE g.slug = 'friend-public';

INSERT INTO public.cheer(
  goal_id, payment_id, display_name, is_anonymous, message, clover_amount, status, created_at
)
SELECT g.id, p.id, '가려진 응원자', true, '익명으로 끝까지 응원해요', 1, 'CONFIRMED', now() + interval '1 minute'
FROM public.goal AS g
JOIN public.payment AS p ON p.order_id = 'my-achievement-4'
WHERE g.slug = 'my-active';

INSERT INTO public.social_cheer_member_attribution(cheer_id, supporter_member_id)
SELECT c.id, '56000000-0000-0000-0000-000000000001'
FROM public.cheer AS c
JOIN public.goal AS g ON g.id = c.goal_id
WHERE g.slug = 'friend-public';

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"56000000-0000-0000-0000-000000000001"}',
  true
);

SELECT is(
  public.my_social_dashboard()->'profile'->>'nickname',
  'Owner',
  'PG-MY-01 프로필은 호출자 본인'
);
SELECT is(
  (public.my_social_dashboard()->>'friend_count')::integer,
  1,
  'PG-MY-02 ACTIVE 친구 수만 집계'
);
SELECT is(
  (public.my_social_dashboard()->'achievements'->>'completed_goal_count')::integer,
  1,
  'PG-MY-03 완료 목표만 업적 집계'
);
SELECT is(
  (public.my_social_dashboard()->'achievements'->>'received_cheer_count')::integer,
  3,
  'PG-MY-04 확정된 받은 응원만 업적 집계'
);
SELECT is(
  (public.my_social_dashboard()->'achievements'->>'connected_friend_count')::integer,
  1,
  'PG-MY-05 연결 친구 업적은 ACTIVE 관계 집계와 일치'
);
SELECT ok(
  public.my_social_dashboard()::text LIKE '%아직 응원 안 한 목표%'
    AND public.my_social_dashboard()::text NOT LIKE '%이미 응원한 목표%'
    AND public.my_social_dashboard()::text NOT LIKE '%친구 비공개 목표%'
    AND public.my_social_dashboard()::text NOT LIKE '%비친구 목표%',
  'PG-MY-06 큐는 ACTIVE 친구의 미응원 PUBLIC FRIENDS 목표만 반환'
);
SELECT ok(
  public.my_social_dashboard()::text !~
    'clover_amount|amount|payment|cashout|supporter_ci|supporter_member_id|ranking|streak',
  'PG-MY-07 마이페이지 JSON에 금액 식별자 순위 연속 기록 key 0'
);

SELECT is(
  (public.my_social_dashboard()->'goals'->0->>'cheer_count')::integer,
  2,
  'CS-01 홈 목표 응원 수는 CONFIRMED 비환영 응원만 집계'
);
SELECT ok(
  jsonb_array_length(public.my_social_dashboard()->'goals'->0->'supporter_avatars') <= 3
    AND (public.my_social_dashboard()->'goals'->0->'supporter_avatars') @>
      '[{"profile_image": null, "is_anonymous": true}]'::jsonb,
  'CS-02 아바타는 최대 3개이고 익명 프로필은 null'
);
SELECT ok(
  (public.my_social_dashboard()->'goals'->0->'recent_cheer'->>'is_anonymous')::boolean
    AND public.my_social_dashboard()->'goals'->0->'recent_cheer'->'supporter_name' = 'null'::jsonb,
  'CS-03 최근 익명 응원은 이름을 노출하지 않는다'
);
SELECT ok(
  public.my_social_dashboard()->'goals'->0->'recent_cheer'->>'message' = '익명으로 끝까지 응원해요'
    AND public.my_social_dashboard()->'goals'->0->'recent_cheer' ? 'created_at',
  'CS-04 최근 응원 한 건만 메시지와 시각을 반환한다'
);

RESET ROLE;

SELECT ok(
  NOT has_function_privilege('anon', 'public.my_social_dashboard()', 'EXECUTE')
    AND NOT has_table_privilege('authenticated', 'public.social_cheer_member_attribution', 'SELECT'),
  'PG-MY-08 anon 함수 실행과 client attribution 원본 조회를 거부'
);

SELECT * FROM finish();
ROLLBACK;
