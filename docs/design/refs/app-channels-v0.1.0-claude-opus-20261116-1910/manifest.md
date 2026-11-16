# 레퍼런스 팩: 앱 채널 화면 v0.1.0 (iOS · Android · 앱인토스)

생성 2026-11-16 19:10~19:30 KST · claude-opus · product-designer
쓰는 곳: `docs/design/prototypes/v2-app-channels-v0.1.0-claude-opus-20261116-1930.html` (A1~A11, T1~T5)
기준 기획: `docs/plan/prd-app-channels-v0.1.2-claude-opus-20261116-1827.md` §5·§6·§9(추천안 A)

## 쓰는 법 4줄

1. 그리기 전에 이 폴더의 이미지를 Read 로 직접 연다. 이 표의 요약만 보고 그리지 않는다.
2. 화면 요소마다 `레퍼런스: <파일> → 차용 <무엇> / 버림 <무엇>` 한 줄을 산출물(검수 패널·인벤토리)에 적는다.
3. 프로토타입 STAMP 에 이 팩 경로를 남긴다.
4. 이 팩에 없는 것은 "실물 없음"으로 적는다. 후보를 지어내지 않는다.

## 이 팩의 한계 (§18.7.1)

- 전부 **공식 가이드·공식 블로그 페이지**다. 남의 앱을 실제로 움직여 찍은 화면(기본·목록 참·빈 상태·오류 3장)은 없다. 이 서버(리눅스 114)에는 iOS 시뮬레이터·안드로이드 기기가 없어 직접 구동하지 못했다.
- 토스 가이드의 예시 이미지(toss-uxguide-*)는 실제 미니앱 화면을 잘라 Do/Don't 로 붙인 것이라 동작 화면에 가장 가깝다. 그 밖의 Apple·Google·web.dev 이미지는 **"소개 페이지(동작 미확인)"** 로 센다. 이 줄을 근거로 쓴 설계는 미검증으로 센다.
- **국내 앱의 푸시 사전 안내 실화면은 못 구했다**(토스 가이드의 나쁜 예 1장 제외). 웹 검색에 잡히는 것은 글 설명뿐이었다. 다음 판에서 실기기 캡처로 채울 자리다.

## 파일 표

| 파일 | 출처 URL | 이 화면에서 볼 것 | 등급 |
|---|---|---|---|
| toss-uxguide-01.png | https://developers-apps-in-toss.toss.im/design/consumer-ux-guide | 내비 바 로고·이름 표기(파트너 로고 추가 금지) | 가이드 예시(실미니앱 잘라냄) |
| toss-uxguide-02.png | 같은 페이지 | 탭바는 토스 플로팅 형태, 2~5개 | 가이드 예시 |
| toss-uxguide-03.png · 04.png | 같은 페이지 | **진입하자마자 뜨는 바텀시트 금지**. 나쁜 예 = 들어오자마자 "신용퀴즈 나올 때마다 알려드릴게요" 알림 동의 시트(닫기 / 동의하기) | 가이드 예시 |
| toss-uxguide-05.png · 06.png | 같은 페이지 | 뒤로가기를 막는 시트 금지 | 가이드 예시 |
| toss-uxguide-07.png · 08.png | 같은 페이지 | 나갈 길이 없는 화면 금지(항상 닫기·뒤로) | 가이드 예시 |
| toss-uxguide-09.png · 10.png | 같은 페이지 | 광고 배치 규칙(우리는 광고 0이라 참고만) | 가이드 예시 |
| toss-uxguide-11.png | 같은 페이지 | 무엇이 일어날지 모르는 모호한 버튼 문구 금지 | 가이드 예시 |
| toss-uxguide-12.png | 같은 페이지 | 해요체, 지나친 높임 금지. 다이얼로그 왼쪽 버튼 "닫기" | 가이드 예시 |
| toss-blog-login-notice-01.png | https://toss.im/apps-in-toss/blog/mini-app-login-notification-timing | 토스 UX 원칙 5가지. 첫째 "로그인·알림 동의가 정말 지금 필요한가" | 공식 블로그 |
| toss-blog-login-notice-02.png | 같은 글 | Don't = 진입하자마자 토스 로그인 시트 / Do = 콘텐츠부터 보여 주고 필요한 순간에 로그인 | 공식 블로그(실미니앱 화면) |
| toss-blog-login-notification-timing.png | 같은 글 전체 캡처 | 알림 동의는 사용자가 가치를 본 직후에 요청 | 공식 블로그 |
| toss-navigationbar-doc.png | https://developers-apps-in-toss.toss.im/documentation/common/navigationbar | 비게임 내비 바: 흰 배경, 왼쪽 로고+이름, 오른쪽 ···(더보기)와 X. withBackButton, theme light/dark | 공식 문서 |
| toss-navigationbar-nongame.png | 같은 페이지 | 비게임 내비 바 변형 그림 | 공식 문서 |
| apple-hig-managing-notifications.png | https://developer.apple.com/design/human-interface-guidelines/managing-notifications | 보내기 전에 허락을 받아야 하고, 사람은 설정에서 언제든 바꾼다. 방해 수준(Passive·Active·Time Sensitive) | 소개 페이지(동작 미확인) |
| apple-hig-img-patterns-managing-notifications-intro.png | 같은 페이지 이미지 | 장식 이미지. 근거로 쓰지 않음 | 소개 페이지 |
| apple-hig-privacy-permission.png | https://developer.apple.com/design/human-interface-guidelines/privacy | 권한 요청은 그 기능이 필요한 순간에. 시스템 창 앞의 사전 안내 화면은 허용되나 "허용" 대신 다른 말(계속)로 시스템 창과 헷갈리지 않게 | 소개 페이지(동작 미확인) |
| apple-hig-img-foundations-privacy-intro.png | 같은 페이지 이미지 | 장식 이미지 | 소개 페이지 |
| apple-hig-sign-in-with-apple.png | https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple | Apple 로그인 버튼은 다른 로그인 버튼과 같은 크기·같은 위계 이상. 검정·흰색·테두리 3종, 로고+"Apple로 로그인" | 소개 페이지(동작 미확인) |
| apple-hig-img-technologies-SIWA-intro.png | 같은 페이지 이미지 | Apple 버튼 모양 | 소개 페이지 |
| apple-hig-ratings-reviews.png | https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews | 리뷰 요청은 시스템 창만, 작업을 마친 뒤, 오류 직후 금지, 버튼으로 요청하지 않음 | 소개 페이지(동작 미확인) |
| apple-hig-img-ratings-and-reviews-ios-alert.png | 같은 페이지 이미지 | **시스템 리뷰 창 실물 모양**(별 5개 + 나중에) | 시스템 UI 실물 |
| apple-account-deletion.png | https://developer.apple.com/support/offering-account-deletion-in-your-app/ | 계정을 만들 수 있는 앱은 **앱 안에서 삭제를 시작**하게 해야 한다. 규제 산업이 아니면 전화·메일·상담으로 보내면 안 된다. Apple 로그인 토큰 회수 | 공식 문서 |
| android-notification-permission.png | https://developer.android.com/develop/ui/views/notifications/notification-permission | Android 13+ POST_NOTIFICATIONS. 허용 / 허용 안함 / 밀어서 닫기. 새로 설치한 앱은 알림이 꺼진 상태. 권한이 필요한 이유를 먼저 설명하라 | 공식 문서 |
| webdev-push-permission-ux.png | https://web.dev/articles/push-notifications-permissions-ux | 페이지 열자마자 권한 요청 금지, 맥락 있는 사전 안내(이중 허락) | 공식 글 |
| webdev-when-first-load-page-c6daa695515cb.png | 같은 글 이미지 | 나쁜 예: 첫 로드 즉시 권한 창 | 공식 글 예시 |
| webdev-owen-campbell-moores-exa-7047e2dfb6c6.png | 같은 글 이미지 | 좋은 예: 결제 완료 직후 "항공편 지연 알림 받기" 체크(가치를 본 뒤 묻기) | 공식 글 예시 |
| webdev-the-settings-panel-googl-bf491e62b232f.png | 같은 글 이미지 | 설정 화면에서 알림을 켜고 끄는 자리 | 공식 글 예시 |

## 적용 계획 (생성 전에 적음, §18.9 ⓪) · 적용 결과 (생성 뒤 채움, ③-b)

| 요소 | 적용 대상 | 레퍼런스 | 차용할 것 | 버릴 것 | 적용 결과 |
|---|---|---|---|---|---|
| 첫 실행 소개 | A1 `a1intro` | toss-blog-login-notice-02.png | 첫 화면에서 로그인을 묻지 않고 가치(워드맵)를 먼저 보인다. "시작하기" 1개 → 목표 쓰기 | 여러 장 넘기는 온보딩 캐러셀(PRD 가 1화면으로 못박음) | `a1intro` 후보 A·B·C 3개, 셋 다 버튼 2개(시작하기 / 이미 계정이 있어요) 통제 |
| 로그인 시트 | A2 `a2login` | apple-hig-sign-in-with-apple.png | Apple 버튼을 카카오와 같은 높이·폭·위계, 검정 채움, 로고+문구 | Apple 버튼만 크게 두는 것, 이메일 입력 칸 | iOS 는 두 버튼 같은 크기, Android 는 카카오만(Apple 선택 사항) |
| 푸시 사전 안내 | A3 `a3push` | apple-hig-privacy-permission.png · android-notification-permission.png · webdev-owen-campbell-moores-exa-7047e2dfb6c6.png · toss-uxguide-03.png | 가치를 본 직후(첫 목표 저장 직후)에 묻는다. 사전 안내 버튼은 "알림 받기"(시스템 창의 "허용"과 다른 말). 무엇이 올지 실제 알림 모양을 미리 보인다 | 진입 즉시 시트(toss-uxguide-03 나쁜 예), 사전 안내 없이 바로 시스템 창 | 후보 A(바텀시트+잠금화면 미리보기, 추천)·B(전체 화면)·C(저장 완료 화면 안 인라인 카드) |
| 시스템 권한 창 | A3 | android-notification-permission.png | Android 13 "허용 / 허용 안함" 2버튼 모양, iOS 는 "허용 안 함 / 허용" 알림창 | 시스템 창 문구를 우리가 바꾸는 것(OS 가 정함) | 채널 칩에 따라 iOS·Android 모양 전환 |
| 잠금화면 푸시 | A4 `a4push` | apple-hig-managing-notifications.png | 한 앱의 알림 묶음, 방해 수준 Active(기본) | Time Sensitive 남용(응원은 급하지 않다) | 금액 없는 본문 + 묶음 "응원이 3개 더 왔어요" |
| 리뷰 요청 | A7 `a7review` | apple-hig-img-ratings-and-reviews-ios-alert.png · apple-hig-ratings-reviews.png | 시스템 창 그대로(별 5개 + 나중에), 성취 직후 | 우리 화면의 "별점 주세요" 버튼, 오류 직후 요청 | 워드맵 위 시스템 창 모양 |
| 알림 설정 | A9 `a9notif` | webdev-the-settings-panel-googl-bf491e62b232f.png · apple-hig-managing-notifications.png | 종류별 개별 토글, 시스템 권한이 꺼졌으면 맨 위에 알리고 설정으로 보냄 | 마케팅 알림 기본 켬 | 3토글(응원 도착·환전 상태·친구 맺어짐) + 권한 꺼짐 띠 |
| 계정 삭제 | A11 `a11delete` | apple-account-deletion.png | 앱 안에서 삭제를 시작하고 끝낸다. 전화·메일 요구 금지 | 웹의 "고객센터 문의로 접수" 문구(CONFLICT 참조) | 앱 안 탈퇴 신청 + 남은 클로버·진행 중 환전 차단 |
| 토스 인트로 | T1 `t1intro` | toss-blog-login-notice-01.png · toss-blog-login-notice-02.png · toss-uxguide-07.png | 서비스 설명 1화면 + 토스 로그인 버튼 1개. 거부하면 인트로로 오류 1줄 | 카카오·이메일 로그인, 진입 즉시 로그인 시트 | 1버튼 인트로 + 동의 거부 상태 |
| 토스 내비 바 | T5 (T1~T4 공통) | toss-navigationbar-doc.png · toss-navigationbar-nongame.png · toss-uxguide-01.png | 흰 배경, 왼쪽 로고+"해낼게", 오른쪽 ··· · X, 라이트 고정 | 파트너 로고 추가, 다크 테마 | 앱인토스 프레임 전부 같은 내비 바 |
| 토스 탭바 | T2 `t2home` | toss-uxguide-02.png | 토스 플로팅 탭바, 4개 | 웹 고정 탭바 모양 | 떠 있는 둥근 탭바 4개 |
| 토스 다이얼로그 | T4 `t4word` | toss-uxguide-12.png · toss-uxguide-05.png | 왼쪽 버튼 "닫기", 해요체, 뒤로가기로 닫힘 | "취소"·"아니오" | 하루 3건 상한 다이얼로그 |
| 토스 공유 | T3 `t3share` | 실물 없음 | 토스 공유 시트 실화면을 구하지 못함. 공유 시트는 토스 앱이 띄우는 시스템 UI 로 보고 모양을 그리지 않고 "토스 공유 창" 자리 표시만 | | 자리 표시 + 공유 취소 상태 |
| 딥링크 초대 | A5 `a5invite` | 실물 없음 | 카카오톡 링크 → 앱 열림은 OS 동작이라 근거 화면 없음. 웹 `inviteaccept` 를 그대로 쓴다 | | 웹 화면 재사용 + 만료·이미 친구 상태만 새로 |
| 오프라인·강제 업데이트 | A8 `a8offline` · A10 `a10update` | 실물 없음 | 국내 앱 실화면 미확보. 기존 시안의 결제 실패(payfail) 화면 구조를 계승 | | 계승 구조로 그림, 미검증 |
