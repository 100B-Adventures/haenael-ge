# 해낼게 S2 독립 QA 보고서 v2

> STAMP: 2026-10-27 11:16 KST | model gpt-codex(API model ID 미노출) | agent qa-verifier | skills qa, review | scope S2 QAS2-01/02 remediation only | verdict PASS
>
> 기반 포맷: `docs/qa/evidence/v2-goal-20261027/S2/haenael-s2-independent-qa-v1-gpt-codex.md`. v1 반려 원문은 유지하고 보완 재검수 결과만 이 문서에 추가했다.

## 목차

- [결론](#결론)
- [반려 항목 재검수](#반려-항목-재검수)
- [출고 기준 판정](#출고-기준-판정)
- [기능·회귀 증거 재사용](#기능회귀-증거-재사용)
- [디자인과 데모 검수](#디자인과-데모-검수)
- [보장 범위](#보장-범위)
- [실행 명령과 종료 코드](#실행-명령과-종료-코드)

## 결론

**PASS. QAS2-01과 QAS2-02가 모두 해소되어 S2를 closed로 판정한다.** 15번 캡처는 대상 커버 검수 카드와 승인 CTA를 실제 viewport 안에 보여준다. 승인 건강 커버와 staging 실화면은 같은 390×844, scroll top 0, reduced-motion 조건에서 대조했고, 비데이터 장식 경계도 DOM으로 분리했다.

제품 코드는 수정하지 않았다. S1 독립 PASS는 보존했고 S3, 상태 파일, 운영 배포, 운영 DB, 과금, 커밋은 건드리지 않았다.

## 반려 항목 재검수

| 결함 | 독립 재검수 | 판정 | 증거 |
|---|---|---|---|
| QAS2-01 대상 관리자 검수 카드·승인 CTA 미노출 | `15-admin-review-queue-390.png`를 직접 열어 `토익 900 넘길게`, `서연 · 68KB`, 승인·반려 CTA가 390×844 viewport 안에 함께 보이는지 확인했다. PW-05 코드는 대상 카드 식별, `scrollIntoViewIfNeeded`, 목표명·승인 버튼 visibility와 bounding box를 assertion한 뒤 캡처한다. | 해소 | `captures/flow/15-admin-review-queue-390.png`, `logs/F4-PW-04-PW-05-remediation-v2.log`, `web/e2e/social-web-first.spec.ts` |
| QAS2-02 승인본과 staging의 비데이터 장식 불일치 | 승인본 `11`과 staging `10`을 각각 직접 열어 같은 display 조건으로 대조했다. owner mark는 `display:none`, 정적 heart는 0, 승인 ambient node 5개는 DOM에 보존되고 reduced-motion에서만 숨는다. 화면의 남은 🍀는 `data-wordmap-item` 목록에 포함된 실제 keyword다. | 해소 | `captures/flow/11-approved-goal-health-display-390.png`, `captures/flow/10-cover-owner-health-display-390.png`, `captures/flow/cover-visual-equivalence.json`, `logs/PW-03-remediation-v2-dom-boundary.log` |

실제 데이터 차이는 디자인 결함과 분리했다. 제목, 날짜, 집계값, keyword 내용 차이는 fixture 데이터 경계이고, 주축·요소 순서·표시/숨김·컴포넌트 위계는 승인본과 일치한다.

## 출고 기준 판정

| 필수 항목 | 판정 | 근거 |
|---|---|---|
| 기능 happy·edge | 충족 | F3 2/2, F4 2/2, skip 0. 프로필 저장·reload, preset 저장·reload/public, 실제 upload `REVIEW`→관리자 승인→같은 asset ID `APPROVED`→owner/public 완전 로드 |
| 누적 회귀 | 충족 | 최종 제품 소스 전체 회귀 78파일 439 passed, skip 0. 현재 `web/src`와 deployment snapshot 독립 `diff -qr` exit 0 |
| 디자인 QA | 충족 | 승인본과 staging 실화면 2장을 직접 열어 같은 390×844·reduced-motion 조건에서 대조. QAS2-02 DOM 경계 해소 |
| 데모 증거 | 충족 | QAS2-01 대상 카드·CTA 캡처 확인. S2 허브 19개 이미지와 로컬 링크를 headless로 재검수 |

필수 기능·회귀·디자인 QA 3종이 모두 충족됐다.

## 기능·회귀 증거 재사용

- F3·F4를 다시 전량 실행하지 않았다. 최종 deployment `dpl_8vUvNNqSBhBa2cJ98bnMrRxKNt58` snapshot과 현재 `web/src`가 독립 `diff -qr` exit 0이고, 영향 범위 PW-03의 최종 exact log가 1/1 PASS이므로 현재 소스 증거를 재사용했다.
- PW-03 보완 로그는 건강 preset 저장·reload·public 반영과 18개 인증 route×폭을 통과한다. `font_below_13=0`, 본문 토큰 16px, 44px 미만 누름 0, active 100%, overflow 0이다. `median_font=13`은 참고값이며 합격 기준으로 쓰지 않았다.
- F4 보완 로그는 실제 asset `244f156f-2095-42f9-9c27-a1584bbfae1c`의 `REVIEW`→같은 ID `APPROVED`, quarantine/public 69,612 bytes, owner/public 이미지 완전 로드를 확인한다.
- 최종 회귀 로그는 78파일 439 passed, skip 0, exit 0이다. 마지막 reduced-motion CSS가 포함된 fresh run이므로 이전 회귀보다 우선한다.
- 독립 PW-03 재실행을 heavy slot에서 시도했으나 slot 2/2 점유로 test process가 시작되기 전에 대기를 취소했다. 이는 테스트 실패가 아니며, 사용자 지시의 불필요한 반복 금지에 따라 같은 최종 소스의 exact log와 독립 source diff를 재사용했다.

## 디자인과 데모 검수

| 화면 | 조건 | 판정 | 근거 |
|---|---|---|---|
| 마이페이지 | 390×844, scroll top 0, 이미지 완전 로드 | 일치 | 정보 위계·카드 순서·탭·하단 탐색 구조 일치. 이름·소개·사진·집계값은 fixture 차이 |
| 건강 커버 | 390×844, scroll top 0, `goal-health`, reduced-motion, 이미지 완전 로드 | 일치 | owner mark 숨김, static heart 0, ambient DOM 5 보존·reduced-motion에서만 숨김, 🍀는 실제 keyword |
| 관리자 승인 | 390×844, 대상 카드 viewport 내부 | 일치 | 대상 목표·asset 정보·승인 CTA가 한 화면에 노출 |

데모 허브는 raw Markdown·JSON을 직접 링크하지 않고 렌더 HTML을 사용한다. 실행 fixture는 teardown에서 정리되어 기록된 `/me/goal/{id}`와 `/g/{slug}` URL을 현재 재사용할 수 없다는 고지도 유지한다.

## 보장 범위

이 QA는 현재 free staging deployment에서 S2 F3·F4의 Auth·API·DB·Storage happy flow, 타인 프로필 보존, owner asset 귀속, 관리자 승인, 같은 asset ID 전이, owner/public 이미지 완전 로드, 18개 route×폭 사용성, 승인 prototype v3.0.0 디자인 경계, 439개 회귀를 보장한다.

보장하지 않는 것은 production 배포·production DB, 실제 외부 OAuth·결제·과금, 명시 로그 밖의 비관리자 승인 음성 경로, 정리된 fixture URL 재사용, S3 기능이다.

## 실행 명령과 종료 코드

| 실행 | 종료 코드 | 통과·실패·skip |
|---|---:|---|
| `diff -qr web/src /private/tmp/haenael-s2-remediation-20261027-YwhFus/web/src` | 0 | 차이 0 |
| PW-03 최종 영향 verify 증거 재사용 | 0 | 1 passed, 0 failed, 0 skipped |
| F4 PW-04·PW-05 최종 증거 재사용 | 0 | 2 passed, 0 failed, 0 skipped |
| 최종 제품 소스 전체 회귀 증거 재사용 | 0 | 78 files, 439 passed, 0 skipped |
| S2 최종 데모 headless 검수 1회 | 0 | 이미지 19/19, 누락 링크 0, raw 문서 링크 0, console error 0, overflow 0 |
| 독립 PW-03 heavy-slot 시도 | 130 | slot 대기 중 취소, test 미개시, 실패·skip 집계 대상 아님 |

새 제품 결함 0건, 미해소 출고 차단 결함 0건, skip 0건이다. S2 closed로 S3 착수 선행조건은 충족됐다.

SKILLS_USED: qa, staging 기능·데모·시각 증거 판정에 사용. review, assertion coverage와 source·회귀 재사용 근거 검토에 사용.
SKILLS_SKIPPED: 없음.

KNOWLEDGE_QUERY: S2 QAS2-01/02 보완 로그, 최종 캡처, 승인본·staging DOM 경계, deployment source identity, 전체 회귀, 데모 렌더 상태를 repo-local로 조회했다.
HITS_USED: S2 `source-manifest.json`, v1 보고서, PW-03·F4 보완 로그, 최종 회귀 로그, 10·11·15번 캡처, visual-equivalence JSON, E2E assertion 코드, deliverables render smoke. 두 결함 해소와 source·demo 판정에 직접 사용했다.
HITS_REJECTED: S1 정본 전체와 S3 자료는 범위 밖이며 재독 금지 지시에 따라 사용하지 않았다. Builder 상태 문구 자체는 증거로 사용하지 않고 로그·코드·이미지·source diff로 교차확인했다.
CONFLICTS: 없음. v1의 두 반려 사유는 최종 이미지와 DOM 경계 증거로 해소됐다.

SOURCES/MODEL: gpt-codex(API model ID 미노출) | `docs/qa/evidence/v2-goal-20261027/S2/source-manifest.json` | S2 v1 report·captures·logs·index | `web/e2e/social-web-first.spec.ts` | `docs/v2-deliverables/haenael-v2-deliverables-render-smoke-v1-gpt-codex-20261027-1101.json`

PRESENTATION_CHECK: 내부 태그 잔재 없음 확인. Markdown과 읽기 HTML 렌더. 회장 화면 자동 열기 없음.

RUBRIC_SCORE: evidence=5 traceability=5 clarity=5 completeness=5 presentation=4 total=24/25
WEAKEST_LINE: 비관리자 관리자 승인 음성 경로는 이번 QAS2-01/02 보완 재검수 범위 밖이라 새 보증으로 올리지 않았다.
