# v1 대 v2 결정 보드 캡처 매니페스트

| 구분 | 화면 | 파일 | 크기 | 런타임 판정 |
|---|---|---|---|---|
| v1 공통 | 랜딩 | `v1-landing-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v1 공통 | 공개 목표 | `v1-goal-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v1 공통 | 마이페이지 | `v1-me-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v1 공통 | 환전 | `v1-cashout-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v1 공통 | 응원 워드맵 | `v1-wordmap-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v2 공통 | 랜딩 | `v2-landing-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v2 공통 | 공개 목표 | `v2-goal-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v2 공통 | 마이페이지 | `v2-me-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v2 공통 | 환전 | `v2-cashout-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v2 공통 | 응원 워드맵 | `v2-wordmap-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v2 신규 | 초대 생성 | `v2-invite-create-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v2 신규 | 초대 수락 | `v2-invite-accept-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v2 신규 | 친구 목록 | `v2-friends-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v2 신규 | 친구 상세 | `v2-friend-detail-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |
| v2 신규 | 업적 | `v2-achievements-390.png` | 390×844 | HTTP 200, console 0, page error 0, overflow X 0 |

fixture는 v1과 v2 캡처 사이에 재생성하지 않았다. owner, goal, cheer 39건, friend 1건, invite 1건을 같은 로컬 Supabase에서 조회했고 캡처 뒤 모두 삭제했다. 운영 DB 쓰기는 0건이다.

🏷 STAMP | line: v2 | 생성: 2026-10-15 18:59 KST | model: gpt-codex/gpt-6.1-sol | agent: code-builder | skill: haenael-supabase-build | 근거: `v1-capture-results.json`, `v2-capture-results.json`, 실제 PNG 15장 | 고민: v1 production CSP의 loopback 차단은 양쪽 브라우저에 동일한 CSP bypass를 적용해 소스 수정 없이 같은 fixture 렌더 조건을 만들었다.

SKILLS_USED: haenael-supabase-build, local Supabase fixture와 production Next runtime의 캡처 순서에 적용.

SKILLS_SKIPPED: review, PR·배포 범위가 아니어서 생략.

SOURCES/MODEL: gpt-codex/gpt-6.1-sol | tag `v1.2.1`, current main, `web/e2e/capture-v1-v2-decision.mjs`
