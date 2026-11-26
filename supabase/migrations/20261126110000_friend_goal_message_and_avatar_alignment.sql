BEGIN;

CREATE OR REPLACE FUNCTION public.my_friend_goals()
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
    'friends', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'friend_member_id', friend.friend_id,
          'nickname', friend.nickname,
          'profile_image', friend.profile_image,
          'relationship_direction', CASE
            WHEN friend.viewer_cheered AND friend.friend_cheered THEN 'MUTUAL'
            WHEN friend.viewer_cheered THEN 'I_CHEERED'
            WHEN friend.friend_cheered THEN 'CHEERED_ME'
            ELSE 'INVITED'
          END,
          'recent_message', friend.recent_message,
          'recent_message_goal_id', friend.recent_message_goal_id,
          'recent_message_direction', friend.recent_message_direction,
          'goals', friend.goals
        ) ORDER BY friend.nickname, friend.friend_id
      )
      FROM (
        SELECT
          member.id AS friend_id,
          member.nickname,
          member.profile_image,
          public.social_has_confirmed_cheer(v_uid, member.id) AS viewer_cheered,
          public.social_has_confirmed_cheer(member.id, v_uid) AS friend_cheered,
          recent.message AS recent_message,
          recent.goal_id AS recent_message_goal_id,
          recent.direction AS recent_message_direction,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'goal_id', goal_row.id,
                'slug', goal_row.slug,
                'title', goal_row.title,
                'due_date', goal_row.due_date,
                'cover_preset_key', goal_row.cover_preset_key,
                'cover_public_path', CASE
                  WHEN goal_row.visibility = 'PUBLIC' THEN asset.public_path
                  ELSE NULL
                END,
                'cheer_count', (
                  SELECT count(*)
                  FROM public.cheer AS count_cheer
                  WHERE count_cheer.goal_id = goal_row.id
                    AND count_cheer.status = 'CONFIRMED'
                    AND count_cheer.deleted_at IS NULL
                    AND NOT count_cheer.is_welcome
                )
              ) ORDER BY
                (goal_row.id = recent.goal_id) DESC,
                (
                  SELECT max(activity_cheer.created_at)
                  FROM public.cheer AS activity_cheer
                  WHERE activity_cheer.goal_id = goal_row.id
                    AND activity_cheer.status = 'CONFIRMED'
                    AND activity_cheer.deleted_at IS NULL
                    AND NOT activity_cheer.is_welcome
                ) DESC NULLS LAST,
                goal_row.created_at DESC,
                goal_row.id DESC
            )
            FROM public.goal AS goal_row
            LEFT JOIN public.goal_cover_asset AS asset
              ON asset.id = goal_row.active_cover_asset_id
              AND asset.status = 'APPROVED'
            WHERE goal_row.member_id = member.id
              AND goal_row.visibility IN ('PUBLIC', 'FRIENDS')
              AND goal_row.status = 'ACTIVE'
              AND goal_row.deleted_at IS NULL
          ), '[]'::jsonb) AS goals
        FROM public.friend_connection AS connection
        JOIN public.member AS member ON member.id = CASE
          WHEN connection.member_low_id = v_uid THEN connection.member_high_id
          ELSE connection.member_low_id
        END
        LEFT JOIN LATERAL (
          SELECT
            cheer.message,
            cheer.goal_id,
            CASE
              WHEN message_goal.member_id = member.id
                AND attribution.supporter_member_id = v_uid THEN 'SENT'
              WHEN message_goal.member_id = v_uid
                AND attribution.supporter_member_id = member.id THEN 'RECEIVED'
              ELSE NULL
            END AS direction
          FROM public.cheer AS cheer
          JOIN public.goal AS message_goal ON message_goal.id = cheer.goal_id
          JOIN public.social_cheer_member_attribution AS attribution
            ON attribution.cheer_id = cheer.id
          WHERE cheer.status = 'CONFIRMED'
            AND cheer.deleted_at IS NULL
            AND NOT cheer.is_welcome
            AND NOT cheer.is_anonymous
            AND NULLIF(btrim(cheer.message), '') IS NOT NULL
            AND message_goal.deleted_at IS NULL
            AND message_goal.status <> 'DELETED'
            AND message_goal.visibility IN ('PUBLIC', 'FRIENDS')
            AND (
              (message_goal.member_id = member.id AND attribution.supporter_member_id = v_uid)
              OR (message_goal.member_id = v_uid AND attribution.supporter_member_id = member.id)
            )
          ORDER BY cheer.created_at DESC, cheer.id DESC
          LIMIT 1
        ) AS recent ON true
        WHERE connection.status = 'ACTIVE'
          AND v_uid IN (connection.member_low_id, connection.member_high_id)
      ) AS friend
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.my_friend_goals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_friend_goals() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.friend_goal_detail(goal_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := public.social_require_user();
  v_goal public.goal%ROWTYPE;
  v_asset public.goal_cover_asset%ROWTYPE;
BEGIN
  SELECT * INTO v_goal
  FROM public.goal AS goal_row
  WHERE goal_row.id = goal_id
    AND goal_row.deleted_at IS NULL
    AND goal_row.status <> 'DELETED'
    AND (
      goal_row.member_id = v_uid
      OR goal_row.visibility = 'PUBLIC'
      OR (
        goal_row.visibility = 'FRIENDS'
        AND public.social_is_active_friend(v_uid, goal_row.member_id)
      )
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_asset
  FROM public.goal_cover_asset AS asset
  WHERE asset.id = v_goal.active_cover_asset_id
    AND asset.status = 'APPROVED';

  RETURN jsonb_build_object(
    'goal_id', v_goal.id,
    'slug', v_goal.slug,
    'title', v_goal.title,
    'reason', v_goal.reason,
    'due_date', v_goal.due_date,
    'cover_preset_key', v_goal.cover_preset_key,
    'cover_public_path', CASE
      WHEN v_goal.visibility = 'PUBLIC' THEN v_asset.public_path
      ELSE NULL
    END,
    'cheer_count', (
      SELECT count(*)
      FROM public.cheer AS cheer
      WHERE cheer.goal_id = v_goal.id
        AND cheer.status = 'CONFIRMED'
        AND cheer.deleted_at IS NULL
        AND NOT cheer.is_welcome
    ),
    'supporter_avatars', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'profile_image', supporter.profile_image,
          'is_anonymous', supporter.is_anonymous
        ) ORDER BY supporter.created_at DESC, supporter.id DESC
      )
      FROM (
        SELECT
          cheer.id,
          cheer.created_at,
          cheer.is_anonymous,
          CASE WHEN cheer.is_anonymous THEN NULL ELSE member.profile_image END AS profile_image
        FROM public.cheer AS cheer
        LEFT JOIN public.social_cheer_member_attribution AS attribution
          ON attribution.cheer_id = cheer.id
        LEFT JOIN public.member AS member ON member.id = attribution.supporter_member_id
        WHERE cheer.goal_id = v_goal.id
          AND cheer.status = 'CONFIRMED'
          AND cheer.deleted_at IS NULL
          AND NOT cheer.is_welcome
        ORDER BY cheer.created_at DESC, cheer.id DESC
        LIMIT 3
      ) AS supporter
    ), '[]'::jsonb),
    'wordmap', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('word', words.word, 'weight', words.word_count)
        ORDER BY words.word_count DESC, words.word
      )
      FROM (
        SELECT trim(token) AS word, count(*) AS word_count
        FROM public.cheer AS cheer,
          regexp_split_to_table(cheer.message, '\s+') AS token
        WHERE cheer.goal_id = v_goal.id
          AND cheer.status = 'CONFIRMED'
          AND cheer.deleted_at IS NULL
          AND NOT cheer.is_welcome
          AND cheer.message IS NOT NULL
          AND length(trim(token)) > 0
        GROUP BY trim(token)
        ORDER BY count(*) DESC, trim(token)
        LIMIT 100
      ) AS words
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.friend_goal_detail(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.friend_goal_detail(bigint) TO authenticated, service_role;

COMMENT ON FUNCTION public.my_friend_goals() IS
  'Friend list read model. A recent message carries its goal id; friend goals sort by that id, then recent confirmed non-welcome activity.';

COMMIT;
