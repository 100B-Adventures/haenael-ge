# 해낼게 V2 앱 3채널 테스트 계획 v0.1.0

기반 포맷: `docs/eng-design/test-plan-social-viral-loop-web-first-v1.2.5.md`
STAMP: 2026-11-18 13:22 KST, GPT-5 Codex, code-builder, haenael-supabase-build.

## 통과 기준

1. DB 단위·통합: `npx supabase test db`와 앱 채널 pgTAP 전부 통과.
2. Edge Function: 정상·거절·중복·서명 위조·공급자 지연 계약 테스트 통과.
3. 웹: D-054 동의 회귀와 기프티콘 disabled/enabled 계약, 기존 빌드·단위 테스트 통과.
4. 모바일: 타입체크·단위·라우팅 통합·Android export. development build에서 sandbox 왕복을 직접 관찰한다.
5. iOS: EAS development build 또는 macOS 실기에서 StoreKit sandbox 왕복. Linux export만으로 완료 판정 금지.
6. 앱인토스: CSR 빌드, static guard, 로컬 devtools mock 로그인·IAP·공유 왕복. SDK 3.x에는 샌드박스가 없고 콘솔 QR은 실제 결제이므로 실결제 금지 동안 공급자 왕복은 `미검증`이다.
7. 결제 코드와 설계는 만든 모델과 다른 모델이 독립 리뷰한다.
8. 제출은 irreversible approval 이후 별도 단계다.

## 계층

| 계층 | 소유 | 핵심 |
|---|---|---|
| 단위 | build | 상품 매핑, 상태 전이, consent default, 딥링크 분기 |
| 통합 | build | DB 멱등·락·환불·보류, 함수 요청/응답 |
| E2E | QA | 채널 런타임→테스트 공급자→서버→수취인 잔액. 앱인토스는 실결제 승인 뒤 별도 |
| 수동 심사 체크 | ship | 가격 문구, 외부 결제 유도, 탈퇴, 정책 고지 |

## 데이터와 환경

staging Supabase만 사용한다. 테스트 구매는 Apple sandbox와 Google license tester만 허용한다. 앱인토스 SDK 3.x는 로컬 devtools mock만 사용하며 콘솔 QR 결제는 실제 과금이므로 금지한다. 실제 카드·실결제·운영 DB·스토어 제출은 금지한다. 테스트 회원과 목표를 픽스처로 만들고 종료 후 구매 원장은 보존하되 개인 입력은 제거한다.

## 회귀 범위

기존 웹 토스 결제, 현금 환전 잠금, 웰컴 클로버 제외, 친구 자동 생성, 알림톡, 공개 목표 `/g/*`, miniapp 토스 로그인·공유를 재검증한다. 동의 변경은 비회원 페이지에서 배너 0, 인증 회원에게만 배너, 거부 전 Clarity·Meta 0을 본다.

## 실패 주입

- 검증 API 10초 지연과 재시작.
- 같은 영수증 동시 20회.
- 환불 이벤트 중복·역순.
- 30일 경계 직전·정각·직후.
- Google 외부 거래 보고 장애 25시간.
- 공급사 계약키 없음, 잔액 부족, 타임아웃.
- 네트워크 오프라인과 복구.
- 환전·환불·기프티콘 3경로 동시 실행. 공통 advisory lock 뒤 총 소비량이 지급가능을 넘지 않고 교착 0.
- 기프티콘 공급사는 발송했지만 응답 유실. 잠금 유지, 상태조회 뒤 SENT, 재발송 0.
- 공급자 이벤트 누락 뒤 일일 재동기화 복구.

## 직접 관찰 증거

빌드 로그, dev 서버 로그, headless 화면·콘솔 0, DB 전후 원장, sandbox 공급자 거래 상태를 남긴다. 값·영수증·토큰은 마스킹한다. 보지 못한 채널은 `미검증`으로 기록한다.

SKILLS_USED: haenael-supabase-build, DB→함수→제품→실런타임 순서에 적용
SKILLS_SKIPPED: 없음
SOURCES/MODEL: GPT-5 Codex. FDD·API·ERD, repo QA 규칙

RUBRIC_SCORE: 독립 리뷰 재검수 대기
WEAKEST_LINE: iOS 실기와 스토어 sandbox 증거는 Linux 로컬에서 만들 수 없다.
