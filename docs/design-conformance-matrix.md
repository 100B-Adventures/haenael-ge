# Design Conformance Matrix: haenael-ge core v1.2.0

STAMP: 2026-08-29 07:37 KST | model: gpt-5.6-sol | agent: qa-verifier | skill: qa | basis: PRD v0.4.0, DESIGN v2.0.1, user-flow v0.3.1, dev fixture 26 screenshots | concern: complete screenshots can prove an implementation gap, not erase it.

## 판정

**FAIL.** dev 13화면을 390·1024에서 전수 캡처했고 26/26 HTTP 200, console·pageerror 0, 제품 데이터 hash 동일을 확보했다. 그 결과 친구 결제 kill switch, PRD F-A~F-F 구현 공백, child-safety placeholder, 사용법의 구문구, 비승인 디자인 리터럴이 실제 화면에 남아 있음을 확인했다.

## 8열 전수 추적표

| 요청번호·근거 | 요청·화면 요지 | 테스트번호 | 390 주축·순서·열 | 1024 주축·순서·열 | 정렬·표시·타입·버튼 | 실제 구현 증거 | 판정 |
|---|---|---|---|---|---|---|---|
| QA-PROD-AUTH-01~06 | 운영 auth·무오염·비밀·경계·미커밋 | QA-AUTH-02 | 환전 1열 | 환전 2열 | 읽기 전용, CTA 미실행 | 3엔진 auth, 쓰기 0 | PASS |
| QA-RECOVERY-01 | 환경 34종 | QA-CONTRACT-01 | 비시각 | 비시각 | 비시각 | 34/34 | PASS |
| QA-RECOVERY-02 | 30/3/27 계약 | QA-CONTRACT-02 | 1열 | 2열 | 수치 31행 | 47/47·spec 31/31 | PASS |
| QA-RECOVERY-03 | 가입직후·RAISE | QA-DB-01 | 비시각 | 비시각 | 오류상태 | pgTAP260·RAISE13 | PASS |
| QA-RECOVERY-04 | 알림 실패 분리 | QA-NOTIFY-01 | 알림 UI | 알림 UI | dev CSP 수정 후 error 0 | notify8·Deno58 | PASS |
| QA-RECOVERY-05 | 마스킹·금액 | QA-E2E-01 | 환전 flow | 환전 2열 | 차감표 위계 | Playwright12 | PASS |
| QA-RECOVERY-06 | mutation | QA-MUTATION-01 | 비시각 | 비시각 | 비시각 | 8/8 | PASS |
| PRD F-A | 목표 공개범위 | QA-F-A | 홈 1열 | 홈 1열 | visibility 설정·칩 없음 | `390/1024-receiver-home.png` | FAIL |
| PRD F-B | 항목별 privacy | QA-F-B | 홈 1열 | 홈 1열 | privacy preview·switch 없음 | receiver home 캡처 | FAIL |
| PRD F-C | 로그인 응원자·감사 | QA-F-C | CTA disabled | CTA disabled | `응원 결제 준비 중`, 승격·감사 없음 | payment-flow 2장 | FAIL |
| PRD F-D | 다중 목표 | QA-F-D | 목표 1개 | 목표 1개 | 최신 1개만, 리스트 없음 | `/me` + `me/page.tsx` `.limit(1)` | FAIL |
| PRD F-E | 마이페이지·문의 | QA-F-E | receiver 홈 | receiver 홈 | 계정설정·문의 화면 없음 | receiver-manage 2장 | FAIL |
| PRD F-F | 카테고리 | QA-F-F | 없음 | 없음 | tag·category UI 없음 | 26장 전수 | FAIL |
| Flow ① | 가입 랜딩 | QA-SCREEN-01 | 1열·CTA 1 | 중앙 1열 | 타입·여백 표시 | landing 2장 | PASS_WITH_LINT |
| Flow ① | 온보딩 | QA-SCREEN-02 | 1열 폼 | 중앙 폼 | 입력 순서·CTA | onboarding 2장 | PASS |
| Flow ② | 목표 페이지 | QA-SCREEN-03 | 1열 | 중앙 1열 | goal·wordmap·CTA | goal-page 2장 | PASS |
| Flow ② | 친구 결제 | QA-SCREEN-04 | disabled | disabled | payment sheet 미도달 | payment-flow 2장 | FAIL |
| Flow receiver | 홈 | QA-SCREEN-05 | column | column | 잔액·응원·wordmap | receiver-home 2장 | PASS |
| Flow wordmap | 공유 | QA-SCREEN-06 | column | column | 이미지·인스타·링크 | wordmap 2장 | PASS |
| Flow cashout | 신청 | QA-SCREEN-07 | column | 2열 | 금액·수수료·CTA | cashout 2장 + spec 24조합 | PASS |
| Flow manage | owner 관리 | QA-SCREEN-08 | column | column | 편집·개별 clover | receiver-manage 2장 | PASS |
| Flow history | 환전 이력 | QA-SCREEN-09 | column | column | empty 상태 | history 2장 | PASS |
| Flow status | 환전 상태 | QA-SCREEN-10 | column | column | 30 자격·1 신청 분리 | status 2장 | PASS |
| Flow how | 사용법 | QA-SCREEN-11 | column | column | `환전은 오픈 예정` 구문구 | how 2장 | FAIL |
| Flow admin | 운영자 | QA-SCREEN-12 | 표 가로스크롤 | 넓은 표 | 회원·원장·큐 | admin 2장 | PASS |
| Flow safety | 아동 안전 | QA-SCREEN-13 | placeholder | placeholder | `내용 준비 중입니다` | child-safety 2장 | FAIL |
| DESIGN spec | cashout 31행 | QA-SPEC-01 | 31/31 | 31/31 | 4화면·3상태 | 24/24·overflow0 | PASS |

증거 정본은 `artifacts/qa-round2/dev-implementation-matrix/dev-implementation-matrix.json`과 PNG 26장이다. 각 JSON 행은 final path, HTTP, DOM 순서, computed display·flex·grid·padding·font, visible action 순서, console·pageerror를 포함한다.

## design-lint 1:1 분류

`design-lint.sh web/src`는 exit 0, inline·hex 2범주를 보고했다. 첫 8파일씩 실제로 열어 분류했다.

| 범주 | DESIGN 승인 | 승인 근거 | 비승인 blocker |
|---|---:|---|---|
| inline 8파일 | 3 | `Wordmap` tier size·weight·opacity, `GoalEditSheet`·`OnboardingGoalForm` token 기반 validation·saving 상태 | payment success, landing preview, NotificationBadge, ReportButton, CheerCount의 raw 상태값 |
| hex 8파일 | 1 | `globals.css`는 토큰 파일인데 lint의 `global.css` 패턴 오차로 포함 | payment success/fail, landing, PhoneConsentNotice, LoginSheet, NotificationBadge, ReportButton 7파일 |

## 차단과 소유자

| 소유 | 차단 | 정확한 위치 |
|---|---|---|
| build/product | 친구 결제 kill switch | `CheerPaymentButton`, dev CTA `응원 결제 준비 중` |
| build/product | F-A~F-F 공백 | PRD 행 6건, `/me` 단일 목표 `.limit(1)` 포함 |
| content/legal | 아동 안전 placeholder | `web/src/app/child-safety/page.tsx`, 캡처 2장 |
| build/content | 사용법 구문구 | `/how`의 `환전은 오픈 예정입니다` |
| build/design | 비승인 디자인 리터럴 | 위 lint 비승인 inline 5파일·hex 7파일 |

셀프심문: 캡처 26장이 있으니 디자인 검증 완료인가. 아니다. 전수 캡처가 오히려 PRD 기능 부재와 placeholder를 직접 증명했으므로 FAIL이 맞다.

SKILLS_USED: qa, dev 실DB 13화면·2폭·8속성 대조
SKILLS_SKIPPED: 없음
SOURCES: https://playwright.dev/docs/actionability | https://supabase.com/docs/guides/local-development/testing/overview | https://vercel.com/docs/deployment-checks
MODEL: gpt-codex/gpt-5.6-sol
