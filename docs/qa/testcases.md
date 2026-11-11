# v2 누적 회귀 시험 정본

> STAMP: 2026-11-12 03:20 KST · GPT-5 Codex · code-builder · haenael-supabase-build · 기반 포맷 `docs/qa/qa-tracker.md` v2.1.29 · 원본 `.goal/runs/w12-regression-edb4c99/summary.json`

## 범위와 원본

이 문서는 최종 제품 source `edb4c99a165c8ac59252073375e67dfa1c839a77`을 staging에서 실행한 누적 회귀 45건의 ID, 제목, 검증 목적을 고정한다. 실행 결과의 source는 `health.json`과 `summary.json.source`가 모두 `edb4c99…`로 일치한다.

실행 결과는 `.goal/runs/w12-regression-edb4c99/`의 `health.json`, `summary.json`, `playwright.exit`, `run.exit`을 함께 본다. 해당 실행은 `45 expected / 0 unexpected / 0 flaky / 0 skipped`, EXIT 0이며 결제 기능 비활성 복구 HTTP 503과 fixture 잔존 0도 확인했다.

## 시험 목록

| # | 시험 ID | 제목 | 목적 |
|---:|---|---|---|
| 1 | `OPS-ALERT-01` | 관리자 화면이 ops_event 경보를 실제 수신한다 | 운영 경보가 관리자 UI까지 전달되는 경로를 검증한다. |
| 2 | `PW-02` | 목표 관리는 프로토타입 순서와 필드별 편집, 응원자 집계, 환전·관리 액션을 보존한다 | 목표 관리의 승인 구조와 핵심 관리 동작을 보존한다. |
| 3 | `AUTH-GOAL-01` | 비로그인 목표 관리는 권한없음 상태이고 로그아웃을 노출하지 않는다 | 비인증 사용자의 권한 경계와 화면 상태를 검증한다. |
| 4 | `MY-01` | 마이페이지는 프로필, 목표, 친구 수, 업적, 소속감 큐와 활성 탭을 렌더한다 | 마이페이지 핵심 집계와 탭 상태를 검증한다. |
| 5 | `PW-03` | 기존 c1 목표에서 건강 사진을 명시 선택하면 reload와 public 화면에 우선 적용된다 | 커버 선택 결과가 새로고침과 공개 화면에 유지되는지 검증한다. |
| 6 | `PW-04` | custom upload finalize는 REVIEW 안내를 내고 기존 커버를 유지한다 | 사용자 업로드 검수 상태와 기존 커버 보존을 검증한다. |
| 7 | `SMOKE-01` | 신규 라우트 전체는 390px에서 console error와 가로 overflow가 없다 | 핵심 라우트의 모바일 렌더와 콘솔 안정성을 검증한다. |
| 8 | `QA-REVERIFY-SEC-01` | 친구 응답은 private path를 숨기고 signed URL만 노출하며 admin 검수는 경로를 받는다 | 비공개 Storage 경로 노출 방지와 관리자 검수 계약을 검증한다. |
| 9 | `QA-REVERIFY-FLOW-01A` | 초대 생성부터 친구 공개 목표 조회까지 실제 UI와 DB가 이어진다 | 초대부터 친구 공개 목표까지의 종단 간 연결을 검증한다. |
| 10 | `QA-REVERIFY-FLOW-01B` | friendId와 목표 소유자·공개 범위가 다르면 실제 HTTP 404다 | 친구·소유자·공개 범위 불일치 요청의 거부를 검증한다. |
| 11 | `QA-REVERIFY-FLOW-01C` | 비인증 친구 워드맵 요청은 HTTP 307 뒤 landing DOM으로 거부된다 | 비인증 워드맵 접근의 redirect와 landing 격리를 검증한다. |
| 12 | `QA-REVERIFY-VIEWPORT-01` | 운영 모드 신규 화면은 390px·768px·1440px에서 시안 위치와 overflow를 검증한다 | 대표 폭에서 승인 배치와 가로 넘침을 검증한다. |
| 13 | `QA-REVERIFY-INVITE-NAV-01` | 초대 수락 화면은 승인된 하단 탭 component를 유지한다 | 초대 수락 화면의 공통 하단 탭 계승을 검증한다. |
| 14 | `QA-REVERIFY-ADMIN-ORPHAN-01` | 관리자 안내문은 768px과 1440px에서 28px 미만 고아 줄바꿈이 없다 | 관리자 안내문 데스크톱 가독성을 검증한다. |
| 15 | `QA-TC-LG-01` | 노출 표에 없는 화면은 법적 고지 DOM이 0개다 | 법적 고지의 허용 화면 범위를 검증한다. |
| 16 | `QA-TC-LG-02` | 마이페이지를 제외한 하단탭 화면에 법적 고지 블록과 링크 나열이 0개다 | 하단 탭 화면의 법적 고지 중복 노출을 방지한다. |
| 17 | `QA-TC-LG-03` | 마이페이지 한 단계 아래가 사업자 정보 전문을 소유한다 | 사업자 정보 전문의 단일 소유 경로를 검증한다. |
| 18 | `QA-TC-GT-02` | 회원 전용 탭 미리보기는 서버 호출 0건이고 클라이언트 상수를 쓴다 | 비로그인 미리보기의 데이터 비노출 계약을 검증한다. |
| 19 | `QA-TC-GT-03` | 비회원 예시 시트는 자물쇠와 흐림 없이 두 행동을 제공한다 | 비회원 예시 시트의 승인 UX와 행동 수를 검증한다. |
| 20 | `QA-TC-GT-01` | 비회원 초대와 공개 목표 응답은 최소 필드만 노출한다 | 공개 응답의 최소 필드 노출 계약을 검증한다. |
| 21 | `QA-TC-SP-03` | 공개 목표의 고정 CTA 자리 예약은 토큰과 일치하고 본문을 가리지 않는다 | 고정 CTA의 안전 영역과 본문 비가림을 검증한다. |
| 22 | `QA-TC-AC-01` | 업적 화면에는 등급 공개 토글이 없다 | 삭제 결정된 등급 공개 토글의 재등장을 방지한다. |
| 23 | `QA-TC-CP-02-03` | 응원 목록은 8개에서 펼치고 9개부터 꺾쇠 하나로 왕복한다 | 응원 목록 접힘 경계와 단일 토글을 검증한다. |
| 24 | `QA-TC-CL-01` | 목표 관리의 긴 응원은 2줄에서 펼치고 다시 접힌다 | 목표 관리 긴 글 왕복 상태를 검증한다. |
| 25 | `QA-TC-CL-02` | 해낼게 관리의 긴 응원은 2줄에서 펼치고 다시 접힌다 | 해낼게 관리 긴 글 왕복 상태를 검증한다. |
| 26 | `QA-TC-CL-03` | 친구 목록의 긴 응원은 2줄에서 펼치고 다시 접힌다 | 친구 목록 긴 글 왕복 상태를 검증한다. |
| 27 | `QA-TC-CL-04` | 친구 상세의 긴 응원은 2줄에서 펼치고 다시 접힌다 | 친구 상세 긴 글 왕복 상태를 검증한다. |
| 28 | `QA-TC-CS-03-04` | 23명 요약은 아바타 3개와 +20이고 익명은 비활성 자리표시다 | 응원자 요약 수치와 익명 자리표시를 검증한다. |
| 29 | `QA-TC-CS-03` | 응원 0명 목표는 요약 바 대신 빈 상태를 보인다 | 응원자 0명 경계 상태를 검증한다. |
| 30 | `QA-TC-CP-05` | 정책과 ADR에 선언되지 않은 실제 접힘이 없다 | 미승인 접힘 UI의 추가를 방지한다. |
| 31 | `QA-TC-CP-03` | 렌더된 접기 토글 전수는 텍스트 없는 꺾쇠 하나다 | 접기 토글 표현의 단일 계약을 검증한다. |
| 32 | `QA-TC-SP-02` | 카드 전수의 상하 안쪽 여백과 가장자리 margin이 대칭이다 | 카드 수직 여백의 대칭성을 검증한다. |
| 33 | `QA-TC-SP-04` | 제품 화면 전수 표본의 가로 넘침과 28px 미만 고아 줄바꿈이 0건이다 | 표본 화면의 overflow와 고아 줄바꿈을 검증한다. |
| 34 | `QA-TC-CV-01` | 커버 업로드 버튼은 프리셋 스크롤 위치와 무관하게 파일 선택을 연다 | 커버 업로드 진입 동작을 검증한다. |
| 35 | `QA-TC-CV-02` | 커버 선택 체크 글리프는 선택을 바꿔도 정확히 하나다 | 커버 단일 선택 상태를 검증한다. |
| 36 | `QA-TC-CV-06` | 타인 회원은 소유자 UPLOADING 자산을 확정할 수 없다 | 업로드 자산 소유권 경계를 검증한다. |
| 37 | `QA-TC-AU-05` | 쿠키 없는 Server Action 직접 POST는 인증 실패하고 상태를 바꾸지 않는다 | Server Action의 인증 실패와 무변경 계약을 검증한다. |
| 38 | `PW-05` | admin 승인 후 owner와 public 화면에 승인 커버만 보인다 | 관리자 승인 커버의 소유자·공개 화면 반영을 검증한다. |
| 39 | `PW-06` | PUBLIC에서 FRIENDS, PRIVATE RPC 변경 시 공개 경계가 즉시 닫힌다 | 공개 범위 변경의 즉시 접근 차단을 검증한다. |
| 40 | `PW-07` | anon 공개 route는 PUBLIC만 노출한다 | 익명 공개 라우트의 PUBLIC 전용 경계를 검증한다. |
| 41 | `CC-01` | 동일 token의 동시 accept는 성공 1, used 1, connection 1이다 | 초대 동시 수락의 멱등성과 단일 연결을 검증한다. |
| 42 | `QA-TC-FD-03` | 소급 친구의 방향이 보이고 해제 뒤 양쪽 FRIENDS 조회가 닫힌다 | 친구 방향 표시와 해제 후 양방향 접근 차단을 검증한다. |
| 43 | `ORDER-ATTR-01` | replay는 최초 회원 응원 귀속을 다른 사용자로 바꾸지 않는다 | 결제 replay의 최초 귀속 불변성을 검증한다. |
| 44 | `G4-FRIEND-HISTORY-01` | 친구 상세은 회원 이력만, 손님 응원은 마이·홈에만 표시한다 | 회원·손님 응원의 화면별 노출 경계를 검증한다. |
| 45 | `G4-PERF-01` | 주요 화면 TTFB와 Supabase RPC 시간을 cold 후보·warm 반복으로 기록한다 | 주요 경로의 서버 응답 성능 기준을 기록한다. |

## 벤치마크 적용

Playwright의 [시각 비교 공식 문서](https://playwright.dev/docs/test-snapshots)가 같은 운영체제·브라우저·설정에서 기준과 결과를 비교하도록 권고하는 구조를 차용했다. 이번 실행은 동일 Chromium staging 조건의 단일 회귀 결과를 정본으로 삼는다. Playwright 스냅샷 파일명 규약은 현재 회귀 실행기가 JSON과 PNG 경로를 이미 고정하므로 추가하지 않았다.

KNOWLEDGE_QUERY: haenael-ge v2 QA 회귀 정본, D-051, 45개 시험 원본을 조회했다.
HITS_USED: `docs/qa/qa-tracker.md`, `wiki/거버넌스/결정.md`, `.goal/runs/w12-regression-edb4c99/{summary.json,health.json}`을 시험 목록·제품 source·정책 근거로 채택했다.
HITS_REJECTED: 이전 `.goal/runs/w12-regression-585ba55-r2/`는 과거 성공 이력으로 보존하지만 최종 source 근거로는 쓰지 않았다.
CONFLICTS: 없음. 최종 실행의 `summary.json.source`와 `health.json.sourceSha`가 일치한다.
SKILLS_USED: haenael-supabase-build — haenael 회귀·staging·fixture 계약을 적용했다.
SKILLS_SKIPPED: ponytail — candidate 상태이며 미설치·코드 미열람 도구라 이번 QA 정본 생성에 시험하지 않았다.
SOURCES/MODEL: GPT-5 Codex | `docs/qa/qa-tracker.md` | `wiki/거버넌스/결정.md` | `.goal/runs/w12-regression-edb4c99/{summary.json,health.json}` | https://playwright.dev/docs/test-snapshots
