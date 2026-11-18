# 해낼게 V2 모바일 앱 개발 브리프 v3

STAMP: 2026-11-18 17:40 KST, GPT-5 Codex, code-builder, `haenael-supabase-build`·`verify`.

- 목적: 웹에서 검증된 목표와 응원 경험을 iOS·Android 네이티브 앱으로 연결해, 앱 안에서 로그인부터 응원 결제·알림·탈퇴까지 끝낸다.
- 달성 기준: Expo 57 앱이 실제 렌더되고, Apple 로그인·목표·응원·스토어 결제 영수증 검증·Android 대체결제·푸시·딥링크·오프라인·강제 업데이트·계정 삭제 화면의 정상/거절 계약이 테스트된다.
- 제약: 앱 식별자는 승인 전 임시값 `app.haenael`이며 `app.config.ts` 한 곳에만 둔다. 실결제, 스토어 제출, 콘솔 앱 생성, 운영 배포를 하지 않는다. 서버 원장과 `verify-store-purchase`는 커밋 `1258dfa` 그대로 둔다. 가장 어려운 지점은 네이티브 결제 공급자 계정이 없는 상태에서 클라이언트와 서버의 결합 계약을 정확히 닫는 것이다.
- 필요한 것: PRD v0.2.0, 앱 채널 FDD/API/테스트 설계 v0.1.0, 앱 프로토타입 v0.1.0, 웹 결제 프로토타입 v3.1.1, DESIGN.md, haejo-danta Expo 57 선례는 확보했다. Apple·Google·Toss sandbox 계정과 확정 앱 식별자는 아직 없으므로 실거래 왕복은 이번 판 범위 밖이다.

## 이번 판 판단

- A6·T2·T4의 결제 없음 표현은 폐기하고, 앱 화면 골격만 상속한다.
- 결제 UI는 웹 결제창을 네이티브 바텀시트 구조로 옮긴다.
- iOS는 StoreKit만, Android는 Google Play와 토스페이먼츠 선택을 노출한다.
- 네이티브 공급자 결과는 앱에서 적립하지 않고 `verify-store-purchase` 또는 대체결제 확인 API가 성공한 뒤에만 완료로 표시한다.

## 기반 판

- 직전 개발 판: 모바일 앱 없음. 서버 결제 원장과 검증 슬라이스 `1258dfa`.
- 상류 최신 판: PRD `docs/plan/prd-app-channels-v0.2.0-claude-opus-20261116-2140.md`, 기술설계 `docs/eng-design/*app-channels-v0.1.0-gpt-codex-20261118*`, 디자인 `docs/design/prototypes/v2-app-channels-v0.1.0-claude-opus-20261116-1930.html` 및 `DESIGN.md`.
- 반려/변경 사유: D-055·D-056에 따라 앱 결제 없음 표현을 폐기한다.

기반 포맷: `docs/build/brief-v2-gpt-codex-20261112-1623.md`.
