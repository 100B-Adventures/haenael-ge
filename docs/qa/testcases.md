# v2.2.0 누적 회귀·공개 업데이트·의견 이벤트 시험 정본

> STAMP: 2026-11-12 20:40 KST · GPT-5 Codex · code-builder · haenael-supabase-build · 기반 포맷 `docs/qa/qa-tracker.md` v2.1.33 · 제품 source `617b084bfeb4ffb9b91ac3b08b136d27f287269d`

## 범위와 원본

이 문서는 제품 source `617b084bfeb4ffb9b91ac3b08b136d27f287269d`의 공개 업데이트 화면, 버전별 새로운 기능 카드, 회원·비회원 본 버전 동기화, Google Analytics 4 의견 이벤트, 9폭 모바일 사용성을 고정한다. staging health의 source와 version은 각각 `617b084…`, `2.2.0`이다. 의견 저장용 새 테이블이나 마이그레이션은 만들지 않았다. 기존 `ops_event`는 운영 이벤트, `share_event`는 목표 공유 이벤트, `risk_event`는 보안·결제 위험 이벤트라 업데이트 의견 저장에 맞지 않으므로, 분석 동의가 있을 때 GA4 `rating`을 전송하고 기존 공식 이메일 문의 경로를 제공한다.

런타임 결과는 `.goal/runs/v2-2.2.0-deploy-617b084/`, `.goal/runs/v2-2.2.0-regression-617b084-r1/`, `.goal/runs/v2-2.2.0-ergonomics-617b084/`을 함께 본다. 로컬 Vitest는 95파일 575건 전부 PASS이고 디자인 토큰 신규 위반은 0건이다. 전체 회귀는 45/45, EXIT 0, 502.1초이며 18개 화면·폭 조합의 사용성 위반은 0이다.

## 공개 업데이트·새로운 기능 카드 추가 시험

| TC-ID | 종류 | Given / When / Then | 판정 | 증거 |
|---|---|---|---|---|
| `RELEASE-PUBLIC-01` | 기능-해피·콘텐츠 | Given `RELEASE.md`의 `public_note`, When `/updates`를 빌드·요청, Then 2.2.0·2.1.4·2.1.3을 최신순으로 로그인 없이 렌더하고 HTTP 200 | PASS | `web/src/app/updates/__tests__/page.test.tsx`, `.goal/runs/v2-2.2.0-deploy-617b084/{verification.json,verify.log}` |
| `WHATS-NEW-ONCE-01` | 기능-해피·상태 | Given 해당 버전을 보지 않은 회원 또는 비회원, When 첫 방문, Then 비회원은 `localStorage`, 회원은 Supabase Auth `user_metadata`와 `localStorage`에 2.2.0을 기억하고 같은 버전 카드를 다시 띄우지 않음 | PASS | `web/src/components/releases/__tests__/WhatsNewCard.test.tsx`, `.goal/runs/v2-2.2.0-local-617b084/targeted-vitest.log` |
| `WHATS-NEW-SYNC-01` | 기능-엣지·상태 | Given 로그인 시 `user_metadata`와 `localStorage`의 본 버전이 다름, When 카드를 초기화, Then 둘 중 최신 SemVer를 사용하고 오래된 쪽만 올리며 버전을 내리지 않음 | PASS | `web/src/components/releases/__tests__/WhatsNewCard.test.tsx`, `.goal/runs/v2-2.2.0-local-617b084/targeted-vitest.log` |
| `WHATS-NEW-ACTION-01` | 기능-해피·탐색 | Given 카드가 열림, When `써 보기`와 `의견 남기기`를 선택, Then `/updates`와 `/updates#feedback`으로 이동 | PASS | `web/src/components/releases/__tests__/WhatsNewCard.test.tsx`, `web/src/generated/public-release-notes.json` |
| `WHATS-NEW-FEEDBACK-01` | 기능-해피·개인정보 | Given 분석 동의 허용, When `/updates#feedback`에서 좋아요 또는 별로예요를 제출, Then 실제 GA4 collect에 `whats_new_feedback`, `rating`, `release=2.2.0`이 실리고 성공 문구가 보임 | PASS | `web/src/app/updates/__tests__/page.test.tsx`, `web/e2e/whats-new.spec.ts`, `.goal/runs/v2-2.2.0-deploy-617b084/{verification.json,updates-feedback-390.png,whats-new-e2e.log}` |
| `WHATS-NEW-GA-BLOCKED-01` | 기능-엣지·개인정보 | Given 분석 동의 거부, When `/updates`에서 평가, Then GA4 전송·대기열 생성 없이 미전송 사실과 기존 이메일 문의 경로를 표시 | PASS | `web/src/app/updates/__tests__/page.test.tsx`, `.goal/runs/v2-2.2.0-local-617b084/targeted-vitest.log` |
| `WHATS-NEW-CTA-01` | 기능-해피·회귀 | Given 첫 방문 카드가 홈 CTA 위에 열림, When 카드를 닫고 홈 핵심 CTA를 선택, Then `/onboarding`으로 이동 | PASS | `web/e2e/whats-new.spec.ts`, `.goal/runs/v2-2.2.0-deploy-617b084/whats-new-e2e.log` |
| `WHATS-NEW-WRAP-01` | 디자인·모바일 | Given 카드 요약과 업데이트 본문, When staging computed style을 확인, Then 모두 `word-break: keep-all` | PASS | `.goal/runs/v2-2.2.0-deploy-617b084/verification.json` |
| `SEO-VERIFICATION-02` | 기능-해피 | Given 루트 metadata, When staging HTML을 요청, Then Google verification 기존·신규 값 2개와 Naver verification 1개가 존재 | PASS | `web/src/app/__tests__/seo-metadata.test.ts`, `.goal/runs/v2-2.2.0-deploy-617b084/home.html` |
| `SEO-UPDATES-01` | 기능-해피·보안 | Given 공개 업데이트 경로, When sitemap과 preview robots를 요청, Then sitemap에 `/updates`가 있고 preview robots는 전체 경로를 차단 | PASS | `.goal/runs/v2-2.2.0-deploy-617b084/{sitemap.xml,robots.txt}` |
| `REGRESSION-WHATS-ISOLATION-01` | 회귀·시험격리 | Given 기존 소셜 회귀 컨텍스트, When 2.2.0 안내가 기존 경로를 방해하지 않음, Then 카드가 기존 클릭·서버 호출 계약을 가리지 않고 45건 모두 통과 | PASS | source `617b084`, `.goal/runs/v2-2.2.0-regression-617b084-r1/{summary.json,report.json,execution.log}` |
| `ERGO-UPDATES-01` | 모바일·접근성 | Given `/updates` 의견 버튼과 새로운 기능 카드가 열린 홈, When 360·390·412·600·700·780·820·900·1000px에서 측정, Then 13px 미만 글자·44px 미만 누름·눌림 상태 90% 미만·가로 넘침·카드와 하단 탭 겹침·콘솔 오류가 모두 0 | PASS | `.goal/runs/v2-2.2.0-ergonomics-617b084/{observations.json,measure.log,*.png}` |

## 검색 노출·GA4·개인정보처리방침 추가 시험

| TC-ID | 종류 | Given / When / Then | 판정 | 증거 |
|---|---|---|---|---|
| `SEO-ROBOTS-PROD-01` | 기능-해피·보안 | Given `VERCEL_ENV=production`, When `robots()`를 생성, Then `/`·`/how`·`/terms`·`/privacy`·`/child-safety`만 허용하고 인증·관리자·API·개인·결제 경로와 `/g/`를 차단하며 운영 sitemap URL을 제공 | PASS | `.goal/runs/v2-f3-f4-local/{targeted-vitest.log,vitest.log}`, `web/src/app/__tests__/seo-metadata.test.ts` |
| `SEO-SITEMAP-01` | 기능-해피·보안 | Given 운영 sitemap, When URL 목록을 생성, Then 공개 정적 URL은 정확히 6개이고 각 항목에 lastmod가 있으며 `/updates`는 포함하고 `/g/`는 제외 | PASS | `web/src/app/__tests__/seo-metadata.test.ts`, `.goal/runs/v2-2.2.0-deploy-617b084/sitemap.xml` |
| `SEO-NAVER-01` | 기능-해피 | Given 루트 metadata, When 랜딩 HTML을 렌더, Then `naver-site-verification` 값이 정확히 한 번 포함 | PASS | `.goal/runs/independent-verify-20261112-1352/`, `.goal/runs/v2-f3-f4-local/vitest.log` |
| `ANALYTICS-CONSENT-GRANTED-01` | 기능-해피·개인정보 | Given 분석 동의 허용, When 초기 이벤트를 전송, Then `js → consent update → config(G-3QR2FB5BGC)` 뒤 `wordmap_shared`·`wordmap_viewed`·`cashout_initiated`·`sign_up`·`login`이 gtag 경로로 전달 | PASS | `.goal/runs/independent-verify-20261112-1352/{ga.json,granted.png}`, `.goal/runs/v2-f3-f4-local/vitest.log` |
| `ANALYTICS-CONSENT-BLOCKED-01` | 기능-엣지·개인정보 | Given 동의 거부 또는 미선택, When 페이지와 로그인 표식을 처리, Then gtag.js·collect·dataLayer 전송은 0이고 로그인 표식 쿠키는 보존 | PASS | `.goal/runs/independent-verify-20261112-1352/{ga.json,denied.png,none.png}`, `.goal/runs/v2-f3-f4-local/vitest.log` |
| `ANALYTICS-LOGIN-01` | 기능-해피·회귀 | Given 기존 회원 로그인 표식과 분석 동의 허용, When 전환 컴포넌트가 실행, Then `login{method:oauth}`을 1회 전송하고 표식 쿠키를 삭제 | PASS | `.goal/runs/independent-verify-20261112-1352/{ga.json,granted.png}`, `.goal/runs/v2-f3-f4-local/vitest.log` |
| `SEO-ROBOTS-PREVIEW-01` | 기능-엣지·보안 | Given `VERCEL_ENV=preview`, When staging `/robots.txt`를 요청, Then HTTP 200과 `User-Agent: *`, `Disallow: /`만 반환하고 sitemap을 노출하지 않음 | PASS | `.goal/runs/v2-f3-f4-deploy-a74f33b/{robots.headers,robots.txt,health.json}`, `.goal/runs/v2-f3-f4-local/vitest.log` |
| `PRIVACY-TAP-01` | 모바일·접근성 | Given `/privacy`, When 360·390·412·600·700·780·820·900·1000px에서 목차·본문 링크를 측정, Then 44px 미만 누름·13px 미만 글자·가로 넘침·콘솔 오류가 모두 0 | PASS | `.goal/runs/v2-f3-f4-privacy-a74f33b/{observations.json,measure.log,privacy-*.png}` |
| `DESIGN-DOPAMINE-ALIGN-01` | 디자인·회귀 | Given 승인 시안 `.dopa-top{text-align:center}`, When 성장 화면을 열고 소제목 computed style을 측정, Then `text-align:center`, 워드맵 236px, overflow·console error 0 | PASS | `.goal/runs/v2-f3-f4-regression-a74f33b/{summary.json,execution.log,captures/f1-dopamine-*.png}`, `SMOKE-01` |

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

KNOWLEDGE_QUERY: 2.2.0 공개 업데이트 의견 제출, 회원 본 버전 동기화, 카드 닫기 뒤 홈 CTA, 9폭 측정의 코드·시험·staging 증거를 조회했다.
HITS_USED: `web/src/app/updates/__tests__/page.test.tsx`, `web/src/components/releases/__tests__/WhatsNewCard.test.tsx`, `web/e2e/whats-new.spec.ts`, source `617b084` deploy·회귀·9폭 결과를 계약과 판정 근거로 채택했다.
HITS_REJECTED: `ops_event`·`share_event`·`risk_event`는 각각 운영, 목표 공유, 보안·결제 위험 도메인 테이블이라 업데이트 의견 저장에 사용하지 않았다. 새 테이블·마이그레이션은 금지 계약에 따라 만들지 않았다.
CONFLICTS: 없음. `RELEASE.md`의 2.1.3·2.1.4 운영 번호는 유지하고 태그만 PATCH 규칙에 맞게 정정했다.
SKILLS_USED: haenael-supabase-build — 해낼게 staging·회귀·시험 데이터 정리 계약을 적용했다.
SKILLS_SKIPPED: qa·qa-only — 제품 재실행과 독립 검증이 금지된 문서 정합 과제라 미사용했다.
SOURCES/MODEL: GPT-5 Codex | `.goal/verify-20261112-2013.md` | `.goal/runs/v2-2.2.0-deploy-617b084/{verification.json,whats-new-e2e.log}` | `.goal/runs/v2-2.2.0-regression-617b084-r1/{summary.json,report.json,payment-restore.http}` | `.goal/runs/v2-2.2.0-ergonomics-617b084/{observations.json,measure.log}`
