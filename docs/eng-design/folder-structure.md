# Folder Structure: 해낼게 운영 v1.0.0

> 기준 시각: 2026-08-29 04:54 KST
> 원칙: 아래 트리는 목표 구조가 아니라 `rg --files`로 확인한 실제 구조다. 일부 파일은 대표만 표시한다.
>
> **v2 라인(2026-10-19 갱신)**: V2 소셜 바이럴 루프의 폴더 구조·추가 파일·임포트 경계는 [folder-structure-social-viral-loop-web-first-v1.2.0.md](./folder-structure-social-viral-loop-web-first-v1.2.0.md) 가 정본이다. 이 문서는 2026-08-29 기준 v1 운영 구조다.

## 목차

- [1. Repository root](#1-repository-root)
- [2. Web](#2-web)
- [3. Supabase](#3-supabase)
- [4. QA and operations scripts](#4-qa-and-operations-scripts)
- [5. Eng-design artifacts](#5-eng-design-artifacts)
- [6. Import boundaries](#6-import-boundaries)
- [7. Known structure drift](#7-known-structure-drift)
- [8. Benchmark and self-check](#8-benchmark-and-self-check)

## 1. Repository root

```text
haenael-ge/
├── web/                         Next.js application
├── supabase/                    Postgres migrations, tests, Edge Functions
├── scripts/                     QA and operations scripts
├── docs/                        pipeline artifacts and runbooks
├── scratchpad/                  decision prototypes, not canonical runtime
├── .github/workflows/           CI and readonly production E2E
├── DESIGN.md                    product design SSOT
├── RELEASE.md                   release manifest
├── CHANGELOG.md                 release history
├── pipeline-state.core.md       stage controller state
├── session-state.core.md        handoff state
├── vercel.json                  root Vercel configuration
└── VERSION                      product version
```

## 2. Web

```text
web/
├── src/
│   ├── app/
│   │   ├── (receiver)/
│   │   │   ├── layout.tsx
│   │   │   ├── onboarding/page.tsx
│   │   │   ├── me/{page,loading,error}.tsx
│   │   │   ├── wordmap/[goalId]/{page,not-found}.tsx
│   │   │   └── cashout/
│   │   │       ├── page.tsx
│   │   │       ├── actions.ts
│   │   │       ├── history/page.tsx
│   │   │       └── status/page.tsx
│   │   ├── g/[slug]/{page,error,not-found}.tsx
│   │   ├── payment/{success,fail}/page.tsx
│   │   ├── auth/kakao/{start,callback}/...
│   │   ├── auth/{callback,logout}/...
│   │   ├── admin/{page,actions}.tsx
│   │   ├── api/health/route.ts
│   │   ├── {how,terms,privacy,child-safety}/page.tsx
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── auth/                LoginSheet, phone consent, logout
│   │   ├── receiver/            ReceiverShell, onboarding, cheer list
│   │   ├── goal/                goal card, owner bar, wordmap, split balance
│   │   ├── cashout/             page view and request form
│   │   ├── admin/               cashout queue
│   │   ├── common/              report and shared interaction
│   │   └── ui/                  local shadcn components
│   ├── lib/
│   │   ├── supabase/            browser/server/service clients and generated types
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── clover/
│   │   ├── toss/
│   │   ├── cashout*.ts
│   │   ├── phone.ts
│   │   └── utils/
│   ├── stories/
│   ├── store/
│   └── test/
├── e2e/
│   ├── cashout-manual.spec.ts
│   └── production-auth-readonly.spec.ts
├── public/
├── package.json
├── playwright.config.ts
├── playwright.production.config.ts
└── vercel.json
```

### Web ownership rules

- Route-local Server Action은 해당 route 아래 `actions.ts`에 둔다.
- provider/service secret loader는 `lib/supabase/service.ts`가 소유한다.
- DB-generated types는 `lib/supabase/database.types.ts` 한 파일이다.
- receiver 공통 shell은 `(receiver)/layout.tsx`와 `components/receiver/ReceiverShell.tsx`에 둔다.
- 공개 goal component와 receiver component를 섞지 않는다.
- test는 route/component 옆 `__tests__`, full browser flow는 `web/e2e`에 둔다.

## 3. Supabase

```text
supabase/
├── config.toml
├── migrations/
│   ├── 20260705163137_init_schema.sql
│   ├── ...
│   ├── 20260802010000_cashout_security_hardening.sql
│   ├── 20260821000000_cashout_service_fee_10pct.sql
│   ├── 20260822000000_cashout_clover_lock_a1.sql
│   ├── 20260825010000_cashout_verified_minor_only.sql
│   └── 20260825020000_cashout_total_threshold_contract.sql
├── functions/
│   ├── _shared/                 toss, alimtalk, auth, error, risk helpers
│   ├── auth-kakao/
│   ├── cheer-order/
│   ├── toss-confirm/
│   ├── toss-webhook/
│   ├── notify/
│   ├── report/
│   ├── wordmap-render/
│   ├── lead-capture/
│   ├── kyc-verify/
│   ├── cashout/                 legacy 410 endpoint
│   └── cashout-payout/          future 501 stub
└── tests/
    ├── cashout_manual.test.sql
    ├── cashout_security_hardening.test.sql
    ├── welcome_clover.test.sql
    ├── welcome_reversal.test.sql
    └── concurrency/
        ├── cashout_double_request_race.sh
        └── cashout_double_paid_race.sh
```

### Supabase ownership rules

- migration은 append-only다. 적용된 과거 migration을 수정하지 않는다.
- 최종 함수 계약은 가장 늦은 `CREATE OR REPLACE` migration이 소유한다.
- money mutation과 grant는 migration에 함께 둔다.
- Edge Function 공통 helper만 `_shared`에 둔다. browser import 금지.
- SQL contract는 `supabase/tests`, cross-process race는 `tests/concurrency`에 둔다.

## 4. QA and operations scripts

```text
scripts/
└── qa/
    ├── check-deploy-env.mjs
    ├── check-cashout-layer-contract.mjs
    ├── check-cashout-raise-coverage.mjs
    ├── check-cashout-notification-contract.mjs
    ├── run-contract-mutations.mjs
    └── verify-production.mjs
```

배포 env, 층간 계약, RAISE coverage, notification failure, mutation, production probe를 각각 분리한다. 한 script PASS가 다른 축을 대체하지 않는다.

## 5. Eng-design artifacts

```text
docs/
├── prd-haenael-ge-v0.4.0.md
├── user-flow.md
├── erd.md
├── fdd-haenael-ge-cashout-clover-lock-v1.1.0.md
├── architecture.md
├── api-contract.md
├── design-patterns.md
├── folder-structure.md
├── test-plan.md
├── test-cases.md
├── qa-tracker.md
└── WIREFRAMES/
```

과거 FDD v1.0.0은 역사 보존이며 최신 build 입력은 v1.1.0이다.

## 6. Import boundaries

- `web/src`는 `supabase/functions`를 import하지 않는다.
- Edge Functions는 browser-only module을 import하지 않는다.
- payment/cashout DB mutation을 UI component에서 직접 호출하지 않는다.
- 다른 벤처 repo 또는 `@postagi/*` runtime import를 추가하지 않는다.
- `scratchpad`와 `docs/design/WIREFRAMES`는 runtime import 대상이 아니다.

## 7. Known structure drift

- generated DB type가 latest `my_cashout_status` 반환 2필드를 놓쳤다. 타입 재생성은 build task다.
- 일부 docs와 release manifest가 과거 FDD v1.0.0을 가리킨다. ship에서 v1.1.0으로 pin한다.
- untracked `docs/growth`는 별도 트랙 소유이며 eng-design이 수정하지 않는다.

## 8. Benchmark and self-check

Supabase 공식 Database Functions 구조는 DB function을 API로 호출할 수 있다고 명시한다. 이 repo는 function signature를 migration에, TypeScript view를 generated types에 두되 migration을 계약 우선순위로 삼는다. Stripe식 idempotency key는 application route가 아니라 돈 mutation boundary에 둔다.

이 구조가 틀렸다면 route-local action이 늘어 공통 cashout logic이 분산된다는 이유일 수 있다. 현재 cashout member action과 admin action은 권한·secret·UI revalidation이 달라 분리 가치가 크고, 공통 domain 계산은 DB와 `lib/cashout*`에 둔다.

---

🏷 STAMP | line: core | 생성: 2026-08-29 04:54 KST | model: gpt-5.6-sol | agent: tech-architect
skills: 없음 | 근거: `rg --files` 실제 트리와 import/callsite scan
고민: 과거 목표 트리에 있던 `/home`과 비어 있는 component 폴더를 제거하고 현재 `/me`, Server Action, 8 RPC 구조만 남겼다.

SKILLS_USED: 없음
SKILLS_SKIPPED: 폴더 구조 전용 스킬이 없어 실제 파일 인벤토리를 사용했다.

RUBRIC_SCORE: 완결성=5/5 정밀성=5/5 벤치마크반영=4/5 추적성=5/5 전문성·톤=5/5 total=24/25
WEAKEST_LINE: 대표 트리는 탐색성을 위해 일부 테스트·정적 자산 파일을 생략했으므로 전체 파일 목록은 `rg --files`가 우선한다.

SOURCES/MODEL: gpt-5.6-sol | `rg --files web/src supabase scripts docs`; `web/package.json`; `supabase/config.toml`; `docs/eng-design/architecture.md`
