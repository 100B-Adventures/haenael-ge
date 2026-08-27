# core 디자인 토큰 build 보고서 v1

STAMP: 생성 2026-08-28 00:17 KST | 모델 gpt-5.6-sol | 에이전트 code-builder | 스킬 없음 | 기반 `DESIGN.md` v2.0.0, `pipeline-state.core.md`, `docs/core-cashout-qa-report-v1-gpt-codex.md`, Tailwind CSS 공식 문서, MDN CSS custom properties | 고민: CSS shorthand와 utility cascade가 inline style과 같은 computed value를 내도록 속성별 important utility로 분해했다.

## 결과

- 제품 코드의 `style={{...}}`: **233 → 21**. 223개 style attribute에서 정적 선언 405개를 utility class로 이동했고, 완전 정적 212개를 제거했다. 남은 21곳은 런타임 좌표·상태·크기·회전 계산이라 유지했다.
- 사용자 제시 토큰화 대상 raw hex: **282 → 0**.
- 현재 HEAD 전수 raw hex: **349 → 61**. 정본 토큰으로 옮긴 값은 288곳이고, DESIGN.md에 없는 61곳은 그대로 뒀다.
- `DESIGN.md`와 색 토큰 정의는 수정하지 않았다.
- 수수료 계산, 환전 잠금, advisory lock, `status='REQUESTED'`, unique 제약, 계좌 마스킹 테스트는 수정하지 않았다.

## 검증

| 검사 | 결과 |
|---|---|
| `npm run build` | PASS. compile, TypeScript, 정적 페이지 16개 |
| `npm test` | PASS. 41파일, 269/269 |
| `npm run test:qa-contracts` | PASS. 계약 30, RAISE 13, notify 8, mutation 8 |
| 공개 화면 픽셀 대조 | PASS. 4라우트 × 2뷰포트, 8/8 changedPixels=0 |
| `design-lint.sh web/src` | spacing 신규 경고 0. 동적 inline style과 미정의 hex 두 범주는 의도적으로 잔존 |
| `git diff --check` | PASS |

## DESIGN.md 미정의 raw hex

총 31색, 61곳이다. 회장 판단 전에는 새 토큰을 만들지 않았다.

| 분류 | 색과 사용 횟수 |
|---|---|
| 외부 브랜드·로그인 | `#FEE500` 2, `#000000` 3, `#4285F4` 1, `#34A853` 1, `#FBBC05` 1, `#EA4335` 1, `#191600` 1 |
| 워드맵·장식·비활성 | `#8BB79F` 2, `#57A178` 2, `#1A8150` 2, `#4AA877` 2, `#CFE0D6` 1, `#C3D6C9` 1, `#B7DFC5` 1, `#A8D0BC` 1, `#F2F8F4` 1, `#3D7A5A` 2 |
| 기존 보조·상태 변형 | `#A09B93` 6, `#4A4640` 5, `#E4E0D8` 3, `#B3261E` 3, `#FCEEEE` 2, `#F5F2EE` 2, `#F3F0EA` 2, `#EFEDE8` 2, `#D5D0C8` 2, `#B5B0A6` 2, `#8A857A` 2, `#8A6218` 2, `#7A7363` 2, `#F0EDE8` 1 |

hex 지표 밖 반투명 색도 새 토큰 없이 유지했다: `rgba(27,138,79,.22)` 5, `rgba(31,158,90,.05)` 2, `rgba(22,20,15,.32)` 2, `rgba(251,250,247,0)` 1, `rgba(22,20,15,.48)` 1, `rgba(22,20,15,.05)` 1, `rgba(0,0,0,.12)` 1.

## 변경 파일과 변경 hunk 시작 줄

### app

- `web/src/app/(receiver)/cashout/history/page.tsx`: 10,24,31,37,42,55,63,81,89,94,101,105
- `web/src/app/(receiver)/cashout/status/page.tsx`: 10,55,62,78,97,118,135,144,158,181,187,226,256,265,268,289,301
- `web/src/app/(receiver)/me/error.tsx`: 27,30,33,39
- `web/src/app/(receiver)/me/loading.tsx`: 1,11,25,37,42
- `web/src/app/(receiver)/me/page.tsx`: 20,31,46,91,105,119,130,150,156,168,211,241,246,270,280,290,308,316,321,330,340
- `web/src/app/(receiver)/onboarding/page.tsx`: 42
- `web/src/app/(receiver)/wordmap/[goalId]/not-found.tsx`: 15,18,22,25,33
- `web/src/app/(receiver)/wordmap/[goalId]/page.tsx`: 71,81,85,89,95,99,104,118,125
- `web/src/app/g/[slug]/error.tsx`: 22,25,28,34
- `web/src/app/g/[slug]/not-found.tsx`: 15,18,22,25,33
- `web/src/app/g/[slug]/page.tsx`: 74,77,80,85,98,150,156,166,172,202,207,217
- `web/src/app/how/page.tsx`: 44,47,49,55,58,68,71,77,80,92,100
- `web/src/app/layout.tsx`: 41
- `web/src/app/page.tsx`: 36,46,56,74,79,103,109,117,148,153,158,164,166,168,172,185,187,190,199,205,215,224,228
- `web/src/app/payment/fail/page.tsx`: 20,23,25,30,33,38
- `web/src/app/payment/success/page.tsx`: 16,73,80,83,93,104,107,112

### components

- `web/src/components/auth/LoginSheet.tsx`: 57,140,145,149,154,162,170,175,183,195,210,213,215,229,281,293,322,332,344,372,384,413
- `web/src/components/auth/LogoutButton.tsx`: 38
- `web/src/components/auth/PhoneConsentNotice.tsx`: 38,65,69,78
- `web/src/components/cashout/CashoutPageView.tsx`: 4,41,50,56,61,65,71,88,97,102,113,125,137,142,146,152,159,169
- `web/src/components/cashout/CashoutRequestForm.tsx`: 73,197,213,224,244,260,272,282,296,305,325,341,347,366,372,377,384,390,398,412,418,427,447,454,457,469,478,496,510,526,537,544,548,556,570,576,583,590,607,616,623
- `web/src/components/common/Footer.tsx`: 9,13,21,33,41
- `web/src/components/common/NotificationBadge.tsx`: 12,111,125,135,140,159,164,170,180,192,207,210,222
- `web/src/components/common/ReportButton.tsx`: 42,99,105,114,123,153,161,171,177,184,193,196,214,221,236,251,265
- `web/src/components/goal/CheerCount.tsx`: 19,20,22,34,37,40
- `web/src/components/goal/CheerPaymentButton.tsx`: 43,152,184,196,201,204,207,213,231,248,262,267,273,283,291,299,302,306,309,313,320,329,332,342,349
- `web/src/components/goal/DdayChip.tsx`: 22,39
- `web/src/components/goal/GoalCard.tsx`: 12,30,37,54,85,91,101,104,115,117,122
- `web/src/components/goal/GoalEditSheet.tsx`: 42,129,133,140,150,161,170,173,178,187,198,203,205,211,219,224,236,244,249,254,266,269,276,281,284,291,302
- `web/src/components/goal/MyLinkCard.tsx`: 83,87
- `web/src/components/goal/OwnerBar.tsx`: 36,39,54
- `web/src/components/goal/ShareLinkCard.tsx`: 22,52,55,62,65,71,78,80,91,103,106,118
- `web/src/components/goal/SplitBalanceCard.tsx`: 27,40,56,75,85,95,106,116
- `web/src/components/goal/Wordmap.tsx`: 72,86,89,117,133
- `web/src/components/goal/WordmapShareIcons.tsx`: 26,37,103,141,161,197,233,236,250,253,266,269,278,283,302,322,330,342,355
- `web/src/components/receiver/CheerList.tsx`: 18,33,47,51,64,71,106,112,116,130,139,144,150,162,168,177,188,207,226
- `web/src/components/receiver/OnboardingGoalForm.tsx`: 43,131,165,190,198,207,234,281,284,301,306,309,318,323,334,341,348,358,367,369,374,384,387,397,401,409,421,429

### 테스트·문서

- `web/src/components/goal/__tests__/Wordmap.test.tsx`: 52. 같은 `overflow-wrap:anywhere` 계약을 inline style 단언에서 utility class 단언으로 전환했다.
- `docs/qa-tracker.md`: 이 build의 NG 등록과 검증 전환 기록.
- `docs/제품현황.md`: 정본 구현·배포 상태 갱신.
- `session-state.core.md`: 최신순 핸드오프 기록 갱신.
- `docs/core-design-token-build-report-v1-gpt-codex.md`: 신규.

## 기존 기능 보존과 변경 경계

- 유지: 전 화면 레이아웃, 버튼·링크·라우팅, API 호출, 환전 계산과 상태 전이, 계좌 마스킹, 잠금 A안, 관리자 플로우.
- 변경: 정적 inline style을 동일 computed value의 utility로 이동하고, DESIGN.md에 정의된 raw hex를 동일 값 CSS 변수로 치환했다.
- 미검증: 로그인 후 모든 데이터 조합의 화면 픽셀 대조와 운영 배포. 공개 4라우트 8개 캡처는 직접 관찰했다.

## 셀프심문·레드팀

이 결론이 틀렸다면 가장 그럴듯한 이유는 utility class의 cascade 순서가 inline style과 달라 특정 화면만 바뀌는 경우다. 실제 첫 대조에서 background shorthand와 display 충돌을 발견했고, background-color/background-image 분리와 important utility로 수정한 뒤 8장 모두 0픽셀을 확인했다.

까다로운 고객 관점의 공격은 “테스트가 통과해도 화면이 한 픽셀 달라지면 실패”다. 그래서 build와 Vitest를 완료 근거로 쓰지 않고, 동일 브라우저·동일 뷰포트의 PNG raw pixel 비교를 별도 증거로 남겼다. 로그인 후 모든 상태의 시각 대조는 QA 소유로 남겨 미검증이라고 표시한다.

SKILLS_USED: 없음

SKILLS_SKIPPED: 설치된 스킬 중 전역 TypeScript·Tailwind 토큰 리팩터링에 직접 매칭되는 구현 스킬 없음

SOURCES/MODEL: gpt-5.6-sol | `DESIGN.md` v2.0.0 | `pipeline-state.core.md` | `docs/core-cashout-qa-report-v1-gpt-codex.md` | `web/src/app/globals.css` | [Tailwind CSS utility conflict and important modifier](https://tailwindcss.com/docs/styling-with-utility-classes) | [MDN CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/--*)
