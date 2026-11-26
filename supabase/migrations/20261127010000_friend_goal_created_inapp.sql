-- D-063: 친구의 새 목표는 앱 안에서만 알린다.
-- 카카오 알림톡/브랜드메시지 경로와 섞이지 않도록 전용 타입과 메타데이터를 둔다.

ALTER TYPE public.notification_type_enum
  ADD VALUE IF NOT EXISTS 'FRIEND_GOAL_CREATED';

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

