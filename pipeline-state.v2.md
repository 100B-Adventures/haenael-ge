---
# pipeline-state.v2.md — Stage Controller 런타임 상태 (V2 소셜 바이럴 루프 라인)
# 라인 분리 근거: 회장 2026-10-13 "지금 V2 는 이전과 다르게 새로운 v2 pipeline 만들어서 진행하도록 해".
# v1 환전 라인은 pipeline-state.core.md 가 계속 소유한다. 두 파일은 서로 덮지 않는다.
# 규약 = ~/.claude/standards/state-file-convention.md §라인
project: haenael-ge
line: v2
repo: /Users/sj/sj_code_master/haenael-ge
pipeline_version: 1
controller: codex
current_stage: qa
approved_stages: [plan, design, eng-design, build]
stage_timestamps:
  plan:       { completed: 2026-10-13 10:20 }
  # 2026-10-19 04:1x design 승격. 회장 1차 조건부 승인(D-036)의 조건이 충족됐다.
  #   6차 개정 R1~R10 반영 + 출고 검사 6종을 컨트롤러가 직접 순차 실행해 전부 통과했다.
  #   핀을 v2-opus48 에서 v3-opus5 로 옮기고 sha256 을 재계산했다(낡은 핀은 아래 superseded 로 남긴다).
  design:     { completed: 2026-10-13 10:20 }
  eng-design: { completed: 2026-10-13 10:20 }
  build:      { entered: 2026-10-20 15:40, completed: 2026-10-25 13:23 }
  qa:         { entered: 2026-10-25 13:23 }
  ship:       { status: not-entered }
release_train: 2.0
distribution:
  selected:
    - { channel: web, priority: primary, reason: "D-018 웹 우선. SSR 가능·즉시 배포·심사 없음" }
    - { channel: appintoss, priority: secondary, reason: "D-018 모바일 2차. CSR 전용·심사 필요" }
release_targets:
  - { release: 2.0.0, channel: web, url: https://haenael-ge.vercel.app, deployed: 2026-10-14 00:56, health_version: 2.0.0 }
approved_artifacts:
  plan:
    - { path: docs/plan/haenael-v2-blueprint-v1.0.0-opus48.md, version: 1.0.0, status: approved, label: "V2 청사진" }
  design:
    # v2 소셜 바이럴 루프 라운드 (2026-09-16 ~ 2026-10-12). core 라인에서 이관.
    - { path: docs/design/prototypes/social-viral-loop-v3-opus5.html, version: 3.0.0, status: approved, label: "소셜 바이럴 루프 v3 프로토타입(6차 개정 + D-041 확정 반영 PATCH)", sha256: afca1c0374e5c7f7df6e874e41be3f59f6463b2b256f5e2c4e6fef6b24d5de9a }
    - { path: DESIGN.md, version: unversioned, status: approved, label: "디자인 시스템(수직 간격 토큰·접기 규칙·상호작용 출고 검사 신설)", sha256: 7a4eea086b63c4d61a75ee850843a19e8170fafe91eefd21b21ffe92772db4d5 }
    - { path: docs/design/standard-ux-writing.md, version: unversioned, status: approved, label: "UX 라이팅 말투 규칙", sha256: 06e4ba1007bbb37c552d6c56a4fdfe4abbe86bcc06c9776dc4579b009fe26ece }
    - { path: docs/design/prototypes/social-viral-loop-v2-opus48.html, version: 2.0.0, status: superseded, label: "소셜 바이럴 루프 v2 프로토타입(v3 로 대체됨 2026-10-19)", sha256: cf4a78fe7041c00f8f4336fcbbb3107f2230f404b1f1116840dcaf469bdb9626 }
    - { path: docs/design/prototypes/core-viral-motion-shotgun-v1-opus48.html, version: 1.0.0, status: approved, label: "바이럴 모션 샷건", sha256: a5d87276065b4bd4968ac201f11b259f437aa1dc9b43f4886b5ddf78051122b2 }
    - { path: docs/design/motion-concepts-haenael-ge.html, version: unversioned, status: approved, label: "모션 컨셉", sha256: 42abb59bf55b514f2388f0de8ce935c46bcf56e67a6fac7a3c6bb56aeb442690 }
    - { path: docs/design/prototypes/screen-inventory-v3.md, version: 3.0.0, status: approved, label: "화면 인벤토리 v3", sha256: a61efc9fdfce3e8643895661706c229f8882dc9ecd1176fcef291e9c085aa267 }
    - { path: docs/design/prototypes/ui-evidence-friends-invite.txt, version: unversioned, status: approved, label: "친구·초대 화면 실측 증거", sha256: 8e40b2440152cf68f07b5973c0ea0c1eeca1e57f8721aedbedddd50c2b7a91e2 }
    - { path: docs/design/prototypes/ui-evidence-landing-wordmap-i18n.txt, version: unversioned, status: approved, label: "랜딩·워드맵 다국어 실측 증거", sha256: a71a49d17dc4475d30308516a0c2f423bc8285256d288097ac5691e016d227e8 }
  eng-design:
    # V2 웹 우선 슬라이스 설계 v1.2.5 (2026-10-20 승격). 6차 개정 요구 R1~R10 + 거버넌스 3건 반영.
    # 회장 지시로 승격했다. Codex 재검수 8차까지 돌았고 설계 실체는 v1.2.4 에서 섰다. 미해소 지적은 build 선행 과제로 이관(아래 승인 로그).
    - { path: docs/eng-design/fdd-social-viral-loop-web-first-v1.2.5.md, version: 1.2.5, status: approved, label: "V2 웹 우선 소셜 루프 FDD(요구 추적성·비회원 계약·정리 경로)", sha256: 3a628e7993763b81b7c4727dc1c6982d34984724dd15537f694b44f1a3c6d4db }
    - { path: docs/eng-design/erd-social-viral-loop-web-first-v1.2.5.md, version: 1.2.5, status: approved, label: "데이터 구조와 정리 계약(큐 점유·lease·소유권 토큰·함수 4종)", sha256: 12f277238aed5ad2033f23e54132d9ca682894f6dfd14d0d50abda8e82c777f7 }
    - { path: docs/eng-design/api-contract-social-viral-loop-web-first-v1.2.5.md, version: 1.2.5, status: approved, label: "API 계약(비회원 3필드·오류 형태·엔드포인트별 허용 목록)", sha256: c3799cc792b5881cf8d8c9e14570c17e5687144acb17a75aadb41f6ced700662 }
    - { path: docs/eng-design/architecture-social-viral-loop-web-first-v1.2.5.md, version: 1.2.5, status: approved, label: "아키텍처(공개범위 경계·인증 흐름·정리 파이프라인)", sha256: 24eac9d60ebb3e4cc482d42bba9c963b8ee2a949c0f9e2ece57a32898b60d890 }
    - { path: docs/eng-design/test-plan-social-viral-loop-web-first-v1.2.5.md, version: 1.2.5, status: approved, label: "테스트 전략", sha256: 1a5badbf8be03aae6c9ee498f1fa15a6a9e3a3788b1e9863f31408d37b80e5e2 }
    - { path: docs/eng-design/test-cases-social-viral-loop-web-first-v1.2.5.md, version: 1.2.5, status: approved, label: "테스트 케이스 56종(CV·EA·GT·AU 계열)", sha256: a0c10444ebda2b44fbf29c24c420790831697168fe136a44b4e8f021f94102f1 }
    - { path: docs/eng-design/folder-structure-social-viral-loop-web-first-v1.2.5.md, version: 1.2.5, status: approved, label: "폴더 구조와 신설 파일", sha256: 9a6e3383f7b7319d0e986f94b262a614e700cbadd753a0bb1dbf5a2917978bfe }
    - { path: docs/eng-design/design-patterns-social-viral-loop-web-first-v1.2.5.md, version: 1.2.5, status: approved, label: "설계 패턴과 쓰기 경로 규칙", sha256: 2d1db109fa08eecbd017d191e494e0404cad78a683d4632020ac801f47ffb4f6 }
    - { path: docs/eng-design/fdd-social-viral-loop-web-first-v1.1.0.md, version: 1.1.0, status: superseded, label: "[v1.2.5 로 대체] V2 웹 우선 기능설계", sha256: 13d9b717e839020198b2a1d4f9abda6ad0d021c8a980efa804df08e9c06acc8f }
    - { path: docs/eng-design/erd-social-viral-loop-web-first-v1.1.0.md, version: 1.1.0, status: superseded, label: "[v1.2.5 로 대체] V2 웹 우선 데이터 구조", sha256: df77ccfe23ba369a28854355fafe7260b5a9e7bba5a8ed515c93449f23d37109 }
    - { path: docs/eng-design/api-contract-social-viral-loop-web-first-v1.1.0.md, version: 1.1.0, status: superseded, label: "[v1.2.5 로 대체] V2 웹 우선 서버 함수 계약", sha256: ab54f04fd13fa3d8fd4ca256a2d37c113bea89995d344bbacc0491d760b0ba0c }
    - { path: docs/eng-design/architecture-social-viral-loop-web-first-v1.1.0.md, version: 1.1.0, status: superseded, label: "[v1.2.5 로 대체] V2 웹 우선 시스템 구성도(다이어그램 7종)", sha256: b2a7f81a68583886cd39e81b4462f976b020cd0fbb8297e772ca8675cc6bff71 }
    - { path: docs/eng-design/test-plan-social-viral-loop-web-first-v1.1.0.md, version: 1.1.0, status: superseded, label: "[v1.2.5 로 대체] V2 웹 우선 테스트 계획", sha256: 78a945e1061448af7a56356485d2c39f301f06bcb370cd8c60ea39c8f24bc7cd }
  build:
    - { path: docs/build-log.md, version: unversioned, status: approved, label: "D-049 구현·검증 로그", sha256: 54ed4af2e27aeae26c7d039b18e75654dd984647b4bf2a91ffa68baab84f2620 }
    - { path: docs/구현현황.md, version: unversioned, status: approved, label: "V2 구현 현황과 미검증 범위", sha256: 1ce212e96bb63a0e90e3b5c4c4e5657cc7129f683e998b6f9feee8ad40795c8b }
    - { path: docs/design/component-inventory-v1.0.0.md, version: unversioned, status: approved, label: "Storybook 컴포넌트 인벤토리", sha256: a1cd788c8a63056acfab1db6c202533772fad0f77772677e6de067df6d139384 }
    - { path: docs/eng-design/v2-prototype-server-contract-v1.0.0-gpt-codex-20261025-0653.md, version: unversioned, status: approved, label: "프로토타입 구현 서버 계약 보완", sha256: b2505912b09c4b6b4e396fdbc5d87d34f010815c202082e42322c09d0949fe6e }
    - { path: supabase/migrations/20261025010000_v2_prototype_contract_completion.sql, version: unversioned, status: approved, label: "신규 migration, staging 적용·운영 미적용", sha256: 131046072ee84a5306f6578826ff74767e0d1b4e7f2d8b4277a9819b95630999 }
  qa:
    - { path: docs/qa/v2-staging-qa-v1.0.0-gpt-codex-20261025-0815.md, version: unversioned, status: changes-requested, label: "현재 staging QA, OAuth·PG 미검증으로 승인 보류", sha256: 8cd1ad61c38198cf84012126c0c3b492c2eb438491d2f12e4e70256e187184a0 }
    - { path: docs/qa/qa-tracker-v2-social-viral-loop.md, version: unversioned, status: changes-requested, label: "현재 기능 QA 추적", sha256: c5530ad7b1bc075cc78a1c2f163acb57575a244b945de7a1348438dacfb9dea4 }
    - { path: docs/qa/design-conformance-matrix.md, version: unversioned, status: changes-requested, label: "프로토타입·staging 대조", sha256: 168de1703fce20266254dcd3fbc98294a2c577eee412051c9a496e791e12cc70 }
    - { path: docs/qa/cross-browser-matrix.md, version: unversioned, status: changes-requested, label: "Chromium·모바일 검증, 선택 브라우저 미검증", sha256: 6e2ddce27342f2b2cadc7e82a329af3040d07e45eeac46e593fe1de6a2590d55 }
    - { path: docs/qa/security-report.md, version: unversioned, status: changes-requested, label: "보안 검증과 미검증 범위", sha256: 7edd2b218baf1f1cc87f1bbc6c3bb6e60f11a9a5ac05a3a08679c99037d0d9f3 }
    - { path: docs/qa/perf-report.md, version: unversioned, status: changes-requested, label: "성능 측정 범위, Web Vitals·부하 미검증", sha256: bd842698a3cb7a27fc477842c2569ed5205320dff716f883e70742601885c092 }
  ship:
    - { path: RELEASE.md, version: 2.0.0, status: approved, label: "해낼게 2.0.0 릴리스 매니페스트" }
    - { path: CHANGELOG.md, version: 2.0.0, status: approved, label: "2.0.0 변경 기록" }
stages:
  plan:       { status: approved, artifacts_ok: true }
  design:     { status: approved, artifacts_ok: true }
  eng-design: { status: approved, artifacts_ok: true }
  build:      { status: approved, artifacts_ok: true }
  qa:         { status: in-progress, artifacts_ok: false }
  ship:       { status: todo, artifacts_ok: false }
critic_cycles:
  build:
    - { cycle: 1, critic: code-reviewer, major_findings: 0, resolved: true, chairman_qs: "asked=4 answered=4, D-049로 세 구현 선택과 무료 staging 조건 확정", evidence: docs/build-log.md }
external_integration_pending: [kakao-oauth, toss-sandbox]
override: false
override_reason: ""
override_expires: ""
---

# Pipeline State — haenael-ge V2 (소셜 바이럴 루프)

> 라인 목적: 친구와 함께 목표를 응원하는 소셜 루프를 **웹에 먼저** 배포하고, 그다음 앱인토스 미니앱으로 확장한다(D-018).
> v1 환전 라인(`pipeline-state.core.md`)과 코드를 공유하므로 **build 이후는 직렬**이다. 두 라인이 같은 `web/src` 를 동시에 빌드하지 않는다.

## 이번 슬라이스 범위

| 포함 | 제외(다음 슬라이스) |
|---|---|
| 목표 상세 `/me/goal/[id]` | 활동 타임라인 |
| 목표 커버(프리셋·커스텀·검수) | 업적·연속 기록 |
| 공개범위 3단계(공개·친구공개·비공개) | 부스트 클로버 |
| 초대 링크 생성·미리보기·수락 | 자동 이미지 모더레이션 |
| 친구 목록·친구 목표 상세·관계 해제 | 친구 추천·연락처 |
| 하단탭 4개와 프로토타입 마이페이지(소개·사진·탈퇴 문의) | 실제 계정 삭제·신규 정책 |
| 미니앱 RPC 이름 5종 호환 유지 | 앱인토스 출시·심사 |

## 불변식 (이 라인이 건드리지 않는 것)

- 환전 공제식: `fee = floor(gross*10/100)` · `vat = floor(fee*10/100)` · `withhold = floor((gross-fee-vat)*33/1000)` · `net = gross-fee-vat-withhold`
- A안 잠금 로직, advisory lock, `status='REQUESTED'` 조건, 진행 중 신청 유니크 제약
- `web/e2e/cashout-manual.spec.ts` · `supabase/tests/cashout_security_hardening.test.sql` 삭제·약화 금지
- 운영 DB에 테스트 환전 신청 생성 금지
- 거버넌스 D-017(환전은 세무 자문 결론까지 회장 계정 전용)

## 산출물 체크리스트

### plan ✅
- [x] docs/plan/haenael-v2-blueprint-v1.0.0-opus48.md

### design ✅
- [x] 프로토타입 2종(소셜 루프 v2·모션 샷건)
- [x] 모션 컨셉
- [x] 화면 인벤토리 v3 (배포 15라우트 계승 + 신규 소셜 7화면)
- [x] UI 실측 증거 2종

### eng-design ✅
- [x] 기능설계 (323행, 추적성 갭 0)
- [x] 데이터 구조 (274행)
- [x] 서버 함수 계약 (395행, 미니앱 RPC 이름 5종 유지)
- [x] 시스템 구성도 (531행, 다이어그램 7종)
- [x] 테스트 계획 (291행)

### build ✅
- [x] 무료 Supabase staging에 migration54개와 Edge Functions16개 배포, 신규 서버 계약36/36 확인
- [x] 프로토타입9화면 구현과 대조, 시안 원본 SHA 불변
- [x] Vitest78파일439건, pgTAP22파일412건, 필수 서버 계약5명령 통과
- [x] 배포 URL 기능 고유17개 통과(분할 실행 합집합), root 별도 실제 쓰기·DB 관찰
- [x] Storybook build/typecheck 통과,21 stories·9 titles, 직접 coverage7/42→8/46
- [x] 독립 코드리뷰와 교차모델 서버 보안리뷰 최종 지적0, 삭제 검사0
- [ ] 실제 Kakao OAuth·Toss sandbox 왕복은 미검증. 코드 구현과 분리해 QA에 이관

### qa ⏳
- OAuth·PG 실제 왕복 미검증으로 전체 QA 승인 불가. 현재 산출물은 changes-requested 핀이다.
- 선택 Firefox/WebKit·Web Vitals·부하 및 기존 관리자 실제 지급 브라우저 경로는 미검증 범위로 문서에 명시.
### ship ⬜
- 운영 배포·운영 DB 변경·실결제 미실행. 2026-10-14 릴리스 기록은 과거 이력이며 이번 승인 근거가 아니다.

## 승인 로그 (append-only · 최신순)

### 2026-10-25 13:23 KST · build 재검증 승인, qa 진입. QA·ship 미승인

- 승인자: Codex controller. 회장의 개발·QA GOAL 진행 지시와 D-049 구현 정본 지시에 따른 가역 단계 검수다. 앞서 설명 없이 올린 구현 선택3건과 무료 staging 조건1건은 D-049로 확정됐으며 새 사용자 결정을 만들지 않는다.
- 직접 확인: 단위439, DB412, staging E2E 고유17(분할 합집합), 최신 영향9, 서버 계약5명령, 자산36/36·Edge16, Storybook21stories/9titles, component deletion0. 코드리뷰 gpt-5.6-sol과 고위험 서버 gpt-6.1-sol 최종 지적0. verify-agent-quality 각 역할 PASS. 실제 배포 runtime128파일 SHA와 작업트리 일치.
- build 입력 DESIGN/FDD/ERD의 기존 drift를 provenance와 커밋 이력에 대조한 후 현재 SHA로 정합시켰다. 최초 승인값은 approved-input-provenance.json에 보존하고 이번 대조는 build-input-pin-reconciliation-20261025.json에 기록했다. 정본 prototype SHA는 불변이다. 과거 QA 핀은 이번 판의 승인으로 사용하지 않고 현재 QA6문서를 미승인 상태로 핀했다.
- 외부 통합: Kakao OAuth와 Toss PG sandbox 실제 왕복 미검증. 로그인 화면 준비 외에 현재 사용자 행동은 없다. 전체 QA 승인과 운영 배포는 금지 유지. 선택 브라우저·부하 및 기존 관리자 지급 브라우저 미검증도 숨기지 않는다.
- 배포: dpl_6ngntmdYQpZHbo83PvuQyhbtiYvu, preview source manifest-v8. stage alias haenael-ge-v2-staging-100-b.vercel.app. operating release_targets와 ship 핀은 역사 기록이며 이번 배포가 아니다.


### 2026-10-25 07:42 KST · 기존 단계 승인 이력과 frontmatter 불일치 정정, 신규 승인 아님

- 2026-10-19 design 승격·2026-10-20 eng-design 승격은 이 파일 본문과 커밋 fbd432c에 기록돼 있으나 approved_stages/stages 상태가 과거 REOPEN 값에 머물렀다. 회장 최신 D-049 프로토타입 SSOT 지시와 기존 승격 기록에 맞춰 design/eng-design approved, build in-progress로 일치시켰다. build/qa 신규 승인을 만들지 않았다.
- FDD/ERD v1.2.5 SHA drift는 3da6c1e의 build carryover 문서 업데이트에서 발생했다. 최초 승인 SHA를 새 SHA로 몰래 교체하지 않는다. 원본 승인핀 보존, 실제 구현 보완은 docs/eng-design/v2-prototype-server-contract-v1.0.0-gpt-codex-20261025-0653.md와 신규 migration으로 추적한다. 다음 build 승격 검수 때 전체 artifact provenance를 확인한다.
- QA 사전검수 워커가 current_stage를 qa로 바꾼 것은 승인 전 상태변경이라 즉시 build로 원복했다. STATE writer는 controller이며 QA 작업 착수 자체는 단계 승인 근거가 아니다.


### 2026-10-20 20:18 KST · build 승격 **거부**. 교차 코드리뷰 BLOCK 과 dev 배포 증거 부재

- **거부 사유 2건.**
  1. `product-lane.yaml` build 절의 `dev_deploy` 증거 2종(`dev-health-200`·`smoke-happy-1pass`)이 없다. worker 스모크는 `127.0.0.1:3000` 이고 QA 는 배포된 dev 주소에서 돈다(2026-09-29 회장 확정). 로컬 대상 QA 는 `pipeline-artifact-lint.sh` 검사 H 가 반려한다.
  2. `critic_loop`(코드리뷰) 판정이 **BLOCK** 이다. 교차 모델(Claude code-reviewer, Codex 가 짠 코드이므로) MAJOR 14·MINOR 6, RUBRIC 21/25. 고위험(인증·마이그레이션)에 MAJOR 3건이 남아 있어 승인 불가다.
- **통과한 것**(기록). 컨트롤러 직접 재실행: `tsc --noEmit` rc=0 · Vitest 63파일 358/358 · `lint-doc-contradiction` 차단축 0건·H축 14/14 · `lint-requirement-coverage` A 0건 B 0건 · `component-deletion-check.sh 3da6c1e` 삭제 0건 · `verify-agent-quality.sh` PASS.
- **반려분 처리**: 15건을 `docs/eng-design/carryover-build-review-20261020.md` 레지스트리로 적립하고 같은 Codex 워커에 재위임했다(P0 5·P1 6·P2 3·P3 1). 컨트롤러 커밋 결함 3건(색 토큰)은 `07c1255` 로 직접 닫았다. 다른 11건은 hand-patch 금지(헌법 §7)라 손대지 않았다.
- **선행 조건(회장 대기)**: Supabase 접근 토큰 1건. 이 호스트의 Supabase CLI 계정에 운영 프로젝트 권한이 없다(403, 두 경로 실측). 그것 없이는 마이그레이션 적용·엣지 함수 배포·프리뷰 배포가 전부 불가하고 따라서 dev 증거를 만들 수 없다.
- **핀 경고 16건**: 승격 시 재계산한다. 지금은 승격하지 않았으므로 갱신하지 않는다.

### 2026-10-20 15:4x · eng-design 승격 (v1.2.5). 회장 지시로 왕복을 끊었다

- **회장 원문**: "꼼꼼히 하는건 좋은데 뭔 놈의 기술설계를 8차까지 가냐? 복잡한 앱도 아니고 그냥 간단한 CRU 수준인데 어이가 없네. 왜 니 응답에는 기술설계에서 뭐때문에 그렇게 도는지 설명이 단하나도 없냐? 개발해 난 이따위 수준의 기능이 기술설계를 10차까지 돌일이 아니라고 판단하는데?"
- **승격 근거**: 컨트롤러 재검증으로 차단 축 전부 0건(모순 검사 A·B·D·E·F·G·I·L 과 FS), 요구 커버리지 A 0건 B 0건(참조 테스트 ID 114개), 고유 TC 정의 56개, verify-agent-quality PASS, sha256 8종 대조 일치.
- **★Codex 판정은 RETAKE 였고 그 위에 회장 지시로 승격했다. 숨기지 않고 적는다.** 8차 15/25. 미해소 지적 3건은 아래 build 선행 과제로 이관했다.
- **왜 8차까지 돌았나(회장 질문에 대한 답)**: 설계 실체는 **v1.2.4 에서 섰다.** 4차에서 저장소 객체가 남는 허위 완료 경로, 5차에서 큐 동시성(점유·lease·소유권 토큰), 6차에서 인증 계약, 7차에서 설명과 SQL 과 테스트가 서로 다른 계약을 닫았다. **그 뒤 세 판은 문서 위생이었다** — 버전 표기, 목차 앵커, 적어 둔 수치, 제목 겹침, 증거 폴더 누락. 구현을 바꾸지 않는 것들이다. 그런데 `standard-doc-review.md` 가 **"어느 축이든 1점이면 총점 무관 반려"** 를 걸었고 정밀성 축이 문서 정합을 본다. 그래서 설계 실체가 서 있어도 오타와 수치로 전체가 반려됐다. **그 규칙이 설계 실체와 문서 위생을 구별하지 않는 것이 구조적 원인이고, 컨트롤러가 그 구분을 하지 않고 여덟 판을 돈 것이 판단 실패다.**
- **build 선행 과제로 이관한 Codex 미해소 지적**
  1. 큐의 `path` 단독 비교를 `bucket_id` + `object_path` **쌍 비교**로. 유일한 구현 계약 지적이고 설계자에게 그 1건만 고치게 했다.
  2. 다이어그램 렌더 증거 폴더 재생성. L축이 잡고 있다.
  3. 추적성 매트릭스 R2·R5 의 서버 계약 칸을 **실제 구현된 함수 목록으로** 채운다. 설계 때 글로 채우면 또 낡는다.
  4. ERD 자산 수치 불일치. H축이 14건을 세므로 **문서 수치를 지우는 쪽**으로 간다.
- **상류 핀**: 프로토타입 `social-viral-loop-v3-opus5.html` 3.0.0 · `DESIGN.md` · `standard-ux-writing.md`. D-041(시안 법적 고지 노출 설정 교정)은 승격 뒤 과제로 남는다.


### 2026-10-14 05:1x · ⟲ REOPEN design · 회장이 운영에서 확인한 불일치·기획 오류·기능 장애

**2.0.0 은 운영에 올라가 있다. 되돌리지 않았다.** 다만 아래가 닫히기 전까지 이 라인의 승인은 무효로 둔다.

1. **[기획 오류, 최상위] 친구 모델이 틀렸다.** 회장 원문 "내가 해낼게 응원하거나 응원받은 사람은 친구로 맺어지는거지." 1차 구현은 초대 링크 수락만이 친구가 되는 유일한 경로였다. D-024 로 확정: 응원 확정 시 양방향 친구, 과거 이력 소급.
2. **[기능 장애] 목표 커버 업로드가 운영에서 실패한다. 원인을 확정했다.** 엣지 함수 `goal-cover-sign-upload`, `goal-cover-finalize`, `admin-review-goal-cover` 3종이 **운영에 배포되지 않았다.** 운영 함수 목록 11개에 없다. 저장소에는 있다. 즉 화면만 올라가고 서버가 안 올라갔다. 컨트롤러가 배포 완료를 선언하기 전에 이 숫자를 세지 않은 것이 원인이다.
3. **[시안 불일치] 비회원 랜딩에 하단탭이 없다.** 랜딩(`web/src/app/page.tsx`)이 `(receiver)` 레이아웃 밖이라 잠금 탭바가 붙지 않는다. 승인 프로토타입은 비회원에게 잠금 표시가 달린 4탭을 보여준다. 랜딩 자체도 시안과 다르다는 회장 지적이 있다.
4. **[문구 결함] 구현 세부가 사용자 화면에 노출된다.** 초대 화면이 "저장소에는 SHA-256 hash만 남아요", "7일 동안 한 번" 을 그대로 보여주고, 친구 초대 카드가 "목표 공개범위를 PUBLIC 또는 FRIENDS로 바꾼 뒤" 라고 코드값을 그대로 쓴다. 사용자 언어가 아니다.
5. **[미승인 제약] 7일 초대 만료는 회장이 정한 적이 없다.** 워커가 정하고 컨트롤러가 통과시켰다. 재검토 대상이다.
6. **[설계 미반영] 마이페이지가 시안과 다르다**는 회장 지적. 승인 프로토타입 대조가 필요하다.

**컨트롤러 승인 실패 원인**: `design-conformance-matrix` 가 🔶 부분(픽셀 대조 미완)인 것을 알면서 ship 을 승인했다. 게이트가 요구한 3종 중 하나가 부분이면 그것은 미충족이지 통과가 아니다. 더해서 운영 QA 를 read-only 로만 설계해 업로드·초대 같은 **쓰기 경로를 한 번도 실행하지 않았다.**

**재오픈 범위**: design 부터. 친구 모델이 바뀌면 화면 구조와 데이터 모델이 함께 바뀐다.


### 2026-10-14 02:2x · 핀 정정 · qa 필수 산출물 3종으로 교체

- 게이트가 qa 핀에 기능(qa-tracker)과 디자인 정합(design-conformance-matrix)이 없다고 반려했다. 둘 다 실재하므로 핀했다.
- 결함 재검증 문서는 **로컬 주소 기준**이라 qa 핀에서 뺐다. qa 증거는 배포본 기준이어야 한다. 그 문서는 build 라운드 기록으로 저장소에 그대로 남는다.
- 디자인 정합은 🔶 부분이다. 두 폭 렌더·가로 넘침 0·콘솔 0 은 확인했고 **승인 원본과 동일 크기 픽셀 대조가 미완**이다. 숨기지 않고 핀 라벨에 적었다. 차기 라운드 과제다.

### 2026-10-14 00:56 · ✅ APPROVE ship · 해낼게 2.0.0 운영 배포 완료

- 릴리스 신원: `web/package.json` 2.0.0, `RELEASE.md` 2.0.0 매니페스트, `CHANGELOG.md` 2.0.0.
- **운영 실측**: `https://haenael-ge.vercel.app/api/health` 가 `version 2.0.0`, `status ok`, `database ok`. 경로 응답 = `/my` `/friends` `/invite` `/admin` 비로그인 307, `/me/goal/1` 200 권한없음 렌더, `/invite/<없는토큰>` 200 오류 분기.
- 운영 DB 마이그레이션 2건 적용 완료, 운영 read-only QA 통과(익명 14건·인증 4건, 가로 넘침 0, 콘솔 오류 0, 쓰기 0).
- 전체 브라우저 회귀 63/63, DB 테스트 323건, 단위 테스트 319건 통과.
- 환전 불변식 무변경 확인.


### 2026-10-14 00:05 · ✅ APPROVE qa → ship 진입

- 승인 근거(회장 원문): "첫째, 승인 / 둘째 구현 13px 대로 해 / read-only 자격 증명이 뭐가 없는데? 니가 찾아서 세팅해서 진행"
- **운영 DB 스키마 적용 완료.** `20261013050000`, `20261013060000` 둘 다 운영 remote 값 채워짐을 `migration list` 로 확인.
- **운영 배포 완료.** `session/core-20260912` 를 main 에 머지·푸시(130 커밋), Vercel 자동 배포. 운영에서 V2 전용 분기 응답 확인.
- **운영 read-only QA 통과.** 익명 14건(7경로 x 2폭), 인증 4건(2경로 x 2폭) 전부 가로 넘침 0, 콘솔 오류 0, page error 0. 보안 응답 헤더 유지. 운영 쓰기 0건. 하단탭 라벨 computed 13px 확인.
- **QA 가 낸 NG 1건은 컨트롤러 지시 오류였다.** 내가 수용 경로를 `/admin/covers` 로 적어 보냈는데 그 경로는 설계에도 코드에도 없다. 커버 검수는 `/admin` 안의 섹션이고(`web/src/app/admin/page.tsx` 가 `GoalCoverReviewQueue` 를 쓴다) 운영 익명 `/admin` 은 307 로 정상 분기한다. 제품 결함이 아니므로 승인을 막지 않는다. 대신 승인 로그에 원인을 남긴다.
- 품질 검증: `verify-agent-quality.sh qa-verifier` = `✅ PASS · RUBRIC 25/25`. 직전 반려(로컬 QA)는 `deploy-hosts.tsv` 에 haenael-ge 줄이 없어 생긴 오탐이었고 그 줄을 추가해 해소했다.
- 불변식 확인: 환전 수수료·A안 락·계좌 마스킹 단정 무변경, 테스트 삭제·skip·단정 약화 0건, 전체 브라우저 회귀 63/63.
- ship 잔여: 릴리스 버전 선언과 RELEASE 기록.


### 2026-10-13 18:17 · ⟲ REOPEN build · qa 반려(NG)

- qa 판정: ❌ NG. 계획 84건 중 통과 47, 부분 8, 실패 2, 미검증 27.
- 반려 사유 1 (Critical, QA-V2-SEC-01): D-019 위반. FRIENDS 커버의 비공개 경로가 인증 사용자용 서버 함수 JSON 에 그대로 담겨 나간다. 직접 read 는 RLS 로 막히지만 **Presigned URL 만 내준다는 계약**을 어긴다. 근거 = `supabase/migrations/20261013050000_social_viral_loop_web_first.sql:199,200,236,237,523`. 컨트롤러가 1차 감사에서 199행과 200행을 보고 "D-019 구현됨" 으로 판정한 것이 **틀렸다.** 경로를 분기해 담는 것과 경로를 아예 담지 않는 것은 다르다.
- 반려 사유 2 (Major, QA-V2-FLOW-01): `/friends/[friendId]?goal=` 에서 friendId 와 목표 소유자를 묶어 검증하지 않아 A 의 이름으로 B 의 목표가 표시되고 관계 해제가 A 에게 적용된다.
- 반려 사유 3 (Major, QA-V2-QA-01): 운영 모드 로컬 QA 에서 CSP 가 로컬 Supabase 를 차단해 UI E2E 가 콘솔 오류로 중단된다. QA 환경 parity 결함.
- 반려 사유 4 (Major, QA-V2-DEP-01): 운영 의존성 취약점 4건, Next 16.3.3 직접 의존 심각 1건.
- 반려 사유 5 (Major, QA-V2-COVERAGE-01): 계획 84건 중 27건이 종단 증거 없는데 선행 문서가 전체 통과처럼 적혀 있다.
- Minor 3건(QA-V2-COVER-ERR-01, QA-V2-PERF-01, QA-V2-DESIGN-01)은 같은 라운드에서 함께 처리한다.
- qa 미완 원인: 공용 작업 슬롯 상한 2 가 다른 벤처의 gradle test 와 xcodebuild 로 장기 점유돼 전체 E2E 와 1280px 실측이 미실행이다. 워커는 60초 만에 포기하고 기록했다.
- 운영 배포와 운영 DB 적용은 하지 않았다. 설계 핀은 v1.1.0 을 유지한다.


### 2026-10-13 17:12 · ✅ APPROVE build → qa 진입

- 승인 근거(회장 원문): "계속 진행해 개발 다음 qa 그다음 배포잖어"
- 설계 핀을 v1.0.0 에서 v1.1.0 으로 올림(업적 범위 해제 반영, D-022). 5종 sha256 재계산.
- 컨트롤러 재검증(자기신고 아님): 단위 테스트 52파일 311건 통과, 운영 빌드 통과와 `/my` 라우트 포함, 비로그인 `/me/goal/1` 이 권한없음 상태 렌더와 로그아웃 미노출, 없는 초대 토큰 오류 분기 렌더, 서버 오류 로그 0건.
- 워커 제출 증거: pgTAP 18파일 322건 통과, Playwright 9/9 통과, 390x844 실측(13px 미만 0, 44px 미만 누름 0, 가로 넘침 0, 콘솔 오류 0), 프로토타입 대조표 17행.
- 위임 품질 검증 PASS(Skill 3회, WebSearch/Fetch 11회, 참조조회 73회).
- 불변식 확인: 환전 수수료·마스킹 테스트 변경 0건, A안 락 무변경, 운영 DB 쓰기 0건.
- 미결 1건: 하단탭 라벨 10px 대 13px. 결정판 `docs/design/boards/tabbar-label-10-vs-13-v1.0.0.html` 로 회장에게 제시. qa 중 결정되면 그 값으로 확정한다.
- 경계: 운영 DB 마이그레이션 2건은 미적용이다. qa 승인 뒤 한 번에 적용한다.


- 2026-10-13 10:20 KST — **eng-design APPROVED** — 회장 지시 "설계 됐으면 또 codex 시켜서 다음단계 진행해". 재검증: 5산출물 존재·sha256 핀 일치, `verify-agent-quality.sh tech-architect` → PASS(RUBRIC 25/25), FDD §13 추적성 갭 0, 디자인 시안 대조(하단탭 4개 라벨 일치·프로토 프레임 S1·S3·S4 포함·S2·S5·S6 비범위 사유 명시). D-019 로 ARC-R05 해소. (artifacts: fdd·erd·api-contract·architecture·test-plan 전부 v1.0.0)
- 2026-10-13 10:20 KST — **design APPROVED** — v2 프로토타입·모션·화면 인벤토리 v3. 회장 2026-10-13 지적("동적모션이나 모바일 하단탭등 디자인 쳐놓은게 있는데 그거 버렸냐")으로 정본 확인됨. core 라인에서 이관.
- 2026-10-13 10:20 KST — **plan APPROVED** — V2 청사진. core 라인에서 이관.
- 2026-10-13 10:20 KST — **LINE CREATED** — 회장 "지금 V2 는 이전과 다르게 새로운 v2 pipeline 만들어서 진행하도록 해". core 라인의 v2 핀(design 6건·eng-design 5건)을 이 파일로 이관하고 core 는 v1 환전 라인으로 환원.

## Blocked / Notes

- **앱인토스 출시는 이 슬라이스 비범위다.** 모바일 2차 진입 전 입점 사전문의(`docs/growth/appintoss-pre-inquiry-v0.1.0.html`) 발송 여부가 회장 결정 대기다.
- **웹과 미니앱이 공유자산 0이다.** 루트 워크스페이스가 없고 `miniapp/src` 가 `web/src` 를 한 줄도 참조하지 않아 토큰·컴포넌트·스토리북이 전부 중복이다. 모바일 2차 진입 시 공통 패키지 추출이 선행 과제다.
