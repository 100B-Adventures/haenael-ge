-- haenael V2 social my page, verifiable achievements, and belonging queue.
-- Additive only. Production application is intentionally out of scope.
-- D-022: achievements must be falsifiable from DB aggregates. No self-report,
-- streak, ranking, amount, payment, or cashout fields leave this contract.

BEGIN;

CREATE TABLE public.social_cheer_member_attribution (
  cheer_id bigint PRIMARY KEY REFERENCES public.cheer(id) ON DELETE CASCADE,
  supporter_member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX social_cheer_member_attribution_member_idx
  ON public.social_cheer_member_attribution(supporter_member_id, cheer_id);

ALTER TABLE public.social_cheer_member_attribution ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.social_cheer_member_attribution
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.social_cheer_member_attribution TO service_role;

COMMENT ON TABLE public.social_cheer_member_attribution IS
  'Authenticated supporter-to-cheer attribution used only for private aggregates and the belonging queue. No client table access.';

CREATE OR REPLACE FUNCTION public.my_social_dashboard()
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
    'profile', COALESCE((
      SELECT jsonb_build_object(
        'nickname', m.nickname,
        'profile_image', m.profile_image
      )
      FROM public.member AS m
      WHERE m.id = v_uid
    ), jsonb_build_object('nickname', NULL, 'profile_image', NULL)),
    'goals', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'goal_id', g.id,
          'slug', g.slug,
          'title', g.title,
          'due_date', g.due_date,
          'status', g.status,
          'cover_preset_key', g.cover_preset_key
        )
        ORDER BY CASE WHEN g.status = 'ACTIVE' THEN 0 ELSE 1 END,
          g.created_at DESC,
          g.id DESC
      )
      FROM public.goal AS g
      WHERE g.member_id = v_uid
        AND g.deleted_at IS NULL
        AND g.status <> 'DELETED'
    ), '[]'::jsonb),
    'friend_count', (
      SELECT count(*)
      FROM public.friend_connection AS fc
      WHERE fc.status = 'ACTIVE'
        AND v_uid IN (fc.member_low_id, fc.member_high_id)
    ),
    'achievements', jsonb_build_object(
      'completed_goal_count', (
        SELECT count(*)
        FROM public.goal AS g
        WHERE g.member_id = v_uid
          AND g.status = 'CLOSED'
          AND g.deleted_at IS NULL
      ),
      'received_cheer_count', (
        SELECT count(*)
        FROM public.cheer AS c
        JOIN public.goal AS g ON g.id = c.goal_id
        WHERE g.member_id = v_uid
          AND g.deleted_at IS NULL
          AND c.status = 'CONFIRMED'
          AND c.deleted_at IS NULL
          AND NOT c.is_welcome
      ),
      'connected_friend_count', (
        SELECT count(*)
        FROM public.friend_connection AS fc
        WHERE fc.status = 'ACTIVE'
          AND v_uid IN (fc.member_low_id, fc.member_high_id)
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
        )
        ORDER BY q.due_date NULLS LAST, q.goal_id
      )
      FROM (
        SELECT
          friend.id AS friend_member_id,
          friend.nickname,
          g.id AS goal_id,
          g.slug,
          g.title,
          g.due_date,
          g.cover_preset_key
        FROM public.friend_connection AS fc
        JOIN public.member AS friend
          ON friend.id = CASE
            WHEN fc.member_low_id = v_uid THEN fc.member_high_id
            ELSE fc.member_low_id
          END
        JOIN public.goal AS g ON g.member_id = friend.id
        WHERE fc.status = 'ACTIVE'
          AND v_uid IN (fc.member_low_id, fc.member_high_id)
          AND g.status = 'ACTIVE'
          AND g.deleted_at IS NULL
          AND g.visibility IN ('PUBLIC', 'FRIENDS')
          AND NOT EXISTS (
            SELECT 1
            FROM public.social_cheer_member_attribution AS a
            JOIN public.cheer AS c ON c.id = a.cheer_id
            WHERE a.supporter_member_id = v_uid
              AND c.goal_id = g.id
              AND c.status = 'CONFIRMED'
              AND c.deleted_at IS NULL
          )
        ORDER BY g.due_date NULLS LAST, g.id
        LIMIT 20
      ) AS q
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.my_social_dashboard()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_social_dashboard() TO authenticated;

COMMENT ON FUNCTION public.my_social_dashboard() IS
  'D-022 private my-page aggregate: profile, goals, active friend count, DB-verifiable achievements, and uncheered friend goals. No amount, ranking, or streak.';

COMMIT;
