-- Local-only deterministic seed data. Supabase CLI applies this file only after local migrations.
-- Production deployment must not use --include-seed.

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
)
VALUES (
  'c0ffee00-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'local-cheer-seed@test.local', '', now(), now(),
  '', '', '', '{}', '{}', false, false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.member (id, nickname)
VALUES ('c0ffee00-0000-0000-0000-000000000001', '로컬 응원 시드')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.goal (member_id, slug, title, reason, due_date, status, visibility)
VALUES (
  'c0ffee00-0000-0000-0000-000000000001',
  'knirdtaq',
  '해낼게를 해낼게',
  '로컬 결제 CTA 회귀 테스트용 공개 목표',
  '2030-12-31',
  'ACTIVE',
  'PUBLIC'
)
ON CONFLICT (slug) DO NOTHING;
