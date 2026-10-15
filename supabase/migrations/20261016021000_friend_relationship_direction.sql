-- D-026-D: expose the direction of confirmed cheer history for each ACTIVE friend.
-- Additive contract change. Production application remains out of scope.

BEGIN;

CREATE OR REPLACE FUNCTION public.social_has_confirmed_cheer(
  p_supporter_member_id uuid,
  p_owner_member_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.social_cheer_member_attribution AS attribution
    JOIN public.cheer AS cheer ON cheer.id = attribution.cheer_id
    JOIN public.goal AS goal ON goal.id = cheer.goal_id
    WHERE attribution.supporter_member_id = p_supporter_member_id
      AND goal.member_id = p_owner_member_id
      AND p_supporter_member_id <> p_owner_member_id
      AND NOT cheer.is_welcome
      AND (
        cheer.status = 'CONFIRMED'
        OR EXISTS (
          SELECT 1
          FROM public.payment_log AS payment_log
          WHERE payment_log.payment_id = cheer.payment_id
            AND payment_log.to_status = 'DONE'
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.social_has_confirmed_cheer(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_has_confirmed_cheer(uuid, uuid)
  TO service_role;

COMMENT ON FUNCTION public.social_has_confirmed_cheer(uuid, uuid) IS
  'Internal D-026 direction predicate. Uses the same durable confirmation evidence as D-024 friendship projection.';

CREATE OR REPLACE FUNCTION public.my_friend_goals()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_uid uuid := public.social_require_user();
BEGIN
  RETURN jsonb_build_object(
    'friends', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'friend_member_id', f.friend_id,
          'nickname', f.nickname,
          'profile_image', f.profile_image,
          'relationship_direction', CASE
            WHEN f.viewer_cheered AND f.friend_cheered THEN 'MUTUAL'
            WHEN f.viewer_cheered THEN 'I_CHEERED'
            WHEN f.friend_cheered THEN 'CHEERED_ME'
            ELSE 'INVITED'
          END,
          'goals', f.goals
        ) ORDER BY f.nickname, f.friend_id
      )
      FROM (
        SELECT
          CASE WHEN fc.member_low_id = v_uid THEN fc.member_high_id ELSE fc.member_low_id END AS friend_id,
          m.nickname,
          m.profile_image,
          public.social_has_confirmed_cheer(v_uid, m.id) AS viewer_cheered,
          public.social_has_confirmed_cheer(m.id, v_uid) AS friend_cheered,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'goal_id', g.id,
                'slug', g.slug,
                'title', g.title,
                'due_date', g.due_date,
                'cover_preset_key', g.cover_preset_key,
                'cover_public_path', CASE WHEN g.visibility = 'PUBLIC' THEN a.public_path ELSE NULL END,
                'cheer_count', (SELECT count(*) FROM public.cheer c WHERE c.goal_id = g.id AND c.status = 'CONFIRMED' AND c.deleted_at IS NULL)
              ) ORDER BY g.due_date NULLS LAST, g.id
            )
            FROM public.goal g
            LEFT JOIN public.goal_cover_asset a ON a.id = g.active_cover_asset_id AND a.status = 'APPROVED'
            WHERE g.member_id = m.id
              AND g.visibility IN ('PUBLIC', 'FRIENDS')
              AND g.status = 'ACTIVE'
              AND g.deleted_at IS NULL
          ), '[]'::jsonb) AS goals
        FROM public.friend_connection fc
        JOIN public.member m ON m.id = CASE WHEN fc.member_low_id = v_uid THEN fc.member_high_id ELSE fc.member_low_id END
        WHERE fc.status = 'ACTIVE' AND v_uid IN (fc.member_low_id, fc.member_high_id)
      ) AS f
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.my_friend_goals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_friend_goals() TO authenticated, service_role;

COMMENT ON FUNCTION public.my_friend_goals() IS
  'V2 friend list with D-026 relationship direction derived from durable confirmed cheer attribution.';

COMMIT;
