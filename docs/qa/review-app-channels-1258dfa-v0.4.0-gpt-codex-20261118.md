# 앱 채널 독립 코드리뷰 4회차 (Codex code-reviewer, 2026-11-18 21:0x KST)

> 리뷰어 세션이 읽기 전용이라 컨트롤러가 최종 보고 원문을 그대로 옮겼다. 원본: /Users/sj/.claude/harness/codex-logs/20261118-204949-4059746-code-reviewer.summary.md


한 줄 결론: 3회차 차단 5건 중 3건은 닫혔고 2건은 부분 해소입니다. 신규 결제·삭제 회귀 2건을 포함해 차단 결함 4건이므로 배포 불가입니다.

회장 요청: `db2ec71`이 3회차 차단 5건을 실제로 해소했는지 재판정하고, 수정 과정에서 생긴 결제·계정 삭제 회귀를 공격적으로 검토하라고 요청했습니다.

[모델] GPT-5 Codex code-reviewer. 구현도 Codex 계열이므로 크로스모델 맹점 상쇄는 없습니다.  
벤치마크: Apple 계정 삭제·토큰 폐기, Supabase 공급자 토큰, 토스페이먼츠 리다이렉트 결제 공식 계약을 대조했습니다.  
소스 1: 앱 3채널 출시·수익화 방침, 환전 서버 기본 거부 방침, 요청 원장 9~20행, 앱 채널 PRD v0.2.0.  
소스 2: 3회차 리뷰, `db2ec71`, 관련 코드·마이그레이션·시험.  
소스 3: [Apple 계정 삭제 지침](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/), [Supabase 공급자 토큰](https://supabase.com/docs/guides/auth/social-sign-in), [토스페이먼츠 결제창 계약](https://docs.tosspayments.com/sdk/v2/js/payment).

## 3회차 차단 항목 재판정

| 항목 | 판정 | 근거 |
|---|---|---|
| 1. 토스 체크아웃 경로 | 부분 | 서버 라우트는 생겼지만 모바일 환경 계약은 여전히 존재하지 않는 `haenael.app`을 안내합니다. |
| 2. 대체결제 영구 큐 | 닫힘 | 원 지적의 단일 요청·응답 유실은 SecureStore 재전송으로 해소됐습니다. 다만 신규 동시성 회귀가 있습니다. |
| 3. 보상 실패 복구 원장 | 닫힘 | 복구 건과 결제 이벤트가 원자적으로 기록되고 직렬 계정 삭제를 차단합니다. |
| 4. 계정 삭제 재개 | 닫힘 | 클라이언트 키 보존과 회원별 열린 삭제 요청 재개가 구현됐습니다. |
| 5. Apple 토큰 폐기 | 부분 | 토큰이 확보된 계정만 닫혔습니다. 토큰이 없는 계정은 삭제 중간 상태에 갇힙니다. |

## 차단 지적

1. **차단(MAJOR)** `[승인 계약 이탈·결제]` [apps/mobile/.env.example:7](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/.env.example:7), [config.ts:14](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/config.ts:14), [결정.md:108](/mnt/hdd/haenael-ge-v2-hotfix/wiki/거버넌스/결정.md:108): 체크아웃 라우트는 추가됐지만 배포 예시 URL은 DNS가 없는 `https://haenael.app/api/mobile/toss-checkout`입니다. 운영 주소 정본은 `https://haenael-ge.vercel.app`입니다. 토스 콘솔 설정과 무관한 저장소 환경 계약 오류입니다. 올바른 운영 URL로 계약과 배포 검사를 통일해야 합니다.

   재현: `.env.example`을 기준으로 프로덕션 환경변수를 설정하고 Android 대체결제를 선택합니다. 앱은 존재하지 않는 호스트를 열어 결제창에 도달하지 못합니다.

2. **차단(MAJOR)** `[Apple 계정 삭제·인증]` [auth.ts:22](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/auth.ts:22), [account-delete/index.ts:101](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/account-delete/index.ts:101), [account-delete/index.ts:255](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/account-delete/index.ts:255), [mobile_server_endpoints.sql:380](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118030000_mobile_server_endpoints.sql:380): 로그인은 `provider_refresh_token`이 없어도 성공하지만, 삭제는 개인정보 삭제·비식별화를 먼저 실행한 다음 토큰 부재를 `MANUAL_REQUIRED`로 기록하고 503으로 중단합니다. 이를 처리하는 재인증 화면, 비동기 처리 작업 또는 관리자 복구 경로가 없습니다. Supabase 공식 문서도 공급자 refresh token이 항상 반환된다고 보장하지 않습니다. Apple 폐기 가능성을 삭제 준비 전에 확정하거나, 토큰 부재 계정을 실제로 완료하는 재인증·비동기 처리 경로가 필요합니다.

   재현: `provider_refresh_token`이 없는 Apple 세션으로 탈퇴합니다. 회원·목표·친구·알림 데이터는 먼저 삭제되지만 인증 사용자는 남고, 이후 요청도 `apple_token_revocation_pending`으로 막힙니다.

3. **차단(MAJOR)** `[회귀 위험·결제 유실]` [purchase-recovery.ts:88](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/purchase-recovery.ts:88), [purchase-recovery.ts:109](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/purchase-recovery.ts:109), [purchases.ts:162](/mnt/hdd/haenael-ge-v2-hotfix/apps/mobile/src/lib/purchases.ts:162): 대체결제 복구가 큐 전체를 읽은 뒤 네트워크 승인을 기다리고, 과거 스냅샷으로 큐 전체를 다시 씁니다. 그 사이 새 결제가 추가되면 새 항목이 삭제됩니다. 항목별 원자 삭제나 상호 배제 잠금이 필요합니다.

   재현:

   1. 복구 큐에 A를 넣고 A 승인 응답을 지연시킵니다.
   2. 복구가 기다리는 동안 결제 B를 추가합니다.
   3. A 승인을 완료합니다.
   4. 실측 결과는 `{"recovered":1,"pending":0,"after":[]}`로, B까지 사라졌습니다.
   5. B의 즉시 승인 요청까지 네트워크 오류가 나면 사용자는 결제됐지만 재전송 정보가 없습니다.

4. **차단(MAJOR)** `[DB 안전·결제/삭제 동시성]` [review_round4.sql:71](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118050000_app_channel_review_round4.sql:71), [review_round4.sql:138](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118050000_app_channel_review_round4.sql:138), [mobile_server_endpoints.sql:367](/mnt/hdd/haenael-ge-v2-hotfix/supabase/migrations/20261118030000_mobile_server_endpoints.sql:367), [account-delete/index.ts:255](/mnt/hdd/haenael-ge-v2-hotfix/supabase/functions/account-delete/index.ts:255): 보상 실패 기록은 결제 의도 행만 잠그고, 계정 삭제는 별도의 회원 삭제 잠금만 사용합니다. 삭제 함수는 복구 건을 한 번 확인한 뒤 결제 의도를 취소하며, 서버 함수는 삭제 준비 후 정산 상태를 다시 확인하지 않습니다. 양쪽에 공통 회원 잠금을 적용하거나 인증 사용자 삭제 직전에 정산 상태를 다시 검사해야 합니다.

   재현: 기기 A에서 토스 승인 후 DB 적립과 취소가 실패하는 동안 기기 B에서 탈퇴합니다. 탈퇴가 미해결 복구 건 생성 직전에 검사하면 삭제 준비가 통과합니다. 이후 복구 건은 생성되지만 탈퇴 함수는 재검사 없이 인증 사용자를 삭제합니다. 결과는 결제됨·미적립·계정 삭제입니다.

## 외부 설정 대기, 이번 차단과 별도

- Toss 상점 ID·상품과 시험 상점 설정.
- Google 대체결제 프로그램 및 Play Console 가입.
- App Store Connect·Play Console 앱과 상품 생성.
- Expo Application Services 프로덕션 환경변수와 Apple 폐기용 비밀값 주입.
- 실제 기기 및 공급자 시험 결제·환불 왕복.

## 시험 증거

- 서버 함수 표적 시험: 18/18 통과.
- 앱 채널 PostgreSQL 시험: 32/32 통과.
- 모바일·웹 TypeScript 검사: 통과.
- 대체결제 큐 동시성 직접 재현: 신규 B 항목 삭제 관찰.
- 모바일·웹 Vitest: 읽기 전용 `/tmp` 때문에 시험 수집 전 실패. 코드 실패로 세지 않았습니다.
- 실제 공급자 왕복: 외부 설정 대기.
- 파일 수정·프로세스 생성: 0건. 읽기 전용 환경이라 별도 리뷰 파일과 커밋은 만들지 못했습니다.

## 축별 판정

- 승인 계약 이탈: 차단 2건.
- 회귀 위험: 차단 2건.
- 디자인 토큰: 미검토. 4회차 범위 제한 대상입니다.
- 무기록 삭제: 문제없음.
- DB 안전: 차단 1건.
- 리뷰 회차: 4. 비금전성 신규 사항은 차단으로 올리지 않았습니다.

다음 실행: worker가 위 4건을 수정한 뒤, 올바른 운영 URL 검사, Apple 토큰 부재 계정 삭제, 결제 복구와 신규 결제의 동시 실행, 결제 보상과 계정 삭제의 동시 실행 시험을 추가해야 합니다. 이를 하면 배포 전에 결제 유실과 삭제 불능을 자동 검출할 수 있습니다. 하지 않으면 결제된 금액이 적립되지 않거나 사용자가 계정을 삭제하지 못한 상태로 출시될 수 있습니다. 추천은 네 시험이 모두 통과한 다음 독립 재리뷰를 받는 것입니다.

SKILLS_USED: `review`, 4회차 범위 제한과 결제·DB·인증 경계 검토에 사용.  
SKILLS_SKIPPED: 없음.  
KNOWLEDGE_QUERY: 앱 3채널 출시·수익화 방침, 환전 서버 기본 거부 방침, 요청 원장, PRD, 3회차 리뷰, Apple·Supabase·토스페이먼츠 공식 문서.  
HITS_USED: 공식 공급자 계약과 로컬 코드·시험을 토큰 폐기 및 결제 복구 판정에 사용.  
HITS_REJECTED: 구현 세션의 전체 시험 통과 자기신고는 독립 증거가 아니므로 보조 자료로만 사용.  
CONFLICTS: 외부 콘솔 미설정은 비차단으로 분리했지만, 잘못된 추적 환경 계약과 결제·삭제 상태 유실은 코드 결함이므로 차단했습니다.  
SOURCES/MODEL: GPT-5 Codex. 로컬 거버넌스·요청·PRD·코드·시험, Apple Developer, Supabase, 토스페이먼츠 공식 문서.

REVIEW_VERDICT: BLOCK

## 5회차 수정 연결표, builder 기록

> 이 표는 4회차 독립 판정을 덮지 않는다. 커밋 `39b1ff1`의 수정과 builder 시험을 연결하며, BLOCK 해제는 별도 독립 재검토가 판정한다.

| 4회차 항목 | 수정 커밋 | 먼저 실패한 시험 | 수정 뒤 통과 증거 |
|---|---|---|---|
| MAJOR 1, 체크아웃 운영 호스트 | `39b1ff1` | `TC-APP-02-16`: `.env.example`이 `https://haenael.app`을 반환 | 모바일 23/23. `vercel inspect https://haenael-ge.vercel.app`에서 `haenael-ge` production 배포와 Production 별칭 일치 확인 |
| MAJOR 2, Apple 공급자 token 부재 삭제 | `39b1ff1` | `TC-APP-09-12~13`: 삭제 순서·재인증 재개 함수 부재. Apple 등록 시험은 access token 계약 불일치 | Edge Function 85/85, 모바일 23/23. refresh token 부재 시 access token 저장·폐기, token 부재 시 데이터 변경 전 409, Apple OAuth 뒤 같은 request key 재개 확인 |
| MAJOR 3, 대체결제 큐 동시성 | `39b1ff1` | `TC-APP-02-17`: 복구 A 대기 중 추가한 B가 삭제돼 `pending: 0` 관찰 | 모바일 23/23. 쓰기 직렬화와 최신 큐의 항목별 삭제 후 B가 `pending: 1`로 보존 |
| MAJOR 4, 탈퇴·복구 건 경합 | `39b1ff1` | `APP-SRV-DB-04-4~6`, `APP-SRV-DB-10-8`: 공통 잠금·Auth 삭제 직전 재검사 함수 부재, 진행 중 대체결제가 삭제를 차단하지 못함 | Supabase DB 546/546. 양쪽 RPC가 같은 회원 정산 advisory lock에서 실제 1,368ms·1,366ms 대기, 만료 전 intent 차단, Auth 삭제 직전 OPEN 복구 건 재검사, 시험 데이터 잔존 0건 |

- 운영 데이터베이스·main push·실제 결제·외부 콘솔·배포는 실행하지 않았다.

