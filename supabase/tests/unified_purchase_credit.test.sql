BEGIN;
SELECT plan(18);

SELECT has_table('public', 'purchase_credit_operation',
  'TC-APP-09-11 모든 채널의 공급자 확인 작업을 서버가 추적한다');
SELECT has_function('public', 'credit_purchase', ARRAY['text','text','text','jsonb','bytea'],
  'TC-APP-09-11 모든 적립 경로의 공통 RPC가 있다');
SELECT matches(
  pg_get_functiondef('public.credit_purchase(text,text,text,jsonb,bytea)'::regprocedure),
  'member_settlement:',
  'TC-APP-09-11 공통 RPC가 회원 advisory transaction lock을 사용한다'
);
SELECT matches(
  pg_get_functiondef('public.credit_purchase(text,text,text,jsonb,bytea)'::regprocedure),
  'account_deletion_job',
  'TC-APP-09-11 공통 RPC가 적립 전에 삭제 상태를 재검사한다'
);
SELECT ok(NOT has_function_privilege('service_role',
  'public.credit_store_purchase(uuid,uuid,uuid,text,text,text,text,text,integer,integer,text,boolean,text,timestamptz,text)',
  'EXECUTE'), 'TC-APP-09-12 일반 스토어 적립 RPC 직접 실행을 차단한다');
SELECT ok(NOT has_function_privilege('service_role',
  'public.credit_alternative_store_purchase(uuid,uuid,uuid,text,text,text,text,text,boolean,text,timestamptz,bytea,text)',
  'EXECUTE'), 'TC-APP-09-12 대체결제 적립 RPC 직접 실행을 차단한다');
SELECT ok(NOT has_function_privilege('service_role',
  'public.confirm_cheer_payment(text,text,integer,text,timestamptz,text,jsonb)',
  'EXECUTE'), 'TC-APP-09-12 웹 결제 적립 RPC 직접 실행을 차단한다');

INSERT INTO auth.users(id,email) VALUES
  ('00000000-0000-0000-0000-000000000221','credit-entry-supporter@test.local'),
  ('00000000-0000-0000-0000-000000000222','credit-entry-owner@test.local'),
  ('00000000-0000-0000-0000-000000000223','credit-entry-delete@test.local'),
  ('00000000-0000-0000-0000-000000000224','credit-entry-balance@test.local');
INSERT INTO public.member(id,nickname) VALUES
  ('00000000-0000-0000-0000-000000000221','공통 적립 결제자'),
  ('00000000-0000-0000-0000-000000000222','공통 적립 수취인'),
  ('00000000-0000-0000-0000-000000000223','삭제 상태 회원'),
  ('00000000-0000-0000-0000-000000000224','잔액 재검사 회원');
UPDATE public.clover_balance SET clover_count=0 WHERE member_id IN (
  '00000000-0000-0000-0000-000000000221',
  '00000000-0000-0000-0000-000000000222',
  '00000000-0000-0000-0000-000000000223',
  '00000000-0000-0000-0000-000000000224'
);
INSERT INTO public.goal(member_id,slug,title,due_date)
VALUES ('00000000-0000-0000-0000-000000000222','unified-credit-goal','공통 적립 목표',current_date + 30)
RETURNING id AS unified_credit_goal_id \gset
UPDATE public.clover_balance SET clover_count=0
WHERE member_id='00000000-0000-0000-0000-000000000222';
UPDATE public.app_channel_release_gate SET sandbox_enabled=true;

INSERT INTO public.store_purchase_intent(
  id,supporter_member_id,goal_id,provider,product_id,clover_amount,
  account_binding,request_key,expires_at
) VALUES
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000221',:unified_credit_goal_id,'APPLE','haenael.cheer.clover.1',1,'20000000-0000-0000-0000-000000000001','credit-entry-apple-0001',now()+interval '30 minutes'),
  ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000221',:unified_credit_goal_id,'GOOGLE_PLAY','haenael.cheer.clover.1',1,'20000000-0000-0000-0000-000000000002','credit-entry-play-00001',now()+interval '30 minutes'),
  ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000221',:unified_credit_goal_id,'TOSS_IAP','haenael.cheer.clover.1',1,'20000000-0000-0000-0000-000000000003','credit-entry-toss-00001',now()+interval '30 minutes'),
  ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000221',:unified_credit_goal_id,'GOOGLE_ALTERNATIVE','haenael.cheer.clover.1',1,'20000000-0000-0000-0000-000000000004','credit-entry-alt-000001',now()+interval '30 minutes');

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',true);
SELECT is((SELECT operation_status FROM public.credit_purchase(
  'BEGIN','APPLE','10000000-0000-0000-0000-000000000001',
  jsonb_build_object('verified_member_id','00000000-0000-0000-0000-000000000221','account_binding','20000000-0000-0000-0000-000000000001','request_key','credit-entry-apple-0001')
)), 'VERIFYING', 'TC-APP-09-11 StoreKit 검증 시작은 공통 RPC만 지난다');
SELECT is((SELECT operation_status FROM public.credit_purchase(
  'BEGIN','GOOGLE_PLAY','10000000-0000-0000-0000-000000000002',
  jsonb_build_object('verified_member_id','00000000-0000-0000-0000-000000000221','account_binding','20000000-0000-0000-0000-000000000002','request_key','credit-entry-play-00001')
)), 'VERIFYING', 'TC-APP-09-11 Google Play 검증 시작은 공통 RPC만 지난다');
SELECT is((SELECT operation_status FROM public.credit_purchase(
  'BEGIN','TOSS_IAP','10000000-0000-0000-0000-000000000003',
  jsonb_build_object('verified_member_id','00000000-0000-0000-0000-000000000221','account_binding','20000000-0000-0000-0000-000000000003','request_key','credit-entry-toss-00001')
)), 'VERIFYING', 'TC-APP-09-11 Toss 인앱결제 검증 시작은 공통 RPC만 지난다');
SELECT is((SELECT operation_status FROM public.credit_purchase(
  'BEGIN','GOOGLE_ALTERNATIVE','10000000-0000-0000-0000-000000000004',
  jsonb_build_object('verified_member_id','00000000-0000-0000-0000-000000000221','account_binding','20000000-0000-0000-0000-000000000004','request_key','credit-entry-alt-000001')
)), 'VERIFYING', 'TC-APP-09-11 Google 대체결제 검증 시작은 공통 RPC만 지난다');

INSERT INTO public.payment(order_id,amount_krw,status,pg_customer_key)
VALUES ('credit-entry-web-0001',1000,'READY','anonymous-credit-entry') RETURNING id AS unified_web_payment_id \gset
INSERT INTO public.cheer(goal_id,payment_id,is_anonymous,clover_amount,status)
VALUES (:unified_credit_goal_id,:unified_web_payment_id,true,1,'PENDING');
SELECT is((SELECT operation_status FROM public.credit_purchase(
  'BEGIN','WEB_TOSS','credit-entry-web-0001','{}'::jsonb
)), 'VERIFYING', 'TC-APP-09-11 웹 Toss 결제 확인 시작은 공통 RPC만 지난다');

SELECT is(public.request_account_deletion('00000000-0000-0000-0000-000000000221'),
  'BLOCKED_PENDING_PAYMENT', 'TC-APP-09-13 결제자는 검증 중 탈퇴가 차단된다');
SELECT is(public.request_account_deletion('00000000-0000-0000-0000-000000000222'),
  'BLOCKED_PENDING_PAYMENT', 'TC-APP-09-13 목표 소유자는 들어오는 결제 검증 중 탈퇴가 차단된다');
SELECT throws_ok(
  $$SELECT * FROM public.credit_purchase('BEGIN','APPLE','10000000-0000-0000-0000-000000000001',jsonb_build_object('verified_member_id','00000000-0000-0000-0000-000000000221','account_binding','20000000-0000-0000-0000-000000000001','request_key','credit-entry-apple-0001'))$$,
  '55000','account_deletion_in_progress',
  'TC-APP-09-13 삭제가 시작된 회원의 새 검증 시작은 거절한다');

INSERT INTO public.account_deletion_job(member_id,status) VALUES
  ('00000000-0000-0000-0000-000000000223','REQUESTED'),
  ('00000000-0000-0000-0000-000000000224','EXTERNAL_REVOKED');
INSERT INTO public.clover_balance(member_id,clover_count) VALUES
  ('00000000-0000-0000-0000-000000000223',1),
  ('00000000-0000-0000-0000-000000000224',1)
ON CONFLICT (member_id) DO UPDATE SET clover_count=EXCLUDED.clover_count;
SELECT throws_ok(
  $$SELECT public.mark_account_deletion_external_revoked('00000000-0000-0000-0000-000000000223')$$,
  '55000','account_balance_remaining',
  'TC-APP-09-13 외부 폐기 기록 직전 새 잔액을 다시 검사한다');
SELECT throws_ok(
  $$SELECT public.delete_account_data('00000000-0000-0000-0000-000000000224')$$,
  '55000','account_balance_remaining',
  'TC-APP-09-13 개인정보 삭제 직전 새 잔액을 다시 검사한다');
SELECT is((SELECT count(*)::integer FROM public.purchase_credit_operation
  WHERE status='VERIFYING'), 5,
  'TC-APP-09-11 다섯 공급자 채널이 같은 확인 작업 테이블을 사용한다');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
