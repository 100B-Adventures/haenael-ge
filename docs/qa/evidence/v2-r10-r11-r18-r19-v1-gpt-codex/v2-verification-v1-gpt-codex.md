# R10·R11·R18·R19 종료 증거

> STAMP: 2026-10-21 04:38 KST | model gpt-codex(API model ID 미노출) | agent code-builder | skill haenael-supabase-build | 기반 포맷 `docs/qa/evidence/v2-directive-build-v2-gpt-codex/`

## 판정

| 요청 | 판정 | 직접 관찰 출력 |
|---|---|---|
| R10 | 닫힘 | `{"cron_jobs_active":3,"vault_contract_missing":[],"command_contracts":"t|t|t","vault_and_ops_unchanged":true,"destructive_delete_statements":0}` |
| R11 | 닫힘 | 잘못된 URL `http_status=404`, 권한 거부 `http_status=403`; 두 경우 모두 `alert=STORAGE_CLEANUP_DRAIN_STALLED`, `stalled_count=1` |
| R18 | 닫힘 | `direct_exit=3`, `warning_observed=true`, `error_observed=true`, cron `failed`, `warning_fallback_declared=true` |
| R19 | 닫힘 | `/my/legal` status 200, console/page error 0, 본문 항목 6, 첫 화면 항목 6, `확인 중=true` |

## 회귀 출력

- `npx tsc --noEmit`: rc 0.
- `npm run lint`: rc 0. 기존 경고 8건, 오류 0.
- `npm test`: 66 files, 370/370 PASS.
- `npm run test:qa-contracts`: 계약·보호 라우트·custom class·mutation 8/8 PASS.
- `npx supabase test db`: 21 files, 369 tests, PASS.
- Storage 서버 계약 4종: schedules, concurrency, runtime, cheer-summary-index 모두 rc 0.
- `npm run build`: Next.js compile·TypeScript·정적 페이지 18/18 PASS, `/my/legal` route 포함.
- `npm run build-storybook`: PASS.
- `npm run qa:design-tokens`: 189 files, 신규 위반 0, 기준선 대비 12건 감소.

## dev 390×844

- 캡처: `business-information-390x844.png`.
- 구조 데이터: `capture-results.json`.
- 모바일 9폭 원문: `business-information-mobile-ergonomics.json`.
- 결과: 360·390·412·600·700·780·820·900·1000 전부 13px 미만 0, 본문 토큰 16px, 44px 미만 탭 0, 눌림 상태 100%, 가로 넘침 0, 하단 여유 PASS.

## 자체 반증과 레드팀

- 이 결론이 틀릴 가장 그럴듯한 이유는 사업자 정보가 여전히 전역 레이아웃 뒤에만 존재하는 경우다. 전역 렌더를 끄고 페이지 본문 DOM의 `dt` 6개와 첫 viewport 내 6개를 각각 계수해 반증했다.
- 까다로운 사용자는 신고번호가 비어 있는 것을 허위 누락으로 볼 수 있다. 실값을 발명하지 않고 승인 시안과 동일한 `확인 중` 상태와 설명을 본문에 표시했다.

KNOWLEDGE_QUERY: BRAIN 해낼게 사업·PMF 허브와 Supabase pg_net·scheduled Edge Functions·Vault 공식 문서, 전자상거래 법령 고지 근거를 조회했다.
HITS_USED: BRAIN 해낼게 사업 아이디어는 기존 제품 정체성 유지에 사용. Supabase 공식 문서는 pg_net 비동기 응답과 Vault·cron 구조 검증에 사용.
HITS_REJECTED: 일반 마케팅·타 사업체 자료는 이번 실패 주입과 법적 고지 구현에 직접 필요하지 않아 반영하지 않았다.
CONFLICTS: 없음. 신고번호 실값은 회장 확인 대기이므로 외부 자료로 추정하지 않았다.

SKILLS_USED: haenael-supabase-build, 로컬 Supabase·Next.js 수직 슬라이스와 실제 런타임 검증에 사용.
SKILLS_SKIPPED: 없음.
SOURCES/MODEL: gpt-codex(API model ID 미노출) | `docs/eng-design/carryover-build-review-20261020.md` | `wiki/거버넌스/결정.md` D-040~D-043 | https://supabase.com/docs/guides/database/extensions/pg_net | https://supabase.com/docs/guides/functions/schedule-functions | https://supabase.com/docs/guides/database/vault
PRESENTATION_CHECK: 내부 태그 잔재 없음, Markdown 구조 확인, PNG 직접 열어 확인함.
