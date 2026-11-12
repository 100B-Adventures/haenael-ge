# 운영 Supabase 보안 점검 (읽기 전용) · 2026-11-13 04:5x KST

대상: ossvejipdivgxzcqszbw. 방법: Management API advisors, `database/query/read-only` 의 카탈로그 조회. 운영 쓰기 0, 함수 호출 0.

| 대상 | advisors | 의도대로 막혔나 | 근거(관찰) | 조치 |
|---|---|---|---|---|
| goal_public 뷰 | ERROR security_definer_view | 예. 공개 목표의 비금액 필드만 노출, 쓰기 불가 | WHERE visibility='PUBLIC' 와 삭제 제외. 금액 열 없음. information_schema.views is_updatable·is_insertable_into = NO. 단 anon 권한표는 arwdDxtm(전체) | 초안 2) 쓰기 권한 회수(위생) |
| cheer_public 뷰 | ERROR security_definer_view | 예. 공개 목표의 확정 응원만, 익명은 이름 NULL, 금액 열 없음, 쓰기 불가 | 위와 같음 | 초안 2) |
| friend_invite_preview(token) | WARN anon 실행 | 예(의도된 공개). 토큰 해시 대조, 취소·만료·수락 시 예외 | 함수 본문 | 없음 |
| get_wordmap(goal_id) | WARN anon 실행 | 예(의도된 공개). PUBLIC 목표이거나 본인 목표만 | 함수 본문 EXISTS 조건 | 없음. 친구 상세 워드맵(/friends/[id]/wordmap)은 이 함수가 아니라 friend_goal_detail 을 쓰고, 그 함수가 FRIENDS 목표를 활성 친구에게 준다. 기능 결함 아님 |
| grant_welcome_clover() | WARN anon 실행 | 예. trigger 반환 함수라 직접 호출 불가 | ret=trigger, 트리거 1개 연결 | 초안 1) EXECUTE 회수(위생) |
| reverse_welcome_clover_on_goal_delete() | WARN anon 실행 | 예. 위와 같음 | ret=trigger | 초안 1) |
| sync_clover_balance() | WARN anon 실행 | 예. 위와 같음 | ret=trigger | 초안 1) |
| public 테이블 26개 | - | RLS 전부 켜짐 | pg_tables rowsecurity | - |

전체 판정: 지금 비로그인 사용자가 데이터를 읽거나 쓸 수 있는 열린 경로는 찾지 못했다. ERROR 2건은 Supabase 가 SECURITY DEFINER 뷰를 일괄 경고하는 것이고, 노출 범위는 설계 의도(공개 목표 페이지)와 같다.
## 로그인 사용자 실행 가능 SECURITY DEFINER 함수 34개 (05:2x 추가, 읽기 전용)

판정 기준: 호출자를 auth.uid() 로 확인하고(직접 또는 helper), id 를 받는 함수는 그 행이 호출자 소유이거나 허용 공개 범위인지 거르는가.
helper: `social_require_user()` = auth.uid() 가 NULL 이면 예외 후 반환. `is_admin()` = admin_member 에 auth.uid() 가 있는가.

| 함수 | 호출자 확인 | 행 범위 확인 | 판정 |
|---|---|---|---|
| admin_list_cashouts, admin_list_cashouts_v2, admin_list_goal_covers, admin_list_ledger, admin_list_members | `IF NOT is_admin() THEN RAISE` | 관리자 전용 | 막힘 |
| admin_mark_cashout_paid, admin_reject_cashout | auth.uid() + is_admin() 아니면 예외 | 관리자 전용 | 막힘 |
| is_admin | auth.uid() | 본인 여부만 반환 | 막힘 |
| account_withdrawal_eligibility, my_cashout_status, my_cashout_history | auth.uid() | 본인 행 | 막힘 |
| clover_eligibility(p_member_id) | auth.uid() 와 p_member_id 불일치면 forbidden(service_role 예외) | 본인 | 막힘 |
| create_goal(4인자) | auth.uid() NULL 이면 42501 | 본인 소유로 생성, 진행 중 3개 제한 | 막힘 |
| create_goal(3인자) | 4인자 버전에 위임 | 위와 같음 | 막힘 |
| close_my_goal, update_goal | auth.uid() | g.member_id = 호출자 | 막힘 |
| set_goal_visibility, set_goal_cover_preset, my_goal_cheer_summary | social_require_user() | g.member_id = 호출자 | 막힘 |
| friend_goal_detail | social_require_user() | 본인 목표, PUBLIC, 또는 FRIENDS 이면서 활성 친구 | 막힘 |
| my_friend_goals, my_social_dashboard, my_unlinked_cheer_history, my_friend_page(앞 둘에 위임) | social_require_user() | 호출자 기준 집계 | 막힘 |
| create_friend_invite, accept_friend_invite, remove_friend | social_require_user() | 본인 목표·자기 초대 금지·본인 친구 관계 | 막힘 |
| update_my_profile, update_member_preferences | social_require_user() | id = 호출자 | 막힘 |
| friend_invite_preview, get_wordmap, 트리거 3개 | 위 표 | 위 표 | 위 표 |

34개 전부 호출자 확인이 있거나 위 공개·트리거 판정 대상이다. 소유 확인이 빠진 함수는 찾지 못했다.
