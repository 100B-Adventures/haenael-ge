---
title: 해낼게 — 디자인 벤치마크 뱅크 (정본 v1.0)
type: reference
owner: "@sj"
policy: living
updated: '2026-08-28'
author: Codex
change: A안 구조로 이동하고 상대 링크를 갱신. 기존 본문 보존
source:
- A안 구조 이전 본문
- 상세 출처는 본문 SOURCES/MODEL 참조
visibility: private
---

# 해낼게 — 디자인 벤치마크 뱅크 (정본 v1.0)

> 작성: 2026-07-12, product-designer (위임, 실행 모드 — 회장 승인 "어떤 모델을 쓰든 잘나가는 서비스와 유사한 출력물을 낼 수 있게 세팅").
> **목적**: Fable·Opus·GPT — 어떤 모델이 와도 **같은 눈높이로 벤치마킹하고 같은 룩**을 내게 하는 레퍼런스 정본. "그때그때 검색"의 복불복을 끝내고 **"무엇을 왜 베낄지"를 문서로 고정**한다.
> **지위**: 해낼게 디자인/에셋 벤치마크는 **이 파일에서 시작**한다(전역 `~/.claude/standards/benchmarks.md` §디자인의 해낼게 전용판). 단 **최신성 검증 WebSearch ≥1회는 여전히 의무** — 이 파일은 "어디를 무엇 때문에 볼지"의 큐레이션이지 검색의 대체가 아니다.
> 상위 정본: [DESIGN.md](../../DESIGN.md)(토큰·금지패턴 — 충돌 시 DESIGN.md가 이김) · [brand-marketing-strategy.md](../1-team-brand/brand-marketing-strategy.md) §1~2(브랜드 코어) · [visual-guidelines.md](../1-team-brand/visual-guidelines.md)(에셋 파이프라인) · [decisions.md](../3-operations/decisions.md) D-003~D-008 · [ops/agent-runbook.md](../3-operations/agent-runbook.md) §⑦(모델 교대).
> 공통 금지: 타사 브랜드 자산(로고·고유 일러스트·카피 문구 verbatim) 전재. 훔치는 건 **구조·원리·순서**다 — 스틸의 기준 = "우리 철학(조용한·따뜻한·믿음직한)으로 변형됐는가".

---

## 0. 30초 사용법 (새 모델 첫 진입 시)

1. 만들 것의 **화면/에셋 유형**을 §2 매핑 표에서 찾는다 → 지정 레퍼런스 행(§1)을 읽는다.
2. 그 레퍼런스의 **"베낄 것"만** 가져오고 **"베끼면 안 되는 것"은 절대 반입 금지**.
3. WebSearch ≥1회로 그 레퍼런스의 **현재 모습**을 재검증한다(§2-2 — 관측일이 오래됐으면 특히).
4. 산출 전 §3 일관성 체크리스트 5항목 대조 + design-review **등급 B 이상** 출력.
5. 새로 조사한 레퍼런스는 §1 표 밑에 **append**(삭제·교체는 §4 절차).

---

## 1. 레퍼런스 서비스 지정표 (핵심 — 2026-07-12 실조사)

> 각 행 = ①서비스 ②베낄 화면/문법 ③왜 우리와 정합인가(브랜드 코어 근거) ④베끼면 안 되는 것 ⑤출처.
> 브랜드 코어 3형용사 약칭: **[조]**용한 Discreet · **[따]**뜻한 Warm · **[믿]**음직한 Trustworthy (DESIGN.md §1).

### R1. 토스 / 토스페이먼츠 — 결제 문법·마이크로카피의 국내 표준

- **베낄 것**: ⓐ 결제위젯 시트 순서 = 큰 금액 확인 → 결제수단 → 하단 고정 CTA(우리 PaymentSheet의 골격, DESIGN.md §2-4 기승인). ⓑ 완료 화면의 **"~에게 ~을 보냈어요" 사람 주어 문장** — 거래 명세가 아니라 관계의 문장으로 끝맺는 문법(우리 ConfirmToast "도경이에게 조용히 닿았어요"의 원형). ⓒ 8원칙 UX 라이팅: 해요체 일관·능동형·부정형 회피(우리 "대화 층=따뜻" D-002와 1:1 정합). ⓓ 한 화면 한 결정(정보 위계 — 큰 타이틀 + primary 액션 1개).
- **왜 정합**: 돈이 오가는 순간의 공포를 "명료함"으로 이기는 설계 = **[믿]**. 완료 문구의 감정 연결("축하해요" 푸시) = **[따]**.
- **베끼면 안 되는 것**: 금융 대시보드 밀도·그래프·자산 요약 UI(우리는 프로필형, 대시보드 아님 — DESIGN.md §0). 토스 특유의 파랑 계열·토스체. **금액을 크게 보여주는 문법은 결제 시트 안에서만** — 친구/공개 화면 금액 노출은 우리 절대 금지(§3-①).
- **출처**: [토스 UX Writing 분석(brunch)](https://brunch.co.kr/@kellypoly/62) · [토스페이먼츠 결제 UX 스터디](https://dbreblog.com/43) · [toss.tech 가입 UX](https://toss.tech/article/toss-signup-process) · docs.tosspayments.com(DESIGN.md §2-4 직접조사분). 관측 2026-07-12.

### R2. Buy Me a Coffee — "후원 결제 순간"의 세계 표준

- **베낄 것**: ⓐ **금액 = 커피 개수 칩 앵커**(1/3/5잔) — 돈을 물건 단위로 번역해 부담을 죽이는 문법(우리 AmountChips·클로버 개수의 원형). ⓑ "Say something nice…" **선택식 한 줄 메시지** — 무부담 placeholder(우리 MessageField). ⓒ **no-login 원타임 결제**(우리 게스트 결제 확정, DESIGN.md §7-4). ⓓ 결제 직후 **개인화된 감사 페이지**(크리에이터의 말이 담긴 완료 화면 — 우리 결제 완료 화면에서 "주인공의 목표 문장"을 되비추는 문법으로 변형). ⓔ supporter wall(이름+메시지 축적) → 우리 **워드맵**의 원형.
- **왜 정합**: "커피 한 잔 값" 어휘 자체가 우리 어휘표(§2-5) 채택어. 후원이 아니라 소액 응원 프레임 = **[따]**+**[조]**.
- **베끼면 안 되는 것**: **"bought 25 coffees" 개수 노출·gold/silver/bronze 랭킹 리더보드**(2026 현재도 공식 기능 — 우리 금지패턴 §5-2 정면 위반). 크리에이터 하트 답장 유도(강제 호혜 씨앗, §5-3). 노랑 브랜드 컬러.
- **출처**: [BMC 공식](https://buymeacoffee.com/) · [Different ways to support](https://help.buymeacoffee.com/en/articles/7983531-different-ways-to-support-a-creator) · [supporter wall/leaderboard 위젯 관측](https://www.poper.ai/widgets/buy-me-a-coffee-feed/). 관측 2026-07-12.

### R3. Ko-fi — 무마찰 팁 진입의 교본

- **베낄 것**: ⓐ **계정 없이 팁 1회 완결**(방문→클릭→송금, 우리 친구 플로우의 마찰 하한선 기준). ⓑ **CTA 문구 커스텀 문법**(Support/Tip/Donate 선택) — CTA는 브랜드 어휘로 쓴다는 원리(우리 "밀어줄게"). ⓒ tip panel **상시 노출**(숨기지 않는 진입 — 우리 목표 페이지 하단 고정 CTA).
- **왜 정합**: "0% 수수료" 투명성 서사 = **[믿]**(우리 수수료 서사 선제 공개, 전략 §6-S1과 정합). 마찰 최소 = 결제간편 퍼널 마지막 단.
- **베끼면 안 되는 것**: 위젯 잡화점식 다기능(멤버십·커미션·샵 — 우리는 단일 CTA). 떠다니는 floating button(우리 아키타입은 페이지 자체가 목적지).
- **출처**: [Ko-fi 공식](https://ko-fi.com/) · [tip widget 문서](https://help.ko-fi.com/hc/en-us/articles/360018381678-Ko-fi-tip-widget). 관측 2026-07-12.

### R4. 카카오톡 선물하기 — 한국식 "마음 전달"의 문법 + 반면교사

- **베낄 것**: ⓐ **메시지카드 문법** — 선물에 동봉되는 감정표현+40자 메시지, 받는 사람이 카드를 캡처해 자랑하고 싶어지는 설계(우리 워드맵 단어·공유 카드가 노리는 정서). ⓑ "지금, 내 마음을 전하는 가장 쉬운 방법" — **마음이 주어, 상품이 부속**인 카피 구조.
- **왜 정합**: 한국 유저의 "돈으로 마음 전하기" 심상 모델 그 자체 — 우리 P3 필러("기프티콘은 답장을 요구한다. 클로버는 아무것도 요구하지 않는다")가 **이 서비스를 반례로 지목**한다.
- **베끼면 안 되는 것 (핵심 반면교사)**: **답례 의무 루프** — 받으면 갚아야 하는 부담이 공식 지적됨("기계적으로 주고받아 비용 부담") = 우리가 죽이려는 그 부담. 금액이 사실상 노출되는 구조(상품가 = 마음의 가격표) — 우리 금액 비노출 원칙의 존재 이유. 명절 프로모션식 시끄러운 커머스 UI.
- **출처**: [받는 경험에서 시작하는 선물하기 분석(brunch)](https://brunch.co.kr/@bydot/6) · [카카오 공식 서비스 소개](https://www.kakaocorp.com/page/service/service/KakaoTalkGift) · [급성장 4개의 변화(바이라인)](https://byline.network/2020/11/25-111/) · [부담 지적 기사(한국경제)](https://www.hankyung.com/article/202409111289g). 관측 2026-07-12.

### R5. 당근 — "따뜻함"을 장식이 아니라 시스템으로 만든 교본

- **베낄 것**: ⓐ **매너온도의 원리** — 따뜻함을 이모지·일러스트가 아니라 **은유 하나(36.5℃)를 시스템 언어로** 만든 것. 우리의 등가물 = 클로버(개수·워드맵) — 장식 클로버 남발이 아니라 단위·언어로 쓴다. ⓑ 동네·이웃·사람 이름이 UI의 주어가 되는 문법(우리 "도경이에게"). ⓒ 디자인 토큰 기반 일관성 운영(시안 1벌 → 전 플랫폼).
- **왜 정합**: 낯선 사람 간 거래에 온기를 입힌 유일한 국내 대형 사례 = **[따]**+**[믿]** 동시 달성의 증거.
- **베끼면 안 되는 것**: **온도·점수·등급 그 자체** — 당근조차 글로벌에서 "따뜻한 사람"을 "믿을 수 있는 사람"으로 바꾸고 매너온도를 Karrot Score로 대체했다(평가 지표는 문화 의존적·비교/랭킹 압박 생성 — 우리 금지패턴 §5-2). 피드·동네생활 커뮤니티 구조(우리는 커뮤니티 아님, §0).
- **출처**: [당근이 매너온도를 포기한 이유](https://redbusbagman.com/karrotuxresearch/) · [당근 프로덕트 디자이너 소개(공식 블로그)](https://about.daangn.com/blog/archive/%EB%8B%B9%EA%B7%BC%EB%A7%88%EC%BC%93-%ED%94%84%EB%A1%9C%EB%8D%95%ED%8A%B8-%EB%94%94%EC%9E%90%EC%9D%B4%EB%84%88-%EC%B1%84%EC%9A%A9-%EB%8B%B9%ED%94%84%EC%86%8C/). 관측 2026-07-12.

### R6. Linear — 절제·단일 액센트·데스크톱 위계의 정점

- **베낄 것**: ⓐ **단일 크로마 액센트 원칙** — #5e6ad2 하나를 브랜드마크·포커스링·섹션당 CTA 1개에만 희소 배치(우리 클로버 그린 "채움 전용" 규칙의 상위 논리 — 두 번째 유채색 없음). ⓑ 타이트한 letter-spacing 큰 타이틀 + 헤어라인 보더로 만드는 위계(그림자 없이 — 우리 §3.5 "1px 보더만"과 동일 사상). ⓒ **데스크톱(≥1024px) 정보 배치** — 폭을 멀티컬럼·사이드 레일로 쓰는 법(반응형 의무의 참조점).
- **왜 정합**: "요소를 빼서 또렷하게" = **[조]**의 시각 문법. 절제가 격을 만든다는 증거.
- **베끼면 안 되는 것**: 다크 UI 기본(우리는 warm paper 라이트). 보라 그라데이션·글로우(AI 슬롭 1호 — DESIGN.md §5-5 금지). 400~510 저 weight 본문(영문 전제 — 한글 Pretendard는 우리 스케일 §3.2가 이김).
- **출처**: [Linear 디자인 시스템 분석(getdesign.md)](https://getdesign.md/linear.app/design-md) · [Linear design 트렌드 분석(LogRocket)](https://blog.logrocket.com/ux-design/linear-design/). 관측 2026-07-12.

### R7. Linktree — 링크-인-바이오 아키타입의 원형

- **베낄 것**: ⓐ 단일 컬럼·아바타 중심·중앙 정렬 프로필(우리 아키타입 그 자체, DESIGN.md §2-1 기승인). ⓑ 2026 베스트 프랙티스: **명확한 헤드라인 + 목적 1개 + primary CTA 1개**, "링크 서랍장화 금지" — 우리 목표 페이지의 "다음 행동 1개" 규칙과 동일. ⓒ 인스타 유입 전제 모바일 퍼스트·즉시 로딩.
- **왜 정합**: 인스타 바이오 링크로 열리는 프로필형 = 우리 유통 구조와 물리적으로 동일. 친구가 3초 안에 "누구·무슨 목표·내가 할 일"을 읽어야 함.
- **베끼면 안 되는 것**: 링크 카드 나열·Bento 그리드(우리는 단일 CTA). 테마 마켓식 현란한 배경(브랜드 없는 템플릿 룩 = 슬롭).
- **출처**: [Linktree 공식](https://linktr.ee/) · [Link in Bio 2026 베스트 프랙티스](https://trustypost.ai/blog/link-in-bio-2026-what-id-use-what-to-avoid-and-a-simple-setup-checklist/) · [own.page 2026 비교](https://own.page/blog/best-link-in-bio). 관측 2026-07-12.

### R8. 공스타그램 문화 (상위 계정 문법) — 피드·에셋의 토착 문법

- **베낄 것**: ⓐ **"오늘의 3줄" 포맷**(오늘 한 것/막힌 것/내일 할 것) — 선언·진행 업데이트의 구조 원형(우리 ProgressUpdate·S2 선언 로그). ⓑ **책상 한 컷** 사진 문법 — 얼굴 없이 손·소품·빛으로 말하는 프레임(visual-guidelines 힉스필드 프리셋의 [HUMAN ELEMENT]=손/실루엣 규정과 정합). ⓒ 플래너 인증 = "내가 나와 약속했다"는 감각 — 커밋먼트 심리의 토착 구현. ⓓ 따라 할 수 있는 자료형 게시물이 저장·성장을 부른다(선언 카드 템플릿 배포 전략의 근거).
- **왜 정합**: GTM 1차 채널이 공스타 자가확산(전략 §4) — 우리 에셋은 이 피드 안에서 이물감 없이 섞여야 한다. 선언·기록의 떳떳함 = D-003 "선언과 인원수는 보이게".
- **베끼면 안 되는 것**: 스탬프·꾸미기 과다(다꾸화 — 미온 원칙 위반). 팔로워 품앗이·맞팔 문법. 타 계정 사진 전재(우리는 자체 포토뱅크 8장, visual-guidelines §1-1).
- **출처**: [공부 인증(나무위키)](https://namu.wiki/w/%EA%B3%B5%EB%B6%80%20%EC%9D%B8%EC%A6%9D) · [공스타그램 운영법(TILNOTE)](https://tilnote.io/en/pages/697835c0d9c8b2d35783e9b6) · [공스타그램 관찰기(brunch)](https://brunch.co.kr/@jdentistry/3). 관측 2026-07-12.

### R9. 챌린저스 — ⚠️ 인접 최대 사례이자 **주(主) 반면교사**

- **베낄 것 (제한적)**: ⓐ "돈 × 목표"가 한국에서 대중 서비스로 성립함의 증거(카테고리 실재 증명 — 화면 차용 아님). ⓑ 즉각 보상 피드백(인증 즉시 반응)의 원리만 — 우리는 응원 도착 알림의 "은은한 즉시성"으로 변형.
- **왜 정합**: 페르소나(목표 선언 유저)가 겹치는 최인접 서비스 — 유저가 우리를 이것과 비교하며 온다. **차이를 아는 것이 곧 우리 룩의 정의**.
- **베끼면 안 되는 것 (사실상 전부)**: **내기·벌금·상금·환급 프레임 전체**(우리 어휘표 전면 금지어 — "친구의 선물, 잃는 사람 없음"이 우리 카테고리 정의). 85% 달성률·성공률 게이지(성과 압박 UI). 매일 인증 강제 habit-tracker 숙제 UI(DESIGN.md §5-9 — 받는 사람 부담 = 공급 마름). 시간 스탬프 카메라 인증 강제.
- **출처**: [챌린저스(나무위키)](https://namu.wiki/w/%EC%B1%8C%EB%A6%B0%EC%A0%80%EC%8A%A4) · [챌린저스 분석(brunch)](https://brunch.co.kr/@bydot/9) · [위클리 UX/UI 분석](https://weeklyuxuichallenge.oopy.io/9dd49847-6693-4d0c-b96d-bf787144290d). 관측 2026-07-12.

> **보조 레퍼런스(기존 정본 승계, 재조사 불요)**: 투네이션(후원 메시지·익명 옵션·비로그인 열람 — DESIGN.md §2-5) · 뱅크샐러드(신뢰 지점의 의도된 마찰 — 환전/KYC 화면용, `benchmarks.md` §디자인) · Stripe(점진 공개 — 약관·수수료 고지용, 같은 곳).

### R10. 런치 피드 그리드 (인스타 9칸 콜드스타트) — 2026-07-21 실조사, WebSearch 3회+WebFetch 1회

- **베낄 것**: ⓐ **Reorder Grid로 상단고정 운영이 인스타 공식 기능화**됨(long-press로 순서 변경, 고정 게시물은 그리드 최상단 고정) — 단, **[정정, 2026-07-21b]** 최초 조사 시 이를 근거로 "PIN 3칸(1·5·9) 전략이 플랫폼 네이티브 기능과 정합"이라 판단한 것은 오류였다. Reorder Grid(수동 드래그 재배치)와 PIN(자동 상단 강제 이동, 최대 3개)은 **서로 다른 기능**이며, PIN은 위치를 자유 선택할 수 없고 항상 그리드 최상단 1행(위치 1·2·3)으로 모인다(techcrunch.com/2022/06/07/instagram-pin-posts-to-your-profile, 2026-07-21b 재조사). 상세 정정 및 재설계는 channel-identity-kit.md §4 참조. ⓑ **기획 순서**: brand snapshot → content pillars(반복 시리즈) → visual rules → layout pattern → **9~12개 단위 프리뷰 후 게시**(postquick.ai, postfaster.app) — 우리가 이미 `feed-preview.png`로 9칸 프리뷰를 만든 절차와 1:1 일치. ⓒ **"9칸 안에 브랜드가 뭔지 이해되게"** — new visitor가 첫 9포스트만 보고 브랜드를 이해해야 한다는 원칙(postfaster.app) — 우리 그리드의 "1행=뭐하는곳/2행=사례/3행=나도하고싶다" 서사 구조와 정합. ⓓ **텍스트는 캔버스 중앙 ~80% 폭 내 배치**(3:4 크롭 대비, postquick.ai) — 우리 프레임 inset(48px)+패딩(72px)이 이 안전마진보다 더 보수적임을 계산 확인(1080px 중 좌우 각 120px 이상 확보 = ~78% 안전폭, 벤치마크 권고 충족).
- **왜 정합**: 콜드스타트 그리드의 목적(첫인상 30초 이해)과 우리 §4 계획의 목적이 문자 그대로 동일 — 이 레퍼런스는 "화면 문법"이 아니라 **그리드 운영 원리**를 검증하는 용도.
- **베끼면 안 되는 것**: ⓐ **로고 워터마크를 매 게시물에 넣지 않기**(postquick.ai 명시 원칙) — 우리는 9칸 전부 footer에 "해낼게" 텍스트 워드마크를 반복해 이 원칙과 정면 충돌(§실측 갭 ①로 처리). ⓑ 2026 유행 중 "체커보드(사진↔그래픽 교차)"·"무편집 포토덤프"(mysocialboutique.co) — 이건 **이미 실사 콘텐츠가 쌓인 크리에이터/라이프스타일 계정**의 패턴이라, 실 콘텐츠 0인 콜드스타트 그래픽 템플릿 단계(D-009 전제)에는 그대로 적용 불가 — 실 유저 선언이 쌓이면(§4-5 "사회적 증거 칸부터 순차 교체", 2026-07-21b 재설계 후 위치 4·5) 그 시점에 재검토 대상으로 남김. ⓒ 일반형 팔레트 권고("2 primary + 2 accent + neutrals", postquick.ai) — DESIGN.md §3.1의 "단색 클로버 채움 전용" 헌법 토큰이 이 일반 권고보다 판정 우선순위가 높음(§4-3 모델교대조항) — 채택하지 않음.
- **관측 실패(투명 공개)**: `instagram.com/toss.im` 실제 그리드 색감·포맷을 WebFetch로 직접 관측 시도했으나 로그인 요구로 이미지 콘텐츠 미노출(base64 placeholder만 반환) — **토스 그리드 실물은 unsourced 처리**, "78K 팔로워·968게시물"이라는 존재 자체만 확인(간접 출처: snstools.app 검색결과 스니펫).
- **출처**: [futuresocial.beehiiv.com — Reorder Grid 기능](https://futuresocial.beehiiv.com/p/what-instagram-s-new-reorder-grid-feature-means-for-brands) · [postquick.ai — 브랜드 그리드 기획 템플릿](https://www.postquick.ai/blog/how-to-plan-your-instagram-grid-for-a-brand-templates-examples) · [postfaster.app — 2026 그리드 콘텐츠 플랜](https://postfaster.app/articles/grid-instagram-content-plan) · [mysocialboutique.co — 2026 그리드 스타일 5종](https://mysocialboutique.co/5-instagram-grid-styles/) · [snstools.app — 2026 인스타 팔로워 성장전략(토스 언급)](https://snstools.app/ko/tools/instagram-grid/blog/2026-instagram-follower-growth-strategy/). 관측 2026-07-21.

**R10 보강 (2026-07-21b, 회장 지적 "핀은 상단 3개만 걸 수 있어, 다시 생각해봐" — WebSearch 3회 추가 실조사)**:
- **핀 동작 정정(중요, 기존 R10 갭으로 발견되지 않았던 실측 오류)**: 인스타 핀은 최대 3개까지 걸 수 있고, **핀된 게시물은 원래 그리드 위치와 무관하게 항상 그리드 최상단 1행(위치 1·2·3)에 모인다** — "정중앙에 걸어도 정중앙에 남는다"는 가정은 틀렸다. 순서는 **가장 최근에 핀한 게시물이 최좌측(위치 1)**, 이후 순서대로 우측으로 배치(techcrunch.com/2022/06/07/instagram-pin-posts-to-your-profile). 따라서 "1·5·9 대각선 배치를 PIN으로 지정"은 실행 자체가 불가능 — 핀을 걸면 셋 다 강제로 1행에 나란히 재배치되어 원래 설계한 대각선 구도(좌상 매니페스토·정중앙 앵커·우하 클로징)가 성립하지 않는다.
- **콜드 방문자 의사결정 창(신규 확인)**: 프로필 방문자는 평균 **2~3초 안에** 팔로우 여부를 결정하며, 이 짧은 창에 보는 것은 정확히 **프로필사진+바이오+그리드 최상단 1행(=핀 3개)**뿐이다(thisisco.com.au/podcast/3-must-have-pinned-posts). 즉 우리 9칸 중 실질적으로 "무조건 보이는 자산"은 핀 3개뿐이고, 나머지 6개는 스크롤해야 보이는 보조 자산이다 — 기존 "1행=뭐하는곳/2행=사례/3행=하고싶다" 서사를 핀=1행 강제 앞에서 재정렬해야 함을 확인.
- **핀 선정 프레임(신규 채택)**: 브랜드 계정의 표준 핀 3구성 = **Introduction(누구·무엇) → Connection(공감·가치) → Action(다음 행동)**, 또는 **소개→설명→증거** 변형(minter.io/blog/6-of-the-greatest-posts-to-pin-on-instagram). 우리는 전자를 채택 — 매니페스토(후킹/무엇)·"해낼게가 뭐냐면"(개념 설명)·사용법 3스텝(실행) = Intro-Connection-Action과 1:1 대응. 사회적 증거(선언 카드)를 핀에 넣는 대안도 검토했으나, D-009 가공 예시(298명·156명)는 실 유저 유입 시 순차 교체 예정인 **임시 콘텐츠**라 재핀 작업 부담과 "가장 눈에 띄는 슬롯에 임시 가짜 수치를 고정"하는 리스크가 커 기각(상세 근거는 channel-identity-kit.md §4).
- **출처(2026-07-21b)**: [techcrunch.com — Instagram pin 기능 공식 발표](https://techcrunch.com/2022/06/07/instagram-pin-posts-to-your-profile/) · [minter.io — 핀할 게시물 6선](https://minter.io/blog/6-of-the-greatest-posts-to-pin-on-instagram/) · [thisisco.com.au — 핀 3개 전략 팟캐스트](https://thisisco.com.au/podcast/3-must-have-pinned-posts/)

---

## 2. 화면 유형별 벤치마크 프로토콜

### 2-1. 유형 → 레퍼런스 매핑 (새 화면/에셋 착수 시 첫 참조)

| 화면/에셋 유형 | 1차 레퍼런스 | 보조 | 반면교사 |
|---|---|---|---|
| ② 목표 페이지 (친구 뷰) | R7 Linktree(아키타입) | R2 BMC(wall→워드맵) · 투네이션(비로그인) | R9(게이지·달성률) |
| 결제 시트 (금액→메시지→익명→결제) | R1 토스페이먼츠(시트 순서) | R2 BMC(칩 앵커·메시지) · R3 Ko-fi(무계정) | R4(금액=가격표 노출) |
| 결제 완료/실패 | R1 토스(사람 주어 문장) | R2 BMC(개인화 감사 페이지) · R4(메시지카드 정서) | — 실패 화면은 원인+다음 행동(design.md §7) |
| 워드맵 / 응원 메시지 뷰 | R2 BMC supporter wall | R4 메시지카드(캡처 욕구) | R2 leaderboard·개수 노출 |
| ① 받는사람 랜딩 (supply) | R7 Linktree(1 CTA) + R8 공스타(선언 정서) | R1 토스(write-first 가입 문법) | R9(내기 프레임) |
| 받는사람 홈 / 환전(cashout) | R1 토스(상태 가시성) | 뱅크샐러드(신뢰 지점 의도된 마찰) · Stripe(수수료 점진 공개) | 금융 대시보드 밀도 |
| 온보딩 목표 작성 폼 | R1 토스 가입 UX(입력 최소·한 화면 한 질문) | R8 "오늘의 3줄"(선언 구조) | R9(습관 설정 마법사) |
| 공유 카드 / OG / IG 에셋 | R8 공스타 문법 + visual-guidelines §5 | R4(캡처하고 싶은 카드) | 다꾸화·스탬프 과다 |
| 런치 피드(콜드스타트 9그리드) | R10(그리드 운영 원리 — PIN·프리뷰·순서) | R8 공스타 문법(개별 카드 톤) | 매 게시물 워터마크 반복·일반형 다색 팔레트 |
| 데스크톱(≥1024) 레이아웃 | R6 Linear(멀티컬럼·사이드 레일) | — | 폰 프레임 중앙 정렬로 갈음 금지(design.md §1-4) |
| 진행 업데이트 / 알림 | R8 3줄 포맷 | R1 토스("축하해요" 온도) | R9(인증 강제) |

### 2-2. 절차 (매 산출 전 — 순서 고정)

1. **표 확인**: 위 매핑에서 해당 유형의 지정 레퍼런스 행(§1)을 읽는다.
2. **최신성 검증**: 지정 레퍼런스라도 **WebSearch/WebFetch ≥1회**로 현재 UI를 재확인한다(관측일이 90일 넘었으면 필수 강화 — 레퍼런스 UI는 바뀐다. 실례: 당근 매너온도→Karrot Score 전환, 인스타 그리드 정사각→3:4 전환이 이미 이 위키에서 잡혔다).
3. **유형이 표에 없으면**: WebSearch로 신규 조사(국내 1 + 글로벌 1 이상) → 산출에 반영 → **결과를 §1에 5필드(베낄 것/정합 근거/금지/출처/관측일) 채워 append**. 조사 없이 "감으로" 만든 화면 = 뇌피셜 = verify 반려 대상.
4. **차용 기록**: 산출물 SOURCES(또는 STAMP)에 "무엇을 어느 레퍼런스에서 빌렸고 무엇을 바꿨나"를 명시(안 쓰면 뇌피셜 판정 — design.md §6).

---

## 3. 일관성 체크리스트 (산출 직전 — 5항목 전부 PASS 필요)

> 목적: 레퍼런스를 베끼다 **레퍼런스의 룩까지 반입**하는 사고 방지. 기준은 전부 [DESIGN.md](../../DESIGN.md) §3·§5.

| # | 항목 | PASS 기준 |
|---|---|---|
| 1 | **색** | 유채색 = 클로버 계열(#1B8A4F 등 §3.1 정본 hex)뿐인가. 그린은 **채움 전용**(본문 글자색 금지). BMC 노랑·토스 파랑·Linear 라벤더가 새어 들어오지 않았는가 |
| 2 | **폰트** | Pretendard **단일 패밀리**인가(2차 장식 폰트 금지). 스케일·weight가 §3.2 표 안인가. `document.fonts.check`로 실로드 확인(폴백 아님) |
| 3 | **radius** | `12/14/20/full` 4개 시스템만 썼는가. 레퍼런스의 radius(Linear 6px, BMC 캡슐 등) 무단 반입 없는가 |
| 4 | **아이콘 문법** | 쿼트러포일 클로버(D-006) 계열 + 얇은 단색 라인아이콘인가. 이모지가 유일한 시각 장치가 아닌가. 아이콘-원-배경 반복 나열 없는가 |
| 5 | **그라데이션·금액** | gradient 0인가(예외: 클로버 계열 단색 내 옅은 radial, §5-5). **친구/공개 화면에 금액·개수 노출 0인가**(3층 규칙 §6) |

- 추가(에셋일 때): 주인공 면 돈 언어 0 + 금지어 린트(agent-runbook §7-2 grep) 통과.
- **design-review 등급 B 이상 의무 — 재량 아님.** 스킬을 끝까지 돌려 **등급을 산출물에 출력**한다. **verify v2가 트랜스크립트에서 등급 문자열을 파싱한다** — 등급 미출력 = 리뷰 미완주 = 반려. B 미만 = findings 반영 리테이크(최대 2회), 그래도 미달이면 `⛔ 회수 필요:`로 중단 보고(design.md §1).

---

## 4. 모델 교대 조항 (agent-runbook §⑦ "문서가 모델 재량을 이긴다"의 벤치마크판)

1. **레퍼런스 추가 = 자유(append).** §2-2-3 절차로 5필드를 채워 §1 끝에 붙이고, SOURCES에 조사 URL을 남긴다. 승인 불요.
2. **삭제·교체·"베낄 것/금지" 수정 = 근거 + 결정 로그 필요.** 실측 근거(레퍼런스 서비스 종료·UI 대개편·우리 원칙과 충돌 발견)를 적고 [decisions.md](../3-operations/decisions.md)에 append한 뒤에만 수정한다. "내 감각으론 이 레퍼런스가 별로"는 사유가 아니다.
3. **이 뱅크와 DESIGN.md가 충돌하면 DESIGN.md가 이긴다**(판정 우선순위: DESIGN.md → design-review rubric → design.md §3 → 이 뱅크 → 모델 취향 최후순위).
4. 반기마다(또는 §2-2-2에서 대개편 감지 시) 죽은 레퍼런스를 §4-2 절차로 정리한다.

---

## 5. 셀프심문 보강 노트 (CoVe — "이 뱅크만 보고 GPT가 만든 에셋이 기존 18점과 안 어울린다면, 어느 규정이 빠져서인가")

자답으로 드러난 갭과 본문 보강 위치:
1. **레퍼런스 룩 반입** (가장 그럴듯한 실패 — BMC를 보고 노랑·캡슐 버튼까지 가져옴) → §3 체크리스트가 "레퍼런스 색·radius 무단 반입"을 명시적으로 검사(#1·#3).
2. **사진 톤 단절** (UI 토큰은 맞는데 실사진이 이질적) → 사진은 신규 촬영이 아니라 **포토뱅크 8장 + 힉스필드 프리셋**([visual-guidelines.md](../1-team-brand/visual-guidelines.md) §1-1·§2)이 정본임을 §2-1 에셋 행과 R8에 박음. 크레딧 = 회장 회수(D-008).
3. **문구 톤 단절** (화면은 맞는데 마이크로카피가 어긋남) → §3 추가 항목(금지어 린트·돈 언어 이원화)으로 연결 + R1 ⓑⓒ가 문장 문법을 지정.
4. **레퍼런스 노후화** (표를 믿고 6개월 뒤 죽은 UI를 베낌) → §2-2-2 최신성 WebSearch 의무 + 행마다 관측일 + §4-4 반기 정리.
5. **금액 노출 사고** (BMC·토스 문법을 따르다 공개 화면에 숫자 노출) → §1 각 행 금지란과 §3-#5에 이중 명기(가장 치명적 위반이라 두 곳).

레드팀 1회(회의적 GPT 후임 관점 — "표가 추상적이라 결국 다시 검색하게 될 것"): 각 행에 화면 단위 구체 문법(시트 순서·3줄 포맷·메시지카드 40자·칩 앵커)까지 내려 적었고, §2-1이 화면 유형→행 직결이라 검색 없이 착수 가능. 검색은 "무엇을 볼지"가 아니라 "지금도 그런지" 확인용으로만 남는다 — 이것이 이 문서의 존재 이유.

---

## STAMP

```
🏷 STAMP | line: haenael-ge | 생성: 2026-07-12 05:20 KST | model: claude-fable-5 | agent: product-designer
skills: (매칭 스킬 없음 — 하단 SKILLS_SKIPPED 참조) | 근거: WebSearch 7배치 실조사(행별 URL) · DESIGN.md v1.6 · standards/design.md·benchmarks.md·artifact-stamp.md·writing.md
고민: 챌린저스를 "베낄 대상"이 아니라 주 반면교사로 등재(페르소나 최인접이라 오염 위험 최대) — 상세는 §5 레드팀
감사: 2026-07-12 05:25 KST writing.md 대조(합격선 5항목 + §3 블랙리스트 A~F grep 0히트) — 본문 수정 0건
```

- 파일명 규격 예외 사유: 본 파일은 wiki **정본 문서**(append-only 운영, 헤더 semver 관리)라 visual-guidelines.md·channel-identity-kit.md 선례를 따라 wiki 명명 규칙을 우선함(artifact-stamp §1의 `<라인>-<이름>-v<N>-<모델>` 파일명은 prototypes/ 출고물 대상). 내부 STAMP·SOURCES는 전 항목 준수.

SKILLS_USED: 없음(스킬 호출 0) — 본 과업은 화면 시안 제작이 아니라 벤치마크 리서치 문서 작성이라 design-html/design-review(화면 산출물 대상)·design-consultation(디자인 시스템 신규 제안 — DESIGN.md v1.6 기확정이라 재제안은 §7.3 소유권 침범) 모두 비대상. 근거 조사는 WebSearch 7배치로 수행.
SKILLS_SKIPPED: design-consultation(디자인 시스템이 이미 DESIGN.md v1.6으로 확정 — 재실행 시 신규 시스템 발명 금지 원칙(design.md §1-3) 위반) · design-review(심사 대상 화면 산출물이 없음 — 이 문서 자체는 md 텍스트) · diagram(플로우 산출 아님)

SOURCES/MODEL:
- MODEL: claude-fable-5 (product-designer)
- 파일 근거: /Users/sj/.claude/standards/design.md · benchmarks.md · artifact-stamp.md · DESIGN.md(v1.6) · wiki/1-team-brand/visual-guidelines.md · wiki/1-team-brand/brand-marketing-strategy.md §1~2 · wiki/3-operations/decisions.md D-001~D-008 · wiki/3-operations/agent-runbook.md §⑦
- WebSearch 실조사(2026-07-12, 7배치): 토스 UX Writing(brunch.co.kr/@kellypoly/62 · dbreblog.com/43 · toss.tech/article/toss-signup-process) / BMC(buymeacoffee.com · help.buymeacoffee.com/articles/7983531 · poper.ai/widgets/buy-me-a-coffee-feed) / Ko-fi(ko-fi.com · help.ko-fi.com/articles/360018381678) / 카카오 선물하기(brunch.co.kr/@bydot/6 · kakaocorp.com/page/service/service/KakaoTalkGift · byline.network/2020/11/25-111 · hankyung.com/article/202409111289g) / 당근(redbusbagman.com/karrotuxresearch · about.daangn.com 디자이너 블로그) / Linear(getdesign.md/linear.app/design-md · blog.logrocket.com/ux-design/linear-design) / Linktree·2026 link-in-bio(linktr.ee · trustypost.ai · own.page/blog/best-link-in-bio) / 공스타(namu.wiki/w/공부 인증 · tilnote.io · brunch.co.kr/@jdentistry/3) / 챌린저스(namu.wiki/w/챌린저스 · brunch.co.kr/@bydot/9 · weeklyuxuichallenge.oopy.io)

RUBRIC_SCORE: hook=3/5 detail=5/5 rhythm=3/5 voice=5/5 slop=5/5 total=21/25
WEAKEST_LINE: "반기마다(또는 §2-2-2에서 대개편 감지 시) 죽은 레퍼런스를 §4-2 절차로 정리한다." — 실행 주체·트리거 캘린더가 없어 다섯 조항 중 유일하게 "누가 언제"가 비어 있는 문장(운영 케이던스는 kpi-runbook 주간 루프에 걸릴 사안이라 이 문서에선 열어 둠)
(주: 본 파일은 writing.md §6 기준 "위키 내부 dense-neutral 문서" — hook·rhythm은 독자 이동용 카피가 아니라 스펙 산문으로 채점. 카피 산출물 아님에도 verify 파싱 대비로 푸터 유지)
