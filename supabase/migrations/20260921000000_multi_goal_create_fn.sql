-- =============================================================================
-- multi_goal_create_fn — 1계정 N개 진행 중 목표 허용 + create_goal RPC
-- =============================================================================
-- 배경:
--   PRD v0.4.0 :196이 1계정 1활성목표 유니크 인덱스를 지우고 계정당 여러 진행 중
--   목표를 허용하라고 한다. 인덱스만 지우면 앱 레벨 방어가 사라지고(레이스에서
--   무제한으로 뚫린다), 화면만 먼저 바꾸면 두 번째 저장이 23505로 실패한다.
--   그래서 인덱스 제거와 삽입 전용 함수를 한 마이그레이션에 묶는다.
--   (eng-design-goal-visibility-supporter-v1.0.0-claude-opus.md §4, 컨트롤러 채택
--   2026-09-06: D1=옵션 나=상한 3 + create_goal 함수, §4.3=선택지 가=진행 중만 센다)
--
-- 상한을 원자 보장하는 방법(§4.2 선택지 나, 추천):
--   트리거 안에서 COUNT(*)로 세면 read committed 격리수준에서 아직 커밋되지 않은
--   동시 트랜잭션의 삽입을 못 세서 동시 저장 시 상한이 뚫린다(§10-B1). 그래서
--   계정 단위 트랜잭션 범위 권고 잠금(pg_advisory_xact_lock)을 먼저 잡아 같은
--   계정의 동시 저장을 직렬화한 뒤에 개수를 센다. 참조 구현은 같은 레포의
--   update_goal(20260727010000, SECURITY DEFINER + 소유권 FOR UPDATE + search_path
--   고정)과 cashout 잠금(20260822000000, pg_advisory_xact_lock(hashtext(...))).
--
-- 상한을 세는 단위(§4.3 선택지 가, 추천):
--   진행 중 목표만 센다 = status != 'DELETED' AND deleted_at IS NULL
--   AND due_date >= 오늘. 마감 지난 목표는 상한에서 빼서 "새 목표를 만들려면
--   옛것을 지워야 한다"는 결정 A 시절 병리를 되풀이하지 않는다. 이 정의가 오늘
--   날짜에 의존하므로 pgTAP에서는 due_date를 상대값이 아니라 명시값으로 고정해야
--   시간이 지나도 테스트가 깨지지 않는다(§4.3 후기).
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1) 1계정 1활성목표 유니크 인덱스 제거 — 되돌리기 비대칭: 재생성 시점에 이미
--    중복이 있으면 실패한다(§4.6). 되돌리려면 dedup 후 재생성해야 한다.
-- ─────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS goal_one_active_per_member;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) create_goal — 삽입 전용 RPC. 앱의 직접 INSERT를 대체한다.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_goal(
  p_title text,
  p_reason text,
  p_due_date date
)
RETURNS TABLE(slug text)
LANGUAGE plpgsql
SECURITY DEFINER
-- extensions: goal_slug_gen 트리거가 slug 생성에 쓰는 gen_random_bytes(pgcrypto)가
-- 이 스키마에 있다. update_goal은 slug를 새로 만들지 않아 이 문제가 없었지만
-- create_goal은 INSERT로 트리거를 태우므로 search_path에 반드시 포함해야 한다.
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_title text := btrim(p_title);
  v_member_id uuid := auth.uid();
  v_in_progress_count integer;
  v_goal_limit constant integer := 3;
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

  -- 계정 단위 트랜잭션 범위 권고 잠금. 같은 계정의 동시 저장을 직렬화해
  -- read committed의 COUNT(*) 레이스(§10-B1)를 막는다. 아직 존재하지 않는
  -- 대상(만들려는 N번째 목표)을 잠글 수 있는 유일한 수단이 advisory lock이다.
  PERFORM pg_catalog.pg_advisory_xact_lock(hashtext(v_member_id::text));

  SELECT count(*)
    INTO v_in_progress_count
  FROM public.goal AS g
  WHERE g.member_id = v_member_id
    AND g.status != 'DELETED'
    AND g.deleted_at IS NULL
    AND g.due_date >= current_date;

  IF v_in_progress_count >= v_goal_limit THEN
    RAISE EXCEPTION 'goal_limit_reached' USING ERRCODE = '55000';
  END IF;

  RETURN QUERY
  INSERT INTO public.goal (member_id, title, reason, due_date)
  VALUES (
    v_member_id,
    v_title || ' 해낼게',
    NULLIF(btrim(p_reason), ''),
    p_due_date
  )
  RETURNING public.goal.slug;
END;
$$;

COMMENT ON FUNCTION public.create_goal(text, text, date) IS
  '본인 명의 목표 생성 RPC. 계정당 진행 중(미삭제·마감 전) 목표 상한 3개를
   advisory lock으로 직렬화해 원자 보장한다. 상한 초과 시 goal_limit_reached(55000).
   테이블 직접 INSERT 권한은 회수했다(REVOKE 아래).';

REVOKE ALL ON FUNCTION public.create_goal(text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_goal(text, text, date) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3) goal 테이블 직접 INSERT 권한 회수 — 상한 검사를 우회할 수 있는 유일한
--    경로였다. SELECT/UPDATE는 update_goal RPC와 화면 조회가 계속 쓰므로 유지.
-- ─────────────────────────────────────────────────────────────────────────

REVOKE INSERT ON public.goal FROM authenticated;

COMMIT;
