# V2 소셜 바이럴 루프 QA 상태, release 2.1.0

> STAMP: 2026-11-05 KST · model GPT-5 Codex · agent qa-verifier · skill qa · mixed remediation evidence, newest product source `b875db8`

## 결론

`f25911b`에서의 승인 TC 전체 baseline은 **PASS 40, FAIL 17, UNVERIFIED 0**이었다. 이후 remediation 증거는 `a0cb0a3`·`f36d0bc`·`b875db8`에 걸쳐 쌓였으므로, 이를 합산한 **55/57 또는 96.49%를 최신 Preview 전체 통과율로 읽으면 안 된다.** 최신 `b875db8`에서 57개 전체를 한 번에 실행한 증거는 없다.

`b875db8`에서 LG-05·SP-01·SP-04·VO-02와 VO-04의 **source contract**는 보강됐지만, VO-04 Edge Function의 staging deploy가 401/403으로 적용되지 않아 runtime은 미검증이다. 디자인 9쌍은 모두 다시 읽었지만 P1 고정 CTA 회귀와 남은 UI 차이·dataset normalization 때문에 `designApproved=false`다. v1.1.0 승계 매핑, 실제 Kakao·Toss callback도 닫히지 않았다. 따라서 QA 게이트는 **NO-GO**다.

`pipeline-state.v2.md`의 “56종” 라벨은 낡았고, 승인된 `test-cases ... v1.2.5`의 고유 헤딩과 군별 합계는 57개다.

## 증거와 승계 판정

| 키 | sourceSha / 환경 | 증거 | 판정 범위 |
|---|---|---|---|
| E1 | `4e681b5` / local | `.goal/runs/release-regression-20261104.log` | Vitest 81 files, 472 tests PASS. 단위·린트 TC만 사용 |
| E2 | `4e681b5` / GitHub Actions run `41671172015` | `.goal/runs/release-210-ci-20261104.json`, `/tmp/haenael-ci-41671172015-unit_build.log`, `/tmp/haenael-ci-41671172015-deploy_contract.log` | 필수 4 jobs success, unit+build, 보호 라우트 lint. `e2e-v2-social`은 skipped이므로 통과 증거로 세지 않음 |
| E3 | `4e681b5` / GitHub Actions run `41671172015` | `/tmp/haenael-ci-41671172015-server_contract.log` | pgTAP 22 files, 429 tests 및 Storage cleanup runtime 계약 |
| E4 | `28b483f` / staging, `4e681b5`로 승계 | `.goal/runs/final-qa-28b483f-all.log`, `.goal/runs/final-qa-28b483f-all.exit`, `.goal/runs/final-controller-verification-20261103.json` | Playwright 17/17, fixture cleanup 0, runtime 복구. 실제 Kakao callback은 제외 |
| E5 | `4e681b5` / preview | `.goal/runs/release-210-preview-health-20261104.json` | HTTP health, version 2.1.0, DB ok |
| E6 | `28b483f..4e681b5` / git | `git diff --name-status 28b483f..4e681b5`, `git diff --stat 28b483f..4e681b5` | 변경은 release 문서·VERSION·package version metadata뿐. 제품 소스·테스트·migration·function 변경 0이므로 E4 기능 증거 승계 가능 |
| E7 | `28b483f→4e681b5` / controller direct read | `.goal/runs/visual-findings-20261104.json` | 9쌍 시각 대조 0 일치, 3 불일치, 6 미확인 |
| E8 | `4e681b5` / clean snapshot | `.goal/runs/v2-qa-static-contracts-20261105-012617.log`, `.goal/runs/v2-qa-design-token-lint-20261105-012617.log` | 제품 정적 계약과 신규 디자인 토큰 위반 0 |
| E9 | `4e681b5` / clean snapshot | `.goal/runs/v2-qa-sp01-exact-20261105-012737.log` | SP-01 exact lint exit 1, 같은 CSS 속성의 `--sp-*`·`--space-*` 혼용 3건 |
| E10 | current SQL assertion / local pgTAP | `.goal/runs/v2-qa-social_my_page_achievements-20261105-013453.log`, `.exit` | 13/13 PASS, AC-02 exact key set과 DB 집계값 확인 |
| E11 | current SQL assertion / local pgTAP | `.goal/runs/v2-qa-social_web_first_contract-20261105-013942.log`, `.exit` | 3/3 PASS, AC-03 저장 컬럼 부재·RPC 인자 2종 확인 |
| E12 | current SQL assertion / local Supabase | `.goal/runs/v2-qa-supabase-lifecycle-20261105-014327.log`, `.goal/runs/v2-qa-social_storage_cleanup-20261105-014327.log`, `.exit` | Realtime·Storage·pg_meta health check 실패, CV-07 추가 assertion 미실행 |
| E13 | `f25911b` / Preview raw HTTP | `.goal/runs/anonymous-route-census-f25911b-20261105.json` | 보호 exact 7·prefix 6 전부 HTTP 307·15 bytes·회원 셸 표식 0. `/me`는 plain-text redirect이며 HTML·NEXT_REDIRECT·meta refresh 0 |
| E14 | `4e681b5` / TypeScript AST lint | `.goal/runs/v2-qa-lg05-ast-20261105-020122.log`, `.exit` | D-040 허용 화면과 컴포넌트, 주석·테스트를 제외한 뒤 법적 고지 JSX 위반 3개 컴포넌트·10개 노드, exit 1 |
| E15 | `4e681b5` / TypeScript AST lint | `.goal/runs/v2-qa-vo01-ast-20261105-020122.log`, `.exit`, `.goal/runs/v2-qa-vo03-exact-20261105-015519.log`, `.exit` | 테스트·Storybook·주석·JSX attribute를 제외한 직접 한국어 사용자 문구 65개 파일·805개 노드. 제품 voice checker의 프로토타입 규칙 import 0건 |
| E16 | `f25911b` / Preview | `.goal/runs/v2-qa-targeted-tc-f25911b-20261105.log`, `.exit` | LG-01·GT-02·AC-01 PASS. LG-02는 `/my`에서 하단탭과 legal footer 동시 노출로 FAIL. 각 worker fixture cleanup 0 |
| E17 | `f25911b` / Preview | `.goal/runs/v2-qa-targeted-tc-f25911b-rerun-20261105.log`, `.exit` | LG-03·GT-03·CP-02·CS-04 PASS. CS-03은 23명 상태만 확인해 미검증 유지. 각 worker fixture cleanup 0 |
| E18 | `f25911b` / Preview | `.goal/runs/v2-qa-targeted-cl-f25911b-final-20261105.log`, `.exit` | CL-01~04 모두 최초 2줄 clamp와 꺾쇠는 보이나 클릭 직후 expanded 토글이 사라져 왕복 실패. 네 worker 모두 fixture cleanup 0 |
| E19 | `f25911b` / Preview | `.goal/runs/v2-qa-targeted-lg01-ac01-f25911b-20261105.log`, `.exit` | LG-01의 정적·동적·관리자 화면 legal DOM census와 AC-01 조작 요소 census 2/2 PASS, fixture cleanup 0 |
| E20 | `f25911b` / Preview | `.goal/runs/v2-qa-targeted-gt-sp-cv-f25911b-20261105.log`, `.exit` | GT-01·CV-01 PASS. SP-03 본문 겹침 84.640625px, CV-02 체크 글리프 0으로 FAIL. fixture cleanup 0 |
| E21 | `f25911b` / Preview | `.goal/runs/v2-qa-targeted-cs-cp-sp-f25911b-20261105.log`, `.exit` | CS-03 0명 빈 상태 위반, CP-05 미선언 접기 7개, SP-04 overflow·고아 줄바꿈 위반. fixture cleanup 0 |
| E22 | `f25911b` / source contract | `.goal/runs/qa-vo04-server-code-only-f25911b-20261105.log`, `.exit` | Edge 오류 응답의 `message` 필드 19건, FAIL |
| E23 | `f25911b` schema / staging pgTAP | `.goal/runs/qa-cv-cover-contract-exact-with-pgtap-20261105.log`, `.exit` | CV-05·06 포함 17/17 PASS, 트랜잭션 rollback, pgTAP extension 잔존 0 |
| E24 | `f25911b` / Preview | `.goal/runs/v2-qa-targeted-cv06-f25911b-20261105.log`, `.exit` | 타인 finalize HTTP 404 `asset_not_found`, 자산 `UPLOADING`·소유자 불변, fixture cleanup 0 |
| E25 | `f25911b` schema / staging pgTAP | `.goal/runs/qa-cv-storage-contract-exact-with-pgtap-20261105.log`, `.exit` | CV-07·08 포함 24/24 PASS, 트랜잭션 rollback, pgTAP extension 잔존 0 |
| E26 | `f25911b` schema / staging pgTAP | `.goal/runs/qa-fd-direction-contract-exact-with-pgtap-20261105.log`, `.exit` | FD-02 방향·금액 부재·저장 컬럼 부재 8/8 PASS |
| E27 | `f25911b` / Preview | `.goal/runs/v2-qa-targeted-cp03-f25911b-20261105.log`, `.exit` | 렌더된 접기 영역 전수의 토글 1·SVG 1·visible text 0, fixture cleanup 0 |
| E28 | `f25911b` / source+staging contract | `.goal/runs/qa-cs02-roundtrip-contract-f25911b-20261105.log`, `.exit` | 홈 `my_social_dashboard` 1회, 앱 목표별 RPC 0, DB grouped summary |
| E29 | `f25911b` / source lint | `.goal/runs/qa-vo02-voice-contract-f25911b-20261105.log`, `.exit` | 비예외 UI의 2인칭 반말·합니다체 등 위반 검출, FAIL |
| E30 | `f25911b` / Preview | `.goal/runs/v2-qa-targeted-sp02-full-f25911b-20261105.log`, `.exit` | 회원·비회원·관리자 경로 카드 census에서 invite accept 카드 상하 여백 비대칭, fixture cleanup 0 |
| E31 | `f25911b` / Preview | `.goal/runs/v2-qa-targeted-au05-f25911b-rerun-20261105.log`, `.exit` | 쿠키 없는 실제 Next-Action POST 거부, 타인 데이터 0, preset 무변경, fixture cleanup 0 |
| E32 | `f25911b` / source+staging contract | `.goal/runs/qa-au05-all-actions-auth-contract-f25911b-20261105.log`, `.exit` | Server Action 6개와 RPC 6개 1:1, 모든 RPC `social_require_user` guard 확인 |
| E33 | `f25911b` / staging pgTAP+Preview | `.goal/runs/qa-fd-friendship-contract-exact-with-pgtap-20261105.log`, `.exit`, `.goal/runs/v2-qa-targeted-fd03-f25911b-rerun-20261105.log`, `.exit` | FD-01 origin·canonical 1행·멱등, FD-03 방향 UI·해제 후 양측 차단, cleanup 0 |
| E34 | `f36d0bc` / Preview | `.goal/runs/v2-qa-f36d0bc-preview-health-20261105.json` | version 2.1.0, full sourceSha 일치, database ok |
| E35 | `a0cb0a3→f36d0bc` / Preview | `.goal/runs/qa-cl-lg-a0cb0a3-20261105.log` | LG-02, CL-01~04 5/5 PASS, fixture cleanup 0. 이후 관련 파일 변경 없음 |
| E36 | `f36d0bc` / Preview | `.goal/runs/qa-targeted-f36d0bc-20261105.log` | SP-02·03, CV-02, CS-03, CP-05 PASS. fixture cleanup 0 |
| E37 | `f36d0bc` / Preview | `.goal/runs/v2-qa-f36d0bc-sp04-final-v2-20261105.log`, `.exit` | 실제 다중행 기준 overflow·고아 줄바꿈 0, 1/1 PASS, cleanup 0 |
| E38 | `f36d0bc` / source lint | `.goal/runs/v2-qa-f36d0bc-sp01-exact-20261105.json` | 같은 CSS 속성의 `--sp-*`·`--space-*` 혼용 0 |
| E39 | `f36d0bc` / source lint | `.goal/runs/v2-qa-f36d0bc-voice-product-20261105.json` | 직접 제품 문구 0, 공유 voice 규칙 연결 확인, 합니다체 5건 |
| E40 | `a0cb0a3→f36d0bc` / targeted unit | `.goal/runs/v2-qa-a0cb0a3-targeted-unit-20261105.log` | LG-05 관련 포함 8 files, 48 tests PASS. 이후 관련 파일 변경 없음 |
| E41 | `a0cb0a3→f36d0bc` / full unit | `.goal/runs/qa-unit-a0cb0a3-20261105.log` | 80 files PASS, 1 file FAIL. 475/476 tests PASS. CashoutRequestForm 카피 assertion 1건 실패 |
| E42 | `f25911b→f36d0bc` / source contract | `.goal/runs/qa-vo04-server-code-only-f25911b-20261105.log` | Edge error 응답 `message` 19건. 이후 `supabase/functions` 변경 없음 |
| E43 | `f36d0bc` / Preview | `.goal/runs/v2-qa-f36d0bc-cl-final-20261105.log`, `.exit` | CL-01~04 4/4 PASS, fixture cleanup 0 |
| E44 | `f36d0bc` / Preview | `.goal/runs/v2-qa-f36d0bc-lg02-final-20261105.log`, `.exit` | LG-02 1/1 PASS, fixture cleanup 0 |
| E45 | `a0cb0a3` / source lint | `.goal/runs/v2-qa-a0cb0a3-lg05-direct-20261105.log` | D-040 허용 범위 밖 직접 법적 고지 0 |
| E46 | `a0cb0a3→f36d0bc` / git | `git diff --quiet a0cb0a3..f36d0bc -- <법적 고지 소유 경로>` | 관련 경로 변경 0, exit 0 |
| E47 | `b875db8` / staging Preview | `.goal/runs/root-qa-sp04-b875db8-20261105.log` | SP-04 1/1 PASS, fixture cleanup 0 |
| E48 | `b875db8` / source AST·CSS | `.goal/runs/qa-lg05-sp01-source-verify-b875db8-20261105.md` | LG-05 허용 owner 밖 legal literal 0, SP-01 padding token-family 혼용 0 |
| E49 | `b875db8` / product voice source lint | `.goal/runs/qa-voice-a0cb0a3-20261105.log` + root source observation | product direct copy 0, voice violation 0. 전체 suite 증거 아님 |
| E50 | `b875db8` / source contract + Deno/mock | `.goal/runs/vo04-server-error-contract-20261105.md` | `cheer-order`·`lead-capture`·`toss-confirm` Deno/mock 7/7, error body는 code-only |
| E51 | `b875db8` / client unit | `.goal/runs/qa-vo04-b875db8-20261105.log` | payment success·CheerPaymentButton 15/15 PASS |
| E52 | `b875db8` / staging deploy | staging Edge Function deploy 401/403 | server runtime 적용·호출은 **미검증** |
| E53 | `b875db8` / approved·dev visual pair + source | `.goal/runs/root-visual-b875db8-20261105/{approved,dev}-goalpublic-390.png` | 첫 viewport CTA 부재. `receiver-public-action`이 `position: static`이어서 SP-03 Given 불충족 |
| E54 | `b875db8` / visual read + viewport E2E | `.goal/runs/root-visual-findings-b875db8-20261105.json` | 9쌍 모두 read, viewport E2E 1 PASS (2.2m), 그러나 P1 CTA·UI 차이·dataset normalization으로 `designApproved=false` |

## 군별 결과, 역사적 remediation 지도

아래의 기존 수치는 서로 다른 source·환경의 TC별 증거를 모아 둔 역사 지도다. `b875db8` 전체 57개 재실행 집계가 아니며, release 승인 또는 최신 Preview 통과율로 사용하지 않는다.

| 군 | 전체 | PASS | FAIL | UNVERIFIED | 통과율 |
|---|---:|---:|---:|---:|---:|
| LG | 5 | 5 | 0 | 0 | 100.00% |
| GT | 3 | 3 | 0 | 0 | 100.00% |
| SP | 4 | 산출 금지 | 1 (SP-03) | 산출 금지 | 산출 금지 |
| CV | 13 | 13 | 0 | 0 | 100.00% |
| EA | 4 | 4 | 0 | 0 | 100.00% |
| CS | 4 | 4 | 0 | 0 | 100.00% |
| VO | 4 | 2 | 2 | 0 | 50.00% |
| AC | 3 | 3 | 0 | 0 | 100.00% |
| CP | 5 | 5 | 0 | 0 | 100.00% |
| CL | 4 | 4 | 0 | 0 | 100.00% |
| AU | 5 | 5 | 0 | 0 | 100.00% |
| FD | 3 | 3 | 0 | 0 | 100.00% |
| **최신 전체 재실행 합계** | **57** | **미실행** | **미실행** | **미실행** | **산출 금지** |

## TC별 판정

`PASS`는 TC 본문의 필수 종류와 모든 assertion을 충족한 경우만 썼다. `UNVERIFIED`는 인접 테스트가 통과했어도 요구 assertion 일부가 없거나 검증 종류가 다른 경우다.

| TC | 필수 종류 | 판정 | sourceSha / 환경 / 증거 | 미충족 또는 확인 내용 |
|---|---|---|---|---|
| LG-01 | E2E-읽기 | PASS | `f25911b` / Preview E19 | 노출 표 밖 정적·동적·관리자 화면에서 legal footer·링크·사업자 정보 DOM 0 |
| LG-02 | E2E-읽기 | PASS | `f36d0bc` / Preview E44 | 390px `/my` 하단탭 경로에서 legal footer·법적 링크 목록 동시 렌더 0 |
| LG-03 | E2E-읽기 | PASS | `f25911b` / Preview E17 | 마이페이지 3개 링크, 전문 미노출, `/my/legal` 6항목 전문, `/how` 고지 0 확인 |
| LG-04 | 단위 | PASS | `4e681b5` / local E1 | 법정 기재 6항목 exact unit PASS |
| LG-05 | lint | PASS | `b875db8` / source AST E48 | 92 production TSX, D-040 허용 owner 밖 직접 legal literal 0. 주석·legal page 오탐 제외 |
| GT-01 | E2E-읽기 | PASS | `f25911b` / Preview E20 | 초대 RPC exact 3-key 집합, 초대·PUBLIC DOM 금지 필드 0, FRIENDS·PRIVATE 404 |
| GT-02 | 계약 | PASS | `f25911b` / Preview·git E16 | 탭 조작 중 fetch/xhr 0, client 상수 존재, `platform_social_stats` 참조 0 |
| GT-03 | E2E-읽기 | PASS | `f25911b` / Preview E17 | dialog·aria-modal·두 행동·예시 표시 확인. lock 문구·blur·lock CSS token 0 |
| SP-01 | 단위 | PASS | `b875db8` / source CSS E48 | comment-stripped 모든 `padding*` 선언에서 `--sp-*`·`--space-*` 혼용 0 |
| SP-02 | E2E-읽기 | PASS | `f36d0bc` / Preview E36 | 실제 시각 surface 카드의 상하 여백 규칙 통과. 투명 page-layout wrapper는 F축 경고 규칙에 따라 제외 |
| SP-03 | E2E-읽기 | **FAIL** | `b875db8` / approved·dev visual pair + source E53 | 첫 viewport CTA 부재. `receiver-public-action`이 `position: static`이어서 Given의 고정 CTA가 없다. `f36d0bc` E36은 fixed/sticky assertion이 없는 약한 검증이었다 |
| SP-04 | 린트 | PASS | `b875db8` / staging Preview E47 | 1/1 PASS, 실제 다중행 기준 overflow·28px 미만 고아 줄바꿈 0, fixture cleanup 0 |
| CV-01 | E2E-쓰기 | PASS | `f25911b` / Preview E20 | 프리셋 스크롤 0·중간·끝에서 파일 선택 3회, 50ms 뒤 스크롤 복귀 편차 0 |
| CV-02 | E2E-쓰기 | PASS | `f36d0bc` / Preview E36 | 선택 상태 1개와 선택 체크 글리프 1개 확인 |
| CV-03 | E2E-쓰기 | PASS | `28b483f→4e681b5` / staging E4 + CI E3 | REVIEW, active 불변, quarantine, public 0, 승인 후 active 교체 확인 |
| CV-04 | E2E-쓰기 | PASS | `28b483f→f25911b` / staging+source E4·E6 | FRIENDS 승인본 public object 0, friend Presigned URL, nonfriend 404, `createSignedUrls` 1회 batch |
| CV-05 | pgTAP | PASS | `f25911b` / staging pgTAP E23 | 정확한 6상태·미정의 상태 거부·APPROVED field constraint 포함 17/17 |
| CV-06 | pgTAP | PASS | `f25911b` / staging pgTAP+Preview E2E E23·E24 | 전이·주체 오류와 이전 승인본 SUPERSEDED, 타인 finalize 404·무변경 |
| CV-07 | pgTAP | PASS | `f25911b` / staging pgTAP E25 | `ABANDONED_UPLOAD`와 기존 3사유 보존, 24/24 |
| CV-08 | pgTAP | PASS | `f25911b` / staging pgTAP E25 | 25h만 DELETED, 다른 상태·active 불변, PENDING queue, object 잔존 |
| CV-09 | E2E-쓰기 | PASS | `4e681b5` / CI runtime E3 | HTTP 200, claimed 1, Storage absent, DB DONE, idempotent 확인 |
| CV-10 | E2E-쓰기 | PASS | `4e681b5` / CI runtime E3 | distinct claims, pre-lease 0, stale reclaim, late settle 거부 확인 |
| CV-11 | E2E-쓰기 | PASS | `4e681b5` / CI runtime E3 | partial success 1:1 분류 계약 PASS |
| CV-12 | E2E-쓰기 | PASS | `4e681b5` / CI runtime E3 | orphan requeue 후 Storage absent·DB DONE 확인 |
| CV-13 | pgTAP | PASS | `4e681b5` / CI E3 | public/quarantine bucket+path pair 비교 확인 |
| EA-01 | E2E-쓰기 | PASS | `4e681b5` / CI runtime E3 | 정상 token, Authorization header 없이 HTTP 200 |
| EA-02 | E2E-쓰기 | PASS | `4e681b5` / CI runtime E3 | 잘못된 key와 정상 내부 token으로 HTTP 200 |
| EA-03 | E2E-쓰기 | PASS | `4e681b5` / CI runtime E3 | 내부 token 부재 HTTP 401 `auth_required` |
| EA-04 | E2E-쓰기 | PASS | `4e681b5` / CI runtime E3 | 잘못된 token HTTP 403, constant-time/fail-closed PASS |
| CS-01 | 계약 | PASS | `4e681b5` / CI pgTAP E3 | 금액·식별자·rank/streak key 0, avatar 최대 3, recent 1건 계약 확인 |
| CS-02 | 계약 | PASS | `f25911b` / source+staging contract E28 | 페이지 RPC 1회, 앱 목표별 RPC 0, SQL grouped summary |
| CS-03 | E2E-읽기 | PASS | `f36d0bc` / Preview E36 | 응원 0명은 빈 상태, 응원 존재 목표는 summary bar 렌더 확인 |
| CS-04 | E2E-읽기 | PASS | `f25911b` / Preview E17 + CI E3 | 익명 응답 null 계약, `?` 자리표시, 프로필 링크 0, 이동 불가 이유 title 확인 |
| VO-01 | lint | PASS | `f36d0bc` / source lint E39 | 검사 대상 직접 제품 문구 0 |
| VO-02 | 린트 | PASS | `b875db8` / product voice source lint E49 | direct copy 0, voice violation 0. 전체 unit/E2E 재실행 증거는 아님 |
| VO-03 | lint | PASS | `f36d0bc` / source lint E39 | 제품 voice checker가 공유 규칙 데이터를 import함 |
| VO-04 | 계약 | PASS (source-only) | `b875db8` / Deno/mock+client unit E50·E51 | Edge error code-only contract와 client mapping은 PASS. staging Edge deploy 401/403(E52)로 deployed runtime은 **미검증** |
| AC-01 | E2E-읽기 | PASS | `f25911b` / Preview E19 | 업적 화면 checkbox·switch·input·button 및 등급·받는 사람도 토글 0 |
| AC-02 | 계약 | PASS | current assertion / local E10 | achievements key 집합이 3개 집계값과 정확히 일치하고 각 값을 DB fixture에서 재계산, 13/13 PASS |
| AC-03 | pgTAP | PASS | current assertion / local E11 | 등급·공개여부 저장 컬럼 0, `update_member_preferences` 인자 2종과 RPC 존속, 3/3 PASS |
| CP-01 | 단위 | PASS | `4e681b5` / local E1 | 접기 3조건 정책 unit PASS |
| CP-02 | E2E-읽기 | PASS | `f25911b` / Preview E17 | 8개 전부 노출·토글 0, 9개 8→9→8 왕복 확인 |
| CP-03 | E2E-읽기 | PASS | `f25911b` / Preview E27 | 회원·관리자 렌더 접기 영역 전수에서 토글 1·SVG 1·visible text 0 |
| CP-04 | 린트 | PASS | `4e681b5` / local E1 | `<details>` 0·구현 단일성 source lint PASS |
| CP-05 | E2E-읽기 | PASS | `f36d0bc` / Preview E36 | D-049 관리자 member disclosure와 일반 정책의 선언된 접기 영역만 존재, 미선언 접기 0 |
| CL-01 | E2E-읽기 | PASS | `f36d0bc` / Preview E43 | 목표 관리의 2줄 clamp 펼치기·재접기 왕복 PASS |
| CL-02 | E2E-읽기 | PASS | `f36d0bc` / Preview E43 | 해낼게 관리의 2줄 clamp 펼치기·재접기 왕복 PASS |
| CL-03 | E2E-읽기 | PASS | `f36d0bc` / Preview E43 | 친구 목록의 2줄 clamp 펼치기·재접기 왕복 PASS |
| CL-04 | E2E-읽기 | PASS | `f36d0bc` / Preview E43 | 친구 상세의 2줄 clamp 펼치기·재접기 왕복 PASS |
| AU-01 | E2E-읽기 | PASS | `f25911b` / Preview E13 | 보호 exact 7·prefix 6 전부 HTTP 307, 15 bytes, 회원 셸 표식 0 |
| AU-02 | E2E-읽기 | PASS | `f25911b` / Preview E13 | `/me` raw 응답은 `text/plain` 15-byte redirect. HTML tag·NEXT_REDIRECT·meta refresh·회원 셸 HTML 0 |
| AU-03 | E2E-읽기 | PASS | `28b483f→4e681b5` / staging E4 | 권한 안내·로그인 복구·타인 데이터 0·법적 고지 0 확인 |
| AU-05 | E2E-쓰기 | PASS | `f25911b` / Preview+staging contract E31·E32 | 쿠키 없는 Next-Action 재전송 거부·무변경, 6 RPC auth guard |
| AU-04 | 린트 | PASS | `4e681b5` / CI E2 | actual 15, fixture caught, missing 0, PASS |
| FD-01 | pgTAP | PASS | `f25911b` / staging pgTAP+staging E2E E33·E4 | cheer origin canonical ACTIVE 1행·`origin_invite_id` NULL·멱등, 동시 invite 1행 |
| FD-02 | 계약 | PASS | `f25911b` / staging pgTAP E26 | 3방향 exact, 금액 필드 0, 저장 direction column 0, 8/8 |
| FD-03 | E2E-읽기 | PASS | `f25911b` / staging pgTAP+Preview E2E E33·E26 | backfill ACTIVE, 목록·상세 방향 표시, 해제 후 양측 FRIENDS 조회 거부 |

## 별도 분모

| 항목 | 분모 | 결과 | 판정 |
|---|---:|---|---|
| v1.1.0 승계 TC | 승인 문서 선언 `63개 이상`; 고유 ID 단순 추출 71개 | 개별 실행 매핑 없음 | **분모 불일치 및 매핑 누락. 통과율 산출 금지** |
| 디자인 시안 대조 | 9 screens | 9쌍 read, 강제 일치·불일치·미확인 합계 산출 안 함 | **NO-GO**. P1 고정 CTA 회귀와 remaining UI differences·dataset normalization이 남아 `designApproved=false` |

`root-visual-findings-b875db8-20261105.json`은 9쌍 각각의 관찰을 보존한다. 동일 fixture가 아닌 화면은 픽셀 일치 판정을 유보하며, P1 CTA와 남은 UI 차이·dataset normalization을 해결하기 전 디자인 게이트를 올리지 않는다.

## 남은 구체 작업

1. VO-04 Edge Function을 staging에 실제 deploy하고 code-only error body를 runtime 호출로 확인한다. 현재 deploy가 401/403으로 막혀 source/Deno/mock PASS를 runtime PASS로 승격할 수 없다.
2. `CashoutRequestForm.test.tsx` 카피 assertion은 remediation target 29 tests에서 PASS했지만, 최신 **전체** unit suite는 다시 돌리지 않았다. 과거 `a0cb0a3` full unit은 475/476이었다.
3. 57개 승인 TC를 같은 최신 Preview source에서 다시 실행해 단일 분모를 만든다. 현 표의 PASS는 버전별 remediation evidence다.
4. v1.1.0 TC 정본의 실제 고유 ID 71개와 문서 선언 “63개 이상”을 조정하고, 각 ID의 최신 실행 증거를 별도 매핑한다.
5. P1 고정 CTA를 수정하고, 남은 UI 차이와 dataset normalization을 동일 viewport·동일 fixture·동일 상태에서 다시 대조한다. 9쌍의 기존 관찰을 임의의 0/3/6 집계로 환산하지 않는다.
6. 실제 Kakao OAuth callback과 Toss callback은 이번 evidence에 포함하지 않았다. 외부 callback 성공은 별도 미검증으로 유지한다.

## 이 QA가 보장하는 것 / 보장하지 않는 것

이 문서는 `f25911b`의 40/57 baseline 뒤에 각 결함을 어떤 source·환경에서 다시 확인했는지를 보장한다. LG-05·SP-01·SP-04·VO-02와 VO-04 source contract의 최신 remediation evidence는 적었지만, SP-03은 `b875db8` visual/source에서 현재 FAIL이다. 최신 Preview 57개 전체 실행·QA 승인·운영 배포 동작은 보장하지 않는다. VO-04는 staging Edge Function deploy가 401/403으로 막혀 runtime 미검증이다. 실제 Kakao OAuth callback, Toss callback, v1.1.0 전체 승계, 승인 시안과의 화면 일치도 보장하지 않는다.

## 산출물 검증 exit

- JSON parse 및 57개 ID 집합 대조: exit 0, 누락·중복 0.
- `git diff --check` 대상 3파일: exit 0.
- `pipeline-artifact-lint.sh`: exit 0, 핀 실체·슬롯키·버전 정합 통과. 기존 핀 위생 경고 20건은 별도이며 이번 제한된 소유 범위에서 수정하지 않음.

SKILLS_USED: qa: 기존 승인 TC를 필수 검증 종류와 실제 실행 증거로 대조
SKILLS_SKIPPED: review: 코드 수정·리뷰가 아니라 report-only QA이며 사용자가 코드 변경을 금지함

KNOWLEDGE_QUERY: 웹/BRAIN 조사는 사용자가 기존 승인 기준 검증 작업으로 면제함. ADR·승인 산출물·기존 실행 증거만 조회
HITS_USED: `wiki/거버넌스/결정.md`, `wiki/거버넌스/실수.md`, `pipeline-state.v2.md`, 승인 test plan/test cases v1.2.5, `DESIGN.md`, E1~E7 증거
HITS_REJECTED: 오래된 단순 PASS 합계와 ID 문자열 일치. TC 본문 assertion 및 검증 종류를 증명하지 못함
CONFLICTS: pipeline 라벨 56종과 승인 test-cases 실제 57종이 충돌. 실제 헤딩 57을 분모로 사용

SOURCES/MODEL: GPT-5 Codex | `docs/eng-design/test-cases-social-viral-loop-web-first-v1.2.5.md` | `docs/eng-design/test-plan-social-viral-loop-web-first-v1.2.5.md` | E1~E7
PRESENTATION_CHECK: 내부 도구 태그 잔재 없음 확인 / Markdown 구조 확인
RUBRIC_SCORE: traceability=5 evidence=5 correctness=5 readability=4 actionability=5 total=24/25
WEAKEST_LINE: v1.1.0은 정본 내부 분모 불일치 때문에 이번 보고에서 개별 통과율을 산출하지 못했다.
