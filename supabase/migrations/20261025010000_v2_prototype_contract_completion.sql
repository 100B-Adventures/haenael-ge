-- V2 prototype contract completion.
-- Source of truth: docs/design/prototypes/social-viral-loop-v3-opus5.html
-- Scope: profile inline editing/avatar, friend recent message, semantic cover presets.

BEGIN;

ALTER TABLE public.member
  ADD COLUMN bio text;

ALTER TABLE public.member
  ADD CONSTRAINT member_bio_profile_check
    CHECK (
      bio IS NULL
      OR (
        char_length(btrim(bio)) BETWEEN 1 AND 80
        AND bio !~ '[[:cntrl:]]'
      )
    ) NOT VALID,
  ADD CONSTRAINT member_profile_image_length_check
    CHECK (profile_image IS NULL OR char_length(profile_image) <= 2048) NOT VALID;

GRANT UPDATE (bio) ON TABLE public.member TO authenticated;
REVOKE UPDATE (profile_image) ON TABLE public.member FROM authenticated;

CREATE TABLE public.profile_avatar_asset (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  owner_member_id uuid REFERENCES public.member(id) ON DELETE SET NULL,
  object_path text NOT NULL UNIQUE,
  public_url text,
  status text NOT NULL DEFAULT 'UPLOADING'
    CHECK (status IN ('UPLOADING', 'ACTIVE', 'DELETED')),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size bigint NOT NULL CHECK (byte_size BETWEEN 1 AND 5242880),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  activated_at timestamptz,
  CONSTRAINT profile_avatar_asset_owner_lifecycle_check CHECK (
    owner_member_id IS NOT NULL OR status = 'DELETED'
  ),
  CONSTRAINT profile_avatar_asset_state_check CHECK (
    (status = 'UPLOADING' AND public_url IS NULL AND activated_at IS NULL)
    OR (status = 'ACTIVE' AND public_url IS NOT NULL AND activated_at IS NOT NULL)
    OR status = 'DELETED'
  )
);

CREATE UNIQUE INDEX profile_avatar_one_active_per_member
  ON public.profile_avatar_asset(owner_member_id)
  WHERE status = 'ACTIVE';

ALTER TABLE public.profile_avatar_asset ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_avatar_asset FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profile_avatar_asset TO service_role;

COMMENT ON TABLE public.profile_avatar_asset IS
  'Profile avatar upload metadata. Client table access is denied; profile-update Edge Function owns the two-step upload contract.';

ALTER TABLE public.storage_cleanup_queue
  ALTER COLUMN goal_id DROP NOT NULL,
  ADD COLUMN profile_avatar_asset_id uuid
    REFERENCES public.profile_avatar_asset(id) ON DELETE SET NULL,
  ADD COLUMN available_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.storage_cleanup_queue
  DROP CONSTRAINT IF EXISTS storage_cleanup_queue_reason_check;
ALTER TABLE public.storage_cleanup_queue
  ADD CONSTRAINT storage_cleanup_queue_reason_check CHECK (
    reason IN (
      'VISIBILITY_DOWNGRADE', 'ASSET_REPLACED', 'ASSET_REJECTED',
      'ABANDONED_UPLOAD', 'PROFILE_AVATAR_REPLACED',
      'PROFILE_AVATAR_ABANDONED'
    )
  ),
  ADD CONSTRAINT storage_cleanup_queue_owner_check CHECK (
    (goal_id IS NOT NULL AND profile_avatar_asset_id IS NULL)
    OR (goal_id IS NULL AND profile_avatar_asset_id IS NOT NULL)
    OR (goal_id IS NULL AND profile_avatar_asset_id IS NULL AND status = 'DONE')
  );

CREATE INDEX storage_cleanup_queue_available_claim_idx
  ON public.storage_cleanup_queue(status, available_at, lease_until, created_at)
  WHERE status IN ('PENDING', 'FAILED');

CREATE OR REPLACE FUNCTION public.prepare_profile_avatar_cleanup_on_member_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.storage_cleanup_queue(
    profile_avatar_asset_id, bucket_id, object_path, reason, available_at
  )
  SELECT
    a.id,
    'profile-avatars',
    a.object_path,
    'PROFILE_AVATAR_ABANDONED',
    GREATEST(now(), a.created_at + interval '2 hours 5 minutes')
  FROM public.profile_avatar_asset AS a
  WHERE a.owner_member_id = OLD.id
    AND NOT EXISTS (
      SELECT 1
      FROM public.storage_cleanup_queue AS q
      WHERE q.profile_avatar_asset_id = a.id
        AND q.status IN ('PENDING', 'PROCESSING', 'FAILED')
    );

  UPDATE public.profile_avatar_asset
  SET status = 'DELETED'
  WHERE owner_member_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER member_prepare_profile_avatar_cleanup
BEFORE DELETE ON public.member
FOR EACH ROW
EXECUTE FUNCTION public.prepare_profile_avatar_cleanup_on_member_delete();

REVOKE ALL ON FUNCTION public.prepare_profile_avatar_cleanup_on_member_delete()
  FROM PUBLIC, anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS profile_avatars_public_select ON storage.objects;
CREATE POLICY profile_avatars_public_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'profile-avatars');

CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_nickname text,
  p_bio text,
  p_profile_image text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := public.social_require_user();
  v_member public.member%ROWTYPE;
  v_nickname text := btrim(p_nickname);
  v_bio text := NULLIF(btrim(p_bio), '');
  v_profile_image text := NULLIF(btrim(p_profile_image), '');
  v_old_avatar_id uuid;
  v_old_avatar_path text;
BEGIN
  SELECT * INTO v_member
  FROM public.member AS m
  WHERE m.id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0021';
  END IF;
  IF v_nickname IS NULL OR char_length(v_nickname) NOT BETWEEN 1 AND 30 THEN
    RAISE EXCEPTION 'invalid_nickname' USING ERRCODE = 'P0022';
  END IF;
  IF v_bio IS NOT NULL AND (
    char_length(v_bio) > 80 OR v_bio ~ '[[:cntrl:]]'
  ) THEN
    RAISE EXCEPTION 'invalid_bio' USING ERRCODE = 'P0023';
  END IF;
  IF char_length(v_profile_image) > 2048 THEN
    RAISE EXCEPTION 'invalid_profile_image' USING ERRCODE = 'P0024';
  END IF;
  IF v_profile_image IS NOT NULL
    AND v_profile_image IS DISTINCT FROM v_member.profile_image
    AND v_profile_image NOT IN (
      '/images/social-viral/seoyeon.png',
      '/images/social-viral/dogyeong.png',
      '/images/social-viral/jimin.png',
      '/images/social-viral/supporter.png'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.profile_avatar_asset AS a
      WHERE a.owner_member_id = v_uid
        AND a.status = 'ACTIVE'
        AND a.public_url = v_profile_image
    )
  THEN
    RAISE EXCEPTION 'invalid_profile_image' USING ERRCODE = 'P0024';
  END IF;

  IF v_profile_image IS DISTINCT FROM v_member.profile_image THEN
    UPDATE public.profile_avatar_asset AS a
    SET status = 'DELETED'
    WHERE a.owner_member_id = v_uid
      AND a.status = 'ACTIVE'
    RETURNING a.id, a.object_path INTO v_old_avatar_id, v_old_avatar_path;
    IF v_old_avatar_id IS NOT NULL THEN
      INSERT INTO public.storage_cleanup_queue(
        profile_avatar_asset_id, bucket_id, object_path, reason, available_at
      )
      VALUES (
        v_old_avatar_id, 'profile-avatars', v_old_avatar_path,
        'PROFILE_AVATAR_REPLACED',
        greatest(now(), (
          SELECT a.created_at + interval '2 hours 5 minutes'
          FROM public.profile_avatar_asset AS a
          WHERE a.id = v_old_avatar_id
        ))
      );
    END IF;
  END IF;

  UPDATE public.member
  SET nickname = v_nickname,
      bio = v_bio,
      profile_image = v_profile_image
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'profile', jsonb_build_object(
      'nickname', v_nickname,
      'bio', v_bio,
      'profile_image', v_profile_image
    ),
    'stale_avatar_object_path', v_old_avatar_path
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_my_profile_avatar_service(
  p_asset_id uuid,
  p_owner_member_id uuid,
  p_public_url text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_asset public.profile_avatar_asset%ROWTYPE;
  v_member public.member%ROWTYPE;
  v_old_avatar_id uuid;
  v_old_avatar_path text;
  v_required_suffix text;
BEGIN
  SELECT * INTO v_member
  FROM public.member AS m
  WHERE m.id = p_owner_member_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0021';
  END IF;

  SELECT * INTO v_asset
  FROM public.profile_avatar_asset AS a
  WHERE a.id = p_asset_id
    AND a.owner_member_id = p_owner_member_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'avatar_asset_not_found' USING ERRCODE = 'P0025';
  END IF;
  IF v_asset.status <> 'UPLOADING' THEN
    RAISE EXCEPTION 'avatar_asset_not_finalizable' USING ERRCODE = 'P0026';
  END IF;

  v_required_suffix := '/storage/v1/object/public/profile-avatars/' || v_asset.object_path;
  IF p_public_url IS NULL
    OR char_length(p_public_url) > 2048
    OR right(p_public_url, char_length(v_required_suffix)) <> v_required_suffix
  THEN
    RAISE EXCEPTION 'invalid_profile_image' USING ERRCODE = 'P0024';
  END IF;

  UPDATE public.profile_avatar_asset AS a
  SET status = 'DELETED'
  WHERE a.owner_member_id = p_owner_member_id
    AND a.status = 'ACTIVE'
    AND a.id <> p_asset_id
  RETURNING a.id, a.object_path INTO v_old_avatar_id, v_old_avatar_path;
  IF v_old_avatar_id IS NOT NULL THEN
    INSERT INTO public.storage_cleanup_queue(
      profile_avatar_asset_id, bucket_id, object_path, reason, available_at
    )
    VALUES (
      v_old_avatar_id, 'profile-avatars', v_old_avatar_path,
      'PROFILE_AVATAR_REPLACED',
      greatest(now(), (
        SELECT a.created_at + interval '2 hours 5 minutes'
        FROM public.profile_avatar_asset AS a
        WHERE a.id = v_old_avatar_id
      ))
    );
  END IF;

  UPDATE public.profile_avatar_asset
  SET status = 'ACTIVE',
      public_url = p_public_url,
      activated_at = clock_timestamp()
  WHERE id = p_asset_id;

  UPDATE public.member
  SET profile_image = p_public_url
  WHERE id = p_owner_member_id;

  RETURN jsonb_build_object(
    'asset_id', p_asset_id,
    'object_path', v_asset.object_path,
    'profile', jsonb_build_object(
      'nickname', v_member.nickname,
      'bio', v_member.bio,
      'profile_image', p_public_url
    ),
    'stale_avatar_object_path', v_old_avatar_path
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_profile(text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_my_profile_avatar_service(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_my_profile_avatar_service(uuid, uuid, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.hydrate_kakao_profile_defaults_service(
  p_member_id uuid,
  p_nickname text,
  p_profile_image text,
  p_phone text,
  p_update_phone boolean
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_member public.member%ROWTYPE;
BEGIN
  UPDATE public.member AS m
  SET nickname = CASE
        WHEN NULLIF(btrim(m.nickname), '') IS NULL
          THEN left(COALESCE(NULLIF(btrim(p_nickname), ''), '해낼게 사용자'), 30)
        ELSE m.nickname
      END,
      profile_image = CASE
        WHEN NULLIF(btrim(m.profile_image), '') IS NULL
          THEN NULLIF(btrim(p_profile_image), '')
        ELSE m.profile_image
      END,
      phone = CASE WHEN p_update_phone THEN p_phone ELSE m.phone END
  WHERE m.id = p_member_id
  RETURNING m.* INTO v_member;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0021';
  END IF;
  RETURN jsonb_build_object(
    'nickname', v_member.nickname,
    'profile_image', v_member.profile_image
  );
END;
$$;

REVOKE ALL ON FUNCTION public.hydrate_kakao_profile_defaults_service(
  uuid, text, text, text, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hydrate_kakao_profile_defaults_service(
  uuid, text, text, text, boolean
) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_storage_cleanup_batch(
  p_limit integer DEFAULT 200,
  p_lease interval DEFAULT interval '15 minutes'
)
RETURNS TABLE(id bigint, bucket_id text, object_path text, lock_token uuid)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token uuid := extensions.gen_random_uuid();
BEGIN
  RETURN QUERY
  WITH target AS (
    SELECT q.id
    FROM public.storage_cleanup_queue AS q
    WHERE q.status IN ('PENDING', 'FAILED')
      AND q.attempts < 5
      AND q.available_at <= now()
      AND (q.lease_until IS NULL OR q.lease_until < now())
    ORDER BY q.available_at, q.created_at
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.storage_cleanup_queue AS q
  SET locked_at = now(),
      lease_until = now() + p_lease,
      lock_token = v_token
  WHERE q.id IN (SELECT t.id FROM target AS t)
  RETURNING q.id, q.bucket_id, q.object_path, q.lock_token;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_storage_cleanup_batch(integer, interval)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_storage_cleanup_batch(integer, interval)
  TO service_role;

CREATE OR REPLACE FUNCTION public.purge_abandoned_goal_covers(
  p_older_than interval DEFAULT interval '24 hours'
)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_goal_count integer := 0;
  v_profile_count integer := 0;
BEGIN
  WITH target AS (
    SELECT a.id, a.goal_id, a.quarantine_path
    FROM public.goal_cover_asset AS a
    WHERE a.status = 'UPLOADING'
      AND a.created_at < now() - p_older_than
      AND NOT EXISTS (
        SELECT 1 FROM public.goal AS g
        WHERE g.active_cover_asset_id = a.id
      )
    FOR UPDATE SKIP LOCKED
  ), queued AS (
    INSERT INTO public.storage_cleanup_queue (
      goal_id, bucket_id, object_path, reason
    )
    SELECT t.goal_id, 'goal-cover-quarantine', t.quarantine_path,
      'ABANDONED_UPLOAD'
    FROM target AS t
    RETURNING 1
  ), marked AS (
    UPDATE public.goal_cover_asset AS a
    SET status = 'DELETED'
    WHERE a.id IN (SELECT id FROM target)
    RETURNING 1
  )
  SELECT count(*) INTO v_goal_count FROM marked;

  WITH target AS (
    SELECT a.id, a.object_path
    FROM public.profile_avatar_asset AS a
    WHERE a.status = 'UPLOADING'
      AND a.created_at < now() - p_older_than
    FOR UPDATE SKIP LOCKED
  ), queued AS (
    INSERT INTO public.storage_cleanup_queue (
      profile_avatar_asset_id, bucket_id, object_path, reason
    )
    SELECT t.id, 'profile-avatars', t.object_path,
      'PROFILE_AVATAR_ABANDONED'
    FROM target AS t
    RETURNING 1
  ), marked AS (
    UPDATE public.profile_avatar_asset AS a
    SET status = 'DELETED'
    WHERE a.id IN (SELECT id FROM target)
    RETURNING 1
  )
  SELECT count(*) INTO v_profile_count FROM marked;

  RETURN v_goal_count + v_profile_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_abandoned_goal_covers(interval)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_abandoned_goal_covers(interval)
  TO service_role;

CREATE OR REPLACE FUNCTION public.requeue_orphan_cover_tombstones(
  p_older_than interval DEFAULT interval '24 hours'
)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_goal_count integer := 0;
  v_profile_count integer := 0;
BEGIN
  WITH target AS (
    SELECT a.id, a.goal_id, a.quarantine_path
    FROM public.goal_cover_asset AS a
    WHERE a.status = 'DELETED'
      AND a.created_at < now() - p_older_than
      AND NOT EXISTS (
        SELECT 1 FROM public.storage_cleanup_queue AS q
        WHERE q.bucket_id = 'goal-cover-quarantine'
          AND q.object_path = a.quarantine_path
          AND q.status IN ('PENDING', 'PROCESSING', 'FAILED')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.goal AS g
        WHERE g.active_cover_asset_id = a.id
      )
    FOR UPDATE SKIP LOCKED
  ), queued AS (
    INSERT INTO public.storage_cleanup_queue (
      goal_id, bucket_id, object_path, reason
    )
    SELECT t.goal_id, 'goal-cover-quarantine', t.quarantine_path,
      'ABANDONED_UPLOAD'
    FROM target AS t
    RETURNING 1
  )
  SELECT count(*) INTO v_goal_count FROM queued;

  WITH target AS (
    SELECT a.id, a.object_path
    FROM public.profile_avatar_asset AS a
    WHERE a.status = 'DELETED'
      AND a.created_at < now() - p_older_than
      AND NOT EXISTS (
        SELECT 1 FROM public.storage_cleanup_queue AS q
        WHERE q.bucket_id = 'profile-avatars'
          AND q.object_path = a.object_path
          AND q.status IN ('PENDING', 'PROCESSING', 'FAILED')
      )
    FOR UPDATE SKIP LOCKED
  ), queued AS (
    INSERT INTO public.storage_cleanup_queue (
      profile_avatar_asset_id, bucket_id, object_path, reason
    )
    SELECT t.id, 'profile-avatars', t.object_path,
      'PROFILE_AVATAR_ABANDONED'
    FROM target AS t
    RETURNING 1
  )
  SELECT count(*) INTO v_profile_count FROM queued;

  RETURN v_goal_count + v_profile_count;
END;
$$;

REVOKE ALL ON FUNCTION public.requeue_orphan_cover_tombstones(interval)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.requeue_orphan_cover_tombstones(interval)
  TO service_role;

CREATE OR REPLACE FUNCTION public.settle_storage_cleanup(
  p_id bigint,
  p_lock_token uuid,
  p_ok boolean
)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hit integer;
  v_path text;
  v_bucket text;
  v_attempts integer;
BEGIN
  UPDATE public.storage_cleanup_queue AS q
  SET status = CASE WHEN p_ok THEN 'DONE' ELSE 'FAILED' END,
      attempts = CASE WHEN p_ok THEN q.attempts ELSE q.attempts + 1 END,
      completed_at = CASE WHEN p_ok THEN now() ELSE NULL END,
      locked_at = NULL,
      lease_until = NULL,
      lock_token = NULL
  WHERE q.id = p_id
    AND q.lock_token = p_lock_token
  RETURNING q.object_path, q.bucket_id, q.attempts
  INTO v_path, v_bucket, v_attempts;
  GET DIAGNOSTICS v_hit = ROW_COUNT;
  IF v_hit <> 1 THEN RETURN false; END IF;

  IF p_ok THEN
    DELETE FROM public.goal_cover_asset AS a
    WHERE v_bucket = 'goal-cover-quarantine'
      AND a.quarantine_path = v_path
      AND a.status = 'DELETED'
      AND NOT EXISTS (
        SELECT 1 FROM public.goal AS g
        WHERE g.active_cover_asset_id = a.id
      );
    DELETE FROM public.profile_avatar_asset AS a
    WHERE v_bucket = 'profile-avatars'
      AND a.object_path = v_path
      AND a.status = 'DELETED';
  ELSIF v_attempts >= 5 THEN
    INSERT INTO public.ops_event(event_type, severity, details)
    VALUES (
      'STORAGE_CLEANUP_DEAD_LETTER',
      'ERROR',
      jsonb_build_object(
        'queue_id', p_id,
        'bucket_id', v_bucket,
        'object_path', v_path,
        'attempts', v_attempts
      )
    );
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_storage_cleanup(bigint, uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_storage_cleanup(bigint, uuid, boolean)
  TO service_role;

ALTER TABLE public.goal
  DROP CONSTRAINT IF EXISTS goal_cover_preset_key_check;

ALTER TABLE public.goal
  ADD CONSTRAINT goal_cover_preset_key_check CHECK (
    cover_preset_key IN (
      'c1', 'c2', 'c3', 'c4', 'c5', 'c6',
      'study', 'run', 'health', 'career', 'money', 'writing', 'habit', 'travel'
    )
  ),
  ADD COLUMN cover_selection_mode text NOT NULL DEFAULT 'PRESET'
    CHECK (cover_selection_mode IN ('AUTO', 'PRESET', 'CUSTOM'));

CREATE OR REPLACE FUNCTION public.social_cover_preset_for_title(p_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN COALESCE(p_title, '') ~ '(토익|토플|공부|시험|수능|학점|영어|합격|독서|책)' THEN 'study'
    WHEN COALESCE(p_title, '') ~ '(러닝|달리|마라톤|운동|헬스|등산|수영|근력)' THEN 'run'
    WHEN COALESCE(p_title, '') ~ '(다이어트|체중|식단|건강|감량|금주|채식)' THEN 'health'
    WHEN COALESCE(p_title, '') ~ '(자격증|취업|이직|포트폴리오|면접|코딩|승진)' THEN 'career'
    WHEN COALESCE(p_title, '') ~ '(저축|적금|돈|모으|가계부|절약|투자)' THEN 'money'
    WHEN COALESCE(p_title, '') ~ '(글쓰기|블로그|일기|기록|그림|작곡|연주)' THEN 'writing'
    WHEN COALESCE(p_title, '') ~ '(습관|루틴|기상|미라클|금연|명상|스트레칭)' THEN 'habit'
    WHEN COALESCE(p_title, '') ~ '(여행|도전|버킷|일주|완주|출장)' THEN 'travel'
    ELSE 'study'
  END;
$$;

DROP FUNCTION public.create_goal(text, text, date);

CREATE FUNCTION public.create_goal(
  p_title text,
  p_reason text,
  p_due_date date,
  p_cover_preset_key text
)
RETURNS TABLE(slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_title text := btrim(p_title);
  v_member_id uuid := auth.uid();
  v_in_progress_count integer;
  v_goal_limit constant integer := 3;
  v_cover_preset_key text;
  v_cover_selection_mode text;
BEGIN
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION '권한 없음' USING ERRCODE = '42501';
  END IF;
  IF v_title IS NULL OR char_length(v_title) < 2 THEN
    RAISE EXCEPTION '목표는 2자 이상 입력해 주세요' USING ERRCODE = '22023';
  END IF;
  IF p_due_date IS NULL THEN
    RAISE EXCEPTION '마감일은 필수입니다' USING ERRCODE = '22004';
  END IF;
  IF p_cover_preset_key IS NOT NULL AND p_cover_preset_key NOT IN (
    'c1', 'c2', 'c3', 'c4', 'c5', 'c6',
    'study', 'run', 'health', 'career', 'money', 'writing', 'habit', 'travel'
  ) THEN
    RAISE EXCEPTION 'invalid_preset' USING ERRCODE = 'P0006';
  END IF;

  v_cover_preset_key := COALESCE(
    p_cover_preset_key,
    public.social_cover_preset_for_title(v_title)
  );
  v_cover_selection_mode := CASE
    WHEN p_cover_preset_key IS NULL THEN 'AUTO'
    ELSE 'PRESET'
  END;

  PERFORM pg_catalog.pg_advisory_xact_lock(hashtext(v_member_id::text));
  SELECT count(*) INTO v_in_progress_count
  FROM public.goal AS g
  WHERE g.member_id = v_member_id
    AND g.status = 'ACTIVE'
    AND g.deleted_at IS NULL
    AND g.due_date >= current_date;
  IF v_in_progress_count >= v_goal_limit THEN
    RAISE EXCEPTION 'goal_limit_reached' USING ERRCODE = '55000';
  END IF;

  RETURN QUERY
  INSERT INTO public.goal (
    member_id, title, reason, due_date, cover_preset_key, cover_selection_mode
  )
  VALUES (
    v_member_id,
    v_title || ' 해낼게',
    NULLIF(btrim(p_reason), ''),
    p_due_date,
    v_cover_preset_key,
    v_cover_selection_mode
  )
  RETURNING public.goal.slug;
END;
$$;

CREATE FUNCTION public.create_goal(
  p_title text,
  p_reason text,
  p_due_date date
)
RETURNS TABLE(slug text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT * FROM public.create_goal(p_title, p_reason, p_due_date, NULL::text);
$$;

REVOKE ALL ON FUNCTION public.create_goal(text, text, date, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_goal(text, text, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_goal(text, text, date, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_goal(text, text, date)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.update_goal(
  p_goal_id bigint,
  p_title text,
  p_reason text,
  p_due_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status public.goal_status_enum;
  v_cover_selection_mode text;
  v_title text := btrim(p_title);
  v_updated_count integer;
BEGIN
  SELECT g.status, g.cover_selection_mode
    INTO v_status, v_cover_selection_mode
  FROM public.goal AS g
  WHERE g.id = p_goal_id
    AND g.member_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '권한 없음' USING ERRCODE = '42501';
  END IF;
  IF v_status <> 'ACTIVE' THEN
    RAISE EXCEPTION '활성 목표만 수정할 수 있습니다' USING ERRCODE = '55000';
  END IF;
  IF v_title IS NULL OR char_length(v_title) < 2 THEN
    RAISE EXCEPTION '목표는 2자 이상 입력해 주세요' USING ERRCODE = '22023';
  END IF;
  IF p_due_date IS NULL THEN
    RAISE EXCEPTION '마감일은 필수입니다' USING ERRCODE = '22004';
  END IF;

  UPDATE public.goal AS g
  SET title = v_title || ' 해낼게',
      reason = NULLIF(btrim(p_reason), ''),
      due_date = p_due_date,
      cover_preset_key = CASE
        WHEN v_cover_selection_mode = 'AUTO'
          THEN public.social_cover_preset_for_title(v_title)
        ELSE g.cover_preset_key
      END
  WHERE g.id = p_goal_id
    AND g.member_id = auth.uid()
    AND g.status = 'ACTIVE';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count <> 1 THEN
    RAISE EXCEPTION '목표 수정에 실패했습니다' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_goal_cover_preset(goal_id bigint, preset_key text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := public.social_require_user();
  v_goal public.goal%ROWTYPE;
  v_changed boolean;
  v_old_asset uuid;
BEGIN
  IF preset_key IS NULL OR preset_key NOT IN (
    'c1', 'c2', 'c3', 'c4', 'c5', 'c6',
    'study', 'run', 'health', 'career', 'money', 'writing', 'habit', 'travel'
  ) THEN
    RAISE EXCEPTION 'invalid_preset' USING ERRCODE = 'P0006';
  END IF;
  SELECT * INTO v_goal
  FROM public.goal AS g
  WHERE g.id = goal_id
    AND g.member_id = v_uid
    AND g.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'goal_forbidden' USING ERRCODE = 'P0005';
  END IF;
  v_old_asset := v_goal.active_cover_asset_id;
  v_changed := v_goal.cover_preset_key IS DISTINCT FROM preset_key
    OR v_old_asset IS NOT NULL
    OR v_goal.cover_selection_mode <> 'PRESET';
  UPDATE public.goal
  SET cover_preset_key = preset_key,
      active_cover_asset_id = NULL,
      cover_selection_mode = 'PRESET'
  WHERE id = goal_id;
  IF v_old_asset IS NOT NULL THEN
    UPDATE public.goal_cover_asset
    SET status = 'SUPERSEDED'
    WHERE id = v_old_asset
      AND status = 'APPROVED';
  END IF;
  RETURN jsonb_build_object(
    'goal_id', goal_id,
    'cover_preset_key', preset_key,
    'cover_public_path', NULL,
    'active_cover_changed', v_changed
  );
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
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_member AS am WHERE am.member_id = p_admin_id
  ) THEN
    RAISE EXCEPTION 'admin_forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'invalid_decision' USING ERRCODE = 'P0016';
  END IF;
  SELECT * INTO v_asset
  FROM public.goal_cover_asset AS a
  WHERE a.id = p_asset_id
  FOR UPDATE;
  IF NOT FOUND OR v_asset.status <> 'REVIEW' THEN
    RAISE EXCEPTION 'asset_not_reviewable' USING ERRCODE = 'P0017';
  END IF;
  SELECT * INTO v_goal
  FROM public.goal AS g
  WHERE g.id = v_asset.goal_id
  FOR UPDATE;
  IF p_decision = 'REJECT' THEN
    IF p_rejection_code IS NULL OR p_rejection_code NOT IN (
      'adult', 'violence', 'personal_info', 'copyright', 'other'
    ) THEN
      RAISE EXCEPTION 'invalid_rejection_code' USING ERRCODE = 'P0018';
    END IF;
    UPDATE public.goal_cover_asset
    SET status = 'REJECTED', reviewed_by = p_admin_id,
        reviewed_at = clock_timestamp(), rejection_code = p_rejection_code
    WHERE id = p_asset_id;
    RETURN jsonb_build_object(
      'asset_id', p_asset_id,
      'status', 'REJECTED',
      'public_path', NULL,
      'active_cover_changed', false
    );
  END IF;
  IF v_goal.visibility = 'PUBLIC' AND p_public_path IS NULL THEN
    RAISE EXCEPTION 'public_copy_required' USING ERRCODE = 'P0019';
  END IF;
  IF v_goal.visibility <> 'PUBLIC' AND p_public_path IS NOT NULL THEN
    RAISE EXCEPTION 'private_cover_must_not_publish' USING ERRCODE = 'P0020';
  END IF;
  v_previous := v_goal.active_cover_asset_id;
  IF v_previous IS NOT NULL AND v_previous <> p_asset_id THEN
    UPDATE public.goal_cover_asset
    SET status = 'SUPERSEDED'
    WHERE id = v_previous
      AND status = 'APPROVED';
  END IF;
  UPDATE public.goal_cover_asset
  SET status = 'APPROVED', public_path = p_public_path,
      reviewed_by = p_admin_id, reviewed_at = clock_timestamp(),
      rejection_code = NULL
  WHERE id = p_asset_id;
  UPDATE public.goal
  SET active_cover_asset_id = p_asset_id,
      cover_selection_mode = 'CUSTOM'
  WHERE id = v_goal.id;
  RETURN jsonb_build_object(
    'asset_id', p_asset_id,
    'status', 'APPROVED',
    'public_path', p_public_path,
    'active_cover_changed', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.my_friend_goals()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := public.social_require_user();
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
          'recent_message', f.recent_message,
          'goals', f.goals
        ) ORDER BY f.nickname, f.friend_id
      )
      FROM (
        SELECT
          m.id AS friend_id,
          m.nickname,
          m.profile_image,
          public.social_has_confirmed_cheer(v_uid, m.id) AS viewer_cheered,
          public.social_has_confirmed_cheer(m.id, v_uid) AS friend_cheered,
          (
            SELECT c.message
            FROM public.cheer AS c
            JOIN public.goal AS message_goal ON message_goal.id = c.goal_id
            JOIN public.social_cheer_member_attribution AS attribution
              ON attribution.cheer_id = c.id
            WHERE c.status = 'CONFIRMED'
              AND c.deleted_at IS NULL
              AND NOT c.is_welcome
              AND NOT c.is_anonymous
              AND NULLIF(btrim(c.message), '') IS NOT NULL
              AND message_goal.deleted_at IS NULL
              AND message_goal.status <> 'DELETED'
              AND message_goal.visibility IN ('PUBLIC', 'FRIENDS')
              AND (
                (message_goal.member_id = m.id AND attribution.supporter_member_id = v_uid)
                OR (message_goal.member_id = v_uid AND attribution.supporter_member_id = m.id)
              )
            ORDER BY c.created_at DESC, c.id DESC
            LIMIT 1
          ) AS recent_message,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'goal_id', g.id,
                'slug', g.slug,
                'title', g.title,
                'due_date', g.due_date,
                'cover_preset_key', g.cover_preset_key,
                'cover_public_path', CASE
                  WHEN g.visibility = 'PUBLIC' THEN a.public_path
                  ELSE NULL
                END,
                'cheer_count', (
                  SELECT count(*)
                  FROM public.cheer AS c
                  WHERE c.goal_id = g.id
                    AND c.status = 'CONFIRMED'
                    AND c.deleted_at IS NULL
                )
              ) ORDER BY g.due_date NULLS LAST, g.id
            )
            FROM public.goal AS g
            LEFT JOIN public.goal_cover_asset AS a
              ON a.id = g.active_cover_asset_id
              AND a.status = 'APPROVED'
            WHERE g.member_id = m.id
              AND g.visibility IN ('PUBLIC', 'FRIENDS')
              AND g.status = 'ACTIVE'
              AND g.deleted_at IS NULL
          ), '[]'::jsonb) AS goals
        FROM public.friend_connection AS fc
        JOIN public.member AS m ON m.id = CASE
          WHEN fc.member_low_id = v_uid THEN fc.member_high_id
          ELSE fc.member_low_id
        END
        WHERE fc.status = 'ACTIVE'
          AND v_uid IN (fc.member_low_id, fc.member_high_id)
      ) AS f
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.my_goal_cheer_summary(
  p_goal_id bigint,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 20
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
  SELECT * INTO v_goal
  FROM public.goal AS g
  WHERE g.id = p_goal_id
    AND g.member_id = v_uid
    AND g.deleted_at IS NULL
    AND g.status <> 'DELETED';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'goal_forbidden' USING ERRCODE = 'P0005';
  END IF;

  RETURN (
    WITH eligible AS (
      SELECT
        c.id,
        c.created_at,
        c.message,
        c.is_anonymous,
        CASE
          WHEN c.is_anonymous THEN NULL
          ELSE COALESCE(supporter.nickname, c.display_name)
        END AS display_name,
        CASE
          WHEN c.is_anonymous THEN NULL
          ELSE supporter.profile_image
        END AS profile_image,
        encode(
          extensions.digest(
            convert_to(
              p_goal_id::text || ':' || CASE
                WHEN c.is_anonymous THEN 'anonymous:' || c.id::text
                WHEN attribution.supporter_member_id IS NOT NULL
                  THEN 'member:' || attribution.supporter_member_id::text
                ELSE 'display:' || lower(COALESCE(c.display_name, ''))
              END,
              'UTF8'
            ),
            'sha256'
          ),
          'hex'
        ) AS supporter_key
      FROM public.cheer AS c
      LEFT JOIN public.social_cheer_member_attribution AS attribution
        ON attribution.cheer_id = c.id
      LEFT JOIN public.member AS supporter
        ON supporter.id = attribution.supporter_member_id
      WHERE c.goal_id = p_goal_id
        AND c.status = 'CONFIRMED'
        AND c.deleted_at IS NULL
        AND NOT c.is_welcome
    ), grouped_all AS (
      SELECT
        e.supporter_key,
        (array_agg(e.display_name ORDER BY e.created_at DESC, e.id DESC))[1]
          AS display_name,
        bool_or(e.is_anonymous) AS is_anonymous,
        (array_agg(e.profile_image ORDER BY e.created_at DESC, e.id DESC))[1]
          AS profile_image,
        (array_agg(e.message ORDER BY e.created_at DESC, e.id DESC))[1]
          AS message,
        count(*)::integer AS cheer_count,
        max(e.created_at) AS latest_at
      FROM eligible AS e
      GROUP BY e.supporter_key
    ), matching_keys AS (
      SELECT DISTINCT e.supporter_key
      FROM eligible AS e
      WHERE v_search IS NOT NULL
        AND (
          COALESCE(e.display_name, '') ILIKE '%' || v_search || '%'
          OR COALESCE(e.message, '') ILIKE '%' || v_search || '%'
        )
    ), grouped AS (
      SELECT g.*
      FROM grouped_all AS g
      WHERE v_search IS NULL
        OR EXISTS (
          SELECT 1 FROM matching_keys AS mk
          WHERE mk.supporter_key = g.supporter_key
        )
      ORDER BY g.latest_at DESC, g.supporter_key
      LIMIT v_limit
    )
    SELECT jsonb_build_object(
      'total_count', (SELECT count(DISTINCT e.supporter_key) FROM eligible AS e),
      'items', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'supporter_key', g.supporter_key,
            'display_name', g.display_name,
            'is_anonymous', g.is_anonymous,
            'profile_image', g.profile_image,
            'message', g.message,
            'cheer_count', g.cheer_count,
            'latest_at', g.latest_at
          ) ORDER BY g.latest_at DESC, g.supporter_key
        )
        FROM grouped AS g
      ), '[]'::jsonb)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.friend_goal_detail(goal_id bigint)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := public.social_require_user();
  v_goal public.goal%ROWTYPE;
  v_asset public.goal_cover_asset%ROWTYPE;
BEGIN
  SELECT * INTO v_goal
  FROM public.goal AS g
  WHERE g.id = goal_id
    AND g.deleted_at IS NULL
    AND g.status <> 'DELETED'
    AND (
      g.member_id = v_uid
      OR g.visibility = 'PUBLIC'
      OR (
        g.visibility = 'FRIENDS'
        AND public.social_is_active_friend(v_uid, g.member_id)
      )
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_asset
  FROM public.goal_cover_asset AS a
  WHERE a.id = v_goal.active_cover_asset_id
    AND a.status = 'APPROVED';
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
      FROM public.cheer AS c
      WHERE c.goal_id = v_goal.id
        AND c.status = 'CONFIRMED'
        AND c.deleted_at IS NULL
    ),
    'supporter_avatars', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'profile_image', q.profile_image,
          'is_anonymous', q.is_anonymous
        ) ORDER BY q.created_at DESC, q.id DESC
      )
      FROM (
        SELECT
          c.id,
          c.created_at,
          c.is_anonymous,
          CASE WHEN c.is_anonymous THEN NULL ELSE m.profile_image END AS profile_image
        FROM public.cheer AS c
        LEFT JOIN public.social_cheer_member_attribution AS attribution
          ON attribution.cheer_id = c.id
        LEFT JOIN public.member AS m ON m.id = attribution.supporter_member_id
        WHERE c.goal_id = v_goal.id
          AND c.status = 'CONFIRMED'
          AND c.deleted_at IS NULL
          AND NOT c.is_welcome
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT 3
      ) AS q
    ), '[]'::jsonb),
    'wordmap', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('word', q.word, 'weight', q.word_count)
        ORDER BY q.word_count DESC, q.word
      )
      FROM (
        SELECT trim(w) AS word, count(*) AS word_count
        FROM public.cheer AS c,
          regexp_split_to_table(c.message, '\s+') AS w
        WHERE c.goal_id = v_goal.id
          AND c.status = 'CONFIRMED'
          AND c.deleted_at IS NULL
          AND c.message IS NOT NULL
          AND length(trim(w)) > 0
        GROUP BY trim(w)
        ORDER BY count(*) DESC, trim(w)
        LIMIT 100
      ) AS q
    ), '[]'::jsonb)
  );
END;
$$;

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
  ), cheer_counts AS (
    SELECT c.goal_id, count(*)::integer AS cheer_count
    FROM public.cheer AS c
    JOIN owned_goals AS g ON g.id = c.goal_id
    WHERE c.status = 'CONFIRMED'
      AND c.deleted_at IS NULL
      AND NOT c.is_welcome
    GROUP BY c.goal_id
  ), recent_cheer_rows AS (
    SELECT
      g.id AS goal_id,
      recent.id,
      recent.created_at,
      recent.message,
      recent.is_anonymous,
      recent.supporter_name,
      recent.profile_image,
      recent.position
    FROM owned_goals AS g
    CROSS JOIN LATERAL (
      SELECT
        c.id,
        c.created_at,
        c.message,
        c.is_anonymous,
        CASE
          WHEN c.is_anonymous THEN NULL
          ELSE COALESCE(m.nickname, c.display_name)
        END AS supporter_name,
        CASE WHEN c.is_anonymous THEN NULL ELSE m.profile_image END AS profile_image,
        row_number() OVER (ORDER BY c.created_at DESC, c.id DESC) AS position
      FROM public.cheer AS c
      LEFT JOIN public.social_cheer_member_attribution AS a ON a.cheer_id = c.id
      LEFT JOIN public.member AS m ON m.id = a.supporter_member_id
      WHERE c.goal_id = g.id
        AND c.status = 'CONFIRMED'
        AND c.deleted_at IS NULL
        AND NOT c.is_welcome
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT 3
    ) AS recent
  ), cheer_summary AS (
    SELECT
      r.goal_id,
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
            'profile_image', r.profile_image,
            'message', r.message,
            'created_at', r.created_at,
            'is_anonymous', r.is_anonymous
          ) ORDER BY r.created_at DESC, r.id DESC
        ) FILTER (WHERE r.position = 1)
      )->0 AS recent_cheer
    FROM recent_cheer_rows AS r
    GROUP BY r.goal_id
  )
  SELECT jsonb_build_object(
    'profile', COALESCE((
      SELECT jsonb_build_object(
        'nickname', m.nickname,
        'bio', m.bio,
        'profile_image', m.profile_image
      )
      FROM public.member AS m
      WHERE m.id = v_uid
    ), jsonb_build_object('nickname', NULL, 'bio', NULL, 'profile_image', NULL)),
    'goals', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'goal_id', g.id,
          'slug', g.slug,
          'title', g.title,
          'due_date', g.due_date,
          'status', g.status,
          'cover_preset_key', g.cover_preset_key,
          'cheer_count', COALESCE(cc.cheer_count, 0),
          'supporter_avatars', COALESCE(s.supporter_avatars, '[]'::jsonb),
          'recent_cheer', s.recent_cheer
        )
        ORDER BY CASE WHEN g.status = 'ACTIVE' THEN 0 ELSE 1 END,
          g.created_at DESC, g.id DESC
      )
      FROM owned_goals AS g
      LEFT JOIN cheer_counts AS cc ON cc.goal_id = g.id
      LEFT JOIN cheer_summary AS s ON s.goal_id = g.id
    ), '[]'::jsonb),
    'received_cheers', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'display_name', q.display_name,
          'profile_image', q.profile_image,
          'message', q.message,
          'created_at', q.created_at,
          'is_anonymous', q.is_anonymous
        ) ORDER BY q.created_at DESC, q.id DESC
      )
      FROM (
        SELECT
          c.id,
          CASE
            WHEN c.is_anonymous THEN NULL
            ELSE COALESCE(supporter.nickname, c.display_name)
          END AS display_name,
          CASE
            WHEN c.is_anonymous THEN NULL
            ELSE supporter.profile_image
          END AS profile_image,
          c.message,
          c.created_at,
          c.is_anonymous
        FROM public.cheer AS c
        JOIN owned_goals AS g ON g.id = c.goal_id
        LEFT JOIN public.social_cheer_member_attribution AS attribution
          ON attribution.cheer_id = c.id
        LEFT JOIN public.member AS supporter
          ON supporter.id = attribution.supporter_member_id
        WHERE c.status = 'CONFIRMED'
          AND c.deleted_at IS NULL
          AND NOT c.is_welcome
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT 20
      ) AS q
    ), '[]'::jsonb),
    'sent_cheers', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'target_name', q.target_name,
          'profile_image', q.profile_image,
          'message', q.message,
          'created_at', q.created_at
        ) ORDER BY q.created_at DESC, q.id DESC
      )
      FROM (
        SELECT
          c.id,
          target.nickname AS target_name,
          target.profile_image,
          c.message,
          c.created_at
        FROM public.social_cheer_member_attribution AS attribution
        JOIN public.cheer AS c ON c.id = attribution.cheer_id
        JOIN public.goal AS g ON g.id = c.goal_id
        JOIN public.member AS target ON target.id = g.member_id
        WHERE attribution.supporter_member_id = v_uid
          AND c.status = 'CONFIRMED'
          AND c.deleted_at IS NULL
          AND NOT c.is_welcome
          AND g.deleted_at IS NULL
          AND g.status <> 'DELETED'
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT 20
      ) AS q
    ), '[]'::jsonb),
    'friend_count', (
      SELECT count(*)
      FROM public.friend_connection AS fc
      WHERE fc.status = 'ACTIVE'
        AND v_uid IN (fc.member_low_id, fc.member_high_id)
    ),
    'achievements', jsonb_build_object(
      'completed_goal_count', (
        SELECT count(*) FROM owned_goals AS g WHERE g.status = 'CLOSED'
      ),
      'received_cheer_count', (
        SELECT count(*)
        FROM public.cheer AS c
        JOIN owned_goals AS g ON g.id = c.goal_id
        WHERE c.status = 'CONFIRMED'
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
        ) ORDER BY q.due_date NULLS LAST, q.goal_id
      )
      FROM (
        SELECT friend.id AS friend_member_id, friend.nickname,
          g.id AS goal_id, g.slug, g.title, g.due_date, g.cover_preset_key
        FROM public.friend_connection AS fc
        JOIN public.member AS friend ON friend.id = CASE
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
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_my_goal(p_goal_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_goal public.goal%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_goal
  FROM public.goal AS g
  WHERE g.id = p_goal_id
    AND g.member_id = v_uid
    AND g.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'goal_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_goal.status = 'DELETED' THEN
    RAISE EXCEPTION 'goal_not_closable' USING ERRCODE = 'P0003';
  END IF;

  IF v_goal.status = 'ACTIVE' THEN
    UPDATE public.goal
    SET status = 'CLOSED', closed_at = COALESCE(closed_at, now())
    WHERE id = v_goal.id;
  END IF;

  SELECT * INTO v_goal FROM public.goal WHERE id = v_goal.id;
  RETURN jsonb_build_object(
    'goal_id', v_goal.id,
    'status', v_goal.status,
    'closed_at', v_goal.closed_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.account_withdrawal_eligibility()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_balance integer;
  v_pending_cashouts integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.member WHERE id = v_uid) THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(cb.clover_count, 0)::integer
  INTO v_balance
  FROM (SELECT v_uid AS member_id) AS caller
  LEFT JOIN public.clover_balance AS cb ON cb.member_id = caller.member_id;

  SELECT count(*)::integer INTO v_pending_cashouts
  FROM public.cashout_request AS cr
  WHERE cr.member_id = v_uid
    AND cr.status IN ('REQUESTED', 'KYC_PENDING', 'APPROVED', 'PAYOUT_SENT');

  RETURN jsonb_build_object(
    'eligible', v_balance = 0 AND v_pending_cashouts = 0,
    'clover_balance', v_balance,
    'pending_cashout_count', v_pending_cashouts,
    'support_request_required', true,
    'blocked_reasons', jsonb_strip_nulls(jsonb_build_object(
      'clover_balance', CASE WHEN v_balance > 0 THEN 'nonzero_clover_balance' END,
      'cashout', CASE WHEN v_pending_cashouts > 0 THEN 'cashout_in_progress' END
    ))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.social_cover_preset_for_title(text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_goal_cover_preset(bigint, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_apply_goal_cover_review(uuid, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.my_friend_goals()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_goal_cheer_summary(bigint, text, integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.friend_goal_detail(bigint)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_social_dashboard()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_my_goal(bigint)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.account_withdrawal_eligibility()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_goal_cover_preset(bigint, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_apply_goal_cover_review(uuid, uuid, text, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.my_friend_goals()
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_goal_cheer_summary(bigint, text, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.friend_goal_detail(bigint)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_social_dashboard()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_my_goal(bigint)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_withdrawal_eligibility()
  TO authenticated;

COMMENT ON FUNCTION public.my_friend_goals() IS
  'V2 friend list. recent_message is the latest confirmed, nondeleted, nonanonymous direct message between the caller and each active friend on a PUBLIC or FRIENDS goal.';

COMMENT ON FUNCTION public.close_my_goal(bigint) IS
  'Owner-only idempotent ACTIVE to CLOSED transition. It sets closed_at once and never moves money or deletes records.';
COMMENT ON FUNCTION public.account_withdrawal_eligibility() IS
  'Read-only precheck for the prototype customer-support withdrawal flow. It blocks nonzero clover and nonterminal cashout requests; it never deletes auth or financial records.';

COMMIT;
