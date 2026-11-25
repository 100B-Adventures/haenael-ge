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
  plan:       { status: awaiting-approval, artifacts_ok: false }
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
### plan  ⏳ (in-progress, 미승인)
<!-- 경로는 product-lane.yaml stages.plan.artifacts 기준(docs/plan/…)으로 바로잡음. 템플릿의 docs/ 바로 아래 경로는 이 저장소 구조와 다르다 -->
- [x] docs/plan/prd-haenael-ge-v0.5.2-claude-opus-20261126-0027.md — 비평 사이클 2 반영판(G1~G8). 2.5 = 주인 공유·결과 화면·인앱, 결과 알림톡은 착수 조건 뒤(회장 Q2 추천 A). one-thing·persona·risks 개정안은 부록 A~C(원본 개정 = 컨트롤러, plan 승인 전)
- [x] docs/plan/prd-haenael-ge-v0.5.1-claude-opus-20261126-0010.md — 이력(사이클 2 GO-with-changes)
- [x] docs/plan/prd-haenael-ge-v0.5.0-claude-opus-20261125-2344.md — 이력(사이클 1 GO-with-changes)
- [ ] docs/plan/one-thing.md — v0.5.0 §15.12 대로 "해냄 인증 범위 밖" 줄 개정 필요(미착수)
- [ ] docs/plan/persona.md — B-1 결핍 한 줄 추가 필요(미착수)
- [ ] docs/plan/bm.md — 변경 없음 판정(§15.12), 승인 시 v0.4 계승 핀으로 처리
- [ ] docs/plan/risks.md — R-1 알림톡 영구 중지·R-3 실패 수치심 신설 필요(미착수)
- [x] docs/plan/references/cheer-result/refs.json — 벤치마크 7건 + 캡처 7장
- [ ] 회장 질문 Q1·Q2(PRD §15.14) 회수 · 2.4.x qa-tracker 선행 3건 등록 확인 · feature-drop-check(v0.5.2 OK 11-26 00:3x)

<!-- design/eng-design/build/qa/ship 체크리스트는 /pipeline 이 단계 진입 시 stages.yaml artifacts 로 자동 생성 -->

## 승인 로그 (append-only)
<!-- /approve 가 한 줄씩 추가: "YYYY-MM-DD HH:MM KST — <stage> APPROVED — <note> (artifacts: <pinned>)" -->
2026-11-25 23:5x KST — plan DRAFT SUBMITTED(미승인) — prd-architect(claude-opus-5-5)가 PRD v0.5.0 §15 응원 결과 공유 초안과 레퍼런스 팩 7건을 냈다. 추천 = 안 A(결과 화면 + 공유 카드, 알림톡 텍스트 1종 신청자 한정 1회). 회장 결정 3건(기존 응원자 알림톡, 실패 결과 공개 기본값, 템플릿 심사 제출) 대기. 다음 = plan-critic 비평. (artifacts: docs/plan/prd-haenael-ge-v0.5.0-claude-opus-20261125-2344.md, docs/plan/references/cheer-result/refs.json)
2026-11-26 00:1x KST — plan REVISION SUBMITTED(미승인) — prd-architect(claude-opus-5-5)가 비평문 critic-cheer-result-prd-v0.5.0-claude-opus-20261126-0010.md(GO-with-changes, MAJOR 8·MINOR 7) 필수 수정 F1~F11 을 반영한 v0.5.1 을 냈다. 컨트롤러 결정 1=A·2=A 반영, 안 E(주인 직접 카톡 공유) 1차 추천 후보, 알림톡 3단 켜기, 운영 실측 분모(진행 중 3, 8주 안 마감 1)로 kill-criteria 재작성, 앱 푸시 향후 채널. 회장 질문 Q1(1차 전달 수단)·Q2(정지 위험 수용·단계 켜기·지금 심사 제출). 다음 = 재비평 사이클 2. feature-drop-check OK. (artifacts: docs/plan/prd-haenael-ge-v0.5.1-claude-opus-20261126-0010.md)
2026-11-26 00:3x KST — plan REVISION SUBMITTED(미승인) — prd-architect(claude-opus-5-5)가 비평 사이클 2(critic-cheer-result-prd-v0.5.1-claude-opus-20261126-0020.md, GO-with-changes, MAJOR 5·MINOR 7) G1~G8 을 반영한 v0.5.2 를 냈다. Q2 추천 교체(2.5 는 결과 알림톡 제외, 착수 조건 T1 신청 목표≥3·4주 안 마감 1 / T2 앱 푸시), 다시 열 항목 RO-1~4(운영 실결제 시험·대체 버튼 경로·템플릿 문구·동의항목 문구), 2.4.x 선행 3건 등록 위치 참조(haenael-ge-d057 docs/qa/qa-tracker.md, 00:27 grep 0건 = 등록 미확인), 법률 검토 R-12 복원, serverCallbackArgs eng-design 시험 항목. feature-drop-check OK, 이름 검사 통과. (artifacts: docs/plan/prd-haenael-ge-v0.5.2-claude-opus-20261126-0027.md)

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
- 2026-11-26 00:3x KST — plan AWAITING — PRD v0.5.2(critic 2회 반영). 남은 것: 회장 Q1(주 전달 경로)·Q2(결과 알림톡 착수 시점), one-thing/persona/risks 부록 A~C 반영, 2.4.x 선행 조건 qa-tracker 행 번호. 컨트롤러 결정 D-058.
