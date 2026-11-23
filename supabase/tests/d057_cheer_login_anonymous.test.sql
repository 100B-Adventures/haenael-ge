BEGIN;
SELECT plan(12);

INSERT INTO auth.users(
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
) SELECT id, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', email, '', now(), now(), '', '', '', '{}', '{}', false, false
FROM (VALUES
  ('d0570000-0000-0000-0000-000000000001'::uuid, 'sender@d057.test'),
  ('d0570000-0000-0000-0000-000000000002'::uuid, 'receiver@d057.test'),
  ('d0570000-0000-0000-0000-000000000003'::uuid, 'stranger@d057.test')
) AS fixture(id, email);

INSERT INTO public.member(id, nickname) VALUES
  ('d0570000-0000-0000-0000-000000000001', 'Sender'),
  ('d0570000-0000-0000-0000-000000000002', 'Receiver'),
  ('d0570000-0000-0000-0000-000000000003', 'Stranger');

INSERT INTO public.goal(member_id, slug, title, due_date, status, visibility)
VALUES ('d0570000-0000-0000-0000-000000000002', 'd057-goal-contract', 'D057 목표', '2030-12-31', 'ACTIVE', 'PUBLIC');

INSERT INTO public.payment(order_id, amount_krw, status, pg_customer_key)
VALUES ('d057-contract-order', 1000, 'DONE', 'D057-CONTRACT-CUSTOMER-KEY');

INSERT INTO public.cheer(goal_id, payment_id, display_name, is_anonymous, message, clover_amount, status)
SELECT g.id, p.id, 'Sender', true, '익명으로 보낸 응원', 1, 'CONFIRMED'
FROM public.goal AS g, public.payment AS p
WHERE g.slug = 'd057-goal-contract' AND p.order_id = 'd057-contract-order';

INSERT INTO public.social_cheer_member_attribution(cheer_id, supporter_member_id)
SELECT id, 'd0570000-0000-0000-0000-000000000001'
FROM public.cheer WHERE message = '익명으로 보낸 응원';

SELECT set_config(
  'd057.cheer_id',
  (SELECT id::text FROM public.cheer WHERE message = '익명으로 보낸 응원'),
  true
);

SELECT has_function(
  'public', 'reveal_my_anonymous_cheer', ARRAY['bigint'],
  'D057-DB-01 익명 응원 공개 전환 RPC가 존재한다'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.reveal_my_anonymous_cheer(bigint)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.reveal_my_anonymous_cheer(bigint)', 'EXECUTE'),
  'D057-DB-02 공개 전환은 로그인 회원에게만 열린다'
);
SELECT has_function(
  'public', 'create_member_cheer_order',
  ARRAY['bigint','text','integer','integer','text','boolean','text','text','uuid','text'],
  'D057-DB-09 회원 귀속 원자 주문 RPC가 존재한다'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.create_member_cheer_order(bigint,text,integer,integer,text,boolean,text,text,uuid,text)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.create_member_cheer_order(bigint,text,integer,integer,text,boolean,text,text,uuid,text)',
    'EXECUTE'
  ),
  'D057-DB-10 주문 RPC는 service_role에만 열린다'
);

SET LOCAL ROLE service_role;
SELECT lives_ok(
  format(
    'SELECT * FROM public.create_member_cheer_order(%s,%L,%s,%s,%L,%L,%L,%L,%L,%L)',
    (SELECT id FROM public.goal WHERE slug = 'd057-goal-contract'),
    'd057-member-order', 1000, 1, 'Sender', true, '원자 귀속',
    'd057_customer_key_1234',
    'd0570000-0000-0000-0000-000000000001'::uuid,
    'd057_member_request'
  ),
  'D057-DB-11 로그인 회원 주문과 귀속을 함께 만든다'
);
RESET ROLE;

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.cheer AS cheer
    JOIN public.social_cheer_member_attribution AS attribution
      ON attribution.cheer_id = cheer.id
    JOIN public.payment AS payment ON payment.id = cheer.payment_id
    WHERE payment.order_id = 'd057-member-order'
      AND attribution.supporter_member_id = 'd0570000-0000-0000-0000-000000000001'
  ),
  'D057-DB-12 주문 행과 발신자 귀속이 같은 트랜잭션에 남는다'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"d0570000-0000-0000-0000-000000000001"}', true);
SELECT ok(
  public.my_social_dashboard()->'sent_cheers' @>
    '[{"message":"익명으로 보낸 응원","is_anonymous":true}]'::jsonb,
  'D057-DB-03 보낸 본인은 익명 응원을 자기 목록에서 본다'
);
SELECT is(
  public.my_friend_goals()->'friends'->0->>'recent_message_direction',
  NULL,
  'D057-DB-04 익명 원문은 친구 최근 메시지 카드에 노출하지 않는다'
);
SELECT is(
  (public.reveal_my_anonymous_cheer(current_setting('d057.cheer_id')::bigint)->>'is_anonymous')::boolean,
  false,
  'D057-DB-05 보낸 본인은 자기 익명 응원을 공개로 전환한다'
);
RESET ROLE;

SELECT ok(
  NOT (SELECT is_anonymous FROM public.cheer WHERE message = '익명으로 보낸 응원'),
  'D057-DB-06 공개 전환은 cheer 원본에 단방향 반영된다'
);

UPDATE public.cheer SET is_anonymous = true WHERE message = '익명으로 보낸 응원';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"d0570000-0000-0000-0000-000000000003"}', true);
SELECT throws_ok(
  format(
    'SELECT public.reveal_my_anonymous_cheer(%s)',
    current_setting('d057.cheer_id')::bigint
  ),
  'P0005', 'cheer_forbidden',
  'D057-DB-07 다른 회원은 익명 공개 상태를 바꿀 수 없다'
);
RESET ROLE;

SELECT ok(
  (SELECT is_anonymous FROM public.cheer WHERE message = '익명으로 보낸 응원'),
  'D057-DB-08 거절된 요청은 익명 상태를 보존한다'
);

SELECT * FROM finish();
ROLLBACK;
