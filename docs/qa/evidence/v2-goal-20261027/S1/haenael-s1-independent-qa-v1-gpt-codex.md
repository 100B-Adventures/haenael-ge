# 해낼게 V2 S1 독립 QA 검수보고

> **판정: FAIL.** F1과 F2의 staging 기능 검증은 통과했지만, S1 변경 화면의 9개 viewport 검증과 목표 편집부터 응원자 목록까지의 연속 시각 증거가 없다. 필수 디자인 QA가 미충족이므로 S1을 closed로 판정할 수 없다.

- 검수 시각: 2026-10-27 03:46 KST
- 범위: S1 목표 관리, 편집, 응원자 목록만
- 승인 기준: `docs/design/prototypes/social-viral-loop-v3-opus5.html` v3.0.0
- 기반 포맷: `docs/qa/qa-tracker.md`, `docs/qa/design-conformance-matrix.md`
- 운영 경계: free staging만 읽기·검증. 운영 배포, 운영 DB 변경, 과금, 커밋 0건

## 1. 출고 기준 판정

| 필수 항목 | 판정 | 직접 근거 |
|---|---|---|
| 변경 기능 happy + edge | 충족 | F1 `PW-02` 1/1 PASS. F2 `AUTH-GOAL-01`, `SMOKE-01` 2/2 PASS. 총 3 PASS, skip 0 |
| 누적 회귀 | 충족 | 동일 제품 소스에서 QA contracts와 Vitest 78파일, 439테스트 PASS, skip 0. 이후 변경된 E2E 파일은 이 회귀의 import 대상이 아니며 제품 소스 hash는 manifest와 일치 |
| 디자인 QA, 승인 시안 대조 | **미충족** | pill 자체의 색·radius·padding은 일치한다. 그러나 9폭 측정은 S1 `/me/goal/{id}`가 아니라 공개 `/g/{slug}`에서 수행됐고, 데모의 승인본과 실화면은 서로 다른 scroll·interaction 상태다 |

**필수 3종 중 2종 충족, 1종 미충족. 전체 판정은 FAIL이다.**

## 2. 기능·인가·라우트 검증

| ID | 무엇을 확인 | 실제 관찰 | 판정 | 증거 등급 |
|---|---|---|---|---|
| F1 / PW-02 | owner 목표 편집 저장, 편집기 닫힘, 제목 반영, 응원자 8→18명 전개, pill 18개와 CSS | staging fixture `/me/goal/336`에서 1/1 PASS. `display:flex`, `rgb(231, 244, 236)`, `9999px`, `4px 9px` 단언 통과 | PASS | 관찰됨·테스트됨 |
| F2 / AUTH-GOAL-01 | 비로그인 목표 관리 접근 시 데이터 대신 권한 안내, 로그인 링크, 로그아웃 버튼 부재 | 1/1 PASS | PASS | 관찰됨·테스트됨 |
| F2 / SMOKE-01 | 신규 라우트 390px 렌더, console error 0, 가로 overflow 0 | 1/1 PASS | PASS | 관찰됨·테스트됨 |
| 소유권 경계 | 목표 조회가 현재 사용자 소유 목표로 제한되는지 | `page.tsx`가 목표 ID와 `member_id=user.id`를 함께 조건으로 조회한다. 비인증 경계는 E2E로 관찰했다 | PASS | 근거 확인·테스트됨 |
| fixture 재사용 경계 | 실행 URL 정리와 재사용 불가 고지 | 데모가 fixture 삭제와 URL 재사용 불가를 명시한다 | PASS | 근거 확인 |

목표 제목 저장은 실제 staging RPC 성공 뒤 UI가 갱신된 경로다. 다만 페이지 reload 뒤 영속값을 다시 읽는 assertion은 이번 S1 테스트에 없다. 따라서 이 보고가 보장하는 범위는 "저장 요청 성공과 같은 세션의 반영"까지다.

## 3. 결함 목록

### QAS1-01, High: 변경 화면의 9개 viewport 증거가 없다

- `web/e2e/social-web-first.spec.ts:1917`부터 시작하는 모바일 측정은 `/g/${publicSlug}`를 연다.
- 360, 390, 412, 600, 700, 780, 820, 900, 1000px 전부 같은 공개 목표 라우트를 측정한다(`web/e2e/social-web-first.spec.ts:1921-1933`).
- S1 변경 화면은 `/me/goal/${ownerGoal}`이다. 이 화면은 `PW-02`의 390px과 별도 캡처 세트의 390·1024·1280px만 확인됐다.
- 그런데 데모는 라우트 구분 없이 `9 / 9, 360∼1000px`를 S1 통과 지표로 표시한다(`index.html:39-44`, `index.html:80`).

영향: S1 변경 화면의 모바일 타이포그래피, 터치 영역, 눌림 상태, overflow를 9폭에서 보장하지 못한다. 디자인 QA 필수 항목이므로 출고를 차단한다.

### QAS1-02, High: 데모가 목표 편집부터 응원자 목록까지의 연속 흐름을 보여주지 못한다

- 자동화는 편집 저장 뒤 목록을 펼치고 마지막에만 캡처한다(`web/e2e/social-web-first.spec.ts:1067-1101`).
- 실제 데모 캡처는 응원자 목록 부분만 담는다. 편집 진입, 입력, 저장, 제목 반영은 이미지에 없다.
- 승인본은 1170×2532 전체 화면이고 실화면은 390×844의 하단 scroll 상태다. 같은 화면·viewport·scroll 상태의 비교가 아니다(`index.html:49-58`).

영향: 로그는 기능 assertion을 뒷받침하지만, 회장이 데모만 보고 승인 시안과 실제 편집 흐름을 독립 판정할 수 없다. 현재 비교는 pill의 국소 시각 일치만 보장한다.

### QAS1-03, Medium: 구현 진실원에 이번 S1 수정과 배포가 기록되지 않았다

- `docs/build-log.md`의 최신 항목은 2026-10-25이고, 이번 S1 pill 수정, deployment `dpl_2cxStP1bZbumkV4uCmoHPzyQgHYN`, 2026-10-27 실행 결과가 없다.
- `docs/구현현황.md`도 최신 항목이 2026-10-25이다. 이번 S1 독립 검수 결과와 증거 경계가 없다.

영향: 코드·배포물·문서 진실원이 갈라진다. 이번 과제의 수정 권한 밖이므로 지적만 남긴다.

### QAS1-04, Medium: 데모의 PASS 표시는 독립 QA 결과와 충돌한다

- `index.html:33`은 `S1 PASS`라고 표시하고, 9폭과 전체 흐름을 완료 근거로 쓴다.
- QAS1-01과 QAS1-02 때문에 독립 QA 결론은 FAIL이다.

영향: 데모를 단독으로 보면 필수 디자인 QA가 끝난 것으로 오인한다. 제품 코드와 데모 파일은 이 검수의 수정 권한 밖이므로 변경하지 않았다.

## 4. 승인 시안 대조

직접 연 파일:

- 승인 prototype: `docs/design/prototypes/social-viral-loop-v3-opus5.html`
- 승인 캡처: `docs/qa/evidence/v2-ssot-20261025/captures-v10-staging-20261025-123603/approved-goal-detail-390.png`
- staging 캡처: `docs/qa/evidence/v2-goal-20261027/S1/captures/pw-02-owner-edit-supporter-pill-390.png`
- viewport 캡처: `docs/qa/evidence/v2-goal-20261027/S1/captures/viewport/{approved,dev}-goal-detail-390.png`

| 대조 축 | 시안 | staging | 판정 |
|---|---|---|---|
| 응원 횟수 pill 색 | clover-soft 연녹색 | `rgb(231, 244, 236)` | 일치 |
| 응원 횟수 pill radius | 완전한 capsule | `9999px` | 일치 |
| 응원 횟수 pill 여백 | compact | `4px 9px` | 일치 |
| 전체 화면·요소 순서 | 목표 관리 전체 화면 | 응원자 목록까지 scroll된 crop | 미확인 |
| 편집 진입·입력·저장 상태 | interaction 상태 포함 필요 | 최종 상태 캡처만 존재 | 미확인 |
| 반응형 9폭 | S1 목표 관리 화면이어야 함 | 공개 목표 화면 측정 | 불일치 |

## 5. 소스와 배포 신원

- 현재 HEAD와 manifest의 base commit은 모두 `f4d38f3fae0d5c7908ef5499281f2f9bf9d956de`다.
- 승인 prototype SHA-256은 현재 파일과 pin 모두 `afca1c0374e5c7f7df6e874e41be3f59f6463b2b256f5e2c4e6fef6b24d5de9a`다.
- `globals.css`와 `GoalSupporterList.tsx`의 현재 SHA-256은 배포 snapshot SHA-256과 각각 일치한다.
- 단위 테스트와 E2E 파일의 현재 SHA-256도 manifest와 일치한다.
- in-scope 배포 source hash 차이는 관찰되지 않았다. 다만 manifest는 전체 deployment bundle hash가 아니라 S1 관련 파일별 hash를 기록한다.

## 6. 회귀 재사용 근거

전체 회귀는 다시 실행하지 않았다. 기존 로그는 제품 소스가 마지막으로 수정된 02:46 이후인 02:57∼03:01에 생성됐고, 78파일 439테스트가 전부 통과했다. 이후 03:07에 바뀐 것은 Playwright E2E instrumentation뿐이며 QA contracts와 Vitest의 import 대상이 아니다. 03:15 manifest가 현재 네 파일의 hash를 다시 고정했다. 따라서 같은 제품 소스와 환경의 회귀 결과로 재사용했다.

## 7. 독립 실행 명령과 결과

비밀값은 `/Users/sj/.sj-agent-harness/secrets/haenael-ge-qa-staging.env`를 wrapper로만 주입했고 출력하지 않았다.

| 명령 | 종료코드 | 결과 |
|---|---:|---|
| `.goal/feature-list.json`의 `env_check` | 0 | staging health 200, Supabase project ref 일치 |
| F1 verify 명령, `--grep 'PW-02'` | 0 | 1 passed, 0 skipped |
| F2 verify 명령, `--grep 'AUTH-GOAL-01\|SMOKE-01'` | 0 | 2 passed, 0 skipped |
| headless Chromium으로 `S1/index.html` 렌더·링크 검사 | 0 | 이미지 2개 로드, 로컬 링크 12개 존재, console error 0 |
| `curl --fail .../api/health` | 0 | HTTP 200, staging project ref 일치 |
| `pipeline-artifact-lint.sh <repo>` | 0 | 필수 산출물 정합 통과, S1 외 canonical pin 위생 경고 16건 |
| `git diff --check -- <S1 4개 파일>` | 0 | whitespace 오류 0 |

누적 회귀 재사용 결과: 78파일, 439 PASS, 0 FAIL, 0 skip. 독립 S1 E2E 결과: 3 PASS, 0 FAIL, 0 skip.

## 8. 정적 코드리뷰 5축

| 축 | 판정 | 근거 |
|---|---|---|
| 운영 버그 | 신규 제품 코드 결함 미발견 | 변경은 pill class·토큰과 assertion 보강에 한정 |
| 예외 처리 | 기능 범위 PASS | 저장 RPC 오류는 편집 sheet가 오류로 처리. 비인증 화면은 별도 권한 상태로 분기 |
| 성능 | 신규 위험 미발견 | 최대 18개 pill 렌더이며 신규 조회·반복 API가 없다 |
| 보안 | 범위 내 PASS | 서버 목표 조회가 ID와 현재 `member_id`를 함께 제한. 비인증 E2E 통과 |
| 가독성 | PASS | 승인 토큰 class를 사용하고 테스트 의도가 이름과 assertion에 드러난다 |

## 9. 이 QA가 보장하는 것과 보장하지 않는 것

이 QA는 free staging에서 owner 목표 제목 저장 요청이 성공하고 같은 세션에 새 제목이 반영되며, 응원자 목록이 8명에서 18명으로 펼쳐지고 18개 응원 횟수 pill이 승인 토큰 값으로 렌더된다는 것을 보장한다. 비로그인 사용자가 목표 관리 데이터를 보지 않고 권한 안내를 받으며, 390px 신규 라우트에 console error와 가로 overflow가 없다는 것도 보장한다.

이 QA는 S1 목표 관리 화면의 9개 viewport 적합성, reload 뒤 저장 영속성, 목표 편집 전 과정을 사람이 이미지로 재검토할 수 있는 연속 데모, 운영 환경 동작을 보장하지 않는다. S2, S3, Kakao OAuth, Toss Payments, 운영 DB, 운영 배포는 검수하지 않았다.

## 10. 벤치마크 적용

- [Playwright assertions](https://playwright.dev/docs/test-assertions): 비동기 auto-retrying assertion을 실제 UI 상태 판정에 사용했다.
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots): 시각 비교는 같은 환경과 비교 가능한 상태가 필요하다는 기준을 적용했다. 이번 증거는 viewport·scroll 상태가 달라 전체 화면 정합 증거로 인정하지 않았다.
- 외부 일반 baseline 대신 레포의 승인 prototype v3.0.0을 제품별 시각 정본으로 우선했다.

## 11. 종료 판정

| 항목 | 수치 |
|---|---:|
| S1 기능 항목 | 2/2 기능 검증 통과 |
| 독립 E2E | 3 PASS, 0 FAIL, 0 skip |
| 누적 회귀 | 439 PASS, 0 FAIL, 0 skip |
| 필수 출고 기준 | 2/3 충족 |
| 등록 결함 | High 2, Medium 2 |
| 최종 판정 | **FAIL, S1 open 유지** |

띄운 것 / 끈 것: headless Chromium은 명령 종료와 함께 종료. 새 dev server, Docker, Supabase local, simulator, emulator를 띄우지 않았다.

KNOWLEDGE_QUERY: `wiki/business/index.md`에서 해낼게 S1의 소셜 증거·응원자 가시성 맥락을 좁혀 조회하고, Playwright assertion·visual comparison 공식 문서를 조사했다.

HITS_USED: `wiki/business/pmf/idea-성장응원-도네이션-플랫폼.md`는 응원자 목록이 사회적 증거라는 제품 맥락 확인에만 사용했다. D-049, 승인 prototype v3.0.0, DESIGN.md, Playwright 공식 문서를 판정 기준으로 사용했다.

HITS_REJECTED: 다른 사업체의 성장 루프와 마케팅 사례는 확정된 S1 시각·기능 QA 범위를 바꾸므로 사용하지 않았다.

CONFLICTS: 외부 Playwright 기준과 회장 정본의 충돌은 없다. 다만 builder 데모의 `S1 PASS`·9폭 표기와 실제 S1 검수 범위가 충돌한다.

SKILLS_USED: qa, staging 기능을 headless E2E로 독립 실행하고 증거 범위를 판정. review, 변경 diff를 버그·예외·성능·보안·가독성 5축으로 검토.

SKILLS_SKIPPED: 없음.

RUBRIC_SCORE: evidence=5/5 traceability=5/5 reproducibility=4/5 decision=5/5 presentation=4/5 total=23/25

WEAKEST_LINE: S1 라우트 자체의 9폭 실행 로그가 없어 디자인 QA를 재현할 수 없다.

PRESENTATION_CHECK: 내부 tool tag 잔재 없음, Markdown 구조·링크 검토 완료, 화면을 전면에 열지 않음.

SOURCES/MODEL: gpt-codex(API model ID 미노출) | `wiki/거버넌스/결정.md` D-049 | `wiki/거버넌스/실수.md` | `.goal/execution-brief.md` | `.goal/feature-list.json` | `source-manifest.json` | 승인 prototype v3.0.0 | Playwright 공식 문서
