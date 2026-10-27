# 해낼게 V2 S1 보완 독립 QA 재검수

> **판정: PASS. S1 closed.** 이전 반려 QAS1-01~04가 모두 해소됐다. 독립 F1은 현재 staging에서 1/1 PASS, skip 0이며, 인증된 목표 관리 화면의 9개 viewport와 reload 영속성을 다시 관찰했다.

- 검수 시각: 2026-10-27 04:23 KST
- 범위: S1 목표 관리, 편집, 응원자 목록의 QAS1-01~04 보완분만
- 승인 기준: `docs/design/prototypes/social-viral-loop-v3-opus5.html` v3.0.0
- staging deployment: `dpl_2QeUAd65Qn4Tcfs9SvCuZaFWmbC3`
- 운영 경계: free staging만 검증. 운영 배포, 운영 DB 변경, 과금, 커밋 0건

## 1. 보완 결함 재판정

| 결함 | 보완 증거 | 재판정 |
|---|---|---|
| QAS1-01, S1 화면 9폭 증거 부재 | 독립 F1의 인증 route `/me/goal/372`에서 360·390·412·600·700·780·820·900·1000px를 실측. 모든 폭에서 `fontBelow13=0`, body token 16px, tap 44px 미만 0, active 100%, overflow 0, bottom clearance 80px | **해소** |
| QAS1-02, 편집→응원자 연속 데모 부재 | owner 상단→편집기→제목 입력→저장→reload 제목 보존→8명 preview→18명 전개를 한 PW-02에서 assertion하고 01~06 PNG로 보존 | **해소** |
| QAS1-02, 서로 다른 상태의 시안 대조 | 승인 prototype과 staging을 390×844, 응원자 전개 상태, 첫 card top 72px로 정렬한 07·08 PNG를 직접 대조. 데이터 행·이름·횟수 차이는 별도 경계로 기록 | **해소** |
| QAS1-03, 공식 구현 문서 누락 | `docs/build-log.md`와 `docs/구현현황.md` 최상단에 배포 ID, 기능·회귀, 실패 이력, 운영 경계를 기록 | **해소** |
| QAS1-04, 근거보다 앞선 PASS 표시 | 보완 중에는 재검수 대기로 낮춰 두었고, 이 독립 PASS 이후에만 index·manifest·demos·공식 문서를 closed로 갱신 | **해소** |

## 2. 독립 실행 결과

비밀값은 staging wrapper로만 주입했고 화면·로그·보고서에 출력하지 않았다.

| 실행 | 결과 | 종료코드 | skip |
|---|---:|---:|---:|
| 현재 staging health와 Supabase project ref 확인 | HTTP 정상, `database=ok`, project ref 일치 | 0 | 해당 없음 |
| heavy-slot + F1 `PW-02` 독립 실행 | 1 PASS, 0 FAIL | 0 | 0 |
| 현재 SHA-256과 source manifest·배포 snapshot 대조 | in-scope 4파일과 prototype hash 일치 | 0 | 해당 없음 |
| 캡처 01~08 직접 검토 | 8장 열림, 최종 06·07·08 재현 hash 일치 | 0 | 해당 없음 |

독립 실행 fixture는 `/me/goal/372`였다. 저장 뒤 reload에서 `토익 950 넘길게`가 유지됐고, 목록은 8명에서 18명으로 전개됐으며 pill 18개의 색·radius·padding assertion이 통과했다. 테스트 종료 시 cleanup error가 없었고 fixture URL은 재사용하지 않는다.

## 3. 모바일 측정기 정합

S1 helper와 정본 `mobile-ergonomics-measure.mjs`를 코드로 대조했다.

| 판정축 | 정본 | S1 helper | 판정 |
|---|---|---|---|
| 글자 | 13px 미만 0 | 13px 미만 0 | 동일 |
| 본문 token | `.font-designer-14r ≥ 16px` | 동일 | 동일 |
| tap target | 43.5px 미만 0 | 동일 | 동일 |
| active | 규칙 1개 이상, tap coverage 90% 이상 | 동일. 실측 27규칙, 100% | 동일 |
| overflow | document 폭 초과 없음 | 차이값 0 단언 | 동일 |
| fixed bottom | 높이 0 또는 clearance 이상 | 동일 | 동일 |

`median_font=13`은 참고값일 뿐 합격 기준이 아니다. 잘못 만들었던 `median_font >= 16` assertion과 그에 따른 16px 확대 3곳은 폐기·복구됐으며, 현재 diff에는 남아 있지 않다. S1 helper는 한 글자 text node까지 포함해 정본보다 좁히지 않은 조건으로 통과했다.

## 4. 기능·디자인 증거 판정

### 편집·저장·reload·목록 전개

01~06 이미지를 전부 직접 열었다. 편집기 열기, 제목 입력, 저장 후 reload된 제목, 8명 preview, 18명 전개가 순서대로 존재한다. 독립 실행의 임시 캡처에서도 같은 흐름이 재현됐다.

04 reload 캡처는 제목은 정상 반영됐지만 cover와 첫 avatar가 loading placeholder인 시점에 찍혔다. 이는 screenshot이 `domcontentloaded`와 제목 assertion 직후 생성된 데모 품질 제한이다. reload 영속성은 실제 DOM assertion으로 통과했고, 이후 05·06·08에서는 응원자 이미지와 목록이 완전히 렌더됐다. 따라서 기능 결함이나 출고 차단으로 세지 않는다.

### 승인본과 staging 대조

07과 08은 모두 390×844이고 첫 응원자 card top이 72px다. 목록 행 구조, avatar·이름·메시지·횟수 pill·시간의 열 배치, 경계선, 하단 nav가 같은 계열로 렌더된다. 22.14% pixel delta는 prototype 11개와 staging fixture 18개의 DOM 데이터 행, 이름, 메시지, 횟수 차이를 포함한다. 픽셀 동일성은 주장하지 않으며 배치·component·pill 정합을 판정했다.

기존 evidence의 `visible_rows` 명칭은 viewport 안에 실제로 보이는 행이 아니라 렌더된 DOM 행 수를 뜻했다. 표시 문서는 `DOM 데이터 행`으로 교정했다. 비교 자체의 viewport·scroll 정렬에는 영향이 없다.

## 5. F2와 전체 회귀 재사용

- F2: 기존 독립 결과 2/2 PASS, skip 0을 재사용했다. AUTH-GOAL-01·SMOKE-01 본문과 인증·라우트 소스는 바뀌지 않았다. 이후 제품 변경은 S1 pill과 S1 action·search active CSS에 한정되고, 변경 화면의 console·overflow·tap·active는 이번 F1 9폭에서 다시 검증했다.
- 전체 회귀: `full-regression-remediation.log`는 현재 CSS와 단위 테스트가 수정된 뒤 실행됐고 78파일 439/439 PASS다. 그 뒤 제품 소스 hash는 manifest와 동일하다. 따라서 다시 실행하지 않았다.

## 6. 소스·배포 신원

- HEAD와 manifest base commit: `f4d38f3fae0d5c7908ef5499281f2f9bf9d956de`
- CSS SHA-256: `e83cb2dc47aa609877fdd60de19bcce81f0a218d678458cf0e443bc72db8598a`, 배포 snapshot과 동일
- component SHA-256: `0bd01649c16ad15b74da9af83d348fe9d9f72e245720b5cabe69adc16caa219d`, 배포 snapshot과 동일
- E2E SHA-256: `cde309c92a2321b4b5c34a393f678af1d4cdf1af3b10f679d143af5f6910a102`
- 승인 prototype SHA-256: `afca1c0374e5c7f7df6e874e41be3f59f6463b2b256f5e2c4e6fef6b24d5de9a`
- staging alias는 올바른 deployment `dpl_2QeUAd65Qn4Tcfs9SvCuZaFWmbC3`를 가리키며 health의 Supabase project ref가 일치한다.

중앙값 기준으로 잘못 만든 snapshot은 alias에 연결되지 않았고 evidence 사용 금지로 manifest에 분리돼 있다.

## 7. 출고 기준

| 필수 항목 | 판정 | 근거 |
|---|---|---|
| 변경 기능 happy + edge | 충족 | F1 독립 1/1, F2 재사용 2/2, 총 3 PASS, skip 0 |
| 누적 회귀 | 충족 | 78파일, 439 PASS, 0 FAIL, 0 skip |
| 디자인 QA | 충족 | 인증 S1 9폭, 연속 6단계, 동일 상태 390×844 시안 대조 |

필수 3종 모두 충족했다. QAS1-01~04는 closed다.

## 8. 이 QA가 보장하는 것과 보장하지 않는 것

이 QA는 free staging의 인증된 목표 관리 화면에서 제목 편집이 저장되고 reload 뒤 유지되며, 응원자 목록이 8명에서 18명으로 전개되고 pill이 승인 스타일로 렌더된다는 것을 보장한다. 9개 viewport에서 글자·본문 token·tap·active·overflow·fixed-bottom 정본 기준을 통과했고, QAS1-01~04 문서·데모 증거가 해소됐다는 것도 보장한다.

이 QA는 S2, S3, 실제 Kakao OAuth, Toss Payments, 운영 DB, 운영 배포를 보장하지 않는다. 04 한 장의 cover loading placeholder는 reload 순간의 데모 품질 제한으로 남지만 이후 완전 렌더 증거와 기능 assertion이 있어 S1 기능 결함으로 판정하지 않았다.

KNOWLEDGE_QUERY: 이전 S1 검수에서 조회한 BRAIN의 해낼게 소셜 증거 맥락과 Playwright 공식 assertion·visual comparison 기준을 재사용했다. 이번에는 새 구조를 정하지 않아 추가 외부 검색을 하지 않았다.

HITS_USED: D-049, 승인 prototype v3.0.0, 정본 `mobile-ergonomics-measure.mjs`, 이전 독립 보고서 QAS1-01~04, 현재 staging F1·회귀·배포 증거를 판정에 사용했다.

HITS_REJECTED: 타 사업체 디자인·일반 마케팅 사례는 확정 prototype의 보완 재검수 범위를 벗어나 사용하지 않았다.

CONFLICTS: 정본 측정기와 폐기된 median 16px assertion이 충돌했다. median assertion과 CSS 확대를 폐기하고 정본 기준을 유지했다. 현재 남은 충돌은 없다.

SKILLS_USED: qa, 현재 staging F1을 headless heavy-slot으로 독립 실행하고 증거를 판정. review, 변경 diff와 측정 helper를 정본·보안·회귀 관점으로 검토.

SKILLS_SKIPPED: 없음.

RUBRIC_SCORE: evidence=5/5 traceability=5/5 reproducibility=5/5 decision=5/5 presentation=4/5 total=24/25

WEAKEST_LINE: reload 직후 cover image가 loading placeholder인 04 캡처는 전체 화면의 완전 렌더 증거로는 쓰지 못한다.

PRESENTATION_CHECK: 내부 tool tag 잔재 없음, Markdown HTML 렌더 완료, 회장 화면 자동 open 없음.

SOURCES/MODEL: gpt-codex(API model ID 미노출) | D-049 | 승인 prototype v3.0.0 | `mobile-ergonomics-measure.mjs` | current source manifest | staging Playwright·Vercel·Vitest 증거
