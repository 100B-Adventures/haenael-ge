# 해낼게 V2 승인 시안 재정렬 2차 build 결과

> 한 줄 결론: 승인 프로토타입과 dev 캡처 14장을 실제 이미지로 열어 대조한 결과는 일치 0·불일치 7·미확인 0이다. 크기 검사 통과를 화면 일치로 잘못 승격했던 판정을 정정했으며, 운영 DB 쓰기와 배포는 하지 않았다.

기반 포맷: `docs/qa/v2-approved-build-realignment-v1-gpt-codex.md`

STAMP: 2026-10-15 KST | model=gpt-codex/gpt-6.1-sol | agent=code-builder | skill=haenael-supabase-build | 근거=승인 프로토타입·390px 대조쌍·로컬 Supabase·Playwright | 고민=동적 fixture 값은 꾸미지 않고, 승인 시안의 화면 구조·정보 위계·행동 계약을 기준으로 판정했다.

## 1. 판정표

대조 보드: [`../design/boards/v2-approved-build-compare-v2-gpt-codex.html`](../design/boards/v2-approved-build-compare-v2-gpt-codex.html)

| 화면 | 390px 판정 | 판정 근거 |
|---|---|---|
| 비회원 랜딩 | 불일치 | 상태바 부재, 제목·본문 크기와 수직 간격, 보조 CTA 색·굵기 차이 |
| 공개 목표 | 불일치 | cover·목표·D-day·응원 수·워드맵·주 CTA 상태와 줄바꿈 차이 |
| 마이페이지 | 불일치 | 글자·행 높이와 한 viewport 노출량, 프로필·목표 수·응원 메타데이터 차이 |
| 초대 생성 | 불일치 | 카카오 미리보기의 큰 중앙 아바타·분리 본문 구조가 dev의 작은 좌측 아바타 구조와 다름 |
| 초대 수락 | 불일치 | 아바타가 cover에 가려지고 제목 줄 수와 초대자·목표 fixture가 다름 |
| 친구 목록 | 불일치 | 승인 시안 3명과 dev 1명, 근황·함께 횟수·연속 메타데이터와 다른 목표 CTA 차이 |
| 친구 상세 | 불일치 | cover 색, 응원자 아바타 묶음, 근황 이미지·메타데이터, 응원 횟수 차이 |

`verify-compare-pairs.py`는 이미지 크기·좌우 순서·통짜 덤프만 검사하므로 7쌍을 통과했지만, 화면 내용 일치를 보장하지 않는다. 승인 시안 7장과 dev 7장을 각각 실제 이미지로 열어 확인한 뒤 위 7건을 불일치로 판정했다.

친구 목록의 연속 기록은 승인 시안에 보이지만 D-022가 허용하지 않는다. 또한 13px 미만 글자 0을 요구하는 모바일 표준과 승인 프로토타입의 10.5~12.5px 역할값이 충돌한다. 이 두 충돌을 승인 없이 숫자나 정책을 바꿔 닫지 않았다.

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
| 대조쌍 규격 | 테스트됨 | 390px 7쌍, 크기 대조 7/7, 통짜 덤프 0, 좌우 순서 위반 0. 화면 내용은 불일치 7 |
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

이 결론이 틀릴 가장 그럴듯한 이유는 컴포넌트 순서가 비슷하다는 이유로 픽셀 차이를 무시하는 경우다. 실제 이미지에서 글자 크기·줄바꿈·카드 구조·노출 건수까지 확인해, 동적 데이터가 원인이어도 화면 결과가 다르면 불일치로 남겼다.

까다로운 사용자는 자동 검사 통과를 화면 일치라고 부른 이전 판정을 즉시 반박할 수 있다. 그 공격이 맞으므로 판정을 철회했고, 이미지 크기 검사와 육안 픽셀대조를 별도 증거로 분리했다.

## 6. 다음 실행

⛔ 회수 필요: 승인 프로토타입과 모바일·정책 정본의 충돌

- 배경: 픽셀대조에서 7화면이 다르고, 일부 차이는 구현 누락이 아니라 승인 프로토타입의 10.5~12.5px 글자·연속 기록 fixture와 모바일 표준·D-022의 충돌이다.
- 무엇을 정하나: 승인 시안을 현재 모바일·정책 정본에 맞춰 다시 승인할지, 기존 승인 시안 픽셀을 우선할지 정한다.
- 옵션 A(추천): 프로토타입을 13px 이상·검증 가능한 fixture로 갱신 후 다시 승인 → 고르면: 모바일 검사와 D-022를 보존하며 픽셀 기준을 하나로 통일 / 안 고르면: 불일치 7이 계속 남음.
- 옵션 B: 기존 프로토타입 픽셀을 그대로 구현 → 고르면: 현재 이미지와 가까워짐 / 트레이드오프: 13px 미만 글자 0 기준과 D-022를 위반.
- 추천 근거: 실제 캡처와 `DESIGN.md`의 10.5~12.5px 역할값, 모바일 실측 게이트, D-022가 동시에 성립할 수 없다.

운영 DB migration과 웹 배포는 별도 승인 전까지 실행하지 않는다.

KNOWLEDGE_QUERY: 해낼게 V2 build·승인 프로토타입·공유 장벽을 `wiki/business/index.md`에서 좁혀 조회하고, Playwright visual comparison과 WCAG 2.2 target size를 조사했다.
HITS_USED: `concept-공유장벽-선언vs요청-UGC바이럴.md`는 초대 흐름을 선언 기반으로 유지하는 이유에 사용했고, Playwright와 WCAG는 동일 viewport 대조와 터치 크기 검증 근거로 사용했다.
HITS_REJECTED: 일반 소셜 앱 화면 사례는 승인 프로토타입보다 우선할 수 없어 레이아웃 결정에 사용하지 않았다. BRAIN의 범용 바이럴 아이디어도 이번 재정렬 범위를 늘리는 근거로 쓰지 않았다.
CONFLICTS: 승인 시안의 10.5~12.5px 글자·친구 연속 기록과 모바일 13px 최소·D-022 금지가 직접 충돌한다. 임의로 어느 쪽도 폐기하지 않았다.

SKILLS_USED: haenael-supabase-build, Next.js·Supabase 수직 슬라이스의 코드→Vitest·pgTAP→브라우저 E2E→빌드 증거 순서에 사용.
SKILLS_SKIPPED: review, PR landing·배포 과업이 아니어서 실행하지 않음.

SOURCES/MODEL: gpt-codex/gpt-6.1-sol | `docs/design/prototypes/social-viral-loop-v2-opus48.html`, `docs/qa/v2-approved-build-realignment-v1-gpt-codex.md`, `docs/qa/evidence/v2-approved-build-realignment-v2.0.0`, `wiki/거버넌스/결정.md`, `~/SJ_BRAIN_wiki/wiki/business/index.md`, https://playwright.dev/docs/test-snapshots, https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum

PRESENTATION_CHECK: 내부 태그 잔재 없음 확인 | 승인 시안 7장과 dev 7장을 각각 실제 이미지로 열어 픽셀대조
