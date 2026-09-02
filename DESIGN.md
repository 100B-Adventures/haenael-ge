# DESIGN.md — 해낼게 (haenael-ge) 디자인 시스템 contract

> **Path B (신규 디자인시스템).** 기존 시스템 없음 → 본 문서가 단일 진실원(SSOT).
> 브랜드 **해낼게** · 슬로건 "응원은 돈으로 하는 겁니다." · One Thing "친구가 선언한 목표에, 조용히 돈으로 응원하고 간다."
> 토대: shadcn/ui + Radix primitives + Tailwind 토큰. commons/PostAGI-public 결제·인증 컴포넌트 재사용 전제(PRD §9).
> 이 contract를 어기는 시안은 reject. "예쁘게"가 아니라 **제약 기반**으로 만든다.

---

## 0. Archetype (고정 — 임의 변경 금지)

**링크-인-바이오 프로필 + 조용한 송금 + 워드맵.**
대시보드 아님. 피드 아님. 커뮤니티 아님. 단일 컬럼 모바일 웹, 인스타 바이오 링크로 열리는 프로필형.

두 화면을 절대 섞지 않는다(컨트롤러가 이전에 섞었던 지점):
- **① 받는 사람 가입 랜딩** — 받는 사람이 "나도 목표 만들래" 하는 supply-acquisition 화면. **친구는 여기 오지 않는다.**
- **② 친구가 보는 목표 페이지** — 공유 링크 타깃. 친구가 인스타 링크 타고 직접 도착해 응원·결제. role-transition("나도 만들래")은 ②에서 ①로만 흐른다.

---

## 1. Brand Adjectives (3 — 모든 토큰 결정의 상위 기준)

| # | 형용사 | 뜻 | 디자인 함의 | 위반 = slop |
|---|---|---|---|---|
| 1 | **Discreet 조용한** | 비동기·무부담. 익명 강제 아님. 금액·과시·강제호혜 없음 | 금액 절대 비노출, 랭킹/리더보드 없음, 알림 은은, 완료는 toast 한 번 | 시끄러운 뱃지·금액 자랑·"답장하세요" 다크패턴 |
| 2 | **Warm 따뜻한** | 휘발되는 "화이팅"이 아닌, 손에 잡히는 사적 애정 | 웜 페이퍼 배경, 둥근 radius, 사람 이름·말투, 워드맵의 손글씨 같은 다정함 | 차가운 핀테크 그레이, 기업 SaaS 톤, 스톡 일러스트 |
| 3 | **Trustworthy 믿음직한** | 돈이 오간다. 안전·깨끗·명료해야 결제가 일어남 | 단색 클로버 그린(성장+안전), 정돈된 간격, 명확한 다음 행동, 결제 상태 가시성 | 네온/보라 gradient, glassmorphism, 가짜 3D, 정체불명 CTA |

> 셋의 긴장: Discreet(가리기) ↔ Trustworthy(보여주기). 해법 = **"누가·N명"은 보이되 "금액·순위"는 가린다.** 이 라인을 모든 화면이 지킨다.

---

## 2. Reference 5 (실제 제품 — 웹 직접 조사 2026-07-02, 관념 벤치마킹 아님)

| # | 레퍼런스 | 조사한 실제 화면 근거 | 우리가 가져오는 것 | 우리가 버리는 것 |
|---|---|---|---|---|
| 1 | **Linktree** | 프로필 = 아바타+강한 팔레트+중앙정렬 라벨 CTA "미니 웹사이트"(linktr.ee/s/templates) | 단일 컬럼·아바타·중앙정렬·CTA-first 브랜딩 | 링크 카드 나열·Bento 그리드(우리는 단일 CTA) |
| 2 | **Buy Me a Coffee** | 수량 칩("1/3/5" 커피 개수)·"Say something nice…" 메시지·"Support $3" 버튼·supporters wall(아바타+이름+메시지+크리에이터 하트 답장)(buymeacoffee.com) | 수량 칩 앵커(→클로버 개수)·무부담 메시지 카피·supporter wall(→워드맵) | 개수·금액 노출("bought 25 coffees"=과시)·크리에이터 답장 의무 |
| 3 | **Ko-fi** | 0% 수수료·tip panel 상시노출·CTA 문구 커스텀(Support/Tip)(help.ko-fi.com) | 상시 노출 tip 진입·따뜻한 CTA 문구 | 위젯 잡화점식 다기능 |
| 4 | **토스페이먼츠 결제위젯** | 시트 순서 = 상품(금액 큰 표시 "결제 금액 15,000원")→결제수단→약관→하단 고정 "결제하기"(docs.tosspayments.com) | 큰 금액 확인·결제수단 로고 버튼·하단 고정 CTA·상태 가시성 | 금융 대시보드 밀도·약관 과다 노출 |
| 5 | **투네이션 후원 페이지** | 후원자 메시지·익명 옵션·비로그인 열람·월정산(help.toon.at) | 후원자 메시지·익명 옵션·비로그인 열람 | BJ 청중 일방·과시·금액 노출·랭킹 |

> (보조 문화 레퍼런스: 인스타 스토리/Threads = 모바일 네이티브·감정 톤, 공스타 문화 정합. 셋로그 = 목표선언 카드·D-day. 차용하되 무한피드·habit 숙제감은 버림.)

---

## 3. Design Tokens

> hex = 정본. Tailwind `theme.extend` + CSS var로 노출. shadcn 시맨틱 네임 매핑 병기.

### 3.1 Color
```
/* base / surface */
--bg            #FBFAF7   warm paper      (background)
--surface       #FFFFFF   카드/시트        (card, popover)
--line          #E8E4DC   border/divider  (border, input)
--warm          #F4EFE6   웜 틴트 영역      (muted surface)

/* text */
--ink           #16140F   본문 primary     (foreground)        대비 16:1 ✅
--muted         #6F6A60   보조 텍스트       (muted-foreground)  대비 4.7:1 ✅
--faint         #9C968B   placeholder/메타  (대비 3:1 — 큰글씨/비핵심만)

/* brand — clover green = 성장 + 안전 + "클로버" 네이밍 정합 */
--clover        #1B8A4F   primary 채움(버튼 bg). 흰 텍스트 대비 4.5:1 ✅ (AA normal)
--clover-bright #1F9E5A   강조/아이콘/링크(채움 위에서만, 본문 텍스트 금지 — 대비 3:1)
--clover-soft   #E7F4EC   primary 틴트 bg(칩·하이라이트)
--clover-ink    #14613A   클로버 위 텍스트가 필요할 때

/* state */
--danger        #D9483B   결제 실패/에러     (destructive)
--danger-soft   #FBEAE7
--success       = --clover (별도 색 없음 — 성공도 클로버)
```
규칙: **그린은 채움(fill)으로만.** 그린을 본문 글자색으로 쓰지 않는다(대비·slop). gradient 금지(단색만). danger는 오직 실패 상태에만.

### 3.2 Typography
- **Family:** `Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif`. **단일 패밀리.** 2차 장식 폰트 금지(slop). 워드맵의 다정함은 별도 폰트가 아니라 size/weight/색으로 만든다.
- 스케일(모바일 기준):

| 토큰 | size/line | weight | letter-spacing | 용도 |
|---|---|---|---|---|
| display | 28 / 1.30 | 800 | -0.6 | 랜딩 hero |
| h1 | 24 / 1.34 | 800 | -0.5 | 목표 제목 "○○ 해낼게" |
| h2 | 19 / 1.40 | 700 | -0.3 | 섹션 |
| body | 15 / 1.60 | 400 | -0.1 | 본문 |
| body-strong | 15 / 1.60 | 700 | -0.1 | 강조 본문·버튼 |
| caption | 13 / 1.50 | 400 | 0 | 메타·보조 |
| micro | 11.5 / 1.45 | 500 | 0.2 | 칩·라벨 |

한글 큰 제목은 letter-spacing 음수로 조인다. 줄바꿈은 의미 단위로(어절 끊김 금지).

### 3.3 Spacing (4px grid)
`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56`. 화면 좌우 패딩 = **22**(고정). 섹션 간 = 24~32. **화면마다 다른 간격 금지.**

### 3.4 Radius (1개 시스템으로 잠금 — 화면마다 다른 radius = slop)
`sm 12`(칩/인풋) · `md 14`(버튼·카드 기본) · `lg 20`(바텀시트 상단) · `full`(아바타·카운트 배지). **이 4개 외 사용 금지.**

### 3.5 Elevation
- 카드 = 그림자 없음, **1px `--line` 보더만**(평면·정직).
- 바텀시트/모달만 elevation: `0 8px 30px rgba(0,0,0,.12)`.
- glow·neon·다중 그림자 금지.

### 3.6 Motion
- 전이 120~200ms ease-out. 바텀시트 slide-up 220ms.
- 완료 = toast 1회 + 살짝 페이드. 폭죽·confetti·큰 애니메이션 금지(조용함 위반). 느린/과한 인터랙션 = reject(design-review 항목).

---

## 4. Component Inventory

> 모두 단일 컬럼·모바일 우선. shadcn/Radix 매핑 병기. ⟳ = commons/PostAGI-public 재사용.

| 컴포넌트 | 역할 | 핵심 상태 | shadcn/Radix |
|---|---|---|---|
| **BrandMark** | "해낼게." 워드마크(닷=클로버) | — | — |
| **Button** | primary(클로버 채움) / ghost(텍스트) / subtle(웜 틴트) | default·press·disabled·loading | Button |
| **GoalCard** | 주인공 액자: 아바타·이름·"○○ 해낼게"·D-day칩·왜 | 진행중·마감 | Card |
| **DdayChip / StatusChip** | D-14 · 진행중 · 마감됨 | — | Badge |
| **Wordmap** | 쌓인 응원 메시지 구름(size/weight/opacity로 다정함) | empty·few·many | (custom) |
| **CheerCount** | "N명이 응원했어요" (금액 절대 X) | 0·N | Badge |
| **AmountChips** | 금액 선택, 커피값 앵커(3·5·10천 + 직접입력) | 선택·미선택 | ToggleGroup |
| **PaymentSheet** | 바텀시트: 금액→메시지→익명→결제 | 입력·로딩·성공·실패·취소 | Dialog/Sheet |
| **MessageField** | 한 줄 응원(선택, 비동기). placeholder로 무부담 신호 | 빈값·입력·초과 | Textarea |
| **AnonymityToggle** | 이름 노출 ↔ 익명(응원자 선택, Q2 잠김=강제익명 아님) | 노출·익명 | Switch |
| **ConfirmToast** | 은은한 완료("도경이에게 조용히 닿았어요") | — | Toast(Sonner) |
| **EmptyState** | 응원 0 — 첫 친구를 초대하는 화면 | — | (custom) |
| **ErrorState** | 결제 실패·만료·비공개·404 | 각 사유별 | (custom) |
| **ShareLinkCard** | 내 링크 발급·복사·인스타 바이오 안내 | 복사전·복사됨 | Card+Button |
| **ProgressUpdate** | 주인공 진행 한 줄/사진(선택, 강제 X) | 없음·있음 | Card |
| **AuthSheet** ⟳ | 로그인 최소(소셜). 결제·저장 시점에만 등장 | — | Dialog ⟳commons |
| **OnboardingGoalForm** | 목표·일정·왜 입력(①) | 작성·검증·저장 | Form+Input |
| **GoalListCard** (v2) | 다중 목표 홈의 목표 카드: 제목·칩·응원 N명·미확인 배지·카드 내 링크복사/워드맵/응원보기 | 진행중·마감(past)·미확인 배지 | Card |
| **AccountBalanceCard** (v2) | 계정 전체 클로버 잔액 1개(목표별 모금액 없음, §6-b 원화 보조 병기) | 기본·웰컴만 | Card |
| **NewGoalButton** (v2) | 대시드 "＋ 새 목표 만들기" (상한 3 도달 시 disabled+이유) | 활성·비활성 | Button |
| **SettingsRow** (v2) | 마이페이지 리스트 행: 아이콘·제목·설명·chevron/“준비중”칩 | 기본·준비중(disabled) | (custom) |
| **PrivacySwitch** (v2) | 공개 설정 스위치. **금액 항목은 스위치가 아니라 잠금(🔒) 상수로 렌더** | on·off·lock | Switch |
| **PrivacyPreview** (v2) | 설정 변경의 친구 화면 실시간 미리보기(메시지 OFF=워드맵 비표시, 목표 OFF=비공개 안내) | 공개·이름숨김·워드맵소멸·비공개 | (custom) |
| **ThanksComposer** (v2) | 감사 1회 단방향 작성(200자·수정불가 고지·ghost 진입, 미전송 흔적 금지) | 작성·전송·완료·실패 | Textarea+Card |
| **UpgradeCard** (v2) | 결제 완료 화면 전용 계정 승격 카드(카카오 1탭 + "괜찮아요" 상시) — **다른 화면 노출 금지** | 기본·실패·성공 | Card |
| **InquiryForm** (v2) | 고객센터 일방향 폼(카테고리 4·1,000자·1일 3건, "개별 답변 X"를 버튼 위에) | 작성·완료·실패·한도 | Form |

---

## 5. 금지 패턴 (anti-slop / NN/g — 위반 시 reject)

1. **금액 노출 절대 금지.** 후원액·총모금액·환전액을 친구/공개 화면에 띄우지 않는다("N명"만). (Discreet)
2. **랭킹·리더보드·시끄러운 뱃지·과시형 카운트 금지.** (Discreet)
3. **강제 호혜·감사 강요 UI 금지**("응원했으니 답장하세요", 답장 안 하면 막힘). (Discreet)
4. **결제 다크패턴 금지**: 금액 기본값 높게 선택, 닫기 숨김, 익명 토글 기만. 최소 금액·닫기 항상 명확. (Trustworthy)
5. gradient(특히 보라·네온)·glassmorphism·가짜 3D·glow 금지. **단색 클로버만.** (Trustworthy) — *예외:* 워드맵/후광(halo)/배경 페이드에 **clover 계열 단색 내 아주 옅은 radial**은 공간감 목적으로 허용(구름 은유). 색상 이동(보라·네온·다색)·장식적 남발은 여전히 금지.
6. **화면마다 다른 radius/spacing/그림자 금지.** §3 토큰 외 사용 금지.
7. oversized hero, decorative card 남발, 이모지 도배, AI 스톡 일러스트 금지. (Warm은 사람·말투로 — 장식으로 X)
8. 폭죽/confetti/과한 모션 금지(조용함 위반).
9. 매일 인증 강제·habit-tracker 숙제 UI 금지(받는 사람 부담 → 공급 마름).

---

## 6. 핵심 UX 규칙 (NN/g 휴리스틱 자가검수)

- **금액 표기 3층 규칙 🔒(2026-07-02 회장 확정):**
  - (a) **친구/공개 화면** = 금액·개수 모두 비노출("N명이 응원"만).
  - (b) **받는사람 본인 화면**(receiver-home 홈·wordmap 풀뷰) = 클로버 **개수(🍀 N개)를 주(主) 표기**. **₩ 환산 금지 원칙 유지, 단 웰컴 클로버 성장훅 도입(2026-07-18 회장·컨트롤러 확정)으로 receiver-home 잔액 카드에 한해 "≈30,000원 상당" 형태의 **원화 등가를 보조(작게·회색)로만** 병기 허용 — 크기·순서·색으로 개수가 여전히 주가 되게 한다(1클로버=1,000원 등가, 고정환산 표기이지 실제 환전액 보증 아님). wordmap 풀뷰 등 그 외 화면은 기존 개수-only 원칙 그대로.
  - (b′) **본인 한정 개별 금액 노출 🔒(2026-07-19 회장 결정 B)**: 받는사람 **본인**은 `/home` 응원 목록에서 응원별 **클로버 개수(🍀 N)** 를 확인할 수 있다(v1.2.0의 "개별 후원자별 금액 비노출"을 본인에 한해 대체). Discreet 유지 장치 4개가 함께 잠김: ①목록은 **시간순 고정** — 금액순 정렬·랭킹·리더보드·합계 비교 UI 금지 ②개수는 행 우측 메타(작게, clover-ink) — 이름·메시지가 주 ③₩ 환산 병기 금지(원화는 (c) 환전에서만) ④익명 응원도 개수는 표시(익명=신원 은닉, 본인 수입 은닉 아님). **제3자·친구·공개 화면(/g, 워드맵, 공유이미지)은 종전대로 완전 비노출.** 프로토: `WIREFRAMES/haenael-receiver-manage-v1-fable.html`.
  - (c) **원화(₩) 실수령 확정 계산은 환전(cashout) 플로우에서만** — 환전 화면은 "N 클로버 = ₩○○(수수료·3.3% 원천징수 제)" + **웰컴 클로버 성장훅 확정 CoVe(2026-07-18): 환전 도달판정(30클로버)에는 웰컴 포함, 실제 지급 계산에서는 웰컴 제외(친구 응원분만 지급)** — 분해표(친구 응원분/웰컴 제외분)를 확정 CTA 전에 정직하게 노출.
- **상태 가시성:** 결제 처리중·성공·실패를 항상 명시(로딩 스피너·toast·에러 카드). 침묵 금지.
- **다음 행동 1개:** 화면마다 primary 액션 1개만 시각적으로 지배. (②=밀어줄게, ①=목표 시작하기)
- **실수 방지:** 결제 전 금액·익명여부 확인. 게스트 결제 시 환불·문의 경로 명시. 닫기 항상 가능.
- **dead-end 0:** empty·실패·만료·비공개·취소 모든 상태에 다음 경로가 있다(user-flow.md가 진실원).
- **약자 배려:** 비로그인 열람 가능, 로그인은 결제/저장 순간에만 최소.

---

## 7. 미해결 → contract에 박제할 결정 (⛔ 회수 — 회장/상류)

> 디자인이 드러낸 갭. 시안으로 *열어서* 보여주되 결정은 회장. user-flow.md §5와 동일.

1. ~~하트/클로버 네이밍 구조~~ — **✅ 확정(2026-07-01): 전부 유료**(워드맵 단어 한 개도 유료, 무료 tier 없음). 하트=응원자가 보내는 표현 / 클로버=받는사람 적립·환전 단위(동일 자금 양면 네이밍). 최소 1,000원.
2. ~~① 가입 방식~~ — **✅ 확정: write-first** (시작하기 → 목표쓰기 → 저장 시 로그인). draft 로컬보존 필수.
3. ~~① 랜딩 포지셔닝~~ — **✅ 확정: C 미니멀 + 워드맵 프리뷰 하이브리드** (`landing-final.html`).
4. ~~게스트 결제 허용 범위~~ — **✅ 확정(2026-07-01): 게스트 결제 허용**(앱가입 X, 간편결제). 응원자 익명표시 가능("익명의 누군가"), PG엔 신원 남음. 어뷰징은 환전 KYC·이상거래에서 차단.
5. **(eng-design/legal defer)** 최소환전액 수치·미성년 연령게이트·환불 정책 — 화면 자리는 확보(`cashout.html` defer 배너), 정책 수치만 상류 결정.

---

> **변경 이력**
> v1.0.0 (2026-06-30) product-designer 최초 작성. Path B 신규 contract. 컨트롤러 landing-compare.html의 ①②혼선 비판·교정 반영.
> v1.1.0 (2026-07-01) 회장 결정 반영: ① 랜딩 = C 미니멀+워드맵 프리뷰 하이브리드 확정(`landing-final.html`), ① 가입 = write-first 확정.
> v1.2.0 (2026-07-01) 전체 플로우 전수 설계: ② 결제전과정·받는사람 로그인후·환전/정산 프로토 추가. 확정 반영(전부 유료·게스트 결제 허용·익명표시). 받는사람 본인은 총 잔액 노출/개별 후원자별 금액 비노출 규칙 명문화. coverage.md = 완료 판정 근거.
> v1.3.0 (2026-07-02) 워드맵 공유 확산 고리를 실제 화면으로(`wordmap-share.html`): 홈=워드맵보기 단일 CTA, 풀뷰→아이콘 공유(이미지 저장/인스타 스토리 링크스티커/링크복사, 텍스트 버튼 X)→친구 링크탭→② 도착. receiver-home 홈 단순화(재공유 스텝 이관).
> v1.4.0 (2026-07-02) 금액 표기 3층 규칙 확정(§6): 받는사람 본인=클로버 개수(🍀 N개)만, ₩ 환산은 환전 플로우에서만. receiver-home·wordmap-share·cashout 진입부 ₩ 제거.
> v1.5.0 (2026-07-02) 강화 프로토콜 첫 적용 — 핵심 3화면 비주얼 리테이크. Reference 표를 웹 직접조사(BMC·Ko-fi·토스위젯·Linktree·투네이션) 근거로 갱신, 각 화면에 벤치마킹 출처·심리법칙 캡션. §5-5 gradient 예외(워드맵/후광 clover 옅은 radial) 명문화.
> v1.7.0 (2026-07-19) 받는사람 본인 관리 경험 보완(회장 승인): §6-(b′) 신설 — 본인=개별 클로버 개수 노출(회장 결정 B), 제3자 비노출·랭킹 금지 유지. 재방문 진입 동선 확정 (a)세션 라우팅+(b)/g/[slug] owner bar (user-flow.md §1.3). 프로토 `haenael-receiver-manage-v1-fable.html`.
> v1.8.0 (2026-07-22) v2 신규 화면(PRD v0.3.0 확정 8건): 컴포넌트 10종 추가(GoalListCard·AccountBalanceCard·NewGoalButton·SettingsRow·PrivacySwitch·PrivacyPreview·ThanksComposer·UpgradeCard·InquiryForm 등). 원칙 추가 — ①잔액은 계정 전체 1개, 목표 카드는 인원수만(금액 3층 유지) ②응원 금액은 설정 항목이 아니라 잠긴 상수로 그린다 ③승격 유도는 결제 완료 화면 1곳만 ④감사 미전송에 배지·카운트·독촉 금지. 프로토: `WIREFRAMES/haenael-v2-hub-v1-claude-fable.html`.
> v1.6.0 (2026-07-02) 회장 확정 — v2 3종 **정본 승격**: landing-final·goal-page·payment-flow 정본명 승계, v1은 `WIREFRAMES/archive/*-v1.html` 보존. 리테이크가 누락한 상태를 정본에 복원(결제 실패=payment-flow 5b, 마감 목표=goal-page 3) → coverage ❌0 유지. ⛔ 정책 4건 eng-design/legal DEFER 확정(화면 자리 확보). **design 단계 산출물 마감.**
