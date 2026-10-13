---
# pipeline-state.v2.md — Stage Controller 런타임 상태 (V2 소셜 바이럴 루프 라인)
# 라인 분리 근거: 회장 2026-10-13 "지금 V2 는 이전과 다르게 새로운 v2 pipeline 만들어서 진행하도록 해".
# v1 환전 라인은 pipeline-state.core.md 가 계속 소유한다. 두 파일은 서로 덮지 않는다.
# 규약 = ~/.claude/standards/state-file-convention.md §라인
project: haenael-ge
line: v2
repo: /Users/sj/sj_code_master/haenael-ge
pipeline_version: 1
controller: claude
current_stage: qa           # 2026-10-13 build 승인(회장 "계속 진행해 개발 다음 qa 그다음 배포잖어") 후 qa 진입.
approved_stages: [plan, design, eng-design, build]
stage_timestamps:
  plan:       { completed: 2026-10-13 10:20 }
  design:     { completed: 2026-10-13 10:20 }
  eng-design: { completed: 2026-10-13 10:20 }
  build:      { entered: 2026-10-13 10:20, completed: 2026-10-13 17:12 }
  qa:         { entered: 2026-10-13 17:12 }
  ship:       { }
release_train: 2.0
distribution:
  selected:
    - { channel: web, priority: primary, reason: "D-018 웹 우선. SSR 가능·즉시 배포·심사 없음" }
    - { channel: appintoss, priority: secondary, reason: "D-018 모바일 2차. CSR 전용·심사 필요" }
release_targets: []
approved_artifacts:
  plan:
    - { path: docs/plan/haenael-v2-blueprint-v1.0.0-opus48.md, version: 1.0.0, status: approved, label: "V2 청사진" }
  design:
    # v2 소셜 바이럴 루프 라운드 (2026-09-16 ~ 2026-10-12). core 라인에서 이관.
    - { path: docs/design/prototypes/social-viral-loop-v2-opus48.html, version: 2.0.0, status: approved, label: "소셜 바이럴 루프 v2 프로토타입(하단탭·모션 포함)", sha256: cf4a78fe7041c00f8f4336fcbbb3107f2230f404b1f1116840dcaf469bdb9626 }
    - { path: docs/design/prototypes/core-viral-motion-shotgun-v1-opus48.html, version: 1.0.0, status: approved, label: "바이럴 모션 샷건", sha256: a5d87276065b4bd4968ac201f11b259f437aa1dc9b43f4886b5ddf78051122b2 }
    - { path: docs/design/motion-concepts-haenael-ge.html, version: unversioned, status: approved, label: "모션 컨셉", sha256: 42abb59bf55b514f2388f0de8ce935c46bcf56e67a6fac7a3c6bb56aeb442690 }
    - { path: docs/design/prototypes/screen-inventory-v3.md, version: 3.0.0, status: approved, label: "화면 인벤토리 v3", sha256: a61efc9fdfce3e8643895661706c229f8882dc9ecd1176fcef291e9c085aa267 }
    - { path: docs/design/prototypes/ui-evidence-friends-invite.txt, version: unversioned, status: approved, label: "친구·초대 화면 실측 증거", sha256: 8e40b2440152cf68f07b5973c0ea0c1eeca1e57f8721aedbedddd50c2b7a91e2 }
    - { path: docs/design/prototypes/ui-evidence-landing-wordmap-i18n.txt, version: unversioned, status: approved, label: "랜딩·워드맵 다국어 실측 증거", sha256: a71a49d17dc4475d30308516a0c2f423bc8285256d288097ac5691e016d227e8 }
  eng-design:
    # V2 웹 우선 슬라이스 설계 (2026-10-13, Codex tech-architect). 거버넌스 D-018·D-019.
    - { path: docs/eng-design/fdd-social-viral-loop-web-first-v1.1.0.md, version: 1.1.0, status: approved, label: "V2 웹 우선 기능설계", sha256: 13d9b717e839020198b2a1d4f9abda6ad0d021c8a980efa804df08e9c06acc8f }
    - { path: docs/eng-design/erd-social-viral-loop-web-first-v1.1.0.md, version: 1.1.0, status: approved, label: "V2 웹 우선 데이터 구조", sha256: df77ccfe23ba369a28854355fafe7260b5a9e7bba5a8ed515c93449f23d37109 }
    - { path: docs/eng-design/api-contract-social-viral-loop-web-first-v1.1.0.md, version: 1.1.0, status: approved, label: "V2 웹 우선 서버 함수 계약", sha256: ab54f04fd13fa3d8fd4ca256a2d37c113bea89995d344bbacc0491d760b0ba0c }
    - { path: docs/eng-design/architecture-social-viral-loop-web-first-v1.1.0.md, version: 1.1.0, status: approved, label: "V2 웹 우선 시스템 구성도(다이어그램 7종)", sha256: b2a7f81a68583886cd39e81b4462f976b020cd0fbb8297e772ca8675cc6bff71 }
    - { path: docs/eng-design/test-plan-social-viral-loop-web-first-v1.1.0.md, version: 1.1.0, status: approved, label: "V2 웹 우선 테스트 계획", sha256: 78a945e1061448af7a56356485d2c39f301f06bcb370cd8c60ea39c8f24bc7cd }
  build:
    - { path: docs/build-log.md, version: unversioned, status: approved, label: "V2 build 구현·검증 로그(1차+2차 슬라이스)", sha256: e3612a5a434123d1d39cf1a14fb1b8951f0843241148e046de3eb7fbb19af100 }
    - { path: supabase/migrations/20261013050000_social_viral_loop_web_first.sql, version: unversioned, status: approved, label: "V2 소셜 스키마(운영 미적용)" }
    - { path: supabase/migrations/20261013060000_social_my_page_achievements.sql, version: unversioned, status: approved, label: "마이페이지·업적 집계(운영 미적용)" }
  qa: []
  ship: []
stages:
  plan:       { status: approved, artifacts_ok: true }
  design:     { status: approved, artifacts_ok: true }
  eng-design: { status: approved, artifacts_ok: true }
  build:      { status: approved, artifacts_ok: true }
  qa:         { status: in-progress, artifacts_ok: false }
  ship:       { status: todo, artifacts_ok: false }
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
| 하단탭 4개(홈·친구·초대·마이) | 마이페이지 전체 기능 |
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

### build ⏳ (in-progress)
- [ ] additive migration (친구·초대·커버·공개범위 테이블)
- [ ] RPC·엣지 함수 (`create_friend_invite`·`friend_goal_detail`·`my_friend_goals`·`set_goal_cover_preset`·`update_member_preferences` 이름 유지)
- [ ] pgTAP 통과
- [ ] 웹 화면 (`/me/goal/[id]`·`/friends`·`/friends/[friendId]`·`/invite`·`/invite/[token]`·`/admin` 커버 검수)
- [ ] 하단탭 4개
- [ ] 환전 회귀 테스트 그대로 통과

### qa ⬜
### ship ⬜

## 승인 로그 (append-only · 최신순)

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
