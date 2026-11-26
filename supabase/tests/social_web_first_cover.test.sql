BEGIN;
SELECT plan(28);

INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,raw_app_meta_data,raw_user_meta_data,is_super_admin,is_anonymous)
SELECT id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',email,'',now(),now(),'','','','{}','{}',false,false FROM (VALUES
 ('54000000-0000-0000-0000-000000000001'::uuid,'owner@cover.test'),('54000000-0000-0000-0000-000000000002'::uuid,'other@cover.test'),('54000000-0000-0000-0000-000000000003'::uuid,'admin@cover.test')) x(id,email);
INSERT INTO public.member(id,nickname) VALUES('54000000-0000-0000-0000-000000000001','Owner'),('54000000-0000-0000-0000-000000000002','Other'),('54000000-0000-0000-0000-000000000003','Admin');
INSERT INTO public.admin_member(member_id) VALUES('54000000-0000-0000-0000-000000000003');
INSERT INTO public.goal(member_id,slug,title,due_date,visibility) VALUES
('54000000-0000-0000-0000-000000000001','cover-public','커버 목표','2026-12-31','PUBLIC'),
('54000000-0000-0000-0000-000000000001','cover-friends','친구 커버 목표','2026-12-31','FRIENDS');

SELECT ok(
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid='public.goal_cover_asset'::regclass
     AND conname='goal_cover_asset_status_check')
  = 'CHECK ((status = ANY (ARRAY[''UPLOADING''::text, ''REVIEW''::text, ''APPROVED''::text, ''REJECTED''::text, ''SUPERSEDED''::text, ''DELETED''::text])))',
  'CV-05 status 허용 집합은 운영 6값과 정확히 같다'
);
SELECT throws_ok(
  $$INSERT INTO public.goal_cover_asset(goal_id,owner_member_id,quarantine_path,status,content_sha256,mime_type,byte_size)
    VALUES((SELECT id FROM public.goal WHERE slug='cover-public'),'54000000-0000-0000-0000-000000000001','owner/goal/invalid.webp','PENDING_UPLOAD',repeat('f',64),'image/webp',100)$$,
  '23514', NULL,
  'CV-05 PENDING_UPLOAD 같은 미정의 상태는 거부된다'
);
SELECT throws_ok(
  $$INSERT INTO public.goal_cover_asset(goal_id,owner_member_id,quarantine_path,status,content_sha256,mime_type,byte_size)
    VALUES((SELECT id FROM public.goal WHERE slug='cover-public'),'54000000-0000-0000-0000-000000000001','owner/goal/invalid-approved.webp','APPROVED',repeat('e',64),'image/webp',100)$$,
  '23514', NULL,
  'CV-05 APPROVED는 reviewed_by와 reviewed_at 없이 저장되지 않는다'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"54000000-0000-0000-0000-000000000001"}',true);
SELECT is(public.set_goal_cover_preset((SELECT id FROM public.goal WHERE slug='cover-public'),'c3')->>'cover_preset_key','c3','PG-11 owner preset 변경 성공');
SELECT throws_ok($$SELECT public.set_goal_cover_preset((SELECT id FROM public.goal WHERE slug='cover-public'),'c7')$$,'P0006','invalid_preset','PG-11 c1..c6 외 preset 거부');
RESET ROLE;

INSERT INTO public.goal_cover_asset(id,goal_id,owner_member_id,quarantine_path,status,content_sha256,mime_type,byte_size)
VALUES
 ('54100000-0000-0000-0000-000000000001',(SELECT id FROM public.goal WHERE slug='cover-public'),'54000000-0000-0000-0000-000000000001','owner/goal/review.webp','REVIEW',repeat('a',64),'image/webp',100),
 ('54100000-0000-0000-0000-000000000002',(SELECT id FROM public.goal WHERE slug='cover-public'),'54000000-0000-0000-0000-000000000001','owner/goal/reject.webp','REVIEW',repeat('b',64),'image/webp',100),
 ('54100000-0000-0000-0000-000000000003',(SELECT id FROM public.goal WHERE slug='cover-friends'),'54000000-0000-0000-0000-000000000001','owner/goal/friends.webp','REVIEW',repeat('c',64),'image/webp',100),
 ('54100000-0000-0000-0000-000000000005',(SELECT id FROM public.goal WHERE slug='cover-public'),'54000000-0000-0000-0000-000000000001','owner/goal/replacement.webp','REVIEW',repeat('5',64),'image/webp',100),
 ('54100000-0000-0000-0000-000000000006',(SELECT id FROM public.goal WHERE slug='cover-friends'),'54000000-0000-0000-0000-000000000001','owner/goal/private-invalid.webp','REVIEW',repeat('6',64),'image/webp',100),
 ('54100000-0000-0000-0000-000000000007',(SELECT id FROM public.goal WHERE slug='cover-public'),'54000000-0000-0000-0000-000000000001','owner/goal/uploading.webp','UPLOADING',repeat('7',64),'image/webp',100);

SELECT throws_ok(
  $$SELECT public.admin_apply_goal_cover_review('54100000-0000-0000-0000-000000000007','54000000-0000-0000-0000-000000000003','APPROVE',NULL,'1/not-reviewable.webp')$$,
  'P0017','asset_not_reviewable',
  'CV-06 REVIEW가 아닌 자산은 심사할 수 없다'
);
SELECT throws_ok(
  $$SELECT public.admin_apply_goal_cover_review('54100000-0000-0000-0000-000000000005','54000000-0000-0000-0000-000000000003','APPROVE',NULL,NULL)$$,
  'P0019','public_copy_required',
  'CV-06 PUBLIC 승인에는 public_path가 필요하다'
);
SELECT throws_ok(
  $$SELECT public.admin_apply_goal_cover_review('54100000-0000-0000-0000-000000000006','54000000-0000-0000-0000-000000000003','APPROVE',NULL,'private-must-not-publish.webp')$$,
  'P0020','private_cover_must_not_publish',
  'CV-06 FRIENDS 승인은 public_path를 받을 수 없다'
);

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

SELECT is(
  public.admin_apply_goal_cover_review('54100000-0000-0000-0000-000000000005','54000000-0000-0000-0000-000000000003','APPROVE',NULL,'1/replacement.webp')->>'status',
  'APPROVED',
  'CV-06 새 승인본 적용이 성공한다'
);
SELECT ok(
  (SELECT status='SUPERSEDED' FROM public.goal_cover_asset WHERE id='54100000-0000-0000-0000-000000000001')
  AND (SELECT active_cover_asset_id='54100000-0000-0000-0000-000000000005' FROM public.goal WHERE slug='cover-public'),
  'CV-06 이전 승인본은 SUPERSEDED이고 활성 포인터는 새 승인본이다'
);

INSERT INTO public.goal_cover_asset(
  id, goal_id, owner_member_id, quarantine_path, status,
  content_sha256, mime_type, byte_size, created_at
) VALUES
  ('54100000-0000-0000-0000-000000000008',
   (SELECT id FROM public.goal WHERE slug='cover-public'),
   '54000000-0000-0000-0000-000000000001', 'owner/goal/auto-public.webp',
   'UPLOADING', repeat('8',64), 'image/webp', 100, now()),
  ('54100000-0000-0000-0000-000000000009',
   (SELECT id FROM public.goal WHERE slug='cover-friends'),
   '54000000-0000-0000-0000-000000000001', 'owner/goal/auto-friends.webp',
   'UPLOADING', repeat('9',64), 'image/webp', 100, now()),
  ('54100000-0000-0000-0000-000000000010',
   (SELECT id FROM public.goal WHERE slug='cover-public'),
   '54000000-0000-0000-0000-000000000001', 'owner/goal/stale-review.webp',
   'REVIEW', repeat('a',64), 'image/webp', 100, now() - interval '1 day');

SELECT is(
  public.auto_publish_goal_cover(
    '54100000-0000-0000-0000-000000000008',
    '54000000-0000-0000-0000-000000000001',
    '1/auto-public.webp'
  )->>'status',
  'APPROVED',
  'QA-TC-GOAL-COVER-01 자동 파일 검사 통과 사진은 즉시 승인된다'
);
SELECT ok(
  (SELECT active_cover_asset_id='54100000-0000-0000-0000-000000000008'
   AND cover_selection_mode='CUSTOM' FROM public.goal WHERE slug='cover-public'),
  'QA-TC-GOAL-COVER-01 즉시 승인 사진이 활성 커버가 된다'
);
SELECT is(
  (SELECT review_source FROM public.goal_cover_asset
   WHERE id='54100000-0000-0000-0000-000000000008'),
  'AUTO',
  'QA-TC-GOAL-COVER-01 자동 공개와 관리자 승인을 감사 기록에서 구분한다'
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"54000000-0000-0000-0000-000000000003"}',true);
SELECT is(
  (SELECT count(*)::integer FROM public.admin_list_goal_covers(100)
   WHERE asset_id='54100000-0000-0000-0000-000000000008'),
  1,
  'QA-TC-GOAL-COVER-01 관리 화면은 공개된 활성 사진을 반환한다'
);
SELECT is(
  (SELECT is_stale FROM public.admin_list_goal_covers(100)
   WHERE asset_id='54100000-0000-0000-0000-000000000010'),
  true,
  'QA-TC-GOAL-COVER-02 관리자 목록은 더 새 사진이 공개된 검수 대기 사진을 표시한다'
);
RESET ROLE;
SELECT throws_ok(
  $$SELECT public.admin_apply_goal_cover_review(
    '54100000-0000-0000-0000-000000000010',
    '54000000-0000-0000-0000-000000000003',
    'APPROVE', NULL, '1/stale-review.webp'
  )$$,
  'P0017', 'asset_stale',
  'QA-TC-GOAL-COVER-02 오래된 검수 대기 사진은 새 활성 사진을 덮을 수 없다'
);
SELECT is(
  (SELECT active_cover_asset_id FROM public.goal WHERE slug='cover-public'),
  '54100000-0000-0000-0000-000000000008'::uuid,
  'QA-TC-GOAL-COVER-02 stale 승인 거부 뒤 새 활성 사진을 유지한다'
);
SELECT is(
  public.admin_remove_goal_cover(
    '54100000-0000-0000-0000-000000000008',
    '54000000-0000-0000-0000-000000000003'
  )->>'status',
  'DELETED',
  'QA-TC-GOAL-COVER-01 관리자는 공개 사진을 내릴 수 있다'
);
SELECT ok(
  (SELECT active_cover_asset_id IS NULL AND cover_selection_mode='PRESET'
   FROM public.goal WHERE slug='cover-public')
  AND public.auto_publish_goal_cover(
    '54100000-0000-0000-0000-000000000009',
    '54000000-0000-0000-0000-000000000001',
    NULL
  )->>'status' = 'APPROVED',
  'QA-TC-GOAL-COVER-01 사진 내리기는 프리셋으로 복귀하고 FRIENDS 사진은 공개 복사 없이 승인한다'
);
SELECT is(
  (SELECT count(*)::integer FROM public.storage_cleanup_queue
   WHERE bucket_id='goal-cover-public'
     AND object_path IN ('1/replacement.webp', '1/auto-public.webp')
     AND reason IN ('ASSET_REPLACED', 'ASSET_REJECTED')),
  2,
  'QA-TC-GOAL-COVER-01 교체·내린 공개 파일은 저장소 정리 대기열에 남는다'
);
SELECT is(
  (SELECT count(*)::integer FROM public.storage_cleanup_queue
   WHERE bucket_id='goal-cover-quarantine'
     AND object_path='owner/goal/auto-public.webp'
     AND reason='ABANDONED_UPLOAD'),
  1,
  'QA-TC-GOAL-COVER-01 관리자가 내린 사진의 격리 원본도 정리 대기열에 남는다'
);

SELECT * FROM finish();
ROLLBACK;

