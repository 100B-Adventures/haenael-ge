# 해낼게 V2 소셜 바이럴 루프 QA 재검증 v1.0.0

> **최종 출고 판정: ❌ NG.** D-019 private path 차단, friendId-owner 404, production CSP, production dependency 취약점은 직접 재검증에서 해소됐다. 그러나 누적 전체 회귀가 Playwright 30 PASS / 18 FAIL / 15 SKIP이고, pgTAP도 18개 파일 중 1개가 fixture 제약 위반으로 중단됐다. 84개 승인 계획 중 27개 종단 케이스도 여전히 미검증이라 배포 단계로 넘길 수 없다.

STAMP: 2026-10-13 19:20 KST | model gpt-5-codex | agent qa-verifier | skill qa | line v2 | 기반 포맷 `docs/qa/v2-social-viral-loop-qa-v1.0.0-gpt-codex-20261013-1804.md` | 수정 입력 `docs/qa/v2-social-viral-loop-qa-fix-v1.0.0-gpt-codex-20261013-1847.md` | 고민: 수정 결함의 해소와 전체 출고 게이트를 분리해, 핵심 수정 PASS가 회귀 NG를 가리지 않게 했다.

## 바로가기

- [출고 게이트](#1-출고-게이트)
- [결함 ID별 재판정](#2-결함-id별-재판정)
- [실행 케이스](#3-실행-케이스)
- [전체 회귀 실패 분류](#4-전체-회귀-실패-분류)
- [390px·1280px 실측](#5-390px1280px-실측)
- [결함 목록](#6-결함-목록)
- [보장 범위](#7-이-qa가-보장하는-것과-보장하지-않는-것)
- [다음 실행](#8-다음-실행)

## 1. 출고 게이트

| 필수 항목 | 상태 | 종료 증거 또는 미충족 사유 |
|---|---|---|
| 신규 기능 해피·엣지 | ❌ 미충족 | 수정 핵심 3건과 social slice 14건은 PASS. 승인 계획 27건은 여전히 종단 미검증이다. |
| 누적 전체 리그레션 | ❌ 미충족 | Vitest 319/319 PASS. pgTAP 1개 파일 중단. Playwright 30 PASS / 18 FAIL / 15 SKIP. |
| 승인 시안 대조 | ❌ 미충족 | 390px·1280px 신규 화면 14장은 실측했으나 승인 clean-frame 전수 대조와 나머지 지원 폭은 미완료다. 하단 탭 10px 대 13px 결정은 보류 상태를 유지한다. |

### 실행 증거 요약

| 단계 | 결과 | 증거 |
|---|---:|---|
| production build | PASS | Next 16.4.0, 17/17 route, `/private/tmp/haenael-v2-reverify-build.log` |
| TypeScript | PASS | `npx tsc --noEmit`, `/private/tmp/haenael-v2-reverify-temp-tsc.log` |
| Web unit·integration | 53 files, 319 PASS | `/private/tmp/haenael-v2-reverify-unit-full.log` |
| targeted security·CSP unit | 3 files, 19 PASS | `/private/tmp/haenael-v2-reverify-unit.log` |
| PostgreSQL pgTAP | FAIL | 17 files OK, `social_web_first_cover.test.sql` 중단, overall 316 tests, `/private/tmp/haenael-v2-reverify-pgtap.log` |
| production-mode 전체 Playwright | FAIL | 30 PASS / 18 FAIL / 15 SKIP, 3.9분, `/private/tmp/haenael-v2-reverify-e2e.log` |
| social slice Playwright | 14/14 PASS | 위 전체 실행의 44~57번 케이스 |
| production dependency audit | PASS | 0 critical/high/moderate/low, `/private/tmp/haenael-v2-reverify-audit.json` |
| repo design token gate | PASS | 162 files, baseline 71, 신규 위반 0, `/private/tmp/haenael-v2-reverify-design-token.log` |
| 공유 design lint | 부분 | 3개 위반 범주 출력 후 exit 0, `/private/tmp/haenael-v2-reverify-design-lint.log` |
| 환전 보호 파일 diff | PASS | 기준 `f36cc66..HEAD`, 보호 파일 4종 diff 0, `/private/tmp/haenael-v2-reverify-cashout-diff.log` |
| pipeline artifact lint | PASS with warnings | 결손 0, exit 0. 미승인 QA 보고서 미핀·기존 슬롯키 관련 경고 8건, `/private/tmp/haenael-v2-reverify-artifact-lint.log` |

## 2. 결함 ID별 재판정

| 결함 ID | 재판정 | 실제 결과 | 근거 |
|---|---|---|---|
| QA-V2-SEC-01 | ✅ 해소 | ACTIVE 친구 RPC 2종에서 `cover_storage_path`, `quarantine_path`, 실제 private path가 모두 0건이다. private bucket 직접 download는 거부되고, 친구 화면은 120초 Presigned URL로 이미지를 HTTP 200 제공했다. 관리자 `admin_list_goal_covers`만 검수 대상 `quarantine_path`를 반환했다. | `QA-REVERIFY-SEC-01` PASS. `web/src/lib/social/server.ts:25`, `:105`, `:136`; migration `:195`, `:245`, `:487`. |
| QA-V2-FLOW-01 | ✅ 해소 | owner가 A와 B 모두 ACTIVE 친구인 상태에서 `/friends/A?goal=<B goal>`을 실제 호출하자 HTTP 404이고 detail component는 0건이었다. | `QA-REVERIFY-FLOW-01` PASS. `web/src/lib/social/server.ts:55`, `:65`; page `:33`, `:39`. |
| QA-V2-QA-01 | ✅ 원결함 해소, 전체 회귀 별도 NG | production build의 local Supabase 화면 14건에서 console error와 pageerror 0. CSP는 정확한 loopback origin만 추가하고 `'unsafe-eval'`은 없다. 외부 production allowlist는 기존 Supabase·Toss·Analytics로 유지됐다. | `QA-REVERIFY-VIEWPORT-01`, `security-headers-smoke` PASS. `/private/tmp/haenael-v2-reverify-csp.headers`; `web/next.config.ts:17`, `:30`, `:52`. |
| QA-V2-DEP-01 | ✅ 해소 | Next 16.4.0, production audit 취약점 총 0. | `web/package.json:30`; audit JSON. |
| QA-V2-COVERAGE-01 | 🔶 부분 해소, OPEN | 선행 문서의 과장 표현은 정정됐다. 실제 84개 계획은 현재 50 통과 / 7 부분 / 0 제품 실패 / 27 미검증으로, 출고 커버리지는 아직 부족하다. 전체 회귀의 시험결함도 별도로 열려 있다. | 승인 test plan과 직전 QA 84행 대조, 이번 신규 직접 증거 3건 반영. |
| QA-V2-COVER-ERR-01 | ✅ 코드·단위 해소 | Storage error, item error, URL 누락을 모두 `friend_cover_signing_failed`로 전파하는 unit이 PASS했다. 이번 정상 Presigned URL 실호출도 PASS했다. 강제 Storage 장애의 브라우저 종단은 미검증이다. | `web/src/lib/social/server.ts:103`~`:117`; targeted unit PASS. |
| QA-V2-PERF-01 | 🔶 부분 해소, OPEN | 목표별 N회 발급은 dedupe 후 `createSignedUrls` 1회로 바뀌었다. 다량 친구·목표 fixture에서 request count와 latency를 재지 않았다. | `web/src/lib/social/server.ts:95`~`:118`. |
| QA-V2-DESIGN-01 | 🔶 부분 해소, OPEN | repo 신규 token 위반은 0. 공유 lint는 8pt 밖 px·inline style·token 밖 hex 3종을 보고하면서 exit 0이라 차단 게이트로는 불충분하다. | design-token log, design-lint log. |

### D-019과 관리자 검수 함수 구분

- 친구용 계약: `my_friend_goals`, `friend_goal_detail`, 최종 page props에는 private object path가 없다. 서버가 매 요청 ACTIVE 관계, expected friend owner, 목표 visibility, approved asset binding을 재검증한 뒤 Presigned URL만 만든다.
- 관리자 계약: `admin_list_goal_covers`는 `is_admin()`을 먼저 검사한 뒤 검수할 private object의 `quarantine_path`를 반환한다. 관리자 검수 함수의 path 반환은 정상이며, 친구용 응답 누출과 같은 결함으로 세지 않았다.

## 3. 실행 케이스

| 케이스 번호 | 무엇을 확인 | 조건·절차 | 기대 | 실제 | 판정 | 증거 |
|---|---|---|---|---|---|---|
| QA-REVERIFY-SEC-01 | D-019 client 계약과 admin 계약 분리 | FRIENDS approved asset 생성, friend RPC 2종·직접 download·친구 화면·admin RPC 호출 | friend path 0, direct read 차단, signed URL 200, admin path 존재 | 기대와 동일 | ✅ | Playwright 1.9초 PASS |
| QA-REVERIFY-FLOW-01 | friendId-owner binding | 서로 다른 친구와 목표를 URL에서 조합 | HTTP 404 | HTTP 404, detail 0 | ✅ | Playwright 1.1초 PASS |
| QA-REVERIFY-CSP-01 | production CSP | production build의 `/my` header와 외부 URL unit 검사 | loopback만 조건부 추가, unsafe-eval 0, 외부 allowlist 불변 | 기대와 동일 | ✅ | header 원문 + security unit 6 PASS |
| QA-REVERIFY-VIEWPORT-01 | 신규 화면 390·1280 | 로그인 5화면, 비로그인 초대 수락, 관리자 검수 | HTTP 200, console/pageerror 0, overflow 0 | 14/14 조합 통과 | ✅ | Playwright 12.3초 PASS, PNG 14장 |
| QA-REVERIFY-DEP-01 | production dependency | `npm audit --omit=dev --json` | total 0 | total 0 | ✅ | audit JSON |
| QA-REVERIFY-REG-UNIT-01 | 전체 Web 단위·통합 | `npm test` | 0 fail | 319/319 PASS | ✅ | unit full log |
| QA-REVERIFY-REG-DB-01 | 전체 DB | `supabase test db` | 18 files 전체 PASS | cover fixture가 2/9 뒤 중단 | ❌ 시험결함 | pgTAP log |
| QA-REVERIFY-REG-E2E-01 | 전체 브라우저 회귀 | production-mode `playwright test` | 0 fail, 계획된 skip만 | 30 PASS / 18 FAIL / 15 SKIP | ❌ | E2E log |

승인 계획 84건 집계는 직전 `47 통과 / 8 부분 / 2 실패 / 27 미검증`에서 PG-16, PG-34, MY-01의 직접 증거가 보강돼 `50 통과 / 7 부분 / 0 제품 실패 / 27 미검증`이다. 이 숫자는 전체 Playwright와 pgTAP이 green이라는 뜻이 아니다. 회귀 스위트 자체의 시험결함은 아래 별도 결함으로 관리한다.

## 4. 전체 회귀 실패 분류

| 실패 묶음 | 수 | 분류 | 이번 릴리즈 영향 |
|---|---:|---|---|
| `cashout-manual.spec.ts` | 12 | 시험결함 | spec이 `next start` 런타임 env로 mock Supabase URL을 바꾸려 하지만 `NEXT_PUBLIC_*`는 production build에 고정된다. 인증이 빠져 12건 모두 landing 화면에서 실패했다. 환전 제품 동작을 검증하지 못했으므로 회귀 게이트 차단. |
| `cheer-payment.spec.ts` | 2 | 조건미비 | 기본 slug `knirdtaq`에 대응하는 local seed가 없어 CTA를 찾지 못했다. 실제 결제 회귀 판정 불가. |
| `multi-goal.spec.ts` | 2 | 시험결함 | 인증 cookie를 `http://localhost:3000`에 고정했지만 실행 base URL은 `127.0.0.1:3472`여서 로그인 모달로 떨어졌다. 제품 결함으로 단정하지 않으나 회귀 미증명. |
| `production-auth-readonly.spec.ts` | 1 | 조건미비 | 운영 read-only credential 5종 미주입. 운영 DB 쓰기는 하지 않았고, 이 케이스는 명시적으로 FAIL 처리됐다. |
| `release-v1.spec.ts` | 1 | 시험결함 | health 실제 version은 1.2.1인데 테스트가 1.0.0을 고정 기대한다. |
| `social_web_first_cover.test.sql` | 1 file | 시험결함 | line 28의 `APPROVED` fixture에 `reviewed_by`, `reviewed_at`이 없어 현행 state constraint에서 INSERT가 중단된다. 9개 중 2개만 실행됐다. |

제품결함으로 확정한 신규 건은 0개다. 하지만 실패가 타 라인 또는 시험 코드 소유라고 해서 릴리즈 영향이 사라지지는 않는다. 전체 회귀가 실제 제품 동작을 증명하지 못했으므로 QA PASS는 금지한다.

## 5. 390px·1280px 실측

| 화면 | 390px | 1280px | 증거 |
|---|---|---|---|
| 목표 상세 | overflow 0, console/pageerror 0 | overflow 0, console/pageerror 0 | `390-goal-detail.png`, `1280-goal-detail.png` |
| 친구 목록 | overflow 0, console/pageerror 0 | overflow 0, console/pageerror 0 | `390-friends.png`, `1280-friends.png` |
| 친구 상세 | overflow 0, console/pageerror 0 | overflow 0, console/pageerror 0 | `390-friend-detail.png`, `1280-friend-detail.png` |
| 초대 생성 | overflow 0, console/pageerror 0 | overflow 0, console/pageerror 0 | `390-invite-create.png`, `1280-invite-create.png` |
| 초대 수락, 비로그인 | overflow 0, console/pageerror 0 | overflow 0, console/pageerror 0 | `390-invite-accept.png`, `1280-invite-accept.png` |
| 마이페이지 | overflow 0, console/pageerror 0 | overflow 0, console/pageerror 0 | `390-my.png`, `1280-my.png` |
| 커버 검수, 관리자 | overflow 0, console/pageerror 0 | overflow 0, console/pageerror 0 | `390-cover-review.png`, `1280-cover-review.png` |

증거 디렉터리: `docs/qa/evidence/v2-social-viral-loop-reverify-v1/`.

하단 탭 라벨은 결함 판정에서 제외했다. 구현 13px는 `13px 미만 0` 가독성 기준을 통과하지만 승인 시안 10px와 불일치한다. 10px는 시안 일치, 13px는 가독성 통과라는 기존 미결 결정을 그대로 유지했고 값을 바꾸지 않았다.

## 6. 결함 목록

| ID | 심각도 | 상태 | 결함 | 재현 절차 | 근거 파일:줄 |
|---|---|---|---|---|---|
| QA-V2-COVERAGE-01 | Major | OPEN | 승인 계획 84건 중 27건의 종단 증거가 없다. 문서 과장은 수정됐지만 출고 커버리지는 미달이다. | test plan 84개 ID와 실행 증거를 대조한다. | `docs/eng-design/test-plan-social-viral-loop-web-first-v1.1.0.md:117`; 수정 보고 §4 |
| QA-V2-REGTEST-01 | Major | OPEN | production-mode 전체 Playwright가 18 FAIL, 15 SKIP이라 누적 회귀를 증명하지 못한다. | local production build + local Supabase에서 전체 `playwright test` 실행. | `web/e2e/cashout-manual.spec.ts:465`; `cheer-payment.spec.ts:11`; `multi-goal.spec.ts:71`; `production-auth-readonly.spec.ts:109`; `release-v1.spec.ts:5` |
| QA-V2-DBTEST-01 | Major | OPEN | 전체 pgTAP이 cover fixture state constraint 위반으로 중단된다. | local DB에서 `supabase test db` 실행. | `supabase/tests/social_web_first_cover.test.sql:28`; migration `goal_cover_asset_state_check` |
| QA-V2-PERF-01 | Minor | OPEN | batch 1회 구현은 확인했지만 대량 fixture의 request count·latency는 미측정이다. | 목표가 많은 친구 목록을 만들고 Storage 요청 수와 응답 시간을 잰다. | `web/src/lib/social/server.ts:95`~`:118` |
| QA-V2-DESIGN-01 | Minor | OPEN | 공유 design lint가 3종 위반을 출력하고도 exit 0이다. | `bash ~/.claude/harness/bin/design-lint.sh web/src` 실행. | `web/src/app/globals.css:435`; design-lint log |

결함은 지시대로 수정하지 않았다. 이번 변경은 재현용 QA 케이스, 증거 PNG, tracker와 보고서뿐이다. 운영 배포, 운영 DB migration, 운영 환전 데이터 쓰기, 테스트 환전 요청 생성은 하지 않았다.

## 7. 이 QA가 보장하는 것과 보장하지 않는 것

보장하는 것: local production-mode에서 D-019 친구 응답에 private path가 없고 ACTIVE 관계 재확인 뒤 Presigned URL만 전달되는 것, 관리자 검수 함수만 private path를 받는 것, friendId-owner 불일치가 실제 HTTP 404인 것, 지정된 7화면이 390px·1280px에서 overflow와 console/pageerror 없이 렌더되는 것, production CSP가 임의 외부 Supabase origin이나 unsafe-eval을 허용하지 않는 것, production dependency audit이 0인 것을 보장한다.

보장하지 않는 것: 운영 DB에 미적용인 두 migration의 운영 동작, 27개 미검증 계획 케이스, 실패한 환전·결제·다중 목표 E2E의 제품 동작, 운영 인증 read-only 경로, 모든 지원 viewport의 ergonomics, 승인 clean-frame 전수 일치, 대량 친구 성능을 보장하지 않는다.

## 8. 다음 실행

| 소유자 | 실행 | 종료 증거 | 외부 회수 시점 |
|---|---|---|---|
| code-builder | `social_web_first_cover` APPROVED fixture를 현행 constraint에 맞추고, cashout production build fixture·multi-goal cookie origin·cheer seed·release version assertion을 테스트 계약에 맞게 정비한다. 제품 로직은 바꾸지 않는다. | pgTAP 18/18 files PASS, 전체 Playwright 63건에서 FAIL 0, 계획된 SKIP의 사유·소유자 명시 | 제품 로직 변경이 필요하다는 재현이 나올 때 QA에 반려. 운영 credential이 필요한 read-only 케이스만 controller가 별도 안전 경로로 회수 |
| qa-verifier | 위 수정 후 전체 pgTAP·Playwright와 미검증 27건을 재실행한다. | 기능 해피·엣지, 누적 전체 회귀, 승인 시안 대조 3게이트 모두 충족 | 세 게이트 green 후에만 `/approve` 판단 요청 |
| release-manager | 현재는 실행 금지 | QA approved + release manifest 정합 + 운영 migration 계획 승인 | 회장 승인 전 운영 DB 적용·배포 금지 |

## 9. 벤치마크와 자체 검증

[모델] gpt-5-codex

- 벤치마크 소스 1: [Supabase private Storage downloads](https://supabase.com/docs/guides/storage/serving/downloads). private bucket은 signed URL 또는 authenticated download로 제공할 수 있다. 제품 D-019는 이보다 엄격한 Presigned URL-only 계약이므로 제품 정본을 우선했다.
- 벤치마크 소스 2: [Supabase createSignedUrl API](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl). 만료시간이 있는 signed URL과 batch API의 실동작 판정에 사용했다.
- 벤치마크 소스 3: [Next.js headers API](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers). production response CSP header 관찰과 static unit을 함께 증거로 사용했다.
- 참고 소스 4: [npm audit CLI](https://docs.npmjs.com/cli/v11/commands/npm-audit/). production dependency 취약점 0과 exit 0을 판정 기준으로 사용했다.

셀프심문: 핵심 수정이 PASS인데 최종 NG가 과도할 수 있다. 그러나 출고 필수 조건은 수정 범위 선별 테스트가 아니라 누적 전체 회귀와 디자인 전수 대조다. 실제 전체 실행이 red이고 27건이 미검증이므로 NG를 유지한다.

레드팀: 까다로운 릴리즈 관리자는 18개 실패가 모두 시험결함·조건미비이니 제품은 출고 가능하다고 주장할 수 있다. 시험이 제품 동작을 증명하지 못한 상태는 제품 정상의 증거가 아니며, 특히 환전·결제·인증 경로가 포함돼 있어 실패를 제거하거나 독립 증거로 대체하기 전 출고할 수 없다.

RUBRIC_SCORE: traceability=5/5 evidence=5/5 completeness=4/5 readability=4/5 risk=5/5 total=23/25
WEAKEST_LINE: 승인 계획 27건과 clean-frame 전수 대조가 남아 전체 제품 정상성을 보장하지 못한다.

SKILLS_USED: qa, production-mode 웹 플로우·권한 경계·회귀·뷰포트 증거 수집과 결함 분류에 사용
SKILLS_SKIPPED: review, 이번 작업은 수정 없는 독립 QA 재검증이며 정적 5축 결과는 직전 QA를 승계해 별도 pre-landing review를 중복 실행하지 않음
SOURCES/MODEL: gpt-5-codex | `pipeline-state.v2.md` | 승인 eng-design v1.1.0 5종 | 수정 보고 | migration·server·page·test 코드 | local 실행 로그 | Supabase·Next.js·npm 공식 문서
PRESENTATION_CHECK: 내부 태그 잔재 없음 확인, Markdown 웹 렌더 후 허브에서 열 수 있게 제출
KNOWLEDGE_QUERY: BRAIN business index에서 해낼게 바이럴·공유 신뢰 경계를 조회하고, Supabase private Storage signed URL, Next.js CSP headers, npm audit 공식 문서를 조회
HITS_USED: BRAIN의 신뢰 훼손 방지 원칙을 D-019 공격 관점에 사용했고, 공식 문서를 signed URL·CSP·dependency 판정 기준에 사용
HITS_REJECTED: 마케팅 전환 최적화 자료는 승인 설계를 바꾸는 내용이라 QA 판정에 미채택, 비공식 보안 블로그는 공식 문서보다 권위가 낮아 제외
CONFLICTS: Supabase 일반 계약은 authenticated download도 허용하지만 D-019는 ACTIVE 관계 재확인 뒤 Presigned URL-only로 더 엄격하므로 제품 정본을 우선
판단: 핵심 수정 4건은 해소로 닫되, 전체 회귀 red와 27개 미검증을 별도 출고 차단 사유로 유지했다. 선별 14/14 PASS를 전체 63건 또는 계획 84건 PASS로 확대 해석하지 않았다.
병목: 공용 슬롯은 20초 안에 확보돼 병목이 아니었다. 실제 병목은 기존 전체 회귀가 서로 다른 build-time env·cookie origin·seed 계약을 가정해 한 production build에서 18건 실패한 점이다.
