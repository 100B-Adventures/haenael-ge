BEGIN;
SELECT plan(6);

INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,raw_app_meta_data,raw_user_meta_data,is_super_admin,is_anonymous)
SELECT id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',email,'',now(),now(),'','','','{}','{}',false,false FROM (VALUES
 ('52000000-0000-0000-0000-000000000001'::uuid,'a@social.test'),('52000000-0000-0000-0000-000000000002'::uuid,'b@social.test'),
 ('52000000-0000-0000-0000-000000000003'::uuid,'c@social.test'),('52000000-0000-0000-0000-000000000004'::uuid,'d@social.test'),
 ('52000000-0000-0000-0000-000000000005'::uuid,'e@social.test')) x(id,email);
INSERT INTO public.member(id,nickname) VALUES
 ('52000000-0000-0000-0000-000000000001','A'),('52000000-0000-0000-0000-000000000002','B'),('52000000-0000-0000-0000-000000000003','C'),
 ('52000000-0000-0000-0000-000000000004','D'),('52000000-0000-0000-0000-000000000005','E');
INSERT INTO public.goal(member_id,slug,title,reason,due_date,visibility) VALUES
 ('52000000-0000-0000-0000-000000000001','public-sentinel','PUBLIC_SENTINEL','PUBLIC_SENTINEL','2026-12-31','PUBLIC'),
 ('52000000-0000-0000-0000-000000000001','friends-sentinel','FRIENDS_SENTINEL','FRIENDS_SENTINEL','2026-12-31','FRIENDS'),
 ('52000000-0000-0000-0000-000000000001','private-sentinel','PRIVATE_SENTINEL','PRIVATE_SENTINEL','2026-12-31','PRIVATE');
INSERT INTO public.friend_connection(member_low_id,member_high_id,status,blocked_by_member_id) VALUES
 ('52000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000002','ACTIVE',NULL),
 ('52000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000004','REMOVED',NULL),
 ('52000000-0000-0000-0000-000000000001','52000000-0000-0000-0000-000000000005','BLOCKED','52000000-0000-0000-0000-000000000005');
INSERT INTO public.wordmap_render_cache(goal_id,image_url,word_count)
SELECT id,'https://example.invalid/'||slug,1 FROM public.goal;
SELECT set_config('test.friends_goal_id',(SELECT id::text FROM public.goal WHERE slug='friends-sentinel'),true);

SET LOCAL ROLE anon;
SELECT is((SELECT string_agg(title,',') FROM public.goal_public),'PUBLIC_SENTINEL','PG-20 anon goal_public에는 PUBLIC만 도달');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"52000000-0000-0000-0000-000000000002"}',true);
SELECT ok(
  (public.friend_goal_detail(current_setting('test.friends_goal_id')::bigint)->>'title')='FRIENDS_SENTINEL'
  AND (public.my_friend_goals()::text LIKE '%PUBLIC_SENTINEL%')
  AND (public.my_friend_goals()::text LIKE '%FRIENDS_SENTINEL%')
  AND NOT (public.my_friend_goals()::text LIKE '%PRIVATE_SENTINEL%'),
  'PG-21 ACTIVE 친구는 PUBLIC FRIENDS만 조회'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"52000000-0000-0000-0000-000000000003"}',true);
SELECT throws_ok($$SELECT public.friend_goal_detail(current_setting('test.friends_goal_id')::bigint)$$,'P0002','goal_not_found','PG-22 nonfriend FRIENDS 상세는 존재를 숨김');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"52000000-0000-0000-0000-000000000004"}',true);
SELECT throws_ok($$SELECT public.friend_goal_detail(current_setting('test.friends_goal_id')::bigint)$$,'P0002','goal_not_found','PG-23 REMOVED 관계는 FRIENDS 상세 거부');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"52000000-0000-0000-0000-000000000002"}',true);
SELECT ok(
  public.my_friend_goals()::text !~ 'clover_amount|payment|cashout|supporter_ci|gross_krw|net_krw'
  AND public.friend_goal_detail(current_setting('test.friends_goal_id')::bigint)::text !~ 'clover_amount|payment|cashout|supporter_ci|gross_krw|net_krw',
  'PG-24 social JSON 금지 금액 결제 환전 key 0'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"52000000-0000-0000-0000-000000000001"}',true);
SELECT public.set_goal_visibility((SELECT id FROM public.goal WHERE slug='public-sentinel'),'PRIVATE');
RESET ROLE;
SELECT ok(
  (SELECT count(*)=0 FROM public.wordmap_render_cache w JOIN public.goal g ON g.id=w.goal_id WHERE g.slug='public-sentinel')
  AND (SELECT visibility='PRIVATE' FROM public.goal WHERE slug='public-sentinel'),
  'PG-25 PUBLIC에서 PRIVATE 전환 시 공개 cache 제거'
);

SELECT * FROM finish();
ROLLBACK;

