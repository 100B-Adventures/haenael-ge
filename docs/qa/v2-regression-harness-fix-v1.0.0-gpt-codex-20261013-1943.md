# V2 전체 회귀 테스트 하네스 수정 결과

> **판정: 테스트 하네스 결함 17건 해소.** 전체 Playwright 63건 중 62건이 통과했고, 지시대로 수정하지 않은 운영 read-only 인증 1건만 자격증명 미주입으로 실패했다. 전체 pgTAP은 18파일 323건이 통과했다. 제품 코드, 운영 DB, 운영 배포는 변경하지 않았다.

## 1. 범위와 불변식

- 기준 문서: `docs/qa/v2-social-viral-loop-qa-reverification-v1.0.0-gpt-codex-20261013-1920.md`의 전체 회귀 실패 분류.
- 변경 허용 범위: Playwright 진입 환경, 로컬 seed, pgTAP fixture.
- 변경 금지 범위: `web/src`, Supabase migration·Edge Function, 운영 DB, 운영 배포, 운영 환전 데이터.
- 보호 단정: 계좌 마스킹 `••••••9012`, 계좌 원문 비노출, 이용료·부가세·원천징수 기준값, A안 잠금 로직.
- `production-auth-readonly.spec.ts`는 운영 자격증명이 필요하므로 수정·skip 없이 실패 상태를 유지했다.

## 2. 원인과 수정

| 대상 | 근본원인 | 수정 | 결과 |
|---|---|---|---|
| `cashout-manual.spec.ts` 12건 | `NEXT_PUBLIC_*`가 `next build` 시점에 고정되는데 `next start` 런타임에서 mock Supabase URL을 덮으려 했다. 합성 JWT도 실제 local Auth에서 유효하지 않았다. | 실제 local Supabase Auth에서 QA 세션을 발급한다. Auth는 실제 local stack을 사용하고 PostgREST 데이터 요청만 별도 fixture로 라우팅해 환전 write를 격리했다. | 12/12 PASS. 계좌 원문·마스킹·수수료 단정 유지. |
| `cheer-payment.spec.ts` 2건 | 기본 slug `knirdtaq`에 대응하는 local goal이 없었다. | `supabase/seed.sql`에 비식별 local member·PUBLIC goal을 추가했다. 실행 중 만든 READY order는 local에서만 추적해 정리한다. | 2/2 PASS. |
| `multi-goal.spec.ts` 2건 | 인증 쿠키가 `localhost:3000`에 고정됐고 실제 앱은 `127.0.0.1:3472`였다. 수동 생성 context도 baseURL을 상속하지 않았다. | `E2E_BASE_URL`의 origin을 cookie URL과 새 BrowserContext baseURL에 함께 사용했다. | 2/2 PASS. |
| `release-v1.spec.ts` 1건 | 버전 기대값이 `1.0.0`으로 고정됐다. | `web/package.json`의 선언 버전을 읽어 `/api/health` 응답과 대조한다. | health·익명 환전 2/2 PASS. |
| `social_web_first_cover.test.sql` | APPROVED fixture에 `reviewed_by`, `reviewed_at`이 없어 `goal_cover_asset_state_check` 위반. | fixture에 관리자와 검수시각을 추가했다. | 해당 pgTAP PASS. |
| `social_web_first_rls.test.sql` | 새 PUBLIC seed가 들어오자 전역 `goal_public` 집계가 fixture 외 데이터를 함께 셌다. | RLS 단정을 해당 테스트가 만든 PUBLIC·FRIENDS·PRIVATE sentinel 세 건으로 한정했다. | 공개범위 단정 유지, 해당 pgTAP 6/6 PASS. |

## 3. 직접 실행 증거

| 증거 | 결과 | 로그 |
|---|---|---|
| local DB 재구성 | migration 전량 적용 뒤 `supabase/seed.sql` 적용 성공 | `/tmp/haenael-v2-db-reset.log` |
| 전체 pgTAP | 18 files, 323 tests, PASS | `/tmp/haenael-v2-pgtap-full.log` |
| TypeScript | `tsc --noEmit` PASS | `/tmp/haenael-v2-harness-tsc-2.log` |
| production build | Next.js 16.4.0 compile·TypeScript·17/17 static generation PASS | `/tmp/haenael-v2-regression-build.log` |
| 환전 Playwright | 12/12 PASS. 실제 local Auth 세션, fixture 데이터 격리 | `/tmp/haenael-v2-cashout-pw-final.log` |
| 결제 Playwright | 2/2 PASS. local seed CTA·20클로버 결제창·0클로버 거절 | `/tmp/haenael-v2-cheer-pw-final.log` |
| 다중 목표·릴리즈 | 4/4 PASS | `/tmp/haenael-v2-targeted-pw.log` |
| 전체 Playwright | 62 PASS / 1 FAIL / 0 SKIP, 1.7분 | `/tmp/haenael-v2-playwright-full-final.log` |

전체 Playwright의 유일한 실패는 `QA_PRODUCTION_SUPABASE_URL` 등 운영 read-only 자격증명이 미주입된 `QA-PROD-AUTH-01`이다. 이 테스트는 `requiredEnv()`에서 fail-closed 했고, 삭제하거나 skip하지 않았다.

## 4. 변경 무결성 감사

| 검사 | 결과 |
|---|---|
| 제품 코드 변경 | `web/src`, `supabase/migrations`, `supabase/functions` diff 0 |
| 테스트 삭제 | 0건 |
| 신규·변경 skip | 0건 |
| 계좌 마스킹 단정 변경 | 0건. `PERSISTED_MASKED_ACCOUNT = "••••••9012"` 유지 |
| 수수료 기준값 변경 | 0건. 3,300원·881원·25,819원 단정 유지 |
| 운영 데이터 쓰기 | 0건. cashout 테스트는 실제 local Auth와 in-memory data fixture를 분리 |
| 운영 DB·배포 | 실행하지 않음 |

## 5. 남은 경계

- 운영 read-only 인증 1건은 회장이 자격증명을 주입하기 전까지 FAIL이다. 테스트는 제품 데이터 쓰기 전후 snapshot 동일성과 브라우저 write 0건을 검증하도록 그대로 유지돼 있다.
- 이 결과는 테스트 하네스 복구 증거다. QA 승인이나 운영 배포 완료를 뜻하지 않는다.
- 하단탭 라벨 10px 대 13px 미결정은 이 작업 범위 밖이며 건드리지 않았다.

## 6. 벤치마크와 자체 검증

- [Next.js Environment Variables](https://nextjs.org/docs/app/guides/environment-variables): `NEXT_PUBLIC_*`가 build 시점에 bundle로 고정된다는 계약을 확인했다. 런타임 덮어쓰기 대신 실제 local Auth와 fixture data routing을 분리했다.
- [Playwright Authentication](https://playwright.dev/docs/auth): 인증 state를 브라우저 context에 주입하는 패턴을 local Supabase 세션 cookie에 적용했다. 저장된 인증 파일은 만들지 않았다.
- [Supabase Seeding](https://supabase.com/docs/guides/local-development/seeding-your-database): migration 뒤 local seed를 적용해 재현 가능한 공개 goal을 만들었다. 운영에는 `--include-seed`를 사용하지 않았다.

셀프심문: 62/63이면 전체 회귀 통과라고 부를 수 있는가. 아니다. 운영 인증 1건이 실제 실패이므로 전체 suite는 red다. 다만 지시된 테스트 하네스 17건은 모두 해소됐고 남은 실패의 원인은 운영 자격증명 미주입으로 한정됐다.

레드팀: 테스트를 통과시키기 위해 제품 코드나 보안 단정을 바꿨을 가능성을 공격했다. 기준 commit 이후 제품 코드 diff 0, skip 추가 0, 마스킹·수수료 보호 문자열 변경 0을 확인했고, local seed 때문에 깨진 RLS 테스트도 전역 집계를 삭제하지 않고 세 visibility sentinel을 직접 비교하도록 격리했다.

🏷 STAMP | line: v2 | 생성: 2026-10-13 19:43 KST | model: gpt-6.1-sol | agent: code-builder
skills: haenael-supabase-build | 근거: QA 재검증 §4, local production build, Playwright, pgTAP, Next.js·Playwright·Supabase 공식 문서
고민: 운영 빌드의 build-time env 계약을 훼손하지 않으면서 실제 인증과 환전 data write 격리를 동시에 만족시키는 경로를 선택했다.

SKILLS_USED: haenael-supabase-build, local Supabase migration·seed·pgTAP와 Next.js production Playwright 검증 순서에 사용
SKILLS_SKIPPED: review, 제품 코드 변경이 없고 테스트 하네스 diff와 보호 단정 감사를 직접 수행해 별도 PR 리뷰를 중복 실행하지 않음
SOURCES/MODEL: gpt-6.1-sol | `pipeline-state.v2.md` | `docs/qa/v2-social-viral-loop-qa-reverification-v1.0.0-gpt-codex-20261013-1920.md` | `standard-dev.md` | Next.js·Playwright·Supabase 공식 문서
PRESENTATION_CHECK: 내부 태그 잔재 없음 확인, Markdown 원문 구조 검수 완료
KNOWLEDGE_QUERY: BRAIN business·CTO index에서 회귀 테스트와 fail-closed 기준을 조회하고 Next.js build-time env, Playwright auth state, Supabase local seed 공식 문서를 조회
HITS_USED: BRAIN의 검증이 돌았다는 증거와 회귀 테스트 원칙, 공식 문서의 build-time env·인증 state·local seed 계약을 채택
HITS_REJECTED: 비공식 블로그와 운영 데이터 복제 방식은 권위가 낮거나 운영 write 금지와 충돌해 미채택
CONFLICTS: 없음. 공식 Supabase seed는 staging에도 사용할 수 있으나 이 작업은 local-only로 더 엄격하게 제한
판단: 제품 코드를 바꾸지 않고 실제 local Auth와 격리 data fixture를 결합하는 경로를 채택했다. runtime env 덮어쓰기는 Next.js build 계약과 충돌해 폐기했다.
병목: cashout Server Action 응답 본문을 Playwright가 직접 회수하지 못한 1건을 response route 중계로 재현·해소한 부분이 가장 오래 걸렸다.
