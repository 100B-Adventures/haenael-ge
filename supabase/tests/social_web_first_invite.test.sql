BEGIN;
SELECT plan(10);

INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,raw_app_meta_data,raw_user_meta_data,is_super_admin,is_anonymous)
SELECT id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',email,'',now(),now(),'','','','{}','{}',false,false FROM (VALUES
 ('53000000-0000-0000-0000-000000000001'::uuid,'a@invite.test'),('53000000-0000-0000-0000-000000000002'::uuid,'b@invite.test'),
 ('53000000-0000-0000-0000-000000000003'::uuid,'c@invite.test'),('53000000-0000-0000-0000-000000000004'::uuid,'d@invite.test'),
 ('53000000-0000-0000-0000-000000000005'::uuid,'e@invite.test')) x(id,email);
INSERT INTO public.member(id,nickname) VALUES
 ('53000000-0000-0000-0000-000000000001','A'),('53000000-0000-0000-0000-000000000002','B'),('53000000-0000-0000-0000-000000000003','C'),
 ('53000000-0000-0000-0000-000000000004','D'),('53000000-0000-0000-0000-000000000005','E');
INSERT INTO public.goal(member_id,slug,title,due_date,visibility) VALUES
 ('53000000-0000-0000-0000-000000000001','invite-public','초대 목표','2026-12-31','PUBLIC'),
 ('53000000-0000-0000-0000-000000000001','invite-private','비공개 목표','2026-12-31','PRIVATE');

CREATE TEMP TABLE generated_invites(payload jsonb);
GRANT SELECT,INSERT ON generated_invites TO authenticated;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"53000000-0000-0000-0000-000000000001"}',true);
INSERT INTO generated_invites SELECT public.create_friend_invite((SELECT id FROM public.goal WHERE slug='invite-public'),'WEB') FROM generate_series(1,10);
SELECT ok((SELECT count(*)=10 AND bool_and(length(payload->>'token')=43) FROM generated_invites),'PG-31 첫 10개 초대는 256-bit base64url token');
SELECT throws_ok($$SELECT public.create_friend_invite((SELECT id FROM public.goal WHERE slug='invite-public'),'WEB')$$,'P0004','invite_rate_limited','PG-31 11번째 초대 rate limit');
RESET ROLE;
UPDATE public.friend_invite SET created_at=created_at-interval '2 hours' WHERE inviter_member_id='53000000-0000-0000-0000-000000000001';

SELECT set_config('test.valid_token',(SELECT payload->>'token' FROM generated_invites LIMIT 1),true);
SET LOCAL ROLE anon;
SELECT is(
  ARRAY(SELECT jsonb_object_keys(public.friend_invite_preview(current_setting('test.valid_token'))) ORDER BY 1),
  ARRAY['cover_preset_key','goal_title','inviter_nickname']::text[],
  'PG-32 anon valid preview는 현재 클라이언트가 쓰는 3개 필드만 반환'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"53000000-0000-0000-0000-000000000003"}',true);
SELECT set_config('test.accepted_connection',(public.accept_friend_invite(current_setting('test.valid_token'))->>'connection_id'),true);
RESET ROLE;
SELECT ok(
  (SELECT accepted_by='53000000-0000-0000-0000-000000000003' FROM public.friend_invite WHERE token_hash=extensions.digest(convert_to(current_setting('test.valid_token'),'UTF8'),'sha256'))
  AND (SELECT status='ACTIVE' FROM public.friend_connection WHERE id=current_setting('test.accepted_connection')::uuid),
  'PG-33 수락은 accepted fields와 ordered ACTIVE pair 1행 생성'
);
SET LOCAL ROLE authenticated;
SELECT is((public.accept_friend_invite(current_setting('test.valid_token'))->>'is_replay')::boolean,true,'PG-37 동일 actor 재시도는 같은 connection replay');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"53000000-0000-0000-0000-000000000001"}',true);
SELECT ok((public.my_friend_goals()::text LIKE '%C%'),'PG-30 ACTIVE 관계만 친구 목록에 반환');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"53000000-0000-0000-0000-000000000003"}',true);
SELECT is(public.remove_friend('53000000-0000-0000-0000-000000000001')->>'status','REMOVED','PG-35 remove는 REMOVED 상태로 전환');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"53000000-0000-0000-0000-000000000001"}',true);
SELECT throws_ok($$SELECT public.create_friend_invite((SELECT id FROM public.goal WHERE slug='invite-private'),'WEB')$$,'P0005','goal_forbidden','PG-38 PRIVATE 목표 연결 초대 거부');
SELECT throws_ok($$SELECT public.accept_friend_invite('malformed')$$,'P0008','invite_not_found','PG-36 malformed token stable error');
RESET ROLE;

SELECT ok((SELECT count(*)=1 FROM public.friend_connection WHERE member_low_id='53000000-0000-0000-0000-000000000001' AND member_high_id='53000000-0000-0000-0000-000000000003'),'PG-34, CC-01 canonical pair는 1행');

SELECT * FROM finish();
ROLLBACK;

