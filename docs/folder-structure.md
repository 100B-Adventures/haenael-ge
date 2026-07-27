# Folder Structure — 해낼게 (haenael-ge)

> eng-design 산출물. 실제 디렉터리 트리 + 각 폴더 책임 + 관습.
> 🔒 회장 확정(2026-07-04): **서버리스 스택**(Next.js/Vercel + Supabase Postgres/Auth/RLS + Edge Functions) · **독립 코드베이스**(commons/public 의존 없음, 패턴 참고만). Spring Boot/Java 트리 폐기.
> ⚠️ 폴더/패턴 확정은 **메인세션 대화**(plan-eng-review·plan-devex-review)로 굴린다 — 아래는 **선택지+추천**.

---

## 0. 최상위 (repo = haenael-ge, monorepo 단일)

```
haenael-ge/
├── web/                     # Next.js(App Router) — Vercel 배포. 프론트 + Supabase 클라이언트
├── supabase/                # Supabase 프로젝트 (DB + Edge Functions + Auth 설정)
│   ├── migrations/          # Postgres 스키마·RLS 정책 SQL (버전관리 = 진실원)
│   ├── functions/           # Edge Functions (Deno/TS) — 돈 로직
│   └── config.toml          # 프로젝트 설정(리전 ap-northeast-2 등)
├── docs/                    # PRD·DESIGN·user-flow·본 eng-design 세트
├── docs/WIREFRAMES/         # 10화면 프로토 (design 산출)
├── pipeline-state.md
└── README.md
```

> **결정 A(추천): monorepo 단일 repo**(web/ + supabase/). 근거 = 1인 CEO 컨텍스트 스위칭 최소 + 마이그레이션·EF·프론트를 한 커밋으로. ⊖ Vercel(web)·Supabase(functions) 배포 타깃 2개(둘 다 서버리스라 관리 경량).
> **상주 서버 폴더 없음**(backend/ 자바 트리 폐기). mobile/ = phase2(안 만듦).

---

## 1. `supabase/` — DB·RLS·Edge Functions (돈 로직의 집)

### 1.1 migrations/ — Postgres 스키마 + RLS (진실원)
```
supabase/migrations/
├── 0001_init_member_goal.sql       # member, goal(+slug 트리거, deleted_at), 기본 RLS
├── 0002_cheer_payment.sql          # cheer(deleted_at), payment, payment_log + 멱등 UNIQUE(order_id)
├── 0003_clover_ledger.sql          # clover_ledger(append-only), clover_balance(파생), 트리거
├── 0004_cashout_kyc.sql            # cashout_request, kyc_verification(PASS·is_adult), risk_event(미사용 스키마)
├── 0005_wordmap_share_notif.sql    # wordmap_render_cache, share_event, notification(알림톡 채널)
├── 0006_report_moderation.sql      # report 테이블 + soft-delete RLS(신고→deleted_at 필터)
├── 0007_views_rls.sql              # goal_public 뷰(금액3층 a·deleted_at 제외), RLS 정책 전수(§ patterns)
└── 0008_storage_buckets.sql        # 워드맵 이미지 버킷 + 정책
```
관습: **1 마이그레이션 = 1 논리 변경**, 순번 프리픽스. **RLS 정책은 그 테이블 마이그레이션에 같이**(테이블 만들고 RLS 안 켜면 = 유출). 되돌릴 수 없는 데이터변경은 별도 파일.

### 1.2 functions/ — Edge Functions (Deno/TS, service_role) = 돈 코어
```
supabase/functions/
├── _shared/                # 공용(자체 구현 — commons 의존 X)
│   ├── toss.ts             # TossClient(결제 confirm/cancel, 간편결제) — 자체
│   ├── payout.ts           # TossPayoutClient(지급대행) — 자체
│   ├── ledger.ts           # clover 원장 기입 헬퍼(EARN/HOLD/SETTLE/REVERSAL)
│   ├── withholding.ts      # 3.3%·take-rate·최소환전 30,000원
│   ├── risk.ts             # riskHook 인터페이스 + noOpRiskHook(항상 CLEAR)  ⚠️ rule deferred
│   ├── idempotency.ts      # 멱등키·중복 차단
│   ├── oauth-kakao.ts      # 카카오 커스텀 OAuth 토큰교환 → Supabase 세션
│   ├── alimtalk.ts         # 카카오 알림톡 API 어댑터(정보성·템플릿)
│   ├── pass.ts             # PASS 통합본인인증 어댑터(실명·나이·CI)
│   └── region.ts           # x-region ap-northeast-2 핀 유틸(§ architecture 2.6)
├── auth-kakao/             # 카카오 OAuth 콜백→토큰교환→Supabase 세션 발급
├── cheer-order/            # POST: cheer=PENDING + payment 주문·멱등  [강모델]
├── toss-confirm/           # POST: 서버승인 + payment DONE + cheer CONFIRMED + ledger EARN [강모델·리뷰]
├── toss-webhook/           # POST: 경로 토큰+Toss API 재조회·상태 재동기(보상)  [강모델·리뷰]
├── cashout/                # POST: 최소환전·PASS만19+·riskHook·HOLD + payout 트리거  [강모델·리뷰]
├── cashout-payout/         # 지급대행 호출·SETTLED·지급명세·정산주기 D+n(⛔)  [강모델·리뷰]
├── kyc-verify/             # PASS 본인인증·만19+·실명·CI 게이트
├── notify/                 # 카카오 알림톡 발송(응원 도착 등 정보성) + 인앱 폴백
├── report/                 # 신고 접수(RLS insert) + 수동 soft-delete 처리
└── wordmap-render/         # 워드맵 이미지 렌더 → Storage
```
관습:
- **돈 EF는 `service_role`** 로 RLS 우회 + 원장/결제를 **한 트랜잭션**(Postgres `rpc` DB 함수 호출로 원자성 보장 권장).
- **토스 secret·payout 키 = Edge Function secret(env)**, 코드/브라우저에 하드코딩 금지.
- `_shared/`는 **해낼게 자체 구현**. commons `payment-toss`(Java)는 설계 참고만(import X).
- **[강모델·리뷰]** 표시 EF = build 시 강한 모델로 구현 + 코드리뷰 게이트(test-plan §0).

---

## 2. `web/` — Next.js App Router (①②존 라우트그룹 분리)

**DESIGN.md 절대규칙 = ①받는사람 존과 ②친구 목표페이지 존을 절대 섞지 않음** → 라우트 그룹으로 물리 분리.

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 루트: Pretendard·토큰·Toaster(Sonner)
│   │   ├── page.tsx                # ① 랜딩(landing-final) — 받는사람 존 입구
│   │   │
│   │   ├── (receiver)/             # ① 받는사람 존 (공급 acquisition)
│   │   │   ├── onboarding/         # write-first: 목표쓰기→저장시 Supabase Auth
│   │   │   ├── home/               # 받는사람 홈(워드맵 보기 단일 CTA, 🍀개수만)
│   │   │   ├── wordmap/[goalId]/   # 워드맵 풀뷰→아이콘 공유
│   │   │   └── cashout/            # 환전/정산(₩는 여기서만 현실화)
│   │   │
│   │   ├── g/[slug]/               # ② 친구 목표페이지 (공유 링크 타깃, 비로그인 SSR)
│   │   │   └── page.tsx            # goal_public RLS 읽기 · 결제시트 · 마감
│   │   │
│   │   ├── auth/
│   │   │   ├── kakao/callback/     # 카카오 커스텀 OAuth 콜백 → invoke('auth-kakao')
│   │   │   └── (구글/애플=Supabase 네이티브)
│   │   ├── payment/
│   │   │   ├── success/            # 토스 successUrl → invoke('toss-confirm')
│   │   │   └── fail/               # 토스 failUrl → ErrorState
│   │   │
│   │   └── privacy/  terms/  child-safety/   # 법정 고지
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn CLI 직접 생성 + 해낼게 토큰 (Button·Card·Sheet)
│   │   ├── auth/                   # LoginSheet(카카오 primary + 구글/애플)
│   │   ├── receiver/               # ① 전용: OnboardingGoalForm·ShareLinkCard·CashoutSheet·KycSheet(PASS)
│   │   ├── goal/                   # ② 전용: GoalCard·CheerCount·Wordmap·EmptyState·ReportButton
│   │   ├── payment/                # PaymentSheet·AmountChips(카카오페이/네이버페이/토스페이)·MessageField·AnonymityToggle
│   │   └── common/                 # ErrorState·ConfirmToast·DdayChip·BrandMark
│   │
│   ├── lib/
│   │   ├── supabase/               # Supabase 클라이언트(browser anon / server) · 타입(gen)
│   │   ├── toss/                   # 결제위젯 로더(간편결제)·ANONYMOUS 게스트
│   │   ├── analytics/              # GA4 gtag 초기화·이벤트(수집=앱/분석=MARKETING 중앙)
│   │   └── utils/                  # 포맷·slug·draft 로컬보존
│   │
│   ├── store/                      # 상태(경량 Zustand) — draft·게스트세션
│   └── styles/                     # Tailwind 토큰 = DESIGN.md §3 매핑
├── tailwind.config.ts              # DESIGN.md 토큰 theme.extend
├── components.json                 # shadcn 설정
└── package.json                    # 단일 앱. @postagi/* 워크스페이스 의존 없음(독립)
```

### 폴더 관습 (web)
- **①②존 컴포넌트 물리 분리**(`components/receiver/` vs `components/goal/`) — DESIGN.md 혼선 재발 방지를 폴더로 강제. 공용은 `common/`에만.
- **읽기 = Supabase 클라이언트 직접**(`lib/supabase`, RLS가 보안). **돈 쓰기 = `supabase.functions.invoke('...')`**(Edge Function). 클라이언트가 원장·결제 테이블에 직접 쓰지 않는다.
- ② `g/[slug]` = **비로그인 SSR**, `goal_public` 뷰만(금액 필드 부재). 인스타 링크 = `해낼게.app/g/{slug}`.
- 토스 secret·카카오/PASS 키는 **web에 절대 없음**(Edge Function만). 결제 confirm은 `payment/success`에서 EF invoke.
- **로그인**: 카카오=커스텀 OAuth(`auth/kakao/callback`→`auth-kakao` EF), 구글/애플=Supabase 네이티브. LoginSheet는 저장/결제 시점에만.
- **GA4**: `lib/analytics`에서 gtag 수집만(app). 분석·대시보드는 MARKETING 중앙 테넌트(directive). 핵심 이벤트 = architecture §6.
- **모더레이션**: ② `ReportButton` → `report` EF(신고). 삭제는 수동 soft-delete(admin UI=나중).
- **독립**: `@postagi/*` 공유 패키지 import 금지. 401/세션은 Supabase Auth SDK가 관리(자체 인터셉터 불요).

---

## 3. docs/ (eng-design 세트)
```
docs/
├── prd-haenael-ge-v0.2.0.md · one-thing.md · persona.md · bm.md · risks.md   (plan)
├── DESIGN.md(루트) · user-flow.md · WIREFRAMES/                              (design)
├── fdd-haenael-ge-v0.1.0.md
├── architecture.md · folder-structure.md · design-patterns.md
├── api-contract.md · test-plan.md
```

---

## 4. ⛔ 회수/대화 필요 (메인세션 확정)
- **폴더/패턴 스코어(plan-eng-review·plan-devex-review)는 대화로 확정** — 위는 추천안.
- 결정 대기: (a) 프론트 호스팅 **Vercel vs CF Pages** → 회장이 "Vercel(또는 CF Pages)"로 열어둠 → **Vercel 추천**(Next.js 1급 지원), 최종 회장. (b) 원장 원자성 = EF 내 순차 vs **Postgres `rpc` DB 함수** → **DB 함수 추천**(트랜잭션 보장).
- 🔒 확정: 독립 코드베이스(commons/public 의존 없음). "commons 실구현 검증" 태스크 불필요.
- ⛔ **회수 필요: KYC·금융데이터 국외이전(Edge Function 국외 엣지 실행)** — architecture §2.6. legal 게이트 병합.

SKILLS_USED: 없음
SKILLS_SKIPPED: 매칭 스킬 없음(폴더구조 = 프로젝트 특정 설계, document-generate는 코드 역생성용 부적용)

SOURCES/MODEL: opus-4-8[1m] · 근거=회장 확정 스택(coordinator relay) · Supabase 프로젝트 구조 관행(supabase/migrations·functions) · DESIGN.md ①② 분리 규칙 · architecture.md 자매 문서
