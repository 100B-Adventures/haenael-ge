# 릴리스 매니페스트: 해낼게 2.1.1

```yaml
release: 2.1.1
date: 2026-11-08
status: staging-verification
line: v2
delivery: vercel
canonical_url: https://haenael-ge.vercel.app
source_commit: pending-staging-verification
ships:
  code: WHY edit alignment, unlinked cheer history, server waterfall reduction
  migrations:
    - 20261108030000_unlinked_cheer_history.sql
    - 20261108040000_friend_page_single_rpc.sql
qa_gate:
  approved: false
  required:
    - staging health sourceSha identity
    - staging 390px, 768px, 1440px prototype comparison
    - staging unlinked cheer history write-fixture E2E
    - staging before/after navigation and RPC timings
    - production three-path direct observation
forbidden:
  - live payment key
  - actual payment
  - destructive production database change
```

---

# 릴리스 후보 매니페스트: 해낼게 2.1.0

> 상태: **제안, QA 미승인, 운영 미배포.** 이 후보는 현재 운영 릴리스 `2.0.1`을 대체하지 않는다.
> 현재 운영 릴리스 신원은 `2.0.1`로 유지한다. 후보 버전 파일은 배포 선언이 아니며, QA 승인과 운영 배포 전에는 runtime 관찰값을 바꾸지 않는다.

```yaml
release: 2.1.0
date: 2026-11-03
status: proposed-not-approved
line: v2
delivery: vercel
canonical_url: https://haenael-ge.vercel.app
source_commit: 28b483f13a46e2af34f41b216410c8149dad88e2
build: staging deployment haenael-c6m5vrlk5-100-b.vercel.app
channel: staging
runtime_observation:
  url: https://haenael-ge-v2-staging-100-b.vercel.app/api/health
  observed_at: 2026-11-03T06:38:46.858630+00:00
  release: 2.0.0
  source_sha: 28b483f13a46e2af34f41b216410c8149dad88e2
  database: ok
  note: candidate version is not yet assembled into a deployable runtime
ships:
  plan: 1.0.0
  prototype: 3.0.0
  eng_design: 1.2.5
  build: approved
  qa: changes-requested
  code: source_commit:28b483f13a46e2af34f41b216410c8149dad88e2
qa_gate:
  approved: false
  blockers:
    - actual Kakao OAuth callback and product session unverified
    - actual Toss sandbox callback and persistence unverified
    - production TOSS_SECRET_KEY rotation pending account-owner action
    - production migrations eight and Edge Function deployment pending QA approval
carried_forward:
  - approved plan 1.0.0, prototype 3.0.0, and eng-design 1.2.5 remain their own artifact revision lines
upstream_unchanged_reason: candidate assembly records approved upstream revisions without changing their meaning
changelog: CHANGELOG.md#unreleased-210-rc1
artifact_to_release:
  docs/plan/haenael-v2-blueprint-v1.0.0-opus48.md: { release: 2.1.0, tag: target }
  docs/design/prototypes/social-viral-loop-v3-opus5.html: { release: 2.1.0, tag: target }
  docs/eng-design/fdd-social-viral-loop-web-first-v1.2.5.md: { release: 2.1.0, tag: target }
  docs/build-log.md: { release: 2.1.0, tag: target }
  docs/qa/qa-tracker-v2-social-viral-loop.md: { release: 2.1.0, tag: blocked-qa }
server_assets:
  db_migrations:
    - 20261025010000_v2_prototype_contract_completion.sql
    - 20261030010000_payment_compensation_amount_contract.sql
    - 20261030020000_payment_compensation_idempotency.sql
    - 20261030030000_payment_compensation_replay_guard.sql
    - 20261030040000_reconcile_failed_cancel_webhook.sql
    - 20261030050000_resolve_payment_reconcile_risk.sql
    - 20261107010000_payment_conversion_claim.sql
    - 20261107020000_payment_conversion_delivery_lease.sql
  edge_functions:
    - auth-kakao
    - cheer-order
    - lead-capture
    - profile-update
    - toss-confirm
    - toss-webhook
  deployment_order:
    - apply all eight database migrations
    - deploy Edge Functions; toss-confirm requires lease_payment_conversion from 20261107020000, while ack_payment_conversion remains reserved for a trusted server sender with a provider transport receipt
    - deploy web
    - run QA smoke; no production promotion before approval
```

후보의 실제 staging 증거는 `.goal/runs/final-controller-verification-20261103.json`에 고정한다.
CI 실행 `41474029952`는 성공했으며, staging 브라우저 E2E는 17/17, 종료코드 0이었다.
그 증거는 QA 승인, 운영 배포, 또는 실제 외부 인증 callback 성공을 뜻하지 않는다.

### 배포 전 정합 메모

- 후보 `2.1.0`의 `VERSION`, 패키지 버전, RELEASE 매니페스트는 정합한다. `status: proposed-not-approved`가
  운영 릴리스 선언과 구분한다.
- production의 현재 관찰 릴리스는 `2.0.1`이다. `2.1.0`을 production runtime으로 기록하지 않는다.
- 배포 시에는 QA 승인 뒤 runtime identity를 같은 최종 버전으로 조립하고
  production smoke를 기록한다.
- `toss-confirm`은 delivery lease RPC가 먼저 적용돼야 한다. `ack_payment_conversion`은 provider transport receipt를 검증하는 신뢰 가능한 서버 전송자 전용이며 브라우저가 호출하지 않는다. 순서가 뒤집히면 결제 승인은
  유지되지만 전환 lease를 발급하지 못하므로, 위 배포 순서를 바꾸지 않는다.

---

# 릴리스 매니페스트: 해낼게 2.0.1

2.0.0 위 광고 전환 측정 패치. 산출물 버전 변화 없음, DB·엣지 함수 변경 없음, 웹만 배포한다. 회장 2026-10-27 "알아서 다 연결하고 진행해". 변경 내역은 `CHANGELOG.md` 2.0.1.

# 릴리스 매니페스트: 해낼게 2.0.0

이 문서는 `v2` 소셜 바이럴 루프 슬라이스의 운영 배포와 승인 산출물을 한 릴리스로 묶는다.
변경 내역은 `CHANGELOG.md`의 `2.0.0` 항목을 따른다. 아래 1.2.1 매니페스트는 `core` 환전 슬라이스 기록으로 그대로 보존한다.

```yaml
release: 2.0.0
date: 2026-10-14
status: released
delivery: vercel
canonical_url: https://haenael-ge.vercel.app
canonical_url_version: 2.0.0
line: v2
ships:
  fdd: 1.1.0
  erd: 1.1.0
  api-contract: 1.1.0
  architecture: 1.1.0
  test-plan: 1.1.0
  prototype: 2.0.0
  code: 2.0.0
  qa: 1.0.0
db_migrations:
  - 20261013050000_social_viral_loop_web_first.sql
  - 20261013060000_social_my_page_achievements.sql
decisions:
  - D-019 FRIENDS 커버는 Presigned URL 로만 제공
  - D-020 V2 를 별도 v2 파이프라인 라인으로 분리
  - D-021 앱인토스 SSR 금지와 토스 도메인 렌더 제약 확인
  - D-022 업적은 DB 집계로 반증 가능한 3지표만
  - D-023 하단탭 라벨 13px 확정, 시안 정본도 13px
changelog: CHANGELOG.md#200
```

---

# 릴리스 매니페스트: 해낼게 1.2.1

이 문서는 `core` 환전 슬라이스의 운영 배포와 승인 산출물을 한 릴리스로 묶는다.
변경 내역은 `CHANGELOG.md`의 `1.2.1` 항목을 따른다.

```yaml
release: 1.2.1
date: 2026-08-30
status: released
delivery: vercel
canonical_url: https://haenael-ge.vercel.app
canonical_url_version: 1.2.1
source_commit: de109a6f7a5323a133907693d95530cf13dbbbe2
tag: v1.2.1
ships:
  prd: 0.4.0
  design: 2.0.1
  design-spec: 1.0.0
  user-flow: 0.3.1
  prototype-boundary: 1.0.0
  clean-frames: 1.0.0
  fdd: 1.1.0
  fdd-base: 0.1.0
  api-contract: 1.0.0
  architecture: 1.0.0
  design-patterns: 1.0.0
  folder-structure: 1.0.0
  test-plan: 1.0.0
  erd: 1.0.0
  test-cases: 1.0.0
  code: 1.2.1
  qa: 1.1.0
changelog: CHANGELOG.md#121
artifact_to_release:
  docs/plan/prd-haenael-ge-v0.4.0.md:
    release: v1.2.1
    tag: released_in
  docs/plan/one-thing.md:
    release: v1.2.1
    tag: released_in
  docs/plan/persona.md:
    release: v1.2.1
    tag: released_in
  docs/plan/bm.md:
    release: v1.2.1
    tag: released_in
  docs/plan/risks.md:
    release: v1.2.1
    tag: released_in
  DESIGN.md:
    release: v1.2.1
    tag: released_in
  docs/design/user-flow.md:
    release: v1.2.1
    tag: released_in
  docs/design/design-spec-core-cashout-30-27-v1-gpt-codex.md:
    release: v1.2.1
    tag: released_in
  docs/design/prototypes/legacy/core-cashout-30-27-v1-gpt-codex.html:
    release: v1.2.1
    tag: released_in
  docs/design/clean-frames/core-cashout-30-27-form-390-v1-gpt-codex.png:
    release: v1.2.1
    tag: released_in
  docs/design/clean-frames/core-cashout-30-27-form-1024-v1-gpt-codex.png:
    release: v1.2.1
    tag: released_in
  docs/design/clean-frames/core-cashout-30-27-confirm-390-v1-gpt-codex.png:
    release: v1.2.1
    tag: released_in
  docs/design/clean-frames/core-cashout-30-27-confirm-1024-v1-gpt-codex.png:
    release: v1.2.1
    tag: released_in
  docs/design/clean-frames/core-cashout-30-27-clean-frames-v1-gpt-codex.stamp.md:
    release: v1.2.1
    tag: released_in
  docs/eng-design/fdd-haenael-ge-cashout-clover-lock-v1.1.0.md:
    release: v1.2.1
    tag: released_in
  docs/eng-design/fdd-haenael-ge-v0.1.0.md:
    release: v1.2.1
    tag: released_in
  docs/eng-design/api-contract.md:
    release: v1.2.1
    tag: released_in
  docs/eng-design/architecture.md:
    release: v1.2.1
    tag: released_in
  docs/design/design-patterns.md:
    release: v1.2.1
    tag: released_in
  docs/eng-design/folder-structure.md:
    release: v1.2.1
    tag: released_in
  docs/qa/test-plan.md:
    release: v1.2.1
    tag: released_in
  docs/eng-design/erd.md:
    release: v1.2.1
    tag: released_in
  docs/qa/test-cases.md:
    release: v1.2.1
    tag: released_in
  docs/eng-design/build-log.md:
    release: v1.2.1
    tag: released_in
  docs/구현현황.md:
    release: v1.2.1
    tag: released_in
  docs/qa/qa-tracker.md:
    release: v1.2.1
    tag: released_in
  docs/design/design-conformance-matrix.md:
    release: v1.2.1
    tag: released_in
  docs/qa/cross-browser-matrix.md:
    release: v1.2.1
    tag: released_in
  docs/qa/security-report.md:
    release: v1.2.1
    tag: released_in
  docs/qa/perf-report.md:
    release: v1.2.1
    tag: released_in
```

`1.2.1`은 기존 사용자 계약을 깨지 않고 운영 환전 판정·배포 경로·버전 표기를
바로잡는 패치 릴리스다. Vercel과 Supabase가 실제 서비스를 제공하며, 컨테이너
이미지 워크플로가 없는 저장소라 Docker 이미지 태그는 적용하지 않는다.

## 무엇이 나갔는가

- 환전 최소 기준은 총보유액으로 판단한다. 실제 신청 상한은 지급가능액으로
  판단하고 입력 하한은 1클로버다.
- Vercel 배포가 출력 단계에서 죽던 구조 결함을 해소했다. Root Directory를
  `web`으로 설정하고, 이 미설정을 buildCommand 우회로 덮던 구 커밋(`6b23fd7`)을
  청산해 루트 `vercel.json`을 `web/vercel.json`으로 옮겼다.
- 운영 버전 표기를 Vercel 환경변수 수기 관리에서 `package.json` 진실원 빌드
  주입으로 전환했다. 이 환경변수가 40일간 낡은 값에 멈춰 매니페스트가 거짓이
  됐던 사고의 근본 원인을 없앴다.
- QA 검증 대상 주소를 302 redirect되는 `haenaelge.vercel.app`에서 대표 주소로
  교정했다. 대표 주소 헤더가 오래 미검증이던 이유였다.
- 대표 주소 `haenael-ge.vercel.app`이 최종 배포(`haenael-6f48v643p-100-b`)를
  가리키도록 승격됐다. `/api/health`는 `{"status":"ok","version":"1.2.1","database":"ok"}`를
  반환한다.
- 정적 인라인 스타일과 원시 색상 부채를 줄인 화면 리팩터링은 390px·1024px
  공개 화면 전후 비교에서 사용자 시각 변화 0픽셀로 검증됐다.
- 환전 화면은 자격 기준 30과 신청량 1~지급가능액을 다른 문장과 위계로
  표시한다. 경계 프로토타입 24조합에서 렌더 실패, page error, 수평 넘침이
  모두 0건이었다.

## 검증

| 검증 | 결과 | 증거 |
|---|---|---|
| 산출물 실물·핀 드리프트 | 통과 | `artifact-drift-check.sh`, 갱신 후 0건 |
| 운영 DB migration | 통과 | 42/42 local·remote 일치, `20260825020000` 포함 |
| 운영 `/api/health` | 통과 | HTTP 200, `version=1.2.1`, `database=ok` |
| 보안 헤더(대표 주소) | 통과 | CSP·nosniff·referrer-policy·permissions-policy 4/4 관찰, `x-powered-by` 0건 |
| 교차 브라우저(대표 주소) | 통과 | Firefox·WebKit 콘솔 error 0, pageerror 0 |
| 운영 공개 경로 검사 | 통과 | `qa:verify-production` 3/3 |
| 운영 인증 환전 화면 | 통과 | Playwright 인증 읽기 E2E 1/1, 제품 쓰기 0건 |
| 디자인 경계 렌더 | 통과 | 2 viewport × 4화면 × 3데이터, 24/24 |
| 기술설계 계약 | 통과 | 산출물 8/8, RPC 8개, 유저플로우 매핑 gap 0 |
| QA 계약 | 통과 | env 34/34, cashout 33/33, RAISE 13/13, notify 8/8, mutation 8/8 |
| 로컬 회귀(Vitest) | 통과 | 279/279 |
| 배포 의존성 취약점 | 통과 | `npm audit --omit=dev` 0건(구 40건 해소) |
| 프로덕션 빌드 | 통과 | Next.js production build exit 0 |
| 성능(대표 주소) | 부분 통과 | LCP 384~840ms, CLS 0, 반복부하 오류 0/30, p95 0.166~1.229s. 실사용자 상호작용 지연은 읽기 전용 측정 불가로 근사 대체 |
| GitHub Actions | 차단 · green 아님 | 무료 2,000분 소진, Actions budget `$0`, `Stop usage: Yes`. 세 job 모두 steps 0개. 코드 실패도 flaky도 아니며 저장소 수정으로 해소 불가 |

GitHub Actions는 이번 릴리스에서도 열리지 않았다. 코드 실패가 원인이 아니라
계정 결제 한도가 원인이라는 사실관계는 변하지 않았고, 이 상태를 green으로
간주하지 않는다. main 재검증 CI가 다시 도는 것은 이번 릴리스의 완료 조건이
아니라 다음 결제 주기 이후의 별도 확인 대상이다.

## 알려진 경계

이번 릴리스는 아래 항목을 숨기지 않고 알려진 경계로 남긴다. 어느 것도 이번
릴리스가 다루는 환전 판정·배포 경로 수정을 무효화하지 않는다.

- **GitHub Actions CI green 없음.** 위 검증 표 참고. 계정 결제 한도가 풀리기
  전에는 CI 성공 증거를 만들 수 없다.
- **환전 폼 상태 캡처 미확보.** 디자인 정합 증거의 실화면 캡처가 kill switch
  꺼진 상태로 찍혀 있어 폼과 시안의 대조가 미완이다(비차단).
- **총보유 30·지급가능 27 실계정 0명.** 운영 함수 계약은 확인했지만 실제
  회원의 27클로버 신청 성공은 자연 발생 전까지 미검증이다.
- **대표 주소 alias 수동 승격.** 프로젝트 도메인으로 등록돼 있지 않아
  배포마다 손으로 승격해야 한다(API 등록은 세션 도구가 차단).
- **지급 신원·세무정보 처리 계약은 범위 밖.** 회장 결정(2026-08-29)으로 이번
  릴리스에서 다루지 않는다(재개조건: 실제 환전 지급 직전 또는 토스 대체 업체
  선정 시).
- **git 태그 `v1.2.1` 미생성.** 태그·commit·push는 컨트롤러 권한이라 이
  매니페스트 작성 시점에는 생성하지 않는다. `source_commit`이 실제 배포
  대상 커밋이다.

## 벤치마크 적용

- [Semantic Versioning 2.0.0](https://semver.org/): 기존 계약을 깨지 않는
  버그 수정이라 PATCH를 유지했다.
- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/): 최신 릴리스를
  위에 두고 변경 유형과 날짜를 사람이 읽을 수 있게 분리했다.
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions):
  포함 분량을 모두 쓰고 추가 지출이 막히면 GitHub-hosted runner 사용이
  차단되는 공식 규칙을 현재 Billing 실측과 대조했다.
- `~/.claude/standards/release-and-artifacts.md`: 릴리스 매니페스트 스키마·
  단일 릴리스 버전 규율·산출물 양방향 태그(§7) 형식을 그대로 따랐다.

---

🏷 STAMP | line: core | 생성: 2026-08-30 15:10 KST | model: claude-sonnet-5 | agent: release-manager
skills: 없음(문서 마감 작업, 매칭 스킬 없음 — 아래 SKILLS_SKIPPED 참조) | 근거: `pipeline-state.core.md`, 컨트롤러 위임 프롬프트의 실측 근거(배포 성공·헤더 4/4·교차브라우저·성능·회귀 수치), `docs/qa/qa-tracker.md`, `artifact-drift-check.sh`, git log, `web/package.json`, SemVer, Keep a Changelog
고민: 위임 프롬프트가 이미 컨트롤러 직접 관찰 증거로 채워져 있어 이 문서는 그 증거를 재조사하지 않고 매니페스트·CHANGELOG로 정직하게 번역하는 역할에 집중했다. 임의로 "완전 해결"로 과장하지 않고, GitHub Actions·환전 폼 캡처·실계정 미검증 3건은 released 판정과 별개로 알려진 경계에 남겼다.

SKILLS_USED: 없음
SKILLS_SKIPPED: doc-review.md는 PRD/FDD/QA 문서 전용 채점 헌법(§0 적용 대상 role: prd/tech/qa)이라 릴리스 매니페스트 자체에는 RUBRIC_SCORE 채점을 적용하지 않았다. release-and-artifacts.md §5·§7 스키마를 그대로 따르는 것으로 대체했다.

SOURCES/MODEL: claude-sonnet-5 | `pipeline-state.core.md`(approved_stages: plan,design,eng-design,build,qa / ship 승인 로그); `docs/qa/qa-tracker.md`; `~/.claude/standards/release-and-artifacts.md`; `~/.claude/standards/doc-review.md`; git log(`de109a6`); `web/package.json`(version 1.2.1); `bash ~/.claude/harness/bin/artifact-drift-check.sh`; <https://semver.org/>; <https://keepachangelog.com/en/1.1.0/>; <https://docs.github.com/en/billing/concepts/product-billing/github-actions>
PRESENTATION_CHECK: 내부 태그 잔재 없음 확인 / Markdown 구조·표 가독성 확인
