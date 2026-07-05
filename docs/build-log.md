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

## 슬라이스 #2 — Migration + RLS + pgTAP (완료 2026-07-06)

### 범위
- `supabase/migrations/20260705163137_init_schema.sql` — 14테이블 스키마 + 뷰 + 트리거 + RLS + 인덱스
- `supabase/tests/rls_policy.test.sql` — pgTAP 20케이스 RLS 실검증
- `web/src/lib/supabase/database.types.ts` — 타입 재생성 (851줄)

### 생성 테이블 (14개)

| # | 테이블 | 역할 | 핵심 |
|---|---|---|---|
| 1 | `member` | 주인공 계정 | auth.users 1:1 FK, ci=bytea 암호화 |
| 2 | `goal` | 목표 액자 | slug UNIQUE, deleted_at soft-delete |
| 3 | `payment` | 토스 결제 | order_id UNIQUE(멱등키), service_role만 write |
| 4 | `cheer` | 응원 1건 | deleted_at soft-delete, message=워드맵 소스 |
| 5 | `payment_log` | 결제 상태전이 | append-only 감사 로그 |
| 6 | `clover_ledger` | 클로버 원장 | append-only, source of truth, service_role만 write |
| 7 | `clover_balance` | 잔액 캐시 | 트리거로 clover_ledger 동기화 |
| 8 | `cashout_request` | 환전 요청 | ₩ 금액은 여기만(3층 c), account_no_enc=bytea |
| 9 | `kyc_verification` | PASS 본인인증 | ci/di=bytea, is_adult 환전 게이트 |
| 10 | `risk_event` | 이상거래 | ACCEPTED-RISK MVP 미사용, 스키마만 |
| 11 | `share_event` | 재공유 analytics | channel CHECK(IMAGE/STORY/LINK) |
| 12 | `wordmap_render_cache` | 이미지 캐시 | Storage URL |
| 13 | `notification` | 알림 | ALIMTALK+INAPP, 실패시 폴백 |
| 14 | `report` | 신고 | INSERT 개방(게스트), SELECT=service_role 전용 |

### 생성 뷰·함수·트리거

| 객체 | 역할 |
|---|---|
| `goal_public` (VIEW) | 금액 3층 a: ₩·clover_count 컬럼 없음, deleted_at IS NULL 필터 |
| `get_wordmap(bigint)` (RPC) | G5 워드맵 집계, SECURITY DEFINER |
| `generate_goal_slug()` (트리거) | goal.slug 자동 생성(gen_random_bytes) |
| `sync_clover_balance()` (트리거) | clover_ledger INSERT 시 clover_balance 동기화 |

### pgTAP 실검증 결과

```
supabase test db
/supabase/tests/rls_policy.test.sql .. ok
All tests successful.
Files=1, Tests=20,  0 wallclock secs
Result: PASS
```

| 케이스 | test-plan | 결과 |
|---|---|---|
| goal_public에 amount_krw/clover_count/gross_krw/fee_krw/net_krw 없음 (5건) | SEC-2 금액 3층 a | GREEN |
| goal_public에 cheer_count 있음 | SEC-2 | GREEN |
| deleted_at 있는 목표 goal_public 제외 | Soft-delete | GREEN |
| 활성 목표 goal_public 조회됨 | — | GREEN |
| anon은 payment INSERT 불가 (42501) | SEC-3 | GREEN |
| authenticated는 clover_ledger INSERT 불가 (42501) | SEC-3 원장 변조 불가 | GREEN |
| authenticated는 payment INSERT 불가 (42501) | SEC-3 | GREEN |
| 사용자A는 사용자B의 clover_balance 조회 불가 (0행) | SEC-4 | GREEN |
| 사용자A는 자신의 clover_balance 조회 가능 (1행) | — | GREEN |
| 사용자A는 사용자B의 cashout_request 조회 불가 (0행) | SEC-4 | GREEN |
| 사용자A는 사용자B의 goal 직접조회 불가 (0행) | SEC-4 | GREEN |
| 사용자A는 자신의 활성 goal 조회 가능 (1행) | — | GREEN |
| anon은 clover_balance SELECT 불가 (42501) | SEC-1 | GREEN |
| anon은 cashout_request SELECT 불가 (42501) | SEC-1 | GREEN |
| anon은 goal_public 활성 목표 조회 가능 | — | GREEN |
| clover_ledger INSERT 시 clover_balance 트리거 동기화 | — | GREEN |

### 게이트 체크

| 게이트 | 상태 |
|---|---|
| supabase db push PASS | ✅ |
| pgTAP 20케이스 GREEN (실 Postgres, mock 없음) | ✅ |
| ERD 1:1 (14테이블) | ✅ |
| RLS 금액 3층 강제 (뷰 + 정책) | ✅ |
| clover_ledger/payment INSERT 정책 없음(service_role EF 전용) | ✅ |
| soft-delete deleted_at 반영 | ✅ |
| web/ TypeScript 오류 0건 | ✅ |
| 시크릿 실값 git 없음 | ✅ |

---

## 슬라이스 #3 — Auth (카카오 로그인) (완료 2026-07-06)

### 범위
- `supabase/functions/_shared/oauth-kakao.ts` — 카카오 OAuth 어댑터 실구현 (exchangeKakaoCode·getKakaoUserInfo·normalizeKakaoUser)
- `supabase/functions/auth-kakao/index.ts` — EF 실구현 (code→token→user→Auth upsert→member upsert→generateLink)
- `supabase/functions/auth-kakao/index.test.ts` — Deno 단위 테스트 (normalizeKakaoUser·KakaoAuthError)
- `supabase/migrations/20260705170046_service_role_grants.sql` — service_role 테이블 GRANT 패치
- `web/src/app/auth/kakao/callback/route.ts` — Route Handler 실구현 (code→EF invoke→verifyOtp→세션→redirect)
- `web/src/lib/supabase/route-handler.ts` — Route Handler용 Supabase 클라이언트 (response.cookies 바인딩)
- `web/src/components/auth/LoginSheet.tsx` — write-first 바텀시트 (카카오 primary·구글·애플·draft 보존 안내)
- `web/src/components/auth/index.ts` — barrel export
- `web/vitest.config.ts` + `web/src/test/setup.ts` — vitest + RTL 설정
- `web/src/components/auth/__tests__/LoginSheet.test.tsx` — 11 케이스 vitest

### 검증 결과 (§3 직접 관찰)

#### web/ Next.js build + TypeScript
```
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 4.6s
Finished TypeScript in 6.6s
TypeScript 오류 0건, 빌드 PASS
```

#### vitest — LoginSheet 11케이스
```
Tests  11 passed (11)
Duration  4.26s — warning 없음 PASS
```
테스트 커버리지:
- open=false 미렌더링 / open=true 렌더링
- 카카오·구글·애플 버튼 존재
- goalTitle 표시 (draft 안심)
- 오버레이·ESC 닫기 (onClose 호출)
- 카카오 클릭 → Kakao OAuth URL (client_id·callback·state 포함)
- 약관/개인정보 링크

#### EF auth-kakao smoke test (supabase functions serve)
```
OPTIONS preflight → HTTP 204 (CORS) ✅
GET         → HTTP 405 {"error":{"code":"method_not_allowed"}} ✅
POST {}     → HTTP 503 {"error":{"code":"missing_env","message":"KAKAO_CLIENT_ID..."}} ✅
```

#### pgTAP 실검증 (20케이스 — 신규 마이그레이션 후)
```
Files=1, Tests=20, Result: PASS
```

#### RLS 세션 게이팅 — 로그인 유저만 자기 데이터 접근 (직접 관찰)
```
1. service_role: auth user 생성 → user_id 발급 ✅
2. service_role: member INSERT → HTTP 201 ✅ (grants 패치 적용)
3. magiclink generateLink → hashed_token ✅
4. verifyOtp → access_token 발급 ✅
5. 자기 세션: member SELECT → 1행 [자기 데이터] ✅
6. anon: member SELECT → HTTP 403 {"code":"42501","message":"permission denied"} ✅
```

### 게이트 체크

| 게이트 | 상태 |
|---|---|
| web/ Next.js build PASS (TypeScript 0건) | ✅ |
| vitest 11케이스 PASS | ✅ |
| EF smoke test (405/204/503) | ✅ |
| pgTAP 20케이스 GREEN (신규 마이그레이션 후) | ✅ |
| RLS 세션 게이팅 직접 관찰 | ✅ |
| service_role GRANT 패치 (INSERT on member) | ✅ |
| 시크릿 실값 git 없음 (env placeholder만) | ✅ |
| @postagi/* import 없음 | ✅ |
| 포트 충돌 없음 | ✅ |

### ⛔ 회수 필요 (카카오 실키 — 회장 액션)

1. **카카오 디벨로퍼 앱 생성 필수**: [developers.kakao.com](https://developers.kakao.com) → 앱 생성
   - **REST API 키** → `NEXT_PUBLIC_KAKAO_REST_API_KEY` (web/.env.local)
   - **REST API 키** → `KAKAO_CLIENT_ID` (Edge Function secret: `supabase secrets set KAKAO_CLIENT_ID=...`)
   - **앱 시크릿 키** → `KAKAO_CLIENT_SECRET` (Edge Function secret: `supabase secrets set KAKAO_CLIENT_SECRET=...`)
2. **카카오 로그인 redirect URI 등록**: `https://{your-domain}/auth/kakao/callback` (+ 로컬: `http://localhost:3000/auth/kakao/callback`)
3. **동의항목 설정**: 닉네임, 프로필사진, 카카오계정(이메일) 선택 동의
4. **실 E2E 검증**: 실 키 설정 후 → 브라우저에서 카카오 로그인 → member 행 생성 → 세션 쿠키 확인 → `/home` 리다이렉트

> 미검증 항목: 실 카카오 로그인 E2E (키 없이 불가). 키 발급 후 위 4번 직접 확인 필요.

### 다음 슬라이스 (#4)
- OnboardingGoalForm (write-first: 목표쓰기 → 저장 시 LoginSheet)
- ShareLinkCard (내 링크 받기)
- 랜딩 파이널 (WIREFRAMES/01-landing.md)
- goal INSERT G1 + RLS

---
