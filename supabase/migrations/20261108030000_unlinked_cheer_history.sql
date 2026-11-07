BEGIN;

-- 과거 cheer는 회원 로그인 귀속이 도입되기 전에 생성되어
-- social_cheer_member_attribution이 없을 수 있다. 표시명만으로 member를
-- 추정하면 동명이인을 친구로 위조하게 되므로, 계정 연결과 분리된 소유자 전용
-- 읽기 기록으로만 반환한다.
CREATE OR REPLACE FUNCTION public.my_unlinked_cheer_history()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := public.social_require_user();
BEGIN
  RETURN jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'record_key', encode(
            extensions.digest(
              convert_to('unlinked-cheer:' || q.id::text, 'UTF8'),
              'sha256'
            ),
            'hex'
          ),
          'display_name', CASE
            WHEN q.is_anonymous THEN NULL
            ELSE NULLIF(btrim(q.display_name), '')
          END,
          'message', q.message,
          'created_at', q.created_at,
          'is_anonymous', q.is_anonymous,
          'direction', 'CHEERED_ME'
        ) ORDER BY q.created_at DESC, q.id DESC
      )
      FROM (
        SELECT c.id, c.display_name, c.message, c.created_at, c.is_anonymous
        FROM public.cheer AS c
        JOIN public.goal AS g ON g.id = c.goal_id
        LEFT JOIN public.social_cheer_member_attribution AS attribution
          ON attribution.cheer_id = c.id
        WHERE g.member_id = v_uid
          AND g.deleted_at IS NULL
          AND g.status <> 'DELETED'
          AND c.status = 'CONFIRMED'
          AND c.deleted_at IS NULL
          AND NOT c.is_welcome
          AND attribution.cheer_id IS NULL
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT 20
      ) AS q
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.my_unlinked_cheer_history()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_unlinked_cheer_history()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.my_unlinked_cheer_history() IS
  'Owner-only read model for confirmed historical cheers that have no authenticated member attribution. It never infers a member identity from display_name.';

COMMIT;
