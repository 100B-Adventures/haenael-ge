---
stage: design
line: core
status: current-baseline
updated: "2026-09-21 09:25"
based_on:
  design_system: DESIGN.md (레포 루트, v2.0.1. 이 문서는 토큰을 복제하지 않는다)
  screens: docs/design/screen-inventory.md
  user_flow: docs/design/user-flow.md (v0.3.1)
  captures: docs/design/captures/baseline-20260912/manifest.json
  routes: docs/design/화면-인벤토리.generated.md (source_ref 472e82f, 15 라우트)
  code_ref: 44c4fb0 (session/core-20260912 HEAD, 2026-09-21)
  release_current: RELEASE.md 1.2.1 (운영 https://haenael-ge.vercel.app, 배포 커밋 재관찰은 이번에 하지 않음)
model: claude-opus-5
---

# 해낼게 UI architecture

이 문서는 해낼게 웹앱(`web/`, Next.js App Router 단일 배포)의 공통 셸, 화면군, 화면군 사이의 이동, 인증 경계를 적는다. 개별 화면의 ID·상태·캡처는 `screen-inventory.md`가 소유하고, 이동의 분기·실패·복귀는 `user-flow.md`가 소유한다. 색·타이포·간격·모서리·그림자 값은 레포 루트 `DESIGN.md` YAML front matter와 §Colors~§Shapes가 소유한다. 여기서는 값을 다시 적지 않고 절 번호만 가리킨다.

## 1. 제품 골격 한 줄

링크 인 바이오형 모바일 웹. 두 행위자(받는 사람 = 목표 주인, 친구 = 응원자)가 각각 다른 입구로 들어오고 서로 다른 화면군을 쓴다(`user-flow.md` §0). 전역 내비게이션 바(GNB)는 없다. `DESIGN.md` §0 Archetype과 §4.1 Shell이 그렇게 정했고, 코드도 그 상태다(`web/src/app/layout.tsx`에 nav 없음).

## 2. 공통 셸 (current, 코드 실측)

| 층 | 무엇 | 소유 파일 | 적용 범위 |
|---|---|---|---|
| L0 문서 셸 | `<html lang="ko">`, Pretendard 변수 폰트, `bg-background`, 하단 `Footer`(이용약관·개인정보처리방침·사업자 정보), Sonner `Toaster`(top-center) , GA | `web/src/app/layout.tsx:56-71`, `components/common/Footer.tsx` | 15개 화면 전부 |
| L1 받는 사람 그룹 래퍼 | `<div class="min-h-svh bg-background">` 만 있는 빈 레이아웃. 인증 검사는 여기서 하지 않는다 | `web/src/app/(receiver)/layout.tsx:1-5` | `/me` `/onboarding` `/cashout` `/cashout/status` `/cashout/history` `/wordmap/[goalId]` |
| L2 페이지 프레임 | `ReceiverPageShell` + `.receiver-page-frame`: 폭 100%, 최대 폭 64rem(1024px), 좌우 여백 `--space-mobile-gutter`(22px), 상하 `--space-page-y`. `bottomSafe` 변형은 하단 안전 여백 추가 | `components/receiver/ReceiverShell.tsx:12`, `app/globals.css:187-196` | `/me`(loading 포함) `/cashout` `/cashout/status` `/cashout/history` `/wordmap/[goalId]` |
| L3 상단 바 | `ReceiverTopBar` 2변형. `home` = 워드마크 + 알림 배지 + 로그아웃. `detail` = 워드마크 + 현재 위치 | `ReceiverShell.tsx:37-58` | home: `/me`. detail: `/cashout*` `/wordmap/*` |
| L4 하단 회수 링크 | `BackHomeLink` "홈으로 돌아가기" → `/me` | `ReceiverShell.tsx:60-63` | 받는 사람 하위 화면 전부 (dead-end 0 규칙, `DESIGN.md` §4.1) |

셸을 쓰지 않는 화면(의도된 분리, 이탈이 아님):
- `/`(랜딩)과 `/g/[slug]`(친구용 목표 페이지)는 L0만 쓰고 자체 `<main>`에 좌우 22px, 상단 여백, 워드마크를 직접 그린다(`app/page.tsx:149`, `app/g/[slug]/page.tsx:149-157`). 두 화면은 최대 폭 컨테이너가 없다. 1024 이상에서는 본문이 폭 전체로 늘어난다. `DESIGN.md` §7.2 "정렬선 이탈" 잔여 결함과 같은 항목이다.
- `/g/[slug]`는 하단 고정 CTA 바(토스식, `fixed bottom-0` + safe-area)를 가진다. 이 화면만의 셸 요소다(`app/g/[slug]/page.tsx:207-225`).
- `/payment/success` `/payment/fail`은 L0 위에 `max-w-[390px]` 카드 하나만 중앙에 놓는다(`app/payment/*/page.tsx`).
- `/terms` `/privacy` `/child-safety`는 L0 위에 `max-w-2xl mx-auto px-6 py-16` 문서 컨테이너를 쓴다.
- `/admin`은 L0 위에 `max-w-[1440px]`, `px-4 sm:px-6 lg:px-10` 데스크톱 우선 컨테이너를 쓴다(`app/admin/page.tsx:155-156`).

## 3. 인증 경계 (current, 코드 실측)

인증은 layout이나 미들웨어가 아니라 **각 page 서버 컴포넌트가 `supabase.auth.getUser()`로 직접 검사**한다. `proxy.ts`는 canonical 도메인 308 리다이렉트만 담당하고 인증을 만지지 않는다(`web/src/proxy.ts:47-57`).

| 경계 | 판정 | 실패 시 | 코드 |
|---|---|---|---|
| 비회원 허용 | `/` `/g/[slug]` `/how` `/terms` `/privacy` `/child-safety` `/payment/success` `/payment/fail` `/onboarding` | 해당 없음 | 각 page.tsx에 redirect 없음 |
| 회원 필수 (받는 사람) | `/me` `/cashout` `/cashout/status` `/cashout/history` `/wordmap/[goalId]` | `redirect("/")` | `me/page.tsx:58-60`, `cashout/page.tsx:18`, `status/page.tsx:51`, `history/page.tsx:22`, `wordmap/[goalId]/page.tsx:28-31` |
| 관리자 | `/admin` | 비로그인 `redirect("/")`, 로그인했으나 `is_admin` RPC false 또는 오류면 `notFound()` (관리자 존재 자체를 숨김) | `admin/page.tsx:116-136` |
| 소유자 승격 | `/g/[slug]`에서 로그인 세션이 그 목표의 주인이면 owner bar 노출. 타인·비로그인은 친구용 그대로 | 노출 없음 | `g/[slug]/page.tsx:108-135, 160-161` |
| 세션 라우팅 | 로그인 + 활성 목표 있음: `/` → `/me`, `/onboarding` → `/me`. 로그인 + 목표 없음: `/me` → `/onboarding` | | `page.tsx:132-145`, `onboarding/page.tsx:22-38`, `me/page.tsx:75-77` |

로그인 수단은 카카오 하나다(`/auth/kakao/start?redirect=/me` → 카카오 → `/auth/kakao/callback`). 로그아웃은 `POST /auth/logout` 뒤 `/`로 이동(`components/auth/LogoutButton.tsx:25-29`). `app/auth/*`와 `app/api/health`는 route handler라 화면이 아니며 인벤토리에서 제외한다(제외 근거: page.tsx 없음, 렌더 없음).

## 4. 화면군 (current)

화면군 ID는 `screen-inventory.md`의 group 열과 같다.

| group | 화면 (screen_id) | 행위자 | 셸 | 한 줄 역할 |
|---|---|---|---|---|
| G1 랜딩·안내 | `landing`, `how` | 비회원(받는 사람 후보) | L0 + 자체 main | 선언 유도. "응원은 돈으로 하는 겁니다" 카피와 워드맵 프리뷰 |
| G2 온보딩 | `onboarding` | 비회원→회원 (write-first: 목표를 먼저 쓰고 저장 시점에 로그인) | L0 + L1 | 목표 한 문장·이유·기한 입력, 저장 시 카카오 로그인 |
| G3 목표 페이지 (공개) | `goal-public` | 친구(비회원 게스트 결제), 타인 회원, 주인(owner bar) | L0 + 자체 main + 하단 고정 CTA | 목표 카드, 응원 인원수, 워드맵, 응원(결제) CTA, 신고 |
| G4 결제 결과 | `payment-success`, `payment-fail` | 친구 | L0 + 단일 카드 | 토스 결제 승인 확인 / 실패 안내와 복귀 |
| G5 마이 (받는 사람 홈) | `receiver-me` | 회원 | L1+L2+L3 home | 목표·링크 복사·모인 클로버(총량/잠김/사용 가능)·응원한 사람 목록·미니 워드맵·환전 진입 |
| G6 워드맵 | `wordmap-full` | 회원(본인 목표만) | L1+L2+L3 detail+L4 | 워드맵 전체 보기·공유 |
| G7 환전 | `cashout-form`(form/confirm/submitting/success 4 스크린), `cashout-status`, `cashout-history` | 회원 | L1+L2+L3 detail+L4 | 자격·분해표·신청·확인·진행 상태·이력 |
| G8 정책 | `terms`, `privacy`, `child-safety` | 비회원 | L0 + 문서 컨테이너 | 법정 고지 |
| G9 운영 | `admin` | 관리자 | L0 + 1440 컨테이너 | 회원·클로버 원장 조회, 환전 큐 지급 완료·반려 |

## 5. 화면군 사이의 흐름 (current 요약. 분기 전수는 `user-flow.md`)

받는 사람 축: `landing` → `how`(선택) → `onboarding` → (카카오 로그인) → `receiver-me` → { `wordmap-full` | `cashout-form` → `cashout-status` | `cashout-history` | `goal-public`(미리보기, 자기 링크) } → 각 하위 화면은 `BackHomeLink`로 `receiver-me` 복귀.

친구 축: 인스타 바이오 링크 → `goal-public` → 결제 시트(같은 화면, 토스 위젯) → 토스 → `payment-success`(goalSlug 쿼리로 `goal-public` 복귀) 또는 `payment-fail`(`/`로 복귀). `goal-public` 하단 "나도 해낼게 만들래" → `landing`(역할 전환, `g/[slug]/page.tsx:216-224`).

접합: `goal-public` 비로그인 시 "내 목표가 있으신가요? 카카오로 로그인" → `receiver-me`. `receiver-me`의 "친구에게 이렇게 보여요(미리보기)" → 자기 `goal-public`(owner bar 상태).

운영 축: `admin`은 어느 화면에서도 링크되지 않는다. 직접 URL 진입만 가능하다(코드 grep에서 `/admin` 링크 0건).

## 6. 반응형 규칙 (current)

- 지원 viewport: 모바일 390 이 1차. 데스크톱 1024 는 `DESIGN.md` §3.7이 규정(2단 1.15fr/0.85fr, gap 32)하지만 **코드에서 2단이 실제로 적용된 화면은 `cashout-status`(`lg:grid-cols-[1.1fr_.9fr]`, `status/page.tsx:168`)와 `cashout-history`(`sm:grid-cols-3` 요약 카드) 둘뿐**이다. `receiver-me` `cashout-form` `wordmap-full`은 64rem 최대 폭 안에서 단일 컬럼이고, `landing` `goal-public`은 최대 폭이 없다. 태블릿 규격은 정의된 바 없다(미지원 사유: 링크 인 바이오 제품이라 인스타 인앱 브라우저 390 폭이 절대 다수. 근거 = `DESIGN.md` §0. 실측 트래픽 근거는 없음, unsourced).
- 캡처는 390x844 만 존재한다(`captures/baseline-20260912/manifest.json` viewport_sets). 1024 는 전 화면 미검증이다.

## 7. current 와 target 의 구분

| 구분 | 무엇 | 근거 |
|---|---|---|
| current | 위 §2~§6 전부. 코드 44c4fb0, 운영 RELEASE 1.2.1 | 코드 실측. 운영 배포 커밋과 코드 HEAD 의 동일성은 이번에 재관찰하지 않았다 |
| target (승인됨, 미구현) | 다중 목표(계정당 활성 3개)와 홈의 목표 목록화, 목표 공개범위(visibility)와 응원자 이름·메시지 공개 설정, 응원자 식별·응원자 마이페이지·감사 메시지, 아동 안전 정책 실본문 | PRD v0.4.0, 감사 `docs/qa/audit-20260905/audit-haenael-ge-v1.0.0.md` P1 (31~35행). 파이프라인 build 재오픈 상태 |
| target (초안, 미승인) | 친구 초대 화면(`prototypes/friends-invite-v1-opus48.html`), 랜딩 워드맵 다국어(`prototypes/landing-wordmap-i18n-v2-opus48.html`), 통합 청사진 `docs/plan/haenael-v2-blueprint-v1.0.0-opus48.md` | `pipeline-state.core.md` approved_artifacts 에 없음 |
| 제외 (결정) | 응원 탐색 피드 | D-004. 화면군에 넣지 않는다 |

target 화면은 이 문서의 화면군 표에 넣지 않았다. 구현·승인되어 캡처가 생기면 `screen-inventory.md`에 행을 추가하고 이 표의 §4에 group 을 붙인다.

## 8. 디자인 토큰과 규칙의 출처 (복제 금지)

| 필요한 것 | 어디 |
|---|---|
| 색·타이포·간격·radius·shadow·motion 값 | 루트 `DESIGN.md` YAML front matter, §Colors §Typography §Layout §Elevation §Shapes |
| 셸 4층 정의 | `DESIGN.md` §4.1 Shell |
| 컴포넌트 인벤토리 | `DESIGN.md` §4 Component Inventory |
| 오버플로 규칙(제목·이유·메시지·목록·워드맵·내역) | `DESIGN.md` §6.1 |
| 금액 표기 3층·잔액 분할 규칙 | `DESIGN.md` §6-(c)(d), `user-flow.md` §5.5 |
| 사회적 증거 노출 원칙 | `wiki/거버넌스/결정.md` D-003 (인원수·선언은 보이게, 결제 누가·얼마는 조용하게). `goal-public`의 `CheerCount`와 `receiver-me`의 "N명이 조용히 응원했어요"가 그 적용면이다 |
| 브랜드 톤 2층 | D-002. 헤드라인은 단호체, 안내·에러는 해요체 |
| 프로필 아이콘 | D-006 쿼트러포일. 앱 아이콘 `public/icons/*` |
| 모바일 사용성 최소선(글자 16px, 탭 44px, :active) | `~/.claude/standards/standard-design.md` §17. 이 제품의 §17 실측치는 아직 없다 |

## 9. 열린 위험

- 운영 배포본과 코드 HEAD 의 동일성 미관찰. `deployedRevision` 은 manifest 에서 null 이다.
- 1024 viewport 캡처 0장. `DESIGN.md` §3.7 의 2단 규칙과 코드 상태(대부분 단일 컬럼)가 어긋난 채로 있다. 어느 쪽을 정본으로 할지는 다음 design 스프린트 결정 사항이다.
- `landing`과 `goal-public`의 최대 폭 부재(§2). 
- 환전 조회 실패를 빈 상태로 위장하던 결함은 코드에 오류 분기(`cashout-load-error`, `cashout-status-load-error`, `cashout-history-load-error`)가 들어와 있다. 운영 반영 여부는 미검증이다.

---

🏷 STAMP | line: core | 생성: 2026-09-21 09:25 KST | model: claude-opus-5 | agent: product-designer
skills: 없음(문서 계승 작업. design-* 스킬은 화면 시안 생성용이라 매칭 안 됨) | 근거: wiki/거버넌스/결정.md D-002·D-003·D-004·D-006 · standard-design.md §16 · stages.yaml design.screen_inventory/ui_inheritance · 화면-인벤토리.generated.md(15 라우트) · captures/baseline-20260912/manifest.json · web/src/app/** 실코드 · DESIGN.md v2.0.1 §4.1 · user-flow.md v0.3.1 · audit-20260905 P1
고민: 셸을 "받는 사람 그룹 layout" 하나로 서술하고 싶었으나 코드의 `(receiver)/layout.tsx`는 빈 래퍼이고 실제 셸은 컴포넌트(`ReceiverShell`)에 있어, 사실대로 5층으로 나눠 적었다. 1024 2단은 DESIGN.md 규정과 코드가 다르므로 어느 쪽도 정본으로 승격하지 않고 열린 위험으로 남겼다.
