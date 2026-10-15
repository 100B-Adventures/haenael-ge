# 해낼게 V2 승인 시안 재정렬 4차 build 결과

> 한 줄 결론: 390px 승인 시안과 로컬 구현을 새로 캡처해 실제 이미지 14장으로 대조한 결과는 일치 2, 불일치 5, 미확인 0이다. 이름·사진·숫자·문구 값 자체의 차이는 판정에서 제외했으며, Vitest 336건, pgTAP 336건, Next.js build, 환전 E2E 12건은 모두 통과했다. 운영 배포는 하지 않았다.

기반 포맷: `docs/qa/v2-approved-build-realignment-v3-gpt-codex.md`

STAMP: 2026-10-15 09:26 KST | model=gpt-codex/gpt-6.1-sol | agent=code-builder | skill=haenael-supabase-build | 근거=승인 프로토타입·390px 대조 이미지·로컬 Supabase·Next dev/production runtime·Vitest·pgTAP·Playwright | 고민=fixture 값 차이를 제외하되, 값이 달라도 남는 레이아웃과 상태 차이는 불일치로 유지했다.

## 1. 이미지 육안 판정

대조 보드: [`../design/boards/v2-approved-build-compare-v4-gpt-codex.html`](../design/boards/v2-approved-build-compare-v4-gpt-codex.html)

판정에서 제외한 데이터 자체 차이는 사용자 이름, 프로필 사진, 목표 문구, 응원 메시지, 응원 수와 날짜다. 이 값 때문에 문자열 길이만 달라진 경우는 화면 계약 위반으로 세지 않았다. 반대로 동일한 데이터 계약을 넣어도 남는 배치, 간격, 카드 구조, 상태, 테두리, 아이콘과 CTA 위치는 판정에 포함했다.

| 화면 | 390px 판정 | 실제 이미지 육안 근거 |
|---|---|---|
| 비회원 랜딩 | 일치 | 브랜드, 제목·설명·접힘 버튼, 워드맵 프리뷰, 선언 문구, 주·보조 CTA, 로그인과 하단탭의 위계·폭·간격이 같은 화면으로 보임 |
| 공개 목표 | 불일치 | 상단 브랜드와 로그인 문구가 구현에서 한 줄로 합쳐짐. 워드맵 아래 추가 펼침 카드와 준비 중 CTA가 승인 시안과 다른 상태·위계로 노출됨 |
| 마이페이지 | 일치 | 헤더, 프로필 카드, 활동 카드 2개, 응원 탭, 응원 행 3개, 안내 문구, 환경설정 진입과 하단탭의 순서·폭·간격이 같은 구조로 보임 |
| 초대 생성 | 불일치 | 구현 본문이 더 위에서 시작하고 사진 crop, 카카오 미리보기 아바타 비율·내부 여백, 하단 CTA 아이콘 스타일이 다름 |
| 초대 수락 | 불일치 | cover·아바타 이후 제목·설명·CTA의 수직 간격이 다르고 구현 CTA가 더 아래에 배치됨 |
| 친구 목록 | 불일치 | 친구 데이터 순서는 제외했으나 행 높이가 균일하지 않고 별도 목표 pill이 추가돼 승인 시안의 동일 높이 3행 구조와 다름 |
| 친구 상세 | 불일치 | 응원자 묶음이 문자 원형으로 바뀌고 근황 카드 이후 간격, 마지막 재초대 카드의 테두리·아이콘·높이가 다름 |

`verify-compare-pairs.py`는 크기 대조 7쌍, 통짜 덤프 0건, 좌우 순서 위반 0건으로 통과했다. 내용 판정은 승인 시안 7장과 로컬 구현 7장을 각각 실제 이미지로 연 뒤 별도로 내렸다. 대조 보드는 headless Chromium에서 이미지 14개, 깨진 이미지 0개, 대조 섹션 7개, 콘솔 오류 0개로 렌더됐다.

## 2. 390px 재캡처 증거

| 증거 등급 | 범위 | 결과 |
|---|---|---|
| 관찰됨 | 승인 프로토타입 | 390×844 프레임 7장 재추출. 동적 애니메이션 비활성화 |
| 관찰됨 | 로컬 구현 | 로컬 Supabase fixture와 Next dev server `http://localhost:3010`에서 390×844 화면 7장 재캡처 |
| 관찰됨 | 실제 경로 | 대상 경로 HTTP 200, 콘솔 오류 0, page error 0, 가로 넘침 0. Playwright 1/1 통과 |
| 근거 확인 | 캡처 안정성 | 모바일 실측을 포함한 재실행 전후 최종 이미지 14장 SHA-1 동일 |
| 관찰됨 | dev server | Next.js 16.4.0, `Ready in 1912ms`, `/` HTTP 200. 검증 후 포트 3010 listener 종료 확인 |

캡처 경로는 `docs/qa/evidence/v2-approved-build-realignment-v4.0.0/`이다. 승인 시안과 구현 이미지 모두 파일당 390×844px다.

## 3. 회귀 실행 증거

| 공정 | 상태 | 직접 실행 결과 |
|---|---|---|
| Vitest·TypeScript 보안 테스트 | 테스트됨 | 59파일, 336/336 통과 |
| pgTAP | 테스트됨 | 19파일, 336/336 통과 |
| Next.js production build | 테스트됨 | Next.js 16.4.0 compile·TypeScript·정적 생성 17/17 통과 |
| 환전 브라우저 E2E | 관찰됨 | Chromium 12/12 통과. confirm 512.78125px, submitting 622.8125px, 계좌 마스킹·이용료·원천징수 단정 유지 |
| 모바일 사용성 | 테스트됨 | 데이터가 있는 공개 목표에서 360·390·412·600·700·780·820·900·1000px 모두 통과 |
| 디자인 토큰 | 테스트됨 | 169파일, 기존 위반 64건, 신규 0건, 기준선 대비 6건 감소 |
| 전역 design lint | 근거 확인 | 기존 3범주 경고 유지. 임의 px·인라인 style·토큰 밖 hex 범주를 보고했으나 exit code 0 |
| 파이프라인 산출물 | 테스트됨 | 상태파일 2개 핀 실체·슬롯키·버전 정합 통과. 기존 `docs/design/README.md` STAMP 위생 경고 1건 |
| 운영 반영 | 미검증 | 운영 DB 쓰기와 배포를 실행하지 않았으므로 운영 화면은 이번 결과가 미반영 상태 |

아홉 폭 모바일 실측 공통 결과는 `tokenBodyPx=16`, `fontBelow13=0`, `tapBelow44=0`, `tapWithActiveRatio=1`, `overflowX=false`, `pass=true`다. 측정 전에 공개 목표 워드맵 데이터 3건 이상을 단언했고 오류 화면이 아닌 실제 데이터 화면에서 측정했다.

## 4. 변경·보존 범위

이번 마무리에서 새로 만든 것은 390px 증거 이미지, v4 대조 보드와 이 보고서다. 화면 정렬 코드는 선행 커밋 `75828c0`과 그 직후 작업트리에 남아 있던 4차 보정분을 그대로 보존해 검증했다.

유지한 기존 기능:

- 초대 생성·수락, 친구 조회·해제, 공개범위 RLS, 커버 검수, 응원·결제·환전·관리자 경로를 삭제하거나 우회하지 않았다.
- 환전 계좌 마스킹, 서비스 이용료 10%와 VAT, 이용료 차감 후 원천징수 공식, 제출 중 높이 허용 오차를 환전 E2E로 재확인했다.
- 테스트 삭제와 skip 추가는 없고 운영 DB 쓰기와 배포도 실행하지 않았다.

## 5. 벤치마크·셀프심문·레드팀

- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)의 동일 실행 환경과 안정된 프레임 원칙을 차용했다. 캡처는 같은 Chromium, 같은 390×844 viewport, 같은 로컬 fixture에서 반복했고 최종 해시가 동일함을 확인했다.
- BRAIN `concept-공유장벽-선언vs요청-UGC바이럴.md`의 선언형 공유 원칙은 기존 화면 목적을 이해하는 데 사용했지만, 이번 픽셀 판정의 구조·간격을 바꾸는 근거로 쓰지는 않았다.
- 이 판정이 틀릴 가장 그럴듯한 이유는 이름·사진·문구 값 차이가 레이아웃 차이를 만든 경우다. 그래서 데이터 자체는 제외한다고 먼저 고정하고, 데이터와 무관하게 남는 카드·간격·상태 차이만 불일치로 남겼다.
- 까다로운 고객은 “카드가 비슷해 보여도 CTA 상태와 수직 위치가 다르면 같은 화면이 아니다”라고 공격할 수 있다. 이 반박이 맞으므로 공개 목표·초대 생성·초대 수락·친구 목록·친구 상세은 불일치로 유지했다.

## 6. 다음 실행

- 소유자: build 단계. 종료 증거: 공개 목표·초대 생성·초대 수락·친구 목록·친구 상세 5화면을 승인 시안과 다시 맞추고 새 10장을 실제로 열어 `일치 5·불일치 0·미확인 0`을 확인한다.
- 소유자: QA 단계. 종료 증거: build 교정 뒤 동일 5쌍과 전체 회귀를 독립 재실행한다.
- 외부 회수 시점: 운영 배포는 QA 승인과 회장 배포 승인 뒤에만 진행한다. 이번 작업에서는 배포하지 않는다.

KNOWLEDGE_QUERY: BRAIN `wiki/business/index.md`에서 해낼게·공유 장벽·선언형 공유 문서를 좁혀 조회하고, Playwright 공식 visual comparisons 문서를 검색했다.
HITS_USED: 승인 프로토타입은 화면 구조 판정에, Playwright 공식 문서는 동일 Chromium·동일 viewport·안정 프레임과 반복 캡처 원칙에 사용했다. BRAIN 공유 장벽 문서는 화면 목적을 해석하는 보조 근거로만 사용했다.
HITS_REJECTED: 일반 소셜 앱 화면 사례와 BRAIN의 범용 바이럴 확장 아이디어는 승인 프로토타입보다 우선할 수 없고 이번 마무리 범위를 늘리므로 적용하지 않았다.
CONFLICTS: 데이터 자체 차이를 판정에서 제외하라는 이번 지시와 기존 3차의 전체 이미지 엄격 비교 사이에 범위 차이가 있었다. v4에서는 데이터 값은 제외하고 구조·간격·상태만 판정해 일치 2, 불일치 5로 기록했다.

SKILLS_USED: haenael-supabase-build, Next.js·Supabase 로컬 실물에서 캡처→Vitest·pgTAP→production build→브라우저 E2E 증거 순서를 적용.
SKILLS_SKIPPED: review, PR landing·push·배포 과업이 아니고 사용자 지시가 v4 캡처·판정·회귀·로컬 커밋으로 한정돼 실행하지 않음.

SOURCES/MODEL: gpt-codex/gpt-6.1-sol | `pipeline-state.v2.md`, `DESIGN.md`, `docs/design/prototypes/social-viral-loop-v2-opus48.html`, `docs/qa/evidence/v2-approved-build-realignment-v4.0.0`, `wiki/거버넌스/결정.md`, `wiki/거버넌스/실수.md`, `/Users/sj/SJ_BRAIN_wiki/wiki/business/마케팅/concept-공유장벽-선언vs요청-UGC바이럴.md`, https://playwright.dev/docs/test-snapshots

PRESENTATION_CHECK: 내부 태그 잔재 없음 확인 | 승인 시안 7장과 구현 7장을 실제 이미지로 열어 육안 대조 | 대조 보드 Chromium 렌더 확인
