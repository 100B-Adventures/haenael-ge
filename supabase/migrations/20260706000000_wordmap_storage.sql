-- migration: wordmap_storage
-- 워드맵 공유 이미지 Storage 버킷 + 정책
-- 슬라이스 #9: wordmap-render EF 의 공유이미지 업로드 대상.

-- ── 버킷 생성 ────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wordmap-images',
  'wordmap-images',
  true,                          -- 공개 버킷 (URL만 알면 누구나 읽기)
  2097152,                       -- 2MB 제한
  ARRAY['image/svg+xml', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- ── Storage 정책 ──────────────────────────────────────────────────────────────
-- service_role(EF): 업로드 허용
CREATE POLICY "wordmap_images_service_upload" ON storage.objects
  FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'wordmap-images');

-- service_role(EF): 덮어쓰기(upsert) 허용
CREATE POLICY "wordmap_images_service_update" ON storage.objects
  FOR UPDATE TO service_role
  USING (bucket_id = 'wordmap-images');

-- 공개 읽기 (버킷 public=true이지만 policy도 명시)
CREATE POLICY "wordmap_images_public_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'wordmap-images');
