# 해낼게

> "힘내라는 응원은 말이 아니라 돈으로 하는 것이다" — 목표를 공개하고 응원금을 받는 서비스.

## 레포 구조

```
haenael-ge/
├── web/                    # Next.js 16 App Router (프론트엔드)
├── supabase/
│   ├── functions/          # Edge Functions (Deno 런타임 — 서버 로직)
│   ├── migrations/         # DB 스키마 마이그레이션 (Postgres)
│   └── tests/              # DB 레벨 테스트 (pgTAP)
└── docs/                   # 설계 문서 (PRD·FDD·API contract·아키텍처)
```

## 개발 시작

**필수 설치:** Node.js 20+, Supabase CLI, Docker (로컬 DB 실행용)

```bash
# 1. 로컬 Supabase DB + Edge Functions 실행
supabase start

# 2. 웹 개발 서버 실행 (별도 터미널)
cd web
cp .env.example .env.local   # 최초 1회 — .env.local 값 채울 것
npm install
npm run dev                  # http://localhost:3000
```

## 테스트

```bash
# 유닛 테스트 (Vitest)
cd web && npm test

# 프로덕션 빌드
cd web && npm run build

# DB 레벨 테스트 (pgTAP — supabase start 선행)
supabase test db

# E2E 테스트 (Playwright — 앱 실행 중이어야 함)
cd web && npm run test:e2e
```

## 현재 검증 상태 (2026-08-22)

`pipeline-state.core.md` 최신 실행 기록 기준이다.

- Vitest: 227/227 passed
- 프로덕션 빌드: PASS (최근 재실행 이력)
- pgTAP: 246/246 passed
- 환전 Playwright: 11/11 passed
- 이용료 10% 기준값: 두 RPC 모두 30,000원 → 25,819원 로컬 실호출 확인
- A안 환전 상태전이: 신청 시 총량 유지와 잠금 생성, 지급 시 총량 차감, 반려 시 잠금 해제를 로컬 DB 실 RPC와 원장 조회로 확인했다.
- 현재 경계: 코드리뷰가 지적한 화면·문구 4건은 작업트리에 수정돼 있으나 파이프라인의 build 상태는 아직 `changes-requested`다. 화면 픽셀 대조와 운영 DB 적용, 실지급은 미검증이다.

## B2 테스트 결제 범위

구현됨:
- `/g/[slug]` 하단 CTA → 응원 결제 시트 → `cheer-order` Edge Function
- TossPayments v2 JS SDK 로드 → 테스트 결제창 요청
- `/payment/success` → `toss-confirm` Edge Function → 토스 서버 승인
- DB RPC 원자 전이: `payment DONE` + `cheer CONFIRMED` + `clover_ledger EARN`
- pgTAP 권한 검증: 결제 RPC는 `service_role` 전용, anon/authenticated 직접 호출 차단
- hardening: `payment_key` 유니크, amount 위변조 차단, DONE 재진입 멱등, 결제 승인 후 DB 반영 실패 보상 기록(`payment_log` + 필요 시 `risk_event`)

운영 배포 경계:

- Vercel·Supabase 운영 환경은 구성됐고, 카카오 로그인 실제 왕복이 확인됐다.
- 무료 코어 루프, GA4, Slack, 리드, 카카오 로그인은 운영 검증 이력이 있다.
- 이용료 10% 마이그레이션은 운영 DB 미적용이다. 환전 한 바퀴 실행과 실지급은 미검증이다.
- Toss 결제는 운영 환경에서 kill switch로 제어한다. 운영 적용·환전 QA·외부 연동의 최종 상태는 `pipeline-state.core.md`와 `docs/qa/qa-tracker.md`를 따른다.

## 주요 문서

- `docs/plan/prd-haenael-ge-v0.3.0.md` — 승인된 제품 요구사항 (`approved_artifacts` 핀)
- `docs/plan/prd-haenael-ge-v0.4.0.md` — 재개된 plan 증분안(미승인)
- `docs/eng-design/fdd-haenael-ge-v0.1.0.md` — 기능 설계 (슬라이스별 구현 명세)
- `docs/eng-design/architecture.md` — 기술 아키텍처
- `docs/eng-design/api-contract.md` — API 계약
- `DESIGN.md` — 디자인 시스템 (색상·타이포·컴포넌트 규칙)

---

STAMP: 수정 시각 2026-08-22 14:22 KST | 모델 GPT-5 Codex | 근거 `pipeline-state.core.md`, `docs/qa/qa-tracker.md`, `web/src/app/**`, `web/src/components/**`, `supabase/migrations/20260821000000_cashout_service_fee_10pct.sql`, `supabase/migrations/20260822000000_cashout_clover_lock_a1.sql`
