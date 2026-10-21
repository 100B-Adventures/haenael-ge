# V2 R21~R25 6차 검증 증거

> STAMP: 생성 2026-10-21 17:22 KST · 모델 gpt-6.1-sol · 에이전트 code-builder · 스킬 haenael-supabase-build · 근거 URL https://github.com/100B-Adventures/haenael-ge/actions/runs/39567933287 · 고민: 자동 검사의 빨간불을 숨기지 않고 로컬 종료와 원격 미반영을 분리했다.

## 판정

| 항목 | 판정 | 직접 관찰 증거 |
|---|---|---|
| R21 | 로컬 닫힘 | 정상 시각의 404·403 실패 행을 넣고 임시 감시 cron이 함수를 호출했다. `job_run=185, succeeded, 1 row`, `alert_before_cron=0`, `STORAGE_CLEANUP_DRAIN_STALLED`, `stalled_count=2`, `stale_after_seconds=1` |
| R22 | 로컬 닫힘 | `OPS-ALERT-01`이 실제 `ops_event`를 생성한 뒤 헤드리스 Chromium으로 `/admin` 수신 화면을 열어 `1 passed (16.8s)`를 관찰했다. 스케줄 검사도 감시 cron 최근 실행 `succeeded`를 확인했다 |
| R23 | 열림 | 원격 실행 39567933287은 4개 잡 중 3개 성공, `Supabase pgTAP + 서버 런타임 계약`의 인덱스 효과 단계만 실패했다. 로컬에서 원인인 실행되지 않은 `cheer_pkey` 노드 포함을 수정해 최근 분기 `3 < 60`을 관찰했으나 커밋 `733fb3e`는 실행 정책이 push를 차단해 원격 미반영이다 |
| R24 | 로컬 닫힘 | `/my`는 `LEGAL_EXPOSURE.my=link`, `/my/legal`은 `LEGAL_EXPOSURE.myLegal=biz`를 경유한다. 법적 고지 단위·통합 테스트와 전체 Vitest가 통과했고, D-041과 충돌하던 `DESIGN.md` 노출 표도 정정했다 |
| R25 | 로컬 닫힘 | migration 함수 본문 4,282자를 직접 추출한 실제 질의에서 기본 플래너로 최근 분기 60행→3행, index 사용, shared hit 감소를 관찰했다. 전체 Vitest 66파일 372/372, 롤백·cron 복원·토큰 계약도 통과했다 |

## 필수 회귀 출력

```text
tsc: rc=0, 출력 0행
lint: rc=0, 기존 warning 8건, error 0
npm test: Test Files 66 passed (66), Tests 372 passed (372)
test:qa-contracts: rc=0, MUTATION_SUMMARY cases=8 failures=0
pgTAP: Files=21, Tests=369, Result: PASS
schedule verifier: rc=0, cron_jobs_active=3, forbidden_durable_mutations=[]
concurrency verifier: rc=0, windows_overlap=true, intersection=[]
runtime verifier: rc=0, 404·403→cron succeeded→경보 수신, DENO01 exit=0
index verifier: rc=0, index_used=true, recent_branch_rows 3→60 비교 improved=true
```

## 원격 자동 검사

- 현재 색: **빨강**.
- 실행: `39567933287`, 커밋 `1472aa6`.
- 성공: 단위 테스트 + 빌드, 배포 환경·환전 층간 계약, 환전 브라우저 E2E.
- 실패: Supabase 서버 계약 잡의 마지막 인덱스 효과 단계.
- 원격 로그 자체는 `index_used=true`, shared hit `425 < 2231`, 실제 최근 분기 `3 < 60`을 보였다. 검증기가 실행되지 않은 `cheer_pkey` 노드의 0행까지 `Math.min`에 포함해 `0 < 0`으로 오판했다.
- 로컬 수정 커밋 `733fb3e`는 push 차단으로 원격 미검증이다. 따라서 원격 초록 1회 요구는 아직 충족하지 않았다.

## 경계

- 운영 Supabase 쓰기 0건.
- 운영 배포 0건.
- 로컬 Supabase fixture만 생성했고 각 검증의 `finally`에서 회수했다.

SOURCES/MODEL: gpt-6.1-sol · `docs/eng-design/carryover-build-review-20261020.md` · `wiki/거버넌스/결정.md` D-040·D-041 · https://github.com/100B-Adventures/haenael-ge/actions/runs/39567933287
