# 해낼게 V2 소셜 바이럴 루프 QA v1.0.0

> **최종 판정: ❌ NG.** 84개 계획 케이스 중 통과 47, 부분 8, 실패 2, 미검증 27이다. 전체 E2E, 1280px 실측, 승인 시안 전수 대조가 끝나지 않았고 D-019 계약 위반이 확인돼 배포 단계로 넘길 수 없다.

STAMP: 2026-10-13 18:04 KST | model gpt-5-codex | agent qa-verifier | skills qa | line v2 | 기반 포맷 `docs/qa/core-cashout-release-final-qa-v2-gpt-codex.md` | 승인 설계 `docs/eng-design/*-social-viral-loop-web-first-v1.1.0.md` | 고민: 테스트 총계가 아니라 케이스별 직접 증거와 미검증 범위를 분리했다.

## 바로가기

- [출고 게이트](#1-출고-게이트)
- [케이스별 판정](#2-케이스별-판정)
- [결함 목록](#3-결함-목록)
- [권한·보안 판정](#4-권한보안-판정)
- [환전 회귀](#5-환전-회귀)
- [디자인·뷰포트](#6-디자인뷰포트)
- [보장 범위](#7-이-qa가-보장하는-것과-보장하지-않는-것)

## 1. 출고 게이트

| 필수 항목 | 상태 | 종료 증거 또는 미충족 사유 |
|---|---|---|
| 신규 기능 해피·엣지 | ❌ 미충족 | 계획 84건 중 실패 2, 미검증 27. D-019 경계와 친구 상세 URL 일관성 결함이 남았다. |
| 누적 전체 리그레션 | ❌ 미충족 | Vitest 311/311, pgTAP 322/322, 환전 경쟁조건 2종은 통과. 전체 Playwright와 `REG-CASH-01`, `REG-PUB-03`은 미검증이다. |
| 승인 시안 대조 | ❌ 미충족 | `/my` 390px만 실제 관찰. 신규 화면 전수 및 1280px 대조가 미검증이다. 하단 탭 10px 대 13px는 결함이 아니라 미결 결정으로 분리했다. |

실행 기반 증거:

- Next production build: 17/17 route PASS, `/private/tmp/haenael-v2-web-build.log`.
- Web Vitest: 52 files, 311 tests PASS, `/private/tmp/haenael-v2-web-unit-rerun.log`.
- pgTAP: 18 files, 322 tests PASS, `/private/tmp/haenael-v2-pgtap.log`.
- miniapp: typecheck PASS, 2 files 9 tests PASS.
- local health: HTTP 200, `status=ok`, `database=ok`, `/private/tmp/haenael-v2-health.json`.
- 첫 production-mode E2E: 14건 중 2 PASS, 1 FAIL, 11 미실행. 로컬 Supabase를 production CSP가 차단해 `/my` console error 2건 발생.

## 2. 케이스별 판정

판정 기준: `통과`는 직접 실행 증거가 있는 경우, `부분`은 케이스 일부만 증명한 경우, `미검증`은 이번 QA에서 종단 실행하지 못한 경우다.

### 2.1 PostgreSQL, RLS, RPC, 업적

| 케이스 | 판정 | 실제 결과와 증거 |
|---|---|---|
| PG-01 | 통과 | local migration 후 신규 스키마 검사 pgTAP PASS. |
| PG-02 | 통과 | 신규 table RLS 활성 검사 PASS. |
| PG-03 | 통과 | SECURITY DEFINER와 search_path 검사 PASS. |
| PG-04 | 통과 | anon social RPC EXECUTE 차단 검사 PASS. |
| PG-05 | 통과 | 기존 목표 backfill 보존 검사 PASS. |
| PG-20 | 통과 | anon PUBLIC projection과 cache 경계 검사 PASS. |
| PG-21 | 통과 | ACTIVE 친구 PUBLIC·FRIENDS 가시성 검사 PASS. |
| PG-22 | 통과 | 비친구 friend RPC 차단 검사 PASS. |
| PG-23 | 통과 | REMOVED·BLOCKED 관계 상세 차단 검사 PASS. |
| PG-24 | 통과 | social JSON 금지 key recursive scan PASS. |
| PG-25 | 통과 | PRIVATE 전환 cache 삭제·cleanup queue 검사 PASS. |
| PG-30 | 통과 | ACTIVE 친구만 반환하는 목록 검사 PASS. |
| PG-31 | 통과 | 초대 token entropy와 rate limit 검사 PASS. |
| PG-32 | 부분 | valid·expired·used 분기는 pgTAP PASS. 실제 HTTP 200/410 응답은 미검증. |
| PG-33 | 통과 | 초대 수락 후 ordered pair 1행 검사 PASS. |
| PG-34 | 부분 | reason·count·wordmap projection은 PASS. Presigned URL 종단은 미검증. |
| PG-35 | 부분 | remove 상태 전이는 PASS. 브라우저 재조회 종단은 미검증. |
| PG-36 | 부분 | stable error와 관계 row 불변은 PASS. 화면 카드 분기는 미검증. |
| PG-37 | 통과 | 같은 actor replay 멱등성 검사 PASS. |
| PG-38 | 부분 | PRIVATE 초대 차단은 PASS. 기존 token의 실제 HTTP 410은 미검증. |
| PG-11 | 부분 | owner·preset allowlist는 PASS. 브라우저 round-trip은 미검증. |
| PG-12 | 부분 | owner/admin 외 DB read 차단은 PASS. Storage 직접 GET 종단은 미검증. |
| PG-13 | 통과 | approve·reject 상태와 public path 경계 검사 PASS. |
| PG-14 | 미검증 | 두 번째 승인 시 이전 asset `SUPERSEDED` 종단 케이스가 현 스위트에 없다. |
| PG-15 | 통과 | FRIENDS asset public path·public bucket 0 검사 PASS. |
| PG-16 | **실패** | raw object read RLS는 차단됐지만 authenticated RPC가 `cover_storage_path`를 반환한다. D-019의 Presigned URL-only 응답 계약 위반. |
| PG-40 | 통과 | preference 본인 upsert와 marketing default false 검사 PASS. |
| PG-MY-01 | 통과 | 프로필 집계 원장 대조 PASS. |
| PG-MY-02 | 통과 | ACTIVE 친구 수 집계 PASS. |
| PG-MY-03 | 통과 | CLOSED 목표 수 집계 PASS. |
| PG-MY-04 | 통과 | 받은 CONFIRMED 응원 수 집계 PASS. |
| PG-MY-05 | 통과 | welcome 응원 제외 집계 PASS. |
| PG-MY-06 | 통과 | ACTIVE 친구의 PUBLIC·FRIENDS 미응원 큐 검사 PASS. |
| PG-MY-07 | 통과 | amount·payment·cashout·supporter·rank·streak 금지 key 0 검사 PASS. |
| PG-MY-08 | 통과 | anon dashboard·attribution 접근 거부 검사 PASS. |

### 2.2 TypeScript 계약

| 케이스 | 판정 | 실제 결과와 증거 |
|---|---|---|
| CT-01 | 통과 | friend goals fixture 변환 Vitest PASS. |
| CT-02 | 통과 | friend detail reason·count·wordmap 변환 PASS. |
| CT-03 | 통과 | invite token·path·expiry 변환 PASS. |
| CT-04 | 미검증 | preset RPC argument 이름 전용 테스트 없음. |
| CT-05 | 미검증 | preference round-trip 전용 테스트 없음. |
| CT-06 | 통과 | preview 최소필드 초과 거부 PASS. |
| CT-07 | 통과 | accept stable error 카드 매핑 PASS. |
| CT-08 | 미검증 | remove confirm 취소 0회·확정 1회 전용 테스트 없음. |
| CT-09 | 통과 | visibility 이중 클릭 RPC 1회 PASS. |
| CT-10 | 미검증 | 5MB 경계·MIME spoof 단위 케이스 없음. |
| CT-11 | 미검증 | REVIEW finalize가 기존 cover를 보존하는 단위 케이스 없음. |
| CT-12 | 미검증 | admin reason code UI 전용 테스트 없음. |
| CT-MY-01 | 통과 | dashboard 3개 업적·큐 변환 PASS. |
| CT-MY-02 | 통과 | 필수 집계 필드 누락 거부 PASS. |

### 2.3 Playwright, 인증, 뷰포트

| 케이스 | 판정 | 실제 결과와 증거 |
|---|---|---|
| PW-01 | 미검증 | 로그인 `/me` 상단 알림·목표·4탭 동시 렌더를 이번 production-mode에서 끝까지 실행하지 못했다. |
| PW-02 | 통과 | 기존 목표 관리 화면 보존 E2E PASS. |
| PW-03 | 통과 | preset 변경·reload·public 동기화 선행 E2E PASS. |
| PW-04 | 통과 | custom upload REVIEW·기존 cover 유지 선행 E2E PASS. |
| PW-05 | 통과 | admin 승인 후 owner·public 반영 선행 E2E PASS. |
| PW-06 | 통과 | PUBLIC→FRIENDS→PRIVATE 접근행렬 선행 E2E PASS. |
| PW-07 | 통과 | anon public route sentinel 경계 선행 E2E PASS. |
| PW-08 | 미검증 | 친구 목록 정상·과다·overflow 종단 미실행. |
| PW-09 | 미검증 | 친구 0명 empty·초대 CTA 종단 미실행. |
| PW-10 | 미검증 | 초대 링크 생성·복사·7일 만료 종단 미실행. |
| PW-11 | 미검증 | 새 context 최소 preview·no-referrer 종단 미실행. |
| PW-12 | 미검증 | 비로그인 수락 후 동일 token 복귀 종단 미실행. |
| PW-13 | 미검증 | 수락 후 `/friends` 신규 친구 1명 종단 미실행. |
| PW-14 | 미검증 | 친구 목록 reload 보존 종단 미실행. |
| PW-15 | 미검증 | 친구 상세와 금액 text 0 종단 미실행. |
| PW-16 | 미검증 | 관계 해제 후 목록·직접 상세 차단 종단 미실행. |
| PW-17 | 미검증 | 만료·사용·자기초대 error card 종단 미실행. |
| AUTH-GOAL-01 | 통과 | 비로그인 목표 관리 권한없음·잠긴 탭 E2E PASS. |
| MY-01 | **실패** | 390px 화면은 데이터와 3개 업적을 렌더했으나 production CSP가 local Supabase를 차단해 console error 2건. |

### 2.4 동시성, Storage, 기존 기능 회귀

| 케이스 | 판정 | 실제 결과와 증거 |
|---|---|---|
| CC-01 | 통과 | 동일 token 동시 accept에서 success 1, blocked 1, connection 1 PASS. |
| CC-02 | 미검증 | 동일 actor 10회 동시 accept 미실행. |
| CC-03 | 미검증 | PRIVATE 전환과 detail 동시 경쟁 미실행. |
| ST-01 | 미검증 | upload 후 object missing 미실행. |
| ST-02 | 미검증 | MIME spoof와 quarantine cleanup 미실행. |
| ST-03 | 미검증 | public copy 실패 보상 경로 미실행. |
| ST-04 | 미검증 | DB commit 실패 후 orphan cleanup 미실행. |
| ST-05 | 미검증 | Storage delete 실패와 retry queue 미실행. |
| REG-CASH-01 | 미검증 | `cashout-manual.spec.ts` 파일 diff 0이나 이번 전체 Playwright는 미실행. |
| REG-CASH-02 | 통과 | `cashout_security_hardening.test.sql` 수정·삭제 0, pgTAP PASS. |
| REG-CASH-03 | 통과 | 27,000→23,238, 30,000→25,819, 40,000→34,426 포함 formula unit 10건 PASS. |
| REG-CASH-04 | 통과 | 요청 race와 지급 race 각각 success 1·blocked 1, 중복 원장 0 PASS. |
| REG-CASH-05 | 부분 | SQL masking 보호는 PASS. 실제 브라우저 masking snapshot은 이번에 미실행. |
| REG-PUB-01 | 통과 | PUBLIC projection amount 0 pgTAP PASS. |
| REG-PUB-02 | 통과 | owner 목표 관리의 기존 CheerList·SplitBalanceCard·MyLinkCard E2E PASS. |
| REG-PUB-03 | 미검증 | guest payment CTA와 success/fail return route 종단 미실행. |

**집계: 통과 47 / 부분 8 / 실패 2 / 미검증 27 / 전체 84.**

## 3. 결함 목록

| ID | 심각도 | 결함 | 재현 절차 | 근거 |
|---|---|---|---|---|
| QA-V2-SEC-01 | Critical | D-019 FRIENDS 커버의 private object path가 authenticated RPC JSON에 노출된다. 콘텐츠 직접 read RLS와 별개로 Presigned URL-only API 계약을 위반한다. | ACTIVE 친구 JWT로 `my_friend_goals()` 또는 `friend_goal_detail(goal_id)` 직접 호출 후 `cover_storage_path`를 확인한다. | `supabase/migrations/20261013050000_social_viral_loop_web_first.sql:199`, `:200`, `:236`, `:237`, `:523` |
| QA-V2-FLOW-01 | Major | URL의 `friendId`와 `goal` 소유자를 묶어 검증하지 않아 A의 이름으로 B 목표를 표시하고 관계 해제는 A에게 수행할 수 있다. | A·B 모두 ACTIVE 친구인 계정으로 `/friends/A?goal=<B-goal-id>` 진입 후 표시 이름과 목표 소유자를 비교하고 관계 해제를 누른다. | `web/src/app/(receiver)/friends/[friendId]/page.tsx:20`, `:27`, `:35`; `web/src/components/social/FriendGoalDetail.tsx:26` |
| QA-V2-QA-01 | Major | production-mode 로컬 QA에서 CSP가 local Supabase REST를 차단해 UI E2E가 console error로 중단된다. 배포 production origin 문제로 단정하지 않으며 QA 환경 parity 결함으로 분류한다. | production build를 local Supabase URL로 실행하고 `/my` 진입 후 console을 관찰한다. | `web/next.config.ts:5`, `:37`, `:41`; `/private/tmp/haenael-v2-social-e2e.log` |
| QA-V2-DEP-01 | Major | production dependency audit 4건, Next 16.3.3 direct critical 1건을 포함한다. | `cd web && npm audit --omit=dev --json` 실행 후 metadata와 direct dependency를 확인한다. | `web/package.json:30`; `/private/tmp/haenael-v2-npm-audit.json` |
| QA-V2-COVERAGE-01 | Major | 승인 test plan 84건 중 27건은 자동화·종단 증거가 없는데 선행 문서는 social Playwright 11/11을 전체 통과처럼 기록한다. | test plan ID 집합과 실제 spec title을 대조한다. | `docs/eng-design/test-plan-social-viral-loop-web-first-v1.1.0.md:117`; `docs/구현현황.md:14`; `docs/build-log.md:39` |
| QA-V2-COVER-ERR-01 | Minor | Presigned URL 생성 실패를 error 분기 없이 `cover_url=null`로 축약해 장애와 cover 없음이 구분되지 않는다. | Storage signed URL 생성을 실패시키고 친구 목록 응답을 관찰한다. | `web/src/lib/social/server.ts:15`, `:20` |
| QA-V2-PERF-01 | Minor | 친구와 목표 수 제한 없이 목표별 Storage signed URL을 병렬 발급해 데이터 증가 시 N개의 외부 호출이 발생한다. | 다수 친구·목표 fixture로 목록 요청 후 Storage 호출 수를 센다. | `web/src/lib/social/server.ts:36`, `:38`; migration `:177`, `:192` |
| QA-V2-DESIGN-01 | Minor | design lint가 8pt 밖 px, inline style, token 밖 hex 세 범주를 보고하지만 종료코드 0이라 CI가 위반을 놓칠 수 있다. | `bash ~/.claude/harness/bin/design-lint.sh web/src` 실행 후 출력과 종료코드를 비교한다. | `/private/tmp/haenael-v2-design-lint.log`; `web/src/app/globals.css:435` |

결함은 지시대로 수정하지 않았다.

## 4. 권한·보안 판정

- 비로그인 목표 관리: `AUTH-GOAL-01` 통과. 인증오류 원문을 노출하지 않고 권한없음 상태와 잠긴 하단 탭을 표시했다.
- 로그인 목표 관리: `PW-02` 통과. 기존 receiver 전용 UI가 보존됐다.
- 친구 목록·상세: DB의 ACTIVE·REMOVED·BLOCKED 경계는 통과했으나 브라우저 전수 분기는 미검증이다.
- D-019: private object 직접 read는 RLS로 차단되지만 RPC 응답이 object path를 반환하므로 실패다. Next server가 그 값을 Presigned URL로 바꾸는 것은 브라우저의 직접 RPC 호출 가능성을 제거하지 않는다.
- D-022: DB 응답의 업적은 달성 목표 수, 받은 확정 응원 수, ACTIVE 친구 수 3종이며 rank·streak·자기신고 key는 0건이다. `/my`에서도 이 3종만 관찰했지만 console error가 있어 `MY-01` 전체는 실패다.

## 5. 환전 회귀

- 보호 테스트 파일 2개의 `origin/main...HEAD` diff는 0이다. 테스트 삭제·skip·약화 증거는 없다.
- 계산식 unit 10건이 통과했고 기준값 3종이 정확했다.
- 요청·지급 경쟁조건에서 advisory lock, `REQUESTED` 조건, 진행중 요청 유일성이 유지됐다.
- 전체 `cashout-manual.spec.ts` Playwright 재실행은 하지 못했으므로 `REG-CASH-01`은 미검증, 브라우저 계좌 마스킹은 부분 판정이다.
- 운영 DB와 운영 환전 데이터에는 쓰지 않았다. migration 2건도 운영에 적용하지 않았다.

## 6. 디자인·뷰포트

| 화면·폭 | 판정 | 관찰 |
|---|---|---|
| `/my` 390px | 부분 | overflow 0, 13px 미만 0, 본문 중앙값 16px, 44px 미만 target 0, active state 100%. 다만 console error 2건으로 전체 실패. |
| 목표 상세, 친구 목록, 친구 상세, 초대 생성, 초대 수락, 커버 검수 390px | 미검증 | 승인 clean-frame 대 actual production 화면 전수 캡처 미실행. |
| 신규 화면 1280px | 미검증 | 실제 화면 overflow·console 실측 미실행. |
| 360·412·600·700·780·820·900·1000px | 미검증 | 모바일 ergonomics 전폭 측정 미실행. |

하단 탭 라벨은 **미결 결정**이다. 시안 10px는 디자인 정합성이 높지만 13px 미만 금지 기준을 위반한다. 구현 13px는 가독성 기준을 통과하지만 승인 시안과 3px 다르다. 어느 값도 이 QA에서 수정하거나 결함으로 확정하지 않았다.

상세 매트릭스: [`docs/qa/design-conformance-matrix.md`](design-conformance-matrix.md).

## 7. 이 QA가 보장하는 것과 보장하지 않는 것

보장하는 것: local migration 기준 DB 계약·RLS·집계 322건, Web unit 311건, miniapp 9건, 환전 계산과 동시성 불변식, `/my` 390px의 관찰된 크기 수치, 운영 DB 무쓰기와 테스트 파일 무변경을 보장한다.

보장하지 않는 것: 운영에 미적용인 migration의 실제 동작, 전체 Playwright, 신규 화면 전수 로그인·비로그인 플로우, 1280px와 나머지 모바일 폭, 실제 배포 URL의 시안 정합, 실제 Storage 실패 보상, 실제 결제 종단은 보장하지 않는다.

## 8. 벤치마크와 자체 검증

- Supabase 공식 Database Testing의 pgTAP·CI 권고를 케이스 기반 DB 검증 방식에 사용했다.
- Supabase Storage 공식 문서의 private bucket 접근 모델과 authenticated download 방식을 D-019 판정 기준에 사용했다. 제품 정본은 이보다 엄격한 ACTIVE 관계 재확인과 120초 Presigned URL을 요구하므로 정본을 우선했다.
- Playwright 공식 web-first assertion 원칙을 브라우저 종단 증거 기준에 사용했다. 실행되지 않은 케이스를 build·unit PASS로 대체하지 않았다.

셀프심문: 이 NG가 틀렸을 가능성은 선행 11/11 E2E가 미실행 27건을 다른 이름으로 이미 검증했을 경우다. 실제 spec title과 승인 test plan ID 집합을 대조해 그 가능성을 배제했다.

레드팀: 까다로운 릴리즈 관리자는 pgTAP 322와 Vitest 311을 근거로 통과를 요구할 수 있다. 그러나 D-019의 실제 응답 계약 위반, 27개 미검증, 전수 디자인 대조 부재는 필수 3게이트를 직접 깨므로 NG를 유지한다.

RUBRIC_SCORE: traceability=5/5 evidence=5/5 completeness=4/5 readability=4/5 risk=5/5 total=23/25
WEAKEST_LINE: 전체 Playwright와 실제 배포 URL 대조가 아직 없어 브라우저 종단 보장은 제한된다.

SKILLS_USED: qa, 케이스 기반 웹 QA·증거 등급·결함 기록에 사용
SKILLS_SKIPPED: review, 정적 5축 검토를 qa 절차 안에서 직접 수행해 별도 pre-landing review는 중복이라 생략
SOURCES/MODEL: gpt-5-codex | `pipeline-state.v2.md` | 승인 eng-design v1.1.0 5종 | `docs/build-log.md` | `docs/qa/qa-tracker.md` | 코드·migration·테스트 로그 | https://supabase.com/docs/guides/database/testing | https://supabase.com/docs/guides/storage/buckets/fundamentals | https://supabase.com/docs/guides/storage/serving/downloads | https://playwright.dev/docs/test-assertions
PRESENTATION_CHECK: 내부 태그 잔재 없음 확인, 렌더는 커밋 전 수행
KNOWLEDGE_QUERY: BRAIN business 바이럴·추천 루프와 QA 단계 입력, Supabase private Storage·pgTAP, Playwright assertion 공식 문서
HITS_USED: BRAIN의 신뢰 기반 바이럴 원칙은 D-019·D-022 공격 관점에 사용, 공식 문서는 DB·Storage·E2E 증거 기준에 사용
HITS_REJECTED: 마케팅 심리 문서는 제품 방향 변경 자료라 QA 판정에는 미채택, 일반 QA 블로그는 공식 문서보다 권위가 낮아 미채택
CONFLICTS: 일반 Supabase private bucket은 authenticated download를 허용할 수 있으나 제품 D-019는 ACTIVE 관계 재확인 후 Presigned URL-only로 더 엄격하므로 제품 정본을 우선
