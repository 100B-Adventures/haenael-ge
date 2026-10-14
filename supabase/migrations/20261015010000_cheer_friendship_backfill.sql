-- D-024: a confirmed, attributed cheer connects the supporter and goal owner.
-- Existing REMOVED/BLOCKED pairs are preserved. A cheer must not silently undo
-- an explicit relationship decision.

BEGIN;

CREATE OR REPLACE FUNCTION public.social_connect_cheer_members(p_cheer_id bigint)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_supporter_id uuid;
  v_owner_id uuid;
  v_member_low_id uuid;
  v_member_high_id uuid;
BEGIN
  -- Serialize attribution INSERT and status UPDATE on the same cheer. Without
  -- this row lock, two concurrent transactions can each miss the other's
  -- uncommitted row and both project nothing.
  PERFORM 1
  FROM public.cheer AS cheer
  WHERE cheer.id = p_cheer_id
  FOR UPDATE;

  SELECT attribution.supporter_member_id, goal.member_id
    INTO v_supporter_id, v_owner_id
  FROM public.cheer AS cheer
  JOIN public.social_cheer_member_attribution AS attribution
    ON attribution.cheer_id = cheer.id
  JOIN public.goal AS goal
    ON goal.id = cheer.goal_id
  WHERE cheer.id = p_cheer_id
    AND NOT cheer.is_welcome
    AND (
      cheer.status = 'CONFIRMED'
      OR EXISTS (
        SELECT 1
        FROM public.payment_log AS payment_log
        WHERE payment_log.payment_id = cheer.payment_id
          AND payment_log.to_status = 'DONE'
      )
    );

  IF v_supporter_id IS NULL OR v_owner_id IS NULL OR v_supporter_id = v_owner_id THEN
    RETURN;
  END IF;

  IF v_supporter_id::text < v_owner_id::text THEN
    v_member_low_id := v_supporter_id;
    v_member_high_id := v_owner_id;
  ELSE
    v_member_low_id := v_owner_id;
    v_member_high_id := v_supporter_id;
  END IF;

  INSERT INTO public.friend_connection(
    member_low_id,
    member_high_id,
    status,
    connected_at,
    updated_at
  )
  VALUES (
    v_member_low_id,
    v_member_high_id,
    'ACTIVE',
    now(),
    now()
  )
  ON CONFLICT (member_low_id, member_high_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.social_connect_cheer_members(bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_connect_cheer_members(bigint)
  TO service_role;

COMMENT ON FUNCTION public.social_connect_cheer_members(bigint) IS
  'Internal D-024 projector. Creates a canonical ACTIVE friendship for one confirmed attributed cheer without reactivating REMOVED/BLOCKED pairs.';

CREATE OR REPLACE FUNCTION public.social_connect_confirmed_cheer_trigger()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'CONFIRMED' AND OLD.status IS DISTINCT FROM 'CONFIRMED' THEN
    PERFORM public.social_connect_cheer_members(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.social_connect_confirmed_cheer_trigger()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS cheer_confirmed_friendship_trigger ON public.cheer;
CREATE TRIGGER cheer_confirmed_friendship_trigger
AFTER UPDATE OF status ON public.cheer
FOR EACH ROW
EXECUTE FUNCTION public.social_connect_confirmed_cheer_trigger();

CREATE OR REPLACE FUNCTION public.social_connect_attributed_cheer_trigger()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.social_connect_cheer_members(NEW.cheer_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.social_connect_attributed_cheer_trigger()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS cheer_attribution_friendship_trigger
  ON public.social_cheer_member_attribution;
CREATE TRIGGER cheer_attribution_friendship_trigger
AFTER INSERT
ON public.social_cheer_member_attribution
FOR EACH ROW
EXECUTE FUNCTION public.social_connect_attributed_cheer_trigger();

CREATE OR REPLACE FUNCTION public.social_reject_attribution_update_trigger()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'social_attribution_immutable' USING ERRCODE = '55000';
END;
$$;

REVOKE ALL ON FUNCTION public.social_reject_attribution_update_trigger()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS cheer_attribution_immutable_trigger
  ON public.social_cheer_member_attribution;
CREATE TRIGGER cheer_attribution_immutable_trigger
BEFORE UPDATE ON public.social_cheer_member_attribution
FOR EACH ROW
EXECUTE FUNCTION public.social_reject_attribution_update_trigger();

CREATE OR REPLACE FUNCTION public.social_backfill_confirmed_cheer_friendships()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  WITH eligible AS (
    SELECT DISTINCT
      attribution.supporter_member_id,
      goal.member_id AS owner_member_id
    FROM public.cheer AS cheer
    JOIN public.social_cheer_member_attribution AS attribution
      ON attribution.cheer_id = cheer.id
    JOIN public.goal AS goal
      ON goal.id = cheer.goal_id
    WHERE NOT cheer.is_welcome
      AND attribution.supporter_member_id <> goal.member_id
      AND (
        cheer.status = 'CONFIRMED'
        OR EXISTS (
          SELECT 1
          FROM public.payment_log AS payment_log
          WHERE payment_log.payment_id = cheer.payment_id
            AND payment_log.to_status = 'DONE'
        )
      )
  ), canonical_pairs AS (
    SELECT
      CASE
        WHEN supporter_member_id::text < owner_member_id::text
          THEN supporter_member_id
        ELSE owner_member_id
      END AS member_low_id,
      CASE
        WHEN supporter_member_id::text < owner_member_id::text
          THEN owner_member_id
        ELSE supporter_member_id
      END AS member_high_id
    FROM eligible
  )
  INSERT INTO public.friend_connection(
    member_low_id,
    member_high_id,
    status,
    connected_at,
    updated_at
  )
  SELECT DISTINCT member_low_id, member_high_id, 'ACTIVE', now(), now()
  FROM canonical_pairs
  ON CONFLICT (member_low_id, member_high_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.social_backfill_confirmed_cheer_friendships()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_backfill_confirmed_cheer_friendships()
  TO service_role;

COMMENT ON FUNCTION public.social_backfill_confirmed_cheer_friendships() IS
  'Internal D-024 replay for every historical confirmed cheer with authenticated-member attribution.';

-- Retroactive D-024 projection. Older anonymous/CI-only cheers cannot be linked
-- to a member without inventing identity.
SELECT public.social_backfill_confirmed_cheer_friendships();

COMMIT;
