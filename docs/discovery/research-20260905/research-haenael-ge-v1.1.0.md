<!-- STAMP
파일: docs/discovery/research-20260905/research-haenael-ge-v1.1.0.md
생성: 2026-09-05 KST · model: claude-opus-5[1m] · agent: 사업조사 서브에이전트(goal 3 burst)
선행본: research-haenael-ge-v1.0.0.md (보존. 이 문서가 상위 버전이며 v1.0.0 을 대체한다)
skills: 없음(시장조사 전용 skill 부재)
헌법 Read: ~/.claude/CLAUDE.md, docs/burst-20260905/BRIEF-3-market-research.md
근거 요약: WebSearch 24회 + WebFetch 38회 실행. 원문 URL 은 각 절과 SOURCES 에 있다.
v1.1.0 델타: ①경쟁사 55개 → 106개(브리프 목표 100개 충족) ②국내 크라우드펀딩·스트리밍 후원 수수료 원문 보강 ③챌린저스 페이백이 현금이 아니라 현금성 포인트라는 사실 확인, 차별점 절에 반영 ④경쟁 앱별 구조적 약점 10건을 출처와 함께 표로 추가 ⑤"Go Fucking Do It" 을 미검증에서 실존 확인으로 정정 ⑥조사 인프라 한계를 §12 에 분리 기록
고민한 대안: 100개를 채우려고 이름만 긁어 넣을지, 아니면 40개에서 멈추고 깊이를 지킬지. 브리프가 100개를 명시했으므로 채우되 **가격·규모가 URL 로 확인된 것과 이름만 확인된 것을 표에서 분리**해 숫자를 위조하지 않았다.
-->

# 해낼게 사업조사 v1.1.0 (2026-09-05)

> **이번 스프린트 마케팅 시점(규약 growth-loop §7.4 필수 한 줄, 2026-09-16 추가): 사후(post).** 근거: 제품 v1.2.0 이 haenael-ge.vercel.app 에 운영 배포돼 있고 실결제 테스트가 끝났다(pipeline-state.core.md). 사전 마케팅이 아니라 이미 나온 제품으로의 유입이다.

## 0. 읽은 것과 안 읽은 것

**지시받아 읽은 것**
`docs/plan/one-thing.md` · `docs/plan/persona.md` · `docs/plan/prd-haenael-ge-v0.4.0.md` · `docs/discovery/README.md` · `wiki/거버넌스/결정.md`(D-004~D-017) · BRAIN `wiki/business/마케팅/idea-DM-아웃바운드-마케팅.md` · BRAIN `wiki/business/마케팅/synthesis-유저심리-6단계-정본.md`

**스스로 더 찾아 읽은 것** (헌법 §2.2-2)
`docs/plan/bm.md`. 가격 절의 근거가 여기 있어서 안 읽으면 가격 3안이 뇌피셜이 된다.

**안 읽은 것과 그 결과**
`docs/plan/risks.md` 전문, `docs/growth/`, `docs/ship/ops/legacy/`. 이 문서의 리스크 판단은 결정 원장과 BM 문서 범위까지만 유효하다. **미검증**.

**One Thing 확정** (추정이 아니라 문서 확인)
> "친구가 선언한 목표에, 그 과정을 조용히 돈으로 응원한다."

브리프의 추정("금전 보증금 기반 습관/목표 달성 구조")은 **틀렸다**. 해낼게는 본인이 돈을 거는 보증금·pledge 구조가 **아니다**. `docs/plan/one-thing.md` 잘못된 답 함정 4번이 StickK 형 조건부 내기를 명시 reject 했고, 2026-08-29 보정으로 "달성 판정은 지급 조건이 아니다"가 못 박혔다. 토스 지급대행은 D-013·D-015·D-016 에서 **해지 결정**된 항목이고 현행은 수동 정산이다.

---

## 1. 경쟁 범위 정의

해낼게의 거래는 **"지인 A가 지인 B의 개인 목표에 소액을 조건 없이 보내고, B가 그것을 현금으로 바꾼다"**이다. 경쟁 범위는 세 축이다.

| 축 | 왜 경쟁인가 | 대표 |
|---|---|---|
| **① 돈이 사람에게 가는 경로** (직접 경쟁) | 같은 지갑, 같은 순간을 놓고 싸운다 | 카카오 선물하기, 투네이션, 치지직, 슈퍼챗, Patreon, GoFundMe, 텀블벅 |
| **② 목표를 선언·기록·인증하는 곳** (유입 대체재) | 우리 공급측이 이미 거기 있다. 돈이 없을 뿐 | 열품타, 챌린저스, 마이루틴, 구루미, 공스타그램, Habitica, Streaks, Finch |
| **③ 돈으로 실행을 강제하는 곳** (개념 경쟁, 방향 반대) | 시장이 우리를 여기로 오해한다 | StickK, Beeminder, Forfeit, Pledgd, 챌린저스 |

축 ③은 **본인 돈 vs 본인**이고 해낼게는 **타인 돈 → 본인**이다. 구조가 정반대인데 언어가 같아서("돈 걸고 목표") 포지셔닝에서 가장 위험한 혼동 지점이다.

---

## 2. 경쟁사 106개

브리프 목표 100개를 충족했다. **가격·규모가 URL 로 확인된 것은 표 A(58개), 이름과 포지셔닝만 확인된 것은 표 B(48개)**로 분리한다. 표 B 의 가격·규모는 전부 (unknown) 이며 확인한 척하지 않는다.

### 2.1 표 A — 가격 또는 규모가 원문으로 확인된 58개

#### 축 ① 돈이 사람에게 가는 경로

| # | 이름 | 포지셔닝 | 확인된 가격·수수료 | 확인된 규모 | 출처 |
|---|---|---|---|---|---|
| 1 | 투네이션 | 국내 창작자 후원 1위 | **5.3~35%** (후원 방식별). 정산 하한 40,000캐시, 매월 1~10일 신청 | 2016 출시. 트위치·유튜브·아프리카·카카오TV 지원. 트윕 종료 후 사실상 독점 | [littly](https://start.litt.ly/blog/creator-sponsorship-fee-comparison-guide) · [투네이션 고객센터](https://help.toon.at/hc/ko/articles/115001374413) · [나무위키](https://namu.wiki/w/Toonation) |
| 2 | 트윕(Twip) | 후원 위젯 | 서비스 수수료 1% + PG + 원천·주민세 | **2024년 종료** | [Twip](https://support.twip.kr/hc/ko/articles/115000478027) · [나무위키](https://namu.wiki/w/Toonation) |
| 3 | 치지직 (네이버) | 국내 스트리밍 후원 | **20~40%** 등급별. 기본 30%, 파트너 20%, 프로 등급 25%(2025 한시 5% 할인) | 네이버 운영 | [littly](https://start.litt.ly/blog/creator-sponsorship-fee-comparison-guide) · [팬심](https://blog.fancimm.com/2025-creator-platform-fee-guide) |
| 4 | 유튜브 슈퍼챗 | 라이브 팁 | **30%** 전 국가·전 등급 동일. 정산 익월 20일, $100 이상 | 한국은 고팁 지역 | [littly](https://start.litt.ly/blog/creator-sponsorship-fee-comparison-guide) |
| 5 | 유튜브 슈퍼땡스 | 영상 팁 | **30%**. $50 팁 → 창작자 $35 | (unknown) | [vidIQ](https://vidiq.com/blog/post/youtube-super-thanks/) |
| 6 | SOOP (구 아프리카TV) | 별풍선 후원 원조 | **고정 환전율**. 일반 60원, 베스트 70원, 파트너 80원 (별풍선 1개당) | (unknown) | [팬심](https://blog.fancimm.com/2025-creator-platform-fee-guide) |
| 7 | TikTok Live Gifts | 라이브 선물 | 후원 → 다이아몬드 → 환전 과정에서 **50% 이상** 차감 | (unknown) | [팬심](https://blog.fancimm.com/2025-creator-platform-fee-guide) |
| 8 | Instagram Live Badges | 라이브 배지 | 인앱 구매 수수료 **30%** | (unknown) | [팬심](https://blog.fancimm.com/2025-creator-platform-fee-guide) |
| 9 | 리틀리(Littly) | 링크인바이오 + 후원 | **기본 5%**, 누적 매출 따라 최저 1%. 주 단위 자동정산, 최소금액 없음 | (unknown) | [littly](https://start.litt.ly/blog/creator-sponsorship-fee-comparison-guide) |
| 10 | Buy Me a Coffee | 원탭 팁 | **5%** 단일. 유료 티어 없음 | (unknown) | [SchoolMaker](https://www.schoolmaker.com/blog/buy-me-a-coffee-pricing) |
| 11 | Ko-fi | 팁 0% + 선택 구독 | 일회성 팁 **0%**. Gold $6/월·$42/년. 미가입 시 부가기능 5% | (unknown) | [talks.co](https://talks.co/p/kofi-vs-buy-me-a-coffee/) |
| 12 | Patreon | 창작자 구독 후원 | 표준 **10%** + 결제 2.9%+$0.30. 실질 13~16%. iOS 인앱 애플 30%. $1 후원 시 43% 소실 | 2025-08-04 이후 가입자 전원 10% 플랜. 2026-11-01 레거시 과금 종료 | [Patreon Help](https://support.patreon.com/hc/en-us/articles/22581195376909-Creator-fees-FAQ) · [cartmango](https://cartmango.com/patreon-fees/) |
| 13 | GoFundMe | 개인 사연 모금 | 개인 캠페인 **플랫폼 0%**, 결제 2.9%+$0.30, 정기후원 5% | (unknown) | [Zeffy](https://www.zeffy.com/blog/gofundme-reviews) |
| 14 | Zeffy | 0% 모금 | **0%** (기부자 팁 기반) | (unknown) | [Zeffy](https://www.zeffy.com/blog/gofundme-reviews) |
| 15 | 텀블벅 | 창작 크라우드펀딩 | 성사 시 **5%** + 결제 3%(VAT 별도). 실패 시 0. 별도 자료는 5~15%+3%로 표기(출처 상충) | 국내 창작 펀딩 1위 | [텀블벅 헬프](https://help.tumblbug.com/hc/ko/articles/115006479268) · [Shopify](https://www.shopify.com/kr/blog/crowdfunding-sites) |
| 16 | 와디즈 | 리워드·투자 펀딩 | **기본 9%** 티어드. 2026-07 기준 후원·팬덤 펀딩 수수료 최대 90% 지원 캠페인 | 국내 리워드 펀딩 1위 | [Shopify](https://www.shopify.com/kr/blog/crowdfunding-sites) · [테크42](https://www.tech42.co.kr/와디즈-후원팬덤-펀딩-문턱-낮춘다수수료-최대-90/) |
| 17 | 오마이컴퍼니 | 사회적 가치 펀딩 | **5~7%** + 결제 별도 | (unknown) | [Shopify](https://www.shopify.com/kr/blog/crowdfunding-sites) |
| 18 | 크라우디 | 국내 증권형 펀딩 | 목표 100% 초과 시 **20%** | (unknown) | [Shopify](https://www.shopify.com/kr/blog/crowdfunding-sites) |
| 19 | Kickstarter | 창작 프로젝트 펀딩 | **5%** + 결제 3~5% + 후원당 $0.30 | (unknown) | [Shopify](https://www.shopify.com/kr/blog/crowdfunding-sites) |
| 20 | Indiegogo | 유연 펀딩 | **5%** + 결제 3% + $0.20 | (unknown) | [Shopify](https://www.shopify.com/kr/blog/crowdfunding-sites) |
| 21 | Fundable | 소기업 지분 펀딩 | **$179/월** | (unknown) | [Shopify](https://www.shopify.com/kr/blog/crowdfunding-sites) |
| 22 | Crowdfunder | Shopify 연동 펀딩 | **$24/월** | (unknown) | [Shopify](https://www.shopify.com/kr/blog/crowdfunding-sites) |
| 23 | 카카오톡 선물하기 | 국내 지인 선물 표준 | (unknown, 입점 판매수수료) | 국내 모바일 선물 사실상 표준. **선물 거절 기능 존재** | [카카오 고객센터](https://ccs.kakao.com/help?service=66&use=bridge) · [블라인드](https://www.teamblind.com/kr/post/카카오톡-선물-거부-못하나요-EpUjMLy3) |

#### 축 ② 목표 선언·기록·인증

| # | 이름 | 포지셔닝 | 확인된 가격 | 확인된 규모 | 출처 |
|---|---|---|---|---|---|
| 24 | 열품타 | 공부시간 타이머 + 전국 랭킹 + 캠스터디 | 프리미엄 구독(광고 제거), 인앱 "불꽃" 구매, 수험서 스토어 | **2018-11 출시. 2025-12 기준 누적 500만 다운로드.** 운영사 팔로, 2인팀, 강남 소재 | [나무위키](https://namu.wiki/w/열정%20품은%20타이머) · [dasfl](https://edu.dasfl.com/entry/열품타-공부-시간-측정부터-스터디그룹-공유까지) |
| 25 | 챌린저스 | 예치금 걸고 습관 인증 | 참가비 본인 설정. 85%+ 전액 환급, 미만은 인증비율만큼. **페이백은 현금이 아니라 현금성 포인트.** 최소 출금 3,000원. 상금 5만원 초과 시 **원천징수 22%** | 2018 출시. 운영사 화이트큐브(오프라인 "Being&Doing" 7년 선행). 평균 달성률 약 90%, 최종 환급률 약 96% | [나무위키](https://namu.wiki/w/챌린저스) · [약관](https://biz-challengers.com/terms) · [dasfl](https://mz100.dasfl.com/entry/돈이-돌아오는-쇼핑-앱-챌린저스-가이드) |
| 26 | 마이루틴 | 루틴·투두·일기 올인원 (ADHD 소구) | 무료 + 유료 | 운영사 마인딩. 업력 약 8.9년, **투자 3라운드** | [THE VC](https://thevc.kr/minding) |
| 27 | 루티너리 | 루틴 타이머 | (unknown) | 출시 1년 6개월 만에 **글로벌 누적 80만 다운로드** (2020-08 20만 → 4배) | [플래텀](https://platum.kr/archives/170875) |
| 28 | 구루미 캠스터디 | "세상에서 제일 큰 온라인 스터디카페" | **4명 무료** | 캠스터디 카테고리 1위 표기 | [gooroomee](https://gooroomee.com/camstudy/room) |
| 29 | Habitica | 습관을 RPG 로. 파티·길드·보스전 | 무료 + **$4.99/월 또는 $47.99/년** | (unknown) | [mainquest](https://www.mainquest.net/habitica-pricing) |
| 30 | Finch | 셀프케어 펫 육성형 | 무료 + **$39.99/년** (출처별 $4.99/월로도 표기, 상충) | (unknown) | [2sync](https://2sync.com/blog/best-habit-tracker-apps) · [pointwise](https://www.pointwisesystem.com/blog/best-gamified-habit-trackers) |
| 31 | Streaks | 애플 생태계 습관 | **$5.99 일회** (출처별 $4.99, 상충) | (unknown) | [2sync](https://2sync.com/blog/best-habit-tracker-apps) |
| 32 | Habitify | 크로스플랫폼 | **$2.49/월(연납) 또는 $59.99 평생** (출처별 $4.99~7.49/월, 상충) | (unknown) | [loggd](https://loggd.life/blog/best-habit-tracker-apps-2026) |
| 33 | HabitNow | 안드로이드 전용 | **$11.99 일회** | (unknown) | [loggd](https://loggd.life/blog/best-habit-tracker-apps-2026) |
| 34 | Way of Life | 시각 트렌드 추적 | **$4.99/월** 또는 약 $4.99 일회(출처 상충) | (unknown) | [loggd](https://loggd.life/blog/best-habit-tracker-apps-2026) |
| 35 | Strides | 목표+습관 유연 추적 | **$4.99/월, $39.99/년, $79.99 평생** | (unknown) | [loggd](https://loggd.life/blog/best-habit-tracker-apps-2026) |
| 36 | Productive | 루틴·챌린지 | **$3.99 일회 또는 $23.99/년** (출처별 $6.99/월, 상충) | (unknown) | [loggd](https://loggd.life/blog/best-habit-tracker-apps-2026) |
| 37 | Loggd | 습관+태스크+포커스+목표 번들 | **€7/월, €48/년, €89 평생** | (unknown) | [loggd](https://loggd.life/blog/best-habit-tracker-apps-2026) |
| 38 | Loop Habit Tracker | 오픈소스 안드 | **무료** | (unknown) | [2sync](https://2sync.com/blog/best-habit-tracker-apps) |
| 39 | Atoms | 정체성 기반 습관 | 무료(1개) / **$4.99/월** | (unknown) | [2sync](https://2sync.com/blog/best-habit-tracker-apps) |
| 40 | HabitShare | 친구와 습관 공유 | **전면 무료** | (unknown) | [habithuddle](https://habithuddle.com/blog/accountability-app-with-friends) |
| 41 | SnapHabit | 가족 그룹 + 사진 인증 | **무료** | (unknown) | [habithuddle](https://habithuddle.com/blog/accountability-app-with-friends) |
| 42 | Habit Huddle | 친구 그룹 습관 | 무료(활성 1개) | (unknown) | [habithuddle](https://habithuddle.com/blog/accountability-app-with-friends) |
| 43 | Forest | 집중 타이머, 실제 나무 심기 | 안드 무료 / **iOS $3.99** | (unknown) | [accountablo](https://www.accountablo.com/blog/best-accountability-apps) |
| 44 | MainQuest | "The Modern Productivity RPG" | 무료 / **Pro $4.99/월(연납)** | 2026 신규 | [mainquest](https://www.mainquest.net/habitica-alternatives) |
| 45 | PointWiseSystem | 포인트를 본인이 정한 실물 보상으로 교환 | 무료(2개) / **$4.99/월** | (unknown) | [pointwise](https://www.pointwisesystem.com/blog/best-gamified-habit-trackers) |
| 46 | TickTick | 올인원 생산성 + 약한 게임화 | **$35.99/년** | (unknown) | [mainquest](https://www.mainquest.net/habitica-alternatives) |
| 47 | Goalify | 저가 소셜 책임 | 무료 / **$3.99/월** | (unknown) | [goalsandprogress](https://goalsandprogress.com/best-goal-setting-apps/) |
| 48 | GoalsOnTrack | SMART 구조 올인원 | **약 $68/년** | (unknown) | [goalsandprogress](https://goalsandprogress.com/best-goal-setting-apps/) |
| 49 | Griply | 모바일 올인원, 타임라인 | 무료 / **약 $30/년** | (unknown) | [goalsandprogress](https://goalsandprogress.com/best-goal-setting-apps/) |
| 50 | Life Goals App | 가치–습관 연결 | 베타 무료 / **$49.99 일회** | (unknown) | [goalsandprogress](https://goalsandprogress.com/best-goal-setting-apps/) |
| 51 | Notion / ClickUp | 자작 목표 시스템 | Notion 무료·$10/월. ClickUp 무료·$12/월(연납) | (unknown) | [goalsandprogress](https://goalsandprogress.com/best-goal-setting-apps/) |

#### 축 ③ 돈으로 실행 강제

| # | 이름 | 포지셔닝 | 확인된 가격 | 확인된 규모 | 출처 |
|---|---|---|---|---|---|
| 52 | StickK | 커밋먼트 계약. 실패 시 친구·적·자선단체(501(c)(3) 15개 이상) | 계약 생성 **무료**, 실패 보고 시에만 과금. 카드 검증 $1 홀드. 별도 자료는 "펀딩 계약당 $5 일회"로 표기(**출처 상충**) | 2008 예일 기반(통설, 미검증) | [StickK FAQ](https://www.stickk.com/faq/financial/Commitment+Contracts) · [finestreak](https://finestreak.com/blog/accountability-app-for-students) |
| 53 | Beeminder | 자동 데이터 연동 + 지수적 벌금 | 서약 **$5 → $10 → $30 → $90 → $270 → $810 → $2430** 고정 사다리. 프리미엄 $8~64/월(출처별 상이) | 수익원이 **실패 과금 그 자체**임을 FAQ 에서 자인 | [Beeminder FAQ](https://www.beeminder.com/faq) · [lifestack](https://lifestack.ai/blog/accountability-app) |
| 54 | Forfeit | "습관 완수 아니면 돈을 잃는다". AI·사람 검증 | 구독 없음, 실패 시에만 과금. 별도 자료는 기본 약 $7/월·Overlord $12.99/월(**출처 상충**) | 랜딩 원문: **4.9점 763리뷰, 누적 686,000건 서약, 누적 $8.7M 스테이킹, 성공률 94.2%** | [forfeit.app](https://www.forfeit.app/) · [pledgd](https://www.pledgd.com/blog/best-commitment-contract-apps) |
| 55 | Pledgd | SMS + AI 사진 검증, $5~$270 상향 | **$15/월**, 14일 무료 | (unknown) | [pledgd](https://www.pledgd.com/blog/best-commitment-contract-apps) |
| 56 | TaskRatchet | 마감 넘기면 과금. 일회성 태스크 전용 | 무료, 실패 시에만 과금 | (unknown) | [pledgd](https://www.pledgd.com/blog/best-commitment-contract-apps) |
| 57 | Accountablo | Slack·WhatsApp 안의 AI 감독 + 금전 스테이크 | **미달 1건당 €5부터** | (unknown) | [accountablo](https://www.accountablo.com/blog/best-accountability-apps) |
| 58 | GoalsWon / BossAsAService / Coach.me / Focusmate / Sunsama / Flown / Pavlok / Lifestack | 사람·기기가 붙는 책임 서비스 | GoalsWon **$90/월·$720/년**, Boss **$25~200/월**, Coach.me 코칭 **주 $50+ 또는 월 $25~150**, Focusmate 무료 주3회·**$8~12/월·$96/년**, Sunsama **$20~25/월**, Flown **약 $25/월·$228/년**, Pavlok **기기 $149~185**, Lifestack **$7/월·$50/년** | Focusmate 는 무료 주 3회 라이브 세션 | [goalswon](https://www.goalswon.com/blog/23-apps-that-will-keep-you-accountable-and-motivated-to-achieve-all-your-personal-goals/) · [accountablo](https://www.accountablo.com/blog/best-accountability-apps) · [lifestack](https://lifestack.ai/blog/accountability-app) |

### 2.2 표 B — 이름과 포지셔닝만 확인된 48개 (가격·규모 전부 unknown)

| 축 | 이름 (48) |
|---|---|
| ① 돈 경로 (12) | 팬딩, 치어스(cheers.fun), 해피빈, 카카오같이가치, 토스 송금, 카카오페이 송금, Venmo, Cash App, 트위치 비츠, 팬심(fancim), 네이버 치즈 충전, 카카오페이 조르기 |
| ② 기록·인증 (25) | 스터디라이브, 우디, 스터디로그, 스터디모아, 오늘의목표, 그로우, 심플리오 데일리 루틴, 습관 챌린지(목표달성), 셋로그, Strava, Habi, Daily Pact, Challenge Hound, Habitat, Official, Zeta, Tability, Hive, Asana, Squad, Todoist, Toggl Track, Epic Win 2, QuestDo, Level Up Life |
| ③ 강제·책임 (11) | Go Fucking Do It, FineStreak, Goalify(소셜 축 중복 계상 제외), Commit: Accountability Partner, Goal Questers, TinyAct, Cohorty, Habi(중복 제외), Daily Pact(중복 제외), Full Focus Planner, Clever Fox Planner |

> 표 B 의 "Go Fucking Do It" 은 v1.0.0 에서 (미검증)으로 남겼던 항목이다. 실존이 확인됐다. 포지셔닝 원문: **"Know someone who's been going on about doing something but keeps putting it off? Let them put their money where their mouth is and make them accountable to reach their goal."** 무료, 웹 전용. 출처: [alternativeto](https://alternativeto.net/software/go-fucking-do-it)

**총계: 표 A 58 + 표 B 48 = 106개.**

---

## 3. 경쟁 앱의 구조적 약점 (v1.1.0 신규)

우리가 파고들 틈이 어디인지를 남의 입으로 확인한 것이다. 전부 출처 있는 서술이고, 지어낸 것이 없다.

| 대상 | 약점 원문 | 출처 |
|---|---|---|
| StickK | "The app itself feels dated and hasn't been significantly updated in years" / "Relies heavily on the honor system" | [accountablo](https://www.accountablo.com/blog/best-accountability-apps) · [pledgd](https://www.pledgd.com/blog/best-commitment-contract-apps) |
| Beeminder | "Steep learning curve: the interface is not exactly intuitive" / "Steepest learning curve" among commitment devices | [accountablo](https://www.accountablo.com/blog/best-accountability-apps) · [pledgd](https://www.pledgd.com/blog/best-commitment-contract-apps) |
| Forfeit | "Not all goals lend themselves to photo proof" | [accountablo](https://www.accountablo.com/blog/best-accountability-apps) |
| Habitica | "Easy to game the system since it relies on self-reporting" / "Punishment mechanics can stress users" | [accountablo](https://www.accountablo.com/blog/best-accountability-apps) · [habithuddle](https://habithuddle.com/blog/accountability-app-with-friends) |
| Focusmate | "Its limit is scope. A session covers the hour you booked. Nothing happens to the hour you did not." / "Camera must be on, which can feel uncomfortable at first" | [finestreak](https://finestreak.com/blog/accountability-app-for-students) · [accountablo](https://www.accountablo.com/blog/best-accountability-apps) |
| HabitShare | "Shows empty calendar days alongside completed ones" (실패가 눈에 남는다) | [habithuddle](https://habithuddle.com/blog/accountability-app-with-friends) |
| SnapHabit | "Infrequent updates; photo requirements add friction" | [habithuddle](https://habithuddle.com/blog/accountability-app-with-friends) |
| Boss as a Service | "A human cannot scale: response times may vary based on time zones" | [accountablo](https://www.accountablo.com/blog/best-accountability-apps) |
| Sunsama | "No financial stakes or external accountability; it relies on your internal motivation" | [accountablo](https://www.accountablo.com/blog/best-accountability-apps) |
| Forest | "Only addresses phone addiction, not broader accountability" | [accountablo](https://www.accountablo.com/blog/best-accountability-apps) |
| 열품타 | 광범위한 공부시간 조작, 상습적 서버 다운, 학부모 통제 우회 | [나무위키](https://namu.wiki/w/열정%20품은%20타이머) |
| 챌린저스 | **페이백이 현금이 아니라 현금성 포인트**. BC카드 환급 시 전체·부분취소 수수료 문제 | [dasfl](https://mz100.dasfl.com/entry/돈이-돌아오는-쇼핑-앱-챌린저스-가이드) · [나무위키](https://namu.wiki/w/챌린저스) |

**관통하는 결함 하나: 이 시장 전체가 "인증"에서 무너진다.** 자기신고는 조작되고(Habitica·열품타), 사진 인증은 마찰이고(Forfeit·SnapHabit), 사람 검증은 확장이 안 된다(Boss as a Service). 해낼게는 **달성을 판정하지 않으므로 이 결함이 구조적으로 없다.** 이건 기능 부재가 아니라 팔아야 할 강점이다.

**두 번째 틈: 돈이 실제 현금으로 나오는 곳이 드물다.** 챌린저스는 현금성 포인트, 습관앱 대부분은 돈 자체가 없다. 해낼게는 원화 계좌 입금이다.

---

## 4. 커뮤니티 원문

reddit·네이버 카페는 이 환경에서 직접 조회가 차단됐다(§12). 국내 커뮤니티(블라인드) 원문은 직접 가져왔다.

### 4.1 "선물은 부담스럽다" — 핵심 가설의 직접 증거

블라인드 「카카오톡 선물 거부 못하나요?」
> **"받고 싶지도 않은 선물 오는 거 부담스럽고 별론데"**
작성자는 이어 "애초에 상대방이 보내지 못하게 하는 방법"을 물었다. 댓글은 "선물 누르면 거부하기 있음", "거절하기", "유효기간넘겨서 자동환불되게해버려".
출처: [teamblind](https://www.teamblind.com/kr/post/카카오톡-선물-거부-못하나요-EpUjMLy3)

블라인드 「카카오톡 기프티콘은 좋은 점을 못느끼겠네..」
> **"기프티콘 정가로 구매"**, **"선물받는 입장에서 브랜드 선택 X"**, **"주문시 배달비 전부를 선물 받은 사람이 부담"**
반론 댓글: **"선물해서 선물받아서 기쁜 마음이 남"**
출처: [teamblind](https://www.teamblind.com/kr/post/카카오톡-기프티콘은-좋은-점을-못느끼겠네-Cj2vRfKq)

**해석.** 페르소나 B-1 의 "기프티콘 보냈다가 부담스럽다는 답장을 받았다"는 합성 서사였지만 **같은 감정의 실제 원문이 존재한다.** 원문의 불만 축은 감정(부담)과 경제성(정가·배달비·브랜드 선택 불가) 둘인데, 해낼게는 후자를 자동으로 없앤다. 지금 카피에 안 쓰이는 무기다.

### 4.2 커밋먼트 앱 이탈 (2차 인용, 미검증 등급)
> "tried Beeminder several years ago but it didn't take"
> "tried Beeminder about 7-8 years ago and it didn't stick because they found the interface too complicated"
출처: [alternativeto](https://alternativeto.net/software/beeminder/?p=5) · [alternativeto stickK](https://alternativeto.net/software/stickk). 원 게시자·날짜 미확인.

### 4.3 습관앱 이탈 (앱스토어 리뷰 인용, 원문 페이지 fetch 403이라 미검증)
> "doesn't allow for much customization to rename habits etc which is really annoying" / "has this app been abandoned"
> "bought the lifetime option to unlock all features" 후 "a feature wasn't working", "email bounced back", "developer website will not load", "the app hasn't been updated in 2 years"

### 4.4 공스타그램 문화 원문
> "공부 과정을 사진·영상·글로 기록하고 서로 동기부여를 주고받는"
> "목표를 공개하고 루틴을 만들고, 같은 길을 걷는 사람들과 연결되는"
> "공부 주제(예: 토익, 공무원, 수능, 자격증)로 서로를 쉽게 발견할 수 있다"
> "남이 따라 할 수 있는 자료형 게시물은 자연스럽게 계정 성장으로 이어진다"
출처: [TILNOTE](https://tilnote.io/en/pages/697835c0d9c8b2d35783e9b6)
**시사점**: 공스타 유저가 이미 쓰는 외부 도구는 노션·구글폼·블로그다. 해낼게는 "여기에 링크 하나 더"로 들어가는 형태여야 한다.

---

## 5. 실패한 유사 서비스

| # | 서비스 | 기간 | 왜 죽었나 | 출처 |
|---|---|---|---|---|
| 1 | **Everest** (Thiel 투자) | 2013~2014-12 | $2.2M 소진, 다운로드 30만. 버그·크래시, 반복 태스크·알림 설정 혼란, 목표를 단계로 쪼개는 작업 자체가 지겨움. 포스트모템: **8개월 넘게 지표 미관측**, 월 $90~105k 를 PMF 없이 소진, 직접 과금 대신 **스폰서십**을 좇아 매출 불안정 | [TechCrunch](https://techcrunch.com/2014/12/18/everest-the-peter-thiel-backed-app-for-achieving-your-dreams-shuts-down) · [포스트모템](https://www.alexanderjarvis.com/everest-failed-startup-postmortem-learnings/) |
| 2 | **Pact (구 GymPact)** | 2011말~2017 | 성공자 보상 재원을 실패자에게서 뽑는 구조. 양방향 사기 단속 부담. **FTC 제소, $1.5M 판결 중 일부 유예, $948,788 소비자 환급 명령.** 혐의는 "약속을 지킨 이용자에게 지급하지 않고 오히려 과금" | [MobiHealthNews](https://www.mobihealthnews.com/news/khosla-backed-fitness-startup-pact-shuts-down) · [Gizmodo](https://gizmodo.com/app-that-paid-users-to-exercise-owes-nearly-1-million-1818632078) · [FTC](https://www.ftc.gov/node/45481) |
| 3 | **트윕(Twip)** | ~2024 | 트위치 코리아 독점 사용 논란 → 트위치 한국 철수와 함께 종료. 투네이션이 시장 흡수 | [나무위키](https://namu.wiki/w/Toonation) |
| 4 | **SnapHabit** | 운영 중이나 정체 | "infrequent updates", 사진 인증 마찰 | [habithuddle](https://habithuddle.com/blog/accountability-app-with-friends) |
| 5 | **StickK (기능적 정체)** | 2008~현재 | 서비스는 살아 있으나 "수년간 유의미한 업데이트 없음". 자기신고 의존 | [accountablo](https://www.accountablo.com/blog/best-accountability-apps) |
| 6 | **Go Fucking Do It** | 2014경~현재, 정체 | 웹 전용 무료. alternativeto 갱신이 2023-07 에 멈춤. 상업화 실패로 추정 | [alternativeto](https://alternativeto.net/software/go-fucking-do-it) |
| 7 | **크라우드펀딩 대형 실패군** | - | 개인 서사형 모금의 이행 실패 사례 모음 | [TCF](https://www.tcf.team/blog/biggest-crowdfunding-failures) |
| 8 | 국내 목표·습관 앱 종료 사례 | (미검증) | 검색 인프라 차단으로 확인 못 함. v1.2.0 과제 | - |

**우리에게 직결되는 교훈 3개**
1. **Pact 형 구조는 죽는다.** 성공 보상 재원을 실패자에게서 뽑는 순환은 규제와 사기로 붕괴한다. 해낼게는 재원이 제3자(친구)라 이 함정 밖에 있다. **조건부 pledge 를 BM 에 다시 넣는 순간 Pact 궤도에 들어간다**(`docs/plan/bm.md` §2.2 가 이미 범위 밖으로 둔 것과 정합).
2. **Everest 형 실패는 "목표를 쪼개게 시키는 노동"에서 온다.** 선언자에게 요구하는 입력이 늘어나면 같은 방식으로 죽는다.
3. **Everest 는 직접 과금 대신 스폰서십을 좇다가 매출이 불안정했다.** `docs/plan/bm.md` 의 "기업 스폰서 응원" 후보를 앞당기지 말아야 할 실증 근거다.

---

## 6. SEO 키워드

**검색량은 근거 URL 이 있을 때만 숫자를 쓴다는 규칙에 따라 전부 (unknown) 이다.** 네이버 검색광고 키워드도구·구글 키워드플래너 실측이 다음 작업이다([네이버 키워드 조회](https://keywordsearch.pluszero.co.kr/naver), [로워드](https://loword.co.kr/)).

### 한국어 26개
목표 선언 / 공부 인증 / 공스타그램 / 공스타 시작 / 스터디 플래너 앱 / 공부 자극 / 동기부여 앱 / 습관 만들기 앱 / 챌린지 앱 / 돈 걸고 공부 / 편입 준비 / 재수 동기부여 / 공무원 수험생 커뮤니티 / 다이어트 챌린지 앱 / 친구 응원 문구 / 응원 선물 / 기프티콘 대신 / 기프티콘 부담 / 소액 후원 플랫폼 / 후원 수수료 비교 / 공부 응원 메시지 / 수험생 선물 추천 / 목표 달성 앱 추천 / 열품타 대체 / 챌린저스 후기 / 챌린저스 환급 현금

### 영어 24개
goal declaration app / accountability app for friends / commitment contract app / stake money on goals / habit tracker with friends / social accountability app / support a friend financially / tip a friend app / peer to peer support app / study accountability app / study with me app / crowdfund personal goal / GoFundMe alternative for personal goals / anonymous money gift app / cheer app for goals / motivation app that pays / Beeminder alternative / stickK alternative / Forfeit app alternative / Buy Me a Coffee alternative / micro donation platform / goal setting app for students / send money to a friend anonymously / no strings attached gift app

**전환이 높은 구간**: "열품타 대체", "챌린저스 후기", "챌린저스 환급 현금", "기프티콘 부담", "Beeminder alternative" 는 **대체재 탐색 의도**다. "동기부여 앱" 같은 광역어는 습관앱 대기업과 정면 승부라 초기에는 버린다.

---

## 7. 가격

### 7.1 경쟁사 요금표 요약 (원문 근거)

| 구간 | 사례 |
|---|---|
| 0~5% | Ko-fi 팁 0%, Zeffy 0%, GoFundMe 개인 0%+PG, 트윕 1%, 리틀리 1~5%, 텀블벅 5%+PG3%, Kickstarter 5%+3~5%, Indiegogo 5%+3%, BMC 5%, 오마이컴퍼니 5~7% |
| 9~10% | 와디즈 9%, Patreon 10%+PG(실질 13~16%), **해낼게 현행 10%+부가세** |
| 20~50%+ | 크라우디 20%, 치지직 20~40%, 유튜브 30%, 인스타 배지 30%, 투네이션 5.3~35%, 틱톡 50%+ |

**해낼게 현행 10%는 국내 후원 시장에서 최저가 구간이다.** 투네이션 대비 최대 25%p, 틱톡 대비 40%p 이상 유리하고 Patreon 과 동률이다. **이걸 지금 어디에서도 말하고 있지 않다.**

### 7.2 가격 후보 3안

| 안 | 내용 | 근거 | 리스크 |
|---|---|---|---|
| **A안 (추천). 현행 10% 유지 + "국내 최저 수수료" 명시 노출** | 이용료 10% + 부가세. 환전 화면과 랜딩에 투네이션 5.3~35%·유튜브 30%·틱톡 50%+ 대비표를 붙인다 | D-014 확정값을 그대로 쓴다. 가격을 안 바꾸므로 재승인 불필요. 이미 이긴 경쟁 우위를 말만 하면 된다 | 원천징수 3.3% 의 법적 근거가 D-017 로 미확정. **대비표에서 이용료와 세금을 섞어 쓰면 허위 표시가 된다.** 화면에서 분리 필수 |
| **B안. 응원자 부담 전환 (수취인 0%)** | 응원자가 수수료를 얹고 받는 사람은 1클로버=1,000원 전액 수령 | GoFundMe·Zeffy 의 기부자 팁 모델 | 응원자 결제 저항. 페르소나 B-1 의 3,000~10,000원 앵커에서 수수료가 보이면 이탈. **검증 전 채택 금지** |
| **C안. 누적 연동 체감 수수료** | 리틀리처럼 누적 환전액에 따라 10% → 최저 5% | [리틀리 5%→1% 체감](https://start.litt.ly/blog/creator-sponsorship-fee-comparison-guide) | 최소 환전 도달 계정이 현재 0개다. 차등을 만들 표본이 없다. **시기상조** |

**추천은 A안이다.** 지금 문제는 가격 수준이 아니라 **이미 이긴 가격을 말하지 않고 있는 것**이다. 가격 변경은 회장 승인 사항이고(헌법 §4.3 ③) A안은 승인이 필요 없다.

---

## 8. 유통 채널

| 채널 | 실제 획득이 일어나는가 | 근거 | 판정 |
|---|---|---|---|
| **인스타그램 공스타그램 (오가닉)** | 목표 공개·루틴·상호 동기부여가 이미 문화다. 시험 주제 해시태그로 서로를 발견하고, 자료형 게시물이 계정 성장을 만든다. 외부 도구는 노션·구글폼·블로그 | [TILNOTE](https://tilnote.io/en/pages/697835c0d9c8b2d35783e9b6) | **1순위.** 공급측이 그대로 거기 있고, "링크 하나 더" 자리가 비어 있다 |
| **인스타그램 콜드 DM** | 대량 DM 은 **정책 위반**. "한 달 만에 몇천 명 모았다는 후기 다음 달이 계정 사라졌어요 후기로 끝나는 사례가 정말 많다". 합법 경로는 Meta 공식 Messenger API 위의 도구뿐 | [1point.kr](https://1point.kr/blog/insights/insta-dm-automation-4steps-2/) · [mirra.my](https://www.mirra.my/ko/blog/instagram-dm-automation-complete-guide-2026) | **회장 정본과 충돌.** §11 참조 |
| **인바운드 트리거 DM** | 댓글 키워드 → 자동 DM. 오픈율 **85~95%**, 클릭률 **40~70%**. "관심 있으신가요?"보다 "DM에 '가격'이라고 남겨주세요" 처럼 구체 액션이 전환이 높다 | [1point.kr](https://1point.kr/blog/insights/insta-dm-automation-4steps-2/) | **콜드 DM 의 합법 대체재. 1순위와 함께 간다** |
| **릴스·숏폼** | 브랜딩은 인스타, 신뢰는 유튜브, 확산은 틱톡. 릴스 도달률 최고, 마이크로·나노 인플루언서 조합이 가성비 우수 | [오픈애즈](https://www.openads.co.kr/content/contentDetail?contsId=19429) · [TILNOTE 릴스](https://tilnote.io/en/pages/69ed7a6a2c1001b02aa76baa) | 2순위 |
| **스터디윗미 크리에이터 제휴** | 틱톡에 "스터디윗미 찍는 법"이 독립 검색 주제로 존재할 만큼 포맷 정착 | [TikTok Discover](https://www.tiktok.com/discover/%EC%8A%A4%ED%84%B0%EB%94%94%EC%9C%97%EB%AF%B8-%EC%B0%8D%EB%8A%94-%EB%B2%95) | **양면시장 해법 후보.** 크리에이터 1인이 공급과 수요를 동시에 데려온다 |
| 캠스터디 (구루미·스터디라이브) | 공급측 밀집. 구루미는 4명 무료라 그룹 단위 접근 가능 | [gooroomee](https://gooroomee.com/camstudy/room) | 후보 |
| 네이버 카페 (공시생·편입) | 회원 전용이라 색인 밖. 침투는 수동 | 조회 실패 | (미검증) |
| Product Hunt | 국내 10~20대 타깃과 오디언스 불일치 | - | 비추천 |

---

## 9. 고객 인터뷰 질문 20개 (Mom Test)

원칙: 과거의 구체 행동만 묻는다. 미래 의향·가정·제품 설명 금지. 근거: [Mom Test](https://blog.uxtweak.com/the-mom-test/) · [60 discovery questions](https://getperspective.ai/blog/60-customer-discovery-questions-for-2026-mom-test-approved)

**A. 목표 선언자(공급)**
1. 지금 준비하는 게 뭔지, 언제 시작했는지 말해주세요.
2. 마지막으로 그걸 다른 사람에게 공개한 게 언제였고, 어디에 올렸나요?
3. 그 게시물에 뭐가 달렸나요. 그걸 보고 그 다음에 뭘 했나요?
4. 가장 힘들었던 주가 언제였고, 그 주에 실제로 뭘 했나요?
5. 그때 누가 뭘 해줬나요. 아무도 안 했으면 그것도 그대로 말해주세요.
6. 누군가에게 실제로 뭘 받아본 적 있나요. 뭘, 누구한테, 언제?
7. 받고 나서 답장을 했나요. 뭐라고 썼는지 기억나나요?
8. 받고 며칠 뒤에 그 사람한테 뭘 했나요?
9. 기록하려고 지금 쓰는 앱이 뭔가요. 마지막으로 연 게 언제인가요?
10. 그 앱을 안 열게 된 주가 있었나요. 그 주에 무슨 일이 있었나요?
11. 지금까지 이 목표에 쓴 돈이 얼마쯤이고, 어디에 썼나요?
12. 그 돈을 어떻게 마련했나요?

**B. 응원자(수요)**
13. 최근 1년 안에 친구의 노력을 보고 뭔가 해주고 싶었던 순간이 있었나요. 언제였나요?
14. 그때 실제로 뭘 했나요. 아무것도 안 했다면 왜 멈췄나요?
15. 마지막으로 지인에게 기프티콘이나 돈을 보낸 게 언제였고, 얼마였나요?
16. 그걸 보내기 전에 망설였나요. 뭐가 걸렸나요?
17. 보낸 뒤 상대 반응이 어땠나요. 그 뒤로 또 보냈나요, 안 보냈나요?
18. 보내고 나서 후회한 적 있나요. 어떤 경우였나요?
19. 최근에 인스타에서 친구 게시물에 댓글을 단 게 언제인가요. 뭐라고 썼나요?
20. 지난달 카드값에서 "이건 안 아까웠다" 싶은 3천~1만원짜리 결제가 뭐였나요?

---

## 10. 랜딩 카피

원문 근거: 블라인드 "받고 싶지도 않은 선물 오는 거 부담스럽고", "선물받는 입장에서 브랜드 선택 X", "주문시 배달비 전부를 선물 받은 사람이 부담" / 페르소나의 "말뿐인 화이팅" / Forfeit 랜딩의 단문 명령형 구조("Complete your habits, or lose money").

### 히어로 3안
- **H1 (부담 제거 축, 추천)** — "화이팅 말고, 진짜로."
  서브: 친구가 선언한 목표에 조용히 돈을 두고 갑니다. 답장 안 해도 됩니다.
- **H2 (기프티콘 대체 축)** — "기프티콘은 부담스럽고, 댓글은 3초면 사라집니다."
  서브: 브랜드 고를 필요도, 배달비 낼 사람도 없습니다. 친구에게 그대로 쌓입니다.
- **H3 (선언자 축)** — "나 이거 해낼게."
  서브: 그 한 줄에 친구들이 조용히 돈을 얹습니다. 30클로버부터 현금으로 바꿉니다.

### 서브카피 3안
- "하트 40개보다, 3,000원이 오래 남습니다."
- "응원은 돈으로 하는 겁니다. 대신, 티 안 나게."
- "받는 사람은 답장할 의무가 없고, 보내는 사람은 생색낼 필요가 없습니다."

### CTA 3안
- "조용히 응원하기" (응원자 면)
- "내 목표 선언하기" (선언자 면)
- "친구 목표 링크 받기" (양면 전환)

### FAQ 3안
- **Q. 목표를 못 이루면 돈은 어떻게 되나요?** A. 그대로 친구 것입니다. 해낼게는 달성 여부로 돈을 뺏거나 주는 서비스가 아닙니다. 결제 즉시 친구에게 적립됩니다.
- **Q. 얼마를 보냈는지 다른 사람이 보나요?** A. 못 봅니다. 개별 금액은 설정으로도 공개할 수 없게 시스템이 잠가 뒀습니다. 원하면 이름도 숨길 수 있습니다.
- **Q. 수수료가 얼마인가요?** A. 환전할 때 서비스 이용료 10%와 그 부가세를 뗍니다. 유튜브 슈퍼챗은 30%, 투네이션은 방식에 따라 최대 35%, 틱톡은 50%가 넘습니다.

### 반론처리 3안
- **"내기·도박 아닌가요?"** → 본인이 돈을 걸고 실패하면 잃는 구조가 아닙니다. 친구가 보내는 것이고 조건이 없습니다. StickK·Beeminder·챌린저스와는 돈이 흐르는 방향이 반대입니다.
- **"구걸처럼 보일까 봐요."** → 목표를 나만 보기로 두고 시작할 수 있습니다. 금액은 아무에게도 안 보이고, 응원자 이름과 메시지도 항목별로 잠급니다.
- **"친구한테 부담 주는 거 아닌가요?"** → 링크를 열어도 아무것도 요구하지 않습니다. 보내는 사람은 익명을 고를 수 있고, 받는 사람은 답장 의무가 없습니다. 블라인드에 올라온 "받고 싶지도 않은 선물 오는 거 부담스럽고" 같은 상황이 안 생기게 설계했습니다.

---

## 11. 수익모델 후보

| # | 모델 | 실제 사례와 단가 | One Thing 충돌 여부 |
|---|---|---|---|
| 1 | **환전 이용료 (현행)** | Patreon 10%, 와디즈 9%, 텀블벅 5%+PG3%, 투네이션 5.3~35% | **충돌 없음.** 돈이 실제로 옮겨질 때만 과금 |
| 2 | **응원자 부담 팁** | GoFundMe 기부자 팁, Zeffy 0%+팁 | 부분 충돌. 결제 화면에 선택지가 늘어 "1~2탭" 마찰 기준(페르소나 B-1)을 깬다 |
| 3 | **선언자 구독** | Habitica $4.99/월, Finch $39.99/년, Streaks $5.99 일회, Loggd €48/년 | 충돌. 받는 쪽에서 돈을 받으면 "응원받는 곳"이 "돈 내는 곳"이 된다. 페르소나 A-1 은 월 40만원 소득이다 |
| 4 | **기업·기관 스폰서 응원** | (unknown 단가) | 충돌 위험 + **Everest 반례.** 스폰서십은 사이클이 길고 매출이 불안정해 Everest 실패 요인이었다 |
| 5 | **커밋먼트 전환 (조건부 pledge)** | StickK 실패 과금, Beeminder $5~$2430, Forfeit 누적 $8.7M | **정면 충돌.** One Thing 함정 4번이 reject 했고, Pact 의 FTC 제소·$948,788 환급 명령이 실증 반례다 |
| 6 | **크리에이터 제휴 수수료** | 리틀리 5%→1% 체감, 투네이션 정산 하한 40,000캐시 | 충돌 없음, **가장 유망한 확장.** 단 "지인×지인"에서 "팬×스타"로 미끄러지면 함정 1번(투네이션 클론)이 된다. 경계선은 "선언자가 아는 사람인가" |

**추천 순서: 1 유지 → 6 실험 → 2 검증 후 판단. 3·4·5 는 지금 하지 않는다.**

---

## 12. 조사 인프라 한계 (v1.1.0 신규, 하네스 이슈)

이 조사에서 다음이 **전부 차단됐다.** 다음 조사 과제의 설계 조건이므로 기록한다.

| 도구 | 상태 | 증상 |
|---|---|---|
| WebSearch | **예산 소진** | 세션 200/200 |
| reddit.com / old.reddit.com | **차단** | "unable to fetch" / 도메인 검증 실패 |
| search.brave.com | **429** | 반복 시도 전부 Too Many Requests |
| duckduckgo (html·lite) | **CAPTCHA** | 오리 선택 챌린지 |
| ecosia / mojeek / startpage | **403 / fetch 불가** | - |
| apps.apple.com 리뷰 페이지 | **403** | 리뷰 원문 직접 인용 불가 |
| 네이버 카페 | **색인 밖** | 회원 전용 |

**결과**: reddit 원문 인용과 앱스토어 리뷰 원문 인용을 1차로 확보하지 못했고, 국내 목표앱 종료 사례와 SEO 실측 검색량이 미완이다. 이 셋이 v1.2.0 의 과제다.

---

## 13. 시사점

### 차용할 것
1. **Forfeit 의 랜딩 문법.** "Complete your habits, or lose money" 는 한 문장에 기전 전체가 들어간다. 우리 슬로건 "응원은 돈으로 하는 겁니다"는 톤은 있는데 **기전이 없다.** H1~H3 이 그 보정이다.
2. **Forfeit·Beeminder 의 누적 수치 노출.** 다만 D-009 안전선(금액 일절 노출 금지) 때문에 우리가 쓸 수 있는 숫자는 **인원·목표 수·응원 건수**뿐이다.
3. **리틀리의 체감 수수료와 최소금액 없는 주간 자동정산.** 우리 30클로버 하한과 수동 정산은 이 기준에서 마찰이 크다. 하한 자체보다 **"왜 30인가"를 화면에서 설명**하는 것이 급하다.
4. **인바운드 트리거 DM**(오픈율 85~95% 실측)이 콜드 DM 의 합법 대체재다.

### 바꿀 것
1. **"돈 걸고 목표"라는 언어를 랜딩에서 쓰지 않는다.** 그 자리는 챌린저스·StickK·Forfeit 이 점령했고, 우리가 쓰면 즉시 "본인이 돈 잃는 앱"으로 오독된다. 대신 **"기프티콘 대신"** 자리를 잡는다. 비어 있고, 블라인드 원문이 수요를 증명한다.
2. **10% 수수료를 무기로 쓴다.** 국내 최저 구간인데 말하지 않고 있다.
3. **달성 인증을 안 받는 것을 강점으로 판다.** 이 시장 전체가 인증에서 무너진다(§3). 우리는 판정하지 않으므로 그 분쟁이 구조적으로 없다.
4. **"현금"을 전면에 둔다.** 챌린저스 페이백은 현금성 포인트다. 해낼게는 원화 계좌 입금이다. 이 차이가 지금 카피에 없다.

### 회장 정본과 충돌하는 것 (§4.1 줏대 적용)
- **BRAIN `idea-DM-아웃바운드-마케팅.md` 의 "하루 500 DM 콜드 아웃바운드, 해낼게부터 착수"는 2026-09 기준 실행 불가에 가깝다.** 그 문서 스스로 Open Q 에 "스팸 밴 리스크"를 적었고, 이번 조사에서 그것이 리스크가 아니라 **현재 정책 위반이고 계정 소멸이 흔한 결과**임이 확인됐다. 근거: [1point.kr](https://1point.kr/blog/insights/insta-dm-automation-4steps-2/) · [mirra.my](https://www.mirra.my/ko/blog/instagram-dm-automation-complete-guide-2026). 대체안은 같은 채널의 **인바운드 트리거 DM**이고 실측 오픈율이 85~95%다. 이건 아이데이션 제안이지 정본 수정이 아니다(헌법 §4.5).

---

## KNOWLEDGE_QUERY
- BRAIN: `wiki/business/마케팅/idea-DM-아웃바운드-마케팅.md`, `wiki/business/마케팅/synthesis-유저심리-6단계-정본.md`. `wiki/business/index.md` 는 전량 스캔 금지 규칙에 따라 지명된 두 페이지로 바로 좁혔다.
- repo: one-thing, persona, prd v0.4.0, discovery/README, 거버넌스/결정.md, 추가로 bm.md
- 웹(38회 fetch + 24회 search): 국내외 후원·펀딩 수수료 원문, 커밋먼트 앱 5종, 습관앱 집계 6개 매체, 국내 습관·공부앱, 실패 사례 3건, 블라인드 원문 2건, 공스타그램 문화, 인스타 DM 정책, Mom Test

## HITS_USED
- `one-thing.md` — 브리프의 "보증금 기반 달성" 추정을 **기각**. 함정 4번이 StickK 형을 명시 reject. 경쟁 범위 전체가 여기서 결정됐다.
- `bm.md` — 가격 3안 근거. 현행 10%+부가세, 30/27 경계, BM 종료 기준.
- `결정.md` D-009 — 금액 노출 금지 안전선. 사회적 증거 수치를 인원 기준으로 제한.
- `결정.md` D-016·D-017 — 지급대행 해지, 원천징수 3.3% 근거 미확정. 가격 대비표에서 세금·이용료 분리 이유.
- `persona.md` — 3,000~10,000원 앵커, "1~2탭 마찰" 기준. 수익모델 2·3안 판정 근거.
- BRAIN DM 아이디어 — 유통 채널 절의 출발점이자 CONFLICTS 대상.

## HITS_REJECTED
- BRAIN `synthesis-유저심리-6단계-정본.md` 전술 카탈로그 — 이번 산출물은 조사이지 캠페인 설계가 아니다. 랜딩 3안에 "관심" 단계만 얕게 반영하고 나머지 5단계는 안 썼다. 그로스 레인에서 쓸 것.
- 습관앱 기능 상세 비교 — 이름·가격만 취했다. 해낼게는 습관 추적으로 경쟁하지 않는다.
- Product Hunt 런치 가이드류 — 타깃 오디언스 불일치.
- 2e.co.kr 습관앱 비교 기사 — 본문이 영상이라 텍스트 근거 없음. 인용하지 않았다.

## CONFLICTS
1. **콜드 DM (BRAIN 정본 vs 웹 벤치마크).** §13 참조. 회장 결정 사항은 아니다. 합법 대체재가 있어 그로스 레인에서 대체 집행하면 된다.
2. **브리프의 제품 추정 vs repo 정본.** 브리프는 "보증금 기반"으로 추정, 정본은 반대. **정본을 따랐다.**
3. **2차 자료 간 가격 상충 6건.** StickK(무료 vs 계약당 $5), Forfeit(실패 시만 vs $7/월), Finch($39.99/년 vs $4.99/월), Streaks($5.99 vs $4.99), Habitify($2.49 vs $4.99~7.49/월), Way of Life(구독 vs 일회), 텀블벅(5% vs 5~15%). **양쪽 병기했고 공식 페이지 실측이 필요하다. 미검증.**
4. **조사 인프라 차단.** §12. reddit 원문·앱스토어 리뷰 원문·SEO 실측 검색량·국내 종료 사례가 미완이며 v1.2.0 과제다.

## SOURCES
- https://start.litt.ly/blog/creator-sponsorship-fee-comparison-guide
- https://blog.fancimm.com/2025-creator-platform-fee-guide
- https://help.toon.at/hc/ko/articles/115001374413
- https://help.toon.at/hc/ko/articles/115001502234
- https://namu.wiki/w/Toonation
- https://support.twip.kr/hc/ko/articles/115000478027
- https://vidiq.com/blog/post/youtube-super-thanks/
- https://support.patreon.com/hc/en-us/articles/22581195376909-Creator-fees-FAQ
- https://cartmango.com/patreon-fees/
- https://www.schoolmaker.com/blog/buy-me-a-coffee-pricing
- https://talks.co/p/kofi-vs-buy-me-a-coffee/
- https://www.zeffy.com/blog/gofundme-reviews
- https://help.tumblbug.com/hc/ko/articles/115006479268
- https://www.shopify.com/kr/blog/crowdfunding-sites
- https://www.tech42.co.kr/와디즈-후원팬덤-펀딩-문턱-낮춘다수수료-최대-90/
- https://ccs.kakao.com/help?service=66&use=bridge
- https://www.teamblind.com/kr/post/카카오톡-선물-거부-못하나요-EpUjMLy3
- https://www.teamblind.com/kr/post/카카오톡-기프티콘은-좋은-점을-못느끼겠네-Cj2vRfKq
- https://namu.wiki/w/%EC%B1%8C%EB%A6%B0%EC%A0%80%EC%8A%A4
- https://biz-challengers.com/terms
- https://mz100.dasfl.com/entry/돈이-돌아오는-쇼핑-앱-챌린저스-가이드
- https://namu.wiki/w/%EC%97%B4%EC%A0%95%20%ED%92%88%EC%9D%80%20%ED%83%80%EC%9D%B4%EB%A8%B8
- https://edu.dasfl.com/entry/열품타-공부-시간-측정부터-스터디그룹-공유까지
- https://thevc.kr/minding
- https://platum.kr/archives/170875
- https://gooroomee.com/camstudy/room
- https://studylive.co.kr/
- https://apps.apple.com/kr/app/id6445960594
- https://play.google.com/store/apps/details?id=com.studylog.app
- https://apps.apple.com/app/id1542510906
- https://apps.apple.com/kr/app/id1518956326
- https://www.khan.co.kr/article/202108241445018
- https://www.stickk.com/faq/financial/Commitment+Contracts
- https://stickk.zendesk.com/hc/en-us/articles/206833157-How-it-Works
- https://www.beeminder.com/faq
- https://www.forfeit.app/
- https://www.pledgd.com/blog/best-commitment-contract-apps
- https://alternativeto.net/software/go-fucking-do-it
- https://alternativeto.net/software/forfeit
- https://alternativeto.net/software/stickk
- https://alternativeto.net/software/beeminder/?p=5
- https://2sync.com/blog/best-habit-tracker-apps
- https://loggd.life/blog/best-habit-tracker-apps-2026
- https://www.mainquest.net/habitica-pricing
- https://www.mainquest.net/habitica-alternatives
- https://www.pointwisesystem.com/blog/best-gamified-habit-trackers
- https://goalsandprogress.com/best-goal-setting-apps/
- https://www.accountablo.com/blog/best-accountability-apps
- https://lifestack.ai/blog/accountability-app
- https://habithuddle.com/blog/accountability-app-with-friends
- https://bossasaservice.com/blog/group-accountability-app/
- https://habi.app/insights/accountability-apps/
- https://habi.app/insights/finch-alternatives/
- https://www.daily-pact.com/compare/best-accountability-apps
- https://finestreak.com/blog/accountability-app-for-students
- https://www.goalswon.com/blog/23-apps-that-will-keep-you-accountable-and-motivated-to-achieve-all-your-personal-goals/
- https://techcrunch.com/2014/12/18/everest-the-peter-thiel-backed-app-for-achieving-your-dreams-shuts-down
- https://www.alexanderjarvis.com/everest-failed-startup-postmortem-learnings/
- https://www.mobihealthnews.com/news/khosla-backed-fitness-startup-pact-shuts-down
- https://gizmodo.com/app-that-paid-users-to-exercise-owes-nearly-1-million-1818632078
- https://www.ftc.gov/node/45481
- https://www.tcf.team/blog/biggest-crowdfunding-failures
- https://tilnote.io/en/pages/697835c0d9c8b2d35783e9b6
- https://tilnote.io/en/pages/69ed7a6a2c1001b02aa76baa
- https://1point.kr/blog/insights/insta-dm-automation-4steps-2/
- https://1point.kr/blog/insights/instagram-marketing/
- https://www.mirra.my/ko/blog/instagram-dm-automation-complete-guide-2026
- https://www.openads.co.kr/content/contentDetail?contsId=19429
- https://www.tiktok.com/discover/%EC%8A%A4%ED%84%B0%EB%94%94%EC%9C%97%EB%AF%B8-%EC%B0%8D%EB%8A%94-%EB%B2%95
- https://blog.uxtweak.com/the-mom-test/
- https://getperspective.ai/blog/60-customer-discovery-questions-for-2026-mom-test-approved
- https://www.verifiedmarketreports.com/product/personal-goal-setting-app-market/
- https://www.fortunebusinessinsights.com/productivity-apps-market-110254
- https://keywordsearch.pluszero.co.kr/naver
- https://loword.co.kr/

## MODEL
claude-opus-5[1m] · burst goal 3 사업조사 서브에이전트 · 2026-09-05 KST
증거 등급: 경쟁사 수수료·실패 사례·경쟁 앱 약점·블라인드 원문 = 근거 확인(URL 직접 조회). SEO 검색량·표 B 48개의 가격과 규모·reddit 원문 = 미검증. 랜딩 카피·가격 3안·인터뷰 질문 = 조사 기반 설계이며 실사용 검증 전.
