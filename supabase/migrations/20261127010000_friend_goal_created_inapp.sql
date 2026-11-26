-- D-063: 친구의 새 목표는 앱 안에서만 알린다.
-- 카카오 알림톡/브랜드메시지 경로와 섞이지 않도록 전용 타입과 메타데이터를 둔다.

ALTER TYPE public.notification_type_enum
  ADD VALUE IF NOT EXISTS 'FRIEND_GOAL_CREATED';

-- 기존 create_goal은 visibility 기본값(PUBLIC)으로 먼저 INSERT한 뒤 상세 화면에서
-- 바꾸는 구조였다. PRIVATE 선택 전에 INSERT 알림이 나가는 경로를 닫기 위해 공개범위를
-- 생성 RPC의 같은 트랜잭션에서 확정한다. 3/4인자 래퍼는 구버전 클라이언트 호환용이다.
DROP FUNCTION IF EXISTS public.create_goal(text, text, date);
DROP FUNCTION IF EXISTS public.create_goal(text, text, date, text);

CREATE FUNCTION public.create_goal(
  p_title text,
  p_reason text,
  p_due_date date,
  p_cover_preset_key text,
  p_visibility text
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
  v_visibility text := upper(COALESCE(NULLIF(btrim(p_visibility), ''), 'PUBLIC'));
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
  IF v_visibility NOT IN ('PUBLIC', 'FRIENDS', 'PRIVATE') THEN
    RAISE EXCEPTION 'invalid_visibility' USING ERRCODE = 'P0005';
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
    member_id,
    title,
    reason,
    due_date,
    cover_preset_key,
    cover_selection_mode,
    visibility
  )
  VALUES (
    v_member_id,
    v_title || ' 해낼게',
    NULLIF(btrim(p_reason), ''),
    p_due_date,
    v_cover_preset_key,
    v_cover_selection_mode,
    v_visibility
  )
  RETURNING public.goal.slug;
END;
$$;

CREATE FUNCTION public.create_goal(
  p_title text,
  p_reason text,
  p_due_date date,
  p_cover_preset_key text
)
RETURNS TABLE(slug text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
  SELECT *
  FROM public.create_goal(
    p_title,
    p_reason,
    p_due_date,
    p_cover_preset_key,
    'PUBLIC'::text
  );
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
  SELECT *
  FROM public.create_goal(
    p_title,
    p_reason,
    p_due_date,
    NULL::text,
    'PUBLIC'::text
  );
$$;

REVOKE ALL ON FUNCTION public.create_goal(text, text, date, text, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_goal(text, text, date, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_goal(text, text, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_goal(text, text, date, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_goal(text, text, date, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_goal(text, text, date)
  TO authenticated;

ALTER TABLE public.notification
  ADD COLUMN IF NOT EXISTS actor_member_id uuid
    REFERENCES public.member(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS goal_id bigint
    REFERENCES public.goal(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS message text;

CREATE UNIQUE INDEX IF NOT EXISTS notification_friend_goal_once_idx
  ON public.notification(member_id, type, goal_id);

-- authenticated는 알림의 읽음 상태만 바꿀 수 있다. 라우팅과 문구 메타데이터는
-- 서버가 만든 기록이므로 수신자가 변조하지 못하게 컬럼 권한으로 좁힌다.
REVOKE UPDATE ON public.notification FROM authenticated;
GRANT UPDATE (read) ON public.notification TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_friends_goal_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_nickname text;
  v_sqlstate text;
BEGIN
  IF NEW.visibility = 'PRIVATE' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(btrim(member.nickname), ''), '친구')
  INTO v_actor_nickname
  FROM public.member AS member
  WHERE member.id = NEW.member_id;

  -- 알림 쓰기 실패가 목표 생성 트랜잭션을 막지 않도록 이 블록만
  -- 서브트랜잭션으로 격리한다.
  BEGIN
    INSERT INTO public.notification (
      member_id,
      type,
      channel,
      actor_member_id,
      goal_id,
      message
    )
    SELECT
      CASE
        WHEN connection.member_low_id = NEW.member_id
          THEN connection.member_high_id
        ELSE connection.member_low_id
      END,
      'FRIEND_GOAL_CREATED',
      'INAPP',
      NEW.member_id,
      NEW.id,
      format(
        '친구 %s님이 새 목표를 만들었어요',
        COALESCE(v_actor_nickname, '친구')
      )
    FROM public.friend_connection AS connection
    WHERE connection.status = 'ACTIVE'
      AND NEW.member_id IN (
        connection.member_low_id,
        connection.member_high_id
      )
    ON CONFLICT (member_id, type, goal_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
    RAISE WARNING
      'friend goal notification skipped for goal %, SQLSTATE %',
      NEW.id,
      v_sqlstate;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_friends_goal_created() IS
  'PUBLIC/FRIENDS 목표 생성 후 ACTIVE 친구마다 FRIEND_GOAL_CREATED INAPP 알림을 목표당 한 번 기록한다. 알림 실패는 목표 생성을 막지 않는다.';

DROP TRIGGER IF EXISTS goal_notify_friends_created ON public.goal;
CREATE TRIGGER goal_notify_friends_created
AFTER INSERT ON public.goal
FOR EACH ROW
EXECUTE FUNCTION public.notify_friends_goal_created();

