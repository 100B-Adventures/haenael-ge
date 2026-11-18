# 해낼게 V2 앱 3채널 테스트 케이스 v0.1.0

기반 포맷: `docs/eng-design/test-cases-social-viral-loop-web-first-v1.2.5.md`
STAMP: 2026-11-18 13:22 KST, GPT-5 Codex, code-builder, haenael-supabase-build.

## 결제

| ID | 시험 항목 | 기대 |
|---|---|---|
| AP-01 | Apple sandbox 3클로버 정상 | 서버 검증 뒤 적립 3, 응원자 잔액 0 |
| AP-02 | 같은 Apple 거래 동시 재전송 | cheer·원장·구매 각 1건 |
| AP-03 | 취소·위조·다른 bundle 영수증 | 적립 0, 안정 오류 코드 |
| AP-04 | Play sandbox 정상·중복 | 1회 적립, acknowledge 완료 |
| AP-05 | Android 토스 대체 결제 | 1회 적립, 외부 거래 보고 큐 1건 |
| AP-06 | Google 외부 거래 토큰 없음 | 승인 전 거절, 적립 0 |

## 환불·보류

| ID | 시험 항목 | 기대 |
|---|---|---|
| RF-01 | 결제 29일째 | 지급가능 제외, D-1 표시 |
| RF-02 | 30일 정각 | 지급가능 포함 |
| RF-03 | 보류 중 환불 | 보류 상쇄, 잔액 감소, 음수 0 |
| RF-04 | 환전 뒤 환불·잔액 충분 | 원장 회수 1회 |
| RF-05 | 환전 뒤 환불·잔액 부족 | 화면 잔액 0 이상, 회수 큐 OPEN |

## 인증·푸시·딥링크·UX

| ID | 시험 항목 | 기대 |
|---|---|---|
| AU-11 | Apple 로그인·이메일 가리기 | 가입·초안 복구 |
| AU-12 | Kakao 취소 | 초안 보존 |
| AU-13 | 앱인토스 로그인 화면 | 토스 외 로그인 0 |
| PS-01 | 푸시 허용 | 토큰 등록·토글 3개 ON |
| PS-02 | 홈 4회 방문 | 프라이머 숨김 |
| PS-03 | 응원 4건/10분 | 푸시 최대 2건 |
| PS-04 | 금액 비공개 | 본문 금액·클로버 수 0 |
| PS-05 | 환전 푸시 OFF | 푸시 0, 앱 알림 1 |
| DL-01 | 설치 회원 초대 링크 | 앱 수락 화면 |
| DL-02 | `/g/*` | 브라우저 웹 공개 목표 |
| DL-03 | 앱 미설치 초대 | 웹 수락 유지 |
| DL-04 | 만료 초대 | 안내 후 홈 이동 |
| UX-01 | 첫 실행 | A1 한 번 |
| UX-02 | 오프라인 | 1초 안 화면, 복구 자동 재시도 |
| UX-03 | 최소 버전 미달 | 업데이트 외 동작 차단 |
| UX-04 | 리뷰 조건 충족 | 시스템 리뷰 API 1회 |
| UX-05 | 120일 재요청 | 요청 0 |
| UX-06 | 앱 안 탈퇴 | 접수·로그아웃·푸시 토큰 삭제 |
| UX-07 | 보류/환전 진행 중 탈퇴 | 상태 안내와 기존 차단 규칙 |

## 앱인토스

| ID | 시험 항목 | 기대 |
|---|---|---|
| TI-01 | 토스 로그인 | V2 세션 |
| TI-02 | 로그인 거부 | 인트로·오류 한 줄 |
| TI-03 | 번들 static guard | cashout·잔액·외부 결제 0 |
| TI-04 | 로컬 devtools mock IAP | 지급 콜백·멱등 서버 계약·미결 주문 복구. 실제 공급자 왕복은 미검증 |
| TI-05 | IAP 중복 토큰 | 적립 1회 |
| TI-06 | 공유 | `intoss://`, private scheme 0 |
| TI-07 | ads 플래그 OFF/ON | OFF SDK 미적재, ON 지정 슬롯만 |

## 동의·기프티콘

| ID | 시험 항목 | 기대 |
|---|---|---|
| CN-01 | 비로그인 첫 방문 | 배너 0, consent default denied |
| CN-02 | 가입 직후 | 회원 레이아웃에서 배너 1 |
| CN-03 | 미동의 | Clarity·Meta script 0 |
| CN-04 | 동의 | GA update granted, Clarity·Meta 각 1 |
| CN-05 | 거부 | 네 저장소 전부 denied 유지 |
| GF-01 | 공급사 OFF | 버튼 준비중, 주문·잠금 0 |
| GF-02 | 계약키 없음 직접 호출 | 503, DB 쓰기 0 |
| GF-03 | 정상 교환 | 잠금 1, 공급자 요청 1, SENT |
| GF-04 | 공급자 실패 | 잠금 해제, 잔액 복구 |
| GF-05 | 중복 request_key | 교환·발송 각 1회 |

## PRD 예약 ID 48개 1:1 대조

아래 ID가 상류 RTM 정본이다. 앞 표의 짧은 ID는 실행 묶음 이름일 뿐 추적성 ID를 대체하지 않는다. D-056이 PRD v0.2.0의 앱인토스 “적립 0” 결정을 대체했으므로 TC-TOSS-04는 수취인 클로버 적립과 30일 보류를 기대한다.

| ID | 계약 |
|---|---|
| TC-APP-01-1 | Apple 승인→회원결합·서버검증→수취인 적립, 응원자 잔액 0 |
| TC-APP-01-2 | Apple 중복 영수증 1회 적립 |
| TC-APP-01-3 | 취소 적립 0, 입력 유지 |
| TC-APP-01-4 | 검증 지연·재실행 복구 |
| TC-APP-01-5 | iOS 외부 결제 유도 문구 0 |
| TC-APP-02-1 | Play와 대체결제 선택 UI·가격·고지 |
| TC-APP-02-2 | 대체결제 적립과 Google 24시간 보고 완료 |
| TC-APP-02-3 | Play 결제 적립·회원결합·중복 방지 |
| TC-APP-03-1 | 모든 앱 결제 29일째 보류 |
| TC-APP-03-2 | 30일 정각 지급가능 |
| TC-APP-03-3 | 보류 중 환불 회수 |
| TC-APP-03-4 | 환전 뒤 환불 회수·부족분 큐 |
| TC-APP-04-1 | Kakao·Apple 로그인 동등 위계 |
| TC-APP-04-2 | Apple 이메일 가리기 가입 |
| TC-APP-04-3 | 인증 취소 뒤 목표 초안 보존 |
| TC-APP-05-1 | 푸시 사전안내→토큰·토글 |
| TC-APP-05-2 | 미응답 3회 뒤 숨김·조건부 재안내 |
| TC-APP-05-3 | 푸시 거부 뒤 알림톡·배지 유지 |
| TC-APP-05-4 | 60초 내 금액 없는 푸시→워드맵 |
| TC-APP-05-5 | 10분 4건을 최대 2건으로 묶음 |
| TC-APP-05-6 | 종류 토글 OFF면 푸시 0 |
| TC-APP-06-1 | 설치 회원 초대 링크→앱 |
| TC-APP-06-2 | `/g/*`→브라우저 웹 |
| TC-APP-06-3 | 미설치 초대→웹 |
| TC-APP-06-4 | 만료 초대 안내→홈 |
| TC-APP-07-1 | 응원 3건 워드맵 뒤 시스템 리뷰 1회 |
| TC-APP-07-2 | 120일 안 재요청 0 |
| TC-APP-07-3 | 오류·환불 직후 리뷰 0 |
| TC-APP-08-1 | 첫 실행 소개 1회 |
| TC-APP-08-2 | 소개 본 기기 건너뜀 |
| TC-APP-08-3 | 오프라인 1초 내 안내·자동 복구 |
| TC-APP-08-4 | 최소 버전 미달 강제 업데이트 |
| TC-APP-09-1 | 앱 안 탈퇴 접수·로그아웃·토큰 삭제 |
| TC-APP-09-2 | 보류·환전 진행 중 안내와 차단 |
| TC-TOSS-01-1 | 인트로와 토스 로그인만 |
| TC-TOSS-01-2 | 토스 identity→V2 회원 홈 |
| TC-TOSS-01-3 | 동의 거부→인트로 오류 한 줄 |
| TC-TOSS-02-1 | 번들에 SSR·iframe·원격 WebView·외부 도메인 렌더·cashout·잔액 0 |
| TC-TOSS-02-2 | 화면 금액·잔액·교환 UI 0 |
| TC-TOSS-03-1 | 공유는 `intoss://`, private scheme 0 |
| TC-TOSS-04-1 | D-056-3 토스 IAP→수취인 클로버 적립·30일 보류 |
| TC-TOSS-04-2 | 같은 구매 토큰 재전송 적립 1회 |
| TC-TOSS-04-3 | 환불 시 클로버 회수·부족분 큐 |
| TC-TOSS-04-4 | 비로그인 결제→토스 로그인 |
| TC-TOSS-05-1 | 광고 모드 화면당 1개·광고 표시 |
| TC-TOSS-05-2 | 광고 시청·클릭 보상 0 |
| TC-TOSS-05-3 | sandbox 테스트 광고 ID만 |
| TC-TOSS-06-1 | CSR/SSG 번들·T5 내비·라이트 모드 정적 점검 |

## 정책·경합 추가 사례

| ID | 시험 항목 | 기대 |
|---|---|---|
| SEC-01 | production gate OFF에서 유효 영수증 | 적립 0, `channel_release_disabled` |
| SEC-02 | 다른 회원의 valid receipt 선점 | intent 결합 불일치, 적립 0 |
| SEC-03 | 환전·환불·기프티콘 동시 실행 | 총 소비량 제한, 중복·교착 0 |
| SEC-04 | 부분환불 1회 뒤 나머지 부분환불 | 누적 금액·클로버가 구매 상한 이하, 마지막에만 REFUNDED |
| SEC-05 | 같은 부분환불 이벤트 재전송 | 이벤트·원장 상쇄 각 1회 |
| SEC-06 | 부분환불 이벤트를 역순 수신 | 공급자 발생시각과 누적값 기준으로 같은 최종 원장 |
| SEC-07 | 누적 환불액·클로버가 구매량 초과 | `invalid_refund_amount`, 추가 회수 0 |
| SEC-08 | mobile-cashout에 다른 회원 ID를 주입 | 회원 ID 입력을 받지 않고 JWT `sub`만 사용 |
| SEC-09 | mobile-cashout 채널 gate OFF | `cashout_channel_disabled`, 환전 요청·원장 0 |
| SEC-10 | 같은 request_key와 다른 금액 | `request_key_conflict`, 환전 요청 1건 유지 |
| SEC-11 | 변조·만료된 계좌 vault token | `cashout_account_invalid`, 민감 원문 로그 0 |
| GF-06 | 발송 성공 뒤 응답 유실 | 재조정 유지, 재발송 0 |
| GF-07 | 상태조회가 미발송 확정 | 그때만 잠금 해제 |

SKILLS_USED: haenael-supabase-build, 정상·거절·경합 계약 테스트에 적용
SKILLS_SKIPPED: 없음
SOURCES/MODEL: GPT-5 Codex. PRD AC, FDD·API·ERD

RUBRIC_SCORE: 독립 리뷰 재검수 대기
WEAKEST_LINE: Apple·Google 테스트 계정과 앱인토스 실결제 승인이 준비되기 전에는 외부 응답 fixture의 정확한 필드 집합이 미검증이다.
