# 해낼게 V2 승인 시안 재정렬 3차 build 결과

> 한 줄 결론: 요청된 D-022·D-023 충돌, 대조 fixture, 중앙 아바타·cover 겹침·목표명 줄바꿈은 교정했지만, 승인 프로토타입과 로컬 구현 14장을 실제로 열어 다시 본 최종 판정은 일치 0·불일치 7·미확인 0이다. 남은 픽셀 차이를 숨기지 않았고 운영 DB 쓰기와 배포는 하지 않았다.

기반 포맷: `docs/qa/v2-approved-build-realignment-v2-gpt-codex.md`

STAMP: 2026-10-15 08:06 KST | model=gpt-codex/gpt-6.1-sol | agent=code-builder | skill=haenael-supabase-build | 근거=D-022·D-023·승인 프로토타입·390px 대조쌍·로컬 Supabase·Playwright | 고민=요청된 결함이 줄었다는 사실과 화면 전체 일치 판정을 분리했다.

## 1. 최종 판정

대조 보드: [`../design/boards/v2-approved-build-compare-v3-gpt-codex.html`](../design/boards/v2-approved-build-compare-v3-gpt-codex.html)

| 화면 | 390px 판정 | 실제 이미지 육안 근거 |
|---|---|---|
| 비회원 랜딩 | 불일치 | 전체 콘텐츠 시작 위치, 보조 CTA 색·굵기, CTA 사이 간격 차이 |
| 공개 목표 | 불일치 | cover 캡션, 칩 색, 워드맵 배치·단어, 주 CTA 활성 상태·문구 차이 |
| 마이페이지 | 불일치 | 응원 행 아바타·상태 배지·시각 표기와 행 높이 차이 |
| 초대 생성 | 불일치 | 인물 사진 crop, 미리보기 카드 높이, CTA 간격과 하단 안내 노출량 차이 |
| 초대 수락 | 불일치 | 전체 카드의 수직 위치와 제목 줄바꿈 차이 |
| 친구 목록 | 불일치 | 행 순서·높이, 진행 막대 길이, 근황 문구와 관계 배지 배치 차이 |
| 친구 상세 | 불일치 | cover 색, 응원자 아바타 묶음, 근황 이미지·메타데이터, 부스트 카드 위치 차이 |

`verify-compare-pairs.py`는 크기·좌우 순서·통짜 덤프만 검사하므로 7쌍을 통과했다. 내용 판정은 승인 시안 7장과 dev 7장을 각각 실제 이미지로 연 뒤 별도로 내렸다. 보드 자체도 headless Chromium에서 렌더해 이미지 14개, 깨진 이미지 0개, 대조 섹션 7개를 확인했다.

## 2. 이번 교정과 보존 범위

교정한 것:

- 승인 프로토타입의 사용자 노출 글자를 D-023 하한 13px로 올리고, 제품 공용 본문·입력 라벨 토큰도 13px로 맞췄다.
- 연속 기록, `N번 함께`, 활동 타임라인처럼 D-022에서 금지한 반증 불가 지표를 승인 시안과 구현에서 제거했다.
- 로컬 대조 fixture를 친구 3명, 진행 목표 2개, 완료 목표 2개, 받은 확정 응원 18개, 연결 친구 3명으로 맞췄다. 웰컴 응원을 포함하는 공개 집계는 19명과 14명으로 분리했다.
- 카카오 미리보기는 큰 중앙 아바타와 분리 본문 구조로, 초대 수락 아바타는 cover 위에 보이는 구조로 바꿨다.
- `토익 900 넘길게 해낼게`처럼 접미사가 중복되던 목표명을 한 번만 렌더하도록 정상 경로와 거절 경로 단위 테스트를 추가했다.
- JavaScript 카운트업이 캡처 도중 중간값을 남기지 않도록, 승인 시안 캡처에서 `requestAnimationFrame`을 취소하고 fixture 값을 고정했다.

유지한 기존 기능:

- 초대 생성·수락, 친구 조회·해제, 공개범위 RLS, 응원·결제·환전·관리자 라우팅을 삭제하거나 우회하지 않았다.
- 환전 계좌 마스킹, 서비스 이용료 10%와 VAT, 이용료 차감 후 원천징수 공식, 제출 중 높이 허용 오차를 보존했다.
- 제품 기본 데이터, 운영 DB, 운영 배포를 변경하지 않았다. 테스트 삭제와 skip 추가도 없다.

## 3. 실행 증거

| 공정 | 상태 | 직접 증거 |
|---|---|---|
| 대조쌍 규격 | 테스트됨 | 390px 7쌍, 크기 대조 7/7, 통짜 덤프 0, 좌우 순서 위반 0 |
| 이미지 육안 대조 | 관찰됨 | 승인 시안 7장과 dev 7장을 각각 열어 판정. 일치 0·불일치 7·미확인 0 |
| 대조 보드 렌더 | 관찰됨 | Chromium에서 이미지 14개, 깨진 이미지 0개, 섹션 7개 |
| 실제 dev 렌더 | 관찰됨 | 로컬 Supabase와 Next dev server `http://localhost:3010`, HTTP 200, 390px 대상 경로 console error 0·가로 overflow 0, Playwright 1/1 |
| 모바일 사용성 | 테스트됨 | 데이터가 있는 공개 목표에서 360·390·412·600·700·780·820·900·1000 전부 통과 |
| 웹 단위·통합 | 테스트됨 | Vitest 59파일, 336/336 통과 |
| DB 전체 회귀 | 테스트됨 | pgTAP 19파일, 336/336 통과 |
| Next 운영 빌드 | 테스트됨 | Next.js 16.4.0 compile·TypeScript·정적 생성 17/17 통과 |
| 환전 브라우저 E2E | 관찰됨 | Chromium 12/12, 제출 중 높이 622.8125px, 계좌 마스킹·수수료 공식 단정 통과 |
| 디자인 토큰 | 테스트됨 | 프로젝트 검사 169파일, 신규 위반 0, 기준선 64건. 전역 `design-lint.sh`는 기존 3범주 경고를 계속 보고 |
| 파이프라인 산출물 | 테스트됨 | 상태파일 2개 핀 실체·슬롯키·버전 정합 통과. 기존 `docs/design/README.md` STAMP 위생 경고 1건 |
| 운영 반영 | 미실행 | 운영 DB 쓰기 0건, 배포 0건 |

아홉 폭 모바일 실측 공통 결과는 `tokenBodyPx=16`, `fontBelow13=0`, `tapBelow44=0`, `tapWithActiveRatio=1`, `overflowX=false`, `pass=true`다. 측정 전에 공개 목표 워드맵 데이터가 3건 이상이고 오류 문구가 없음을 단언했다.

## 4. 벤치마크 적용

- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)의 동일 viewport·동일 렌더 조건을 차용했다. 동적 카운터는 캡처 직전 원장 fixture 값으로 고정해 중간 프레임을 거짓 불일치로 세지 않았다.
- [WCAG 2.2 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)의 확대 가능성과 프로젝트 D-023을 함께 적용해, 승인 시안 자체의 13px 하한을 먼저 고쳤다.
- [WCAG 2.2 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)의 터치 목표 원칙보다 엄격한 프로젝트 44px 기준을 아홉 폭에서 유지했다.

## 5. 셀프심문과 레드팀

이 결론이 틀릴 가장 그럴듯한 이유는 요청된 세 결함이 고쳐졌다는 이유로 화면 전체도 일치한다고 승격하는 것이다. 이를 막기 위해 자동 검사와 육안 내용 판정을 분리했고, 육안에서 남은 7개 차이를 모두 불일치로 유지했다.

까다로운 사용자는 “중앙 아바타가 생겼어도 카드 높이와 crop이 다르면 같은 화면이 아니다”라고 반박할 수 있다. 그 반박이 맞으므로 부분 개선을 일치로 세지 않았고, 보드의 각 쌍에 남은 차이를 한 줄씩 적었다.

## 6. 다음 실행

- 소유자: build 단계. 종료 증거: 대조 보드 7화면에서 남은 간격·색·행 구조·CTA 상태를 교정하고, 새 14장을 실제로 열어 `일치 7·불일치 0·미확인 0`을 확인한다.
- 소유자: QA 단계. 종료 증거: build 교정 뒤 동일 7쌍 검사와 전체 회귀를 독립 재실행한다.
- 운영 DB migration과 웹 배포는 별도 승인 전까지 실행하지 않는다.

KNOWLEDGE_QUERY: 해낼게 V2 build·승인 프로토타입·공유 장벽을 BRAIN `wiki/business/index.md`에서 좁혀 조회하고, Playwright visual comparison과 WCAG 2.2 resize text·target size를 조사했다.
HITS_USED: `concept-공유장벽-선언vs요청-UGC바이럴.md`는 초대 흐름을 선언 기반으로 유지하는 근거로, Playwright와 WCAG는 동일 viewport 캡처·동적 값 고정·접근성 하한 검증 근거로 사용했다.
HITS_REJECTED: 일반 소셜 앱 화면 사례는 승인 프로토타입보다 우선할 수 없어 화면 구조 결정에 사용하지 않았다. BRAIN의 범용 바이럴 아이디어도 이번 정합화 범위를 늘리는 근거로 쓰지 않았다.
CONFLICTS: D-022·D-023과 승인 시안의 충돌은 이번에 시안 정본을 고쳐 해소했다. 다만 승인 시안과 실제 구현 사이의 7개 시각 차이는 남아 있다.

SKILLS_USED: haenael-supabase-build, Next.js·Supabase 수직 슬라이스의 코드→Vitest·pgTAP→실제 브라우저 E2E→build 증거 순서에 사용.
SKILLS_SKIPPED: review, PR landing·배포 과업이 아니며 이번 출고는 로컬 build와 대조 증거이므로 실행하지 않음.

SOURCES/MODEL: gpt-codex/gpt-6.1-sol | `docs/design/prototypes/social-viral-loop-v2-opus48.html`, `docs/qa/evidence/v2-approved-build-realignment-v3.0.0`, `wiki/거버넌스/결정.md`, `/Users/sj/SJ_BRAIN_wiki/wiki/business/index.md`, https://playwright.dev/docs/test-snapshots, https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html, https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

PRESENTATION_CHECK: 내부 태그 잔재 없음 확인 | 승인 시안 7장과 dev 7장을 실제 이미지로 열어 육안 대조 | 대조 보드 Chromium 렌더 확인
