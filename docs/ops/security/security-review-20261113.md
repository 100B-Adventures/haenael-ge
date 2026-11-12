# 운영 Supabase 보안 점검 (읽기 전용) · 2026-11-13 04:5x KST

대상: ossvejipdivgxzcqszbw. 방법: Management API advisors, `database/query/read-only` 의 카탈로그 조회. 운영 쓰기 0, 함수 호출 0.

| 대상 | advisors | 의도대로 막혔나 | 근거(관찰) | 조치 |
|---|---|---|---|---|
| goal_public 뷰 | ERROR security_definer_view | 예. 공개 목표의 비금액 필드만 노출, 쓰기 불가 | WHERE visibility='PUBLIC' 와 삭제 제외. 금액 열 없음. information_schema.views is_updatable·is_insertable_into = NO. 단 anon 권한표는 arwdDxtm(전체) | 초안 2) 쓰기 권한 회수(위생) |
| cheer_public 뷰 | ERROR security_definer_view | 예. 공개 목표의 확정 응원만, 익명은 이름 NULL, 금액 열 없음, 쓰기 불가 | 위와 같음 | 초안 2) |
| friend_invite_preview(token) | WARN anon 실행 | 예(의도된 공개). 토큰 해시 대조, 취소·만료·수락 시 예외 | 함수 본문 | 없음 |
| get_wordmap(goal_id) | WARN anon 실행 | 예(의도된 공개). PUBLIC 목표이거나 본인 목표만 | 함수 본문 EXISTS 조건 | 없음. 참고: 친구 공개 목표는 친구에게도 워드맵이 안 나옴(기능 확인 과제) |
| grant_welcome_clover() | WARN anon 실행 | 예. trigger 반환 함수라 직접 호출 불가 | ret=trigger, 트리거 1개 연결 | 초안 1) EXECUTE 회수(위생) |
| reverse_welcome_clover_on_goal_delete() | WARN anon 실행 | 예. 위와 같음 | ret=trigger | 초안 1) |
| sync_clover_balance() | WARN anon 실행 | 예. 위와 같음 | ret=trigger | 초안 1) |
| public 테이블 26개 | - | RLS 전부 켜짐 | pg_tables rowsecurity | - |

전체 판정: 지금 비로그인 사용자가 데이터를 읽거나 쓸 수 있는 열린 경로는 찾지 못했다. ERROR 2건은 Supabase 가 SECURITY DEFINER 뷰를 일괄 경고하는 것이고, 노출 범위는 설계 의도(공개 목표 페이지)와 같다.
남은 확인: 로그인 사용자 실행 가능 SECURITY DEFINER 함수 34개는 이번 범위 밖이다. 함수마다 auth.uid() 소유 확인이 있는지 별도로 본다.
