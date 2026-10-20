-- D-040: anonymous invite preview returns only the three fields used by the client.
BEGIN;

CREATE OR REPLACE FUNCTION public.friend_invite_preview(token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite public.friend_invite%ROWTYPE;
  v_member public.member%ROWTYPE;
  v_goal public.goal%ROWTYPE;
BEGIN
  SELECT * INTO v_invite
  FROM public.friend_invite AS i
  WHERE i.token_hash = public.social_validate_invite_token(token);
  IF NOT FOUND THEN RAISE EXCEPTION 'invite_not_found' USING ERRCODE='P0008'; END IF;
  IF v_invite.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'invite_revoked' USING ERRCODE='P0009'; END IF;
  IF v_invite.expires_at <= clock_timestamp() THEN RAISE EXCEPTION 'invite_expired' USING ERRCODE='P0010'; END IF;
  IF v_invite.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'invite_already_used' USING ERRCODE='P0011'; END IF;

  SELECT * INTO v_member FROM public.member AS m WHERE m.id = v_invite.inviter_member_id;
  IF v_invite.goal_id IS NOT NULL THEN
    SELECT * INTO v_goal
    FROM public.goal AS g
    WHERE g.id = v_invite.goal_id
      AND g.visibility IN ('PUBLIC', 'FRIENDS')
      AND g.deleted_at IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'inviter_nickname', v_member.nickname,
    'goal_title', v_goal.title,
    'cover_preset_key', COALESCE(v_goal.cover_preset_key, 'c1')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.friend_invite_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.friend_invite_preview(text) TO anon, authenticated;

COMMIT;
