# build-log.md — 해낼게 빌드 기록

> 진실원: pipeline-state.md, docs/folder-structure.md, haenael-supabase-build 스킬.
> append-only. 슬라이스 완료 시 한 블록씩 추가.

---

## 슬라이스 #1 — Scaffold (완료 2026-07-06)

### 무엇을 세웠나

| 레이어 | 산출 |
|---|---|
| `supabase/` | `supabase init` 완료 · config.toml(project_id=haenael-ge, analytics disabled) · `migrations/`(빈 골격) · `functions/`(11개 EF 폴더 + index.ts stub) · `functions/_shared/`(9개 공용 파일: region·toss·payout·ledger·idempotency·withholding·risk·oauth-kakao·alimtalk·pass) |
| `web/` | create-next-app 16.2.10 (TypeScript·App Router·Tailwind) · shadcn/ui init · `src/` 구조 수동 정렬 · Supabase JS(@supabase/supabase-js·@supabase/ssr) · Zustand · Sonner · Pretendard(폰트 woff2 복사) |
| 라우트 | `/`(랜딩) · `/(receiver)/onboarding·home·wordmap/[goalId]·cashout` · `/g/[slug]`(비로그인 SSR) · `/auth/kakao/callback`(Route Handler) · `/payment/success·fail` · `/privacy·terms·child-safety` |
| lib/ | `supabase/client.ts·server.ts·database.types.ts(placeholder)` · `analytics/index.ts` · `toss/index.ts` · `utils/format·slug·draft.ts` |
| store/ | `Zustand AppStore (draft·isGuest)` |
| 설정 | `.env.example`(루트+web/) · `.gitignore` · `tsconfig.json(@/* → src/*)` |

### 검증 — 실기동 증거 (§3 직접 관찰)

#### supabase start (로컬 Postgres+Auth+Storage)
```
Started supabase local development setup.
API_URL:       http://127.0.0.1:54321
DB_URL:        postgresql://postgres:postgres@127.0.0.1:54322/postgres
FUNCTIONS_URL: http://127.0.0.1:54321/functions/v1
STUDIO_URL:    http://127.0.0.1:54323
```
- REST API health: `{"swagger":"2.0","info":{"title":"standard public schema","version":"14.14"}}` (HTTP 200)
- Auth health: `{"version":"v2.192.0","name":"GoTrue","description":"GoTrue is a user registration..."}` (HTTP 200)
- 중지 서비스: imgproxy·analytics·vector·pooler (scaffold 단계 불필요, analytics disabled)

#### Next.js build
```
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 19.9s
Running TypeScript ... Finished TypeScript in 10.5s
✓ Generating static pages using 15 workers (13/13)

Route (app)
  ○ /                    ○ /_not-found
  ƒ /auth/kakao/callback  ○ /cashout
  ○ /child-safety         ƒ /g/[slug]
  ○ /home                 ○ /onboarding
  ○ /payment/fail         ○ /payment/success
  ○ /privacy              ○ /terms
  ƒ /wordmap/[goalId]
```
TypeScript 오류 0건, 빌드 PASS.

### 게이트 체크

| 게이트 | 상태 |
|---|---|
| web/ Next.js build PASS | ✅ |
| supabase start 실기동 | ✅ |
| @postagi/* import 없음 | ✅ |
| 시크릿 실값 git 없음 | ✅ (.env.local gitignore) |
| 포트 충돌 없음 | ✅ (54321/54322/54323 사용) |
| E2E testID 부착 | ✅ (data-testid stub 삽입) |
| migrations SQL 없음(슬라이스 #1 범위 외) | ✅ |

### ⛔ 회수 필요

1. **analytics disabled** — 로컬에서 health check 실패로 analytics(`enabled=false`)로 비활성화. 프로덕션 Supabase 클라우드에서는 자동 활성화되므로 로컬 검증 이슈. Supabase Studio UI(http://127.0.0.1:54323) 접속 가능 여부 회장 확인 권장.

### 다음 슬라이스 (#2)
- `supabase migration new init_member_goal` — SQL 작성(member, goal, 기본 RLS)
- `supabase db push` — 로컬 적용
- `supabase gen types typescript --local > web/src/lib/supabase/database.types.ts`
- pgTAP RLS 정책 실검증

---
