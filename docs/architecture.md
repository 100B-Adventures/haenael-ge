# Architecture — 해낼게 (haenael-ge)

> eng-design 단계 산출물(tech-architect 소유). 진실원: PRD `prd-haenael-ge-v0.2.0` · `DESIGN.md` v1.6 · `user-flow.md` · `risks.md` #1.
> 이 문서가 닫는 것: **전금법 자금흐름(존립조건)** · 서버리스 토폴로지 · 도메인·데이터 흐름 · 스택 확정 근거.
> 규율: eng-design = 문서만(제품 소스코드 X). 법률/founder만 정할 것은 `⛔ 회수 필요`.

---

## 0. 시스템 한 줄

**인스타 바이오 링크로 열리는 단일 컬럼 모바일 웹.** 친구가 목표 페이지(②)에서 조용히 결제 → 클로버가 주인공 계정에 **원장(ledger)으로** 적립 → 모이면 환전. **자금은 우리가 보유하지 않는다** — 결제·정산·지급은 전부 외부 PG(토스페이먼츠)가 들고, 우리 DB의 클로버는 "얼마를 지급대행 받을 권리"의 **표시값**이다(선불충전금 아님을 지향).

> **🔒 회장 확정 스택(2026-07-04, 이전 Spring Boot/MySQL override): 서버리스·인프라 제로.**
> - **프론트** = Next.js on **Vercel**(서버리스).
> - **DB·Auth** = **Supabase**(Postgres + Auth + RLS + Storage). 소셜로그인 = Supabase Auth(write-first).
> - **돈 로직**(토스 결제·지급대행·환전·원장·멱등) = **Supabase Edge Functions**(Deno/TS). 토스 비밀키·웹훅 핸들러가 여기.
> - **상주 서버 0** — 관리할 백엔드 앱 없음. 고정비 제거(usage 과금).
>
> **🔒 독립 코드베이스 유지**: 데이팅(Romeo/DC)만 PostAGI-commons/public로 묶고 **해낼게는 의존하지 않는다.** Romeo의 검증된 설계(원장·멱등·토스 흐름)는 **참고**하되 코드 복사·shared 의존 금지 — 해낼게 자체 격리본(Postgres 스키마 + Edge Functions)으로 재구현. 근거: 구현비용 agent≈0 → 재사용 절감명분 소멸, 결합·blast-radius 제거·속도.

---

## 1. 기술스택 확정 (근거 있는 결정)

| 레이어 | 선택 | 근거 |
|---|---|---|
| **프론트** | Next.js(App Router)/TS on **Vercel** | 서버리스·자동확장·고정비 0. shadcn/ui+Radix+Tailwind = `DESIGN.md` 토대. Supabase JS 클라이언트(anon key + RLS) |
| **DB** | **Supabase Postgres** | 리전 **서울(ap-northeast-2)** 지정(§2.6). 원장·주문·상태를 관계형+트랜잭션으로. RLS로 행 단위 접근제어 |
| **Auth** | **Supabase Auth** + **카카오 커스텀 OAuth** | 🔒 **로그인=카카오 primary**(+구글/애플). ⚠️ 카카오는 Supabase 네이티브 미지원 → **커스텀 OAuth 어댑터**(Edge Function `auth-kakao`로 토큰 교환 → Supabase 세션 발급). 구글/애플=Supabase 네이티브. + **anonymous(게스트)**. JWT `is_anonymous`로 게스트/주인공 구분 |
| **돈 로직** | **Supabase Edge Functions**(Deno/TS) | 토스 결제 confirm·지급대행·환전·원장 기입·멱등·웹훅. `service_role` 키로 RLS 우회 + 원자적 원장 트랜잭션. 토스 secret = EF 환경변수(브라우저 노출 0) |
| **가벼운 읽기** | Supabase PostgREST(자동 REST) + RLS 뷰 | 목표 열람·워드맵·잔액·알림 = 클라이언트 직접 쿼리(RLS가 보안). 커스텀 코드 불요 |
| **파일** | **Supabase Storage** | 워드맵 공유 이미지(리전 서울). RLS 버킷 정책 |
| **알림** | **카카오 알림톡**(정보성) | 🔒 응원 도착 등 **정보성** 알림. Edge Function `notify` + 알림톡 API 어댑터. ⚠️ 의존성 = 카카오 비즈채널 + 템플릿 사전심사 + 건당 발송비 + **정보성만(마케팅 금지)** |
| **본인인증** | **PASS 통합본인인증** | 🔒 환전 **만19+·실명·나이 게이트**에서 호출(로그인과 별개). Edge Function `cashout` 전단계(`kyc-verify`)가 PASS 검증. 벤더 실단가=build 확인 |
| **결제수단** | 토스페이먼츠 **간편결제 켬** | 🔒 카드 + **카카오페이·네이버페이·토스페이**. 결제위젯 한 번 연동으로 전 수단 제공 |
| **분석** | **GA4**(gtag) | 🔒 web(Next.js)에 gtag 수집 심음. **directive: 수집=앱(web) / 분석=MARKETING 중앙 테넌트.** 핵심 이벤트 자리(§6) |
| **Mobile** | 없음(MVP) | 잠긴 스코프 = 링크인바이오 웹. 앱/친구피드 = phase2 |

### 독립 코드베이스 — 패턴 차용 (commons 의존 없음)
Romeo/DC·commons는 **라이브러리가 아니라 레퍼런스 설계**로만 쓴다(코드 복사·import 금지).

| 기능 | 차용 원본(레퍼런스) | 해낼게 방식(서버리스) |
|---|---|---|
| 토스 결제 승인/취소 | commons `payment-toss` `TossPaymentsClient`(Java) | Edge Function `toss-confirm`(Deno/TS) **자체 구현** |
| 지급대행(payout) | (신규 — 원본 없음) | Edge Function `cashout-payout`(Deno/TS) 자체 |
| 원장 가상화폐 | Romeo `payment`(PointWallet/PointLog) | Postgres `clover_ledger` 테이블 + `clover` Edge Functions **자체 재설계**(3층·원천징수) |
| 인증·세션 | commons jwt-core/security | **Supabase Auth 관리형**(자체 JWT 발급 불요) |
| 접근제어 | Spring Security 필터체인 | **Postgres RLS 정책**(DB 레벨 방어) |
| ui 베이스 | shadcn/ui(공개 OSS) | shadcn CLI 직접 생성 + 해낼게 토큰 |

> **효과**: 관리할 상주 서버 0, 데이팅 코드베이스와 blast-radius 완전 분리. "commons 실구현 검증" 태스크 불필요(의존 없음).

---

## 2. 🔴 전금법 자금흐름 아키텍처 (risks.md #1 = 존립조건)

### 2.1 설계 원칙 — "자금 무보유 패스스루"(옵션 A, 스택 무관 유지)
risks.md 옵션 A를 **토스페이먼츠 지급대행 + Edge Functions**로 실장한다:

1. **응원자 결제금 미보유** — 토스 PG가 대금 보관, 환전 시 토스 **지급대행**이 주인공 계좌로 직접 지급.
2. **클로버 ≠ 선불충전금** — 사전충전 X(잠김결정). 클로버 = 확정 응원에 대해 지급대행 받을 권리의 **표시값**(Postgres 원장 카운트), 유통 저장가치 아님.
3. **정산 미관여** — FSC 유권해석: *"정산을 외부 PG가 대행하면 PG 등록 불필요."* 우리는 Edge Function이 주문·원장·표시만, 자금 수납·보관·지급은 토스.

### 2.2 자금 흐름 다이어그램 (Edge Functions 기준)

```
[응원자(게스트=anonymous auth)]
   │  ① 결제위젯(토스) — 카드/토스페이/카카오/네이버페이, ANONYMOUS customerKey
   ▼
[토스페이먼츠 PG] ─── 대금 수납·보관 (★자금 여기 머문다. 우리 X)
   │  ② successUrl(paymentKey/orderId/amount) 콜백 → Next.js
   ▼
[Edge Function: toss-confirm]  (Deno/TS, service_role)
   │  ③ 서버승인(멱등) — 토스 secret으로 confirm → payment=DONE
   │  ④ 한 트랜잭션: cheer=CONFIRMED + clover_ledger EARN(+N) append
   │     ※ Postgres엔 "표시값·원장"만. 실제 돈은 토스에.
   ▼
[주인공]  클로버 누적(개수만 표시, RLS 뷰) ──최소환전액(30,000원)↑──▶ 환전
   │  ⑤ KYC(본인인증·만19+ 게이트) 통과 · riskHook(no-op, §2.5)
   ▼
[Edge Function: cashout]  (service_role)
   │  ⑥ cashout_request: gross/fee(take)/withholding(3.3%)/net + clover_ledger CASHOUT_HOLD
   │  ⑦ 토스 지급대행(payout) API 호출 ──────────▶ [토스 지급대행] ──▶ 주인공 계좌(net)
   │  ⑧ clover_ledger CASHOUT_SETTLED + 지급명세 기록(원천징수 신고 근거)
```

**핵심**: ④와 ⑦ 사이에 **우리 명의 계좌를 자금이 통과하지 않는다.** Edge Function은 정산 지시자·수수료 수취자일 뿐. take-rate는 지급대행 net 계산에서 차감(또는 별도 정산).

> **정산 주기 = placeholder `D+n` (⛔)**: 환전 신청 → 실제 계좌 입금까지 소요일은 **토스 지급대행 payout 스펙 의존** → build에서 확정. UX 카피는 "수일 내 입금"(예: D+2~D+3)으로 잡되 확정 수치는 ⛔. cashout 완료화면·정산내역에 이 주기 표시.

### 2.3 왜 이 구조가 등록/별도관리를 회피하나
| 리스크 | 회피 논리 | 근거 |
|---|---|---|
| 선불업 등록(30억/500억) | 클로버=충전형 아님(사전충전X), 확정 응원 표시값 | risks.md 옵션 A. **⛔ 법률 확인**(§2.4) |
| 선불충전금 100% 별도관리(2026-12-17) | 자금 무보유 → 별도관리 대상 자금 없음 | 보유 불성립 |
| PG업 등록(정산 관여 시) | 수납·정산·지급 전부 토스 위탁 | FSC: 정산 외부위탁 시 PG 등록 불요 |
| 원천징수 3.3% | 환전 시 사업소득 원천징수·지급명세 제출 | 별풍선 선례. 정책 P3 |

### 2.4 legal 게이트 — AI 자문(2026-07-21) 반영: "선불수단 해당하나 소규모 면제로 초기 합법 오픈 가능(조건부)"

> **판정 갱신(2026-07-21)**: 구 판정 "클로버=선불수단 여부가 존립을 가른다(⛔ 미해결)"를 아래로 갱신한다. 회장이 구글 AI(Gemini)로 받은 전자금융거래법 자문 요지를 반영. **⚠️ AI 자문은 방향 근거일 뿐, 최종 판단은 변호사 확인 권고**(§2.4-D). 이 갱신으로 "결제·환전 빌드 전 변호사 필수" 게이트가 사라지는 것은 아니며, "합법 오픈의 조건(유지의무)"이 구체화된 것이다.

**A. 등록 면제 판정 (핵심 완화):**
클로버 적립잔액은 **선불전자지급수단에 해당할 소지가 크나**, 개정 전자금융거래법상 **소규모 발행자 등록 면제**에 든다:
- 면제 기준 = **분기말 발행잔액 30억 원 미만 AND 연간 총발행액 500억 원 미만**(둘 다 충족 시 선불업 등록 의무 면제). 근거: FSC 개정 전금법, 김·장 Finance Legal Update, a-fin 해설(§8 벤치마크).
- **출시 초기(발행잔액 1억 원 미만) = 등록증 없이 합법 오픈 가능.** → 구 §2.4의 "선불업 등록(30억/500억)" 리스크는 초기 규모에서 **비활성(면제)**. 단 성장 시 임계 접근 모니터링 의무(§2.4-C).

**B. 면제여도 남는 유지의무 (조건부 합법 — 이걸 어기면 위법):**
| 의무 | 내용 | 위반 시 |
|---|---|---|
| **충전금(응원금) 별도관리** | 이용자 응원 대금을 운영비와 물리적 분리. **운영비로 전용 시 횡령죄.** 우리 설계는 "자금 무보유 패스스루"(§2.1)라 토스 PG가 보관 → 별도관리 대상 자금을 우리가 안 쥐는 게 1차 방어. 단 정산 타이밍상 우리 명의 통과가 생기면 별도계좌 필수 | 형사(횡령) |
| **이용약관 필수기재** | **수수료 차감 기준**(5%+VAT 명시)·**환불/청약철회 규정**·**낙전(미사용·소멸) 처리** 규정을 약관에 명시 | 약관규제법·전상법 |
| **웹 푸터 필수정보** | 상호·대표자·사업자등록번호·**통신판매업신고번호**·주소·고객센터(전화/이메일)·개인정보보호책임자 | 전상법 표시의무 |
| **KYC(환전 시)** | 출금 신청 시 휴대폰 본인인증 + 계좌 실명인증(1원 송금) + **가입 명의=계좌주 명의 일치 검증**(자금세탁방지) | 특금법·AML |

**C. 잔존 밑돌 (변호사 확인 권고 — 자문이 완전히 닫지 못한 것):**
- **⛔ 토스 지급대행으로 "개인(사업자 아닌 주인공)에게" 후원금 정산이 계약·규제상 가능한가?** 불가 시 환전 경로 붕괴. (토스 확답 요청 = `docs/legal-toss-inquiry-2026-07-21.md`.)
- **⛔ take-rate(5%) 수취가 "정산 관여"로 재해석돼 PG 등록을 유발하는가?**
- **⛔ 성장 시 임계(30억/500억) 접근 모니터링·초과 전 등록 준비** = 잔액 실시간 집계 지표 필요(build).
- **⛔ 금융·KYC 개인정보 국외이전**(§2.6) — 병존.

**D. 게이트 상태**: PRD §10 Q6 = **결제·환전 빌드 전 변호사 자문 권고 유지.** 단 판정이 "존립 불명"→"조건부 합법 오픈 가능"으로 완화되어, **초기 결제 오픈은 위 B 유지의무(별도관리·약관·푸터·KYC) 충족을 전제로 진행 가능**하고, 환전(지급대행) 오픈은 C의 토스 확답 + 변호사 확인 후로 유지한다. (자금세탁·개인정산 계약이 환전의 실제 게이트.)

### 2.5 ⚠️ ACCEPTED-RISK — 셀프후원/자금세탁 차단 미구현 (🔒 회장 결정)
- **차단 룰 미개발.** 자연억제 의존(KYC + 최소환전 30,000원 + take/원천징수 마찰 + **토스 자체 모니터링**).
- 설계: `cashout` Edge Function이 환전 확정 전 **`riskHook()` 호출 + no-op 기본 구현**(항상 CLEAR). 인터페이스·호출지점은 지금 심고, 룰은 나중에 주입만(코드 재수술 X). `hook exists, rule deferred`.
- ⚠️ 잔여 리스크(회장 인지): AML/카드깡 적발 시 책임·PG 계약 리스크. 수용 근거 = 초기 규모·usage 과금 대비 룰 ROI 낮음 + 토스 1차 방어.

### 2.6 ⛔ 데이터 리전·개인정보 국외이전 (서버리스 신규 리스크)
- **Supabase Postgres·Auth·Storage = 리전 서울(ap-northeast-2) 지정** → 저장 데이터는 국내.
- ⚠️ **그러나 Supabase Edge Functions는 기본이 전 세계 엣지(Deno Deploy) 분산 실행** — 요청자 IP 기준 최근접 엣지에서 도는 게 디폴트(조사: supabase.com/docs/functions/architecture). **KYC(본인인증·CI)·계좌번호·결제정보가 국외 엣지 노드에서 처리되면 개인정보보호법 국외이전 고지·동의/위탁 이슈.**
- 완화안(설계 방향): 돈·KYC Edge Function은 **regional invocation(`x-region: ap-northeast-2`)으로 DB 리전 핀** + 민감데이터 처리를 서울 고정. 단 API 게이트웨이 라우팅·서브프로세서 경로는 남음.
- **⛔ 회수 필요: 금융·KYC 개인정보의 국외이전(Supabase/Deno 서브프로세서·엣지 실행) 적법성·고지동의 범위 = 변호사·개인정보 검토.** legal 게이트(§2.4)에 병합. (⚠️ 회장이 지목한 신규 스택 리스크 — 추측으로 "괜찮다" 닫지 않음.)

---

## 3. 서버리스 토폴로지

```
┌──────────────── 브라우저 (모바일 웹) ────────────────┐
│  Next.js (Vercel)  — ①받는사람 존 / ②목표페이지 존     │
│    · Supabase JS (anon key)  → 읽기: RLS 보호 쿼리      │
│    · 토스 결제위젯(ANONYMOUS)                           │
└───────┬───────────────────────────┬──────────────────┘
        │ 읽기(RLS)                  │ 돈 쓰기(민감)
        ▼                           ▼
┌──────────────┐        ┌──────────────────────────────┐
│ Supabase      │        │ Supabase Edge Functions       │
│ PostgREST     │        │ (Deno/TS, service_role)       │
│ + RLS 뷰      │        │  toss-confirm · toss-webhook   │
│ (goal_public, │        │  cheer-order · cashout ·       │
│  clover_bal…) │        │  cashout-payout · kyc          │
└──────┬────────┘        │  → riskHook(no-op)             │
       │                 └──────────┬─────────────────────┘
       ▼                            ▼
┌─────────────────────────────────────────────────────┐
│ Supabase Postgres (서울)  — 원장·주문·상태 + RLS 정책 │
│ Supabase Auth (소셜+anonymous) · Supabase Storage     │
└──────────────────────────┬──────────────────────────┘
                           ▼ (외부)
                   토스페이먼츠 (PG · 지급대행)
```

원칙: **읽기 = 클라이언트 직접(RLS 방어)**, **돈 쓰기 = Edge Function(service_role, 멱등·원장 트랜잭션)**. 상주 서버 없음.

---

## 4. 도메인 분해 (Postgres 스키마 + Edge Function 그룹)

Romeo 도메인 분해를 **참고**(의존 아님). Postgres 테이블 묶음 + 그를 다루는 Edge Function/RLS로 표현.

| 도메인 | 책임 | 핵심 테이블 | 쓰기 경로 | phase2 확장점 |
|---|---|---|---|---|
| `auth` | Supabase Auth + **카카오 커스텀 OAuth**(primary)·구글/애플·게스트 anonymous | (auth.users 관리형) | Supabase Auth + EF `auth-kakao` | 친구그래프 인증 |
| `member` | 주인공 계정·프로필·연령 | `member` | RLS insert/update(본인) | 역할전환·친구관계 |
| `goal` | 목표(액자)·slug·상태·공개범위·**soft-delete** | `goal`(`deleted_at`) | RLS(본인) + slug 트리거 | **친구그래프 FK 자리** |
| `cheer` | 응원 1건·메시지·익명·상태·**soft-delete** | `cheer`(`deleted_at`) | **EF `cheer-order`**(주문·멱등) | pledge 조건부 서브타입 |
| `payment` | 토스 주문·승인·취소·웹훅(**간편결제**: 카드·카카오페이·네이버페이·토스페이) | `payment`,`payment_log` | **EF `toss-confirm`/`toss-webhook`** | 다른 PG 어댑터 |
| `clover` | **원장(ledger)** 적립/홀드/정산/환원 + 잔액 파생 | `clover_ledger`,`clover_balance` | **EF만**(service_role, append-only) | 클로버 이전·pledge 홀드 |
| `cashout` | 환전·take·원천징수·지급대행 + **PASS 본인인증**(만19+) + **riskHook 자리** | `cashout_request`,`kyc_verification` | **EF `cashout`/`cashout-payout`/`kyc-verify`(PASS)** | 자동정산·세무 |
| `wordmap` | 응원메시지 집계 read-model·공유이미지 | (뷰 + `wordmap_render_cache`) | RLS 읽기 + EF 렌더 | 친구별 워드맵 |
| `share` | linktree 링크(=goal.slug)·재공유 이벤트 | `share_event` | RLS insert | 딥링크·앱 공유 |
| `notification` | 은은한 도착 알림 + **카카오 알림톡**(정보성) | `notification` | **EF `notify`**(알림톡 발송) + RLS 읽기 | 친구 피드 |
| `report` | **신고+수동삭제 모더레이션**(MVP): 목표/메시지 신고 → soft-delete | `report` | RLS insert(신고) + EF/수동 soft-delete | 사전 AI필터·admin UI(나중) |
| `analytics` | GA4 gtag 수집(web) | (외부 GA4) | web 클라(수집=앱/분석=MARKETING 중앙) | 이벤트 확장 |
| `risk` | ⚠️ ACCEPTED-RISK: 룰 미구현. `riskHook` no-op 자리(§2.5) | `risk_event`(미사용) | — | 룰 주입·검토 큐 |

> **스코프 밖(설계 안 함, 확장점만)**: `pledge`·`admin`·`achievement`. 테이블 FK·enum 여지만 남겨 phase2 친구그래프·pledge를 막지 않음(잠긴 스코프).

---

## 5. 데이터 흐름 — 3대 시나리오

### 5.1 친구 조용한 결제 (콜드스타트 생사)
```
친구  Next.js(②)          Edge Function            토스PG
 │ 링크클릭 │ supabase.from('goal_public') RLS 읽기(비로그인/게스트)
 │ "밀어줄게"│ 게스트=supabase.auth.signInAnonymously()
 │────────▶│ invoke('cheer-order'){goalId,금액,메시지,익명}
 │         │────────────▶ cheer=PENDING, orderId, 멱등키(payment UNIQUE)
 │         │◀──────────── orderId, amount, clientKey
 │         │ 토스 결제위젯(ANONYMOUS) ─────────────▶ 결제수단 인증
 │         │◀──────────── successUrl(paymentKey,orderId,amount)
 │         │ invoke('toss-confirm') ──▶ 토스 secret confirm(멱등)
 │         │                └─ 트랜잭션: payment=DONE + cheer=CONFIRMED + ledger EARN
 │         │◀──────────── ConfirmToast + 워드맵 반영
```

### 5.2 클로버 적립 → 환전(지급대행)
```
주인공 Next.js          Edge Function              토스 지급대행
 │ 홈    │ supabase.from('clover_balance') RLS → 개수(🍀N)만
 │ 환전  │ invoke('cashout'){cloverAmount,bank,account}
 │       │──▶ 최소환전 30,000원 검증 → 미달=대기응답
 │       │──▶ KYC·만19+ 확인 → 미완=KycSheet
 │       │──▶ riskHook(no-op, 항상 CLEAR — §2.5)
 │       │──▶ cashout_request + ledger CASHOUT_HOLD
 │       │──── payout 요청 ───────────────────▶ 계좌 이체(net)
 │       │──▶ CASHOUT_SETTLED + 지급명세 기록
 │       │◀── 완료·정산내역(₩는 여기서만)
```

### 5.3 워드맵 재공유 → 확산 고리
```
홈 "워드맵 보기" → RLS 뷰/RPC 집계 → 풀뷰
 → 아이콘 공유(이미지/스토리): EF 렌더 → Supabase Storage URL
 → 친구 스토리 링크 탭 → goal_public(②) = 고리 닫힘(share_event insert)
```

---

## 6. 횡단 관심사

| 관심사 | 설계 | 근거 |
|---|---|---|
| **멱등성** | 결제/환전 Edge Function = `orderId`/`requestId` UNIQUE + (선택)advisory lock. `payment` UNIQUE(order_id) | 중복결제·이중지급 방지(돈=무관용) |
| **원장 정합성** | `clover_ledger` append-only, **EF service_role만 기입**. 잔액=원장 SUM 검증. `clover_balance`=파생 캐시(트리거 or EF) | 감사·환불역산 |
| **트랜잭션 경계** | 결제확정(payment+cheer+ledger)은 **1 Postgres 트랜잭션**(EF 내 단일 커밋 or DB 함수 `rpc`). 토스 호출은 트랜잭션 밖 → 실패 시 웹훅·재조정 보상 | PG성공/DB실패 리커버리 |
| **접근제어(RLS)** | 모든 테이블 RLS ON. 읽기 = 정책으로 방어(§7). 쓰기 민감분 = service_role EF만 | defense-in-depth(클라 우회 불가) |
| **게스트** | Supabase anonymous sign-in → `is_anonymous` JWT. 결제 EF만 허용, 조회/환전 불가 | 잠김: 게스트 허용·익명표시·PG엔 신원 |
| **금액 3층** | **RLS 뷰로 필드 분리**: `goal_public`(₩·개수 없음, N명만) / `clover_balance`(개수만) / cashout EF 응답(₩) | DESIGN.md §6 위반을 DB 뷰로 차단 |
| **비밀정보** | 토스 secret·payout 키·**카카오 OAuth·알림톡·PASS 키** = **Edge Function secret(env)**, 브라우저 0. 계좌·CI = Postgres 암호화 컬럼(pgcrypto) | 돈·개인정보 |
| **관찰성** | Edge Function 로그(Supabase) + `payment_log` 상태전이 | risks·CS |
| **분석(GA4)** | web에 gtag 수집. **directive: 수집=앱(web) / 분석=MARKETING 중앙.** 핵심 이벤트 자리: `goal_created`·`cheer_started`·`payment_success`·`wordmap_shared`·`cashout_requested` | 콜드스타트 전환(인스타→②→결제) 실측 |
| **모더레이션** | MVP=**신고 버튼 + 수동 soft-delete**(`report` insert → 목표/메시지 `deleted_at`, RLS가 필터). 사전 AI필터·admin UI=나중 | 안전 최소선(운영량 넘으면 자동화) |
| **알림톡** | 정보성만(마케팅 금지). 템플릿 사전심사·건당 발송비. 실패 시 인앱 알림 폴백 | 카카오 비즈메시지 정책 |

---

## 7. 인증·RLS 접근제어 (①/② 경계)

- **② 비로그인 열람**: `goal_public` **RLS 뷰**를 anon/게스트가 SELECT. **뷰가 금액·개인정보 필드를 애초에 포함 안 함**(3층 a). 로그인 벽 없음(잠김).
- **게스트 결제**: `supabase.auth.signInAnonymously()` → authenticated 역할(`is_anonymous=true`). RLS·EF에서 게스트 판별. 결제 confirm EF만 허용.
- **주인공**: Supabase Auth 소셜 로그인 → JWT. `goal`/`clover_balance`/`cashout` 읽기 RLS = `auth.uid() = member_id`. 목표생성·환전 = 본인만.
- **돈 쓰기 = service_role EF**: 원장·결제확정·지급대행은 RLS 우회 EF만(클라 직접 쓰기 차단). RLS는 그래도 ON(2중 방어).
- **write-first draft**: 목표 입력 draft = 브라우저 localStorage(로그인 실패해도 보존). 저장 시점에만 Supabase Auth. 서버는 인증 후에만 goal insert.

---

## 8. 벤치마크 (§2 의무 — 참고/차용/차별화)

| 참고(출처) | 차용 | 차별화 |
|---|---|---|
| **투네이션**(help.toon.at) 외부PG·월정산·6.3% | 자금 무보유 패스스루·비로그인 열람·익명옵션 | 지인×지인·조용히·금액 비노출 |
| **토스 지급대행**(docs.tosspayments.com/guides/v2/payouts) | 환전=지급대행 계좌직송(무보유) | 개인 크리에이터 정산(⛔ 계약) |
| **토스 결제위젯 ANONYMOUS** | 게스트 1탭 간편결제 | — |
| **Supabase RLS**(supabase.com/docs database RLS) | 금액 3층·①② 경계를 DB 뷰/정책으로 강제(defense-in-depth) | 금액 뷰 분리 |
| **Supabase Edge Functions**(docs/functions/architecture) | 돈 로직 서버리스·secret 격리·DB 옆 트랜잭션 | ⚠️ 국외이전 ⛔(§2.6) — regional invocation 핀 |
| **Romeo `payment` 도메인** | 원장 패턴 **참고**(코드 X, Postgres+EF 재구현) | 3층·원천징수·독립 |

---

## 9. 알려진 리스크 + build 인계

1. **법률 게이트(§2.4 갱신 + §2.6)**: AI 자문(2026-07-21)으로 "선불수단 해당하나 소규모(30억/500억 미만) 면제 → 초기 조건부 합법 오픈 가능"으로 완화. **결제 오픈 = B 유지의무(별도관리·약관·푸터·KYC) 충족 전제로 진행 가능.** **환전 오픈 = 토스 개인정산 확답 + take=정산관여 + KYC 국외이전 = 변호사 확인 유지.** (PRD §10 Q6.)
2. **Edge Function 리전 핀**: 돈·KYC EF는 `x-region: ap-northeast-2`로 서울 고정 필요(§2.6). 미핀 시 국외 엣지 실행.
3. **토스 클라이언트·지급대행 자체 구현**(Deno/TS): commons 의존 없음. Romeo/commons 코드는 참고만.
4. **PG성공·DB실패 정합성**: 토스 호출을 트랜잭션 밖 → 웹훅(`toss-webhook`)·재조정으로 보상.
5. **정책 확정값 정본**(회장 확정 2026-07-19~21 — fdd·build 진실원):
   - **서비스 수수료(take-rate) = 5%(+VAT)** 확정. 예: 응원 100,000원(100클로버) 환전 시 수수료 5,000원+VAT 500원 = 5,500원 차감, 원천징수(3.3%) 별도 → 잔액 지급. **⛔ build 확인: 토스 PG수수료 원가(충전 결제 시 + 지급대행 이체 시 각각)가 5% take 안에 흡수되는지 손익 검산**(역마진 방지). **⛔ 출금 유저에 세금계산서/현금영수증 발행 의무** → 지급명세·세무 처리 경로(build).
   - **클로버 단위 = 1클로버 = 1,000원**(회장 2026-07-20). 응원 = 클로버 개수 기반, **상한 무제한**(직접입력 큰 금액 허용). `clover_amount = amount_krw/1000`. 최소환전 = 30클로버(30,000원).
   - **웰컴 클로버 정책**(회장 2026-07-18·21): 목표 생성 시 웰컴 3클로버 지급. **홈 잔액엔 개수 포함 표시(욕망 자극)**, **환전 실지급 금액에서는 제외**(친구 응원분만 실환전). **삭제 목표의 웰컴은 무효** → 향후 목표 삭제 시 웰컴 자동 무효화(정리 트리거). 홈 표기 = 🍀개수 크게(주) + "≈원 상당" 작게(보조), 환전화면에서만 실수령 정직표시(§2.5 표시광고법).
   - **목표(해낼게) 수정 기능 추가 필요**(회장 2026-07-21): 이름·이유(why)·기한(날짜) 수정. `goal` update RLS(본인) 경로 = fdd 신규 스텝.
   - **KYC = 출금(환전) 신청 시 강제**(회장 2026-07-21): 소셜로그인은 유지하되, 환전 신청 시 **휴대폰 본인인증 + 계좌 실명인증(1원 송금) + 가입명의=계좌주 명의 일치 검증**(AML). PASS/1원송금 벤더 = build. (기존 §2.5·kyc-verify 인터페이스에 "명의 일치 검증" 요건 추가.)
   - **라이브 결제 키 존재**: 토스 상점(정성컴퍼니, MID **zeroon1zvn**) 라이브 키 발급됨. 결제 kill switch(`PAYMENTS_ENABLED=false`)로 잠금 중 → 키 주입·웹훅·실결제 검증 후 오픈.
   - 미성년 환전만 만19+ · 환불 문의수동 · 셀프후원 차단X(riskHook no-op).
6. **build 확인 노트(벤더 실스펙)**: (a) **정산주기 D+n** = 토스 payout 스펙 확정(⛔ placeholder). (b) **PASS 본인인증 실단가**·연동 스펙. (c) **알림톡 템플릿 사전심사**·건당비·비즈채널 개설. (d) **카카오 커스텀 OAuth** 토큰 교환 흐름(Supabase 세션 매핑) 실검증.

### 🤖 build 구현 모델 split (🔒 회장 지시)
- **저가 모델(기본)**: Next.js UI·RLS 읽기 쿼리·워드맵·공유·알림·목표/응원 조회.
- **강한 모델 + 리뷰(돈 코어)**: `toss-confirm`·`cashout`·`cashout-payout`·`toss-webhook` Edge Functions + **clover 원장·멱등·전금법 자금흐름·RLS 정책**. 실수=돈 사고 → 강한 모델 구현 + 별도 코드리뷰 게이트. test-plan §0.

---

## 10. 셀프심문 (CoVe)
- **"서버리스가 돈 코어에 틀렸다면 왜?"** → Edge Function 국외 엣지 실행이 KYC/금융 개인정보 국외이전을 유발할 수 있음 → §2.6 ⛔ + regional invocation 핀으로 방어. 추측으로 "괜찮다" 안 함.
- **"자금흐름이 틀렸다면?"** → 클로버=선불수단 판정 or 토스 개인정산 불가 시 붕괴 → §2.4 갱신(AI 자문: 소규모 면제로 초기 합법), 환전은 토스 개인정산 확답 + 변호사 확인 유지.
- **"면제 조건·유지의무를 정확히 반영했나?"** → 면제 = 분기말 잔액 30억 AND 연 500억 **둘 다 미만**(FSC/김·장 확인, WebSearch). 유지의무 4종(별도관리·약관필수기재·푸터·KYC)을 §2.4-B 표로 명시. "AI 자문은 방향, 최종 변호사"를 §2.4 서두·D에 박음 — 자문 한계 은폐 안 함.
- **"스택 외 founder 결정을 임의로 했나?"** → 아니오. 스택은 회장 확정값만 반영. 리전·국외이전은 *리스크로 올림*(⛔), 임의 확정 안 함.
- **"0번 게이트 — 매칭 스킬 호출?"** → `diagram`=별도 다이어그램 파일 산출 시 적합인데 eng-design 문서는 inline 다이어그램이 컨벤션 → skip. `document-generate`=기존 코드 역생성 도구, 소스 0 → 부적용. 하단 선언.

---

SKILLS_USED: 없음 (매칭 스킬 없음 — 아래 사유)
SKILLS_SKIPPED: diagram(=별도 다이어그램 파일 산출용, 본 문서는 inline 다이어그램이 eng-design 컨벤션이라 파일산출 불요) · document-generate(=기존 소스코드 역생성 도구, eng-design은 소스 0의 forward 설계라 부적용)

SOURCES/MODEL: opus-4-8[1m] · 근거=docs/{prd,risks,bm,persona,user-flow,DESIGN,coverage} 직접 Read · 토스 지급대행/비회원결제(WebSearch: docs.tosspayments.com, fsc.go.kr) · Supabase Edge Functions 리전/RLS(WebSearch: supabase.com/docs/functions/architecture, /database RLS) · PostAGI-commons/Romeo 구조 직접 확인(참고용, 의존 X)

---

> **§2.4 legal 갱신 STAMP(2026-07-21)**: 회장 제공 구글 AI(Gemini) 전자금융거래법 자문 요지 반영 + FSC/김·장/a-fin 면제기준 WebSearch 교차확인(발행잔액 30억 AND 연 500억 미만 = 등록 면제). 최근 정책결정 6종(수수료 5%·클로버 1000원·웰컴·목표수정·라이브키 zeroon1zvn·KYC출금강제) 정본화(§9.5). ⚠️ AI 자문은 방향 근거 — 최종은 변호사 확인 권고(§2.4-D). 근거 URL: fsc.go.kr/no010101/82339·83004, tosspayments.com/blog/articles/amendment, kimchang.com Finance Legal Update, a-fin.co.kr/insights/prepaid-registration-exemption-2024.
