-- 목표 등록 안내를 기존 응원 도착 알림과 분리해 기록한다.
-- 기존 enum 값과 행은 변경하지 않는 비파괴 확장이다.

ALTER TYPE public.notification_type_enum
  ADD VALUE IF NOT EXISTS 'GOAL_CREATED';

CREATE OR REPLACE FUNCTION public.claim_goal_created_notification(
  p_goal_slug text
)
RETURNS TABLE(
  goal_id bigint,
  goal_title text,
  goal_slug text,
  member_nickname text,
  member_phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member_id uuid := auth.uid();
BEGIN
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION '권한 없음' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH eligible AS (
    SELECT
      g.id,
      g.title,
      g.slug,
      g.member_id,
      m.nickname,
      m.phone
    FROM public.goal AS g
    INNER JOIN public.member AS m ON m.id = g.member_id
    WHERE g.slug = btrim(p_goal_slug)
      AND g.member_id = v_member_id
      AND g.created_at >= now() - interval '5 minutes'
      AND g.deleted_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.cheer AS c
        WHERE c.goal_id = g.id
          AND c.is_welcome = true
          AND c.status = 'CONFIRMED'
          AND c.deleted_at IS NULL
      )
  ), claimed AS (
    INSERT INTO public.welcome_cheer_notification_delivery (goal_id, member_id)
    SELECT e.id, e.member_id
    FROM eligible AS e
    ON CONFLICT ON CONSTRAINT welcome_cheer_notification_delivery_pkey DO NOTHING
    RETURNING welcome_cheer_notification_delivery.goal_id
  )
  SELECT e.id, e.title, e.slug, e.nickname, e.phone::text
  FROM eligible AS e
  INNER JOIN claimed AS c ON c.goal_id = e.id;
END;
$$;

COMMENT ON FUNCTION public.claim_goal_created_notification(text) IS
  '로그인 회원의 방금 생성한 목표를 한 번 claim하고 목표 등록 알림용 서버 metadata를 함께 반환한다.';

REVOKE ALL ON FUNCTION public.claim_goal_created_notification(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_goal_created_notification(text)
  TO authenticated;
