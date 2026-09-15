# Architecture: 해낼게 운영 v1.0.0

> 기준 시각: 2026-08-29 04:54 KST
> 목적: 현재 운영되는 구조와 미래 확장점을 분리한다. 구현되지 않은 자동 지급대행을 현재 구조처럼 서술하지 않는다.

## 목차

- [1. System one-liner](#1-system-one-liner)
- [2. Deployment surfaces](#2-deployment-surfaces)
- [3. Runtime topology](#3-runtime-topology)
- [4. Web route zones](#4-web-route-zones)
- [5. Read and write boundaries](#5-read-and-write-boundaries)
- [6. Payment flow](#6-payment-flow)
- [7. Cashout flow](#7-cashout-flow-current-manual-payout)
- [8. Cashout concurrency model](#8-cashout-concurrency-model)
- [9. Security architecture](#9-security-architecture)
- [10. Data and ownership boundaries](#10-data-and-ownership-boundaries)
- [11. Commons and reuse boundary](#11-commons-and-reuse-boundary)
- [12. Observability and release](#12-observability-and-release)
- [13. Known gaps and build handoff](#13-known-gaps-and-build-handoff)
- [14. Benchmark, self-check, red-team](#14-benchmark-self-check-red-team)

## 1. System one-liner

해낼게는 Vercel의 Next.js 웹과 Supabase의 Auth, Postgres, RLS, RPC, Edge Functions로 운영되는 독립 서버리스 제품이다. 공개 목표 열람은 RLS read surface로, 결제와 환전 같은 돈 쓰기는 server-controlled function surface로 분리한다.

## 2. Deployment surfaces

| surface | current production | evidence |
|---|---|---|
| Web | Vercel, canonical `https://haenael-ge.vercel.app`, region config `icn1` | `vercel.json`, `web/vercel.json`, health 직접 요청 |
| Web health | version `1.2.0`, database `ok` | 2026-08-29 `/api/health` HTTP body 직접 관찰 |
| Database/Auth | Supabase production project, migrations through `20260825020000` | migration history and production schema dump recorded in QA/state |
| Edge Functions | auth, cheer/payment, notify, report, wordmap deployed separately from web | `supabase/functions/` and deployment runbooks |
| CI | GitHub Actions minutes exhausted until reset | external execution blocker, not product runtime failure |

웹, DB migration, Edge Function은 서로 다른 배포 단위다. 웹 배포 성공만으로 최신 migration 또는 function 배포를 추론하지 않는다.

## 3. Runtime topology

```text
Browser
  ├─ public SSR/read ───────────────> Vercel Next.js ─────> Supabase PostgREST/RPC
  ├─ authenticated Server Action ──> Vercel Next.js ─────> service-role RPC
  ├─ auth/payment/report/image ─────> Supabase Edge Functions ─> Postgres/external provider
  └─ Toss payment widget ───────────> Toss Payments ──────> toss-confirm/webhook

Admin browser
  └─ authenticated action ──────────> Vercel Next.js ─────> admin RPC ─> Postgres
                                               └──────────> bank app is manual external action
```

## 4. Web route zones

| zone | routes | responsibility |
|---|---|---|
| public acquisition | `/`, `/how`, `/terms`, `/privacy`, `/child-safety` | 랜딩과 정책 |
| receiver | `(receiver)/onboarding`, `/me`, `/wordmap/[goalId]`, `/cashout*` | 목표 생성, 받은 응원, 워드맵, 환전 |
| friend | `/g/[slug]`, `/payment/success`, `/payment/fail` | 공개 목표와 게스트 결제 |
| auth | `/auth/kakao/*`, `/auth/callback`, `/auth/logout` | 세션 확립 |
| admin | `/admin` | 회원·원장 조회, 수동 환전 큐 |
| ops | `/api/health` | version and DB probe |

`(receiver)/layout.tsx`와 `components/receiver/ReceiverShell.tsx`가 회원 화면의 공통 shell을 소유한다. 공개 goal zone과 receiver zone을 같은 화면 역할로 합치지 않는다.

## 5. Read and write boundaries

### Read

- 공개 목표는 `goal_public`, `cheer_public`, `get_wordmap`만 사용한다. 공개 surface에는 금액과 계좌, CI가 없다.
- 회원 본인 화면은 Supabase SSR client와 RLS로 goal, cheer, notification, eligibility, cashout status/history를 읽는다.
- admin 목록은 `is_admin()`을 확인하는 RPC를 사용한다.

### Write

- 목표와 공유 이벤트 같은 저위험 쓰기는 RLS 소유권 정책으로 제한한다.
- 응원 주문과 결제 확정은 Edge Function과 DB RPC가 원장을 원자적으로 쓴다.
- 환전 신청은 Vercel Server Action이 로그인, phone, secret, service-role 경계를 소유하고 `create_cashout_request`를 호출한다.
- 환전 관리자 전이는 사용자 JWT의 admin 권한과 DB 상태 가드를 함께 사용한다.

## 6. Payment flow

1. 공개 목표 화면의 `CheerPaymentButton`이 입력을 수집한다.
2. `cheer-order`가 request key를 검증하고 payment READY와 cheer PENDING을 만든다.
3. 브라우저는 Toss widget으로 결제한다.
4. `/payment/success`가 `toss-confirm`을 호출한다.
5. 서버는 Toss 승인 응답을 검증한 뒤 payment DONE, cheer CONFIRMED, `Clover EARN`을 원자적으로 반영한다.
6. DB 실패 시 보상 취소 또는 reconciliation marker를 남긴다.
7. `toss-webhook`은 예측 불가능 경로 토큰과 Toss API 재조회로 비동기 상태를 맞춘다.

공개 웹훅 payload만 믿지 않고 provider API 재조회 결과를 사용한다.

## 7. Cashout flow: current manual payout

1. `/cashout`이 eligibility, latest status, history, phone을 읽는다.
2. 회원은 total threshold를 넘었을 때 payable 범위 1 이상을 신청한다.
3. Server Action이 phone 저장과 계좌 secret 주입 뒤 `create_cashout_request`를 service-role로 호출한다.
4. DB는 회원 advisory lock과 balance row lock 안에서 REQUESTED와 HOLD 0을 만든다.
5. `/admin`의 관리자는 마스킹된 큐를 보고 지급 직전에 계좌 원문을 연다. 이 열람은 10분 감사 로그로 남는다.
6. 관리자는 은행 앱에서 실제 이체한다.
7. 확인 체크 뒤 `admin_mark_cashout_paid`가 PAID와 SETTLED -N을 원자적으로 만든다. 또는 반려 사유와 함께 REJECTED, REVERSAL 0을 만든다.
8. CASHOUT_REQUESTED와 CASHOUT_PAID 알림은 원거래 뒤 best-effort로 발송한다.

### Explicitly inactive

- `supabase/functions/cashout`: 410. 계좌 body를 읽지 않는 폐기 endpoint다.
- `supabase/functions/cashout-payout`: 501 stub. 자동 지급대행이 아니다.
- `request_manual_cashout(text)`: migration 20260822000000에서 DROP됐다.
- `KYC_PENDING`, `APPROVED`, `PAYOUT_SENT`, `FAILED`: 현재 수동 flow에서 전이하지 않는 예약 enum이다.

## 8. Cashout concurrency model

| lock | key | protects |
|---|---|---|
| transaction advisory lock | `cashout_member:{member_id}` | 같은 회원의 동시 신청과 request key 경합 |
| row lock | `clover_balance.member_id` | 신청 시 total/payable snapshot |
| transaction advisory lock | `cashout_request:{request_id}` | paid/reject 동시 전이 |
| row lock | `clover_balance.member_id` | PAID 시 음수 방지와 final snapshot |

lock 획득 순서는 migration 주석과 FDD에 고정한다. DB 함수가 외부 사용자 입력을 기다리지 않으므로 트랜잭션을 짧게 유지한다.

## 9. Security architecture

- secret 값은 Vercel env, Supabase secret, 로컬 harness secret으로 분리하고 repo에 넣지 않는다.
- 계좌번호는 pgcrypto AES256 암호문과 마스킹 문자열로 분리한다.
- 계좌 fingerprint는 HMAC으로 request replay 충돌을 판정하며 평문을 남기지 않는다.
- `SECURITY DEFINER` 함수는 `search_path=''`, schema qualification, explicit REVOKE/GRANT를 쓴다.
- service-role은 브라우저에 노출하지 않는다.
- `notify`는 일반 사용자 JWT가 아니라 32자 이상 내부 토큰을 상수시간 검증한다.
- 공개 데이터는 RLS와 column absence 두 층으로 금액·개인정보를 막는다.
- 고위험 경로의 진실원은 append-only ledger와 transition log다.

## 10. Data and ownership boundaries

| domain | tables | primary writer |
|---|---|---|
| identity | member, kyc_verification, admin_member | auth function, owner RLS, admin ops |
| goal | goal, share_event, render cache | owner RLS, render function |
| cheer/payment | cheer, payment, payment_log | cheer/payment functions |
| clover | clover_ledger, clover_balance | payment/cashout RPC only |
| cashout | cashout_request, access log | cashout/admin RPC only |
| communication | notification, report | notify/report function |

`clover_balance`는 읽기 최적화 캐시이고 `clover_ledger`는 감사 진실원이다. A1 잠금량은 delta 0 ledger 합계가 아니라 진행 중 cashout request에서 계산한다.

## 11. Commons and reuse boundary

이 repo는 `@postagi/*` 또는 다른 벤처 코드를 runtime dependency로 가져오지 않는다. 재사용은 설계 패턴, 품질 기준, 결제 멱등 원칙 수준이다. 제품 코드는 `web/src/lib`, `web/src/components`, `supabase/functions/_shared` 내부에서만 공유한다.

## 12. Observability and release

- `/api/health`는 version과 DB probe를 제공한다.
- DB error는 public error code와 server log를 분리한다.
- payment와 cashout은 request key, state log, ledger, access log로 추적한다.
- 배포 완료는 Vercel Ready, production migration parity, Edge Function 배포, 운영 read-only E2E를 각각 확인해야 한다.
- 현재 GitHub Actions의 실패는 분 소진으로 step 0에서 발생한다. green CI 증거가 없다는 뜻이며 운영 health 200을 CI 성공으로 대체하지 않는다.

## 13. Known gaps and build handoff

| gap | impact | owner |
|---|---|---|
| generated DB type에 settled balance 두 필드 없음 | `as never`로 고위험 계약을 우회 | build |
| refund period and minor-age policy unresolved | 고객 안내와 legal 경계 미확정 | plan/legal |
| PRD §10.3 지급 신원정보 처리 미결 | 수집 주체·저장·암호화·접근·보존·파기 경계가 없어 해당 범위 build 불가 | chairman, plan/legal, eng-design |
| automatic payout absent | 수동 은행 이체에 운영 통제 의존 | future plan/eng-design |
| production 30/27 natural account absent | 운영 쓰기 happy path 미검증 | QA, fake transaction 금지 |

## 14. Benchmark, self-check, red-team

- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions): privileged DB logic, explicit grants, empty search path.
- [PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html): transaction-level advisory locks and row locks for application invariants.
- [Stripe Idempotency](https://docs.stripe.com/api/idempotent_requests): retry-safe write semantics.

이 구조가 틀렸다면 가장 그럴듯한 이유는 Server Action이 또 하나의 backend layer가 되어 DB와 책임이 겹친다는 것이다. 현재 분리는 Server Action이 인증·secret·notification orchestration만 맡고, 원자적 검증과 state mutation은 RPC가 소유하도록 제한한다.

레드팀 공격: 은행 이체와 PAID DB 전이는 원자적이지 않다. 맞다. 현재 수동 지급의 잔여 위험이다. 계좌 열람 로그, 10분 gate, 확인 체크, 상태·원장 이중 가드는 오조작을 줄일 뿐 외부 은행의 완료를 증명하지 않는다. 자동 지급대행이 승인될 때 새 eng-design을 열어야 한다.

---

🏷 STAMP | line: core | 생성: 2026-08-29 04:54 KST | model: gpt-5.6-sol | agent: tech-architect
skills: 없음 | 근거: 실제 route/function/migration/deployment config와 운영 health 관찰
고민: 미래 자동 지급 구조를 보존하되 현재 운영 그림에서 완전히 분리해 회장이 무엇이 실제인지 바로 알게 했다.

SKILLS_USED: 없음
SKILLS_SKIPPED: 아키텍처 전용 스킬이 없어 저장소와 공식문서를 직접 대조했다.

RUBRIC_SCORE: 완결성=5/5 정밀성=5/5 벤치마크반영=4/5 추적성=5/5 전문성·톤=5/5 total=24/25
WEAKEST_LINE: 지급 단계 주민등록번호·신원·세무정보의 소유 경계가 미정이라 전체 지급 아키텍처를 완료로 선언할 수 없다.

SOURCES/MODEL: gpt-5.6-sol | `web/src`; `supabase/functions`; `supabase/migrations`; `vercel.json`; `web/vercel.json`; https://haenael-ge.vercel.app/api/health; https://supabase.com/docs/guides/database/functions; https://www.postgresql.org/docs/current/explicit-locking.html; https://docs.stripe.com/api/idempotent_requests
