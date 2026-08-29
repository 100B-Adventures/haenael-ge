# 릴리즈 매니페스트: 해낼게 1.2.1

이 문서는 `core` 환전 슬라이스의 최신 운영 스냅샷과 승인 산출물을 한 릴리스로 묶는다.
변경 내역은 `CHANGELOG.md`의 `1.2.1` 항목을 따른다.

```yaml
release: 1.2.1
date: 2026-08-29
status: release-candidate
delivery: vercel
canonical_url: https://haenael-ge.vercel.app
canonical_url_version: 1.2.0
source_commit: pending-final-commit
tag: pending-v1.2.1
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
  docs/prd-haenael-ge-v0.4.0.md:
    release: v1.2.1
    tag: target
  docs/one-thing.md:
    release: v1.2.1
    tag: target
  docs/persona.md:
    release: v1.2.1
    tag: target
  docs/bm.md:
    release: v1.2.1
    tag: target
  docs/risks.md:
    release: v1.2.1
    tag: target
  DESIGN.md:
    release: v1.2.1
    tag: target
  docs/user-flow.md:
    release: v1.2.1
    tag: target
  docs/design-spec-core-cashout-30-27-v1-gpt-codex.md:
    release: v1.2.1
    tag: target
  docs/prototype/core-cashout-30-27-v1-gpt-codex.html:
    release: v1.2.1
    tag: target
  docs/design/clean-frames/core-cashout-30-27-form-390-v1-gpt-codex.png:
    release: v1.2.1
    tag: target
  docs/design/clean-frames/core-cashout-30-27-form-1024-v1-gpt-codex.png:
    release: v1.2.1
    tag: target
  docs/design/clean-frames/core-cashout-30-27-confirm-390-v1-gpt-codex.png:
    release: v1.2.1
    tag: target
  docs/design/clean-frames/core-cashout-30-27-confirm-1024-v1-gpt-codex.png:
    release: v1.2.1
    tag: target
  docs/design/clean-frames/core-cashout-30-27-clean-frames-v1-gpt-codex.stamp.md:
    release: v1.2.1
    tag: target
  docs/fdd-haenael-ge-cashout-clover-lock-v1.1.0.md:
    release: v1.2.1
    tag: target
  docs/fdd-haenael-ge-v0.1.0.md:
    release: v1.2.1
    tag: target
  docs/api-contract.md:
    release: v1.2.1
    tag: target
  docs/architecture.md:
    release: v1.2.1
    tag: target
  docs/design-patterns.md:
    release: v1.2.1
    tag: target
  docs/folder-structure.md:
    release: v1.2.1
    tag: target
  docs/test-plan.md:
    release: v1.2.1
    tag: target
  docs/erd.md:
    release: v1.2.1
    tag: target
  docs/test-cases.md:
    release: v1.2.1
    tag: target
  docs/build-log.md:
    release: v1.2.1
    tag: target
  docs/구현현황.md:
    release: v1.2.1
    tag: target
  docs/qa-tracker.md:
    release: v1.2.1
    tag: target
  docs/design-conformance-matrix.md:
    release: v1.2.1
    tag: target
  docs/cross-browser-matrix.md:
    release: v1.2.1
    tag: target
  docs/security-report.md:
    release: v1.2.1
    tag: target
  docs/perf-report.md:
    release: v1.2.1
    tag: target
```

`1.2.1`은 기존 사용자 계약을 깨지 않고 운영 환전 판정과 배포 검증을 바로잡는
패치 릴리스다. Vercel과 Supabase가 실제 서비스를 제공하며, 컨테이너 이미지
워크플로가 없는 저장소라 Docker 이미지 태그는 적용하지 않는다.

## 무엇이 나가는가

- 환전 최소 기준은 총보유액으로 판단한다. 실제 신청 상한은 지급가능액으로
  판단하고 입력 하한은 1클로버다.
- `20260825020000_cashout_total_threshold_contract.sql`은 운영 Supabase에 반영됐다.
  2026-08-29 재조회에서 전체 42개 migration의 local과 remote가 일치했다.
- 대표 주소는 최신 Ready Production으로 승격됐다. 새 요청의 `/api/health`는
  `version: 1.2.0`, `database: ok`를 반환한다.
- 운영 전용 QA 계정으로 실제 Supabase 로그인과 `/cashout` 렌더를 확인했다.
  Playwright는 1건 통과했고 실행 전후 `cashout_request`는 동일했다.
- 정적 스타일과 원시 색상 부채를 줄인 화면 리팩터링은 390px·1024px 공개
  화면 전후 비교에서 사용자 시각 변화 0픽셀로 검증됐다.
- 환전 화면은 자격 기준 30과 신청량 1~지급가능액을 다른 문장과 위계로 표시한다.
  경계 프로토타입 24조합에서 렌더 실패, page error, 수평 넘침이 모두 0건이었다.

## 정합 판정

`artifact-drift-check.sh`는 수정 전 승인 핀과 실물 경로 기준으로 드리프트 0을
보고했다. 그러나 이번 파이프라인 마감 감사에서 다음 승인 산출물이 운영 현실보다
뒤처진 사실을 발견했다.

| 산출물 | 현재 핀 | 발견 | 1.2.1 마감 조건 |
|---|---:|---|---|
| 환전 FDD | 1.1.0 감사본 완료 | 총보유·지급가능·입력 하한 3중 계약 반영 | 승인 핀 등록 필요 |
| API·아키텍처 세트 | v1.0.0 감사본 완료 | RPC 8개, 유저플로우, ERD, 테스트 범위 반영 | 승인 핀 등록 필요 |
| QA 산출물 세트 | v1.1.0 감사본 완료 | 기능 회귀 PASS와 릴리스 품질 NG를 분리 | NG 항목 해소 후 승인 핀 등록 |
| 디자인 정합 | v1.1.0, FAIL | 환전 spec 31/31·24조합 PASS, 전체 화면 미대조·lint 경고 | 전 화면 390·1024 대조와 lint 해소 |
| 보안 | v1.1.0, FAIL | `npm audit --omit=dev` 40건, 운영 보안 헤더 누락 | 의존성·헤더 보정 후 재감사 |
| 교차브라우저·성능 | v1.1.0, BLOCKED | 인증 Firefox·WebKit, CWV·부하 미측정 | 실제 인증·성능 재검증 |

따라서 이 문서는 QA v1.1.0의 FAIL·BLOCKED 항목이 해소되고, 최신 산출물이
`pipeline-state.core.md` 승인 핀으로 등록되며, `v1.2.1` 태그와 운영 버전 표기가
함께 맞기 전까지 `release-candidate`다. 환전 핵심 경로의 PASS를 제품 전체 QA
PASS로 확대하지 않는다.

## 검증

| 검증 | 결과 | 증거 |
|---|---|---|
| 산출물 실물·핀 드리프트 | 통과 | `artifact-drift-check.sh`, 수정 전 0건 |
| 운영 DB migration | 통과 | 42/42 local·remote 일치, `20260825020000` 포함 |
| 대표 주소 상태 | 통과 | `/api/health` 200, `version=1.2.0`, `database=ok` |
| 운영 인증 환전 화면 | 통과 | Playwright 1/1, 13.7초, 제품 쓰기 0건 |
| 디자인 경계 렌더 | 통과 | 2 viewport × 4화면 × 3데이터, 24/24 |
| 기술설계 계약 | 통과 | 산출물 8/8, RPC 8개, 유저플로우 매핑 gap 0 |
| QA 계약 | 통과 | env 34/34, cashout 33/33, RAISE 13/13, notify 8/8, mutation 8/8 |
| 로컬 환전 회귀 | 선행 통과 | Playwright 12/12, Vitest 269/269, build PASS |
| 최신 Vitest | 미확정 | build worker 격리 270/270, QA 병렬 환경 269/270 timeout |
| QA 릴리스 게이트 | 실패 | 보안·전체 디자인 FAIL, 인증 교차브라우저·성능 BLOCKED |
| GitHub Actions | 차단 | run `33190515509`, 세 job 모두 steps 0개 |

GitHub Actions가 실행되지 않은 원인은 코드 실패가 아니다. Billing 실화면 기준
무료 2,000분을 모두 사용했고 Actions budget이 `$0`, `Stop usage: Yes`다.
무료 시간이 초기화되거나 예산이 바뀌기 전에는 CI 성공 증거를 만들 수 없다.
이 상태를 green으로 간주하지 않는다.

## 알려진 경계

- 운영에는 총보유 30·지급가능 27 상태의 실제 계정이 현재 0개다. 계약은 운영
  함수에서 확인했지만 실제 회원의 27클로버 신청 성공은 자연 발생 전까지 미검증이다.
- CI는 main 코드 재검증 관문이다. 제품 운영은 정상이어도 CI가 다시 실행돼
  green이 되기 전에는 배포 공정의 자동검증 증거가 닫히지 않는다.
- 프로덕션 의존성 감사 40건과 운영 보안 헤더 누락, 전체 화면 디자인 대조,
  인증 교차브라우저, 사용자 체감 성능·부하 검증은 QA v1.1.0의 릴리스 차단점이다.
- `v1.2.1` 태그와 운영 앱 버전 `1.2.1` 표기는 최종 릴리스 작업에서 생성해야 한다.

## 벤치마크 적용

- [Semantic Versioning 2.0.0](https://semver.org/): 기존 계약을 깨지 않는 버그 수정이라
  PATCH를 올렸다.
- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/): 최신 릴리스를 위에 두고
  변경 유형과 날짜를 사람이 읽을 수 있게 분리했다.
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions):
  포함 분량을 모두 쓰고 추가 지출이 막히면 GitHub-hosted runner 사용이 차단되는
  공식 규칙을 현재 Billing 실측과 대조했다.

---

🏷 STAMP | line: core | 생성: 2026-08-29 05:18 KST | model: gpt-5.6-sol | agent: release-manager
skills: pipeline, ship | 근거: `pipeline-state.core.md`, 운영 migration list, 운영 health, `docs/qa-tracker.md`, GitHub run `33190515509`, SemVer, Keep a Changelog
고민: 운영은 정상이어도 낡은 FDD·QA 핀과 미생성 태그를 숨기면 매니페스트가 거짓이 되므로 1.2.1을 release-candidate로 선언했다.

SKILLS_USED: pipeline(단계·승인 핀 진실원 대조), ship(릴리스 버전·매니페스트·변경기록 정합)
SKILLS_SKIPPED: 없음

SOURCES/MODEL: gpt-5.6-sol | `pipeline-state.core.md`; `docs/qa-tracker.md`; 기술설계 감사본 8개; Supabase migration list; <https://haenael-ge.vercel.app/api/health>; GitHub Actions run 33190515509; <https://semver.org/>; <https://keepachangelog.com/en/1.1.0/>; <https://docs.github.com/en/billing/concepts/product-billing/github-actions>
PRESENTATION_CHECK: 내부 태그 잔재 없음 확인 / Markdown 구조·표 가독성 확인
