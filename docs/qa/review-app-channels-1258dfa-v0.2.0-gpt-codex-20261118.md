# 앱 채널 독립 코드리뷰 2회차 (Codex code-reviewer, 2026-11-18 18:4x KST)

> 리뷰어 세션이 읽기 전용이라 컨트롤러가 최종 보고 원문을 그대로 옮겼다. 원본: /Users/sj/.claude/harness/codex-logs/20261118-181203-2344396-code-reviewer.summary.md


한 줄 결론: 1회차 13건은 8건 닫힘, 4건 부분, 1건 미해소이며, 모바일·환불 경로에서 MAJOR 9건이 추가 확인돼 배포 차단입니다.

회장 요청: `a2d9ca9`의 1회차 지적 13건 해소 여부를 코드와 시험으로 재판정하고, `3b8abe8` 모바일 결제·복구·탈퇴·딥링크·시크릿 경계를 공격적으로 검토해 배포 가능 여부를 판정하라고 요청했습니다.

[모델] GPT-5 Codex code-reviewer. 구현도 GPT-5 Codex 계열이어서 크로스모델 맹점 상쇄는 없습니다.  
벤치마크: Apple 환불 JWS, Google RTDN·Billing Choice·서버 consume, Expo IAP 거래 완료·복구 공식 계약과 대조했습니다. 시각 디자인 QA나 픽셀 일치 판정은 수행하지 않았습니다.  
소스 1: `wiki/거버넌스/결정.md` D-056·D-054·D-047, `wiki/거버넌스/요청.md` 9~20행.  
소스 2: 앱 채널 PRD v0.2.0, FDD·API·테스트 계획 v0.1.0, 1회차 리뷰.  
소스 3: [Apple Server Notifications](https://developer.apple.com/documentation/appstoreservernotifications/receiving-app-store-server-notifications), [Google Play Billing](https://developer.android.com/google/play/billing), [Expo IAP](https://hyochan.github.io/expo-iap/api/methods/unified-apis/).

현재 파일시스템이 읽기 전용이라 리뷰 문서와 커밋은 생성하지 못했습니다. 아래가 `docs/qa/review-app-channels-1258dfa-v0.2.0-gpt-codex-20261118.md`에 들어갈 전문입니다.

## 1회차 13건 재판정

| # | 판정 | 근거 |
|---|---|---|
| 1. 서버 상품 카탈로그 | 부분 | [migration:19](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118020000_app_channel_store_purchase_review_fixes.sql:19)에 카탈로그는 생겼지만 Toss IAP 상품 ID가 기존 클라이언트와 불일치합니다. 아래 MAJOR 3. |
| 2. Google 멱등키 | 닫힘 | [verify-store-purchase:115](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:115)이 `purchaseToken`을 거래 ID로 사용합니다. 표적 Deno 시험도 성공했습니다. |
| 3. Google consume | 부분 | 서버 consume은 [verify-store-purchase:329](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:329)에 추가됐지만 모바일이 같은 구매를 다시 consume합니다. 아래 MAJOR 5. |
| 4. `testPurchaseContext` | 닫힘 | [verify-store-purchase:119](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:119)이 테스트 거래를 `SANDBOX`로 분리합니다. |
| 5. 환불 알림·재동기화 | 안 닫힘 | 실제 Apple JWS와 Google Pub/Sub 메시지를 받을 수 없는 자체 HMAC 프로토콜입니다. 재동기화도 500건·90일로 제한됩니다. 아래 MAJOR 1. |
| 6. 부분환불 전량 회수 | 부분 | 전량 회수는 막았지만 [migration:198](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118020000_app_channel_store_purchase_review_fixes.sql:198)이 공급자 확정 수량 대신 금액 비례 계산을 사용합니다. 아래 MAJOR 2. |
| 7. 구매 행 RLS | 닫힘 | [migration:33](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118020000_app_channel_store_purchase_review_fixes.sql:33)에서 응원자 본인만 조회하도록 변경됐습니다. |
| 8. 동시 intent | 닫힘 | [migration:87](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118020000_app_channel_store_purchase_review_fixes.sql:87)에 동일 회원·request key advisory lock이 추가됐습니다. 독립 경합 실행은 읽기 전용 환경 때문에 미검증입니다. |
| 9. Consent Mode | 닫힘 | [GoogleConsentDefaults:3](/mnt/hdd/haenael-ge-v2-hotfix/web/src/components/analytics/GoogleConsentDefaults.tsx:3)이 거부 기본값을 먼저 설정하고 [GoogleAnalytics:40](/mnt/hdd/haenael-ge-v2-hotfix/web/src/components/analytics/GoogleAnalytics.tsx:40)이 비동의 상태에서도 Google 태그를 적재합니다. 시각 배너 QA 판정은 범위 밖입니다. |
| 10. 구매 시각 | 닫힘 | [verify-store-purchase:111](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:111)이 `purchaseCompletionTime`을 강제합니다. |
| 11. 환불 scope | 닫힘 | [migration:208](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118020000_app_channel_store_purchase_review_fixes.sql:208)이 누적 금액에서 scope를 다시 계산하고 불일치를 거절합니다. |
| 12. 고위험 시험 부족 | 부분 | 부분환불·RLS·경합 시험은 늘었지만 실제 공급자 웹훅, 모바일 재실행 복구, 이중 consume, 대체결제 서버 왕복 시험은 없습니다. |
| 13. 13px 토큰 | 닫힘 | 신규 보류 행은 [CashoutPageView:115](/mnt/hdd/haenael-ge-v2-hotfix/web/src/components/cashout/CashoutPageView.tsx:115)에서 의미 토큰을 사용합니다. 코드 수준 판정이며 렌더·픽셀 일치 판정은 아닙니다. |

## MAJOR, 차단

1. `[승인 계약 이탈·보안]` [store-refund.ts:78](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/_shared/store-refund.ts:78), [store-refund.ts:89](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/_shared/store-refund.ts:89), [reconcile:99](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/store-purchase-reconcile/index.ts:99)

   환불 웹훅은 이미 정규화된 자체 JSON과 `x-provider-signature` HMAC을 요구합니다. Apple의 실제 입력은 `signedPayload` JWS이고 Google은 Pub/Sub RTDN입니다. 공급자가 직접 호출하면 DB 쓰기 전에 `invalid_refund_event`로 거절됩니다.

   일일 복구도 정렬·페이지네이션 없이 최근 90일, 최대 500건만 조회합니다.

   재현: 실제 Apple V2 `{"signedPayload":"..."}` 또는 Google Pub/Sub envelope를 전송하면 HTTP 400입니다. 501건을 만든 뒤 선택되지 않은 구매를 환불하면 매일 동일한 최대 500건만 검사될 수 있습니다.

   수정 방향: Apple JWS 검증과 Google Pub/Sub 인증·Developer API 재조회 어댑터를 공급자별로 구현하고, cursor 기반 전량 순회와 장기 환불 범위를 둬야 합니다.

2. `[DB 안전]` [store-refund.ts:96](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/_shared/store-refund.ts:96), [migration:198](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118020000_app_channel_store_purchase_review_fixes.sql:198)

   웹훅은 `p_refund_clover_amount=null`만 전달하고 DB가 환불 금액을 비례 계산합니다. API 계약의 “비례가 아닌 공급자 확정 수량”과 반대입니다.

   재현: 10클로버 12,000원 거래에서 공급자가 1클로버 환불을 확정하되 할인·세금 때문에 환불액이 1,199원이면 정수 나눗셈 결과가 0입니다. 구매는 `PARTIALLY_REFUNDED`지만 클로버는 회수되지 않습니다.

   수정 방향: 공급자 재조회 결과의 확정 수량을 정규화해 RPC로 넘기고 금액과 수량을 함께 검증해야 합니다.

3. `[회귀 위험]` [catalog migration:19](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118020000_app_channel_store_purchase_review_fixes.sql:19), [miniapp gateway:331](/mnt/hdd/haenael-ge-v2-hotfix/miniapp/src/gateway.ts:331)

   카탈로그는 `haenael.cheer.clover.1` 형식을 등록하지만 앱인토스는 `haenael_cheer_clover_1`을 보냅니다. 수정 커밋이 D-056의 앱인토스 결제 경로를 차단했습니다.

   재현: `TOSS_IAP` gate를 켜고 1클로버를 구매하면 `create_store_purchase_intent`가 `product_catalog_mismatch`로 종료됩니다.

   수정 방향: 실제 Toss 콘솔 SKU를 정본으로 핀하고 카탈로그, 클라이언트, 공급자 검증 fixture를 통일해야 합니다.

4. `[승인 계약 이탈]` [native-iap.ts:17](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/native-iap.ts:17), [native-iap.ts:45](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/native-iap.ts:45)

   구매 listener는 사용자가 결제 버튼을 누른 90초 동안만 존재합니다. 영수증·intent·request key를 로컬에 보존하지 않고 앱 시작 시 `getAvailablePurchases`도 호출하지 않습니다.

   재현: 스토어 승인이 끝난 직후 서버 검증 응답 전에 네트워크를 끊고 앱을 종료합니다. 재실행해도 복구가 없습니다. 다시 결제하면 새 intent가 만들어지고 먼저 재전송된 옛 거래가 새 intent에 결합돼 `transaction_binding_mismatch`가 날 수 있습니다.

   수정 방향: 로컬 미완료 큐에 원 intent와 메시지를 저장하고 앱 시작 listener 및 `getAvailablePurchases`에서 같은 영수증을 멱등 재전송해야 합니다.

5. `[회귀 위험·결제]` [verify-store-purchase:329](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:329), [native-iap.ts:77](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/native-iap.ts:77)

   검증 전 `finishTransaction`을 호출하지 않는 순서는 맞습니다. 그러나 Google은 서버가 먼저 Developer API로 consume한 뒤 모바일이 `finishTransaction({isConsumable:true})`로 같은 토큰을 다시 consume합니다.

   재현: 정상 Play 구매에서 서버 적립과 consume은 성공하지만 클라이언트의 두 번째 consume이 `ITEM_NOT_OWNED`를 반환할 수 있습니다. 화면은 실패로 보이지만 이미 결제·적립된 모순 상태가 됩니다.

   수정 방향: Google consumable의 완료 주체를 서버 하나로 통일하고 클라이언트는 중복 consume을 하지 않아야 합니다. Expo IAP의 Android `finishTransaction`은 `isConsumable=true`일 때 native consume을 수행합니다.

6. `[승인 계약 이탈·스토어 정책]` [support.tsx:31](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/app/goals/[id]/support.tsx:31), [purchases.ts:96](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/purchases.ts:96), [purchases.ts:110](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/purchases.ts:110)

   Android 대체결제는 Google Billing Choice API 없이 자체 라디오 버튼과 WebBrowser만 사용합니다. `externalTransactionToken`도 Play Billing에서 받지 않고 리디렉션 쿼리에서 가져옵니다.

   호출하는 `confirm-alternative-payment` 함수와 24시간 Google 보고 worker도 현재 서버 트리에 없습니다.

   재현: 토스페이먼츠를 선택해 결제 반환 파라미터까지 받으면 존재하지 않는 Edge Function 호출에서 실패합니다. fresh deploy에서는 HTTP 404이고 `google_external_transaction` 행도 생기지 않습니다.

   수정 방향: Play Billing Choice API에서 발급한 외부 거래 토큰과 필수 안내·보호자 확인 화면을 사용하고 서버 승인·보고 worker를 구현해야 합니다.

7. `[승인 계약 이탈]` [account.ts:24](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/account.ts:24), [구현현황:10](/mnt/hdd/haenael-ge-v2-hotfix/docs/구현현황.md:10)

   모바일은 `account-delete`를 호출하지만 해당 Edge Function이 없습니다. FR-APP-09의 “앱 안에서 접수 완료, 로그아웃, 푸시 토큰 삭제”가 동작하지 않습니다.

   재현: 잔액·환전이 없는 회원이 탈퇴 확인을 누르면 함수 호출 오류가 나고 로그인과 계정이 유지됩니다.

   수정 방향: 법정 보관 결제 원장 분리, 목표 비공개화, 푸시 토큰 삭제, Auth 삭제를 하나의 서버 절차로 구현하고 멱등키를 적용해야 합니다.

8. `[승인 계약 이탈]` [app.config.ts:28](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/app.config.ts:28), [deep-links.ts:6](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/deep-links.ts:6), [contracts.test.ts:9](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/__tests__/contracts.test.ts:9)

   `/g/*`가 Android 앱 링크로 등록되고 파서와 시험도 이를 앱 목표 화면으로 해석합니다. PRD FR-APP-06과 TC-APP-06-2는 웹 결제 가격을 보존하기 위해 브라우저에 남기라고 명시합니다. 시험이 계약 위반을 성공 조건으로 고정했습니다.

   재현: 앱이 설치된 Android에서 `https://haenael.app/g/run-fast`를 누르면 브라우저 웹 대신 앱이 열립니다.

   수정 방향: `/g`를 앱 intent filter와 앱 라우팅에서 제외하고 `/invite/*`만 앱 링크로 유지해야 합니다.

9. `[승인 계약 이탈·D-047]` [cashout.tsx:6](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/app/cashout.tsx:6)

   모바일 환전 화면은 잔액 `19개`, 보류 `6개`를 하드코딩하고 환전·기프티콘 버튼을 항상 비활성화합니다. D-056의 모든 채널 현금·기프티콘 이득과 D-047 서버 기본거부 계약을 소비하는 실제 경로가 없습니다.

   재현: 어떤 회원으로 열어도 동일한 가짜 잔액이 보이고 환전 신청이 불가능합니다.

   수정 방향: 서버 `clover_eligibility` 조회와 fail-closed `mobile-cashout` 쓰기 경로를 연결하고, 기프티콘은 공급자 gate 상태를 표시해야 합니다.

## MINOR

- `[디자인 토큰 위반]` [support.tsx:50](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/app/goals/[id]/support.tsx:50): 결제 화면이 반경 14·16, 글자 14·16, 행간 21을 직접 박았습니다. [tokens.ts:1](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/tokens.ts:1)에는 색상과 간격만 있어 결제 UI의 타이포·반경을 중앙에서 변경할 수 없습니다. 이는 코드 토큰 판정이며 시각 디자인 QA 판정은 아닙니다.

## 확인된 정상 경계

- StoreKit은 서버 검증 성공 전 `finishTransaction`을 호출하지 않습니다.
- 모바일 소스 정적 검색에서 서비스 역할 키, Toss secret, Apple·Google private key의 번들 노출은 발견되지 않았습니다.
- [config.ts:3](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/config.ts:3)의 Supabase anon key와 공개 URL만 사용합니다.
- 모바일 production artifact 자체는 의존성 부재로 새로 export하지 못해 번들 수준은 미검증입니다.

## 시험 증거

- Edge 표적 시험: 11/11 성공.
- 이 시험은 자체 HMAC 정규화 payload와 mock 재동기화만 검증합니다. 실제 Apple JWS·Google Pub/Sub 호환 증거가 아닙니다.
- 모바일 Vitest: `apps/mobile/node_modules`가 없어 실행 불가.
- DB 경합 시험: 읽기 전용 환경에서 임시 디렉터리를 만들 수 없어 독립 재실행하지 못함.
- 시안·dev 픽셀 대조: 미검토. 이번 판정은 결제·DB·기능 계약 코드리뷰입니다.
- 파일 변경 0건, 남은 테스트 프로세스 0건.

## 축별 판정

- 승인 시안·계약 이탈: MAJOR 6건
- 회귀 위험: MAJOR 2건
- 디자인 토큰 위반: MINOR 1건, 코드 수준만 판정
- 무기록 삭제: 문제없음
- DB 안전: MAJOR 3건
- REVIEW_ROUND: 2

다음 실행: code-builder가 MAJOR 1~9를 수정한 뒤 3회차 리뷰는 이번 MAJOR 해소와 수정이 만든 신규 결제·개인정보·데이터 회귀만 판정합니다. QA 승인과 배포는 그 전까지 진행하면 안 됩니다.

SKILLS_USED: `review`, 결제·DB·인증·모바일 교차검토에 사용.  
SKILLS_SKIPPED: 없음.  
KNOWLEDGE_QUERY: D-056·D-054·D-047, 요청 원장, PRD·FDD·API·시험 계약, Expo IAP·Apple·Google 공식 결제 문서.  
HITS_USED: 위 정본과 공급자 공식 문서를 구현 계약 및 실제 프로토콜 대조에 사용.  
HITS_REJECTED: builder의 “13건 수정 완료” 자기신고는 독립 증거가 아니므로 채택하지 않음.  
CONFLICTS: 자체 HMAC 환불 형식과 공급자 실제 JWS·Pub/Sub 형식, 자체 Android 결제수단 UI와 Google Billing Choice API 요구가 충돌함.  
SOURCES/MODEL: GPT-5 Codex. 로컬 결정·요청·PRD·FDD·API·코드·시험, Apple Developer, Android Developers, Expo IAP 공식 문서.

REVIEW_VERDICT: BLOCK

## 3회차 재리뷰용 수정 증거

아래 표는 독립 리뷰 판정을 바꾸지 않는다. 커밋 `5ad2ade`의 보정과 실패→통과 시험을 3회차 독립 재리뷰 입력으로 연결한다. 계정 삭제 서버 절차는 선행 커밋 `0345b2a`에 있다.

| 리뷰 항목 | 수정 커밋 | 실패 시험 또는 관찰 | 통과 시험 |
|---|---|---|---|
| 1회차 #1 서버 상품 카탈로그, 부분 | `5ad2ade` | 구 앱인토스 상품 ID가 서버 카탈로그와 불일치 | `AP-RV-01`, `AP-RV-02`, `AP-RV-03`, 상품 ID 정적 검색에서 밑줄 형식 0건 |
| 1회차 #3 Google consume, 부분 | `5ad2ade` | 서버 소비 뒤 Android 클라이언트가 다시 소비 | `TC-APP-02-5`, `TC-APP-02-9`, `TC-APP-02-4` |
| 1회차 #5 환불 알림·재동기화, 미해소 | `5ad2ade` | 실제 공급자 어댑터와 cursor 함수 부재로 Edge Function 시험 실패 | `TC-APP-03-1`부터 `TC-APP-03-5` |
| 1회차 #6 부분환불 수량, 부분 | `5ad2ade` | 구 RPC가 공급자 확정 수량 없이 금액 비례 계산 | `RF-RV-01`부터 `RF-RV-11` |
| 1회차 #12 고위험 시험, 부분 | `5ad2ade` | 실제 공급자 알림·재실행 복구·이중 소비·대체결제 보고 시험 부재 | Edge Function 144/144, DB 531/531, 모바일 18/18 |
| MAJOR 1 공급자 알림·전량 재동기화 | `5ad2ade` | `/tmp/haenael-app-r3-edge-red.log`에서 Apple 환불 의존성과 cursor 계약 부재 | `TC-APP-03-1`, `TC-APP-03-2`, `TC-APP-03-3`, `TC-APP-03-5` |
| MAJOR 2 공급자 확정 환불 수량 | `5ad2ade` | DB 시험에서 수량 없는 구 RPC와 만기 행 제약 실패 | `RF-RV-01`, `RF-RV-04`, `RF-RV-05`, `TC-APP-03-8` |
| MAJOR 3 상품 ID 통일 | `5ad2ade` | 앱인토스 밑줄 상품 ID와 서버 점 형식 불일치 | `AP-RV-02`, `AP-RV-03`, 앱인토스 11/11 |
| MAJOR 4 미완료 구매 복구 | `5ad2ade` | 앱 시작 복구 함수와 영수증 큐 부재 | `TC-APP-02-9 Android 재실행은 원 intent로 멱등 재전송하고 클라이언트 consume을 하지 않는다` |
| MAJOR 5 Google 중복 소비 | `5ad2ade` | Android `finishTransaction({isConsumable:true})`가 서버 소비와 중복 | `TC-APP-02-5 Google consume은 서버만 수행하고 클라이언트는 Apple 거래만 finish한다` |
| MAJOR 6 Google User Choice Billing·보고 | `5ad2ade` | Play Billing 외부 거래 토큰과 보고 함수 부재 | `TC-APP-03-1`, `APP-SRV-DB-07`부터 `APP-SRV-DB-10-3`, `TC-APP-02-10`부터 `TC-APP-02-12` |
| MAJOR 7 앱 안 계정 삭제 | `0345b2a` | `account-delete` Edge Function 부재 | `TC-APP-09-3`부터 `TC-APP-09-6`, `APP-SRV-DB-11`부터 `APP-SRV-DB-17` |
| MAJOR 8 `/g/*` 웹 유지 | `5ad2ade` | Android intent filter와 앱 라우터가 `/g/*`를 가로챔 | `TC-APP-06-2 /g 공개 목표는 앱으로 라우팅하지 않고 웹 결제를 보존한다` |
| MAJOR 9 D-047 모바일 환전 | `5ad2ade` | `mobile-cashout` 함수 부재와 가짜 잔액 화면 | `TC-APP-03-6`, `TC-APP-03-7`, `TC-APP-03-9`, 헤드리스 `/cashout` HTTP 200·콘솔 오류 0 |
| MINOR 디자인 토큰 | `5ad2ade` | 결제 화면의 직접 지정 반경·타이포그래피 | 모바일 단위 시험 18/18, 9개 너비에서 13px 미만 글자 0·44px 미만 조작 0·가로 넘침 0 |

재리뷰 경계: 실제 Apple·Google·Toss sandbox 알림과 결제, 외부 콘솔 등록, staging·운영 데이터베이스 적용은 실행하지 않았다. 로컬 계약 통과를 공급자 왕복 완료나 배포 승인으로 해석하면 안 된다.

