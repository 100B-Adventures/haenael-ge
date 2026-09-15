---
version: "2.0.1"
name: 해낼게
description: 친구의 목표에 조용히 돈으로 응원하는 링크 인 바이오형 모바일 웹 디자인 시스템
colors:
  background: "#FBFAF7"
  foreground: "#16140F"
  surface: "#FFFFFF"
  line: "#E8E4DC"
  warm: "#F4EFE6"
  muted: "#6F6A60"
  faint: "#9C968B"
  primary: "#1B8A4F"
  primary-foreground: "#FFFFFF"
  clover-bright: "#1F9E5A"
  clover-soft: "#E7F4EC"
  clover-ink: "#14613A"
  danger: "#D9483B"
  danger-soft: "#FBEAE7"
  danger-ink: "#B23225"
  amber: "#B4791F"
  amber-soft: "#FBF1DD"
  amber-line: "#E8D3A6"
  amber-ink: "#8A5A12"
typography:
  wordmark:
    fontFamily: Pretendard
    fontSize: 12.5px
    fontWeight: 800
    letterSpacing: -0.2px
  goal-title:
    fontFamily: Pretendard
    fontSize: 22px
    fontWeight: 800
    lineHeight: 1.32
    letterSpacing: -0.4px
  page-title-mobile:
    fontFamily: Pretendard
    fontSize: 22px
    fontWeight: 900
    letterSpacing: -0.4px
  page-title-desktop:
    fontFamily: Pretendard
    fontSize: 30px
    fontWeight: 900
    letterSpacing: -0.4px
  sheet-title:
    fontFamily: Pretendard
    fontSize: 19px
    fontWeight: 900
  balance-total:
    fontFamily: Pretendard
    fontSize: 20px
    fontWeight: 800
  row-value:
    fontFamily: Pretendard
    fontSize: 13px
    fontWeight: 700
  primary-cta:
    fontFamily: Pretendard
    fontSize: 15px
    fontWeight: 800
  input-label:
    fontFamily: Pretendard
    fontSize: 12.5px
    fontWeight: 700
  body-description:
    fontFamily: Pretendard
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.625
  label-small:
    fontFamily: Pretendard
    fontSize: 11.5px
    fontWeight: 700
  meta-micro:
    fontFamily: Pretendard
    fontSize: 10.5px
    fontWeight: 400
  admin-title:
    fontFamily: Pretendard
    fontSize: 30px
    fontWeight: 900
    letterSpacing: -0.04em
spacing:
  micro: 4px
  xs: 8px
  sm: 12px
  md: 16px
  sheet: 20px
  mobile-gutter: 22px
  lg: 24px
  desktop-grid-gap: 32px
  mobile-top: 34px
  desktop-top: 38px
  page-y: 40px
  desktop-bottom: 46px
  desktop-gutter: 56px
  bottom-safe: 80px
rounded:
  sm: 12px
  md: 14px
  lg: 20px
  full: 9999px
shadows:
  card: none
  sheet: "0 8px 30px rgba(0,0,0,.12)"
motion:
  feedback-duration: 120ms
  screen-fade-duration: 180ms
  easing: ease-out
---

# DESIGN.md: 해낼게 (haenael-ge) 디자인 시스템 contract

> **버전 v2.0.1.** 갱신 2026-08-29. 이 파일은 제품 디자인 시스템의 단일 진실원(SSOT)이다.
> **STAMP.** 생성시각 2026-08-29 04:34 KST · 모델 gpt-codex · 에이전트 product-designer · 스킬 pipeline · 기반 `DESIGN.md` v2.0.0 + 운영 1.2.0 프론트 구현 + 운영 환전 계약 마이그레이션 + 전체 여정 프로토타입 v3.7 + Stripe Connect balance 문서 · 출고=`docs/design/prototypes/legacy/core-cashout-30-27-v1-gpt-codex.html` v1.0.0 · 고민 한 줄: "30개"를 자격 임계와 신청량 하한으로 동시에 부르면 30/27 사용자가 화면에서 다시 막히므로 두 값을 이름부터 분리했다.
> **Path B로 시작한 시스템.** 현재는 구현과 프로토타입이 존재하므로 백지에서 재창조하지 않는다. 본문의 역할값과 Colors, Typography, Layout의 역할↔코드 대조표를 함께 따른다.
> 브랜드 **해낼게** · 슬로건 "응원은 돈으로 하는 겁니다." · One Thing "친구가 선언한 목표에, 조용히 돈으로 응원하고 간다."
> 토대: shadcn/ui + Radix primitives + Tailwind 토큰. commons/PostAGI-public 결제·인증 컴포넌트 재사용 전제(PRD §9).
> 이 contract를 어기는 시안은 reject. "예쁘게"가 아니라 **제약 기반**으로 만든다.

**구현 상태 표기 규칙.** 전역 `standards/design.md` §15.2를 적용한다.

- `[실측 파일:행]`: 현재 코드나 현재 정본 프로토타입에서 직접 읽은 값이다.
- `[신설·미구현]`: 이 문서가 먼저 정했지만 현재 코드에 이름이나 구현이 없다.
- 별도 태그가 없는 브랜드·행동 원칙은 구현 완료 주장이 아니라 디자인 정책이다. 구현됐다고 말할 수 있는 것은 `[실측]`뿐이다.
- ✅는 구현 일치, ⛔는 문서와 구현의 이탈 또는 다음 단계 회수 필요를 뜻한다.

### 목차와 Google 원본 스펙 대조

| 순서 | 표준 섹션 | v1.14.0에서 이동한 내용 | 상태 |
|---|---|---|---|
| 1 | Overview | §0 Archetype + §1 Brand Adjectives + §2 Reference | ✅ |
| 2 | Colors | §3 토큰 전반 규칙 + §3.1 Color + §3.8.1 Color 역할↔코드 | ✅ |
| 3 | Typography | §3.2 Typography + §3.8.2 Typography 역할↔코드 | ✅ |
| 4 | Layout | §3.3 Spacing + §3.7 Layout Grid + §3.8.3 Spacing 역할↔코드 | ✅ |
| 5 | Elevation & Depth | §3.5 Elevation | ✅ |
| 6 | Shapes | §3.4 Radius | ✅ |
| 7 | Components | §4 Component Inventory + §4.1 Shell | ✅ |
| 8 | Do's and Don'ts | §5 금지 패턴 | ✅ |

**표준 8섹션 뒤 제품 고유 절:** Motion(이전 §3.6), 오버플로 규칙(이전 §6.1), 금액 표기 3층 규칙과 핵심 UX 규칙(이전 §6), 용어 사전과 UX 라이팅(이전 §8), 에이전트 프롬프트 가이드와 자가검증 예제(이전 §9), 미해결(이전 §7.1~§7.2), Decisions Log(이전 §7.3), 부록: 지금 유효한 프로토타입(이전 §10).

**프론트매터 역할:** 색, 타이포그래피, 간격, 모서리, 그림자, 모션의 기계 판독값은 YAML이 정본이다. 본문은 디자인 의도, 사용 범위, 코드 이탈을 설명한다. Google Labs 원본 스펙에서 Motion은 표준 8섹션이 아니므로 제품 고유 절로 8섹션 뒤에 둔다.

---

## Overview

> v1.14.0의 §0 Archetype, §1 Brand Adjectives, §2 Reference를 내용 삭제 없이 통합했다.

### 0. Archetype (고정. 임의 변경 금지)

**링크-인-바이오 프로필 + 조용한 송금 + 워드맵.**
대시보드 아님. 피드 아님. 커뮤니티 아님. 단일 컬럼 모바일 웹, 인스타 바이오 링크로 열리는 프로필형.

두 화면을 절대 섞지 않는다(컨트롤러가 이전에 섞었던 지점):
- **① 받는 사람 가입 랜딩**. 받는 사람이 "나도 목표 만들래" 하는 supply-acquisition 화면. **친구는 여기 오지 않는다.**
- **② 친구가 보는 목표 페이지**. 공유 링크 타깃. 친구가 인스타 링크 타고 직접 도착해 응원·결제. role-transition("나도 만들래")은 ②에서 ①로만 흐른다.

---

### 1. Brand Adjectives (3. 모든 토큰 결정의 상위 기준)

| # | 형용사 | 뜻 | 디자인 함의 | 위반 = slop |
|---|---|---|---|---|
| 1 | **Discreet 조용한** | 비동기·무부담. 익명 강제 아님. 금액·과시·강제호혜 없음 | 금액 절대 비노출, 랭킹/리더보드 없음, 알림 은은, 완료는 toast 한 번 | 시끄러운 뱃지·금액 자랑·"답장하세요" 다크패턴 |
| 2 | **Warm 따뜻한** | 휘발되는 "화이팅"이 아닌, 손에 잡히는 사적 애정 | 웜 페이퍼 배경, 둥근 radius, 사람 이름·말투, 워드맵의 손글씨 같은 다정함 | 차가운 핀테크 그레이, 기업 SaaS 톤, 스톡 일러스트 |
| 3 | **Trustworthy 믿음직한** | 돈이 오간다. 안전·깨끗·명료해야 결제가 일어남 | 단색 클로버 그린(성장+안전), 정돈된 간격, 명확한 다음 행동, 결제 상태 가시성 | 네온/보라 gradient, glassmorphism, 가짜 3D, 정체불명 CTA |

> 셋의 긴장: Discreet(가리기) ↔ Trustworthy(보여주기). 해법 = **"누가·N명"은 보이되 "금액·순위"는 가린다.** 이 라인을 모든 화면이 지킨다.

---

### 2. Reference 5 (실제 제품, 웹 직접 조사 2026-07-02, 관념 벤치마킹 아님)

| # | 레퍼런스 | 조사한 실제 화면 근거 | 우리가 가져오는 것 | 우리가 버리는 것 |
|---|---|---|---|---|
| 1 | **Linktree** | 프로필 = 아바타+강한 팔레트+중앙정렬 라벨 CTA "미니 웹사이트"(linktr.ee/s/templates) | 단일 컬럼·아바타·중앙정렬·CTA-first 브랜딩 | 링크 카드 나열·Bento 그리드(우리는 단일 CTA) |
| 2 | **Buy Me a Coffee** | 수량 칩("1/3/5" 커피 개수)·"Say something nice…" 메시지·"Support $3" 버튼·supporters wall(아바타+이름+메시지+크리에이터 하트 답장)(buymeacoffee.com) | 수량 칩 앵커(→클로버 개수)·무부담 메시지 카피·supporter wall(→워드맵) | 개수·금액 노출("bought 25 coffees"=과시)·크리에이터 답장 의무 |
| 3 | **Ko-fi** | 0% 수수료·tip panel 상시노출·CTA 문구 커스텀(Support/Tip)(help.ko-fi.com) | 상시 노출 tip 진입·따뜻한 CTA 문구 | 위젯 잡화점식 다기능 |
| 4 | **토스페이먼츠 결제위젯** | 시트 순서 = 상품(금액 큰 표시 "결제 금액 15,000원")→결제수단→약관→하단 고정 "결제하기"(docs.tosspayments.com) | 큰 금액 확인·결제수단 로고 버튼·하단 고정 CTA·상태 가시성 | 금융 대시보드 밀도·약관 과다 노출 |
| 5 | **투네이션 후원 페이지** | 후원자 메시지·익명 옵션·비로그인 열람·월정산(help.toon.at) | 후원자 메시지·익명 옵션·비로그인 열람 | BJ 청중 일방·과시·금액 노출·랭킹 |

> (보조 문화 레퍼런스: 인스타 스토리/Threads = 모바일 네이티브·감정 톤, 공스타 문화 정합. 셋로그 = 목표선언 카드·D-day. 차용하되 무한피드·habit 숙제감은 버림.)

### 2.1 문서 골격 벤치마크 [실측 · 2026-08-23]

| 출처 | 확인한 구조 | 이 문서에 가져온 것 | 그대로 가져오지 않은 것 |
|---|---|---|---|
| `zero-one/DESIGN.md:140-160,419-451` | 역할과 코드 클래스를 잇는 표, 에이전트 착수 순서, 문서만 보고 컴포넌트 하나를 만드는 자가검증 | §3.8 4열 대조표, §9 착수 순서, §9.1 잔액 카드 6항목 검증 | ZERO-ONE의 클래스명과 수치. 해낼게 구현에서 다시 실측했다 |
| `haejo-danta/DESIGN.md:222-337` | Decisions Log와 design-review 라운드를 누적하고 최신 라운드를 명시 | §7.3과 변경 이력을 의사결정 근거로 유지, §9.2에 이번 라운드 자가검증 기록 | 트레이딩 도메인의 밀도와 테이블 패턴 |
| `openclaw-auto/DESIGN.md:328-349` | 현행 정본과 폐기판을 같은 부록에서 구분하고 폐기 이유를 남김 | §10에 정본, 보조, 폐기를 함께 기록 | 4룸 발표형 셸과 1440 전용 구조 |
| [Atlassian Design Tokens](https://atlassian.design/foundations/tokens/design-tokens/) | 토큰은 반복 디자인 결정을 이름과 값으로 묶는 SSOT이며, 모양이 아니라 의미에 따라 선택 | §3.8에서 역할, 칠 값, 실제 값, 사용처를 연결 | Atlassian 토큰 이름. 현재 해낼게 코드 이름을 우선 실측했다 |
| [Carbon Typography Code](https://carbondesignsystem.com/elements/typography/code/) | 개별 `font-size`를 매번 쓰기보다 역할형 type style과 helper를 사용 | §3.8.2에서 현행 raw utility를 역할 단위로 모으고, 미구현 semantic class를 이탈로 표시 | Carbon 패키지와 IBM Plex 값 |
| [Material 3 States](https://m3.material.io/foundations/interaction/states/overview) | enabled, disabled, hover, focus, pressed 같은 상태를 일관되게 정의 | §9 착수 순서에서 정상 상태만 그리지 않고 loading·error·disabled까지 확인 | Material의 색·모양 토큰 |
| [Stripe Connect account balances](https://docs.stripe.com/connect/account-balances) | 하나의 잔액을 `pending`과 `available`로 분리하고 실제 지급은 available에서만 가능하다고 명시 | 총보유 자격과 지급가능 신청 상한을 별도 값·별도 라벨로 보여주는 §6-(c) 계약 | Stripe 용어·색·대시보드 외형 |

**차별화.** 세 외부 시스템은 토큰화가 이미 끝난 코드베이스를 전제로 한다. 해낼게는 문서 별칭(`--ink`, `--clover`)과 실제 코드(`--foreground`, `--primary`, hex literal)가 섞여 있으므로, 이상형 표만 만들지 않고 현행 리터럴과 이탈까지 한 표에 남긴다.

---


## Colors

> v1.14.0의 §3 토큰 전반 규칙, §3.1 Color, §3.8.1 Color 역할↔코드를 이동했다. 정확한 값은 YAML 프론트매터가 정본이다.

### 토큰 전반 규칙

> hex = 정본. Tailwind `theme.extend` + CSS var로 노출. shadcn 시맨틱 네임 매핑 병기.

### 3.1 Color

`--bg`처럼 이 절에 적힌 이름은 **디자인 역할명**이다. 개발에서 칠 때는 §3.8.1을 사용한다. `--background`·`--primary`와 직접 hex가 함께 존재한다. [실측 `web/src/app/globals.css`:54-95, `web/src/app/(receiver)/me/page.tsx`:227-326]

```
/* base / surface */
--bg            #FBFAF7   warm paper      (background)
--surface       #FFFFFF   카드/시트        (card, popover)
--line          #E8E4DC   border/divider  (border, input)
--warm          #F4EFE6   웜 틴트 영역      (muted surface)

/* text */
--ink           #16140F   본문 primary     (foreground)        대비 16:1 ✅
--muted         #6F6A60   보조 텍스트       (muted-foreground)  대비 4.7:1 ✅
--faint         #9C968B   placeholder/장식  (bg 위 대비 2.81:1, WCAG 미달)

/* brand: clover green = 성장 + 안전 + "클로버" 네이밍 정합 */
--clover        #1B8A4F   primary 채움(버튼 bg). 흰 텍스트 대비 **4.38:1** ⚠️ AA(4.5) 미달, 회장 보류 중
--clover-bright #1F9E5A   강조/아이콘/링크(채움 위에서만, 본문 텍스트 금지, 대비 3:1)
--clover-soft   #E7F4EC   primary 틴트 bg(칩·하이라이트)
--clover-ink    #14613A   클로버 위 텍스트가 필요할 때

/* state */
--danger        #D9483B   결제 실패/에러     (destructive)
--danger-soft   #FBEAE7
--amber         #B4791F   대기/보류 원색     테두리·점·채움 전용
--amber-soft    #FBF1DD   대기 상태 배경
--amber-line    #E8D3A6   대기 상태 테두리
--amber-ink     #8A5A12   amber-soft 위 글자 (5.27:1 ✅)
--danger-ink    #B23225   danger-soft 위 글자 (5.34:1 ✅)
--success       = --clover (별도 색 없음. 성공도 클로버)
```
✅ `--bg`부터 `--danger-soft`까지의 실제 값은 globals의 shadcn 변수 또는 custom var에 존재한다. [실측 `web/src/app/globals.css`:54-95]

⛔ `--amber`, `--amber-soft`, `--amber-line`, `--amber-ink`, `--danger-ink`는 정본 프로토타입에는 있으나 globals에는 없다. 제품 코드는 같은 값을 hex 리터럴로 사용한다. 이름만 문서에 있는 상태이므로 변수 자체는 `[신설·미구현]`이다. [실측 `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html`:14-18, `web/src/components/goal/SplitBalanceCard.tsx`:70,95-99, `web/src/app/(receiver)/cashout/status/page.tsx`:76-77]

`--faint`(2.81:1)는 **읽혀야 하는 글자에 쓰지 않는다.** placeholder·구분선 대용·비의미 장식만. 읽혀야 하는 보조 텍스트는 전부 `--muted`(4.71:1) 이상. 돈 설명은 예외 없이 `--muted` 이상(§8.4).

**상태색은 원색과 글자색을 짝으로 쓴다** 🔒(2026-08-21). `--clover` / `--clover-ink`가 그랬듯 `--amber` / `--amber-ink`, `--danger` / `--danger-ink`도 짝이다. 원색(`--amber`·`--danger`)은 테두리·점·채움에만 쓰고, **soft 배경 위의 글자는 반드시 ink 짝**을 쓴다. 원색을 12.5px 본문에 쓰면 soft 배경 위에서 3.29:1로 AA 미달이다.

⚠️ **`--clover` 위 흰 글자 4.38:1은 AA(4.5) 미달이고, 회장이 "일단 넘어가자"로 보류했다**(2026-08-21). 브랜드 주색이라 임의 변경 금지. 재개하면 `#19834A`(4.79:1)가 후보다. 그 전까지 이 값은 **알려진 미달**로 두고 새 화면에서 재발 지적하지 않는다.

규칙: **그린은 채움(fill)으로만.** 그린을 본문 글자색으로 쓰지 않는다(대비·slop). gradient 금지(단색만). danger는 오직 실패 상태에만.

### 3.8 역할 ↔ 코드 대조표 [실측 · 2026-08-23]

> **이 표가 개발용 정본이다.** §3.1부터 §3.7은 디자인 역할과 목표 체계를 말한다. 실제 화면을 현재 구현과 맞출 때는 아래 `역할 → 칠 값 또는 클래스 → 실제 값` 순서로 옮긴다. `[신설·미구현]` 값은 코드에 들어오기 전까지 개발에 쓰지 않는다. 현행 하드코딩 리터럴은 미화하지 않고 그대로 적었다. [실측 `web/src/app/globals.css`:7-110, `web/src/app/layout.tsx`:13-17,40-45 · 2026-08-23]

#### 3.8.1 Color 역할 ↔ 코드

| 역할 | 칠 값 또는 클래스 | 실제 값(코드 실측 파일:행) | 쓰는 곳 |
|---|---|---|---|
| 페이지 배경 | `bg-background` 또는 `bg-[#FBFAF7]` | `#FBFAF7` [실측 `web/src/app/globals.css`:54, `web/src/app/(receiver)/cashout/page.tsx`:41] | 받는 사람 전 화면의 종이색 배경 |
| 기본 글자 | `text-foreground` 또는 `text-[#16140F]` | `#16140F` [실측 `web/src/app/globals.css`:55, `web/src/app/(receiver)/me/page.tsx`:255-258] | 제목, 본문, 금액 라벨 |
| 카드 표면 | `bg-card`, `bg-white`, inline `#fff` | `#FFFFFF` [실측 `web/src/app/globals.css`:56, `web/src/app/(receiver)/me/page.tsx`:299-302] | 카드, 시트, 입력 표면 |
| 경계선 | `border-border` 또는 `border-[#E8E4DC]` | `#E8E4DC` [실측 `web/src/app/globals.css`:77-78, `web/src/components/goal/SplitBalanceCard.tsx`:91] | 카드, 구분선, 입력 경계 |
| 브랜드 주 채움 | `bg-primary` 또는 `bg-[#1B8A4F]` | `#1B8A4F` [실측 `web/src/app/globals.css`:62, `web/src/app/(receiver)/me/page.tsx`:319-326] | 주 CTA, 진행 막대, 포커스 링 |
| 브랜드 밝은 점 | `var(--clover-bright)` 또는 inline `#1F9E5A` | `#1F9E5A` [실측 `web/src/app/globals.css`:86, `web/src/app/(receiver)/me/page.tsx`:234-239] | 워드마크 마침표, 제한적 아이콘 |
| 브랜드 옅은 면 | `bg-accent` 또는 `bg-[#E7F4EC]` | `#E7F4EC` [실측 `web/src/app/globals.css`:70, `web/src/app/(receiver)/me/page.tsx`:352-356] | 워드맵, 성공·강조 배경 |
| 브랜드 글자 | `text-accent-foreground` 또는 `text-[#14613A]` | `#14613A` [실측 `web/src/app/globals.css`:71, `web/src/components/goal/SplitBalanceCard.tsx`:36-44] | 클로버 수, 성공 강조, 링크 |
| 웜 보조면 | `bg-muted`, `bg-secondary`, inline `#F4EFE6` | `#F4EFE6` [실측 `web/src/app/globals.css`:66-69, `web/src/components/goal/SplitBalanceCard.tsx`:54-59] | 보조 카드, 비활성·안내 배경 |
| 보조 글자 | `text-muted-foreground` 또는 `text-[#6F6A60]` | `#6F6A60` [실측 `web/src/app/globals.css`:69, `web/src/components/goal/SplitBalanceCard.tsx`:42-44,112-114] | 설명, 메타, 긴 안내 |
| 비의미 장식 | `var(--faint)` 또는 `text-[#9C968B]` | `#9C968B` [실측 `web/src/app/globals.css`:92, `web/src/components/goal/SplitBalanceCard.tsx`:34,49] | 보조 등가, 타임스탬프. 읽혀야 하는 핵심 글자 금지 |
| 실패 채움 | `bg-destructive` 또는 `bg-[#D9483B]` | `#D9483B` [실측 `web/src/app/globals.css`:74, `web/src/components/admin/CashoutQueue.tsx`:250] | 반려, 실패, 파괴적 확정 |
| 실패 글자 | `text-[#B23225]` | `#B23225`, semantic 변수 없음 [실측 `web/src/app/(receiver)/me/page.tsx`:304-306, `web/src/app/(receiver)/cashout/status/page.tsx`:118-120] | 실패 안내. `[신설·미구현] --danger-ink` |
| 대기 배경 | `bg-[#FBF1DD]` + `border-[#E8D3A6]` | 배경 `#FBF1DD`, 선 `#E8D3A6`, semantic 변수 없음 [실측 `web/src/components/goal/SplitBalanceCard.tsx`:65-71, `web/src/app/(receiver)/cashout/status/page.tsx`:76-77] | 환전 잠김, 확인 중 |
| 대기 글자 | `text-[#8A5A12]` 또는 inline `#8A5A12` | `#8A5A12`, semantic 변수 없음 [실측 `web/src/components/goal/SplitBalanceCard.tsx`:91-100, `web/src/app/(receiver)/me/page.tsx`:323-327] | 잠김 라벨, 진행 중 버튼. `[신설·미구현] --amber-ink` |

⛔ **색 이탈:** `--danger-ink`, `--amber-soft`, `--amber-line`, `--amber-ink`는 프로토타입에는 이름이 있으나 `globals.css`에는 없다. 개발은 같은 hex를 직접 쓰고 있다. 다음 토큰 정리 전까지 새 별칭을 더 만들지 않는다. [실측 `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html`:9-18, `web/src/app/globals.css`:51-110]


## Typography

> v1.14.0의 §3.2 Typography와 §3.8.2 Typography 역할↔코드를 이동했다.

### 3.2 Typography
- **Family:** `Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif`. **단일 패밀리.** 2차 장식 폰트 금지(slop). 워드맵의 다정함은 별도 폰트가 아니라 size/weight/색으로 만든다. [실측 `web/src/app/layout.tsx`:13-17,40-41]
- 로드 방식: `web/src/app/layout.tsx`의 `next/font/local` + `public/fonts/PretendardVariable.woff2`(weight 100~900 가변, `display: swap`). CSS 변수 `--font-pretendard`로 body에 주입. [실측 `web/src/app/layout.tsx`:13-17,40-41]

**서체 선택 근거** (v1.13.0 신설. 상위 기준 `standards/design.md` §4 "system-ui/Inter/Roboto를 무심코 주 서체로 쓰면 slop, 선택했다면 근거를 DESIGN.md에").

> ⚠️ **선택 시점 근거 미기록.** Pretendard는 v1.0.0 토큰 확정 때 이미 들어와 있었고, 그때 왜 골랐는지는 이 저장소 어디에도 남아 있지 않다(`docs/`·`wiki/brand/`·변경 이력 전수 확인, 2026-08-23). 아래는 소급 정당화이지 당시 회의록이 아니다. 지어낸 회의록을 남기는 것보다 사후 근거임을 밝히는 편이 낫다.

| §1 형용사 | Pretendard가 그걸 만드는 방식 |
|---|---|
| **Discreet 조용한** | 획 대비가 낮고 장식 없는 네오그로테스크라 글자 자체가 목소리를 내지 않는다. 응원 메시지(사람의 말)가 주인공이고 서체는 배경으로 물러난다. 손글씨·명조 계열이었다면 서체가 감정을 대신 연기하게 되어 §5-7(장식으로 Warm 만들기 금지)에 걸린다 |
| **Warm 따뜻한** | 한글 글자폭이 고르고 자간이 넉넉해 해요체 문장이 딱딱해지지 않는다. 본고딕(Noto Sans KR) 대비 종·횡획 대비가 완만해 사무적으로 읽히지 않는다 |
| **Trustworthy 믿음직한** | 숫자·라틴 글립이 한글과 같은 리듬으로 정렬된다. 이 제품에서 가장 위험한 화면이 §8.3 차감표(`− 3,300원` / `25,819원` 같은 숫자 세로 대조)인데, 숫자가 흔들리면 돈 화면의 신뢰가 먼저 깨진다. 가변폰트라 400·700·800·900을 파일 추가 없이 쓸 수 있어 §3.2 스케일 7단계를 한 패밀리로 감당한다 |

- **왜 system-ui가 아닌가**: system-ui는 플랫폼마다 다른 글꼴로 갈린다(macOS = Apple SD 산돌고딕Neo, Windows = 맑은 고딕, Android = 본고딕). 우리 화면은 인스타 바이오 링크로 열려 유입 기기가 통제 불가라, 시스템 폰트에 맡기면 §3.2 스케일과 §8.3 차감표 정렬이 기기별로 어긋난다.
- **왜 Inter/Roboto가 아닌가**: 라틴 전용이라 한글은 결국 폴백으로 얹힌다. 우리 화면은 거의 전부 한글이므로 라틴 서체를 주 서체로 두는 것은 사실상 선택을 안 한 것과 같다.
- **왜 브랜드 전용 서체를 쓰지 않는가**: §5-7·§5-8이 장식으로 정체성을 만드는 것을 금지한다. 해낼게의 정체성은 워드맵에 쌓인 친구들의 실제 단어에서 나오지, 제목 서체에서 나오지 않는다. 유료 서체 라이선스 비용도 1인 운영 단계에서 정당화되지 않는다.
- 근거 출처: [Pretendard 공식 저장소](https://github.com/orioncactus/pretendard) (system-ui 대체 목적, 9 weight + 가변 지원, OFL), [본고딕 버리고 Pretendard로 갈아탄 이유](https://brunch.co.kr/@lovelylucia/148), [Pretendard 시스템 폰트 도입기](https://brunch.co.kr/@kangsigner/9) (한글이 "얹힌" 시스템 폰트의 UI 정렬 문제).
- 스케일(모바일 기준):

| 토큰 | size/line | weight | letter-spacing | 용도 | 구현 상태 |
|---|---|---|---|---|---|
| display | 28 / 1.30 | 800 | -0.6 | 랜딩 hero | `[신설·미구현]` semantic class 없음 |
| h1 | 24 / 1.34 | 800 | -0.5 | 목표 제목 "○○ 해낼게" | `[신설·미구현]` 실제 화면은 22/800 또는 22·30/900, §3.8.2 |
| h2 | 19 / 1.40 | 700 | -0.3 | 섹션 | `[신설·미구현]` 실제 편집 시트는 19/900, §3.8.2 |
| body | 15 / 1.60 | 400 | -0.1 | 본문 | `[신설·미구현]` semantic class 없음 |
| body-strong | 15 / 1.60 | 700 | -0.1 | 강조 본문·버튼 | `[신설·미구현]` 실제 주 CTA는 15/800, §3.8.2 |
| caption | 13 / 1.50 | 400 | 0 | 메타·보조 | `[신설·미구현]` semantic class 없음 |
| micro | 11.5 / 1.45 | 500 | 0.2 | 칩·라벨 | `[신설·미구현]` semantic class 없음 |

한글 큰 제목은 letter-spacing 음수로 조인다. 줄바꿈은 의미 단위로(어절 끊김 금지).

#### 3.8.2 Typography 역할 ↔ 코드

| 역할 | 칠 값 또는 클래스 | 실제 값(코드 실측 파일:행) | 쓰는 곳 |
|---|---|---|---|
| 제품 기본 서체 | `font-[family-name:var(--font-pretendard)]` | Pretendard Variable, weight 100~900, `display: swap` [실측 `web/src/app/layout.tsx`:13-17,40-41] | 전 제품 UI |
| 워드마크 | `font-extrabold` + inline size·tracking | 12.5px / 800 / `-0.2px` [실측 `web/src/app/(receiver)/me/page.tsx`:233-239] | "해낼게." 상단 표기 |
| 목표 제목 | `font-extrabold leading-[1.32]` + inline size·tracking | 22px / 800 / 1.32 / `-0.4px` [실측 `web/src/app/(receiver)/me/page.tsx`:254-263] | `/me` 목표 제목 |
| 페이지 제목 | `text-[22px] sm:text-[30px] font-black tracking-[-0.4px]` | 모바일 22px, 데스크톱 30px / 900 / `-0.4px` [실측 `web/src/app/(receiver)/cashout/page.tsx`:43-45] | 환전 신청·상태 H1 |
| 시트 제목 | `text-[19px] font-black` | 19px / 900 [실측 `web/src/components/goal/GoalEditSheet.tsx`:181-186] | 목표 편집 H2 |
| 잔액 핵심 숫자 | `font-extrabold` + inline size | 20px / 800 [실측 `web/src/components/goal/SplitBalanceCard.tsx`:36-44] | 모인 클로버 총량 |
| 행 값 강조 | `block whitespace-nowrap` + inline size | 13px / 기본 `strong` 700 [실측 `web/src/components/goal/SplitBalanceCard.tsx`:78-84,97-103] | 사용 가능·잠김 클로버 |
| 주 CTA | `text-[15px] font-extrabold` | 15px / 800 [실측 `web/src/components/cashout/CashoutRequestForm.tsx`:317-323, `web/src/components/goal/GoalEditSheet.tsx`:310-315] | 환전 신청, 저장 |
| 입력 라벨 | `text-[12.5px] font-bold` | 12.5px / 700 [실측 `web/src/components/cashout/CashoutRequestForm.tsx`:213-216,236-241] | 은행·계좌·예금주 라벨 |
| 본문 설명 | `text-[12px] leading-relaxed` | 12px / 400 / 약 1.625 [실측 `web/src/app/(receiver)/cashout/status/page.tsx`:88-90] | 상태 이유, 다음 행동 |
| 작은 라벨 | inline size·weight | 11.5px / 700 [실측 `web/src/components/goal/SplitBalanceCard.tsx`:75-83,91-102] | 분할 잔액 양쪽 라벨 |
| 마이크로 메타 | inline size | 10.5px / 400~600 [실측 `web/src/components/goal/SplitBalanceCard.tsx`:34,42,49,85,105] | 등가 금액, 보조 메타 |
| 관리자 제목 | `text-3xl font-black tracking-[-0.04em]` | 30px / 900 / `-0.04em` [실측 `web/src/app/admin/page.tsx`:157-161] | 관리자 대시보드 H1 |

⛔ **타이포 이탈:** 코드에는 역할형 typography class가 없고 `text-[Npx]`, `fontSize`, `font-black`을 조합한다. §3.2의 `h1`, `body`, `caption`은 `[신설·미구현]` 역할명이다. 현재 화면을 맞출 때 위 실측 조합을 쓰되 새 조합을 늘리지 않는다.


## Layout

> v1.14.0의 §3.3 Spacing, §3.7 Layout Grid, §3.8.3 Spacing 역할↔코드를 이동했다.

### 3.3 Spacing (현행 4px grid, 8pt 전환 미완)
`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56`. 화면 좌우 패딩 = **22**(현행 고정). 섹션 간 = 24~32. **화면마다 다른 간격 금지.** [실측 `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html`:72-76,89-90,109-126, `web/src/app/(receiver)/me/page.tsx`:231,299-301]

⛔ 상위 품질 계약의 8pt scale과 현행 12·20·22px가 충돌한다. 이번 과제는 코드와 프로토타입 수정이 금지돼 기존 값을 8pt 배수로 바꾸지 않았다. §3.8.3은 현행을 개발용 정본으로 기록하되, **새 값 추가 허가가 아니라 이탈 인벤토리**로 사용한다. 마이그레이션 결정은 §7.2에 회수한다.

### 3.7 Layout Grid (v1.13.0 신설. 발명이 아니라 정본 프로토가 이미 쓰는 값의 박제)

> [실측 `web/src/app/globals.css` `.receiver-page-frame` · `web/src/components/cashout/CashoutPageView.tsx` · `docs/design/prototypes/legacy/core-cashout-30-27-v1-gpt-codex.html`:38-55]

| | 모바일 | 데스크톱 |
|---|---|---|
| 기준 폭 | **390px** 검수 기준, 실제는 가용 폭 100% | **1024px max-width** |
| 칼럼 | **단일 컬럼 1개.** 4/8칼럼 격자를 쓰지 않는다 | 환전 신청만 **2단**, 나머지 받는사람 화면은 1단 |
| 좌우 여백(정렬선) | **22px** (§3.3 기존 셸 호환값) | **22px** |
| 상하 여백 | 상·하 **40px** | 상·하 **40px** |
| 환전 신청 2단 비율 | 해당 없음 | `minmax(0, 1.08fr) minmax(0, .92fr)` |
| 단 사이 gap | 해당 없음 | **24px** |
| 사이드 레일 | 본문 아래로 접힘 | `position: sticky; top: 24px` |

- **정렬선은 화면이 바뀌어도 안 움직인다.** 받는사람 셸은 모바일·데스크톱 모두 좌우 22px이다. 22px은 운영 호환을 위한 명명된 예외이며 새 화면에서 다른 임의값을 추가하지 않는다.
- **주축 방향을 명시한다.** 모바일 = 단일 column. 데스크톱 환전 신청 = `display:grid` 2열. 확인·제출중·접수는 단일 column, 최대 672px로 가운데 정렬한다.
- **본문 최대 폭.** 1024px 초과 뷰포트에서 본문을 무한히 늘리지 않는다. `.receiver-page-frame`은 1024px 상한과 가운데 정렬을 공유한다.
- **홈만의 예외 1개**: `/me`(홈)는 모바일에서 사이드 레일(잔액 카드)이 **본문보다 위**로 온다(`order: -1`, 아래 간격 0). 잔액이 이 화면의 첫 결정 대상이기 때문이다. 다른 화면은 전부 레일이 아래로 간다.

✅ **운영 1.2.0 정렬선 수렴:** `ReceiverPageShell`이 `.receiver-page-frame`을 공유하고, CSS가 `width:100%`, `max-width:64rem`, `margin-inline:auto`, 상하 40px·좌우 22px을 한곳에서 적용한다. `/me`, `/cashout`, `/cashout/status`, `/cashout/history`가 이 셸을 사용한다. 새 화면은 페이지별 `max-w-*`를 다시 만들지 않는다.

#### 3.8.3 Spacing 역할 ↔ 코드

| 역할 | 칠 값 또는 클래스 | 실제 값(코드 실측 파일:행) | 쓰는 곳 |
|---|---|---|---|
| 받는 사람 모바일 좌우 정렬선 | `px-[22px]` | 22px [실측 `web/src/app/(receiver)/me/page.tsx`:225-231, `web/src/app/(receiver)/cashout/page.tsx`:40-42] | `/me`, `/cashout`, `/cashout/status` 페이지 셸 |
| 페이지 위아래 여백 | `py-10` 또는 `pt-10` | 40px [실측 `web/src/app/(receiver)/me/page.tsx`:231, `web/src/app/(receiver)/cashout/status/page.tsx`:79-81] | 페이지 첫·끝 호흡 |
| 홈 하단 고정 CTA 안전영역 | `pb-[80px]` | 80px [실측 `web/src/app/(receiver)/me/page.tsx`:225-227] | 하단 CTA에 본문이 가리지 않게 |
| 카드 기본 안쪽 여백 | `p-4`, `px-4 py-3` | 16px, 세로 12px [실측 `web/src/app/(receiver)/me/page.tsx`:298-302,341-344] | 잔액 카드, 목록 행 |
| 시트 기본 안쪽 여백 | `p-5` | 20px [실측 `web/src/components/goal/GoalEditSheet.tsx`:168-174] | 목표 편집 시트 |
| 큰 카드 안쪽 여백 | `p-6` 또는 `sm:p-6` | 24px [실측 `web/src/app/(receiver)/cashout/page.tsx`:58-60, `web/src/app/(receiver)/cashout/status/page.tsx`:45-49] | 환전 명세, 빈 상태 |
| 행 내부 최소 간격 | `gap-2` | 8px [실측 `web/src/components/cashout/CashoutRequestForm.tsx`:213-228] | 입력값+단위, 버튼 묶음 |
| 일반 행 간격 | `gap-3` | 12px [실측 `web/src/components/goal/SplitBalanceCard.tsx`:75-100, `web/src/app/(receiver)/me/page.tsx`:240] | 분할 잔액, 헤더 아이콘 |
| 카드 사이 간격 | `mb-4`, `space-y-4` | 16px [실측 `web/src/app/(receiver)/me/page.tsx`:287-296, `web/src/components/cashout/CashoutRequestForm.tsx`:209] | 주요 카드·폼 블록 사이 |
| 데스크톱 2열 간격 | `gap-6` 또는 `gap-5` | 24px 또는 20px [실측 `web/src/app/(receiver)/cashout/page.tsx`:58, `web/src/app/(receiver)/cashout/status/page.tsx`:86] | 환전 신청·상태 2열 |
| 프로토타입 데스크톱 정렬선 | `.u-body{padding:38px 56px 46px}` | 좌우 56px, 상 38px, 하 46px [실측 `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html`:72-76] | 1024px 정본 시안 셸 |
| 프로토타입 데스크톱 열 간격 | `.u-grid{gap:32px}` | 32px [실측 `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html`:74-76] | 1024px 본문·사이드 레일 |
| 분할 잔액 내부 리듬 | `mt-3`, `mt-2`, `pt-2`, `gap-3` | 12px, 8px, 8px, 12px [실측 `web/src/components/goal/SplitBalanceCard.tsx`:54-57,75-76,91-95,112] | 막대, 두 값 행, 설명 |

⛔ **간격 이탈:** 현행 22px 정렬선, 10px 행 패딩, 20px·38px·46px·56px이 전역 8pt 스케일 밖이다. 이것은 실제 화면을 재현하기 위한 인벤토리이지 신규 값 허가가 아니다. 새 화면은 기존 셸 정렬선을 승계하고, 셸 마이그레이션은 §7.2의 별도 build 결정으로 묶는다. [실측 `web/src/app/(receiver)/me/page.tsx`:66,231, `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html`:72-76]

---


## Elevation & Depth

> v1.14.0의 §3.5 Elevation을 이동했다. 그림자 값은 YAML 프론트매터가 정본이다.

### 3.5 Elevation

- 카드 = 그림자 없음, **1px `--line` 보더만**(평면·정직). [실측 `web/src/app/(receiver)/me/page.tsx`:299-302]
- 바텀시트/모달만 elevation: `0 8px 30px rgba(0,0,0,.12)`. [실측 `web/src/components/goal/GoalEditSheet.tsx`:168-174]
- glow·neon·다중 그림자 금지.


## Shapes

> v1.14.0의 §3.4 Radius를 이동했다. 모서리 값은 YAML 프론트매터가 정본이다.

### 3.4 Radius (1개 시스템으로 잠금. 화면마다 다른 radius = slop)

`sm 12`(칩/인풋) · `md 14`(버튼·카드 기본) · `lg 20`(바텀시트 상단) · `full`(아바타·카운트 배지). **이 4개 외 사용 금지.** [실측 `web/src/app/globals.css`:81-82, `web/src/components/goal/GoalEditSheet.tsx`:126,138,169,193]


## Components

> v1.14.0의 §4 Component Inventory와 §4.1 Shell을 이동했다.

### 4. Component Inventory

> 모두 단일 컬럼·모바일 우선. shadcn/Radix 매핑 병기. ⟳ = commons/PostAGI-public 재사용.

| 컴포넌트 | 역할 | 핵심 상태 | shadcn/Radix |
|---|---|---|---|
| **BrandMark** | "해낼게." 워드마크(닷=클로버) | - | - |
| **Button** | primary(클로버 채움) / ghost(텍스트) / subtle(웜 틴트) | default·press·disabled·loading | Button |
| **GoalCard** | 주인공 액자: 아바타·이름·"○○ 해낼게"·D-day칩·왜 | 진행중·마감 | Card |
| **DdayChip / StatusChip** | D-14 · 진행중 · 마감됨 | - | Badge |
| **Wordmap** | 쌓인 응원 메시지 구름(size/weight/opacity로 다정함) | empty·few·many | (custom) |
| **CheerCount** | "N명이 응원했어요" (금액 절대 X) | 0·N | Badge |
| **AmountChips** | 금액 선택, 커피값 앵커(3·5·10천 + 직접입력) | 선택·미선택 | ToggleGroup |
| **PaymentSheet** | 바텀시트: 금액→메시지→익명→결제 | 입력·로딩·성공·실패·취소 | Dialog/Sheet |
| **MessageField** | 한 줄 응원(선택, 비동기). placeholder로 무부담 신호 | 빈값·입력·초과 | Textarea |
| **AnonymityToggle** | 이름 노출 ↔ 익명(응원자 선택, Q2 잠김=강제익명 아님) | 노출·익명 | Switch |
| **ConfirmToast** | 은은한 완료("도경이에게 조용히 닿았어요") | - | Toast(Sonner) |
| **EmptyState** | 응원 0. 첫 친구를 초대하는 화면 | - | (custom) |
| **ErrorState** | 결제 실패·만료·비공개·404 | 각 사유별 | (custom) |
| **ShareLinkCard** | 내 링크 발급·복사·인스타 바이오 안내 | 복사전·복사됨 | Card+Button |
| **ProgressUpdate** | 주인공 진행 한 줄/사진(선택, 강제 X) | 없음·있음 | Card |
| **AuthSheet** ⟳ | 로그인 최소(소셜). 결제·저장 시점에만 등장 | - | Dialog ⟳commons |
| **OnboardingGoalForm** | 목표·일정·왜 입력(①) | 작성·검증·저장 | Form+Input |
| **GoalListCard** (v2) | 다중 목표 홈의 목표 카드: 제목·칩·응원 N명·미확인 배지·카드 내 링크복사/워드맵/응원보기 | 진행중·마감(past)·미확인 배지 | Card |
| **SplitBalanceCard** (v3.6) | 환전 잠김 상태의 클로버 잔액. 총량(주) + 분할 막대 + 사용 가능·잠김 2행. §6-(d) 정본 | 잠김 없음(블록 소멸)·잠김 있음·입금 완료 직후 | Card |
| **CashoutRequestForm** (전체 여정 v3.8, 경계 정본 v1.0.0) | 신청량(1~지급가능)·은행·계좌·예금주 입력 → 확인 → 접수. 자격 기준 총보유 30과 신청 상한 지급가능을 분리 | 입력·30/27 경계·에러·확인·제출중·성공·중복차단 | Form+Input+Alert+Button |
| **AccountBalanceCard** (v2) | 계정 전체 클로버 잔액 1개(목표별 모금액 없음, §6-b 원화 보조 병기) | 기본·웰컴만 | Card |
| **NewGoalButton** (v2) | 대시드 "＋ 새 목표 만들기" (상한 3 도달 시 disabled+이유) | 활성·비활성 | Button |
| **SettingsRow** (v2) | 마이페이지 리스트 행: 아이콘·제목·설명·chevron/“준비중”칩 | 기본·준비중(disabled) | (custom) |
| **PrivacySwitch** (v2) | 공개 설정 스위치. **금액 항목은 스위치가 아니라 잠금(🔒) 상수로 렌더** | on·off·lock | Switch |
| **PrivacyPreview** (v2) | 설정 변경의 친구 화면 실시간 미리보기(메시지 OFF=워드맵 비표시, 목표 OFF=비공개 안내) | 공개·이름숨김·워드맵소멸·비공개 | (custom) |
| **ThanksComposer** (v2) | 감사 1회 단방향 작성(200자·수정불가 고지·ghost 진입, 미전송 흔적 금지) | 작성·전송·완료·실패 | Textarea+Card |
| **UpgradeCard** (v2) | 결제 완료 화면 전용 계정 승격 카드(카카오 1탭 + "괜찮아요" 상시). **다른 화면 노출 금지** | 기본·실패·성공 | Card |
| **InquiryForm** (v2) | 고객센터 일방향 폼(카테고리 4·1,000자·1일 3건, "개별 답변 X"를 버튼 위에) | 작성·완료·실패·한도 | Form |

### 4.1 Shell (공통 레이아웃 골격). v1.13.0 신설

> 상위 기준 `standards/design.md` §9: "다화면 앱은 첫 화면 전에 shell을 하나의 공유 컴포넌트로 잠근다. 화면마다 헤더가 다르면 shell 이탈 = FAIL."

**해낼게에 GNB는 없다.** §0 Archetype이 링크-인-바이오 프로필이므로 전역 내비게이션 바를 두지 않는다(대시보드 아님). 그래서 shell은 4개 층으로만 이뤄진다.

| 층 | 정의 | 현재 소유 |
|---|---|---|
| **① 문서 셸** | `<html lang="ko">` + Pretendard 변수 + `bg-background` + Footer + Toaster(Sonner, `position="top-center"`, `richColors`) | ✅ 공유. `web/src/app/layout.tsx` |
| **② 페이지 셸** | `<main className="min-h-svh">` + 배경 `#FBFAF7` + §3.7 좌우 여백 22px + 상하 여백 + 최대 폭 컨테이너 | ✅ `ReceiverPageShell` + `.receiver-page-frame` 공유 |
| **③ 상단 바** | 좌 = "해낼게." 워드마크(닷 = `--clover-bright`, 12.5px/800), 우 = NotificationBadge + LogoutButton. 아래 여백 20px | ✅ `ReceiverTopBar`의 `home`·`detail` 변형 |
| **④ 하단 회수 링크** | 하위 화면은 본문 끝에 "홈으로 돌아가기"(12px, `--faint`) 1개 | ✅ `BackHomeLink` 공유 |

**규칙 (신규 화면은 이걸 상속한다).**
- 받는사람 라인의 모든 화면은 ②를 그대로 상속하고 본문만 채운다. 배경색·좌우 여백·상하 여백을 화면에서 새로 정하지 않는다.
- 홈(`/me`) = ③ `home` 상단 바. 홈에서 진입하는 하위 화면(`/cashout`, `/cashout/status`, `/wordmap/*`) = ③ `detail` 상단 바 + ④ 하단 회수 링크. detail 상단 바는 현재 위치를, 하단 링크는 다음 경로를 담당하므로 함께 쓴다. 어느 쪽도 없는 하위 화면은 dead-end이므로 §6 "dead-end 0" 위반이다.
- 친구가 보는 목표 페이지(`/g/[slug]`)는 ③·④ 둘 다 없다. 로그인한 주인이 자기 목표를 볼 때만 owner bar가 뜬다(§6-(b′)). 이건 shell 이탈이 아니라 §0이 정한 화면 분리다.

✅ **운영 1.2.0에서 shell 공유 완료.** route layout을 추가하지 않고 `web/src/components/receiver/ReceiverShell.tsx`의 세 컴포넌트와 `globals.css`의 `.receiver-page-frame`으로 수렴했다. 이 방식은 로딩 화면까지 같은 셸을 재사용하며, 페이지별 본문 상태만 달라진다.

---


## Do's and Don'ts

> v1.14.0의 §5 금지 패턴을 이동했다.

### 5. 금지 패턴 (anti-slop / NN/g. 위반 시 reject)

1. **금액 노출 절대 금지.** 후원액·총모금액·환전액을 친구/공개 화면에 띄우지 않는다("N명"만). (Discreet)
2. **랭킹·리더보드·시끄러운 뱃지·과시형 카운트 금지.** (Discreet)
3. **강제 호혜·감사 강요 UI 금지**("응원했으니 답장하세요", 답장 안 하면 막힘). (Discreet)
4. **결제 다크패턴 금지**: 금액 기본값 높게 선택, 닫기 숨김, 익명 토글 기만. 최소 금액·닫기 항상 명확. (Trustworthy)
5. gradient(특히 보라·네온)·glassmorphism·가짜 3D·glow 금지. **단색 클로버만.** (Trustworthy) *예외:* 워드맵/후광(halo)/배경 페이드에 **clover 계열 단색 내 아주 옅은 radial**은 공간감 목적으로 허용(구름 은유). 색상 이동(보라·네온·다색)·장식적 남발은 여전히 금지.
6. **화면마다 다른 radius/spacing/그림자 금지.** §3 토큰 외 사용 금지.
7. oversized hero, decorative card 남발, 이모지 도배, AI 스톡 일러스트 금지. (Warm은 사람·말투로. 장식으로는 X)
8. 폭죽/confetti/과한 모션 금지(조용함 위반).
9. 매일 인증 강제·habit-tracker 숙제 UI 금지(받는 사람 부담 → 공급 마름).

---


## Motion

> Google Labs 원본 8섹션에는 Motion이 없다. 원본의 unknown section 보존 규칙에 따라 제품 고유 절로 8섹션 뒤에 둔다. 실측 120ms, 180ms와 ease-out은 YAML 프론트매터가 정본이다.

### 3.6 Motion

- 전이 120~200ms ease-out. 정본 프로토타입의 화면 전환은 180ms fade, 검수 셸 버튼은 120ms다. [실측 `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html`:31-44]
- 바텀시트 slide-up 220ms는 `[신설·미구현]`이다. 현재 `GoalEditSheet` 코드에 진입·퇴장 transition이 없다. [실측 `web/src/components/goal/GoalEditSheet.tsx`:156-175]
- 완료 = toast 1회 + 살짝 페이드. 폭죽·confetti·큰 애니메이션 금지(조용함 위반). 느린/과한 인터랙션 = reject(design-review 항목).


## 오버플로 규칙

> v1.14.0의 §6.1을 이동했다.

### 6.1 오버플로 방지 규칙 (v1.13.0 신설. 미정의 = 실격 항목)

> 상위 기준 `standards/design.md` §9: "리스트는 최대 표시 행수 + 더 보기 접힘. 텍스트 필드는 말줄임 또는 2줄 clamp 규칙 명시. 이 규칙 없이 데이터가 많으면 어떻게 되는지 미정의 = FAIL."
> **한 화면 정보 예산 = 접힘선 위 핵심 결정 1개** (§6 "다음 행동 1개"의 세로 방향 판). 아래 상한은 그 예산을 지키기 위한 값이지 성능 최적화가 아니다.

| 자리 | 입력 상한 | 표시 상한 | 넘치면 | 현재 코드 |
|---|---|---|---|---|
| 목표 제목 | 60자 | **2줄 clamp**, 넘으면 말줄임 | 전체는 목표 수정 시트에서 확인 | `/me`의 `.receiver-goal-title`은 2줄 clamp ✅. 공개 `GoalCard` 제목은 clamp 없음 ⛔ |
| 목표 "왜" | 200자 | 3줄 clamp | 더 보기로 펼침 | maxLength 200 (`:395` / `:283`). 표시 clamp 없음 ⛔ |
| 응원 메시지 (`/me` 목록 행) | 140자 | **1줄 말줄임** | 행을 눌러 전체 열람 | `me/page.tsx:96` `truncate` ✅ (지금 "…곧 친"에서 잘리는 그 규칙) |
| 응원 목록 (`/me`) | 없음 | **8행 미니, 20행 펼침** | 9번째부터 같은 자리에서 펼치고, 21번째부터 검색 | `CheerList.tsx`의 8/20 상한·검색·전체 개수 요약 ✅ |
| 워드맵 미니 프리뷰 (`/me`) | 단어 6자 | **6단어** | 초과 개수 요약 + 워드맵 풀뷰로 이동 | `me/page.tsx`의 6개 preview와 `wordmap-overflow-summary` ✅ |
| 워드맵 풀뷰 | 단어 6자 | **12단어** | 13번째부터 구름 밖 펼침 목록 | `Wordmap.tsx` 구름 12개 + `wordmap-overflow-toggle`/`wordmap-overflow-list` 펼침 ✅ |
| 환전 내역 (신청 폼 안) | 없음 | **3행** | 환전 내역 화면으로 이동 | `CashoutRequestForm.tsx:386` `.slice(0, 3)` ✅ |
| 환전 내역 화면 | 없음 | 20행 | 페이지네이션 | `cashout/page.tsx:21` `p_limit: 20` |
| 관리자 처리 큐 | 없음 | **100행** (회원 100 · 원장 200) | 상단 정렬 유지 + 페이지네이션 | `admin/page.tsx:140~142` `p_limit` 100/200/100 |
| 계좌번호·ID 등 식별자 | 없음 | 앞 8자 + `…` + 뒤 4자 | 상세에서 전체 | `admin/page.tsx:77` · `CashoutQueue.tsx:54` ✅ |
| 내 링크 URL | 없음 | 1줄 말줄임 | 복사 버튼으로 전체 획득 | `MyLinkCard.tsx:86` `truncate` ✅ |

**넘칠 때의 규칙 3개.**
1. **자르면 반드시 갈 곳을 준다.** 잘린 데이터가 어디서 전체로 보이는지 같은 화면에 링크가 있어야 한다. 워드맵 풀뷰 12단어 상한처럼 갈 곳이 없는 자리는 그 자체가 결함이다(§6 dead-end 0).
2. **"더 보기"는 접힘이지 페이지 이동이 아니다.** 응원 목록은 같은 자리에서 펼친다. 스크롤 위치를 잃으면 방금 읽던 응원을 다시 찾아야 한다.
3. **개수를 세는 문장에 상한을 섞지 않는다.** CheerCount의 "N명이 응원했어요"는 표시 행수(8)가 아니라 **전체 수**다. 8로 잘린 숫자를 보여주면 받는 사람이 응원을 잃어버렸다고 느낀다.

**격자 상한**: 워드맵은 `flex-wrap` + 중앙 정렬이라 칸수를 세지 않는다. 대신 12단어 상한과 단어 6자 상한이 폭을 막는다(390px에서 최장 케이스 = 6자 단어 12개). 고정 칸 격자를 새로 도입하면 그때 `뷰포트 폭 ÷ 최소 칸폭`으로 상한을 정하고 이 절에 등록한다.

✅ **환전 경계 프로토타입 데이터량 검증:** `docs/design/prototypes/legacy/core-cashout-30-27-v1-gpt-codex.html`은 0건, 30/27 경계, 대량(총 999,999·지급가능 999,996) 토글을 제공한다. 390/1024에서 값 열 최대 58%, `minmax(0, …)`, `overflow-wrap:anywhere`를 적용했고 clean frame에서 수평 overflow 0을 실측했다. 응원 목록과 워드맵 전체 화면의 과다 데이터 검증은 해당 화면 정본의 관할이며, 워드맵 풀뷰 13번째 이후 회수 경로는 아직 ⛔다.

---


## 금액 표기 3층 규칙과 핵심 UX 규칙

> v1.14.0의 §6을 이동했다. 계산과 노출 계층은 이 절이 정본이다.

### 6. 핵심 UX 규칙 (NN/g 휴리스틱 자가검수)

- **금액 표기 3층 규칙 🔒(2026-07-02 회장 확정):**
  - (a) **친구/공개 화면** = 금액·개수 모두 비노출("N명이 응원"만).
  - (b) **받는사람 본인 화면**(receiver-home 홈·wordmap 풀뷰) = 클로버 **개수(🍀 N개)를 주(主) 표기**. **₩ 환산 금지 원칙 유지, 단 웰컴 클로버 성장훅 도입(2026-07-18 회장·컨트롤러 확정)으로 receiver-home 잔액 카드에 한해 "≈30,000원 상당" 형태의 **원화 등가를 보조(작게·회색)로만** 병기 허용. 크기·순서·색으로 개수가 여전히 주가 되게 한다(1클로버=1,000원 등가, 고정환산 표기이지 실제 환전액 보증 아님). wordmap 풀뷰 등 그 외 화면은 기존 개수-only 원칙 그대로.
  - (b′) **본인 한정 개별 금액 노출 🔒(2026-07-19 회장 결정 B)**: 받는사람 **본인**은 `/home` 응원 목록에서 응원별 **클로버 개수(🍀 N)** 를 확인할 수 있다(v1.2.0의 "개별 후원자별 금액 비노출"을 본인에 한해 대체). Discreet 유지 장치 4개가 함께 잠김: ①목록은 **시간순 고정**(금액순 정렬·랭킹·리더보드·합계 비교 UI 금지) ②개수는 행 우측 메타(작게, clover-ink)로 두고 이름·메시지가 주 ③₩ 환산 병기 금지(원화는 (c) 환전에서만) ④익명 응원도 개수는 표시(익명=신원 은닉, 본인 수입 은닉 아님). **제3자·친구·공개 화면(/g, 워드맵, 공유이미지)은 종전대로 완전 비노출.** 프로토: `WIREFRAMES/haenael-receiver-manage-v1-fable.html`.
  - (c) **원화(₩) 실수령 확정 계산은 환전(cashout) 플로우에서만.** 차감은 **두 층**이고 이 순서를 화면이 지킨다 🔒(2026-08-21 회장 확정):
    - **계산식(정본).** `이용료 = floor(환산액 × 10%)` · `부가세 = floor(이용료 × 10%)` · `원천징수 = floor((환산액 − 이용료 − 부가세) × 3.3%)` · `받으실 금액 = 환산액 − 이용료 − 부가세 − 원천징수`. **절사(floor)는 세 지점 각각에 적용**하고, 원천징수의 모수는 환산액이 아니라 **이용료(부가세 포함) 차감 후 금액**이다. 검산: 30,000원 → 이용료합계 3,300 / 원천징수 881 / **25,819원**. 40,000원 → 4,400 / 1,174 / **34,426원**.
    - **환전 자격 기준 = 총보유 30,000원 상당(🍀 30개)** 🔒. 이것은 신청량 하한이 아니다. `총보유(웰컴 포함) ≥ 30`이면 자격에 도달하고, 미달 화면은 dead-end가 아니라 대기 상태로 그린다(user-flow.md §1.2 "조금만 더 모이면").
    - **신청량 계약 = 지급가능 클로버 1개 이상, 지급가능 잔액 이하** 🔒. 지급가능은 웰컴과 진행 중 잠김을 제외한 값이다. 총보유 30·웰컴 3·지급가능 27이면 입력 기본값과 최댓값은 27이며 신청 가능하다. "최소 30개"나 "친구 응원분 30개부터"라는 카피는 자격과 신청량을 다시 섞으므로 금지한다.
    - **웰컴 클로버 처리 🔒(2026-07-18 확정).** 환전 도달판정(30클로버)에는 웰컴을 포함하고, 실제 지급 계산에서는 웰컴을 제외한다(친구 응원분만 지급). 분해표(총보유 / 웰컴 제외 / 지급가능)를 확정 CTA 전에 정직하게 노출한다.
    - **경계 예시 30/27.** `총보유 30 = 친구 응원 27 + 웰컴 3` → 신청량 27 → 환산 27,000원 → 이용료 합계 2,970원 → 원천징수 792원 → 실지급 23,238원. 화면 상단은 "환전 기준을 채웠어요", 입력 힌트는 "환전 기준: 모인 클로버 30개 이상 · 지금 지급 가능 27개"로 쓴다.
    - **심리근거.** Stripe의 pending/available 분리 원칙처럼 성격이 다른 잔액을 한 숫자로 합치지 않는다. Fogg의 Ability 관점에서는 사용자가 통제할 수 없는 웰컴 제외분 때문에 막혔다고 느끼지 않도록 자격과 신청 상한을 한 화면에서 설명한다.
    - **금액 계층 분리.** 잔액 카드의 "≈N원 상당"은 (b) 등가 표기이므로 이용료를 반영하지 않는다. 실수령 확정은 (c) 환전 화면에서만 한다.
    - **표기·위계·안내 문구 규칙은 §8.3이 정본이다**(라벨 단어·행 구성·글자 크기·안내 순서). 여기 §6은 무엇을 계산하고 무엇을 어디서 보여주는가(UX 규칙)까지만 관할한다.
  - (d) **환전 중 잔액 표기 = 총량 유지 + 분할 표시 🔒(2026-08-21 회장 확정 A안).** 환전을 신청해도 **모은 클로버 총량은 줄지 않는다.** 신청한 만큼에 잠금이 걸리고, 총량에서 실제로 빠지는 시점은 **입금이 완료된 때** 하나뿐이다. 반려·이체실패는 잠금만 풀고 총량은 애초에 변하지 않았으므로 되돌릴 것이 없다.
    - **세 값을 화면이 구분한다.** 총 클로버(총량) · 잠긴 클로버 · 사용 가능 클로버. 항등식 `사용 가능 = 총량 − 잠김`이 화면에서 항상 성립해야 한다.
    - **잠김이 있을 때는 총량만 홀로 두지 않는다.** 총량 아래에 **분할 막대 + 두 줄 라벨**("지금 쓸 수 있어요 🍀 N개" / "🔒 환전으로 잠김 🍀 N개")을 반드시 붙인다. 숫자 하나가 두 뜻(모은 양 / 쓸 수 있는 양)을 갖는 것이 A안의 유일한 약점이고, 이 분할 블록이 그 해법이다. 컴포넌트 = `SplitBalanceCard`(§4).
    - **잠김이 0이면 분할 블록은 통째로 사라진다.** 평시 화면에 상시 두 값을 띄우지 않는다(은행 앱과 다른 점. 우리는 잠김이 예외 상태다).
    - **잠김이 있을 때 총량 옆 원화 등가는 감춘다.** 잠긴 분은 이미 (c) 실수령으로 확정돼 있어서, 등가와 실수령이 같은 카드에 나란히 뜨면 금액 계층이 섞인다. 등가는 분할 행 각각에 붙인다(사용 가능 행 = "≈N원 상당", 잠김 행 = "N원 입금 예정").
    - **총량이 줄어드는 순간은 예고하고 설명한다.** ①신청 확인 화면에서 "입금이 끝나면 그때 N개가 빠져요"로 미리 알리고 ②입금 완료 화면에서 "잠겨 있던 N개는 이 돈으로 바뀌었어요. 그래서 모인 클로버가 A개에서 B개가 됐어요"로 이유를 먼저 말한 뒤 ③환전 내역(누적 받은 금액)이라는 회수 경로를 가리킨다. 설명 없이 숫자만 떨어뜨리면 그게 곧 놀람이다.
    - **용어**: "차감·보류·복원"이 아니라 **"잠금·잠금 해제"**로 쓴다. 관리자 화면도 같은 사실을 말한다(§8.2).
- **상태 가시성:** 결제 처리중·성공·실패를 항상 명시(로딩 스피너·toast·에러 카드). 침묵 금지.
- **다음 행동 1개:** 화면마다 primary 액션 1개만 시각적으로 지배. (②=밀어줄게, ①=목표 시작하기)
- **실수 방지:** 결제 전 금액·익명여부 확인. 게스트 결제 시 환불·문의 경로 명시. 닫기 항상 가능.
- **dead-end 0:** empty·실패·만료·비공개·취소 모든 상태에 다음 경로가 있다(user-flow.md가 진실원).
- **약자 배려:** 비로그인 열람 가능, 로그인은 결제/저장 순간에만 최소.


## 용어 사전과 UX 라이팅

> v1.14.0의 §8을 이동했다.


> 상위 기준 = `~/.claude/standards/ux-writing.md`(하우스 보이스 C, 대상 없는 버튼 금지, 수동 줄바꿈 금지, 엠대시 금지).
> 여기는 그 위에 **해낼게에서만 성립하는 것**만 적는다. 일반론은 상위 문서를 보라.

### 8.1 보이스: 돈을 다루지만 금융앱이 아니다

해낼게는 통장이 아니라 **응원이 도착하는 곳**이다. §0 Archetype(링크-인-바이오 + 조용한 송금)과 §1 형용사에 카피를 1:1로 정렬한다.

| 형용사 | 문장에서의 발현 | 위반 예 |
|---|---|---|
| Discreet | 금액·순위를 문장에서도 말하지 않는다. 완료는 한 번만 알린다 | "3명이 총 12,000원을 보냈어요", "응원 랭킹 1위!" |
| Warm | 사람 이름을 부른다("도경님"), 해요체, 행동을 사람의 말로 | "정산이 완료되었습니다", "처리 완료" |
| Trustworthy | 돈이 움직이는 문장은 숫자·조건·다음 행동이 다 있다 | "곧 입금됩니다"(언제·얼마가 없음) |

**금융앱 톤 금지어**: 정산 완료, 처리되었습니다, 승인 요청, 거래 내역, 잔고. → 각각 "입금했어요", "보냈어요", "신청했어요", "환전 이력", "모인 클로버".
**보이스는 상위 문서 확정값(C, 파괴적 확인만 B)을 따른다.** 해낼게에서 B가 걸리는 화면은 두 곳뿐이다: 목표 삭제, 계정 탈퇴.

### 8.2 용어 사전 (고정 표기. 흔들리면 신뢰가 깨진다)

| 개념 | 쓴다 | 쓰지 않는다 | 이유 |
|---|---|---|---|
| 우리가 받는 몫 | **이용료** (전체 표기 "서비스 이용료 (부가세 포함)") | 수수료, 서비스 이용수수료, 플랫폼 수수료 | 회장 결정 2026-08-21. "떼인다"가 아니라 "대가를 지불한다"로 읽히게. **단 "카드 결제 수수료"는 PG사가 받는 실제 수수료라 그대로 쓴다** |
| 국세청 대납분 | **원천징수** (전체 표기 "사업소득 원천징수 3.3%") | 세금 떼기, 소득세 공제 | 세법 용어라 유지. 단 **반드시 "대신 낸다"는 맥락과 함께** 쓴다. 우리 수입이 아님이 드러나야 한다 |
| 응원자가 보내는 것 | **응원** / 동사는 "응원했어요" | 후원, 기부, 서포트, 도네이션 | 후원은 위아래가 생긴다. 응원은 나란히 선다 |
| 받는 사람 적립 단위 | **클로버**, 표기 `🍀 N개` | 포인트, 코인, 캐시 | §6 금액 3층. 개수가 주, 원화는 (b)(c)에서만 |
| 클로버 → 원화 | **환전** | 출금, 인출, 정산, 현금화 | "정산"은 B2B 회계 톤. 약관 원문 인용 시에만 허용 |
| 받는 사람 호칭 | **이름+님**("도경님") 또는 "받는 사람" | 회원님, 고객님, 사용자, 수취인 | Warm |
| 돈이 도착함 | **입금** ("입금했어요") | 지급 완료, 이체 처리 | 관리자 화면은 "지급/이체" 허용(집행 언어) |
| 환전 신청으로 클로버가 묶임 | **잠금** ("40개가 잠겨요" / "잠금이 풀렸어요") | 보류, 차감, 복원, HOLD | §6-(d) A안. 총량은 안 줄고 잠기기만 한다. "차감"은 입금 완료 시점에만 쓰는 말이고, "복원"은 줄어든 적이 있어야 성립하는 말이라 둘 다 사실과 어긋난다. 관리자 화면도 같은 단어를 쓴다 |

**화면별 톤 분리 🔒**: 사용자 화면은 위 표대로. **관리자 화면·약관은 집행/법률 언어를 쓴다**(이용료 10% + 부가세 10% 2줄 분리, 원천징수 모수 명시). 약관도 "서비스 이용료"를 쓰되 최초 1회만 "(이하 이용료)"로 정의한다. (현재 코드에 남은 드리프트 = §7.2)

### 8.3 돈을 차감해 보여줄 때 (이 제품에서 가장 위험한 화면)

차감표는 감정이 "받는다"에서 "떼인다"로 뒤집히는 지점이다. **표기·위계·안내 문구의 정본은 이 절이다**(계산식·수치는 §6-(c)). 여섯 가지를 강제한다.

1. **표에는 숫자만. 설명은 표 밖으로.** 표의 한 행은 **한 줄**이다. 꼬리표·괄호 설명을 행 안에 넣어 2줄로 만들지 않는다(회장 2026-08-21 "이쪽 라인이 두 줄인게 UI가 좀"). 표는 눈이 세로로 훑는 곳이고, 문장이 끼면 훑기가 끊긴다.
2. **받는 금액이 항상 시각적 최상위.** 차감 줄이 몇 개로 늘든 `받으실 금액`은 상단 구분선으로 분리 + 19px(데스크톱 25px). 차감 행보다 작아지면 결함.
3. **우리 몫과 대납 세금을 시각적으로 가른다.** 이용료 = 클로버 그린 정상 무게. 원천징수 = `--muted` 값. 안내 영역에서는 두 블록을 구분선으로 나눈다. 같은 무게로 두면 "많이 떼인다"는 인상만 배가된다.
4. **안내는 한 줄 한 생각으로 쌓는다.** 회장이 실제로 납득한 순서를 그대로 따른다: ①이용료는 커피 한 잔 값 → ②무엇에 쓰이는지 → ③남는 몫이 무엇을 만드는지 → ④세금은 대신 내는 것 → ⑤신고하면 돌려받을 수도. 한 문단에 밀어넣지 않는다.
5. **금액 계층을 섞지 않는다.** (b) 잔액 카드의 "≈N원 상당"은 등가 표기라 이용료를 반영하지 않는다. (c) 환전 화면만 실수령을 확정한다.
6. **행 구성은 화면 종류로 갈린다.** 사용자 화면 = `서비스 이용료 (부가세 포함)` 합계 1줄. 관리자 화면 = `이용료 10%` + `이용료 부가세 10%` 2줄(이체 대사 가능성). 라벨은 "수수료"가 아니라 "이용료", 단 "원천징수"는 세법 용어라 유지(§8.2). 이용료 안내 문구는 모바일에도 노출한다(데스크톱 전용 금지).

### 8.4 나쁜 예 / 좋은 예 (우리 실제 문장. 추상 원칙만 남기면 다음 세션이 또 감으로 쓴다)

| BAD (실제로 폐기된 문장) | GOOD (현행) | 왜 |
|---|---|---|
| "플랫폼 수수료는 정책 확정 전이라 반영되지 않았어요" | "서비스 이용료는 커피 한 잔 값이에요." | 내부 사정을 사용자에게 떠넘김. 게다가 "수수료"·"플랫폼"은 금지어 |
| 표 행에 "사업소득 원천징수 3.3% / 국세청에 대신 냅니다"(2줄) | 표: "사업소득 원천징수 3.3%"(1줄) + 표 밖: "원천징수 3.3%는 저희가 가져가는 돈이 아니에요." | §8.3-1. 표는 대조, 안내는 납득 |
| "소득세는 저희가 가져가는 돈이 아니라 국세청에 대신 내드리는 금액이에요. 다음 해 5월에 종합소득세 신고하시면 돌려받으실 수도 있어요. 실제 지급액은…"(한 문단) | 세 줄로 분리 | 한 문단이면 아무도 안 읽는다 |
| 안내 문구를 데스크톱 전용(`only-d`)으로 | 모바일에도 노출 | 돈이 실제로 빠지는데 모바일 사용자만 이유를 못 보면 결함 |
| 안내 텍스트를 `--faint`로(대비 2.81:1) | `--muted`(4.71:1, §3.1) 이상 | 돈 설명을 흐리게 두는 것은 불친절이 아니라 불신 |
| "환전 신청이 완료되었습니다" | "환전 신청이 접수됐어요" + 얼마를 언제 | 금융앱 톤 + 다음 정보 없음 |

### 8.5 금지 (발견 즉시 재작성)

일반 금지(엠대시, 문장 중간 수동 줄바꿈, 사과체, 과잉 친근, 대상 없는 버튼, 시스템 언어)는 상위 `standards/ux-writing.md` §4를 그대로 상속한다. 여기 다시 적지 않는다. **해낼게에서 추가로 금지하는 것만:**

- **자화자찬 사명 문장** ("건강한 문화를 만들어가는 해낼게입니다").
- **금융앱 톤 금지어** (목록·대체어 = §8.1).
- **돈이 움직이는 문장의 모호어** ("곧", "잠시 후", "~인 것 같아요"). 언제·얼마를 못 쓰면 그 문장은 아직 쓰면 안 된다.
- **금액·순위 노출** (§5-1·§5-2. 카피에서도 금지: "3명이 총 12,000원", "응원 랭킹 1위").
- **응원 문구의 위아래** ("후원해 주셔서 감사합니다"). 응원은 나란히 선다(§8.2).

> **사명을 말하는 법**: 회장이 원한 "도전과 응원을 확산하는 건강한 문화"는 **선언이 아니라 돈의 쓰임새 문장**으로 쓴다. GOOD: "남는 몫은 더 많은 사람이 목표를 걸고 응원받게 하는 데 씁니다." BAD: "저희는 건강한 응원 문화를 만들기 위해 노력하고 있습니다."

---


## 에이전트 프롬프트 가이드와 자가검증 예제

> v1.14.0의 §9를 이동했다.


새 화면은 아래 순서로 착수한다. 이 순서를 건너뛰고 토큰이나 컴포넌트를 새로 만들지 않는다.

1. **현재 구현부터 읽는다.** 대상 route, 그 route가 import하는 컴포넌트, `globals.css`, `layout.tsx`를 열고 현재 섹션·상태·인터랙션을 목록화한다. 없는 화면이면 가장 가까운 같은 역할 화면을 찾는다.
2. **정본을 고정한다.** `pipeline-state.core.md`의 현재 design 상태와 §10의 유효 프로토타입을 대조한다. 같은 화면이 여러 파일에 있으면 §10의 우선순위를 따른다.
3. **기존 부품으로 조립한다.** §4 인벤토리에서 먼저 고른다. 새 부품이 필요하면 DESIGN.md에 역할·상태·토큰을 `[신설·미구현]`으로 먼저 등재하고, 기존 부품으로 해결할 수 없는 이유를 남긴다.
4. **실제 칠 값을 고른다.** 색·타이포·간격은 §3.8 개발용 정본표에서 `역할 → 칠 값 또는 클래스 → 실제 값` 순서로 찾는다. 문서 역할명만 보고 `--ink`, `h1` 같은 미구현 이름을 코드에 쓰지 않는다.
5. **레이아웃 계약을 적는다.** 모바일 390은 주축 `column`, 데스크톱 1024는 본문+사이드 레일 2열이다. 열수, 순서, 접힘 규칙, 최대 폭, 정렬선을 화면 주석과 와이어프레임에 같이 적는다. [실측 `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html`:72-87,397-399]
6. **상태를 먼저 그린다.** happy·empty·loading·error·disabled·overflow를 빠짐없이 정의한다. 데이터가 쌓이는 자리에는 최소 0·정상·과다 3상태를 렌더한다. 잘린 데이터에는 전체로 가는 경로를 둔다(§6.1).
7. **전환 이유를 붙인다.** 결제·환전·저장·공유 화면에는 Fogg, Hick, Fitts, Nielsen 중 최소 1개와 실제 화면 발현을 1:1로 적는다. 돈 화면은 과정 가시성을 줄이지 않는다.
8. **자가검증 후 갱신한다.** §9.1 예제를 문서만 보고 다시 만들 수 있는지 확인한다. 새 값·새 컴포넌트·새 패턴이 생겼다면 프로토타입과 같은 턴에 DESIGN.md를 갱신한다. 엠대시, 신규 임의 px, dead-end, 숨은 overflow가 하나라도 있으면 출고하지 않는다.

### 9.1 자가검증 예제: 이 문서만 보고 잔액 카드 한 줄 치기

대상은 `/me`의 `SplitBalanceCard` 바깥 카드다. 아래 여섯 줄은 전부 이 문서의 §3.8과 §4에서 찾을 수 있어야 한다.

| 확인 항목 | 이 문서에서 찾은 값 | 근거 |
|---|---|---|
| 크기 | 부모의 사용 가능 너비 100%, 고정 높이 없음. 내부 `SplitBalanceCard`는 block auto | §4 `SplitBalanceCard`, §3.8.3. [실측 `web/src/app/(receiver)/me/page.tsx`:298-317] |
| 여백 | 카드 `p-4` = 16px. 분할 블록은 `mt-3` 12px, 행 사이 `mt-2` 8px | §3.8.3. [실측 `web/src/app/(receiver)/me/page.tsx`:299-302, `web/src/components/goal/SplitBalanceCard.tsx`:54-57,75-76] |
| 모서리 | `rounded-[14px]` = 14px `md` | §3.4. [실측 `web/src/app/(receiver)/me/page.tsx`:299-302] |
| 글꼴 | Pretendard. 총량 20px/800, 행 값 13px/700, 라벨 11.5px/700 | §3.2 + §3.8.2. [실측 `web/src/components/goal/SplitBalanceCard.tsx`:34-44,75-84,91-103] |
| 색 | 표면 `#FFFFFF`, 경계 `#E8E4DC`, 사용 가능 막대 `#1B8A4F`, 잠김 면 `#E8D3A6/#FBF1DD` | §3.8.1. [실측 `web/src/app/(receiver)/me/page.tsx`:299-302, `web/src/components/goal/SplitBalanceCard.tsx`:54-71] |
| 텍스트색 | 총량·사용 가능 `#14613A`, 기본 라벨 `#16140F`, 잠김 `#8A5A12`, 설명 `#6F6A60` | §3.8.1. [실측 `web/src/components/goal/SplitBalanceCard.tsx`:36-44,75-83,91-113] |

**못 찾은 줄: 없음.** 여섯 항목 모두 문서 안의 역할표와 실제 구현 출처로 역추적된다.

### 9.2 v1.14.0 자가검증·레드팀

**까다로운 개발자 공격:** "하드코딩 hex와 임의 px를 개발용 정본이라고 부르면 기술부채를 공식화하는 것 아닌가?"

**수정:** §3.8은 현재 화면을 정확히 재현하는 대조표로 한정했다. semantic 변수가 없는 값은 명시적으로 `semantic 변수 없음`과 `[신설·미구현]`으로 표시했고, 새 별칭·새 조합 추가를 금지했다. 이 표는 이탈을 숨기지 않고 다음 마이그레이션 범위를 고정한다.

**회의적 투자자 공격:** "문서가 길어졌지만 다음 에이전트가 결국 어느 시안을 따라야 하는지 모르면 비용만 늘어난다."

**수정:** §10에서 정본, 유효 보조, 결정용, 폐기를 네 상태로 나눴다. 환전은 v3.6을 화면 정본으로 고정하되, `pipeline-state.core.md`상 design 승인 대기라는 상태도 같이 적어 승인 전 확정으로 오독하지 않게 했다.

**셀프심문. 이 결론이 틀렸다면 가장 그럴듯한 이유는?** 가장 위험한 가정은 "현재 코드가 곧 권장 토큰"이라는 오독이다. 실제로 코드는 `#16140F`, `#1B8A4F`, 22px을 직접 쓰고 전역 8pt 규칙과 충돌한다. 그래서 §3.8의 목적을 현행 재현과 이탈 인벤토리로 제한하고, 새 화면은 기존 셸 정렬선만 승계하되 마이그레이션은 §7.2 별도 build 결정으로 회수하도록 수정했다.

**문서형 품질 판정:** Design Score B+ 상당(문서 구조·토큰 추적성 자가검증, 화면 산출물 변경 없음). 기존 화면 정본 v3.6의 실렌더 Design Score A-는 프로토타입 STAMP와 `pipeline-state.core.md`:13,187의 기존 검증 기록을 인용한 것이며 이번 턴에 재실행했다고 주장하지 않는다.
### v2.0.0 구조 재편 셀프심문·레드팀

**까다로운 파서 공격:** "Motion과 제품 고유 절이 표준 8섹션 사이에 끼어 순서 검증을 깨뜨린 것 아닌가?"

**확인과 수정:** 표준 8섹션을 먼저 연속 배치했고 Motion부터 모든 제품 고유 절을 그 뒤로 이동했다. Google 공식 CLI lint 결과는 오류 0건이다. `shadows`와 `motion`은 공식 구조 토큰 범위 밖의 사용자 확장이라 export 대상이 아니라는 경고만 남는다. 사용자 요구에 따라 두 값을 YAML에 보존하고 본문에서 적용 의도를 설명한다.

**회의적 개발자 공격:** "문서가 602행에서 길어졌지만 값이 프론트매터와 본문에 이중으로 있어 다시 드리프트하지 않나?"

**수정:** 기계 판독값의 정본은 YAML, 본문의 역할표는 사용처와 코드 이탈 설명으로 관할을 분리했다. 본문의 hex·px는 값 정의를 반복하려는 것이 아니라 현재 코드 클래스와 리터럴을 역추적하기 위한 증거다.

**셀프심문. 이 결론이 틀렸다면 가장 그럴듯한 이유는?** 가장 위험한 가정은 "내용을 줄이지 않았으니 의미도 보존됐다"는 착각이다. 문단 자체가 남아도 섹션 맥락이 바뀌면 규칙의 관할이 흐려질 수 있다. 그래서 상단 대응표와 각 섹션의 v1.14.0 이동 주석을 추가하고, 금액 계산, 오버플로, UX 라이팅, 미해결, 확정 결정을 각각 독립 H2로 분리해 검색 경로를 고정했다.

**문서 구조 검증:** Google 공식 CLI lint 오류 0건. `##` 헤딩 16개는 모두 고유하며 중복 0건이다. 문서 길이는 v1.14.0 602행에서 v2.0.0 806행으로 증가해 개정 시 분량 축소 금지를 지켰다. 화면·코드·프로토타입 변경은 없다.


---


## 미해결

> v1.14.0의 §7.1 회장 결정 대기와 §7.2 작업 대기를 이동했다. 닫힌 결정은 다음 Decisions Log에 둔다.


> 디자인이 드러낸 갭. 정책 결정과 구현 대기를 분리한다. `docs/design/user-flow.md` v0.3.1과 이 절은 2026-08-29 기준으로 동기화했다.

### 7.1 회장 결정 대기 (상류 정책)

1. **환불 정책**: 응원 결제 취소·환불 가능 기간과 범위. 결정 전까지 게스트 결제 화면의 "환불·문의 경로 명시"(§6 실수 방지)가 문의 폼으로만 연결된다.

미성년 환전 정책은 2026-08-25 회장 결정과 `20260825010000_cashout_verified_minor_only.sql`로 닫혔다. 연령 확인 기록이 없거나 최신 기록이 성인이면 신청을 허용하고, 최신 기록이 미성년인 계정만 차단한다.

### 7.2 작업 대기 (결정은 끝났고 반영만 남음)

1. **약관·개인정보 용어 드리프트** ⛔: 정본(§8.2)과 어긋난 표기가 코드에 남아 있다. build 라인 정리 대상.
   - `web/src/app/terms/page.tsx`: "서비스 이용수수료" 9회 → "서비스 이용료"로 통일하고 최초 1회만 "(이하 이용료)"로 정의.
   - `web/src/app/privacy/page.tsx`: "응원(후원)"(126행) · "환전(정산)"(55·136행) → 괄호 병기 제거. 약관 원문 인용 자리에서만 "정산" 허용(§8.2).
2. **텍스트 오버플로 잔여 3건 해소** ✅ (2026-09-06, 상세 = §6.1 표). ①공개 `GoalCard` 목표 제목 `line-clamp-2` ②목표 "왜" `line-clamp-3` + `goal-reason-toggle` 펼침(`aria-expanded`) ③워드맵 풀뷰 13번째 이후 펼침 목록. `/me` 목표 제목, 응원 8/20/검색, 미니 워드맵 6개+초과 요약은 운영 1.2.0에서 해소됐다.

✅ **이번 30/27 슬라이스의 디자인 작업 대기 없음.** `CashoutRequestForm.tsx`의 helper와 자격 도달·지급가능 0 카피가 §6-(c)와 일치하도록 현재 작업트리에서 수정됐고, focused canonical prototype·수치 규격·clean frame도 출고했다. 코드 테스트와 운영 실계정 관찰은 build·QA 관할이다.


## Decisions Log

> v1.14.0의 §7.3 확정 이력을 이동했다. 재논의하지 않는 결정의 근거를 보존한다.


1. ~~하트/클로버 네이밍 구조~~ **✅ 확정(2026-07-01): 전부 유료**(워드맵 단어 한 개도 유료, 무료 tier 없음). 하트=응원자가 보내는 표현 / 클로버=받는사람 적립·환전 단위(동일 자금 양면 네이밍). 최소 1,000원.
2. ~~① 가입 방식~~ **✅ 확정: write-first** (시작하기 → 목표쓰기 → 저장 시 로그인). draft 로컬보존 필수.
3. ~~① 랜딩 포지셔닝~~ **✅ 확정: C 미니멀 + 워드맵 프리뷰 하이브리드** (`landing-final.html`).
4. ~~게스트 결제 허용 범위~~ **✅ 확정(2026-07-01): 게스트 결제 허용**(앱가입 X, 간편결제). 응원자 익명표시 가능("익명의 누군가"), PG엔 신원 남음. 어뷰징은 환전 KYC·이상거래에서 차단.
5. ~~환전 자격 기준 수치~~ **✅ 확정: 총보유 30,000원 상당(🍀 30개)**. 이것은 신청량 하한이 아니다. 실제 신청은 지급가능분 1개 이상이며, 총보유 30·웰컴 3·지급가능 27이면 27개 신청 가능. 운영 계약 `20260825020000_cashout_total_threshold_contract.sql`과 프로토 v3.8이 정본이다. 상세는 §6-(c).
6. ~~환전 중 클로버 표시~~ **✅ 확정(2026-08-21): A안 = 잠금 유지, 실지급 시 차감.** 회장 원문 "A안이지 실제로 빠져나갔을때 빠져나가야지". 근거 = 프로토 v3.5 8번 화면에서 두 표현안을 나란히 렌더해 회장이 선택. **선택의 의미**: 신청은 총량을 건드리지 않고 잠금만 건다. 총량이 줄어드는 유일한 시점은 입금 완료다. 반려는 잠금 해제이지 복원이 아니다. **이것은 문구 수정이 아니라 잔액 계산 방식 변경**이므로 상류(기술설계)로 넘어간다. 화면 규칙 = §6-(d), 반영 프로토 = `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html` v3.6(8번 표현안 화면은 결정 종결로 삭제).

---


## 부록: 지금 유효한 프로토타입

> v1.14.0의 §10과 변경 이력, 품질 푸터를 이동했다.


프로토타입이 충돌하면 **화면별 정본 > 유효 보조 > 결정용 비교판 > 폐기** 순서로 읽는다. 코드가 더 최신이어도 design 승인 전에는 자동으로 시안 정본이 되지 않는다.

| 상태 | 파일 | 적용 범위·판정 근거 |
|---|---|---|
| **현행 경계 정본, 승인 대상** | `docs/design/prototypes/legacy/core-cashout-30-27-v1-gpt-codex.html` v1.0.0 | 총보유 30·웰컴 3·지급가능 27 신청·확인·제출중·접수. 390/1024, 0건·경계·대량 토글, clean export 지원. 수치 정본=`docs/design/design-spec-core-cashout-30-27-v1-gpt-codex.md` |
| **전체 여정 보조, 개정안** | `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html` v3.8 | v3.7 전체 여정에 30/27 경계와 신청량 입력 계약을 추가했다. 사용자·관리자, 390/1024, 잠금 A안 계승 |
| **현행 화면 정본** | `docs/design/WIREFRAMES/landing-final.html` | 받는 사람 가입 랜딩 v2. [실측 파일:6, `DESIGN.md` 변경 이력 v1.6.0] |
| **현행 화면 정본** | `docs/design/WIREFRAMES/goal-page.html` | 친구가 보는 목표 페이지 v2. [실측 파일:6, `DESIGN.md` 변경 이력 v1.6.0] |
| **현행 화면 정본** | `docs/design/WIREFRAMES/payment-flow.html` | 게스트 결제 전체 v2. [실측 파일:6, `DESIGN.md` 변경 이력 v1.6.0] |
| **유효 보조** | `docs/design/WIREFRAMES/haenael-receiver-manage-v1-fable.html` | 받는 사람 재방문, 관리 진입, 본인 한정 개별 클로버 노출. [실측 파일:6, `DESIGN.md` 변경 이력 v1.7.0] |
| **유효 보조** | `docs/design/WIREFRAMES/haenael-v2-hub-v1-claude-fable.html` | 다중 목표·마이페이지·프라이버시·고객센터·승격·감사·탈퇴 허브. [실측 파일:6, `DESIGN.md` 변경 이력 v1.8.0] |
| **유효 보조** | `docs/design/WIREFRAMES/receiver-home.html` · `wordmap-share.html` · `error-states.html` | 홈·워드맵 확산·dead-end 0의 상태 참조. 환전 잔액 표현은 v3.6이 우선. [실측 각 파일:6] |
| **결정용, 정본 아님** | `docs/design/WIREFRAMES/landing-compare.html` · `landing-shotgun.html` · `onboarding-compare.html` | 선택 과정 보존용. 확정안 구현 근거로 직접 쓰지 않는다 |
| **폐기, 보존만** | `docs/design/WIREFRAMES/archive/landing-final-v1.html` · `archive/goal-page-v1.html` · `archive/payment-flow-v1.html` | v2 승격으로 폐기. [실측 각 파일:6, `DESIGN.md` 변경 이력 v1.6.0] |
| **폐기, 보존만** | `scratchpad/cashout-manual-flow-v2-opus.html` | 수동환전 v2. v3.6 전체 여정으로 대체됨. [실측 파일:6, 정본 v3.6 파일:6] |

**회수 필요: 없음.** 이번 30/27 경계의 디자인 계약은 문서, canonical prototype, 수치 규격, clean frame, 현재 작업트리 UI 카피가 일치한다. 운영 DB에 실제 30/27 회원이 없어 실계정 신청은 QA에서 별도 검증해야 한다.

---

> **변경 이력**
> v2.0.1 (2026-08-29) 운영 1.2.0의 총보유 임계 계약을 디자인 정본에 반영했다. ①§6-(c)에서 총보유 30개 자격과 지급가능 1개 이상 신청을 분리했다. ②총보유 30·웰컴 3·지급가능 27·실지급 23,238원 경계 예시를 고정했다. ③`CashoutRequestForm` 인벤토리에 신청량과 30/27 상태를 추가했다. ④Stripe Connect의 pending/available 분리 원칙과 Fogg Ability를 근거로 기록했다. ⑤`docs/design/prototypes/legacy/core-cashout-30-27-v1-gpt-codex.html` v1.0.0, 31행 수치 규격, clean frame 4장을 출고했다. ⑥운영 1.2.0에서 이미 해소된 shell·정렬선·응원 목록·미니 워드맵 결함을 현행 상태로 갱신했고, 남은 오버플로 3건만 보존했다.
> v2.0.0 (2026-08-23) Google Labs 공개 DESIGN.md 원본 스펙 순서로 문서 구조를 전면 재편했다. ①YAML 프론트매터에 코드·정본 프로토타입 실측 색, 타이포그래피, 간격, 모서리, 그림자, 모션 토큰을 구조화했다. ②본문의 표준 8섹션을 Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts 순서로 고정했다. ③v1.14.0의 Archetype, 브랜드 형용사, 레퍼런스, 토큰 설명, 역할↔코드 대조표, 컴포넌트, 금지 패턴을 해당 표준 섹션으로 이동했다. ④Motion, 오버플로, 금액 표기, UX 라이팅, 에이전트 가이드, 미해결, Decisions Log, 유효 프로토타입은 원본 스펙이 허용하는 제품 고유 절로 8섹션 뒤에 보존했다. ⑤코드와 프로토타입은 수정하지 않았다.
> v1.14.0 (2026-08-23) 전역 `standards/design.md` §15 필수 목차 감사 반영. ①§3.8에 색 15역할, 타이포 13역할, 간격 13역할의 `역할 / 칠 값 또는 클래스 / 실제 값(파일:행) / 쓰는 곳` 개발용 정본표를 코드·프로토 실측으로 신설했다. 문서 역할명과 하드코딩 구현의 차이를 숨기지 않고 semantic 변수 없음·`[신설·미구현]`을 분리했다. ②§9에 새 화면 착수 8단계와 잔액 카드 6항목 자가검증을 추가했고 못 찾은 줄 0건을 확인했다. ③§10에 현행 정본·유효 보조·결정용·폐기 프로토타입을 분리했다. 환전 v3.6은 화면 정본이지만 design 승인 대기임을 명시했다. ④전역 필수 목차 14절 대조표를 §15.1과 정확히 맞추고 오버플로·용어 사전 누락을 정정했다. ⑤코드·프로토타입은 수정하지 않았다.
> v1.13.0 (2026-08-23) 회장 지적 "DESIGN.md에 뭘 넣어야 하는지 표준도 알지?" → 전역 표준(`standards/design.md` §1·§5·§9, `ux-writing.md` §8)이 요구하는데 빠져 있던 **필수 4항목**을 채웠다. 신규 원칙 발명 없이 **이미 쓰고 있는 값을 실측해 박제**한 것이 전부다. ①**§6.1 오버플로 방지 규칙 신설**(미정의 = 실격 항목): 목표 제목·"왜"·응원 메시지·응원 목록·워드맵·환전 내역·관리자 큐·식별자·링크 URL 9개 자리의 입력 상한·표시 상한·초과 시 행동을 코드 실측(`me/page.tsx:96·206·211`, `Wordmap.tsx:115`, `CashoutRequestForm.tsx:386`, `admin/page.tsx:140~142`, `OnboardingGoalForm.tsx:321·395`)으로 표에 고정 + 넘칠 때 규칙 3개. ②**§3.7 Layout Grid 신설**: 모바일 390 단일 컬럼 / 데스크톱 1024 2단(1.15fr·0.85fr, gap 32), 정렬선 22px·56px을 프로토 v3.6 CSS 72~87행에서 실측 박제. ③**§4.1 Shell 신설**: 문서 셸·페이지 셸·상단 바·하단 회수 링크 4층 정의(GNB 없음이 §0 귀결). ④**§3.2 서체 선택 근거**: Pretendard가 §1 형용사 3개를 어떻게 만드는지 + system-ui·Inter·전용 서체를 안 쓰는 이유. **선택 시점 근거는 저장소에 없어 "미기록"으로 명시하고 소급 정당화임을 밝혔다**(지어내지 않음). ⑤표면화한 결함 4건을 §7.2에 등록: shell 미공유, 정렬선 이탈(`/me` 최대 폭 없음), 오버플로 미구현 4건, 프로토 v3.6에 overflow 상태 0개. 코드·프로토 수정은 하지 않았다(다음 슬라이스).
> v1.12.0 (2026-08-21) 회장 확정 **"A안이지 실제로 빠져나갔을때 빠져나가야지"**(환전 중 클로버 = 잠금 유지, 실지급 시 차감) 반영. ①**§6-(d) 신설**: 잔액 표기 규칙. 총 클로버·잠긴 클로버·사용 가능 클로버 세 값과 항등식(`사용 가능 = 총량 − 잠김`), 잠김이 있을 때 분할 막대 + 두 줄 라벨 강제, 잠김 0이면 블록 소멸, 총량 옆 등가 은닉, 총량 감소 시점의 예고·설명·회수 경로 3단. ②§4에 `SplitBalanceCard` 등록. ③§7.3-6에 A안 확정 이력 박제(재논의 금지, 8번 표현안 화면 삭제). ④§8.2 용어 사전에 "잠금" 행 추가("보류·차감·복원" 폐기). ⑤§3.1에 상태색 글자 짝 `--amber-ink #8A5A12`(5.27:1)·`--danger-ink #B23225`(5.34:1) 등록과 원색·ink 사용 규칙 명문화. ⑥§3.1 `--clover` 대비값 오기 정정(4.5 ✅ → 실측 **4.38 ⚠️ AA 미달**), 회장 보류 표시(임의 변경 금지). 반영 프로토 = `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html` v3.6.
> v1.11.0 (2026-08-21) 회장 지시 "design.md, ux-writing.md 정리 제대로 해놓고" → 정본 정합 정리(신규 원칙 없음). ①변경 이력 전 항목 최신순 재정렬(v1.10.0→v1.0.0). ②§7을 3소절로 분리: 7.1 회장 결정 대기(미성년 연령게이트·환불 정책만) / 7.2 작업 대기(§8.2에 서술돼 있던 약관·개인정보 용어 드리프트를 파일·행 단위로 이관) / 7.3 확정 이력(1~4 + 최소환전액 30,000원 확정으로 이동). ③§6-(c)와 §8.3 중복 해소: 계산식·수치는 §6-(c), 표기·위계·안내 문구는 §8.3 정본으로 관할 분리(§8.3에 6번 행 구성 규칙 흡수, "네 가지"→"여섯 가지" 개수 불일치 수정). ④§8.5를 상위 ux-writing.md §4 상속 + 해낼게 고유 금지 5종으로 축소(일반론 중복 서술 제거). ⑤§3.1 --faint 대비값 오기 수정(3:1 → 실측 2.81:1, WCAG 미달 명시)으로 §8.4와 정합. ⑥문서 전역 엠대시 제거.
> v1.10.0 (2026-08-21) 회장 지시 "디자인시스템 UX라이팅기준 정리좀해라" → **§8 UX 라이팅 신설**(보이스·용어 사전 7종·돈 차감 표기 5규칙·실제 GOOD/BAD·금지). 상위 기준 `standards/ux-writing.md` 상속, 해낼게 고유분만 수록. 회장 지적 반영으로 정본 프로토 v3.4(차감표 1줄화 + 안내 단계화 + 모바일 `.u-side` 갭 24px 공통화). 용어 드리프트 표면화: 약관 "서비스 이용수수료", 개인정보 "응원(후원)"·"환전(정산)" → build 라인 정리 대상.
> v1.9.0 (2026-08-21) 회장 확정 "환전 서비스 이용료 10%"를 §6-(c)에 계산식·표기·위계로 박제(수수료 미정 플레이스홀더 폐기). 정본 프로토 `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html` v3.3, 구 와이어 `WIREFRAMES/cashout.html` 동기화.
> v1.8.0 (2026-07-22) v2 신규 화면(PRD v0.3.0 확정 8건): 컴포넌트 10종 추가(GoalListCard·AccountBalanceCard·NewGoalButton·SettingsRow·PrivacySwitch·PrivacyPreview·ThanksComposer·UpgradeCard·InquiryForm 등). 원칙 추가: ①잔액은 계정 전체 1개, 목표 카드는 인원수만(금액 3층 유지) ②응원 금액은 설정 항목이 아니라 잠긴 상수로 그린다 ③승격 유도는 결제 완료 화면 1곳만 ④감사 미전송에 배지·카운트·독촉 금지. 프로토: `WIREFRAMES/haenael-v2-hub-v1-claude-fable.html`.
> v1.7.0 (2026-07-19) 받는사람 본인 관리 경험 보완(회장 승인): §6-(b′) 신설. 본인=개별 클로버 개수 노출(회장 결정 B), 제3자 비노출·랭킹 금지 유지. 재방문 진입 동선 확정 (a)세션 라우팅+(b)/g/[slug] owner bar (user-flow.md §1.3). 프로토 `haenael-receiver-manage-v1-fable.html`.
> v1.6.0 (2026-07-02) 회장 확정: v2 3종 **정본 승격**: landing-final·goal-page·payment-flow 정본명 승계, v1은 `WIREFRAMES/archive/*-v1.html` 보존. 리테이크가 누락한 상태를 정본에 복원(결제 실패=payment-flow 5b, 마감 목표=goal-page 3) → coverage ❌0 유지. ⛔ 정책 4건 eng-design/legal DEFER 확정(화면 자리 확보). **design 단계 산출물 마감.**
> v1.5.0 (2026-07-02) 강화 프로토콜 첫 적용: 핵심 3화면 비주얼 리테이크. Reference 표를 웹 직접조사(BMC·Ko-fi·토스위젯·Linktree·투네이션) 근거로 갱신, 각 화면에 벤치마킹 출처·심리법칙 캡션. §5-5 gradient 예외(워드맵/후광 clover 옅은 radial) 명문화.
> v1.4.0 (2026-07-02) 금액 표기 3층 규칙 확정(§6): 받는사람 본인=클로버 개수(🍀 N개)만, ₩ 환산은 환전 플로우에서만. receiver-home·wordmap-share·cashout 진입부 ₩ 제거.
> v1.3.0 (2026-07-02) 워드맵 공유 확산 고리를 실제 화면으로(`wordmap-share.html`): 홈=워드맵보기 단일 CTA, 풀뷰→아이콘 공유(이미지 저장/인스타 스토리 링크스티커/링크복사, 텍스트 버튼 X)→친구 링크탭→② 도착. receiver-home 홈 단순화(재공유 스텝 이관).
> v1.2.0 (2026-07-01) 전체 플로우 전수 설계: ② 결제전과정·받는사람 로그인후·환전/정산 프로토 추가. 확정 반영(전부 유료·게스트 결제 허용·익명표시). 받는사람 본인은 총 잔액 노출/개별 후원자별 금액 비노출 규칙 명문화. coverage.md = 완료 판정 근거.
> v1.1.0 (2026-07-01) 회장 결정 반영: ① 랜딩 = C 미니멀+워드맵 프리뷰 하이브리드 확정(`landing-final.html`), ① 가입 = write-first 확정.

---

SKILLS_USED: pipeline. design 단계 산출물 최신성 감사와 하류 회수 판정에 사용.
SKILLS_SKIPPED: 제품 UI 전용 design-shotgun·design-review 스킬은 현재 세션에 제공되지 않았다. 기존 승인 시안을 계승한 계약 보정이라 신규 스타일 샷건은 적용하지 않았다.

SOURCES/MODEL:
- MODEL: gpt-codex 런타임. 역할 product-designer.
- 품질헌법: `/Users/sj/.claude/CLAUDE.md` · `/Users/sj/.claude/standards/design.md` §1·§3·§5·§9·§11·§15 · `/Users/sj/.claude/standards/doc-review.md` · `/Users/sj/.claude/standards/benchmarks.md` · `/Users/sj/.claude/standards/artifact-stamp.md`.
- 기존 구현: `web/src/app/(receiver)/me/page.tsx` · `cashout/page.tsx` · `cashout/status/page.tsx` · `web/src/components/goal/SplitBalanceCard.tsx` · `Wordmap.tsx` · `GoalEditSheet.tsx` · `web/src/components/cashout/CashoutRequestForm.tsx` · `web/src/components/admin/CashoutQueue.tsx` · `web/src/app/admin/page.tsx` · `web/src/app/layout.tsx` · `web/src/app/globals.css`.
- 기존 정본·wiki: `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html` v3.8 · `docs/design/prototypes/legacy/core-cashout-30-27-v1-gpt-codex.html` v1.0.0 · `docs/design/design-spec-core-cashout-30-27-v1-gpt-codex.md` · `pipeline-state.core.md` · `docs/구현현황.md` · `wiki/brand/visual-guidelines.md` · `wiki/brand/story-canon.md` · `wiki/brand-marketing-strategy.md`.
- 문서 골격 실물: `/Users/sj/sj_code_master/zero-one/DESIGN.md` · `/Users/sj/sj_code_master/haejo-danta/DESIGN.md` · `/Users/sj/sj_code_master/openclaw-auto/DESIGN.md`.
- Google DESIGN.md 원본: https://github.com/google-labs-code/design.md/blob/main/docs/spec.md · https://github.com/google-labs-code/design.md/blob/main/PHILOSOPHY.md · https://github.com/google-labs-code/design.md/blob/main/examples/paws-and-paths/DESIGN.md.
- 기존 웹 실조사: https://atlassian.design/foundations/tokens/design-tokens/ · https://carbondesignsystem.com/elements/typography/code/ · https://m3.material.io/foundations/interaction/states/overview.
- 2026-08-29 최신성 조사: https://docs.stripe.com/connect/account-balances · https://developer.apple.com/design/human-interface-guidelines/buttons · https://developer.apple.com/design/human-interface-guidelines/progress-indicators.

RUBRIC_SCORE: 완결성=5/5 정밀성=5/5 벤치마크반영=5/5 추적성=5/5 전문성·톤=4/5 total=24/25
WEAKEST_LINE: "문서형 품질 판정: Design Score B+ 상당"은 화면 렌더용 design-review 스킬 결과가 아니라 문서 정합 자가평가다. 그래서 본문에서 기존 프로토타입의 A- 기록과 이번 작업의 미재실행 범위를 분리했다.
