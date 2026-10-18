# 디자인 진입점

status: v2-design-revision-5 awaiting-chairman-review
updated: 2026-10-19

이 폴더가 해낼게 디자인 자료의 canonical 경로다. 전체 규칙의 정본은 이 폴더의 `DESIGN.md`가 가리키는 레포 루트 `DESIGN.md`다. 기존 `docs/design/WIREFRAMES/`, `artifacts/`는 보존하며 아래 문서에서 연결한다. 기존에 `docs/user-flow.md`에 있던 전수 플로우는 이 폴더의 `user-flow.md`로 승격했다.

## 지금 무엇이 current 이고 무엇이 target 인가

| 구분 | 무엇 | 경로 |
|---|---|---|
| **target (심사 대기)** | V2 소셜 바이럴 루프 프로토타입 — 회장 지적 11건(D-031) 반영 5차 개정본 | `prototypes/social-viral-loop-v3-opus5.html` |
| 심사 보드 | 전/후 대조 + 모션 GIF + 화면별 메모·선택 + 전체 일괄 복사 | `boards/v2-design-revision-v2-opus5.html` |
| 판정표 | 지시 대 반영 전수표, 기계 실측, design-review 등급 | `../qa/v2-design-revision-v5-opus5.md` |
| 지난 판 | v2(2026-10-16 01:5x 2차 지시 반영분). 대조용으로만 쓴다 | `prototypes/social-viral-loop-v2-opus48.html` |
| current (운영 배포) | v1 환전 라인. V2 는 아직 제품 코드에 반영하지 않았다(D-026-A) | `web/src` |

**V2 는 design 단계다.** 회장 승인 전에는 제품 코드를 바꾸지 않는다. 승인 이후 eng-design → build 로 내려간다.

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
