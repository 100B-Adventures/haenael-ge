-- admin_list_members에 goal_slug 추가 (admin 회원행 → 해당 회원 goal(/g/{slug}) 링크용).
-- RETURNS TABLE 컬럼 변경은 CREATE OR REPLACE 불가 → DROP 후 재생성.
-- is_admin() 게이트·SECURITY DEFINER·search_path·GRANT 규약은 20260727020000과 동일 유지.

BEGIN;

DROP FUNCTION IF EXISTS public.admin_list_members(integer);

CREATE FUNCTION public.admin_list_members(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  nickname text,
  provider text,
  kyc_status public.kyc_status_enum,
  created_at timestamptz,
  clover_count integer,
  goal_slug text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION '권한 없음' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.nickname,
    m.provider,
    m.kyc_status,
    m.created_at,
    COALESCE(cb.clover_count, 0)::integer AS clover_count,
    gs.slug AS goal_slug
  FROM public.member AS m
  LEFT JOIN public.clover_balance AS cb ON cb.member_id = m.id
  LEFT JOIN LATERAL (
    SELECT g.slug
    FROM public.goal AS g
    WHERE g.member_id = m.id
      AND g.status <> 'DELETED'
      AND g.deleted_at IS NULL
    ORDER BY g.created_at DESC
    LIMIT 1
  ) AS gs ON true
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
END;
$$;

COMMENT ON FUNCTION public.admin_list_members(integer) IS
  '관리자 전용 회원 목록. 최근 가입순, 클로버 잔액 + 최신 ACTIVE 목표 slug 포함.';

REVOKE ALL ON FUNCTION public.admin_list_members(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_members(integer) TO authenticated;

COMMIT;
