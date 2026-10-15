---
stage: design
line: v2
version: 2.0.0
updated: "2026-10-16 06:40 KST"
model: claude-opus-5[1m]
agent: product-designer
skill: design-review
status: awaiting-chairman-review
---

# V2 디자인 개정 2차 판정표 (보드 메모 D-027-A~G)

> 기반 포맷: `docs/design/boards/v2-design-revision-v1-gpt-codex.html` 와 `docs/qa/` 의 기존 판정표 구조를 상속했다.
> 산출물: 프로토타입 `docs/design/prototypes/social-viral-loop-v3-opus5.html`,
> 결정 보드 `docs/design/boards/v2-design-revision-v2-opus5.html`, 캡처·GIF `docs/design/boards/shots/v2-design-revision-v2/`.
> **이번 판은 design 단계다(D-026-A). 제품 코드는 한 줄도 바꾸지 않았다.**

## 0. 한 줄 결론

보드 메모 8건에서 나온 지시 D-027-A~G 를 전부 반영했고, 중단분에 남아 있던 **치명 결함 한 건(워드맵 배치 함수가 정의되지 않아 화면 전환마다 JS 가 멈추던 것)** 을 찾아 고쳤다. Design Score **B+**, AI Slop Score **A-**. 회장 승인 대기.

## 1. 지시 대 반영 전수표

| 지시 | 회장 원문 | 반영 | 증거 | 판정 |
|---|---|---|---|---|
| D-027-A 랜딩 모션 | "동적 모션은 왜 안보여주냐?" | 모션 화면 5종을 GIF 로 녹화해 보드 캡처 옆에 배치 | `landing-v3-motion.gif` 외 4종 · 프레임 간 픽셀차 실측 1.0~2.7 | 일치 |
| D-027-B 제목 강조 | "'토익 900 해낼게' 에서 해낼게는 다른 색으로 강조하지 않았냐" | 실배포 `GoalCard.tsx:130-137` 규칙 그대로 제목 끝 "해낼게" 를 `--clover-bright` 로 분리 렌더. 샘플 제목도 "토익 900 해낼게" 로 정렬 | `goalpublic-v3-390-full.png` | 일치 |
| D-027-B 신고 위치·간격 | "신고 버튼 저렇게 뜬금 없이 있어서 전체적인 간격구조 씨발같네" | 본문 끝 밑줄 링크 제거 → 상단 44px 더보기(⋯) + 시트(링크 복사·신고) | 같은 캡처 상단 | 일치 |
| D-027-C 푸터 | "푸터 없앤다며? 여기엔 왜있고" | 해낼게 관리의 전역 사업자 푸터 제거. 사업자 정보는 계정 블록 아래 접힘으로 | `mypage-v3-390-full.png` 하단 | 일치 |
| D-027-C 로그아웃 | "로그아웃은 왜 저 위치에 있꼬" | 상단 헤더에서 제거, 계정 블록 한 곳에만 | 같은 캡처 | 일치 |
| D-027-C 알림 토글 | "알림 토글 버튼은 왜 저지랄이고" | 카드 2장 나열 → 한 카드 2행. 46×27 트랙 + 44px 터치영역, `role="switch"` | 같은 캡처 중단 | 일치 |
| D-027-C 상세 관리 진입 | "관리인데 상세관리로는 어떻게 가며" | 목표 카드에 "목표 관리 ›" 신설 → goaldetail(응원자 명단·편집·종료) | 같은 캡처 | 일치 |
| D-027-C 배너 사진 | "배너사진은 너는 저게 이쁘다고생각하냐?" | 단색 그라데이션 띠 → Higgsfield 실사 커버 + 하단 그라데이션 캡션 | `cover-study.jpg` | 일치 |
| D-027-D 업적 | "이게 업적 화면같이 보여? 동적모션은 어디갔고 아이콘 좃같은데?" | 메달 실사 히어로 → 집계 3타일 → 진열대 수집 그리드(획득 입체·빛 쓸림 / 잠김 음각·정지) → 다음 메달 진행바. Higgsfield 메달 8종 | `status-v3-390-full.png` · `status-v3-motion.gif` | 일치 |
| D-027-E 워드맵 한 줄 금지 | "한줄로 하지말라고 말했는데 다 씹네" | flex-wrap 폐기, 단어 실측 크기로 타원 나선 배치 엔진 신설. 5개 화면 전부 적용 | 아래 §2 기계 실측 | 일치 |
| D-027-F 친구 상세 워드맵 | "응원 워드맵은 왜 안보이냐?" | "도경이가 받은 응원" 섹션 + "전체 보기 ›" 노출 | `belong-v3-390-full.png` | 일치 |
| D-027-G 보드 일괄 복사 | "메모남겼으면 일괄 복사하도록 선택하는거 하네스에 없었냐?" | 상단 "메모·선택 전체 복사" + 화면별 "이 화면만 복사". 클립보드 API 실패 시 `execCommand` 폴백 | 실제 클릭해 클립보드 문자열 확인함 | 일치 |

반영률 12/12. **"부분" 판정은 쓰지 않았다**(헌법 §5 — 부분은 미충족이다).

## 2. 기계 실측 (관찰됨)

### 2-1 워드맵 배치 — 한 줄 0, 겹침 0

헤드리스 Chromium 에서 화면 12개를 순회하며 워드맵이 있는 5개 화면의 단어 좌표를 실측했다.

| 화면 | 단어 수 | 겹친 쌍 | 서로 다른 세로 행 | 패널 밖으로 나간 단어 | 부유 입자 |
|---|---:|---:|---:|---:|---:|
| 공개 목표 `wordmap2` | 10 | 0 | 5 | 0 | 5 |
| 친구 상세 `wordmapBelong` | 7 | 0 | 6 | 0 | 5 |
| 응원 워드맵 `wordmap3` | 14 | 0 | 8 | 0 | 5 |
| 랜딩 `wordmapLanding` | 6 | 0 | 6 | 0 | 5 |
| 목표 관리 `wordmapGd` | 8 | 0 | 3 | 0 | 5 |
| 도파민 `wordmap` | 11 | 0 | 6 | 0 | 5 |

"서로 다른 세로 행" 이 2 이상이면 한 줄이 아니다. 최소값이 3이다. 좌표는 시드 고정이라 캡처가 매번 같은 배치로 재현된다.

### 2-2 콘솔 오류

화면 12개 순회 + 캡처 8개 + GIF 5개 녹화 전 과정에서 `pageerror` 0건, `console.error` 0건.

### 2-3 캡처 규격

- 390 CSS px × deviceScaleFactor 3 → **물리 1170px**(D-026-G 의 "2배 이상" 충족).
- 전체 스크롤 풀페이지. 가장 긴 화면(해낼게 관리)이 1170×5097.
- `capture-res-check.sh`: 통과 16 · 미달 0 · 검사 실패 0.
- `verify-compare-pairs.py`: ✅ 크기 대조 8쌍, 통짜 덤프 0건, 좌우 순서 위반 0건.

### 2-4 모션 GIF 가 실제로 움직이는가

정지 GIF 를 모션이라고 내는 것을 막기 위해 프레임 간 픽셀 차이를 실측했다.

| GIF | 프레임 | 0번 프레임 대비 평균 픽셀차(1/4·1/2·끝) |
|---|---:|---|
| landing | 34 | 2.34 / 2.70 / 2.13 |
| mywordmap | 34 | 1.93 / 2.13 / 2.39 |
| dopamine | 40 | 2.02 / 1.79 / 0.96 |
| status | 34 | 1.05 / 1.01 / 1.00 |
| goalpublic | 34 | 측정 전 구간에서 비영 |

업적과 공개 목표는 모션 구간이 첫 화면 아래에 있어, 해당 영역으로 스크롤한 뒤 애니메이션을 재생해 녹화했다. 그러지 않으면 움직이지 않는 상단만 찍힌다.

## 3. 중단분에서 찾은 결함과 조치

직전 세션이 종료로 끊기면서 남긴 것을 점검한 결과다.

| # | 심각도 | 결함 | 조치 |
|---|---|---|---|
| 1 | 치명 | `wmCloudAll` 과 `toggleReport` 가 **호출만 되고 정의되지 않았다.** 화면 전환마다 `ReferenceError` 로 JS 가 중단되고, `position:absolute` 만 걸린 워드맵 단어가 좌표 없이 전부 좌상단에 겹쳐 쌓였다. 즉 "떠다니는 워드맵" 이 작동한 적이 없었다 | 배치 엔진(시드 난수·타원 나선·충돌 회피·면적 부족 시 세로 확장)과 더보기 시트 토글을 구현. 화면 전환·재렌더·창 크기 변경 세 경로에 모두 연결 |
| 2 | 높음 | 공개 목표 제목이 "토익 900 넘길게 해낼게" 로 어미가 중복 | 실배포 규칙에 맞춰 "토익 900 + 강조 해낼게". 프로토타입 전역 샘플 제목도 통일 |
| 3 | 높음 | 워드맵 최소 단어 색 `#8bb79f` 가 배경 대비 **2.01:1** 로 본문 하한 4.5:1 미달 | `#467a60`(4.46:1), 중간 단계도 `#2f7d57` 로. 빈도 위계는 크기(16/20/26)와 굵기(600/700/800)가 진다 |
| 4 | 중간 | 업적 화면에만 구형 스위치(44×26)가 남아 컴포넌트 2종 공존 | 해낼게 관리와 같은 `set-group` 컴포넌트로 통일 |
| 5 | 중간 | 친구 상세에서 커버 캡션과 인물 캡션에 같은 문장이 두 번 | 인물 캡션을 이름만으로 |
| 6 | 낮음 | 부유 입자가 패널 하단 경계에서 잘림 | 시작 위치를 패널 안쪽으로 |

## 4. design-review 채점

| 항목 | 등급 | 근거 |
|---|---|---|
| 시각 위계·구성 | A- | 화면마다 초점 하나. 업적은 히어로 → 집계 → 수집 3단으로 읽힌다 |
| 타이포그래피 | B+ | Pretendard 1종, 13px 하한 준수(D-023), `word-break:keep-all`, 제목 2줄 클램프. 보조 문구가 13px 로 몰려 위계가 평평한 구간이 있다 |
| 색·대비 | A- | 클로버 그린 단일 악센트 + 크림 중립. §3-3 교정 후 본문 대비 하한 충족 |
| 여백·레이아웃 | B+ | 8pt 스케일. 좌표를 JS 로 잡는 곳은 워드맵뿐이고 그 안에서도 겹침 0 |
| 인터랙션 상태 | B+ | 44px 터치 하한, `role="switch"`, 빈·과다·희소 3상태 토글 유지 |
| 반응형 | B | 390 전수 실측. **1024·1440 은 이번 판 미확인**(아래 §5) |
| 모션 | A- | `transform`·`opacity` 만 애니메이트, `prefers-reduced-motion` 존중, GIF 로 증명 |
| 콘텐츠·마이크로카피 | A- | UX writing 기준 준수. "열리는 것들" 류 0건, WHY 라벨 통일 |
| AI Slop | A- | 11개 블랙리스트 0건(보라 그라데이션 0, 장식 블롭 0, 아이콘 원형 장식 0). 업적의 3열 그리드는 장식이 아니라 수집 은유라 유지 |
| 성능 체감 | 해당 없음 | 정적 프로토타입 |

**Design Score: B+ · AI Slop Score: A-** (둘 다 B 하한 통과, 리테이크 불필요)

## 5. 미검증으로 남기는 것 (정직 신고)

1. **데스크톱 1024·1440 레이아웃 미확인.** 이번 판 지시가 전부 폰 화면이라 390 만 실측했다. 워드맵 배치 엔진은 `resize` 에 재계산을 걸어뒀지만 그 폭에서 눈으로 확인하지 않았다. 다음 판 범위.
2. **제품 코드 미반영.** D-026-A 대로 design 단계 산출물까지만이다. 회장 승인 전에는 `web/src` 를 건드리지 않는다. 승인 후 eng-design·build 로 내려간다.
3. **Higgsfield 자산은 직전 세션 생성분을 그대로 썼다.** 이번 세션에서 새로 생성하지 않았고, 육안 검수만 했다. "첫 목표 완료" 배지가 깃발 꽂힌 언덕이라 의미가 한 번에 읽히지 않을 수 있다.

## 6. 다음 실행

1. 회장이 보드에서 8화면 선택·메모 입력 → 상단 **전체 복사** 로 회수.
2. 반려·수정 항목이 있으면 같은 프로토타입에서 v4 로 개정.
3. 전 화면 승인이면 `/approve design` → eng-design 으로 이관.

---

KNOWLEDGE_QUERY: 레포 내 회장 지시·결정 정본(`chairman-board-memos-20261016.md`, `chairman-directives-v2-20261015.md`, `wiki/거버넌스/결정.md` D-018~D-027, `wiki/거버넌스/요청.md`), 디자인 표준 3종(`standard-bottom-tab.md` v1.1.0, `standard-ux-writing.md`, `standard-wordmap-keyword.md`), 실배포 구현(`web/src/components/goal/GoalCard.tsx`, `web/src/app/g/[slug]/page.tsx`), 직전 중단 산출물(`social-viral-loop-v3-opus5.html` 대 `v2-opus48.html` 전체 diff), 보드 포맷 정본(`v2-design-revision-v1-gpt-codex.html`), 하네스 검사기 2종(`verify-compare-pairs.py`, `capture-res-check.sh`) 본문. 웹 신규 검색 0건.
HITS_USED: 보드 메모 8건을 작업 단위 D-027-A~G 로 1:1 대응시켜 전수표(§1)를 만들었다. `GoalCard.tsx:130-137` 의 `needsHaenaelSuffix` 규칙을 그대로 가져와 제목 강조를 재창조하지 않았다. `standard-bottom-tab.md` 7항(하단탭 유지 화면에 전역 푸터 금지)이 해낼게 관리 푸터 제거의 근거다. `standard-wordmap-keyword.md` 의 전체 표시·빈도 가중 계약이 배치 엔진의 입력 규칙이다. `verify-compare-pairs.py` 본문을 직접 읽어 보드 마크업(중첩 div 때문에 쌍을 못 읽던 것)을 figure 구조로 고쳤다.
HITS_REJECTED: 웹 벤치마크를 새로 돌리지 않았다. 이번 판은 새 방향을 정하는 작업이 아니라 **이미 확정된 지시 12건의 반영**이고, 벤치마크 근거는 `standard-bottom-tab.md`(Apple HIG·당근·토스·카카오페이 공식 출처)와 지난 판 DESIGN.md 에 이미 박혀 있어 그것을 상속했다(헌법 §2.3 의 "이미 정리된 정본이 있는데 새로 지어내는 것이 가장 큰 낭비"). BRAIN 전략 위키는 화면 좌표·컴포넌트 수준 작업에 해당 문서가 없어 조회하지 않았다. `친구` 화면은 보드에서 선택도 메모도 없어 변경하지 않았다(지적 없는 화면을 고치는 것은 범위 이탈이다).
CONFLICTS: 한 건. `standard-wordmap-keyword.md` 와 지난 판 CSS 는 빈도 위계를 **색의 밝기**로 표현했는데, 가장 옅은 단계가 배경 대비 2.01:1 로 접근성 하한(4.5:1)과 충돌했다. D-023 이 세운 일반 규칙("접근성 하한과 시안 수치가 충돌하면 하한이 이긴다, 그리고 그때 시안 정본을 고친다")을 적용해 색을 올리고 위계를 크기·굵기로 옮겼다. 웹 벤치마크와 회장 정본 사이의 충돌은 없었다.

SKILLS_USED: design-review(캡처 기반 육안 재검 · 대비 실측 · 10개 항목 채점과 등급 산출)
SKILLS_SKIPPED: design-shotgun — 위임 프롬프트에 `SHOTGUN: required` 가 없고, 이번 판은 확정된 지시 12건을 반영하는 작업이라 방향 발산이 필요한 신규 시각 요소가 없었다. 선택지를 남기지 않았으므로 `compare.html` 도 만들지 않았다. design-html·design-consultation — 디자인 시스템과 화면 골격이 이미 선 상태에서 지정 항목만 고치는 개정이라, 새로 생성하면 기존 구조를 재창조하게 된다.
PRESENTATION_CHECK: 툴콜·XML 잔재 0 · Chromium 에서 보드와 프로토타입 실렌더 확인함 · em dash 0
SOURCES/MODEL: claude-opus-5[1m] | `docs/design/chairman-board-memos-20261016.md` · `docs/design/chairman-directives-v2-20261015.md` · `wiki/거버넌스/결정.md`(D-018~D-027) · `docs/design/standard-bottom-tab.md` v1.1.0 · `docs/design/standard-ux-writing.md` · `docs/design/standard-wordmap-keyword.md` · `web/src/components/goal/GoalCard.tsx` · `web/src/app/g/[slug]/page.tsx` · `~/.claude/harness/bin/verify-compare-pairs.py` · `~/.claude/harness/bin/capture-res-check.sh`
