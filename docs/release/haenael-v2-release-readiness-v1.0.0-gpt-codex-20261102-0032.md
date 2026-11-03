# 해낼게 V2 운영 릴리스 후보 준비서

<!-- STAMP: 생성 2026-11-02 KST · 갱신 2026-11-03 15:49 KST | model gpt-codex/GPT-5 | agent release-manager | skills ship(릴리스 후보·검증 게이트 점검) | basis pipeline-state.v2.md, 28b483f, .goal/runs/final-controller-verification-20261103.json, release-and-artifacts.md, https://semver.org/, https://vercel.com/docs/deployments/promote-preview-to-production, https://supabase.com/docs/guides/deployment/database-migrations | 판단: 실제 운영 변경 없이 후보의 신원, 배포 순서, 불가역 DB 경계와 차단 증거를 분리했다 -->

## 결론

**판정: `NOT_RELEASE_READY`, `NOT_APPROVED`.**

### 2026-11-03 후보 정합 재검증

`artifact-drift-check.sh .`의 8건을 실제 원인으로 대조했다. 제품현황 낡음은 갱신했고,
산출물 계열 4건은 후보 매니페스트의 `carried_forward`와 `upstream_unchanged_reason`로 의미를 보존한 채 연결했으며,
staging runtime의 `release·commit·build·channel` 관찰을 매니페스트에 기록했다. 남은 1건은 루트 `VERSION` 부재다.
checker가 prerelease `2.1.0-rc.1`을 정규 버전 `2.1.0`으로만 파싱하므로, 승인 전 `VERSION=2.1.0`을 쓰면 정식 운영
릴리스 선언처럼 오해될 수 있다. 이 후보에서는 의도적으로 해소하지 않는다.

운영 상태는 바꾸지 않았다. 2.0.0이 production이고, `2.1.0-rc.1`은 staging source
`28b483f13a46e2af34f41b216410c8149dad88e2`의 제안 후보일 뿐이다.

운영 배포 후보는 **`2.1.0-rc.1` (제안값)**, 소스는 `28b483f13a46e2af34f41b216410c8149dad88e2`이다. 이는 2.0.0 이후 소셜·Storage·결제 보상 동작을 추가한 범위이므로 MINOR 후보로 분류했다. 아직 `web/package.json`과 staging `/api/health`의 관찰값은 모두 `2.0.0`이며, `RELEASE.md`에도 이 후보가 없다. 이는 후보 version bump 전의 관찰 사실이며 제품 결함이나 독립적인 배포 차단 사유가 아니다. `2.1.0-rc.1`은 선언된 운영 버전이나 배포 승인값이 아니다.

| 관문 | 상태 | 직접 근거 | 배포 판정 |
|---|---|---|---|
| 소스 신원 | 관찰됨 | staging `/api/health`: `sourceSha=28b483f…`, 2026-11-03 | 후보 소스 일치 |
| 후보 version | 2.1.0-rc.1 제안 | staging runtime은 2.0.0 | version bump 전 정상 관찰값 |
| 승인 산출물 | 일부 일치 | `pipeline-state.v2.md`의 plan/design/eng-design/build만 approved | QA artifact는 changes-requested |
| staging E2E | 테스트됨 | social-web-first.spec.ts 17/17, EXIT 0, 7.6분 | 내부 브라우저 검증 통과 |
| 관리자 QA 증거 | 관찰됨 | 실제 staging 관리자 조작 포함 브라우저 테스트 통과 | 외부 인증 검증과 별개 |
| Kakao OAuth·Toss callback | 미검증 | pipeline-state.v2.md의 external integration pending | 배포 전 차단 |

이 문서는 **후보·적용 계획**이다. 기존 `RELEASE.md`의 2.0.0 운영 기록을 변경하거나 대체하지 않는다.

## 기준선과 승인 핀

| 구분 | 값 |
|---|---|
| 기존 운영 릴리스 | 2.0.0, 2026-10-14, source 기준 커밋 `3894147` |
| 후보 소스 | `28b483f13a46e2af34f41b216410c8149dad88e2` (`fix: preserve mypage cheer badge typography`) |
| 후보 런타임 버전 | `2.1.0-rc.1` 제안. 구현 전 `web/package.json`, RELEASE 매니페스트, 런타임 health 응답을 같은 값으로 맞춰야 함 |
| 배포 채널 | Vercel 웹 + managed Supabase. Docker image/tag는 해당 없음 |
| approved plan | `docs/plan/haenael-v2-blueprint-v1.0.0-opus48.md` v1.0.0 |
| approved design | `docs/design/prototypes/social-viral-loop-v3-opus5.html` v3.0.0, `DESIGN.md`, `docs/design/standard-ux-writing.md` |
| approved eng-design | V2 web-first FDD/ERD/API/architecture/test-plan v1.2.5 및 승인 핀 8건 |
| approved build | `docs/build-log.md`, `docs/구현현황.md`, component inventory, prototype server contract, migration `20261025010000` |
| QA 핀 | 6건 모두 `changes-requested`. 이를 approved로 해석하지 않음 |

`artifact-drift-check.sh .`는 exit 1이었다. 이는 기존 2.0.0 기록까지 함께 검사한 release artifact 정합 경고다. 후보 조립 시 아래를 해소하거나 실제 이유를 공식 릴리스 산출물에 반영해야 한다.

- `VERSION` 부재.
- `docs/제품현황.md`가 v2 pipeline-state보다 오래됨.
- 기존 RELEASE 2.0.x와 승인 산출물의 1.0.0/1.2.5/3.0.0 계열 연결 근거 부재.
- RELEASE의 runtime `channel`, runtime version 관찰 증거 부재.

이 검사는 기존 2.0.0 기록을 포함해 검사하므로, 이 결과만으로 후보 소스의 기능 결함을 단정하지 않는다. 다만 현재 상태에서는 ship 정합 게이트를 통과하지 못한다.

## 실제 검증과 미검증 범위

### 관찰됨

- staging health: `status=ok`, `database=ok`, `sourceSha=28b483f…`, project ref `ezzklgotgydwxqebfoys`, 응답 838 ms. 단, 버전은 2.0.0이다.
- CI `41474029952`의 단위 테스트 + build, Supabase pgTAP + 서버 런타임 계약, 환전 브라우저 E2E, 배포 환경·환전 층간 계약은 성공했다.
- 승인 프로토타입의 관리자 프레임은 390×844로 캡처됐다. 이는 승인 시안 캡처이지 staging 관리자 인증 화면의 성공 증거가 아니다.

### 배포 전 차단 사유

- 실제 Kakao OAuth callback·제품 세션은 미검증이다. 내부 브라우저 테스트 성공으로 대체하지 않는다.
- 노출 이력이 있는 운영 TOSS_SECRET_KEY 교체가 남아 있다. 현재 키와 동일하다는 해시 비교 근거가 있다.
- Kakao 실제 OAuth callback과 Toss 실제 callback은 미검증이다.

### 배포 후 검증 항목

- production promotion 뒤 canonical URL의 health, 비로그인 핵심 진입, read-only 인증 사용자 핵심 화면을 확인한다. production smoke는 운영 배포 후 실제 배포물이 동작하는지 확인하는 절차이므로, 이번 배포 전 준비 문서의 사전 차단 조건으로 쓰지 않는다.
- 운영 migration 53개와 로컬 59개를 대조해 미적용 6개를 확인했다. 운영 함수 15개에서 profile-update는 검색되지 않았다. QA 승인 후 함수 5개와 웹을 반영하고 운영 검증한다.

## 적용 대상

### 서버 자산

소스 범위 `3894147..28b483f`에는 아래 Edge Function 변경·신설이 있다. 배포 전에는 `supabase functions list --project-ref <production-ref>`로 실제 운영 상태와 manifest를 대조한다. 이 문서는 그 명령을 실행하지 않았다.

| 자산 | 변경 | 배포 전 확인 |
|---|---|---|
| `auth-kakao` | 수정 | 실제 Kakao callback happy/cancel path |
| `cheer-order` | 수정 | 결제 비활성/활성 계약과 주문 생성 경계 |
| `profile-update` | 신규 | 본인 인증·프로필 쓰기 경로 |
| `storage-cleanup-worker` | 신규 | service-role 인증, schedule, queue drain |
| `toss-confirm` | 수정 | confirm 성공·실패·취소 경계 |
| `toss-webhook` | 수정 | CANCELED webhook 재시도·중복 전달 |
| `_shared/toss*`, `cleanup-auth`, `profile`, `storage-cleanup` | 수정/신규 | 위 함수의 공통 인증·보상·정리 계약 |

### 이번 후보의 5개 결제 마이그레이션

다음 다섯 파일은 2026-10-30 결제 보상/취소 조정분이다. 모두 기존 함수의 `CREATE OR REPLACE`이며, 파일 본문에서 테이블 `DROP` 또는 데이터 삭제 구문은 확인하지 못했다. 그래도 **운영 적용 여부는 migration list로 직접 확인 전까지 미확인**이다.

| 순서 | migration | 목적 | 되돌리기 성격 |
|---:|---|---|---|
| 1 | `20261030010000_payment_compensation_amount_contract.sql` | 보상 함수가 주문 생성과 같은 금액 범위를 수용 | 전진 수정 |
| 2 | `20261030020000_payment_compensation_idempotency.sql` | 취소 후 중복 callback idempotency | 전진 수정 |
| 3 | `20261030030000_payment_compensation_replay_guard.sql` | 키 검증을 약화하지 않는 replay guard | 전진 수정 |
| 4 | `20261030040000_reconcile_failed_cancel_webhook.sql` | FAILED 결제의 CANCELED webhook 복구 | 전진 수정 |
| 5 | `20261030050000_resolve_payment_reconcile_risk.sql` | 재시도 webhook의 수동 정산 표식 해소 | 전진 수정 |

`3894147..28b483f`에는 위 다섯 외에 8개 Supabase migration이 더 있다. 운영 migration list에서 이미 적용됐음을 확인하지 못하면, 이 5개만 적용하는 계획은 안전하지 않다. 먼저 누락 구간 전체를 다음처럼 분류한다.

- **V2 선행 후보 8개**: friendship backfill, relationship direction, storage cleanup worker/observability, invite preview minimization, social dashboard summary, fresh DB RLS grants, prototype contract completion.
- **결제 후보 5개**: 위 표의 2026-10-30 파일.

이 후보 문서는 선행 8개가 운영에 적용됐다고 주장하지 않으며, migration list의 실제 순서가 확정될 때까지 production `db push`를 허용하지 않는다.

## 비파괴적 배포 순서

아래 순서는 실행 명령이 아니라, 승인 뒤 실행할 runbook이다. production DB/배포 권한을 사용하거나 외부 상태를 바꾸지 않았다.

1. **후보 version bump와 릴리스 신원 조립**: source SHA를 고정하고, 실제 배포를 결정하는 시점에 `web/package.json`, `VERSION`, RELEASE 매니페스트, `/api/health`의 runtime identity를 후보 버전으로 맞춘다. 현재 staging의 2.0.0 관찰값은 이 조립 전 상태다. `artifact-drift-check.sh .`의 해당 release 정합 항목이 해소돼야 한다.
2. **QA 차단 해소**: 유효한 staging Supabase access token으로 결제 flag를 원복 가능하게 제어하면서 `e2e-v2-social`을 끝까지 실행한다. 기존 관리자 QA 계정 또는 안전한 전용 QA 계정을 준비해 `/admin` DOM 검증을 실행한다. Kakao와 Toss callback은 sandbox에서 실제 왕복 증거를 남긴다.
3. **production 사전 대조**: `supabase migration list --linked`와 `supabase functions list --project-ref <production-ref>`를 저장해 DB migration 누락과 Function drift를 확인한다. 이 단계에서 8개 V2 선행 migration의 실제 적용 상태를 결정한다.
4. **DB 먼저, 순차 적용**: database backup/snapshot 가능 상태를 확인한 뒤, 누락 migration을 timestamp 순으로 한 번만 적용한다. 이미 production에 적용된 migration을 재적용하지 않는다. 적용 직후 각 보상 함수의 function definition, grants, 간단한 read-only contract를 확인한다.
5. **Edge Functions 배포**: shared dependency를 포함한 대상 Function만 배포하고, `functions list` 및 staging과 동등한 read-only contract로 버전/응답을 확인한다. 결제·callback 실거래는 이 단계에서 만들지 않는다.
6. **Vercel staged production build**: source SHA와 production environment를 쓰는 deployment를 만들고, deployment URL에서 `/api/health`의 release, commit/source SHA, build ID, channel을 확인한다.
7. **production 승격**: Invalid access token 해소 후 staging E2E 실행, 관리자 QA 증거, Kakao OAuth·Toss callback 검증이 끝난 뒤에만 Vercel promote를 실행한다. 승격은 production 환경변수로 다시 빌드될 수 있으므로 preview 통과만으로 대체하지 않는다.
8. **배포 후 production smoke 1~3개**: canonical URL의 health, 비로그인 핵심 진입, read-only 인증 사용자 핵심 화면을 실제 관찰한다. Kakao/Toss를 production에서 실행할지는 테스트 계정·금전 영향이 분리됐을 때만 별도 승인으로 다룬다.

## 복구 계획

### 코드와 Vercel

Vercel rollback은 이전 production deployment로 도메인을 재지정하는 빠른 코드 복구 수단이다. 대상은 승격 직전 2.0.0의 실제 production deployment ID이며, 이 ID는 이 문서 작성 시 미확인이다. 롤백 뒤에는 auto-assignment 상태와 production 환경변수 차이를 재점검하고, health의 SHA와 version을 다시 관찰한다.

### Supabase DB와 Edge Function

DB migration은 이미 운영에 적용된 뒤 파일을 되돌리거나 down migration을 실행하지 않는다. Supabase 권고처럼 schema를 전진시키는 새 migration으로 보정한다. 특히 다섯 결제 migration은 보상·취소 상태를 바꾸므로 Vercel 코드만 2.0.0으로 되돌리면 새 DB 함수를 호출할 수 있는지 별도 호환성 확인이 필요하다.

| 사고 유형 | 즉시 조치 | 후속 복구 |
|---|---|---|
| UI/API 회귀, DB 계약 호환 | Vercel 이전 production deployment로 rollback | source SHA 고정 후 forward fix 배포 |
| Edge Function 회귀 | 영향 Function을 마지막 정상 구현으로 재배포하되 DB compatibility를 먼저 확인 | 새 Function deployment와 read-only contract 재검증 |
| migration 함수 계약 결함 | 코드 rollback만으로 종료하지 않음 | 데이터 삭제 없이 새 forward-fix migration으로 함수 정의/상태 전이 교정 |
| 결제 취소/보상 불일치 | 자동 재시도·이중 보상을 만들지 않고 관련 payment ID를 보존 | reconciliation 함수의 idempotency 증거 후 수동 정산 절차로 연결 |

## 운영 전 확인 명령

값·토큰은 출력하지 않으며, 모든 production 변경 명령은 QA 승인과 별도 배포 승인 뒤에만 실행한다.

```bash
# source와 문서 정합. 읽기 전용
git rev-parse 28b483f
git diff --check 3894147..28b483f
~/.claude/harness/bin/artifact-drift-check.sh .
~/.claude/harness/bin/pipeline-artifact-lint.sh .

# managed Supabase의 현재 적용 상태. 읽기 전용
supabase migration list --linked
supabase functions list --project-ref <production-ref>

# staged deployment 실측. 읽기 전용
vercel inspect <deployment-url>
vercel curl /api/health --deployment <deployment-url>
vercel logs --deployment <deployment-url> --level error --limit 50
```

DB 적용과 production 승격은 아래 명령을 포함하므로, 이 문서의 범위를 벗어난 외부 쓰기다.

```bash
supabase db push --linked
supabase functions deploy <function-name> --project-ref <production-ref>
vercel promote <deployment-url>
```

## 승인 판정

`APPROVE ship` 또는 `release-ready`로 전환하려면 다음 모두 필요하다.

- [ ] 배포 전: Invalid access token을 해소한 staging E2E가 skipped 없이 종료한다.
- [ ] 배포 전: staging 관리자 인증 DOM 검증과 Kakao OAuth·Toss callback의 실제 범위가 증거로 닫힌다.
- [ ] 배포 전: pipeline-state.v2의 QA 산출물이 `approved`이며, approved_artifacts 핀과 release manifest `ships`가 일치한다.
- [ ] 배포 전: production migration list와 Function list가 적용 계획과 일치한다.
- [ ] 배포 시: 후보 version을 package/VERSION/RELEASE/runtime identity에 조립하고 artifact drift를 해소한다.
- [ ] 배포 후: production promotion 뒤 canonical URL의 runtime identity 및 핵심 production smoke를 직접 관찰한다.
- [ ] 배포 후: RELEASE/CHANGELOG/제품현황/QA 기록을 이번 release로 갱신한다. 이 항목은 현 과제의 쓰기 허용 범위 밖이다.

위 항목 중 하나라도 미충족이면 **`NOT_RELEASE_READY`를 유지하고 배포하지 않는다.**

## 참고한 운영 원칙

Vercel은 preview를 production으로 promote하기 전 deployment health/log 검사를 제시하며, rollback은 이전 production deployment의 domain 재지정으로 동작한다고 설명한다. Supabase는 이미 production에 적용한 migration을 reset하지 말고 forward migration으로 보정하라고 권고한다. 이 문서는 그 원칙을 적용하되, Vercel/Supabase 실제 운영 상태를 확인했다는 뜻은 아니다.

기반 포맷: `RELEASE.md`의 해낼게 2.0.0 매니페스트 및 `~/.claude/standards/release-and-artifacts.md`.

KNOWLEDGE_QUERY: ship 단계 BRAIN 렌즈는 이 작업 환경에서 별도 조회 도구가 제공되지 않아 0건. Vercel promote/rollback과 Supabase production migration forward-fix를 공식 웹에서 조회했다.
HITS_USED: Vercel official promote/rollback 문서는 staged promotion과 rollback의 코드 복구 경계를 위해 채택. Supabase official migration 문서는 production DB를 down migration이 아닌 forward fix로 다루기 위해 채택.
HITS_REJECTED: 기존 2.0.0 RELEASE/CHANGELOG는 과거 운영 이력이라 이번 후보의 QA·버전 증거로 사용하지 않았다.
CONFLICTS: 없음. 다만 Vercel rollback은 코드/도메인만 되돌리고 Supabase DB는 전진 수정이라는 비대칭이 있어, 코드 rollback만으로 복구 완료라 선언하지 않는다.

SOURCES/MODEL: gpt-codex/GPT-5 | `pipeline-state.v2.md`, `RELEASE.md`, `docs/qa/qa-tracker-v2-social-viral-loop.md`, `.goal/runs/final-qa-20261102/`, `.goal/runs/final-qa-20261102-ci-social-job.log`, `~/.claude/standards/release-and-artifacts.md`, [Vercel promote](https://vercel.com/docs/deployments/promote-preview-to-production), [Vercel rollback](https://vercel.com/docs/instant-rollback), [Supabase migration guidance](https://supabase.com/docs/guides/local-development/declarative-database-schemas)
SKILLS_USED: ship — 릴리스 후보의 신원·검증·복구 게이트 구조에 사용.
SKILLS_SKIPPED: 없음.
PRESENTATION_CHECK: 태그 잔재 없음 확인 / Markdown 구조 확인함.
