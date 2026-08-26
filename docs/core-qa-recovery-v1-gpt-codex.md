# Core QA Recovery v1

STAMP: 2026-08-25 19:04 KST | model gpt-5.6 | agent qa-verifier | skill qa | evidence Vercel and Supabase read-only metadata, local Postgres/PostgREST, Deno, Vitest, Next production build, Playwright, mutation tests | key judgment: green local tests cannot substitute for target-environment and cross-layer contracts

## 목차

1. TL;DR
2. 범위와 판정
3. 요청 추적표
4. 관찰 증거
5. 신설 검사와 배포 차단점
6. 보존 회귀
7. 잔여 위험
8. 셀프심문과 레드팀
9. 근거와 품질 푸터

## 1. TL;DR

사고 3종을 각각 독립적으로 잡는 검사를 신설했고, 정상 상태 PASS와 고의 파손 FAIL을 모두 관찰했다.

- 환경변수: 코드에서 34개를 추출해 전부 분류했다. Vercel Production 13개와 Supabase Production 19개가 현재 모두 존재함을 값 없이 확인했다. 누락 변이 3종은 exit 1이었다.
- 층간 계약: DB와 화면의 최소 기준, 잔액, 수수료 계산 30항목이 일치했다. 총 30개 중 웰컴 3개와 지급가능 27개인 실제 로컬 PostgREST RPC가 HTTP 200과 `REQUESTED`를 반환했다.
- 실패 관측: 환전 알림 403을 `notification`의 `INAPP/FAILED` 행으로 기록하는 동작을 테스트했다. 실패 기록 호출을 제거한 변이는 exit 1이었다.
- 시험 데이터: 가입 직후 잔액 0에서 시작해 웰컴 3개와 적립 27개를 순서대로 넣었다. 최신 DB 함수의 RAISE 코드 13종을 전부 실제 함수에서 실행했다.

전체 QA 승인은 올리지 않는다. 운영 DB에 신규 migration을 적용한 뒤 production 실계정 첫 환전을 재관찰하지 않았고, 전역 design-lint도 2종 위반을 계속 보고한다.

## 2. 범위와 판정

**이번 QA 복구 검사 판정: 테스트됨.**

**제품 릴리즈 판정: changes-requested 유지.**

운영 DB 쓰기, production 배포, production 환전 신청은 하지 않았다. 운영 환경변수 조회는 이름과 존재 여부만 읽었다.

## 3. 요청 추적표

| 요청번호 | 요청 요지 | 테스트번호 | 판정 | 증거 |
|---|---|---|---|---|
| QA-RECOVERY-01 | 기능별 필수 환경변수 도출과 실제 대상 환경 존재 확인 | ENV-CONTRACT-01 | PASS | 코드 34개 전량 분류, Vercel 13/13, Supabase 19/19, 값 출력 없음 |
| QA-RECOVERY-02 | DB와 화면의 최소 기준, 잔액, 금액 계산 일치 | CASHOUT-CONTRACT-01 | PASS | 정적 계약 30/30, PostgREST 총30/웰컴3/지급가능27 신청 HTTP 200 |
| QA-RECOVERY-03 | 가입 직후 상태와 전체 RAISE 분기 실행 | CASHOUT-DB-NEW-USER-01 | PASS | 가입 직후 0개 단언, RAISE 13/13, cashout pgTAP 포함 88건 PASS |
| QA-RECOVERY-04 | 알림톡 403을 0건과 구분 가능하게 기록 | CASHOUT-NOTIFY-01 | PASS | 403 단위 테스트와 `INAPP/FAILED` insert, 알림 계약 8/8 |
| QA-RECOVERY-05 | 계좌 마스킹과 수수료 계산식 보존 | REG-CASHOUT-SEC-FEE-01 | PASS | 보안 pgTAP 포함 88건, Playwright 12/12, Deno withholding 5/5 |
| QA-RECOVERY-06 | 사고 3종 탐지력 고의 파손 증명 | MUTATION-01~08 | PASS | 누락 env, 잘못된 UI/DB 기준, 수수료 9%, 실패 삼킴 변이가 모두 기대한 exit 1 |

매핑 출처: `docs/test-plan.md`의 2026-08-25 QA 복구 요구 추적표.

## 4. 관찰 증거

| 계층 | 실행 | 결과 | 증거 등급 |
|---|---|---|---|
| canonical stage | `pipeline-state.core.md` 확인 | `current_stage: qa`, `qa: changes-requested` | 근거 확인 |
| 환경 정적 계약 | `npm --prefix web run test:qa-contracts` | 34/34 분류, 계약 30/30, RAISE 13/13, 알림 8/8, 변이 8/8 | 테스트됨 |
| Production env metadata | `npm --prefix web run qa:predeploy-production` | Vercel 13/13, Supabase 19/19 | 관찰됨 |
| local DB reset/seed | `supabase db reset` | migration 전량 적용, 신규 `20260825020000` 적용 | 관찰됨 |
| cashout와 보안 pgTAP | 대상 파일 2개 실행 | 88/88 | 테스트됨 |
| DB full regression | `supabase test db` | 10파일 260/260 | 테스트됨 |
| Edge Function regression | `deno test --allow-env supabase/functions/` | 58/58 | 테스트됨 |
| Web regression | `npm --prefix web test` | 41파일 263/263 | 테스트됨 |
| Next build | local Supabase 공개값으로 production build | compile, TypeScript, 정적 페이지 16/16 | 테스트됨 |
| curl health | bounded `next start`, `/api/health` | HTTP 200, status ok, database ok | 관찰됨 |
| 주요 API curl | local PostgREST `create_cashout_request` | HTTP 200, 27개 `REQUESTED`, 27,000원에서 2,970원 이용료, 792원 원천징수, 23,238원 실수령 | 관찰됨 |
| Playwright | `cashout-manual.spec.ts` | 12/12, 계좌 마스킹과 30개 수수료 기준 포함 | 관찰됨 |
| design-lint | `design-lint.sh web/src` | 인라인 style, 토큰 밖 hex 2종 검출 | FAIL |
| mobile typecheck / Maestro | 모바일 앱 없음 | 적용 대상 아님 | N/A |

## 5. 신설 검사와 배포 차단점

### 5.1 운영 환경변수

`scripts/qa/check-deploy-env.mjs`는 `process.env.*`와 `Deno.env.get(...)`을 코드에서 직접 추출한다. 미분류 env가 생기거나 대상 환경의 필수 이름이 없으면 non-zero로 종료한다. 값은 읽거나 출력하지 않는다.

- Vercel: `web`의 `prebuild`가 실제 build runtime env를 검사하므로 누락 시 build가 멈춘다.
- 수동 Production 점검: `npm --prefix web run qa:predeploy-production`이 Vercel과 Supabase metadata를 연속 확인하며 한 곳이라도 빠지면 멈춘다.
- CI: `qa-contracts` job이 코드 인벤토리와 계약, 변이 검사를 실행한다. CI에는 Production credential을 넣지 않으므로 실제 provider metadata는 배포 전 명령과 Vercel runtime gate가 담당한다.

### 5.2 DB와 화면의 판정 기준

`scripts/qa/check-cashout-layer-contract.mjs`는 최신 `create_cashout_request` migration을 찾아 다음을 함께 확인한다.

- 최소 기준은 총 보유 `v_total >= v_min`이다.
- 신청량은 1개 이상이고 지급가능액 `v_payable` 이하여야 한다.
- 화면은 `clover_eligibility`의 total, payable, reached 값을 사용한다.
- 1클로버 1,000원, 이용료 10%, VAT 10%, 원천징수 3.3%, 실수령 계산이 DB와 web에서 같다.

신규 migration은 예전의 `p_clover_amount < v_min` 선행 차단을 `p_clover_amount < 1`로 교정했다. 이 변경이 없으면 총 30개 중 지급가능 27개 신청이 DB 초입에서 실패한다.

### 5.3 알림 실패 관측

`deliverCashoutNotification`은 notify 호출 오류를 로그에 남기고 `notification`에 `channel=INAPP`, `alimtalk_status=FAILED`를 기록한다. 403을 포함한 실패가 0건과 구분된다.

`scripts/qa/check-cashout-notification-contract.mjs`는 실패 기록 호출과 실패 행 필드를 검사한다. `swallow-notify-failure` 변이는 기록 호출을 제거한 메모리상 소스로 실행했고 exit 1을 관찰했다.

## 6. 보존 회귀

- `supabase/tests/cashout_security_hardening.test.sql`은 수정하지 않았다.
- Playwright의 계좌 원문 비노출, 상태 및 이력의 마스킹 계좌 검증은 그대로 통과했다.
- 30개 기준 3,300원 이용료, 881원 원천징수, 25,819원 실수령 검증은 삭제하지 않았다. 기본 입력값 변경에 맞춰 30개를 명시 입력해 더 분명하게 고정했다.
- Deno withholding 기준값 5건과 DB cashout 수수료 단언도 통과했다.

## 7. 잔여 위험

1. 신규 migration은 로컬에서만 적용했다. 운영 DB schema와 production 첫 환전은 미검증이다.
2. Production env 이름은 모두 존재하지만 값의 유효성은 이번 검사 범위가 아니다. 값 확인은 secret 비노출 원칙 때문에 실제 기능 smoke로 별도 검증해야 한다.
3. 전역 design-lint 2종 위반이 남아 있어 QA gate는 changes-requested다.
4. 알림 403을 단위 테스트에서 관찰했지만 실제 Solapi 수신까지 이어지는 production 왕복은 미검증이다.

## 8. 셀프심문과 레드팀

**이 결론이 틀렸다면 가장 그럴듯한 이유는?** 환경변수 이름이 존재해도 값이 다른 프로젝트의 값이거나 만료됐을 수 있다. 그래서 env 존재 PASS를 알림 발송 완료로 확대하지 않았고, Production 실제 기능은 미검증으로 남겼다.

**회의적인 QA 리드의 공격:** 정규식 계약은 코드 모양만 검사하므로 실제 DB 동작을 보장하지 않는다. 방어는 local DB reset, 실제 pgTAP, PostgREST HTTP RPC, 브라우저 E2E를 함께 실행한 것이다. 반대로 Production DB는 쓰지 않았으므로 릴리즈 PASS는 금지했다.

## 9. 근거와 품질 푸터

벤치마크에서 차용한 것:

- Vercel 공식 CLI의 environment별 env 조회와 build/runtime 환경 구분을 따라 provider metadata 검사와 build runtime gate를 분리했다.
- Supabase 공식 local testing 권고를 따라 pgTAP을 local database에서 실행하고 Production DB 쓰기를 금지했다.
- PostgreSQL 함수 정의 조회 방식을 참고하되, 적용 전 migration이 검사를 피하지 않도록 저장소의 최신 함수 정의 migration을 진실원으로 택했다.

RUBRIC_SCORE: scope=5/5 evidence=5/5 traceability=5/5 risk=5/5 readability=4/5 total=24/25

WEAKEST_LINE: Production env 값의 유효성은 비노출 존재 검사만으로 증명할 수 없어 production 기능 smoke가 남는다.

SKILLS_USED: qa, 조사 순서와 실제 브라우저 회귀 및 증거 등급에 적용

SKILLS_SKIPPED: 없음

SOURCES: https://vercel.com/docs/cli/env; https://vercel.com/docs/environment-variables; https://vercel.com/docs/deployments/environments; https://vercel.com/docs/cli/pull; https://supabase.com/docs/guides/local-development/testing/overview; https://supabase.com/docs/guides/local-development/cli/testing-and-linting; https://supabase.com/docs/guides/functions/error-handling; https://supabase.com/docs/guides/functions/status-codes; https://www.postgresql.org/docs/current/functions-info.html; `/Users/sj/.claude/standards/dev.md`; `/Users/sj/.claude/standards/doc-review.md`; `/Users/sj/.claude/standards/qa-methodology.md`; `docs/requests/core-qa-recovery-request-2026-08-25.md`; `docs/test-plan.md`; `docs/qa-tracker.md`; `docs/구현현황.md`

MODEL: gpt-codex/gpt-5.6
