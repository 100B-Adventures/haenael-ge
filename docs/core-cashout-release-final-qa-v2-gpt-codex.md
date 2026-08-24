# core 환전 릴리즈 최종 QA v2

한 줄 결론: **최종 판정은 NG다.** 로컬 환전과 관리자 상태 전이는 관찰 통과했지만, 운영 DB에 관련 마이그레이션이 없고 Storybook 및 전역 디자인 lint 합격선도 통과하지 못했다.

STAMP: 생성 2026-08-25 00:18 KST | 모델 gpt-5.6-sol | 에이전트 qa-verifier | 스킬 qa | 기준 브랜치 `release/cashout-clover-lock`의 제품 트리 | 근거 로컬 Playwright, 로컬 Postgres, 스크린샷, Storybook 정적 렌더, 운영 read-only 조회 | 고민: 테스트 개수가 아니라 실제 돈 상태와 운영 스키마의 일치를 최우선으로 판정했다.

## 요청과 범위

- 대상: 환전 클로버 잠금 A안과 이용료 10% 릴리즈
- 릴리즈 커밋: `772f8735c6dfdb65fb187a643488e2cf1fb92138`
- 현재 상태: 환전 클로버 잠금 및 화면 정합 릴리즈 PR 1번은 2026-08-24 23:43 KST에 `main`으로 머지됐다. 병합 커밋의 전체 트리와 릴리즈 커밋의 전체 트리 해시는 동일하다.
- 금지 범위 준수: 운영 DB 쓰기, 운영 배포, 제품 코드 수정은 하지 않았다.
- 기반: `docs/test-plan.md`, `docs/one-thing.md`, `docs/persona.md`, `docs/qa-tracker.md`, `docs/구현현황.md`, `DESIGN.md` v2.0.0, 승인 프로토타입 v3.7, 사용자가 제공한 컨트롤러 직접 관찰 결과

## 1. 회귀 확인 결과

| 검증면 | 판정 | 관찰 증거 |
|---|---|---|
| 마지막 커밋의 앞선 기능 보존 | ✅ | 릴리즈 커밋과 현재 `main` 병합 커밋의 전체 tree hash가 `a2154d3ab5e6c0fd81876202346ba4a913ed6b89`로 동일했다. `web`과 `supabase` diff도 0이었다. |
| 사용자 화면 4종 정합 | ✅ 신뢰 | 컨트롤러가 동일 폭에서 확인, 대기, 진행, 마이페이지를 좌우 합성으로 직접 판정했다. 이번 QA는 재현하지 말라는 지시에 따라 반복하지 않았다. |
| 잔액과 계산식 | ✅ 관찰 | 새 로컬 요청 30개는 `30,000원, 이용료 3,300원, 원천징수 881원, 실지급 25,819원`으로 DB와 관리자 화면이 일치했다. 지급 시 총량이 124에서 94로 한 번 감소했다. |
| 사용자 입력 실패 | ✅ 관찰 | 계좌번호 `1234`는 `계좌번호를 하이픈 없이 숫자 8~20자로 입력해 주세요.`를 표시했고, 전후 요청 행 수는 0으로 동일했다. |
| 로컬 health | ✅ 관찰 | `GET /api/health`는 HTTP 200, `status=ok`, `database=ok`를 반환했다. |
| 비인증 경로 | ✅ 관찰 | `/admin`, `/cashout`, `/cashout/status`는 HTTP 307로 `/`에 이동했다. 사용자 화면에 401 또는 인증 필요 원문을 표시하지 않았다. |
| Vitest, pgTAP, Next build | ✅ 신뢰 | 컨트롤러 직접 재실행 결과인 Vitest 246, pgTAP 247, Next production build 통과를 신뢰했다. 통과 개수 자체를 최종 완료 근거로 사용하지 않았다. |
| 모바일, Maestro | 해당 없음 | 저장소에 모바일 앱과 Maestro flow가 없다. `optional:true`로 실패를 숨긴 flow는 만들지 않았다. |

로컬 seed는 기존 환전 QA fixture를 재사용했다. 실제 화면에서 요청 2건을 새로 생성해 로컬 Postgres 상태를 관찰했으며 운영 데이터는 건드리지 않았다.

## 2. 관리자 화면 검증

| TC | 경로 | 판정 | 화면과 DB 증거 |
|---|---|---|---|
| ADMIN-01 | 지급 확인 모달에서 전체 계좌 재열람 | ✅ | 마스킹 행에서 지급 완료를 누르자 전체 계좌가 모달에 표시됐고 `cashout_account_access_log`에 `purpose=payout`이 남았다. |
| ADMIN-02 | 계좌 열람 10분 만료 | ✅ | 열람 시각을 로컬 DB에서 11분 전으로 바꾼 뒤 확정하자 `전체 계좌를 다시 확인한 뒤 지급 완료 처리해주세요.`가 표시됐다. 요청은 `REQUESTED`, `CASHOUT_SETTLED`는 0건이었다. |
| ADMIN-03 | 새로 열람한 뒤 지급 확정 | ✅ | 다시 모달을 열어 계좌를 새로 확인한 뒤 확정하자 요청 69번이 `PAID`가 됐다. 원장은 `CASHOUT_HOLD delta=0`, `CASHOUT_SETTLED delta=-30`, 최종 총량 94였다. |
| ADMIN-04 | 이체 실패 후 반려 | ✅ | 요청 70번에 `은행 앱 이체 실패: 계좌 정보 오류`를 기록하고 반려했다. 요청은 `REJECTED`, 원장은 `CASHOUT_REVERSAL delta=0`, 총량은 94로 유지됐다. |
| ADMIN-05 | 실제 은행 이체 결과 | ⬜ 미검증 | 외부 은행 앱 수동 이체이며 로컬 환경에 은행 응답 연동이 없다. 화면의 체크박스와 관리자 입력만 검증했다. |

캡처는 `artifacts/qa-cashout-core-20260824/final-gate-v2/`의 24번부터 30번 이미지다. 캡처를 직접 열어 10분 만료 오류, 지급 완료 상태, 반려 모달, 반려 완료 상태를 재확인했다.

## 3. 실패 경로 검증

- 계좌번호 길이 오류: 화면에서 차단되고 DB 요청 행 0건을 유지했다.
- 계좌 열람 만료: 돈 상태 전이 전에 차단되고 지급 원장이 생기지 않았다.
- 계좌 정보 오류로 은행 이체 실패: 관리자가 실패 메모와 함께 반려할 수 있었고, 잠금만 풀리며 총량은 줄지 않았다.
- 실제 은행의 실패 응답, 입금 계좌 폐쇄, 은행 점검, 이체 한도 초과는 미검증이다. 제품이 은행 API와 연결되지 않아 자동 관찰 경로가 없다.
- 실제 이체 성공 뒤 DB 확정 요청이 네트워크 오류로 실패하는 경로도 미검증이다. 이 경로는 아래 운영 위험으로 남긴다.

## 4. design-lint와 Storybook

### design-lint

**판정: FAIL**

`bash ~/.claude/harness/bin/design-lint.sh web/src`는 다음 두 범주를 검출했다.

- 인라인 style 우회 위험: 상한 8파일
- 토큰 밖 hex 리터럴: 상한 8파일

스크립트 종료코드는 0이지만 출력은 명시적으로 `2종 위반`이다. 종료코드만 보고 통과로 판정하지 않았다. 이번 릴리즈 변경 파일의 신규 위반 여부와 별개로, 지시된 전역 `web/src` 합격선은 미통과다.

### Storybook

**정적 빌드 및 기존 6개 story 렌더: PASS**

- 정적 빌드가 종료코드 0으로 끝났다.
- CheerList 3상태, ReceiverShell 2상태, Tokens 1상태를 정적 서버에서 실제 렌더했다.
- 6개 story 모두 root가 보였고 브라우저 console error와 page error는 0건이었다.

**품질 게이트: FAIL**

- 컴포넌트 인벤토리 문서가 없어 Storybook 커버리지의 분모와 제외 사유를 판정할 수 없다.
- `web/src/components`의 TSX 컴포넌트는 52개인데 story 파일은 3개뿐이다.
- 이번 릴리즈의 핵심 신규 컴포넌트 `SplitBalanceCard`, `CashoutPageView`와 돈 상태를 처리하는 `CashoutQueue`, `CashoutRequestForm`에 story가 없다.
- 토큰 갤러리는 색상, 일부 spacing 숫자, radius, typography만 보여준다. 공식 기준의 시각적 spacing 샘플과 shadow 토큰 표면이 없다.
- build 경고로 일부 소스맵 해석 실패와 500kB 초과 chunk가 남았다. 렌더 실패는 아니지만 품질 부채다.

Storybook 공식 문서는 story를 컴포넌트 상태별 테스트 사례로 다루며, 정적 빌드는 배포 가능한 산출물을 만드는 절차다. 따라서 정적 빌드 성공과 상태 커버리지 합격은 같은 판정이 아니다.

## 5. 새 결함과 위험, 심각도순

### BLOCKER-1. 운영 DB에 금액 계산과 잠금 마이그레이션이 없다

- read-only `supabase migration list --linked`에서 `20260821000000`과 `20260822000000`의 remote 값이 비어 있었다.
- 운영 migration history에는 local만 있고 remote에 없는 버전이 총 15개다. 이 중 데이터 backfill, enum, unique guard, 관리자 권한, 수동 환전 migration이 포함된다.
- 새 웹을 먼저 배포하면 화면과 약관은 10% 이용료를 말하지만 DB는 이전 계산 계약을 사용한다. 이는 사용자에게 표시한 금액과 실제 지급액이 달라지는 돈 및 신뢰 결함이다.
- 단순 `db push`는 관련 2개만이 아니라 앞선 13개 gap까지 적용할 수 있어 안전하지 않다. migration history 정리와 staging 검증이 선행돼야 한다.

### BLOCKER-2. QA 승인 전에 릴리즈 코드가 main에 머지됐다

- 환전 클로버 잠금 및 화면 정합 릴리즈 PR 1번은 2026-08-24 23:43 KST에 이미 머지됐다.
- 2026-08-25 00:01 KST read-only 확인에서 운영 health는 200이고 운영 약관은 아직 기존 5% 문구였다. 즉 새 릴리즈가 운영에 반영된 직접 증거는 없지만, main은 이미 NG 코드와 운영 DB가 갈린 상태다.
- 운영 배포는 즉시 보류해야 한다.

### MAJOR-1. 수동 이체와 DB 확정 사이에 원자성이 없다

- 은행 앱에서 이체한 뒤 DB 지급 완료 확정이 실패하면 시스템은 여전히 `REQUESTED`로 보인다.
- 재시도 담당자가 은행 거래내역을 대조하지 않으면 같은 건을 두 번 이체할 수 있다.
- 현재 지급 메모는 선택이고 은행 거래 식별자 또는 영수증을 강제하지 않는다. 실제 은행 실패 응답도 자동 수집하지 않는다.
- 최소 안전장치는 운영 runbook의 은행 거래내역 대조, 이체 식별자 필수 기록, 재처리 전 2인 확인이다. 장기적으로는 지급 provider 식별자 기반 멱등 처리가 필요하다.

### MAJOR-2. Storybook 품질 게이트 미통과

- 정적 build는 되지만 신규 핵심 컴포넌트와 돈 상태의 state story가 없다.
- 릴리즈 회귀를 격리 화면에서 재현할 수 없고 토큰 갤러리도 합격선을 채우지 못한다.

### MAJOR-3. 전역 design-lint 미통과

- 인라인 style과 토큰 밖 색상 두 범주가 남아 있다.
- lint 스크립트가 위반에도 종료코드 0을 반환하므로 CI가 출력 파싱 없이 통과시킬 수 있다.

### MINOR-1. 로컬 비밀값 래퍼가 JSON 키링을 훼손한다

- 로컬 secret 파일의 JSON 키링을 `source`하는 과정에서 내부 따옴표가 제거되어 `cashout_encryption_unavailable`이 발생했다.
- 파일 값을 그대로 환경변수에 적재하면 검증이 통과했다. 운영 Vercel 환경과는 별개지만, 로컬 장애 재현과 관리자 운영 점검을 방해한다.

## 6. 최종 판정

**NG**

관리자 계좌 열람, 10분 게이트, 지급 확정, 반려, 계좌번호 오류는 로컬 실제 화면과 DB에서 관찰 통과했다. 그러나 돈 계산에 필요한 운영 migration 2개가 없고, 원격 migration history 자체도 15개 gap이다. Storybook 품질 게이트와 전역 design-lint도 실패했다. 따라서 운영 배포 승인 조건을 충족하지 못했다.

## 7. 운영 배포 시 위험과 다음 실행

1. 운영 배포를 보류한다. 현재 운영은 기존 약관 5%와 health 200으로 관찰됐고, 새 코드가 운영에 반영된 증거는 없다.
2. release-manager와 DB 소유자가 remote migration gap 15개를 분류한다. 종료 증거는 각 gap의 `적용 필요`, `이미 수동 반영되어 history repair 필요`, `폐기` 판정표와 staging dry run이다.
3. 관련 migration을 staging에 적용한 뒤 30개와 40개 환전의 화면, RPC, 원장, 약관 금액을 다시 대조한다.
4. code-builder가 전역 design-lint 두 범주와 Storybook 인벤토리 및 핵심 돈 상태 story를 보강한다.
5. qa-verifier가 실제 은행 거래 대조 runbook을 포함해 지급 재시도 안전성을 검증한다.
6. 위 증거가 모두 나온 뒤 새 교정 릴리즈 PR을 올린다. 현재 main을 그대로 운영에 배포하지 않는다.

## 8. 페르소나 결정 1문항

**문항: 응원을 받아 환전하려는 목표 주인이 화면에 표시된 금액과 실제 입금액을 믿어도 되는가?**

답: 로컬 migration이 적용된 환경에서는 30개가 25,819원으로 화면과 DB에 일치했다. 운영은 관련 migration이 없어 같은 보장을 할 수 없다. 현재는 믿어도 된다고 출시할 수 없다.

## 요청 번호 승계

별도 요청 원장 파일은 발견되지 않았다. 이번 회장 요청을 QA-FINAL 번호로 승계했다.

| 요청번호 | 요청 요지 | 테스트번호 | 판정 | 증거 |
|---|---|---|---|---|
| QA-FINAL-01 | 마지막 커밋 회귀 | REG-01 | ✅ | release와 main 전체 tree hash 동일, 컨트롤러 관찰 결과 승계 |
| QA-FINAL-02 | 직전 미검증 경로 | FAIL-01, AUTH-01 | ⚠️ | 계좌 오류와 비인증 redirect 관찰, 실제 은행 응답 미검증 |
| QA-FINAL-03 | 관리자 큐와 상세 | ADMIN-01~04 | ✅ | 모달, 10분 게이트, 지급, 반려, 감사로그 |
| QA-FINAL-04 | 실패 경로 | FAIL-01~03 | ⚠️ | 입력 오류와 운영자 반려 통과, 실제 은행 실패 미검증 |
| QA-FINAL-05 | design-lint와 Storybook | DESIGN-01, SB-01 | ❌ | lint 2종 위반, Storybook 품질 커버리지 미달 |
| QA-FINAL-06 | 돈과 신뢰 위험 | RISK-01 | ❌ | remote migration gap 15개, 관련 2개 미적용 |
| QA-FINAL-07 | 최종 판정 | GATE-01 | ❌ NG | BLOCKER 2건, MAJOR 3건 |
| QA-FINAL-08 | 운영 배포 위험 | SHIP-01 | ❌ | main 머지됨, 운영은 아직 기존 5% 약관, 배포 보류 필요 |

## 셀프심문과 레드팀

**이 결론이 틀렸다면 가장 그럴듯한 이유는?** 전역 design-lint와 Storybook 누락은 이번 릴리즈 밖의 기존 부채라서 배포 차단 사유가 아니라는 반론이 가능하다. 그러나 이 두 항목을 제외해도 운영 DB에 금액 계산 migration이 없고 local과 remote history가 15개 갈려 있다. 돈 계약 불일치만으로 NG가 유지된다.

**회의적 운영자 반론:** 로컬에서 지급과 반려가 됐고 단위 테스트도 모두 통과했으니 배포 후 migration만 적용하면 된다고 볼 수 있다. 반박은 migration 적용 순서가 단순하지 않다는 점이다. 앞선 13개 gap에 데이터 backfill과 권한 변경이 포함돼 있어 운영에서 바로 적용하면 별도 회귀를 만들 수 있다. staging에서 history 정리와 실제 금액 대조를 먼저 해야 한다.

## 벤치마크 적용

- Storybook 공식 테스트 가이드: story를 상태별 테스트 사례로 보는 기준을 적용했다. 정적 빌드 성공과 상태 커버리지 합격을 분리했다.
- Storybook 공식 build 문서: 정적 build 성공은 배포 가능한 문서 산출물의 증거로만 인정했다.
- Stripe Connect 지급 문서: 은행 계좌 정보 오류와 지급 실패가 비동기적으로 발생할 수 있다는 운영 관점을 차용했다. 이 제품은 Stripe를 쓰지 않으므로 구체 API는 차용하지 않았다.
- OWASP Authentication Cheat Sheet: 계좌 전체 열람 같은 민감 기능에서 재인증과 세션 안전성을 보는 관점을 차용했다. 이 제품의 10분 계좌 열람 로그 게이트를 실제로 만료시켜 확인했다.
- Supabase 테스트 문서: 로컬 DB 테스트와 운영 상태를 분리해 판정했다.

## SOURCES / MODEL

- 로컬: `pipeline-state.core.md`, `docs/test-plan.md`, `docs/one-thing.md`, `docs/persona.md`, `docs/qa-tracker.md`, `docs/구현현황.md`, `DESIGN.md`, `web/src/components/admin/CashoutQueue.tsx`, `web/src/components/cashout/CashoutRequestForm.tsx`, `web/src/stories/design-system/Tokens.stories.tsx`, `supabase/migrations/20260821000000_cashout_service_fee_10pct.sql`, `supabase/migrations/20260822000000_cashout_clover_lock_a1.sql`
- 관찰: `artifacts/qa-cashout-core-20260824/final-gate-v2/core-cashout-final-gate-observations-v2-gpt-codex.json`, 같은 폴더 스크린샷 24~32번
- 공식 웹: https://storybook.js.org/docs/writing-tests/index
- 공식 웹: https://storybook.js.org/docs/writing-docs/build-documentation
- 공식 웹: https://docs.stripe.com/connect/marketplace/tasks/payout
- 공식 웹: https://docs.stripe.com/connect/payouts-bank-accounts?bank-account-collection-integration=direct-api&bank-account-collection-method=manual-entry
- 공식 웹: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- 공식 웹: https://supabase.com/docs/guides/local-development/testing/overview
- MODEL: gpt-5.6-sol, qa-verifier

SKILLS_USED: qa, 로컬 웹 QA와 증거 수집 및 최종 게이트 판정 / SKILLS_SKIPPED: 없음

RUBRIC_SCORE: hook=5/5 detail=5/5 rhythm=4/5 voice=5/5 slop=5/5 total=24/25

WEAKEST_LINE: Storybook의 52개 컴포넌트 수는 파일 수 기준이며, 공식 컴포넌트 인벤토리가 없어 실제 포함 및 제외 분모는 미검증이다.
