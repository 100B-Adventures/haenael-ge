# Design Patterns — 해낼게 (haenael-ge)

> eng-design 산출물. 이 프로젝트에서 **쓸 패턴 / 안 쓸 것**을 명시. 임의 개발 진입 시 "빈틈"의 원천을 사전 차단.
> 근거: postAGI(Romeo) 설계 *참고* + risks.md(돈·규제) + DESIGN.md(금액 3층). 확정은 메인세션 대화.
> 🔒 회장 확정(2026-07-04): **서버리스 스택**(Next.js/Vercel + Supabase Postgres/RLS + Edge Functions) · **독립 코드베이스**(Romeo/commons 코드 import 아님, *참고해 자체 구현*).

---

## 1. 실행 경로 분리 — 읽기(RLS) vs 돈 쓰기(Edge Function)
서버리스엔 Controller-Service-Repository 3계층이 없다. 대신 **경로를 둘로 가른다**:

| 경로 | 무엇 | 어떻게 | 금지 |
|---|---|---|---|
| **읽기** | 목표 열람·워드맵·잔액·알림 | Next.js에서 Supabase 클라이언트 직접 쿼리(anon/authed) — **RLS가 보안** | 금액 필드를 공개 뷰에 노출 |
| **돈 쓰기** | 결제확정·원장·환전·지급대행 | **Edge Function(service_role)** — 멱등·검증·원장 트랜잭션 | 클라이언트가 payment/clover_ledger 직접 write |
| **비돈 쓰기** | 목표 생성·삭제·재공유 이벤트 | RLS insert/update(본인) + DB 트리거(slug 등) | RLS 없이 열어두기 |
| **외부 I/O** | 토스·KYC | Edge Function `_shared/` 어댑터(자체 구현) | 브라우저에 secret |

- **트랜잭션 경계 = Edge Function 안**(결제확정 payment+cheer+ledger를 Postgres `rpc` DB 함수 1커밋으로 원자화 권장).
- **도메인 간 참조**: cheer→clover 적립은 `toss-confirm` EF가 `_shared/ledger.ts`로 기입(테이블 직접 크로스 write 금지, 헬퍼 경유).

## 2. RLS 패턴 (defense-in-depth) — DB가 최후 방어선
- **모든 테이블 RLS ON.** 서버 코드 버그가 있어도 DB가 행 접근을 막는다(조사: Supabase RLS best practice = defense-in-depth).
- 정책 관습: **SELECT/INSERT/UPDATE 정책을 짝으로**, RLS 컬럼(`member_id` 등)에 **인덱스**(누락 = 성능 킬러).
- 핵심 정책:
  - `goal_public` **뷰**(SELECT anon/게스트) = 금액 필드 부재(3층 a를 스키마로 강제).
  - `goal`·`clover_balance`·`cashout_request` = `auth.uid() = member_id` 인 행만(본인).
  - `payment`·`clover_ledger` = **클라 write 정책 없음**(service_role EF만). 본인 read만 허용.
  - 게스트(`is_anonymous=true`) = 목표 read + cheer-order EF invoke만.

## 3. 금액 3층 — DB 뷰/응답으로 분리 (타입·스키마로 강제)
DESIGN.md §6을 **Postgres 뷰 + EF 응답 스키마**로 박는다(문서 규칙이 아니라 구조):
- `goal_public` (②·공개) — **₩·클로버개수 컬럼 자체가 없음**, `cheer_count`(N명)만.
- `clover_balance` (본인) — `clover_count`만, **₩ 없음**.
- `cashout` EF 응답 — 여기서만 `grossKrw·feeKrw·withholdingKrw·netKrw`.
- 입력검증: Edge Function에서 zod 등 스키마 검증(min 1,000원·D-day 미래·필수).

## 4. 원장 패턴 (Ledger, event-sourcing-lite) — 클로버
- **`clover_ledger` = append-only** Postgres 테이블. 적립/홀드/정산/환원을 이벤트로 기입. 삭제·수정 금지. **Edge Function(service_role)만 write**(RLS로 클라 write 차단).
- 잔액 = 원장 합계(SUM). `clover_balance`는 **성능용 파생 캐시**(원장에서 재계산 가능 = source of truth는 원장). 파생은 트리거 or EF.
- 근거: Romeo `PointWallet`+`PointLog`+`PointLogType` **설계 참고**(코드 복사·의존 X, Postgres+EF 자체 재구현).
- entry_type: `EARN`(결제확정) · `CASHOUT_HOLD` · `CASHOUT_SETTLED` · `CASHOUT_REVERSAL`(환전실패 복원) · `REFUND_REVERSAL`(응원환불).

## 5. 멱등성 (Idempotency) — 돈은 무관용
- **결제 confirm·환전 payout은 멱등 필수.** Edge Function에서 `orderId`/`cashoutRequestId` UNIQUE 제약 + (필요 시) Postgres advisory lock으로 동시성 차단(Redis 없음 — DB로).
- `payment` UNIQUE(order_id), `cashout_request` 상태머신으로 이중 지급대행 차단.
- user-flow §2.2 "이중탭·중복결제" = 버튼잠금(UI) + EF 멱등(2중 방어).

## 6. 상태머신 (State Machine) — payment·cheer·cashout
명시적 상태전이만 허용, 역행·건너뜀 금지(불법전이는 EF에서 거절). Postgres CHECK/enum + EF 검증.
- `payment`: READY → DONE / FAILED / CANCELED
- `cheer`: PENDING → CONFIRMED / REFUNDED (결제 성공 시 CONFIRMED, 워드맵 반영)
- `cashout`: REQUESTED → KYC_PENDING → APPROVED → PAYOUT_SENT → PAID / REJECTED / FAILED(→REVERSAL)
- `goal`: ACTIVE → CLOSED(D-day) → (적립형이라 CLOSED도 응원 가능) / DELETED

## 7. Adapter/Port (외부 격리) — 토스·KYC
- 토스·KYC·알림은 `supabase/functions/_shared/`에 **어댑터(자체 구현, Deno/TS)**: `toss.ts`·`payout.ts`·`risk.ts`. EF 핸들러는 이 모듈에만 의존.
- 근거: (a) 단위테스트 mock 교체 (b) 벤더 교체 여지(지급대행 개인 지급 불가 시 대안 — architecture §9).
- ⚠️ **E2E·QA는 실제 토스 stage/test 키로** 친다(mock 아님, 헌법 §3 prod-parity).

## 8. ⚠️ Deferred-Rule Hook 패턴 — 셀프후원 차단 (ACCEPTED-RISK)
- 🔒 회장 결정(2026-07-04): 셀프후원·자금세탁 **차단 룰 미구현**(자연억제 — KYC·최소환전 30,000원·수수료·토스 모니터링). architecture §2.5.
- 패턴: `cashout` Edge Function이 확정 전 `riskHook(request)` 호출. **기본 구현 = `_shared/risk.ts`의 `noOpRiskHook`(항상 `CLEAR`)**. 호출지점은 지금 심고, 룰 구현은 나중에 함수 교체만(재수술 X).
- **`hook exists, rule deferred`** — 코드 주석·test-plan에 명시. 결제는 애초에 안 막음(환전측 훅만).

## 9. 게스트 세션 패턴 (Supabase anonymous)
- 무가입 응원자 = `supabase.auth.signInAnonymously()` → authenticated 역할(`is_anonymous=true` JWT). PG customerKey `ANONYMOUS`. 신원은 PG에만(환불·법적).
- 게스트 권한 = `cheer-order`/`toss-confirm` EF invoke + 목표 read만. 조회(잔액)/환전/목표생성 불가(RLS·EF 검증).

## 10. 웹 상태관리 (경량)
- **서버상태 = Supabase JS 클라이언트 + React Query(또는 SWR)** — 캐시·리페치. Supabase Auth SDK가 세션/리프레시 관리(자체 인터셉터 불요). @postagi 의존 X.
- **로컬 draft(write-first)** = localStorage(로그인 실패해도 글 보존, user-flow §1.2). Zustand 경량.
- **안 쓸 것**: Redux/무거운 전역스토어. 복잡 상태기계 라이브러리.

## 11. 에러 처리
- Edge Function: 통일 JSON 에러 형태(`{ error: { code, message } }`) 자체 정의 + 토스 예외 캐치 → 사용자 친화 코드. Supabase 클라 에러는 `.error` 체크.
- 프론트: ErrorState 컴포넌트(사유 한 줄 + 재시도 + 대안). **dead-end 0**(user-flow) = 모든 에러에 다음 경로. 침묵 금지(로딩·실패 항상 표시, DESIGN.md §6).

## 11a. 인증 패턴 — 카카오 커스텀 OAuth (Supabase 네이티브 미지원)
- 🔒 로그인 = **카카오 primary** + 구글/애플. 구글/애플=`supabase.auth.signInWithOAuth`(네이티브). **카카오는 네이티브 미지원** → Edge Function `auth-kakao`가 인가코드→토큰교환→사용자정보→**Supabase 세션 발급**(admin API로 유저 upsert). PASS 본인인증은 로그인과 별개(환전 게이트에서만).

## 11b. Soft-delete + 모더레이션 패턴 (MVP=신고+수동삭제)
- 🔒 MVP 모더레이션 = **신고 버튼 + 수동 삭제**(사전 AI필터·admin UI=나중). `report` insert(RLS) → 운영자 수동 검토 → 대상 `goal`/`cheer`의 **`deleted_at` set**(soft-delete).
- **RLS·뷰가 `deleted_at IS NULL`만 노출**(삭제 즉시 ②·워드맵에서 사라짐, 물리삭제 아님=감사·복구). `goal_public` 뷰에 `deleted_at IS NULL` 필수. cheer soft-delete → 워드맵 read-model 자동 제외. 원장은 불변(결제·정산 이력 유지).

## 11c. 알림 패턴 — 카카오 알림톡(정보성)
- 🔒 응원 도착 등 **정보성** 알림 = Edge Function `notify` → `_shared/alimtalk.ts`. **템플릿 사전심사·건당비·정보성만(마케팅 금지)**. 발송 실패 시 **인앱 알림(notification 테이블) 폴백**. "조용함" 에토스 = 빈도 최소.

---

## 12. 🚫 안 쓸 패턴 (의식적 배제 — slop·과설계 방지)
| 배제 | 이유 |
|---|---|
| **상주 백엔드 서버·마이크로서비스** | 🔒 서버리스(Edge Functions). 관리할 상주 앱 0. 고정비·운영부담 제거 |
| **자체 Redis·세션 인프라** | Supabase(Postgres/Auth)로 충분. 멱등=DB UNIQUE, 세션=Supabase Auth |
| **CQRS 풀분리·이벤트소싱 전면** | 원장(clover)만 append-only. 나머지는 CRUD. 전면 도입 과설계 |
| **선불 지갑/사전충전** | 잠김결정 = 사전충전 X(전금법 회피). 충전형 클로버 지갑 패턴 금지 |
| **자체 자금 보유·에스크로 직영** | architecture §2 = 자금 무보유. 우리 계좌로 자금 통과 금지(규제) |
| **admin 풀 UI·RBAC 프레임워크** | 스코프 밖(MVP=수동/내부). 확장점만 |
| **pledge 조건부 에스크로·달성판정 엔진** | 스코프 밖(phase2). cheer 서브타입 확장점만 |
| **친구그래프·피드·팔로우 자료구조** | phase2. 단 goal/member FK가 **막지 않게** 설계(확장 허용) |
| **무거운 전역 상태관리(Redux)·GraphQL** | 규모 대비 과분. Supabase 클라 + 서버상태 캐시 |
| **랭킹·리더보드·과시 카운트** | DESIGN.md §5 anti-slop = 조용함 위반 |
| **commons/public shared 의존(gradle·npm import)** | 🔒 독립 코드베이스. Romeo/DC와 결합·blast-radius 제거. 패턴은 *참고*만 |
| **셀프후원 차단 룰(velocity·CI매칭·한도)** | ⚠️ ACCEPTED-RISK(§8). no-op 훅 자리만, 룰 deferred. 토스 문제제기 시 구현 |
| **클라이언트에서 돈 테이블 직접 write** | RLS로 차단. payment·clover_ledger는 service_role EF만 |

---

## 13. 셀프심문 (CoVe)
- **"이 패턴 세트가 틀렸다면 왜?"** → 원장을 안 쓰고 잔액 컬럼만 두면 빠르나 환불·감사에서 무너짐(돈). ⇒ 원장 유지(§4).
- **"서버리스에 RLS 안 걸고 EF만 믿으면?"** → EF 버그 시 유출. ⇒ RLS ON 필수(§2, defense-in-depth). 방어됨.
- **"과설계 아닌가?"** → §12로 상주서버·CQRS전면·pledge엔진 명시 배제. 원장·멱등·상태머신·RLS만 = 돈 다루는 최소 필수. 방어됨.
- **레드팀(까다로운 시니어 리뷰어)**: "DTO 3층 분리는 보일러플레이트 아닌가?" → 금액 노출 = 제품 정체성(조용함) 위반 = 치명. 타입으로 막는 비용 < 유출 사고. 유지.
- **"독립 코드베이스가 중복 아닌가?"** → 구현비용 agent≈0이라 DRY의 절감명분 소멸, 대신 결합·blast-radius 제거·배포독립이 이김(회장 결정). 패턴은 참고로 품질 유지. 방어됨.
- **"셀프후원 훅 no-op = 구멍 아닌가?"** → 맞다(ACCEPTED-RISK, 회장 인지). 단 훅 자리를 지금 심어 나중 주입만으로 활성화 → 리스크 발현 시 재수술 없이 대응. 자연억제(KYC·최소환전·수수료)로 1차 방어.

SKILLS_USED: 없음
SKILLS_SKIPPED: 매칭 스킬 없음(설계 패턴 결정 문서 — document-generate는 코드 역생성용 부적용)

SOURCES/MODEL: opus-4-8[1m] · 근거=DESIGN.md §6(금액3층)·user-flow(dead-end0)·risks.md(돈/규제) · Supabase RLS defense-in-depth(WebSearch: supabase.com/docs database RLS, makerkit RLS best practices) · Romeo payment 도메인 구조(참고, 의존 X)
