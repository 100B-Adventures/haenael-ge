# 앱 채널 독립 코드리뷰 6회차 (Codex code-reviewer, 2026-11-18 22:3x KST)

> 리뷰어 세션이 읽기 전용이라 컨트롤러가 최종 보고 원문을 그대로 옮겼다. 원본: /Users/sj/.claude/harness/codex-logs/20261118-222722-1080367-code-reviewer.summary.md


━━ 📍 최종 보고 · 2026-11-18 22:38 KST ━━

한 줄 결론: `5b7321f`은 5회차 차단 4건 중 3건을 닫았지만 결제와 탈퇴 동시성은 일부 채널만 보호합니다. 결제 완료 사용자의 적립이 사라질 수 있는 3건이 남아 배포 차단입니다.

회장 요청: 계정 삭제 서버 상태기계가 이전 차단 항목을 실제로 해소했는지, 설계한 상태·불변식·시험을 그대로 구현했는지 재판정하고 신규 결제·삭제 회귀까지 확인하라고 요청했습니다.

| 단계 | 상태 | 증거·비고 |
|---|---|---|
| 기획 | 완료 | 앱 채널 PRD v0.2.0 |
| 디자인 | 완료 | 시각 표현은 이번 범위에서 미검토 |
| 기술설계 | 수정 제출 | `e59d0b5`, 불변식 일부 코드 이탈 |
| 개발 | 수정 제출 | `5b7321f` |
| QA | 차단 | 결제·탈퇴 동시성 결함 3건 |
| 배포 | 차단 | 금전 손실 경로 해소 전 진행 불가 |

[모델] GPT-5 Codex code-reviewer. 구현도 Codex 계열이므로 크로스모델 검증은 아닙니다.  
벤치마크: Apple 계정 삭제 투명성·토큰 폐기 계약과 서버 상태기계의 결제 정산 불변식을 대조했습니다.  
소스 1: 결정 원장의 앱 3채널 출시·환전 기본 거부 결정, 요청 원장 9~20행, PRD v0.2.0.  
소스 2: `e59d0b5`, `5b7321f`, 기능 설계 문서(FDD), API 계약, 마이그레이션·Edge Function·모바일·시험 코드.  
소스 3: [Apple 계정 삭제 지침](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/), [Apple 토큰 폐기](https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens).

## 5회차 차단 4건 재판정

| 5회차 항목 | 판정 | 근거 |
|---|---|---|
| 만료된 Apple access token으로 삭제 재개 불능 | 닫힘 | refresh token만 저장하고, 누락·`invalid_grant`는 재인증으로 전환합니다. |
| 다른 Apple 계정 재인증 뒤 계정 오삭제 | 닫힘 | 삭제 시작 회원과 재인증 회원을 비교하고 불일치 시 재호출하지 않습니다. |
| 클라이언트 요청 키 분실 시 삭제 재개 불능 | 닫힘 | `member_id` 기본키인 서버 작업 한 행으로 재설계됐습니다. |
| 결제 확인·복구·탈퇴 동시성 | 부분 | Google 대체결제의 결제자 경로는 보호하지만 StoreKit·Play·Toss 인앱결제 검증과 목표 소유자 쪽 결제는 보호하지 않습니다. |

## 차단 지적

1. **MAJOR, 신뢰도 10/10** `[회귀 위험·DB 안전]` [verify-store-purchase/index.ts:303](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:303), [account_deletion_state_machine.sql:174](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118070000_account_deletion_state_machine.sql:174), [app_channel_store_purchase.sql:320](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118010000_app_channel_store_purchase.sql:320): Apple·Google Play·Toss 인앱결제(IAP) 영수증 검증에는 `alternative_payment_confirmation` 테이블과 PostgreSQL 트랜잭션 수준 advisory lock이 적용되지 않습니다. 여기서 advisory lock은 동일 회원의 결제와 탈퇴를 한 번에 하나씩 처리하는 비관적 락입니다. 삭제가 만료된 `store_purchase_intent` 행을 `EXPIRED`로 바꾸는 동안 공급자 검증이 진행되면, 이미 결제된 영수증은 적립 함수에서 거절되고 `store_recovery_case` 복구 테이블에도 기록되지 않습니다.

   재현: StoreKit 결제를 완료하고 영수증 검증 응답을 지연합니다. 결제 intent 만료 뒤 같은 회원이 탈퇴하면 삭제 함수가 intent를 만료시키고 계정을 삭제합니다. 공급자 검증이 돌아와도 `credit_store_purchase`가 `purchase_intent_invalid`로 실패합니다. 사용자는 결제했지만 적립을 받지 못하고 삭제된 계정이라 재전송도 불가능합니다.

2. **MAJOR, 신뢰도 10/10** `[DB 안전·결제 소유권]` [account_deletion_state_machine.sql:107](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118070000_account_deletion_state_machine.sql:107), [app_channel_store_purchase.sql:253](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118010000_app_channel_store_purchase.sql:253), [account_deletion_state_machine.sql:530](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118070000_account_deletion_state_machine.sql:530): 삭제 검사는 탈퇴 회원이 결제자인 intent만 `supporter_member_id`로 찾습니다. 탈퇴 회원이 소유한 목표로 들어오는 다른 사람의 결제 intent와 영수증 검증 요청은 검사하지 않습니다. 목표가 삭제되면 이미 결제한 응원자의 적립이 `goal_not_found`로 실패합니다.

   재현: 회원 B가 회원 A의 목표에 StoreKit 결제를 완료하고 검증을 대기시킵니다. A가 탈퇴하면 B의 intent는 삭제 검사에 잡히지 않고 A의 목표가 삭제됩니다. 이후 B의 영수증 검증은 적립되지 않으며 일반 IAP 경로에는 자동 취소나 `store_recovery_case` 기록이 없습니다.

3. **MAJOR, 신뢰도 10/10** `[설계 불변식·정산 재검사]` [account_deletion_state_machine.sql:151](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118070000_account_deletion_state_machine.sql:151), [account_deletion_state_machine.sql:471](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118070000_account_deletion_state_machine.sql:471), [account_deletion_state_machine.sql:511](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118070000_account_deletion_state_machine.sql:511): 클로버 잔액·환전·미성숙 적립은 최초 `request_account_deletion`에서만 검사합니다. 외부 계정 폐기와 개인정보 삭제 단계는 미종결 결제만 재검사합니다. 최초 검사 뒤 다른 응원이 적립되거나 정산 행이 생기면 잔액이 남은 채 계정과 목표가 삭제될 수 있습니다.

   재현: A의 잔액이 0일 때 삭제 요청을 `REQUESTED`로 만든 뒤, 이미 진행 중인 B의 결제를 A 목표에 적립합니다. `mark_account_deletion_external_revoked`와 `delete_account_data`는 새 잔액과 `clover_maturity`를 확인하지 않아 A를 비식별화하고 Supabase Auth 사용자를 삭제합니다.

## 설계 불변식 대조

| 불변식 | 판정 | 코드·시험 결과 |
|---|---|---|
| 서버 단일 소유 | 일치 | 회원당 한 행이며 클라이언트 요청 키가 없습니다. |
| 단방향 상태 전이 | 부분 불일치 | [마이그레이션:468](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118070000_account_deletion_state_machine.sql:468)은 `BLOCKED_PENDING_PAYMENT`에서 `EXTERNAL_REVOKED`로 직접 전이할 수 있습니다. |
| 결제·탈퇴 직렬화 | 불일치 | Google 대체결제 결제자에게만 PostgreSQL advisory lock을 적용합니다. 일반 IAP와 목표 소유자 쪽 결제는 직렬화하지 않습니다. |
| Apple 외부 폐기 선행 | 일치 | refresh token 폐기 전 Storage·회원 데이터·Supabase Auth 사용자를 삭제하지 않습니다. |
| 삭제 중 새 결제 금지 | 부분 불일치 | Google 대체결제 확인은 차단하지만 `verify-store-purchase`와 탈퇴 회원 목표의 결제는 차단하지 않습니다. |
| 계정 세션 격리 | 일치 | 재인증 회원 불일치 시 저장 정보를 폐기하고 삭제 재호출을 중단합니다. |

## 시험·추적성 결과

- Edge Function 표적 시험: 14/14 통과.
- 모바일 삭제 재개 시험: 3/3 통과.
- 모바일 TypeScript 검사: 통과.
- PostgreSQL 시험과 2연결 동시성 시험: Docker 소켓 접근이 거부돼 독립 재실행하지 못했습니다. code-builder의 568건 통과 주장은 참고 자료로만 사용했습니다.
- 문서 모순 검사: 통과.
- 요구 추적 검사: 별도 `APP-10` 누락으로 실패했습니다.
- [test-cases 문서:116](/mnt/hdd/haenael-ge-v2-hotfix/docs/eng-design/test-cases-app-channels-v0.1.0-gpt-codex-20261118-1626.md:116)에는 `TC-APP-09-1`, `TC-APP-09-2`만 정의돼 있습니다. FDD가 참조하는 `TC-APP-09-3`부터 `TC-APP-09-10`은 시험 코드 이름에는 있지만 승인 시험 케이스 문서에는 정의되지 않았습니다.
- [DB 상태기계 시험:44](/mnt/hdd/haenael-ge-v2-hotfix/supabase/tests/account_deletion_state_machine.test.sql:44)은 탈퇴 회원을 결제자로만 구성합니다. 탈퇴 회원이 목표 소유자인 반대 방향 동시성은 검증하지 않습니다.

## 외부 설정 대기

다음은 이번 코드 차단과 분리합니다.

- Toss 상점·상품·가맹점 설정.
- Google 대체결제 프로그램과 Play Console 등록.
- App Store Connect·Play Console 앱과 상품 생성.
- Apple 폐기·Toss·Google 암호화용 서버 시크릿 주입.
- 실제 기기 StoreKit·Play·Toss 결제·환불 왕복.

## 축별 판정

- 승인 계약 이탈: MAJOR 2건, `NEXT_RELEASE` 2건.
- 회귀 위험: MAJOR 3건.
- 디자인 토큰: 미검토. 6회차 제한 범위 밖입니다.
- 무기록 삭제: 문제없음.
- DB 안전: MAJOR 3건.
- 리뷰 회차: 6회차. 금전·계정 삭제 피해가 없는 상태 전이 표기와 시험 문서 누락은 `NEXT_RELEASE`로 분리했습니다.
- 파일 수정·커밋: 0건. 읽기 전용 세션이라 v0.6 리뷰 파일은 생성하지 못했습니다.

다음 실행: worker가 StoreKit·Play·Toss IAP 검증 시작부터 완료까지의 상태를 서버 테이블에 기록하고, 해당 행의 생성·상태 변경과 계정 삭제를 동일한 PostgreSQL advisory lock으로 직렬화해야 합니다. 탈퇴 회원이 결제자인 경우와 목표 소유자인 경우를 모두 검사해야 하며, 외부 폐기·개인정보 삭제 직전에는 잔액·환전·미성숙 적립을 해당 비관적 락을 건 트랜잭션 안에서 다시 검사해야 합니다. 종료 증거는 네 결제 채널 각각에 대해 “검증 중 탈퇴”, “탈퇴 회원 목표로 결제”, “최초 삭제 검사 뒤 적립” 2연결 시험이 통과하는 것입니다.

SKILLS_USED: `review`, 6회차 범위 제한과 결제·상태기계·DB 동시성 검토에 사용.  
SKILLS_SKIPPED: 전문 서브리뷰는 이번 세션의 위임 금지 조건으로 미실행.  
KNOWLEDGE_QUERY: 앱 채널 출시·환전·계정 삭제 결정, 5회차 리뷰, Apple 계정 삭제·토큰 폐기 공식 계약.  
HITS_USED: PRD의 보류·환전 차단 규칙과 FDD의 여섯 불변식을 코드·시험 판정 기준으로 사용.  
HITS_REJECTED: code-builder의 전체 시험 통과 주장은 독립 실행 증거가 아니므로 보조 자료로만 사용.  
CONFLICTS: 외부 콘솔 미설정은 비차단이지만, 결제 후 적립 손실과 잔액이 남은 계정 삭제는 코드 결함이므로 차단했습니다.  
SOURCES/MODEL: GPT-5 Codex. 로컬 결정·요청·PRD·FDD·API 계약·코드·시험, Apple Developer 공식 문서.  
STATUS: DONE_WITH_CONCERNS

REVIEW_VERDICT: BLOCK

## code-builder 수정 증거

빨강 단계에서는 `unified_purchase_credit.test.sql`이 공통 RPC와 확인 작업 테이블 부재로 18/18 실패했다. 구현 뒤 같은 시험을 포함한 Supabase DB 전체 29파일·587건이 통과했고, 실제 PostgreSQL 두 연결을 사용한 30개 동시 실행 조합도 전부 삭제 차단 결과를 반환했다.

| 6회차 MAJOR | 수정 커밋 | 빨강→초록 시험 | 결과 |
|---|---|---|---|
| 1. 일반 인앱결제 검증 중 계정 삭제 경합 | 설계 `c4ba3dc`, 구현 `9f6c443` | `TC-APP-09-11 StoreKit 검증 시작은 공통 RPC만 지난다`, `Google Play 검증 시작은 공통 RPC만 지난다`, `Toss 인앱결제 검증 시작은 공통 RPC만 지난다`; `verify-account-deletion-concurrency.mjs`의 APPLE·GOOGLE_PLAY·TOSS_IAP × 삭제 3단계 × 결제자·목표 소유자 | 통과 |
| 2. 목표 소유자 삭제가 들어오는 결제를 누락 | 설계 `c4ba3dc`, 구현 `9f6c443` | `TC-APP-09-13 목표 소유자는 들어오는 결제 검증 중 탈퇴가 차단된다`; 5개 공급자 채널의 `RECIPIENT` 15개 동시 실행 | 통과 |
| 3. 외부 폐기·개인정보 삭제 직전 정산 재검사 누락 | 설계 `c4ba3dc`, 구현 `9f6c443` | `TC-APP-09-13 외부 폐기 기록 직전 새 잔액을 다시 검사한다`, `개인정보 삭제 직전 새 잔액을 다시 검사한다`; 5개 공급자 채널의 `EXTERNAL_REVOKED`·`DATA_DELETE` 20개 동시 실행 | 통과 |

추가 계약 시험: 채널별 내부 적립 함수 3종의 `service_role` 직접 실행 권한이 없음을 `unified_purchase_credit.test.sql`에서 검증했다. Edge Function 표적 시험 22건, 웹 99파일·599건, Deno lint, 웹 단위·보안 TypeScript 검사, Next.js 프로덕션 빌드도 통과했다. 운영 데이터베이스·main push·실제 결제·외부 콘솔·배포는 실행하지 않았다.

