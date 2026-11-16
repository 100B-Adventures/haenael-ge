# 해낼게 V2 소셜 바이럴 루프 화면 인벤토리 3.1.1 (3.0.0 시절 차이 역반영)

status: candidate (승인 전)
생성: 2026-11-16 18:55 KST · model: claude-opus · agent: product-designer
기준 산출물: `v2-screen-inventory-v3.1.0-claude-opus-20261116-1816.md` (컨트롤러 수락 3.1.0). 이 문서는 3.1.0 의 바뀐 행만 고친다. 나머지 표·규칙은 3.1.0 그대로 유효하다.
대상 프로토타입: `v2-social-viral-loop-v3.1.1-claude-opus-20261116-1855.html` (요약 층 `…-manifest.md`)
운영 대조: `captures/v2-2.3.1-staging-20261116/`(홈) + `captures/v2-2.3.1-local-paysheet-20261116/`(결제창, 결제 플래그 켠 로컬 개발 서버, staging DB, 열기만)
기반 포맷: 3.1.0 인벤토리

## 1. 3.1.0 → 3.1.1 변경표

| 화면 | 요소 | 운영 출처 | 판정 근거 |
|---|---|---|---|
| 홈 `home` | 목표 카드 모양: 사진 128px 를 카드 안 여백(16px) 안에 radius 12 로, 클로버 표식은 사진 오른쪽 아래 | `goal/MyGoalListCard.tsx` · `social/GoalCover.tsx` · `globals.css .goal-cover--banner` | 코드 + staging 홈 캡처 |
| 홈 | D-N·D+N 칩 = 채운 초록(흰 글씨), 진행 중 칩 = 따뜻한 회색(#7a7363) | `goal/DdayChip.tsx`(tone clover 기본, StatusChip ACTIVE) | 코드 + 캡처 |
| 홈 | 제목 15px 한 줄 말줄임, 모든 카드 제목 뒤 흐린 "해낼게" | `MyGoalListCard.tsx` TEXT_001 | 코드 + 캡처 |
| 홈 | 버튼 "관리"(아이콘 없음, 테두리) + 복사 아이콘 "응원 링크 공유"(채움) | `MyGoalListCard.tsx` TEXT_002 · `goal/MyLinkCard.tsx` variant button | 코드 + 캡처 |
| 홈 | 사진 위 "미리보기" 버튼 삭제 (운영에 없음) | `MyGoalListCard.tsx` | 코드 |
| 홈 | 최근 응원 줄 "이름: 메시지" | `social/CheerSummaryBar.tsx` | 코드 (staging 시험 계정은 응원 0이라 캡처 없음) |
| 홈 | **순서 = 만든 날 역순**. 토익(11-10) · 러닝(10-20) · 책(10-01). 마감일 순 아님 | `(receiver)/me/page.tsx` `order("created_at", { ascending: false })` | 코드 |
| 공개 목표 `goalpublic` | 응원 버튼 "🍀 조용히 밀어줄게" | `goal/CheerPaymentButton.tsx` TEXT_001 | 코드 + 로컬 캡처 |
| 공개 목표 결제창 | 기본 선택 3클로버(3,000원), 프리셋·직접 입력 아이콘 = 선 클로버(lucide Clover 16px) | `CheerPaymentButton.tsx` `useState(3)`, `<Clover size={16} strokeWidth={2.5}>` | 로컬 실화면 캡처 대조 |

변경 화면 2개(home, goalpublic). 새 화면 0.

## 2. 일부러 옮기지 않은 것

| 항목 | 이유 |
|---|---|
| 홈 상단 전화번호 동의 배너 | 회장 Q10(동의 배너 축소) 결정 대기. open-decisions consent-banner. 결정 뒤 다음 판 |
| 결제창 직접 입력 칸의 "클로버" 두 줄 꺾임 | 알려진 운영 결함(2.3.1 후속 목록). 정본에 결함을 옮기지 않는다. 운영이 고치면 시안과 같아진다 |
| 홈 목표 카드 응원 요약의 › 화살표·한 줄 배치 | 운영 CheerSummaryBar 는 아바타 줄 · 인원 줄 · 최근 응원 줄의 세로 3단이다. 응원 있는 계정의 실화면 캡처가 없어 이번 판은 구분자만 맞췄다. 미확인 |
| 공개 목표 D-N 칩 | 운영 공개 목표는 tone warm(베이지)라 3.1.0 그대로 맞다. 홈만 초록 |

## 3. 운영과 일치 확인

| 화면 | 판정 | 근거 |
|---|---|---|
| 홈 카드 모양·칩·버튼 | 일치 | staging `home@390x844.png` 대 3.1.1 `clean-frames/v2-social-viral-loop-v3.1.1-claude-opus-20261116-1855/home@390x844.png` |
| 홈 순서 | 근거 확인(코드) | 시안 데이터에 만든 날을 `data-created` 로 박았다 |
| 결제창 | 일치(기본값·아이콘·문구·순서·탭 위 위치) / 불일치 1(직접 입력 "클로버" 줄바꿈, 운영 결함) | `captures/v2-2.3.1-local-paysheet-20261116/goalpublic-paysheet-local@390x844.png` 대 3.1.1 결제창 |
| 결제창 세로 길이 | 근사 | 운영 시트가 위로 약 100px 더 길다(입력 칸·프리셋 줄높이 차, 390×844 에서 운영 시트 위끝 60px · 시안 165px). 구조와 순서는 같다 |

관찰 부산물: 운영 공개 목표(비회원)에도 새 기능 안내 카드(2.3.0)가 하단에서 떠 응원 버튼을 가린다(`goalpublic-guest-whatsnew-local@390x844.png`). 시안에는 홈에만 넣었다. 비회원에게도 뜨는 것이 의도인지는 제품 쪽 확인 대상이다.

## 4. 커버리지

25라우트, 3.1.0 과 같다(실프레임 22 · 연결 2 · 사유 명시 누락 1).
