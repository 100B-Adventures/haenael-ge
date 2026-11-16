# manifest: v2-social-viral-loop-v3.1.1-claude-opus-20261116-1855.html

본문 489,256바이트(Read 한 번 초과). 이 파일을 끝까지 읽고, 본문은 아래 앵커로 필요한 절만 연다.
기준: 3.1.0 `v2-social-viral-loop-v3.1.0-claude-opus-20261116-1816.html` 의 다음 판(3.0.0 시절 차이 역반영: 홈 카드 모양·순서, 응원 버튼 문구, 결제창 기본값·아이콘). 화면 목록 = 3.1.0 인벤토리 + 변경표 `v2-screen-inventory-v3.1.1-claude-opus-20261116-1855.md`.

## 흐름 세 줄

1. 비회원: landing → (시작하기) onboarding → login → home. 공유 링크로 들어오면 goalpublic → 결제창 → paysuccess / payfail. 어디서 로그인하든 로그인 뒤 출발 화면으로 복귀.
2. 회원 소셜: home → connect(초대) → inviteaccept → friends → belong → status(업적). 홈의 새 기능 카드 "의견 남기기" → updates.
3. 회원 돈·계정: home·goaldetail → cashout → cashstatus → cashhistory. mypage → 프로필 편집·사진 시트, business·terms·privacy.

## 화면 ID · 라우트 · 본문 앵커(줄 번호, 2026-11-16 19:2x 기준)

| id | 운영 라우트 | 줄 | 3.1.0 변경 |
|---|---|---|---|
| home | `/me` | 1884 | 운영 카드 모양(3.1.1), 만든 날 역순, D+N 진행 카드, 새 기능 카드 `#homeWhatsNew` |
| goaldetail | `/me/goal/[id]` | 2019 | |
| mywordmap | `/wordmap/[goalId]` | 2234 | |
| connect | `/invite` | 2281 | 링크 미리보기 이미지·문구, 카카오 공유 |
| inviteaccept | `/invite/[token]` | 2333 | 메타만 |
| friends | `/friends` | 2362 | |
| status | `/me/achievements` | 2463 | |
| mypage | `/my` | 2523 | 아바타 버튼, 연필 1개, 인라인 편집기, 업로드 원 |
| cashhistory | `/cashout/history` | 2670 | |
| belong | `/friends/[friendId]` | 2724 | |
| dopamine | `/wordmap/[goalId]` 응원 오버레이 | 2793 | |
| updates | `/updates` | 2833 | 신규 프레임 |
| landing | `/` | 2861 | 번호 3단 설명, 로그인 복귀 |
| goalpublic | `/g/[slug]` | 2903 | 응원 버튼 "조용히 밀어줄게"(3.1.1), 결제창 `#cpaySheet`(기본 3클로버), 로그인 복귀 |
| login | 로그인 시트 | 2976 | 출발 화면 복귀 |
| onboarding | `/onboarding` | 2997 | |
| paysuccess · payfail | `/payment/success` · `/payment/fail` | 3024 · 3041 | |
| cashout · cashstatus | `/cashout` · `/cashout/status` | 3058 · 3085 | |
| admin | `/admin` | 3113 | |
| how · terms · privacy · business | `/how` · `/terms` · `/privacy` · `/my/legal` | 3155~3224 | |
| bannerupload | 커버 업로드 상태 | 3248 | |
| coverage | 커버리지 표(25라우트) | 3285 | `/updates` 행 추가 |

그 밖의 앵커: 3.1.1 CSS 블록 = `/* ══ v3.1.1 역반영` (약 1510줄), 3.1.0 CSS 블록 = `/* ══ v3.1.0 역반영 (` (약 1524줄), 화면별 검수 메모 = `const REVIEW` 의 `v3.1.1 역반영`·`v3.1.0 역반영` 항목, 3.1.0 JS 함수 = `function loginFrom` 부터 `function go(id)` 앞까지.

## 상태 목록

- 데이터: 정상 · 콜드(0명) · 과다(오버플로) 전역 토글(v3 계승).
- 오버레이: 새 기능 카드(검수 패널 버튼 `showWhatsNew()`), 결제창(goalpublic 응원 버튼 `openPaySheet()`), 프로필 편집기(`mpOpenEditor()`), 사진 시트.
- 의견: 좋아요/별로예요 단일 선택, 한 줄 2자 미만 보내기 비활성, 보냄 상태 줄.
- 화면 전환(`go`) 때 결제창·새 기능 카드·편집기는 닫힌다.
