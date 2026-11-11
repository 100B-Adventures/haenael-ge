<!-- STAMP
created: 2026-11-12 01:58 KST
model: gpt-codex/gpt-5.1-codex
agent: code-builder
skills: haenael-supabase-build
sources: pipeline-state.v2.md, docs/plan/haenael-v2-blueprint-v1.0.0-opus48.md, docs/plan/one-thing.md, docs/design/prototypes/social-viral-loop-v3-opus5.html, docs/qa/qa-tracker.md, wiki/거버넌스/결정.md
consideration: 운영 2.1.3 이후 남은 QA 결손을 승인 시안과 staging 실측으로 닫되 운영 배포와 독립 검증의 권한 경계를 넘지 않는다.
-->

# QA 착수 브리프 v1

## 2026-11-12 03:59 KST F-1·F-2 재작업 브리프

- **목적**: 독립 검증 7차에서 확인된 성장 화면 워드맵 높이 오대조와 3폭 디자인 증거 누락을 해소해, 승인 시안과 staging 제품이 같은 계약을 쓰게 한다.
- **달성 기준**: 승인 시안 `#dopamine .wordmap.cloud`의 236px를 제품과 `SMOKE-01`에 복원하고, 피드백 상자가 스크롤 뒤 고정 하단 탭에 가리지 않고 도달 가능함을 직접 단언한다. 결제 성공·성장 화면의 390·1024·1440px 같은 폭 대조 캡처, exact source staging health, 전체 회귀 45/45, 결제 기능 비활성 복구 HTTP 503을 남긴다.
- **제약**: 운영 배포·main push·독립 검증 금지. 회귀는 1회이고 환경성 실패만 1회 재실행한다. 다른 프로세스 소유 `session-state*.md` 이동·수정과 기존 미추적 QA 산출물은 add·commit하지 않는다. 가장 어려운 지점은 이미 staging된 타 작업을 보존하면서 내 경로만 커밋하는 것이다.
- **필요한 것**: 승인 프로토타입·clean frame, 독립 검증 보고서, staging·Supabase 시험 환경 변수, 전체 회귀 스크립트가 모두 있다. 1440px 승인 렌더와 새 source 제품 캡처는 이번 회귀에서 만든다.

**이웃 영향 후보**: 결제 성공 CTA 뒤 성장 overlay, 고정 하단 탭의 스크롤 가림, `SMOKE-01` 캡처 파일명·문서 인용, 배포 source SHA, 결제 기능 비활성 복구와 fixture 정리.

**읽은 것**: `.goal/verify-20261112-0324.md`, `standard-qa-methodology.md`, 이 브리프, 승인 프로토타입의 `#dopamine .wordmap.cloud` 수치, 관련 CSS·E2E·QA 대장·매트릭스. **안 읽은 것**: 이번 버그 수정과 무관한 운영 배포 절차와 타 화면 구현 문서는 읽지 않았으므로 운영 상태는 판정하지 않는다.

## 목적

해낼게의 One Thing인 "친구가 선언한 목표에, 그 과정을 조용히 돈으로 응원한다"가 결제 완료 뒤에도 끊기지 않도록, 승인 시안과 staging의 결제 성공·성장 피드백 화면을 같은 1024px 폭에서 대조한다. 이번 QA는 운영 2.1.3 이후 남은 화면 정합·추적성 결손을 닫고, 컨트롤러가 운영 배포 여부를 판단할 수 있는 staging 결과를 만든다.

## 달성 기준

1. `paysuccess`의 세로 정렬과 `dopamine` CTA 아래 안내 박스를 승인 시안과 staging에서 같은 1024px 폭으로 직접 비교해 `동일·미세 차이·구조 결함·미판정` 중 하나로 확정한다.
2. 시안이 답한 배치 또는 계약 누락이면 제품을 승인 시안대로 수정하고, 13px 미만 글자 0을 유지한다.
3. `pipeline-state.v2.md`의 승인 시안 SHA 불일치를 커밋 이력과 실제 파일 해시로 설명하고, 핀 갱신 또는 사유 기록을 끝낸다.
4. 재사용 디자인 매트릭스 6행에 원본 PNG 경로를 기입하고, 회귀 45건의 ID·제목·목적을 `docs/qa/testcases.md`에 남기며, `.goal/runs/w12-regression-585ba55-r2` 45/45를 QA 대장에 연결한다.
5. 제품 코드 변경 시 Vitest와 디자인 토큰 lint를 통과하고, staging 배포 커밋과 health source SHA를 일치시킨 뒤 전체 회귀 45건을 한 번 실행한다. 바뀐 화면은 1024px 같은 폭 대조 캡처로 재관찰한다.
6. 작업 브랜치 `fix/v2-prod-regressions-20261108`에 커밋하고 `origin HEAD`로 push한다. 운영 배포, main push, 독립 검증은 하지 않는다.

## 제약

- 운영 배포와 main push는 컨트롤러 Claude의 후속 범위다.
- 화면 배치·문구는 승인 시안·`DESIGN.md`·`wiki/거버넌스/결정.md`가 이미 답한 범위에서 별도 승인을 묻지 않는다.
- 1023px 이하는 모바일 글자·누름 규격을 적용하고 13px 미만 텍스트를 만들지 않는다.
- 시험 데이터 Auth 계정은 `admin.deleteUser`로 정리한다.
- staging 배포 전 `projectName=haenael-ge`와 `web/.next` 부재를 확인한다.
- `CASHOUT_STAGING_TEST_*`를 포함해 기존 staging 환경 변수를 덮어쓰지 않고 병합한다.
- 기존 미추적 QA 산출물과 `session-state.harness-goal-audit.md`는 다른 작업 소유이므로 수정·커밋하지 않는다.

## 필요한 것

| 항목 | 상태 | 근거 |
|---|---|---|
| 승인 시안 | 있음 | `docs/design/prototypes/social-viral-loop-v3-opus5.html` |
| 디자인·모바일 기준 | 있음 | `DESIGN.md`, `standard-design.md` §6.0·§17.3 |
| 현재 QA 대장·매트릭스 | 있음 | `docs/qa/qa-tracker.md`, `docs/qa/design-conformance-matrix.md` |
| 최종 45건 회귀 원본 | 있음 | `.goal/runs/w12-regression-585ba55-r2` |
| staging 배포·시험 자격증명 | 존재 여부를 키 이름으로 사전 점검 | 배포 wrapper와 `before-asking.sh`를 통해 값 출력 없이 확인 |
| 1024px 시안·staging 캡처 | 기존 근거 있음, 수정 후 새 캡처 필요 | `.goal/runs/g7-independent-192x/` |

## 이번 판에서 판단할 것

1. `paysuccess` 중앙 정렬이 단순 표현 편차인지, 승인 시안의 상단 흐름을 위반한 배치 결함인지.
2. `dopamine` 안내 박스가 스크롤 밖에 있는지, 렌더 계약에서 누락됐는지.
3. 승인 시안 파일 SHA 변경이 승인 화면에 영향을 주는 변경인지, `business-info` 범위만의 승인 결정 반영인지.
4. 제품 수정 뒤 staging 전체 회귀가 45/45인지, 환경성 timeout 또는 `ERR_NETWORK_CHANGED` 재실행 규칙을 쓸 필요가 있는지.

기반 포맷: `~/.claude/pipeline/product-lane.yaml` `stage_brief_rule`.

KNOWLEDGE_QUERY: 해낼게 QA의 결제 성공·성장 화면, 승인 시안 핀, 13px 하한, staging 회귀 계약을 조회했다.
HITS_USED: `pipeline-state.v2.md`, `docs/plan/one-thing.md`, 승인 프로토타입, `docs/qa/qa-tracker.md`, D-051·D-052·D-053. 이번 판의 목표·판정 기준·권한 경계를 고정하는 정본이라 채택했다.
HITS_REJECTED: code-builder 후보 스킬 `ponytail`은 미설치·코드 미열람 상태이며 운영 전 QA 수정에 새 변인을 추가하므로 사용하지 않았다.
HITS_APPLIED: One Thing → 목적, `stage_brief_rule` → 다섯 필수 절, D-051 → 두 화면 시안 정합, `standard-design.md` §17.3 → 13px 하한·1023px 이하 규격, `release_commit_rule` → 수정 뒤 같은 커밋 staging 회귀.
CONFLICTS: 없음.
SOURCES/MODEL: gpt-codex/gpt-5.1-codex · `pipeline-state.v2.md` · `docs/plan/one-thing.md` · `docs/qa/qa-tracker.md` · `wiki/거버넌스/결정.md`
SKILLS_USED: haenael-supabase-build, 해낼게 staging 검증·테스트·문서 증거 순서를 적용했다.
SKILLS_SKIPPED: ponytail, 미설치·미검증 후보이며 이번 판에 새 실행 변인을 추가하지 않기 위해 제외했다.
