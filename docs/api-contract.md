# API Contract + ERD + 매핑 완전성 — 해낼게 (haenael-ge)

> eng-design 산출물. **엔드포인트 카탈로그 + ERD + user-flow 전스텝 1:1 매핑(갭 0 판정 근거).**
> 진실원: `user-flow.md`(전 경로) · `DESIGN.md`(금액 3층·컴포넌트) · `architecture.md`(자금흐름).
> 규율: 매핑 안 되는 스텝이 하나라도 있으면 **완료 거부 + ⛔**. (개발 후 빈틈 발견 방지 = 이 문서의 존재 이유.)

---

## 1. ERD (Supabase **Postgres**) — 테이블 카탈로그

> Romeo `payment` 도메인 원장 패턴 **참고**(코드 X, 자체 재설계). 🔒 스택: Supabase Postgres + RLS.
> **타입 매핑(MySQL→Postgres)**: BIGINT→`bigint`(또는 PK `uuid`) · VARCHAR→`text` · DATETIME→`timestamptz` · ENUM→Postgres `enum` 타입(또는 CHECK) · BOOLEAN→`boolean` · JSON→`jsonb` · 암호화=`bytea`(pgcrypto).
> **RLS**: 모든 테이블 RLS ON(§design-patterns 2). 돈 테이블(payment·clover_ledger) = service_role EF만 write.

### member — 주인공(공급) 계정
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK = **auth.users.id** | Supabase Auth 계정과 1:1(FK) |
| provider / provider_id | text | 카카오/구글 (Auth 메타서 파생 가능) |
| nickname / profile_image | text | |
| birth_date | date null | **연령게이트(P2)**. KYC 시 확정 |
| kyc_status | enum(NONE,VERIFIED) | 환전 전 필수 |
| ci | bytea(enc) null | 본인인증 연계정보(pgcrypto) |
| created_at | timestamptz | |
> RLS: `auth.uid() = id`(본인만 read/update). phase2: `friend_edge(member_id, friend_id)` 확장점.

### goal — 목표(액자)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint PK | |
| member_id | uuid FK→member | 소유자(주인공) |
| slug | VARCHAR UNIQUE | ②링크 `/g/{slug}` |
| title | VARCHAR | "○○ 해낼게" |
| reason | TEXT | 왜(이유) |
| due_date | DATE | D-day |
| status | ENUM(ACTIVE,CLOSED,DELETED) | 적립형=CLOSED도 응원 가능 |
| created_at / closed_at | timestamptz | |
> phase2: pledge·달성흐름 붙을 때 `goal`에 서브 테이블 추가(막지 않게 설계).

### cheer — 응원 1건
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint PK | |
| goal_id | bigint FK→goal | |
| supporter_ci | VARCHAR(enc) nullable | 게스트=null, 신원은 payment/PG에 |
| display_name | VARCHAR nullable | 익명이면 null("익명의 누군가") |
| is_anonymous | BOOLEAN | 응원자 선택(Q2) |
| message | VARCHAR(140) nullable | 한 줄 응원(선택)=워드맵 소스 |
| clover_amount | INT | 결제→클로버 개수 |
| payment_id | bigint FK→payment | |
| status | ENUM(PENDING,CONFIRMED,REFUNDED) | |
| created_at | timestamptz | |

### payment — 토스 결제 주문
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint PK | |
| order_id | VARCHAR UNIQUE | **멱등키** |
| payment_key | VARCHAR | 토스 |
| amount_krw | INT | 최소 1,000원 |
| method | VARCHAR | 카드/토스페이/카카오/네이버 |
| status | ENUM(READY,DONE,CANCELED,FAILED) | 상태머신 |
| pg_customer_key | VARCHAR | 게스트=ANONYMOUS |
| approved_at | timestamptz null | |
| receipt_url | VARCHAR | 영수증(환불 문의 경로) |
| raw_response | JSON | 감사 |

### payment_log — 결제 상태전이 로그 (append-only)
id · payment_id FK · from_status · to_status · detail · created_at

### clover_ledger — 클로버 원장 (append-only, source of truth)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint PK | |
| member_id | uuid FK→member | |
| entry_type | ENUM(EARN,CASHOUT_HOLD,CASHOUT_SETTLED,CASHOUT_REVERSAL,REFUND_REVERSAL) | |
| clover_delta | INT | +/- |
| ref_type / ref_id | text/bigint | cheer_id or cashout_request_id |
| balance_after | INT | 검증용 스냅샷 |
| created_at | timestamptz | |

### clover_balance — 잔액 파생 캐시 (원장에서 재계산 가능)
member_id PK · clover_count · updated_at

### cashout_request — 환전
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint PK | requestId=멱등 |
| member_id | uuid FK | |
| clover_amount | INT | |
| gross_krw / fee_krw / withholding_krw / net_krw | INT | **₩는 여기서만** (3층 c) |
| status | ENUM(REQUESTED,KYC_PENDING,APPROVED,PAYOUT_SENT,PAID,REJECTED,FAILED) | |
| payout_id | VARCHAR nullable | 토스 지급대행 |
| bank_code / account_no_enc | VARCHAR | 암호화 |
| risk_flag | ENUM(CLEAR,REVIEW,BLOCKED) | RiskHook 결과. MVP=항상 CLEAR(no-op) |
| requested_at / paid_at | timestamptz | |

### kyc_verification — 본인인증·연령(만19+ 게이트) · **PASS 통합본인인증**
id · member_id FK · real_name · ci(bytea enc) · di · birth_date · is_adult · provider=`PASS` · verified_at
> 🔒 벤더=PASS 통합본인인증(환전 전단계 `kyc-verify` EF가 호출). 로그인과 별개. 실단가=build 확인.

### risk_event — 이상거래(환전측) ⚠️ ACCEPTED-RISK: MVP 미사용
🔒 회장 결정(2026-07-04): 셀프후원 차단 룰 미구현. `RiskHook` no-op만(architecture §2.5). **스키마만 정의, MVP에선 쓰지 않음**(룰 활성화 시 사용). id · member_id FK · type · detail(JSON) · resolved · created_at

### share_event — 재공유·확산(analytics)
id · goal_id FK · channel(IMAGE,STORY,LINK) · created_at

### wordmap_render_cache — 공유 이미지 캐시
id · goal_id FK · image_url(storage) · word_count · rendered_at

### notification — 은은한 알림 (인앱 + **카카오 알림톡**)
id · member_id FK · type(CHEER_RECEIVED) · channel(ALIMTALK,INAPP) · alimtalk_status(SENT,FAILED,null) · read · created_at
> 🔒 정보성 알림톡(`notify` EF). 발송 실패 시 INAPP 폴백. 마케팅 금지.

### report — 신고·모더레이션 (MVP=신고+수동삭제)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint PK | |
| reporter_ref | uuid/text null | 신고자(게스트 가능) |
| target_type | enum(GOAL,CHEER) | 신고 대상 |
| target_id | bigint | goal_id or cheer_id |
| reason | text | 사유 |
| status | enum(OPEN,RESOLVED_DELETED,DISMISSED) | 수동 처리 |
| created_at | timestamptz | |
> 🔒 처리=운영자 수동 → 대상 `goal.deleted_at`/`cheer.deleted_at` set(soft-delete). 사전 AI필터·admin UI=나중.

### soft-delete (goal·cheer 공통 컬럼)
`goal`·`cheer`에 **`deleted_at timestamptz null`** 추가. RLS·`goal_public` 뷰·워드맵 집계는 **`deleted_at IS NULL`만 노출**(신고 삭제 즉시 사라짐, 물리삭제 아님=감사·복구). 원장은 불변.

> **워드맵 = read-model**: 별도 테이블 없이 `cheer`(message not null AND deleted_at IS NULL) 집계 쿼리. 공유이미지만 render_cache.

---

## 2. 엔드포인트 카탈로그 (서버리스)

> 🔒 서버리스: **[RLS]** = Supabase 클라이언트 직접 쿼리(PostgREST, RLS가 보안, 커스텀 코드 X) / **[EF]** = Edge Function(Deno/TS, 돈·검증·멱등) / **[Auth]** = Supabase Auth SDK.
> 인증 = 🔓공개(anon) / 👻게스트(anonymous auth, `is_anonymous`) / 👤주인공(소셜 auth). 금액 3층 = RLS 뷰/EF 응답으로 강제.

### auth / member
| # | 경로/호출 | 종류 | 인증 | 응답 | 비고 |
|---|---|---|---|---|---|
| A1 | EF `auth-kakao` (인가코드→토큰→세션) | [EF] | 🔓 | Supabase 세션 | 🔒 **카카오 primary**(네이티브 미지원→커스텀) |
| A1b | `supabase.auth.signInWithOAuth(google/apple)` | [Auth] | 🔓 | 세션 | 구글/애플=네이티브 |
| A2 | `supabase.auth.signInAnonymously()` | [Auth] | 🔓 | 게스트 세션 | 결제용 게스트 |
| A3 | `from('member').select() eq(id,uid)` | [RLS] | 👤 | member,kyc_status | 본인 |

### goal (① 생성 / ② 열람)
| # | 경로/호출 | 종류 | 인증 | 응답 | 비고 |
|---|---|---|---|---|---|
| G1 | `from('goal').insert()` | [RLS] | 👤 | goal, slug(트리거) | write-first 저장(로그인 후) |
| G2 | `from('goal_public').select().eq(slug)` | [RLS 뷰] | 🔓 | title,reason,dday,cheerCount,wordmap **금액 X** | ② 비로그인 열람(뷰가 금액 필드 부재) |
| G3 | `from('goal').select().eq(member_id,uid)` | [RLS] | 👤 | 본인 목표 | 받는사람 홈 |
| G4 | `from('goal').update(status=DELETED)` | [RLS] | 👤 | ok | 삭제→②는 "종료된 목표" |
| G5 | `rpc('get_wordmap', goal_id)` | [RLS RPC] | 🔓 | words[], count | 워드맵 집계 read-model |
| G6 | EF `wordmap-render` | [EF] | 👤 | imageUrl | 공유 이미지 → Storage |

### cheer + payment (② 결제 — 돈 코어)
| # | 경로/호출 | 종류 | 인증 | 응답 | 비고 |
|---|---|---|---|---|---|
| C1 | EF `cheer-order` | [EF] | 🔓/👻 | cheerId, orderId, amount, clientKey | cheer=PENDING + 주문·멱등 |
| P1 | EF `toss-confirm` | [EF·강모델] | 🔓/👻 | payment DONE, cheer CONFIRMED | **서버승인·멱등·ledger EARN** |
| P2 | EF `toss-webhook` | [EF·강모델] | 🔓(경로 토큰+Toss API 재조회) | 200 | 상태 재동기(보상) |
| C2 | `from('payment').select receipt` | [RLS] | 🔓/👻 | receiptUrl, 문의경로 | 영수증·환불 문의(수동) |

### clover / cashout (환전 — ₩ 여기서만, 돈 코어)
| # | 경로/호출 | 종류 | 인증 | 응답 | 비고 |
|---|---|---|---|---|---|
| K1 | `from('clover_balance').select()` | [RLS] | 👤 | **cloverCount** (₩ 없음) | 홈·잔액=개수만 |
| K2 | EF `cashout` (mode=quote) | [EF] | 👤 | gross,fee,withholding,net | 환전 눌러야 ₩ 등장 |
| K3 | EF `cashout` (mode=request) | [EF·강모델] | 👤 | cashoutRequest(status) | 최소 30,000원·만19+·riskHook(no-op)·HOLD |
| K3b | EF `cashout-payout` | [EF·강모델] | (내부) | payout 결과 | 지급대행·SETTLED·지급명세 |
| K4 | EF `kyc-verify` (**PASS**) | [EF] | 👤 | kyc(is_adult,실명,CI) | 만19+ 게이트·PASS 통합본인인증 |
| K5 | `from('cashout_request').select().eq(member_id,uid)` | [RLS] | 👤 | 정산 내역(**정산주기 D+n**⛔) | |

### notification / share / report / moderation
| # | 경로/호출 | 종류 | 인증 | 응답 | 비고 |
|---|---|---|---|---|---|
| N1 | `from('notification').select().eq(member_id,uid)` | [RLS] | 👤 | notification[] | 은은한 배지(인앱) |
| N2 | EF `notify` (알림톡 발송) | [EF] | (내부, toss-confirm이 호출) | ok | 카카오 알림톡(정보성)·실패 시 INAPP 폴백 |
| S1 | `from('share_event').insert()` | [RLS] | 👤 | ok | 재공유 analytics |
| R1 | EF `report` (or `from('report').insert()`) | [EF/RLS] | 🔓/👻/👤 | ok | 신고 접수(목표/메시지) |
| R2 | 수동 → `update(deleted_at)` | [운영 수동] | (운영자) | soft-delete | 신고 처리(admin UI=나중) |

> **GA4 이벤트(web gtag, 수집=앱/분석=MARKETING 중앙)**: `goal_created`·`cheer_started`·`payment_success`·`wordmap_shared`·`cashout_requested`·`report_submitted`. (엔드포인트 아님 — 클라 계측.)

> **RLS 정책 요약**: `goal_public`(anon SELECT, **금액 필드 부재 + `deleted_at IS NULL`**) · `goal`/`clover_balance`/`cashout_request`/`notification`(SELECT/UPDATE `auth.uid()=member_id`) · `payment`/`clover_ledger`(클라 write 정책 없음=service_role EF만; 본인 SELECT만) · `report`(insert 허용, read=운영/service_role) · 게스트(`is_anonymous`)=목표 read + cheer/confirm/report EF만.

---

## 3. 🎯 매핑 완전성 표 — user-flow 전스텝 ↔ 엔드포인트 ↔ 컴포넌트 ↔ 테이블

> **이 표가 "개발 후 유저플로우 빈틈 발견"을 구조적으로 막는 지점.** 갭 있으면 ⛔.

### ① 받는 사람 플로우 (user-flow §1)
| user-flow 스텝/상태 | 엔드포인트 | 컴포넌트(web) | 테이블 | 갭 |
|---|---|---|---|---|
| §1.1-1 진입(linktree/②전환) | — (라우팅) | `page.tsx`(랜딩) | — | ✅ |
| §1.1-2 랜딩 ① | — | LandingHero+WordmapPreview | — | ✅ |
| §1.1-3 목표 만들기(write-first) | (draft 로컬) | OnboardingGoalForm | (미영속) | ✅ |
| §1.1-4 저장/로그인(카카오 primary) | A1(카카오)/A1b, G1 | LoginSheet, OnboardingGoalForm | member(auth.users), goal | ✅ |
| §1.2 입력검증 실패 | (클라 검증)+G1 400 | OnboardingGoalForm(인라인) | — | ✅ |
| §1.2 로그인 취소→draft 보존 | A1 취소 | LoginSheet+localStorage draft | — | ✅ |
| §1.1-5 내 링크 받기 | G1 응답 slug | ShareLinkCard | goal.slug | ✅ |
| §1.2 링크 복사 후 공백(응원0) | G3 | ShareLinkCard+EmptyState | goal, cheer(0) | ✅ |
| §1.1-6 수신 알림(은은·알림톡) | N1, N2(알림톡) | NotificationBadge | notification(ALIMTALK/INAPP) | ✅ |
| §1.1-6 누가 응원(이름/익명, 금액X) | G3 | SupporterList(익명반영) | cheer | ✅ |
| §1.1-7 워드맵 차오름·풀뷰 | G5 | Wordmap(풀뷰) | cheer(message), wordmap_render_cache | ✅ |
| §1.1-7 재공유(이미지/스토리) | G6, S1 | WordmapShareIcons | wordmap_render_cache, share_event | ✅ |
| §3 확산(친구 링크탭→②) | G2 | (② 도착) | goal, share_event | ✅ |
| §1.1-8 환전 진입(개수만) | K1 | CashoutEntry(🍀개수) | clover_balance | ✅ |
| §1.2 환전 임계 미달(대기) | K3 → 422 미달 | CashoutWaitState | cashout_request(거부/대기) | ✅ |
| §1.1-8 환전 견적(₩ 현실화) | K2 | CashoutQuoteSheet | (계산) | ✅ |
| §1.2 환전 KYC 미완(PASS) | K4(PASS) | KycSheet | kyc_verification(PASS) | ✅ |
| §1.1-8 환전 신청·원천징수·처리중 | K3 | CashoutSheet(로딩) | cashout_request, clover_ledger(HOLD) | ✅ |
| §1.1-8 환전 완료·정산내역(D+n) | K5 | CashoutHistory(정산주기 표시) | cashout_request(PAID), clover_ledger(SETTLED) | ✅(주기=⛔) |
| §1.2 목표 마감(D-day)—응원 지속 | G2/G3 status=CLOSED | StatusChip(마감) | goal.status | ✅ |
| §1.2 계정/목표 삭제 | G4 | DeleteConfirmModal | goal.status=DELETED | ✅ |
| §1.2 미성년 환전 연령게이트(만19+) | K4(is_adult) | KycSheet | kyc_verification.is_adult | ✅🔒P2 |

### ② 친구 플로우 (user-flow §2)
| user-flow 스텝/상태 | 엔드포인트 | 컴포넌트(web) | 테이블 | 갭 |
|---|---|---|---|---|
| §2.1-1,2 유입·열람(비로그인) | G2 | GoalCard+CheerCount+Wordmap | goal, cheer(집계) | ✅ |
| §2.2 empty(응원0=첫친구) | G2(count 0) | EmptyState("첫 응원") | cheer(0) | ✅ |
| §2.2 few(1~5) | G2 | GoalCard 축소형 | cheer | ✅ |
| §2.1-3 응원 CTA "조용히 밀어줄게" | — | PaymentSheet 트리거 | — | ✅ |
| §2.1-4 금액 선택(커피값 앵커) | C1(draft) | AmountChips | (draft) | ✅ |
| §2.1-5 메시지(선택) | C1 | MessageField | cheer.message | ✅ |
| §2.1-6 익명 선택 | C1 | AnonymityToggle | cheer.is_anonymous | ✅ |
| §2.1-7 결제(게스트/간편: 카드·카카오페이·네이버페이·토스페이) | A2, C1, 결제위젯 | PaymentSheet+토스위젯(간편결제) | payment, guest세션 | ✅ |
| §2.2 결제 처리중 | (위젯 로딩) | PaymentSheet(spinner,닫기잠금) | payment.READY | ✅ |
| §2.2 결제 성공 | P1 | ConfirmToast+워드맵반영 | payment.DONE, cheer.CONFIRMED, clover_ledger.EARN | ✅ |
| §2.2 결제 실패 | P1 4xx | ErrorState(재시도/다른수단) | payment.FAILED, payment_log | ✅ |
| §2.2 시트 닫음(취소) | — | 페이지 복귀(손실0) | — | ✅ |
| §2.2 중복/이중탭 | C1/P1 멱등(order_id UNIQUE) | 버튼잠금 | payment UNIQUE | ✅ |
| §2.2 환불 요청 경로(문의 수동) | C2 | ReceiptSheet(문의) | payment.receipt_url | ✅🔒P3 |
| §2.2 마감된 목표(응원 지속) | G2 status=CLOSED | StatusChip | goal.status | ✅ |
| §2.2 비공개/삭제 목표 | G2 → 410 | ErrorState("종료된 목표"+①) | goal.status | ✅ |
| §2.2 잘못된 링크 404 | G2 → 404 | ErrorState(404+홈) | — | ✅ |
| §2.2 셀프후원 의심 | (결제허용) K3 RiskHook(no-op) | (차단 안 함) | risk_event(미사용) | ✅🔒P4(차단안함) |
| §2.2 미성년 결제 | 결제허용 + K4 게이트(환전만 만19+) | KycSheet | kyc_verification | ✅🔒P2 |
| §2.1-9 확산 "나도 만들래"→① | — → onboarding | SubtleTransitionLink | — | ✅ |

### 접합·확산 루프 (user-flow §3)
| 노드 | 엔드포인트 | 컴포넌트 | 테이블 | 갭 |
|---|---|---|---|---|
| 목표생성→링크→인스타 | G1 | ShareLinkCard | goal.slug | ✅ |
| 인스타→②유입 | G2 | GoalPage | goal | ✅ |
| 결제→워드맵 갱신 | P1→G5 | Wordmap | cheer, clover_ledger | ✅ |
| 재공유→다음친구 | G6,S1 | WordmapShareIcons | share_event | ✅ |
| 스토리 링크탭→②(고리닫힘) | G2 | GoalPage | goal, share_event | ✅ |
| 완료→"나도 만들래"→① | — | SubtleTransitionLink | — | ✅ |

### 신규 확정 결정 매핑 (user-flow 외 — 안전·운영, 완결 매핑 = 갭 아님)
> user-flow가 열거하지 않은 회장 확정 기능. 각각 엔드포인트+컴포넌트+테이블 완결 매핑(dangling 없음).

| 기능(회장 확정) | 엔드포인트 | 컴포넌트(web) | 테이블 | 갭 |
|---|---|---|---|---|
| 신고(목표/메시지) | R1 `report` | ReportButton(② goal/message) | report | ✅ |
| 신고 처리(수동 삭제) | R2 update(deleted_at) | (운영 수동, admin=나중) | goal/cheer.deleted_at | ✅(수동) |
| 삭제 반영(②·워드맵) | G2/G5 `deleted_at IS NULL` | GoalPage/Wordmap | goal/cheer 필터 | ✅ |
| GA4 계측 | (클라 gtag) | lib/analytics | (외부 GA4) | ✅ |
| 알림톡 발송 | N2 `notify` | (백그라운드) | notification | ✅ |

---

## 4. 매핑 갭 판정
- **화면·상태 매핑 갭(빠뜨림) = 0.** user-flow 전 스텝·상태(coverage.md 전수)가 엔드포인트+컴포넌트+테이블에 1:1 매핑됨.
- **✅(설계 완결) = 전 happy + 전 엣지(empty·실패·마감·삭제·404·취소·중복).**
- **정책 4건 = 🔒 회장 확정(2026-07-04)** — 이전 ⛔ 4건이 확정값으로 닫힘(빠뜨림 아니었음):
  - **✅🔒P1 최소환전액 = 30,000원** (K2/K3 검증). fdd P1.
  - **✅🔒P2 미성년 = 환전만 만19+, 결제 허용** (K4·is_adult·KycSheet). fdd P2.
  - **✅🔒P3 환불 = 문의 기반 수동**(자동환불 시스템 X, 토스 콘솔 수동). C2·receipt. fdd P3.
  - **✅🔒P4 셀프후원 = 차단 안 함(ACCEPTED-RISK)**, RiskHook no-op 자리만. risk_event 스키마만. fdd P4.
- **신규 확정 결정 반영**: 카카오 로그인(A1)·간편결제·PASS 본인인증(K4)·알림톡(N2)·신고+soft-delete(R1/R2·report·deleted_at)·GA4 — 전부 엔드포인트+컴포넌트+테이블 완결 매핑(dangling 0).
- **잔존 ⛔**:
  - 법률 밑돌(architecture §2.4+§2.6): ①클로버=선불수단? ②토스 개인정산? ③take=정산관여? ④KYC·금융 개인정보 국외이전. **build(결제·환전) 전 변호사·개인정보 자문 필수.**
  - **정산주기 D+n**(⛔ placeholder): 토스 payout 스펙 = build 확정. UX="수일 내".
- 결론: **매핑 갭 0 (user-flow 전수 + 신규 기능 완결 매핑). 정책 4건 확정. 잔존 = legal 게이트 + 정산주기(build).**

SKILLS_USED: 없음
SKILLS_SKIPPED: 매칭 스킬 없음(API 계약·ERD·매핑표 = 프로젝트 특정 설계, document-generate는 코드 역생성용 부적용)

SOURCES/MODEL: opus-4-8[1m] · 근거=user-flow §1~3 전수·coverage.md·DESIGN.md §6(금액3층) · Supabase RLS/anonymous auth(WebSearch: supabase.com/docs) · 회장 확정 결정 7건(coordinator relay)
