-- 초안(미적용). 운영 Supabase 보안 점검 2026-11-13 04:5x KST 후속. 스키마 권한 변경이므로 적용 전 회장 합의(헌법 §4.4).
-- 근거: Management API advisors + 읽기 전용 조회. 판정문: docs/ops/security/security-review-20261113.md
-- 성격: 위생(defense in depth). 지금 열린 구멍을 막는 것이 아니다. 아래 대상은 모두 현재도 실제 악용 경로가 없음을 확인했다.

begin;

-- 1) 트리거 전용 함수 3개: 직접 호출 불가(Postgres 가 trigger 반환 함수의 직접 호출을 거부). 그래도 EXECUTE 권한을 거둔다.
revoke execute on function public.grant_welcome_clover() from public, anon, authenticated;
revoke execute on function public.reverse_welcome_clover_on_goal_delete() from public, anon, authenticated;
revoke execute on function public.sync_clover_balance() from public, anon, authenticated;

-- 2) 공개 뷰 2개: SELECT 만 남긴다. 두 뷰 모두 is_updatable=NO 라 쓰기는 지금도 실패하지만 권한 표를 의도와 맞춘다.
revoke insert, update, delete, truncate, references, trigger on public.goal_public  from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.cheer_public from anon, authenticated;

-- 3) search_path 미고정 함수 3개(advisors WARN). 본문이 스키마 접두어 없는 이름을 쓰는지 확인 후 적용.
alter function public.welcome_clover_amount() set search_path = public, pg_temp;
alter function public.min_cashout_clover() set search_path = public, pg_temp;
-- generate_goal_slug 는 인자 목록 확인 후: alter function public.generate_goal_slug(<args>) set search_path = public, pg_temp;

commit;

-- 의도적으로 하지 않는 것:
-- - goal_public·cheer_public 을 security_invoker 로 바꾸기: goal·cheer 테이블에 anon SELECT 정책이 없어 /g/[slug] 공개 페이지와 /api/health 가 깨진다.
--   바꾸려면 anon 용 열 단위 정책 설계가 먼저다(별도 설계 과제).
-- - friend_invite_preview·get_wordmap 의 anon 실행 회수: 비회원 초대 미리보기·공개 목표 워드맵이 의도된 공개 기능이다.
