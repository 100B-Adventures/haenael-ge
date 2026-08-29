# Core Cashout 30/27 Clean Frames v1.0.0

STAMP: line=core · 생성=2026-08-29 04:34 KST · model=gpt-codex · agent=product-designer · skills=pipeline · source=`docs/prototype/core-cashout-30-27-v1-gpt-codex.html` v1.0.0 · query=`clean=1&data=boundary` · 고민=QA가 프로토타입 콘솔이나 설명 주석을 제품 UI로 오인하지 않도록 순수 화면만 고정했다.

| 파일 | 화면 | 실제 픽셀 | SHA-256 |
|---|---|---:|---|
| `core-cashout-30-27-form-390-v1-gpt-codex.png` | 신청, 30/27 | 390×1104 | `c113af1fe7b25f3a0609552356ef06abce7473350405b8e70869d15f2549ccbc` |
| `core-cashout-30-27-form-1024-v1-gpt-codex.png` | 신청, 30/27 | 1024×768 | `0481dcea415e27cac8eabde2fb3189e512521b0cc5b02493667bff58661acd06` |
| `core-cashout-30-27-confirm-390-v1-gpt-codex.png` | 확인, 30/27 | 390×844 | `3cb1f3b2993bca0578dcf01aae62163e6831bdb9ed33f7343728b71147d7b48d` |
| `core-cashout-30-27-confirm-1024-v1-gpt-codex.png` | 확인, 30/27 | 1024×768 | `06156d29d0d50df2ae9e2fbc2abeda74124a26adb57bd531f2f541b13a192d37` |

검증: Chromium headless 실렌더. 네 clean frame 모두 pageerror 0, `.frame.scrollWidth === .frame.clientWidth`, `body.scrollWidth === viewportWidth`. 이어서 390·1024 × 신청·확인·제출중·접수 × 0건·30/27·대량의 24조합을 순회했고 실패 0건이었다. 신청 화면의 30/3/27과 실입금 23,238원, 확인 화면의 27개 잠금과 입금 완료 시 차감 카피를 직접 관찰했다.

SKILLS_USED: pipeline, clean frame 게이트 계약 적용

SKILLS_SKIPPED: design-review 스킬이 현재 세션에 제공되지 않아 Chromium 실렌더, DOM 치수, 육안 대조로 검증

SOURCES/MODEL: gpt-codex · `docs/prototype/core-cashout-30-27-v1-gpt-codex.html` · `docs/design-spec-core-cashout-30-27-v1-gpt-codex.md` · `DESIGN.md` v2.0.1
