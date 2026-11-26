BEGIN;

-- 비파괴 보정: 카카오 CDN의 HTTP 프로필 URL만 HTTPS로 승격한다.
UPDATE public.member
SET profile_image = regexp_replace(profile_image, '^http://', 'https://')
WHERE profile_image ~ '^http://([^.]+\.)*kakaocdn\.net/';

COMMIT;
