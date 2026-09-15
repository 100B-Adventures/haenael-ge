# Security Report: haenael-ge core v1.2.0

STAMP: 2026-08-30 15:10 KST | model: claude-opus-5 | agent: 컨트롤러 직접 | basis: 배포 후 대표 주소 실측 | concern: 이전 판정이 구 번들을 근거로 열려 있었다.

## 2026-08-30 배포 후 재판정: **PASS**

이전 `SHIP_VERIFY` 두 항목이 배포로 닫혔다. 대표 주소에서 직접 관찰했다.

| 통제 | 이전 | 이번 실측 | 판정 |
|---|---|---|---|
| 운영 보안 헤더 | 구배포에서 미관찰 | `content-security-policy`·`x-content-type-options`·`referrer-policy`·`permissions-policy` 4/4 관찰 | PASS |
| `x-powered-by` 노출 | 노출 | 0건 | PASS |
| 운영 Firefox 콘솔 | error 5 | **error 0, pageerror 0** | PASS |
| 운영 WebKit 콘솔 | 미수집 | **error 0, pageerror 0** | PASS |
| production dependency | 0건 | `npm audit --omit=dev` 0건 유지 | PASS |
| 운영 인증 읽기 E2E | 1/1 | 1/1, 제품 쓰기 0 | PASS |

배포 직후 1차 실측에서는 Firefox·WebKit 콘솔에 CSP `connect-src` 위반이 새로
찍혔다. 랜딩의 카카오 로그인 링크만 `prefetch` 가 켜져 있어 Next 가 그 경로를
미리 가져갔고, 서버가 카카오로 302 하면서 크로스 오리진 요청이 우리 CSP 에
막힌 것이다. CSP 를 여는 대신 `prefetch` 를 껐다(카카오는 최상위 리다이렉트로만
쓴다). 재배포 후 0건을 확인했다.

셀프심문: 헤더 4종이 보이면 보안 PASS 인가. 그것만으로는 아니다. 의존성·인증
경로·콘솔을 함께 봤고, 이번 판정 범위는 배포된 번들의 전송 계층 통제까지다.


STAMP: 2026-08-29 07:37 KST | model: gpt-5.6-sol | agent: qa-verifier | skill: qa | basis: Next 16.3.3, local build, npm audit, contracts, DB and production read-only auth | concern: dev security PASS does not prove undeployed production headers.

## 판정

**PASS_DEV / SHIP_VERIFY.** 이전 40개 production dependency 취약점은 0으로 해소됐다. dev 회귀·build·계약과 제품 데이터 무오염도 통과했다. 운영은 아직 구번들이므로 보안 헤더와 Firefox OAuth·GA 오류를 배포 후 다시 확인해야 한다.

| 통제 | fresh 증거 | 판정 |
|---|---|---|
| production dependency | `npm audit --omit=dev --json`: low 0, moderate 0, high 0, critical 0 | PASS |
| 전체 회귀 | Vitest 44 files, 279/279 | PASS |
| production build | Next 16.3.3, TypeScript, static 16/16 | PASS |
| QA contracts | env 34/34, cashout 47/47, RAISE 13/13, notify 8/8, mutation 8/8 | PASS |
| DB·Edge | pgTAP 260, Deno 58 | PASS |
| 운영 auth 무오염 | Chromium·Firefox·WebKit `/cashout`, 금지 쓰기 0 | PASS |
| dev 제품 무오염 | 26캡처 전후 member·goal·cheer·cashout·notification·balance hash 동일 | PASS |
| dev 보안 헤더 | build worker localhost Chromium 필수 헤더 1/1 | 근거 확인 |
| 운영 보안 헤더 | 구배포에서 CSP·nosniff·referrer·permissions 미관찰 | SHIP_VERIFY |
| 운영 Firefox | GA cookie·Kakao prefetch 오류 5건 | FAIL_UNTIL_DEPLOY |

## 차단과 소유자

| 소유 | 차단 | 해제 증거 |
|---|---|---|
| ship | 최신 보안 헤더 미배포 | 대표주소 `curl -sSI`에서 CSP·nosniff·referrer·permissions, powered-by 제거 |
| ship/QA | Firefox 소스 보정 미배포 | 운영 auth와 공개 goal 경로 console error 0 |
| eng/legal | 지급 신원·세무정보 처리주체 미결정 | 수탁사 직접수집 또는 제품 암호화 저장 계약 승인 |

셀프심문: audit 0과 dev 헤더만으로 보안 PASS라 할 수 있는가. 아니다. 배포된 운영 번들이 다르므로 dev 합격과 ship 검증을 분리했다.

SKILLS_USED: qa, dependency·header·DB·브라우저 보안 계층 검증
SKILLS_SKIPPED: 없음
SOURCES: https://supabase.com/docs/guides/local-development/testing/overview | https://supabase.com/docs/guides/local-development/cli/testing-and-linting | https://vercel.com/docs/deployment-checks
MODEL: gpt-codex/gpt-5.6-sol
