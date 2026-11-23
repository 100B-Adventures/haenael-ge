BEGIN;

-- D-057: 회원 응원 주문과 회원 귀속은 한 트랜잭션에서 함께 생성한다.
-- 기존 create_cheer_order는 비회원 주문도 허용하는 저수준 함수로 유지하고,
-- Edge Function은 이 service_role 전용 진입점만 호출한다.
CREATE OR REPLACE FUNCTION public.create_member_cheer_order(
  p_goal_id bigint,
  p_order_id text,
  p_amount_krw integer,
  p_clover_amount integer,
  p_display_name text,
  p_is_anonymous boolean,
  p_message text,
  p_pg_customer_key text,
  p_supporter_member_id uuid,
  p_request_key text DEFAULT NULL
)
RETURNS TABLE(payment_id bigint, cheer_id bigint, order_id text, is_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order record;
  v_existing_supporter uuid;
BEGIN
  IF p_supporter_member_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.member AS member
    WHERE member.id = p_supporter_member_id
  ) THEN
    RAISE EXCEPTION 'login_required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO STRICT v_order
  FROM public.create_cheer_order(
    p_goal_id,
    p_order_id,
    p_amount_krw,
    p_clover_amount,
    p_display_name,
    p_is_anonymous,
    p_message,
    p_pg_customer_key,
    p_request_key
  );

  IF v_order.is_replay THEN
    SELECT attribution.supporter_member_id INTO v_existing_supporter
    FROM public.social_cheer_member_attribution AS attribution
    WHERE attribution.cheer_id = v_order.cheer_id;

    -- 과거 비회원 결제를 로그인만으로 소급 귀속하지 않는다. 같은 멱등 주문은
    -- 최초 트랜잭션에서 이미 저장된 동일 회원 귀속이 있을 때만 재생한다.
    IF v_existing_supporter IS DISTINCT FROM p_supporter_member_id THEN
      RAISE EXCEPTION 'cheer_attribution_conflict' USING ERRCODE = 'P0005';
    END IF;
  ELSE
    INSERT INTO public.social_cheer_member_attribution(
      cheer_id,
      supporter_member_id
    ) VALUES (
      v_order.cheer_id,
      p_supporter_member_id
    );
  END IF;

  RETURN QUERY SELECT
    v_order.payment_id::bigint,
    v_order.cheer_id::bigint,
    v_order.order_id::text,
    v_order.is_replay::boolean;
END;
$$;

REVOKE ALL ON FUNCTION public.create_member_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text, uuid, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_member_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text, uuid, text
) TO service_role;

COMMENT ON FUNCTION public.create_member_cheer_order(
  bigint, text, integer, integer, text, boolean, text, text, uuid, text
) IS
  'D-057 service-only member cheer order. Payment, cheer, and immutable supporter attribution commit atomically; replay never retro-links a guest cheer.';

-- 보낸 본인만 익명 응원을 공개로 바꿀 수 있다. 반대 방향 RPC는 두지 않는다.
CREATE OR REPLACE FUNCTION public.reveal_my_anonymous_cheer(p_cheer_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := public.social_require_user();
  v_cheer public.cheer%ROWTYPE;
BEGIN
  SELECT cheer.* INTO v_cheer
  FROM public.cheer AS cheer
  JOIN public.social_cheer_member_attribution AS attribution
    ON attribution.cheer_id = cheer.id
  WHERE cheer.id = p_cheer_id
    AND attribution.supporter_member_id = v_uid
    AND cheer.status = 'CONFIRMED'
    AND cheer.deleted_at IS NULL
    AND NOT cheer.is_welcome
  FOR UPDATE OF cheer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cheer_forbidden' USING ERRCODE = 'P0005';
  END IF;

  IF v_cheer.is_anonymous THEN
    UPDATE public.cheer
    SET is_anonymous = false
    WHERE id = v_cheer.id;
  END IF;

  RETURN jsonb_build_object(
    'cheer_id', v_cheer.id,
    'is_anonymous', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reveal_my_anonymous_cheer(bigint)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reveal_my_anonymous_cheer(bigint)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.reveal_my_anonymous_cheer(bigint) IS
  'D-057 owner-attributed one-way transition from anonymous to public. It never exposes supporter identity to a recipient before the sender opts in.';

-- 기존 대시보드 계약을 그대로 상속하고 sent_cheers에 발신자가 볼 수 있는
-- is_anonymous만 추가한다. private helper는 외부 역할에서 직접 호출할 수 없다.
ALTER FUNCTION public.my_social_dashboard()
  RENAME TO _my_social_dashboard_before_d057;
REVOKE ALL ON FUNCTION public._my_social_dashboard_before_d057()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_social_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := public.social_require_user();
  v_base jsonb := public._my_social_dashboard_before_d057();
  v_sent jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'target_name', q.target_name,
      'profile_image', q.profile_image,
      'message', q.message,
      'created_at', q.created_at,
      'is_anonymous', q.is_anonymous
    ) ORDER BY q.created_at DESC, q.id DESC
  ), '[]'::jsonb)
  INTO v_sent
  FROM (
    SELECT
      cheer.id,
      target.nickname AS target_name,
      target.profile_image,
      cheer.message,
      cheer.created_at,
      cheer.is_anonymous
    FROM public.social_cheer_member_attribution AS attribution
    JOIN public.cheer AS cheer ON cheer.id = attribution.cheer_id
    JOIN public.goal AS goal ON goal.id = cheer.goal_id
    JOIN public.member AS target ON target.id = goal.member_id
    WHERE attribution.supporter_member_id = v_uid
      AND cheer.status = 'CONFIRMED'
      AND cheer.deleted_at IS NULL
      AND NOT cheer.is_welcome
      AND goal.deleted_at IS NULL
      AND goal.status <> 'DELETED'
    ORDER BY cheer.created_at DESC, cheer.id DESC
    LIMIT 20
  ) AS q;

  RETURN jsonb_set(v_base, '{sent_cheers}', v_sent, true);
END;
$$;

REVOKE ALL ON FUNCTION public.my_social_dashboard()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_social_dashboard()
  TO authenticated, service_role;

-- 기존 친구 목록과 최근 메시지 익명 경계는 유지하고, 같은 비익명 직접 메시지의
-- 발신 방향만 추가한다. my_friend_page는 이 공개 함수를 호출하므로 자동 상속된다.
ALTER FUNCTION public.my_friend_goals()
  RENAME TO _my_friend_goals_before_d057;
REVOKE ALL ON FUNCTION public._my_friend_goals_before_d057()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_friend_goals()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := public.social_require_user();
  v_base jsonb := public._my_friend_goals_before_d057();
  v_friends jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    friend.value || jsonb_build_object(
      'recent_message_direction', (
        SELECT CASE
          WHEN message_goal.member_id = (friend.value->>'friend_member_id')::uuid
            AND attribution.supporter_member_id = v_uid THEN 'SENT'
          WHEN message_goal.member_id = v_uid
            AND attribution.supporter_member_id = (friend.value->>'friend_member_id')::uuid THEN 'RECEIVED'
          ELSE NULL
        END
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
            (message_goal.member_id = (friend.value->>'friend_member_id')::uuid
              AND attribution.supporter_member_id = v_uid)
            OR (message_goal.member_id = v_uid
              AND attribution.supporter_member_id = (friend.value->>'friend_member_id')::uuid)
          )
        ORDER BY cheer.created_at DESC, cheer.id DESC
        LIMIT 1
      )
    ) ORDER BY friend.ordinality
  ), '[]'::jsonb)
  INTO v_friends
  FROM jsonb_array_elements(COALESCE(v_base->'friends', '[]'::jsonb))
    WITH ORDINALITY AS friend(value, ordinality);

  RETURN jsonb_set(v_base, '{friends}', v_friends, true);
END;
$$;

REVOKE ALL ON FUNCTION public.my_friend_goals()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_friend_goals()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.my_friend_goals() IS
  'D-057 friend list. recent_message remains nonanonymous and direct-only; recent_message_direction says whether the viewer sent or received that visible message.';

COMMIT;
