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

## 현재 검증 상태 (2026-07-10)

- `npm test`: 63 passed (기존 NotificationBadge act 경고만 있음)
- `npm run build`: PASS
- `supabase test db`: 52 passed
- `E2E_BASE_URL=http://localhost:3456 E2E_GOAL_SLUG=7druulwd npm run test:e2e -- e2e/goal-flow.spec.ts`: 14 passed
- `curl -I -L http://localhost:3456/`: 200 OK
- `cheer-order` 로컬 Edge Function smoke: 201 Created, `payment READY` + `cheer PENDING` 주문 생성
- `toss-confirm` 로컬 Edge Function smoke: 503 `missing_toss_secret` guard 확인

## B2 테스트 결제 범위

구현됨:
- `/g/[slug]` 하단 CTA → 응원 결제 시트 → `cheer-order` Edge Function
- TossPayments v2 JS SDK 로드 → 테스트 결제창 요청
- `/payment/success` → `toss-confirm` Edge Function → 토스 서버 승인
- DB RPC 원자 전이: `payment DONE` + `cheer CONFIRMED` + `clover_ledger EARN`
- pgTAP 권한 검증: 결제 RPC는 `service_role` 전용, anon/authenticated 직접 호출 차단
- hardening: `payment_key` 유니크, amount 위변조 차단, DONE 재진입 멱등, 결제 승인 후 DB 반영 실패 보상 기록(`payment_log` + 필요 시 `risk_event`)

아직 실배포 차단:
- `toss-webhook`은 구현됨. 운영 배포 후 Toss 개발자센터에 `.../toss-webhook/<TOSS_WEBHOOK_TOKEN>` URL 등록과 실웹훅 검증 필요
- `cashout`, `cashout-payout`, `kyc-verify`, PASS/지급대행은 stub
- 실제 토스 테스트 키/시크릿, 카카오 키, Supabase cloud 키, Vercel env 필요
- 법률/개인정보 확인 전 환전·PASS·실돈 정산은 배포 금지

## 클라우드 배포 전 필요한 것

Supabase 클라우드와 서드파티 키가 없으면 DB 연결이 실패한다. 아래를 순서대로 준비:

| 준비 항목 | 출처 | 용도 |
|---|---|---|
| Supabase URL + Anon key | supabase.com → 프로젝트 → Settings → API | DB 연결 |
| 카카오 REST API 키 | developers.kakao.com → 내 앱 → 앱 키 | 카카오 로그인 |
| 토스페이먼츠 클라이언트 키 | developers.tosspayments.com | 결제위젯 |
| Edge Function 시크릿 | `supabase/edge-functions-env.example` 참고 | 서버 로직 |

클라우드 키를 받으면:
1. `web/.env.example`의 클라우드 섹션 값을 Vercel 환경변수에 추가
2. `supabase/edge-functions-env.example`의 시크릿을 `supabase secrets set`으로 등록
3. `supabase db push --linked` 또는 `supabase migration up --linked` 로 마이그레이션 적용
4. `supabase functions deploy cheer-order toss-confirm toss-webhook lead-capture cashout auth-kakao wordmap-render notify report` 배포
5. Vercel 배포 후 Toss/Kakao redirect URL을 배포 URL로 갱신

## 주요 문서

- `docs/prd-haenael-ge-v0.2.0.md` — 제품 요구사항
- `docs/fdd-haenael-ge-v0.1.0.md` — 기능 설계 (슬라이스별 구현 명세)
- `docs/architecture.md` — 기술 아키텍처
- `docs/api-contract.md` — API 계약
- `DESIGN.md` — 디자인 시스템 (색상·타이포·컴포넌트 규칙)
