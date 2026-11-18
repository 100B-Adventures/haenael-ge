# 앱 채널 독립 코드리뷰 3회차 (Codex code-reviewer, 2026-11-18 20:0x KST)

> 리뷰어 세션이 읽기 전용이라 컨트롤러가 최종 보고 원문을 그대로 옮겼다. 원본: /Users/sj/.claude/harness/codex-logs/20261118-194930-3492153-code-reviewer.summary.md


한 줄 결론: 2회차 차단 9건 중 7건은 닫혔지만, 대체결제와 계정 삭제에 MAJOR 5건이 남아 배포 차단입니다.

회장 요청: `5ad2ade`의 2회차 지적 해소 여부를 재판정하고, `0345b2a`의 결제·푸시·계정 삭제 API를 금액·멱등·RLS·정산·Apple 정책 관점에서 공격적으로 검토하라고 요청했습니다.

[모델] GPT-5 Codex code-reviewer. 구현도 GPT-5 Codex 계열이므로 크로스모델 맹점 상쇄는 없습니다.  
벤치마크: Apple 계정 삭제, Google 대체결제, Supabase 사용자 삭제 공식 계약과 비교했습니다.  
소스 1: D-056·D-047, 요청 원장 9~20행, 앱 채널 PRD v0.2.0.  
소스 2: 2회차 리뷰, `5ad2ade`, `0345b2a`, 관련 코드·마이그레이션·시험.  
소스 3: [Apple 5.1.1(v)](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/), [Google 대체결제 API](https://developer.android.com/google/play/billing/alternative), [Supabase 사용자 삭제](https://supabase.com/docs/guides/auth/managing-user-data).

PR type: application

## 1회차 13건 재판정

| # | 판정 | 근거 |
|---|---|---|
| 1. 서버 상품 카탈로그 | 닫힘 | 서버·모바일·앱인토스가 `haenael.cheer.clover.*`로 통일됐습니다. |
| 2. Google 멱등키 | 닫힘 | `purchaseToken`을 공급자 거래 ID로 사용합니다. |
| 3. Google consume | 닫힘 | [purchase-catalog.ts:13](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/purchase-catalog.ts:13)에서 Apple만 클라이언트 완료 처리합니다. |
| 4. `testPurchaseContext` | 닫힘 | [verify-store-purchase/index.ts:119](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:119)에서 sandbox를 분리합니다. |
| 5. 환불 알림·재동기화 | 닫힘 | Apple JWS, Google Pub/Sub OIDC, 공급자 재조회, cursor 전량 순회가 구현됐습니다. |
| 6. 부분환불 수량 | 닫힘 | [store-refund.ts:203](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/_shared/store-refund.ts:203)과 [migration:56](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118040000_app_channel_review_round3.sql:56)이 공급자 확정 수량을 강제합니다. |
| 7. 구매 행 RLS | 닫힘 | 응원자 본인 조회로 제한됐습니다. |
| 8. 동시 intent | 닫힘 | DB advisory lock과 request key 멱등 경로가 유지됩니다. |
| 9. Consent Mode | 닫힘 | 2회차 판정을 뒤집는 회귀가 없습니다. 시각 배너 판정은 수행하지 않았습니다. |
| 10. 구매 시각 | 닫힘 | Google `purchaseCompletionTime`을 강제합니다. |
| 11. 환불 scope | 닫힘 | 누적 확정 수량·금액과 scope를 DB에서 재검증합니다. |
| 12. 고위험 시험 | 부분, 외부 설정 대기 | 공급자 형식 단위시험은 추가됐지만 실제 sandbox 왕복은 미실행입니다. 사용자 지시대로 배포 차단 사유로 세지 않았습니다. |
| 13. 13px 토큰 | 닫힘 | 의미 타이포그래피·반경 토큰을 사용합니다. |

## 2회차 지적 재판정

| 2회차 항목 | 판정 |
|---|---|
| MAJOR 1, 실제 환불 알림·전량 재동기화 | 닫힘 |
| MAJOR 2, 공급자 확정 환불 수량 | 닫힘 |
| MAJOR 3, 상품 ID 통일 | 닫힘 |
| MAJOR 4, 미완료 스토어 구매 복구 | 닫힘 |
| MAJOR 5, Google 이중 consume | 닫힘 |
| MAJOR 6, Google 대체결제·보고 | 부분, 아래 MAJOR 1~3 |
| MAJOR 7, 앱 안 계정 삭제 | 부분, 아래 MAJOR 4~5 |
| MAJOR 8, `/g/*` 웹 유지 | 닫힘 |
| MAJOR 9, D-047 모바일 환전 | 닫힘 |
| MINOR, 모바일 디자인 토큰 | 닫힘 |

## MAJOR, 차단

1. `[승인 계약 이탈·결제]` (confidence: 10/10) [apps/mobile/.env.example:7](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/.env.example:7), [purchases.ts:98](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/purchases.ts:98), [결정.md:108](/mnt/hdd/haenael-ge-v2-hotfix/wiki/거버넌스/결정.md:108)

   기본 토스 체크아웃 URL은 DNS가 없는 `haenael.app/api/mobile/toss-checkout`을 가리키며, `web/src/app`에도 해당 라우트가 없습니다. 이는 토스 SKU나 콘솔 설정 문제가 아니라 결제 준비 서버 경로 누락입니다.

   재현: Google User Choice Billing을 켜고 토스페이먼츠를 선택하면 WebBrowser가 기본 URL을 열지만 `paymentKey`·`orderId`를 받을 체크아웃이 없어 결제를 진행할 수 없습니다.

   수정 방향: 운영 주소 정본에 서버 결정 금액·상품·계정 결합 metadata를 사용하는 체크아웃 라우트를 구현하고 실제 URL을 환경 계약에 고정해야 합니다.

2. `[회귀 위험·결제 멱등]` (confidence: 10/10) [native-iap.ts:149](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/native-iap.ts:149), [purchases.ts:90](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/purchases.ts:90), [purchases.ts:110](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/purchases.ts:110)

   대체결제를 선택하면 기존 미완료 큐를 먼저 삭제한 뒤 새 intent, request key, `paymentKey`, `orderId`를 메모리에만 둡니다. 서버 적립 성공 뒤 응답이 유실되면 같은 결제를 재전송할 정보가 없습니다.

   재현: `confirm-alternative-payment`가 적립을 커밋하고 HTTP 응답을 보내기 직전에 네트워크를 끊습니다. 앱은 실패를 표시하고, 재실행해도 복구 큐가 없습니다. 사용자가 다시 누르면 새 request key와 새 결제가 생성됩니다.

   수정 방향: 대체결제도 SecureStore 미완료 큐에 intent, request key, 외부거래 토큰, payment key, order ID를 저장하고 같은 요청을 성공 응답까지 재전송해야 합니다.

3. `[DB 안전·결제 유실]` (confidence: 10/10) [confirm-alternative-payment/index.ts:319](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/confirm-alternative-payment/index.ts:319), [mobile_server_endpoints.sql:367](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118030000_mobile_server_endpoints.sql:367), [mobile_server_endpoints.sql:385](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118030000_mobile_server_endpoints.sql:385)

   토스 승인은 성공했지만 DB 적립과 전액 취소가 모두 실패하면 `payment_compensation_failed`만 반환하고 복구 원장을 쓰지 않습니다. 계정 삭제는 `store_recovery_case`만 확인하므로 이 미정산 결제를 발견하지 못하고 CREATED intent를 취소할 수 있습니다.

   재현: Toss 승인 성공, `credit_alternative_store_purchase` 실패, Toss 취소 API 실패를 순서대로 발생시킵니다. 사용자는 결제됐지만 적립되지 않고, 복구 행은 0건입니다. 잔액이 0이면 계정 삭제까지 통과할 수 있습니다.

   수정 방향: 보상 실패를 `store_recovery_case OPEN`과 결제 이벤트에 원자적으로 기록하고, 해소 전 계정 삭제를 차단해야 합니다.

4. `[승인 계약 이탈·Apple 5.1.1(v)]` (confidence: 10/10) [account.ts:29](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/account.ts:29), [account-delete/index.ts:158](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/account-delete/index.ts:158), [mobile_server_endpoints.sql:343](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118030000_mobile_server_endpoints.sql:343)

   삭제 준비 뒤 Storage 또는 Auth 삭제가 일시 실패하면 클라이언트는 원 request key를 보존하지 않습니다. 다음 시도는 새 키를 만들지만 DB는 `deleted_at` 때문에 `account_deletion_in_progress`로 영구 거절합니다.

   재현: 첫 요청에서 `prepare_account_deletion` 성공 후 Storage 삭제를 실패시킵니다. 다시 탈퇴를 누르면 새 request key가 생성되고 409가 반환됩니다. 원 키는 앱에 남지 않아 사용자가 복구할 수 없습니다.

   수정 방향: 회원별 열린 삭제 요청을 서버가 재개하도록 만들고, 클라이언트 키가 바뀌어도 기존 PREPARED 요청으로 복구해야 합니다. 최소한 원 키를 성공까지 영구 저장해야 합니다.

5. `[승인 계약 이탈·Apple 인증]` (confidence: 9/10) [auth.ts:8](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/auth.ts:8), [account-delete/index.ts:163](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/account-delete/index.ts:163)

   앱은 Sign in with Apple을 지원하지만 탈퇴 시 Supabase Auth 사용자만 삭제하고 Apple REST API 토큰 폐기를 하지 않습니다. Apple은 Sign in with Apple 계정 삭제 시 관련 토큰 폐기를 안내합니다. Supabase도 공급자 토큰을 프로젝트 DB에 보관하지 않는다고 명시하므로 `deleteUser`만으로 Apple 폐기를 대신할 근거가 없습니다.

   재현: Apple 계정으로 가입한 뒤 탈퇴합니다. 코드 경로에는 Apple identity 확인, revoke 요청, 재시도 원장이 전혀 없습니다.

   수정 방향: 로그인 때 폐기에 필요한 Apple 자격을 서버에 안전하게 보관하고, 계정 삭제 절차에서 Apple revoke 성공 또는 재시도 원장 생성을 Auth 삭제보다 먼저 수행해야 합니다.

## NEXT_RELEASE, 이번 BLOCK에 미포함

- [register-push-token/index.ts:121](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/register-push-token/index.ts:121), [store migration:139](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118010000_app_channel_store_purchase.sql:139): 토큰은 회원·기기 조합으로만 유일하고 AES-GCM은 매번 다른 암호문을 만듭니다. 로그아웃 삭제 실패 후 같은 기기에 다른 계정이 등록되면 이전 회원 행을 식별·회수할 수 없습니다. 실제 푸시 발송 worker는 아직 없어 현재 정보 노출은 발생하지 않지만, 발송을 켜기 전에 결정적 토큰 fingerprint와 소유권 이전을 구현해야 합니다.
- FR-APP-05의 실제 Expo 푸시 발송·묶음·토글 소비자는 서버 트리에 없습니다. 토큰 등록 API 완료를 푸시 기능 완료로 보아서는 안 됩니다.

## 외부 설정 대기, 배포 차단 아님

- Toss SKU·MID와 sandbox 상점 설정.
- Google 대체결제 프로그램 가입 및 Play Console opt-in.
- App Store Connect·Play Console 앱과 IAP 상품 생성.
- Apple·Google·Toss 실제 sandbox 결제·환불 왕복.

## 시험 증거

- 신규·보정 Edge 표적 Deno 시험: 30/30 성공.
- 모바일 TypeScript 검사: 성공.
- 모바일 Vitest: 읽기 전용 환경이 `/tmp/.../ssr`을 만들지 못해 시험 시작 전 실패했습니다. 코드 실패로 판정하지 않았습니다.
- pgTAP: 로컬 Supabase가 실행 중이지 않아 독립 재실행하지 못했습니다. 시험 소스와 SQL 경계는 직접 대조했습니다.
- 실제 기기·공급자 sandbox: 외부 설정 대기.
- 시안·dev 픽셀 대조: 미검토. 이번 판정은 결제·인증·DB 코드리뷰입니다.
- 파일 변경·프로세스 생성: 0건.

## 축별 판정

- 승인 시안·계약 이탈: MAJOR 4건
- 회귀 위험: MAJOR 2건
- 디자인 토큰 위반: 문제없음, 시각 표현은 미검토
- 무기록 삭제: 문제없음
- DB 안전: MAJOR 2건
- REVIEW_ROUND: 3

산출물 상태: 파일시스템이 읽기 전용이라 `docs/qa/review-app-channels-1258dfa-v0.3.0-gpt-codex-20261118.md` 작성과 커밋은 수행하지 못했습니다.

SKILLS_USED: `review`, 결제·DB·인증 경계 및 3회차 범위 제한에 사용.  
SKILLS_SKIPPED: 없음.  
KNOWLEDGE_QUERY: D-056·D-047, 요청 원장, PRD, 2회차 리뷰, Apple·Google·Supabase 공식 문서.  
HITS_USED: 위 정본과 공식 문서를 결제 복구·계정 삭제·공급자 정책 판정에 사용.  
HITS_REJECTED: builder의 수정 증거와 전체 시험 자기신고는 독립 증거가 아니므로 보조 자료로만 사용.  
CONFLICTS: 외부 콘솔 미설정은 비차단으로 분리했지만, 저장소에 없는 토스 체크아웃과 복구 불가능한 삭제·결제 상태는 코드 결함이므로 차단으로 유지.  
SOURCES/MODEL: GPT-5 Codex. 로컬 결정·요청·PRD·코드·시험, Apple Developer, Android Developers, Supabase 공식 문서.

REVIEW_VERDICT: BLOCK

