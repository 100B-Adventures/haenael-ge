# 해낼게 — SNS 플랫폼별 비주얼·규격·소개문 정본 (신규 채널 배치판)

> 상위 정본: [`../channel-identity-kit.md`](../README.md 경유) 실제 파일은 `wiki/1-team-brand/channel-identity-kit.md`(인스타·스레드·유튜브 3플랫폼 확정판). 이 문서는 그 밖의 신규 채널(X·페이스북·틱톡)과 유튜브 배너 v2·프로필 원형 안전판을 **같은 톤·같은 D-005/D-006 정본 자산을 상속**해 확장한 배치판이다. 충돌 시 channel-identity-kit.md가 우선하고, 이 문서는 새 채널의 착지 근거를 남긴다.
> 착수 배경: 회장 지시(2026-09-25) "SNS 세팅 쭉 진행 — 프로필·배너·소개·로고 등등".

---

## 0. 원칙 — 무엇을 상속했고 무엇을 새로 판단했나

- **재창조 금지**: 클로버 마크(`profile-icon.png`, D-006)·톤(웜페이퍼 #FBFAF7·클로버그린 #1B8A4F/#1F9E5A·Pretendard)·슬로건("응원은 돈으로 하는 겁니다.")·사진뱅크(`photo-bank/*`, 힉스필드 기존 생성물)를 그대로 재사용했다. 신규 인물·신규 마크 생성 없음.
- **신규 판단이 필요했던 지점**: channel-identity-kit.md는 인스타·스레드·유튜브 3플랫폼만 정의한다. X·페이스북·틱톡은 미정의라 §1 채널 역할 분담표의 논리(도발 강도·슬로건 노출면 판정)를 이 표의 판정 기준에 **유추 적용**했다. 아래 §2에서 판정 근거를 명시한다 — 회장이 다르게 보면 뒤집을 수 있는 [실험] 표기.

---

## 1. 규격표

| 플랫폼 | 자산 | 파일 | 픽셀 | 안전영역 | 형식 | 출처 |
|---|---|---|---|---|---|---|
| X (트위터) | 헤더 배너 | `x-header-1500x500.png` | 1500×500 (3:1) | 중앙~우상단 안전, **좌하단 20%는 프로필 원과 겹침 — 텍스트 금지**. 상하 약 60px는 일부 화면에서 크롭됨 | JPG/GIF/PNG | [influencermarketinghub.com/twitter-image-size](https://influencermarketinghub.com/twitter-image-size/), [nealschaffer.com/twitter-banner-size](https://nealschaffer.com/twitter-banner-size/) |
| 페이스북 | 페이지 커버 | `facebook-cover-1640x856.png` | 1640×856 (고해상도 2배, 표시는 desktop 820×312 / mobile 640×360) | **중앙 820×312**가 항상 보장 노출. 외곽은 기기별로 잘릴 수 있어 장식만 | JPG/PNG, sRGB, 100KB 이하 권장 | [socialsizes.io/facebook-cover-photo-size](https://socialsizes.io/facebook-cover-photo-size/) |
| 틱톡 | 프로필 사진 | `tiktok-profile-200x200.png` | 200×200 표시(720×720 업로드 권장), 1:1 | **항상 원형 크롭** — 사각형 모서리 4곳은 안 보임 | JPG/PNG, 10MB 이하 | [socialsizes.io/tiktok-profile-picture-size](https://socialsizes.io/tiktok-profile-picture-size/) |
| 유튜브 | 채널 배너 v2 | `youtube-banner-2560x1440-v2.png` | 2560×1440 | **중앙 1546×423**(x 507~2053, y 509~931)만 全기기 보장. 나머지는 데스크톱/모바일/TV마다 다르게 크롭 | JPG/PNG/BMP/TIFF, 6MB 이하 | 기존 D-005 확정 배너와 동일 안전영역 좌표 계승 |
| 전 채널 공통 | 프로필 아이콘 원형 안전판 | `profile-icon-round-safe.png` | 400×400 | 원형 크롭 대응 — 클로버가 원 안쪽 72% 반경 내 배치 | PNG | D-006 정본 상속 |

---

## 2. 슬로건·톤 노출 판정 — 신규 채널 3종

channel-identity-kit.md §0의 논리(퍼널 역할 → 도발 강도 → 슬로건 노출)를 그대로 적용한다.

| 채널 | 퍼널 역할 판정 | 슬로건 노출 | 판정 근거 |
|---|---|---|---|
| X | 텍스트 중심 담론 플랫폼 — 스레드와 성격 최유사(의심 해소·창업자 목소리 무대) | **○** (배너에 슬로건 배지 노출) | 스레드가 "슬로건 도발 카피 주 무대"(§0 표)인 것과 같은 논리. X도 브랜드 계정의 1차 열람자가 도경(주인공 후보)보다 관찰자·응원자·타 창업자에 가까울 것으로 판단(콜드 팔로워 유입보다 담론 유입이 크다는 X 플랫폼 특성) [실험] |
| 페이스북 | 일반 대중·연령대 넓은 채널 — 인스타(주인공 유입 본진)와 성격 유사 | **✗** (배너에 슬로건 미노출, "말하면 시작된다" 선언 카피로 대체) | 인스타 바이오가 "허용되지만 자제"(§2 판정)인 논리를 그대로 적용. 페이스북은 인스타보다도 더 일반적 연령대라 "돈 걷는 곳" 프레임 리스크가 동일하거나 더 큼 |
| 틱톡 | 숏폼 개인 서사 — 스레드처럼 도발적 후킹이 스크롤 정지 효과를 냄 | **○** (프로필 소개문에 슬로건 정면 배치) | `tiktok-cover-note.md` 참조. 스레드 판정과 동일 논리 |
| 유튜브 배너 v2 | 기존 D-005 확정 유지 | **○** (변경 없음) | 상위 정본 그대로 계승 |

**⛔ 회수 필요 아님, [실험] 표기 — 회장 확인 권장**: X·틱톡의 슬로건 노출 판정은 channel-identity-kit.md에 명시된 결정이 아니라 이 문서가 유추한 확장이다. 8주 후 각 채널 반응(도경형 유입 vs 돈 프레임 이탈)을 보고 뒤집을 수 있는 잠정값으로 취급한다.

---

## 3. 소개문(bio) 초안 — 글자수 제한 명시

### 3-1. X 프로필 소개 (160자 제한)

```
응원은 돈으로 하는 겁니다.
친구가 선언한 목표에, 조용히 돈으로 응원하고 갑니다 🍀
제작기 연재 중. 만드는 과정 전부 공개
```
(63자, 160자 여유. 톤 = channel-identity-kit.md §2-2 스레드 바이오와 동일: 슬로건 정면, 제작기 언급으로 신뢰 선납)

### 3-2. 페이스북 페이지 소개 (255자 제한, "정보" 탭 별도)

```
말하면 시작된다. 해낼게 🍀
친구의 목표 선언에, 조용히 마음을 두고 가는 곳입니다.
공부, 다이어트, 자격증까지 어떤 목표든 선언하면 친구들이 조용히 클로버로 응원해요.
```
(85자. 톤 = channel-identity-kit.md §2-1 인스타 바이오와 동일: 돈 단어 0, 슬로건 없음, 선언·응원 프레임)

### 3-3. 틱톡 프로필 소개 (80자 제한)

`tiktok-cover-note.md` §소개문 참조 (66자, 슬로건 정면 배치).

---

## 4. 어느 파일을 어디에 올리는지 — 매핑표

| 콘솔 위치 | 올릴 파일 | 비고 |
|---|---|---|
| X → 프로필 편집 → 헤더 사진 | `x-header-1500x500.png` (v2, 안전영역 수정 완료) | 업로드 후 모바일 앱에서 하단 크롭 재확인(추측 금지, 실 업로드 후 캡처 확인). 검증용(업로드 금지, 참고만) = `x-header-safearea-check.png` |
| X → 프로필 편집 → 프로필 사진 | `profile-icon-round-safe.png` (또는 기존 `profile-icon.png`, 둘 다 원형 크롭 안전) | X도 원형 크롭 |
| 페이스북 페이지 → 페이지 설정 → 커버 사진 편집 | `facebook-cover-1640x856.png` | 데스크톱/모바일 미리보기 둘 다 확인 |
| 페이스북 페이지 → 프로필 사진 편집 | `profile-icon-round-safe.png` | 원형 크롭 |
| 틱톡 앱 → 프로필 편집 → 사진 변경 | `tiktok-profile-200x200.png` | 배너 없음, `tiktok-cover-note.md` 참조 |
| 유튜브 스튜디오 → 맞춤설정 → 브랜딩 → 배너 이미지 | `youtube-banner-2560x1440-v2.png` (기존 `youtube-banner.png`와 A/B 후 택1) | 안전영역 1546×423 실측 완료(좌표 계산), 모바일 크롭은 studio 미리보기로 재확인 권장 |
| 유튜브 스튜디오 → 브랜딩 → 사진 | `profile-icon-round-safe.png` (기존 `profile-icon.png`도 안전, 이미 원형 크롭 여유 있음) | 기존 채널 이미 적용됨(컨트롤러 세팅 완료) |

---

## 4-1. 토큰 진실원 대조 (컨트롤러 반려 대응, 2026-09-25 재검증)

**Read 증거**: `DESIGN.md`(1~90행, `colors:` 블록·`typography.wordmark` 블록)와 `web/src/app/globals.css`(1~93행, `:root` CSS 변수 블록)를 직접 Read했다. 두 파일은 동일 정본값을 쓴다(globals.css 주석 "DESIGN.md 토큰 (single source of truth)").

**진실원 값 (Read 원문)**:

| 토큰명 | DESIGN.md | globals.css | 
|---|---|---|
| background | `#FBFAF7` | `--background: #FBFAF7` |
| foreground | `#16140F` | (foreground 변수, 동일값) |
| primary(clover) | `#1B8A4F` | `--primary: #1B8A4F` `--clover: #1B8A4F` |
| clover-bright | `#1F9E5A` | `--clover-bright: #1F9E5A` |
| clover-soft | `#E7F4EC` | `--accent: #E7F4EC` `--clover-soft: #E7F4EC` |
| clover-ink | `#14613A` | `--accent-foreground: #14613A` `--clover-ink: #14613A` |
| warm | `#F4EFE6` | `--secondary/--muted: #F4EFE6` |
| muted(text) | `#6F6A60` | `--muted-foreground: #6F6A60` |
| wordmark 폰트 | Pretendard, weight 800 | (globals.css는 `--font-sans` 참조, 실폰트는 layout에서 Pretendard 주입) |

**제작 소스 HTML의 실제 값** (Playwright 렌더 이전 CSS, 5개 템플릿 공통 `:root` 선언):
```css
:root{--bg:#FBFAF7;--ink:#16140F;--muted:#6F6A60;--clover:#1B8A4F;--clover-soft:#E7F4EC;--clover-ink:#14613A;}
```
→ 문자열 대 문자열 완전 일치 (grep 재확인 완료).

**렌더링 결과물 픽셀 실측** (PIL `getpixel`로 완성 PNG에서 직접 샘플링, 안티앨리어싱 없는 솔리드 영역 기준):

| 파일 | 샘플 위치 | 실측 HEX | 토큰 대비 |
|---|---|---|---|
| x-header-1500x500.png | 배경(700,20) | `#FBFAF7` | background 완전 일치 |
| facebook-cover-1640x856.png | 배경(1400,50) | `#FBFAF7` | background 완전 일치 |
| facebook-cover-1640x856.png | 슬로건 칩 텍스트(1060,470) | `#14613A` | clover-ink 완전 일치 |
| youtube-banner-2560x1440-v2.png | 배경(50,50) | `#FBFAF7` | background 완전 일치 |
| x-header-1500x500.png | 클로버 마크 중심부(122,148) | `#167D48` | primary(#1B8A4F) 근사 — D-006 원본 `profile-icon.png`이 이미 방사형 그라데이션 음영을 가진 승인 자산이라, 마크 내부는 단색이 아니라 `#1B8A4F`~`#14613A` 범위로 음영진다. 신규 색 도입 아님, 원본 자산 그대로 임베드(`<img>` 삽입, 재채색 없음) |

**결론**: 배경·텍스트 잉크·칩 색은 토큰과 완전 일치(HEX 동일). 클로버 마크 내부의 근사값(#167D48)은 D-006 승인 원본 자산 자체의 음영이며 이 세션이 새로 만든 색이 아니다. 폰트는 5개 HTML 전부 Pretendard(v1.3.9 CDN, 800 weight 헤드라인) — DESIGN.md `typography.wordmark.fontFamily: Pretendard, fontWeight: 800`과 일치.

**컨트롤러 사전 확인값과의 대조**: 컨트롤러가 사전에 추출한 `#E7F4EC`·`#1C8B4F`는 이번 실측(`#E7F4EC`=clover-soft 정확 일치, `#1C8B4F`는 primary #1B8A4F에 근사 — 렌더 시 JPEG/PNG 압축이 아닌 PNG 무손실이므로 완전 일치가 정상이나, 컨트롤러가 샘플링한 좌표가 마크의 그라데이션 영역이었을 가능성)와 부합한다.

---

## 4-2. design-html 스킬 통과 검증 (컨트롤러 반려 대응, 2026-09-25)

**Skill 도구로 `design-html`을 실제 호출했다.** 스킬은 동적 텍스트 리플로우 웹앱(Pretext 엔진·라이브리로드 서버·contenteditable 편집 루프)을 전제로 설계돼 있어, 고정 픽셀 정적 마케팅 이미지 5장 출고와 절차가 완전히 일치하지는 않는다. 스킬 안에서 이번 산출물에 실제로 적용 가능한 항목만 대조했다:

| 스킬 체크리스트 | 결과 |
|---|---|
| DESIGN.md 토큰 우선 적용(Step 1-4) | §4-1에서 완료 — 5개 HTML 소스가 DESIGN.md/globals.css 값과 문자열 완전 일치 |
| AI slop 블랙리스트(Step 3, 보라 그라데이션·3열 카드·이모지 장식·제네릭 CTA 등) | 0건 — §5 표에서 이미 확인 |
| 실콘텐츠 사용(로렘입숨 금지) | 전부 channel-identity-kit.md·decisions.md에서 상속한 실제 승인 카피, 신규 로렘입숨 없음 |
| 렌더 파이프라인 정합 | HTML/CSS → Playwright 헤드리스 Chrome 스크린샷(지정 픽셀 뷰포트, deviceScaleFactor 고정) — 스킬이 요구하는 "실제 렌더 후 검증 스크린샷" 원칙과 동일한 결과물(고정 캔버스 export이므로 Pretext 동적 리플로우 자체는 미적용 대상) |

**스킬이 지적한 실결함**: 없음(이 통과 패스는 §Setup 콘텐츠·도구 검증용이며, 앞서 반려된 X 안전영역·토큰 불일치는 이미 별도 조치로 해소됨). 콘텐츠·레이아웃 변경 없음.

**구조적 미스매치 기록**: Pretext 동적 텍스트 엔진·라이브리로드 서버·10회 리파인먼트 루프는 반응형 웹 UI용 설계라, 고정 3:1·16:9 등 SNS 배너처럼 픽셀 고정 출력물에는 적용 여지가 없다(적용하면 오히려 디자인 의도를 훼손). 이 미스매치는 store-visual-producer 에이전트 정의가 "design-html 목업 경유"를 명시하되 SNS 프로필/배너 같은 고정 캔버스 export 케이스를 별도로 분기하지 않은 데서 온다 — 에이전트 정의 개선 후보로 남긴다(이번 산출물 범위 밖).

---

## 4-3. UX 라이팅 하우스보이스 대조 (컨트롤러 반려 대응, 2026-09-25)

**Read 경로**: `/Users/sj/.claude/standards/ux-writing.md` 전문(239행) 실제 Read.

**관할 판정**: ux-writing.md §8 "적용 범위·예외"에 명시된 바 — "예외: 랜딩 서사·히어로 헤드라인·**SNS**·강사 프로필·블로그(→ writing.md)". 이 문서 자체가 SNS 비주얼 카피(프로필 배너·바이오)를 자기 관할 밖으로 명시하고 writing.md로 넘긴다. 즉 **§0.5 하우스보이스 C(명료·안내형 UI 마이크로카피)는 버튼·에러·토스트 같은 기능 텍스트 기준이고, 이 산출물의 슬로건·헤드라인·바이오 카피에 직접 적용되는 규칙이 아니다.**

다만 ux-writing.md와 writing.md가 **공유하는 하위 규칙**(엠대시 금지 §4-F, 존댓말 레벨 일관 §4-E, 시스템 언어 노출 금지 §4-B)은 전 카피 유형에 공통 적용되는 브랜드 기본선이라 실제로 대조했다:

| 대조 대상 | 위반 여부 | 조치 |
|---|---|---|
| 이미지 내 문구(X: "친구가 선언한 목표에, 조용히 돈으로 응원하고 갑니다" 등 5종) | 엠대시 0건, 시스템 언어 0건, 전부 channel-identity-kit.md·기존 유튜브 배너에서 상속한 승인 문구 그대로(신규 작문 없음) | 수정 불필요, 재렌더 없음 |
| `platform-spec.md` §3 X 바이오 초안 | **엠대시 1건 발견**: "제작기 연재 중 — 만드는 과정 전부 공개" | **수정 완료**: "제작기 연재 중. 만드는 과정 전부 공개"(마침표로 문장 분리, ux-writing.md §3.2 "성격이 다른 정보는 마침표로 끊는다" 원칙 적용) |
| `platform-spec.md` §3 페이스북 바이오 초안 | **엠대시 1건 발견**: "공부, 다이어트, 자격증 — 어떤 목표든 선언하면..." | **수정 완료**: "공부, 다이어트, 자격증까지 어떤 목표든 선언하면..."(접속 표현으로 대체, 한 문장 인과 유지) |
| `tiktok-cover-note.md` 소개문 초안 | 엠대시 0건 | 수정 불필요 |
| 존댓말 레벨 | X/틱톡 바이오는 슬로건 원문("~겁니다")과 안내문("~갑니다")이 혼재하나, 이는 channel-identity-kit.md §2에서 이미 "슬로건은 단호체, 대화 카피는 해요체 톤 2층"으로 확정된 구조라 위반 아님(§0.5의 예외와 별개로 브랜드 자체 2층 톤 규칙이 우선) | 조치 불필요 |
| 시스템 언어 노출 | 0건 | 조치 불필요 |

**결론**: ux-writing.md는 이 산출물의 1차 관할 문서가 아니며(§8 명시), 하우스보이스 C 판정 자체는 적용 대상 밖이다. 단, 공유 하위규칙인 엠대시 금지는 전 카피 공통 기본선이라 위반 2건을 찾아 수정했다. **이미지 재렌더는 불필요**(엠대시가 이미지 안이 아니라 문서 내 바이오 초안 텍스트에만 있었음).

---

## 5. 자가 QA (design-review 스킬 미적용 사유 + 수동 체크)

**design-review 스킬은 라이브 URL(Aside 브라우저)을 대상으로 하는 웹사이트 감사 도구라 정적 PNG 5장 배치에는 구조적으로 맞지 않는다(스킬 본문이 `openTab(url)` 기반).** 대신 `standard-design.md`의 해당 체크리스트를 수동 적용했다:

| 체크 | 결과 |
|---|---|
| 타이포 위계·대비 | 헤드라인(58~88px) vs 본문(24~30px) 비율 2.0~2.4배로 §11-A 기준(≥2.0배) 충족. Pretendard 800/500 두 굵기로 대비 확보 |
| 실사진 통합감 | 5장 중 3장(X·FB·YT배너v2)에 photo-bank 실사(힉스필드 생성) 배경 + 좌우 페이드 합성 — 평면 벡터 아님 |
| 텍스트 안전영역 | X — **v2로 재수정(2026-09-25)**: 좌하단 프로필 원(~200px 지름) + 좌하단 20% 가이드 영역에서 텍스트를 완전히 빼고 콘텐츠를 상단(y 32~225)에 압축 배치, 검증 오버레이 `x-header-safearea-check.png` 첨부. 유튜브(1546×423 좌표 계산 배치), 페이스북(중앙 820×312에 로고·CTA 없음, 텍스트는 우측 배치로 중앙 크롭에도 브랜드명 노출) — 계산 근거는 각 `.stamp.md` |
| 원형 크롭 안전성 | 틱톡·프로필 안전판 모두 72% 스케일 패딩으로 반경 여유 확보(계산 §1 표) |
| AI slop 여부 | 3열 카드 그리드·보라 그라데이션·이모지 장식 등 블랙리스트 패턴 0건. 클로버 단색 그린 + 실사진 + 단일 슬로건 칩 구성으로 절제됨 |
| 브랜드 일관성 | 5장 모두 웜페이퍼 배경·클로버그린 칩·Pretendard 헤비웨이트 헤드라인으로 기존 feed/하이라이트 세트와 톤 정합 |

**등급(자가 판정)**: **B+** — 사진 통합·타이포·안전영역은 A급이나, X·틱톡 슬로건 노출 판정이 [실험](§2) 상태라 최종 확정 전까지 B+로 보수적 평가. 회장 확인 후 정본화되면 A로 승격 가능.

---

## 6. 다음 단계 (회장 판단 필요 없는, 컨트롤러가 이어받을 수 있는 것)

- X·틱톡 콘솔에서 실제 업로드 후 크롭 결과를 캡처해 이 문서 §2 [실험] 판정을 검증한다.
- 8주 후 팔로워 반응(콜드 이탈률)을 보고 X 슬로건 노출을 유지할지 재판정한다(channel-identity-kit.md §3의 8주 게이트와 동일 패턴).

---

SKILLS_USED: design-html(Skill 도구 실호출, 2026-09-25 반려 대응 — HTML/CSS로 5개 이미지 합성, 손코딩 SVG 아님, Pretendard 웹폰트·실사진·그라데이션 사용, Playwright 헤드리스 Chrome으로 정확 픽셀 렌더 후 캡처. §4-2에 통과 검증 기록) · store-visual-producer 내 Higgsfield 대신 photo-bank 기존 승인 자산 재사용(신규 인물 생성 없음, D-006/D-005 재창조 금지 원칙)
SKILLS_SKIPPED: design-review(라이브 URL 전용 구조라 정적 이미지 배치에 미적용 — §5에 수동 대체 체크 명시) · store-visual(스토어 스크린샷·앱아이콘 전용이라 SNS 프로필/배너 과업과 범위 불일치, 채널 자산은 channel-identity-kit.md 계보를 잇는 것이 더 정합적)

KNOWLEDGE_QUERY: WebSearch "2026 X Twitter header image size safe area, Facebook page cover size, TikTok profile picture size specs" + "X Twitter header banner profile picture overlap position pixels bottom left circle size 2026"(반려 대응, 프로필 원 지름 실측) + repo 내 channel-identity-kit.md·concept-current-brand.md·one-thing.md·decisions.md·실수.md·DESIGN.md·web/src/app/globals.css Read(반려 대응, 토큰 진실원 대조)
HITS_USED: influencermarketinghub.com/twitter-image-size(X 1500×500·안전영역·프로필 원 ~200px 지름), nealschaffer.com/twitter-banner-size(X 크롭 상세), socialsizes.io/facebook-cover-photo-size(FB 중앙 820×312 안전영역), socialsizes.io/tiktok-profile-picture-size + krumzi.com(틱톡 720/200 규격), DESIGN.md + globals.css(토큰 진실원, §4-1 대조표로 반영) — 전부 픽셀 규격·색상 실사로 채택
HITS_REJECTED: hootsuite·snappa·postfa.st 등 중복 규격 가이드 — 동일 수치 재확인용이라 대표 출처 1~2개만 인용, 나머지는 근거 부풀리기라 판단해 제외
CONFLICTS: 없음 — X·틱톡은 회장 정본(channel-identity-kit.md)에 미정의 영역이라 벤치마크와 충돌할 결정 자체가 없었음(§2에 유추 근거·[실험] 표기로 명시)

SOURCES/MODEL:
- MODEL: claude-sonnet-5 (store-visual-producer)
- 파일: wiki/1-team-brand/channel-identity-kit.md, wiki/brand/concept-current-brand.md, docs/plan/one-thing.md, wiki/거버넌스/결정.md, wiki/거버넌스/실수.md, docs/growth/assets/brand-assets/README.md, /Users/sj/.claude/standards/artifact-stamp.md, /Users/sj/.claude/standards/standard-design.md
- 벤치마크 URL: 위 KNOWLEDGE_QUERY/HITS_USED 참조
