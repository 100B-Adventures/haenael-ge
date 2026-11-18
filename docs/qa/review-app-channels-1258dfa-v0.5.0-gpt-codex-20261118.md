# 앱 채널 독립 코드리뷰 5회차 (Codex code-reviewer, 2026-11-18 21:4x KST)

> 리뷰어 세션이 읽기 전용이라 컨트롤러가 최종 보고 원문을 그대로 옮겼다. 원본: /Users/sj/.claude/harness/codex-logs/20261118-212040-195890-code-reviewer.summary.md


━━ 📍 최종 보고 · 2026-11-18 21:28 KST ━━

한 줄 결론: `39b1ff1`은 4회차 차단 4건 중 2건을 닫았지만 Apple 계정 삭제와 결제·탈퇴 동시성은 미해소됐고, 계정 오삭제·삭제 재개 불능 회귀까지 생겨 배포 차단입니다.

회장 요청: `39b1ff1`의 결제·계정 삭제 수정이 실제로 안전한지 재판정하고, 사용자 돈·계정·데이터에 영향을 주는 신규 회귀까지 찾아 배포 가능 여부를 확정하라고 요청했습니다.

| 단계 | 상태 | 증거·비고 |
|---|---|---|
| 기획 | 완료 | 앱 채널 PRD v0.2.0 기준 |
| 디자인 | 완료 | 이번 코드리뷰에서는 시각 표현 미재검증 |
| 기술설계 | 완료 | 앱 채널 기술설계 기준 |
| 개발 | 수정 제출 | `39b1ff1` |
| QA | 진행 중 | 5회차 차단 4건 |
| 배포 | 차단 | 결제·계정 삭제 차단 결함 해소 전 진행 불가 |

[모델] GPT-5 Codex code-reviewer. 구현도 Codex 계열이므로 크로스모델 검증은 아닙니다.  
벤치마크: Apple 토큰 폐기·수명, Supabase 코드 교환의 세션 저장 동작, 결제와 계정 삭제의 원자성 계약을 대조했습니다.  
소스 1: 앱 3채널 출시·수익화 방침, 환전 서버 기본 거부 방침, 요청 원장 9~20행, 앱 채널 PRD v0.2.0.  
소스 2: 4회차 리뷰, `39b1ff1`, 관련 모바일·서버·SQL 코드와 시험.  
소스 3: [Apple 토큰 폐기](https://developer.apple.com/documentation/signinwithapplerestapi/revoke-tokens), [Apple 토큰 발급과 수명](https://developer.apple.com/documentation/SigninwithAppleRESTAPI/Generate-and-validate-tokens), [Supabase 코드 교환](https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession).

PR type: application

## 4회차 차단 항목 재판정

| 4회차 항목 | 판정 | 근거 |
|---|---|---|
| 체크아웃 운영 주소 | 닫힘 | 모바일 환경 예시가 실제 운영 주소로 변경되고 계약 시험이 추가됐습니다. |
| Apple 토큰 부재 삭제 | 안 닫힘 | refresh token이 없을 때 저장하는 access token은 약 1시간 뒤 만료되며, 실패 시 재인증하지 않습니다. |
| 대체결제 큐 동시성 | 닫힘 | 항목별 삭제와 쓰기 직렬화가 적용됐고 이전 재현에서 신규 B 결제가 보존됐습니다. |
| 결제·탈퇴 동시성 | 부분 | 공통 잠금은 생겼지만 만료된 진행 중 결제와 최종 검사 뒤 Auth 삭제 사이의 간격이 남았습니다. |

## 차단 지적

1. **차단(MAJOR)** `[Apple 계정 삭제]` [auth.ts:23](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/auth.ts:23), [account-delete/index.ts:134](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/account-delete/index.ts:134), [account-delete-recovery.ts:38](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/account-delete-recovery.ts:38): refresh token이 없으면 Apple access token을 장기 보관하지만 Apple access token의 발급 수명은 3,600초입니다. 만료 뒤 폐기 요청이 실패하면 서버는 `apple_token_revocation_pending`을 반환하고, 모바일은 `apple_reauthentication_required`만 재인증하므로 사용자가 탈퇴를 완료할 경로가 없습니다. 만료·무효 토큰도 재인증 대상으로 돌리거나, 장기 유효 refresh token 또는 삭제 시점에 새로 교환한 토큰을 사용해야 합니다.

   재현: access token만 반환된 Apple 계정으로 로그인하고 1시간 이상 지난 뒤 탈퇴합니다. Apple 폐기가 실패해 `RETRY_REQUIRED`가 되고, 앱은 재인증 없이 오류를 그대로 반환합니다.

2. **차단(MAJOR)** `[인증 경계·다른 계정 삭제]` [account.ts:45](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/account.ts:45), [auth.ts:20](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/auth.ts:20), [auth.ts:55](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/auth.ts:55), [account-delete-recovery.ts:41](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/account-delete-recovery.ts:41): 삭제를 시작한 회원 ID와 Apple 재인증 뒤 회원 ID를 대조하지 않습니다. `exchangeCodeForSession`은 재인증 결과를 현재 Supabase 세션으로 저장하므로 다른 Apple 계정 B로 인증하면 재시도 요청은 원 계정 A가 아니라 B를 삭제합니다. 삭제 시작 회원을 저장하고 재인증 결과와 일치할 때만 재시도하며, 서버 삭제 요청도 원 회원에게 묶인 일회성 도전값으로 검증해야 합니다.

   직접 재현 결과: 원 계정을 A로 두고 재인증이 현재 세션을 B로 바꾸도록 실행하자 `{"original":"member-A","deleted":["member-B"]}`가 관찰됐습니다.

3. **차단(MAJOR)** `[계정 삭제 재개 회귀]` [review_round5.sql:93](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118060000_app_channel_review_round5.sql:93), [review_round5.sql:132](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118060000_app_channel_review_round5.sql:132), [account-delete/index.ts:318](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/account-delete/index.ts:318): 삭제 준비 함수는 새 멱등키가 들어와도 기존 `PREPARED` 요청을 재개하지만, 새 최종 검사 함수는 다시 입력된 멱등키가 기존 행과 정확히 같아야 통과시킵니다. 앱 재설치·기기 변경으로 SecureStore 키를 잃으면 삭제 준비는 성공한 것처럼 반환된 뒤 최종 검사에서 영구적으로 409가 됩니다. 기존 삭제 요청의 ID나 정본 멱등키를 반환해 이후 단계에서 그대로 사용해야 합니다.

   재현: 기존 키 A로 `PREPARED`를 만든 뒤 새 키 B로 재시도합니다. 준비 함수는 `is_replay=true`를 반환하지만 최종 검사는 `request_key=B` 행이 없어 `account_settlement_pending`을 반환합니다. 기존 시험은 새 키로 준비와 완료만 확인하고 새 최종 검사 호출을 건너뜁니다.

4. **차단(MAJOR)** `[DB 안전·결제/삭제 동시성]` [confirm-alternative-payment/index.ts:247](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/confirm-alternative-payment/index.ts:247), [review_round5.sql:103](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118060000_app_channel_review_round5.sql:103), [review_round5.sql:129](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118060000_app_channel_review_round5.sql:129), [account-delete/index.ts:318](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/account-delete/index.ts:318): 삭제 준비는 만료되지 않은 `CREATED` 대체결제만 차단합니다. 결제 확인이 만료 직전에 시작돼 공급자 응답을 기다리는 동안 intent가 만료되면 삭제가 통과할 수 있습니다. 최종 검사 RPC의 트랜잭션 잠금도 반환 시 해제되므로 복구 건이 그 직후 생성되고 Auth 사용자가 삭제되는 간격이 남습니다. 만료 여부와 관계없이 공급자 정산이 끝나지 않은 intent를 차단하고, 결제 상태를 명시적인 종결 상태로 전이한 뒤에만 탈퇴가 진행되도록 해야 합니다.

   재현: intent 만료 직전에 결제 확인을 시작해 최초 만료 검사를 통과시키고 Toss 응답을 지연합니다. 만료 직후 탈퇴를 실행하면 삭제 준비가 통과합니다. 이후 결제 적립과 취소를 실패시키고 최종 정산 검사 직후 복구 건을 기록하면, 미해결 결제가 생긴 뒤 Auth 사용자가 삭제될 수 있습니다.

## 외부 설정 대기, 차단과 별도

- Toss 상점·상품과 시험 상점 설정.
- Google 대체결제 프로그램 및 Play Console 가입.
- App Store Connect·Play Console 앱과 상품 생성.
- Expo Application Services 환경변수와 Apple 폐기용 시크릿 주입.
- 실제 기기에서 Apple·Google·Toss 결제·환불 왕복.

## 시험 증거

- 서버 함수 표적 시험: 19/19 통과.
- 앱 채널 PostgreSQL 시험: 37/37 통과.
- 모바일 표적 시험: 6/6 통과.
- 모바일 TypeScript 검사: 통과.
- 대체결제 큐 직접 동시성 재현: A 복구 중 추가한 B가 `pending: 1`로 보존됨.
- Apple 재인증 계정 교체 재현: 원 계정 A 대신 현재 세션 B가 삭제 대상으로 사용됨.
- 실제 공급자 왕복: 외부 설정 대기.
- 파일 수정·커밋: 0건. 읽기 전용 세션이라 리뷰 파일은 만들지 않았습니다.

## 축별 판정

- 승인 계약 이탈: 차단 1건.
- 회귀 위험: 차단 3건.
- 디자인 토큰: 미검토. 5회차 범위 제한 대상입니다.
- 무기록 삭제: 문제없음.
- DB 안전: 차단 2건.
- 리뷰 회차: 5. 돈·계정·데이터 손실이 없는 추가 사항은 차단으로 올리지 않았습니다.

다음 실행: worker가 네 차단 항목을 수정하고, ①만료된 Apple access token 재인증 ②다른 Apple 계정 재인증 거절 ③새 멱등키 삭제 재개와 최종 검사 ④만료 경계의 결제·탈퇴 경합 시험을 통과시켜야 합니다. 이를 하면 계정 오삭제와 결제 유실을 배포 전에 차단할 수 있습니다. 하지 않으면 다른 계정이 삭제되거나 결제된 금액이 적립되지 않은 채 계정이 삭제될 수 있습니다. 추천은 네 시험 통과 후 독립 재리뷰입니다.

SKILLS_USED: `review`, 5회차 범위 제한과 결제·인증·DB 동시성 검토에 사용.  
SKILLS_SKIPPED: 없음.  
KNOWLEDGE_QUERY: 앱 3채널 출시·수익화 방침, 환전 서버 기본 거부 방침, 4회차 리뷰, Apple·Supabase 공식 계약.  
HITS_USED: Apple 토큰 유효성 계약과 Supabase 세션 저장 동작을 계정 삭제 판정에 사용.  
HITS_REJECTED: 구현 세션의 전체 시험 통과 주장은 독립 증거가 아니므로 보조 자료로만 사용.  
CONFLICTS: 외부 콘솔 미설정은 비차단으로 분리했지만 계정 오삭제·삭제 재개 불능·결제 유실 가능성은 코드 결함이므로 차단했습니다.  
SOURCES/MODEL: GPT-5 Codex. 로컬 거버넌스·요청·PRD·코드·시험, Apple Developer, Supabase 공식 문서.

REVIEW_VERDICT: BLOCK

