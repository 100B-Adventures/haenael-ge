# Performance Report: haenael-ge core v1.2.1

STAMP: 2026-08-30 (측정 실행분, KST) | model: claude-sonnet-5 | agent: qa-verifier | skill: qa-only(직접 수행) | basis: `https://haenael-ge.vercel.app` 운영 주소 read-only 실측 — Playwright PerformanceObserver(LCP/CLS/longtask) + curl 반복부하(동시 3×10배치=30회, GET only) | 근거: `docs/perf-report.md`(구 BLOCKED 판정) 승계, `~/.claude/standards/dev.md`·`~/.claude/standards/benchmarks.md` Read.

## 판정 (2026-08-30 갱신)

**부분 PASS.** 이전 라운드가 BLOCKED였던 두 차단(①390·1024 Web Vitals 부재 ②read-only 반복부하 p95·오류율 부재)을 이번 라운드에서 해소했다. `/`, `/terms`, `/api/health` 세 공개 경로 모두 반복부하 오류율 0%, p95 <1.3s. LCP는 세 경로 모두 "Good"(<2.5s) 구간, CLS는 0(레이아웃 시프트 없음). **단, "PASS"가 아니라 "부분 PASS"인 이유**: ①진짜 INP(실사용자 상호작용 지연)는 read-only 스크립트로 측정 불가 — long task 합산 TBT 근사치로 대체했고 이 대체 자체가 표준 CWV 지표가 아니다 ②Lighthouse 정식 실행은 하지 않았다(자체 PerformanceObserver 수집만) ③표본이 각 셀 3회로 작다(통계적 p95 신뢰도 낮음) ④인증 필요 경로(대시보드·환전 등)는 이번에도 범위 밖 — 이 보고는 **비로그인 공개 경로 3개**만 커버한다.

| 경로 | 뷰포트 | LCP p50/p95 | CLS | TBT(근사) p50 | TTFB p50 | 반복부하 n | p50 | p95 | 오류율 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | mobile-390 | 700ms / 728ms | 0 | 597ms | 41.8ms | 30 | 0.174s | 0.375s | 0/30 |
| `/` | desktop-1024 | 672ms / 720ms | 0 | 694ms | 41.3ms | (동일 표본, 뷰포트 무관 GET) | | | |
| `/terms` | mobile-390 | 384ms / 840ms | 0 | 838ms | 38.3ms | 30 | 0.147s | 0.166s | 0/30 |
| `/terms` | desktop-1024 | 452ms / 472ms | 0 | 967ms | 45.8ms | | | | |
| `/api/health` | (API, 뷰포트 무관) | - | - | - | - | 30 | 0.200s | 1.229s | 0/30 |

원자료: `docs/qa/vitals-2026-08-30.json`(Web Vitals, 경로×뷰포트×3회) · `docs/qa/loadtest-2026-08-30.csv`(curl 반복부하 90행 원본).

**해석 기준 (Web Vitals 공식 threshold, web.dev)**: LCP Good <2.5s / Needs Improvement 2.5-4s / Poor >4s. CLS Good <0.1. 이번 실측 LCP 최대치(840ms, `/terms` mobile p95)도 Good 구간 내 — threshold 대비 여유 큼. `/api/health` p95(1.229s)는 첫 배치(콜드스타트 추정, 1.2xs 3건 연속 후 급락)가 견인 — Vercel serverless 함수 콜드스타트 특성으로 판단되나 별도 확인은 안 했다(미검증).

### 이전 판정과의 관계
이전 STAMP(2026-08-29 gpt-5.6-sol)의 "전송 기준선을 성능 PASS로 쓰지 않는다"는 경계는 유지한다 — 이번 라운드는 전송 기준선이 아니라 **실제 LCP/CLS/반복부하 p95를 직접 측정**했으므로 그 경계 선언이 막던 대상과 다르다. dev 26화면 smoke(기능 확인)와 이번 3경로 성능 실측은 서로 대체하지 않는다(범위가 다름).

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
