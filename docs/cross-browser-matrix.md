# Cross-browser Matrix: haenael-ge core v1.2.0

STAMP: 2026-08-29 07:37 KST | model: gpt-5.6-sol | agent: qa-verifier | skill: qa | basis: dev fixture and production read-only Playwright | concern: source fixes are not production fixes until deployment.

## 판정

**BLOCKED.** Chromium·Firefox·WebKit 모두 운영 인증 `/cashout`을 HTTP 200으로 실렌더했고 `cashout_request` 전후 동일, 금지 쓰기 0을 확인했다. 그러나 현재 운영 Firefox에는 GA cookie invalid-domain과 Kakao OAuth prefetch CORS 오류가 재현된다. 소스 보정은 배포 전이므로 ship 사후검증까지 PASS가 아니다.

| 대상 | 폭 | 실렌더 | 쓰기 | 콘솔 | 증거 | 판정 |
|---|---:|---|---:|---|---|---|
| dev Chromium 13화면 | 390 | 13/13 HTTP 200 | 제품 6테이블 hash 동일 | error 0, pageerror 0 | `artifacts/qa-round2/dev-implementation-matrix/390-*.png` | PASS |
| dev Chromium 13화면 | 1024 | 13/13 HTTP 200 | 제품 6테이블 hash 동일 | error 0, pageerror 0 | `artifacts/qa-round2/dev-implementation-matrix/1024-*.png` | PASS |
| 운영 Chromium auth `/cashout` | desktop | 화면 표시 | 0 | 기존 실행 오류 0 | production auth E2E 1/1 | PASS |
| 운영 Firefox auth `/cashout` | 1280x800 | 화면 표시 | 0 | error 5, warning 2 | `artifacts/qa-round2/firefox-auth-console.json`, PNG | FAIL |
| 운영 WebKit auth `/cashout` | desktop | 화면 표시 | 0 | 기존 spec은 콘솔 미수집 | `multibrowser-results.json`, WebKit PNG | PASS_WITH_LIMIT |

Firefox의 정확한 오류는 `_ga`, `_ga_3QR2FB5BGC` cookie invalid-domain과 `kauth.kakao.com/oauth/authorize` prefetch의 `next-router-prefetch` CORS preflight 거절이다. `prefetch={false}`와 `cookie_domain=window.location.hostname` 소스 보정은 존재하지만 현재 운영 번들에는 반영되지 않았다.

## 차단과 소유자

| 소유 | 차단 | 해제 증거 |
|---|---|---|
| build/ship | Firefox 운영 오류 5건 | 배포 후 동일 script error 0, 쓰기 0 |
| QA/ship | WebKit 콘솔 수집 미포함 | 배포 후 console·pageerror listener 포함 재실행 |
| infra | GitHub Actions 실행량 2,000/2,000분 | CI 복구 또는 별도 승인된 배포검증 경로 green |

셀프심문: 세 엔진 모두 화면이 보였으니 PASS일 수 있다는 반론이 있다. 하지만 콘솔의 OAuth prefetch 실패는 실제 로그인 재진입 경로를 훼손할 수 있어 표시 여부만으로 상쇄할 수 없다.

SKILLS_USED: qa, 운영 인증 교차브라우저와 쓰기 0 검증
SKILLS_SKIPPED: 없음
SOURCES: https://playwright.dev/docs/actionability | https://vercel.com/docs/deployment-checks
MODEL: gpt-codex/gpt-5.6-sol
