---
# product-state.template.md — 제품 레인 pipeline-state 런타임 상태 골격
# `/pipeline init` 이 이 템플릿을 복사해 시드. 진실원은 이 파일.
project: haenael-ge
repo: /Users/sj/sj_code_master/haenael-ge
pipeline_version: 1
current_stage: plan            # plan|design|eng-design|build|qa|ship
approved_stages: []            # 플랫 인라인 리스트 — hook이 grep으로 읽는 단일 필드. /approve만 append.
approved_artifacts: {}         # 게이트 통과 시 핀된 버전. 예: {prd: mvp-f-v1.1.0, fdd: ai-v1.0.0, design: v0.3.0}
rejected_artifacts: []         # 회장 반려 판. [{key, path, status: rejected, reason_source: <요청 원장 파일:줄|D-번호>, date}] (state-file-convention.md, product-lane rejection_rule)
release_train: 2.5    # 응원 결과 공유(성공 인증 + 응원자 알림톡). 2.4.x 는 결제·로그인 수정
distribution:
  selected: []                 # [{channel: web, priority: primary, reason: "..."}]
release_targets: []            # ship 진입 시 카탈로그에서 자동 전개. 손으로 후보 재선택 금지.
stages:
  plan:       { status: in-progress, artifacts_ok: false }
  design:     { status: todo, artifacts_ok: false }
  eng-design: { status: todo, artifacts_ok: false }
  build:      { status: todo, artifacts_ok: false }
  qa:         { status: todo, artifacts_ok: false }
  ship:       { status: todo, artifacts_ok: false }
override: false               # 탈출구: true면 hook 게이트 우회
override_reason: ""
override_expires: ""          # ISO8601; 지나면 게이트 자동 재무장
---

# Pipeline State — haenael-ge · cheer-result(응원 결과 공유)

## 산출물 체크리스트
### plan  ⏳ (todo)
- [ ] docs/prd-*-v*.md
- [ ] docs/one-thing.md
- [ ] docs/persona.md
- [ ] docs/bm.md
- [ ] docs/risks.md

<!-- design/eng-design/build/qa/ship 체크리스트는 /pipeline 이 단계 진입 시 stages.yaml artifacts 로 자동 생성 -->

## 승인 로그 (append-only)
<!-- /approve 가 한 줄씩 추가: "YYYY-MM-DD HH:MM KST — <stage> APPROVED — <note> (artifacts: <pinned>)" -->

## Blocked / Notes
<!-- 막힌 사유·다음 액션. 다른 세션이 30초 안에 재개 가능하게. -->

<!-- release-alignment:start -->
## 배포 버전 정합 작업

- [ ] 제품 VERSION 기록
- [ ] RELEASE.md에 산출물 버전 핀과 배포 채널별 식별자 기록
- [ ] CHANGELOG.md 갱신
- [ ] 실제 배포물에서 release, commit, build_id, built_at, channel 확인
- [ ] approved_artifacts가 release_train MAJOR.MINOR와 같은지 대조
- [ ] 수정된 상류 산출물 PATCH 상승 또는 upstream_unchanged_reason 기록
<!-- release-alignment:end -->
- 2026-11-25 23:4x KST — plan OPENED — 회장 원문(wiki/거버넌스/요청.md 2026-11-25 23:3x 블록) "응원 결과를 올리고, 응원한 사람들에게는 알림톡 전달 … 파이프라인 새로파서 버젼올리고". existing_product_rule 예외: 새 사용자 흐름·새 알림톡 템플릿(카카오 심사)이 들어가 plan·design 을 건너뛰지 않는다. 기준 PRD = docs/plan/prd-haenael-ge-v0.4.0.md, 다음 판 v0.5.0.
