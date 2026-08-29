# Performance Report: haenael-ge core v1.2.0

STAMP: 2026-08-29 07:37 KST | model: gpt-5.6-sol | agent: qa-verifier | skill: qa | basis: production curl baseline and dev 26-screen smoke | concern: build success and HTTP 200 are not user-visible performance evidence.

## 판정

**BLOCKED.** dev 26화면은 390·1024에서 모두 열렸지만 Lighthouse 또는 Web Vitals와 반복부하 p95는 이번 라운드에서 측정하지 못했다. 이전 운영 5표본 전송 기준선만 유지하며 성능 PASS로 사용하지 않는다.

| 경로 | 표본 | HTTP | p50 | 최대 | 범위 |
|---|---:|---|---:|---:|---|
| 운영 `/api/health` | 5 | 200 5/5 | 0.353s | 0.915s | DB health 포함 |
| 운영 `/` | 5 | 200 5/5 | 0.302s | 0.494s | HTML 전송 |
| 운영 `/terms` | 5 | 200 5/5 | 0.308s | 0.454s | HTML 전송 |
| 운영 `/cashout` 비로그인 | 5 | 최종 200 5/5 | 0.526s | 0.549s | 최종 `/`, 환전 렌더 아님 |
| dev 13화면×2폭 | 26 | 200 26/26 | 미측정 | 미측정 | 기능 smoke, 성능 대용 금지 |

## 차단과 소유자

| 소유 | 차단 | 해제 증거 |
|---|---|---|
| QA/perf | 390·1024 LCP·INP·CLS 없음 | 공개·인증 핵심 경로 Web Vitals |
| QA/perf | read-only 반복부하 p95·오류율 없음 | 합의한 동시성·표본에서 p95와 오류율 |
| ship | 최신 배포 성능 없음 | 대표주소 배포 버전 기준 재측정 |

셀프심문: 26화면이 모두 200이면 충분히 빠른가. 아니다. 상태 코드와 렌더 성공은 응답성·레이아웃 안정성·상호작용 지연을 측정하지 않는다.

SKILLS_USED: qa, 전송 기준선과 체감 성능의 경계 유지
SKILLS_SKIPPED: 없음
SOURCES: https://vercel.com/docs/deployment-checks | https://playwright.dev/docs/actionability
MODEL: gpt-codex/gpt-5.6-sol
