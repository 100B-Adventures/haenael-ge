BEGIN;
SELECT plan(5);

SELECT ok(
  (SELECT count(*) = 4 FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('friend_connection','friend_invite','goal_cover_asset','member_preference'))
  AND (SELECT count(*) = 3 FROM information_schema.columns WHERE table_schema='public' AND table_name='goal' AND column_name IN ('visibility','cover_preset_key','active_cover_asset_id')),
  'PG-01 신규 테이블 4개와 goal 컬럼 3개가 존재'
);

SELECT ok(
  (SELECT bool_and(c.relrowsecurity) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN ('friend_connection','friend_invite','goal_cover_asset','member_preference')),
  'PG-02 신규 테이블 4개 RLS 활성'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('my_friend_goals','friend_goal_detail','create_friend_invite','set_goal_cover_preset','update_member_preferences','friend_invite_preview','accept_friend_invite','remove_friend','set_goal_visibility')
      AND (NOT p.prosecdef OR p.proconfig IS NULL OR NOT ('search_path=""'=ANY(p.proconfig)))
  ),
  'PG-03 social SECURITY DEFINER 함수는 빈 search_path 고정'
);

SELECT ok(
  has_function_privilege('anon','public.friend_invite_preview(text)','EXECUTE')
  AND NOT has_function_privilege('anon','public.my_friend_goals()','EXECUTE')
  AND NOT has_function_privilege('anon','public.accept_friend_invite(text)','EXECUTE'),
  'PG-04 anon은 preview만 실행 가능'
);

INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,raw_app_meta_data,raw_user_meta_data,is_super_admin,is_anonymous)
VALUES('51000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','schema@test.local','',now(),now(),'','','','{}','{}',false,false);
INSERT INTO public.member(id,nickname) VALUES('51000000-0000-0000-0000-000000000001','스키마회원');
INSERT INTO public.goal(member_id,slug,title,due_date,status) VALUES('51000000-0000-0000-0000-000000000001','schema-goal','기존 목표','2026-12-31','ACTIVE');
SELECT is(
  (SELECT (visibility,cover_preset_key,active_cover_asset_id) FROM public.goal WHERE slug='schema-goal'),
  ('PUBLIC'::text,'c1'::text,NULL::uuid),
  'PG-05 기존 삽입 계약은 PUBLIC c1 NULL 기본값이며 slug status 유지'
);

SELECT * FROM finish();
ROLLBACK;

