BEGIN;
SELECT plan(9);

INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,raw_app_meta_data,raw_user_meta_data,is_super_admin,is_anonymous)
SELECT id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',email,'',now(),now(),'','','','{}','{}',false,false FROM (VALUES
 ('54000000-0000-0000-0000-000000000001'::uuid,'owner@cover.test'),('54000000-0000-0000-0000-000000000002'::uuid,'other@cover.test'),('54000000-0000-0000-0000-000000000003'::uuid,'admin@cover.test')) x(id,email);
INSERT INTO public.member(id,nickname) VALUES('54000000-0000-0000-0000-000000000001','Owner'),('54000000-0000-0000-0000-000000000002','Other'),('54000000-0000-0000-0000-000000000003','Admin');
INSERT INTO public.admin_member(member_id) VALUES('54000000-0000-0000-0000-000000000003');
INSERT INTO public.goal(member_id,slug,title,due_date,visibility) VALUES
('54000000-0000-0000-0000-000000000001','cover-public','커버 목표','2026-12-31','PUBLIC'),
('54000000-0000-0000-0000-000000000001','cover-friends','친구 커버 목표','2026-12-31','FRIENDS');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"54000000-0000-0000-0000-000000000001"}',true);
SELECT is(public.set_goal_cover_preset((SELECT id FROM public.goal WHERE slug='cover-public'),'c3')->>'cover_preset_key','c3','PG-11 owner preset 변경 성공');
SELECT throws_ok($$SELECT public.set_goal_cover_preset((SELECT id FROM public.goal WHERE slug='cover-public'),'c7')$$,'P0006','invalid_preset','PG-11 c1..c6 외 preset 거부');
RESET ROLE;

INSERT INTO public.goal_cover_asset(id,goal_id,owner_member_id,quarantine_path,status,content_sha256,mime_type,byte_size)
VALUES
 ('54100000-0000-0000-0000-000000000001',(SELECT id FROM public.goal WHERE slug='cover-public'),'54000000-0000-0000-0000-000000000001','owner/goal/review.webp','REVIEW',repeat('a',64),'image/webp',100),
 ('54100000-0000-0000-0000-000000000002',(SELECT id FROM public.goal WHERE slug='cover-public'),'54000000-0000-0000-0000-000000000001','owner/goal/reject.webp','REVIEW',repeat('b',64),'image/webp',100),
 ('54100000-0000-0000-0000-000000000003',(SELECT id FROM public.goal WHERE slug='cover-friends'),'54000000-0000-0000-0000-000000000001','owner/goal/friends.webp','REVIEW',repeat('c',64),'image/webp',100);

INSERT INTO public.goal(member_id,slug,title,due_date,visibility)
VALUES('54000000-0000-0000-0000-000000000002','other-cover-goal','타인 커버 목표','2026-12-31','FRIENDS');
INSERT INTO public.goal_cover_asset(id,goal_id,owner_member_id,quarantine_path,status,content_sha256,mime_type,byte_size,reviewed_by,reviewed_at)
VALUES('54100000-0000-0000-0000-000000000004',(SELECT id FROM public.goal WHERE slug='other-cover-goal'),'54000000-0000-0000-0000-000000000002','other/goal/friends.webp','APPROVED',repeat('d',64),'image/webp',100,'54000000-0000-0000-0000-000000000003',now());

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"54000000-0000-0000-0000-000000000001"}',true);
SELECT throws_ok(
  $$UPDATE public.goal SET active_cover_asset_id='54100000-0000-0000-0000-000000000004' WHERE slug='cover-friends'$$,
  '23514','cover_asset_goal_mismatch',
  'QA-V2-SEC-01 타인 asset UUID를 자기 FRIENDS goal에 연결할 수 없음'
);
RESET ROLE;

SELECT ok(
  (SELECT count(*)=0 FROM storage.objects WHERE bucket_id='goal-cover-public')
  AND (SELECT public_path IS NULL FROM public.goal_cover_asset WHERE id='54100000-0000-0000-0000-000000000001'),
  'PG-12 REVIEW asset은 public object와 public path가 없다'
);

SELECT is(
  public.admin_apply_goal_cover_review('54100000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000003','APPROVE',NULL,'1/approved.webp')->>'status',
  'APPROVED','PG-13 admin APPROVE는 active pointer와 public path 설정'
);
SELECT public.admin_apply_goal_cover_review('54100000-0000-0000-0000-000000000002','54000000-0000-0000-0000-000000000003','REJECT','copyright',NULL);
SELECT ok(
  (SELECT active_cover_asset_id='54100000-0000-0000-0000-000000000001' FROM public.goal WHERE slug='cover-public')
  AND (SELECT rejection_code='copyright' AND public_path IS NULL FROM public.goal_cover_asset WHERE id='54100000-0000-0000-0000-000000000002'),
  'PG-14 승인만 active, 반려는 stable rejection code'
);

SELECT is(
  public.admin_apply_goal_cover_review('54100000-0000-0000-0000-000000000003','54000000-0000-0000-0000-000000000003','APPROVE',NULL,NULL)->>'status',
  'APPROVED',
  'PG-15 D-019 FRIENDS 승인은 public path 없이 private object를 유지'
);

INSERT INTO storage.objects(id,bucket_id,name,owner_id,metadata)
VALUES(gen_random_uuid(),'goal-cover-quarantine','owner/goal/friends.webp','54000000-0000-0000-0000-000000000001','{}'::jsonb);
INSERT INTO public.friend_connection(member_low_id,member_high_id,status)
VALUES('54000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000002','ACTIVE');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"54000000-0000-0000-0000-000000000002"}',true);
SELECT is(
  (SELECT count(*)::integer FROM storage.objects WHERE bucket_id='goal-cover-quarantine' AND name='owner/goal/friends.webp'),
  0,
  'PG-16 D-019 ACTIVE 친구도 private Storage 직접 GET 경로를 조회하지 못함'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"54000000-0000-0000-0000-000000000001"}',true);
SELECT is(
  (SELECT count(*)::integer FROM storage.objects WHERE bucket_id='goal-cover-quarantine' AND name='owner/goal/friends.webp'),
  1,
  'PG-17 D-019 소유자는 승인된 private cover object를 조회 가능'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;

