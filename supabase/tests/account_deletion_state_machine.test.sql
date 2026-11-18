BEGIN;
SELECT plan(22);

SELECT has_table('public', 'account_deletion_job',
  'TC-APP-09-3 서버 소유 계정 삭제 작업 테이블이 있다');
SELECT col_is_pk('public', 'account_deletion_job', ARRAY['member_id'],
  'TC-APP-09-3 회원 ID가 삭제 작업의 단일 기본키다');
SELECT hasnt_column('public', 'account_deletion_job', 'request_key',
  'TC-APP-09-3 삭제 작업은 클라이언트 요청 키에 의존하지 않는다');
SELECT has_table('public', 'alternative_payment_confirmation',
  'TC-APP-09-5 공급자 확인 중인 대체결제를 서버가 추적한다');
SELECT has_function('public', 'request_account_deletion', ARRAY['uuid'],
  'TC-APP-09-3 JWT 회원 ID로 삭제 작업을 만들고 재개한다');
SELECT has_function('public', 'mark_account_deletion_external_revoked', ARRAY['uuid'],
  'TC-APP-09-4 외부 폐기 완료 전이가 있다');
SELECT has_function('public', 'delete_account_data', ARRAY['uuid'],
  'TC-APP-09-4 개인정보 삭제 전이가 있다');
SELECT has_function('public', 'complete_account_deletion_auth', ARRAY['uuid'],
  'TC-APP-09-4 Auth 삭제 완료 전이가 있다');
SELECT matches(
  pg_get_functiondef('public.request_account_deletion(uuid)'::regprocedure),
  'member_settlement:',
  'TC-APP-09-5 삭제 요청 전이는 회원 정산 advisory lock을 사용한다'
);
SELECT matches(
  pg_get_functiondef('public.credit_purchase(text,text,text,jsonb,bytea)'::regprocedure),
  'member_settlement:',
  'TC-APP-09-5 모든 결제 확인 시작은 공통 RPC에서 같은 회원 정산 advisory lock을 사용한다'
);
SELECT matches(
  pg_get_functiondef('public.delete_account_data(uuid)'::regprocedure),
  'member_settlement:',
  'TC-APP-09-6 개인정보 삭제 직전에도 같은 잠금에서 정산을 재검사한다'
);

INSERT INTO auth.users(id, email) VALUES
  ('00000000-0000-0000-0000-000000000211', 'delete-state@example.test'),
  ('00000000-0000-0000-0000-000000000212', 'delete-state-owner@example.test'),
  ('00000000-0000-0000-0000-000000000213', 'delete-invalid-transition@example.test');
INSERT INTO public.member(id, nickname) VALUES
  ('00000000-0000-0000-0000-000000000211', '삭제상태회원'),
  ('00000000-0000-0000-0000-000000000212', '삭제상태수취인'),
  ('00000000-0000-0000-0000-000000000213', '잘못된전이회원');
INSERT INTO public.goal(member_id, slug, title, due_date)
VALUES ('00000000-0000-0000-0000-000000000212', 'delete-state-goal', '삭제 상태 시험', current_date + 30)
RETURNING id AS delete_state_goal_id \gset
UPDATE public.app_channel_release_gate SET sandbox_enabled = true
WHERE channel = 'GOOGLE_ALTERNATIVE';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000211', true);
SELECT * FROM public.create_store_purchase_intent(
  :delete_state_goal_id, 'GOOGLE_ALTERNATIVE', 'haenael.cheer.clover.1', 1,
  'delete-state-payment-0001'
) \gset delete_state_intent_
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT is((SELECT operation_status FROM public.credit_purchase(
  'BEGIN', 'GOOGLE_ALTERNATIVE', :'delete_state_intent_intent_id',
  jsonb_build_object(
    'verified_member_id','00000000-0000-0000-0000-000000000211',
    'account_binding',:'delete_state_intent_account_binding',
    'request_key','delete-state-payment-0001'
  ), NULL
)), 'VERIFYING', 'TC-APP-09-5 공급자 확인 시작을 공통 적립 상태로 기록한다');
UPDATE public.store_purchase_intent SET expires_at = now() - interval '1 minute'
WHERE id = :'delete_state_intent_intent_id';
SELECT is(public.request_account_deletion(
  '00000000-0000-0000-0000-000000000211'
), 'BLOCKED_PENDING_PAYMENT',
  'TC-APP-09-5 확인이 시작된 결제는 intent 만료 뒤에도 삭제를 차단한다');
SELECT is((SELECT count(*)::integer FROM public.account_deletion_job
  WHERE member_id='00000000-0000-0000-0000-000000000211'), 1,
  'TC-APP-09-3 반복 요청에도 회원당 삭제 작업은 한 행이다');
SELECT is((SELECT operation_status FROM public.credit_purchase(
  'CANCELED', 'GOOGLE_ALTERNATIVE', :'delete_state_intent_intent_id',
  jsonb_build_object(
    'verified_member_id','00000000-0000-0000-0000-000000000211',
    'account_binding',:'delete_state_intent_account_binding',
    'request_key','delete-state-payment-0001'
  ), NULL
)), 'CANCELED', 'TC-APP-09-5 공급자 미승인 확정 뒤 공통 적립 상태를 종결한다');
SELECT is(public.request_account_deletion(
  '00000000-0000-0000-0000-000000000211'
), 'REQUESTED', 'TC-APP-09-4 결제 종결 뒤 같은 서버 작업을 재개한다');
SELECT throws_ok(
  format($sql$SELECT * FROM public.credit_purchase(
    'BEGIN','GOOGLE_ALTERNATIVE',%L,
    jsonb_build_object('verified_member_id',%L,'account_binding',%L,'request_key',%L),NULL)$sql$,
    :'delete_state_intent_intent_id',
    '00000000-0000-0000-0000-000000000211',
    :'delete_state_intent_account_binding',
    'delete-state-payment-0001'),
  '55000', 'account_deletion_in_progress',
  'TC-APP-09-9 삭제 요청 뒤 새 결제 확인 시작을 거절한다'
);
SELECT is(public.mark_account_deletion_external_revoked(
  '00000000-0000-0000-0000-000000000211'
), 'EXTERNAL_REVOKED', 'TC-APP-09-4 외부 폐기 완료를 먼저 기록한다');
SELECT is(public.delete_account_data(
  '00000000-0000-0000-0000-000000000211'
), 'DATA_DELETED', 'TC-APP-09-6 정산 재검사 뒤 개인정보를 삭제한다');
SELECT ok((SELECT deleted_at IS NOT NULL AND nickname IS NULL
  FROM public.member WHERE id='00000000-0000-0000-0000-000000000211'),
  'TC-APP-09-6 DATA_DELETED 전이와 회원 비식별화가 같은 트랜잭션이다');
RESET ROLE;
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-000000000211';
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT is(public.complete_account_deletion_auth(
  '00000000-0000-0000-0000-000000000211'
), 'AUTH_DELETED', 'TC-APP-09-4 Auth 삭제 뒤 최종 상태를 기록한다');
SELECT throws_ok(
  $$SELECT public.delete_account_data('00000000-0000-0000-0000-000000000213')$$,
  '55000', 'account_deletion_state_invalid',
  'TC-APP-09-4 EXTERNAL_REVOKED 전 개인정보 삭제는 거절한다'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
