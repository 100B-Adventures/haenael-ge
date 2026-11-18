# 앱 채널 1258dfa 독립 코드리뷰 (Codex code-reviewer, 2026-11-18 16:4x KST)

> 리뷰어 세션이 읽기 전용이라 파일을 쓰지 못해, 컨트롤러가 리뷰어 최종 보고 원문을 그대로 옮겼다. 원본: ~/.claude/harness/codex-logs/20261118-164005-1103772-code-reviewer.summary.md


`1258dfa`는 머지 차단입니다. MAJOR 9건, MINOR 4건을 확인했습니다.

다만 현재 세션은 파일시스템이 `read-only`라 리뷰 문서 작성이 정책상 거부됐습니다. 따라서 요청한 파일과 커밋은 생성하지 못했습니다. 코드와 기존 파일은 변경하지 않았습니다.

## MAJOR, 차단

1. `[DB 안전]` [migration:238](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118010000_app_channel_store_purchase.sql:238)  
   SKU와 클로버 수의 서버 카탈로그 매핑이 없습니다. 실제 1클로버 SKU로 `clover_amount=10` intent를 만들면 10클로버가 적립됩니다.

2. `[회귀 위험]` [verify-store-purchase:164](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:164)  
   Google `orderId`가 없으면 클라이언트가 보낸 임의 거래 ID를 멱등키로 씁니다. 동일 구매 토큰을 서로 다른 거래 ID로 반복 적립할 수 있습니다. Google도 `orderId`를 중복 방지 키로 쓰지 말라고 명시합니다. [공식 문서](https://developer.android.com/google/play/billing/security)

3. `[승인 시안 이탈]` [verify-store-purchase:151](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:151)  
   Google 구매 적립 후 `consume` 또는 `acknowledge`를 호출하지 않습니다. 3일 뒤 자동 환불돼도 내부 클로버는 남을 수 있습니다. [Google lifecycle](https://developer.android.com/google/play/billing/lifecycle/one-time)

4. `[DB 안전]` [verify-store-purchase:169](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:169)  
   Google `testPurchaseContext`를 무시하고 환경변수만으로 운영 거래를 판정합니다. License tester의 무료 구매가 운영 적립·환전 대상으로 들어갈 수 있습니다.

5. `[승인 시안 이탈]` [API 계약:68](/mnt/hdd/haenael-ge-v2-hotfix/docs/eng-design/api-contract-app-channels-v0.1.0-gpt-codex-20261118-1626.md:68)  
   계약된 `store-refund-webhook`과 일일 재동기화 worker가 없습니다. 공급자 환불이 발생해도 [reverse_store_purchase](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118010000_app_channel_store_purchase.sql:454)를 호출할 경로가 없습니다.

6. `[DB 안전]` [migration:503](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118010000_app_channel_store_purchase.sql:503)  
   부분환불에서 `p_refund_clover_amount`를 생략하면 구매 전체 클로버를 회수합니다. 10% 금액 환불이 100% 클로버 환불과 `REFUNDED` 상태로 끝날 수 있습니다.

7. `[DB 안전]` [migration:188](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118010000_app_channel_store_purchase.sql:188)  
   목표 소유자가 응원자의 원시 구매 행을 조회할 수 있습니다. 익명 응원도 `supporter_member_id`, 공급자 거래 ID, 구매 시각이 노출됩니다. ERD의 “자기 구매 SELECT만” 계약 위반입니다.

8. `[회귀 위험]` [migration:258](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118010000_app_channel_store_purchase.sql:258)  
   동일 request key의 동시 intent 생성은 replay가 아니라 한쪽이 `23505`로 실패합니다. 빈 행에 대한 `SELECT FOR UPDATE`는 동시 요청을 직렬화하지 않습니다.

9. `[승인 시안 이탈]` [GoogleAnalytics:29](/mnt/hdd/haenael-ge-v2-hotfix/web/src/components/analytics/GoogleAnalytics.tsx:29)  
   동의 전에는 GA 태그 자체를 로드하지 않아 D-054가 요구한 cookieless 집계 신호도 0건입니다. 로그인 전 배너 제거는 맞지만 Consent Mode는 Basic 동작입니다. [Google Consent Mode](https://developers.google.com/tag-platform/security/guides/consent)

## MINOR

- `[회귀 위험]` [verify-store-purchase:172](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:172): 존재하지 않는 `startTime` 대신 현재 시각을 사용해 Google 결제 보류가 실제 결제일보다 연장됩니다. 공식 필드는 `purchaseCompletionTime`입니다.
- `[DB 안전]` [migration:510](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118010000_app_channel_store_purchase.sql:510): 부분 금액에 `FULL`, 전액에 `PARTIAL` scope를 넣어도 저장됩니다.
- `[회귀 위험]` [DB test:52](/mnt/hdd/haenael-ge-v2-hotfix/supabase/tests/app_channel_store_purchase.test.sql:52): 부분환불, 잔액 부족 회수, 역순 이벤트, 동시 재전송과 공급자별 결합 검증이 실행되지 않습니다.
- `[디자인 토큰 위반]` [CashoutPageView:115](/mnt/hdd/haenael-ge-v2-hotfix/web/src/components/cashout/CashoutPageView.tsx:115): 신규 보류 행이 의미 토큰 대신 `text-[13px]`를 직접 사용합니다.

## 축별 판정

- 승인 시안·계약 이탈: 지적 3건
- 회귀 위험: 지적 4건
- 디자인 토큰 위반: 지적 1건
- 무기록 삭제: 문제없음
- DB 안전: 지적 5건
- 리뷰 모델: GPT-5 Codex
- 작성 모델: GPT-5 Codex code-builder
- 다른 세션이지만 같은 모델 계열이라 크로스모델 맹점 상쇄는 없음
- REVIEW_ROUND: 1
- REVIEW_VERDICT: BLOCK

의도된 산출물 경로: `docs/qa/review-app-channels-1258dfa-v0.1.0-gpt-codex-20261118.md`  
커밋: 생성하지 못함, 읽기 전용 정책으로 `apply_patch`가 거부됨.

SKILLS_USED: `review`, 결제·인증·DB·프런트 독립 교차검토에 사용.  
SKILLS_SKIPPED: 없음.

## 수정 이력 (2026-11-18)

구현 커밋 `a2d9ca9`에서 위 13건을 수정했다. 아래 표는 원 리뷰 번호와 실패를 고정한 시험을 연결한다. 원 리뷰의 `BLOCK` 판정은 보존하며, 독립 재검토가 통과하기 전에는 QA 승인이나 운영 배포로 승격하지 않는다.

| 원 리뷰 항목 | 수정 커밋 | 실패를 고정한 시험·검사 |
|---|---|---|
| MAJOR 1. 서버 SKU 카탈로그 | `a2d9ca9` | `AP-RV-01`, `AP-RV-02`, `AP-RV-03` |
| MAJOR 2. Google 멱등키 | `a2d9ca9` | `TC-APP-02-1 Google purchaseToken을 거래 멱등키로 쓴다` |
| MAJOR 3. Google consume | `a2d9ca9` | `TC-APP-02-3`, `TC-APP-02-4 적립 뒤 Google 소모품 consume을 서버에서 POST한다` |
| MAJOR 4. testPurchaseContext | `a2d9ca9` | `TC-APP-02-1`, `TC-APP-02-2 일반 Google 구매는 PRODUCTION이다` |
| MAJOR 5. 환불 알림·일일 재동기화 | `a2d9ca9` | `TC-APP-03-1`부터 `TC-APP-03-4` |
| MAJOR 6. 부분환불 비례 회수 | `a2d9ca9` | `RF-RV-01`부터 `RF-RV-03` |
| MAJOR 7. 원시 구매 행 RLS | `a2d9ca9` | `AP-RV-05 목표 소유자는 응원자의 원시 구매 행을 조회하지 못한다` |
| MAJOR 8. 동시 intent 직렬화 | `a2d9ca9` | `TC-APP-01-4 10개 동시 intent 요청이 1행으로 수렴한다` |
| MAJOR 9. Consent Mode Advanced | `a2d9ca9` | `AN-CONSENT-01`, `AN-CONSENT-02`, `AN-CONSENT-03`, `analytics.test.ts` 동의 전 초기화 시험 |
| MINOR 1. purchaseCompletionTime | `a2d9ca9` | `TC-APP-02-2 purchaseCompletionTime 누락은 거절한다` |
| MINOR 2. 환불 scope 검증 | `a2d9ca9` | `RF-RV-04 부분 금액을 FULL scope로 제출하면 거절한다` |
| MINOR 3. DB 경계·경합 시험 | `a2d9ca9` | `RF-RV-05`부터 `RF-RV-10`, `TC-APP-01-4` |
| MINOR 4. 13px 디자인 토큰 | `a2d9ca9` | `npm run qa:design-tokens`, 검사 파일 320개·신규 위반 0건 |

수정 후 직접 실행 결과: `supabase test db` 26파일·508건 PASS, Edge Function 20파일·122건 PASS, Web Vitest 98파일·597건 PASS, 분석 동의 Playwright 3건 PASS, 프로덕션 빌드 PASS, 홈 HTTP 200·헤드리스 Chromium 콘솔 오류 0건. 운영 DB 마이그레이션·main push·실결제는 실행하지 않았다.
