# 해낼게 결제·환전 전체 플로우 QA 보고서

> 기준일: 2026-07-27 KST  
> 대상: 친구(응원자) 결제 → 본인(목표 선언자) 클로버 적립 → 환전 신청 → 실지급  
> 증거등급: **[관찰됨]** 직접 실행·curl / **[테스트됨]** 자동테스트 PASS / **[근거확인]** 코드·문서 대조 / **[미검증]** 실경로 미확인 / **[불가]** 현재 기능·환경상 실행 불가

## 한 줄 결론

**실결제 오픈 판정은 NO-GO다.** 웹 빌드, 192개 웹 테스트, 결제 주문·승인 Edge Function 타입 체크, Deno 테스트 31개, 운영 health 200은 통과했지만, **토스 테스트 상점 시크릿을 사용한 실제 승인 왕복이 없고, 환전·본인확인·원장 HOLD·지급대행은 501 스텁으로 존재하지 않으며, 전자금융거래법 법률의견서도 미확보**다. 지금 결제 CTA를 열고 DM으로 유저를 받으면 친구에게 돈을 받는 입구만 열고 주인공에게 돈을 내보내는 출구는 제공하지 못하는 반쪽 루프가 된다.

## 1. 기반과 QA 기준

- **[근거확인] 제품 기준**: `docs/plan/one-thing.md` — “친구가 선언한 목표에, 달성을 걸고 조용히 돈으로 응원한다.”
- **[근거확인] 페르소나 기준**: `docs/plan/persona.md` — 윤도경에게 “환전 가능”은 부가 기능이 아니라 동기의 일부다.
- **[근거확인] 테스트 기준**: `docs/qa/test-plan.md` — 결제·환전 E2E는 실제 토스 stage/test 키와 stage DB를 사용해야 하며 mock PASS는 완료 근거가 아니다.
- **[근거확인] 기존 증거**: `docs/qa/qa-tracker.md`, `pipeline-state.md`, `.handoff-state.md`.
- **[근거확인] 법률 기준**: `docs/plan/risks.md#1` — 클로버 적립·환전 구조는 전자금융거래법 및 선불충전금 별도관리 가능성을 법률의견서로 확정해야 한다.

### 업계 벤치마크에서 적용한 검증 원칙

- 토스페이먼츠 공식 문서는 테스트 상점의 **테스트 API 키**로 연동하고, `paymentKey` 결제는 인증 유효시간 안에 서버 승인 API로 승인하도록 설명한다. 이 보고서는 클라이언트 결제창 표시와 서버 승인 왕복을 분리해 판정했다.  
  https://docs.tosspayments.com/guides/v2/get-started/payment-products  
  https://docs.tosspayments.com/reference
- Stripe 공식 테스트 원칙도 sandbox에서 거래·웹훅·실패 이벤트를 함께 검증하도록 한다. 이를 차용해 HTTP 200 하나나 mock webhook PASS를 결제 완료 근거로 쓰지 않았다.  
  https://docs.stripe.com/testing/overview
- **차별화**: 일반 단방향 결제 QA가 아니라, 해낼게의 양면시장 특성상 **응원 승인 + 수취인 환전·실지급**까지 닫혀야 전체 플로우 GREEN으로 판정했다.

## 2. fresh 실행 결과 요약

| 검증 | 결과 | 증거등급 | fresh 증거 |
|---|---:|---|---|
| 코드 변경·현재 상태 파악 | PASS | [근거확인] | 결제·환전 관련 diff, 구현 파일, migration, 테스트, handoff 대조 |
| Backend build/test | 별도 패키지 없음 | [근거확인] | Spring/Node backend가 없는 Supabase Edge Functions 구조. 아래 Deno check/test와 pgTAP으로 분리 판정 |
| Web production build | PASS | [테스트됨] | Next.js 16.2.10 compile·TypeScript·17 static pages 생성 및 route manifest 성공 |
| Web 전체 Vitest 1차 | FAIL | [테스트됨] | 191 PASS / 1 FAIL — `/cashout` 테스트가 5초 timeout |
| 실패 격리 재현 | PASS | [테스트됨] | 동일 `/cashout` 테스트 격리 1/1 PASS(2.0초) |
| Web 전체 Vitest 2차 | PASS | [테스트됨] | 29 files / **192 tests PASS**, 0 FAIL |
| Deno 타입 체크 — `cheer-order` | PASS | [테스트됨] | `deno check` PASS |
| Deno 타입 체크 — `toss-confirm` | PASS | [테스트됨] | `deno check` PASS |
| Deno 타입 체크 — `cashout`, `cashout-payout`, `withholding` | PASS | [테스트됨] | 3개 모두 `deno check` PASS |
| Deno 타입 체크 — `toss-webhook` | **FAIL** | [테스트됨] | 실제 Supabase client의 `rpc()` 반환형이 `TossWebhookSupabaseClient` 계약과 불일치(TS2322) |
| Deno 타입 체크 — `auth-kakao` | **FAIL** | [테스트됨] | `generateLink.options.shouldCreateUser`가 현 Supabase 타입에 없음(TS2353) |
| Deno 단위 테스트 | PASS | [테스트됨] | auth-kakao 10 + report 13 + notify 8 = **31 PASS / 0 FAIL** |
| pgTAP | **불가** | [불가] | Docker Desktop 기동을 시도했으나 sandbox가 Docker socket·127.0.0.1:54321/54322 접근을 거부. `supabase test db`는 DB 연결 실패 |
| Seed | **불가** | [불가] | 같은 이유로 local DB에 migration/seed 적용 불가 |
| 로컬 API curl | **불가** | [불가] | sandbox가 로컬 포트 listen과 54321 접근을 거부. `next start`도 `listen EPERM` |
| 운영 `/api/health` curl | PASS | [관찰됨] | 2회 HTTP **200**, `status=ok`, `version=1.0.0`, `database=ok`(responseTime 700ms / 387ms) |
| Playwright | **불가** | [불가] | Chromium이 macOS MachPort 등록 권한 거부로 6회 연속 launch 실패. 앱 assertion 진입 전 환경 실패 |
| Maestro | **불가** | [불가] | 모바일/ios/android 디렉터리와 Maestro flow가 없음. CLI만 존재 |
| Mobile typecheck | 해당 대상 없음 | [불가] | 이 저장소는 Next.js web + Supabase Edge Functions 구조이며 mobile 프로젝트가 없음 |

### 반복 실패 근본 원인

- **Playwright 6회 실패**: 앱 실패가 아니라 Chromium headless가 `MachPortRendezvousServer ... Permission denied (1100)`로 실행 직후 종료됐다. 로컬 Next 서버도 `listen EPERM`으로 기동할 수 없었다. 따라서 이 실행에서 브라우저 기능을 PASS/FAIL로 판정하지 않고 **[불가]**로 분리한다.
- **Vitest 1차 timeout**: `/cashout` 단일 테스트가 전체 병렬 부하에서 8.2초 걸려 기본 5초를 초과했다. 격리 실행은 2.0초, 전체 재실행은 3.85초로 PASS했다. 앱 기능 재현 실패는 아니지만 테스트 시간 예산이 환경 부하에 민감한 상태이므로 완전한 무결점으로 숨기지 않는다.

## 3. 친구 응원 결제 플로우

### 3.1 `/g/[slug]` → `CheerPaymentButton`

- **[근거확인]** `/g/[slug]/page.tsx`가 목표 ID·제목·slug를 `CheerPaymentButton`에 전달한다.
- **[근거확인]** 클라이언트 kill switch는 `NEXT_PUBLIC_PAYMENTS_ENABLED === "true"`일 때만 CTA를 활성화한다.
- **[테스트됨]** 현재 단위테스트는 Toss v2 필수 `method: "CARD"`와 주문 금액 전달을 확인한다(1/1 PASS).
- **[미검증]** 운영 배포의 `NEXT_PUBLIC_PAYMENTS_ENABLED` 변수는 존재하지만 CLI가 값을 `[SENSITIVE]`로 마스킹해 현재 true/false 값을 fresh 확인하지 못했다.
- **⬜ 유지**: 화면→주문 생성→Toss 결제창 요청 import chain은 코드상 이어져 있다.
- **❌ NG**: 현재 실행에서 운영 CTA 활성 상태와 실제 Toss 결제창 표출을 브라우저로 관찰하지 못했다.

### 3.2 `cheer-order` → `create_cheer_order`

- **[근거확인]** 서버 kill switch `PAYMENTS_ENABLED !== "true"`면 EF가 503 `payments_disabled`로 조기 종료한다.
- **[테스트됨]** `cheer-order/index.ts` Deno 타입 체크 PASS.
- **[근거확인]** 입력 검증은 1,000원 배수·1,000~100,000,000원, requestKey, 이름·메시지 길이를 검사한다. RPC 결과로 payment READY + cheer PENDING 주문을 반환한다.
- **[미검증]** 운영 Supabase의 `PAYMENTS_ENABLED` 실제 값과 배포된 EF 버전은 access token 부재로 fresh 조회하지 못했다.
- **[불가]** local Supabase가 접근 불가해 주문 HTTP 코드, DB `payment/cheer` 생성, 멱등 replay를 fresh curl로 재현하지 못했다.

### 3.3 Toss 결제창 → `/payment/success` → `toss-confirm`

- **[근거확인]** `CheerPaymentButton`은 `payment.requestPayment()`에 `paymentKey`가 아니라 주문정보와 `successUrl`·`failUrl`을 전달하고, 성공 리다이렉트가 `paymentKey/orderId/amount`를 `/payment/success`로 돌려준다.
- **[근거확인]** `/payment/success`는 세 값의 존재·정수 여부를 검사한 뒤 `toss-confirm` EF를 호출한다.
- **[테스트됨]** `toss-confirm/index.ts` Deno 타입 체크 PASS.
- **[근거확인]** `toss-confirm`은 주문 DB 금액을 먼저 대조하고, Toss 승인 응답이 `DONE`이며 금액·ID가 일치할 때만 `confirm_cheer_payment` RPC로 넘긴다. DB 반영 실패 시 Toss 자동취소와 보상감사 기록을 시도한다.
- **[불가]** `TOSS_SECRET_KEY`를 사용한 테스트 상점 서버 승인 왕복이 없다. 실제 카드/간편결제, Toss `DONE`, 영수증, 취소 보상은 검증되지 않았다.
- **❌ NG — 401 원문 노출 가능성**: `cheer-order`와 `toss-confirm`은 인증 헤더가 없으면 `"Authorization required"`를 반환하고, `/payment/success`는 EF의 `error.message`를 그대로 사용자 화면에 표시한다. 또한 `/payment/fail`은 query의 `message`를 그대로 렌더한다. 실제 운영 401을 fresh 재현하지는 못했지만 코드 경로상 “인증 필요” 내부 문구 노출 금지 규칙을 만족하지 못한다. 오픈 전 사용자용 고정 메시지로 매핑하는 회귀 테스트가 필요하다.

### 3.4 `confirm_cheer_payment`: payment DONE·cheer CONFIRMED·ledger EARN·notification

- **[근거확인]** 최신 migration 정의는 payment·cheer·clover ledger·balance·INAPP notification을 한 DB 트랜잭션에서 처리하도록 연결한다.
- **[근거확인]** pgTAP 파일에는 결제/보안/웰컴/취소 회귀 **145 assertions**가 선언돼 있다(전체 6파일은 157 assertions).
- **[불가]** 이번 환경에서는 Postgres에 접속할 수 없어 145개를 실제 실행하지 못했다. 과거 `qa-tracker` PASS 수치는 참고 이력일 뿐 fresh PASS로 승격하지 않았다.
- **⬜ 유지**: 코드·migration 구조는 존재한다.
- **❌ NG**: 실 Toss 승인과 같은 거래에서 DB 4종 전이가 실제로 관찰되지 않았다.

### 3.5 `/payment/fail`

- **[근거확인]** 실패 화면과 복귀 링크는 구현돼 있다.
- **[미검증]** Toss 카드 거절/사용자 취소가 실제로 이 화면에 도달하고 payment가 FAILED/EXPIRED로 정리되는 E2E는 없다.
- **❌ NG**: query `message`를 신뢰해 그대로 출력하므로 외부/내부 오류 원문 노출을 막는 화이트리스트가 없다.

## 4. 본인 환전 플로우

### 4.1 `/cashout` → `clover_eligibility`

- **[근거확인]** 비로그인 사용자는 `/`로 리다이렉트하고, 로그인 본인은 `clover_eligibility(auth.uid())` 결과로 총잔액·웰컴·지급대상·30클로버 도달 여부를 본다.
- **[테스트됨]** 미달 상태에서 분해표와 예상 실수령액을 보여주되 신청 버튼을 막는 웹 테스트 1/1 PASS(전체 재실행 포함).
- **[근거확인]** RPC는 본인 `auth.uid()` 일치만 허용하고 `min_cashout_clover()`를 사용한다. 웰컴은 도달판정에는 포함하지만 실제 지급액에서는 뺀다.
- **[불가]** RPC를 실제 DB에서 호출하지 못해 29/30클로버 경계와 본인/타인 권한을 fresh 재현하지 못했다.

### 4.2 30클로버·3.3% 계산

- **[테스트됨]** `_shared/withholding.ts` 직접 실행 결과:
  - `MIN_CASHOUT_KRW = 30,000`
  - `WITHHOLDING_RATE = 0.033`
  - 29,999원 → “최소 환전 금액은 30,000원 이상”
  - 30,000원 → 수수료 1,500원(현재 placeholder 5%), 원천징수 940원, 실수령 27,560원
- **[근거확인]** 웹 미리보기는 정책 미확정 플랫폼 수수료를 제외하고 총액의 3.3%만 계산한다. 따라서 30,000원 표시는 원천징수 990원·예상 실수령 29,010원이다.
- **❌ NG — 계약 불일치**: 공유 계산기는 “수수료 차감 후 금액”에 3.3%를 적용하지만 웹 미리보기는 “총액”에 적용한다. 플랫폼 수수료 정책이 확정되지 않아 두 계산이 다르며, 실지급 전에 법무·세무·BM 계약을 하나로 고정해야 한다.
- **❌ NG — 임계 경계 미정**: `clover_eligibility`는 웰컴 포함 총량으로 30클로버 도달을 판단하지만 지급대상은 웰컴 제외다. 예를 들어 총 30(웰컴 3 + 친구 27)이면 화면상 도달할 수 있으나 공유 계산기는 지급총액 27,000원을 최소액 미달로 거부한다. 이 경계의 기대 계약과 테스트가 없다.

### 4.3 `cashout` Edge Function

- **[근거확인]** `CASHOUT_ENABLED !== "true"`면 503 `cashout_disabled`.
- **[근거확인]** 플래그를 켜도 다음 로직은 TODO뿐이고 항상 **HTTP 501 Not implemented**:
  1. 최소금액 검사
  2. PASS KYC·만19세 확인
  3. RiskHook
  4. `clover_ledger` HOLD
  5. `cashout-payout` 호출
- **[테스트됨]** 파일 자체 Deno 타입 체크는 PASS지만 이는 동작 증거가 아니다.
- **[불가]** 기능이 없으므로 환전 신청 성공, 동시신청 방지, HOLD, 실패 복원은 검증할 수 없다.

### 4.4 `cashout-payout` Edge Function

- **[근거확인]** 지급대행 호출·SETTLED·지급명세·정산주기는 TODO이며 모든 요청이 **HTTP 501**이다.
- **[근거확인]** `kyc-verify`도 HTTP 501 스텁이다.
- **[불가]** PASS 본인확인, 계좌 확인, 원천징수 기록, 지급대행 실송금, SETTLED, 실패 시 REVERSAL은 전부 존재하지 않는 기능이라 E2E 검증 불가다.

## 5. 로그인·목표작성·워드맵·웰컴클로버 현 배포상태

| 영역 | 판정 | 증거 |
|---|---|---|
| 운영 health·DB 연결 | 🟢 | **[관찰됨]** 2026-07-27 `/api/health` HTTP 200 2회, DB `ok` |
| 카카오 로그인 | ⬜ 유지 | **[근거확인]** `pipeline-state.md` 2026-07-17 운영 실왕복 성공 이력. **[테스트됨]** 현재 Deno unit 10/10. **[미검증]** 이번 실행의 신규 실로그인 왕복 없음. 현재 `auth-kakao/index.ts` Deno check 오류 1건이 있어 배포 재현성은 NG |
| 목표작성 | ⬜ 유지 | **[근거확인]** 과거 prod 관찰 이력. **[테스트됨]** 현재 onboarding·목표수정 web tests PASS. **[미검증]** 이번 실행에서 로그인 후 prod DB 저장 미관찰 |
| 워드맵·공유 | ⬜ 유지 | **[근거확인]** 과거 prod 관찰 이력. **[테스트됨]** 현재 관련 unit PASS. **[미검증]** 이번 Playwright 실행 불가 |
| 웰컴클로버 | ⬜ 유지 | **[근거확인]** 2026-07-18 prod 트리거·잔액·워드맵 관찰 이력. **[미검증]** 이번 pgTAP/신규 계정 실발동 없음 |
| 운영 DB migration 정합 | ❌ | **[근거확인]** `.handoff-state.md`에 remote migration history가 20260719까지만이고 20260720~21 9개가 미기록이라는 drift 경고가 있다. 결제 오픈 전에 linked migration 정합을 fresh 검증해야 한다 |

## 6. 🔧 전환 가능 TC

**이번 보고서에서 🔧 전환 가능한 TC는 0건이다.** 코드 수정이나 운영 반영을 수행하지 않았고, 결제·환전 실제 경로를 관찰하지 못했기 때문이다.

- 웹 build·Vitest·Deno test PASS는 회귀 신호일 뿐 결제 완료 증거가 아니다.
- 운영 health HTTP 200은 인프라 생존 증거일 뿐 Toss·환전 완료 증거가 아니다.
- 과거 pgTAP·Playwright PASS는 이력으로 유지하되 fresh 증거로 승격하지 않았다.

## 7. 실결제 오픈 가능 여부

### 판정: **NO-GO**

#### GREEN

- **[테스트됨]** Next.js production build·TypeScript PASS.
- **[테스트됨]** Web 전체 192/192 PASS(2차 fresh 실행).
- **[테스트됨]** `cheer-order`, `toss-confirm`, 환전 스텁·원천징수 유틸 Deno check PASS.
- **[테스트됨]** Deno unit 31/31 PASS.
- **[관찰됨]** 운영 `/api/health` 200, DB `ok`.
- **[근거확인]** 결제 주문→승인→원장·알림 트랜잭션 코드와 kill switch 구조 존재.

#### 오픈 블로커

1. **Toss 테스트 상점 시크릿 키 + 서버 플래그**
   - **[불가]** `TOSS_SECRET_KEY`로 실제 Toss 승인 API를 왕복한 증거가 없다.
   - **[미검증]** Supabase 운영 `PAYMENTS_ENABLED=true`와 Vercel `NEXT_PUBLIC_PAYMENTS_ENABLED=true`의 동시 활성 상태를 확인하지 못했다.
   - 종료증거: 테스트 상점 키로 결제창→승인 `DONE`→DB payment DONE·cheer CONFIRMED·ledger EARN·notification 1건을 동일 orderId로 관찰하고, 실패·취소·중복도 재현.

2. **환전 백엔드 미구현**
   - **[불가]** `cashout`, `cashout-payout`, `kyc-verify`가 501 스텁이다.
   - 종료증거: KYC PASS→HOLD→지급대행→SETTLED·지급명세와 실패→REVERSAL을 stage에서 실제 계좌/테스트 지급으로 관찰.

3. **법률의견서**
   - **[근거확인]** `docs/plan/risks.md#1`의 전자금융거래법·선불충전금·개인 정산 구조가 미확정이다.
   - 종료증거: 변호사 서면 의견으로 자금 보유주체, 환전 가능 구조, 별도관리, 미성년, 원천징수·지급명세 책임을 확정하고 설계·약관·개인정보 문서에 반영.

4. **fresh DB·브라우저 E2E**
   - **[불가]** 이번 환경에서 pgTAP, seed, 주요 API curl, Playwright를 실행하지 못했다.
   - 종료증거: linked migration drift 0 + pgTAP 157/157 + seed + 주요 EF curl + Playwright full flow 0 FAIL.

5. **정적·오류표시 결함**
   - **[테스트됨]** `toss-webhook`과 `auth-kakao` Deno check 오류 2건.
   - **[근거확인]** 401/외부 query 오류 원문이 결제 화면에 노출될 수 있음.
   - 종료증거: 타입 체크 0 error + 사용자용 고정 오류문구 E2E + `"Authorization required"` DOM 0건.

6. **정책 계약**
   - **[근거확인]** 3.3% 과세 기준, 플랫폼 수수료, 웰컴 포함 도달/웰컴 제외 최소 지급 경계가 서로 일치하지 않는다.
   - 종료증거: 법무·세무·BM 승인된 단일 계산식과 29/30클로버·웰컴혼합 경계 테스트.

## 8. 지금 DM으로 실유저 유입 시 리스크

가장 큰 리스크는 “결제 장애”가 아니라 **약속 불이행**이다. 친구가 실제 돈으로 응원하면 주인공 화면에는 클로버가 쌓일 수 있지만, 주인공은 PASS도, 환전 신청도, 지급도 할 수 없다. 윤도경 페르소나에게 “해내면 내 손에 들어온다”가 핵심 동기인데 이 약속이 깨지므로, 현재 상태에서 결제 CTA를 열고 DM을 보내면 제품의 One Thing을 절반만 제공한다.

추가 리스크:

- 결제 성공 후 DB 전이가 실패하면 실돈 CS·취소 보상 운영이 필요하지만 실 Toss 왕복 훈련이 없다.
- 환전이 막힌 상태에서 잔액만 쌓이면 법률·회계·고객문의 부채가 동시에 증가한다.
- 운영 DB migration drift가 남아 있어 로컬 코드와 실제 RPC 계약이 다를 수 있다.
- 오류 원문 노출은 신뢰를 해치고 내부 구현 정보를 사용자에게 보여줄 수 있다.

**추천**: DM은 무료 목표작성·공유 베타에 한정하고 결제 CTA는 계속 닫는다. 실결제 모집은 법률의견서, 환전 stage E2E, Toss test 결제 E2E가 모두 GREEN인 뒤 시작한다.

## 9. 페르소나 결정 1문항 답

> 공스타그램에 “이번 학기 평점 4.0 해낼게”를 올린 윤도경이 친구의 클로버 알림을 받았을 때 “이거다, 딱 내가 원하던 응원이다”라고 느끼는가?

**현재는 NO.** 조용한 응원 UI와 실제 돈이라는 감각까지는 코드·과거 이력으로 일부 성립하지만, 세 번째 조건인 “해내면 내 손에 들어온다”가 환전 501 스텁 때문에 성립하지 않는다. 친구에게는 결제, 본인에게는 인출 불가인 비대칭 상태다.

## 10. 레드팀·셀프심문

### 레드팀

회의적인 실사용자 입장에서는 “내 친구는 카드로 돈을 냈는데 왜 나는 출금할 수 없나?”가 첫 질문이다. health 200, build PASS, 원장 migration 존재는 이 질문에 답하지 못한다. 따라서 결제만 먼저 열어 반응을 보는 주장은 실험이 아니라 수취인에게 정산 리스크를 전가하는 운영이다.

### 셀프심문

**이 결론이 틀렸다면 가장 그럴듯한 이유는?** 운영 Supabase에 이미 Toss test secret과 최신 cashout 구현이 별도 배포돼 로컬 코드보다 앞서 있을 가능성이다. 그러나 linked repo의 `cashout`·`cashout-payout`·`kyc-verify`는 명시적 501이고, 운영 secrets/functions 조회는 access token 부재로 검증하지 못했다. 직접 관찰 증거 없이 “운영에는 있을 것”을 가정할 수 없으므로 NO-GO를 유지한다.

---

SKILLS_USED: 없음  
SKILLS_SKIPPED: 매칭 QA 스킬 없음 — `/Users/sj/.claude/standards/dev.md` 증거 규율과 프로젝트 `docs/qa/test-plan.md`를 직접 적용  
SOURCES: `CLAUDE.md` QA/완료 규율 · `docs/qa/qa-tracker.md` · `docs/qa/test-plan.md` · `docs/plan/one-thing.md` · `docs/plan/persona.md` · `docs/plan/risks.md` · `pipeline-state.md` · `.handoff-state.md` · 결제/환전 web·Edge Function·migration·test 소스 · 토스페이먼츠 공식 문서 · Stripe 공식 테스트 문서  
MODEL: gpt-codex/GPT-5  
🏷 STAMP | line: haenael-ge-payment-cashout-qa | 생성: 2026-07-27 23:15 KST | model: gpt-codex/GPT-5 | agent: qa-verifier  
skills: 없음(매칭 QA 스킬 없음) | 근거: dev.md · benchmarks.md · Toss/Stripe 공식문서 · repo fresh 실행  
고민: build·unit·health를 전체 결제 완료로 과대평가하지 않고, 양면 루프의 마지막 돈 이동인 환전 실지급을 최종 판정축으로 채택
