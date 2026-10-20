-- R6: add non-monetary social proof to each dashboard goal in one RPC call.
BEGIN;

CREATE INDEX IF NOT EXISTS cheer_social_summary_recent_idx
  ON public.cheer(goal_id, created_at DESC, id DESC)
  INCLUDE (message, is_anonymous, display_name)
  WHERE status = 'CONFIRMED' AND deleted_at IS NULL AND NOT is_welcome;

CREATE OR REPLACE FUNCTION public.my_social_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := public.social_require_user();
  v_result jsonb;
BEGIN
  WITH owned_goals AS (
    SELECT g.*
    FROM public.goal AS g
    WHERE g.member_id = v_uid
      AND g.deleted_at IS NULL
      AND g.status <> 'DELETED'
  ), cheer_ranked AS (
    SELECT
      c.goal_id,
      c.id,
      c.created_at,
      c.message,
      c.is_anonymous,
      CASE WHEN c.is_anonymous THEN NULL ELSE COALESCE(m.nickname, c.display_name) END AS supporter_name,
      CASE WHEN c.is_anonymous THEN NULL ELSE m.profile_image END AS profile_image,
      row_number() OVER (PARTITION BY c.goal_id ORDER BY c.created_at DESC, c.id DESC) AS position,
      count(*) OVER (PARTITION BY c.goal_id) AS cheer_count
    FROM public.cheer AS c
    JOIN owned_goals AS g ON g.id = c.goal_id
    LEFT JOIN public.social_cheer_member_attribution AS a ON a.cheer_id = c.id
    LEFT JOIN public.member AS m ON m.id = a.supporter_member_id
    WHERE c.status = 'CONFIRMED'
      AND c.deleted_at IS NULL
      AND NOT c.is_welcome
  ), cheer_summary AS (
    SELECT
      r.goal_id,
      max(r.cheer_count)::integer AS cheer_count,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'profile_image', r.profile_image,
            'is_anonymous', r.is_anonymous
          ) ORDER BY r.created_at DESC, r.id DESC
        ) FILTER (WHERE r.position <= 3),
        '[]'::jsonb
      ) AS supporter_avatars,
      (
        jsonb_agg(
          jsonb_build_object(
            'supporter_name', r.supporter_name,
            'message', r.message,
            'created_at', r.created_at,
            'is_anonymous', r.is_anonymous
          ) ORDER BY r.created_at DESC, r.id DESC
        ) FILTER (WHERE r.position = 1)
      )->0 AS recent_cheer
    FROM cheer_ranked AS r
    GROUP BY r.goal_id
  )
  SELECT jsonb_build_object(
    'profile', COALESCE((
      SELECT jsonb_build_object('nickname', m.nickname, 'profile_image', m.profile_image)
      FROM public.member AS m WHERE m.id = v_uid
    ), jsonb_build_object('nickname', NULL, 'profile_image', NULL)),
    'goals', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'goal_id', g.id,
          'slug', g.slug,
          'title', g.title,
          'due_date', g.due_date,
          'status', g.status,
          'cover_preset_key', g.cover_preset_key,
          'cheer_count', COALESCE(s.cheer_count, 0),
          'supporter_avatars', COALESCE(s.supporter_avatars, '[]'::jsonb),
          'recent_cheer', s.recent_cheer
        )
        ORDER BY CASE WHEN g.status = 'ACTIVE' THEN 0 ELSE 1 END, g.created_at DESC, g.id DESC
      )
      FROM owned_goals AS g
      LEFT JOIN cheer_summary AS s ON s.goal_id = g.id
    ), '[]'::jsonb),
    'friend_count', (
      SELECT count(*) FROM public.friend_connection AS fc
      WHERE fc.status = 'ACTIVE' AND v_uid IN (fc.member_low_id, fc.member_high_id)
    ),
    'achievements', jsonb_build_object(
      'completed_goal_count', (SELECT count(*) FROM owned_goals AS g WHERE g.status = 'CLOSED'),
      'received_cheer_count', (
        SELECT count(*) FROM public.cheer AS c
        JOIN owned_goals AS g ON g.id = c.goal_id
        WHERE c.status = 'CONFIRMED' AND c.deleted_at IS NULL AND NOT c.is_welcome
      ),
      'connected_friend_count', (
        SELECT count(*) FROM public.friend_connection AS fc
        WHERE fc.status = 'ACTIVE' AND v_uid IN (fc.member_low_id, fc.member_high_id)
      )
    ),
    'belonging_queue', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'friend_member_id', q.friend_member_id,
          'nickname', q.nickname,
          'goal_id', q.goal_id,
          'slug', q.slug,
          'title', q.title,
          'due_date', q.due_date,
          'cover_preset_key', q.cover_preset_key
        ) ORDER BY q.due_date NULLS LAST, q.goal_id
      )
      FROM (
        SELECT friend.id AS friend_member_id, friend.nickname, g.id AS goal_id,
          g.slug, g.title, g.due_date, g.cover_preset_key
        FROM public.friend_connection AS fc
        JOIN public.member AS friend ON friend.id = CASE
          WHEN fc.member_low_id = v_uid THEN fc.member_high_id ELSE fc.member_low_id END
        JOIN public.goal AS g ON g.member_id = friend.id
        WHERE fc.status = 'ACTIVE'
          AND v_uid IN (fc.member_low_id, fc.member_high_id)
          AND g.status = 'ACTIVE' AND g.deleted_at IS NULL
          AND g.visibility IN ('PUBLIC', 'FRIENDS')
          AND NOT EXISTS (
            SELECT 1 FROM public.social_cheer_member_attribution AS a
            JOIN public.cheer AS c ON c.id = a.cheer_id
            WHERE a.supporter_member_id = v_uid AND c.goal_id = g.id
              AND c.status = 'CONFIRMED' AND c.deleted_at IS NULL
          )
        ORDER BY g.due_date NULLS LAST, g.id
        LIMIT 20
      ) AS q
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.my_social_dashboard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_social_dashboard() TO authenticated;

COMMIT;
