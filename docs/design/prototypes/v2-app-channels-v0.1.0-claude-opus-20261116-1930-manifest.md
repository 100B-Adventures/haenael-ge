# 앱 채널 프로토타입 v0.1.0 요약 층 (manifest)

대상: `v2-app-channels-v0.1.0-claude-opus-20261116-1930.html` (약 580KB, 52KB 초과라 이 요약을 둔다)
생성: 2026-11-16 19:30 KST · model: claude-opus · agent: product-designer · status: candidate
기반: `v2-social-viral-loop-v3.1.1-claude-opus-20261116-1855.html` 위에 앱 프레임을 얹음(D-049). 웹 화면 26개는 3.1.1 과 같은 본문이다.
인벤토리: `v2-screen-inventory-app-channels-v0.1.0-claude-opus-20261116-1930.md` · 후보 비교: `…-1930-compare.html` · 레퍼런스 팩: `../refs/app-channels-v0.1.0-claude-opus-20261116-1910/manifest.md`

## 1. 파일 안 위치 (줄 번호, 2026-11-16 19:5x 기준)

| 무엇 | 줄 |
|---|---|
| STAMP CSS | 612 |
| 콘솔 채널 칩 `#chGrp` | 2094 |
| 새 화면 `a1intro` · `a2login` · `a3push` · `a4push` · `a5invite` | 3529 · 3570 · 3608 · 3675 · 3700 |
| `a7review` · `a8offline` · `a9notif` · `a10update` · `a11delete` | 3734 · 3768 · 3792 · 3811 · 3832 |
| `t1intro` · `t3share` · `t4word` | 3872 · 3909 · 3941 |
| STAMP 바 | 4030 |
| 검수 패널 데이터 `REVIEW` | 4057 |
| 후보 기본값 `AP_CAND` | 4912 |
| 웹 화면 채널 표시 `apMarkWeb()` | 4974 |

## 2. 조작

- 채널 칩: 웹 / iOS / Android / 앱인토스. `body[data-ch]` 하나로 흐름 전체가 바뀐다.
- 상태 칩·후보 칩: 각 새 화면의 오른쪽 검수 패널. 후보가 있는 화면은 A1(기본 A), A3(기본 C) 둘.
- URL: `?ch=ios` · `?cand=a1intro:B,a3push:A` · `?bare=1` · `#<화면 id>`.
- 콘솔 "앱 v0.1.0" 그룹: A1~A11, T1, T3, T4 는 화면 이동, A6·T2(점선 버튼)는 채널을 바꾸고 웹 화면으로 이동.

## 3. 출고 검사 (2026-11-16 19:5x, design-review 수정 반영 뒤 재실행)

```
lint-prototype-overflow   화면 39개 · 가로넘침 0건 · 고아줄바꿈 0건 / 판정: PASS (0건)
lint-prototype-interact   화면 39개 · A 겹침 0 · B 단일선택위반 0 · C 죽은조작 0 · D 카피 0 · E 왕복상태소실 0 · F 여백비대칭 15(경고) / 판정: PASS (0건)
measure-motion-v4         CONSOLE_ERRORS=0 / 미달 화면=없음
verify-prototype-css      ✅ 프로토타입 CSS 통과 — 미적용 class 0종(허용 0)
check-prototype-changelog ✅ PASS(변경점 패널 있음, 항목 마커 1건, 제품 화면 침범 없음)
```

채널별 실행(직전 판, 같은 날): interact ios / android / toss 모두 PASS 0건(F 경고 17 / 17 / 9), overflow ios / toss PASS 0건.

## 4. design-review 반영 (2026-11-16 19:5x)

| 지적 | 처리 |
|---|---|
| A5 만료·이미 친구 덮개에서 상태 표시줄이 대화방 파랑으로 남음 | 덮개가 열리면 상태 표시줄도 바탕색으로(`.frame:has(> .ap-over:not([hidden])) > .statusbar`) |
| A5 대화방 안에 라우팅 설명 메모가 제품 화면처럼 들어가 있었음 | 프레임에서 제거. 같은 설명은 검수 패널 flow 줄에 있음 |
| A8·A11·A5 만료의 이모지 아이콘 | 보류. 3.1.1 마이 화면이 같은 이모지 아이콘 체계라 계승. 앱 아이콘 세트 결정 때 함께 바꾼다 |
