# 해낼게 — 비주얼 가이드라인 (정본 v1.0)

> 작성: 2026-07-12, store-visual-producer (위임, 실행 모드 — 회장 승인 완료 "채널 비주얼 킷 완주").
> 상위 정본: [DESIGN.md](../../DESIGN.md)(토큰) · [brand-marketing-strategy.md](../brand-marketing-strategy.md)(톤·돈 언어) · [decisions.md](../decisions.md) D-003/D-005/D-006 · [channel-identity-kit.md](channel-identity-kit.md)(하이라이트 6종·그리드 9칸 계획).
> 이 문서는 실제 만들어진 **에셋 인벤토리 + 재생성 레시피 + 크레딧 정책**을 다룬다. `wiki/index.md`가 이미 이 경로를 링크 중이었으나(broken) 이 v1.0으로 최초 실체화한다.

---

## 0. 이번 배치 요약 (2026-07-12)

이전 세션이 만든 힉스필드 실사진 8장(`docs/brand-assets/photo-bank-wip/p1~p8.png`)을 **전량 육안 QA 통과 → 재사용**하고, 그 위에 design-html(HTML/CSS + 헤드리스 렌더, 손코딩 SVG 아님 — 단 브랜드 라인아이콘 지오메트리는 예외 허용 범위 내에서 인라인 SVG 사용)로 신규 합성 10점을 제작했다. **신규 힉스필드 생성 = 0장, 신규 크레딧 소모 = 0크레딧.** 계정 잔여 크레딧 변동(42→27, §4 참조)은 본 작업이 원인이 아니다(계정 공유 세션 가능성 — 사실만 기록, 추측 아님).

---

## 1. 에셋 인벤토리

### 1-1. 배경 실사진 뱅크 (`docs/brand-assets/photo-bank/`)

전량 QA 통과(아티팩트·텍스트 오염·워터마크·브랜드 톤 이상 없음, 육안 검수 2026-07-12). 원본은 `photo-bank-wip/p1~p8.png`에 보존, 의미 명명본을 `photo-bank/`에 정본화.

| 파일 | 원본 | 장면 | 콘텐츠 시리즈 매핑 | 규격 |
|---|---|---|---|---|
| `bg-dawn-desk.png` | p1 | 새벽 5시 책상, 다이어리·펜·클로버 화분·램프 | S2 선언 로그(고요한 아침 선언 리추얼) | 1744×2336 (2:3) |
| `bg-window-study.png` | p2 | 창가 햇살 아래 손 — 노트북 타이핑+다이어리 | S2 선언 로그 / 그리드 칸2·8 배경 텍스처 | 1520×2688 (4:5) |
| `bg-shoelace.png` | p3 | 해질녘 러닝화 끈 묶는 손, 가로등 보케 | S2 선언 로그(운동형 목표군) | 1520×2688 (4:5) |
| `bg-exam-books.png` | p4 | 포스트잇 붙은 책더미 + 타이머 + 형광펜 | S2 선언 로그 / 그리드 칸3 배경 텍스처 | 1744×2336 (2:3) |
| `bg-cafe-study.png` | p5 | 스터디카페 야경, 손 타이핑 + 커피 | S1 만드는 중(제작기, 밤샘 작업 무드) | 1744×2336 (2:3) |
| `bg-handwriting.png` | p6 | 만년필 손글씨 클로징업 + 압화 네잎클로버 스티커 | S3 전하지 못한 마음 관찰기(내면 서사) | 1520×2688 (4:5)* |
| `bg-morning-coffee.png` | p7 | 오전 체크리스트 작성 + 라떼아트 + 클로버 화분 | S2 선언 로그(목표설정 리추얼) | 1744×2336 (2:3) |
| `bg-golden-hour.png` | p8 | 골든아워 창가, 클로버 화분 + 마른 낙엽 + 다이어리 | 범용 히어로 — **OG 이미지 채택** | 1520×2688 (4:5) |

\* p6는 실측 렌더 결과가 JSON의 2:3 지정과 다르게 4:5로 나왔음(unsourced — 힉스필드 렌더 시점 실측 편차, 재생성 시 재확인 필요).

**매칭 검증 방법**: 파일명 숫자와 JSON 프롬프트가 1:1인지 프롬프트 원문(`p1-dawn-desk.json`, `p5-cafe-study.json`)을 직접 읽어 이미지 내용과 대조 — 2건 표본 검증 결과 완전 일치. 나머지 6건은 시각 내용이 파일명과 명백히 부합해 동일 신뢰.

### 1-2. 신규 제작 비주얼 (`docs/brand-assets/`, design-html 합성, 힉스필드 미사용)

| 파일 | 규격 | 용도 | 상태 |
|---|---|---|---|
| `highlight-01-해낼게란.png` | 1080×1920 | IG 하이라이트 커버 ① | 정본 |
| `highlight-02-선언하는법.png` | 1080×1920 | IG 하이라이트 커버 ② | 정본 |
| `highlight-03-클로버.png` | 1080×1920 | IG 하이라이트 커버 ③ | 정본 |
| `highlight-04-응원매너.png` | 1080×1920 | IG 하이라이트 커버 ④ | 정본 |
| `highlight-05-만드는중.png` | 1080×1920 | IG 하이라이트 커버 ⑤ | 정본 |
| `highlight-06-물어보세요.png` | 1080×1920 | IG 하이라이트 커버 ⑥(선택 항목, channel-identity-kit §5) | 정본 |
| `declaration-card-exam.png` | 1080×1350 | 선언카드 변형(수험형) — 사회적 증거 스트립 추가 | 정본 |
| `declaration-card-fitness.png` | 1080×1350 | 선언카드 변형(운동형) — 사회적 증거 스트립 추가 | 정본 |
| `og-image.png` | 1200×630 | 링크 공유 OG 카드(카톡/스레드/트위터 미리보기) | 정본 |
| `grid-preview-9posts.png` | 1200×1460 | 첫 9게시물 그리드 프리뷰(전략 커뮤니케이션용, 헤더 포함) | 정본 |

### 1-3. 기존 승인 정본 (변경 없음, 이번 배치의 스타일 기준선으로 참조)

| 파일 | 규격 | 근거 |
|---|---|---|
| `profile-icon.png` | 512×512 | D-006 |
| `instagram-declaration-card.png` | 1080×1350 | 선언카드 오리지널(수능형 예시) — §1-2의 2변형은 이 스타일 문법을 계승·확장 |
| `youtube-banner.png` | 2560×1440 | D-005 |
| `youtube-thumbnail-declaration-log.png` / `youtube-thumbnail-buildlog.png` | 1280×720 | — |

---

## 2. 힉스필드 프롬프트 프리셋 (`docs/brand-assets/photo-bank-wip/*.json`)

10개 JSON 전량 `mode: "moodboard_pin"`(2:3, Pinterest형 세로 무드보드 — p1·p4·p6·p7) 또는 `mode: "lifestyle_scene"`(4:5, 인물 손/실루엣 라이프스타일 — p2·p2b·p3·p5·p5b·p8) 구조. 모델은 전부 `gpt_image_2`(힉스필드 `product-photoshoot` 라우팅).

**공통 프롬프트 골격** (재생성 시 이 순서를 유지):
`[SCENE]` 장소·시간대 → `[PRODUCT PLACEMENT]`(비상업적 소품 배치) → `[HUMAN ELEMENT]`(손/실루엣만, 얼굴 노출 없음 — 이 서비스는 인물 얼굴이 필수 아님) → `[ENVIRONMENT DETAILS]` → `[LIGHTING]`(주광원 1개 + 보조광 명시, 색온도 K값까지) → `[LENS & CAMERA]`(mm·조리개·피사계심도) → `[ATMOSPHERE]` → `[COLOR PALETTE]` → `[STYLE REFERENCE]`(Beth Kirby·Brittany Ambridge·Pia Ulin/Jamie Hawkesworth 계열 에디토리얼 라이프스타일 사진가 인용) → `[QUALITY MARKERS]` → `[AVOID]`(AI 아티팩트·워터마크·텍스트·기형 손가락·플라스틱 피부 등 표준 네거티브 롱리스트, 화면 내 텍스트/문자 전면 금지 포함).

`[AVOID]` 블록은 10개 파일 전부 동일 표준 네거티브를 공유 — 재생성 시 이 블록을 삭제·축약하지 말 것(품질 하한선).

전체 목록:

| 파일 | mode | aspect | 핵심 장면 한 줄 |
|---|---|---|---|
| `p1-dawn-desk.json` | moodboard_pin | 2:3 | 새벽 5시 다이어리+클로버 화분, 창밖 완전 암전 |
| `p2-window-study.json` | lifestyle_scene | 4:5 | 오후 늦은 창가, 노트북 타이핑 손 |
| `p2b-window-study.json` | lifestyle_scene | 4:5 | p2 대체 프롬프트(리테이크용) |
| `p3-shoelace.json` | lifestyle_scene | 4:5 | 해질녘 러닝화 끈, 가로등 보케 |
| `p4-exam-books.json` | moodboard_pin | 2:3 | 포스트잇 책더미 + 타이머 |
| `p5-cafe-study.json` | lifestyle_scene | 4:5 | 스터디카페 야경, 손 타이핑 |
| `p5b-cafe-study.json` | lifestyle_scene | 4:5 | p5 대체 프롬프트(리테이크용) |
| `p6-handwriting.json` | moodboard_pin | 2:3 | 만년필 손글씨 + 압화 클로버 |
| `p7-morning-coffee.json` | moodboard_pin | 2:3 | 체크리스트 + 라떼아트 |
| `p8-golden-hour.json` | moodboard_pin | 2:3 | 골든아워 창가, 클로버+낙엽 |

---

## 3. 재생성 절차 (CLI — 크레딧 소모 항목, 회장 승인 후에만 실행)

```bash
# 1. 인증 확인 (필수 선행 — 미인증이면 즉시 중단하고 회수 필요 보고)
higgsfield account status

# 2. 사용 가능 모드 확인
higgsfield product-photoshoot create --help
higgsfield product-photoshoot model list

# 3. 생성 (JSON의 prompt 필드를 --prompt에 그대로, aspect_ratio·model 값도 JSON과 일치시켜야 동일 룩 재현)
higgsfield product-photoshoot create \
  --mode lifestyle_scene \
  --prompt "$(python3 -c "import json;print(json.load(open('docs/brand-assets/photo-bank-wip/p2-window-study.json'))['prompts'][0]['prompt'])")" \
  --count 1 \
  --aspect_ratio 4:5

# 4. 결과 URL을 curl로 로컬 다운로드
curl -L -o docs/brand-assets/photo-bank-wip/p2-retake.png "<생성 URL>"

# 5. 육안 QA(Read 툴로 열어 아티팩트·텍스트오염·톤 확인) 통과분만 photo-bank/에 의미명명 반영
```

품질 미달 시 `[AVOID]` 블록은 유지한 채 `[LIGHTING]`/`[COLOR PALETTE]` 문단만 조정해 재시도(전체 재작성 금지 — 룩 일관성 훼손).

---

## 4. 크레딧 정책

- 계정: `code0to1@gmail.com`, starter plan.
- **착수 시 실측(2026-07-12 세션 시작)**: 42 크레딧.
- **완료 시 실측(2026-07-12 세션 종료)**: 27 크레딧.
- **본 배치의 힉스필드 신규 생성 = 0장, 신규 크레딧 소모 = 0크레딧** — 이번 배치는 기존 8장 재사용 + design-html 합성만 사용했다(위 §3 CLI를 단 한 번도 호출하지 않음).
- 델타 -15는 본 세션 활동으로 설명되지 않는다(unsourced — 계정이 여러 pane/세션에서 공유될 수 있어 동시 사용 가능성이 있음). **신규 힉스필드 생성은 반드시 회장 승인 후에만** 진행하고, 실행 직전·직후 `higgsfield account status`로 델타를 재확인해 정확한 소모량을 이 문서에 갱신할 것.
- **[컨트롤러 확정 2026-07-12 00:15]** 델타 원인 규명 완료(관찰됨): `higgsfield account transactions` + 생성물 URL 실물 대조 결과, 42→**6(최종 실측)**의 -36은 **같은 공유 계정을 쓴 타 세션의 생성**(Seedream 5.0 Pro 5장 + GPT Image 2 3장 — 실물은 가로형 심야 공부 장면·3D 스타일 한국 골목 등 본 브랜드 규격·톤과 무관). 본 배치 결백 확인. **현재 잔여 = 6크레딧(사실상 소진)** — §3 재생성 절차는 회장의 충전 결정 전까지 실행 불가로 취급하라.

---

## 5. 커버·카드 제작 규격 (design-html 소스)

렌더 파이프라인: HTML/CSS(Pretendard 웹폰트 CDN 로드) → `gstack browse`(헤드리스 Chromium) `viewport WxH` + `goto file://...` + `screenshot --viewport`로 정확한 픽셀 규격 PNG 출고. 손코딩 SVG는 브랜드 라인아이콘 지오메트리(쿼트러포일·말풍선·체크리스트 등 6종)에만 사용 — 사진·인물·배경은 전량 힉스필드 실사진 합성.

| 산출물 | 소스 HTML(참고용, repo 미체크인 — 재생성 시 이 구조 복제) | 캔버스 |
|---|---|---|
| 하이라이트 커버 6종 | `highlight-covers.html` (`?i=1~6` 쿼리로 6종 스위칭) | 1080×1920, 중앙 880px 세이프서클 |
| 선언카드 2변형 | `declaration-cards.html` (`?v=exam` / `?v=fitness`) | 1080×1350, 기존 `instagram-declaration-card.png` 레이아웃 문법 계승 + 사회적 증거 스트립(D-003) 신규 |
| OG 이미지 | `og-image.html` | 1200×630, `bg-golden-hour.png` 풀블리드 + 잉크색 단색 스크림(그라데이션 아님 — 가독성용 단일톤 오버레이) |
| 그리드 프리뷰 | `grid-preview.html` | 1200×1460(헤더 220 + 3×3 그리드 1200×1200) |

디자인 토큰: DESIGN.md §3 그대로(`--clover #1B8A4F` 채움 전용, `--bg #FBFAF7`, radius 4종 한정, gradient 금지 — OG 스크림은 단색 알파 그라데이션으로 "장식 그라데이션 금지" 예외 대상 아님).

### 5-1. 2026 실조사 반영 사항 (WebSearch, 2026-07-12)

- 하이라이트 커버: "얇은 스트로크 라인아이콘 + 2~3색 팔레트 + 원형 세이프존" 이 2026 트렌드로 확인 — 본 배치가 이미 이 형식(clover 단색 라인 + clover-soft 배경 원 + warm paper 캔버스, 정확히 3톤) 채택 중이라 별도 수정 불요. ([accio.com](https://www.accio.com/business/instagram-highlight-cover-trending), [awisee.com](https://awisee.com/blog/instagram-highlight-cover-design/))
- **그리드 규격 갱신 주의(중요 발견)**: 2026년 인스타그램이 프로필 그리드 썸네일을 정사각형에서 **3:4 세로형**으로 변경했고, 개별 포스트 권장 규격은 **1080×1350(4:5)**로 안내됨 ([postfaster.app](https://postfaster.app/articles/grid-instagram-content-plan)). 본 문서의 `grid-preview-9posts.png`는 **전략 커뮤니케이션용 프리뷰 목업**이라 정사각 400×400 칸으로 제작했음(9칸 배치·서사 흐름 확인 목적) — 그러나 **실제 9개 게시물 에셋을 각각 내보낼 때는 정사각형이 아니라 1080×1350(4:5)로 제작**해야 한다. 이는 마침 기존 `declaration-card-*.png`·`instagram-declaration-card.png`가 이미 1080×1350인 것과 일치 — 선언카드류는 규격 수정 불필요, **매니페스토·훅형(칸1·4·7 등 텍스트형) 포스트를 실제 개별 파일로 뽑을 때 4:5 규격 적용**을 다음 배치 체크리스트에 남긴다.

---

## 5-2. 레드팀 방어 메모 (셀프심문)

- **"선언카드의 340명/210명이 진짜 데이터냐?"** — 아니다. 기존 승인 정본 `instagram-declaration-card.png`(D-84·4.0·2026.03-06)도 전부 예시값이었던 것과 동일하게, 이 2변형도 **발행용 템플릿의 예시 인스턴스**다. 실제 게시 전 반드시 실 쿼리 결과로 치환하고, 0명일 때는 D-003 가드레일 ⓑ에 따라 "당신이 첫 응원"류 초대 프레임으로 대체한다(가짜 수치 금지).
- **"Pretendard가 진짜 로드됐냐, 시스템 폰트 폴백 아니냐?"** — `document.fonts.check('800 60px Pretendard')` → `true`, 네트워크 로그에 `pretendard.css → 200` 확인(2026-07-12 실측). 폴백 아님.
- **"그리드 프리뷰가 실제 IG 렌더와 다르면 오도 아니냐?"** — §5-1에 규격 편차와 실제 개별 포스트 규격 권고(4:5)를 명시적으로 남겨 오도 리스크를 차단.

## 6. ⛔ 회수 필요

1. **크레딧 델타 -15(§4)** — 본 세션 원인 아님. 다른 pane/세션이 이 계정으로 동시 작업했는지 확인 부탁드립니다. 확인되면 이 문서 §4에 원인 기록.
2. **그리드 개별 포스트 4:5 전환(§5-1)** — 현재 `grid-preview-9posts.png`는 전략 프리뷰용(정사각 9칸)이라 그대로 유효하지만, 9개를 실제로 각각 게시할 때는 1080×1350 개별 파일 제작이 필요합니다. 이번 배치 범위 밖(태스크 지정 산출물 = 프리뷰 1장)이라 별도 착수 승인 필요.

---

SKILLS_USED: design-html(6종 하이라이트+2종 선언카드+OG+그리드 프리뷰, HTML/CSS+헤드리스 렌더(gstack browse)로 전량 제작, 손코딩 SVG는 라인아이콘 지오메트리에만 한정 사용). 본 세션 자체가 이미 store-visual-producer 에이전트 페르소나로 기동됐으므로(시스템 프롬프트 정의) Skill("store-visual")을 별도 재호출하지 않음 — 그 파이프라인(벤치마크→사진QA→합성→QA) 순서 자체를 본문에서 직접 준수.
SKILLS_SKIPPED: design-review(전용 스킬 미호출 — design-html이 spawned/headless 세션에서는 AskUserQuestion 대화형 refinement 루프를 쓰지 않고 자동 진행하도록 자체 규정하므로, 동일 루브릭을 본 세션이 DESIGN.md §5 금지패턴·채널킷 §4/§5 정합·D-003 가드레일 기준으로 자가 적용해 10점 전량 육안 재QA 수행)

SOURCES/MODEL:
- MODEL: claude-sonnet-5 (store-visual-producer)
- 파일 근거: DESIGN.md · wiki/brand-marketing-strategy.md · wiki/decisions.md(D-003/D-005/D-006) · wiki/brand/channel-identity-kit.md · docs/brand-assets/README.md · docs/brand-assets/photo-bank-wip/*.json(10개 전량 열람) · docs/brand-assets/{profile-icon,instagram-declaration-card,youtube-banner}.png(스타일 기준선 육안 대조)
- 벤치마크 URL: https://www.accio.com/business/instagram-highlight-cover-trending · https://awisee.com/blog/instagram-highlight-cover-design/ · https://www.empoweredsocialmediaco.com/blog/instagram-highlight-covers-guide · https://masterbundles.com/templates/social-media/instagram/highlight-icons/ · https://postfaster.app/articles/grid-instagram-content-plan · https://toolsinsta.com/guides/instagram-grid-planning · https://skedsocial.com/blog/how-to-make-your-instagram-feed-look-good · https://postplanify.com/blog/instagram-grid-layout-guide · https://www.postquick.ai/blog/how-to-plan-your-instagram-grid-for-a-brand-templates-examples
- (unsourced) 표기 항목: §1-1 p6 규격 편차 원인, §4 크레딧 델타 원인
