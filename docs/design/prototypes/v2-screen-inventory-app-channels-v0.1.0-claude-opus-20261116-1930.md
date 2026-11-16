# 해낼게 앱 채널 화면 인벤토리 v0.1.0 (iOS · Android · 앱인토스)

status: candidate (승인 전)
생성: 2026-11-16 19:30 KST · model: claude-opus · agent: product-designer
기준 산출물: 웹 화면 = `v2-screen-inventory-v3.1.1-claude-opus-20261116-1855.md` (그 표·규칙은 그대로 유효). 이 문서는 앱에서 **달라지는 것만** 적는다(D-049).
기획: `docs/plan/prd-app-channels-v0.1.2-claude-opus-20261116-1827.md` §5 화면 목록 · §6 기능 요구 · §9 결정 3건(추천안 A: 앱 안 결제 0, 앱인토스만 돈 없는 응원 한마디, 일반 번들).
대상 프로토타입: `v2-app-channels-v0.1.0-claude-opus-20261116-1930.html` (요약 층 `…-manifest.md`, 후보 비교 `…-compare.html`)
레퍼런스 팩: `docs/design/refs/app-channels-v0.1.0-claude-opus-20261116-1910/manifest.md`
기반 포맷: 3.1.1 인벤토리

## 1. 보는 법

- 콘솔의 **채널 칩**(웹 / iOS / Android / 앱인토스)이 흐름 전체를 바꾼다. 같은 웹 화면이 채널에 따라 결제 요소를 숨기거나 토스 내비 바를 얹는다.
- URL: `?ch=ios|android|toss` · `?cand=a1intro:B,a3push:A` · `?bare=1`(검수 셸 없이 제품 화면만).
- 새 화면은 13개(A1~A5, A7~A11, T1, T3, T4). A6·T2·T5 는 새 화면이 아니라 채널 칩으로 웹 화면에 얹은 규칙이다.

## 2. 화면 목록

| ID | 화면 id | 채널 | 상태(상태 칩) | 진입 → 이탈 | 레퍼런스 → 차용 / 버림 |
|---|---|---|---|---|---|
| A1 첫 실행 소개 | `a1intro` | iOS·Android | 후보 A(워드맵 1장, 추천·기본) · B(3단계 목록) · C(목표 쓰기 바로) | 앱 첫 실행 → "시작하기" 목표 쓰기 / "이미 계정이 있어요" A2 | toss-blog-login-notice-02.png → 차용 로그인 전에 가치 먼저, 버튼 1개 / 버림 여러 장 캐러셀 |
| A2 로그인 시트 | `a2login` | iOS·Android | 기본 · Apple(iOS) · Android(카카오만) · 취소 | 목표 저장 시도 → 로그인 → 홈 | apple-hig-sign-in-with-apple.png → 차용 Apple 버튼을 카카오와 같은 크기·위계로 / 버림 이메일 입력 칸 |
| A3 푸시 사전 안내 | `a3push` | iOS·Android | 후보 A(전면) · B(바텀시트) · C(홈 안 카드, 추천·기본) · 시스템 창 iOS/Android · 거부 · 두 번째 기회 | 첫 목표 저장 직후 홈 → "다음" → 시스템 권한 창 | apple-hig-privacy-permission.png · android-notification-permission.png · webdev-owen-campbell-moores-*.png → 차용 가치를 본 직후, 버튼 1개가 시스템 창을 연다 / 버림 "허용" 문구의 자체 버튼, 닫기 버튼 |
| A4 잠금화면 푸시 | `a4push` | iOS·Android | 기본 · 열림 | 응원 도착 → 탭 → 응원 워드맵 | apple-hig-managing-notifications.png → 차용 앱별 묶음, Active 수준 / 버림 Time Sensitive |
| A5 딥링크 | `a5invite` | iOS·Android | 기본(카카오톡 대화) · 만료 · 이미 친구 | /invite → 앱 초대 수락(웹 `inviteaccept`) · /g → 브라우저 공개 목표(A6) | 실물 없음 → 웹 `inviteaccept` 재사용, 만료·이미 친구만 신규 |
| A6 공개 목표(앱) | `goalpublic` + 채널 iOS | iOS·Android | — | 앱 안에서 결제 버튼·결제창·재로그인 0개 | PRD FR-APP-01 (레퍼런스 아님, 규칙) |
| A7 리뷰 요청 | `a7review` | iOS·Android | 기본(워드맵) · 시스템 창(iOS) · Android 시트 · 완료 | 응원 3개째 워드맵 성장 직후 → 시스템 창 | apple-hig-img-ratings-and-reviews-ios-alert.png → 차용 시스템 창 그대로, 성취 직후 / 버림 자체 별점 버튼 |
| A8 오프라인 | `a8offline` | iOS·Android | 기본 · 서버 오류 · 다시 시도 중 | 연결 끊김 → "다시 시도" → 홈 | 실물 없음 → 기존 payfail 화면 구조 계승 |
| A9 알림 설정 | `a9notif` | iOS·Android | 기본 · 시스템 권한 꺼짐 | 마이 → 알림 설정 | webdev-the-settings-panel-*.png → 차용 종류별 토글 / 버림 마케팅 알림 기본 켬 |
| A10 강제 업데이트 | `a10update` | iOS·Android | 기본 | 최소 버전 미만 실행 → 스토어 | 실물 없음 → payfail 구조 계승 |
| A11 계정 삭제 | `a11delete` | iOS·Android | 기본 · 확인 창 · 남은 클로버 있음 | 마이 → 회원 탈퇴 → 확인 → 접수 | apple-account-deletion.png → 차용 앱 안에서 시작·완료 / 버림 웹의 "고객센터 문의로 접수" |
| T1 토스 인트로 | `t1intro` | 앱인토스 | 기본 · 동의 · 거부 | 미니앱 진입 → 토스 로그인 → 홈(T2) | toss-blog-login-notice-01/02.png · toss-uxguide-07.png → 차용 설명 1화면 + 토스 로그인 1개 / 버림 카카오·이메일 로그인 |
| T2 토스 홈 | `home` + 채널 앱인토스 | 앱인토스 | — | 잔액·환전·카카오 0, 공유 = 토스로 공유 | toss-uxguide-02.png → 차용 플로팅 탭바 / 버림 웹 고정 탭바 |
| T3 토스 공유 | `t3share` | 앱인토스 | 기본 · 공유 창 | 홈 "토스로 공유" → 공유 창(자리 표시) | 실물 없음 → 토스가 띄우는 시스템 UI 로 보고 자리 표시만 |
| T4 응원 한마디 | `t4word` | 앱인토스 | 기본 · 저장됨 · 비회원 · 하루 3건 상한 | 공개 목표 → 한마디(40자) → 워드맵 단어 | toss-uxguide-12.png → 차용 다이얼로그 왼쪽 "닫기", 해요체 / 버림 "취소" |
| T5 토스 내비 바 | 전 화면 + 채널 앱인토스 | 앱인토스 | ··· 메뉴 · 닫힘 | 상단 고정 | toss-navigationbar-doc.png → 차용 왼쪽 로고+이름, 오른쪽 ··· · X / 버림 파트너 로고, 다크 |

## 3. 채널별로 웹 화면에서 숨기는 것

| 표시 | 숨는 채널 | 대상 |
|---|---|---|
| `data-hide-app` | iOS · Android · 앱인토스 | 공개 목표 응원 결제 버튼, 결제창, 재로그인 안내 |
| `data-hide-toss` | 앱인토스만 | 홈 잔액·환전, 목표 상세 잔액·환전 구역, 마이 환전 내역, 연결 화면 카카오 버튼, 홈 "응원 링크 공유"(→ "토스로 공유") |
| `data-hide-native` | iOS · Android 만 | 마이 웹 설정 묶음과 웹 탈퇴 버튼(→ 알림 설정 A9, 앱 안 탈퇴 A11) |

## 4. 충돌과 열린 결정

| # | 내용 | 시안의 처리 | 누가 정하나 |
|---|---|---|---|
| C1 | Apple HIG 사전 안내 규칙(버튼 1개, "허용" 금지, 닫기 금지) ↔ PRD 의 "알림 받기 / 나중에" 2버튼 | 후보 C 는 "다음" 1버튼. PRD 문구 수정 필요 | 기획 개정 |
| C2 | Apple 앱 안 계정 삭제 요구 ↔ 웹의 "고객센터 문의로 접수" | A11 은 앱 안에서 접수까지. 서버 삭제 함수가 필요 | 기술설계 |
| C3 | Supabase 싱가포르 리전 ↔ 처리방침 "서울" 표기 | 화면 범위 밖. 국외 이전 고지 필요 | 회장 판단(기존 송부) |
| 대기 | 홈 전화번호 동의 배너 | 손대지 않음 | 회장 Q10 |

## 5. 미확인

- 실제 앱 운영 화면 캡처 0건. 레퍼런스는 전부 공식 가이드(동작 미확인 소개 페이지 포함).
- 국내 앱 푸시 사전 안내 실화면 없음. 후보 A·B·C 허용률 비교는 측정 전.
- 토스 공유 시트, 오프라인·강제 업데이트 화면은 실물 레퍼런스 없음.
- Android 리뷰 시트 모양은 근사치(OS 가 정함).
- A5 만료·이미 친구 문구는 웹 문구와 대조 안 함.
- 앱인토스 동의 항목은 기술설계로 넘김.

## 6. 깨끗한 프레임

`docs/design/clean-frames/v2-app-channels-v0.1.0-claude-opus-20261116-1930/` 43장, `<화면>[-상태|-채널]@390x844.png`(실제 780×1688, 2배).
a1intro-A/B/C · a2login(-apple/-android/-cancel) · a3push-A/B/C(-sys-ios/-sys-android/-denied/-second) · a4push(-open) · a5invite(-expired) · a6-goalpublic-ios · a7review(-base/-android) · a8offline(-server) · a9notif(-off) · a10update · a11delete(-confirm/-cashout) · mypage-ios · t1intro(-consent/-denied) · t2home · t2goaldetail · t2goalpublic · t3share(-sheet) · t4word(-saved/-guest/-limit).
지원 viewport 는 390(앱 전용 화면). 웹 화면의 1024·1440 은 3.1.1 기준 그대로.
