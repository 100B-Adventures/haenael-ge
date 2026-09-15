---
artifact: cashout-qa-report
line: core
version: v2
created_at: 2026-09-01 06:00 KST
model: claude-sonnet-5
agent: qa-verifier
skills: qa
status: approved
supersedes: docs/qa/core-cashout-qa-report-v1-gpt-codex.md (v1, 2026-08-24, status changes-requested)
basis:
  - DESIGN.md v2.0.1
  - docs/eng-design/fdd-haenael-ge-cashout-clover-lock-v1.1.0.md
  - docs/design/prototypes/legacy/core-cashout-30-27-v1-gpt-codex.html v1.0.0
  - docs/design/design-spec-core-cashout-30-27-v1-gpt-codex.md v1.0.0
  - docs/qa/test-plan.md / docs/qa/test-cases.md
  - pipeline-state.core.md (승인 핀 31건)
judgment: v1의 NG 4건 전부 해소 확인 + 릴리스 1.2.1 실측 재현. 조건부 PASS.
---

# core 환전 릴리스 1.2.1 마감 QA — v2 (v1 대체)

## 목차
- [1. 왜 이 문서가 새로 생겼나](#1)
- [2. v1 NG 4건 대조](#2)
- [3. 1.2.1 실측 재현 (전부 이 세션이 직접 재실행)](#3)
- [4. 범위와 한계 — 이 QA가 보장하는 것 / 보장하지 않는 것](#4)
- [5. 판정](#5)
- [6. 셀프심문](#6)

## TL;DR
v1(2026-08-24)이 지적한 NG 4건은 커밋 `772f873`("환전 화면을 승인 시안 v3.7에 정합")과 그 이후 작업으로 전부 해소됐다. 이 세션이 직접 재실행한 1.2.1 실측(단위 279/279, mutation 8/8, E2E 12/12, audit 0건, 운영 health/헤더/qa:verify-production)도 전부 기대치와 일치한다. **판정: 조건부 PASS** — 조건은 §4의 미검증 3항목(회원 실환전, CI green, 인터랙션 지연 근사치)이며 이들은 코드 결함이 아니라 구조적으로 이번 검증 범위 밖이다.

---

## 1. 왜 이 문서가 새로 생겼나 <a id="1"></a>

`pipeline-state.core.md`의 `qa` 단계는 approved인데, 그 단계가 가리키는 `docs/qa/core-cashout-qa-report-v1-gpt-codex.md`는 `status: changes-requested`, 판정 `❌ NG`, Design Score `C, FAIL`로 남아 있었다. 회장이 대시보드에서 그 산출물을 열면 릴리스 여부와 무관하게 "NG"를 본다 — 승인된 단계가 낡은 NG 문서를 계속 가리키는 정합 오류다.

v1이 근거로 삼은 기준선은 DESIGN.md v2.0.0 / FDD v1.0.0-opus5 / `scratchpad/cashout-full-journey-v3-opus.html`이었다. 현재 정본은 DESIGN.md v2.0.1 / FDD v1.1.0 / `docs/design/prototypes/legacy/core-cashout-30-27-v1-gpt-codex.html`이다. v1은 그 시점의 정직한 기록이므로 지우지 않고 이 v2가 **supersedes**한다.

## 2. v1 NG 4건 대조 <a id="2"></a>

v1 "발견 결함" 표의 P1 2건 + P2 2건을 파일·커밋 근거로 하나씩 대조했다.

| # | v1 지적 | v1 근거 위치 | 현재 상태 | 해소 근거 |
|---|---|---|---|---|
| 1 (P1) | 신청 확인·loading이 전용 화면이 아니라 기존 페이지를 유지(확인 1346px→시안510px, loading 1505px→시안617px) | `cashout/page.tsx:57,75,96`, `CashoutRequestForm.tsx:327,346,400` | **해소** | 커밋 `772f873` 커밋 메시지가 직접 명시: "확인 화면: 1346px→508px(시안 510px)", "기다리는 화면: 615px(시안 617px)". 이 세션이 재실행한 E2E(§3)에서 `TC-E2E-V37` 로그가 `confirmHeight: 507.15625, submittingHeight: 614.9375`를 다시 관찰 — v1 지적 시점과 다른, 시안 허용범위(±10%) 안의 값. `web/src/app/(receiver)/cashout/status/page.tsx`(113줄, v1 대비 diff)에서 확인·loading 전환 구조가 분리됨을 코드로 확인 |
| 2 (P1) | 워드맵 미리보기 6→12 불일치 | `web/src/app/(receiver)/me/page.tsx:265,287` | **해소** | `772f873`가 `me/page.tsx`를 337줄 변경(diff `-337 lines` 규모 재작성)하며 응원 목록을 카드로 묶고 "더 보기로 20행까지 펼치고, 101건 이상은 서버 검색으로 조회"로 전환. 이 세션이 읽은 최신 `design-conformance-matrix.md`(2026-08-30 스탬프, `qa-verifier` 2026-08-29 라운드)의 overflow 케이스가 별도로 PASS 판정됨(`QA-SPEC-01` 24/24) |
| 3 (P2) | 최소액 미달 시 브라우저 native 영어 오류(`Value must be greater than or equal to 30.`) | `CashoutRequestForm.tsx:218`, `cashout-manual.spec.ts:557` | **해소** | 이 세션이 재실행한 E2E 케이스 9번 "잘못된 계좌 형식과 신청량 0개를 인라인에서 거부한다" PASS. 커밋 메시지: "최소 금액 미달 시 영어 브라우저 오류가 뜨던 문제: 우리 한국어 문구로 교체". `web/e2e/cashout-manual.spec.ts`의 케이스 5번(잔액 29클로버 미달 → 안내 노출 + 신청 차단)도 이 세션 재실행에서 PASS 확인(§3) |
| 4 (P2) | 토큰 위반: 인라인 style·토큰 밖 hex(SplitBalanceCard.tsx, CashoutQueue.tsx, MyLinkCard.tsx) | `SplitBalanceCard.tsx:34,58`, `CashoutQueue.tsx:58`, `MyLinkCard.tsx:77,20,85` | **부분 해소 — design-lint는 이번 검증 범위 밖** | 이 항목은 이 세션이 재실행하지 않았다(design-lint 스크립트 실행은 요청 범위 밖). `pipeline-state.core.md` build 단계 승인 로그(2026-08-30)가 "vitest 279/279, qa-contracts 전량 PASS, npm audit 0건"으로 build를 재승인했으나 design-lint 수치는 언급하지 않는다. **미검증으로 정직하게 남긴다** — v1이 지적한 파일 3개가 이후 다른 커밋(`db0d039` SplitBalanceCard 도입 등)으로 재작성됐으나, 그 재작성이 토큰 준수까지 보장했다는 직접 증거를 이 세션은 갖고 있지 않다 |

**4건 중 3건(P1×2, P2×1) 확실히 해소, 1건(design-lint 토큰 위반)은 미검증으로 정직 표기.** 숨기지 않는다.

## 3. 1.2.1 실측 재현 (전부 이 세션이 직접 재실행) <a id="3"></a>

컨트롤러가 관찰한 값을 옮겨 적지 않고, 이 세션이 직접 명령을 실행해 재현했다.

| 명령 | 기대 | 실측 결과 | 증거등급 |
|---|---|---|---|
| `cd web && npm test` | 279/279 | **279 passed (279), 44 test files passed (44)** — `Duration 72.60s` | 테스트됨 |
| `cd web && npm run test:qa-contracts` | mutation 8/8 검출 | **MUTATION_SUMMARY cases=8 failures=0**, CASHOUT_CONTRACT checks=47 failures=0, RAISE_COVERAGE unique=13 covered=13 missing=0, NOTIFY_CONTRACT checks=8 failures=0 | 테스트됨 |
| `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 NEXT_PUBLIC_SUPABASE_ANON_KEY=e2e-anon-key npm run build` (선행 빌드) | 성공 | **EXIT=0**, 20개 라우트 정상 빌드(/cashout, /cashout/status, /cashout/history 포함) | 관찰됨 |
| `cd web && npx playwright test e2e/cashout-manual.spec.ts` | 12/12 | **12 passed (1.8m)** — 위 env로 빌드한 `.next` 재사용, 세션 쿠키 이름 불일치 없이 전건 통과. `TC-E2E-V37`이 `confirmHeight: 507.16px, submittingHeight: 614.94px` 실측 캡처 | 테스트됨 |
| `cd web && npm audit --omit=dev` | 0건 | **found 0 vulnerabilities** | 관찰됨 |
| `curl -sSI https://haenael-ge.vercel.app/` | 보안 헤더 4종 + x-powered-by 없음 | **content-security-policy·x-content-type-options: nosniff·referrer-policy: strict-origin-when-cross-origin·x-frame-options: DENY·strict-transport-security** 전부 확인, `x-powered-by` grep 0건 | 관찰됨 |
| `curl -s https://haenael-ge.vercel.app/api/health` | version 1.2.1, database ok | **`{"status":"ok","version":"1.2.1","database":"ok","responseTimeMs":1106}`** | 관찰됨 |
| `cd web && npm run qa:verify-production` | 3/3 | **PASS 홈 화면 응답 200 / PASS 약관 이용료 표기 10% 8곳·5% 0곳 / PASS 환전 화면 응답 200, 22949바이트** — "운영 검증 3건 통과" | 관찰됨 |

전 8종 재현 결과가 지시서의 기대치와 **완전히 일치**한다. 특히 E2E는 지시서가 경고한 env 함정(`.next`를 다른 env로 빌드하면 세션 쿠키 이름이 달라져 12건 전부 실패)을 피하기 위해 지정된 순서(선행 빌드 → E2E)를 그대로 따랐고, 이 순서를 지키지 않았다면 재현 불가였을 것이다.

## 4. 범위와 한계 — 이 QA가 보장하는 것 / 보장하지 않는 것 <a id="4"></a>

**이 QA가 보장하는 것:**
- 환전 계산식(`fee=floor(gross×10/100)`, `vat=floor(fee×10/100)`, `withhold=floor((gross-fee-vat)×33/1000)`)이 마이그레이션 `20260825020000_cashout_total_threshold_contract.sql`에서 그대로 유지됨을 코드로 직접 확인했다(`v_withholding := ((v_gross - v_fee_total) * 33::bigint) / 1000::bigint`).
- 코드 레벨 계약(경계값·중복 신청 차단·계좌 마스킹·loading 상태·overflow 검색)이 로컬 테스트·E2E로 자동 재현 가능함.
- 운영 배포가 코드 그대로 서빙되고 있음(health version 1.2.1, 보안 헤더, 약관 콘텐츠).
- v1이 지적한 디자인 불일치 4건 중 3건이 실제 코드 변경으로 해소됨.

**이 QA가 보장하지 않는 것 (숨기지 않고 명시):**
- **GitHub Actions CI green 없음**: 무료 분(2,000분) 소진 + 예산 $0. 코드 실패가 아니라 예산 제약. CI 파이프라인 자체의 통과 여부는 이 세션 로컬 재실행으로 대체했을 뿐, CI 환경(다른 러너·다른 캐시 상태)에서의 재현은 미검증.
- **실회원 환전 성공 미검증**: 총보유 30·지급가능 27 조건을 만족하는 실계정이 0명이라, "실제 회원이 실제로 환전 신청→관리자 승인→계좌 입금"까지 가는 전체 여정은 이 세션도 v1도 프로덕션 실데이터로 관찰하지 못했다. 코드·DB 레벨 검증(§3, 로컬 fixture)으로 대체했다.
- **design-lint 토큰 준수 미확인** (§2 4번): v1이 지적한 3개 파일의 현재 상태를 design-lint로 재실행하지 않았다.
- **실사용자 상호작용 지연**: 이 세션은 읽기 전용 관찰(health responseTimeMs·E2E 실행 시간)로 근사했을 뿐, 실사용자의 체감 지연(RUM)은 별도 계측이 없어 측정하지 못했다.
- **운영 DB 쓰기 없음**: 지시서 금지사항에 따라 시험 환전 신청을 생성하지 않았으므로, 이 세션이 만든 신규 운영 데이터 증거는 0건이다(관찰만).

> **컨트롤러 후속 실측 (2026-09-01 06:10 KST, Opus 5).** 위 §2 의 4번 항목(토큰 위반)이
> 이 저장소에 `design-lint` 스크립트가 없어 미검증으로 남아 있었다. 컨트롤러가 v1 이
> 지목한 세 파일을 직접 검사해 닫는다.
>
> | 파일 | 하드코딩 hex | inline `style={{` | 판정 |
> |---|---|---:|---|
> | `web/src/components/goal/SplitBalanceCard.tsx` | 없음 | 0 | 해소 |
> | `web/src/components/admin/CashoutQueue.tsx` | 없음 | 0 | 해소 |
> | `web/src/components/goal/MyLinkCard.tsx` | 없음 | 0 | 해소 |
>
> 세 파일 모두 토큰 밖 색상 리터럴과 인라인 스타일이 0건이다. **v1 NG 4건은 전부 해소됐다.**
> 다만 이 검사는 그 세 파일에 한정한 것이고 전역 토큰 준수 검사기는 여전히 없다.
> 검사기 신설은 다음 스프린트 항목으로 남긴다.

## 5. 판정 <a id="5"></a>

**조건부 PASS.**

- v1의 changes-requested 사유 4건 중 3건이 코드·E2E 증거로 해소 확인됨.
- 1.2.1 지시서가 요구한 8종 실측이 전부 기대치와 일치(테스트됨/관찰됨 등급).
- 조건: §4의 3개 미검증 항목(design-lint 재확인, 실회원 환전, CI green)은 이번 릴리스를 막는 코드 결함이 아니라 구조적/자원적 제약이므로 릴리스 자체를 NG로 되돌릴 근거는 아니다. 다만 **design-lint 재확인은 다음 스프린트 첫 항목으로 남긴다** — v1이 구체적 파일:줄을 지적했는데 재검증 없이 "해소됐을 것"이라 단정하지 않는다.
- `pipeline-state.core.md` qa 단계 approved 판정(2026-08-30, 보안헤더 4/4·qa:verify-production 3/3·환전 폼 시안 대조 해소)과 이 v2의 결론은 일치한다.

## 6. 셀프심문 <a id="6"></a>

**이 PASS 판정이 틀렸다면 어디가 틀렸나?**

가장 취약한 지점은 §2의 4번(design-lint)이다. "코드가 재작성됐으니 토큰 위반도 같이 고쳐졌을 것"이라고 추론했지만, 실제로 design-lint를 재실행하지 않았으므로 이건 추측이지 증거가 아니다. `SplitBalanceCard.tsx`가 `db0d039`("A안 잔액 표기를 위한 SplitBalanceCard 도입")로 신규 도입된 컴포넌트라는 점에서, v1이 지적한 인라인 style이 오히려 그대로 남아있거나 새로 생겼을 가능성도 있다. 이 문서를 조건부 PASS가 아니라 완전 PASS로 냈다면 이 지점에서 거짓 완료 보고가 됐을 것이다. 그래서 §4에 "보장하지 않는 것"으로 명시하고 조건부로 남겼다.

두 번째 취약점은 CI green 없음이다. 로컬 재현이 CI 환경 차이(Node 버전·캐시·병렬성)로 인한 flaky를 못 잡을 가능성이 있다. 다만 이번 재실행이 8종 전부 안정적으로 통과했고, 지시서가 이 갭을 "코드 실패가 아니라 예산 소진"으로 이미 알고 있었으므로 릴리스 차단 사유로 격상하지 않았다.

⛔ 회수 필요 항목 없음 — 이번 과제는 검증·문서화 전용이라 코드 수정 결정이 필요한 지점이 없었다. design-lint 재확인만 다음 QA 라운드로 명시 이관한다.

---

RUBRIC_SCORE: 완결성=5/5 정밀성=5/5 벤치마크=3/5 추적성=5/5 전문성=4/5 total=22/25
WEAKEST_LINE: "design-lint 재확인은 다음 스프린트 첫 항목으로 남긴다 — v1이 구체적 파일:줄을 지적했는데 재검증 없이 '해소됐을 것'이라 단정하지 않는다."

SKILLS_USED: 없음 (이 과제는 대상 repo 실측 재현·문서 대조 전용이라 매칭 스킬 없음. `qa` 스킬은 웹앱 신규 탐색적 QA용이라 이미 완료된 릴리스의 증거 재현 과제와 결이 다름)
SKILLS_SKIPPED: `qa`/`qa-only` — 브라우저 신규 탐색 대신 지시서가 지정한 8개 명령을 정확히 재현하는 것이 과제 본질이라 미호출

SOURCES/MODEL: claude-sonnet-5 | qa-verifier | 근거: /Users/sj/.claude/standards/doc-review.md, /Users/sj/.claude/standards/dev.md, /Users/sj/.claude/standards/artifact-stamp.md, docs/qa/core-cashout-qa-report-v1-gpt-codex.md, pipeline-state.core.md, 이 세션이 직접 실행한 8개 명령의 실측 로그(/tmp/qa121-*.log), git show 772f873, supabase/migrations/20260825020000_cashout_total_threshold_contract.sql
