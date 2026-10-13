-- haenael V2 web-first social viral loop
-- Additive only. Existing cashout schema, formula, locks, and policies are untouched.
-- D-019: FRIENDS custom covers remain private and are served only by short-lived
-- Presigned URLs after the application rechecks an ACTIVE friendship.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.member_preference (
  member_id uuid PRIMARY KEY REFERENCES public.member(id) ON DELETE CASCADE,
  notify_cheer boolean NOT NULL DEFAULT true,
  notify_marketing boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.friend_invite (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  inviter_member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  goal_id bigint REFERENCES public.goal(id) ON DELETE SET NULL,
  token_hash bytea NOT NULL UNIQUE,
  channel text NOT NULL CHECK (channel IN ('WEB', 'KAKAO', 'LINK', 'INTOSS')),
  expires_at timestamptz NOT NULL,
  accepted_by uuid REFERENCES public.member(id) ON DELETE CASCADE,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friend_invite_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT friend_invite_accept_pair_check CHECK ((accepted_by IS NULL) = (accepted_at IS NULL)),
  CONSTRAINT friend_invite_no_self_accept_check CHECK (accepted_by IS NULL OR accepted_by <> inviter_member_id)
);

CREATE TABLE public.friend_connection (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  member_low_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  member_high_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REMOVED', 'BLOCKED')),
  origin_invite_id uuid REFERENCES public.friend_invite(id) ON DELETE SET NULL,
  blocked_by_member_id uuid REFERENCES public.member(id) ON DELETE SET NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friend_connection_order_check CHECK (member_low_id::text < member_high_id::text),
  CONSTRAINT friend_connection_pair_unique UNIQUE (member_low_id, member_high_id),
  CONSTRAINT friend_connection_block_check CHECK (
    (status = 'BLOCKED' AND blocked_by_member_id IN (member_low_id, member_high_id))
    OR (status IN ('ACTIVE', 'REMOVED') AND blocked_by_member_id IS NULL)
  )
);

CREATE TABLE public.goal_cover_asset (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  goal_id bigint NOT NULL REFERENCES public.goal(id) ON DELETE CASCADE,
  owner_member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  quarantine_path text NOT NULL UNIQUE,
  public_path text UNIQUE,
  status text NOT NULL CHECK (status IN ('UPLOADING', 'REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'DELETED')),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size bigint NOT NULL CHECK (byte_size BETWEEN 1 AND 5242880),
  reviewed_by uuid REFERENCES public.member(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_code text CHECK (rejection_code IN ('adult', 'violence', 'personal_info', 'copyright', 'other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT goal_cover_asset_state_check CHECK (
    (status = 'APPROVED' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND rejection_code IS NULL)
    OR (status = 'REJECTED' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND rejection_code IS NOT NULL AND public_path IS NULL)
    OR (status IN ('UPLOADING', 'REVIEW') AND reviewed_by IS NULL AND reviewed_at IS NULL AND rejection_code IS NULL AND public_path IS NULL)
    OR status IN ('SUPERSEDED', 'DELETED')
  )
);

ALTER TABLE public.goal
  ADD COLUMN visibility text NOT NULL DEFAULT 'PUBLIC'
    CHECK (visibility IN ('PUBLIC', 'FRIENDS', 'PRIVATE')),
  ADD COLUMN cover_preset_key text NOT NULL DEFAULT 'c1'
    CHECK (cover_preset_key IN ('c1', 'c2', 'c3', 'c4', 'c5', 'c6')),
  ADD COLUMN active_cover_asset_id uuid REFERENCES public.goal_cover_asset(id) ON DELETE SET NULL;

CREATE TABLE public.storage_cleanup_queue (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  goal_id bigint NOT NULL REFERENCES public.goal(id) ON DELETE CASCADE,
  bucket_id text NOT NULL,
  object_path text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('VISIBILITY_DOWNGRADE', 'ASSET_REPLACED', 'ASSET_REJECTED')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DONE', 'FAILED')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX friend_invite_member_created_idx ON public.friend_invite(inviter_member_id, created_at DESC);
CREATE INDEX friend_invite_expiry_idx ON public.friend_invite(expires_at) WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX friend_connection_low_status_idx ON public.friend_connection(member_low_id, status);
CREATE INDEX friend_connection_high_status_idx ON public.friend_connection(member_high_id, status);
CREATE INDEX goal_visibility_status_idx ON public.goal(visibility, status) WHERE deleted_at IS NULL;
CREATE INDEX goal_cover_asset_goal_status_idx ON public.goal_cover_asset(goal_id, status, created_at DESC);
CREATE INDEX goal_cover_asset_sha_idx ON public.goal_cover_asset(content_sha256);
CREATE INDEX storage_cleanup_queue_pending_idx ON public.storage_cleanup_queue(status, created_at) WHERE status = 'PENDING';

ALTER TABLE public.member_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_invite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_cover_asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_cleanup_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY member_preference_select_own ON public.member_preference
  FOR SELECT TO authenticated USING (member_id = auth.uid());

CREATE POLICY goal_cover_asset_select_owner ON public.goal_cover_asset
  FOR SELECT TO authenticated USING (owner_member_id = auth.uid());

REVOKE ALL ON TABLE public.member_preference, public.friend_invite,
  public.friend_connection, public.goal_cover_asset, public.storage_cleanup_queue
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.member_preference, public.goal_cover_asset TO authenticated;
GRANT ALL ON public.member_preference, public.friend_invite, public.friend_connection,
  public.goal_cover_asset, public.storage_cleanup_queue TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('goal-cover-quarantine', 'goal-cover-quarantine', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('goal-cover-public', 'goal-cover-public', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY goal_cover_quarantine_owner_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'goal-cover-quarantine'
    AND EXISTS (
      SELECT 1
      FROM public.goal_cover_asset AS a
      WHERE a.quarantine_path = storage.objects.name
        AND a.status = 'APPROVED'
        AND a.owner_member_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.social_require_user()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.social_is_active_friend(p_member_a uuid, p_member_b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_member_a IS NOT NULL AND p_member_b IS NOT NULL AND p_member_a <> p_member_b
    AND EXISTS (
      SELECT 1 FROM public.friend_connection AS fc
      WHERE fc.member_low_id = LEAST(p_member_a, p_member_b)
        AND fc.member_high_id = GREATEST(p_member_a, p_member_b)
        AND fc.status = 'ACTIVE'
    );
$$;

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
          'goals', f.goals
        ) ORDER BY f.nickname, f.friend_id
      )
      FROM (
        SELECT
          CASE WHEN fc.member_low_id = v_uid THEN fc.member_high_id ELSE fc.member_low_id END AS friend_id,
          m.nickname,
          m.profile_image,
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

CREATE OR REPLACE FUNCTION public.friend_goal_detail(goal_id bigint)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_uid uuid := public.social_require_user(); v_goal public.goal%ROWTYPE; v_asset public.goal_cover_asset%ROWTYPE;
BEGIN
  SELECT * INTO v_goal FROM public.goal g
  WHERE g.id = goal_id AND g.deleted_at IS NULL AND g.status <> 'DELETED'
    AND (g.member_id = v_uid OR g.visibility = 'PUBLIC' OR (g.visibility = 'FRIENDS' AND public.social_is_active_friend(v_uid, g.member_id)));
  IF NOT FOUND THEN RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO v_asset FROM public.goal_cover_asset a WHERE a.id = v_goal.active_cover_asset_id AND a.status = 'APPROVED';
  RETURN jsonb_build_object(
    'goal_id', v_goal.id, 'slug', v_goal.slug, 'title', v_goal.title,
    'reason', v_goal.reason, 'due_date', v_goal.due_date,
    'cover_preset_key', v_goal.cover_preset_key,
    'cover_public_path', CASE WHEN v_goal.visibility = 'PUBLIC' THEN v_asset.public_path ELSE NULL END,
    'cheer_count', (SELECT count(*) FROM public.cheer c WHERE c.goal_id = v_goal.id AND c.status = 'CONFIRMED' AND c.deleted_at IS NULL),
    'wordmap', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('word', q.word, 'weight', q.word_count) ORDER BY q.word_count DESC, q.word)
      FROM (
        SELECT trim(w) AS word, count(*) AS word_count
        FROM public.cheer c, regexp_split_to_table(c.message, '\s+') AS w
        WHERE c.goal_id = v_goal.id AND c.status = 'CONFIRMED' AND c.deleted_at IS NULL
          AND c.message IS NOT NULL AND length(trim(w)) > 0
        GROUP BY trim(w) ORDER BY count(*) DESC, trim(w) LIMIT 100
      ) q
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_friend_invite(goal_id bigint DEFAULT NULL, channel text DEFAULT 'WEB')
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_uid uuid := public.social_require_user(); v_token text; v_id uuid; v_expires timestamptz := clock_timestamp() + interval '7 days';
BEGIN
  IF channel IS NULL OR channel NOT IN ('WEB', 'KAKAO', 'LINK', 'INTOSS') THEN
    RAISE EXCEPTION 'invalid_invite_channel' USING ERRCODE = 'P0003';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('friend_invite:' || v_uid::text, 0));
  IF (SELECT count(*) FROM public.friend_invite i WHERE i.inviter_member_id = v_uid AND i.created_at > clock_timestamp() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'invite_rate_limited' USING ERRCODE = 'P0004', DETAIL = 'retry_after_seconds=3600';
  END IF;
  IF goal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.goal g WHERE g.id = goal_id AND g.member_id = v_uid
      AND g.visibility IN ('PUBLIC', 'FRIENDS') AND g.deleted_at IS NULL AND g.status <> 'DELETED'
  ) THEN RAISE EXCEPTION 'goal_forbidden' USING ERRCODE = 'P0005'; END IF;
  v_token := translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');
  INSERT INTO public.friend_invite(inviter_member_id, goal_id, token_hash, channel, expires_at)
  VALUES (v_uid, goal_id, extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), channel, v_expires)
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('invite_id', v_id, 'token', v_token, 'web_path', '/invite/' || v_token,
    'intoss_path', 'intoss://haenael/invite?token=' || v_token, 'expires_at', v_expires);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_goal_cover_preset(goal_id bigint, preset_key text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_uid uuid := public.social_require_user(); v_goal public.goal%ROWTYPE; v_changed boolean; v_old_asset uuid;
BEGIN
  IF preset_key IS NULL OR preset_key NOT IN ('c1','c2','c3','c4','c5','c6') THEN RAISE EXCEPTION 'invalid_preset' USING ERRCODE='P0006'; END IF;
  SELECT * INTO v_goal FROM public.goal g WHERE g.id = goal_id AND g.member_id = v_uid AND g.deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'goal_forbidden' USING ERRCODE='P0005'; END IF;
  v_old_asset := v_goal.active_cover_asset_id;
  v_changed := v_goal.cover_preset_key IS DISTINCT FROM preset_key OR v_old_asset IS NOT NULL;
  UPDATE public.goal SET cover_preset_key = preset_key, active_cover_asset_id = NULL WHERE id = goal_id;
  IF v_old_asset IS NOT NULL THEN UPDATE public.goal_cover_asset SET status='SUPERSEDED' WHERE id=v_old_asset AND status='APPROVED'; END IF;
  RETURN jsonb_build_object('goal_id', goal_id, 'cover_preset_key', preset_key, 'cover_public_path', NULL, 'active_cover_changed', v_changed);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_member_preferences(notify_cheer boolean, notify_marketing boolean)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_uid uuid := public.social_require_user(); v_row public.member_preference%ROWTYPE;
BEGIN
  IF notify_cheer IS NULL OR notify_marketing IS NULL THEN RAISE EXCEPTION 'invalid_preferences' USING ERRCODE='P0007'; END IF;
  INSERT INTO public.member_preference(member_id, notify_cheer, notify_marketing, updated_at)
  VALUES(v_uid, notify_cheer, notify_marketing, clock_timestamp())
  ON CONFLICT(member_id) DO UPDATE SET notify_cheer=EXCLUDED.notify_cheer, notify_marketing=EXCLUDED.notify_marketing, updated_at=EXCLUDED.updated_at
  RETURNING * INTO v_row;
  RETURN jsonb_build_object('notify_cheer', v_row.notify_cheer, 'notify_marketing', v_row.notify_marketing, 'updated_at', v_row.updated_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.social_validate_invite_token(p_token text)
RETURNS bytea
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_token IS NULL OR length(p_token) <> 43 OR p_token !~ '^[A-Za-z0-9_-]{43}$' THEN
    RAISE EXCEPTION 'invite_not_found' USING ERRCODE='P0008';
  END IF;
  RETURN extensions.digest(convert_to(p_token, 'UTF8'), 'sha256');
END;
$$;

CREATE OR REPLACE FUNCTION public.friend_invite_preview(token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_invite public.friend_invite%ROWTYPE; v_member public.member%ROWTYPE; v_goal public.goal%ROWTYPE; v_asset public.goal_cover_asset%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM public.friend_invite i WHERE i.token_hash = public.social_validate_invite_token(token);
  IF NOT FOUND THEN RAISE EXCEPTION 'invite_not_found' USING ERRCODE='P0008'; END IF;
  IF v_invite.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'invite_revoked' USING ERRCODE='P0009'; END IF;
  IF v_invite.expires_at <= clock_timestamp() THEN RAISE EXCEPTION 'invite_expired' USING ERRCODE='P0010'; END IF;
  IF v_invite.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'invite_already_used' USING ERRCODE='P0011'; END IF;
  SELECT * INTO v_member FROM public.member m WHERE m.id=v_invite.inviter_member_id;
  IF v_invite.goal_id IS NOT NULL THEN
    SELECT * INTO v_goal FROM public.goal g WHERE g.id=v_invite.goal_id AND g.visibility IN ('PUBLIC','FRIENDS') AND g.deleted_at IS NULL;
    IF v_goal.id IS NOT NULL THEN SELECT * INTO v_asset FROM public.goal_cover_asset a WHERE a.id=v_goal.active_cover_asset_id AND a.status='APPROVED'; END IF;
  END IF;
  RETURN jsonb_build_object('inviter_nickname', v_member.nickname, 'goal_title', v_goal.title,
    'cover_preset_key', COALESCE(v_goal.cover_preset_key,'c1'),
    'cover_public_path', CASE WHEN v_goal.visibility='PUBLIC' THEN v_asset.public_path ELSE NULL END,
    'expires_at', v_invite.expires_at, 'requires_login', auth.uid() IS NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_friend_invite(token text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_uid uuid := public.social_require_user(); v_invite public.friend_invite%ROWTYPE; v_low uuid; v_high uuid; v_conn public.friend_connection%ROWTYPE; v_replay boolean := false;
BEGIN
  SELECT * INTO v_invite FROM public.friend_invite i WHERE i.token_hash=public.social_validate_invite_token(token) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invite_not_found' USING ERRCODE='P0008'; END IF;
  IF v_invite.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'invite_revoked' USING ERRCODE='P0009'; END IF;
  IF v_invite.expires_at <= clock_timestamp() THEN RAISE EXCEPTION 'invite_expired' USING ERRCODE='P0010'; END IF;
  IF v_invite.inviter_member_id=v_uid THEN RAISE EXCEPTION 'self_invite' USING ERRCODE='P0012'; END IF;
  IF v_invite.accepted_at IS NOT NULL THEN
    IF v_invite.accepted_by <> v_uid THEN RAISE EXCEPTION 'invite_already_used' USING ERRCODE='P0011'; END IF;
    v_replay := true;
  END IF;
  v_low := LEAST(v_uid, v_invite.inviter_member_id); v_high := GREATEST(v_uid, v_invite.inviter_member_id);
  SELECT * INTO v_conn FROM public.friend_connection fc WHERE fc.member_low_id=v_low AND fc.member_high_id=v_high FOR UPDATE;
  IF v_conn.status='BLOCKED' THEN RAISE EXCEPTION 'blocked_relationship' USING ERRCODE='P0013'; END IF;
  IF v_conn.id IS NULL THEN
    INSERT INTO public.friend_connection(member_low_id,member_high_id,origin_invite_id)
    VALUES(v_low,v_high,v_invite.id) RETURNING * INTO v_conn;
  ELSIF v_conn.status='REMOVED' THEN
    UPDATE public.friend_connection SET status='ACTIVE',origin_invite_id=v_invite.id,connected_at=clock_timestamp(),updated_at=clock_timestamp()
    WHERE id=v_conn.id RETURNING * INTO v_conn;
  END IF;
  IF NOT v_replay THEN UPDATE public.friend_invite SET accepted_by=v_uid,accepted_at=clock_timestamp() WHERE id=v_invite.id; END IF;
  RETURN jsonb_build_object('connection_id',v_conn.id,'friend_member_id',v_invite.inviter_member_id,'is_replay',v_replay);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_friend(friend_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_uid uuid:=public.social_require_user(); v_conn public.friend_connection%ROWTYPE; v_now timestamptz:=clock_timestamp();
BEGIN
  IF friend_member_id IS NULL OR friend_member_id=v_uid THEN RAISE EXCEPTION 'friend_not_found' USING ERRCODE='P0014'; END IF;
  SELECT * INTO v_conn FROM public.friend_connection fc
  WHERE fc.member_low_id=LEAST(v_uid,friend_member_id) AND fc.member_high_id=GREATEST(v_uid,friend_member_id) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'friend_not_found' USING ERRCODE='P0014'; END IF;
  IF v_conn.status='BLOCKED' THEN RAISE EXCEPTION 'blocked_relationship' USING ERRCODE='P0013'; END IF;
  IF v_conn.status='ACTIVE' THEN UPDATE public.friend_connection SET status='REMOVED',updated_at=v_now WHERE id=v_conn.id RETURNING * INTO v_conn; ELSE v_now:=v_conn.updated_at; END IF;
  RETURN jsonb_build_object('connection_id',v_conn.id,'status','REMOVED','removed_at',v_now);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_goal_visibility(goal_id bigint, visibility text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_uid uuid:=public.social_require_user(); v_goal public.goal%ROWTYPE; v_changed boolean; v_path text;
BEGIN
  IF visibility IS NULL OR visibility NOT IN ('PUBLIC','FRIENDS','PRIVATE') THEN RAISE EXCEPTION 'invalid_visibility' USING ERRCODE='P0015'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('goal_visibility:'||goal_id::text,0));
  SELECT * INTO v_goal FROM public.goal g WHERE g.id=goal_id AND g.member_id=v_uid AND g.deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'goal_forbidden' USING ERRCODE='P0005'; END IF;
  v_changed := v_goal.visibility IS DISTINCT FROM visibility;
  IF v_changed THEN
    UPDATE public.goal SET visibility=set_goal_visibility.visibility WHERE id=goal_id;
    IF v_goal.visibility='PUBLIC' AND visibility<>'PUBLIC' THEN
      DELETE FROM public.wordmap_render_cache WHERE wordmap_render_cache.goal_id=set_goal_visibility.goal_id;
      SELECT a.public_path INTO v_path FROM public.goal_cover_asset a WHERE a.id=v_goal.active_cover_asset_id;
      IF v_path IS NOT NULL THEN
        INSERT INTO public.storage_cleanup_queue(goal_id,bucket_id,object_path,reason)
        VALUES(goal_id,'goal-cover-public',v_path,'VISIBILITY_DOWNGRADE');
        UPDATE public.goal_cover_asset SET public_path=NULL WHERE id=v_goal.active_cover_asset_id;
      END IF;
    END IF;
    IF visibility='PRIVATE' THEN
      UPDATE public.friend_invite SET revoked_at=clock_timestamp()
      WHERE friend_invite.goal_id=set_goal_visibility.goal_id AND accepted_at IS NULL AND revoked_at IS NULL;
    END IF;
  END IF;
  RETURN jsonb_build_object('goal_id',goal_id,'visibility',visibility,'cache_invalidated',v_changed AND v_goal.visibility='PUBLIC' AND visibility<>'PUBLIC',
    'storage_cleanup_status',CASE WHEN v_path IS NULL THEN 'DONE' ELSE 'RETRYING' END);
END;
$$;

CREATE OR REPLACE VIEW public.goal_public AS
SELECT g.id,g.slug,g.title,g.reason,g.due_date,g.status,g.created_at,g.closed_at,
  COALESCE((SELECT count(*)::integer FROM public.cheer c WHERE c.goal_id=g.id AND c.status='CONFIRMED' AND c.deleted_at IS NULL),0) AS cheer_count,
  g.cover_preset_key,a.public_path AS cover_public_path
FROM public.goal g
LEFT JOIN public.goal_cover_asset a ON a.id=g.active_cover_asset_id AND a.status='APPROVED'
WHERE g.deleted_at IS NULL AND g.status<>'DELETED' AND g.visibility='PUBLIC';

CREATE OR REPLACE VIEW public.cheer_public AS
SELECT c.id,c.goal_id,CASE WHEN c.is_anonymous THEN NULL ELSE c.display_name END AS display_name,c.is_anonymous,c.message,c.created_at
FROM public.cheer c JOIN public.goal g ON g.id=c.goal_id
WHERE c.status='CONFIRMED' AND c.deleted_at IS NULL AND g.deleted_at IS NULL AND g.status<>'DELETED' AND g.visibility='PUBLIC';

DROP POLICY IF EXISTS wordmap_render_cache_select_public ON public.wordmap_render_cache;
CREATE POLICY wordmap_render_cache_select_public ON public.wordmap_render_cache FOR SELECT
USING (EXISTS (SELECT 1 FROM public.goal g WHERE g.id=wordmap_render_cache.goal_id AND g.visibility='PUBLIC' AND g.deleted_at IS NULL AND g.status<>'DELETED'));

CREATE OR REPLACE FUNCTION public.get_wordmap(p_goal_id bigint)
RETURNS TABLE(word text,word_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT trim(w),count(*)
  FROM public.cheer c,regexp_split_to_table(c.message,'\s+') w
  WHERE c.goal_id=p_goal_id AND c.message IS NOT NULL AND c.deleted_at IS NULL AND c.status='CONFIRMED'
    AND length(trim(w))>0
    AND EXISTS (SELECT 1 FROM public.goal g WHERE g.id=p_goal_id AND g.deleted_at IS NULL AND g.status<>'DELETED'
      AND (g.visibility='PUBLIC' OR g.member_id=auth.uid()))
  GROUP BY trim(w) ORDER BY count(*) DESC,trim(w) LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_goal_covers(p_limit integer DEFAULT 100)
RETURNS TABLE(asset_id uuid,goal_id bigint,goal_title text,owner_nickname text,quarantine_path text,mime_type text,byte_size bigint,content_sha256 text,created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_forbidden' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT a.id,a.goal_id,g.title,m.nickname,a.quarantine_path,a.mime_type,a.byte_size,a.content_sha256,a.created_at
  FROM public.goal_cover_asset a JOIN public.goal g ON g.id=a.goal_id JOIN public.member m ON m.id=a.owner_member_id
  WHERE a.status='REVIEW' ORDER BY a.created_at LIMIT LEAST(GREATEST(COALESCE(p_limit,100),1),500);
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
DECLARE v_asset public.goal_cover_asset%ROWTYPE; v_goal public.goal%ROWTYPE; v_previous uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_member am WHERE am.member_id=p_admin_id) THEN
    RAISE EXCEPTION 'admin_forbidden' USING ERRCODE='42501';
  END IF;
  IF p_decision NOT IN ('APPROVE','REJECT') THEN RAISE EXCEPTION 'invalid_decision' USING ERRCODE='P0016'; END IF;
  SELECT * INTO v_asset FROM public.goal_cover_asset a WHERE a.id=p_asset_id FOR UPDATE;
  IF NOT FOUND OR v_asset.status<>'REVIEW' THEN RAISE EXCEPTION 'asset_not_reviewable' USING ERRCODE='P0017'; END IF;
  SELECT * INTO v_goal FROM public.goal g WHERE g.id=v_asset.goal_id FOR UPDATE;
  IF p_decision='REJECT' THEN
    IF p_rejection_code IS NULL OR p_rejection_code NOT IN ('adult','violence','personal_info','copyright','other') THEN
      RAISE EXCEPTION 'invalid_rejection_code' USING ERRCODE='P0018';
    END IF;
    UPDATE public.goal_cover_asset SET status='REJECTED',reviewed_by=p_admin_id,reviewed_at=clock_timestamp(),rejection_code=p_rejection_code
    WHERE id=p_asset_id;
    RETURN jsonb_build_object('asset_id',p_asset_id,'status','REJECTED','public_path',NULL,'active_cover_changed',false);
  END IF;
  IF v_goal.visibility='PUBLIC' AND p_public_path IS NULL THEN RAISE EXCEPTION 'public_copy_required' USING ERRCODE='P0019'; END IF;
  IF v_goal.visibility<>'PUBLIC' AND p_public_path IS NOT NULL THEN RAISE EXCEPTION 'private_cover_must_not_publish' USING ERRCODE='P0020'; END IF;
  v_previous:=v_goal.active_cover_asset_id;
  IF v_previous IS NOT NULL AND v_previous<>p_asset_id THEN
    UPDATE public.goal_cover_asset SET status='SUPERSEDED' WHERE id=v_previous AND status='APPROVED';
  END IF;
  UPDATE public.goal_cover_asset SET status='APPROVED',public_path=p_public_path,reviewed_by=p_admin_id,
    reviewed_at=clock_timestamp(),rejection_code=NULL WHERE id=p_asset_id;
  UPDATE public.goal SET active_cover_asset_id=p_asset_id WHERE id=v_goal.id;
  RETURN jsonb_build_object('asset_id',p_asset_id,'status','APPROVED','public_path',p_public_path,'active_cover_changed',true);
END;
$$;

REVOKE ALL ON FUNCTION public.social_require_user(), public.social_is_active_friend(uuid,uuid), public.social_validate_invite_token(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.my_friend_goals(), public.friend_goal_detail(bigint), public.create_friend_invite(bigint,text),
  public.set_goal_cover_preset(bigint,text), public.update_member_preferences(boolean,boolean), public.friend_invite_preview(text),
  public.accept_friend_invite(text), public.remove_friend(uuid), public.set_goal_visibility(bigint,text), public.admin_list_goal_covers(integer),
  public.admin_apply_goal_cover_review(uuid,uuid,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.my_friend_goals(), public.friend_goal_detail(bigint), public.create_friend_invite(bigint,text),
  public.set_goal_cover_preset(bigint,text), public.update_member_preferences(boolean,boolean), public.accept_friend_invite(text),
  public.remove_friend(uuid), public.set_goal_visibility(bigint,text), public.admin_list_goal_covers(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_apply_goal_cover_review(uuid,uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.friend_invite_preview(text) TO anon,authenticated;
GRANT SELECT ON public.goal_public, public.cheer_public TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_wordmap(bigint) TO anon,authenticated;

COMMENT ON TABLE public.friend_invite IS 'V2 hash-only one-time friend invite. Plaintext token is never persisted.';
COMMENT ON TABLE public.friend_connection IS 'V2 canonical ordered friendship pair with ACTIVE, REMOVED, BLOCKED states.';
COMMENT ON TABLE public.goal_cover_asset IS 'V2 custom cover metadata. FRIENDS assets remain private per D-019.';
COMMENT ON COLUMN public.goal.visibility IS 'PUBLIC, FRIENDS, PRIVATE social read boundary.';

COMMIT;
