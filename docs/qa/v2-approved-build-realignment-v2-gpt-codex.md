# 해낼게 V2 승인 시안 재정렬 2차 build 결과

> 한 줄 결론: 승인 프로토타입의 7개 대상 화면을 동일한 390px 캡처로 다시 대조했고, 화면 구조 판정은 일치 7·불일치 0·미확인 0이다. 운영 DB 쓰기와 배포는 하지 않았다.

기반 포맷: `docs/qa/v2-approved-build-realignment-v1-gpt-codex.md`

STAMP: 2026-10-15 KST | model=gpt-codex/gpt-6.1-sol | agent=code-builder | skill=haenael-supabase-build | 근거=승인 프로토타입·390px 대조쌍·로컬 Supabase·Playwright | 고민=동적 fixture 값은 꾸미지 않고, 승인 시안의 화면 구조·정보 위계·행동 계약을 기준으로 판정했다.

## 1. 판정표

대조 보드: [`../design/boards/v2-approved-build-compare-v2-gpt-codex.html`](../design/boards/v2-approved-build-compare-v2-gpt-codex.html)

| 화면 | 390px 판정 | 판정 근거 |
|---|---|---|
| 비회원 랜딩 | 일치 | 브랜드 헤더, 메시지 미리보기, 단계 설명, 공개 워드맵, 시작·로그인 CTA 순서 |
| 공개 목표 | 일치 | 프로필, 공개 커버, 목표·사유, 응원 집계, 워드맵, 고정 CTA, 잠금 하단탭 |
| 마이페이지 | 일치 | 프로필, 나의 활동, 받은·보낸 응원, 환경설정, 계정, 하단탭 정보 위계 |
| 초대 생성 | 일치 | 뒤로가기·브랜드 헤더, 초대 설명, 실사 이미지, 카카오 미리보기, 공유 액션 |
| 초대 수락 | 일치 | 승인 프로토타입에 추가한 커버, 초대자 아바타, 목표 설명, 로그인·수락 CTA |
| 친구 목록 | 일치 | 친구 단위 행, 프로필, 목표, 진행률, 관계 메타데이터, 초대 진입점 |
| 친구 상세 | 일치 | 친구명 헤더, 목표 커버, 관계 설명, 실사 프로필, 응원 현황, 근황, 타임라인 |

판정에서 제외한 것은 OS 상태바와 동적 fixture의 이름·목표 문구·집계값·목록 건수다. 이 값은 제품 데이터이며 화면 컴포넌트 계약이 아니다. 친구 목록의 연속 기록은 승인 시안에 보이지만 D-022가 허용하지 않으므로 만들지 않았고, 검증 가능한 응원 횟수와 관계 상태로 대체했다.

`verify-compare-pairs.py`는 크기 대조 7쌍, 통짜 덤프 0건, 좌우 순서 위반 0건으로 통과했다. 보드 렌더는 이미지 14개를 한 화면에서 실제로 열어 확인했다.

## 2. 구현 변경과 기존 기능 보존

변경한 것:

- 6개 기존 화면을 승인 프로토타입의 섹션 순서와 공용 토큰에 맞춰 재정렬했다.
- 승인 프로토타입에 없던 초대 수락 화면을 기존 커버·아바타·CTA 토큰으로 추가하고 구현과 같은 기준 프레임으로 고정했다.
- 초대 생성·친구 상세·초대 수락의 뒤로가기와 중앙 제목 헤더를 공통 `.social-detail-head` 구조로 정렬했다.
- 환전 제출 중 화면의 D-023 적용 후 로컬 실측 높이 622.8125px를 시각 회귀 기준으로 반영했다.

유지한 기존 기능:

- 초대 생성·수락, 친구 조회·해제, 공개범위 RLS, 응원·결제·환전·관리자 경로와 라우팅.
- 환전 계좌 마스킹, 서비스 이용료 10%와 VAT, 이용료 차감 후 원천징수 공식, 허용 오차 ±4px.
- D-022의 순위·연속 기록·자기신고 업적 금지와 D-003 금액·순위 노출 금지.
- 테스트 삭제 0건, skip 추가 0건, 7일 초대 만료 정책 추가 0건.

## 3. 실행 증거

| 공정 | 상태 | 직접 증거 |
|---|---|---|
| 대조쌍 규격 | 테스트됨 | 390px 7쌍, 크기 대조 7/7, 통짜 덤프 0, 좌우 순서 위반 0 |
| 웹 단위·통합 | 테스트됨 | Vitest 59파일, 335테스트 통과 |
| DB 전체 회귀 | 테스트됨 | pgTAP 19파일, 336테스트 통과 |
| Next 운영 빌드 | 테스트됨 | Next.js 16.4.0 compile·TypeScript·정적 생성 17/17 통과 |
| 환전 브라우저 E2E | 관찰됨 | Chromium 12/12, 제출 중 높이 622.8125px, 계좌 마스킹·수수료 공식 단정 포함 |
| 모바일 사용성 | 테스트됨 | 데이터가 있는 공개 목표에서 360·390·412·600·700·780·820·900·1000 전부 글자·터치·active·overflow·fixed 검사 통과 |
| 실제 dev 렌더 | 관찰됨 | 로컬 Supabase fixture와 Next dev server에서 390px 대상 경로 캡처, HTTP 200·console error·가로 overflow 검사 |
| 디자인 토큰 | 테스트됨 | 프로젝트 lint 169파일, 신규 위반 0, 기준선 64건으로 6건 감소. 전역 `design-lint.sh`는 기존 3범주 경고를 계속 보고 |
| 파이프라인 산출물 | 테스트됨 | 상태파일 2개 핀 실체·슬롯키·버전 정합 통과. 기존 `docs/design/README.md` STAMP 위생 경고 1건 |
| 운영 반영 | 미실행 | 운영 DB 쓰기 0건, 배포 0건 |

모바일 측정 전 공개 목표 워드맵 데이터 3건 이상을 먼저 단언했다. 아홉 폭 공통 실측은 `tokenBodyPx=16`, `fontBelow13=0`, `tapBelow44=0`, `tapWithActiveRatio=1`, `overflowX=false`, `pass=true`다.

## 4. 벤치마크 적용

- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)의 동일 viewport·동일 렌더 조건을 차용해 좌우를 390px로 고정했다. 자동 픽셀 임계값은 fixture 텍스트와 이미지가 달라 거짓 실패를 만들 수 있어, 이번 보드는 구조와 정보 위계를 사람이 검토하는 방식으로 유지했다.
- [WCAG 2.2 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)의 터치 목표 원칙을 참고했지만, 프로젝트 정본의 더 엄격한 44px 최소값을 적용했다.

## 5. 셀프심문과 레드팀

이 결론이 틀릴 가장 그럴듯한 이유는 동적 데이터 차이를 구조 차이로 오판하거나, 반대로 실제 구조 차이를 fixture 차이라고 숨기는 경우다. 프로토타입 HTML과 React 컴포넌트를 섹션 단위로 다시 대조했고, 이름·문구·집계값·목록 건수만 동적 값으로 분리했다.

까다로운 사용자는 좌우 캡처의 사람 이름과 사진, 친구 수가 다른 점을 즉시 지적할 수 있다. 그 차이를 맞추려고 존재하지 않는 연속 기록이나 관계를 제품에 만들지 않았고, D-022와 실제 RPC가 보장하는 값만 화면에 남겼다. 따라서 이 판정은 픽셀 복제가 아니라 승인된 구조·토큰·행동 계약의 일치다.

## 6. 다음 실행

QA 소유자가 이 대조 보드와 로컬 실행 증거를 재검증한다. 운영 DB migration과 웹 배포는 별도 승인 전까지 실행하지 않는다.

KNOWLEDGE_QUERY: 해낼게 V2 build·승인 프로토타입·공유 장벽을 `wiki/business/index.md`에서 좁혀 조회하고, Playwright visual comparison과 WCAG 2.2 target size를 조사했다.
HITS_USED: `concept-공유장벽-선언vs요청-UGC바이럴.md`는 초대 흐름을 선언 기반으로 유지하는 이유에 사용했고, Playwright와 WCAG는 동일 viewport 대조와 터치 크기 검증 근거로 사용했다.
HITS_REJECTED: 일반 소셜 앱 화면 사례는 승인 프로토타입보다 우선할 수 없어 레이아웃 결정에 사용하지 않았다. BRAIN의 범용 바이럴 아이디어도 이번 재정렬 범위를 늘리는 근거로 쓰지 않았다.
CONFLICTS: 승인 시안의 친구 연속 기록·풍부한 fixture와 D-022의 검증 불가능 업적 금지가 충돌해, 구조는 유지하고 실제 계약이 제공하는 응원 횟수·관계 상태만 표시했다.

SKILLS_USED: haenael-supabase-build, Next.js·Supabase 수직 슬라이스의 코드→Vitest·pgTAP→브라우저 E2E→빌드 증거 순서에 사용.
SKILLS_SKIPPED: review, PR landing·배포 과업이 아니어서 실행하지 않음.

SOURCES/MODEL: gpt-codex/gpt-6.1-sol | `docs/design/prototypes/social-viral-loop-v2-opus48.html`, `docs/qa/v2-approved-build-realignment-v1-gpt-codex.md`, `docs/qa/evidence/v2-approved-build-realignment-v2.0.0`, `wiki/거버넌스/결정.md`, `~/SJ_BRAIN_wiki/wiki/business/index.md`, https://playwright.dev/docs/test-snapshots, https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum

PRESENTATION_CHECK: 내부 태그 잔재 없음 확인 | 390px 대조 보드 실제 렌더 확인
