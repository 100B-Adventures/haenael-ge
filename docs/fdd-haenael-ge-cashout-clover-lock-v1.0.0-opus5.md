# FDD: 환전 중 클로버 잠금(A안) — 잔액 계산 방식 변경

> **스탬프**
> 버전 **v1.0.0** · 작성일 2026-08-21 (KST) · 작성자 tech-architect / 모델 `claude-opus-5`
> 상류 산출물 버전 핀: `DESIGN.md` **v1.12.0** (§6-(c) 계산식 · §6-(d) 잔액 표기 · §8.2 용어 · §8.3 차감 표기) · `docs/user-flow.md` **§5.5 기술설계 인계**(§1.1-8 · §1.2) · 프로토타입 `scratchpad/cashout-full-journey-v3-opus.html` **v3.6**
> 기반 포맷: `docs/fdd-haenael-ge-v0.1.0.md`(문서 골격 승계) + `~/.claude/standards/doc-review.md` §5 구조규격 · §7 arc42/C4 크로스워크
> 회장 확정 원문(2026-08-21): **"A안이지 실제로 빠져나갔을때 빠져나가야지"**
> 단계: eng-design. **이 문서는 설계다. 코드·마이그레이션은 포함하지 않는다(build 단계 소유).**

---

## 목차

- [1. 요약(TL;DR)](#1-요약tldr)
- [2. 범위와 비범위](#2-범위와-비범위)
- [3. 용어 정의](#3-용어-정의)
- [4. 현재 구현 실측 (as-is)](#4-현재-구현-실측-as-is)
- [5. 아키텍처](#5-아키텍처)
- [6. ⛔ 회장 결정 항목 (D1~D4)](#6--회장-결정-항목-d1d4)
- [7. 상태 전이표 + 불변식 검증](#7-상태-전이표--불변식-검증)
- [8. 파생값 정의 (총량·잠김·사용가능·지급가능)](#8-파생값-정의-총량잠김사용가능지급가능)
- [9. API 계약](#9-api-계약)
- [10. 동시성·멱등성](#10-동시성멱등성)
- [11. 기존 데이터 정합 (운영 DB 실조회)](#11-기존-데이터-정합-운영-db-실조회)
- [12. 화면 ↔ API ↔ 값 ↔ 테이블 1:1 매핑](#12-화면--api--값--테이블-11-매핑)
- [13. test-plan](#13-test-plan)
- [14. 깨지는 기존 테스트](#14-깨지는-기존-테스트)
- [15. 벤치마크](#15-벤치마크)
- [16. 리스크 · 오픈이슈](#16-리스크--오픈이슈)
- [17. 개정 이력](#17-개정-이력)

---

## 1. 요약(TL;DR)

현재 코드는 **환전 신청 순간 `CASHOUT_HOLD`(−N) 원장을 넣어 총량을 즉시 깎는다(B안)**. 회장이 확정한 A안은 정반대다. 신청은 총량을 건드리지 않고 **잠금만** 걸고, 총량이 줄어드는 유일한 시점은 **입금 완료(PAID)** 다. 반려·이체실패는 잠금 해제이며 되돌릴 잔액이 없다.

이 문서는 그 변경을 (a) 원장 의미, (b) 파생값 3종의 단일 정의, (c) RPC 응답 계약, (d) 상태 전이 불변식, (e) 테스트로 옮긴다. **원장 표현 방식과 마이그레이션 전략은 회장 결정 항목(§6)으로 열어 둔다.** 운영 DB 실조회 결과 환전 원장·환전 신청이 **0건**이어서 어떤 안을 골라도 백필 비용은 0이다.

---

## 2. 범위와 비범위

| 구분 | 내용 |
|---|---|
| **범위** | `clover_ledger` 엔트리 의미, `clover_balance` 파생, `clover_eligibility` 반환값, 잠김/사용가능 노출 계약, `create_cashout_request`·`admin_mark_cashout_paid`·`admin_reject_cashout` 의 원장 기록 규칙, `/me`·`/cashout`·`/cashout/status`·`/cashout/history`·`/admin` 표시값, pgTAP·vitest·Playwright 테스트 |
| **비범위** | 원화 계산식(§6-(c) 확정, **변경 금지**: 30,000 → 3,300 / 881 / 25,819 · 40,000 → 4,400 / 1,174 / 34,426) · 계좌 암호화·마스킹·파기 스케줄러 · KYC 게이트(`cashout_require_kyc()=false` 유지) · 알림톡 문안 · 자동 지급대행 |
| **불변(건드리면 반려)** | 계좌 마스킹 단언(`••••••9012` 고정 길이), 감사 로그 ACL, `SECURITY DEFINER` + `search_path=''` 규약, advisory lock, `request_key` 멱등 |

---

## 3. 용어 정의

| 용어 | 정의 | 화면 표기 | 금지어 |
|---|---|---|---|
| **총 클로버(total)** | 회원이 모은 클로버 전량. `clover_balance.clover_count` | "🍀 52개" | 잔고, 보유고 |
| **잠긴 클로버(locked)** | 진행 중 환전 신청에 묶인 수량 | "🔒 환전으로 잠김 🍀 40개" | 보류, 차감, HOLD |
| **사용 가능 클로버(available)** | `total − locked` | "지금 쓸 수 있어요 🍀 12개" | 가용잔액 |
| **지급 가능 클로버(payable)** | 새 환전을 신청할 수 있는 수량. 웰컴분과 잠긴 분을 뺀 값 | 신청 폼 상단 | - |
| **잠금 해제(unlock)** | 반려·이체실패로 locked가 0이 되는 것. 총량은 변하지 않음 | "잠금이 풀렸어요" | 복원, 환급 |
| **확정 차감(settle)** | 입금 완료 시 총량이 줄어드는 유일한 사건 | "52개에서 12개가 됐어요" | - |

---

## 4. 현재 구현 실측 (as-is)

**⛔ 재창조 금지 확인**: 환전 슬라이스는 이미 구현·운영 배포돼 있다. 아래는 실제 파일 실측이며, 본 설계는 **신규 아키텍처가 아니라 기존 3개 RPC의 원장 기록 규칙 변경 + 파생값 1개 추가**다.

| 대상 | 파일 | 현재 동작 | A안에서 |
|---|---|---|---|
| 신청 RPC | `supabase/migrations/20260821000000_cashout_service_fee_10pct.sql` (실사용 = `create_cashout_request`) | `clover_ledger(CASHOUT_HOLD, −N, balance_after = total − N)` 삽입 → 트리거가 `clover_balance`를 즉시 감소 | **총량 불변**. 잠금만 표현 (§6 D1) |
| 지급 확정 | `20260728010000_cashout_manual_payout.sql` `admin_mark_cashout_paid` | `CASHOUT_SETTLED, delta 0, balance_after = 현재 잔액`(총량 이미 감소했으므로 no-op) | **여기서 −N**. `balance_after = 현재 − N` |
| 반려 | 같은 파일 `admin_reject_cashout` | `CASHOUT_REVERSAL, delta +N, balance_after = 현재 + N`(복원) | **잔액 변화 0**. 잠금 해제 표식만 |
| 잔액 동기화 | `20260803010000_sync_clover_balance_search_path.sql` `sync_clover_balance()` | `clover_ledger` AFTER INSERT → `clover_balance.clover_count = NEW.balance_after` (**합산이 아니라 스냅샷 대입**) | 그대로 유지. `balance_after`가 총량의 유일한 기록자 |
| 자격 판정 | `clover_eligibility(uuid)` | `total_balance` / `welcome_amount` / `payable_amount = total − welcome` / `min_cashout_clover` / `reached_threshold` | **`payable_amount`에서 locked를 추가로 뺀다** + 잠김·사용가능 노출 (§6 D3) |
| 홈 렌더 | `web/src/app/(receiver)/me/page.tsx:170-190` | `clover_balance.clover_count` 단일 값 + `clover_eligibility` + `my_cashout_status` | `SplitBalanceCard` 3값 필요 |
| 상태 화면 | `web/src/app/(receiver)/cashout/status/page.tsx:28-29` | `my_cashout_status` + `clover_balance` | 동일 + locked |

> **핵심 실측 1**: `clover_balance`는 원장 delta 합산이 아니라 **`balance_after` 스냅샷 대입**이다. 따라서 "delta가 몇이냐"보다 **"어떤 엔트리가 `balance_after`를 어떻게 쓰느냐"** 가 총량을 결정한다. A안 구현의 실질 지점은 여기다.
> **핵심 실측 2**: `clover_balance.clover_count`에 `CHECK (clover_count >= 0)` 이 걸려 있다(`20260705163137_init_schema.sql`). PAID 시 음수가 되면 트랜잭션이 터진다 → §7 불변식 ②의 DB 레벨 백스톱.

---

## 5. 아키텍처

### 5.1 시스템 컨텍스트 (C4 Level 2 축약)

```mermaid
flowchart TD
  U["받는 사람 (브라우저)"] -->|"RSC fetch"| ME["/me · /cashout · /cashout/status · /cashout/history<br/>Next.js App Router (RSC)"]
  A["운영자 (회장)"] -->|"RSC + Server Action"| ADM["/admin 환전 큐"]

  ME -->|"anon JWT RPC"| RPC["Supabase PostgREST"]
  ADM -->|"admin JWT RPC"| RPC
  ME -->|"Server Action"| SA["cashout/actions.ts<br/>service_role 클라이언트"]
  SA -->|"service_role RPC"| RPC

  RPC --> F1["clover_eligibility(uuid)<br/>SECURITY DEFINER"]
  RPC --> F2["my_cashout_status() / my_cashout_history(int)"]
  RPC --> F3["create_cashout_request(...)"]
  RPC --> F4["admin_mark_cashout_paid / admin_reject_cashout"]

  F1 --> T1[("clover_balance")]
  F1 --> T2[("cashout_request")]
  F3 --> T2
  F3 --> T3[("clover_ledger (append-only)")]
  F4 --> T2
  F4 --> T3
  T3 -->|"AFTER INSERT trigger<br/>sync_clover_balance()"| T1
```

### 5.2 ERD (이번 변경이 닿는 범위)

```mermaid
erDiagram
  member ||--|| clover_balance : "1:1 파생 캐시"
  member ||--o{ clover_ledger : "append-only 원장"
  member ||--o{ cashout_request : "환전 신청"
  cashout_request ||--o{ clover_ledger : "ref_type='cashout_request'"

  member {
    uuid id PK
    text nickname
    text phone
    text kyc_status
  }
  clover_balance {
    uuid member_id PK
    integer clover_count "CHECK >= 0. 총 클로버(total). 트리거가 balance_after로 덮어씀"
    timestamptz updated_at
  }
  clover_ledger {
    bigint id PK
    uuid member_id FK
    clover_entry_type_enum entry_type "EARN|CASHOUT_HOLD|CASHOUT_SETTLED|CASHOUT_REVERSAL|REFUND_REVERSAL|WELCOME_GRANT|WELCOME_REVERSAL"
    integer clover_delta "A안: 잠금 0 / 확정차감 -N / 잠금해제 0"
    text ref_type
    bigint ref_id FK
    integer balance_after "총량 스냅샷. 총량의 유일한 기록자"
    timestamptz created_at
  }
  cashout_request {
    bigint id PK
    uuid member_id FK
    integer clover_amount "잠긴 수량의 진실원"
    bigint gross_krw
    bigint fee_krw "이용료+VAT"
    bigint withholding_krw
    bigint net_krw "잠김 행의 'N원 입금 예정'"
    cashout_status_enum status "REQUESTED|KYC_PENDING|APPROVED|PAYOUT_SENT|PAID|REJECTED"
    text account_masked
    text request_key UK
    jsonb request_fingerprint
    timestamptz requested_at
    timestamptz paid_at
    timestamptz rejected_at
  }
```

### 5.3 핵심 유저플로우 (신청 → 입금 완료)

```mermaid
sequenceDiagram
  actor U as 받는 사람
  participant W as /cashout (RSC)
  participant SA as actions.ts (service_role)
  participant DB as Postgres RPC
  actor A as 운영자

  U->>W: 환전 화면 진입
  W->>DB: clover_eligibility(uid)
  DB-->>W: total 52 / locked 0 / available 52 / payable 49
  U->>SA: createCashoutRequest(계좌, request_key)
  SA->>DB: create_cashout_request(...)
  Note over DB: advisory lock → 멱등 조회 → 중복신청 차단<br/>clover_balance FOR UPDATE
  DB->>DB: cashout_request INSERT (REQUESTED, clover_amount=40)
  DB->>DB: 잠금 표식 기록 (총량 불변, balance_after = 52)
  DB-->>SA: net_krw 34,426 / is_replay=false
  W-->>U: "모은 52개는 그대로. 그중 40개에 잠금"
  U->>W: /me 재방문
  W->>DB: clover_eligibility(uid)
  DB-->>W: total 52 / locked 40 / available 12
  A->>DB: admin_mark_cashout_paid(#3041)
  Note over DB: 상태 가드 status='REQUESTED' + advisory lock<br/>clover_balance FOR UPDATE
  DB->>DB: status=PAID, paid_at=now()
  DB->>DB: CASHOUT_SETTLED delta -40, balance_after = 12
  DB-->>A: PAID
  W-->>U: "잠겨 있던 40개는 이 돈으로 바뀌었어요. 52 → 12"
```

---

## 6. ⛔ 회장 결정 항목 (D1~D4)

> 아래 4건은 **되돌리기가 비싼 결정**이라 세션이 닫지 않는다. 추천안은 밝히되 회장이 고른다. D1을 고르면 D2는 자동으로 정해진다.

### D1. 잠금을 원장에 어떻게 표현할 것인가 (핵심)

- **배경**: 지금은 신청 시 `CASHOUT_HOLD(−N)` 원장 한 줄이 들어가고, 트리거가 그 `balance_after`를 총량으로 대입해 총량이 즉시 줄어든다. A안은 이 줄이 총량을 건드리면 안 된다. 총량 불변을 만드는 방법이 두 갈래다.
- **무엇을 정하나**: 잠금 사건을 **원장에 남길 것인가(A-1), 신청 테이블만으로 표현할 것인가(A-2)**.

**옵션 A-1 (추천): 원장에 `CASHOUT_HOLD`를 남기되 `clover_delta = 0`, `balance_after = 변경 전 총량`으로 기록**
- 고르면: 잠금이 **몇 시 몇 분에 걸렸는지**가 append-only 원장에 남는다. 감사·CS 대응 시 "왜 이때부터 12개만 쓸 수 있었나"를 원장 한 줄로 설명할 수 있다. 지급 확정은 `CASHOUT_SETTLED delta −N`, 반려는 `CASHOUT_REVERSAL delta 0`(잠금 해제 표식)로 대칭이 유지된다. 기존 `cashout_terminal_ledger_unique` 유니크 인덱스(SETTLED/REVERSAL 1회 보장)가 그대로 산다.
- 안 고르면 생기는 리스크: 잠금 시각이 `cashout_request.requested_at` 하나에만 남는다. 신청 취소·재신청 이력이 늘어나면 "언제부터 언제까지 얼마가 묶여 있었나"를 원장으로 재구성할 수 없다.
- 대가: `clover_delta = 0`인 원장 행이 생긴다. "원장은 잔액 변동만 적는다"는 통념과 어긋나 보인다. **다만 이 레포에는 이미 선례가 있다** (현행 `CASHOUT_SETTLED`가 `delta 0`으로 기록되고 있다, `20260728010000` 참조).

**옵션 A-2: 신청 시 원장을 아예 쓰지 않는다. 잠김은 `cashout_request` 상태에서만 파생**
- 고르면: 변경 폭이 가장 작다. `create_cashout_request`에서 원장 INSERT 블록을 삭제하기만 하면 총량은 자동으로 불변이 된다. 원장은 "실제로 잔액이 움직인 사건"만 담게 돼 의미가 깨끗해진다.
- 트레이드오프: 잠금·잠금 해제가 원장에 안 남아 **원장만 봐서는 잠금 이력을 알 수 없다**. 또 `/admin` 원장 조회 화면에서 환전 진행 중인 회원의 흔적이 지급 완료 전까지 보이지 않는다.
- 추천 근거: **A-1을 민다.** 이 제품은 돈이 나가는 제품이고, 잠금은 사용자 잔액 체감을 바꾸는 사건이다(사용 가능 52 → 12). 체감이 바뀐 사건이 감사 로그에 없으면 CS 분쟁에서 재구성이 불가능하다. `delta 0` 행의 어색함은 컬럼 주석 한 줄로 해소되지만, 없는 기록은 사후에 만들 수 없다. 업계 정본도 잠금을 **별도 상태의 전표**로 남긴다(TigerBeetle `pending` 전표, Formance 2-phase posting — §15).

### D2. 마이그레이션 전략

- **배경**: 운영 DB를 읽기 전용으로 조회한 결과 `cashout_request` **0건**, `clover_ledger`의 `CASHOUT_*` 엔트리 **0건**이다(§11 원문). 즉 B안 의미로 기록된 데이터가 **하나도 없다**.
- **무엇을 정하나**: 백필/보정 마이그레이션을 만들 것인가.
- **옵션 B-1 (추천): 백필 없음. 함수만 `CREATE OR REPLACE`로 교체하고, 과거 데이터 해석 규칙은 주석으로만 박제**
  - 고르면: 마이그레이션 1개로 끝난다. 데이터 손상 위험 0.
  - 안 고르면: 존재하지 않는 행을 위한 보정 SQL을 짜게 되고, 그 SQL 자체가 새 위험이 된다.
- **옵션 B-2: 방어적 백필 스크립트를 함께 넣는다(과거 `CASHOUT_HOLD(−N)` 행이 있으면 총량 재계산)**
  - 고르면: 로컬/스테이지에 수동 시드된 데이터가 있어도 일관성이 맞는다.
  - 트레이드오프: 운영에서는 0행에 대해 도는 죽은 코드이고, 잘못 짜면 **총량을 실제로 바꾸는** 유일한 위험 코드가 된다.
- **추천 근거**: B-1. 실측 0건이라 B-2의 유일한 효용은 개발 환경 편의인데, 개발 환경은 `supabase db reset`으로 다시 만들면 된다. **머니 코드에 죽은 쓰기 경로를 두지 않는다.**

### D3. `clover_eligibility` 확장이냐, 새 RPC 신설이냐

- **배경**: 화면은 총량·잠김·사용가능 세 값을 받아야 하는데(`user-flow.md` §5.5), 지금 그 값을 한 번에 주는 API가 없다. `/me`는 `clover_balance` 테이블 직접 조회 + `clover_eligibility` + `my_cashout_status` 세 번을 나눠 부른다.
- **무엇을 정하나**: 기존 `clover_eligibility`에 컬럼을 더할지, 별도 RPC를 세울지.
- **옵션 C-1 (추천): `clover_eligibility`에 `locked_amount`·`available_amount` 2컬럼 추가 + `payable_amount` 의미 보정**
  - 고르면: 호출부가 늘지 않는다(`/me`·`/cashout`이 이미 이 함수를 부른다). 잠김을 뺀 `payable_amount`가 같은 트랜잭션·같은 스냅샷에서 계산돼 **화면 세 값이 서로 어긋날 수 없다**.
  - 대가: `RETURNS TABLE` 컬럼 추가는 `CREATE OR REPLACE`로 불가능해 **`DROP FUNCTION` 후 재생성**이 필요하다. 그러면 GRANT를 반드시 다시 걸어야 하고(빠뜨리면 즉시 403), 생성된 타입(`database.types.ts`) 재생성이 따라온다. → build 단계 체크리스트 항목으로 못박는다.
  - 안 고르면 리스크: 화면이 총량과 잠김을 서로 다른 쿼리에서 읽게 되고, 그 사이에 지급 확정이 끼면 `available = total − locked` 항등식이 한순간 깨진다(§15 "balance conflation").
- **옵션 C-2: `my_clover_balance()` RPC 신설, `clover_eligibility`는 손대지 않음**
  - 고르면: 기존 함수 시그니처·권한을 건드리지 않아 회귀 위험이 낮다.
  - 트레이드오프: 같은 사실을 말하는 함수가 둘이 된다. `payable_amount`는 어차피 잠김을 빼도록 **의미를 바꿔야 하므로**(안 그러면 잠긴 클로버로 또 신청 계산이 돈다) `clover_eligibility` 무수정은 사실상 성립하지 않는다.
- **추천 근거**: C-1. C-2는 "안 건드린다"는 장점이 실제로는 성립하지 않는다(§8-4 참조).

### D4. 잠긴 상태에서 `reached_threshold`(최소 환전 도달) 기준

- **배경**: 지금 `reached_threshold = (total >= 30)`이다. A안에서는 잠금 중에도 total이 52로 유지되므로, 사용 가능이 12뿐인데 화면상 "환전 가능"으로 보일 수 있다.
- **무엇을 정하나**: 도달 판정의 모수를 `total`로 둘지 `available`로 바꿀지.
- **옵션 D-1 (추천): `reached_threshold`는 `total` 기준 그대로 두고, 진행 중 신청이 있으면 화면이 신청 폼 대신 **진행 상태**를 보여준다(현재 동작 유지)**
  - 고르면: 코드 변경 0. `create_cashout_request`의 `cashout_already_requested` 가드가 이미 이중 신청을 막고 있어 사용자가 잘못된 폼에 도달할 수 없다.
  - 안 고르면: 도달 판정 의미가 바뀌어 "조금만 더 모으면" 배너가 잠금 중에 오작동할 수 있다(총 52개인데 "30개까지 18개 남았어요"가 뜨는 역행).
- **옵션 D-2: `reached_threshold`를 `available >= 30`으로 변경**
  - 고르면: 판정이 "지금 신청 가능한가"와 정확히 일치한다.
  - 트레이드오프: 잠금 중에는 항상 false가 되어 미달 배너 문구("조금만 더 모으면")가 사실과 다르게 뜬다. 별도 문구 분기를 새로 만들어야 한다.
- **추천 근거**: D-1. 진행 중 1건 제약(불변식 ③)이 이미 있으므로 도달 판정을 흔들 필요가 없다.

---

## 7. 상태 전이표 + 불변식 검증

### 7.1 불변식 5개 (user-flow.md §5.5 정본)

| # | 불변식 | DB 레벨 근거 |
|---|---|---|
| **I1** | `available = total − locked` (모든 상태) | 두 값을 **같은 RPC 한 번**에서 계산 (D3-C1) |
| **I2** | `locked ≤ total` (available 음수 금지) | 잠금 시 `locked ≤ payable = total − welcome ≤ total` + `clover_balance CHECK (clover_count >= 0)` |
| **I3** | 진행 중 환전은 1건 | `cashout_already_requested` 가드 + advisory lock + `clover_balance FOR UPDATE` |
| **I4** | `total`이 감소하는 이벤트는 **PAID 하나뿐** | 원장에서 `clover_delta < 0`을 쓰는 환전 엔트리는 `CASHOUT_SETTLED` 단 하나 |
| **I5** | 잠긴 클로버에 확정 실지급 원화가 붙어 있다 | `cashout_request.net_krw`가 신청 시점에 확정 기록됨(NOT NULL 경로) |

### 7.2 전이표 (예시값: total 52, welcome 3, 신청 40)

| # | 전이 | 트리거 | `cashout_request` | `clover_ledger` (D1=A-1 기준) | total | locked | available | I1 | I2 | I3 | I4 | I5 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T0 | 평시 | - | 없음 | - | 52 | 0 | 52 | ✅ 52=52−0 | ✅ | ✅ | ✅ | n/a |
| T1 | **신청 접수** | `create_cashout_request` | INSERT `REQUESTED` (clover_amount 40, net_krw 34,426) | `CASHOUT_HOLD` delta **0**, `balance_after` **52** | **52 (불변)** | 40 | 12 | ✅ 12=52−40 | ✅ 40≤52 | ✅ 1건 | ✅ 감소 없음 | ✅ 34,426원 |
| T1' | 멱등 재시도 (동일 `request_key`+동일 fingerprint) | 같은 RPC | 변화 없음, `is_replay=true` | **추가 기록 없음** | 52 | 40 | 12 | ✅ | ✅ | ✅ | ✅ | ✅ |
| T1'' | 이중 신청 시도 | 다른 `request_key` | 거부 `55000 cashout_already_requested` | 없음 | 52 | 40 | 12 | ✅ | ✅ | ✅ 유지 | ✅ | ✅ |
| T2 | 검토중/승인 (`KYC_PENDING`·`APPROVED`·`PAYOUT_SENT`) | 관리자 | status만 변경 | 없음 | 52 | 40 | 12 | ✅ | ✅ | ✅ | ✅ | ✅ |
| T3 | **입금 완료** | `admin_mark_cashout_paid` | `PAID`, `paid_at` | `CASHOUT_SETTLED` delta **−40**, `balance_after` **12** | **52 → 12** | **0** | 12 | ✅ 12=12−0 | ✅ | ✅ 종결 | ✅ **유일한 감소** | ✅ 이력에 보존 |
| T3' | 지급 확정 2회차 | 재호출 | 거부 `23505 cashout_already_paid` (status 가드) | 유니크 인덱스가 2번째 SETTLED 차단 | 12 | 0 | 12 | ✅ | ✅ | ✅ | ✅ 중복 감소 없음 | ✅ |
| T4 | **반려** | `admin_reject_cashout` | `REJECTED`, `rejected_at`, note | `CASHOUT_REVERSAL` delta **0**, `balance_after` **52** | **52 (불변)** | **0** | 52 | ✅ 52=52−0 | ✅ | ✅ 재신청 가능 | ✅ 감소 없음 | n/a |
| T4' | 반려 2회차 | 재호출 | 거부 `55000 invalid_cashout_status` | 유니크 인덱스가 2번째 REVERSAL 차단 | 52 | 0 | 52 | ✅ | ✅ | ✅ | ✅ | n/a |
| T5 | **이체 실패**(은행 반송) | 관리자 = 반려와 동일 경로 | `REJECTED` + note "이체 실패" | T4와 동일 | 52 | 0 | 52 | ✅ | ✅ | ✅ | ✅ | n/a |
| T6 | 잠금 중 새 응원 도착 | 결제 확정 `EARN` | 없음 | `EARN` delta +5, `balance_after` 57 | 52 → 57 | 40 | 17 | ✅ 17=57−40 | ✅ | ✅ | ✅ 증가 | ✅ |
| T7 | 잠금 중 웰컴 회수 | `WELCOME_REVERSAL` | 없음 | delta −3, `balance_after` 49 | 52 → 49 | 40 | 9 | ✅ 9=49−40 | ✅ **증명 §8-5** | ✅ | ⚠️ **§16-R2** | ✅ |

> **T5 주의**: 현재 스키마에 "이체 실패" 전용 상태가 없다. 회장 요구("반려·이체실패는 잠금 해제")는 `REJECTED` + `processing_note`로 충족되며, 화면 문구만 note로 갈린다. 별도 enum 값 신설은 이번 슬라이스 비범위다(§16-R3).
> **T7 주의**: 웰컴 회수는 총량을 줄이지만 잠긴 분은 애초에 웰컴을 제외하고 잠기므로 I2는 안전하다(§8-5 증명). 단 I4의 문구("총량 감소는 PAID 하나뿐")는 **환전 경로 한정**으로 읽어야 한다 — §16-R2에 오픈이슈로 올린다.

---

## 8. 파생값 정의 (총량·잠김·사용가능·지급가능)

이 4개 값은 **한 함수 안에서, 같은 스냅샷으로** 계산한다. 화면이 직접 빼거나 더하지 않는다.

1. `total   = clover_balance.clover_count` (없으면 0)
2. `welcome = GREATEST(SUM(delta) FILTER (entry_type IN ('WELCOME_GRANT','WELCOME_REVERSAL')), 0)` — **현행 그대로**
3. `locked  = COALESCE(SUM(cashout_request.clover_amount) FILTER (status IN ('REQUESTED','KYC_PENDING','APPROVED','PAYOUT_SENT')), 0)`
   - 진행 상태 목록은 `create_cashout_request`의 중복 차단 목록과 **같은 집합**이어야 한다. 두 곳이 어긋나면 I3이 깨진다. → 단일 상수(SQL 함수 `cashout_in_progress_statuses()` 또는 공용 배열)로 뽑는 것을 build에 권고.
4. `available = GREATEST(total − locked, 0)`
5. `payable   = GREATEST(total − welcome − locked, 0)`  ← **의미 변경 지점**
   - 변경 이유: 잠긴 분을 빼지 않으면, 잠금 중 사용자가 보는 "지급 가능"이 이미 신청한 몫을 또 포함한다. 신청 자체는 I3이 막지만 **화면 숫자가 거짓말을 한다**.
6. `reached_threshold = (total >= min_cashout_clover)` — **D4-D1 채택 시 현행 유지**

**§8-5 I2 성립 증명 (웰컴 회수 케이스)**
신청 시 `p_clover_amount ≤ payable = total − welcome − locked_before` 를 강제한다. 진행 중 1건 제약(I3)에서 `locked_before = 0`이므로 `locked ≤ total − welcome`. 이후 웰컴 회수는 total을 최대 `welcome`만큼 줄이므로 `total' ≥ total − welcome ≥ locked`. 따라서 `available' ≥ 0`. ∎

---

## 9. API 계약

### 9.1 `clover_eligibility(p_member_id uuid)` — **변경(D3-C1 채택 시)**

권한: `authenticated`(본인만) · `service_role`. 인가 판정은 현행 `auth.uid()`/`auth.role()` 규칙 유지.

요청
```json
{ "p_member_id": "ca500000-0000-0000-0000-000000000003" }
```

응답 (200) — 잠금 중(total 52 / welcome 3 / 신청 40)
```json
[
  {
    "total_balance": 52,
    "welcome_amount": 3,
    "locked_amount": 40,
    "available_amount": 12,
    "payable_amount": 9,
    "min_cashout_clover": 30,
    "reached_threshold": true
  }
]
```

응답 (200) — 평시(잠김 0)
```json
[
  {
    "total_balance": 52,
    "welcome_amount": 3,
    "locked_amount": 0,
    "available_amount": 52,
    "payable_amount": 49,
    "min_cashout_clover": 30,
    "reached_threshold": true
  }
]
```

| 필드 | 타입 | 신규 | 계약 |
|---|---|---|---|
| `total_balance` | `integer` | - | 총 클로버. PAID에서만 감소 |
| `welcome_amount` | `integer` | - | 웰컴 순합산, 0 하한 |
| `locked_amount` | `integer` | **신규** | 진행 중 환전 신청의 `clover_amount` 합 |
| `available_amount` | `integer` | **신규** | `total − locked`, 0 하한. **화면은 이 값을 그대로 그린다** |
| `payable_amount` | `integer` | 의미 변경 | `total − welcome − locked`, 0 하한 |
| `min_cashout_clover` | `integer` | - | 30 |
| `reached_threshold` | `boolean` | - | `total >= 30` (D4-D1) |

에러: `42501 forbidden`(타인 조회) — 현행 유지.

### 9.2 `my_cashout_status()` — **변경 없음(권장)**

- 이미 `clover_amount`(=잠긴 수량)·`net_krw`(=입금 예정액)·`status`를 반환한다. **I5가 요구하는 "잠긴 클로버에 붙은 확정 원화"는 이 응답으로 충족된다.**
- 화면은 `locked_amount`(9.1)와 이 응답의 `clover_amount`를 **둘 다 받지만 잠김 수치는 9.1을 정본으로 그린다**(단일 스냅샷 원칙). `my_cashout_status`는 상태·계좌·시각·금액 표시용이다.
- 계좌 필드는 `account_masked`(`••••••9012`)만. **`account_no_enc`는 반환형에 없다 — 이 계약을 약화하지 않는다.**

### 9.3 `create_cashout_request(...)` — **원장 기록 규칙만 변경**

시그니처·검증·멱등·암호화·마스킹 **전부 그대로**. 바뀌는 것은 마지막 원장 INSERT 한 블록뿐이다.

| 항목 | as-is | to-be (D1=A-1) |
|---|---|---|
| `entry_type` | `CASHOUT_HOLD` | `CASHOUT_HOLD` (유지) |
| `clover_delta` | `−p_clover_amount` | **`0`** |
| `balance_after` | `v_total − p_clover_amount` | **`v_total`** |
| 잔액 검증 | `p_clover_amount > v_payable` 거부 | 그대로 (단 `v_payable`이 locked를 뺀 값으로 바뀜) |

응답 (200) — 변경 없음
```json
[
  {
    "cashout_request_id": 8103,
    "status": "REQUESTED",
    "clover_amount": 40,
    "gross_krw": 40000,
    "fee_krw": 4400,
    "withholding_krw": 1174,
    "net_krw": 34426,
    "requested_at": "2026-08-21T01:23:45.000Z",
    "is_replay": false
  }
]
```

에러(전부 현행 유지): `22023 cashout_below_minimum` / `22023 cashout_insufficient_balance` / `22023 request_key_conflict` / `55000 cashout_already_requested` / `42501 cashout_kyc_required` / `55000 cashout_encryption_unavailable`.

### 9.4 `admin_mark_cashout_paid(p_request_id, p_processing_note)` — **총량 감소 지점**

| 항목 | as-is | to-be |
|---|---|---|
| `clover_delta` | `0` | **`−v_request.clover_amount`** |
| `balance_after` | `v_balance` | **`v_balance − v_request.clover_amount`** |
| 상태 가드 | `AND cr.status = 'REQUESTED'` | 그대로 |
| 잠금 | advisory lock + `clover_balance FOR UPDATE` | 그대로 |

응답
```json
[{ "cashout_request_id": 8103, "status": "PAID", "paid_at": "2026-08-23T04:10:00.000Z" }]
```
에러: `23505 cashout_already_paid` / `55000 invalid_cashout_status` / `42501 admin_forbidden`.
**추가 가드 권고(build)**: `v_balance − clover_amount < 0` 이면 `55000 cashout_settle_would_go_negative` 로 명시적 실패. `CHECK` 위반 메시지에 의존하지 않는다.

### 9.5 `admin_reject_cashout(p_request_id, p_processing_note)` — **잠금 해제(잔액 불변)**

| 항목 | as-is | to-be |
|---|---|---|
| `clover_delta` | `+v_request.clover_amount` | **`0`** |
| `balance_after` | `v_balance + clover_amount` | **`v_balance`** |
| note 필수 | 2~500자 | 그대로 |

응답
```json
[{ "cashout_request_id": 8104, "status": "REJECTED", "rejected_at": "2026-08-23T04:12:00.000Z" }]
```

### 9.6 관리자 목록 `admin_list_cashouts_v2` — **변경 없음**

`fee_krw` 1컬럼으로 내려오지만 관리자 화면은 §8.3-6에 따라 `이용료 10%` / `이용료 부가세 10%` 2줄로 **표시**해야 한다. `fee_krw`에서 `vat = fee_total − floor(fee_total/1.1)` 식 역산은 절사 때문에 **부정확할 수 있다**. → §16-R4 오픈이슈.

---

## 10. 동시성·멱등성

| 시나리오 | 방어 장치 | A안에서 깨지나 | 판정 |
|---|---|---|---|
| 동일 회원 병렬 신청 2건 | `pg_advisory_xact_lock('cashout_member:'||id)` → 직렬화 → 뒤엣놈이 `cashout_already_requested` | 락 자체는 무관. **다만 `locked` 계산이 `cashout_request` 조회이므로 advisory lock 뒤에 읽어야 한다** | ✅ 순서 유지 조건부 |
| 동일 `request_key` 재전송 | 선조회 + `ON CONFLICT (request_key) DO NOTHING` + fingerprint 대조 | 원장 INSERT는 `v_request_id IS NULL` 분기에서 **도달하지 않고 return** → 잠금 표식 중복 0 | ✅ |
| 지급 확정 2회 (double-paid race) | `UPDATE ... AND status='REQUESTED'` (한 트랜잭션만 성공) + `cashout_terminal_ledger_unique(entry_type, ref_id)` | **A안에서 위험도 상승**: 예전엔 SETTLED가 delta 0이라 중복돼도 잔액 무해했지만, 이제 delta −N이라 **중복 = 이중 차감**. 두 겹 방어(상태 가드 + 유니크)가 필수 | ⚠️ 회귀 테스트 필수 (§13 C4) |
| 반려와 지급 확정 동시 | 둘 다 `advisory_xact_lock('cashout_request:'||id)` + status 가드 | 그대로 | ✅ |
| 잠금 중 응원 도착(EARN) | `EARN`은 자기 경로에서 `balance_after` 계산 | total 증가, locked 불변 → I1 유지 | ✅ (T6) |
| 잠김 조회와 총량 조회 사이 PAID 발생 | 두 값을 **한 함수 한 스냅샷**에서 계산(D3-C1) | 분리 조회 시 I1 순간 위반 | ✅ C1 채택 조건부 |

**build 필수 순서 규약**: `create_cashout_request` 안에서 ① advisory lock → ② `clover_balance FOR UPDATE` → ③ `clover_eligibility`(= locked 포함) 조회 → ④ 금액 검증 → ⑤ INSERT. 현행 코드가 이미 ①②③ 순서다. `locked` 계산이 ③ 안으로 들어가므로 순서를 바꾸지 말 것.

---

## 11. 기존 데이터 정합 (운영 DB 실조회)

**증거 등급: 관찰됨.** 2026-08-21, `supabase db query ... --linked` **읽기 전용** 조회. 쓰기 없음.

```
-- clover_ledger 엔트리 분포
EARN              9건  합계  +13
WELCOME_GRANT    13건  합계  +39
WELCOME_REVERSAL 11건  합계  −33
→ CASHOUT_HOLD / CASHOUT_SETTLED / CASHOUT_REVERSAL : 0건

-- cashout_request
(rows: 없음)

-- clover_balance
회원 2명 · 총 클로버 합계 19
```

**해석 규칙**

1. **B안 의미로 기록된 행이 운영에 0건이다.** 따라서 "기존 `CASHOUT_HOLD(−N)`을 어떻게 재해석할 것인가"라는 문제는 **운영에서는 발생하지 않는다** (→ D2-B1 추천 근거).
2. 그럼에도 원장은 append-only이므로, 만약 어떤 환경에 과거 행이 있다면 **소급 수정하지 않는다.** 대신 새 마이그레이션 파일 주석과 `COMMENT ON TYPE clover_entry_type_enum`에 **"2026-08-21 이전 `CASHOUT_HOLD`는 delta<0(즉시 차감), 이후는 delta=0(잠금 표식)"** 이라는 시점 규칙을 박제한다. 원장 해석은 시간 축으로 갈린다.
3. 로컬/스테이지 개발 DB는 `supabase db reset`으로 재구성한다(백필 아님).

---

## 12. 화면 ↔ API ↔ 값 ↔ 테이블 1:1 매핑

정본 프로토: `scratchpad/cashout-full-journey-v3-opus.html` **v3.6** (내비 7화면 + 플로우 맵).

| # | 프로토 화면 | 실구현 라우트 / 컴포넌트 | 호출 API | 필요한 값 | 테이블 | 갭 |
|---|---|---|---|---|---|---|
| 1 | **/me 홈 — 분할 잔액** (`hCount` 총량, `splitrow` 2행) | `web/src/app/(receiver)/me/page.tsx` → **`SplitBalanceCard`(DESIGN §4, 신규)** | `clover_eligibility` | `total_balance`, `locked_amount`, `available_amount` + 잠김 행의 `net_krw` | `clover_balance`, `cashout_request` | **없음** (9.1 신규 2컬럼 + 9.2 `net_krw`로 충족) |
| 1b | /me 홈 — 잠김 0 (블록 소멸) | 같은 컴포넌트, `locked_amount === 0`이면 렌더 안 함 | `clover_eligibility` | `locked_amount === 0` | 동일 | 없음 |
| 1c | /me 홈 — 총량 옆 등가 은닉 | `krwEquivalent` 조건부 | 없음(클라 계산) | `locked_amount > 0` | - | 없음 |
| 2 | **/cashout 신청** (차감표 + 확인 배너 "52개는 그대로") | `web/src/app/(receiver)/cashout/page.tsx`, `CashoutRequestForm.tsx` | `clover_eligibility`, `my_cashout_status`, `my_cashout_history`, `member` | `payable_amount`(잠김 차감), `total_balance`, `min_cashout_clover`, `reached_threshold`, `phone` | `clover_balance`, `clover_ledger`, `cashout_request`, `member` | 없음 (배너 문구는 클라 문자열) |
| 2b | /cashout 신청 제출 | `cashout/actions.ts` → service_role | `create_cashout_request` | `net_krw`, `is_replay` | `cashout_request`, `clover_ledger` | 없음 |
| 2c | /cashout 미달(29개) | 같은 페이지 배너 | `clover_eligibility` | `reached_threshold=false`, `total_balance` | `clover_balance` | 없음 (D4-D1 채택 시) |
| 3 | **신청 이후 5상태**(접수·확인중·반려·이체실패·입금완료) | `web/src/app/(receiver)/cashout/status/page.tsx` | `my_cashout_status` + `clover_eligibility` | `status`, `net_krw`, `account_masked`, `requested_at`/`paid_at`/`rejected_at`, `processing_note`, + **입금완료 배너용 `total_balance`(=12)** | `cashout_request`, `clover_balance` | **없음.** 단 현재 코드가 `clover_balance` 테이블을 직접 읽으므로 **`clover_eligibility` 호출로 교체**해야 I1이 보장된다(build 작업 항목) |
| 4 | **환전 내역** | `web/src/app/(receiver)/cashout/history/page.tsx` | `my_cashout_history(100)` | `status`, `clover_amount`, `net_krw`, 시각 | `cashout_request` | 없음 |
| 5 | **관리자 처리 큐** | `/admin` | `admin_list_cashouts_v2` | `clover_amount`, `gross_krw`, `fee_krw`, `withholding_krw`, `net_krw`, `account_masked`, `status` | `cashout_request`, `member` | 없음 (이용료 2줄 표시는 §16-R4) |
| 6 | **관리자 신청 상세** | `/admin` 상세 | `admin_list_cashouts_v2` + `admin_reveal_cashout_account` | 위 + 계좌 원문(감사 로그 동반) | + `cashout_account_access_log` | 없음 |
| 7 | **관리자 확인 모달**(지급/반려 확정) | `/admin` Server Action | `admin_mark_cashout_paid` / `admin_reject_cashout` | 결과 status·시각 | `cashout_request`, `clover_ledger` | 없음 |

### 12.1 `user-flow.md` §1.2 분기 ↔ 설계 매핑 (전수)

| user-flow §1.2 상태 | 설계 대응 | 갭 |
|---|---|---|
| 환전 임계 미달 | D4-D1 · 매핑 2c | 없음 |
| 환전 KYC 미완 | `cashout_require_kyc()=false` 현행 유지(비범위) | 없음 |
| **환전 신청 접수(잠김 발생)** | T1 · 매핑 1·3 | 없음 |
| **환전 반려·이체 실패** | T4·T5 · 매핑 3 | 없음 (이체실패 전용 enum은 §16-R3) |
| **입금 완료(총량 감소)** | T3 · 매핑 3 (배너에 `total_balance` 필요) | 없음 |
| 목표 마감 | 환전과 무관(적립형) | 없음 |

> **매핑 갭: 0.** 프로토 v3.6 7화면 + user-flow §1.2 환전 분기 전수가 (API + 컴포넌트 + 테이블)에 1:1로 붙는다.

---

## 13. test-plan

### 13.1 불변식 → 테스트 1:1 (필수. 5개 각각이 독립 테스트여야 한다)

| 불변식 | 테스트 ID | 계층 | Given / When / Then |
|---|---|---|---|
| **I1** `available = total − locked` | `A-I1` | pgTAP | Given total 52·welcome 3인 회원 / When 40 신청 후 `clover_eligibility` 조회 / Then `available_amount = total_balance − locked_amount` 이고 `(52,40,12)` |
| **I1** (전 상태 순회) | `A-I1b` | pgTAP | Given 신청 완료 / When 평시→신청→PAID, 평시→신청→REJECTED 각 시점마다 조회 / Then 매 시점 `available = total − locked` |
| **I2** `locked ≤ total` | `A-I2` | pgTAP | Given 잠김 40 / When 웰컴 3 회수(`WELCOME_REVERSAL`) / Then `available_amount = 9` 이고 `>= 0`, `clover_count CHECK` 위반 없음 |
| **I3** 진행 중 1건 | `A-I3` | pgTAP | Given `REQUESTED` 1건 / When 다른 `request_key`로 재신청 / Then `55000 cashout_already_requested`, `locked_amount`는 여전히 40 |
| **I4** 총량 감소는 PAID뿐 | `A-I4` | pgTAP | Given 신청·반려 각 1건 / When 신청 직후·반려 직후 잔액 조회 / Then 두 시점 모두 `clover_count = 52` (불변). PAID 후에만 12 |
| **I4** (원장 관점) | `A-I4b` | pgTAP | When 전체 시나리오 종료 / Then `cashout_request` 참조 원장 중 `clover_delta < 0` 인 행은 `CASHOUT_SETTLED` 뿐이고 정확히 1건 |
| **I5** 잠김에 확정 원화 | `A-I5` | pgTAP | Given 40 신청 / When `my_cashout_status()` / Then `clover_amount=40`, `net_krw=34426` (§6-(c) 기준값) |

### 13.2 pgTAP 추가 케이스 (`supabase/tests/cashout_manual.test.sql` 확장)

| ID | 검증 |
|---|---|
| C1 | 30 신청 → `(gross, fee, withholding, net) = (30000, 3300, 881, 25819)` **기존 유지, 변경 금지** |
| C2 | 40 신청 → `(40000, 4400, 1174, 34426)` **신규 추가**(DESIGN §6-(c) 두 번째 기준값이 테스트에 없다) |
| C3 | 신청 직후 `CASHOUT_HOLD` 1건이고 `clover_delta = 0`, `balance_after = 신청 전 total` (D1=A-1) |
| C4 | **이중 지급 방어**: 같은 request에 `admin_mark_cashout_paid` 2회 → 2회차 `23505`, `CASHOUT_SETTLED` 1건, 잔액 1회만 감소 |
| C5 | 반려 후 `clover_count`가 **변하지 않음**(기존 T10의 "복원 1회" 단언을 "불변" 단언으로 대체) |
| C6 | 반려 후 재신청 성공(잠금 해제 확인) |
| C7 | `payable_amount`가 잠김을 뺀 값(잠김 40일 때 payable 9) |
| C8 | 멱등 재시도(`is_replay=true`)가 `CASHOUT_HOLD`를 중복 생성하지 않음 **(기존 T4 유지)** |
| C9 | 계좌 마스킹 `••••••9012` + `key_version=1` **(기존 T7 그대로. 약화 금지)** |
| C10 | `my_cashout_status`/`my_cashout_history` 응답에 `account_no_enc` 미포함 **(기존 T13 그대로. 약화 금지)** |
| C11 | 타인 `clover_eligibility` 호출 시 `42501 forbidden` (신규 컬럼 추가 후 권한 회귀 확인) |

### 13.3 동시성 (`supabase/tests/concurrency/`)

| 스크립트 | 변경 |
|---|---|
| `cashout_double_request_race.sh` | 단언 수정: `CASHOUT_HOLD` 1건은 유지, **잔액은 감소하지 않고 그대로**여야 함(현재는 "음수 없음"만 확인) |
| `cashout_double_paid_race.sh` | **강화 필수**: 병렬 지급 확정 2건 중 1건만 성공 + `clover_count`가 정확히 `N−40` (이중 차감 0). A안에서 위험도가 올라간 경로 |

### 13.4 vitest (`web/src/**/__tests__`)

| ID | 대상 | 검증 |
|---|---|---|
| V1 | `SplitBalanceCard` | `locked=0`이면 분할 블록 미렌더 (DESIGN §6-(d)) |
| V2 | `SplitBalanceCard` | `locked>0`이면 총량·2행 렌더, 총량 옆 원화 등가 미표시, 잠김 행에 "34,426원 입금 예정" |
| V3 | `SplitBalanceCard` | `available = total − locked` 가 props 계산이 아니라 **전달받은 값**으로 렌더되는지(직접 계산 금지) |
| V4 | `me/page.test.tsx` | mock `clover_eligibility`가 3값 반환 시 홈이 총량 52 + 잠김 40 렌더 |
| V5 | `cashout/page.test.tsx` | `payable_amount`가 잠김 차감값으로 미리보기 계산 |
| V6 | `cashout-fee.ts` | 30,000 / 40,000 기준값 회귀 **(기존 유지)** |

### 13.5 Playwright (`web/e2e/cashout-manual.spec.ts`)

| ID | 검증 |
|---|---|
| E1 | 신청 성공 후 `/me` 총량이 **줄지 않고** 분할 표시가 뜬다 (현재 fixture는 `totalBalance -= cloverAmount` 로 **반대로 동작 — 반드시 수정**) |
| E2 | 반려 상태에서 "잠금이 풀렸어요" 문구 + 총량 불변 |
| E3 | 입금 완료 상태에서 총량 감소 + "52개에서 12개가 됐어요" 이유 문구 + 환전 내역 링크 |
| E4 | 진행 중 재신청 차단 화면 **(기존 유지)** |
| E5 | 마스킹 계좌 렌더 **(기존 유지. 약화 금지)** |

---

## 14. 깨지는 기존 테스트

실제 파일을 읽고 확인한 목록이다. **"깨진다"는 것은 A안이 맞기 때문에 깨지는 것이며, 단언을 A안 기준으로 다시 쓰는 것이 정답이다. 보안 단언은 손대지 않는다.**

| # | 파일 · 위치 | 현재 단언 | A안에서 | 조치 |
|---|---|---|---|---|
| 1 | `supabase/tests/cashout_manual.test.sql` T10 (`clover_count = 40`, "반려 잔액은 정확히 1회만 복원") | 반려 후 40으로 **복원**됨을 검증 | **값 40은 우연히 같지만 의미가 반대**다(A안은 애초에 줄지 않음). 중간 시점 검증이 없어 통과해버릴 수 있는 **가짜 통과** | **재작성**: 신청 직후에도 40, 반려 후에도 40임을 **두 시점 모두** 단언 (C5) |
| 2 | `cashout_manual.test.sql` T9 (`CASHOUT_SETTLED` 1건) | 건수만 확인 | 건수는 유지되나 **delta·잔액 검증이 없다** | **보강**: delta `−N`, `clover_count` 감소 확인 (C4) |
| 3 | `cashout_manual.test.sql` T4 (HOLD 중복 생성 안 함) | 건수 1 | 유지. 단 delta 0 검증 추가 필요 | **보강** (C3) |
| 4 | `cashout_manual.test.sql` `SELECT plan(31)` | 31개 | 케이스 추가로 숫자 변경 | **plan 수 갱신** |
| 5 | `supabase/tests/concurrency/cashout_double_request_race.sh:71-81` | `HOLD_ROWS`=1, "잔액 음수 없음" | 잔액이 **아예 안 줄어야** 함 | **단언 강화** |
| 6 | `supabase/tests/concurrency/cashout_double_paid_race.sh:108-119` | `PAID_ROWS=1`, `SETTLED_ROWS=1` 만 확인. **잔액 단언이 아예 없다** (지금은 SETTLED delta 0이라 잔액을 볼 이유가 없었다) | A안에서 SETTLED가 `−N`이 되어 이중 차감 위험이 신규 발생하는데 이를 잡는 단언이 없다 | **필수 강화**: `clover_count = 시작값 − 40` 단언 추가 (13.3) |
| 7 | `web/e2e/cashout-manual.spec.ts:258-259` `fixture.totalBalance -= cloverAmount; fixture.payableAmount -= cloverAmount;` | 신청 시 총량을 깎는 **B안 fixture** | **A안 정면 위반** | **수정**: `totalBalance` 불변, `lockedAmount = cloverAmount`, `payableAmount -= cloverAmount` 유지 |
| 8 | `web/e2e/cashout-manual.spec.ts:152-160` `clover_eligibility` fixture | `total/welcome/payable/min/reached` 5필드 | 신규 2필드 누락 | **fixture 확장** |
| 9 | `web/e2e/cashout-manual.spec.ts:288-291` `/rest/v1/clover_balance` fixture | `clover_count = totalBalance` | 유지 가능하나 status 페이지가 `clover_eligibility`로 옮겨가면 미사용 | **매핑 3 변경에 맞춰 조정** |
| 10 | `web/src/app/(receiver)/me/__tests__/page.test.tsx:58-65` | `clover_eligibility` mock + `clover_balance {clover_count:5}` | 신규 컬럼 미반환 → `locked` undefined | **mock 확장** |
| 11 | `web/src/app/(receiver)/cashout/__tests__/page.test.tsx:32` | `clover_eligibility` mock | 동일 | **mock 확장** |
| 12 | `web/src/lib/supabase/database.types.ts:743` `clover_eligibility` 타입 | 5필드 | 7필드 | **타입 재생성**(`supabase gen types`) |

**절대 약화 금지 (그대로 통과해야 함)**: T7 계좌 마스킹 `••••••9012` · T13 `account_no_enc` 미노출 · T12 감사 로그 ACL · admin RPC 권한 단언 · `cashout_security_hardening.test.sql` 전량 · `C1` 30,000원 기준값.

---

## 15. 벤치마크

동종 최고 수준의 원장 설계를 실조사했다(2026-08-21 WebSearch).

| # | 출처 | 조사한 실제 내용 | 차용 | 다르게 한 것 |
|---|---|---|---|---|
| 1 | **TigerBeetle — Two-Phase Transfers** (docs.tigerbeetle.com/coding/two-phase-transfers/) | 전표를 `pending` 상태로 먼저 만들어 금액을 `debits_pending`에 **예약**하고, 이후 `post_pending_transfer`(확정) 또는 `void_pending_transfer`(취소)로 종결한다. "pending 전표는 수정하지 않고 **새 전표를 만들어** 종결한다." 한 번만 post/void 가능 | ①**잠금 = 별도 전표**(수정이 아니라 추가) → D1-A-1의 `CASHOUT_HOLD` 표식 ②종결 전표는 정확히 1회(`cashout_terminal_ledger_unique`가 이미 같은 보장) ③"확정 시점에만 posted 잔액 이동" = A안 그 자체 | TigerBeetle은 계정에 `debits_pending` 컬럼을 따로 둔다. 우리는 규모가 작고 진행 중 신청이 최대 1건(I3)이라 **별도 잔액 컬럼 없이 `cashout_request`에서 파생**한다(스키마 추가 0). timeout 자동 만료도 도입하지 않는다(수동 정산 운영이라 만료 개념이 없다) |
| 2 | **Formance — Ledger balance vs available balance** (formance.com/blog/.../ledger-balance-for-product-and-engineering) | "ledger / available / pending **3개 잔액**을 함께 추적한다. 코드가 한 잔액을 읽고 다른 잔액으로 행동하면 그것이 **balance conflation**이고 핀테크 운영 버그의 대부분이다." `available = current − pending − holds`. "available은 캐시가 아니라 **원장에서 직접** 읽어야 한다" | ①세 값을 **한 RPC 한 스냅샷**에서 반환(D3-C1) ②화면이 available을 직접 빼지 않고 **값으로 받는다**(user-flow §5.5와 정확히 일치) ③"stale 캐시 금지" → `clover_balance`는 캐시이지만 `locked`와 **같은 트랜잭션**에서 읽게 강제 | 은행은 available/current를 **상시 2단 표기**한다. 우리는 Discreet 원칙상 **잠김이 0이면 분할 블록을 통째로 숨긴다**(DESIGN §6-(d)). 잠금이 평시가 아니라 예외 상태라는 제품 판단 |
| 3 | (보조) **AccountingTools / ConnectPay** — ledger vs available balance | `available = ledger − holds − uncollected` 표준 정의 | 항등식 I1의 업계 표기 확인 | 우리는 "uncollected(미결제 입금)" 개념이 없다. 응원 결제는 확정(`CONFIRMED`) 후에만 `EARN` 원장이 생기므로 pending credit이 존재하지 않는다 |

**표준 크로스워크**(doc-review.md §6): 본 문서 구조는 **arc42**(컨텍스트·빌딩블록·런타임·횡단·리스크·용어) + **C4 Level 2**(§5.1) + **Gherkin Given/When/Then**(§13.1 불변식 AC) + **ISO/IEC/IEEE 29148 RTM**(§12 추적 매핑표)를 따랐다.

---

## 16. 리스크 · 오픈이슈

| ID | 리스크 | 영향 | 완화 |
|---|---|---|---|
| **R1** | `admin_mark_cashout_paid` 이중 실행 = **이중 차감**(A안에서 신규 발생) | 사용자 잔액이 잘못 깎임. 머니 사고 | 상태 가드 + 유니크 인덱스 2겹 + `cashout_double_paid_race.sh` 강화 + 음수 방어 명시 에러(9.4) |
| **R2** | 불변식 I4("총량 감소는 PAID 하나뿐")는 **환전 경로 한정**이다. `WELCOME_REVERSAL`·`REFUND_REVERSAL`도 총량을 줄인다(운영에 REVERSAL 11건 실재) | 화면 문구 "모은 개수는 그대로예요"가 웰컴 회수·응원 환불 시 어긋날 수 있음 | ⛔ **회장 확인 필요**: I4를 "환전으로 인한 감소는 PAID뿐"으로 좁혀 읽는 것이 맞는지. 좁혀 읽는 것이 사실과 부합하고 화면 약속도 지켜진다는 것이 세션 판단이나, 문구 수정 여부는 design 소관 |
| **R3** | "이체 실패" 전용 상태가 enum에 없어 `REJECTED` + note로 표현 | 관리자 통계에서 반려와 이체실패가 섞임 | 이번 비범위. 필요 시 후속 슬라이스에서 `PAYOUT_FAILED` 신설 |
| **R4** | `admin_list_cashouts_v2`가 `fee_krw`(이용료+VAT) 1컬럼만 반환하는데 관리자 화면은 2줄 표시가 요구됨(DESIGN §8.3-6). 절사 때문에 역산이 부정확할 수 있음 | 관리자 이체 대사 시 1원 단위 불일치 | 후속: `cashout_request`에 `fee_base_krw`/`fee_vat_krw` 분리 저장 또는 목록 RPC에 2컬럼 추가. **이번 슬라이스 비범위, 오픈이슈로 등록** |
| **R5** | `clover_eligibility` DROP/재생성 시 GRANT 누락 | 즉시 403 | build 체크리스트에 GRANT 재확인 + `C11` 권한 회귀 테스트 |
| **R6** | 진행 상태 집합(`REQUESTED,KYC_PENDING,APPROVED,PAYOUT_SENT`)이 `locked` 계산과 중복 신청 차단에서 **따로 하드코딩**되면 어긋남 | I3 붕괴 | 단일 함수/상수로 뽑기(§8-3) |

---

## 17. 개정 이력

| 버전 | 일자 | 내용 |
|---|---|---|
| v1.0.0 | 2026-08-21 | 초판. 회장 확정 A안("실제로 빠져나갔을때 빠져나가야지")을 원장 의미·파생값·API 계약·상태 전이·테스트로 옮김. 회장 결정 4건(D1~D4) 개방. 운영 DB 실조회로 환전 원장 0건 확인 |

---

### 셀프심문 (CoVe — 결론 직전)

**Q1. 이 설계가 틀렸다면 가장 그럴듯한 이유는?**
"잠김을 `cashout_request`에서 파생하면, 원장(append-only)과 신청 테이블(가변 status)이라는 **성격이 다른 두 소스**가 하나의 잔액 항등식을 지탱하게 된다." → 자답: 맞는 지적이나, `total`의 유일한 기록자는 여전히 원장의 `balance_after`이고 `locked`는 상태 파생이다. 둘을 **한 함수 한 스냅샷**에서 읽게 강제(D3-C1)하는 것이 이 위험의 해소책이며, 그래서 C1을 추천으로 올렸다. 별도 `locked` 컬럼을 두는 3안도 있으나 그 순간 **동기화해야 할 캐시가 하나 더** 생겨 Formance가 경고한 balance conflation을 자초한다.

**Q2. I4를 그대로 두면?** → 틀린다. 웰컴 회수·환불 회수가 실제로 총량을 줄인다(운영 REVERSAL 11건 실재). 그래서 R2로 표면화했고 세션이 임의로 문구를 고치지 않았다.

**Q3. delta 0 원장 행이 회계적으로 부적절한가?** → 이 레포에 이미 선례가 있고(현행 SETTLED delta 0), TigerBeetle도 pending을 별도 전표로 남긴다. 다만 "원장은 잔액만 적는다"는 원칙을 회장이 선호할 수 있으므로 **D1-A-2를 대등한 선택지로** 남겼다.

**Q4. 0번 게이트를 지켰나 — 매칭 스킬을 실제로 호출했나?** → 이 과업은 설계 문서 1건 산출이고 `document-generate`는 "없는 문서를 스캐폴딩"하는 용도라 상류 정본(DESIGN v1.12.0·user-flow §5.5)을 승계해야 하는 이 작업에 부적합하다고 판단했다. `diagram` 스킬은 excalidraw 파일 트리플릿을 만드는 스킬인데, doc-review §5.2가 **mermaid 코드블록**을 요구하므로 규격이 어긋난다. 두 건 모두 `SKILLS_SKIPPED`에 사유와 함께 선언했다.

### 레드팀 1회 (반대 관점: 이 설계를 구현할 개발자)

**공격**: "결정 4개를 열어두면 나는 아무것도 못 짠다. 설계가 아니라 질문지다."
**대응**: D1을 제외한 D2·D3·D4는 추천안이 사실상 확정에 가깝고(D2는 실측 0건, D4는 코드 변경 0), 실제로 갈리는 것은 D1 하나다. **D1이 A-1이든 A-2든 §9의 API 계약·§7 전이표·§13 test-plan은 한 글자도 바뀌지 않는다**(바뀌는 것은 `create_cashout_request` 마지막 INSERT 블록의 존재 여부뿐). 즉 D1 미결 상태에서도 프론트·테스트·계약 작업은 즉시 착수 가능하다. 이 문단을 build 위임 프롬프트에 함께 넘긴다.

---

**기반 산출물**: `DESIGN.md` v1.12.0 (§6-(c)·§6-(d)·§8.2·§8.3) · `docs/user-flow.md` §5.5 / §1.1-8 / §1.2 · `scratchpad/cashout-full-journey-v3-opus.html` v3.6

SKILLS_USED: 없음 (아래 사유)
SKILLS_SKIPPED: `document-generate` — 없는 문서를 스캐폴딩하는 스킬이라, 상류 정본(DESIGN v1.12.0·user-flow §5.5)의 확정 규칙을 승계해야 하는 이 과업에 부적합. `diagram` — excalidraw/SVG 트리플릿 산출 스킬인데 doc-review.md §5.2가 mermaid 코드블록을 요구해 규격 불일치.

SOURCES/MODEL: claude-opus-5 (Opus 5) · 실제 Read: `DESIGN.md`(v1.12.0 §6·§8.3·변경이력) · `docs/user-flow.md`(§1.1·§1.2·§4·§5.5) · `scratchpad/cashout-full-journey-v3-opus.html`(v3.6 STAMP·화면·문구) · `supabase/migrations/20260821000000_cashout_service_fee_10pct.sql` · `20260728010000_cashout_manual_payout.sql` · `20260802010000_cashout_security_hardening.sql`(스캔) · `20260705163137_init_schema.sql`(enum·ledger·trigger) · `20260803010000_sync_clover_balance_search_path.sql` · `supabase/tests/cashout_manual.test.sql` · `supabase/tests/concurrency/cashout_double_request_race.sh` · `web/e2e/cashout-manual.spec.ts` · `web/src/app/(receiver)/me/page.tsx` · `web/src/app/(receiver)/cashout/page.tsx` · `.../cashout/status/page.tsx` · `web/src/lib/cashout-fee.ts` · `~/.claude/standards/dev.md` · `~/.claude/standards/doc-review.md` · 운영 DB 읽기전용 조회 3건(`supabase db query --linked`) · WebSearch 2건: https://docs.tigerbeetle.com/coding/two-phase-transfers/ , https://www.formance.com/blog/financial-operations/ledger-balance-for-product-and-engineering , https://www.accountingtools.com/articles/what-is-the-difference-between-ledger-balance-and-available.html

PRESENTATION_CHECK: 툴콜 태그 잔재 없음 확인 / mermaid 3종(flowchart·erDiagram·sequenceDiagram) 문법 확인 / 목차 앵커 확인 / em dash 미사용

RUBRIC_SCORE: 완결성 5 · 정밀성 5 · 벤치마크 반영 5 · 추적성 5 · 전문성/톤 4 total=24/25
WEAKEST_LINE: "이번 비범위. 필요 시 후속 슬라이스에서 `PAYOUT_FAILED` 신설" — 회장이 명시한 "이체실패" 전이를 enum 없이 note로 우회한다는 판단을 한 줄로 처리했다. 근거가 얇다.
