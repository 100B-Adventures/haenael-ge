-- 목표 생성 직후 시스템 웰컴 응원을 기존 CHEER_RECEIVED 알림으로 전달한다.
-- 브라우저는 목표 slug만 제출하고, 본인 소유·생성 5분 이내·웰컴 응원 존재 여부와
-- 목표당 1회 claim은 이 SECURITY DEFINER 함수가 원자적으로 판정한다.

CREATE TABLE public.welcome_cheer_notification_delivery (
  goal_id bigint PRIMARY KEY REFERENCES public.goal(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.welcome_cheer_notification_delivery IS
  '목표 생성 웰컴 응원 알림의 1회 전달 claim. 외부 알림 실패도 목표 생성은 되돌리지 않는다.';

ALTER TABLE public.welcome_cheer_notification_delivery ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.welcome_cheer_notification_delivery
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.welcome_cheer_notification_delivery TO service_role;

CREATE OR REPLACE FUNCTION public.claim_welcome_cheer_notification(
  p_goal_slug text
)
RETURNS TABLE(goal_id bigint, goal_title text)
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
    SELECT g.id, g.title, g.member_id
    FROM public.goal AS g
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
  SELECT e.id, e.title
  FROM eligible AS e
  INNER JOIN claimed AS c ON c.goal_id = e.id;
END;
$$;

COMMENT ON FUNCTION public.claim_welcome_cheer_notification(text) IS
  '로그인 회원이 방금 만든 본인 목표의 웰컴 응원 알림을 목표당 한 번만 원자 claim한다.';

REVOKE ALL ON FUNCTION public.claim_welcome_cheer_notification(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_welcome_cheer_notification(text)
  TO authenticated;
