BEGIN;
SELECT plan(2);

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

SELECT * FROM finish();
ROLLBACK;
