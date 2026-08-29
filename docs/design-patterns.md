# Design Patterns: 해낼게 운영 v1.0.0

> 기준 시각: 2026-08-29 04:54 KST
> 범위: 현재 코드에 실제로 적용된 패턴과 의도적 배제를 기록한다.

## 목차

- [1. Read/write 분리](#1-read-surface와-write-surface-분리)
- [2. Database transaction script](#2-database-transaction-script)
- [3. Append-only ledger](#3-append-only-ledger-with-snapshot)
- [4. Idempotency](#4-idempotency-key-and-fingerprint)
- [5. State machine](#5-state-machine-and-transition-guard)
- [6. Lock hierarchy](#6-lock-hierarchy)
- [7. Defense in depth](#7-defense-in-depth)
- [8. Snapshot read model](#8-snapshot-read-model)
- [9. Best-effort side effect](#9-best-effort-side-effect-after-commit)
- [10. Adapter boundary](#10-adapter-boundary-for-external-providers)
- [11. Server Action boundary](#11-server-action-as-secret-boundary)
- [12. Soft delete](#12-soft-delete-and-sanitized-read-model)
- [13. Role-separated UI](#13-role-separated-ui)
- [14. Excluded patterns](#14-intentionally-excluded-patterns)
- [15. Decision tests](#15-pattern-decision-tests)
- [16. Benchmark and red-team](#16-benchmark-and-red-team)

## 1. Read surface와 write surface 분리

- 공개·본인 읽기: Supabase SSR client, PostgREST, RLS, sanitized view.
- 돈 쓰기: Edge Function 또는 Vercel Server Action에서 privileged RPC 호출.
- 원칙: 브라우저가 `payment`, `clover_ledger`, `create_cashout_request`를 직접 쓰지 않는다.

## 2. Database transaction script

결제 확정과 환전 전이는 DB function이 입력 검증, 상태 가드, row/advisory lock, 원장 기록을 한 트랜잭션에서 소유한다. Server Action은 transaction 경계를 흉내 내지 않는다.

적용:

- `confirm_cheer_payment`
- `create_cashout_request`
- `admin_mark_cashout_paid`
- `admin_reject_cashout`

## 3. Append-only ledger with snapshot

`clover_ledger`는 사건과 `balance_after`를 남긴다. `clover_balance`는 빠른 읽기용 캐시다.

- EARN: 실제 증가.
- CASHOUT_HOLD: A1에서는 delta 0인 잠금 표식.
- CASHOUT_SETTLED: 지급 완료 시 -N.
- CASHOUT_REVERSAL: 반려 시 delta 0인 잠금 해제 표식.
- WELCOME_GRANT/REVERSAL: 자격에는 포함하고 지급가능에서는 제외.

잠금량은 delta 합계가 아니라 `cashout_request.status='REQUESTED'`의 amount 합이다.

## 4. Idempotency key and fingerprint

- 결제: order/request key와 request fingerprint.
- 환전: `request_key` 부분 unique index와 normalized account HMAC을 포함한 fingerprint.
- 같은 키와 같은 입력: 최초 결과 replay.
- 같은 키와 다른 입력: conflict.
- 네트워크 재시도가 새 돈 사건을 만들지 않는다.

## 5. State machine and transition guard

상태 변경은 허용된 이전 상태를 WHERE 조건으로 포함한다. 조회 후 애플리케이션에서 상태를 검사하고 별도 UPDATE하지 않는다.

현재 수동 환전:

```text
none -> REQUESTED -> PAID
                  -> REJECTED
```

예약 enum인 KYC_PENDING, APPROVED, PAYOUT_SENT, FAILED는 전이 코드가 생기기 전까지 active state로 취급하지 않는다.

## 6. Lock hierarchy

1. 회원별 신청: transaction advisory lock.
2. 해당 회원 balance row: `FOR UPDATE`.
3. 요청별 관리자 전이: request advisory lock.
4. 지급 확정 balance row: `FOR UPDATE`.

모든 호출부가 같은 순서를 지켜 deadlock 가능성을 줄인다.

## 7. Defense in depth

- RLS 및 view column absence.
- SECURITY DEFINER `search_path=''`.
- explicit REVOKE/GRANT.
- service-role browser exclusion.
- account encryption, masking, HMAC fingerprint.
- 최근 10분 계좌 열람 감사 gate.
- state guard와 unique ledger guard.
- public error code와 internal log 분리.

## 8. Snapshot read model

UI가 `total - locked`를 재계산하지 않는다. `clover_eligibility`가 한 스냅샷에서 다섯 값을 반환한다.

PAID 화면도 라이브 total로 전후 값을 역산하지 않는다. `CASHOUT_SETTLED.balance_after`에서 확정 시점 전후 값을 읽는다. 지급 후 새 EARN이 들어와도 과거 설명이 바뀌지 않는다.

## 9. Best-effort side effect after commit

CASHOUT_REQUESTED와 CASHOUT_PAID 알림은 DB 성공 뒤 실행한다. 알림 실패가 돈 거래 성공을 뒤집지 않는다. 대신 notification channel/status와 server log가 실패를 관찰 가능하게 만든다.

## 10. Adapter boundary for external providers

- Toss payment logic: `supabase/functions/_shared/toss*`.
- Kakao OAuth: `_shared/oauth-kakao.ts`.
- Alimtalk: `_shared/alimtalk.ts`.
- PASS/payout helper는 존재하지만 현재 환전 신청 선행조건 또는 자동 지급으로 활성화하지 않는다.

Provider payload를 UI와 DB domain object에 직접 퍼뜨리지 않는다.

## 11. Server Action as secret boundary

환전 계좌번호와 암호화 key는 Vercel Server Action에서만 만난다. 폐기 `cashout` Edge Function은 410으로 body를 처리하지 않는다. 책임은 다음으로 제한한다.

- session 인증
- input normalization
- phone owner update
- local secret load
- service-role RPC
- post-commit notification
- cache revalidation

원자적 돈 규칙은 DB가 소유한다.

## 12. Soft delete and sanitized read model

goal과 cheer는 `deleted_at`과 status로 노출을 중단한다. ledger와 payment audit는 삭제하지 않는다. 공개 화면은 `goal_public`, `cheer_public`, wordmap filter만 사용한다.

## 13. Role-separated UI

- receiver: `(receiver)` route group과 `components/receiver`.
- friend: `/g/[slug]`와 goal/payment components.
- admin: `/admin`와 admin actions/components.

받는 사람 acquisition과 친구 결제 화면을 같은 dashboard로 합치지 않는다.

## 14. Intentionally excluded patterns

| excluded | reason |
|---|---|
| 자동 지급 saga | `cashout-payout`이 501 stub이고 사업·법률 승인이 없음 |
| 신청 시 PASS mandatory gate | 최신 정책은 미확인 가입자 허용, 확인된 미성년만 차단 |
| event bus | 단일 제품 규모에서 DB transaction과 post-commit side effect로 충분 |
| repository/ORM abstraction | generated Supabase types와 직접 RPC가 계약을 더 명확히 보존 |
| runtime commons dependency | 독립 제품. 다른 벤처 코드 결합 금지 |
| client-side ledger calculation | snapshot drift와 돈 오류 위험 |

## 15. Pattern decision tests

- privileged write가 browser client에 추가되면 reject.
- 돈 상태 변경이 DB transaction 밖에서 여러 쿼리로 나뉘면 reject.
- request key 없이 재시도 가능한 POST를 추가하면 reject.
- HOLD나 REVERSAL을 음수·양수 delta로 되돌리면 A1 회귀.
- 예약 cashout enum을 locked 집합에만 추가하고 종결 RPC를 안 넓히면 영구 잠금 회귀.
- PASS가 신청 화면 선행 조건으로 다시 들어오면 최신 정책 회귀.

## 16. Benchmark and red-team

- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions): privileged logic과 function security.
- [PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html): advisory/row lock의 역할과 transaction 수명.
- [Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests): retry-safe mutation.

이 패턴 선택이 틀렸다면 DB function이 너무 비대해져 테스트와 변경이 어렵다는 이유일 것이다. 그러나 환전의 입력, lock, state, ledger가 서로 다른 계층으로 갈라지면 원자성을 잃는다. 계산 helper와 public error mapping은 분리하되 transaction boundary는 한 함수에 둔다.

레드팀: SECURITY DEFINER가 RLS를 우회하므로 실수 한 번이 전 회원 데이터에 닿을 수 있다. 빈 search path만으로 충분하지 않다. auth.uid/service-role 검사, 최소 grant, schema qualification, pgTAP 권한 테스트를 함께 유지한다.

---

🏷 STAMP | line: core | 생성: 2026-08-29 04:54 KST | model: gpt-5.6-sol | agent: tech-architect
skills: 없음 | 근거: 현재 migration, Server Action, Edge Function, 공식문서
고민: 원장 패턴을 유지하면서도 A1의 delta 0 잠금을 원장 합계로 오해하지 않도록 snapshot read model을 별도 패턴으로 고정했다.

SKILLS_USED: 없음
SKILLS_SKIPPED: 설계패턴 전용 스킬이 없어 현행 코드와 공식문서를 직접 대조했다.

RUBRIC_SCORE: 완결성=5/5 정밀성=5/5 벤치마크반영=4/5 추적성=5/5 전문성·톤=5/5 total=24/25
WEAKEST_LINE: provider adapter의 인터페이스는 코드 경계로 설명했지만 별도 타입 다이어그램까지는 포함하지 않았다.

SOURCES/MODEL: gpt-5.6-sol | `docs/architecture.md`; `docs/erd.md`; `supabase/migrations`; `web/src`; `supabase/functions`; https://supabase.com/docs/guides/database/functions; https://www.postgresql.org/docs/current/explicit-locking.html; https://docs.stripe.com/api/idempotent_requests
