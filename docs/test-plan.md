# Test Plan: 해낼게 운영 v1.0.0

> 기준 시각: 2026-08-29 04:54 KST
> 상류: PRD v0.4.0, DESIGN v2.0.1, user-flow v0.3.1, FDD cashout v1.1.0, API contract v1.0.0.
> 완료 규율: build, unit, contract, DB, E2E, production observation은 서로 다른 증거다. 실행하지 않은 경로는 미검증이라고 쓴다.

## 목차

- [1. Test layers](#1-test-layers)
- [2. Required commands](#2-required-commands)
- [3. Cashout contract gate](#3-cashout-contract-gate)
- [4. Payment gate](#4-payment-gate)
- [5. Receiver flow gate](#5-receiver-flow-gate)
- [6. Friend flow gate](#6-friend-flow-gate)
- [7. Notification gate](#7-notification-gate)
- [8. Production read-only gate](#8-production-read-only-gate)
- [9. Recovery and mutation gate](#9-recovery-and-mutation-gate)
- [10. Release blockers](#10-release-blockers)
- [11. Current verification boundary](#11-current-known-verification-boundary)
- [12. Self-check and red-team](#12-self-check-and-red-team)
- [13. Benchmark](#13-benchmark)

## 1. Test layers

| layer | tool | validates | does not prove |
|---|---|---|---|
| Static contract | custom Node scripts | env inventory, layer constant, RAISE reachability, notification recording | DB execution, browser rendering |
| Unit/component | Vitest, Testing Library | input, state, copy, action mapping | real Postgres locks, provider integration |
| DB integration | local Supabase, pgTAP | RLS, RPC errors, ledger, encryption, state transition | Vercel runtime, browser |
| Concurrency | psql shell processes | double request/paid race | UI locking |
| Browser | Playwright | route, render, interaction, no-dead-end | production write unless explicitly approved |
| Build | Next build | compile and route generation | runtime behavior |
| Production read-only | health + auth Playwright | deployed version, DB reachability, authenticated read path, zero forbidden writes | cashout write success |

## 2. Required commands

```text
cd web && npm test -- --run
cd web && npm run build
cd web && npm run test:qa-contracts
supabase db reset
supabase test db
bash supabase/tests/concurrency/cashout_double_request_race.sh
bash supabase/tests/concurrency/cashout_double_paid_race.sh
cd web && npm run test:e2e
cd web && npm run qa:verify-production
cd web && npm run qa:verify-production:auth
```

Provider와 secret이 필요한 명령은 값 원문을 로그에 출력하지 않는다. 운영 쓰기 검증은 별도 승인이 없으면 실행하지 않는다.

## 3. Cashout contract gate

### 3.1 Threshold and amount

- total 29: 신청 거부.
- total 30, welcome 3, payable 27: 27 신청 성공.
- 같은 조건 28 신청: 잔액 부족 거부.
- total 30, payable 0: threshold true, 신청 CTA disabled.
- 신청 하한은 1, 자격 기준은 total 30. 같은 상수로 구현하지 않는다.

### 3.2 A1 ledger

- REQUESTED: HOLD delta 0, total unchanged, locked N.
- REJECTED: REVERSAL delta 0, total unchanged, locked 0.
- PAID: SETTLED delta -N, total exactly N 감소.
- PAID before/after: SETTLED snapshot, live balance 역산 금지.

### 3.3 Identity policy

- KYC 기록 없음: 신청 통과.
- 최신 KYC `is_adult=true`: 신청 통과.
- 최신 KYC `is_adult=false`: `cashout_minor_not_allowed`.
- 이전 미성년 뒤 최신 성인: 최신 결과가 이긴다.
- PASS UI 선행을 요구하는 테스트를 만들지 않는다. PASS는 현재 신청 전제 계약이 아니다.
- PRD §10.3 지급 단계 신원정보는 수집 주체와 데이터 처리 계약이 정해질 때까지 테스트 구현을 시작하지 않는다.
- 직접 수집을 고르면 최소수집, 전송·저장 암호화, key custody, 운영자 권한과 열람 감사, 보존·파기, 실패 복구를 각각 검증한다.
- 수탁사 직접 수집을 고르면 원문 미유입, provider token과 상태, callback/webhook 무결성, 수탁사 파기 증거를 검증한다.

### 3.4 Security and concurrency

- anon과 타 회원 RPC 거부.
- create request browser EXECUTE 거부.
- 같은 request key, 같은 fingerprint replay.
- 같은 key, 다른 fingerprint conflict.
- 회원 동시 신청 한 건만 성공.
- 같은 요청 동시 지급 한 건만 성공.
- 계좌 열람 10분 gate, actor match, 파기 gate.
- 계좌 원문은 status/history/list에 없음.

상세 case ID는 `docs/test-cases.md` §1~4가 정본이다.

## 4. Payment gate

| ID | case | expected |
|---|---|---|
| PAY-01 | guest 3,000 KRW happy | payment DONE, cheer CONFIRMED, EARN once, success UI |
| PAY-02 | 999 KRW | reject before provider charge |
| PAY-03 | anonymous | public identity hidden, owner semantics preserved |
| PAY-04 | message omitted | payment success, wordmap count behavior stable |
| PAY-05 | card/provider failure | failure reason and retry path |
| PAY-06 | double tap | single order/payment/EARN |
| PAY-07 | success URL amount tamper | server rejects mismatch |
| PAY-08 | provider success, DB failure | compensation or reconciliation marker |
| PAY-09 | webhook replay | idempotent state |
| PAY-10 | public view | no individual amount or private identifiers |

실 Toss stage 결제 없이 PAY happy를 완료로 선언하지 않는다. mock Playwright는 UI contract 증거다.

## 5. Receiver flow gate

- write-first draft survives canceled or failed login.
- Kakao login creates/updates member and goal.
- goal slug and share guidance appear.
- `/` with session routes to `/me` as specified.
- owner bar appears only to goal owner.
- `/me` empty, error, loading have next action.
- owner cheer list shows clover count without KRW and without ranking.
- wordmap full view and share actions have fallback.
- goal deletion or closed state has a recovery route.

## 6. Friend flow gate

- `/g/[slug]` works without login.
- empty, few, default, closed, deleted, invalid slug states render.
- CTA opens amount/message/anonymous flow.
- payment pending disables duplicate interaction.
- success confirms delivery and provides subtle onboarding transition.
- failure provides retry and alternative method.
- report sheet submits goal/cheer report without exposing secrets.

## 7. Notification gate

- CHEER_RECEIVED, CASHOUT_REQUESTED, CASHOUT_PAID type contract.
- phone present and template accepted: ALIMTALK SENT.
- phone absent, opt-out, provider failure: INAPP fallback or FAILED observation according to contract.
- notify 403 is not treated as zero rows or success.
- notification failure after cashout commit does not retry or duplicate the cashout.
- amount does not appear in public or marketing message.

## 8. Production read-only gate

Raw request `docs/requests/core-production-auth-e2e-request-2026-08-27.md` is authoritative.

| request | proof |
|---|---|
| QA-PROD-AUTH-01 | real production login session, `/cashout` 200, no redirect loop |
| QA-PROD-AUTH-02 | product member and cashout snapshots unchanged, forbidden write count 0 |
| QA-PROD-AUTH-03 | credential file mode and secret surfaces checked without value output |
| QA-PROD-AUTH-04 | public home, terms, cashout route probes |
| QA-PROD-AUTH-05 | cashout write and Alimtalk boundary remains unexecuted unless approved |
| QA-PROD-AUTH-06 | production run must not write or commit. It is not a requirement for daily automated execution |

The production auth spec must abort if it detects `create_cashout_request` or other forbidden mutation. No `member` bootstrap row is created for the QA auth user.

## 9. Recovery and mutation gate

Raw request `docs/requests/core-qa-recovery-request-2026-08-25.md` maps as follows.

| request | executable gate |
|---|---|
| QA-RECOVERY-01 | `check-deploy-env.mjs` static and provider presence check |
| QA-RECOVERY-02 | `check-cashout-layer-contract.mjs` and local 30/27 PostgREST |
| QA-RECOVERY-03 | pgTAP new user, latest function RAISE paths |
| QA-RECOVERY-04 | notification 403 observation tests |
| QA-RECOVERY-05 | account masking and 10% fee/VAT/3.3% calculation |
| QA-RECOVERY-06 | `run-contract-mutations.mjs` must make seeded defects fail |

Mutation tests prove the gate detects changes such as min request 30, payable omission, swallowed notification error, or missing required env. A suite that still passes those mutations is not a valid gate.

## 10. Release blockers

| blocker | status condition |
|---|---|
| Build | Next build nonzero or route generation error |
| Unit | any Vitest failure |
| Contract | any QA contract or mutation failure |
| DB | pgTAP failure or RLS/privilege drift |
| Concurrency | more than one request, HOLD, PAID, or SETTLED |
| Browser | happy or specified edge path broken |
| Design conformance | 30/27 copy, A1 lock language, overflow, accessibility mismatch |
| Production | canonical health not versioned/DB ok, auth readonly path fails, write detected |
| CI | latest required workflow unavailable or red. Minutes exhaustion remains external blocker |
| 지급 신원정보 | PRD §10.3의 수집 주체·최소 필드·저장·접근·보존·파기·실패 상태 중 하나라도 미결정 |

## 11. Current known verification boundary

- Local build and Vitest can prove repository state.
- Local DB and contract tests can prove migration behavior.
- Production health and authenticated readonly E2E can prove deployment read surface.
- No natural production account currently has total 30/payable 27. Production cashout write is therefore unverified and must not be fabricated.
- `cashout-payout` is 501. Automatic payout cases are excluded, not PASS.
- 지급 단계 주민등록번호·신원·세무정보는 설계 gap 1건이다. "제품 저장 0"은 결정되지 않았으며, 관련 개인정보 경로는 build와 QA 진입 불가다.

## 12. Self-check and red-team

This plan could be wrong if it treats a list of tests as evidence. The plan is only the contract. `docs/qa-tracker.md` must attach current command outputs and timestamps.

Red-team attack: read-only production E2E can pass while the write RPC is broken. Correct. It is intentionally a non-destructive production check. Write confidence comes from production migration parity, function dump, local PostgREST/pgTAP, and the explicit remaining unverified label. It does not become a production write PASS.

## 13. Benchmark

- [Supabase testing](https://supabase.com/docs/guides/local-development/testing/overview): local database and function testing separated from production.
- [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html): concurrency tests must use separate sessions.
- [Stripe idempotency](https://docs.stripe.com/api/idempotent_requests): replay and parameter mismatch are distinct cases.

---

🏷 STAMP | line: core | 생성: 2026-08-29 04:54 KST | model: gpt-5.6-sol | agent: tech-architect
skills: 없음 | 근거: raw QA requests, FDD v1.1.0, actual test assets and scripts
고민: production write를 하지 않는 요청을 daily execution으로 변조한 과거 문구를 제거하고 zero-write safety contract로 복원했다.

SKILLS_USED: 없음
SKILLS_SKIPPED: test-plan 전용 스킬이 없어 개발 품질헌법과 실제 자동화 자산으로 설계했다.

RUBRIC_SCORE: 완결성=5/5 정밀성=5/5 벤치마크반영=4/5 추적성=5/5 전문성·톤=5/5 total=24/25
WEAKEST_LINE: 지급 단계 신원정보 처리 결정 전에는 관련 보안·파기 테스트의 실제 endpoint와 저장소를 지정할 수 없다.

SOURCES/MODEL: gpt-5.6-sol | `docs/requests/core-production-auth-e2e-request-2026-08-27.md`; `docs/requests/core-qa-recovery-request-2026-08-25.md`; `docs/test-cases.md`; `scripts/qa`; `supabase/tests`; `web/e2e`; https://supabase.com/docs/guides/local-development/testing/overview; https://www.postgresql.org/docs/current/explicit-locking.html; https://docs.stripe.com/api/idempotent_requests
