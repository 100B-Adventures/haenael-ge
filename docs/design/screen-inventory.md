---
stage: design
line: core
status: current-baseline
updated: "2026-09-21 09:25"
source_code: web/src/app (ref 44c4fb0. 라우트 추출 원재료 = 화면-인벤토리.generated.md, source_ref 472e82f, 15 라우트)
source_design: ../../DESIGN.md (v2.0.1)
source_architecture: ui-architecture.md
source_flow: user-flow.md (v0.3.1)
capture_set: captures/baseline-20260912/manifest.json (390x844 4장, 2026-08-28 QA 산출 복사본, 운영 동일성 미검증)
model: claude-opus-5
---

# 해낼게 screen inventory

표 한 줄 = 화면 하나. App Router `page.tsx` 15개 전부가 행으로 있다. 동적 라우트(`/g/[slug]`, `/wordmap/[goalId]`)도 제외하지 않았다. 캡처가 없으면 `미검증`이라고 적고 숨기지 않았다. 열 정의:

- **screen_id**: 안정 ID. `user-flow.md`·manifest·QA 가 같은 ID 를 쓴다.
- **역할**: 비회원 / 회원(받는 사람) / 관리자. 괄호는 코드가 실제로 분기하는 부분 역할.
- **상태**: 코드에서 실제 분기가 확인된 것만. happy / empty / error / loading / redirect / not-found. 파일:줄이 근거다.
- **layout**: 390 = 모바일 실레이아웃 존재. 1024 = 데스크톱에서 별도 배치가 코드에 있는가. "64rem 단일" 은 최대 폭만 있고 컬럼 분기는 없다는 뜻. "폭 제한 없음" 은 본문이 화면 폭 전체로 늘어난다는 뜻.
- **flow**: 진입 → 이탈. 분기 전수는 `user-flow.md`.
- **capture**: manifest 의 파일명, 없으면 `미검증`.

## 1. 화면 표 (current, 15 라우트)

| # | screen_id | group | route | 역할 | 상태 (코드 확인분) | layout 390 / 1024 | flow (진입 → 이탈) | capture | 코드 근거 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `landing` | G1 | `/` | 비회원. (회원+활성 목표는 `/me`로 redirect) | happy · redirect(회원+목표) | 390 ○ / 1024 폭 제한 없음(워드맵 프리뷰만 320px 캡) | 인스타·직접 진입 → `onboarding`(시작하기) · `how` · 카카오 로그인(`/auth/kakao/start?redirect=/me`) | `미검증` | `web/src/app/page.tsx:125-145`(세션 라우팅), `:149`(main), `:204,213,231`(링크) |
| 2 | `how` | G1 | `/how` | 비회원 | happy 만(정적) | 390 ○ / 1024 미확인(랜딩 관례 상속) | `landing` "어떻게 쓰는 건가요?" → `onboarding`(how-cta) · `landing`(how-home-link) | `미검증` | `web/src/app/how/page.tsx:1-30, 91-101` |
| 3 | `onboarding` | G2 | `/onboarding` | 비회원(write-first) → 저장 시 회원. (회원+활성 목표는 `/me`로 redirect) | happy · 검증 error(인라인) · saving(loading) · 로그인 시트 · redirect | 390 ○ / 1024 미확인 | `landing`·`how` → 저장 → 카카오 로그인 → `receiver-me` | `미검증` | `web/src/app/(receiver)/onboarding/page.tsx:22-38`, `web/src/components/receiver/OnboardingGoalForm.tsx:131-134, 226-239, 278, 296, 423` |
| 4 | `goal-public` | G3 | `/g/[slug]` (동적) | 비회원(게스트 결제) · 회원 타인 · 회원 주인(owner bar) | happy · empty(응원 0, "아직 아무도 없어요") · error(재시도 카드) · not-found · 마감(status CLOSED 칩) · owner/비로그인 배타 분기 | 390 ○ / 1024 폭 제한 없음. 하단 고정 CTA | 바이오 링크 → 결제 시트(토스) → `payment-success`/`payment-fail`. "나도 해낼게 만들래" → `landing`. 비로그인 "카카오로 로그인" → `receiver-me` | `미검증` (동적 URL. 대표 fixture 미확보) | `web/src/app/g/[slug]/page.tsx:56-67`(조회·404), `:108-135`(owner 판정), `:160-176`(owner bar·재로그인), `:207-224`(고정 CTA·역할 전환), `error.tsx:23-37`, `not-found.tsx:16-34`, `web/src/components/goal/Wordmap.tsx:87-106`(empty) |
| 5 | `payment-success` | G4 | `/payment/success?paymentKey&orderId&amount&goalSlug` | 비회원(친구) | success · error(승인 실패 시 status="error" 분기) | 390 ○ (카드 390px) / 1024 카드 중앙 | 토스 결제 → 여기 → `goal-public`(goalSlug 있으면) 또는 `landing` | `미검증` | `web/src/app/payment/success/page.tsx:44-73, 81-113` |
| 6 | `payment-fail` | G4 | `/payment/fail?code&message` | 비회원(친구) | error 단일(message 쿼리 표시) | 390 ○ (카드 390px) / 1024 카드 중앙 | 토스 실패 → 여기 → `landing` | `미검증` | `web/src/app/payment/fail/page.tsx:8-16, 21-37` |
| 7 | `receiver-me` | G5 | `/me` | 회원(받는 사람). 비로그인 → `/`, 목표 없음 → `/onboarding` | happy · loading(`loading.tsx` 스켈레톤) · error(`error.tsx` 전체 재시도 카드) · 잔액 조회 실패 분기(`clover-balance-error`) · 환전 진행 중 분기(`pendingCashout`) · 응원 목록 8→20 펼침·초과 요약 · redirect 2종 | 390 ○ / 1024 64rem 단일 컬럼 | `landing`·로그인 콜백 → 여기 → `wordmap-full` · `cashout-form` · `cashout-history` · 자기 `goal-public`(미리보기) · 로그아웃 → `landing` | `receiver-me-390x844.png` (2026-08-28 QA 화면, 운영 동일성 미검증) | `web/src/app/(receiver)/me/page.tsx:58-60, 75-77, 87-116, 235-358`, `loading.tsx:1-30`, `error.tsx:14-40` |
| 8 | `wordmap-full` | G6 | `/wordmap/[goalId]` (동적) | 회원(본인 목표만). 비로그인 → `/`, 타인 목표·잘못된 id → not-found | happy · empty("응원이 아직 없어요") · not-found · redirect | 390 ○ / 1024 64rem 단일 | `receiver-me` "워드맵 보기" → 여기 → 뒤로(`back-button`) · `receiver-me`(BackHomeLink) | `미검증` (동적 URL) | `web/src/app/(receiver)/wordmap/[goalId]/page.tsx:18-45, 72-112`, `not-found.tsx` |
| 9 | `cashout-form` | G7 | `/cashout` | 회원. 비로그인 → `/` | 한 라우트 안에 4 스크린: form → confirm → submitting → success. 게이트 분기: 기능 꺼짐 · 미달(총보유<30) · 자격 도달·지급가능 0 · 진행 중 신청 있음(`cashout-pending-block`) · 조회 실패(`cashout-load-error`) · 입력 검증 error · 이력 있음(하단 목록) | 390 ○ / 1024 64rem 단일 (승인 프로토는 2단이나 코드는 단일) | `receiver-me` "환전" → 여기 → 신청 성공 → `cashout-status` · `receiver-me`(BackHomeLink) | `cashout-form-390x844.png` (form 스크린) · `cashout-confirm-390x844.png` (confirm 스크린). 둘 다 2026-08-28 QA 화면 | `web/src/app/(receiver)/cashout/page.tsx:17-18, 30-46, 60-64`, `web/src/components/cashout/CashoutRequestForm.tsx:92-98`(canRequest), `:218, 241, 406, 414, 423, 522, 539, 572-590` |
| 10 | `cashout-status` | G7 | `/cashout/status` | 회원. 비로그인 → `/` | happy(REQUESTED 진행 3단계 / PAID / REJECTED) · empty("아직 환전 신청이 없어요") · error(`cashout-status-load-error`) · 잔액 오류(`status-balance-error`) | 390 ○ / 1024 **2단** `lg:grid-cols-[1.1fr_.9fr]` | `cashout-form` 성공·`receiver-me` 진행 배너 → 여기 → 새 환전 신청(종결 후) · `receiver-me` | `cashout-status-390x844.png` (REQUESTED 상태) | `web/src/app/(receiver)/cashout/status/page.tsx:50-51, 74-101, 119-127, 160-168, 236-245, 283-306` |
| 11 | `cashout-history` | G7 | `/cashout/history` | 회원. 비로그인 → `/` | happy · empty("아직 환전 내역이 없어요") · error(`cashout-history-load-error`) | 390 ○ / 1024 요약 카드 `sm:grid-cols-3` | `receiver-me` "환전 내역" → 여기 → `receiver-me` | `미검증` | `web/src/app/(receiver)/cashout/history/page.tsx:21-24, 38-42, 64-81` |
| 12 | `terms` | G8 | `/terms` | 비회원 | happy 만(정적 293줄) | 390 ○ / 1024 `max-w-2xl` 문서 | Footer·LoginSheet 링크 → 여기 → 브라우저 뒤로(내부 링크 없음) | `미검증` | `web/src/app/terms/page.tsx:4` |
| 13 | `privacy` | G8 | `/privacy` | 비회원 | happy 만(정적 318줄) | 390 ○ / 1024 `max-w-2xl` 문서 | Footer·LoginSheet·환전 폼 안내 링크 → 여기 → 브라우저 뒤로 | `미검증` | `web/src/app/privacy/page.tsx:4` |
| 14 | `child-safety` | G8 | `/child-safety` | 비회원 | happy 만. **본문이 "내용 준비 중입니다" 1줄**(감사 P1, target 미구현) | 390 ○ / 1024 `max-w-2xl` | 직접 URL(내부 링크 0건) → 브라우저 뒤로 | `미검증` | `web/src/app/child-safety/page.tsx:1-9` |
| 15 | `admin` | G9 | `/admin` | 관리자. 비로그인 → `/`, 비관리자 → not-found | happy(회원·원장·환전 큐 3섹션) · empty(회원 0 · 원장 0 · 큐 0 각각) · error(3 조회 중 하나라도 실패 시) | 390 카드형 목록 / 1024 이상 테이블 + `max-w-[1440px]` (데스크톱 우선) | 직접 URL 만 → 지급 완료·반려 액션 → 같은 화면 | `미검증` (관리자 fixture 미확보) | `web/src/app/admin/page.tsx:116-136, 145, 155-170, 190, 265`, `web/src/components/admin/CashoutQueue.tsx:192, 212` |

라우트 제외·포함 근거:
- `app/auth/*/route.ts`, `app/api/health/route.ts`, `app/manifest.ts` 는 화면이 아니다(route handler·메타). 인벤토리에서 제외.
- `error.tsx`, `loading.tsx`, `not-found.tsx` 는 독립 화면이 아니라 부모 화면의 상태로 넣었다(#4 #7 #8).
- `cashout-confirm` 은 manifest 에 screen_id 로 있으나 라우트가 아니다. #9 의 confirm 스크린 캡처로 연결했다. manifest 의 ID 는 그대로 두고 여기서 매핑한다.

## 2. 분모와 커버리지 (§16.4 규격)

| 구분 | 수 | 비고 |
|---|---|---|
| 코드 라우트(page.tsx) | 15 | 생성기 원재료와 일치 |
| 화면 ID | 15 | 라우트와 1:1. 한 라우트 안 다중 스크린(#9)은 상태로 취급 |
| 역할 조합 | 20 | #1 2역할, #3 2역할, #4 3역할, #7~#11 1역할, #15 1역할, 나머지 1역할 |
| 지원 viewport | 390 (1차) · 1024 (DESIGN.md §3.7 규정, 코드 부분 적용) | 태블릿 규격 없음 |
| 화면×역할×viewport 분모 | 40 | 20 × 2 viewport |
| 정상 관찰 (PNG 있음) | 4 | 전부 390, 전부 회원 역할, 전부 2026-08-28 QA 산출 복사본. **운영 배포 동일성은 미검증**이라 manifest 는 `current-candidate` 로 표기 |
| redirect 캡처 | 0 | |
| blocked | 0 | |
| 미검증 | 36 | 390 비회원·관리자 전부, 1024 전부, 동적 URL 2종 |

미검증 사유 요약:
1. 원본 캡처의 환경 URL·배포 커밋·브라우저가 기록되지 않았다(manifest `baseURLReason`, `deployedRevisionReason`).
2. 비회원·관리자 fixture 로 찍은 세트가 없다.
3. 1024 는 한 장도 없다.
4. `/g/[slug]`, `/wordmap/[goalId]` 의 대표 slug·id 를 fixture 로 확보하지 않았다.

## 3. target (승인·미구현, current 표에 섞지 않음)

| 항목 | 영향 화면 | 근거 |
|---|---|---|
| 다중 목표(활성 3개), 홈의 목표 목록, 온보딩 재진입 허용 | `receiver-me` `onboarding` `goal-public` | PRD v0.4.0 :196·:232·:255, 감사 P1 :31·:33 |
| 목표 공개범위·응원자 이름/메시지 공개 설정 | `goal-public` `receiver-me`(설정) `wordmap-full` | PRD :124-135·:165-186, 감사 P1 :32·:44 |
| 응원자 식별·응원자 마이페이지·감사 메시지 | `goal-public`(공개 최근 응원자 목록), 신규 응원자 화면 | PRD :172·:278-301, 감사 P1 :34 |
| 아동 안전 정책 실본문 | `child-safety` | 감사 P1 :35 |
| 워드맵 13개 초과 안내·회수 경로, 제목 2줄·이유 3줄 clamp | `goal-public` `receiver-me` | DESIGN.md §6.1, 감사 P1 :36·:37 |
| 친구 초대, 랜딩 워드맵 다국어 | 신규 · `landing` | `prototypes/friends-invite-v1-opus48.html`, `landing-wordmap-i18n-v2-opus48.html`. 미승인 초안 |
| 응원 탐색 피드 | 없음 | D-004 로 제외. 화면을 만들지 않는다 |
| **약관 및 정책**(`legal`, v2 프로토 신규) | `receiver-me`(해낼게 관리에서 진입 행 1개) · `terms` `privacy` `how` | D-030-B. 하단탭 화면에서 사업자 정보·약관 블록을 빼고 이 한 화면이 상시 접근을 책임진다. 시안 = `prototypes/social-viral-loop-v3-opus5.html#legal`. 전 화면 노출 표 = `DESIGN.md` §법적 고지 노출 |
| **배너 직접 올리기**(`bannerupload`, v2 프로토 신규) | `onboarding` `goal-detail` `receiver-me` 의 배너 선택기 | D-030-D. 업로드 경로를 문구가 아니라 화면으로. 상태 4종(고르기 전·미리보기·용량 초과 오류·적용). 시안 = `prototypes/social-viral-loop-v3-opus5.html#bannerupload` |
| 법적 고지 블록(랜딩·공개 목표 콘텐츠 말미) | `landing` `goal-public` | D-030-B. 전자상거래법 제10조 초기화면 표시. 전역 푸터로 되돌리지 않는다 |

## 4. 다음 캡처 세트가 채워야 할 것

우선순위 순. 각 행은 화면 × 역할 × 상태 × viewport 한 조합이다.
1. `goal-public` 비회원 happy·empty 390 (콜드스타트 생사 화면, `user-flow.md` §2.2)
2. `landing` 비회원 390·1024
3. `onboarding` 비회원 390 (폼·로그인 시트)
4. `receiver-me` 390 empty(응원 0) 와 1024
5. `cashout-form` 미달·지급가능 0·pending 3 상태 390
6. `admin` 관리자 1024 (테이블) 과 390 (카드)
7. 나머지 정적 페이지 390

캡처 시 manifest 에 `standard-design.md` §17.3 의 모바일 실측치(`fontBelow14` `tapBelow44` `tapWithActiveRatio` `overflowX`)를 함께 적는다. 수치 없는 캡처는 모바일 미검증이다.

---

🏷 STAMP | line: core | 생성: 2026-09-21 09:25 KST | model: claude-opus-5 | agent: product-designer
skills: 없음(코드·캡처 계승 목록화. 시안 생성 스킬 매칭 안 됨) | 근거: 화면-인벤토리.generated.md(15 라우트, ref 472e82f) · captures/baseline-20260912/manifest.json + PNG 4장 육안 확인 · web/src/app/** 15 page.tsx + error/loading/not-found + ReceiverShell/CashoutRequestForm/Wordmap/CashoutQueue · DESIGN.md v2.0.1 §3.7·§4.1·§6.1 · user-flow.md v0.3.1 · wiki/거버넌스/결정.md D-003·D-004 · docs/qa/audit-20260905 P1 · standard-design.md §16.4·§17.3
고민: manifest 의 `cashout-confirm` 을 별도 화면 행으로 만들면 라우트 15개와 어긋난다. 라우트 = 화면 원칙을 지키고 confirm 을 `/cashout` 의 스크린 상태로 넣되 manifest ID 는 건드리지 않았다. 4장의 PNG 는 운영 화면임을 증명하지 못하므로 "정상 관찰 4" 라 쓰되 같은 줄에 미검증 조건을 붙였다.
