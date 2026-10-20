# 기술설계 v1.2.5 이관 과제 레지스트리

**이 파일이 정본이다.** 위임 프롬프트는 이 경로 한 줄만 주고 내용을 받아 적지 않는다(`~/.claude/standards/delegation-prompt.md` §2-3).

출처: Codex `eng-design-reviewer` 8차 판정 RETAKE 15/25. 회장이 2026-10-20 에 설계 왕복을 끊고 build 로 넘기라고 지시해 미해소 지적을 여기로 이관했다. 루브릭 근거 = `~/.claude/standards/standard-doc-review.md` §1.1 조건부 통과.

| # | 우선순위 | 과제 | 구현을 바꾸는가 | 종료 증거 | 상태 |
|---|---|---|---|---|---|
| 1 | P0 | 큐의 Storage 객체 식별을 `path` 단독 비교에서 `bucket_id` + `object_path` 쌍 비교로 구현. 정리 함수·worker·테스트 전부 | 바꾼다 | 쌍 비교 SQL 과 교차 버킷 동일 경로 테스트 1건 통과 | 미확인 |
| 2 | P2 (맨 뒤) | 추적성 매트릭스 R2·R5 의 서버 계약 칸을 **구현이 끝난 뒤** 실제 함수 목록으로 채운다. R5 = `purge_abandoned_goal_covers`·`requeue_orphan_cover_tombstones`, R2 = `friend_invite_preview` 반환 3키 축소 | 안 바꾼다 | `lint-requirement-coverage.mjs` PASS 유지 + 두 행에 함수 이름 실재 | 미확인 |
| 3 | P2 (맨 뒤) | ERD §A.3 의 손으로 적은 자산 수치를 삭제하고 H축 명령 참조로 바꾼다. 같은 줄에 함수 3개·2개와 4개·3개가 함께 적혀 있다 | 안 바꾼다 | ERD 에 손수치 0건, `lint-doc-contradiction.mjs` G축 0건 | 미확인 |
| 4 | **P3 (최후. 남은 시간이 부족하면 건너뛰고 보고)** | `docs/qa/evidence/mermaid-render-v1.2.5/` 의 Mermaid 다이어그램 SVG 를 재생성한다. `@mermaid-js/mermaid-cli` + 로컬 Chrome(jsdom 은 `getBBox` 가 없어 실패) | 안 바꾼다 | L축 0건, `<svg` 루트 수 = 파일 수 | 10/15 갱신 |

**4번이 P3 인 이유.** 2026-10-20 build 1차 위임이 이 항목부터 집어 `CODEX_TIMEOUT` 2700초를 전부 쓰고 rc=124 로 죽었다. 브라우저를 띄워 한 개씩 직렬 렌더하는 작업이라 호스트 부하에 따라 한 개에 1분 넘게 걸린다. 설계 문서의 그림이고 구현을 한 줄도 바꾸지 않는다.
