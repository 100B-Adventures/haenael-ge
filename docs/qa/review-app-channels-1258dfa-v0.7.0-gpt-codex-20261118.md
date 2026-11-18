# 앱 채널 독립 코드리뷰 7회차 (Codex code-reviewer, 2026-11-18 23:2x KST)

> 리뷰어 세션이 읽기 전용이라 컨트롤러가 최종 보고 원문을 그대로 옮겼다. 원본: /Users/sj/.claude/harness/codex-logs/20261118-231434-1569740-code-reviewer.summary.md


한 줄 결론: `9f6c443`은 6회차 MAJOR 3건을 직접 호출 경로에서는 닫았지만, 공통 적립 RPC 우회 1건과 계정 삭제·결제 복구 회귀 3건이 확인돼 배포 차단입니다.

회장 요청: 모든 결제 적립이 실제로 `credit_purchase` 하나만 통과하는지 우회 경로까지 검사하고, 6회차 결함 해소 여부와 신규 금전·계정 삭제 회귀를 재판정하라고 요청했습니다.

[모델] GPT-5 Codex code-reviewer. 구현도 Codex 계열이므로 크로스모델 검증은 아닙니다.  
벤치마크: PostgreSQL 공식 권한 계약과 앱 계정 삭제 요구사항을 대조했습니다.  
소스 1: 앱 채널 출시·환전 결정, 요청 원장 9~20행, PRD v0.2.0.  
소스 2: 6회차 리뷰, `9f6c443`, FDD·API 계약, 마이그레이션·Edge Function·시험 코드.  
소스 3: [PostgreSQL ALTER FUNCTION](https://www.postgresql.org/docs/current/sql-alterfunction.html), [PostgreSQL 함수 권한](https://www.postgresql.org/docs/current/ddl-priv.html), [Apple 계정 삭제 지침](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/).

## 6회차 MAJOR 재판정

| 6회차 항목 | 판정 | 근거 |
|---|---|---|
| StoreKit·Google Play·Toss 인앱결제와 탈퇴 동시성 | 닫힘 | 현재 운영 Edge Function 호출 8곳은 모두 `credit_purchase`를 사용하고, `VERIFYING` 작업이 결제자와 목표 소유자 양쪽의 삭제를 차단합니다. |
| 목표 소유자 삭제가 들어오는 결제를 누락 | 닫힘 | 결제 작업과 생성 상태 구매 intent를 결제자 또는 목표 소유자로 조회합니다. |
| 외부 계정 폐기·개인정보 삭제 직전 정산 재검사 누락 | 닫힘 | 최초 요청, 외부 계정 폐기 기록, 개인정보 삭제 세 단계 모두 잔액·환전·미성숙 적립을 PostgreSQL transaction advisory lock 안에서 재검사합니다. |

## 차단 지적

1. **MAJOR, 신뢰도 10/10** `[승인 계약 이탈·DB 안전]` [mobile_server_endpoints.sql:309](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118030000_mobile_server_endpoints.sql:309), [account_deletion_state_machine.sql:294](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118070000_account_deletion_state_machine.sql:294), [unified_purchase_credit.sql:585](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118080000_unified_purchase_credit.sql:585), [unified_purchase_credit.test.sql:21](/mnt/hdd/haenael-ge-v2-hotfix/supabase/tests/unified_purchase_credit.test.sql:21): Google 대체결제의 구버전 `credit_alternative_store_purchase_v1` 함수가 공통 RPC 우회 경로로 남았습니다. 기존 함수는 `service_role` 실행 권한을 받은 뒤 이름만 `_v1`으로 바뀌었습니다. PostgreSQL 함수 권한은 같은 객체의 이름 변경으로 제거되지 않지만, 새 마이그레이션과 시험은 새 이름의 wrapper만 검사·회수합니다. 구버전 함수는 `SECURITY DEFINER`라 내부 적립 함수를 호출하며, `purchase_credit_operation` 생성과 결제자·목표 소유자 잠금, 계정 삭제 검사를 모두 건너뜁니다.

   재현: 전체 마이그레이션 적용 후 `has_function_privilege('service_role', 'public.credit_alternative_store_purchase_v1(...)', 'EXECUTE')`를 조회하면 참이 됩니다. 계정 삭제와 동시에 이 함수를 호출하면 `credit_purchase`의 공통 결제 작업과 두 회원 잠금 없이 적립을 시도할 수 있습니다.

2. **MAJOR, 신뢰도 10/10** `[회귀 위험·계정 삭제]` [unified_purchase_credit.sql:65](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118080000_unified_purchase_credit.sql:65), [unified_purchase_credit.sql:155](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118080000_unified_purchase_credit.sql:155), [unified_purchase_credit.sql:243](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118080000_unified_purchase_credit.sql:243): 만료된 `CREATED` 구매 intent도 만료시각 확인 없이 계정 삭제를 차단합니다. 최신 삭제 요청 함수에서는 이전의 `EXPIRED` 전이가 제거됐고, 별도 만료 작업도 없습니다. 특히 다른 회원이 목표에 생성한 intent는 목표 소유자가 취소할 수도 없어 계정 삭제 서비스 거부 공격이 가능합니다.

   재현: 회원 B가 회원 A의 목표에 구매 intent를 만들고 결제하지 않은 채 30분을 넘깁니다. A가 탈퇴를 요청하면 만료된 행도 `CREATED`라는 이유로 `BLOCKED_PENDING_PAYMENT`가 됩니다. B의 intent를 만료시키는 작업이 없어 A는 이후에도 탈퇴할 수 없습니다.

3. **MAJOR, 신뢰도 10/10** `[결제 복구·금전 손실]` [verify-store-purchase/index.ts:384](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:384), [unified_purchase_credit.sql:482](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118080000_unified_purchase_credit.sql:482), [unified_purchase_credit.sql:505](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118080000_unified_purchase_credit.sql:505), [unified_purchase_credit.sql:52](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118080000_unified_purchase_credit.sql:52): Apple·Google Play·Toss 인앱결제의 일시적인 공급자 오류도 모두 `RECOVERY_REQUIRED`로 전이되지만, 이 상태를 다시 `VERIFYING` 또는 `CREDITED`로 복구하는 경로가 없습니다. 복구 테이블 기록도 Google 대체결제에만 생성됩니다. 이후 재전송은 `CREDIT` 상태 검사에서 거절되고 계정 삭제도 계속 차단됩니다. 이는 FDD의 “공급자 승인 뒤 자동 보상까지 실패한 경우에만 복구 필요 상태” 계약과 다릅니다.

   재현: StoreKit 결제 후 첫 서버 검증에서 일시적인 네트워크 오류를 발생시킵니다. 작업은 `RECOVERY_REQUIRED`가 됩니다. 미완료 거래를 다시 전송해 공급자 검증에 성공해도 `CREDIT`이 `payment_confirmation_state_invalid`로 실패합니다. 사용자는 결제했지만 적립받지 못하고 거래 완료 처리와 계정 삭제도 할 수 없습니다.

4. **MAJOR, 신뢰도 9/10** `[멱등성·상태 무결성]` [unified_purchase_credit.sql:425](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118080000_unified_purchase_credit.sql:425), [verify-store-purchase/index.ts:337](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:337), [verify-store-purchase/index.ts:386](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/verify-store-purchase/index.ts:386), [unified_purchase_credit.sql:473](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118080000_unified_purchase_credit.sql:473): 이미 `CREDITED`인 거래를 재전송하면 `BEGIN`이 성공 상태를 반환하지만 Edge Function은 이를 멱등 응답으로 종료하지 않고 공급자 검증을 다시 수행합니다. 이 재검증이 일시적으로 실패하면 SQL은 현재 상태 검사보다 먼저 `RECOVERY_REQUIRED`를 처리해 성공 거래를 미종결 상태로 되돌립니다.

   재현: 적립은 성공했지만 모바일이 응답을 받지 못한 상황을 만듭니다. 같은 영수증을 재전송한 뒤 공급자 재조회만 실패시키면 `CREDITED → RECOVERY_REQUIRED`로 역전됩니다. 구매 원장은 이미 적립 완료인데 공통 결제 작업은 미종결이 되어 계정 삭제를 영구 차단합니다.

## 시험 결과

- Edge Function 표적 시험: 22/22 통과.
- 호출 경로 정적 검사: 현재 Edge Function의 결제 적립 호출 8곳은 모두 `credit_purchase`.
- 우회 경로 검사: `credit_alternative_store_purchase_v1`의 권한 회수와 권한 시험이 누락됨.
- PostgreSQL 시험·30개 동시성 시험: 로컬 Supabase가 정지 상태이고 세션이 읽기 전용이라 독립 재실행하지 못했습니다. 구현 세션의 587건 통과 주장은 보조 자료로만 사용했습니다.
- 웹 Vitest: 실행이 완료되지 않아 종료했으며 통과로 판정하지 않았습니다.
- 파일 수정·커밋: 0건. 읽기 전용 세션이라 `docs/qa/review-app-channels-1258dfa-v0.7.0-gpt-codex-20261118.md`를 생성하지 못해 보고 전문으로 남깁니다.

## 외부 설정 대기

다음은 이번 코드 차단과 분리합니다.

- Toss 상품·상점 설정.
- Google 대체결제 프로그램과 Play Console 등록.
- App Store Connect·Play Console 앱과 상품 생성.
- Apple·Google·Toss 서버 시크릿 주입.
- 실제 기기 결제·환불 왕복.

## 축별 판정

- 승인 계약 이탈: MAJOR 2건.
- 회귀 위험: MAJOR 3건.
- 디자인 토큰: 미검토. 7회차 제한 범위 밖입니다.
- 무기록 삭제: 문제없음.
- DB 안전: MAJOR 4건.
- 리뷰 회차: 7회차. 사용자 돈과 계정 삭제에 직접 영향을 주는 회귀만 차단으로 판정했습니다.

다음 실행: worker는 구버전 적립 함수의 `service_role` 실행 권한을 회수하거나 함수를 제거하고, 모든 적립 함수 이름을 열거하는 권한 시험을 추가해야 합니다. 만료된 미결제 intent는 결제 여부를 공급자와 재조정한 뒤 종결 상태로 전이해야 합니다. `CREDITED`는 되돌릴 수 없는 종결 상태로 만들고, 일시적인 공급자 오류는 재시도 가능한 상태로 유지해야 합니다. 종료 증거는 구버전 함수 실행 거절, 타인이 만든 만료 intent 뒤 목표 소유자 탈퇴 성공, 공급자 일시 오류 뒤 단일 적립 성공, 성공 응답 유실 뒤 재전송 시 `CREDITED` 유지 시험입니다.

SKILLS_USED: `review`, 7회차 범위 제한과 결제·계정 삭제·DB 권한 검토에 사용.  
SKILLS_SKIPPED: 없음.  
KNOWLEDGE_QUERY: 앱 채널 출시·환전 결정, 요청 원장, PRD, 6회차 리뷰, PostgreSQL 함수 권한 공식 문서.  
HITS_USED: FDD의 단일 적립 진입점과 복구 상태 계약, PostgreSQL 함수 실행 권한 규칙을 판정 기준으로 사용.  
HITS_REJECTED: 구현 세션의 전체 시험 통과 주장은 독립 실행 증거가 아니므로 보조 자료로만 사용.  
CONFLICTS: 외부 콘솔 미설정은 비차단이지만, 결제 유실과 계정 삭제 영구 차단은 코드 결함이므로 차단했습니다.  
SOURCES/MODEL: GPT-5 Codex. 로컬 결정·요청·PRD·FDD·API 계약·코드·시험, PostgreSQL·Apple 공식 문서.  
STATUS: DONE_WITH_CONCERNS

REVIEW_VERDICT: BLOCK

