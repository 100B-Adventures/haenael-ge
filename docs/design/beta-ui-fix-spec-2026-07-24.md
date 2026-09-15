<!--
문서 성격: 1차 베타 회장 직접 지적 UI 4건의 최소 수정 사양
라인: haenael-ge · 모델태그: gpt-codex · 에이전트: product-designer
범위 잠금: BETA-NG-01~04만. 코드·API·DB·v2 신규 기능·결제·다중 목표·카피 전면개편 제외.
-->

# 1차 베타 UI 4건 최소 수정 사양

## 0. 결론

이 문서는 현재 베타의 네 가지 표현 결함만 고친다.

1. 공개 목표 프로필에서 미완성 기호 `?`를 없앤다.
2. 내 응원 링크의 텍스트 복사 버튼을 식별 가능한 아이콘 버튼으로 바꾼다.
3. 본인에게만 보이는 개별 클로버 수 옆에 `나만 보임`을 명시한다.
4. 워드맵의 절대 좌표 배치를 흐름형 배치로 바꿔 실제 문자열 길이와 모바일 폭에서도 겹침·잘림을 없앤다.

기존 디자인 시스템, 데이터 의미, 화면 순서, 결제·환전·공개범위 규칙은 바꾸지 않는다.

### 구현 가능성 판정

- **BETA-NG-02~04:** 현행 컴포넌트와 데이터만으로 구현 가능.
- **BETA-NG-01의 `?` 제거와 무데이터 폴백:** 현행 컴포넌트만으로 구현 가능.
- **BETA-NG-01의 “카카오 프로필이 있으면 실제 사진·닉네임 표시”: 현재 금지조건 안에서는 구현 불가.** `member.profile_image`와 `member.nickname`은 DB에 있으나 공개 조회면 `goal_public`과 현재 `/g/[slug]` 응답에는 없고, anon은 `member`를 읽을 수 없다. API·DB를 바꾸지 않으면 친구 화면이 해당 값을 받을 경로가 없다.

> ⛔ 회수 필요: BETA-NG-01을 QA 트래커의 기존 해제 조건까지 닫으려면 plan을 reopen해 공개 프로필 전달 경계를 정해야 한다. 최소 선택지는 `goal_public`에 소유자 공개 프로필 두 필드를 투영하는 안과 목표 생성 시 공개 프로필 스냅샷을 별도로 두는 안이다. 이 문서에서는 둘 다 금지 범위이므로 확정하지 않는다. code-builder는 임의로 service role을 웹 페이지에 주입하거나 RLS를 우회하면 안 된다.

---

## 1. 기반과 관찰 증거

### 1.1 직접 확인한 현재 상태

- 프로덕션 모바일 캡처: `/private/tmp/haenael-beta-prod-goal.png`
  - 390×1059px, 2026-07-24 01:39 KST.
  - 프로필에 `?`와 `익명`이 노출된다.
  - 워드맵의 실제 토큰이 서로 겹치고 우측 경계에서 잘린다.
- `docs/qa/qa-tracker.md`의 BETA-NG-01~04는 모두 `❌ NG`로 등록돼 있다.
- `GoalCard`는 `nickname`이 없으면 `?`와 `익명`을 그린다.
- `/g/[slug]`는 `goal_public`에서 목표 정보만 읽고 `GoalCard`에 프로필 값을 전달하지 않는다.
- `MyLinkCard`는 clipboard/fallback/analytics/2초 성공 상태는 있으나 텍스트 버튼만 사용한다.
- `/home`의 `CheerItem`은 본인 한정 `🍀 N`을 그리지만 가시성 설명이 없다.
- `Wordmap`은 200px 고정 높이 안에서 문자열 폭과 무관한 절대 좌표·회전을 사용한다.

### 1.2 상속할 디자인 시스템

새 토큰을 만들지 않는다.

| 목적 | 기존 토큰/규칙 |
|---|---|
| 배경 | `--bg #FBFAF7`, `--surface #FFFFFF` |
| 선 | `--line #E8E4DC` |
| 본문 | `--ink #16140F`, `--muted #6F6A60`, `--faint #9C968B` |
| 브랜드 | `--clover #1B8A4F`, `--clover-soft #E7F4EC`, `--clover-ink #14613A` |
| 서체 | Pretendard 단일 패밀리 |
| 간격 | 4px grid, 화면 좌우 22px |
| radius | `sm 12`, `md 14`, `lg 20`, `full`만 |
| 모션 | 120~200ms ease-out, 완료 피드백 1회 |

브랜드 형용사 발현도 그대로 유지한다.

| 형용사 | 이번 수정에서의 발현 |
|---|---|
| 조용한 | 복사 성공은 체크 1회, 프라이버시 라벨은 작고 명료하게, 과한 배지 없음 |
| 따뜻한 | 무데이터 프로필은 물음표 대신 클로버 표식, 워드맵은 기존 그린 계열 유지 |
| 믿음직한 | 본인 전용 정보에 가시성 라벨, 아이콘 버튼에 명시적 접근성 이름, 문자열 경계 보장 |

---

## 2. 변경하지 않을 기존 기능

### 2.1 공개 목표 페이지 `/g/[slug]`

- 비로그인 SSR 열람.
- 잘못된 slug의 not-found 경로.
- 삭제된 목표 안내와 `나도 목표 만들기`.
- 본인 세션의 OwnerBar와 비로그인 재로그인 힌트.
- 목표 제목·WHY·D-day·상태 칩.
- 공개 `N명` 응원 수와 금액 비노출.
- 신고 버튼.
- 결제 CTA와 결제 kill switch.
- `나도 해낼게 만들래` 역할 전환.
- 하단 fixed CTA와 safe-area 처리.

### 2.2 받는 사람 홈 `/home`

- 비로그인 리다이렉트와 목표 없음 온보딩 리다이렉트.
- 현재 최신 목표 1개를 쓰는 기존 베타 동작.
- 알림·로그아웃·HomeSeenTracker.
- 목표 제목·D-day·상태.
- 내 응원 링크의 실제 URL 생성, clipboard API, textarea fallback, analytics 이벤트.
- 계정 전체 클로버 잔액, 원화 등가 보조표기, 환전 임계 판정.
- 응원 목록 최근순 고정, 익명 처리, 메시지, 본인 한정 개별 클로버 수.
- 기존 홈 워드맵 미니 프리뷰.
- 하단 `워드맵 보기` CTA.

### 2.3 워드맵

- `get_wordmap`의 기존 입력·응답 계약.
- 0건 empty state.
- 최대 12개 표시.
- 빈도에 따른 3단계 타이포 위계.
- 그린 단색 계열과 옅은 clover radial 배경.
- 공개 페이지와 소유자 풀뷰에서 같은 `Wordmap` 컴포넌트 사용.
- 금액 비노출.

---

## 3. 컴포넌트별 수정 사양

## 3.1 BETA-NG-01 — 공개 프로필 `?` 제거

### 대상

- 표현: `web/src/components/goal/GoalCard.tsx`
- 연결: `web/src/app/g/[slug]/page.tsx`
- 이 문서의 입력 파일에는 포함되지 않았지만 실제 `?`의 렌더 원점이 `GoalCard.tsx`라 변경 대상에 포함한다.

### 현재 원인

1. `GoalCard`의 프로필 props는 선택값이다.
2. `/g/[slug]`가 해당 props를 전달하지 않는다.
3. props가 없으면 `AvatarPlaceholder`는 `?`, 이름은 `익명`을 표시한다.
4. `익명`은 응원자 익명성 용어인데 목표 소유자에게도 재사용돼 의미가 섞인다.

### 표시 우선순위

| 우선순위 | 받은 데이터 | 아바타 | 이름 |
|---|---|---|---|
| 1 | 유효한 `profileImageUrl` + nickname | 실제 이미지 56×56 | nickname |
| 2 | 이미지 없음/로드 실패 + nickname | nickname의 첫 사용자 인식 문자 | nickname |
| 3 | 이미지·nickname 모두 없음 | 클로버 단색 표식 | `해낼게 사용자` |

### 표현 규칙

- 아바타 크기 56×56, `radius-full`.
- 실제 이미지는 1:1 `object-fit: cover`.
- 이미지 테두리는 현재 흰색 3px + clover-soft 1px 링을 유지한다.
- 실제 이미지 옆에 nickname이 이미 보이므로 이미지는 장식 처리 `alt=""`.
- 이미지 로드 실패는 동일 렌더 세션에서 nickname 이니셜 또는 클로버 폴백으로 전환한다.
- nickname은 앞뒤 공백을 제거한 뒤 비어 있으면 없는 값으로 취급한다.
- 이니셜은 `Array.from(trimmedNickname)[0]`에 해당하는 첫 사용자 인식 문자 1개만 쓴다.
- `?`, `익명`, 깨진 이미지 아이콘은 목표 소유자 프로필에서 금지한다.
- 기존 `해낼게 목표` 보조 문구는 유지한다.
- 아바타 gradient는 DESIGN.md의 단색 원칙과 충돌하므로 폴백 배경은 `--clover-soft` 단색으로 정리한다. 다른 요소는 바꾸지 않는다.

### 상태

| 상태 | 결과 |
|---|---|
| loading | 서버 렌더 범위에서 별도 skeleton을 추가하지 않는다. 현재 SSR 구조 유지 |
| 이미지 정상 | 사진 + nickname |
| 이미지 URL 없음 | 이니셜 + nickname |
| 이미지 로드 실패 | 깨진 이미지 대신 즉시 이니셜 + nickname |
| nickname까지 없음 | 클로버 표식 + `해낼게 사용자` |
| 데이터 조회 실패 | 무데이터 폴백과 동일. 공개 페이지 자체는 계속 열림 |

### 수용 기준

- [ ] 프로필 데이터가 없는 공개 목표에서 `?`와 `익명`이 0회 노출된다.
- [ ] 무데이터 상태에서 클로버 표식과 `해낼게 사용자`가 보인다.
- [ ] nickname만 있는 fixture에서 첫 문자와 전체 nickname이 보인다.
- [ ] 잘못된 이미지 URL fixture에서 깨진 이미지 아이콘 없이 nickname 폴백이 보인다.
- [ ] 사진이 실제로 전달되는 fixture에서는 56×56 사진이 찌그러지지 않는다.
- [ ] 공개 화면의 금액 비노출, OwnerBar, 신고, 결제 CTA가 그대로다.
- [ ] **현재 금지 범위에서는 실프로덕션 카카오 사진 표시를 QA 해제 근거로 삼지 않는다.** 전달 경로가 없으므로 미검증이 아니라 구조적 미구현이다.

---

## 3.2 BETA-NG-02 — MyLinkCard 복사 아이콘

### 대상

- `web/src/components/goal/MyLinkCard.tsx`

### 컴포넌트 형태

기존 텍스트 버튼의 자리를 **44×44 아이콘 버튼**으로 바꾼다.

| 상태 | 아이콘 | 배경 | 아이콘색 | 접근성 이름 |
|---|---|---|---|---|
| default | `Copy`, 18px, stroke 1.8 | `--clover-soft` | `--clover-ink` | `내 응원 링크 복사` |
| hover/focus | Copy | clover-soft 유지 | clover-ink | 동일 |
| press | Copy | clover-soft | clover-ink | 동일 |
| copied, 2초 | `Check`, 18px | `--clover` | white | `내 응원 링크 복사됨` |
| error | Copy | `--danger-soft` | `--danger` | `내 응원 링크 복사 다시 시도` |

### 표현·인터랙션 규칙

- radius는 임의 `10px` 대신 기존 `sm 12px`.
- 버튼은 URL 우측에 남고 카드의 세로·가로 정보 구조는 유지한다.
- 아이콘은 프로젝트에 이미 설치된 `lucide-react`의 `Copy`, `Check`를 우선한다. 새 SVG 스타일을 만들지 않는다.
- 아이콘은 장식 처리하고 버튼 자체에 `aria-label`을 둔다.
- 시각 텍스트가 사라지므로 `span.sr-only`로 현재 상태 문구를 둔다.
- keyboard focus-visible은 2px clover 계열 ring이 보여야 한다.
- 성공 상태는 기존처럼 2초 뒤 default로 돌아간다.
- clipboard API 성공·textarea fallback 성공 모두 동일한 성공 상태와 `share_link_copied` 이벤트를 유지한다.
- fallback의 `document.execCommand("copy")` 반환값이 `false`면 성공으로 표시하지 않는다.
- 두 복사 경로가 모두 실패하면 카드 아래 한 줄로 `복사하지 못했어요. 링크를 길게 눌러 복사해 주세요.`를 표시하고 URL 텍스트는 선택 가능해야 한다.
- 오류 원문·브라우저 예외 문자열은 노출하지 않는다.

### 수용 기준

- [ ] 390px에서 URL이 말줄임돼도 44×44 버튼이 줄어들지 않는다.
- [ ] default에 Copy 아이콘, 성공 2초 동안 Check 아이콘이 보인다.
- [ ] 버튼의 accessible name이 상태별로 존재한다.
- [ ] 클릭 후 clipboard에 표시 중인 `origin + /g/{slug}` 전체 문자열이 정확히 들어간다.
- [ ] clipboard API 실패 fixture에서 textarea fallback이 같은 URL을 복사한다.
- [ ] 두 경로 실패 fixture에서 성공 표시·analytics 이벤트가 발생하지 않고 복구 문구가 보인다.
- [ ] `data-testid="my-link-copy-button"`과 analytics source `home_my_link_card`는 유지한다.

---

## 3.3 BETA-NG-03 — 개별 클로버 `나만 보임` 라벨

### 대상

- `web/src/app/(receiver)/home/page.tsx` 안 `CheerItem`

### 배치

현재 우측 `🍀 N` 단독 span을 아래의 세로 메타 그룹으로 바꾼다.

```text
익명의 누군가             🍀 3
먼저 응원할게             나만 보임
```

### 표현 규칙

- 우측 그룹은 `flex-shrink: 0`, `min-width: 58px`, 오른쪽 정렬.
- `🍀 N`: 기존 11.5px/700, `--clover-ink` 유지.
- `나만 보임`: 10.5px/500, `--muted`. 핵심 프라이버시 정보라 `--faint`를 쓰지 않는다.
- 두 줄 간격 2px.
- 자물쇠·눈 아이콘은 추가하지 않는다. 텍스트가 의미를 직접 전달하고 반복 행의 시각 소음을 줄인다.
- screen reader용 전체 이름은 `클로버 N개, 나만 보임`.
- 라벨은 **소유자 `/home`의 개별 응원 행에만** 존재한다.
- 응원 목록 section 제목, 정렬, 메시지 truncate, 익명명, 아바타, 행 높이의 나머지 값은 유지한다.

### 상태

| 상태 | 결과 |
|---|---|
| 응원 1건 이상 | 모든 개별 `🍀 N` 바로 아래 `나만 보임` |
| 응원 0건 | 라벨 없음. 설명할 개별 값이 없으므로 별도 빈 라벨을 만들지 않음 |
| 익명 응원 | 이름은 기존 `익명의 누군가`, 개수와 라벨은 소유자에게 그대로 표시 |
| 메시지 없음 | 이름 + 우측 메타만 표시 |
| 로드 실패 | 이번 수정 범위 밖. 기존 페이지 동작 유지 |

### 수용 기준

- [ ] 소유자 `/home`의 모든 `cheer-item-amount`에 `나만 보임`이 인접한다.
- [ ] 390px에서 이름·메시지가 먼저 줄어들고 우측 개수·라벨은 잘리지 않는다.
- [ ] 응원 목록 정렬은 최근순이며 금액순 정렬·랭킹 UI가 없다.
- [ ] 원화 환산은 개별 응원 행에 없다.
- [ ] 공개 `/g/[slug]`에는 개별 클로버 수와 `나만 보임`이 모두 0회다.
- [ ] 익명 응원도 소유자에게는 개수+라벨이 보인다.

---

## 3.4 BETA-NG-04 — 워드맵 겹침·잘림 제거

### 대상

- `web/src/components/goal/Wordmap.tsx`
- 소비 화면: `web/src/app/g/[slug]/page.tsx`, `web/src/app/(receiver)/wordmap/[goalId]/page.tsx`
- `/home`의 별도 미니 프리뷰 구현은 이 수정에서 건드리지 않는다.

### 버릴 방식

- 문자열 폭과 무관한 `POSITIONS`.
- `position: absolute`.
- 회전값.
- 내용과 무관한 고정 `height: 200px`.

### 채택할 최소 방식: 빈도 위계가 있는 흐름형 워드맵

새 라이브러리나 canvas 충돌 엔진을 추가하지 않고 브라우저 레이아웃을 사용한다.

#### 1) 입력 정규화

1. `word`를 Unicode NFC로 정규화한다.
2. 앞뒤 공백 제거, 내부 연속 공백은 한 칸으로 줄인다.
3. 결과가 빈 문자열이면 제외한다.
4. 완전히 같은 문자열이 여러 항목으로 들어오면 `word_count`를 합쳐 1개로 만든다.
5. `word_count` 내림차순, 동률이면 최초 입력 순서를 유지한다.
6. 상위 12개만 표시한다.

API·RPC·DB는 바꾸지 않는다.

#### 2) 크기 규칙

| 조건 | size | weight | color |
|---|---:|---:|---|
| 단어 1개 | 24px | 800 | `#1A8150` |
| 모든 count가 같음 | 전부 18px | 700 | `#57A178` |
| 정규화 비율 0.67 이상 | 24px | 800 | `#1A8150` |
| 0.34 이상 0.67 미만 | 18px | 700 | `#57A178` |
| 0.34 미만 | 14px | 600 | `#8BB79F` |

정규화 비율은 `(count - minCount) / (maxCount - minCount)`이다. `maxCount === minCount`일 때는 위 동률 규칙을 쓴다.

현재처럼 모든 단어의 count가 1인 초기 데이터에서 전부 최대 크기가 되는 문제를 막는다.

#### 3) 레이아웃 규칙

- 컨테이너: `display:flex`, `flex-wrap:wrap`, `justify-content:center`, `align-content:center`.
- 컨테이너: width 100%, `min-height:200px`, **height auto**.
- 내부 padding: 세로 20px, 가로 16px.
- gap: row 10px, column 12px.
- 각 단어: normal flow의 `inline-flex`, `max-inline-size:100%`, 가운데 정렬.
- 각 단어: `white-space:normal`, `overflow-wrap:anywhere`, line-height 1.35.
- 회전 0도. transform 없음.
- 컨테이너의 기존 clover radial 배경과 radius는 유지한다.
- 전체 문자열을 표시한다. 임의 글자 수 truncate나 말줄임표를 쓰지 않는다.
- 390px 화면에서 페이지 좌우 22px와 워드맵 내부 16px를 빼면 실문자 가용폭은 314px이다. 단어 박스는 이 폭을 넘지 않고 긴 문자열은 자기 박스 안에서 줄바꿈한다.
- 내용이 여러 줄이 되면 컨테이너가 아래로 자란다. 고정 높이에 맞추려고 단어를 자르거나 겹치지 않는다.

#### 4) 의미·접근성

- 컨테이너 `aria-label`은 `응원 메시지 워드맵, 전체 N개 중 M개 표시`로 한다.
- 각 단어는 화면에 실제 텍스트가 있으므로 별도 중복 `aria-label`을 만들지 않는다.
- 장식 목적의 배경은 접근성 트리에 넣지 않는다.
- 12개 초과 입력에서 숨긴 개수는 시각 배지로 추가하지 않는다. 현재 UI 밀도를 유지한다.

### 상태

| fixture | 결과 |
|---|---|
| 0개 | 기존 EmptyWordmap 유지 |
| 1개 | 중앙 24px, 전체 문자열 표시 |
| 서로 다른 count 반복 | 빈도별 14/18/24px |
| 모든 count 동일 | 전부 18px, 안정적인 flow |
| 동일 문자열 중복 항목 | count 합산 후 토큰 1개 |
| 한글 장문 | 314px 안에서 줄바꿈, 전체 문자열 표시 |
| 공백 없는 영문 장문 | `overflow-wrap:anywhere`로 줄바꿈 |
| 12개 | 전부 normal flow, 컨테이너 자동 높이 |
| 13개 이상 | 정렬 후 상위 12개만 표시, 겹침·잘림 없음 |

### 수용 기준

- [ ] 320, 390, 430px viewport에서 가로 스크롤이 없다.
- [ ] 390px에서 프로덕션 캡처의 실제 단어 fixture가 서로 겹치지 않고 경계 밖으로 나가지 않는다.
- [ ] DOM의 모든 표시 단어 bounding box 쌍이 교차하지 않는다.
- [ ] 모든 표시 단어의 bounding box가 워드맵 content box 안에 있다.
- [ ] 0/1/동률 반복/한글 장문/영문 장문/12개/13개 fixture가 모두 통과한다.
- [ ] 공개 페이지와 소유자 풀뷰 양쪽에서 같은 기준을 통과한다.
- [ ] `get_wordmap` 호출, 최대 12개 정책, empty 카피, 금액 비노출은 유지된다.
- [ ] 새 런타임 의존성을 추가하지 않는다.

---

## 4. 코드빌더 변경 맵

| 파일 | 허용 변경 | 금지 변경 |
|---|---|---|
| `web/src/components/goal/GoalCard.tsx` | 프로필 props·이미지/이니셜/클로버 폴백 | 제목·WHY·D-day·상태 구조 변경 |
| `web/src/app/g/[slug]/page.tsx` | 현재 공개 응답에 프로필 값이 실제로 존재할 때만 props 연결 | service role 도입, RLS 우회, query/API/DB 계약 변경 |
| `web/src/components/goal/MyLinkCard.tsx` | Copy/Check 아이콘, 접근성 상태, 실패 피드백 | URL 생성·analytics source·fallback 제거 |
| `web/src/app/(receiver)/home/page.tsx` | `CheerItem` 우측 메타 그룹과 라벨 | 쿼리·정렬·잔액·환전·헤더·목표 구조 변경 |
| `web/src/components/goal/Wordmap.tsx` | 입력 정규화, tier, flex-wrap 레이아웃 | RPC 계약·데이터 소스·empty 카피·공개 금액 규칙 변경 |

코드빌더는 위 파일 밖으로 변경을 넓히지 않는다. 테스트 파일 추가·보정은 각 컴포넌트의 기존 테스트 위치에 한정한다.

---

## 5. QA 인수 기준

### 5.1 필수 자동 검증

- `GoalCard`
  - 데이터 없음 → `?`/`익명` 없음.
  - nickname만 → 이니셜+nickname.
  - 이미지 실패 → 폴백.
- `MyLinkCard`
  - default/success/error accessible name.
  - 실제 clipboard 문자열.
  - fallback 성공/실패.
- `ReceiverHome`
  - 개별 클로버 옆 `나만 보임`.
  - 공개 화면 비노출 회귀.
- `Wordmap`
  - 0/1/동률/중복/장문/12/13개 fixture.
  - bounding box 교차 0.
  - content box 이탈 0.

### 5.2 필수 직접 관찰

1. production-mode 브라우저를 390×844 viewport로 연다.
2. `/g/{실제 slug}`에서 프로필 폴백, 워드맵, 신고, 결제 CTA를 한 화면 흐름으로 확인한다.
3. `/home`에서 링크 아이콘 복사 후 실제 clipboard 문자열을 읽어 URL과 대조한다.
4. `/home`의 익명·실명 응원 행 모두에서 `🍀 N / 나만 보임`을 확인한다.
5. `/wordmap/{goalId}` 풀뷰에서 같은 워드맵 fixture의 겹침·잘림 0을 확인한다.
6. stage에서 끝내지 않고 prod 반영 뒤 같은 4경로를 다시 캡처한다.

빌드·unit·2xx만으로 BETA-NG를 해제하지 않는다. 각 NG의 기존 QA 트래커 행은 위 직접 관찰 증거가 붙은 뒤에만 `🔧` 또는 `✅`로 전환한다.

---

## 6. 금지 패턴

- 새 색·서체·radius·그림자 시스템 발명.
- 프로필을 `?`, `익명`, generic 사람 실루엣으로 표시.
- 웹 서버에 service role secret 추가.
- 공개 member SELECT 허용 또는 RLS 완화.
- 복사 아이콘만 두고 accessible name 제거.
- 클로버 수를 원화로 바꾸거나 공개 화면에 노출.
- `나만 보임`을 공개 화면에 표시.
- 워드맵에 absolute 좌표·회전·랜덤 배치 재도입.
- 긴 단어를 `overflow:hidden`으로 조용히 자르기.
- 워드맵 개선을 핑계로 메시지 필터·moderation·카피 개편 추가.
- v2 마이페이지·다중 목표·결제·환전 변경.

---

## 7. 레드팀과 셀프심문

### 7.1 레드팀 — 까다로운 고객 관점

**공격:** “사진을 보여준다더니 실제로는 또 클로버 폴백만 보이는 것 아닌가? 그리고 워드맵을 flex-wrap으로 바꾸면 구름이 아니라 태그 모음처럼 보이지 않나?”

**판정:** 첫 공격은 유효하다. 현재 공개 데이터 계약에는 사진·닉네임이 없어서 UI만으로 실제 카카오 프로필을 복원할 수 없다. 이를 숨기고 “프로필 해결”로 출고하면 QA 조건을 위조한다. 그래서 `?` 제거와 실제 프로필 연결을 분리하고 후자를 `⛔ 회수 필요`로 올렸다.

두 번째 공격은 일부 유효하지만 이번 범위에서는 flow가 맞다. 현재 베타 데이터는 최대 12토큰이고 우선순위는 “구름의 유기성”보다 “겹침·잘림 0”이다. 빈도 크기·그린 톤·중앙 정렬로 워드맵 정체성을 남기고, 랜덤·canvas·spiral 의존성은 추가하지 않는다.

### 7.2 셀프심문 — 이 사양이 틀렸다면 가장 그럴듯한 이유는?

**질문:** “고정 높이를 없애면 워드맵이 길어져 fixed 결제 CTA와 충돌하고, 결국 다른 회귀를 만들지 않는가?”

**자답:** 가능하다. 하지만 12개·24px 상한·10px row gap이면 390px에서 예상 높이는 수백 px 이내이며 페이지 본문은 이미 스크롤되고 하단 `pb-32`가 fixed CTA 공간을 확보한다. 잘라서 200px에 맞추는 것보다 내용 높이를 정직하게 반영하는 편이 안전하다.

**수정 반영:** 워드맵은 `height:auto`만 두지 않고 `최대 12개`, `24px 상한`, `row gap 10px`, 기존 페이지 `pb-32` 보존을 함께 잠갔다. QA에는 public page와 fullview 양쪽의 bounding box 및 fixed CTA 가림 여부 직접 관찰을 추가한다.

---

## 8. 벤치마크 — 차용·변경·비차용

| 출처 | 확인한 원리 | 차용 | 해낼게에서의 변경 |
|---|---|---|---|
| [Atlassian Avatar](https://atlassian.design/components/avatar/) | avatar는 사용자·엔티티의 시각 표현 | 프로필 영역을 명확한 사용자 표현으로 취급 | 데이터 없음을 `?`로 드러내지 않고 브랜드 폴백 사용 |
| [W3C WAI Images](https://www.w3.org/WAI/tutorials/images/) | 정보 이미지에는 대체텍스트, 인접 텍스트가 같은 의미를 주는 장식 이미지는 빈 alt 가능 | 사진 옆 nickname이 있으므로 중복 낭독 방지 | 프로필 사진 자체를 버튼으로 만들지 않음 |
| [WAI Accessible Names](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/) | interactive element는 명시적 accessible name 필요, 가능하면 visible text 선호 | 아이콘 버튼에 상태별 aria-label과 sr-only 상태 | 회장 요구대로 시각은 아이콘화하되 접근성 이름은 유지 |
| [d3-cloud](https://github.com/jasondavies/d3-cloud) | 큰 단어부터 배치하고 기존 단어와 충돌 검사, 실패하면 spiral의 다음 위치 탐색 | “문자열 실제 크기를 고려해야 한다”는 원리 | 12토큰 모바일 베타에는 canvas·spiral이 과함. dependency 없는 browser flow로 단순화 |
| [MDN flex-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/flex-wrap) | wrap은 flex item을 여러 줄로 배치한다 | 실제 렌더 폭 기반 자동 줄바꿈 | 고정 좌표·회전 제거, 긴 문자열은 전체 표시 |

---

## 9. 디자인 자체 검수

### 수동 Design Score: B+

자동 `design-review` 스킬은 현재 Codex 세션의 사용 가능 스킬 목록에 없어 실행하지 못했다. 아래는 디자인 품질헌법에 따른 수동 대체 판정이며 자동 스킬 통과 주장으로 해석하면 안 된다.

| 축 | 판정 |
|---|---|
| 디자인 시스템 상속 | A — 신규 토큰 0, 기존 색·타입·간격·radius 재사용 |
| 범위 통제 | A — 4건 외 기능 확장 금지와 파일별 금지선 명시 |
| 상태 완전성 | B+ — 네 변경의 default/success/error/empty/장문 상태 명시 |
| 접근성 | B+ — 아이콘 이름·이미지 alt·긴 문자열·focus 기준 명시 |
| 구현 명료성 | A- — 수치·우선순위·fixture·수용기준 명시 |
| 직접 시각 검증 | 미검증 — 이 문서는 사양이며 코드·프로토타입을 만들지 않았다 |

다음 stage 가능 여부: **BETA-NG-02~04와 BETA-NG-01 폴백 구현은 가능. BETA-NG-01의 실제 카카오 프로필 표시까지 포함한 4건 전체 QA 해제는 plan 회수 전 불가.**

---

SKILLS_USED: 없음

SKILLS_SKIPPED: 현재 제공된 스킬 목록에 product-design/design-review/design-html 계열이 없음. 브랜드 재정의·랜딩 카피·이미지 생성 과업이 아니므로 brand-positioning-kit, landing-page-conversion-copy, imagegen은 부적합. 대신 `/Users/sj/.claude/standards/design.md`, `benchmarks.md`, `artifact-stamp.md`를 직접 적용.

SOURCES/MODEL:
- MODEL: gpt-5.6-sol · model tag: gpt-codex · agent: product-designer
- 상류 산출물: `docs/plan/backlog-2026-07-20.md`, `docs/plan/prd-haenael-ge-v0.3.0.md`, `DESIGN.md`, `docs/eng-design/build-log.md`, `docs/qa/qa-tracker.md`, `docs/design/user-flow.md`
- 현재 구현: `web/src/app/g/[slug]/page.tsx`, `web/src/app/(receiver)/home/page.tsx`, `web/src/app/(receiver)/wordmap/[goalId]/page.tsx`, `web/src/components/goal/GoalCard.tsx`, `MyLinkCard.tsx`, `ShareLinkCard.tsx`, `Wordmap.tsx`, `WordmapShareIcons.tsx`
- 데이터 경계 확인: `supabase/migrations/20260705163137_init_schema.sql`, `20260719000000_cheer_amount_privacy.sql`, `web/src/lib/supabase/database.types.ts`, `supabase/functions/_shared/oauth-kakao.ts`, `supabase/functions/auth-kakao/index.ts`
- 관찰 증거: `/private/tmp/haenael-beta-prod-goal.png` (390×1059)
- 외부 근거: Atlassian Avatar, W3C WAI Images/APG, d3-cloud, MDN flex-wrap — §8 URL

🏷 STAMP | line: haenael-ge | 생성: 2026-07-24 02:05 KST | model: gpt-5.6-sol (gpt-codex) | agent: product-designer
skills: 없음(매칭 product-design 스킬 미제공) | 근거: DESIGN.md 토큰 상속 · production 390px 캡처 · repo 상류/구현 15개+ · WebSearch/공식문서 5건
고민: 실제 프로필은 기존 공개 데이터 경계로 전달할 수 없음을 숨기지 않고, `?` 제거용 폴백과 plan reopen이 필요한 실제 사진 연결을 분리했다.
