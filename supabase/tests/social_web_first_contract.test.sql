BEGIN;
SELECT plan(3);

INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,raw_app_meta_data,raw_user_meta_data,is_super_admin,is_anonymous)
VALUES('55000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pref@social.test','',now(),now(),'','','','{}','{}',false,false);
INSERT INTO public.member(id,nickname) VALUES('55000000-0000-0000-0000-000000000001','Preference');

SELECT is((SELECT notify_marketing FROM public.member_preference WHERE member_id='55000000-0000-0000-0000-000000000001'),NULL,'PG-40 preference row 초기 부재');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"55000000-0000-0000-0000-000000000001"}',true);
SELECT public.update_member_preferences(true,false);
RESET ROLE;
SELECT ok(
  (SELECT count(*)=1 AND bool_and(notify_cheer) AND NOT bool_or(notify_marketing) FROM public.member_preference WHERE member_id='55000000-0000-0000-0000-000000000001'),
  'PG-40 preference upsert는 본인 1행과 marketing false 유지'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'member_preference'
      AND column_name ~ '(grade|tier|rank|achievement|is_public|self_reported|streak)'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_member_preferences'
      AND p.pronargs = 2
      AND p.proargnames = ARRAY['notify_cheer', 'notify_marketing']::text[]
  ),
  'AC-03 등급 공개 저장 컬럼은 없고 preference RPC 인자는 알림 동의 2종뿐이다'
);

SELECT * FROM finish();
ROLLBACK;
