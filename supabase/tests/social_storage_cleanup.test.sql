BEGIN;
SELECT plan(19);

INSERT INTO auth.users(
  id,instance_id,aud,role,email,encrypted_password,created_at,updated_at,
  confirmation_token,recovery_token,email_change_token_new,raw_app_meta_data,
  raw_user_meta_data,is_super_admin,is_anonymous
)
VALUES(
  '55000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','cleanup@test.local','',now(),now(),
  '','','','{}','{}',false,false
);
INSERT INTO public.member(id,nickname)
VALUES('55000000-0000-0000-0000-000000000001','Cleanup Owner');
INSERT INTO public.goal(member_id,slug,title,due_date,status)
VALUES('55000000-0000-0000-0000-000000000001','cleanup-goal','정리 목표','2026-12-31','ACTIVE');

SELECT ok(
  EXISTS(
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname='storage_cleanup_queue_reason_check'
      AND pg_get_constraintdef(oid) LIKE '%ABANDONED_UPLOAD%'
  ),
  'CV-07 ABANDONED_UPLOAD 큐 사유가 허용된다'
);

SELECT ok(
  (SELECT count(*)=4 FROM pg_catalog.pg_proc p
   JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN (
     'purge_abandoned_goal_covers','requeue_orphan_cover_tombstones',
     'claim_storage_cleanup_batch','settle_storage_cleanup'
   ))
  AND NOT has_function_privilege('anon','public.claim_storage_cleanup_batch(integer,interval)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.settle_storage_cleanup(bigint,uuid,boolean)','EXECUTE'),
  'CV-07 정리 함수 4개가 존재하고 클라이언트 실행 권한은 없다'
);

SELECT ok(
  EXISTS(SELECT 1 FROM cron.job WHERE jobname='purge-abandoned-goal-covers' AND active)
  AND EXISTS(SELECT 1 FROM cron.job WHERE jobname='drain-storage-cleanup-queue' AND active),
  'CV-08 정리 cron job 2개가 active다'
);

INSERT INTO public.goal_cover_asset(
  id,goal_id,owner_member_id,quarantine_path,status,content_sha256,mime_type,byte_size,created_at
)
VALUES
  ('55100000-0000-0000-0000-000000000001',(SELECT id FROM public.goal WHERE slug='cleanup-goal'),'55000000-0000-0000-0000-000000000001','cleanup/old.webp','UPLOADING',repeat('a',64),'image/webp',10,now()-interval '25 hours'),
  ('55100000-0000-0000-0000-000000000002',(SELECT id FROM public.goal WHERE slug='cleanup-goal'),'55000000-0000-0000-0000-000000000001','cleanup/recent.webp','UPLOADING',repeat('b',64),'image/webp',10,now()-interval '23 hours'),
  ('55100000-0000-0000-0000-000000000003',(SELECT id FROM public.goal WHERE slug='cleanup-goal'),'55000000-0000-0000-0000-000000000001','cleanup/review.webp','REVIEW',repeat('c',64),'image/webp',10,now()-interval '25 hours');

SELECT is(public.purge_abandoned_goal_covers(),1,'CV-08 25시간 UPLOADING 한 건만 정리한다');
SELECT ok(
  (SELECT status='DELETED' FROM public.goal_cover_asset WHERE id='55100000-0000-0000-0000-000000000001')
  AND (SELECT status='UPLOADING' FROM public.goal_cover_asset WHERE id='55100000-0000-0000-0000-000000000002')
  AND (SELECT status='REVIEW' FROM public.goal_cover_asset WHERE id='55100000-0000-0000-0000-000000000003')
  AND EXISTS(SELECT 1 FROM public.storage_cleanup_queue WHERE bucket_id='goal-cover-quarantine' AND object_path='cleanup/old.webp' AND reason='ABANDONED_UPLOAD'),
  'CV-08 상태·시간 경계를 지키고 격리 버킷 큐를 만든다'
);

DELETE FROM public.storage_cleanup_queue;
SELECT is(public.requeue_orphan_cover_tombstones(),1,'CV-12 열린 큐가 없는 24시간 tombstone만 재등록한다');

DELETE FROM public.storage_cleanup_queue;
INSERT INTO public.storage_cleanup_queue(goal_id,bucket_id,object_path,reason)
SELECT id,'goal-cover-quarantine','cleanup/claim-a.webp','ABANDONED_UPLOAD' FROM public.goal WHERE slug='cleanup-goal'
UNION ALL
SELECT id,'goal-cover-quarantine','cleanup/claim-b.webp','ABANDONED_UPLOAD' FROM public.goal WHERE slug='cleanup-goal';

CREATE TEMP TABLE claim_one AS SELECT * FROM public.claim_storage_cleanup_batch(1,interval '15 minutes');
CREATE TEMP TABLE claim_two AS SELECT * FROM public.claim_storage_cleanup_batch(1,interval '15 minutes');
SELECT ok(
  (SELECT count(*)=1 FROM claim_one) AND (SELECT count(*)=1 FROM claim_two)
  AND NOT EXISTS(SELECT 1 FROM claim_one a JOIN claim_two b USING(id)),
  'CV-10 순차 claim은 같은 큐 행을 점유하지 않는다'
);

SELECT ok(
  (SELECT lease_until > now() AND lease_until <= now() + interval '16 minutes'
   FROM public.storage_cleanup_queue WHERE id=(SELECT id FROM claim_one)),
  'CV-10 claim 시 lease_until을 행에 저장한다'
);

SELECT is(
  (SELECT count(*) FROM public.claim_storage_cleanup_batch(1,interval '1 millisecond')),
  0::bigint,
  'CV-10 다음 호출자의 짧은 lease로 기존 점유를 탈취하지 못한다'
);

UPDATE public.storage_cleanup_queue
SET locked_at=now()-interval '16 minutes', lease_until=now()-interval '1 second'
WHERE id=(SELECT id FROM claim_one);
CREATE TEMP TABLE claim_recovered AS SELECT * FROM public.claim_storage_cleanup_batch(1,interval '15 minutes');
SELECT is(
  (SELECT id FROM claim_recovered),
  (SELECT id FROM claim_one),
  'CV-10 15분 lease 만료 행은 stale 재수집된다'
);
SELECT is(
  public.settle_storage_cleanup((SELECT id FROM claim_one),(SELECT lock_token FROM claim_one),true),
  false,
  'CV-10 이전 worker의 늦은 settle은 소유권 토큰 불일치로 거부된다'
);
SELECT is(
  public.settle_storage_cleanup((SELECT id FROM claim_recovered),(SELECT lock_token FROM claim_recovered),false),
  true,
  'CV-10 현재 소유자의 실패 settle은 허용된다'
);
SELECT ok(
  (SELECT status='FAILED' AND attempts=1 AND locked_at IS NULL AND lock_token IS NULL
   FROM public.storage_cleanup_queue WHERE id=(SELECT id FROM claim_recovered)),
  'CV-10 실패 settle은 attempts를 올리고 점유를 해제한다'
);

UPDATE public.storage_cleanup_queue SET attempts=4 WHERE id=(SELECT id FROM claim_recovered);
CREATE TEMP TABLE dead_letter_claim AS SELECT * FROM public.claim_storage_cleanup_batch(1,interval '15 minutes');
SELECT is(
  public.settle_storage_cleanup((SELECT id FROM dead_letter_claim),(SELECT lock_token FROM dead_letter_claim),false),
  true,
  'CV-11 attempts 5 포이즌 행의 마지막 실패를 settle한다'
);
SELECT ok(
  EXISTS(
    SELECT 1 FROM public.ops_event
    WHERE event_type='STORAGE_CLEANUP_DEAD_LETTER'
      AND (details->>'queue_id')::bigint=(SELECT id FROM dead_letter_claim)
  ),
  'CV-11 attempts 5 포이즌 행은 dead-letter ops_event를 남긴다'
);

DELETE FROM public.storage_cleanup_queue;
DELETE FROM public.goal_cover_asset WHERE id <> '55100000-0000-0000-0000-000000000002' AND id <> '55100000-0000-0000-0000-000000000003';
INSERT INTO public.goal_cover_asset(
  id,goal_id,owner_member_id,quarantine_path,status,content_sha256,mime_type,byte_size,created_at
)
VALUES('55100000-0000-0000-0000-000000000010',(SELECT id FROM public.goal WHERE slug='cleanup-goal'),'55000000-0000-0000-0000-000000000001','same/object.webp','DELETED',repeat('d',64),'image/webp',10,now()-interval '25 hours');
INSERT INTO public.storage_cleanup_queue(goal_id,bucket_id,object_path,reason)
SELECT id,'goal-cover-public','same/object.webp','ASSET_REPLACED' FROM public.goal WHERE slug='cleanup-goal';
CREATE TEMP TABLE public_pair AS SELECT * FROM public.claim_storage_cleanup_batch(1,interval '15 minutes');
SELECT is(
  public.settle_storage_cleanup((SELECT id FROM public_pair),(SELECT lock_token FROM public_pair),true),
  true,
  'CV-13 공개 버킷의 같은 path 큐 행은 정상 settle된다'
);
SELECT ok(
  EXISTS(SELECT 1 FROM public.goal_cover_asset WHERE id='55100000-0000-0000-0000-000000000010'),
  'CV-13 공개 버킷과 같은 path여도 격리 버킷 tombstone을 삭제하지 않는다'
);

INSERT INTO public.storage_cleanup_queue(goal_id,bucket_id,object_path,reason)
SELECT id,'goal-cover-quarantine','same/object.webp','ABANDONED_UPLOAD' FROM public.goal WHERE slug='cleanup-goal';
CREATE TEMP TABLE quarantine_pair AS SELECT * FROM public.claim_storage_cleanup_batch(1,interval '15 minutes');
SELECT is(
  public.settle_storage_cleanup((SELECT id FROM quarantine_pair),(SELECT lock_token FROM quarantine_pair),true),
  true,
  'CV-12 격리 버킷 큐 행은 tombstone과 같은 transaction에서 settle된다'
);
SELECT ok(
  NOT EXISTS(SELECT 1 FROM public.goal_cover_asset WHERE id='55100000-0000-0000-0000-000000000010')
  AND (SELECT status='DONE' FROM public.storage_cleanup_queue WHERE id=(SELECT id FROM quarantine_pair)),
  'CV-12 성공 settle은 tombstone을 하드 삭제하고 큐를 DONE으로 닫는다'
);

SELECT * FROM finish();
ROLLBACK;
