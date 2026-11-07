BEGIN;

-- 친구 화면은 친구 목록과 회원 미귀속 과거 응원 기록을 항상 함께 읽는다.
-- 브라우저 서버가 두 RPC를 호출하지 않도록 DB 내부에서 하나의 read model로 합친다.
CREATE OR REPLACE FUNCTION public.my_friend_page()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.my_friend_goals() || jsonb_build_object(
    'history', public.my_unlinked_cheer_history()->'items'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.my_friend_page()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_friend_page()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.my_friend_page() IS
  'Single-RPC read model for the friends page. It combines active account friends with owner-only unlinked historical cheer records.';

COMMIT;
