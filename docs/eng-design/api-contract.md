# API Contract: 해낼게 운영 v1.0.0

> 기준 시각: 2026-08-29 04:46 KST
> 진실원: `docs/design/user-flow.md` v0.3.1, `DESIGN.md` v2.0.1, `docs/eng-design/erd.md`, 운영 코드와 migration.
> 규칙: 각 user-flow step은 endpoint, frontend component, DB surface를 모두 가진다. 정적 화면은 endpoint와 DB를 `없음`으로 명시하며 누락으로 숨기지 않는다.

## 목차

- [1. 실행 표면](#1-실행-표면)
- [2. Endpoint catalog](#2-endpoint-catalog)
- [3. Response and error rules](#3-response-and-error-rules)
- [4. 받는 사람 flow mapping](#4-받는-사람-flow-mapping)
- [5. 친구 flow mapping](#5-친구-flow-mapping)
- [6. Expansion loop mapping](#6-expansion-loop-mapping)
- [7. Mapping verdict](#7-mapping-verdict)
- [8. 벤치마크와 검증](#8-벤치마크와-검증)

## 1. 실행 표면

| 표면 | 역할 | 배포 |
|---|---|---|
| Next.js App Router | SSR, Server Components, Server Actions, 공개·회원·관리자 화면 | Vercel `icn1`, 대표 `https://haenael-ge.vercel.app` |
| Supabase Auth | 카카오 custom OAuth, anonymous guest, session | Supabase project |
| PostgREST/RPC | RLS 읽기, 원자적 돈 쓰기, 관리자 전이 | Supabase Postgres |
| Edge Functions | 카카오 OAuth, 결제 승인·웹훅, 알림, 워드맵 렌더, 신고 | Supabase Functions |

## 2. Endpoint catalog

### Auth and member

| ID | 호출 | 인증 | 결과 | 구현 |
|---|---|---|---|---|
| A1 | `/auth/kakao/start` → `/auth/kakao/callback` → EF `auth-kakao` | 공개 | Supabase 세션, member upsert | 운영 |
| A2 | `supabase.auth.signInAnonymously()` | 공개 | 게스트 세션 | 결제 진입 |
| A3 | `member` select/update with RLS | 회원 본인 | 프로필, phone | 운영 |
| A4 | Google/Apple OAuth | 공개 | 현재 버튼 플래그 OFF | 코드 보존, 운영 비활성 |

### Goal, cheer, payment, wordmap

| ID | 호출 | 인증 | 결과 | 쓰기 경계 |
|---|---|---|---|---|
| G1 | `goal.insert/update/select` | 회원 본인 | 목표와 slug | RLS |
| G2 | `goal_public.eq(slug)` | 공개 | 목표, D-day, 응원 수. 금액 없음 | view read |
| G3 | RPC `get_wordmap(goal)` | 공개 | word/count | RPC read |
| G4 | EF `wordmap-render` | 공개 링크 컨텍스트 | 이미지 URL | service-role 내부 |
| G5 | `share_event.insert` | 화면 사용자 | 공유 채널 기록 | RLS |
| C1 | EF `cheer-order` | 공개 또는 guest | pending cheer와 payment order | service-role 내부 |
| P1 | EF `toss-confirm` | payment success | payment DONE, cheer CONFIRMED, EARN | DB RPC |
| P2 | EF `toss-webhook` | path secret + Toss 재조회 | 결제 상태 보상 | DB RPC |
| R1 | EF `report` | 공개·guest·회원 | report OPEN | service-role 내부 |

### Cashout RPC 8개

| ID | RPC | 인증 | 반환·효과 |
|---|---|---|---|
| K1 | `clover_eligibility(uuid)` | 본인, service_role | total, welcome, locked, available, payable, min, reached |
| K2 | `create_cashout_request(...)` | service_role only | REQUESTED, 계산 스냅샷, HOLD 0, replay 여부 |
| K3 | `my_cashout_status()` | 본인 | 최신 상태와 PAID 잔액 스냅샷 |
| K4 | `my_cashout_history(limit)` | 본인 | 마스킹된 이력 |
| K5 | `admin_list_cashouts_v2(limit)` | 관리자 | 운영 큐 |
| K6 | `admin_reveal_cashout_account(...)` | 관리자 | 복호화 계좌와 access log |
| K7 | `admin_mark_cashout_paid(id,note)` | 관리자 | PAID와 SETTLED -N |
| K8 | `admin_reject_cashout(id,note)` | 관리자 | REJECTED와 REVERSAL 0 |

세부 입력, 에러, 락 순서는 `docs/eng-design/fdd-haenael-ge-cashout-clover-lock-v1.1.0.md` §6이 정본이다.

#### K1 `clover_eligibility`

PostgREST RPC request body:

```json
{
  "p_member_id": "11111111-1111-4111-8111-111111111111"
}
```

`RETURNS TABLE` response. 값이 없더라도 집계 결과 1행을 반환한다.

```json
[
  {
    "total_balance": 30,
    "welcome_amount": 3,
    "locked_amount": 0,
    "available_amount": 30,
    "payable_amount": 27,
    "min_cashout_clover": 30,
    "reached_threshold": true
  }
]
```

#### K2 `create_cashout_request`

PostgREST RPC request body. `p_account_key`와 `p_account_fingerprint_key`는 Vercel Server Action이 로컬 secret으로만 주입하며 브라우저 payload에 포함하지 않는다.

```json
{
  "p_member_id": "11111111-1111-4111-8111-111111111111",
  "p_clover_amount": 27,
  "p_bank_code": "088",
  "p_account_no": "123456789012",
  "p_account_holder": "홍길동",
  "p_request_key": "cashout_req_01JTEST00000000000000000",
  "p_account_key_version": 1,
  "p_account_key": "<server-secret-minimum-32-characters>",
  "p_account_fingerprint_key": "<server-secret-minimum-32-characters>"
}
```

`RETURNS TABLE` response. total 30, welcome 3에서 27을 신청한 계산 예시다. `fee_krw`는 이용료 10%와 그 부가세 10%를 합친 2,970원이다.

```json
[
  {
    "cashout_request_id": 101,
    "status": "REQUESTED",
    "clover_amount": 27,
    "gross_krw": 27000,
    "fee_krw": 2970,
    "withholding_krw": 792,
    "net_krw": 23238,
    "requested_at": "2026-08-29T05:30:00+00:00",
    "is_replay": false
  }
]
```

동일 key와 동일 fingerprint 재호출은 같은 행과 `is_replay=true`를 반환한다. 동일 key의 입력이 다르면 JSON 성공 응답이 아니라 `request_key_conflict` PostgREST error다.

#### K3 `my_cashout_status`

인자 없는 PostgREST RPC request body:

```json
{}
```

최신 상태가 없으면 `[]`다. PAID 응답은 최신 migration의 13개 반환 컬럼을 모두 포함한다.

```json
[
  {
    "id": 101,
    "status": "PAID",
    "clover_amount": 27,
    "net_krw": 23238,
    "bank_code": "088",
    "account_masked": "••••••9012",
    "account_holder": "홍길동",
    "requested_at": "2026-08-29T05:30:00+00:00",
    "paid_at": "2026-08-29T06:00:00+00:00",
    "rejected_at": null,
    "processing_note": "수동 이체 완료",
    "settled_balance_before": 30,
    "settled_balance_after": 3
  }
]
```

REQUESTED 또는 REJECTED에는 `settled_balance_before`와 `settled_balance_after`가 `null`이다. generated TypeScript 타입에 이 두 필드가 빠진 것은 계약 변경이 아니라 잔여 type drift다.

#### K4 `my_cashout_history`

```json
{
  "p_limit": 20
}
```

`p_limit`은 `null`이면 20, 유효 범위는 함수 내부에서 1부터 100으로 clamp한다. 응답은 최신순 배열이며 K3의 settled snapshot 두 필드는 포함하지 않는다.

```json
[
  {
    "id": 101,
    "status": "PAID",
    "clover_amount": 27,
    "net_krw": 23238,
    "bank_code": "088",
    "account_masked": "••••••9012",
    "account_holder": "홍길동",
    "requested_at": "2026-08-29T05:30:00+00:00",
    "paid_at": "2026-08-29T06:00:00+00:00",
    "rejected_at": null,
    "processing_note": "수동 이체 완료"
  }
]
```

#### K5 `admin_list_cashouts_v2`

```json
{
  "p_limit": 100
}
```

`p_limit`은 1부터 500으로 clamp한다. REQUESTED를 먼저, 그 안에서는 오래된 순으로 반환한다.

```json
[
  {
    "id": 101,
    "member_id": "11111111-1111-4111-8111-111111111111",
    "nickname": "해낼게회원",
    "clover_amount": 27,
    "gross_krw": 27000,
    "fee_krw": 2970,
    "withholding_krw": 792,
    "net_krw": 23238,
    "bank_code": "088",
    "account_masked": "••••••9012",
    "account_holder": "홍길동",
    "status": "REQUESTED",
    "processing_note": null,
    "requested_at": "2026-08-29T05:30:00+00:00",
    "paid_at": null,
    "rejected_at": null
  }
]
```

#### K6 `admin_reveal_cashout_account`

```json
{
  "p_request_id": 101,
  "p_actor_id": "22222222-2222-4222-8222-222222222222",
  "p_account_keys": {
    "1": "<server-secret-minimum-32-characters>"
  }
}
```

이 함수는 `RETURNS text`이므로 PostgREST response는 배열이 아닌 JSON string이다. 성공과 같은 transaction에서 access log를 기록한다.

```json
"123456789012"
```

#### K7 `admin_mark_cashout_paid`

```json
{
  "p_request_id": 101,
  "p_processing_note": "수동 이체 완료"
}
```

```json
[
  {
    "cashout_request_id": 101,
    "status": "PAID",
    "paid_at": "2026-08-29T06:00:00+00:00"
  }
]
```

#### K8 `admin_reject_cashout`

```json
{
  "p_request_id": 102,
  "p_processing_note": "예금주 불일치"
}
```

```json
[
  {
    "cashout_request_id": 102,
    "status": "REJECTED",
    "rejected_at": "2026-08-29T06:10:00+00:00"
  }
]
```

K1, K2, K3, K4, K5, K7, K8은 PostgreSQL `RETURNS TABLE`이라 PostgREST가 JSON array를 반환한다. K6만 scalar `text`라 JSON string을 반환한다. `bigint`, `integer`, enum, `timestamptz`, `boolean`, nullable column의 JSON 표현은 위 예시와 같다.

### Notification and operations

| ID | 호출 | 인증 | 결과 |
|---|---|---|---|
| N1 | EF `notify` with `x-notify-internal-token` | 내부 | ALIMTALK 또는 INAPP 관측 기록 |
| N2 | `notification.select` | 본인 | 인앱 알림 |
| O1 | `GET /api/health` | 공개 | app version, DB 상태 |
| O2 | EF `cashout` | 모든 호출 | 410. 폐기 경로 |
| O3 | EF `cashout-payout` | 내부 예정 | 501. 자동 지급 미구현 |

## 3. Response and error rules

- 공개 API는 계좌 암호문, CI, 개별 응원 금액을 반환하지 않는다.
- Server Action은 알려진 DB 에러를 `cashout-errors.ts`의 안정적 코드로 변환한다. 알 수 없는 내부 메시지를 브라우저에 그대로 노출하지 않는다.
- 돈 쓰기 성공 뒤 알림 실패는 원거래를 롤백하지 않는다. 알림 관측 실패를 별도 기록한다.
- request key는 같은 fingerprint에서 replay를 반환하고 다른 fingerprint에서는 `request_key_conflict`다.
- 브라우저는 `create_cashout_request`를 직접 실행할 권한이 없다.

## 4. 받는 사람 flow mapping

| user-flow | endpoint | frontend component 또는 route | DB surface | gap |
|---|---|---|---|---|
| §1.1-1 진입 | `GET /` 또는 링크 route | `app/page.tsx` | 없음 | 0 |
| §1.1-2 랜딩 | 없음 | landing page | 없음 | 0 |
| §1.1-3 write-first | local draft | `OnboardingGoalForm` | localStorage, 미영속 | 0 |
| §1.1-4 로그인·저장 | A1 + G1 | `LoginSheet`, `OnboardingGoalForm` | auth.users, member, goal | 0 |
| §1.1-5 링크 발급 | G1 응답 | `MyLinkCard`, `ShareLinkCard` | goal.slug | 0 |
| §1.1-6 응원 수신 | goal/cheer owner read + N2 | `/me`, `CheerList` | cheer, notification | 0 |
| §1.1-7 워드맵·공유 | G3, G4, G5 | `Wordmap`, `WordmapShareIcons` | cheer, render cache, share event | 0 |
| §1.1-8 환전 진입·신청 | K1~K4, K2 Server Action | `CashoutPageView`, `CashoutRequestForm` | balance, ledger, request, member | 0 |
| §1.2 입력 실패 | client validation + G1 | `OnboardingGoalForm` | 없음 또는 goal rollback | 0 |
| §1.2 로그인 취소 | A1 cancel | `LoginSheet` | localStorage draft | 0 |
| §1.2 응원 0 | goal/cheer owner read | `/me` empty | goal, cheer | 0 |
| §1.2 환전 미달 | K1 | `CashoutPageView` | balance, ledger | 0 |
| §1.2 30/27 | K1, K2 | `CashoutRequestForm` | balance, request, ledger | 0 |
| §1.2 payable 0 | K1 | `CashoutPageView` | balance, ledger | 0 |
| §1.2 미성년 | K2 | form error state | latest kyc_verification | 0 |
| §1.2 신청 접수 | K2 + N1 | form success → `/cashout/status` | request, HOLD, notification | 0 |
| §1.2 반려 | K8 | status page, admin queue | request, REVERSAL | 0 |
| §1.2 입금 완료 | K6, K7, K3 | status page, admin queue | access log, request, SETTLED | 0 |
| PRD §10.3 지급 신원정보 | 미정 | 미정 | 미정 | 1, 회수 필요 |
| §1.2 마감 목표 | G2 | `GoalCard`, `DdayChip` | goal.status | 0 |
| §1.2 삭제 | G1 update | edit/delete UI, not-found states | goal.deleted_at/status | 0 |
| §1.3 본인 재진입 | G2 + session | `OwnerBar`, `/me` | goal, cheer | 0 |

## 5. 친구 flow mapping

| user-flow | endpoint | frontend component 또는 route | DB surface | gap |
|---|---|---|---|---|
| §2.1-1 유입 | `GET /g/[slug]` | goal page | goal_public | 0 |
| §2.1-2 열람 | G2, G3 | `GoalCard`, `CheerCount`, `Wordmap` | goal_public, cheer_public | 0 |
| §2.1-3 CTA | 없음 | `CheerPaymentButton` | 없음 | 0 |
| §2.1-4 금액 | C1 | `CheerPaymentButton` sheet | pending cheer/payment | 0 |
| §2.1-5 메시지 | C1 | 동일 sheet | cheer.message | 0 |
| §2.1-6 익명 | C1 | 동일 sheet | cheer.is_anonymous | 0 |
| §2.1-7 결제 | A2, C1, Toss widget | `CheerPaymentButton` | payment, cheer | 0 |
| §2.1-8 완료 | P1 | `/payment/success` | payment, cheer, ledger | 0 |
| §2.1-9 역할 전환 | `GET /onboarding` | success page link | 없음 | 0 |
| §2.2 empty/few | G2, G3 | goal page states | cheer aggregate | 0 |
| §2.2 시트 취소 | 없음 | `CheerPaymentButton` | pending draft | 0 |
| §2.2 처리 중 | Toss widget/P1 | success/loading UI | payment READY | 0 |
| §2.2 실패 | `/payment/fail` | fail page | payment/log | 0 |
| §2.2 중복 탭 | C1/P1 idempotency | button disabled | payment request key/order id | 0 |
| §2.2 환불 문의 | receipt/terms path | success·terms·문의 경로 | payment receipt | 0, 환불 기간은 상류 미결 |
| §2.2 마감 | G2 | `DdayChip` | goal.status | 0 |
| §2.2 삭제·잘못된 링크 | G2 0 row | not-found/error routes | goal_public | 0 |
| §2.2 신고 | R1 | `ReportButton` | report | 0 |
| §2.2 미성년 결제 | C1/P1 허용 | payment UI | payment | 0 |

## 6. Expansion loop mapping

| node | endpoint | frontend | DB | gap |
|---|---|---|---|---|
| 목표→링크 | G1 | link cards | goal.slug | 0 |
| 링크→친구 페이지 | G2 | goal page | goal_public | 0 |
| 결제→워드맵 | P1→G3 | success + Wordmap | cheer, ledger | 0 |
| 재공유 | G4, G5 | WordmapShareIcons | render cache, share event | 0 |
| 완료→온보딩 | route only | success link | 없음 | 0 |

## 7. Mapping verdict

- 현재 user-flow의 endpoint/component/DB mapping gap: **0**.
- 상류 PRD §10.3 지급 신원정보 mapping gap: **1**. 주민등록번호·신원·세무정보의 수집 주체, 최소 필드, 저장 여부, 암호화, 접근 감사, 보존·파기와 실패 상태가 미정이므로 새 endpoint나 table을 임의 확정하지 않는다. "제품 저장 0"이 확정된 것도 아니다.
- active implementation drift: **0**. `CashoutRequestForm`과 status empty 상태에서 신청량 하한 30으로 읽히던 문구는 제거됐고 30/27 경계 테스트가 추가됐다.
- type drift: **1**. generated `my_cashout_status` 반환 타입에 settled balance 2필드가 빠져 있다.
- scope exclusion: 자동 지급대행 1건. `cashout-payout` 501은 의도된 비구현이며 현재 수동 지급 계약과 섞지 않는다.

## 8. 벤치마크와 검증

- [Supabase Functions](https://supabase.com/docs/guides/database/functions): RLS 밖의 privileged write는 명시적 SECURITY DEFINER와 grant로 제한했다.
- [Stripe Idempotency](https://docs.stripe.com/api/idempotent_requests): request key와 fingerprint 충돌 계약을 적용했다.
- API 계약은 migration SQL, generated types, 호출부 `rpc`/`fetch` 검색을 교차 대조했다.

---

🏷 STAMP | line: core | 생성: 2026-08-29 04:46 KST | model: gpt-5.6-sol | agent: tech-architect
skills: 없음 | 근거: user-flow 전수, 실제 라우트·컴포넌트·RPC·Edge Function scan
고민: 설계상 매핑 존재와 실제 카피 드리프트를 분리해 gap 0이라는 표현이 구현 완료로 오해되지 않게 했다.

SKILLS_USED: 없음
SKILLS_SKIPPED: API 계약 전용 스킬이 없어 저장소 역추적과 공식문서로 작성했다.

RUBRIC_SCORE: 완결성=4/5 정밀성=5/5 벤치마크반영=5/5 추적성=5/5 전문성·톤=5/5 total=24/25
WEAKEST_LINE: 지급 단계 주민등록번호·신원·세무정보는 데이터 처리 결정 전이라 API 계약과 DB surface를 확정할 수 없다.

SOURCES/MODEL: gpt-5.6-sol | `docs/design/user-flow.md`; `docs/eng-design/erd.md`; `web/src`; `supabase/functions`; `supabase/migrations`; https://supabase.com/docs/guides/database/functions; https://docs.stripe.com/api/idempotent_requests
