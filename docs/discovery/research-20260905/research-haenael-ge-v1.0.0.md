<!-- STAMP
파일: docs/discovery/research-20260905/research-haenael-ge-v1.0.0.md
생성: 2026-09-05 KST · model: claude-opus-5[1m] · agent: 사업조사 서브에이전트(goal 3 burst)
skills: 없음(available skills 중 시장조사 전용 skill 부재. 브리프 절차를 직접 적용)
헌법 Read: ~/.claude/CLAUDE.md, docs/burst-20260905/BRIEF-3-market-research.md
근거 요약: WebSearch 24회 실행 + WebFetch 20회 실행. 원문 URL은 각 절과 SOURCES에 있다.
고민한 대안: ①경쟁 범위를 "습관앱"으로 좁힐지 ②"P2P 소액 송금·선물"까지 넓힐지. 해낼게의 wedge 는 습관 추적이 아니라 지인 간 돈 전달이므로 넓은 쪽을 택했고, 습관앱은 인접 대체재로만 다뤘다.
한계 고지: 이 세션의 WebSearch 예산(200회)이 조사 도중 소진돼 브리프의 "경쟁사 100개" 목표와 "검색 40회 이상" 중 검색은 24회에서 멈췄다. 미확인 항목은 전부 (unknown)·(미검증)으로 표시했고, 채우지 못한 칸을 채운 척하지 않았다.
-->

# 해낼게 사업조사 v1.0.0 (2026-09-05)

## 0. 읽은 것과 안 읽은 것

**지시받아 읽은 것**
- `docs/plan/one-thing.md` (2026-08-29 보정본)
- `docs/plan/persona.md` (합성 페르소나 4인, 증거등급 보정본)
- `docs/plan/prd-haenael-ge-v0.4.0.md` (§0~§10)
- `docs/discovery/README.md`
- `wiki/거버넌스/결정.md` (D-004~D-017)
- BRAIN `wiki/business/마케팅/idea-DM-아웃바운드-마케팅.md`
- BRAIN `wiki/business/마케팅/synthesis-유저심리-6단계-정본.md` (헤더·1절)

**스스로 더 찾아 읽은 것** (헌법 §2.2-2)
- `docs/plan/bm.md` (현행 수수료 계약과 BM 종료 기준). 가격 절의 근거가 여기 있어서 안 읽으면 가격 3안을 뇌피셜로 쓰게 된다.

**안 읽은 것과 그 결과**
- `docs/plan/risks.md` 전문, `docs/growth/`, `docs/ship/ops/legacy/`. 따라서 이 문서의 리스크 판단은 결정 원장과 BM 문서에서 읽은 범위까지만 유효하다. **미검증**.

**One Thing 확정** (추정이 아니라 문서로 확인함)
> "친구가 선언한 목표에, 그 과정을 조용히 돈으로 응원한다."
브리프의 추정("금전 보증금 기반 습관 달성 구조")은 **틀렸다**. 해낼게는 본인이 돈을 거는 보증금·pledge 구조가 **아니다**. `docs/plan/one-thing.md` 의 잘못된 답 함정 4번이 StickK형 조건부 내기를 명시적으로 reject 했고, 2026-08-29 보정으로 "달성 판정은 지급 조건이 아니다"가 못 박혔다. 토스 지급대행은 D-013·D-015·D-016 에서 **해지 결정**된 항목이고 현행은 수동 정산이다. 이 문서의 경쟁 범위는 그 확정 정의를 따른다.

---

## 1. 경쟁 범위 정의

해낼게의 거래는 **"지인 A가 지인 B의 개인 목표에 소액을 조건 없이 보내고, B가 그것을 현금화한다"**이다. 따라서 경쟁 범위는 세 축이다.

| 축 | 왜 경쟁인가 | 대표 |
|---|---|---|
| **① 돈이 사람에게 가는 경로** (직접 경쟁) | 같은 지갑, 같은 순간을 놓고 싸운다 | 카카오 선물하기, 토스·카카오페이 송금, 투네이션·트윕·치지직·슈퍼챗, Buy Me a Coffee·Ko-fi·Patreon, GoFundMe·텀블벅 |
| **② 목표를 선언·기록·인증하는 곳** (유입 대체재) | 우리 공급측이 이미 거기 있다. 돈이 없을 뿐 | 열품타, 챌린저스, 마이루틴, 루티너리, 구루미 캠스터디, 스터디라이브, 공스타그램 자체, Strava, Habitica, Streaks, Finch |
| **③ 돈으로 실행을 강제하는 곳** (개념 경쟁, 방향 반대) | 시장이 우리를 여기로 오해한다 | StickK, Beeminder, Forfeit, Pledgd, TaskRatchet, 챌린저스 |

축 ③은 **본인 돈 vs 본인**이고 해낼게는 **타인 돈 → 본인**이다. 정반대 구조인데 언어가 같아서("돈 걸고 목표") 포지셔닝에서 가장 위험한 혼동 지점이다.

---

## 2. 경쟁사 목록

브리프 목표는 100개, 최소 40개다. **이름 기준 55개를 열거했고 그중 가격·규모가 URL 로 확인된 것은 26개다.** 나머지는 (unknown) 이다. 검색 예산 소진으로 목표 100개는 미달이다.

### 2.1 축 ① 돈이 사람에게 가는 경로

| # | 이름 | URL | 포지셔닝 한 줄 | 가격·수수료 | 규모 근거 | 출처 |
|---|---|---|---|---|---|---|
| 1 | 투네이션 | toon.at | 스트리머·창작자 후원 국내 1위 | **5.3~35%** (후원 방식별). 정산 최소 40,000캐시, 매월 1~10일 신청 | 2016 출시, 트위치·유튜브·아프리카·카카오TV 지원. 트윕 종료 후 사실상 독점 | [littly 비교](https://start.litt.ly/blog/creator-sponsorship-fee-comparison-guide), [투네이션 고객센터](https://help.toon.at/hc/ko/articles/115001374413), [나무위키](https://namu.wiki/w/Toonation) |
| 2 | 트윕(Twip) | twip.kr | 투네이션 경쟁 후원 위젯 | 서비스 수수료 1% + PG + 원천·주민세 | **2024년 서비스 종료** | [Twip 고객센터](https://support.twip.kr/hc/ko/articles/115000478027), [나무위키 Toonation](https://namu.wiki/w/Toonation) |
| 3 | 치지직 (네이버) | chzzk.naver.com | 국내 스트리밍 후원 | **약 20~40%** (등급별). 파트너 20%, 일반 30% | 네이버 운영 | [littly](https://start.litt.ly/blog/creator-sponsorship-fee-comparison-guide) |
| 4 | 유튜브 슈퍼챗·슈퍼땡스 | youtube.com | 라이브·영상 팁 | **30%** (전 국가·전 등급 동일). 정산 익월 20일, $100 이상 | 한국은 고팁 지역 | [littly](https://start.litt.ly/blog/creator-sponsorship-fee-comparison-guide) |
| 5 | 리틀리(Littly) | litt.ly | 링크인바이오 + 후원 | **기본 5%**, 누적 매출 따라 최저 1%. 주 단위 자동정산, 최소금액 없음 | (unknown) | [littly](https://start.litt.ly/blog/creator-sponsorship-fee-comparison-guide) |
| 6 | 카카오톡 선물하기 | gift.kakao.com | 국내 지인 간 선물 표준 | (unknown, 입점 판매수수료) | 국내 모바일 선물 사실상 표준 | [카카오 고객센터](https://ccs.kakao.com/help?service=66&use=bridge) |
| 7 | Buy Me a Coffee | buymeacoffee.com | 원탭 팁 | **5%** 단일. 유료 티어 없음 | (unknown) | [SchoolMaker](https://www.schoolmaker.com/blog/buy-me-a-coffee-pricing) |
| 8 | Ko-fi | ko-fi.com | 팁 0% + 선택 구독 | 일회성 팁 **0%**. Gold $6/월 또는 $42/년, 미가입 시 부가기능 5% | (unknown) | [talks.co](https://talks.co/p/kofi-vs-buy-me-a-coffee/) |
| 9 | Patreon | patreon.com | 창작자 구독 후원 | 표준 플랜 **10%** + 결제 2.9%+$0.30. 실질 13~16%. iOS 인앱은 애플 30% | 2025-08-04 이후 가입자는 전원 10% 플랜 | [Patreon Help](https://support.patreon.com/hc/en-us/articles/22581195376909-Creator-fees-FAQ), [cartmango](https://cartmango.com/patreon-fees/) |
| 10 | GoFundMe | gofundme.com | 개인 사연 모금 | 개인 캠페인 **플랫폼 수수료 0%**, 결제 2.9%+$0.30, 정기후원 5% | (unknown) | [Zeffy 리뷰](https://www.zeffy.com/blog/gofundme-reviews) |
| 11 | 텀블벅 | tumblbug.com | 창작 프로젝트 크라우드펀딩 | 성사 시 모금액 **5%** + 결제 3%(VAT 별도). 실패 시 0 | 국내 창작 펀딩 1위 | [텀블벅 헬프](https://help.tumblbug.com/hc/ko/articles/115006479268) |
| 12 | 와디즈 | wadiz.kr | 리워드·투자 펀딩 | 2026-07 기준 후원·팬덤 펀딩 수수료 **최대 90% 지원 캠페인** 진행 | (unknown) | [테크42](https://www.tech42.co.kr/와디즈-후원팬덤-펀딩-문턱-낮춘다수수료-최대-90/) |
| 13 | 치어스(CHEERS) | cheers.fun | 팬레터형 SNS 후원 | (unknown) | (unknown) | [cheers.fun](https://cheers.fun/) |
| 14 | 토스 송금 | toss.im | P2P 송금 | 무료 | (unknown) | (unknown) |
| 15 | 카카오페이 송금 | kakaopay.com | P2P 송금 | 무료 | (unknown) | (unknown) |
| 16 | 아프리카TV 별풍선 | sooplive.co.kr | 방송 후원 원조 | (unknown, 통상 30~40%대) | (unknown) | (unknown) |
| 17 | 팬딩 | fanding.kr | 창작자 멤버십 | (unknown) | (unknown) | (unknown) |
| 18 | 해피빈 (네이버) | happybean.naver.com | 공익 기부 | (unknown) | (unknown) | (unknown) |
| 19 | 카카오같이가치 | together.kakao.com | 공익 기부 | (unknown) | (unknown) | (unknown) |
| 20 | Venmo | venmo.com | 미국 소셜 송금 | (unknown) | (unknown) | (unknown) |
| 21 | Cash App | cash.app | 미국 P2P 송금 | (unknown) | (unknown) | (unknown) |
| 22 | Zeffy | zeffy.com | 0% 모금 플랫폼 | 0% (기부자 팁 기반) | (unknown) | [Zeffy](https://www.zeffy.com/blog/gofundme-reviews) |

### 2.2 축 ② 목표 선언·기록·인증

| # | 이름 | URL | 포지셔닝 | 가격 | 규모 근거 | 출처 |
|---|---|---|---|---|---|---|
| 23 | 열품타(열정품은타이머) | apps.apple.com/kr/app/id1441909643 | 공부시간 타이머 + 전국 랭킹 + 그룹 | 프리미엄(광고제거·고화질 캠) | **2018-11 출시, 2025-12 기준 누적 500만 다운로드**, 운영사 팔로(2인팀) | [나무위키](https://namu.wiki/w/열정%20품은%20타이머) |
| 24 | 챌린저스 | play.google.com/store/apps/details?id=kr.co.whitecube.chlngers | 예치금 걸고 습관 인증, 85% 달성 시 전액 환급 | 참가비 본인 설정. 상금 5만원 초과 시 **원천징수 22%**. 최소 출금 3,000원 | 2018 출시, 운영사 화이트큐브. 평균 달성률 약 90%, 최종 환급률 약 96% | [나무위키](https://namu.wiki/w/챌린저스), [이용약관](https://biz-challengers.com/terms) |
| 25 | 마이루틴 | apps.apple.com/kr/app/id1518956326 | 루틴·투두·일기 올인원 (ADHD 소구) | 무료 + 유료 | 운영사 마인딩, 업력 약 8.9년, **투자 3라운드** | [THE VC](https://thevc.kr/minding) |
| 26 | 루티너리(Routinery) | routinery.app | 루틴 타이머 | (unknown) | 출시 1년 6개월 만에 **글로벌 누적 80만 다운로드** | [플래텀](https://platum.kr/archives/170875) |
| 27 | 구루미 캠스터디 | gooroomee.com/camstudy | 캠스터디 1위 | 4명 무료 | (unknown) | [App Store](https://apps.apple.com/kr/app/id1126701514) |
| 28 | 스터디라이브 | studylive.co.kr | 24시간 실시간 캠스터디 | (unknown) | (unknown) | [studylive.co.kr](https://studylive.co.kr/) |
| 29 | 우디(Woodi) | apps.apple.com/kr/app/id6445960594 | 동작인식 AI 공부시간 측정, 캐릭터로 얼굴 노출 회피 | (unknown) | (unknown) | [App Store](https://apps.apple.com/kr/app/id6445960594) |
| 30 | 스터디로그 | play.google.com/store/apps/details?id=com.studylog.app | 공부 인증·기록 | (unknown) | (unknown) | [Play](https://play.google.com/store/apps/details?id=com.studylog.app) |
| 31 | 오늘의목표 | apps.apple.com/app/id1542510906 | 목표·습관·루틴·챌린지 | (unknown) | (unknown) | [App Store](https://apps.apple.com/app/id1542510906) |
| 32 | 그로우 | (unknown) | 성장관리·감사일기·챌린지 | (unknown) | 2021-08 론칭 1주년 기사 | [경향](https://www.khan.co.kr/article/202108241445018) |
| 33 | Habitica | habitica.com | 습관을 RPG 로 | 무료 + **$4.99/월 또는 $47.99/년** | (unknown) | [mainquest](https://www.mainquest.net/habitica-pricing) |
| 34 | Finch | finchcare.com | 셀프케어 펫 육성형 습관 | 무료 + **Finch Plus $39.99/년** (출처별 $4.99~9.99/월 상충) | (unknown) | [2sync](https://2sync.com/blog/best-habit-tracker-apps), [habi](https://habi.app/insights/finch-alternatives/) |
| 35 | Streaks | streaksapp.com | 애플 생태계 습관 | **$5.99 일회 구매** | (unknown) | [2sync](https://2sync.com/blog/best-habit-tracker-apps) |
| 36 | Habitify | habitify.me | 크로스플랫폼 습관 | 무료 / $4.99~7.49월 (출처 상충) | (unknown) | [2sync](https://2sync.com/blog/best-habit-tracker-apps), [goalswon](https://www.goalswon.com/blog/23-apps-that-will-keep-you-accountable-and-motivated-to-achieve-all-your-personal-goals/) |
| 37 | Loop Habit Tracker | loophabits.org | 무료 오픈소스 | 무료 | (unknown) | [2sync](https://2sync.com/blog/best-habit-tracker-apps) |
| 38 | Productive | apps.apple.com/app/id983826477 | 루틴·챌린지 | 무료 / $6.99월 | (unknown) | [2sync](https://2sync.com/blog/best-habit-tracker-apps) |
| 39 | Strides | stridesapp.com | 유연한 목표+습관 | 무료 / $4.99월 | (unknown) | [2sync](https://2sync.com/blog/best-habit-tracker-apps) |
| 40 | HabitNow | (Android) | 안드 습관+루틴+태스크 | 무료 / $11.99 일회 | (unknown) | [2sync](https://2sync.com/blog/best-habit-tracker-apps) |
| 41 | Way of Life | wayoflifeapp.com | 시각 트렌드 추적 | 무료 / 약 $4.99 일회 | (unknown) | [2sync](https://2sync.com/blog/best-habit-tracker-apps) |
| 42 | Atoms | atoms.com | 정체성 기반 습관 | 무료(1개) / $4.99월 | (unknown) | [2sync](https://2sync.com/blog/best-habit-tracker-apps) |
| 43 | Strava | strava.com | 운동 소셜 피드·클럽 | (unknown) | (unknown) | [bossasaservice](https://bossasaservice.com/blog/group-accountability-app/) |
| 44 | HabitShare | habitshareapp.com | 친구와 습관 공유 | **전면 무료** | (unknown) | [habithuddle](https://habithuddle.com/blog/accountability-app-with-friends) |
| 45 | SnapHabit | snaphabit.app | 가족 그룹 + 사진 인증 | 무료 | (unknown) | [habithuddle](https://habithuddle.com/blog/accountability-app-with-friends) |
| 46 | Habit Huddle | habithuddle.com | 친구 그룹 습관 | 무료(활성 1개) | (unknown) | [habithuddle](https://habithuddle.com/blog/accountability-app-with-friends) |
| 47 | Habi | habi.app | 2026 신규, 친구 초대·넛지 | (unknown) | 2026 초 출시 | [habi](https://habi.app/insights/accountability-apps/) |
| 48 | Daily Pact | daily-pact.com | 친구 그룹 챌린지·리더보드 | (unknown) | (unknown) | [daily-pact](https://www.daily-pact.com/compare/best-accountability-apps) |
| 49 | Forest | forestapp.cc | 집중 차단 | $3.99 (iOS) | (unknown) | [goalswon](https://www.goalswon.com/blog/23-apps-that-will-keep-you-accountable-and-motivated-to-achieve-all-your-personal-goals/) |

### 2.3 축 ③ 돈으로 실행 강제

| # | 이름 | URL | 포지셔닝 | 가격 | 출처 |
|---|---|---|---|---|---|
| 50 | StickK | stickk.com | 커밋먼트 계약. 실패 시 친구·적·자선단체(15개 이상 501(c)(3))로 송금 | 계약 생성 **무료**. 실패 보고 시에만 과금. 카드 검증 $1 홀드 | [StickK FAQ](https://www.stickk.com/faq/financial/Commitment+Contracts), [Help Center](https://stickk.zendesk.com/hc/en-us/articles/206833157-How-it-Works) |
| 51 | Beeminder | beeminder.com | 자동 데이터 연동 + 지수적 벌금 | 서약 **$5 → $10 → $30 → $90 → $270 → $810 → $2430** 고정 사다리. 프리미엄 약 $8/월 | [Beeminder FAQ](https://www.beeminder.com/faq) |
| 52 | Forfeit | forfeit.app | "습관 완수 아니면 돈을 잃는다". AI·사람 검증 | 구독 없음, 실패 시에만 과금. 별도 자료는 기본 약 $7/월·Overlord $12.99/월로 표기(출처 상충) | [forfeit.app](https://www.forfeit.app/), [pledgd 비교](https://www.pledgd.com/blog/best-commitment-contract-apps) |
| 53 | Pledgd | pledgd.com | SMS + AI 사진 검증, $5~$270 상향 | **$15/월**, 14일 무료 | [pledgd](https://www.pledgd.com/blog/best-commitment-contract-apps) |
| 54 | TaskRatchet | taskratchet.com | 마감 넘기면 과금, 일회성 태스크 | 무료, 실패 시에만 과금 | [pledgd](https://www.pledgd.com/blog/best-commitment-contract-apps) |
| 55 | GoalsWon / BossAsAService / Coach.me / Focusmate | 각 사이트 | 사람이 붙는 책임 서비스 | GoalsWon **$90/월·$720/년**, Boss **$30~200/월**, Coach.me 코칭 **주 $50+**, Focusmate 무료 주3회·**$12/월·$96/년** | [goalswon](https://www.goalswon.com/blog/23-apps-that-will-keep-you-accountable-and-motivated-to-achieve-all-your-personal-goals/) |

**Forfeit 의 사회적 증거 수치** (랜딩 원문): 4.9점 763리뷰, 누적 686,000건 서약, 누적 **$8.7M 스테이킹**, 성공률 **94.2%**. 출처 [forfeit.app](https://www.forfeit.app/).

---

## 3. 커뮤니티 원문 (만들어낸 인용 없음)

reddit 은 이 환경에서 직접 fetch 가 차단됐다(`old.reddit.com`·`www.reddit.com` 둘 다 실패). 그래서 reddit 원문은 검색 결과에 인용된 2차 인용만 있고, 대신 국내 커뮤니티(블라인드) 원문을 직접 가져왔다.

### 3.1 "선물은 부담스럽다" — 우리 핵심 가설의 직접 증거

블라인드 「카카오톡 선물 거부 못하나요?」 (한국남부발전 작성자)
> **"받고 싶지도 않은 선물 오는 거 부담스럽고 별론데"**
작성자는 이어서 "애초에 상대방이 보내지 못하게 하는 방법"을 물었다. 댓글은 "선물 누르면 거부하기 있음", "거절하기", "유효기간넘겨서 자동환불되게해버려".
출처: [teamblind](https://www.teamblind.com/kr/post/카카오톡-선물-거부-못하나요-EpUjMLy3)

블라인드 「카카오톡 기프티콘은 좋은 점을 못느끼겠네..」
> **"기프티콘 정가로 구매"**, **"선물받는 입장에서 브랜드 선택 X"**, **"주문시 배달비 전부를 선물 받은 사람이 부담"**
댓글 반론: **"선물해서 선물받아서 기쁜 마음이 남"**
출처: [teamblind](https://www.teamblind.com/kr/post/카카오톡-기프티콘은-좋은-점을-못느끼겠네-Cj2vRfKq)

**해석.** 페르소나 B-1 김민지의 "기프티콘 보냈다가 부담스럽다는 답장을 받았다"는 서사는 **합성 페르소나였지만, 같은 감정의 실제 원문이 존재한다.** 다만 원문의 불만 축은 감정(부담)과 경제성(정가·배달비·브랜드 선택 불가) 두 개이고, 해낼게는 후자를 자동으로 해결한다(현금성 적립이라 브랜드·배달비 문제가 없다). 이건 지금 카피에 안 쓰이고 있는 무기다.

### 3.2 커밋먼트 앱 이탈 원문 (2차 인용, 검색 결과 경유)
> "tried Beeminder several years ago but it didn't take"
> "tried Beeminder about 7-8 years ago and it didn't stick because they found the interface too complicated"
출처: [alternativeto Beeminder](https://alternativeto.net/software/beeminder/?p=5) 및 [alternativeto stickK](https://alternativeto.net/software/stickk)
**미검증**: 원 게시자·날짜는 확인하지 못했다.

### 3.3 습관앱 이탈 원문 (앱스토어 리뷰, 검색 결과 경유)
> "doesn't allow for much customization to rename habits etc which is really annoying" / "has this app been abandoned"
> "bought the lifetime option to unlock all features" 후 "a feature wasn't working", "email bounced back", "developer website will not load", "the app hasn't been updated in 2 years"
출처: [Productive App Store](https://apps.apple.com/us/app/id983826477) 계열 리뷰 인용. **원문 리뷰 페이지 직접 fetch 는 실패(403)**, 따라서 **미검증** 등급.

### 3.4 열품타 운영 실태 (나무위키 정리)
"광범위한 공부시간 조작", "상습적 서버 다운", 각종 버그, 학부모 통제 우회 기법이 문제점으로 정리돼 있다. 출처: [나무위키](https://namu.wiki/w/열정%20품은%20타이머)
**시사점**: 인증의 신뢰성이 이 시장의 만성 결함이다. 해낼게는 달성 인증을 지급 조건으로 쓰지 않기 때문에 **이 결함을 구조적으로 회피**한다. 이건 약점이 아니라 팔아야 할 강점이다.

---

## 4. 실패한 유사 서비스

최소 8개가 요구됐다. **근거가 확인된 것 5개, 후보이나 미검증 3개**로 정직하게 나눈다.

| # | 서비스 | 기간 | 왜 죽었나 | 출처 |
|---|---|---|---|---|
| 1 | **Everest** (Peter Thiel 투자) | 2013~2014-12 | 목표 앱. $2.2M 소진, 다운로드 30만에 그침. 유저 확보 실패로 운영비 정당화 불가. 버그·크래시, 반복 태스크·알림 설정이 혼란스러움, 목표를 단계로 쪼개는 작업 자체가 지겨움. 사후분석: 8개월 넘게 지표를 안 봤고, 월 $90~105k 를 PMF 없이 태웠고, 직접 과금 대신 스폰서십을 좇아 매출이 불안정했음 | [TechCrunch](https://techcrunch.com/2014/12/18/everest-the-peter-thiel-backed-app-for-achieving-your-dreams-shuts-down), [Alexander Jarvis 포스트모템](https://www.alexanderjarvis.com/everest-failed-startup-postmortem-learnings/) |
| 2 | **Pact (구 GymPact)** | 2011말~2017 | 성공자에게 현금을 주려면 실패자가 계속 공급돼야 하는 구조. 양쪽 사기 단속 부담. FTC 제소, $1.5M 판결 중 일부 유예, **$948,788 소비자 환급 명령**. "약속을 지킨 이용자에게 지급하지 않고 오히려 과금했다"가 혐의 | [MobiHealthNews](https://www.mobihealthnews.com/news/khosla-backed-fitness-startup-pact-shuts-down), [Gizmodo](https://gizmodo.com/app-that-paid-users-to-exercise-owes-nearly-1-million-1818632078), [FTC](https://www.ftc.gov/node/45481) |
| 3 | **트윕(Twip)** | ~2024 | 국내 후원 위젯. 트위치 코리아의 독점 사용 논란 이후 트위치 한국 철수와 함께 종료. 투네이션이 시장을 흡수 | [나무위키 Toonation](https://namu.wiki/w/Toonation) |
| 4 | **SnapHabit** | 운영 중이나 사실상 정체 | "infrequent updates", 사진 인증 마찰 | [habithuddle](https://habithuddle.com/blog/accountability-app-with-friends) |
| 5 | **크라우드펀딩 대형 실패군** | - | 개인 서사형 모금의 이행 실패 사례 모음 | [TCF](https://www.tcf.team/blog/biggest-crowdfunding-failures) |
| 6 | GoFuckingDoIt | (미검증) | 검색으로 확인 불가 | - |
| 7 | Aherk! (페이스북 인질 사진 커밋먼트) | (미검증) | 검색으로 확인 불가 | - |
| 8 | 국내 목표·습관 앱 종료 사례 | (미검증) | 검색 예산 소진으로 확인 못 함 | - |

**우리에게 직결되는 교훈 3개**
1. **Pact 형 구조는 죽는다.** 성공 보상 재원을 실패자에게서 뽑는 순환은 규제와 사기로 붕괴한다. 해낼게는 재원이 제3자(친구)라서 이 함정 밖에 있다. **이건 방어해야 할 자산이고, "조건부 pledge" 를 BM 에 다시 넣는 순간 Pact 의 궤도에 들어간다**(`docs/plan/bm.md` §2.2 가 이미 범위 밖으로 둔 것과 정합).
2. **Everest 형 실패는 "목표를 쪼개게 시키는 노동"에서 온다.** 해낼게가 선언자에게 요구하는 입력이 늘어나면 같은 방식으로 죽는다.
3. **Everest 는 직접 과금 대신 스폰서십을 좇다가 매출이 불안정했다.** `docs/plan/bm.md` 의 "기업 스폰서 응원" 후보를 앞당기지 말아야 할 실증 근거다.

---

## 5. SEO 키워드

**검색량은 근거 URL 이 있을 때만 숫자를 쓴다는 규칙에 따라 전부 (unknown) 이다.** 네이버 검색광고 키워드도구·구글 키워드플래너 실측이 다음 작업이다(도구 URL: [네이버 키워드 조회](https://keywordsearch.pluszero.co.kr/naver), [로워드](https://loword.co.kr/)).

### 한국어 24개
목표 선언 / 공부 인증 / 공스타그램 / 공스타 시작 / 스터디 플래너 앱 / 공부 자극 / 동기부여 앱 / 습관 만들기 앱 / 챌린지 앱 / 돈 걸고 공부 / 편입 준비 / 재수 동기부여 / 공무원 수험생 커뮤니티 / 다이어트 챌린지 앱 / 친구 응원 문구 / 응원 선물 / 기프티콘 대신 / 소액 후원 플랫폼 / 후원 수수료 비교 / 공부 응원 메시지 / 수험생 선물 추천 / 목표 달성 앱 추천 / 열품타 대체 / 챌린저스 후기

### 영어 22개
goal declaration app / accountability app for friends / commitment contract app / stake money on goals / habit tracker with friends / social accountability app / support a friend financially / tip a friend app / peer to peer support app / study accountability app / study with me app / crowdfund personal goal / GoFundMe alternative for personal goals / anonymous money gift app / cheer app for goals / motivation app that pays / Beeminder alternative / stickK alternative / Forfeit app alternative / Buy Me a Coffee alternative / micro donation platform / goal setting app for students

**의도 분류가 우리에게 유리한 지점**: "열품타 대체", "챌린저스 후기", "기프티콘 대신", "Beeminder alternative" 는 **대체재 탐색 의도**라 전환이 가장 높다. 반면 "동기부여 앱" 같은 광역어는 습관앱 대기업과 정면 승부라 초기에는 버린다.

---

## 6. 가격

### 6.1 경쟁사 요금표 요약 (원문 근거)

| 구간 | 사례 |
|---|---|
| 0~5% | Ko-fi 팁 0%, GoFundMe 개인 0%+PG, 트윕 1%, 리틀리 1~5%, 텀블벅 5%+PG3%, BMC 5% |
| 10% 전후 | Patreon 10%+PG(실질 13~16%), **해낼게 현행 10%+부가세** |
| 20~40% | 치지직 20~40%, 유튜브 30%, 투네이션 5.3~35% |

**해낼게 현행 10%는 국내 후원 시장에서 최저가 구간이다.** 투네이션 대비 최대 25%p 유리하고, Patreon 과 동률이다. 이건 지금 어디에서도 말하고 있지 않다.

### 6.2 가격 후보 3안

| 안 | 내용 | 근거 | 리스크 |
|---|---|---|---|
| **A안 (추천). 현행 10% 유지 + "국내 최저 수수료" 명시 노출** | 서비스 이용료 10% + 그 부가세. 환전 화면과 랜딩에 투네이션 5.3~35%·유튜브 30% 대비표를 붙인다 | `docs/plan/bm.md` D-014 확정값을 그대로 쓴다. 가격을 안 바꾸므로 재승인이 필요 없고, 경쟁 우위가 이미 있는데 안 말하고 있는 것만 고친다 | 원천징수 3.3% 의 법적 근거가 D-017 로 미확정. **대비표에 원천징수를 우리 수수료처럼 섞어 쓰면 허위 표시가 된다.** 이용료와 세금을 화면에서 분리해야 한다 |
| **B안. 응원자 부담 전환 (수취인 0%)** | 응원자가 결제 시 수수료를 얹고, 받는 사람은 1클로버=1,000원 전액 수령 | GoFundMe·Zeffy 의 "기부자 팁" 모델. 받는 쪽 만족도가 구조적으로 최고 | 응원자 결제 저항이 커진다. 페르소나 B-1 의 3,000~10,000원 앵커에서 수수료가 눈에 보이면 이탈. **검증 전 채택 금지** |
| **C안. 무료 환전 하한 + 소액 유료** | 예: 총 보유 50클로버 이상 환전은 5%, 미만은 10% | 리틀리의 누적 매출 연동 체감(5%→1%) 벤치마크 | 현재 최소 환전 도달 계정이 0개다(`docs/plan/persona.md`). 차등을 만들 표본이 없다. **시기상조** |

**추천은 A안이다.** 이유는 하나다. 가격을 바꾸는 것은 회장 승인 사항인데(헌법 §4.3 ③), 지금 문제는 가격 수준이 아니라 **이미 이긴 가격을 말하지 않고 있는 것**이다.

---

## 7. 유통 채널

| 채널 | 실제 획득이 일어나는가 | 근거 | 판정 |
|---|---|---|---|
| **인스타그램 공스타그램 (오가닉)** | 공스타그램은 목표 공개·루틴·상호 동기부여가 이미 문화로 존재하고, 해시태그·탐색으로 같은 시험 준비생이 서로를 발견한다. 정보성 게시물이 계정 성장을 만든다 | [TILNOTE 공스타그램](https://tilnote.io/en/pages/697835c0d9c8b2d35783e9b6) | **1순위.** 우리 공급측이 그대로 거기 있다 |
| **인스타그램 콜드 DM** | 도구화된 대량 DM 은 **정책 위반**이며 "한 달 만에 몇천 명 모았다는 후기 다음 달이 계정 사라졌어요 후기로 끝나는 사례가 정말 많다". 합법 경로는 Meta 공식 Messenger API 위의 도구뿐 | [1point.kr](https://1point.kr/blog/insights/insta-dm-automation-4steps-2/), [mirra.my 2026 가이드](https://www.mirra.my/ko/blog/instagram-dm-automation-complete-guide-2026) | **회장 정본과 충돌.** §10 CONFLICTS 참조 |
| **인스타그램 인바운드 DM 자동화** | 게시물·릴스 댓글 키워드 트리거 DM 은 오픈율 85~95%, 클릭률 40~70%. "관심 있으신가요?"보다 "DM에 '가격'이라고 남겨주세요" 처럼 구체 액션이 전환이 높다 | [1point.kr](https://1point.kr/blog/insights/insta-dm-automation-4steps-2/) | **콜드 DM의 합법 대체재. 1순위와 같이 간다** |
| **릴스·숏폼** | 브랜딩은 인스타, 신뢰는 유튜브, 확산은 틱톡. 릴스 도달률이 가장 높고 마이크로·나노 인플루언서 조합이 가성비 우수 | [오픈애즈](https://www.openads.co.kr/content/contentDetail?contsId=19429), [TILNOTE 릴스](https://tilnote.io/en/pages/69ed7a6a2c1001b02aa76baa) | 2순위 |
| **스터디윗미·공부 브이로그 크리에이터 제휴** | 틱톡에 "스터디윗미 찍는 법" 이 독립 검색 주제로 존재할 만큼 포맷이 정착 | [TikTok Discover](https://www.tiktok.com/discover/스터디윗미-찍는-법) | **양면시장 해법 후보.** 크리에이터 1인이 공급(선언자) + 수요(팔로워 응원자)를 동시에 데려온다 |
| 캠스터디 커뮤니티 (구루미·스터디라이브) | 공급측 밀집 | [studylive.co.kr](https://studylive.co.kr/) | 후보 |
| 네이버 카페 (공시생·편입) | 대부분 회원 전용이라 색인 밖. 침투는 수동 | 검색으로 접근 실패 | (미검증) |
| Product Hunt | 국내 10~20대 타깃과 오디언스 불일치 | - | 비추천 |

---

## 8. 고객 인터뷰 질문 20개 (Mom Test)

원칙: 과거의 구체 행동만 묻는다. 미래 의향·가정·제품 설명 금지. 근거: [Mom Test 프레임워크](https://blog.uxtweak.com/the-mom-test/), [60 discovery questions](https://getperspective.ai/blog/60-customer-discovery-questions-for-2026-mom-test-approved)

**A. 목표 선언자(공급)에게**
1. 지금 준비하고 있는 게 뭔지, 언제 시작했는지 말해주세요.
2. 그걸 마지막으로 다른 사람에게 공개한 게 언제였고, 어디에 올렸나요?
3. 그 게시물에 뭐가 달렸나요. 그걸 보고 그 다음에 뭘 했나요?
4. 가장 힘들었던 주가 언제였고, 그 주에 실제로 뭘 했나요?
5. 그때 누가 뭘 해줬나요. 아무도 안 했으면 그것도 그대로 말해주세요.
6. 누군가에게 실제로 뭘 받아본 적 있나요. 뭘, 누구한테, 언제?
7. 받고 나서 답장을 했나요. 뭐라고 썼는지 기억나나요?
8. 받고 나서 며칠 뒤에 그 사람한테 뭘 했나요?
9. 공부·운동 기록을 남기려고 지금 쓰는 앱이 뭔가요. 마지막으로 연 게 언제인가요?
10. 그 앱을 안 열게 된 주가 있었나요. 그 주에 무슨 일이 있었나요?
11. 지금까지 이 목표에 쓴 돈이 얼마쯤인가요. 어디에 썼나요?
12. 그 돈을 어떻게 마련했나요?

**B. 응원자(수요)에게**
13. 최근 1년 안에 친구의 노력을 보고 뭔가 해주고 싶었던 순간이 있었나요. 언제였나요?
14. 그때 실제로 뭘 했나요. 아무것도 안 했다면 왜 멈췄나요?
15. 마지막으로 지인에게 기프티콘이나 돈을 보낸 게 언제였고, 얼마였나요?
16. 그걸 보내기 전에 망설였나요. 뭐가 걸렸나요?
17. 보낸 뒤에 상대 반응이 어땠나요. 그 뒤로 또 보냈나요, 안 보냈나요?
18. 보내고 나서 후회한 적 있나요. 어떤 경우였나요?
19. 최근에 인스타에서 친구 게시물을 보고 댓글을 단 게 언제인가요. 뭐라고 썼나요?
20. 지난달 카드값에서 "이건 안 아까웠다" 싶은 3천~1만원짜리 결제가 뭐였나요?

---

## 9. 랜딩 카피 (커뮤니티 원문의 언어를 그대로 씀)

원문 근거: 블라인드 "받고 싶지도 않은 선물 오는 거 부담스럽고", "선물받는 입장에서 브랜드 선택 X", "주문시 배달비 전부를 선물 받은 사람이 부담" / 페르소나의 "말뿐인 화이팅" / Forfeit 랜딩의 단문 명령형 구조.

### 히어로 3안
- **H1 (부담 제거 축, 추천)** — "화이팅 말고, 진짜로."
  서브: 친구가 선언한 목표에 조용히 돈을 두고 갑니다. 답장 안 해도 됩니다.
- **H2 (기프티콘 대체 축)** — "기프티콘은 부담스럽고, 댓글은 3초면 사라집니다."
  서브: 브랜드 고를 필요도, 배달비 낼 사람도 없습니다. 친구에게 그대로 쌓입니다.
- **H3 (선언자 축)** — "나 이거 해낼게."
  서브: 그 한 줄에, 친구들이 조용히 돈을 얹습니다. 30클로버부터 현금으로 바꿉니다.

### 서브카피 3안
- "하트 40개보다, 3,000원이 오래 남습니다."
- "응원은 돈으로 하는 겁니다. 대신, 티 안 나게."
- "받는 사람은 답장할 의무가 없고, 보내는 사람은 생색낼 필요가 없습니다."

### CTA 3안
- "조용히 응원하기" (응원자 면)
- "내 목표 선언하기" (선언자 면)
- "친구 목표 링크 받기" (양면 전환용)

### FAQ 3안 (각 1문 1답)
- **Q. 목표를 못 이루면 돈은 어떻게 되나요?**  A. 그대로 친구 것입니다. 해낼게는 달성 여부로 돈을 뺏거나 주는 서비스가 아닙니다. 결제 즉시 친구에게 적립됩니다.
- **Q. 얼마를 보냈는지 다른 사람이 보나요?**  A. 못 봅니다. 개별 금액은 설정으로도 공개할 수 없게 시스템이 잠가 뒀습니다. 원하면 이름도 숨길 수 있습니다.
- **Q. 수수료가 얼마인가요?**  A. 환전할 때 서비스 이용료 10%와 그 부가세를 뗍니다. 유튜브 슈퍼챗은 30%, 투네이션은 방식에 따라 최대 35%입니다.

### 반론처리 3안
- **"내기·도박 아닌가요?"** → 본인이 자기 돈을 걸고 실패하면 잃는 구조가 아닙니다. 친구가 보내는 것이고, 조건이 없습니다. StickK·Beeminder·챌린저스와는 돈이 흐르는 방향이 반대입니다.
- **"구걸처럼 보일까 봐요."** → 목표 문서를 나만 보기로 두고 시작할 수 있습니다. 금액은 아무에게도 안 보이고, 응원자 이름과 메시지도 항목별로 잠급니다.
- **"친구한테 부담 주는 거 아닌가요?"** → 상대가 링크를 열었을 때 아무것도 요구하지 않습니다. 보내는 사람도 익명을 고를 수 있고, 받는 사람도 답장 의무가 없습니다. 블라인드에 올라온 "받고 싶지도 않은 선물 오는 거 부담스럽고" 같은 상황이 안 생기게 설계했습니다.

---

## 10. 수익모델 후보

| # | 모델 | 실제 사례와 단가 | One Thing 충돌 여부 |
|---|---|---|---|
| 1 | **환전 이용료 (현행)** | Patreon 10%, 텀블벅 5%+PG3%, 투네이션 5.3~35% | **충돌 없음.** 돈이 실제로 옮겨질 때만 과금하므로 "조용히 응원" 을 방해하지 않는다 |
| 2 | **응원자 부담 팁** | GoFundMe 기부자 선택 팁, Zeffy 0%+팁 | 부분 충돌. 결제 화면에 선택지가 하나 더 생겨 "1~2탭" 마찰 기준(페르소나 B-1)을 깬다 |
| 3 | **선언자 구독** (통계·공유 이미지·다중 목표 슬롯) | Habitica $4.99/월, Finch $39.99/년, Streaks $5.99 일회, Habitify $4.99/월 | 충돌. 받는 쪽에게 돈을 받으면 "응원받는 곳"이 "돈 내는 곳"이 된다. 페르소나 A-1 은 월 40만원 소득이다 |
| 4 | **기업·기관 스폰서 응원** | (unknown 단가) | 충돌 위험 + **Everest 반례**. 스폰서십은 사이클이 길고 매출이 불안정해 Everest 실패 요인 중 하나였다. `docs/plan/bm.md` 도 후행 후보로 뒀다 |
| 5 | **커밋먼트 전환 (조건부 pledge)** | StickK 무료+실패과금, Beeminder $5~$2430 사다리, Forfeit 누적 $8.7M | **정면 충돌.** One Thing 함정 4번이 이미 reject 했고, Pact 의 FTC 제소·$948,788 환급 명령이 실증 반례다 |
| 6 | **크리에이터 제휴 수수료** (공부 유튜버·공스타 계정의 팔로워 응원 중개) | 리틀리 5%→1% 체감, 투네이션 정산 최소 40,000캐시 | 충돌 없음, **가장 유망한 확장.** 다만 "지인×지인" 에서 "팬×스타" 로 미끄러지면 One Thing 함정 1번(투네이션 클론)이 된다. 경계선은 "선언자가 아는 사람인가" |

**추천 순서: 1 유지 → 6 실험 → 2 검증 후 판단. 3·4·5 는 지금 하지 않는다.**

---

## 11. 시사점 (무엇을 차용하고 무엇을 바꾸나)

### 차용할 것
1. **Forfeit 의 랜딩 문법.** "Complete your habits, or lose money" 처럼 한 문장에 기전 전체가 들어간다. 우리 슬로건 "응원은 돈으로 하는 겁니다"는 톤은 있는데 **기전이 없다.** H1~H3 안이 그 보정이다.
2. **Forfeit·Beeminder 의 누적 수치 노출.** $8.7M 스테이킹, 94.2% 성공률처럼 숫자가 신뢰를 만든다. 단 D-009 의 안전선(금액 일절 노출 금지)에 걸리므로 우리가 쓸 수 있는 숫자는 **인원·목표 수·응원 건수**뿐이다.
3. **리틀리의 체감 수수료(5%→1%)와 최소금액 없는 주간 자동정산.** 우리 30클로버 하한과 수동 정산은 이 기준에서 마찰이 크다. 하한 자체보다 **"왜 30인가"를 화면에서 설명**하는 것이 급하다(30 대 27 문의가 페르소나 검증 항목으로 이미 있다).
4. **인바운드 DM 자동화(댓글 키워드 → DM).** 오픈율 85~95%가 실측된 합법 경로다.

### 바꿀 것
1. **"돈 걸고 목표"라는 언어를 랜딩에서 쓰지 않는다.** 시장의 그 자리는 챌린저스·StickK·Forfeit 이 점령했고, 우리가 그 언어를 쓰면 즉시 "본인이 돈 잃는 앱"으로 오독된다. 대신 **"기프티콘 대신"** 자리를 잡는다. 이 자리는 비어 있고, 블라인드 원문이 수요를 증명한다.
2. **10% 수수료를 숨기지 말고 무기로 쓴다.** 국내 후원 시장 최저 구간인데 아무 데서도 말하지 않고 있다.
3. **달성 인증을 안 받는 것을 약점이 아니라 강점으로 판다.** 열품타의 만성 문제가 공부시간 조작이고, Pact 는 인증 분쟁으로 FTC 에 걸렸다. 우리는 판정하지 않으므로 그 분쟁이 구조적으로 없다.

### 회장 정본과 충돌하는 것 (§4.1 줏대 적용, 굽히지 않고 근거로 반박)
- **BRAIN `idea-DM-아웃바운드-마케팅.md` 의 "하루 500 DM 콜드 아웃바운드, 해낼게부터 착수"는 2026-09-05 기준 실행 불가에 가깝다.** 그 문서 스스로 Open Q 에 "스팸 밴 리스크"를 적어 뒀고, 이번 조사에서 그것이 리스크가 아니라 **현재 정책 위반이고 계정 소멸이 흔한 결과**임이 확인됐다. 근거: [1point.kr](https://1point.kr/blog/insights/insta-dm-automation-4steps-2/), [mirra.my](https://www.mirra.my/ko/blog/instagram-dm-automation-complete-guide-2026). 대체안은 같은 채널의 **인바운드 트리거 DM**이고 실측 오픈율이 85~95%다. 이건 아이데이션 제안이지 정본 수정이 아니다(헌법 §4.5).

---

## KNOWLEDGE_QUERY
- BRAIN: `wiki/business/마케팅/idea-DM-아웃바운드-마케팅.md`(지시), `wiki/business/마케팅/synthesis-유저심리-6단계-정본.md`(지시). `wiki/business/index.md` 는 브리프가 지정했으나 **전량 스캔 금지 규칙에 따라 지명된 두 페이지로 바로 좁혔다.**
- repo: one-thing, persona, prd v0.4.0, discovery/README, 거버넌스/결정.md, 그리고 스스로 추가한 bm.md
- 웹: 경쟁사 수수료(투네이션·치지직·유튜브·리틀리·Patreon·Ko-fi·BMC·GoFundMe·텀블벅), 커밋먼트 앱(StickK·Beeminder·Forfeit·Pledgd·TaskRatchet), 국내 습관·공부앱(챌린저스·열품타·마이루틴·루티너리·캠스터디), 실패 사례(Everest·Pact/GymPact·Twip), 커뮤니티(블라인드 기프티콘 2건), 채널(공스타그램·릴스·인스타 DM 정책), Mom Test

## HITS_USED
- `one-thing.md` — 브리프의 "보증금 기반 습관 달성" 추정을 **기각**하는 근거. 함정 4번이 StickK 형을 명시 reject 했다. 이 문서 전체의 경쟁 범위가 여기서 결정됐다.
- `bm.md` — 가격 3안의 근거. 현행 10%+부가세, 30/27 경계, BM 종료 기준.
- `결정.md` D-009 — 랜딩·콘텐츠에서 금액 노출 금지 안전선. 사회적 증거 수치 설계를 인원 기준으로 제한했다.
- `결정.md` D-016·D-017 — 토스 지급대행 해지, 원천징수 3.3% 법적 근거 미확정. 가격 대비표에서 세금과 이용료를 분리해야 하는 이유.
- `persona.md` — 3,000~10,000원 앵커와 "1~2탭 마찰" 기준. 수익모델 2안·3안 판정 근거.
- BRAIN DM 아이디어 — 유통 채널 절의 출발점이자 CONFLICTS 대상.

## HITS_REJECTED
- BRAIN `synthesis-유저심리-6단계-정본.md` 의 단계별 전술 카탈로그 — 이번 산출물은 조사이지 캠페인 설계가 아니라 랜딩 카피 3안에 "관심" 단계 후광·호기심 갭만 얕게 반영하고 나머지 5단계는 안 썼다. 그로스 레인에서 쓸 것.
- 습관앱 상세 기능 비교(2sync·mainquest 등) — 이름·가격만 취하고 기능 비교는 버렸다. 해낼게는 습관 추적으로 경쟁하지 않는다.
- Product Hunt 런치 가이드류 — 타깃 오디언스 불일치.

## CONFLICTS
1. **콜드 DM (BRAIN 정본 vs 웹 벤치마크).** 위 §11 참조. 정본은 하루 500 DM 을 성장 엔진으로 봤고, 2026 현재 웹 근거는 정책 위반·계정 소멸로 본다. **회장 판단 필요 사항은 아니다. 같은 채널의 합법 대체재가 있으므로 그로스 레인에서 대체안으로 집행하면 된다.**
2. **브리프의 제품 추정 vs repo 정본.** 브리프는 "금전 보증금 기반 습관/목표 달성 구조"로 추정했으나 정본은 그 반대다. **정본을 따랐다.**
3. **Finch·Forfeit·Habitify 가격이 출처마다 다르다.** 2차 자료 간 상충이라 양쪽을 병기했다. 공식 페이지 실측이 필요하다. **미검증.**
4. **브리프 목표(경쟁사 100개, 검색 40회 이상) 미달.** 이 세션의 WebSearch 예산이 200/200 소진돼 24회에서 멈췄고 경쟁사는 55개 열거·26개 검증에 그쳤다. 예산이 복구되면 남은 45개와 SEO 실측 검색량을 채워 v1.1.0 으로 올린다.

## SOURCES
- https://apps.apple.com/kr/app/id1438855824 (챌린저스)
- https://play.google.com/store/apps/details?id=kr.co.whitecube.chlngers
- https://biz-challengers.com/terms
- https://namu.wiki/w/%EC%B1%8C%EB%A6%B0%EC%A0%80%EC%8A%A4
- https://namu.wiki/w/%EC%97%B4%EC%A0%95%20%ED%92%88%EC%9D%80%20%ED%83%80%EC%9D%B4%EB%A8%B8
- https://namu.wiki/w/Toonation
- https://apps.apple.com/kr/app/%EC%97%B4%ED%92%88%ED%83%80/id1441909643
- https://help.toon.at/hc/ko/articles/115001374413
- https://help.toon.at/hc/ko/articles/115001502234
- https://support.twip.kr/hc/ko/articles/115000478027
- https://support.twip.kr/hc/ko/articles/115000478047
- https://start.litt.ly/blog/creator-sponsorship-fee-comparison-guide
- https://help.tumblbug.com/hc/ko/articles/115006479268
- https://www.tech42.co.kr/와디즈-후원팬덤-펀딩-문턱-낮춘다수수료-최대-90/
- https://support.patreon.com/hc/en-us/articles/22581195376909-Creator-fees-FAQ
- https://cartmango.com/patreon-fees/
- https://www.schoolmaker.com/blog/buy-me-a-coffee-pricing
- https://talks.co/p/kofi-vs-buy-me-a-coffee/
- https://www.zeffy.com/blog/gofundme-reviews
- https://www.stickk.com/faq/financial/Commitment+Contracts
- https://stickk.zendesk.com/hc/en-us/articles/206833157-How-it-Works
- https://www.beeminder.com/faq
- https://www.forfeit.app/
- https://www.pledgd.com/blog/best-commitment-contract-apps
- https://2sync.com/blog/best-habit-tracker-apps
- https://www.mainquest.net/habitica-pricing
- https://habi.app/insights/finch-alternatives/
- https://habi.app/insights/accountability-apps/
- https://habithuddle.com/blog/accountability-app-with-friends
- https://bossasaservice.com/blog/group-accountability-app/
- https://www.goalswon.com/blog/23-apps-that-will-keep-you-accountable-and-motivated-to-achieve-all-your-personal-goals/
- https://www.daily-pact.com/compare/best-accountability-apps
- https://alternativeto.net/software/beeminder/?p=5
- https://alternativeto.net/software/stickk
- https://techcrunch.com/2014/12/18/everest-the-peter-thiel-backed-app-for-achieving-your-dreams-shuts-down
- https://www.alexanderjarvis.com/everest-failed-startup-postmortem-learnings/
- https://www.mobihealthnews.com/news/khosla-backed-fitness-startup-pact-shuts-down
- https://gizmodo.com/app-that-paid-users-to-exercise-owes-nearly-1-million-1818632078
- https://www.ftc.gov/node/45481
- https://www.tcf.team/blog/biggest-crowdfunding-failures
- https://www.teamblind.com/kr/post/카카오톡-선물-거부-못하나요-EpUjMLy3
- https://www.teamblind.com/kr/post/카카오톡-기프티콘은-좋은-점을-못느끼겠네-Cj2vRfKq
- https://ccs.kakao.com/help?service=66&use=bridge
- https://tilnote.io/en/pages/697835c0d9c8b2d35783e9b6
- https://tilnote.io/en/pages/69ed7a6a2c1001b02aa76baa
- https://1point.kr/blog/insights/insta-dm-automation-4steps-2/
- https://1point.kr/blog/insights/instagram-marketing/
- https://www.mirra.my/ko/blog/instagram-dm-automation-complete-guide-2026
- https://www.openads.co.kr/content/contentDetail?contsId=19429
- https://www.tiktok.com/discover/%EC%8A%A4%ED%84%B0%EB%94%94%EC%9C%97%EB%AF%B8-%EC%B0%8D%EB%8A%94-%EB%B2%95
- https://gooroomee.com/camstudy/room
- https://studylive.co.kr/
- https://apps.apple.com/kr/app/id1126701514
- https://apps.apple.com/kr/app/id6445960594
- https://play.google.com/store/apps/details?id=com.studylog.app
- https://apps.apple.com/app/id1542510906
- https://apps.apple.com/kr/app/id1518956326
- https://thevc.kr/minding
- https://platum.kr/archives/170875
- https://www.khan.co.kr/article/202108241445018
- https://blog.uxtweak.com/the-mom-test/
- https://getperspective.ai/blog/60-customer-discovery-questions-for-2026-mom-test-approved
- https://www.verifiedmarketreports.com/product/personal-goal-setting-app-market/
- https://www.fortunebusinessinsights.com/productivity-apps-market-110254
- https://keywordsearch.pluszero.co.kr/naver
- https://loword.co.kr/

## MODEL
claude-opus-5[1m] · burst goal 3 사업조사 서브에이전트 · 2026-09-05 KST
증거 등급: 경쟁사 수수료·실패 사례·커뮤니티 원문 = 근거 확인(URL 직접 조회). SEO 검색량·경쟁사 규모 대부분 = 미검증. 랜딩 카피·가격 3안·인터뷰 질문 = 조사 기반 설계이며 실사용 검증 전.
