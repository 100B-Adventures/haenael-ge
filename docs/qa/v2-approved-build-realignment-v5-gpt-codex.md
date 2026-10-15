# 해낼게 V2 승인 시안 재정렬 5차 build 결과

> 한 줄 결론: 승인 프로토타입 7장과 로컬 production 구현 7장을 390×844로 다시 캡처해 실제 이미지로 대조한 결과는 일치 7, 불일치 0, 미확인 0이다. 제품 데이터 값은 판정에서 제외했고, Vitest 337건, pgTAP 336건, Next.js production build, 환전 E2E 12건은 모두 통과했다. 운영 DB 쓰기와 배포는 하지 않았다.

기반 포맷: `docs/qa/v2-approved-build-realignment-v4-gpt-codex.md`

STAMP: 2026-10-15 11:28 KST | model=gpt-codex/gpt-6.1-sol | agent=code-builder | skill=haenael-supabase-build | 근거=승인 프로토타입·최종 커밋 후보의 390px 이미지 14장·로컬 Supabase fixture·Next production runtime·Vitest·pgTAP·Playwright | 고민=보고서 이후 남은 작업트리 변경까지 포함해 다시 캡처하고, 데이터 자체 차이와 구조 차이를 분리해 7쌍을 모두 새로 열어 판정했다.

## 1. 이미지 육안 판정

대조 보드: [`../design/boards/v2-approved-build-compare-v5-gpt-codex.html`](../design/boards/v2-approved-build-compare-v5-gpt-codex.html)

판정에서 제외한 제품 데이터는 사용자 이름, 프로필 사진, 목표 문구, 응원 메시지, 응원 수와 날짜다. 이 값 때문에 문자열·사진 내용만 달라진 경우는 화면 계약 위반으로 세지 않았다. 배치, 간격, 카드 구조, 상태, 테두리, 아이콘, crop과 CTA 위치는 판정에 포함했다.

| 화면 | 390px 판정 | 실제 이미지 육안 근거 |
|---|---|---|
| 비회원 랜딩 | 일치 | 브랜드부터 워드맵 프리뷰·선언 문구·CTA·하단탭까지 위계·폭·간격이 같은 구조로 보임 |
| 공개 목표 | 일치 | 브랜드와 로그인 안내가 겹치지 않는 2행이고 cover·목표 카드·응원 수·워드맵·신고·활성 CTA 순서와 간격이 같음 |
| 마이페이지 | 일치 | 헤더·프로필·활동 카드 2개·응원 탭·응원 행 3개·안내·환경설정의 순서와 카드 폭이 같음 |
| 초대 생성 | 일치 | 본문 시작선·사진 crop·카카오 미리보기 중앙 아바타 비율과 여백·두 CTA 아이콘과 높이가 같음 |
| 초대 수락 | 일치 | 96px cover·32px 아바타 겹침·eyebrow·제목·설명·CTA의 수직 흐름과 위치가 같음 |
| 친구 목록 | 일치 | 동일 높이 3행이며 시안에 없는 추가 목표 pill 없이 대표 목표·진행 막대·근황·상태가 같은 구조로 배치됨 |
| 친구 상세 | 일치 | 응원자 아바타 묶음·근황 이후 간격·재초대 카드의 점선 테두리·아이콘·높이가 같은 구조로 보임 |

`verify-compare-pairs.py`는 크기 대조 7쌍, 통짜 덤프 0건, 좌우 순서 위반 0건으로 통과했다. 대조 보드는 headless Chromium에서 이미지 14개, 깨진 이미지 0개, 대조 섹션 7개, `일치` 판정 7개, 콘솔 오류 0개로 렌더됐다.

## 2. 캡처와 실제 런타임 증거

| 증거 등급 | 범위 | 결과 |
|---|---|---|
| 관찰됨 | 승인 프로토타입 | `social-viral-loop-v2-opus48.html`에서 390×844 프레임 7장 추출 |
| 관찰됨 | 로컬 구현 | 로컬 Supabase fixture와 Next production server `http://127.0.0.1:3010`에서 390×844 화면 7장 재캡처 |
| 관찰됨 | 실제 경로 | 최종 작업트리에서 Playwright 1/1 통과. 대상 경로 HTTP 200, 브라우저 console error 0, page error 0, 가로 overflow 0. 공개 목표 2행과 초대 수락 cover 위치를 DOM 좌표로도 확인 |
| 관찰됨 | 대조 보드 | 이미지 14개·깨짐 0·섹션 7개·콘솔 오류 0 |
| 근거 확인 | 서버 종료 | 검증 명령의 trap으로 포트 3010 listener 종료. 장기 실행 서버를 남기지 않음 |

캡처 경로는 `docs/qa/evidence/v2-approved-build-realignment-v5.0.0/`이다. 대조에 사용한 승인 시안·구현 이미지 14장과 동일 실행의 보조 구현 화면 2장(`goal-detail`, `cover-review`)은 모두 파일당 390×844px다. 첫 dev 실행의 HMR WebSocket 오류와 중간 production 실행의 로컬 Auth 소켓 오류는 실패로 보존했고, HMR이 없는 production 런타임에서 최종 캡처를 새로 통과시켰다.

## 3. 전체 회귀 증거

| 공정 | 상태 | 직접 실행 결과 |
|---|---|---|
| Vitest·TypeScript 보안 테스트 | 테스트됨 | 59파일, 337/337 통과. 전체 병렬 실행에서 동적 import 테스트가 기본 5초를 간헐 초과해 해당 테스트 제한만 10초로 명시했고 assertion 변경 없이 표준 `npm test`를 재통과 |
| pgTAP | 테스트됨 | 19파일, 336/336 통과 |
| Next.js production build | 테스트됨 | Next.js 16.4.0 compile·TypeScript·정적 생성 17/17 통과 |
| 환전 브라우저 E2E | 관찰됨 | Chromium 12/12 통과. confirm 512.78125px, submitting 622.8125px, 계좌 마스킹·이용료·원천징수 단정 유지 |
| 모바일 사용성 | 테스트됨 | 데이터가 있는 공개 목표에서 360·390·412·600·700·780·820·900·1000px 모두 `fontBelow13=0`, `tapBelow44=0`, `tapWithActiveRatio=1`, `overflowX=false`, `pass=true` |
| 디자인 토큰 | 테스트됨 | 169파일, 기존 위반 64건, 신규 0건, 기준선 대비 6건 감소 |
| 전역 design lint | 근거 확인 | 기존 3범주 경고 유지, exit code 0. 신규 토큰 위반은 별도 기준선 검사에서 0건 |
| 파이프라인 산출물 | 테스트됨 | 상태파일 2개 핀 실체·슬롯키·버전 정합 통과. 기존 `docs/design/README.md` STAMP 위생 경고 1건 |
| 운영 반영 | 미검증 | 운영 DB 쓰기와 배포를 실행하지 않았으므로 운영 화면은 이번 결과가 미반영 상태 |

## 4. 변경·보존 범위

기존 구현 확인: 4차 코드와 커밋 `c3709ac`, `cb98417` 위에서 화면별 승인 상태만 교정했다. 새 아키텍처·API·DB 스키마·운영 데이터는 만들지 않았다.

추가·변경한 것:

- 공개 목표에서 승인 상태용 워드맵 overflow disclosure를 숨기고 브랜드·로그인 안내·활성 응원 CTA를 정렬했다.
- 초대 생성의 crop·카카오 미리보기·공유 CTA, 초대 수락의 cover·아바타·본문 수직 리듬을 맞췄다.
- 친구 목록은 대표 목표 한 행만 유지하고, 친구 상세은 실제 아바타 묶음과 승인 재초대 카드로 맞췄다.
- 보고서 이후 남았던 공개 목표 utility 충돌을 제거하고, 초대 수락 cover를 승인 프레임의 96px 높이·245px 시작점으로 고정했다.
- 계약 테스트에 공개 워드맵 12개 상태, 대표 목표 단일 행, 공개 목표 2행 위치, 초대 수락 cover 좌표를 추가했다.

유지한 기존 기능:

- 초대 생성·수락, 친구 조회·해제, 공개범위 RLS, cover 검수, 응원·결제·환전·관리자 경로를 삭제하거나 우회하지 않았다.
- 환전 계좌 마스킹, 서비스 이용료 10%와 VAT, 이용료 차감 후 원천징수 공식, 제출 중 높이 허용 오차를 E2E로 재확인했다.
- 테스트 삭제·skip 추가는 없고 운영 DB 쓰기와 배포도 실행하지 않았다.

## 5. 벤치마크·셀프심문·레드팀

- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)의 같은 브라우저·viewport·fixture에서 안정된 프레임을 비교하는 원칙을 차용했다. 픽셀 스냅샷의 자동 동일성 주장은 하지 않고, 데이터 값 차이를 제외한 구조를 실제 이미지로 판정했다.
- BRAIN `concept-공유장벽-선언vs요청-UGC바이럴.md`의 선언형 공유 원칙은 공개 목표와 초대 화면의 역할을 해석하는 보조 근거로만 사용했고, 승인 시안의 구조를 바꾸는 근거로 쓰지 않았다.
- 이 결론이 틀릴 가장 그럴듯한 이유는 데이터 문자열 길이가 구조 차이를 가리는 경우다. 그래서 이름·문구 값을 제외하되 카드 경계·행 높이·CTA 위치·아바타 겹침처럼 데이터와 무관한 축을 화면별로 따로 확인했다.
- 까다로운 고객은 “비슷해 보인다는 말로 작업트리의 후속 변경과 1~2px 차이를 덮을 수 있다”고 공격할 수 있다. 그래서 보고서 작성 뒤 남은 변경을 별도 diff로 확인하고, 승인 이미지에서 실측한 초대 수락 cover 96px와 공개 목표 2행을 브라우저 좌표 계약으로 고정한 뒤 production 캡처를 다시 만들었다.

## 6. 다음 실행

- 소유자: QA 단계. 종료 증거: v5 대조 보드의 7쌍과 전체 회귀를 독립 재실행해 `일치 7·불일치 0·미확인 0`을 재확인한다.
- 소유자: release/ship 단계. 종료 증거: QA 승인과 회장 배포 승인 뒤에만 운영 DB·웹·Edge Function 실물을 계수하고 배포한다.
- 이번 build에서는 운영 DB 쓰기와 배포를 하지 않았다.

KNOWLEDGE_QUERY: BRAIN `wiki/business/index.md`에서 해낼게·공유 장벽·선언형 공유 문서를 좁혀 조회하고, Playwright 공식 visual comparisons 문서를 조사했다.
HITS_USED: 승인 프로토타입은 화면 구조 판정에, Playwright 공식 문서는 같은 Chromium·viewport·fixture 원칙에, BRAIN 공유 장벽 문서는 공개 목표·초대 화면 목적을 해석하는 보조 근거에 사용했다.
HITS_REJECTED: 범용 바이럴 확장 아이디어와 다른 소셜 앱 화면 사례는 승인 프로토타입보다 우선할 수 없고 이번 마무리 범위를 늘리므로 적용하지 않았다.
CONFLICTS: 없음. 제품 데이터 값은 판정에서 제외하라는 지시와 구조·간격은 엄격히 판정하라는 계약을 분리해 적용했다.

SKILLS_USED: haenael-supabase-build, 로컬 Supabase fixture → 코드·계약 테스트 → production 캡처 → pgTAP·빌드·환전 E2E 순서와 운영 쓰기 금지 경계를 적용.
SKILLS_SKIPPED: review, PR landing·push·배포 과업이 아니고 요청 범위가 로컬 build 마무리·커밋으로 한정돼 실행하지 않음.

SOURCES/MODEL: gpt-codex/gpt-6.1-sol | `pipeline-state.v2.md`, `DESIGN.md`, `docs/design/prototypes/social-viral-loop-v2-opus48.html`, `docs/qa/evidence/v2-approved-build-realignment-v5.0.0`, `wiki/거버넌스/결정.md`, `wiki/거버넌스/실수.md`, `/Users/sj/SJ_BRAIN_wiki/wiki/business/마케팅/concept-공유장벽-선언vs요청-UGC바이럴.md`, https://playwright.dev/docs/test-snapshots

PRESENTATION_CHECK: 내부 태그 잔재 없음 확인 | 승인 시안 7장과 production 구현 7장을 실제 이미지로 열어 육안 대조 | 대조 보드 Chromium 렌더 확인
