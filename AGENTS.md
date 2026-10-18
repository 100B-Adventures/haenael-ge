# 해낼게 에이전트 규칙

`~/.claude/standards/venture-structure.md`와 레포 `DESIGN.md`를 먼저 읽는다. 상태·문서·캡처는 실제 관찰 근거로만 갱신한다.

## 프로토타입 출고 조건 (D-035)

프로토타입·시안을 회장께 올리기 전 아래 넷을 돌려 **전부 0건**이어야 한다. 하나라도 0건이 아니면 출고가 아니다.

```
cd web
node ../scripts/qa/lint-prototype-overflow.mjs        # 가로 넘침·고아 줄바꿈
node ../scripts/qa/lint-prototype-interact.mjs        # A 겹침·B 단일선택·C 죽은조작·D 카피·E 왕복상태 + 시나리오 (F 여백은 경고, 차단 안 함)
node ../scripts/qa/measure-motion-v4.mjs              # 모션 2축(screencast 기반)
node ~/.claude/harness/bin/verify-prototype-css.mjs <파일>   # 렌더 후 CSS 미적용 class
```

`lint-prototype-interact.mjs` 는 매 실행 전 `scripts/qa/fixtures/interact-known-defects.html` 로 자기검증을 거친다. 5축 중 하나라도 픽스처 결함을 못 잡으면 본 검사를 돌리지 않고 종료코드 2 로 멈춘다. 린트 고장과 결함 0건을 구별할 수 없으면 그 검사는 장식이기 때문이다.

`F 여백 비대칭` 은 **경고이고 차단하지 않는다.** 카드로 범위를 좁혀도 검출 8건 중 실제 결함은 1건이고 나머지는 라벨과 그 값 묶음(정상)이었다. 의도와 실수를 이 축이 구별하지 못한다. 거짓 경보를 차단 조건으로 세우면 린트 전체가 무시되므로 눈으로 판단한다. 근본 처방은 수직 간격을 spacing scale 토큰으로 정의하고 관계별 토큰 표를 `DESIGN.md` 에 등재하는 것이다(진행 중). 토큰이 서면 이 축을 "토큰 밖 값" 검사로 바꿔 차단 조건으로 올린다.

새로 발견된 결함이 여러 단계를 거쳐야 드러나는 것이면(화면 A 조작 → 화면 B 적용 → 화면 A 복귀 같은 경로) **스크립트를 새로 만들지 말고** `scripts/qa/fixtures/interact-scenarios.json` 에 시나리오 한 줄을 추가한다.
