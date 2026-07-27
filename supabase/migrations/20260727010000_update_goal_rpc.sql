-- =============================================================================
-- update_goal — 본인 ACTIVE 목표 수정 RPC
-- 기반:
--   - web/src/components/receiver/OnboardingGoalForm.tsx
--     (title = trim(input) || ' 해낼게', 빈 reason = NULL)
--   - web/src/components/goal/GoalEditSheet.tsx
--     (suffix 제거 후 순수 목표를 p_title로 전달)
-- 보안:
--   SECURITY DEFINER이므로 auth.uid() 본인확인 + 고정 search_path를 함수 안에서 강제한다.
-- =============================================================================

BEGIN;

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
  v_title text := btrim(p_title);
  v_updated_count integer;
BEGIN
  -- SECURITY DEFINER가 RLS를 우회하므로 대상 행을 잠근 상태에서 소유권을 먼저 확인한다.
  -- 존재하지 않는 목표도 비소유 목표와 같은 오류로 처리해 행 존재 여부를 노출하지 않는다.
  SELECT g.status
    INTO v_status
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

  -- date 타입이 잘못된 날짜 표현을 호출 진입 전에 거부하고, 여기서는 NULL을 명시 거부한다.
  IF p_due_date IS NULL THEN
    RAISE EXCEPTION '마감일은 필수입니다' USING ERRCODE = '22004';
  END IF;

  UPDATE public.goal AS g
  SET title = v_title || ' 해낼게',
      reason = NULLIF(btrim(p_reason), ''),
      due_date = p_due_date
  WHERE g.id = p_goal_id
    AND g.member_id = auth.uid()
    AND g.status = 'ACTIVE';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count <> 1 THEN
    RAISE EXCEPTION '목표 수정에 실패했습니다' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_goal(bigint, text, text, date) IS
  '본인 소유 ACTIVE 목표의 제목·이유·마감일 수정. 제목은 생성 경로와 동일하게 " 해낼게" suffix를 붙여 저장한다.';

REVOKE ALL ON FUNCTION public.update_goal(bigint, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_goal(bigint, text, text, date) TO authenticated;

COMMIT;
