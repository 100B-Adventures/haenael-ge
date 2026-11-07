BEGIN;
SELECT plan(7);

INSERT INTO auth.users(
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
)
SELECT id, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', email, '', now(), now(), '', '', '', '{}', '{}', false, false
FROM (VALUES
  ('59000000-0000-0000-0000-000000000001'::uuid, 'owner@history.test'),
  ('59000000-0000-0000-0000-000000000002'::uuid, 'supporter@history.test')
) AS fixture(id, email);

INSERT INTO public.member(id, nickname) VALUES
  ('59000000-0000-0000-0000-000000000001', 'Owner'),
  ('59000000-0000-0000-0000-000000000002', 'Supporter');

INSERT INTO public.goal(member_id, slug, title, due_date, status, visibility)
VALUES (
  '59000000-0000-0000-0000-000000000001',
  'history-owner',
  '과거 응원 기록 테스트',
  '2026-12-31',
  'ACTIVE',
  'PUBLIC'
);

INSERT INTO public.payment(order_id, amount_krw, status, pg_customer_key)
VALUES
  ('history-named', 1000, 'DONE', 'HISTORY-PGTAP'),
  ('history-anonymous', 1000, 'DONE', 'HISTORY-PGTAP'),
  ('history-attributed', 1000, 'DONE', 'HISTORY-PGTAP');

INSERT INTO public.cheer(
  goal_id, payment_id, display_name, is_anonymous, message, clover_amount, status
)
SELECT g.id, p.id,
  CASE p.order_id
    WHEN 'history-named' THEN '과거 응원자'
    WHEN 'history-anonymous' THEN '가려질 표시명'
    ELSE 'Supporter'
  END,
  p.order_id = 'history-anonymous',
  p.order_id || '-message',
  1,
  'CONFIRMED'
FROM public.goal AS g
JOIN public.payment AS p ON p.order_id LIKE 'history-%'
WHERE g.slug = 'history-owner';

INSERT INTO public.social_cheer_member_attribution(cheer_id, supporter_member_id)
SELECT c.id, '59000000-0000-0000-0000-000000000002'
FROM public.cheer AS c
JOIN public.payment AS p ON p.id = c.payment_id
WHERE p.order_id = 'history-attributed';

SELECT ok(
  NOT has_function_privilege('anon', 'public.my_unlinked_cheer_history()', 'EXECUTE'),
  'G4-HISTORY-01 anon은 과거 응원 기록을 호출할 수 없다'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.my_unlinked_cheer_history()', 'EXECUTE'),
  'G4-HISTORY-02 authenticated만 호출 가능하다'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"59000000-0000-0000-0000-000000000001"}',
  true
);

SELECT is(
  jsonb_array_length(public.my_unlinked_cheer_history()->'items'),
  2,
  'G4-HISTORY-03 회원 귀속 없는 두 건만 반환한다'
);
SELECT ok(
  public.my_unlinked_cheer_history()->'items' @> '[{"display_name":"과거 응원자","is_anonymous":false}]'::jsonb,
  'G4-HISTORY-04 비익명 표시명은 응원 기록에 남는다'
);
SELECT ok(
  public.my_unlinked_cheer_history()->'items' @> '[{"display_name":null,"is_anonymous":true}]'::jsonb,
  'G4-HISTORY-05 익명 표시명은 노출하지 않는다'
);
SELECT ok(
  public.my_unlinked_cheer_history()::text !~ 'supporter_member_id|friend_member_id|clover_amount|amount_krw',
  'G4-HISTORY-06 계정 추정값과 금액 필드는 응답에 없다'
);

SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"59000000-0000-0000-0000-000000000002"}',
  true
);
SELECT is(
  jsonb_array_length(public.my_unlinked_cheer_history()->'items'),
  0,
  'G4-HISTORY-07 다른 회원에게 소유자 기록이 노출되지 않는다'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
