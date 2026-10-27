# 해낼게 S2 독립 QA 보고서 v1

> STAMP: 2026-10-27 05:02 KST | model gpt-codex(API model ID 미노출) | agent qa-verifier | skills qa, review | scope S2 only | verdict FAIL
>
> 기반 포맷: `docs/qa/evidence/v2-goal-20261027/S1/haenael-s1-independent-qa-v2-gpt-codex.md`. S1의 보고 구조를 계승하고 S2 증거만 판정했다.

## 목차

- [결론](#결론)
- [출고 기준 판정](#출고-기준-판정)
- [기능 검증](#기능-검증)
- [디자인과 데모 검수](#디자인과-데모-검수)
- [회귀 재사용 근거](#회귀-재사용-근거)
- [결함과 해소 범위](#결함과-해소-범위)
- [보장 범위](#보장-범위)
- [실행 명령과 종료 코드](#실행-명령과-종료-코드)

## 결론

**FAIL. S2 제품 기능 F3·F4는 현재 staging에서 각각 2/2, skip 0으로 통과했지만, 디자인 정합과 데모 증거에 2건의 미해소 결함이 있어 S2를 closed로 전환하지 않았다.** 제품 코드, 기존 테스트, S1, S3, 상태 파일은 수정하지 않았다.

기능 사슬 자체는 관찰됐다. F3는 프로필 이름·소개·사진 저장과 reload, 실제 Storage 사진 finalize, 프리셋 커버 저장·reload·public 반영을 완료했다. F4는 독립 실행 asset `302027be-0e95-4ba3-b65e-bc8b55cd649b`가 `REVIEW`에서 관리자 승인 후 같은 ID의 `APPROVED`로 전이했고, public Storage 69,612 bytes와 owner·public 이미지 완전 로드를 확인했다. Builder의 asset `6bc443e1-13ee-46eb-ab1f-9976e6c3b94b`도 기존 로그에서 같은 사슬을 확인했다.

## 출고 기준 판정

| 필수 항목 | 판정 | 근거 |
|---|---|---|
| 기능 happy·edge | 충족 | F3 2/2, F4 2/2, 실패 0, skip 0. 저장·reload·Storage·REVIEW·APPROVED·public 반영을 staging에서 직접 실행 |
| 누적 회귀 | 충족 | 현재 `web/src`와 배포 snapshot `diff -qr` exit 0. 동일 제품 소스의 S1 전체 Vitest 78파일 439/439, skip 0 재사용 |
| 디자인 QA | **미충족** | 승인 prototype과 staging 캡처를 각각 직접 열어 비교했으며, fixture 데이터로 설명할 수 없는 표시 요소 차이가 남음 |
| 데모 증거 | **미충족** | headless 렌더 자체는 19 이미지·5 anchor, 합계 24 resource reference가 모두 정상이나 15번 캡처가 캡션의 관리자 커버 심사 큐를 보여주지 않음 |

필수 3종 중 디자인 QA가 미충족이므로 기능 통과와 무관하게 S2 출고 판정은 FAIL이다.

## 기능 검증

| 케이스 | 실제 단계와 assertion | 결과 | 증거 |
|---|---|---|---|
| MY-01 | 이름 저장, 소개 저장, 프리셋 사진 저장, reload 영속성, 실제 Storage 사진 sign·finalize, 프리셋 복귀, owner DB 값 확인, 타인 프로필 전후 동일 | PASS | `logs/independent-F3-summary.log`, `web/e2e/social-web-first.spec.ts` |
| PW-03 | 건강 프리셋 선택, 저장 완료 기다림, reload 후 `data-preset=health`, public route 동일 프리셋 | PASS | `logs/independent-F3-summary.log` |
| PW-04 | 실제 JPEG sign 200, Storage PUT, finalize 200, DB `REVIEW`, owner 일치, quarantine 69,612 bytes, active cover 불변 | PASS | `logs/independent-F4-summary.log` |
| PW-05 | admin role 세션, 대상 REVIEW asset 승인, 같은 asset ID `APPROVED`, goal active asset 연결, public object 다운로드, owner·public 이미지 `complete && naturalWidth>0` | PASS | `logs/independent-F4-summary.log` |

인가 경계는 이번 명시 실행 범위에서 owner asset 귀속, admin role 승인, 원래 타인 프로필 불변을 확인했다. 비관리자 승인 시도의 401·403 같은 음성 경로는 F3·F4 로그 범위에 없으므로 이 보고서가 새로 보장하지 않는다.

인증된 `/my`와 `/me/goal/{id}`는 각각 360·390·412·600·700·780·820·900·1000px에서 측정했다. 18/18 모두 `font_below_13=0`, 본문 토큰 16px, 44px 미만 누름 0, active coverage 100%, 가로 overflow 0, fixed control overlap 0, 하단 clearance 80px다. `median_font=13`은 진단값일 뿐 판정 기준으로 사용하지 않았다.

## 디자인과 데모 검수

### 승인본 대 staging

| 화면 | 비교 조건 | 판정 | 근거 |
|---|---|---|---|
| 마이페이지 | 390×844, scroll top 0, display 상태, 이미지 완전 로드 | 일치 | 정보 위계·카드 순서·탭·하단 탐색 구조가 같고 차이는 fixture 이름·소개·사진·집계 데이터 범위 |
| 건강 커버 목표 관리 | 390×844, scroll top 0, `goal-health`, 이미지 완전 로드 | **불일치** | staging banner 우하단의 초록 클로버와 wordmap 내부의 하트·추가 클로버 장식이 승인본에는 없음. 이는 제목·날짜·집계 데이터 차이가 아니라 표시·숨김 축의 UI 차이 |

`source-manifest.json`은 건강 커버 픽셀 변화율 44.60%의 경계를 fixture 제목·날짜·집계 데이터로만 설명한다. 직접 이미지 대조 결과 비데이터 표시 요소 차이가 포함되어 있어 현재 경계 설명은 불완전하다.

### 데모 허브

Headless Chromium 독립 검수 1회 결과는 exit 0, 이미지 19/19 완전 로드, anchor 5, 총 resource reference 24, 누락 target 0, console error 0, 가로 overflow 0이다.

그러나 `captures/flow/15-admin-review-queue-390.png`은 환전 요청 큐와 회원 목록만 보여준다. 데모 캡션은 “관리자 큐, 대상 asset 확인”이라고 쓰지만 커버 심사 카드, 대상 asset, 승인 버튼이 화면에 없다. F4의 자동 assertion은 기능을 입증하지만 이 이미지는 17단계 시각 데모의 15단계를 입증하지 못한다.

## 회귀 재사용 근거

- 독립 `diff -qr web/src /private/tmp/haenael-s1-remediation-correct-20261027-25gm4U/web/src` 결과 exit 0, 차이 0줄.
- 배포 snapshot은 staging deployment `dpl_2QeUAd65Qn4Tcfs9SvCuZaFWmbC3`의 S1 검증 소스다.
- S2 변경은 E2E와 증거·표시 문서에 한정된다. 제품 소스가 같으므로 2026-10-27 04:03 시작 전체 회귀 78파일 439/439, skip 0을 재사용했다.
- 승인 prototype SHA-256은 현재 파일과 manifest 모두 `afca1c0374e5c7f7df6e874e41be3f59f6463b2b256f5e2c4e6fef6b24d5de9a`로 일치한다.

## 결함과 해소 범위

| 결함 | 등급 | 정확한 해소 범위 | 제품 기능 영향 |
|---|---|---|---|
| QAS2-01 관리자 큐 캡처가 대상 asset을 보여주지 않음 | 출고 차단 | PW-05에서 대상 cover review card가 viewport 안에 오도록 scroll한 뒤 승인 전 캡처를 다시 만들고, 허브의 15번 이미지를 교체. 대상 목표 또는 asset 식별과 승인 CTA가 보여야 함 | 없음. 자동 기능 assertion은 PASS |
| QAS2-02 승인 건강 커버와 staging의 비데이터 장식 불일치 | 출고 차단 | 승인 prototype을 기준으로 banner 클로버와 wordmap 하트·추가 클로버의 표시 여부를 맞춘 뒤 같은 390×844·같은 display 상태로 다시 대조. 승인 변경으로 인정할 경우 상류 디자인 승인을 먼저 남겨야 함 | 기능 없음. 디자인 정합 문제 |

QA는 결함을 고치지 않았다. 위 두 범위가 해소되고 시안과 실화면을 다시 직접 대조하기 전에는 S2를 closed로 바꾸지 않는다.

## 보장 범위

이 QA가 보장하는 것은 현재 free staging에서 F3·F4의 실제 Auth·API·DB·Storage happy flow, 타인 프로필 불변, owner asset 귀속, admin 승인, 18개 route×폭 사용성 축, 같은 제품 소스의 439개 Vitest 회귀다.

보장하지 않는 것은 production 배포·production DB, 과금, 실제 외부 OAuth·결제, 명시 실행 범위 밖의 비관리자 승인 음성 경로, 정리된 fixture URL의 재사용 가능성이다. 본 실행의 `/me/goal/{id}`와 `/g/{slug}` fixture는 teardown에서 삭제됐으므로 기록 URL은 현재 재사용할 수 없다.

## 실행 명령과 종료 코드

| 실행 | 종료 코드 | 통과·실패·skip |
|---|---:|---|
| F3 명시 verify, staging wrapper, heavy slot | 0 | 2 passed, 0 failed, 0 skipped |
| F4 명시 verify, staging wrapper, heavy slot | 0 | 2 passed, 0 failed, 0 skipped |
| `diff -qr web/src <staging snapshot>/web/src` | 0 | 차이 0 |
| S1 전체 회귀 재사용 | 0 | 78 files, 439 passed, 0 skipped |
| S2 데모 headless 검수 1회 | 0 | 이미지 19/19, anchor 5, resource 24/24, 누락 0, console error 0, overflow 0 |

실행 중 새 제품 결함 0건, 테스트 실패 0건, skip 0건이다. 출고 차단 결함은 디자인 1건, 데모 증거 1건이다.

SKILLS_USED: qa, staging 실제 흐름·브라우저·증거 판정에 사용. review, assertion coverage와 소스·회귀 재사용 근거 검토에 사용.
SKILLS_SKIPPED: 없음.

KNOWLEDGE_QUERY: S2 F3·F4 명시 verify, source manifest, 17단계 캡처, 승인본 대 staging, 회귀 소스 동일성, 공식 S2 상태 블록을 repo-local로 조회했다.
HITS_USED: `.goal/feature-list.json` F3·F4, S2 source manifest·index·최종 로그·17단계 캡처, `web/e2e/social-web-first.spec.ts`, S1 439/439 회귀 로그. 실제 판정과 재사용 근거에 직접 사용했다.
HITS_REJECTED: 이전 S1 정본 전체와 S3 자료는 이번 범위 밖이고 재독 금지 지시가 있어 사용하지 않았다. Builder 자기신고만으로는 판정하지 않았다.
CONFLICTS: manifest는 건강 커버 차이를 fixture 데이터로만 분류하지만 직접 이미지 대조에서 승인본에 없는 비데이터 장식이 확인됐다.

SOURCES/MODEL: gpt-codex(API model ID 미노출) | `.goal/feature-list.json` | `docs/qa/evidence/v2-goal-20261027/S2/source-manifest.json` | S2 captures/logs/index | `web/e2e/social-web-first.spec.ts` | `docs/qa/evidence/v2-goal-20261027/S1/logs/full-regression-remediation.log`

PRESENTATION_CHECK: 내부 태그 잔재 없음 확인. Markdown 렌더 예정. 회장 화면 자동 열기 없음.

RUBRIC_SCORE: evidence=5 traceability=5 clarity=5 completeness=5 presentation=4 total=24/25
WEAKEST_LINE: 비관리자 관리자 승인 음성 경로는 이번 F3·F4 명시 실행 범위 밖이라 새 보증으로 올리지 못했다.
