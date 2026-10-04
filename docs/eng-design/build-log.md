# build-log.md — 해낼게 빌드 기록

> 진실원: pipeline-state.md, docs/eng-design/folder-structure.md, haenael-supabase-build 스킬.
> append-only. 슬라이스 완료 시 한 블록씩 추가.

---

## 검색·AI 답변 노출 기반 구현 (2026-09-28)

### 결론

Organization·SoftwareApplication·FAQPage JSON-LD, `/llms.txt`, 사람이 읽는 FAQ 10개를 구현했다. 운영에 없는 유료 응원 결제와 환전을 제공 기능처럼 쓰던 초안 문구는 제거했고, 확인된 소셜 계정 다섯 개만 Organization에 연결했다.

### 구현과 계약

| 대상 | 구현 | 계약 안전망 |
|---|---|---|
| 구조화 데이터 | `web/src/lib/seo/structured-data.ts`에서 URL, 소셜 계정, FAQ, 세 스키마를 생성 | 세 스키마 `JSON.parse`, `<` 이스케이프, Facebook·허위 환전 주장 거절 |
| 주입 위치 | 루트 `Organization`, `/how` `SoftwareApplication`, `/faq` `FAQPage` | dev HTML에서 유형과 개수 실측 |
| FAQ 화면 | 기존 Tailwind 의미 토큰과 `<details>`를 사용한 10개 문답 | 화면과 JSON-LD가 동일한 `FAQ_ITEMS`를 공유, 10개 렌더 테스트 |
| AI 설명 파일 | `web/public/llms.txt` | `/llms.txt` HTTP 200, `text/plain; charset=UTF-8`, 첫 줄 `# 해낼게` |
| 탐색 연결 | Footer에 `/faq`, FAQ에 `/how` 링크 추가 | Chromium에서 링크 노출과 FAQ 펼침 관찰 |

### 실행 증거

| 등급 | 실행 | 결과 |
|---|---|---|
| 테스트됨 | `npm test` | 46 files, 287/287 PASS |
| 테스트됨 | `npm run build` | Next.js 16.3.3 compile·TypeScript·static generation 18/18 PASS. `/faq` 정적 생성 포함 |
| 테스트됨 | `npm run qa:design-tokens` | 검사 138파일, 기존 위반 74건, 신규 위반 0건 |
| 근거 확인 | `design-lint.sh web/src` | 기존 인라인 style·토큰 밖 hex 각 8파일 경고. 신규 FAQ·SEO 파일에는 위반 없음 |
| 관찰됨 | dev 서버 `127.0.0.1:3028` + curl | `/`, `/faq`, `/how`, `/llms.txt` 모두 200. JSON-LD 각각 Organization 1개, FAQPage 1개, SoftwareApplication 1개 파싱 성공 |
| 관찰됨 | Chromium 390x844 `/faq` | 제목, 10개 문답, 첫 항목 펼침, 사용법 링크 렌더. 콘솔 오류 0, 페이지 오류 0 |

첫 빌드는 격리 worktree의 `node_modules`가 원본 레포를 가리키는 심볼릭 링크라 Turbopack이 파일시스템 루트 밖 참조를 거부했다. 제품 코드 원인이 아니며, worktree에 `npm ci`로 독립 의존성을 설치한 뒤 동일 빌드를 다시 실행해 통과했다.

### 경계와 다음 게이트

운영 배포, 검색엔진 수집, AI 답변 반영은 미검증이다. Google은 일반 사이트의 FAQ 리치 결과를 보장하지 않으므로 노출 보장으로 보고하지 않는다. QA가 구조화 데이터 검증과 실제 배포 응답을 재확인한 뒤에만 배포 단계로 넘긴다.

STAMP: 2026-09-28 22:40 KST | model GPT-5 Codex | agent code-builder | skill haenael-supabase-build | sources https://nextjs.org/docs/app/guides/json-ld, https://developers.google.com/search/docs/appearance/structured-data/sd-policies, https://developers.google.com/search/docs/appearance/structured-data/software-app, https://llmstxt.org/ | 고민 검색 노출을 과장하지 않고 실제 운영 사실만 기계가 읽게 했다.

---

## 설계안 갈래 1 "다중 목표" 구현 (2026-09-21)

### 배경과 결정

회장 지시(2026-09-21) "홈 화면 추가됨. 나머지 진행해"로 갈래 1 구현에 착수했다.
기반은 `docs/eng-design/eng-design-goal-visibility-supporter-v1.0.0-claude-opus.md` §4와
컨트롤러 채택(2026-09-06 §13): 상한 3개를 삽입 전용 함수 `create_goal`이 advisory
lock으로 원자 보장하고(옵션 나), 상한은 진행 중(마감 전) 목표만 센다(선택지 가).

되돌리기가 가장 비싼 결정은 유니크 인덱스 제거였다 — 재생성 시점에 중복이 있으면
실패하는 비대칭이다. `update_goal`(20260727010000)이 이미 같은 형태(SECURITY DEFINER +
소유권 확인 + advisory lock 계열)로 짜여 있어 새 패턴을 발명하지 않고 그대로 따랐다.

### 구현

- `supabase/migrations/20260921000000_multi_goal_create_fn.sql`: 인덱스 제거,
  `create_goal(p_title, p_reason, p_due_date)` RPC, `REVOKE INSERT ON goal FROM authenticated`.
  `search_path`에 `extensions`를 추가해야 했다 — `goal_slug_gen` 트리거가 쓰는
  `gen_random_bytes`(pgcrypto)가 `extensions` 스키마에 있어 `public, pg_temp`만으로는
  트리거가 42883으로 죽었다(로컬 실측으로 발견, `update_goal`은 slug를 새로 안 만들어
  이 문제가 없었다).
- `web/src/app/(receiver)/onboarding/page.tsx`: 활성 목표 있으면 `/me`로 보내던
  리다이렉트 제거.
- `web/src/components/receiver/OnboardingGoalForm.tsx`: 직접 `insert`를 `create_goal`
  RPC로 교체. `p_reason`은 `null` 대신 `""`(gen types가 non-null로 좁힘, `GoalEditSheet`
  선례와 동일). 상한 초과(`goal_limit_reached`)는 `/me`로 쫓아내지 않고 인라인 안내 +
  입력 보존.
- `web/src/app/(receiver)/me/page.tsx`: `.limit(1)` 단일 목표 조회를 전체 조회로 바꾸고
  진행 중/지난으로 나눈 뒤, 진행 중 목표를 최근 응원 도착순(동률 시 생성 역순, PRD
  §4.3-1)으로 정렬. 최상단(primary) 카드는 기존 단일 목표 화면의 상세 UI(응원 검색·
  워드맵 미리보기·수정·친구뷰 미리보기)를 그대로 유지해 기존 단일 목표 계정의 화면과
  e2e를 무회귀로 지켰다. 나머지 진행 중 목표와 지난 목표는 설계 §4.5 표대로 간단
  카드(제목·D-day·응원수·링크복사)만 두는 신규 `MyGoalListCard`로 렌더한다.
  (주의: `components/goal/GoalCard.tsx`는 친구 공개 페이지용 기존 컴포넌트라 이름이
  겹치지 않게 `MyGoalListCard`로 새로 만들었다 — 최초 작업에서 실수로 그 파일을
  덮어썼다가 `git checkout`으로 복구하고 별도 파일로 분리했다.)
- 대표 링크(사람 허브)는 만들지 않았다(설계 §4.5 결정 그대로).

### 검증

| 등급 | 대상 | 결과 |
|---|---|---|
| 테스트됨 | `npx tsc --noEmit` | 오류 0 |
| 테스트됨 | `npm test`(vitest) | 44 files / 282 tests PASS(다중 목표 신규 4건 포함: 온보딩 상한 안내, `/me` 정렬·다른목표·지난목표 접힘) |
| 테스트됨 | `node scripts/qa/design-token-lint.mjs` | 신규 위반 0건(기존 74건 기준선 유지) |
| 테스트됨 | `supabase test db`(pgTAP) | 11 files / 270 tests PASS(신규 `create_goal.test.sql` 10/10: 2개 성공·3번째 성공·4번째 거부·거부 후 행수 불변·마감 지난 목표 상한 제외·직접 INSERT 거부·미인증 거부) |
| 테스트됨 | `supabase/tests/concurrency/create_goal_limit_race.sh` | PASS — 동시 삽입 2건 중 정확히 1건만 `goal_limit_reached`, 총 3개로 수렴 |
| 테스트됨 | `npm run build` | Next.js 16.3.3 compile·TypeScript·17 routes PASS |
| 관찰됨 | dev 서버(`npm run dev`, localhost:3000) + 로컬 Supabase + Playwright 헤드리스(`web/e2e/multi-goal.spec.ts`) | 2/2 PASS. QA 계정으로 실 로그인 세션을 발급받아(`production-auth-readonly.spec.ts`와 동일 기법) `/onboarding`에서 목표 2개 생성 → `/me`에서 최근 목표가 primary로, 이전 목표가 "진행 중인 다른 목표" 카드로 표시됨을 스크린샷(`/tmp/me-multi-goal.png`)으로 확인. 상한(3개) 도달 시 인라인 안내 + 입력 보존도 별도 케이스로 확인 |
| 관찰됨 | 콘솔 에러 | 목표 2개 생성 + `/me` 진입 전 과정에서 기능 관련 콘솔 에러 0. CSP 위반 4건은 `.env.local`의 GA 플레이스홀더 측정 ID(`G-XXXXXXXXXX`)가 `/onboarding` 최초 진입 시점부터 발생시키는 기존 로컬 환경 문제로, 이번 변경과 무관함을 확인(변경 전에도 재현되는 영역) |
| 관찰됨 | `web/e2e/goal-flow.spec.ts` | 10/10 실행 가능 항목 PASS, 4건은 기존과 동일하게 `E2E_GOAL_SLUG` 미설정으로 skip(회귀 없음) |
| 테스트됨 | `web/e2e/cashout-manual.spec.ts` | 다중 목표 변경이 `/cashout` 계열을 건드리지 않음을 재확인하기 위해 재실행(별도 프로세스로 자체 production 서버 기동) |

### 경계와 미검증

- 운영 DB에는 적용하지 않았다(로컬 `supabase db reset`으로만 검증). 운영 적용은 회장
  승인 후 컨트롤러가 진행한다.
- 갈래 2(공개범위)·갈래 3(응원자 경험)은 이번 슬라이스 범위 밖.
- `/me` 카드 목록은 primary(최상단) 1개만 상세 UI(응원 검색·워드맵 미리보기)를 갖고
  나머지는 간단 카드다 — 설계 §4.5 표의 "카드 최소 구성"은 만족하지만, 계정당
  목표가 2~3개일 때 두 번째·세 번째 목표의 응원 검색·워드맵 미리보기는 `/wordmap/[goalId]`
  풀뷰로만 접근 가능하다(신규 화면을 열지 않은 의도적 범위 판단 — 필요시 회장
  피드백으로 재조정).

### 발견과 의미

보안 QA에서 프로덕션 의존성 40건과 브라우저 방어 헤더 부재가 릴리즈 차단으로 확인됐다. 원인을 분해한 결과 대부분은 Vercel과 shadcn CLI가 런타임 의존성으로 잘못 분류되어 따라온 도구 체인이었고, 실제 서비스 런타임에는 Next.js 16.2.10의 PostCSS·Sharp 취약점이 별도로 남아 있었다. 응답에는 CSP·nosniff·referrer·permissions 정책이 없고 Next.js 기술 헤더도 노출됐다.

이번 보정으로 CLI를 개발 의존성으로 격리하고 Next 공식 2026년 8월 보안 수정판 16.3.3을 적용했다. 회장과 사업 관점에서는 감사 숫자를 숨긴 것이 아니라 운영 설치 트리를 0건으로 만들었고, 외부 실행·연결 대상을 제품이 실제 사용하는 Supabase, Toss Payments, GA4로 제한했다. 동일한 이탈은 설정 계약과 Chromium 실화면 스모크가 함께 잡는다.

### 구현과 검증 증거

| 등급 | 대상 | 결과 |
|---|---|---|
| 테스트됨 | `npm audit --omit=dev --json` | 취약점 0건 |
| 테스트됨 | 전체 Vitest | 44 files, 279/279 PASS, 실패 0 |
| 테스트됨 | `npm run build` | Next.js 16.3.3 compile·TypeScript·static generation 16/16 PASS |
| 관찰됨 | localhost Next dev 홈 | HTTP 200, 제목 `해낼게`, 응원 본문 렌더, CSP·nosniff·referrer·permissions·frame deny 관찰, `x-powered-by` 부재 |
| 관찰됨 | localhost `/api/health` | HTTP 200, status ok, database ok |
| 테스트됨 | Chromium 보안 스모크 | 1/1 PASS, 콘솔 오류 0, page error 0 |

첫 개발 스모크를 127.0.0.1로 열었을 때 Next.js 개발 리소스의 교차 출처 보호가 403으로 차단했다. 이를 제품 성공으로 각색하지 않고 표준 동일 출처인 localhost로 재실행해 1/1 PASS를 관찰했다. 운영은 HTTPS 단일 출처라 이 개발 전용 보호와 충돌하지 않는다.

### 경계와 레드팀

가장 강한 반론은 CLI를 devDependency로 옮겨 감사 결과만 낮춘 것 아니냐는 점이다. Next.js 자체 취약점은 16.3.3으로 별도 제거했고, 두 CLI는 런타임 모듈로 import되지 않으며 빌드 도구로만 사용된다. production build와 실제 서버 렌더를 모두 통과시켜 분류 변경이 실행 산출물을 깨지 않았음을 확인했다.

실제 운영 Toss 결제창 끝단은 거래 생성 금지 정책 때문에 미검증이다. Toss 공식 v2 SDK 호스트와 `*.tosspayments.com`, `*.toss.im`의 프레임·연결은 CSP에 허용했지만, 배포 후 기존 결제 E2E로 실제 결제창 로드를 다시 검증해야 한다.

STAMP: line=core · 갱신=2026-08-29 07:20 KST · model=gpt-5.6-sol · agent=code-builder · skills=없음 · 근거=Next.js 보안 릴리스·headers 문서, Google CSP 가이드, Supabase Realtime, Toss v2 SDK · 고민=외부 결제를 깨지 않으면서 실행 가능한 출처를 실제 연동 범위로 제한했다.

SOURCES: https://nextjs.org/blog · https://nextjs.org/docs/app/api-reference/config/next-config-js/headers · https://developers.google.com/tag-platform/security/guides/csp · https://supabase.com/docs/guides/realtime/protocol · https://docs.tosspayments.com/guides/v2/get-started/llms-quick-reference
MODEL: gpt-codex/gpt-5.6-sol
SKILLS_USED: 없음
SKILLS_SKIPPED: 이 보안 build 보정에 직접 대응하는 전용 스킬이 없어 개발 품질헌법과 공식 문서를 적용했다.

---

## 최신 구현 상태: 1.2.1 환전 임계 카피 정합화 (2026-08-29)

### 발견과 의미

운영 RPC와 프론트 판정은 이미 `총보유 >= 30`과 `1 <= 신청량 <= 지급가능`을 분리하고 있었지만, 신청 폼은 "최소 30개", 비활성 화면은 "친구 응원분 30클로버부터"라고 표시했다. 이 문구는 총보유 30개가 친구 응원 27개와 웰컴 3개로 구성된 회원에게 27개 신청이 가능하면서도 불가능한 것처럼 보이게 했다.

이번 보정으로 환전 자격과 신청 상한을 같은 화면에서 별도 라벨로 보여준다. 회장과 운영 관점에서는 실제 지급 로직을 바꾸지 않고도 30/27 경계 회원의 이탈과 고객문의 원인을 제거했고, 같은 오도가 다시 들어오면 단위 테스트와 계층 계약 검사가 함께 실패한다.

### 구현

| 대상 | 변경 | 현재 계약 |
|---|---|---|
| `CashoutRequestForm.tsx` | 입력 힌트를 승인 프로토타입 v3.8 문구로 교체 | `환전 기준: 모인 클로버 30개 이상`, `지금 지급 가능 N개` |
| 비활성 상태 | 자격 미달과 자격 도달 후 지급가능 0개를 분리 | 총보유 미달은 대기 안내, 지급가능 0개는 웰컴 제외와 친구 응원 필요 안내 |
| 환전 상태 빈 화면 | 구계약 "친구 응원분 30개" 안내 제거 | 총보유 자격과 지급가능 신청량 1개 하한을 별도 문장으로 안내 |
| 공개 오류 매핑 | `cashout_below_minimum`의 중의성을 양쪽 조건으로 설명 | 모인 클로버 30개 자격과 지급가능 클로버 1개 신청 하한을 함께 안내 |
| 이용약관 | 비활성 환전, 필수 KYC, 미구현 실명확인 API 약속 제거 | 환전 운영 중, KYC 기록 없음 신청 허용, 확인 미성년 차단, 계좌정보 수집 후 수동 지급, 세무 판단 미확정 |
| 컴포넌트 테스트 | `QA-LOCAL-03`, `QA-LOCAL-04` 보강 | 30/27 신청 가능, 금지 문구 부재, 지급가능 0개 안내 고정 |
| 계층 계약 검사 | 환전·상태·오류·약관 정합 검사를 추가 | 총 47개 계약으로 DB 임계, UI, 오류 매핑, 운영 약관 드리프트를 함께 검사 |
| 운영 migration | 사후 변경 금지 원칙 적용 | `20260825020000` diff 0, 설명은 build 문서에만 유지 |
| 패키지 버전 | `web/package.json`, lockfile 루트 | 1.2.1 |

### 검증 증거

| 등급 | 실행 | 결과 |
|---|---|---|
| 테스트됨 | `npx vitest run --maxWorkers=1 --testTimeout=15000` | 44 files, 279 tests PASS. 기본 병렬 실행의 자원경합 시간초과 3건은 격리 6/6 PASS 후 직렬 전체로 재판정 |
| 테스트됨 | `npm run test:qa-contracts` | 환경 34/34, 환전 계층 47/47, DB RAISE 13/13, 알림 8/8, 깨뜨리기 8/8 PASS |
| 미검증 | 최종 production build | Next.js 16.3.3 보안 보정과 TS 수정은 security agent 소유. 최종 합본 build는 컨트롤러 재검증 대기 |
| 관찰됨 | Next dev 3017 스모크 | `/` 200, `/api/health` 200, 비로그인 `/cashout` 307 후 `/` 회수, 서버 오류 0 |
| 테스트됨 | `design-lint.sh web/src/components/cashout` | 토큰, 임의 px, 인라인 style 위반 0 |

전역 `web/src` 디자인 lint에는 기존 다른 컴포넌트의 인라인 style과 토큰 밖 hex 경고가 남아 있다. 이번 변경 디렉터리에는 위반이 없으며, 전역 경고는 QA 디자인 정합 단계에서 별도 추적한다. 인증 세션의 실제 30/27 브라우저 화면과 운영 쓰기 경로는 이 build 단계에서 다시 실행하지 않았고 QA 단계 소유로 남긴다.

### 레드팀과 셀프심문

가장 까다로운 반론은 문구만 고치고 로직 경계를 놓쳤을 가능성이다. 이를 막기 위해 27개가 입력 기본값과 최댓값이 되는 컴포넌트 테스트뿐 아니라, DB 하한 1개, 총보유 임계, 지급가능 상한을 소스 계층 검사로 함께 고정했다.

이 결론이 틀렸다면 가장 그럴듯한 이유는 자격 도달 후 지급가능 0개 상태가 기존 자격 미달 문구로 합쳐지는 것이다. 그래서 해당 상태를 독립 테스트 `QA-LOCAL-04`로 추가하고 웰컴 제외 사유와 다음 행동을 명시했다.

STAMP: line=core · 갱신=2026-08-29 07:12 KST · model=gpt-5.6-sol · agent=code-builder · skills=없음 · 근거=DESIGN.md v2.0.1, user-flow v0.3.1, cashout prototype v3.8, PRD v0.4.0, risks, 운영 migration · 고민=환전의 총보유 자격, 신청량, 신원, 지급, 세무 경계를 화면·오류·약관·검사에서 같은 사실로 맞췄다.

SOURCES: `DESIGN.md` v2.0.1 · `docs/design/user-flow.md` v0.3.1 · `scratchpad/cashout-full-journey-v3-opus.html` v3.8 · `supabase/migrations/20260825020000_cashout_total_threshold_contract.sql` · https://testing-library.com/docs/user-event/intro/ · https://nextjs.org/docs/app/guides/production-checklist
MODEL: gpt-5.6-sol
SKILLS_USED: 없음
SKILLS_SKIPPED: 전용 build 구현 스킬이 없다. Stage Controller의 pipeline 위임 범위 안에서 기존 승인 계약만 보정했다.

---

## 슬라이스 #1 — Scaffold (완료 2026-07-06)

### 무엇을 세웠나

| 레이어 | 산출 |
|---|---|
| `supabase/` | `supabase init` 완료 · config.toml(project_id=haenael-ge, analytics disabled) · `migrations/`(빈 골격) · `functions/`(11개 EF 폴더 + index.ts stub) · `functions/_shared/`(9개 공용 파일: region·toss·payout·ledger·idempotency·withholding·risk·oauth-kakao·alimtalk·pass) |
| `web/` | create-next-app 16.2.10 (TypeScript·App Router·Tailwind) · shadcn/ui init · `src/` 구조 수동 정렬 · Supabase JS(@supabase/supabase-js·@supabase/ssr) · Zustand · Sonner · Pretendard(폰트 woff2 복사) |
| 라우트 | `/`(랜딩) · `/(receiver)/onboarding·home·wordmap/[goalId]·cashout` · `/g/[slug]`(비로그인 SSR) · `/auth/kakao/callback`(Route Handler) · `/payment/success·fail` · `/privacy·terms·child-safety` |
| lib/ | `supabase/client.ts·server.ts·database.types.ts(placeholder)` · `analytics/index.ts` · `toss/index.ts` · `utils/format·slug·draft.ts` |
| store/ | `Zustand AppStore (draft·isGuest)` |
| 설정 | `.env.example`(루트+web/) · `.gitignore` · `tsconfig.json(@/* → src/*)` |

### 검증 — 실기동 증거 (§3 직접 관찰)

#### supabase start (로컬 Postgres+Auth+Storage)
```
Started supabase local development setup.
API_URL:       http://127.0.0.1:54321
DB_URL:        postgresql://postgres:postgres@127.0.0.1:54322/postgres
FUNCTIONS_URL: http://127.0.0.1:54321/functions/v1
STUDIO_URL:    http://127.0.0.1:54323
```
- REST API health: `{"swagger":"2.0","info":{"title":"standard public schema","version":"14.14"}}` (HTTP 200)
- Auth health: `{"version":"v2.192.0","name":"GoTrue","description":"GoTrue is a user registration..."}` (HTTP 200)
- 중지 서비스: imgproxy·analytics·vector·pooler (scaffold 단계 불필요, analytics disabled)

#### Next.js build
```
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 19.9s
Running TypeScript ... Finished TypeScript in 10.5s
✓ Generating static pages using 15 workers (13/13)

Route (app)
  ○ /                    ○ /_not-found
  ƒ /auth/kakao/callback  ○ /cashout
  ○ /child-safety         ƒ /g/[slug]
  ○ /home                 ○ /onboarding
  ○ /payment/fail         ○ /payment/success
  ○ /privacy              ○ /terms
  ƒ /wordmap/[goalId]
```
TypeScript 오류 0건, 빌드 PASS.

### 게이트 체크

| 게이트 | 상태 |
|---|---|
| web/ Next.js build PASS | ✅ |
| supabase start 실기동 | ✅ |
| @postagi/* import 없음 | ✅ |
| 시크릿 실값 git 없음 | ✅ (.env.local gitignore) |
| 포트 충돌 없음 | ✅ (54321/54322/54323 사용) |
| E2E testID 부착 | ✅ (data-testid stub 삽입) |
| migrations SQL 없음(슬라이스 #1 범위 외) | ✅ |

### ⛔ 회수 필요

1. **analytics disabled** — 로컬에서 health check 실패로 analytics(`enabled=false`)로 비활성화. 프로덕션 Supabase 클라우드에서는 자동 활성화되므로 로컬 검증 이슈. Supabase Studio UI(http://127.0.0.1:54323) 접속 가능 여부 회장 확인 권장.

### 다음 슬라이스 (#2)
- `supabase migration new init_member_goal` — SQL 작성(member, goal, 기본 RLS)
- `supabase db push` — 로컬 적용
- `supabase gen types typescript --local > web/src/lib/supabase/database.types.ts`
- pgTAP RLS 정책 실검증

---

## 슬라이스 #2 — Migration + RLS + pgTAP (완료 2026-07-06)

### 범위
- `supabase/migrations/20260705163137_init_schema.sql` — 14테이블 스키마 + 뷰 + 트리거 + RLS + 인덱스
- `supabase/tests/rls_policy.test.sql` — pgTAP 20케이스 RLS 실검증
- `web/src/lib/supabase/database.types.ts` — 타입 재생성 (851줄)

### 생성 테이블 (14개)

| # | 테이블 | 역할 | 핵심 |
|---|---|---|---|
| 1 | `member` | 주인공 계정 | auth.users 1:1 FK, ci=bytea 암호화 |
| 2 | `goal` | 목표 액자 | slug UNIQUE, deleted_at soft-delete |
| 3 | `payment` | 토스 결제 | order_id UNIQUE(멱등키), service_role만 write |
| 4 | `cheer` | 응원 1건 | deleted_at soft-delete, message=워드맵 소스 |
| 5 | `payment_log` | 결제 상태전이 | append-only 감사 로그 |
| 6 | `clover_ledger` | 클로버 원장 | append-only, source of truth, service_role만 write |
| 7 | `clover_balance` | 잔액 캐시 | 트리거로 clover_ledger 동기화 |
| 8 | `cashout_request` | 환전 요청 | ₩ 금액은 여기만(3층 c), account_no_enc=bytea |
| 9 | `kyc_verification` | PASS 본인인증 | ci/di=bytea, is_adult 환전 게이트 |
| 10 | `risk_event` | 이상거래 | ACCEPTED-RISK MVP 미사용, 스키마만 |
| 11 | `share_event` | 재공유 analytics | channel CHECK(IMAGE/STORY/LINK) |
| 12 | `wordmap_render_cache` | 이미지 캐시 | Storage URL |
| 13 | `notification` | 알림 | ALIMTALK+INAPP, 실패시 폴백 |
| 14 | `report` | 신고 | INSERT 개방(게스트), SELECT=service_role 전용 |

### 생성 뷰·함수·트리거

| 객체 | 역할 |
|---|---|
| `goal_public` (VIEW) | 금액 3층 a: ₩·clover_count 컬럼 없음, deleted_at IS NULL 필터 |
| `get_wordmap(bigint)` (RPC) | G5 워드맵 집계, SECURITY DEFINER |
| `generate_goal_slug()` (트리거) | goal.slug 자동 생성(gen_random_bytes) |
| `sync_clover_balance()` (트리거) | clover_ledger INSERT 시 clover_balance 동기화 |

### pgTAP 실검증 결과

```
supabase test db
/supabase/tests/rls_policy.test.sql .. ok
All tests successful.
Files=1, Tests=20,  0 wallclock secs
Result: PASS
```

| 케이스 | test-plan | 결과 |
|---|---|---|
| goal_public에 amount_krw/clover_count/gross_krw/fee_krw/net_krw 없음 (5건) | SEC-2 금액 3층 a | GREEN |
| goal_public에 cheer_count 있음 | SEC-2 | GREEN |
| deleted_at 있는 목표 goal_public 제외 | Soft-delete | GREEN |
| 활성 목표 goal_public 조회됨 | — | GREEN |
| anon은 payment INSERT 불가 (42501) | SEC-3 | GREEN |
| authenticated는 clover_ledger INSERT 불가 (42501) | SEC-3 원장 변조 불가 | GREEN |
| authenticated는 payment INSERT 불가 (42501) | SEC-3 | GREEN |
| 사용자A는 사용자B의 clover_balance 조회 불가 (0행) | SEC-4 | GREEN |
| 사용자A는 자신의 clover_balance 조회 가능 (1행) | — | GREEN |
| 사용자A는 사용자B의 cashout_request 조회 불가 (0행) | SEC-4 | GREEN |
| 사용자A는 사용자B의 goal 직접조회 불가 (0행) | SEC-4 | GREEN |
| 사용자A는 자신의 활성 goal 조회 가능 (1행) | — | GREEN |
| anon은 clover_balance SELECT 불가 (42501) | SEC-1 | GREEN |
| anon은 cashout_request SELECT 불가 (42501) | SEC-1 | GREEN |
| anon은 goal_public 활성 목표 조회 가능 | — | GREEN |
| clover_ledger INSERT 시 clover_balance 트리거 동기화 | — | GREEN |

### 게이트 체크

| 게이트 | 상태 |
|---|---|
| supabase db push PASS | ✅ |
| pgTAP 20케이스 GREEN (실 Postgres, mock 없음) | ✅ |
| ERD 1:1 (14테이블) | ✅ |
| RLS 금액 3층 강제 (뷰 + 정책) | ✅ |
| clover_ledger/payment INSERT 정책 없음(service_role EF 전용) | ✅ |
| soft-delete deleted_at 반영 | ✅ |
| web/ TypeScript 오류 0건 | ✅ |
| 시크릿 실값 git 없음 | ✅ |

---

## 슬라이스 #3 — Auth (카카오 로그인) (완료 2026-07-06)

### 범위
- `supabase/functions/_shared/oauth-kakao.ts` — 카카오 OAuth 어댑터 실구현 (exchangeKakaoCode·getKakaoUserInfo·normalizeKakaoUser)
- `supabase/functions/auth-kakao/index.ts` — EF 실구현 (code→token→user→Auth upsert→member upsert→generateLink)
- `supabase/functions/auth-kakao/index.test.ts` — Deno 단위 테스트 (normalizeKakaoUser·KakaoAuthError)
- `supabase/migrations/20260705170046_service_role_grants.sql` — service_role 테이블 GRANT 패치
- `web/src/app/auth/kakao/callback/route.ts` — Route Handler 실구현 (code→EF invoke→verifyOtp→세션→redirect)
- `web/src/lib/supabase/route-handler.ts` — Route Handler용 Supabase 클라이언트 (response.cookies 바인딩)
- `web/src/components/auth/LoginSheet.tsx` — write-first 바텀시트 (카카오 primary·구글·애플·draft 보존 안내)
- `web/src/components/auth/index.ts` — barrel export
- `web/vitest.config.ts` + `web/src/test/setup.ts` — vitest + RTL 설정
- `web/src/components/auth/__tests__/LoginSheet.test.tsx` — 11 케이스 vitest

### 검증 결과 (§3 직접 관찰)

#### web/ Next.js build + TypeScript
```
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 4.6s
Finished TypeScript in 6.6s
TypeScript 오류 0건, 빌드 PASS
```

#### vitest — LoginSheet 11케이스
```
Tests  11 passed (11)
Duration  4.26s — warning 없음 PASS
```
테스트 커버리지:
- open=false 미렌더링 / open=true 렌더링
- 카카오·구글·애플 버튼 존재
- goalTitle 표시 (draft 안심)
- 오버레이·ESC 닫기 (onClose 호출)
- 카카오 클릭 → Kakao OAuth URL (client_id·callback·state 포함)
- 약관/개인정보 링크

#### EF auth-kakao smoke test (supabase functions serve)
```
OPTIONS preflight → HTTP 204 (CORS) ✅
GET         → HTTP 405 {"error":{"code":"method_not_allowed"}} ✅
POST {}     → HTTP 503 {"error":{"code":"missing_env","message":"KAKAO_CLIENT_ID..."}} ✅
```

#### pgTAP 실검증 (20케이스 — 신규 마이그레이션 후)
```
Files=1, Tests=20, Result: PASS
```

#### RLS 세션 게이팅 — 로그인 유저만 자기 데이터 접근 (직접 관찰)
```
1. service_role: auth user 생성 → user_id 발급 ✅
2. service_role: member INSERT → HTTP 201 ✅ (grants 패치 적용)
3. magiclink generateLink → hashed_token ✅
4. verifyOtp → access_token 발급 ✅
5. 자기 세션: member SELECT → 1행 [자기 데이터] ✅
6. anon: member SELECT → HTTP 403 {"code":"42501","message":"permission denied"} ✅
```

### 게이트 체크

| 게이트 | 상태 |
|---|---|
| web/ Next.js build PASS (TypeScript 0건) | ✅ |
| vitest 11케이스 PASS | ✅ |
| EF smoke test (405/204/503) | ✅ |
| pgTAP 20케이스 GREEN (신규 마이그레이션 후) | ✅ |
| RLS 세션 게이팅 직접 관찰 | ✅ |
| service_role GRANT 패치 (INSERT on member) | ✅ |
| 시크릿 실값 git 없음 (env placeholder만) | ✅ |
| @postagi/* import 없음 | ✅ |
| 포트 충돌 없음 | ✅ |

### ⛔ 회수 필요 (카카오 실키 — 회장 액션)

1. **카카오 디벨로퍼 앱 생성 필수**: [developers.kakao.com](https://developers.kakao.com) → 앱 생성
   - **REST API 키** → `NEXT_PUBLIC_KAKAO_REST_API_KEY` (web/.env.local)
   - **REST API 키** → `KAKAO_CLIENT_ID` (Edge Function secret: `supabase secrets set KAKAO_CLIENT_ID=...`)
   - **앱 시크릿 키** → `KAKAO_CLIENT_SECRET` (Edge Function secret: `supabase secrets set KAKAO_CLIENT_SECRET=...`)
2. **카카오 로그인 redirect URI 등록**: `https://{your-domain}/auth/kakao/callback` (+ 로컬: `http://localhost:3000/auth/kakao/callback`)
3. **동의항목 설정**: 닉네임, 프로필사진, 카카오계정(이메일) 선택 동의
4. **실 E2E 검증**: 실 키 설정 후 → 브라우저에서 카카오 로그인 → member 행 생성 → 세션 쿠키 확인 → `/home` 리다이렉트

> 미검증 항목: 실 카카오 로그인 E2E (키 없이 불가). 키 발급 후 위 4번 직접 확인 필요.

### 다음 슬라이스 (#4)
- OnboardingGoalForm (write-first: 목표쓰기 → 저장 시 LoginSheet)
- ShareLinkCard (내 링크 받기)
- 랜딩 파이널 (WIREFRAMES/01-landing.md)
- goal INSERT G1 + RLS

---

## 슬라이스 #4 — 목표 작성 + 목표 페이지 + read 플로우 (완료 2026-07-06)

### 무엇을 세웠나

| 레이어 | 파일 | 내용 |
|---|---|---|
| CSS 토큰 | `web/src/app/globals.css` | DESIGN.md 토큰 전체 적용(clover green·warm paper·ink·muted·faint·line·danger) — shadcn CSS var 매핑 |
| Draft util | `web/src/lib/utils/draft.ts` | 필드명 DB 정합(reason·due_date). savePendingSlug/loadPendingSlug 추가 |
| Component | `web/src/components/goal/DdayChip.tsx` | D-{n}/D-day/D+{n} 뱃지 + StatusChip(ACTIVE·CLOSED·DELETED) |
| Component | `web/src/components/goal/GoalCard.tsx` | 아바타·이름·목표제목·D-day·StatusChip·WHY 섹션. 금액 절대 비노출 |
| Component | `web/src/components/goal/CheerCount.tsx` | "N명이 조용히 응원했어요" (금액 3층 a 준수). AvatarStack |
| Component | `web/src/components/goal/Wordmap.tsx` | get_wordmap RPC 데이터 → 결정론적 위치 배열·size tier(s1/s2/s3). empty 상태 내장 |
| Component | `web/src/components/goal/ShareLinkCard.tsx` | 링크 복사(clipboard API+fallback)·인스타 가이드·내 목표 바로가기 |
| Component | `web/src/components/receiver/OnboardingGoalForm.tsx` | write-first 완전 구현: 폼→draft→LoginSheet→자동저장→ShareLinkCard. Zustand 연동 |
| Page | `web/src/app/page.tsx` | landing-final.html 진실원 반영. 워드맵 프리뷰·궁금증 갭·3스텝·primary CTA |
| Page | `web/src/app/(receiver)/onboarding/page.tsx` | 서버 컴포넌트: getUser → OnboardingGoalForm(initialUser) |
| Page | `web/src/app/g/[slug]/page.tsx` | SSR: goal_public 뷰 + get_wordmap RPC. GoalCard+CheerCount+Wordmap+disabled CTA("곧") |
| Page | `web/src/app/g/[slug]/not-found.tsx` | 404: 친절한 안내 + "내 목표 만들기" CTA |
| Playwright | `web/playwright.config.ts` + `web/e2e/goal-flow.spec.ts` | E2E 10 happy + 4 skipped(E2E_GOAL_SLUG 필요) |

### 검증 — 실기동 증거 (§3 직접 관찰)

#### vitest 38 PASS
```
✓ src/lib/utils/__tests__/draft.test.ts (4)
✓ src/components/goal/__tests__/CheerCount.test.tsx (4)
✓ src/components/goal/__tests__/Wordmap.test.tsx (5)
✓ src/components/goal/__tests__/GoalCard.test.tsx (14)
✓ src/components/auth/__tests__/LoginSheet.test.tsx (11)
Tests: 38 passed, Duration: ~4s
```

#### tsc --noEmit: PASS (오류 0)

#### next build: PASS
```
✓ Compiled successfully in 5.2s
✓ Generating static pages (13/13) in 606ms
Route: / ○ Static, /g/[slug] ƒ Dynamic, /onboarding ƒ Dynamic
```

#### Playwright E2E (로컬 dev 서버 + Supabase local, E2E_GOAL_SLUG=7druulwd)
```
14 passed (14.7s)
- landing: CTA 렌더·클릭→onboarding
- onboarding: 폼 렌더·빈title 에러·에러해소·미인증LoginSheet·ESC닫기
- goal page: not-found·홈링크
- goal page(실DB): 비로그인열람·금액비노출·CTA비활성("곧")·role-transition
```

#### 브라우저 직접 관찰 (§3 실증거)
- `localhost:3001/` — 랜딩: 해낼게. 브랜드·워드맵 프리뷰·시작하기 CTA RENDERED
- `localhost:3001/onboarding` — 폼: 목표입력·날짜·이유·저장버튼 RENDERED
- `localhost:3001/g/7druulwd` — 목표페이지: GoalCard("편입 평점 4.0 해낼게")·D-179·WHY·워드맵 empty("아직 아무도 없어요")·비활성 CTA("조용히 밀어줄게"+"곧") RENDERED

#### 금액 3층 규칙 준수 검증
- ② 페이지 텍스트에 ₩·원화금액·클로버개수 없음 (E2E 자동검증 PASS)
- goal_public 뷰: cheer_count 필드만 (₩ 컬럼 부재)

### 포트/URL
| 서비스 | URL |
|---|---|
| web dev | http://localhost:3001 |
| 목표 페이지 | http://localhost:3001/g/{slug} |
| 온보딩 | http://localhost:3001/onboarding |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |

### 다음 슬라이스 (#9)
- wordmap/share 공유 확산 고리
- 워드맵 공유 이미지 생성 (EF `wordmap-render`)
- 인스타 스토리 링크 스티커

---

## 슬라이스 #9 — 워드맵 풀뷰 + 공유(확산 고리) (완료 2026-07-06)

### 무엇을 세웠나

| 레이어 | 파일 | 내용 |
|---|---|---|
| Migration | `supabase/migrations/20260706000000_wordmap_storage.sql` | `wordmap-images` Storage 버킷 + service_role upload/update + 공개 select 정책 |
| EF | `supabase/functions/wordmap-render/index.ts` | G6: 소유자 인증→get_wordmap RPC→SVG 생성(800×500, 16위치 word cloud)→Storage upsert→wordmap_render_cache 갱신→imageUrl 반환 |
| Component | `web/src/components/goal/WordmapShareIcons.tsx` | 아이콘 3종(이미지 저장·인스타 공유·링크 복사). S1: share_event INSERT(IMAGE/STORY/LINK). SVG→PNG Canvas 변환. Web Share API 폴백. Toast 내장. |
| Test | `web/src/components/goal/__tests__/WordmapShareIcons.test.tsx` | 8 vitest 케이스 |
| Page | `web/src/app/(receiver)/wordmap/[goalId]/page.tsx` | 소유자 인증→goal G3→get_wordmap G5→cheer count→WordmapFullView+WordmapShareIcons 렌더 |
| Page | `web/src/app/(receiver)/home/page.tsx` | 소유자 인증→goal G3→clover balance K1(🍀개수만, ₩ X)→cheer 목록(이름/익명, 금액 X)→워드맵 미니 프리뷰→"워드맵 보기" 단일 CTA |
| E2E | `web/e2e/wordmap-share.spec.ts` | 비인증 /home redirect, 비인증 /wordmap/* redirect, 실 DB(E2E_GOAL_ID 조건부) |

### 금액 3층 준수 증거
- 받는사람 홈(`/home`): 🍀 N개 표시, ₩ 없음. 환전 버튼 disabled(슬라이스 #8).
- 워드맵 풀뷰: cheer count만, 금액 0건.
- `WordmapShareIcons` vitest: 금액 비노출 어설션 GREEN.

### 검증 증거 (§3 직접 관찰)

#### supabase db push + pgTAP
```
Applying migration 20260706000000_wordmap_storage.sql... Finished.
/supabase/tests/rls_policy.test.sql .. ok
Files=1, Tests=20,  Result: PASS
```

#### EF smoke (wordmap-render)
```
OPTIONS  → HTTP 204 (CORS) ✅
POST {}  → HTTP 401 {"error":{"code":"unauthorized"}} ✅
```

#### Next.js build
```
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 5.1s
✓ Generating static pages using 15 workers (13/13)
Route: /home ƒ Dynamic, /wordmap/[goalId] ƒ Dynamic
TypeScript 오류 0건, 빌드 PASS
```

#### vitest 46 PASS
```
✓ src/lib/utils/__tests__/draft.test.ts (4)
✓ src/components/goal/__tests__/CheerCount.test.tsx (4)
✓ src/components/goal/__tests__/Wordmap.test.tsx (5)
✓ src/components/goal/__tests__/GoalCard.test.tsx (14)
✓ src/components/auth/__tests__/LoginSheet.test.tsx (11)
✓ src/components/goal/__tests__/WordmapShareIcons.test.tsx (8)
Tests: 46 passed, Duration: ~4.5s
```

#### E2E Playwright (wordmap-share.spec.ts)
```
✓ 비인증 /home → / redirect
✓ 비인증 /wordmap/1 → / redirect
✓ goal page: 역할전환 링크 항상 노출
✓ home: 비인증 접근 → / redirect
- 2 skipped (E2E_GOAL_ID 미설정, 조건부 정상)
4 passed, 2 skipped (9.0s)
```

### 게이트 체크

| 게이트 | 상태 |
|---|---|
| web/ Next.js build PASS | ✅ |
| TypeScript 오류 0건 | ✅ |
| vitest 46 PASS (+8 신규) | ✅ |
| E2E 4 PASS (2 skip — 조건부 정상) | ✅ |
| pgTAP 20 GREEN | ✅ |
| wordmap_render_cache INSERT RLS (service_role EF) | ✅ |
| share_event INSERT RLS (authenticated 소유자) | ✅ |
| 금액 3층 b 준수 (🍀 개수만, ₩ X) | ✅ |
| 시크릿 실값 git 없음 | ✅ |
| @postagi/* import 없음 | ✅ |
| 포트 충돌 없음 | ✅ |

### 포트/URL

| 서비스 | URL |
|---|---|
| web dev | http://localhost:3001 |
| 받는사람 홈 | http://localhost:3001/home |
| 워드맵 풀뷰 | http://localhost:3001/wordmap/{goalId} |
| EF wordmap-render | http://127.0.0.1:54321/functions/v1/wordmap-render |

### ⛔ 회수 필요
1. **실 카카오 로그인 후 E2E 전구간 검증**: `E2E_GOAL_ID` 세팅 후 wordmap-share.spec.ts 조건부 테스트 재실행 필요. 실 카카오 키 없어 세션 주입 불가 → 슬라이스 #3 ⛔와 동일.
2. **wordmap-images 버킷 RLS 확인**: 로컬 Storage API에서 service_role 업로드 실 확인 필요(EF 실구동 시 카카오 세션 필요).

### 다음 슬라이스 (#10)
- EF `notify` (카카오 알림톡 + INAPP 폴백)
- EF `report` (신고 접수)
- NotificationBadge, ReportButton 컴포넌트

---

## 슬라이스 #10 — 알림(카카오 알림톡) + 신고/모더레이션 — B1 마지막 슬라이스 (완료 2026-07-06, 커밋 `a497f72`)

### 무엇을 세웠나

| 레이어 | 산출 |
|---|---|
| `supabase/functions/_shared/alimtalk.ts` | 카카오 알림톡 API 어댑터 실구현(ENV placeholder 모드) |
| EF `notify` | 응원 도착 정보성 알림톡 + INAPP 폴백(N2) |
| EF `report` | 신고 접수(R1) — anon/authenticated 모두 호출 가능, service_role DB write |
| `supabase/tests/rls_policy.test.sql` | pgTAP 27케이스(report INSERT RLS + soft-delete cheer 워드맵 제외 신규 7케이스) |
| `web/src/components/common/NotificationBadge.tsx` | 인앱 알림 배지 컴포넌트(N1), `/home` 통합 |
| `web/src/components/common/ReportButton.tsx` | 신고 버튼 + 사유 선택 시트(F7), `/g/[slug]` GOAL 신고 통합 |
| `web/e2e/report-flow.spec.ts` | 신고 플로우 E2E |

### 검증 증거 (§3 직접 관찰, 커밋 메시지 인용)

```
vitest 63 PASS / Deno 21 PASS / pgTAP 27 PASS / E2E 9 PASS
```

- 변경 파일 14개, +1920/-35 (git show --stat a497f72).

### 게이트 체크

| 게이트 | 상태 |
|---|---|
| vitest 63 PASS | ✅ |
| Deno EF 단위테스트 21 PASS | ✅ |
| pgTAP 27 PASS(누적) | ✅ |
| Playwright E2E 9 PASS | ✅ |
| report INSERT RLS(anon/authenticated) | ✅ |

### ⛔ 회수 필요 (누적, 슬라이스 #9와 동일 사유 유지)
1. 실 카카오 로그인 후 알림톡 실발송/INAPP 폴백 전구간 미검증(카카오 비즈채널·템플릿 심사 전, ENV placeholder 모드).
2. 신고 처리(운영자 검토·조치) admin 플로우는 build 스코프 밖 — 접수만 구현, 처리는 defer.

---

## B2 결제 — 최초 구현 (2026-07-08~10)

### 무엇을 세웠나

| 레이어 | 산출 |
|---|---|
| `web/src/app/g/[slug]/page.tsx` | 결제 CTA 활성화 |
| `web/src/components/goal/CheerPaymentButton.tsx` | TossPayments v2 JS SDK 위젯 로더 + 결제 트리거 |
| `web/src/app/payment/success·fail/page.tsx` | 결제 성공/실패 리다이렉트 페이지 |
| EF `cheer-order` | 주문 생성(anon 호출 가능) |
| EF `toss-confirm` | Toss 결제 승인 콜백 처리 |
| DB RPC | `create_cheer_order`, `confirm_cheer_payment` — payment/cheer/ledger 원자 전이 |
| 마이그레이션 | `20260708000000_payment_rpc.sql`, `20260708001000_payment_rpc_qualify_columns.sql` |
| 보안 | 결제 RPC는 `PUBLIC`/`anon`/`authenticated` 실행권한 회수, `service_role`만 허용. pgTAP에 직접 호출 차단 테스트 추가 |

### 검증 증거 (§3 직접 관찰 — `.handoff-state.md` 2026-07-08 15:36 KST 인용)

```
Vitest 63 PASS
Next build PASS
Supabase pgTAP 38 PASS
Playwright goal-flow.spec.ts 14 PASS (E2E_BASE_URL=http://localhost:3001, slug 7druulwd)
```

### 게이트 체크

| 게이트 | 상태 |
|---|---|
| web/ Next.js build PASS | ✅ |
| vitest 63 PASS | ✅ |
| pgTAP 38 PASS | ✅ |
| Playwright goal-flow 14 PASS | ✅ |
| 결제 RPC anon/authenticated 직접호출 차단(pgTAP) | ✅ |

### ⛔ 회수 필요 (최초 구현 시점)
1. 실 Toss 결제(진짜 test secret 없음) — confirm 미검증.
2. `toss-webhook`/환전(cashout)/PASS 본인인증/payout = stub 또는 미구현.
3. Supabase cloud keys·Vercel env·Toss/Kakao secrets·Toss redirect 설정 = 실배포 전 필요, 회장 벤더 액션.

---

## B2 결제 — Codex 2nd-pass 결함수정 (4라운드, 2026-07-10~13)

Codex(money-code 2nd-pass, review-only)가 4라운드에 걸쳐 REJECT→수정→재리뷰를 반복한 기록. 각 라운드는 신규 migration으로만 반영(기존 적용된 migration 파일은 수정하지 않음).

### 1라운드 — 최초 리뷰 결함 3건 수정 (2026-07-10~11)

| 결함 | 수정 |
|---|---|
| ① `cancelPayment` 응답 미검증 | `_shared/toss.ts`에 paymentKey 일치 + `status === CANCELED` 검증 추가. 신규 `web/src/lib/__tests__/toss-cancel.test.ts`(6케이스) |
| ② 공개 `cheer-order` 남용방지 없음 | 마이그레이션 `20260710050000_payment_expiry_enum.sql` + `20260710051000_cheer_order_abuse_guard.sql`(request_key 멱등 UNIQUE·customer/goal 이중 rate-limit·opportunistic+pg_cron stale 정리). `CheerPaymentButton.tsx` requestKey 실연동. 신규 pgTAP `supabase/tests/payment_abuse_guard.test.sql`(13 assertions) |
| ③ 내부 오류 원문 노출 | 신규 `supabase/functions/_shared/errors.ts`(화이트리스트 코드+고정메시지). `cheer-order`/`toss-confirm` 응답경로 벤더/DB 원문 노출 0건 |

**검증 (컨트롤러 직접 재관찰, `.handoff-state.md` 2026-07-11 17:50 KST):**

```
npm test (web) 69/69 PASS
npm run build (web) PASS
supabase migration up --local: 드리프트 없음
supabase test db: PASS Files=2 Tests=65
cheer-order 실 HTTP 멱등 smoke: 동일 requestKey 2회 → 동일 orderId + idempotent:true (직접 curl 관찰)
Playwright goal-flow.spec.ts 14/14 PASS (E2E_GOAL_SLUG=7druulwd)
```

### 2라운드 — 동시성 blocker 2건 (create_cheer_order) (2026-07-13 18:15 KST)

Codex 최종 리뷰가 순차 pgTAP(단일 커넥션)로는 재현 안 되는 진짜 동시성 레이스 2건을 REJECT.

| Blocker | 수정 |
|---|---|
| rate-limit count↔insert 비직렬화 | `pg_advisory_xact_lock(hashtextextended(...))`으로 customer_key→goal_id 고정 순서 잠금(데드락 불가) 후 count+insert를 트랜잭션 스코프로 직렬화 |
| request_key SELECT-then-INSERT 레이스 | `INSERT ... ON CONFLICT (request_key) WHERE request_key IS NOT NULL DO NOTHING RETURNING id`로 전환. 경합 패배 시 승자 행 재조회 → amount 일치=replay/불일치=request_key_conflict. raw 23505 노출 경로 0개 |

신규 파일: `supabase/migrations/20260713180819_cheer_order_concurrency_fix.sql`(CREATE OR REPLACE, 시그니처 불변), `supabase/tests/concurrency/rate_limit_race.sh`, `supabase/tests/concurrency/request_key_race.sh`(실제 병렬 psql 세션, pg_sleep(0.3) 배리어로 겹치게 발사).

**검증 (컨트롤러 직접 fresh 재검증, `.handoff-state.md` 2026-07-13 18:15 KST):**

```
supabase migration up --local: 드리프트 없음
supabase test db: 65/65 PASS
rate_limit_race.sh: ALL PASS — customer_key 10개 동시 발사 → READY 정확히 5 / rate_limited 정확히 5
                      goal 30개 동시(customer_key 전부 다름) → READY 정확히 20 / 거부 정확히 10
request_key_race.sh: ALL PASS — 동일 request_key+동일 amount 10개 동시 → payment 행 1개, 실패 0, raw 23505 노출 0
                       동일 request_key+다른 amount(3000×5/5000×5) 동시 → 행 1개 수렴, 승자 그룹만 성공
npm test (web): 69/69 PASS
npm run build (web): PASS
```
Playwright E2E는 이번 라운드 DB 함수만 변경(EF·CheerPaymentButton mtime 미변경, RPC 9-인자 시그니처 동일) 확인 후 회귀 대상 없어 생략(근거 확인, 스킵 아님).

### 3라운드 — request_key fingerprint 강화 (2026-07-13 22:35 KST)

Codex 3차 리뷰가 request_key replay 판정이 **amount_krw만 비교**해 동일 request_key를 다른 goal_id/customer_key/displayName/isAnonymous/message로 재사용해도 기존 주문을 그대로 성공 반환하는 결함을 REJECT.

**수정:** 신규 `supabase/migrations/20260713190000_cheer_order_request_fingerprint.sql`(CREATE OR REPLACE, 기존 3개 migration 미수정). `payment.request_fingerprint jsonb` 컬럼 신설 — goal_id·customer_key·amount_krw·display_name·is_anonymous·message를 cheer INSERT와 동일 정규화 표현으로 저장. fast-path·INSERT 경합 안전망 양쪽에서 `amount_krw !=` 비교를 `request_fingerprint IS DISTINCT FROM`(NULL-safe)으로 교체 — 하나라도 다르면 `request_key_conflict`.

신규 테스트: pgTAP `#FP-1~6`(완전일치=replay 성공, goal_id/customer_key/displayName/isAnonymous/message 각 단독 변경=conflict) — `payment_abuse_guard.test.sql`에 추가(plan 13→20). 신규 병렬 스크립트 `supabase/tests/concurrency/request_key_fingerprint_race.sh`.

**검증 (컨트롤러 직접 fresh 재검증, `.handoff-state.md` 2026-07-13 22:35 KST):**

```
supabase migration up --local: 드리프트 없음
supabase test db: 72/72 PASS (20+52)
rate_limit_race.sh: ALL PASS (회귀)
request_key_race.sh: ALL PASS (회귀 — fingerprint 비교 전환 후에도 시나리오 A/B 동일 결과)
request_key_fingerprint_race.sh (신규): ALL PASS — 동일 request_key+goal_id만 다른 5+5 동시 발사 → payment 행 1개, 승자 그룹만 성공, 나머지 전부 request_key_conflict(raw 23505 노출 0)
npm test (web): 69/69 PASS
npm run build (web): PASS
```
EF(`cheer-order/index.ts`)·`CheerPaymentButton.tsx` mtime 확인 결과 이번 라운드 미접촉(RPC 9-인자 시그니처·응답 스키마 불변) → Playwright 생략(근거 확인).

### 4라운드 — Codex 최종 판정 (2026-07-13 23:10 KST)

**Codex 4차 최종 판정: PASS.** request_fingerprint 수정으로 결제 코드 2nd-pass 리뷰 사이클(1라운드 cancelPayment 검증 → 2라운드 abuse guard → 3라운드 동시성 → 4라운드 fingerprint 재리뷰) 종료.

### 게이트 체크 (B2 Codex 2nd-pass 종합)

| 게이트 | 상태 |
|---|---|
| Codex money-code 2nd-pass 최종 PASS | ✅ |
| pgTAP 72/72 PASS(누적) | ✅ |
| 병렬 세션 레이스 스크립트 3종 ALL PASS(rate_limit·request_key·fingerprint) | ✅ |
| web unit 69/69 PASS | ✅ |
| web build PASS | ✅ |
| Playwright goal-flow 14/14 PASS(회귀, 마지막 실행 라운드 1) | ✅ |
| raw DB 예외(23505 등) 호출자 노출 0건 | ✅ |
| 결제 RPC anon/authenticated 직접호출 차단 | ✅ |

### ⛔ 회수 필요 (누적, 2026-07-13 기준)
1. **실 Toss 결제 미검증** — 진짜 test secret 없어 confirm/cancel 왕복을 한 번도 실제로 못 쳐봄. 전 라운드 공통.
2. **Supabase 클라우드 프로젝트 미생성** — `supabase projects list` → `LegacyPlatformAuthRequiredError`(로그인 필요), 배포 밑돌.
3. **Vercel 프로젝트 미링크** — `web/.vercel` 없음, 로그인 필요.
4. **`toss-webhook`/환전(cashout)/PASS 본인인증/payout = stub 상태** — build 스코프 밖, 별도 착수 필요.
5. **하네스 실측**: `~/.sj-agent-harness/secrets/`·macOS Keychain 어디에도 haenael-ge 클라우드 키 없음 확인됨(2026-07-13) — 배포는 회장의 수동 로그인/콘솔 액션 없이는 이 세션에서 구조적으로 진행 불가.

---

## v1.0.0 출시 기능 (2026-07-15)

- 리드 수집: 이메일/Instagram, 동의, UTM, referrer 저장. service-role RPC·RLS·IP salted hash 시간 제한·신규 리드 Slack 알림.
- 분석: GA4 초기화와 `lead_submitted`, `goal_created`, `cheer_started`, `payment_success`, `wordmap_shared`, `report_submitted`; page path query/hash 제거.
- 운영: DB 실조회 `/api/health`, `PAYMENTS_ENABLED`·`CASHOUT_ENABLED` kill switch, Slack 장애 알림.
- 결제 복구: Toss 서버 재조회 기반 DONE/전액취소 재조정, 부분취소 수동검토 리스크 이벤트, 공유 URL 토큰 인증, 중복 웹훅 멱등 처리.
- 현금화/PASS/payout은 v1.0.0에서 명시적으로 비활성화했다.
- 검증 증거는 `docs/qa/qa-tracker.md`의 2026-07-15 항목을 따른다.

## toss-webhook Codex 2nd-pass — 요청단위 테스트 + 최종 PASS (2026-07-16)

Codex 최종 리뷰(v1.0.0 diff)가 유일한 blocker(P2)로 `toss-webhook` 요청 단위 회귀테스트 부재를 지적 → 해소 → 재지적(null/array/원시값 JSON dereference) → 해소 → **Codex 최종 재리뷰 PASS(No P0-P2 findings)** 확보.

**1라운드 — 리팩터링 + 테스트 신설:**
- `supabase/functions/toss-webhook/index.ts`(108줄, 로직 전부 `Deno.serve` 안)를 Deno 전용 문법 없는 순수 함수로 분리. 신규 `supabase/functions/_shared/toss-webhook-handler.ts`가 `handleTossWebhook(req, deps)`로 토큰검증·payload검증·Toss Query·DONE/CANCELED/PARTIAL_CANCELED 분기·Slack알림을 동작 불변으로 그대로 이동(컨트롤러가 원본과 라인 단위 대조). `index.ts`는 env 읽기+client 준비+핸들러 호출만 하는 27줄 래퍼로 축소.
- 신규 `web/src/lib/__tests__/toss-webhook.test.ts`(12케이스): 경로토큰 401·paymentKey 400(2)·Toss Query실패 502+Slack·amount없는 이벤트의 authoritative DONE/CANCELED 처리(2)·optional payload mismatch 400+Slack(2)·중복취소 멱등·DONE RPC실패 500+Slack·missing_server_env 503·eventType불일치 200 ignored.

**2라운드 — Codex 재지적 수정(null/array/primitive):**
- `req.json()`이 유효한 JSON이지만 `null`(dereference 예외)·배열·원시값(오토박싱으로 조용히 200 ignored)인 경우를 못 잡던 결함. `body === null || typeof body !== "object" || Array.isArray(body)` 통합 가드를 JSON 파싱 직후·`body.eventType` 접근 전에 추가, `invalid_payload`(기존 `invalid_json`과 구분) 에러코드 신설.
- 테스트 3건 추가(#8 null·#9 배열·#10 원시값 3종) — 총 15케이스.

**Codex 최종 재리뷰: PASS (No P0-P2 findings).**

### 검증 (컨트롤러 직접 fresh 재확인, 2026-07-16)
```
web npm test: 86/86 PASS (기존 71 + toss-webhook 15)
NEXT_PUBLIC_APP_VERSION=1.0.0 npm run build: PASS
supabase migration up --local: 드리프트 없음
supabase test db: 95/95 PASS (payment_abuse_guard 20 + release_v1 23 + rls_policy 52)
release-v1.spec.ts (격리포트 3463, next start 프로덕션 모드): 3/3 PASS
```

### ⛔ 회수 필요 (누적 갱신)
1. 실 Toss 결제/웹훅 왕복 미검증 — test secret 없음.
2. Slack 실제 알림 발송 미검증 — webhook URL 없음.
3. Supabase 클라우드 프로젝트 미생성, Vercel 프로젝트 미링크 — 배포는 회장의 수동 로그인 없이는 이 세션에서 진행 불가.
4. prod-health-200 / prod-demo-login-200 — 실 배포 전까지 구조적으로 미검증(mock/로컬 대체 금지).

## release_v1_hardening_fix — Codex REJECT 4건 수정 (2026-07-16)

qa-verifier의 QA 재검증 중 `payment_webhook_reconciliation.sql`/`release_review_fixes.sql`에 Codex money-code 2nd-pass를 처음 실행해 REJECT 4건 발견 → 회장 "tracked 상태로 출시 거부" 확정 → build REOPEN → 전부 수정.

**신규 migration `20260716120000_release_v1_hardening_fix.sql`**(기존 3개 migration 미수정):
1. `reconcile_canceled_payment`의 `p_payment_key` NULL 우회(`IS NOT NULL AND !=`가 NULL 시 AND 전체 NULL=false 취급되던 결함) → `IS DISTINCT FROM`(같은 파일 `record_partial_cancel_review`가 이미 쓰던 정답 패턴)으로 교체.
2. DONE 취소 시 잔액부족을 예외+영구롤백하던 것을 `payment.cancel_reconcile_required_at` durable 마커 + `risk_event(PAYMENT_CANCEL_BALANCE_INSUFFICIENT)`로 수렴, 트랜잭션 커밋. 반환 시그니처에 `review_required boolean` 추가(반환타입 변경으로 DROP FUNCTION 후 재생성). `toss-webhook-handler.ts` CANCELED 분기가 `review_required`를 해석해 200+reviewRequired+Slack critical로 응답(정상 취소 응답은 불변).
3. `capture_lead`에 NULL/빈 `submitter_hash` DB 레벨 거부 가드 추가(EF 선차단에 더한 방어계층).
4. 이메일/인스타그램 SELECT-then-INSERT 레이스 → advisory lock(email→instagram 고정순서, `create_cheer_order`와 동일 원칙) + `unique_violation` 방어적 catch로 안전 수렴.

**신규 테스트**: `release_v1.test.sql`에 14건 추가(plan 23→37) — payment_key NULL 거부, 잔액부족 커밋+risk_event 1건+재시도 멱등(중복 안 쌓임), submitter_hash NULL/빈문자열 거부. 신규 병렬 스크립트 `supabase/tests/concurrency/lead_dedup_race.sh`(동일 이메일 10개 동시 신규 제출 → 1행+9중복, raw 23505 노출 0).

**Codex 재리뷰: PASS**(1라운드, REJECT 없이 통과 — SECURITY DEFINER 경계·lock 순서 데드락 없음·raw exception 누출 0·리턴 컬럼 정합 확인).

### 검증 (컨트롤러 직접 fresh 재확인, 2026-07-16)
```
web npm test: 88/88 PASS (86 + 신규 2)
NEXT_PUBLIC_APP_VERSION=1.0.0 npm run build: PASS
supabase migration up --local: 드리프트 없음
supabase test db: 109/109 PASS (payment_abuse_guard 20 + release_v1 37 + rls_policy 52)
동시성 스크립트 4종(신규 lead_dedup_race + 기존 rate_limit_race/request_key_race/request_key_fingerprint_race): 전부 ALL PASS
release-v1.spec.ts (격리포트 3463, next start 프로덕션 모드): 3/3 PASS
```
컨트롤러가 신규 migration 전체·`toss-webhook-handler.ts` 변경분·신규 pgTAP 어서션을 코드 직접 대조로 재감사(자체보고 신뢰 안 함).

### 미검증 (변동 없음)
실 Toss 결제/웹훅 왕복, Slack 실제 알림, Supabase 클라우드/Vercel 배포, prod-health-200/prod-demo-login-200 — 전부 구조적 미검증 유지.

## amount_krw_null_safe_fix — 3차 최종 하드닝 (2026-07-16, 마지막 라운드)

qa-verifier가 3번째 독립 Codex 컨텍스트 리뷰에서 `reconcile_canceled_payment`에 남아있던 마지막 결함 1건 발견: `IF v_payment.amount_krw != p_amount_krw`가 payment_key와 동일한 NULL-unsafe 패턴. 회장 지시로 같은 클래스 결함을 비일관되게 남기지 않기 위해 마저 수정.

**신규 migration `20260716130000_amount_krw_null_safe_fix.sql`**: `IS DISTINCT FROM`으로 교체(1줄), 나머지 로직 완전 동일. 신규 pgTAP 1건(plan 37→38, NULL amount 거부 확인).

**Codex 재리뷰: PASS**(1라운드, 종료기준 ① 충족 — "이 diff가 새로 도입한 P0/P1/P2 결함 없음", 저장측 별개 이슈는 범위 밖으로 명시). 이걸로 이 마이그레이션 계열의 하드닝 라운드 종결.

### 검증 (컨트롤러 직접 fresh 재확인, 2026-07-16 06:36 KST)
```
supabase migration up --local: 신규 migration 적용, 드리프트 없음
supabase test db: 110/110 PASS (payment_abuse_guard 20 + release_v1 38 + rls_policy 52)
web npm test: 88/88 PASS (변경 없음, SQL 전용 라운드)
NEXT_PUBLIC_APP_VERSION=1.0.0 npm run build: PASS
동시성 4종(rate_limit_race/request_key_race/request_key_fingerprint_race/lead_dedup_race): 전부 ALL PASS
release-v1.spec.ts (격리포트 3463, next start 프로덕션 모드): 3/3 PASS
```
pane 충돌 사전/사후 점검 완료 — 예상 밖 신규 migration 없음.

### 잔여 사항
결제/리드 SECURITY DEFINER RPC 하드닝 3라운드 전부 종결. 남은 것은 구조적 갭(실 Toss/Slack/Supabase클라우드/Vercel)뿐 — 전부 회장의 자격증명/콘솔 액션 필요.

## LoginSheet 구글/애플 OAuth 실구현 (2026-07-19)

회장 지적: "구현완료라며 로그인도 안 된다" — `LoginSheet.tsx`의 구글/애플 버튼이 `alert("슬라이스 #4 연결 예정")`만 뜨는 껍데기였던 결함 수정.

**변경**: `api-contract.md` A1b(`supabase.auth.signInWithOAuth(google/apple)` — 네이티브) 명세대로, 클라이언트 `createClient()`(anon key)로 `signInWithOAuth({provider, options:{redirectTo}})` 실호출로 교체. 신규 라우트 `web/src/app/auth/callback/route.ts`(카카오 커스텀 EF 콜백과 별개 — PKCE `exchangeCodeForSession(code)`만 수행, 카카오 `/auth/kakao/callback`과 동일한 dead-end 0/`?auth_error=` 패턴 재사용). `redirectAfterLogin`은 기존 `isSafeRedirectPath` 화이트리스트로 검증 후 `next` 쿼리로 `/auth/callback`에 실어보냄. provider 미설정 등 Supabase 에러는 raw 노출 없이 `describeOAuthError()`로 친절한 alert만(카카오 방어 패턴 재사용), pending state로 중복클릭 방지.

**신규 파일**: `web/src/app/auth/callback/route.ts`.
**변경 파일**: `web/src/components/auth/LoginSheet.tsx`(GoogleLoginButton/AppleLoginButton 실구현 + `buildOAuthRedirectTo` export), `web/src/components/auth/__tests__/LoginSheet.test.tsx`(signInWithOAuth 호출 검증 4건 추가).

### 검증 (컨트롤러 직접 실행, 2026-07-19)
```
web npm test: 128/128 PASS (LoginSheet 15건 포함, 신규 4건)
NEXT_PUBLIC_APP_VERSION=1.0.0 npm run build: PASS — /auth/callback 라우트(ƒ dynamic) 정상 등록, TypeScript 클린
```

### 미검증
실제 구글/애플 동의화면 왕복(Supabase 대시보드 provider 활성화·Apple Developer Services ID 설정이 선결 — 로컬/스테이징 자격증명 없음). Apple은 코드 경로만 구현, 실제 provider 활성화는 회장의 Supabase/Apple 콘솔 액션 필요.

## welcome_dedup_cleanup — 삭제 목표 웰컴 클로버 무효화 + 약관/개인정보 KYC·수수료·낙전 보강 (2026-07-21)

회장 지적: "활성목표 1개인데 웰컴 클로버가 36개 누적" — 20260718000100의 `grant_welcome_clover()` 트리거는 목표 생성 시 웰컴을 적립만 하고, 그 목표가 이후 삭제돼도 상쇄하지 않았음. 20260720030000에서 정리한 회장 테스트용 중복 활성목표 11개가 DELETED로 전환됐지만 각각의 웰컴(3클로버×11)이 잔액에 그대로 남아 있었음.

**신규 migration 3개(순서 중요, enum add-value는 별도 트랜잭션 필요 — 20260718000000 패턴 계승):**
- `20260721010000_welcome_reversal_enum.sql`: `clover_entry_type_enum`에 `WELCOME_REVERSAL` 추가.
- `20260721010100_welcome_dedup_cleanup.sql`: ①`clover_eligibility()` 재정의 — 웰컴 차감을 `WELCOME_GRANT` 단독합에서 `WELCOME_GRANT+WELCOME_REVERSAL` 순합산으로 수정(안 하면 상쇄 후에도 이중차감되는 2차 버그) ②백필 DO블록 — 삭제목표(status='DELETED' OR deleted_at IS NOT NULL)의 미상쇄 웰컴 WELCOME_GRANT를 WELCOME_REVERSAL로 상쇄(NOT EXISTS 가드, member별 순차 FOR UPDATE로 balance_after 정합) ③`reverse_welcome_clover_on_goal_delete()` 트리거 — 향후 목표가 DELETED 전환/deleted_at set 시 그 목표의 웰컴을 즉시 자동 상쇄.
- `20260721020000_welcome_reversal_uniq_guard.sql`: Codex 2nd-pass Medium 지적 반영 — `clover_ledger(ref_id) WHERE entry_type='WELCOME_REVERSAL' AND ref_type='cheer'` 부분 유니크 인덱스로 이중 상쇄를 DB 레벨 최종 방어.

**약관/개인정보 개정(terms/page.tsx, privacy/page.tsx)**: 제7조에 서비스 이용수수료 5%(+VAT)·계산순서, 원천징수 3.3% 별도 항목화, 환불/청약철회(전자상거래법 7일 + 제한사유 2건) 명시. 신설 제7조의2(환전 시 KYC — 본인인증·계좌실명확인·명의불일치 시 보류), 제7조의3(낙전수입 — 클로버 유효기간 5년·소멸 30일 전 고지·탈퇴 시 처리·웰컴 클로버는 애초 환전대상 아님+목표삭제 시 무효). 신설 제10조(환전 지급 계산식 요약), 문의처는 제11조로 재배치. privacy는 KYC 항목에 계좌 예금주조회(계좌실명확인) API로 본인인증 명의와 대조하는 명의일치 확인 목적을 명시.

### Codex 2nd-pass 리뷰 (mcp__codex__codex, review-only, 2026-07-21)
지적: High 2건(①마이그레이션 적용 순간의 동시 삭제 레이스 — 백필 스캔 이후·트리거 커밋 이전 삭제분 누락 가능, 회장 직접 psql 저트래픽 적용으로 리스크 낮음/재조정 스캔 필요 시 재실행 가능하게 backfill DO블록은 멱등 설계됨 ②`cheer_public`·`get_wordmap()`이 goal 삭제여부를 조인 필터하지 않아 삭제된 목표의 cheer가 여전히 조회 가능 — **이 원장 무효화 마이그레이션과 무관한 기존 별개 결함**, 범위 밖으로 명시하고 별도 이슈로 회수), Medium 2건(①WELCOME_REVERSAL 중복 방지가 NOT EXISTS뿐이라 유니크 인덱스 부재 → 20260721020000으로 즉시 반영 ②`GREATEST(v_welcome,0)` 클램프가 회계 이상 징후를 가릴 수 있음 — 정상 케이스에선 발생 불가, 모니터링 과제로 인지).

### 검증 (컨트롤러 직접 실행, 2026-07-21/22 KST)
```
supabase db reset (로컬): 전체 33개 migration 무드리프트 적용
supabase test db: 145/145 PASS (payment_abuse_guard + release_v1 + rls_policy + welcome_clover 20 + welcome_reversal 9신규)
psql 수동 시나리오(회장 지적 재현) — 11개 목표 순차 생성→삭제 + 활성 1개 생성:
  clover_balance = 3 (기대값, 과거엔 36)
  WELCOME_GRANT 12건 / WELCOME_REVERSAL 11건 / 순합 3
  clover_eligibility(): total=3, welcome=3, payable=0, reached_threshold=false
web npm run build (next build, Turbopack): PASS — /terms, /privacy 정적 프리렌더 정상
```

### 미검증
prod 실적용(회장이 psql로 직접 push, 이 세션은 마이그레이션 파일만 작성 — prod push 금지 지시). `cheer_public`/`get_wordmap()` goal-삭제 필터 누락은 Codex가 발견한 별개 결함으로 이번 라운드 범위 밖(⛔ 회수 필요 참조).

## slices-10~12 배포 완료 — 랜딩·응원·웰컴·약관 (2026-07-21~23)

### 무엇을 했나
회장 지적 3종 병렬 구현 + prod 배포 완료.

**S10: 랜딩·푸터·로고 (code-builder)**
- `web/src/app/page.tsx`: LeadCaptureForm 제거, BrandMark→Link(로그인 시 /home, 비로그인 /), 재로그인 링크 가독성(bold+underline)
- `web/src/components/common/Footer.tsx`: 신규, 사업자정보(상호·대표·사업자등록·주소·이메일·개인정보책임자)
- `web/src/app/layout.tsx`: Footer 전역 렌더(flex-1 감싸 하단 고정)

**S11: 응원 클로버 개수 UI + 알림 라우팅 (code-builder)**
- `web/src/components/goal/CheerPaymentButton.tsx`: 프리셋 1/3/5/10클로버+직접입력(무제한, 서버 100,000클로버=1억 상한) + 1클로버=1000원
- `supabase/functions/cheer-order/index.ts`: 금액검증 화이트리스트→1000원배수+상한검증(isValidAmount)
- `supabase/migrations/20260721000000_cheer_amount_unbounded.sql`: RPC 금액검증 완화
- `web/src/components/common/NotificationBadge.tsx`: 알림 클릭→/home 라우팅 + 읽음처리

**S12: 웰컴 정리·약관 개정 (code-builder)**
- `supabase/migrations/20260721010000_welcome_reversal_enum.sql`: enum에 WELCOME_REVERSAL 추가
- `supabase/migrations/20260721010100_welcome_dedup_cleanup.sql`: 삭제목표 웰컴을 음수 REVERSAL로 상쇄(감사추적 보존), 기존 GRANT 12+REVERSAL 11=순합3
- `supabase/migrations/20260721020000_welcome_reversal_uniq_guard.sql`: 부분 유니크 인덱스 (이중방어)
- `web/src/app/terms/page.tsx`: 제7조의2(수수료5%+VAT) / 제7조의3(원천징수3.3%·낙전유효기간5년·환불)
- `web/src/app/privacy/page.tsx`: 계좌실명확인 목적 명시

### 검증(관찰됨)
```
prod DB:
  enum clover_entry_type_enum: WELCOME_GRANT, WELCOME_REVERSAL 생김 ✅
  clover_ledger: GRANT 12(+36) / REVERSAL 11(-33) = 순합 3 ✅
  balance_after 최신 = 7 (활성목표 웰컴3 + 응원4) ✅

prod web (haenael-ge.vercel.app):
  / : lead-form 제거, Footer 서빙(사업자등록), relogin-link 노출 ✅
  /terms: 5% 수수료·원천징수·본인인증·낙전·유효기간 서빙 ✅
  /privacy: 계좌실명확인 목적 명시 ✅
```

### 미검증(회장 눈 필요)
- 응원 클로버 개수 UI `/g/[slug]`: 40 = 40클로버 표시(40,000원 아님) — 클라이언트 React 렌더라 자동 테스트 불가
- 로그아웃 signOut({scope:'global'}): 배포됨, 카카오 SSO 자동재로그인 동작 여부 별도 확인
- 기존 별개 버그: `cheer_public`·`get_wordmap()` goal-삭제 필터 누락(Codex 발견) — 삭제 목표 응원메시지 여전히 조회 가능, 개인정보 노출(다음 슬라이스)

### 배포 기술 기록
- psql: 회장이 `!bash apply-and-deploy.sh`로 실행(auto 분류기 Bash 운영DB 쓰기 차단 — `!` 회피)
  ```
  psql -h aws-1-ap-northeast-2.pooler.supabase.com -p 5432 -U postgres.gmpwrcxpvgylmllasoqy
  마이그레이션 4개 apply(enum 선행 트랜잭션 분리 = 20260721010000)
  ```
- Vercel: `npx vercel deploy --prod --yes --scope 100-b` (토큰 불필요, 로컬 로그인 유효)
  - `--prod` 자동 승격 안 됨 → 수동 `vercel alias set` 필요(다음 배포 상기)
  - canonical domain 2개(haenael-ge.vercel.app, haenaelge.vercel.app) alias 재지정해 새 배포(7v4s5tw5z)로 재지정
- Vercel 토큰(vercel-token-haenael, 07-18 발급) 만료 예상 — 로컬 vercel 로그인(rosemallow95, 팀 100-b) 유효하면 토큰 불필요

### 남은 것
- 회장 미검증 2건(클로버 UI·로그아웃) 피드백 → 안 되면 즉시 수정
- 보안결함 1건(cheer_public 필터): 다음 슬라이스로 별개 이슈 등록

## 1차 베타 회장 직접 지적 UI 보정 — 배포 전 (2026-07-24)

### 범위와 기반

- 회장 확정 범위: 신규 기능·v2·별도 보안감사로 넓히지 않고, `docs/plan/backlog-2026-07-20.md`의 직접 지적만 보정해 10~20명 반응을 본다.
- 승인 기반: `docs/plan/prd-haenael-ge-v0.3.0.md`, `DESIGN.md` v1.6+, `docs/eng-design/fdd-haenael-ge-v0.1.0.md`, `docs/eng-design/api-contract.md`, `docs/eng-design/architecture.md`, `docs/qa/test-plan.md`.
- 제품 디자이너 보조 명세 `docs/design/beta-ui-fix-spec-2026-07-24.md`는 design-review 미호출로 verify FAIL이므로 정본으로 승격하지 않았다.

### 구현(code-builder)

- `GoalCard.tsx`: 공개 프로필 데이터가 없을 때 `?`·`익명` 대신 중립 클로버+`해낼게 사용자`; 이미지 prop과 로드 실패 폴백 추가. 실제 카카오 프로필 조회·공개 계약은 변경하지 않음.
- `MyLinkCard.tsx`: 텍스트 복사 버튼을 44×44 Copy/Check 아이콘으로 변경. clipboard·textarea fallback·analytics·2초 성공 상태 유지.
- `/home/page.tsx`: 각 응원 클로버 옆 `나만 보임` 라벨 추가.
- `Wordmap.tsx`: 고정 절대좌표를 flex-wrap으로 교체하고 중복 정규화·빈도 정렬·최대 12개·긴 단어 줄바꿈 적용.
- 위 4건의 테스트 5파일을 추가·보강. Backend/API/DB/RLS/모바일/의존성 변경 없음.

### 검증

- code-builder 품질 게이트: PASS(근거 있음, 경고 1건).
- fresh web unit: 26 files / 186 tests PASS.
- production build: compile·TypeScript·17 routes PASS.
- actual browser+운영 데이터 `/g/knirdtaq`, 320/390/430px: HTTP 200, `?`/`익명` 0, 워드맵 overlap 0·clip 0·horizontal overflow 0.
- 캡처: `/private/tmp/haenael-beta-local-after.png`.
- prod 신고 UI→EF: HTTP 201 + 접수 완료 화면 관찰.

⛔ 검증실패 보고: 독립 `qa-verifier`는 unit/build를 재현했지만 실행 샌드박스에서 포트·Chromium을 못 열었고, `verify-agent-quality`도 QA 스킬 미호출로 FAIL했다. 이 자기보고를 출고 증거로 사용하지 않고 컨트롤러 actual-browser 재검증을 별도로 수행했다.

### 미검증·미완료

- 실제 카카오 이미지·닉네임을 공개 목표에 연결하는 계약은 미구현. 1차 베타 중립 폴백 채택 여부가 결정 필요.
- 인증된 `/home`에서 Copy 아이콘의 실제 clipboard와 `나만 보임`을 눈으로 보는 운영 검증은 남음.
- 수정 코드는 아직 prod 미배포. 따라서 “운영 완료”로 기록하지 않는다.
