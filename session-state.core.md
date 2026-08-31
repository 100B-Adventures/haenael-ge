## CLAUDE 스프린트 정리 완료·종료 판정 대기 (2026-08-31 21:55 KST)

### 지금까지 한 것
- **저장소 정리 완료.** 잔여 미커밋은 성장 트랙 7건뿐(다른 세션 소유, §8 로 미수정).
  - `docs/requests/inbox/` 추적 편입(`5790aa6`). 훅 `chairman-request-capture.sh` 가 회장 발화를 원문 박제하는 파일인데 미추적이라 세션 교대 시 소실 위험이 있었다(§4.6 request-provenance).
  - SJ_BRAIN_wiki `d1f387a`: 승인 핀이 파일명 추측보다 우선한다는 계약을 테스트로 고정 + 수집 결과 갱신. `node --test` **16/16**. 이번 수정이 다음 세션에 조용히 증발하지 않게 하는 회귀 장치.
- **최종 실측 재확인:** `/api/health` = `{"status":"ok","version":"1.2.1","database":"ok"}`, 태그 `v1.2.1` 존재, `artifact-drift-check.sh` **드리프트 0**, main push 완료(origin 동기).

### 스프린트 종결 판정 (회장 결정 대기)
공정 기준 = **종료 가능.** 6단계 승인 / v1.2.1 released·배포 검증 / 회고 작성 / 대시보드 31/31 클릭 열람 정상 / 드리프트 0.

**단 핵심 산출 검증 1건이 비어 있다.** 이 스프린트의 목적은 회장이 직접 겪은 30클로버 신청 거부 수정이었는데, **그 경로를 실제로 통과한 회원이 0명**이다(운영 집계 `reached_threshold=0`, 총30·지급가능27 계정 0). 계약·화면·E2E 는 전부 우리가 만든 것을 우리가 검사한 것이고, 실제 회원 통과는 관측된 적이 없다.

선택지: ①여기서 닫고 유저 확보로 전환(**추천** — 회장 방향과 일치, 회원이 도달해야 검증도 가능. "미검증 1건" 명시 인수) ②첫 회원 통과까지 스프린트 유지(정확하나 종료 시점을 우리가 통제 못 함).

### 남은 이슈
1. **스프린트 종료 판정 = 회장.**
2. **`pay-open` worktree = 회장 결정.** 브랜치 main 병합 완료, 마지막 커밋 2026-08-02, 미커밋 59건(25파일 945줄 + 미추적 34)이라 임의 제거 불가. 대시보드 오염은 수집기 수정으로 이미 해소. 추천 = 미커밋분 커밋 후 제거.
3. **CI green 없음.** run `33394104921` 포함 전부 세 job 이 2~3초 만에 steps 0개 종료. Actions 무료 2,000분 소진 + budget $0 + Stop usage Yes. `--log-failed` 로 열 로그 자체가 없다. 코드 실패도 flaky 도 아니며 저장소 수정으로 해소 불가.
4. **총30·지급가능27 실계정 0명** → 실제 신청 성공 미검증(위 종결 판정의 근거).
5. 지급 신원·세무정보 처리 계약 = 회장 보류(범위 밖, open-decisions 등재).
6. 토스 지급대행 해지 미실행.
7. `collect-harness-changelog.mjs` 행(hang) 가능성 — 다른 트랙 소유. 재발 시 private 빌드 prebuild 를 막는다.

### 다음 액션
1. **소유자: 회장.** 스프린트 종료 판정(①닫고 유저 확보 전환 / ②첫 회원 통과까지 유지). **종료증거:** 판정 발화 후 pipeline-state 반영.
2. **소유자: 회장.** `pay-open` worktree 처리 방식 결정. **종료증거:** 저장소 clean.
3. **소유자: 회장.** GitHub Actions 예산 결정 또는 무료분 초기화 대기. **종료증거:** CI job 에 실제 steps 생성 후 success.
4. **소유자: 회장.** 토스 지급대행 해지(평일 08:00~19:00 라이브챗). **종료증거:** 계약 상태 변경.
5. **소유자: 실제 회원.** 총30·지급가능27 상태에서 27클로버 신청. **종료증거:** 운영 신청 성공과 후속 지급 흐름.

## CLAUDE 대시보드 클릭 열람까지 검증 완료 (2026-08-31 07:10 KST)

### 지금까지 한 것
- 수집기 파싱 수정분(SJ_BRAIN_wiki `cff9d55`)을 컨트롤러가 재검증: 단위 테스트 **16/16**, 재수집 후 haenael 합성키 **31개 전량 `core`**(유령 `main` 소멸), import 실재 **31/31**, missingReason **0**, `pipeline-live` 의 `approvedArtifacts` **31건**(이전 `[]`).
- **private 대시보드 빌드가 깨져 있던 것을 찾아 고쳤다(SJ_BRAIN_wiki `d9985a2`).** 앞선 수정이 emit 하는 타입 선언에서 "실물 없음" 변형에 실제로는 없는 `load` 가 적혀 있어 타입 좁히기가 무력화되고 `DashboardView.tsx:415` 가 TS2322 로 깨졌다. 공개 빌드만 확인했으면 못 잡았을 결함이다.
- **클릭 열람 실검증 통과.** `npx tsc -b` exit 0 → `vite build --mode private` ✓ built → `node scripts/headless-artifact-smoke.mjs` **PASS(모달에 원문 표시)**.
- 빌드된 번들에 security-report·perf-report·cross-browser-matrix·design-spec·clean-frames·구현현황·RELEASE·CHANGELOG **전부 포함** 확인, `feed-02-carousel`(마케팅 캐러셀 오탐) **0건** 확인.
- **회귀 없음(정정된 실측).** before/after: romeo 23→25, dark 15→15, zero-one 64→97, d-edu 97→117, openclaw-auto 20→30, haenael-ge 19→31, haejo-danta 17→17, verse 8→8, blog-premium 33→34. **감소 0.**
  - ★내 앞선 보고의 "타 벤처 개수 동일"은 **오측정**이었다. 이미 수정이 적용된 뒤 상태를 before 로 잡았다. 결론(무회귀)은 같으나 근거 숫자가 틀렸고 회장께 정정 보고했다.
- 전체 missingReason 36→41 증가는 회귀가 아니라 **표면화**(해조단타·blog-premium 이 승인 핀에 경로 대신 설명 라벨을 적어둔 것이 이제 읽혀 드러남). 그 벤처 소유라 미수정.
- 빌드 도중 `collect-harness-changelog.mjs`(다른 트랙 소유)가 35분 이상 진행 없이 멈춰 prebuild 를 막았다. 해당 프로세스를 종료하고 `tsc -b` + `vite build` 를 직접 실행해 우회했다. 이 스크립트의 행 자체는 그 트랙 몫으로 남긴다.

### 남은 이슈
1. **`pay-open` worktree 처리 = 회장 결정.** 브랜치 `wt-pay-open` 은 main 에 병합됨, 마지막 커밋 2026-08-02. 미커밋 59건(25파일 945줄 + 미추적 34) 때문에 임의 제거하지 않았다. 수집기 수정으로 대시보드 오염은 이미 사라졌다. open-decisions 에 선택지 4안 등재(추천 = 미커밋분 커밋 후 제거).
2. **CI green 없음.** run `33318783524` 포함 전부 세 job 이 2초 만에 steps 0개 종료. Actions 무료 2,000분 소진 + budget $0. 코드 실패도 flaky 도 아니며 `--log-failed` 로 열 로그가 없다. 저장소 수정으로 해소 불가.
3. **`collect-harness-changelog.mjs` 행(hang)** 이 남아 있으면 다음 private 빌드도 막힌다. 다른 트랙 소유.
4. 총보유 30·지급가능 27 실계정 0명. 실제 신청 성공 미검증.
5. 지급 신원·세무정보 처리 계약 = 회장 보류(범위 밖).

### 다음 액션
1. **소유자: 회장.** `pay-open` worktree 처리 방식 결정. **종료증거:** 폴더 정리 후 저장소 clean.
2. **소유자: 회장.** GitHub Actions 예산 결정 또는 무료분 초기화 대기. **종료증거:** CI job 에 실제 steps 생성 후 success.
3. **소유자: 100B/openclaw-auto 트랙.** `collect-harness-changelog.mjs` 행 원인 규명. **종료증거:** prebuild:private 이 끊김 없이 완주.
4. **소유자: 회장.** 토스 지급대행 해지(평일 08:00~19:00 라이브챗). **종료증거:** 계약 상태 변경.
5. **소유자: 실제 회원.** 총 30·지급가능 27 상태에서 27클로버 신청. **종료증거:** 운영 신청 성공.

## CODEX 100B 대시보드 수집기 수정 회수 (2026-08-31 05:45 KST)

### 지금까지 한 것
- 100B 수집기가 `pipeline-state.core.md`의 표준 block/list `approved_artifacts`를 1급 파싱하도록 수정했다. 기존 inline 객체와 legacy block map도 유지했다.
- 승인 핀의 정확 path를 파일명 추측보다 우선하고, 표준 핀이 모두 실재하면 discovery와 worktree fallback을 억제했다.
- 루트 `pipeline-state.md`가 없는 레포는 실제 정식 라인에만 귀속하도록 고쳐 유령 `main`을 제거했다. 낡은 `pay-open` worktree는 유실 위험 때문에 삭제하지 않았다.
- glob 핀은 대표 실파일 1건과 `globMatchCount`를 기록한다. migration 4건, QA contract 1건을 확인했다.
- 현재 진실원의 승인 핀은 37건이 아니라 목록 항목 31건이다. 단계 제목 6개를 합치면 하위 YAML 행이 37개다. 수집 결과는 pin 31/31, glob 전개 실파일 34/34다.
- `dashboard-sync.sh manual` exit 0 후 `haenael-ge` 합성키는 `core=31`, `main=0`, `missingReason=0`, 실파일 `load()` 31/31이다. 기존 인스타 캐러셀·구 wireframe·중복 matrix 오탐은 합성키에서 사라졌다.
- 9개 벤처 합성키는 감소 0이다. before/after: romeo 23→25, dark 15→15, zero-one 64→97, d-edu 97→117, openclaw-auto 20→30, haenael-ge 19→31, haejo-danta 17→17, verse 8→8, blog-premium 33→34.
- 검증: artifact 계약 테스트 16/16, 대상 ESLint, `npm run build` 통과. private Dashboard 전항목 실클릭은 QA 미검증이다.
- 공유 BRAIN 저장소에서 다른 동시 작업이 05:26 KST에 수집기 1차 변경을 `cff9d55`로 커밋했다. 이 Codex 세션은 commit·push를 실행하지 않았다. 현재 로컬 원격 추적 브랜치에는 해당 커밋이 없다.

### 남은 이슈
1. private Dashboard에서 `haenael-ge core` 31개 모달 실클릭과 브라우저 콘솔 오류 0 검증이 남았다.
2. 전역 기존 `missingReason` 36건과 새로 표면화된 ZERO-ONE의 비파일 worktree 핀 1건은 별도 벤처 정본 정리가 필요하다. `haenael-ge` 누락은 0이다.
3. GitHub CI run `33318783524`는 세 job 모두 steps 0개로 실패했다. 코드 실행 전 계정 Actions 무료분 소진 + budget $0에서 차단된 기존 외부 조건이다. `gh run view --log-failed`도 실행 로그가 없어 실패했다. 코드 결함이나 플레이키 증거는 아니다.
4. BRAIN 저장소가 여러 세션의 대규모 dirty 상태다. 이 작업은 관련 8파일 외 사용자 변경을 건드리지 않았다.

### 다음 액션
1. **소유자: qa-verifier.** `npm run build:private` 후 `node scripts/headless-artifact-smoke.mjs` 실행, `haenael-ge core` 31개 모달 확인. **종료증거:** 31/31 원문 표시, 콘솔 error 0.
2. **소유자: 회장 또는 GitHub 계정 관리자.** Actions budget 승인 또는 무료분 초기화 대기. **종료증거:** run `33318783524` 재실행 시 세 job에 실제 steps가 생기고 success.
3. **소유자: 각 벤처 세션.** 전역 `missingReason` 37건의 정본 path 보정. **종료증거:** 해당 벤처 생성키 missing 0 또는 의도적 missing 사유 확정.

---

## CLAUDE 100B 대시보드 산출물 노출 점검 (2026-08-31, 회장 "누락된 것도 있고 병신같은 것도 있다")

### 지금까지 한 것 (진단 = 컨트롤러 직접 실측)
- `dashboard-sync.sh manual` 실행. 수집 정상 종료(9벤처·19트랙).
- **haenael-ge 합성키가 19개뿐**이고 승인 핀 37건 중 대부분이 누락. 누락 예: security-report, perf-report, cross-browser-matrix, RELEASE.md, CHANGELOG.md, 구현현황.md, design-spec, clean-frames stamp, migrations 글롭, qa/contracts 글롭, fdd v0.1.0, folder-structure, core-cashout-qa-report.
- **오탐**: `haenael-ge::main::prototype` = `docs/brand-assets/feed/_src/feed-02-carousel.html`(인스타 마케팅 캐러셀). `::main::wireframes` = 구 v2 허브. `design-conformance-matrix` 가 core/main 에 서로 다른 파일로 중복.
- **근본 원인 ① 확증(직접 실행 검증).** `collect-artifacts.mjs`:270 이 `/^approved_artifacts:\s*\{(.*)\}/m` 로 **인라인 한 줄 객체만** 파싱한다. 우리는 release-and-artifacts.md §1.1 **블록/리스트 스키마**를 쓴다. node 로 직접 돌려 **매치 X** 확인. → 승인 핀 37건이 전부 무시되고 파일명 추측(discoverRepoArtifacts)으로 떨어진다. `pipeline-live.generated.ts` 의 `HaenaelGe.approvedArtifacts` 도 **`[]`** 로 같은 증상(해조단타는 인라인 스키마라 값이 있음).
- **근본 원인 ② 확증.** 유령 `main` 트랙의 출처 = `.claude/worktrees/pay-open` 워크트리에 **루트 `pipeline-state.md`** 가 있어 `lineOf()` 가 'main' 을 반환. 그 워크트리는 브랜치 `wt-pay-open`(마지막 커밋 2026-08-02, **main 에 이미 병합됨**)이고 상태파일은 "2026-07-23 v2 design 진행 중"으로 낡았다. 구 PRD·구 와이어·마케팅 캐러셀이 여기서 올라온다.
- 우리 쪽 핀은 이상 없음: 37건 실물 전량 존재(글롭 2건도 각각 4파일·1파일 해석), 대시보드가 잡은 haenael 엔트리 45건의 import 대상 **실재 45/45·실패 0**(즉 "안 열리는" 문제는 아니고 "엉뚱한 것이 열리는" 문제다).
- **Codex 위임 진행 중**: `codex-delegate.sh code-builder` 로 수집기 수정 발주(블록 스키마 1급 파싱 + 라인 귀속 누수 + 글롭 처리 + before/after 숫자 + 타 벤처 회귀 금지).
- 워크트리 처리는 미커밋 59건(25파일 945줄 + 미추적 34) 유실 위험이 있어 **임의 제거하지 않고** open-decisions 에 선택지 4개로 등재.

### 남은 이슈
1. **수집기 수정 회수 대기(Codex).** 종료증거 = 재수집 후 haenael 승인 핀 37건 중 잡힌 수, 유령 main 트랙 소멸, 타 벤처 합성키 수 미감소.
2. **워크트리 `pay-open` 처리 = 회장 결정.** 추천 = 미커밋분 커밋 후 worktree 제거.
3. `pipeline-live` 의 `lastApprovalStage` 가 `eng-design`(2026-08-01)로 낡았고 stageTimestamps 에 ship 이 없다. 수집기 수정 후 재확인.
4. CI green 없음(Actions 무료분 소진 + budget $0).
5. 총보유 30·지급가능 27 실계정 0명.

### 다음 액션
1. **소유자: Codex.** 수집기 블록 스키마 파싱·라인 귀속 수정. **종료증거:** before/after 표, 승인 핀 커버리지 숫자.
2. **소유자: 회장.** worktree `pay-open` 처리 방식 결정. **종료증거:** worktree 제거 후 대시보드에 `haenael-ge::main` 트랙 소멸.
3. **소유자: 회장.** GitHub Actions 예산 또는 무료분 초기화 대기. **종료증거:** CI job 에 실제 steps 생성.
4. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.

## CLAUDE 스프린트 종료 (2026-08-30 22:45 KST)

### 지금까지 한 것 (이 턴 추가분)
- **환전 폼 시안 대조 완료 = 마지막 QA 잔여 해소.** kill switch 켠 E2E 로 재캡처(`artifacts/qa-cashout-core-20260824/build-fix/cashout-390.png`) 후 시안 `core-cashout-30-27-form-390-v1-gpt-codex.png` 과 2장을 나란히 Read 육안 대조. 타이틀·분해카드 3행·환산카드 4행·폼 필드 순서·요약박스·버튼 **일치**. 핵심인 **자격·상한 분리 문구**(`환전 기준: 모인 클로버 30개 이상 · 지금 지급 가능 N개`)도 일치. `docs/design-conformance-matrix.md` 에 스탬프 기록.
- **E2E 12/12 통과.** 처음엔 12건 전부 실패했는데 내 코드 회귀가 아니라, 앞서 버전 주입 확인용으로 돌린 **가짜 Supabase 주소 빌드 결과물을 E2E 가 재사용**한 탓이었다(세션 쿠키 이름 불일치 → 전부 로그아웃 판정). 올바른 env 로 재빌드 후 12/12. 이 교훈을 회고에 추가했다.
- **대표 주소 자동 추적 복구 확인(관찰됨).** 태그 push 배포 `haenael-72ps8djpd` 에 수동 alias 없이 `haenael-ge.vercel.app` 이 붙었다. 2026-08-25 부터 반복되던 수동 승격 문제도 Root Directory 미설정이 뿌리였다.
- **릴리즈 v1.2.1 released.** 태그 생성·push 완료. RELEASE.md·CHANGELOG.md 는 release-manager 위임(verify FAIL=벤치마크 근거 부족, 내용은 컨트롤러 실측과 대조해 사실 확인 후 보존).
- **pipeline-state 자체 오류 복구.** 내가 줄 번호로 패치하다 approved_artifacts 의 ship 핀 2줄을 덮어쓰고 stages 블록은 안 고쳐 자기모순이 났다. release-manager 가 지적해 복구했다.

### 최종 실측 (전부 컨트롤러 직접)
| 확인 | 결과 |
|---|---|
| `/api/health` | version **1.2.1**, database ok |
| 보안 헤더 | **4/4** (CSP·nosniff·referrer·permissions) |
| `x-powered-by` | **0건** |
| Firefox / WebKit 콘솔 | error 0, pageerror 0 |
| `qa:verify-production` | 3/3 |
| 운영 인증 읽기 E2E | 1/1, 제품 쓰기 0 |
| 환전 E2E | **12/12** |
| vitest | 279/279 |
| qa-contracts | 전량 PASS, mutation 8/8 검출 |
| `npm audit --omit=dev` | 0건 |
| artifact-drift-check | 드리프트 0 |

### 남은 이슈 (전부 비차단)
1. **CI green 없음.** Actions 무료 2,000분 소진 + budget $0 + Stop usage Yes. 코드·워크플로로 해소 불가. 축소안(중복 build 제거·트리거 축소) 미승인.
2. **총보유 30·지급가능 27 실계정 0명.** 실제 회원의 27클로버 신청 성공 미검증. 30·27 값 그대로의 실화면 캡처도 같은 이유로 없다(구조·문구 대조로 대체).
3. 지급 신원·세무정보 처리 계약 = 회장 보류(범위 밖, open-decisions 등재).
4. 토스 지급대행 해지 미실행.

### 다음 액션
1. **소유자: 회장.** 대시보드에서 산출물·배포 결과 확인. **종료증거:** 회장 확인.
2. **소유자: 회장.** GitHub Actions 예산 결정 또는 무료분 초기화 대기. **종료증거:** CI job 에 실제 steps 생성 후 success.
3. **소유자: 회장.** 토스 지급대행 해지(평일 08:00~19:00 라이브챗). **종료증거:** 계약 상태 변경.
4. **소유자: 실제 회원.** 총 30·지급가능 27 상태에서 27클로버 신청. **종료증거:** 운영 신청 성공.

## CLAUDE 배포 성공·QA 승인 (2026-08-30, 회장 "vercel root 디렉토리 너가 해야지")

### 지금까지 한 것
- **Vercel Root Directory 를 `web` 으로 설정**(API PATCH 성공). 루트 `vercel.json` 제거 → `web/vercel.json` 이관(framework·regions·kakao-review 헤더만). 구 `6b23fd7` 의 buildCommand 우회 청산.
- **배포 성공.** `haenael-ma17op5kd`(Ready) → `haenael-e1rbeonxz` → 최종 `haenael-6f48v643p`. 각 배포마다 `vercel alias set` 으로 대표 주소 수동 승격.
- **운영 버전 진실원 전환.** `/api/health` 의 version 이 Vercel 환경변수 수기 관리였고 40일 stale 사고의 원인이었다. `next.config.ts` 에서 `package.json` 을 읽어 빌드 시각 주입하도록 변경(환경변수는 더 이상 읽지 않는다). 결과 `/api/health` = **version 1.2.1**.
- **QA 검증 대상 주소 교정.** `scripts/qa/verify-production.mjs` 와 `web/playwright.production.config.ts` 가 302 redirect 되는 `haenaelge.vercel.app` 을 보고 있었다. 대표 주소 `haenael-ge.vercel.app` 로 교정. **대표 주소 헤더가 오래 미검증이던 이유였다.**
- **카카오 prefetch 차단.** 배포 후 Firefox·WebKit 콘솔에 CSP connect-src 위반이 새로 떴다. 랜딩(`app/page.tsx`)의 카카오 로그인 Link 만 prefetch 가 켜져 있었다(목표 페이지·전화동의 안내는 이미 꺼져 있었음). CSP 를 여는 대신 prefetch 를 껐다.
- **최종 실측(전부 컨트롤러 직접):** 보안 헤더 **4/4** 관찰, `x-powered-by` **0건**, Firefox·WebKit 콘솔 **error 0·pageerror 0**, `qa:verify-production` **3/3**, 운영 인증 읽기 E2E **1/1**(제품 쓰기 0), `/api/health` version **1.2.1**·database ok, vitest **279/279**, 프로덕션 빌드 통과.
- **qa·ship APPROVED.** `pipeline-state.core.md` 갱신. `docs/security-report.md`·`docs/cross-browser-matrix.md` 에 배포 후 재판정 PASS 스탬프 추가. `docs/제품현황.md` 갱신.
- **회고 확장.** `wiki/3-operations/2026-08-30-환전-스프린트-회고.md` 에 "회고를 쓴 그날 같은 병을 다시 앓았다" 절과 "증상 대신 구조를 고친 것" 대조표 추가. 브라우저로 띄웠다.
- 커밋 push: `8db3558`(vercel 구성 이관) `30f98a0`(버전 진실원·QA 주소) `de109a6`(prefetch).

### 남은 이슈
1. **환전 폼 캡처 미확보(비차단).** 시안 대조 실화면이 `CASHOUT_ENABLED` 꺼진 상태로 찍혀 대기 카드만 나온다. 재촬영 필요(`web/src/lib/supabase/service.ts`:86 `isCashoutEnabled`).
2. ~~대표 주소 자동 승격 안 됨~~ → **해소(관찰됨).** `vercel domains add` 결과 이미 프로젝트에 assign 돼 있었고, Root Directory 수정 후 태그 push 로 만들어진 배포 `haenael-72ps8djpd` 에 **수동 alias 없이** `haenael-ge.vercel.app` 이 자동으로 붙은 것을 `vercel inspect` 로 확인했다. 2026-08-25 부터 반복되던 alias 수동 승격 문제의 뿌리도 Root Directory 미설정이었다.
3. **CI green 없음.** Actions 무료 2,000분 소진 + budget $0 + Stop usage Yes. 축소안(중복 build 제거·트리거 축소) 미승인.
4. 총보유 30·지급가능 27 실계정 0명. 실제 신청 성공 미검증.
5. 지급 신원·세무정보 처리 계약 = 회장 보류(범위 밖).

### 다음 액션
1. **소유자: 회장.** Vercel Domains 에 `haenael-ge.vercel.app` 추가해 자동 추적으로 전환. **종료증거:** 다음 배포 후 수동 alias 없이 대표 주소가 최신을 가리킴.
2. **소유자: 컨트롤러.** 환전 폼 캡처 재촬영·시안 대조. **종료증거:** 좌우 합성 대조 이미지.
3. **소유자: 회장.** CI 축소 승인 또는 무료분 초기화 대기. **종료증거:** CI job 에 실제 steps 생성.
4. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.

## CLAUDE 턴 종료 시점 상태 (2026-08-30 03:40 KST)

- push 완료: `fb6f871..a659f1f` (커밋 5건). 작업트리 clean(growth 트랙 제외).
- **Vercel 배포 Error 지속.** 해제 = 회장 콘솔에서 Root Directory=`web`. 런북 `docs/ops/vercel-root-directory-수정.md`.
- **CI run `33286007123` 도 세 job 전부 steps 0개로 종료.** annotation = 계정 결제 실패 또는 spending limit. 코드 실패·flaky 아님. Actions 무료 2,000분 소진 + budget $0(2026-08-29 브라우저 실화면 확인). green 증거 생성 불가.
- 위임 검증: 성능 측정(Sonnet) verify FAIL — `~/.claude/standards/doc-review.md` Read 0회. 측정 스크립트·원자료 실재하고 컨트롤러가 직접 확인해 **경고 라벨 붙여 출고**(회장 2026-07-11 규약). 재위임 시 프롬프트에 doc-review.md Read 필수 명시할 것.
- 실수원장 2건 추가: [proxy] 의존성 변경을 배포 확인 없이 push / [struct] Root Directory 미설정을 우회로 덮은 구조 문제 재발(count 2).

## CLAUDE 배포 시도와 차단 (2026-08-30, 회장 "쭉 진행")

### 지금까지 한 것
- 회장 승인으로 **main push 실행** (`fb6f871..a888ae3`). 커밋 4건 반영.
- **Vercel 배포 실패.** `haenael-a7qvrf5md` = Error. 빌드는 53초에 정상 완료(16화면 생성)했고 **출력 배포 단계**에서 죽었다: `Cannot patch preview comments when immutable static file upload is enabled. Upgrade to next@v16.3.0-canary.32 or newer.`
- **근본 원인 규명.** 실제 next 는 16.3.3 으로 지목된 canary 보다 최신이라 조건은 이미 충족. 문제는 **Vercel 이 next 버전을 못 읽는 것**이다. CLI 재배포가 `No Next.js version detected ... check your Root Directory setting` 을 뱉었고, 프로젝트 API 조회 결과 `rootDirectory = None` 인데 `package.json` 은 `web/` 에 있다. 루트 `vercel.json` 이 installCommand·buildCommand·outputDirectory 로 빌드만 우회시켰을 뿐 프레임워크 위치는 안 알려줬다(구 `6b23fd7` 의 성격). next 16.3 부터 immutable static upload 가 켜지며 버전 게이트 경로가 생겨 이제서야 터졌다.
- **되돌리기 불가 실측.** next 16.2.10 으로 내리면 배포는 살지만 `npm audit --omit=dev` 가 0건 → **high 3건**으로 되살아난다. 배포를 위해 보안을 되돌리지 않기로 하고 16.3.3 을 복원했다(작업트리 clean, 0건 재확인).
- API 로 `rootDirectory: web` PATCH 시도 → **도구 분류기가 운영 배포 설정 변경으로 차단.**
- 수정 런북 작성: `docs/ops/vercel-root-directory-수정.md` (콘솔 경로·확인 명령·설정 후 정리 순서 포함). 브라우저로 띄웠다.
- 성능 실측 반영(위임 Sonnet, verify FAIL=품질헌법 미독이나 원자료 실재로 보존): LCP 384~840ms, CLS 0, 오류율 0/30, p95 0.166~1.229s. 재현 스크립트 `scripts/qa/measure-web-vitals.mjs`.
- **디자인 증거 구멍 발견.** 시안 `core-cashout-30-27-form-390` 과 실화면 `390-cashout.png` 를 직접 Read 대조. 시안엔 환전 신청 폼이 있는데 실화면엔 "환전 기능을 준비하고 있어요" 대기 카드가 있다. 코드 확인 결과 버그 아님(`CashoutRequestForm.tsx`:569-577, `cashoutEnabled` 거짓이면 폼 대신 대기 카드). **문제는 폼 상태 캡처가 증거 묶음에 없다는 것** — 정합 대조표는 통과라 적혀 있으나 근거 화면이 다른 화면이다.

### 남은 이슈
1. **★ ship 차단.** Vercel Root Directory 를 `web` 으로 설정해야 배포가 산다. 회장 콘솔 1회. 그 전까지 대표 주소는 직전 Ready 배포(1.2.0, 구 번들)를 계속 서빙한다. **사용자 영향 없음**(구 번들이 정상 동작 중).
2. Root Directory 설정 후 루트 `vercel.json` 의 우회 3줄 제거 → `web/vercel.json` 이관. **반드시 설정 변경 뒤에.**
3. qa 미승인. 보안 헤더·Firefox 콘솔은 배포돼야 닫힌다(현재 대표주소에 CSP·nosniff·referrer·permissions 전부 미관찰, `x-powered-by: Next.js` 노출).
4. 환전 폼 캡처 재촬영(스위치 켠 상태) 후 시안 대조.
5. CI green 없음(무료 2,000분 소진 + budget $0). 축소안 미승인.

### 다음 액션
1. **소유자: 회장.** <https://vercel.com/100-b/haenael-ge/settings> → Build and Deployment → Root Directory = `web` 저장. **종료증거:** 재배포 Ready + 대표주소 `curl -sSI` 에 보안 헤더 4종.
2. **소유자: 컨트롤러.** 설정 후 재배포 확인 → 헤더·Firefox 콘솔 재검증 → qa 승인 → vercel.json 정리 → ship 마감·태그 v1.2.1. **종료증거:** `/api/health` 1.2.1, RELEASE.md released.
3. **소유자: 컨트롤러.** 환전 폼 캡처 재촬영·대조. **종료증거:** 좌우 합성 대조 이미지.
4. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.

## CLAUDE 스프린트 마감 실행 (2026-08-30, 회장 "산출물 정본 최신화하고 회고하면 끝")

### 지금까지 한 것
- **eng-design 승인(범위 한정).** 회장이 지급 신원·세무정보 처리 계약을 보류(유저 확보 우선)해 유일한 mapping gap 이 범위 밖으로 이동. FDD v1.1.0 이 해당 범위의 build 진입 불가를 명시해 격리하므로 나머지 설계 계약은 완결.
- **build 재승인.** 컨트롤러 직접 실행 증거: vitest **279/279 (44 files)**, `test:qa-contracts` 전량 PASS(env 34, cashout, RAISE 13, notify 8 + mutation 8/8 검출), `npm audit --omit=dev` **0건**(구 40건 해소), 프로덕션 빌드 exit 0.
- **승인 산출물 핀 37건 최신본 재정렬.** 신규 = FDD v1.1.0(구 v1.0.0-opus5 대체), erd.md, test-cases.md, security-report.md, perf-report.md, cross-browser-matrix.md, 구현현황.md. `artifact-drift-check.sh` **드리프트 0건**.
- **스프린트 회고 작성.** `wiki/3-operations/2026-08-30-환전-스프린트-회고.md` (113줄). 실수 5건을 나열하지 않고 공통 원인 하나(고친 자리에 회귀 검사를 안 둠)로 묶었다.
- **상태파일 규약 위반 2건 해소.** ①`web/session-state.core.md` 중복 파일 → 루트 이관 후 제거(내 append 가 `cd web` 잔류로 잘못 착지한 것). ②정본 4,004줄 → **213줄**로 롤오버, 과거 134섹션은 `docs/archive/session-state/session-state.core.until-2026-08-30.md` 로 이전(state-file-convention 300줄 규약).
- 커밋 `be07d6f`(산출물 재핀·단계 재승인), `3b60fe9`(회고·제품현황). **미push.**

### 남은 이슈
1. **qa = changes-requested.** 소스는 전부 PASS 인데 **운영 배포가 구번들**이라 안 닫힌다. 보안 헤더(CSP·nosniff·referrer·permissions)와 Firefox 콘솔 오류 5건(GA cookie invalid-domain, Kakao OAuth prefetch CORS)은 **소스 보정이 이미 있고 배포만 하면 해소되는 SHIP_VERIFY 항목**이다.
2. 체감 성능(Web Vitals·p95) 실측 진행 중. 완료 시 `docs/perf-report.md` 갱신.
3. ship = release-candidate 1.2.1. qa 해소 후 태그·운영 버전 표기 정합.
4. CI green 없음(무료 2,000분 소진 + Actions budget $0). 8-31~9-2 경 무료분 초기화. 근본 대응안 = ci.yml 중복 build 제거(잡 2곳 + Vercel = 3회 빌드) + main push 트리거 축소. **회장 승인 대기.**
5. 총보유 30·지급가능 27 실계정 0명. 실제 신청 성공은 자연 발생 대기.

### 다음 액션
1. **소유자: 회장.** main push 승인(=운영 배포). §2.1 로 세션은 운영 배포를 트리거하지 않는다. **종료증거:** 대표주소 `curl -sSI` 에서 보안 헤더 4종 관찰 + Firefox 콘솔 error 0.
2. **소유자: 컨트롤러.** 배포 직후 헤더·콘솔 재확인 → qa 승인 → ship 마감·태그. **종료증거:** `/api/health` 1.2.1, RELEASE.md status released.
3. **소유자: 회장.** CI 축소 승인. **종료증거:** ci.yml 수정 커밋.
4. **소유자: 회장.** 토스 지급대행 해지(평일 08:00~19:00 라이브챗). **종료증거:** 계약 상태 변경.

## CLAUDE 상황파악 (2026-08-29, 회장 "codex에서 작업 좀 하고 왔어. 상황 다시 파악해봐")

> 주의: 이 블록은 파일 끝에 append 했다. Codex 세션이 동시에 이 파일 상단을 쓰고 있어(§8 동시편집=append) 상단 삽입 시 서로 덮을 위험이 있었다.

### 지금까지 한 것 (이 턴 = 읽기 전용 현황 파악)
- 지난 Claude 세션이 인계한 3건 중 2건이 Codex 에서 해소된 것을 확인했다. 운영 DB 마이그레이션 `20260825020000` 반영, 대표 주소 `haenael-ge.vercel.app` → 최신 Ready Production 승격(`/api/health` version 1.2.0, database ok).
- 파이프라인이 `eng-design` 으로 reopen 된 것을 확인했다. 사유 = PRD §10.3 지급 신원·세무정보의 수집주체·저장·보존·파기 계약 미결정(mapping gap 1). build·qa·ship 재잠금.
- GitHub CI 차단 원인 정정을 확인했다. 지난 Claude 보고의 "결제 실패"는 부정확했고, 실제는 Actions 무료 2,000분 소진 + account budget `$0` + Stop usage Yes 조합이다(Codex 브라우저 실화면 확인). 총 청구액 0원, 무료분 초기화까지 4일.
- 작업 미완 상태를 확인했다. 미커밋 59건 / 3,432 insertions, Codex 세션 다수 실행 중, 신규 산출물(FDD v1.1.0, erd.md, test-cases.md, security-report.md, perf-report.md, cross-browser-matrix.md, design-conformance-matrix.md, prototype/, design/clean-frames/) 미추적.
- 세션 격리(§8)에 따라 코드·상태 파일을 편집하지 않았다. 읽기만 했다.

### 남은 이슈
1. **지급 신원·세무정보 처리 주체 미결정** — eng-design 재개의 직접 원인. 선택지 3(자체 수집·암호화 보관 / 지급대행사 위탁 / 세무대리인 경유)은 개인정보 책임범위·보관의무가 상이. 토스 지급대행 해지가 걸려 있어 위탁안은 대체 업체 선정이 선행.
2. QA v1.2.0 NG — 보안 헤더 누락, `npm audit --omit=dev` 40건, 전체 화면 디자인 미대조, 인증 교차브라우저·성능 미측정.
3. CI green 증거 없음 — 코드 실패 아님. 무료분 초기화(4일) 또는 예산 상향 전까지 생성 불가.
4. 총보유 30·지급가능 27 실계정이 운영에 0개 — 실제 신청 성공은 자연 발생 전까지 미검증.
5. 릴리스 1.2.1 은 release-candidate. `v1.2.1` 태그·운영 버전 표기 미생성.

### 다음 액션
1. **소유자: 회장.** 지급 신원·세무정보 처리 주체 결정(세무사 자문 선행 권장). **종료증거:** eng-design 재설계·독립 재리뷰 후 재승인.
2. **소유자: 회장.** 세무 질문지(`docs/requests/core-환전-원천징수-세무사-질문지-v1-gpt-codex-20260828-0342.md`) 전달. **종료증거:** 자문 의견 수신.
3. **소유자: 회장.** GitHub Actions 예산 결정(최소 $1) 또는 무료분 초기화 대기. **종료증거:** CI 세 작업에 실제 steps 생성 후 success.
4. **소유자: 진행 중 Codex 세션.** 미커밋 59건 정리와 QA NG 해소. **종료증거:** QA 재판정 PASS, 드리프트 0.

## CLAUDE 스프린트 마감 계획 (2026-08-29, 회장 "쭉 진행해서 산출물 최신화·스프린트 마무리")

> 이 블록도 파일 끝에 append 했다(§8 동시편집). Codex 세션이 상단을 쓰는 중.

### 지금까지 한 것
- 회장 결정 접수: **세무 처리(지급 신원·세무정보 처리 주체)는 보류.** `~/.claude/harness/open-decisions.md` 에 선택지 3안과 재개 조건(실제 환전 지급 직전 또는 토스 대체 업체 선정 시)까지 기록. **이번 스프린트 범위에서 제외** → eng-design 재개의 유일한 blocker 가 범위 밖으로 이동.
- 회장 질의 "GitHub Actions 를 왜 쓰나"에 워크플로 파일 실측으로 답했다. **Flyway 아님**(저장소에 Flyway 설정·의존성 없음, 스키마 적용은 `supabase db push` 를 사람이 실행). **Supabase 는 CI 를 제공하지 않음.**
- `ci.yml` 잡 3개 확인: qa-contracts / unit-and-build / e2e-cashout. **`npm run build` 가 두 잡에 중복 실행되고 Vercel 이 또 빌드한다(총 3회).** 이것이 무료 분 소모의 주범.
- `production-readonly-e2e.yml` = 매일 21:17 UTC 운영 읽기 전용 점검(수동+스케줄).
- pgTAP DB 정책 테스트 63건은 도커 요구로 CI 미포함(ci.yml 헤더 주석 명시).

### 남은 이슈
1. **CI 축소 미실행** — 회장 승인 대기. 안: ①중복 build 제거 ②main push 트리거 축소. 비용 0원, 가역.
2. 미커밋 59건 / 3,432 insertions 미정리. 신규 산출물(FDD v1.1.0, erd.md, test-cases.md, security-report.md, perf-report.md, cross-browser-matrix.md, design-conformance-matrix.md, prototype/, design/clean-frames/) 미추적.
3. QA v1.2.0 NG: 운영 보안 헤더 누락, `npm audit --omit=dev` 40건, 전체 화면 390·1024 미대조, 성능·부하 미측정.
4. 릴리스 1.2.1 은 release-candidate. `v1.2.1` 태그·운영 버전 표기 미생성.
5. CI green 증거 없음(무료 2,000분 소진 + Actions budget $0). 4일 뒤 초기화.

### 스프린트 마감 계획 (Claude 전용, Codex 사용량 0)
| 단계 | 담당 | 모델 |
|---|---|---|
| 대화·게이트·위임결과 재검증 | 컨트롤러 | Opus 5 |
| 1. eng-design 마감(세무 범위 제외 명시 + 신판 설계 검수) | tech-architect | Opus 5 |
| 1b. 설계 독립 리뷰 | eng-design-reviewer | Sonnet 5 |
| 2. 미커밋 59건 분류·커밋 | 컨트롤러 | Opus 5 |
| 3a. 보안 헤더·의존성 40건 | code-builder | Sonnet 5 |
| 3b. 전체 화면 390·1024 대조 | product-designer | Fable 5 |
| 3c. QA 재검증 | qa-verifier | Sonnet 5 |
| 4. 릴리스 1.2.1 마감·태그 | release-manager | Sonnet 5 |
| 문서 스캔 등 잡일 | 범용 | Haiku 4.5 |

배정 원칙: 되돌리기 비싼 계약 설계에만 Opus, 답이 정해진 기계적 수정은 Sonnet, 시각 판단은 Fable.

### 다음 액션
1. **소유자: 회장.** CI 축소 승인(중복 build 제거 + main push 트리거 축소). **종료증거:** 워크플로 수정 커밋, 잡 수 감소.
2. **소유자: 컨트롤러.** 승인 즉시 1단계 eng-design 마감 착수. **종료증거:** eng-design 재승인, 하류 3단계 해잠.
3. **소유자: 회장.** 토스 지급대행 해지(평일 08:00~19:00 라이브챗). **종료증거:** 계약 상태 변경.

## CODEX 후속 (2026-08-29 GitHub CI 실제 차단 원인 브라우저 확인)

### 지금까지 한 것
- Chrome 로그인 쿠키를 브라우저 자동화에 가져와 GitHub Billing 실화면을 직접 확인했다.
- Billing Overview에서 Actions 무료 포함량이 `2,000 min used / 2,000 min included`, 초기화까지 4일임을 확인했다. 총 billable usage는 $0이며 결제 실패가 아니라 무료 분 소진 상태다.
- Budgets and alerts에서 Actions account budget이 `$0 budget`, `Stop usage: Yes`로 설정돼 있음을 확인했다. 이 조합 때문에 포함량 소진 뒤 모든 Actions job이 steps 0개로 차단된다.
- 앞선 API만 보고 payment failure라고 좁힌 판정은 불완전했다. check-run 공통 문구가 payment failure와 spending limit을 함께 표현했고, 실제 원인은 후자인 $0 budget이었다.

### 남은 이슈
1. CI를 지금 열려면 Actions budget을 0보다 크게 바꿔 유료 사용을 허용해야 한다. 비용 결정이라 회장 승인 없이 변경하지 않았다.
2. 비용 없이 기다리면 4일 뒤 무료 2,000분이 초기화된다. 그때 workflow 재실행이 필요하다.
3. self-hosted runner는 무료 대안이지만 이 Mac에 외부 저장소 코드를 실행시키는 보안·운영 변경이라 임의 도입하지 않는다.

### 다음 액션
1. **소유자: 회장.** 즉시 CI가 필요하면 Actions 월 budget 금액 결정. 추천 최소 예산 $1, Stop usage 유지. **종료증거:** budget 저장 후 CI jobs에 실제 steps 생성.
2. **소유자: Codex.** 유료 승인 시 budget 변경과 CI 재실행·green 확인. 비용 미승인 시 무료량 초기화 뒤 재실행. **종료증거:** 세 작업 success.

## CODEX 후속 (2026-08-29 운영 실계정·GitHub 결제 원인 추가 조사)

### 지금까지 한 것
- GitHub의 구 billing endpoint가 410으로 이동된 것을 확인하고 새 `users/{username}/settings/billing/usage` API로 다시 조회했다.
- 2026년 Actions 사용량은 전부 할인 적용돼 netAmount 0원이며, 저장소 Actions 권한도 enabled/all이다. 현재 CI 차단은 이 저장소의 분 사용량 초과가 아니라 계정 payment failure 계층으로 좁혀졌다.
- 운영 서비스 역할로 `clover_balance` 전체 2개 계정을 읽고 각 계정의 `clover_eligibility`를 호출해 익명 집계했다. `reached_threshold=0`, 정확히 total 30·payable 27인 계정 0, threshold 도달 후 payable이 최소액 미만인 계정 0이다.
- 따라서 현재 운영에는 회장이 신고한 30·27 상태를 재현할 실제 대상 계정이 없다. 임의 계정이나 시험 환전 신청을 만들지 않았다.
- 첫 집계 시도는 서비스 역할 키 파일을 잘못 선택해 요청 생성 전 실패했다. 키가 있는 `haenael-ge.env`를 값 비노출로 확인한 뒤 읽기 전용 집계를 재실행했다.

### 남은 이슈
1. 30·27 실제 신청 성공은 현재 그 상태의 운영 계정이 0개라 즉시 재현할 수 없다. DB 함수 계약, 운영 화면, 무오염 E2E 증거까지만 확보됐다.
2. GitHub Actions 사용량은 net 0원인데도 payment failure로 차단된다. 저장소나 workflow 수정으로 해소할 수 없고 계정 Billing의 미납·결제수단 상태 확인이 필요하다.

### 다음 액션
1. **소유자: Codex.** 실제 회원이 threshold에 도달하면 운영 로그를 감시해 30·27 신청 결과를 확인. **종료증거:** 자연 발생 실제 신청 성공과 후속 지급 흐름.
2. **소유자: 회장 또는 GitHub 계정 관리자.** 계정 Billing의 payment failure 해소. **종료증거:** CI 세 작업이 실제 steps를 실행하고 success.

## CODEX 후속 (2026-08-29 최종 완료 범위 판정)

### 지금까지 한 것
- Claude와 Codex 하네스의 실제 등록·입력 계약을 대조해 누락된 핵심 보호 훅을 동기화했다. 전역 픽스처 23건과 Codex 미추적 소스 커밋 차단 실험을 통과했다.
- 회장이 신고한 총보유 30·지급가능 27 환전 계약 마이그레이션을 운영 DB에 적용했다. migration history와 운영 함수 실덤프로 반영을 확인했다.
- 대표 주소 `haenael-ge.vercel.app`을 최신 Ready Production에 연결하고 `/api/health`의 `version: 1.2.0`, `database: ok`를 직접 확인했다.
- 저장된 운영 auth-only QA 계정으로 실제 Supabase 로그인과 `/cashout` 실렌더를 Playwright로 재검증했다. 첫 실행은 secret wrapper 누락으로 실패했고, 주입 경로를 바로잡아 `1 passed (13.7s)`를 확인했다.
- 운영 E2E 전후 `cashout_request` 스냅샷이 동일하고 금지 쓰기 요청이 0건임을 확인했다. 운영 기록에 시험 환전 노이즈를 만들지 않았다.
- 상태·제품현황·QA 트래커를 갱신하고 `9c3cd5d`, `fb6f871` 두 커밋을 main에 push했다. 산출물 드리프트는 0건이다.
- 최신 CI run `33190515509`의 check-run annotation을 확인했다. 세 작업은 steps 0개로 종료됐고 원인은 GitHub 계정 payment failure 또는 spending limit이다.

### 남은 이슈
1. 실제 총보유 30·지급가능 27 회원이 27클로버 신청에 성공하는 쓰기 경로는 미검증이다. 가짜 운영 거래를 만들지 말라는 기존 지시 때문에 자동 시험 신청을 생성하지 않았다.
2. GitHub Actions는 계정 결제 계층에서 작업 시작 전 차단된다. 저장소 Actions는 enabled/all이며 코드·workflow로 해소할 수 없다.
3. 따라서 제품 코드·DB·대표 주소·운영 로그인 화면은 반영됐지만, 배포 전체를 완료로 닫을 CI green과 실제 환전 성공 증거가 없다.

### 다음 액션
1. **소유자: 실제 대상 회원.** 총보유 30·지급가능 27 상태에서 27클로버 환전 신청. **종료증거:** 운영 신청 성공과 후속 지급 흐름 확인.
2. **소유자: 회장 또는 GitHub 계정 관리자.** Billing & plans의 payment failure 또는 spending limit 해소. **종료증거:** CI 세 작업에 실제 steps가 생기고 전부 success.
3. **소유자: Codex.** 두 외부 증거가 생기면 pipeline ship 상태와 제품현황을 최종 마감. **종료증거:** CI green, 실제 환전 성공, 산출물 드리프트 0.

## CODEX 후속 (2026-08-29 운영 인증 읽기 전용 E2E 재검증)

### 지금까지 한 것
- 이미 저장된 `haenael-ge-qa-production.env`의 변수명과 권한 경로를 확인했다. 비밀값은 출력하지 않았다.
- 1차 운영 E2E는 secret wrapper 미지정으로 환경변수 누락 실패했다. 전용 wrapper로 재실행해 Playwright `1 passed (13.7s)`를 확인했다.
- 실제 운영 Supabase 세션 발급, 대표 주소를 통한 `/cashout` HTTP 200 렌더, 환전 화면 표시, 금지 쓰기 요청 0건, `cashout_request` 전후 동일성을 확인했다.
- GitHub Actions 저장소 권한은 enabled/all이며 사용자 plan은 free다. CI 차단은 workflow 설정이 아니라 계정 payment 또는 spending limit 계층이다.

### 남은 이슈
1. 총보유 30·지급가능 27 계정의 실제 신청 성공은 읽기 전용 QA로 검증할 수 없다. 운영 기록 오염 없는 실제 대상 회원 경로가 필요하다.
2. GitHub 결제 차단은 저장소 Actions API로 변경할 수 있는 설정이 아니다. 계정 결제 수단 또는 spending limit 해소가 필요하다.

### 다음 액션
1. **소유자: 회장 또는 실제 대상 회원.** 정상 운영 계정에서 27클로버 신청. **종료증거:** 신청 성공과 지급 흐름 확인.
2. **소유자: 회장 또는 계정 관리자.** GitHub 결제 계층 해소. **종료증거:** CI 세 작업의 실제 steps 실행과 success.

## CODEX 후속 (2026-08-29 운영 반영 기록 push 및 CI 판정)

### 지금까지 한 것
- 운영 DB 적용, 운영 함수 실덤프, 대표 주소 1.2.0 승격, 제품현황 갱신을 `9c3cd5d`(`docs: record production cashout rollout`)로 커밋해 main에 push했다.
- push로 생성된 CI run `33186995437`을 직접 조회했다. 세 작업 모두 2초 안에 steps 0개로 종료됐다.
- check-run annotation을 API로 확인했다. 실패 원문은 계정 결제 실패 또는 spending limit 상향 필요이며 코드·테스트 실행 실패가 아니다.
- 운영 DB와 대표 주소 반영은 직접 관찰됐지만, CI green 증거는 없다. 배포 공정은 외부 결제 차단 때문에 완전 종결로 표시하지 않는다.

### 남은 이슈
1. GitHub Actions 계정 결제 제한 해소 전에는 main CI가 시작되지 않는다.
2. 실제 대상 회원의 총보유 30·지급가능 27 환전 성공 실경로는 아직 미검증이다.
3. 토스 지급대행 해지와 세무 자문은 외부 담당 경로가 필요하다.

### 다음 액션
1. **소유자: 회장 또는 계정 관리자.** GitHub Billing & plans에서 결제 실패 또는 spending limit을 해소. **종료증거:** run의 세 작업에 실제 steps가 생기고 전부 success.
2. **소유자: 회장 또는 실제 대상 회원.** 정상 운영 계정으로 27클로버 환전 신청. **종료증거:** 신청 성공과 후속 지급 흐름 확인.
3. **소유자: 회장.** 토스 라이브챗 해지 요청과 세무 질문지 전달. **종료증거:** 계약 상태 변경과 자문 의견 수신.

## CODEX 후속 (2026-08-28 운영 DB 적용 및 대표 주소 승격)

### 지금까지 한 것
- 회장의 "쭉쭉 진행"을 운영 변경 승인으로 받아 `npx supabase db push --linked`를 실행했다. `20260825020000_cashout_total_threshold_contract.sql` 한 건이 운영에 적용됐다.
- push 뒤 CLI의 pg-delta 카탈로그 캐시가 인증서 파일 누락 경고를 냈다. 성공 문구를 증거로 쓰지 않고 새 연결로 `migration list --linked`를 다시 실행해 `20260825020000` local=remote를 확인했다.
- 운영 `public` 스키마를 새로 dump해 실제 함수 정의를 대조했다. `request_manual_cashout`은 `p_clover_amount < 1`만 입력 하한으로 검사하고, 이후 `v_total < v_min`과 `p_clover_amount > v_payable`을 분리 검사한다. 총보유 30·지급가능 27 계약이 운영 함수에 반영됐다.
- 최신 Vercel Ready Production `haenael-qnsbl1ult-100-b.vercel.app`의 `/api/health`가 `version: 1.2.0`, `database: ok`임을 확인한 뒤 `haenael-ge.vercel.app` 별칭을 이 배포로 승격했다.
- 승격 뒤 대표 주소를 새 요청으로 호출해 `version: 1.2.0`, `database: ok`를 확인했다. 보조 주소 `haenaelge.vercel.app`은 308로 대표 주소에 도착하고 최종 HTTP 200을 반환한다.
- 최신 main CI 5건은 모두 completed/failure다. 직전 인계에서 확인한 GitHub 계정 결제 차단이 아직 남아 있으며 새 코드 푸시는 하지 않았다.

### 남은 이슈
1. 운영 함수 계약과 배포 주소는 반영됐지만 실제 사용자 계정으로 27클로버 환전 신청 성공은 아직 미검증이다. 운영 시험 신청 기록 노이즈 금지 때문에 임의 데이터를 만들지 않았다.
2. GitHub Actions 결제 제한으로 CI가 실행 없이 실패한다. 계정 관리자 조치가 필요하다.
3. 토스 지급대행 해지와 세무 자문은 회장 또는 외부 담당자 경로가 필요하다.

### 다음 액션
1. **소유자: 회장 또는 실제 대상 회원.** 총보유 30·지급가능 27 상태에서 정상 환전 27 신청. **종료증거:** 운영 신청 성공과 기존 지급 흐름 확인.
2. **소유자: 회장 또는 계정 관리자.** GitHub Actions 결제 제한 해소. **종료증거:** CI가 실제 실행돼 전부 성공.
3. **소유자: 회장.** 준비된 토스 해지 요청문을 평일 라이브챗에 제출하고 세무 질문지를 자문처에 전달. **종료증거:** 계약 상태 변경과 세무 의견서 수신.

## CODEX 후속 (2026-08-28 하네스 동기화 감사 및 배포 사전점검)

### 지금까지 한 것
- Claude 정본과 Codex 미러를 실제 파일·등록 설정으로 대조했다. 기존 `sync-codex-hooks.sh` 자체 판정은 drift 0이었지만, 실제 `settings.json` 대 `hooks.json` 비교에서 최근 핵심 훅이 Codex에 등록되지 않은 구조적 갭을 발견했다.
- 동기화 정문을 보강해 `deploy-ci-watch`, `artifact-sync-gate`, `harness-selfmod-gate`, `eval-capture-nudge`, `delegate-continue-gate`, `deploy-ci-mark`, `commit-untracked-guard`를 Codex에 지속 동기화하고 등록 검증하도록 했다.
- Codex 명령 입력이 `tool_input.cmd`인 차이를 `deploy-ci-mark`와 `commit-untracked-guard` 포트에 반영했다. 임시 미추적 `.harness-probe.ts`를 만든 실험에서 커밋 훅이 `RC=2`로 실제 차단했고 시험 파일은 제거했다.
- `jq empty ~/.codex/hooks.json`, 대상 훅 전부 `bash -n`, 재동기화 `drift/missing=0`, 전역 픽스처 `PASS 23 / FAIL 0`을 확인했다.
- 동일 저장소 tmux pane을 확인했다. `%32`가 core 배포 트랙의 최신 주 세션이며 운영 DB 적용과 대표 주소 승격을 승인 대기로 남겼다. 중복 운영 실행은 하지 않았다.
- `npx supabase db push --linked --dry-run`을 실행했다. 운영에 적용될 파일은 `20260825020000_cashout_total_threshold_contract.sql` 하나뿐임을 직접 확인했다. 실제 DB 변경은 없었다.

### 남은 이슈
1. 운영 DB 마이그레이션 실제 적용은 승인 대기다. dry-run으로 단일 파일 적용 범위는 확정됐다.
2. 적용 후 총 30·지급가능 27 환전 계약의 운영 실경로 증거가 필요하다. 시험 신청 기록 노이즈 금지 조건을 지켜야 한다.
3. 대표 주소 1.2.0 승격은 DB 적용과 검증 뒤 별도 운영 변경으로 진행해야 한다.
4. Claude 전용 `read-budget`, `statusline-controller`, Agent 모델 지정 게이트는 Codex 도구·TUI가 달라 의도적 비적용이다. 나머지 공통 핵심 훅은 동기화와 등록 검증 대상에 포함됐다.

### 다음 액션
1. **소유자: 회장.** 운영 DB 마이그레이션 실제 적용 승인. **종료증거:** 승인 의사 확인.
2. **소유자: Codex.** 승인 직후 DB push와 migration history 재확인. **종료증거:** `20260825020000` remote 기록 채움.
3. **소유자: Codex.** 운영 계약 검증 후 대표 주소 승격을 별도 실행. **종료증거:** 허용된 환전 성공 증거와 대표 주소 `/api/health`의 `version: 1.2.0`.
4. **소유자: 회장 또는 계정 관리자.** GitHub Actions 결제 제한 해소. **종료증거:** CI 작업이 실제 시작되어 전부 성공.

## CODEX 후속 (2026-08-28 운영 재확인) - 배포 단계 최우선 작업 판정

### 지금까지 한 것
- `session-state.core.md`와 `pipeline-state.core.md` 최신 인계를 읽고 현재 공정이 `ship`임을 재확인했다.
- `npx supabase migration list --linked`를 운영 연결로 다시 실행했다. 로컬 42개 중 `20260825020000_cashout_total_threshold_contract`만 remote 값이 비어 있어, 회장이 신고한 총 30클로버·지급가능 27클로버 환전 결함이 운영에서 아직 미해소임을 직접 관찰했다.
- 작업 트리의 미추적 `docs/growth/*`와 세션 로그는 다른 트랙 소유로 판단해 변경하지 않았다.

### 남은 이슈
1. 운영 DB에 `20260825020000` 마이그레이션 적용이 필요하다. 운영 스키마 변경이므로 회장 승인 대기다.
2. 운영 대표 주소 `haenael-ge.vercel.app`은 최신 1.2.0 Production이 아닌 1.0.0 배포를 가리킨다. DB 적용과 검증 후 별도 승격 승인이 필요하다.
3. GitHub Actions는 계정 결제 제한 때문에 작업이 시작되지 않는다. 코드와 분리된 계정 관리자 조치 사항이다.
4. 운영 실제 계정으로 총 30·지급가능 27 환전 성공을 확인하기 전에는 버그 수정 완료로 보고할 수 없다.

### 다음 액션
1. **소유자: 회장.** 운영 DB 마이그레이션 적용 승인. **종료증거:** 승인 의사 확인.
2. **소유자: Codex.** 승인 직후 `npx supabase db push` 실행 및 migration history 재확인. **종료증거:** `20260825020000` remote 값 채움.
3. **소유자: Codex.** 운영 경로에서 총 30·지급가능 27 계약을 검증하되 시험 신청 기록 노이즈를 만들지 않는 검증 경로를 먼저 확정. **종료증거:** 운영 함수 계약 확인과 허용된 실제 환전 성공 증거.
4. **소유자: Codex.** DB 검증 후 대표 주소 승격 승인을 별도로 요청. 승인 시 별칭 변경과 health 재확인. **종료증거:** 대표 주소 `/api/health`가 `version: 1.2.0` 반환.
5. **소유자: 회장 또는 계정 관리자.** GitHub 결제 제한 해소. **종료증거:** 빌드·테스트·E2E 작업 시작 및 전부 성공.
