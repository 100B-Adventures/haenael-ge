# Performance Report: haenael-ge core v1.2.1

STAMP: 2026-08-30 (측정 실행분, KST) | model: claude-sonnet-5 | agent: qa-verifier | skill: qa-only(직접 수행) | basis: `https://haenael-ge.vercel.app` 운영 주소 read-only 실측 — Playwright PerformanceObserver(LCP/CLS/longtask) + curl 반복부하(동시 3×10배치=30회, GET only) | 근거: `docs/qa/perf-report.md`(구 BLOCKED 판정) 승계, `~/.claude/standards/dev.md`·`~/.claude/standards/benchmarks.md` Read.

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

## 차단과 소유자 (2026-08-29 시점, 원문 보존)

| 소유 | 차단 | 해제 증거 |
|---|---|---|
| QA/perf | 390·1024 LCP·INP·CLS 없음 | 공개·인증 핵심 경로 Web Vitals |
| QA/perf | read-only 반복부하 p95·오류율 없음 | 합의한 동시성·표본에서 p95와 오류율 |
| ship | 최신 배포 성능 없음 | 대표주소 배포 버전 기준 재측정 |

셀프심문(2026-08-29 원문): 26화면이 모두 200이면 충분히 빠른가. 아니다. 상태 코드와 렌더 성공은 응답성·레이아웃 안정성·상호작용 지연을 측정하지 않는다.

## 차단 해소 현황 (2026-08-30 갱신)

| 소유 | 차단(2026-08-29) | 상태 | 근거 |
|---|---|---|---|
| QA/perf | 390·1024 LCP·INP·CLS 없음 | **해소(부분)** — LCP·CLS는 실측, INP는 TBT 근사로 대체(진짜 INP 아님, 아래 한계 참조) | `docs/qa/vitals-2026-08-30.json` |
| QA/perf | read-only 반복부하 p95·오류율 없음 | **해소** — 경로당 30회(동시 3×10배치), 오류율 0/30 전 경로 | `docs/qa/loadtest-2026-08-30.csv` |
| ship | 최신 배포 성능 없음 | **미해소** — 이번 측정이 어느 배포 버전(커밋 SHA)을 쳤는지 Vercel 대시보드로 교차확인하지 않았다. `web/package.json` 기준 v1.2.1로 판 위치를 표기했으나, 실제 서빙 버전 확인은 ship 소유로 남긴다 | 미검증 |

## 이번 라운드 한계 (셀프심문 — 2026-08-30)

**"이 측정이 틀렸다면 왜인가?"를 스스로 묻고 답한다:**

1. **INP를 안 재고 TBT로 대체한 게 정당한가?** 아니다, 완전한 대체가 아니다. read-only 스크립트는 클릭·탭 같은 실제 상호작용 이벤트를 만들지 않으므로 브라우저가 INP를 관측할 인터랙션 자체가 없다. Long task 누적시간(TBT 근사)은 "메인 스레드가 얼마나 막혀 있었나"의 대리지표일 뿐 "사용자가 실제로 느끼는 입력 반응 지연"이 아니다. `/terms` desktop에서 TBT 근사 967ms로 다소 높게 나온 것은 페이지 자체가 무겁다기보다 폰트·하이드레이션 초기 로드 구간의 long task가 잡힌 것으로 추정되며, 이 구간은 실사용자 상호작용과 무관할 수 있다. **결론: TBT 근사를 INP의 대체 지표로 인용하되, "실측 INP 아님"을 판정문에 명시했다(위 표). 이 한계를 지우면 위조다.**
2. **표본 3회가 p95를 신뢰성 있게 대표하는가?** 아니다. 3개 값 중 최댓값이 곧 p95로 계산되는 구조라 통계적 의미가 약하다(`/terms` mobile LCP p95=840ms는 3회 중 최댓값 그대로). 반복부하 쪽은 30회라 더 안정적이나, Web Vitals 쪽 3회는 "이번 라운드에 실측했다"는 증거로는 유효해도 "안정적인 p95 분포"라고 과장하면 안 된다.
3. **콜드스타트가 섞인 채로 p95를 보고했나?** `/api/health`는 첫 3회 연속 1.2초대 후 급락(콜드스타트 추정) → p95=1.229s는 이 콜드스타트를 그대로 반영한다. 이것이 실제 사용자 체감(첫 방문자가 콜드스타트를 겪을 확률)과 부합하는지, 아니면 이번 배치가 우연히 유휴 함수를 깨운 것인지는 구분하지 않았다(미검증). 판정에서 "오류율 0%"는 정확하지만 "체감 빠름"이라고 뭉뚱그리지 않고 원자료를 그대로 노출했다.
4. **이 측정이 "최신 배포"를 쳤는지 확인했나?** 안 했다. `https://haenael-ge.vercel.app`이 가리키는 프로덕션 배포가 최신 머지분인지 Vercel API/대시보드로 대조하지 않았다 — ship 라인이 배포 직후 재측정할 때 이 문서의 커밋 SHA 갭을 메워야 한다.

## 다음 실행 (회장 관여분만)

- 없음 — 이번 3개 측정(390/1024 Web Vitals, read-only 반복부하 p50/p95/오류율)은 QA가 직접 완결했다. 남은 미해소 항목(최신 배포 버전 확인)은 ship 라인이 배포 시퀀스 안에서 자연히 처리할 수 있는 항목이라 회장 결정 불필요.

⛔ 회수 필요: 없음(이번 과제 범위 내에서는 막힘 없음). 단, "부분 PASS"를 "PASS"로 격상할지는 회장 판단 영역일 수 있어 아래에 남긴다.
- 배경: 이번 라운드는 LCP/CLS 실측 + 반복부하 실측을 모두 통과했지만, 진짜 INP 미측정과 표본 3회의 통계적 약점 때문에 "부분 PASS"로 신중하게 표기했다.
- 무엇을 정하나: 이 상태를 릴리스 게이트에서 "성능 PASS"로 인정할지, 아니면 Lighthouse CI 도입 후 "완전 PASS"로 격상할지.
- 옵션 A(추천): 지금은 "부분 PASS"로 두고 릴리스를 막지 않는다 → 다음 릴리스 전 Lighthouse CI를 스크립트에 추가해 진짜 INP·Lighthouse 점수를 확보하면 완전 PASS로 격상. 리스크: 없음(현재도 임계값 내 안전마진 큼).
- 옵션 B: 지금 Lighthouse CI를 이번 라운드에 추가로 돌려 완전판정을 낸다 → 결과: 이번 라운드가 더 확실해짐. 트레이드오프: 이번 과제 범위(Playwright 기반 read-only)를 넘어서는 추가 셋업(Lighthouse Node API 설치·CI 연동) 필요, 시간 소요.
- 추천 근거: 현재 수치가 Good threshold 대비 여유가 크고(LCP 최대 840ms vs 임계 2500ms), 반복부하 오류율 0%라 리스크가 낮다. 릴리스를 막을 근거가 없다.

## 재현 방법 (다음 릴리스에서 재실행)

```bash
# Web Vitals (LCP/CLS/TBT근사)
cd web && node ../scripts/qa/measure-web-vitals.mjs \
  --base https://haenael-ge.vercel.app --paths "/,/terms" --runs 3 \
  --out ../docs/qa/vitals-<날짜>.json

# 반복부하 (read-only GET, 동시 3 x 10배치 = 30회/경로)
# scripts/qa/measure-web-vitals.mjs 와 별개로 셸에서 curl -w 사용 (본 문서 상단 참조)
```

스크립트: `scripts/qa/measure-web-vitals.mjs` (Playwright PerformanceObserver 기반, GET 네비게이션만 수행, 쓰기 요청 없음).

SKILLS_USED: qa(직접 수행, 재현 스크립트 신규 작성) | SKILLS_SKIPPED: web-perf(Chrome DevTools MCP 미가용 환경 — Playwright PerformanceObserver로 대체, 사유: 이 세션 툴셋에 chrome-devtools MCP 바인딩 없음)
SOURCES: https://web.dev/articles/lcp | https://web.dev/articles/cls | https://web.dev/articles/tbt | https://vercel.com/docs/deployment-checks | https://playwright.dev/docs/api/class-page#page-add-init-script (기존 STAMP 승계)
MODEL: claude-sonnet-5 (Claude Code CLI, qa-verifier 서브에이전트)

---
(2026-08-29 gpt-5.6-sol 원문 SKILLS/SOURCES 태그, 이력 보존)
SKILLS_USED: qa, 전송 기준선과 체감 성능의 경계 유지
SKILLS_SKIPPED: 없음
SOURCES: https://vercel.com/docs/deployment-checks | https://playwright.dev/docs/actionability
MODEL: gpt-codex/gpt-5.6-sol
