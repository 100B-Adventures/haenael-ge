# manifest: v2-social-viral-loop-v3.1.0-claude-opus-20261116-1816.html

본문 485,135바이트(Read 한 번 초과). 이 파일을 끝까지 읽고, 본문은 아래 앵커로 필요한 절만 연다.
기준: 3.0.0 `social-viral-loop-v3-opus5.html` 의 다음 판(운영 2.3.0·2.3.1 역반영). 화면 목록·변경표 = `v2-screen-inventory-v3.1.0-claude-opus-20261116-1816.md`.

## 흐름 세 줄

1. 비회원: landing → (시작하기) onboarding → login → home. 공유 링크로 들어오면 goalpublic → 결제창 → paysuccess / payfail. 어디서 로그인하든 로그인 뒤 출발 화면으로 복귀.
2. 회원 소셜: home → connect(초대) → inviteaccept → friends → belong → status(업적). 홈의 새 기능 카드 "의견 남기기" → updates.
3. 회원 돈·계정: home·goaldetail → cashout → cashstatus → cashhistory. mypage → 프로필 편집·사진 시트, business·terms·privacy.

## 화면 ID · 라우트 · 본문 앵커(줄 번호, 2026-11-16 18:5x 기준)

| id | 운영 라우트 | 줄 | 3.1.0 변경 |
|---|---|---|---|
| home | `/me` | 1867 | D+N 진행 카드, 새 기능 카드 `#homeWhatsNew` |
| goaldetail | `/me/goal/[id]` | 2002 | |
| mywordmap | `/wordmap/[goalId]` | 2217 | |
| connect | `/invite` | 2264 | 링크 미리보기 이미지·문구, 카카오 공유 |
| inviteaccept | `/invite/[token]` | 2316 | 메타만 |
| friends | `/friends` | 2345 | |
| status | `/me/achievements` | 2446 | |
| mypage | `/my` | 2506 | 아바타 버튼, 연필 1개, 인라인 편집기, 업로드 원 |
| cashhistory | `/cashout/history` | 2653 | |
| belong | `/friends/[friendId]` | 2707 | |
| dopamine | `/wordmap/[goalId]` 응원 오버레이 | 2776 | |
| updates | `/updates` | 2816 | 신규 프레임 |
| landing | `/` | 2844 | 번호 3단 설명, 로그인 복귀 |
| goalpublic | `/g/[slug]` | 2886 | 결제창 `#cpaySheet`, 로그인 복귀 |
| login | 로그인 시트 | 2959 | 출발 화면 복귀 |
| onboarding | `/onboarding` | 2980 | |
| paysuccess · payfail | `/payment/success` · `/payment/fail` | 3007 · 3024 | |
| cashout · cashstatus | `/cashout` · `/cashout/status` | 3041 · 3068 | |
| admin | `/admin` | 3096 | |
| how · terms · privacy · business | `/how` · `/terms` · `/privacy` · `/my/legal` | 3138~3207 | |
| bannerupload | 커버 업로드 상태 | 3231 | |
| coverage | 커버리지 표(25라우트) | 3268 | `/updates` 행 추가 |

그 밖의 앵커: 3.1.0 CSS 블록 = `/* ══ v3.1.0 역반영` (약 1510줄), 화면별 검수 메모 = `const REVIEW` 의 `v3.1.0 역반영` 항목, 3.1.0 JS 함수 = `function loginFrom` 부터 `function go(id)` 앞까지.

## 상태 목록

- 데이터: 정상 · 콜드(0명) · 과다(오버플로) 전역 토글(v3 계승).
- 오버레이: 새 기능 카드(검수 패널 버튼 `showWhatsNew()`), 결제창(goalpublic 응원 버튼 `openPaySheet()`), 프로필 편집기(`mpOpenEditor()`), 사진 시트.
- 의견: 좋아요/별로예요 단일 선택, 한 줄 2자 미만 보내기 비활성, 보냄 상태 줄.
- 화면 전환(`go`) 때 결제창·새 기능 카드·편집기는 닫힌다.
