# 디자인 진입점

status: v2-build-rework local-verified, production-not-deployed
updated: 2026-10-25

이 폴더가 해낼게 디자인 자료의 canonical 경로다. 전체 규칙의 정본은 이 폴더의 `DESIGN.md`가 가리키는 레포 루트 `DESIGN.md`다. 기존 `docs/design/WIREFRAMES/`, `artifacts/`는 보존하며 아래 문서에서 연결한다. 기존에 `docs/user-flow.md`에 있던 전수 플로우는 이 폴더의 `user-flow.md`로 승격했다.

## 지금 무엇이 current 이고 무엇이 target 인가

| 구분 | 무엇 | 경로 |
|---|---|---|
| **target (승인됨)** | V2 소셜 바이럴 루프 프로토타입 3.0.0. 회장 지적 11건(D-031)과 D-041 반영본 | `prototypes/social-viral-loop-v3-opus5.html` |
| 심사 보드 | 전/후 대조 + 모션 GIF + 화면별 메모·선택 + 전체 일괄 복사 | `boards/v2-design-revision-v2-opus5.html` |
| 판정표 | 지시 대 반영 전수표, 기계 실측, design-review 등급 | `../qa/v2-design-revision-v5-opus5.md` |
| 지난 판 | v2(2026-10-16 01:5x 2차 지시 반영분). 대조용으로만 쓴다 | `prototypes/social-viral-loop-v2-opus48.html` |
| current (로컬 build 재작업) | 승인 프로토타입 3.0.0과 기술설계 1.2.5를 반영한 제품 코드 | `web/src` |
| 로컬 최신 검증 증거 | Next.js production build, Playwright E2E 소셜 15건+다중 목표 2건, 최종 390·1280 캡처 20장. Vitest 전체 실행은 407건 중 406건 통과 후 실패 테스트 파일 3/3 표적 재검증 | `../qa/evidence/v2-goal-20261024/web-build-ui-rework-final4-20261025-0254.log`, `../qa/evidence/v2-goal-20261024/e2e-ui-rework-final2-20261025-0226.log`, `../qa/evidence/v2-goal-20261024/e2e-ui-rework-final2-multigoal-20261025-0229.log`, `../qa/evidence/v2-goal-20261024/captures-ui-rework-final-all-20261025-0245/` |
| current (운영 배포) | 릴리스 2.0.0. 이번 로컬 재작업은 아직 운영에 배포하지 않았다 | `../../RELEASE.md` |

**V2 는 build 재작업 단계다.** `pipeline-state.v2.md`의 2026-10-19 design 승인과 2026-10-20 기술설계 1.2.5 승격을 기준으로 구현했다. 로컬 최신 증거는 Next.js production build, Playwright E2E 17건과 최종 화면 캡처 검증이다. Vitest는 전체 실행 407건 중 406건 통과 뒤 오래된 커버 테스트를 교정해 해당 파일 3/3을 통과시켰다. 이번 수정의 staging 및 운영 배포는 아직 하지 않았다.

## 읽는 순서 (디자인 착수 0스텝)

1. 이 파일 — 지금 current 와 target
2. `ui-architecture.md` — 공유 셸·화면군·내비게이션·반응형 규칙 (개별 화면보다 먼저)
3. `screen-inventory.md` — 화면 ID·역할·상태·viewport
4. `captures/`의 manifest, 그리고 최신 작업 캡처는 `boards/shots/v2-design-revision-v2/`

## 규칙 문서

- 전체 규칙: `DESIGN.md`
- 구조: `ui-architecture.md`
- 화면 목록: `screen-inventory.md`
- 흐름: `user-flow.md`
- 하단탭 노출 기준: `standard-bottom-tab.md` (하단탭 유지 화면에 전역 푸터 금지가 7항)
- UX writing·줄바꿈: `standard-ux-writing.md`
- 워드맵 키워드 추출: `standard-wordmap-keyword.md`
- 친구 관계 방향 표기: `standard-friend-relationship-direction.md`

## 회장 지시 원문 박제

- `chairman-directives-v2-20261015.md` — 1·2차 화면별 지시(D-025·D-026)
- `chairman-board-memos-20261016.md` — 보드 메모 8건(D-027)
- `chairman-board-memos-20261017.md` — 보드 메모 11건(D-030)
- 2026-10-18 회장 프로토타입 직접 검수 지적 11건(D-031) = `wiki/거버넌스/요청.md` 최신 블록, 반영표 = `../qa/v2-design-revision-v5-opus5.md`

## 캡처 규격

390 CSS px × deviceScaleFactor **3 이상**(물리 1170px), 전체 스크롤 풀페이지. 1배 캡처는 `capture-res-check.sh` 가 반려한다(D-026-G). **모션이 있는 화면은 GIF 를 함께 낸다.** 정지 캡처로는 모션을 판정할 수 없다(D-027-A).

**출고 전 기계 검사(2026-10-19 신설).** 프로토타입을 회장께 올리기 전 아래를 돌리고 전부 통과해야 한다. 안 돌리고 올린 것이 10-18 지적 11건의 직접 원인이다.

```
node scripts/qa/lint-prototype-overflow.mjs <프로토타입> --shell     # 넘침·고아 줄바꿈 0건
node ~/.claude/harness/bin/verify-prototype-css.mjs <프로토타입>      # 미적용 class 0종
node scripts/qa/measure-motion-v4.mjs <프로토타입> [화면...]          # 모션 미달 0
bash ~/.claude/harness/bin/check-prototype-changelog.sh <프로토타입>  # 화면별 변경점 패널
```

현재 실제 배포 baseline 은 역할·viewport 별 조인이 끝나지 않아 여전히 미검증이다. V2 프로토타입은 390 만 실측했고 1024·1440 은 미확인이다.
