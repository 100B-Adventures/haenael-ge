# 앱 채널 제출 전 미결 항목

> 상태: 제출 준비 미완료. 운영 DB migration, main push, 실결제, 외부 발신, 스토어 제출은 실행하지 않았다.

## Q6. 공급자 환불 알림과 Google 외부 거래 보고 설정

- 배경: 서버는 Apple App Store Server Notifications V2의 `signedPayload`, Google Real-time Developer Notifications의 Pub/Sub 인증 토큰, Google External Transactions API 보고를 처리한다. 실제 호출에는 Apple 알림 URL, Google Pub/Sub push 구독·서비스 계정, Vault의 보고 worker URL·내부 토큰이 필요하다.
- 결정 대상: Apple·Google 앱 자산 생성 뒤 이 엔드포인트와 서비스 계정을 콘솔에 연결하고, staging에서 실제 sandbox 알림·외부 거래 보고를 허용할지.
- 추천: 독립 QA가 로컬 계약을 통과한 뒤 staging 전용 값으로 연결한다. 운영 시크릿과 production release gate는 제출 승인 전까지 넣거나 켜지 않는다.
- 미선택 위험: 코드가 있어도 실제 환불 회수와 24시간 보고는 실행되지 않는다.

## Q5. Google User Choice Billing 프로그램 가입과 기능 플래그

- 배경: Android 앱은 Google Play가 제공하는 결제 선택 화면과 외부 거래 토큰만 사용한다. 프로그램 가입·Play Console 설정이 끝나기 전 `EXPO_PUBLIC_GOOGLE_USER_CHOICE_BILLING_ENABLED=false`이며, 이때 앱은 Play 결제만 노출한다.
- 결정 대상: Google User Choice Billing 프로그램 가입과 대상 국가·앱 설정을 승인할지.
- 추천: Play 앱 식별자 확정과 정책 검토 후 가입한다. 가입·staging 왕복 성공 전에는 기능 플래그를 켜지 않는다.
- 미선택 위험: 대체결제를 켜면 Google Play 정책·API 자격 확인 단계에서 결제가 실패할 수 있다.

## Q4. Toss 콘솔 상품 ID 등록

- 배경: 서버 카탈로그, Apps in Toss, iOS·Android 클라이언트와 시험 fixture의 상품 ID를 `haenael.cheer.clover.1`, `.3`, `.5`, `.10`으로 통일했다. Toss 콘솔의 실제 상품 ID는 이번 작업에서 생성·수정하지 않았다.
- 결정 대상: 정책 충돌 Q1이 해소된 뒤 Toss 콘솔에 위 네 상품 ID와 서버 확정 가격을 등록할지.
- 추천: Q1의 공식 허용 답변 전까지 production 상품 등록과 release gate 활성화를 보류한다.
- 미선택 위험: 콘솔 상품 ID가 다르면 앱 결제 승인 후 서버 카탈로그 대조에서 거절된다.

## Q1. Apps in Toss 환가성 상품 정책 충돌

- 배경: D-056-3은 토스 인앱결제로 산 클로버를 수취인에게 적립하고 웹에서 현금 또는 기프티콘으로 교환하게 한다. Apps in Toss 공식 수익화 가이드는 현금성·환가성 상품을 금지한다.
- 결정 대상: Apps in Toss에서는 환가 불가능한 별도 상품으로 바꿀지, 토스 공식 사전 문의에서 허용 답변을 받은 뒤 현재 구조를 유지할지.
- 추천: 별도 상품으로 분리하기 전까지 `TOSS_IAP` production release gate를 OFF로 유지하고, 컨트롤러가 공식 사전 문의 초안을 회장 승인 뒤 발송한다.
- 미선택 위험: 현 구조로 제출하면 심사 반려 또는 운영 중지 위험이 있다.

## Q2. iOS·Android 앱 등록과 테스트 결제

- 배경: `apps/mobile` 구현과 로컬 export 계약은 있으나, 설정의 임시 식별자 `app.haenael`에 대응하는 App Store Connect·Google Play 앱은 이번 작업에서 생성하지 않았다. Apple bundle ID·App Store Connect 앱·Google Play 앱 생성은 외부 계정에 영구 식별자를 남기는 비가역 작업이다.
- 결정 대상: 앱 이름, iOS bundle ID, Android package name을 확정하고 콘솔 자산 생성을 승인할지.
- 추천: 식별자와 앱 이름을 승인한 뒤 콘솔 자산을 만들고, Apple sandbox·Google license tester 왕복을 독립 QA한다.
- 미선택 위험: 서버 계약만 있고 실제 iOS·Android 구매·복구·환불 경로는 미검증으로 남는다.

## Q3. 독립 검증과 공급자 환경

- 배경: 결제·마이그레이션은 다른 모델의 독립 코드리뷰가 필수지만 code-builder는 자기 산출물을 리뷰할 수 없다. Vercel provider 환경 목록 조회는 CLI가 응답 없이 대기해 2분 뒤 중단했다. Apple·Google·Toss production 시크릿 존재 여부도 값 노출 없이 재확인이 필요하다.
- 결정 대상: controller가 code-reviewer와 qa-verifier를 배정하고, 연결된 공급자 계정에서 환경 이름만 재검증할지.
- 추천: 코드리뷰 반려를 먼저 보정한 뒤 QA를 실행한다. 그 전에는 migration 적용이나 제출 준비 완료 판정을 하지 않는다.
- 미선택 위험: 로컬 green을 외부 결제·배포 준비 완료로 오인할 수 있다.

STAMP: 2026-11-18 19:2x KST | model GPT-5 Codex | agent code-builder | source 앱 채널 build 실측, Apple·Google 공식 결제 문서, Apps in Toss 공식 수익화 가이드, pipeline gate
