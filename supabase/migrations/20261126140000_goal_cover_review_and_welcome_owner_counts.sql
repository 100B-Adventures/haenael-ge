BEGIN;

ALTER TABLE public.goal_cover_asset
  ADD COLUMN IF NOT EXISTS review_source text NOT NULL DEFAULT 'ADMIN'
    CHECK (review_source IN ('ADMIN', 'AUTO'));

UPDATE public.goal_cover_asset
SET review_source = 'AUTO'
WHERE status = 'APPROVED'
  AND reviewed_by = owner_member_id;

CREATE OR REPLACE FUNCTION public.auto_publish_goal_cover(
  p_asset_id uuid, p_owner_id uuid, p_public_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_asset public.goal_cover_asset%ROWTYPE;
  v_goal public.goal%ROWTYPE;
  v_previous uuid;
BEGIN
  SELECT * INTO v_asset FROM public.goal_cover_asset WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR v_asset.owner_member_id <> p_owner_id OR v_asset.status <> 'UPLOADING' THEN
    RAISE EXCEPTION 'asset_not_publishable' USING ERRCODE = 'P0017';
  END IF;
  SELECT * INTO v_goal FROM public.goal WHERE id = v_asset.goal_id FOR UPDATE;
  IF NOT FOUND OR v_goal.deleted_at IS NOT NULL OR v_goal.status = 'DELETED' THEN
    RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_goal.visibility = 'PUBLIC' AND p_public_path IS NULL THEN
    RAISE EXCEPTION 'public_copy_required' USING ERRCODE = 'P0019';
  END IF;
  IF v_goal.visibility <> 'PUBLIC' AND p_public_path IS NOT NULL THEN
    RAISE EXCEPTION 'private_cover_must_not_publish' USING ERRCODE = 'P0020';
  END IF;
  v_previous := v_goal.active_cover_asset_id;
  IF v_previous IS NOT NULL AND v_previous <> p_asset_id THEN
    INSERT INTO public.storage_cleanup_queue(goal_id, bucket_id, object_path, reason)
    SELECT v_goal.id, 'goal-cover-public', previous.public_path, 'ASSET_REPLACED'
    FROM public.goal_cover_asset AS previous
    WHERE previous.id = v_previous AND previous.public_path IS NOT NULL;
    UPDATE public.goal_cover_asset SET status = 'SUPERSEDED'
    WHERE id = v_previous AND status = 'APPROVED';
  END IF;
  UPDATE public.goal_cover_asset SET status = 'APPROVED', public_path = p_public_path,
    reviewed_by = p_owner_id, reviewed_at = clock_timestamp(), rejection_code = NULL,
    review_source = 'AUTO'
  WHERE id = p_asset_id;
  UPDATE public.goal SET active_cover_asset_id = p_asset_id, cover_selection_mode = 'CUSTOM'
  WHERE id = v_goal.id;
  RETURN jsonb_build_object('asset_id', p_asset_id, 'goal_id', v_goal.id,
    'status', 'APPROVED', 'public_path', p_public_path, 'active_cover_changed', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_apply_goal_cover_review(
  p_asset_id uuid,
  p_admin_id uuid,
  p_decision text,
  p_rejection_code text DEFAULT NULL,
  p_public_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_asset public.goal_cover_asset%ROWTYPE;
  v_goal public.goal%ROWTYPE;
  v_previous uuid;
  v_active_created_at timestamptz;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_member AS am WHERE am.member_id = p_admin_id) THEN
    RAISE EXCEPTION 'admin_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'invalid_decision' USING ERRCODE = 'P0016';
  END IF;
  SELECT * INTO v_asset FROM public.goal_cover_asset AS a
  WHERE a.id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR v_asset.status <> 'REVIEW' THEN
    RAISE EXCEPTION 'asset_not_reviewable' USING ERRCODE = 'P0017';
  END IF;
  SELECT * INTO v_goal FROM public.goal AS g WHERE g.id = v_asset.goal_id FOR UPDATE;
  IF NOT FOUND OR v_goal.deleted_at IS NOT NULL OR v_goal.status = 'DELETED' THEN
    RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF p_decision = 'REJECT' THEN
    IF p_rejection_code IS NULL OR p_rejection_code NOT IN (
      'adult', 'violence', 'personal_info', 'copyright', 'other'
    ) THEN
      RAISE EXCEPTION 'invalid_rejection_code' USING ERRCODE = 'P0018';
    END IF;
    UPDATE public.goal_cover_asset SET status = 'REJECTED', reviewed_by = p_admin_id,
      reviewed_at = clock_timestamp(), rejection_code = p_rejection_code,
      review_source = 'ADMIN'
    WHERE id = p_asset_id;
    RETURN jsonb_build_object('asset_id', p_asset_id, 'status', 'REJECTED',
      'public_path', NULL, 'active_cover_changed', false);
  END IF;
  SELECT active.created_at INTO v_active_created_at
  FROM public.goal_cover_asset AS active
  WHERE active.id = v_goal.active_cover_asset_id
    AND active.status = 'APPROVED';
  IF v_active_created_at > v_asset.created_at THEN
    RAISE EXCEPTION 'asset_stale' USING ERRCODE = 'P0017';
  END IF;
  IF v_goal.visibility = 'PUBLIC' AND p_public_path IS NULL THEN
    RAISE EXCEPTION 'public_copy_required' USING ERRCODE = 'P0019';
  END IF;
  IF v_goal.visibility <> 'PUBLIC' AND p_public_path IS NOT NULL THEN
    RAISE EXCEPTION 'private_cover_must_not_publish' USING ERRCODE = 'P0020';
  END IF;
  v_previous := v_goal.active_cover_asset_id;
  IF v_previous IS NOT NULL AND v_previous <> p_asset_id THEN
    INSERT INTO public.storage_cleanup_queue(goal_id, bucket_id, object_path, reason)
    SELECT v_goal.id, 'goal-cover-public', previous.public_path, 'ASSET_REPLACED'
    FROM public.goal_cover_asset AS previous
    WHERE previous.id = v_previous AND previous.public_path IS NOT NULL;
    UPDATE public.goal_cover_asset SET status = 'SUPERSEDED'
    WHERE id = v_previous AND status = 'APPROVED';
  END IF;
  UPDATE public.goal_cover_asset SET status = 'APPROVED', public_path = p_public_path,
    reviewed_by = p_admin_id, reviewed_at = clock_timestamp(), rejection_code = NULL,
    review_source = 'ADMIN'
  WHERE id = p_asset_id;
  UPDATE public.goal SET active_cover_asset_id = p_asset_id, cover_selection_mode = 'CUSTOM'
  WHERE id = v_goal.id;
  RETURN jsonb_build_object('asset_id', p_asset_id, 'status', 'APPROVED',
    'public_path', p_public_path, 'active_cover_changed', true);
END;
$$;

DROP FUNCTION IF EXISTS public.admin_list_goal_covers(integer);
CREATE FUNCTION public.admin_list_goal_covers(p_limit integer DEFAULT 100)
RETURNS TABLE(asset_id uuid, goal_id bigint, goal_title text, owner_nickname text,
  quarantine_path text, public_path text, status text, mime_type text,
  byte_size bigint, content_sha256 text, created_at timestamptz, is_stale boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_forbidden' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT a.id, a.goal_id, g.title, m.nickname, a.quarantine_path,
    a.public_path, a.status, a.mime_type, a.byte_size, a.content_sha256, a.created_at,
    COALESCE(active.id <> a.id AND active.created_at > a.created_at, false) AS is_stale
  FROM public.goal_cover_asset AS a
  JOIN public.goal AS g ON g.id = a.goal_id
  JOIN public.member AS m ON m.id = a.owner_member_id
  LEFT JOIN public.goal_cover_asset AS active ON active.id = g.active_cover_asset_id
    AND active.status = 'APPROVED'
  WHERE a.status = 'REVIEW'
    OR (a.status = 'APPROVED' AND g.active_cover_asset_id = a.id)
  ORDER BY (a.status = 'REVIEW') DESC, a.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_goal_cover(p_asset_id uuid, p_admin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_asset public.goal_cover_asset%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_member WHERE member_id = p_admin_id) THEN
    RAISE EXCEPTION 'admin_forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_asset FROM public.goal_cover_asset WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR v_asset.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'asset_not_removable' USING ERRCODE = 'P0017';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.goal
    WHERE id = v_asset.goal_id AND active_cover_asset_id = p_asset_id
  ) THEN
    RAISE EXCEPTION 'asset_not_removable' USING ERRCODE = 'P0017';
  END IF;
  INSERT INTO public.storage_cleanup_queue(goal_id, bucket_id, object_path, reason)
  SELECT v_asset.goal_id, 'goal-cover-public', v_asset.public_path, 'ASSET_REJECTED'
  WHERE v_asset.public_path IS NOT NULL;
  INSERT INTO public.storage_cleanup_queue(goal_id, bucket_id, object_path, reason)
  VALUES (v_asset.goal_id, 'goal-cover-quarantine', v_asset.quarantine_path, 'ABANDONED_UPLOAD');
  UPDATE public.goal SET active_cover_asset_id = NULL, cover_selection_mode = 'PRESET'
  WHERE id = v_asset.goal_id AND active_cover_asset_id = p_asset_id;
  UPDATE public.goal_cover_asset SET status = 'DELETED', public_path = NULL WHERE id = p_asset_id;
  RETURN jsonb_build_object('asset_id', p_asset_id, 'status', 'DELETED',
    'public_path', v_asset.public_path, 'active_cover_changed', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.my_goal_cheer_summary(
  p_goal_id bigint, p_search text DEFAULT NULL, p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := public.social_require_user();
  v_search text := NULLIF(btrim(p_search), '');
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 20);
  v_goal public.goal%ROWTYPE;
BEGIN
  IF v_search IS NOT NULL AND char_length(v_search) > 80 THEN
    RAISE EXCEPTION 'invalid_search' USING ERRCODE = 'P0027';
  END IF;
  SELECT * INTO v_goal FROM public.goal AS g
  WHERE g.id = p_goal_id AND g.member_id = v_uid
    AND g.deleted_at IS NULL AND g.status <> 'DELETED';
  IF NOT FOUND THEN RAISE EXCEPTION 'goal_forbidden' USING ERRCODE = 'P0005'; END IF;
  RETURN (
    WITH eligible AS (
      SELECT c.id, c.created_at, c.message,
        CASE WHEN c.is_welcome THEN false ELSE c.is_anonymous END AS is_anonymous,
        CASE WHEN c.is_welcome THEN c.display_name
          WHEN c.is_anonymous THEN NULL ELSE COALESCE(supporter.nickname, c.display_name) END AS display_name,
        CASE WHEN c.is_welcome OR c.is_anonymous THEN NULL ELSE supporter.profile_image END AS profile_image,
        encode(extensions.digest(convert_to(p_goal_id::text || ':' || CASE
          WHEN c.is_welcome THEN 'welcome'
          WHEN c.is_anonymous THEN 'anonymous:' || c.id::text
          WHEN attribution.supporter_member_id IS NOT NULL THEN 'member:' || attribution.supporter_member_id::text
          ELSE 'display:' || lower(COALESCE(c.display_name, '')) END, 'UTF8'), 'sha256'), 'hex') AS supporter_key
      FROM public.cheer AS c
      LEFT JOIN public.social_cheer_member_attribution AS attribution ON attribution.cheer_id = c.id
      LEFT JOIN public.member AS supporter ON supporter.id = attribution.supporter_member_id
      WHERE c.goal_id = p_goal_id AND c.status = 'CONFIRMED' AND c.deleted_at IS NULL
    ), grouped_all AS (
      SELECT e.supporter_key,
        (array_agg(e.display_name ORDER BY e.created_at DESC, e.id DESC))[1] AS display_name,
        bool_or(e.is_anonymous) AS is_anonymous,
        (array_agg(e.profile_image ORDER BY e.created_at DESC, e.id DESC))[1] AS profile_image,
        (array_agg(e.message ORDER BY e.created_at DESC, e.id DESC))[1] AS message,
        count(*)::integer AS cheer_count, max(e.created_at) AS latest_at
      FROM eligible AS e GROUP BY e.supporter_key
    ), matching_keys AS (
      SELECT DISTINCT e.supporter_key FROM eligible AS e WHERE v_search IS NOT NULL
        AND (COALESCE(e.display_name, '') ILIKE '%' || v_search || '%'
          OR COALESCE(e.message, '') ILIKE '%' || v_search || '%')
    ), grouped AS (
      SELECT g.* FROM grouped_all AS g
      WHERE v_search IS NULL OR EXISTS (
        SELECT 1 FROM matching_keys AS mk WHERE mk.supporter_key = g.supporter_key
      )
      ORDER BY g.latest_at DESC, g.supporter_key LIMIT v_limit
    )
    SELECT jsonb_build_object(
      'total_count', (SELECT count(DISTINCT e.supporter_key) FROM eligible AS e),
      'items', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'supporter_key', g.supporter_key, 'display_name', g.display_name,
        'is_anonymous', g.is_anonymous, 'profile_image', g.profile_image,
        'message', g.message, 'cheer_count', g.cheer_count, 'latest_at', g.latest_at
      ) ORDER BY g.latest_at DESC, g.supporter_key) FROM grouped AS g), '[]'::jsonb)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.my_social_dashboard()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := public.social_require_user();
  v_base jsonb := public._my_social_dashboard_before_d057();
  v_goals jsonb;
  v_sent jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    goal_item.value || jsonb_build_object(
      'cheer_count', (
        SELECT count(*)::integer FROM public.cheer AS c
        WHERE c.goal_id = (goal_item.value->>'goal_id')::bigint
          AND c.status = 'CONFIRMED' AND c.deleted_at IS NULL
      ),
      'supporter_avatars', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'profile_image', supporter.profile_image,
          'is_anonymous', supporter.is_anonymous
        ) ORDER BY supporter.created_at DESC, supporter.id DESC)
        FROM (
          SELECT c.id, c.created_at,
            CASE WHEN c.is_welcome THEN false ELSE c.is_anonymous END AS is_anonymous,
            CASE WHEN c.is_welcome OR c.is_anonymous THEN NULL ELSE m.profile_image END AS profile_image
          FROM public.cheer AS c
          LEFT JOIN public.social_cheer_member_attribution AS a ON a.cheer_id = c.id
          LEFT JOIN public.member AS m ON m.id = a.supporter_member_id
          WHERE c.goal_id = (goal_item.value->>'goal_id')::bigint
            AND c.status = 'CONFIRMED' AND c.deleted_at IS NULL
          ORDER BY c.created_at DESC, c.id DESC LIMIT 3
        ) AS supporter
      ), '[]'::jsonb)
    ) ORDER BY goal_item.ordinality), '[]'::jsonb)
  INTO v_goals
  FROM jsonb_array_elements(COALESCE(v_base->'goals', '[]'::jsonb))
    WITH ORDINALITY AS goal_item(value, ordinality);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', q.id, 'target_name', q.target_name, 'profile_image', q.profile_image,
    'message', q.message, 'created_at', q.created_at, 'is_anonymous', q.is_anonymous
  ) ORDER BY q.created_at DESC, q.id DESC), '[]'::jsonb)
  INTO v_sent
  FROM (
    SELECT cheer.id, target.nickname AS target_name, target.profile_image,
      cheer.message, cheer.created_at, cheer.is_anonymous
    FROM public.social_cheer_member_attribution AS attribution
    JOIN public.cheer AS cheer ON cheer.id = attribution.cheer_id
    JOIN public.goal AS goal ON goal.id = cheer.goal_id
    JOIN public.member AS target ON target.id = goal.member_id
    WHERE attribution.supporter_member_id = v_uid
      AND cheer.status = 'CONFIRMED' AND cheer.deleted_at IS NULL
      AND NOT cheer.is_welcome AND goal.deleted_at IS NULL AND goal.status <> 'DELETED'
    ORDER BY cheer.created_at DESC, cheer.id DESC LIMIT 20
  ) AS q;

  v_base := jsonb_set(v_base, '{goals}', v_goals, true);
  RETURN jsonb_set(v_base, '{sent_cheers}', v_sent, true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_goal_covers(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_goal_covers(integer) TO authenticated;

COMMENT ON FUNCTION public.admin_apply_goal_cover_review(uuid, uuid, text, text, text) IS
  'Rejects stale REVIEW assets when a newer active APPROVED cover exists, so an old admin action cannot replace a newer owner upload.';
COMMENT ON COLUMN public.goal_cover_asset.review_source IS
  'ADMIN for administrator review; AUTO for owner upload published after automatic file validation.';

COMMIT;
