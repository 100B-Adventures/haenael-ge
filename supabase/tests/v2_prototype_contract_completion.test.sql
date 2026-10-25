BEGIN;
SELECT plan(43);

INSERT INTO auth.users(
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
)
SELECT id, '00000000-0000-0000-0000-000000000000', 'authenticated',
  'authenticated', email, '', now(), now(), '', '', '', '{}', '{}', false, false
FROM (VALUES
  ('59000000-0000-0000-0000-000000000001'::uuid, 'viewer@v2.test'),
  ('59000000-0000-0000-0000-000000000002'::uuid, 'friend@v2.test'),
  ('59000000-0000-0000-0000-000000000003'::uuid, 'other@v2.test'),
  ('59000000-0000-0000-0000-000000000004'::uuid, 'blank@v2.test'),
  ('59000000-0000-0000-0000-000000000005'::uuid, 'avatar-delete@v2.test'),
  ('59000000-0000-0000-0000-000000000006'::uuid, 'many@v2.test')
) AS fixture(id, email);

INSERT INTO public.member(id, nickname, profile_image, phone) VALUES
  ('59000000-0000-0000-0000-000000000001', 'Viewer', NULL, '01011112222'),
  ('59000000-0000-0000-0000-000000000002', 'Friend', '/images/social-viral/dogyeong.png', NULL),
  ('59000000-0000-0000-0000-000000000003', 'Other', '/images/social-viral/jimin.png', NULL),
  ('59000000-0000-0000-0000-000000000004', NULL, NULL, '01099998888'),
  ('59000000-0000-0000-0000-000000000005', 'Delete Avatar', NULL, NULL),
  ('59000000-0000-0000-0000-000000000006', 'Many Supporters', NULL, NULL);

INSERT INTO public.goal(
  member_id, slug, title, due_date, status, visibility,
  cover_preset_key, cover_selection_mode
) VALUES
  ('59000000-0000-0000-0000-000000000001', 'v2-viewer', '내 목표 해낼게', '2030-12-31', 'ACTIVE', 'PUBLIC', 'study', 'AUTO'),
  ('59000000-0000-0000-0000-000000000002', 'v2-friend-public', '친구 목표 해낼게', '2030-12-31', 'ACTIVE', 'PUBLIC', 'run', 'AUTO'),
  ('59000000-0000-0000-0000-000000000002', 'v2-friend-private', '친구 비공개 해낼게', '2030-12-31', 'ACTIVE', 'PRIVATE', 'health', 'AUTO'),
  ('59000000-0000-0000-0000-000000000003', 'v2-other', '제삼자 목표 해낼게', '2030-12-31', 'ACTIVE', 'PUBLIC', 'career', 'AUTO'),
  ('59000000-0000-0000-0000-000000000006', 'v2-many', '응원자 21명 목표 해낼게', '2030-12-31', 'ACTIVE', 'PUBLIC', 'study', 'AUTO');

INSERT INTO public.friend_connection(member_low_id, member_high_id, status)
VALUES (
  '59000000-0000-0000-0000-000000000001',
  '59000000-0000-0000-0000-000000000002',
  'ACTIVE'
);
SELECT set_config(
  'test.friend_goal_id',
  (SELECT id::text FROM public.goal WHERE slug = 'v2-friend-public'),
  true
);

INSERT INTO public.payment(order_id, amount_krw, status, pg_customer_key)
SELECT 'v2-' || suffix, 1000, 'DONE', 'V2-PGTAP'
FROM unnest(ARRAY[
  'viewer-to-friend', 'friend-to-viewer', 'friend-to-viewer-again', 'anonymous-to-friend',
  'private-to-friend', 'other-to-friend', 'anonymous-to-viewer'
]) AS suffix;

INSERT INTO public.cheer(
  goal_id, payment_id, display_name, is_anonymous, message,
  clover_amount, status, created_at
)
SELECT g.id, p.id, fixture.display_name, fixture.is_anonymous,
  fixture.message, 1, 'CONFIRMED', fixture.created_at
FROM (VALUES
  ('v2-friend-public', 'v2-viewer-to-friend', 'Viewer', false, '직접 보낸 공개 메시지', now() - interval '5 minutes'),
  ('v2-viewer', 'v2-friend-to-viewer', 'Friend', false, '친구가 보낸 최신 메시지', now() - interval '4 minutes'),
  ('v2-viewer', 'v2-friend-to-viewer-again', 'Friend', false, '친구가 두 번째 보낸 메시지', now() - interval '3 minutes'),
  ('v2-friend-public', 'v2-anonymous-to-friend', '숨김', true, '익명 최신 원문', now() - interval '1 minute'),
  ('v2-friend-private', 'v2-private-to-friend', 'Viewer', false, '비공개 최신 원문', now()),
  ('v2-friend-public', 'v2-other-to-friend', 'Other', false, '제삼자 최신 원문', now() + interval '1 minute'),
  ('v2-viewer', 'v2-anonymous-to-viewer', '숨김', true, '받은 익명 메시지', now() + interval '2 minutes')
) AS fixture(slug, order_id, display_name, is_anonymous, message, created_at)
JOIN public.goal AS g ON g.slug = fixture.slug
JOIN public.payment AS p ON p.order_id = fixture.order_id;

INSERT INTO public.social_cheer_member_attribution(cheer_id, supporter_member_id)
SELECT c.id, CASE c.display_name
  WHEN 'Viewer' THEN '59000000-0000-0000-0000-000000000001'::uuid
  WHEN 'Friend' THEN '59000000-0000-0000-0000-000000000002'::uuid
  WHEN 'Other' THEN '59000000-0000-0000-0000-000000000003'::uuid
  ELSE '59000000-0000-0000-0000-000000000002'::uuid
END
FROM public.cheer AS c
JOIN public.payment AS p ON p.id = c.payment_id
WHERE p.order_id LIKE 'v2-%';

INSERT INTO public.payment(order_id, amount_krw, status, pg_customer_key)
SELECT 'v2-many-' || n::text, 1000, 'DONE', 'V2-PGTAP'
FROM generate_series(1, 21) AS n;
INSERT INTO public.cheer(
  goal_id, payment_id, display_name, is_anonymous, message,
  clover_amount, status, created_at
)
SELECT
  (SELECT id FROM public.goal WHERE slug = 'v2-many'),
  p.id,
  'Supporter ' || n::text,
  false,
  '21명 fixture ' || n::text,
  1,
  'CONFIRMED',
  now() + make_interval(secs => n)
FROM generate_series(1, 21) AS n
JOIN public.payment AS p ON p.order_id = 'v2-many-' || n::text;

SELECT has_column('public', 'member', 'bio',
  'V2-DB-01 member.bio 컬럼이 존재한다');
SELECT ok(
  (SELECT public AND file_size_limit = 5242880
    AND allowed_mime_types @> ARRAY['image/jpeg', 'image/png', 'image/webp']
   FROM storage.buckets WHERE id = 'profile-avatars'),
  'V2-DB-02 profile-avatars 공개 버킷은 5MiB와 이미지 MIME만 허용한다'
);
SELECT ok(
  has_column_privilege('authenticated', 'public.member', 'nickname', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.member', 'profile_image', 'UPDATE'),
  'V2-SEC-01 기존 nickname 쓰기는 유지하고 profile_image 직접 쓰기는 회수한다'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.update_my_profile(text,text,text)', 'EXECUTE')
  AND NOT has_function_privilege(
    'authenticated',
    'public.activate_my_profile_avatar_service(uuid,uuid,text)',
    'EXECUTE'
  ),
  'V2-SEC-02 프로필 저장만 client에 열고 검증 후 활성화는 service_role 전용이다'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"59000000-0000-0000-0000-000000000001"}',
  true
);
SELECT is(
  public.update_my_profile(
    '새 Viewer', '한 걸음씩, 끝까지 함께해요',
    '/images/social-viral/seoyeon.png'
  )->'profile'->>'bio',
  '한 걸음씩, 끝까지 함께해요',
  'V2-PROFILE-01 본인이 nickname 소개 프리셋 사진을 함께 저장한다'
);
SELECT throws_ok(
  $$SELECT public.update_my_profile('새 Viewer', '', 'https://attacker.invalid/avatar.png')$$,
  'P0024', 'invalid_profile_image',
  'V2-PROFILE-02 임의 외부 사진 URL 저장을 거부한다'
);
SELECT is(
  public.my_social_dashboard()->'profile'->>'bio',
  '한 걸음씩, 끝까지 함께해요',
  'V2-PROFILE-03 dashboard가 저장한 소개를 반환한다'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"59000000-0000-0000-0000-000000000004"}',
  true
);
SELECT ok(
  (public.account_withdrawal_eligibility()->>'eligible')::boolean
  AND public.account_withdrawal_eligibility()->'blocked_reasons' = '{}'::jsonb,
  'V2-ACCOUNT-02 잔액과 진행 중 환전이 없으면 고객센터 탈퇴 접수 가능 상태다'
);
RESET ROLE;

INSERT INTO public.cashout_request(
  member_id, clover_amount, gross_krw, fee_krw,
  withholding_krw, net_krw, status
) VALUES (
  '59000000-0000-0000-0000-000000000004',
  1, 1000, 0, 0, 1000, 'REQUESTED'
);
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"59000000-0000-0000-0000-000000000004"}',
  true
);
SELECT ok(
  NOT (public.account_withdrawal_eligibility()->>'eligible')::boolean
  AND public.account_withdrawal_eligibility()->'blocked_reasons' ? 'cashout'
  AND (public.account_withdrawal_eligibility()->>'clover_balance')::integer = 0,
  'V2-ACCOUNT-05 잔액이 0이어도 진행 중 환전이 있으면 탈퇴 접수를 거부한다'
);
RESET ROLE;

INSERT INTO public.profile_avatar_asset(
  id, owner_member_id, object_path, status, content_sha256, mime_type, byte_size
) VALUES (
  '59100000-0000-4000-8000-000000000001',
  '59000000-0000-0000-0000-000000000001',
  '59000000-0000-0000-0000-000000000001/59100000-0000-4000-8000-000000000001.webp',
  'UPLOADING', repeat('a', 64), 'image/webp', 12
);

SET LOCAL ROLE service_role;
SELECT is(
  public.activate_my_profile_avatar_service(
    '59100000-0000-4000-8000-000000000001',
    '59000000-0000-0000-0000-000000000001',
    'http://127.0.0.1:54321/storage/v1/object/public/profile-avatars/59000000-0000-0000-0000-000000000001/59100000-0000-4000-8000-000000000001.webp'
  )->'profile'->>'profile_image',
  'http://127.0.0.1:54321/storage/v1/object/public/profile-avatars/59000000-0000-0000-0000-000000000001/59100000-0000-4000-8000-000000000001.webp',
  'V2-PROFILE-04 검증 경계 뒤 service_role만 업로드 자산을 활성화한다'
);
SELECT public.hydrate_kakao_profile_defaults_service(
  '59000000-0000-0000-0000-000000000001',
  '카카오 이름', 'https://k.kakaocdn.net/provider.webp',
  '01022223333', true
);
SELECT ok(
  (SELECT nickname = '새 Viewer'
    AND profile_image LIKE '%/profile-avatars/%'
    AND phone = '01022223333'
   FROM public.member
   WHERE id = '59000000-0000-0000-0000-000000000001'),
  'V2-AUTH-01 재로그인은 사용자 nickname 사진을 보존하고 명시 제공 phone만 갱신한다'
);
SELECT public.hydrate_kakao_profile_defaults_service(
  '59000000-0000-0000-0000-000000000004',
  '카카오 기본 이름', 'https://k.kakaocdn.net/default.webp',
  NULL, false
);
SELECT ok(
  (SELECT nickname = '카카오 기본 이름'
    AND profile_image = 'https://k.kakaocdn.net/default.webp'
    AND phone = '01099998888'
   FROM public.member
   WHERE id = '59000000-0000-0000-0000-000000000004'),
  'V2-AUTH-02 빈 프로필만 provider 기본값으로 채우고 미제공 phone은 보존한다'
);
RESET ROLE;

SELECT is(
  ARRAY[
    public.social_cover_preset_for_title('토익 900'),
    public.social_cover_preset_for_title('마라톤 완주'),
    public.social_cover_preset_for_title('5kg 감량'),
    public.social_cover_preset_for_title('취업 면접'),
    public.social_cover_preset_for_title('저축하기'),
    public.social_cover_preset_for_title('블로그 글쓰기'),
    public.social_cover_preset_for_title('아침 루틴'),
    public.social_cover_preset_for_title('유럽 여행'),
    public.social_cover_preset_for_title('')
  ],
  ARRAY['study','run','health','career','money','writing','habit','travel','study'],
  'V2-COVER-01 prototype 키워드 8종과 빈 제목 fallback을 그대로 매핑한다'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"59000000-0000-0000-0000-000000000001"}',
  true
);
SELECT public.create_goal('마라톤 완주', '', DATE '2030-10-01');
SELECT is(
  (SELECT cover_preset_key || ':' || cover_selection_mode
   FROM public.goal WHERE title = '마라톤 완주 해낼게'),
  'run:AUTO',
  'V2-COVER-02 직접 선택이 없으면 제목으로 자동 프리셋을 저장한다'
);
SELECT public.create_goal('자격증 합격', '', DATE '2030-11-01', 'travel');
SELECT is(
  (SELECT cover_preset_key || ':' || cover_selection_mode
   FROM public.goal WHERE title = '자격증 합격 해낼게'),
  'travel:PRESET',
  'V2-COVER-03 직접 선택은 제목 자동 매핑보다 우선한다'
);
SELECT public.update_goal(
  (SELECT id FROM public.goal WHERE title = '마라톤 완주 해낼게'),
  '저축하기', '', DATE '2030-10-02'
);
SELECT is(
  (SELECT cover_preset_key FROM public.goal WHERE title = '저축하기 해낼게'),
  'money',
  'V2-COVER-04 AUTO 목표는 제목 수정 시 자동 프리셋도 갱신한다'
);
SELECT public.update_goal(
  (SELECT id FROM public.goal WHERE title = '자격증 합격 해낼게'),
  '토익 합격', '', DATE '2030-11-02'
);
SELECT is(
  (SELECT cover_preset_key FROM public.goal WHERE title = '토익 합격 해낼게'),
  'travel',
  'V2-COVER-05 PRESET 직접 선택은 제목 수정에도 보존한다'
);
SELECT is(
  public.set_goal_cover_preset(
    (SELECT id FROM public.goal WHERE title = '토익 합격 해낼게'), 'c6'
  )->>'cover_preset_key',
  'c6',
  'V2-COVER-06 legacy c1부터 c6 데이터와 RPC가 계속 동작한다'
);
SELECT throws_ok(
  $$SELECT public.set_goal_cover_preset(
    (SELECT id FROM public.goal WHERE title = '토익 합격 해낼게'), 'c7'
  )$$,
  'P0006', 'invalid_preset',
  'V2-COVER-07 허용 목록 밖 프리셋을 거부한다'
);

SELECT is(
  (public.my_friend_goals()->'friends'->0->>'recent_message'),
  '친구가 두 번째 보낸 메시지',
  'V2-FRIEND-01 친구쌍이 직접 주고받은 최신 비익명 메시지만 반환한다'
);
SELECT ok(
  public.my_friend_goals()::text !~ '익명 최신 원문|비공개 최신 원문|제삼자 최신 원문',
  'V2-FRIEND-02 익명 비공개 제삼자 메시지 원문을 friend JSON에 노출하지 않는다'
);
SELECT ok(
  public.friend_goal_detail(
    current_setting('test.friend_goal_id')::bigint
  )->'supporter_avatars' @> '[{"profile_image":null,"is_anonymous":true}]'::jsonb
  AND jsonb_array_length(public.friend_goal_detail(
    current_setting('test.friend_goal_id')::bigint
  )->'supporter_avatars') <= 3,
  'V2-FRIEND-03 상세 supporter avatar는 최대3이고 익명 사진은 null이다'
);
SELECT ok(
  public.my_social_dashboard()->'received_cheers' @>
    '[{"display_name":"Friend","profile_image":"/images/social-viral/dogyeong.png","is_anonymous":false}]'::jsonb,
  'V2-CHEER-01 받은응원은 비익명 응원자의 실제 profile_image를 반환한다'
);
SELECT ok(
  public.my_social_dashboard()->'received_cheers' @>
    '[{"display_name":null,"profile_image":null,"is_anonymous":true}]'::jsonb
  AND (public.my_social_dashboard()->'received_cheers')::text !~
    'clover_amount|supporter_member_id|payment_id',
  'V2-CHEER-02 익명 신원과 금액 결제 회원 식별자를 노출하지 않는다'
);
SELECT ok(
  public.my_goal_cheer_summary(
    (SELECT id FROM public.goal WHERE slug = 'v2-viewer'), NULL, 20
  ) @> '{"total_count":2}'::jsonb
  AND jsonb_array_length(public.my_goal_cheer_summary(
    (SELECT id FROM public.goal WHERE slug = 'v2-viewer'), NULL, 20
  )->'items') = 2
  AND public.my_goal_cheer_summary(
    (SELECT id FROM public.goal WHERE slug = 'v2-viewer'), NULL, 20
  )->'items' @> '[{"display_name":"Friend","cheer_count":2}]'::jsonb,
  'V2-CHEER-03 owner 목표 응원을 고유 supporter 단위 total과 supporter별 횟수로 반환한다'
);
SELECT ok(
  jsonb_array_length(public.my_goal_cheer_summary(
    (SELECT id FROM public.goal WHERE slug = 'v2-viewer'), '최신', 20
  )->'items') = 1
  AND public.my_goal_cheer_summary(
    (SELECT id FROM public.goal WHERE slug = 'v2-viewer'), '최신', 20
  )->'items' @> '[{"display_name":"Friend","cheer_count":2,"message":"친구가 두 번째 보낸 메시지"}]'::jsonb
  AND public.my_social_dashboard()->'sent_cheers' @>
    '[{"target_name":"Friend","profile_image":"/images/social-viral/dogyeong.png"}]'::jsonb
  AND (public.my_social_dashboard()->'sent_cheers')::text !~
    'clover_amount|supporter_member_id|payment_id',
  'V2-CHEER-04 과거 메시지 검색도 supporter 전체 횟수와 최신 메시지를 보존하며 보낸응원은 금액 회원 식별자 없이 동작한다'
);
SELECT lives_ok(
  format(
    'SELECT public.my_goal_cheer_summary(%s, %L, 20)',
    (SELECT id FROM public.goal WHERE slug = 'v2-viewer'),
    repeat('가', 80)
  ),
  'V2-CHEER-05 프로토타입과 같은 80자 검색어를 허용한다'
);
SELECT throws_ok(
  format(
    'SELECT public.my_goal_cheer_summary(%s, %L, 20)',
    (SELECT id FROM public.goal WHERE slug = 'v2-viewer'),
    repeat('가', 81)
  ),
  'P0027', 'invalid_search',
  'V2-CHEER-06 80자를 넘는 검색어를 거부한다'
);
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"59000000-0000-0000-0000-000000000006"}',
  true
);
SELECT ok(
  public.my_goal_cheer_summary(
    (SELECT id FROM public.goal WHERE slug = 'v2-many'), NULL, 20
  ) @> '{"total_count":21}'::jsonb
  AND jsonb_array_length(public.my_goal_cheer_summary(
    (SELECT id FROM public.goal WHERE slug = 'v2-many'), NULL, 20
  )->'items') = 20,
  'V2-CHEER-07 고유 supporter 21명이면 total_count는21이고 items만20으로 제한한다'
);
SELECT throws_ok(
  $$SELECT public.my_goal_cheer_summary(
    (SELECT id FROM public.goal WHERE slug = 'v2-viewer'), NULL, 20
  )$$,
  'P0005', 'goal_forbidden',
  'V2-CHEER-08 타인 목표 supporter summary 조회를 거부한다'
);
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"59000000-0000-0000-0000-000000000001"}',
  true
);
SELECT set_config(
  'test.close_ledger_count',
  (SELECT count(*)::text FROM public.clover_ledger
   WHERE member_id = '59000000-0000-0000-0000-000000000001'),
  true
);
SELECT set_config(
  'test.close_balance',
  (SELECT COALESCE(clover_count, 0)::text FROM public.clover_balance
   WHERE member_id = '59000000-0000-0000-0000-000000000001'),
  true
);
SELECT is(
  public.close_my_goal(
    (SELECT id FROM public.goal WHERE slug = 'v2-viewer')
  )->>'status',
  'CLOSED',
  'V2-GOAL-01 본인 ACTIVE 목표를 CLOSED로 종료한다'
);
SELECT ok(
  (SELECT status = 'CLOSED' AND closed_at IS NOT NULL
   FROM public.goal WHERE slug = 'v2-viewer'),
  'V2-GOAL-02 목표 종료는 closed_at을 함께 기록한다'
);
SELECT is(
  public.close_my_goal(
    (SELECT id FROM public.goal WHERE slug = 'v2-viewer')
  )->>'status',
  'CLOSED',
  'V2-GOAL-03 이미 종료한 목표를 다시 종료해도 멱등이다'
);
SELECT ok(
  (SELECT count(*)::text = current_setting('test.close_ledger_count')
   FROM public.clover_ledger
   WHERE member_id = '59000000-0000-0000-0000-000000000001')
  AND (SELECT COALESCE(clover_count, 0)::text = current_setting('test.close_balance')
       FROM public.clover_balance
       WHERE member_id = '59000000-0000-0000-0000-000000000001'),
  'V2-GOAL-05 목표 종료 전후 clover ledger 건수와 잔액은 불변이다'
);
SELECT lives_ok(
  $$SELECT public.create_goal('종료 뒤 새 목표', '', DATE '2030-12-30')$$,
  'V2-GOAL-06 ACTIVE 목표 하나를 종료하면 진행 중 3개 상한에서 자리가 생겨 새 목표를 만들 수 있다'
);
SELECT throws_ok(
  $$SELECT public.create_goal('상한 초과 목표', '', DATE '2030-12-29')$$,
  '55000', 'goal_limit_reached',
  'V2-GOAL-07 종료 뒤 새 목표 생성으로 ACTIVE 3개가 되면 다음 생성을 다시 거부한다'
);
SELECT throws_ok(
  $$SELECT public.close_my_goal(
    (SELECT id FROM public.goal WHERE slug = 'v2-friend-public')
  )$$,
  'P0002', 'goal_not_found',
  'V2-GOAL-04 타인 목표 종료를 거부한다'
);
SELECT ok(
  NOT (public.account_withdrawal_eligibility()->>'eligible')::boolean
  AND public.account_withdrawal_eligibility()->'blocked_reasons' ? 'clover_balance'
  AND (public.account_withdrawal_eligibility()->>'support_request_required')::boolean,
  'V2-ACCOUNT-01 잔액이 있으면 고객센터 탈퇴 접수 가능 상태가 아니며 금융 기록을 삭제하지 않는다'
);
RESET ROLE;

INSERT INTO public.profile_avatar_asset(
  id, owner_member_id, object_path, status, content_sha256,
  mime_type, byte_size, created_at
) VALUES (
  '59100000-0000-4000-8000-000000000004',
  '59000000-0000-0000-0000-000000000005',
  '59000000-0000-0000-0000-000000000005/member-delete.webp',
  'UPLOADING', repeat('d', 64), 'image/webp', 12,
  now() - interval '3 hours'
);
DELETE FROM auth.users
WHERE id = '59000000-0000-0000-0000-000000000005';
SELECT ok(
  (SELECT owner_member_id IS NULL AND status = 'DELETED'
   FROM public.profile_avatar_asset
   WHERE id = '59100000-0000-4000-8000-000000000004')
  AND EXISTS (
    SELECT 1 FROM public.storage_cleanup_queue
    WHERE profile_avatar_asset_id = '59100000-0000-4000-8000-000000000004'
      AND status = 'PENDING'
      AND available_at <= now()
  ),
  'V2-ACCOUNT-03 member 삭제 전 trigger가 avatar를 tombstone 처리하고 cleanup queue를 독립 보존한다'
);
SET LOCAL ROLE service_role;
SELECT public.claim_storage_cleanup_batch(200, interval '15 minutes');
SELECT public.settle_storage_cleanup(
  (SELECT id FROM public.storage_cleanup_queue
   WHERE profile_avatar_asset_id = '59100000-0000-4000-8000-000000000004'),
  (SELECT lock_token FROM public.storage_cleanup_queue
   WHERE profile_avatar_asset_id = '59100000-0000-4000-8000-000000000004'),
  true
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.profile_avatar_asset
    WHERE id = '59100000-0000-4000-8000-000000000004'
  )
  AND EXISTS (
    SELECT 1 FROM public.storage_cleanup_queue
    WHERE object_path = '59000000-0000-0000-0000-000000000005/member-delete.webp'
      AND profile_avatar_asset_id IS NULL
      AND status = 'DONE'
  ),
  'V2-ACCOUNT-04 member 삭제 뒤에도 worker가 avatar cleanup을 완료하고 DONE 영수증을 남긴다'
);
RESET ROLE;

INSERT INTO public.profile_avatar_asset(
  id, owner_member_id, object_path, status, content_sha256,
  mime_type, byte_size, created_at
) VALUES (
  '59100000-0000-4000-8000-000000000002',
  '59000000-0000-0000-0000-000000000001',
  '59000000-0000-0000-0000-000000000001/abandoned.webp',
  'UPLOADING', repeat('b', 64), 'image/webp', 12,
  now() - interval '25 hours'
), (
  '59100000-0000-4000-8000-000000000003',
  '59000000-0000-0000-0000-000000000001',
  '59000000-0000-0000-0000-000000000001/future.webp',
  'DELETED', repeat('c', 64), 'image/webp', 12,
  now()
);

SET LOCAL ROLE service_role;
SELECT is(
  public.purge_abandoned_goal_covers(interval '24 hours'),
  1,
  'V2-CLEANUP-01 24시간 지난 중단 profile upload를 cleanup queue로 옮긴다'
);
INSERT INTO public.storage_cleanup_queue(
  profile_avatar_asset_id, bucket_id, object_path, reason, available_at
) VALUES (
  '59100000-0000-4000-8000-000000000003',
  'profile-avatars',
  '59000000-0000-0000-0000-000000000001/future.webp',
  'PROFILE_AVATAR_ABANDONED',
  now() + interval '2 hours 5 minutes'
);
SELECT public.claim_storage_cleanup_batch(200, interval '15 minutes');
SELECT ok(
  (SELECT lock_token IS NULL
   FROM public.storage_cleanup_queue
   WHERE profile_avatar_asset_id = '59100000-0000-4000-8000-000000000003'),
  'V2-CLEANUP-02 signed upload token 만료 전 queue 항목은 claim하지 않는다'
);
SELECT set_config(
  'test.cleanup_id',
  (SELECT id::text FROM public.storage_cleanup_queue
   WHERE profile_avatar_asset_id = '59100000-0000-4000-8000-000000000002'),
  true
);
SELECT set_config(
  'test.cleanup_token',
  (SELECT lock_token::text FROM public.storage_cleanup_queue
   WHERE profile_avatar_asset_id = '59100000-0000-4000-8000-000000000002'),
  true
);
SELECT public.settle_storage_cleanup(
  current_setting('test.cleanup_id')::bigint,
  current_setting('test.cleanup_token')::uuid,
  true
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.profile_avatar_asset
    WHERE id = '59100000-0000-4000-8000-000000000002'
  ),
  'V2-CLEANUP-03 cleanup 성공은 profile tombstone metadata까지 제거한다'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
