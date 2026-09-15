---
artifact: cashout-qa-report
line: core
version: v1
created_at: 2026-08-24 17:45 KST
model: gpt-codex/GPT-5
agent: qa-verifier
skills: qa
status: changes-requested
basis:
  - DESIGN.md v2.0.0
  - scratchpad/cashout-full-journey-v3-opus.html v3.7
  - docs/eng-design/fdd-haenael-ge-cashout-clover-lock-v1.0.0-opus5.md
  - docs/qa/test-plan.md
  - docs/plan/one-thing.md
  - docs/plan/persona.md
judgment: 실제 로컬 환전 상태전이는 통과했으나 승인 프로토타입 정합 실패로 QA NG
---

# core 환전 신청 로컬 실여정 QA

## 한 줄 결론

로컬 화면과 실제 로컬 Postgres를 함께 태운 환전 신청, 관리자 계좌 열람, 반려, 지급 완료, 중복 차단, loading, 101건 너머 검색은 관찰됐다. 그러나 신청 확인과 loading 화면이 승인 프로토타입의 전용 화면으로 전환되지 않고 기존 페이지를 유지해 디자인 정합이 실패했다. 따라서 릴리스 판정은 **❌ NG, changes-requested**다.

## 기반과 범위

- 정본: `DESIGN.md` v2.0.0의 YAML 토큰, 승인 프로토타입 v3.7, 환전 잠금 FDD v1.0.0.
- 환경: `http://127.0.0.1:3463`, 로컬 Supabase `54321/54322`. 운영 DB 쓰기 0건.
- 증거 등급: 브라우저와 DB 동시 관찰, Playwright 실제 클릭, 로컬 Postgres 직접 조회.
- 요청 원장: 이 라인에서 `docs/**/requests-*.md` 형식의 요청 원장을 찾지 못했다. 따라서 요청번호 승계 표는 적용 대상이 아니다. 이번 과제 1~7번을 `QA-LOCAL-01~07`로 추적했다.

## 검증 진행

| 단계 | 상태 | 증거·비고 |
|---|---|---|
| canonical 단계 전환 | ✅ | 메인 repo `pipeline-state.core.md`의 `current_stage: qa` 확인 |
| 코드 수정 내역 파악 | ✅ | 환전 페이지, 폼, 관리자 큐, 잔액 카드, 응원 overflow를 정본과 대조 |
| backend build/test | ✅ 신뢰 | 컨트롤러 직접 관찰: Vitest 41파일 240통과, pgTAP 10파일 247통과. 재실행하지 않음 |
| web build/test | ✅ 신뢰 | 컨트롤러 직접 관찰: Next build 종료코드 0. 재실행하지 않음 |
| mobile typecheck | 해당 없음 | 모바일 앱 manifest가 없는 웹 제품 |
| curl health | ✅ 관찰 | `/api/health` HTTP 200, `status=ok`, `database=ok`, `version=1.0.0`, 14ms |
| seed | ✅ 관찰 | 로컬 사용자, 응원, 121건 overflow fixture를 실제 Postgres에 생성 |
| 주요 API·DB | ✅ 관찰 | 신청 Server Action 200, 중복 오류 응답, 관리자 지급·반려, 원장·감사 로그 직접 조회 |
| Playwright 회귀 | ✅ 관찰 | 올바른 로컬 ENV에서 전체 45개 고유 케이스를 모두 관찰 통과. 최초 ENV 누락 실패와 skip은 환경 보정 후 해당 케이스 재실행 |
| Maestro | 해당 없음 | 모바일 앱·Maestro flow 없음. `optional:true` 우회 없음 |
| design-lint | ❌ | `web/src`에 인라인 style과 토큰 밖 hex 두 범주 경고 |
| 디자인 정합 | ❌ | 390px 동일 폭 실렌더 비교. 확인·loading 전환 화면과 워드맵 미리보기 수량 불일치 |

## 시나리오별 관찰 결과

### 세 값과 원장 변화

`사용 가능`은 총량에서 잠김을 뺀 값이다. 웰컴 12개는 사용 가능에는 포함되지만 환전 가능 금액에는 포함되지 않는다.

| TC | 실제 단계 | 총량 | 잠김 | 사용 가능 | 환전 가능 | DB 상태·원장 | 화면 표시 | 판정 |
|---|---|---:|---:|---:|---:|---|---|---|
| QA-LOCAL-01 | 응원 적립 직후 | 52 | 0 | 52 | 40 | `EARN +40`, `balance_after=52` | 모인 52개 | ✅ |
| QA-LOCAL-01 | 40개 신청 | 52 | 40 | 12 | 0 | `REQUESTED`, `CASHOUT_HOLD delta=0` | 모인 52, 잠김 40, 지금 쓸 수 있음 12 | ✅ |
| QA-LOCAL-01 | 관리자 계좌 열람 | 52 | 40 | 12 | 0 | 전체 계좌 열람 감사로그 2건 | 지급 확인 모달에 전체 계좌 표시 | ✅ |
| QA-LOCAL-01 | 지급 완료 | 12 | 0 | 12 | 0 | `PAID`, `CASHOUT_SETTLED delta=-40` | 34,426원 입금, 모인 52→12 설명 | ✅ |
| QA-LOCAL-02 | 30개 신청 | 52 | 30 | 22 | 10 | `REQUESTED`, `CASHOUT_HOLD delta=0` | 모인 52, 잠김 30, 지금 쓸 수 있음 22 | ✅ |
| QA-LOCAL-02 | 반려 | 52 | 0 | 52 | 40 | `REJECTED`, `CASHOUT_REVERSAL delta=0` | “잠겨 있던 30개의 잠금이 풀렸어요. 모은 개수는 그대로예요.” | ✅ |

반려 관리자 문구는 “반려하고 잠금 해제”이며 “복원” 표현은 없었다. 총량 52는 신청과 반려 전후에 바뀌지 않았다.

### 금액 검산

| TC | 신청액 | 이용료 | 원천징수 | 받으실 금액 | 화면 | DB | Server Action 응답 | 판정 |
|---|---:|---:|---:|---:|---|---|---|---|
| QA-LOCAL-03A | 30,000원 | 3,300원 | 881원 | 25,819원 | 네 값 일치 | 네 값 일치 | HTTP 200 body에 `3300`, `881`, `25819` | ✅ |
| QA-LOCAL-03B | 40,000원 | 4,400원 | 1,174원 | 34,426원 | 네 값 일치 | 네 값 일치 | HTTP 200 body에 `4400`, `1174`, `34426` | ✅ |

계산은 `신청액 - 이용료 - 원천징수 = 받으실 금액`으로 각각 `30,000 - 3,300 - 881 = 25,819`, `40,000 - 4,400 - 1,174 = 34,426`이다.

### 경계와 체감 동작

| TC | 관찰 | 판정 |
|---|---|---|
| QA-LOCAL-04 최소액 미달 | 29 입력은 native constraint로 차단됐다. 안내는 “최소 30개”지만 브라우저 validation 문구가 `Value must be greater than or equal to 30.`이고 제품 한국어 alert는 0건 | 기능 ✅, UX ❌ |
| QA-LOCAL-05 중복 | 진행 중 재신청 응답은 `cashout_already_requested`, 화면 alert는 “이미 처리 중인 환전 신청이 있어요.”, 성공 화면 0건 | ✅ |
| QA-LOCAL-06 loading | 실제 신청 POST를 1.2초 지연한 상태에서 `role=status`, `aria-live=polite`, “신청을 보내는 중이에요”가 표시됐다. 390×844에서 loading 박스가 viewport와 교차했다 | ✅ |
| QA-LOCAL-07 overflow | 총 122건에서 미리보기 8, 전체 20, “102개는 검색으로 찾기”. 최신 20건 밖 `101건너머대상`을 검색해 1건 반환 | ✅ |
| 익명 인증 문구 | 비로그인 `/cashout`은 HTTP 307로 `/` 이동. 본문에 `401`, `Unauthorized`, `인증 필요` 노출 0건 | ✅ |

## 관리자 계좌 열람 최소 노출

- 신청자 화면과 Server Action 응답은 마스킹 계좌만 표시했다.
- 관리자 지급·반려 동작에서만 전체 계좌가 표시됐다.
- `cashout_account_access_log`에 신청 45번 1건, 신청 46번 2건의 `purpose=payout`과 관리자 actor가 기록됐다.
- 실제 은행 송금 네트워크와 수취 계좌 입금은 연결되지 않은 수동 지급 상태이므로 **미검증**이다. 이번 완료 근거는 로컬 제품 내부 `PAID` 상태전이까지다.

## 발견 결함

| 심각도 | 결함 | 근거 파일·줄 | 사용자 결과 |
|---|---|---|---|
| P1 | 신청 확인과 loading이 승인 프로토타입의 전용 전환 화면이 아니다. dev는 잔액·이용료·과거 내역을 계속 남긴 채 우측 폼 영역만 바꾼다 | `web/src/app/(receiver)/cashout/page.tsx:57`, `:75`, `:96`; `web/src/components/cashout/CashoutRequestForm.tsx:327`, `:346`, `:400` | 확인 단계 높이가 시안 510px 대비 dev 1,346px, loading은 617px 대비 1,505px이다. 사용자는 다음 행동보다 이전 정보에 묻힌다 |
| P1 | 워드맵 미리보기 수가 승인 프로토타입과 다르다 | `web/src/app/(receiver)/me/page.tsx:265`, `:287` | 시안 미리보기 6개, 펼침 12개인데 dev는 미리보기부터 12개다 |
| P2 | 최소액 미달이 제품 한국어 오류가 아니라 브라우저 영어 native 문구로 끝난다 | `web/src/components/cashout/CashoutRequestForm.tsx:218`; `web/e2e/cashout-manual.spec.ts:557` | 한국어 서비스에서 행동 교정 문구가 영어로 보인다. E2E는 `min`을 제거해 이 실제 경로를 가린다 |
| P2 | 앱 URL ENV가 실제 host와 다르면 hydration mismatch가 난다 | `web/src/components/goal/MyLinkCard.tsx:20`, `:85` | 서버 `localhost:3000`과 클라이언트 `127.0.0.1:3463` 링크가 달라 React가 트리를 다시 생성한다 |
| P2 | 디자인 lint가 전역 통과하지 않는다 | `web/src/components/goal/SplitBalanceCard.tsx:34`, `:58`; `web/src/components/admin/CashoutQueue.tsx:58`; `web/src/components/goal/MyLinkCard.tsx:77` | 인라인 style과 토큰 밖 hex 때문에 DESIGN.md 토큰 정본 준수를 기계적으로 보장할 수 없다 |

## 못 태운 경로와 이유

- 운영 DB와 운영 화면: 금지 범위라 실행하지 않았다.
- 실제 은행 송금과 계좌 수취: 제품은 수동 지급 완료 기록만 제공하며 은행 연동이 없다.
- 모바일 typecheck와 Maestro: 모바일 앱과 flow가 없다.
- 768px·1024px 화면: 이번 과제의 동일 조건이 390px로 명시돼 390px만 대조했다. 따라서 다폭 디자인 정합 완료를 주장하지 않는다.
- 기존 `.next` production 산출물은 mock Supabase `127.0.0.1:54329`가 bake돼 실제 로컬 DB 여정에 쓸 수 없었다. 실제 DB 연결을 보장한 종료형 `next dev` 세션으로 검증했고 종료했다.

## 프로토타입 정합 요약

세부 표와 캡처 쌍은 [core-cashout-design-conformance-matrix-v1-gpt-codex.md](./core-cashout-design-conformance-matrix-v1-gpt-codex.md)에 있다.

- 요청 폼: 주축 1열은 같으나 dev가 전화번호·내역을 추가하고 이용료 설명 구조를 압축했다. 높이 비율 1.387로 허용범위 0.9~1.1 이탈.
- 확인: 시안은 전용 확인 화면, dev는 전체 이전 페이지를 유지한다. 높이 비율 2.639, FAIL.
- loading: 시안은 전용 loading 화면, dev는 이전 전체 페이지를 유지한다. 높이 비율 2.439, FAIL.
- 신청·반려·입금 상태: 주축, 순서, 잔액 분할, 버튼 위계는 대체로 일치한다. 신청 상태 높이 비율 0.857로 허용범위 이탈.
- overflow: 목록 8→20과 101건 너머 검색은 동작한다. 미리보기 높이 비율 1.309, 워드맵 수량 불일치.

**Design Score: C, FAIL.** 기능의 주요 상태 화면은 읽히지만 승인 프로토타입의 전환 구조와 데이터 밀도를 그대로 구현하지 않았다.

## 페르소나 결정 1문항

**Q. 윤도경이 “조용히 받은 응원이 실제 돈으로 바뀌어 내 손에 들어오는 과정”을 문의 없이 믿을 수 있는가?**

**A. 로컬 제품 내부에서는 대부분 그렇다.** 신청 직후 총량·잠김·사용 가능이 분리되고, 반려는 잠금 해제, 지급은 총량 감소로 정확히 설명됐다. 다만 실제 은행 입금은 미검증이고, 최소액 영어 오류와 시안에서 벗어난 긴 전환 화면이 확신을 깎으므로 릴리스 수준의 “그렇다”는 아직 아니다.

## 셀프심문과 레드팀

**셀프심문: 이 결론이 틀렸다면 가장 그럴듯한 이유는?** 로컬 dev와 임시 fixture가 운영 배포의 환경·실데이터·은행 처리 지연을 대표하지 못한다는 점이다. 그래서 상태전이 관찰을 운영 송금 완료로 확대하지 않았고, 운영 DB와 실제 수취는 명시적으로 미검증에 남겼다.

**레드팀, 까다로운 수취인:** “돈 계산이 맞고 버튼이 눌린다고 출시해도 되는가?” 승인 시안에서 의도한 확인 집중도가 사라졌고 최소액 오류는 영어다. 돈 경로는 불안이 작은 차이에도 커지므로 기능 PASS와 별개로 디자인 정합 FAIL을 릴리스 차단 사유로 유지한다.

## 벤치마크 적용

- [Playwright actionability](https://playwright.dev/docs/actionability): 클릭 전 visible, stable, receives events, enabled 자동 대기를 이용했다.
- [Playwright screenshots](https://playwright.dev/docs/screenshots): 동일 390px 조건으로 요소·전체 화면 캡처를 남겼다.
- [Supabase local development](https://supabase.com/docs/guides/local-development): 운영과 격리된 로컬 DB에서 상태전이를 검증했다.
- [W3C status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages): loading을 시각 노출뿐 아니라 `role=status`, `aria-live=polite`로 확인했다.

## 판정과 다음 실행

- 🔧 전환 가능: 실제 로컬 신청→관리자 열람→지급, 신청→반려, 정확한 금액, 중복, loading, overflow 검색 TC는 직접 관찰 증거가 있다.
- ⬜ 유지: 운영 송금, 운영 DB, 모바일, 다폭 디자인은 미검증이다.
- ❌ NG: 승인 프로토타입 정합, 최소액 한국어 오류, 전역 design-lint.

**다음 실행:** 소유자는 build 라인의 code-builder다. 전용 확인·loading 화면, 워드맵 6→12 전환, 최소액 한국어 오류, 토큰 위반을 수정한 뒤 종료증거는 동일 fixture의 390px 재캡처 쌍, design-lint 0, 전체 회귀 재통과다. 회장은 수정본 독립 QA가 `PASS`일 때 다시 회수하면 된다.

RUBRIC_SCORE: 완결성=5/5 정밀성=5/5 추적성=5/5 관찰증거=5/5 한계표시=5/5 total=25/25

WEAKEST_LINE: 실제 은행 수취는 제품의 수동 지급 처리 밖이라 이번 로컬 QA로는 검증하지 못했다.

SKILLS_USED: `qa` 스킬을 로컬 서비스 기동, 브라우저 실여정, DB 동시 관찰, 회귀, 결함 기록에 사용

SKILLS_SKIPPED: 없음

SOURCES: `DESIGN.md` v2.0.0; `scratchpad/cashout-full-journey-v3-opus.html` v3.7; `docs/eng-design/fdd-haenael-ge-cashout-clover-lock-v1.0.0-opus5.md`; `docs/qa/test-plan.md`; `docs/plan/one-thing.md`; `docs/plan/persona.md`; `artifacts/qa-cashout-core-20260824/core-cashout-observations-v1-gpt-codex.json`; `artifacts/qa-cashout-core-20260824/core-cashout-clean-export-v1-gpt-codex.json`; Playwright·Supabase·W3C 공식 문서 링크

MODEL: gpt-codex/GPT-5, qa-verifier
