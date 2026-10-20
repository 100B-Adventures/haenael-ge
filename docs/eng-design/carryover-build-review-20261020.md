# build 이관 과제 레지스트리 · 2026-10-20 교차 코드리뷰 반려분

> 규약 = `~/.claude/standards/delegation-prompt.md` §2-3. 발주서에 내용을 적지 말고 이 경로만 준다.
> 각 줄에 우선순위 · 구현을 바꾸는가 · 종료 증거를 적는다. 긴 직렬 작업은 맨 뒤에 두고 시간이 모자라면 건너뛰고 보고한다.
> 판정 출처 = Claude code-reviewer 교차 리뷰(REVIEW_VERDICT BLOCK · MAJOR 14 · MINOR 6), 대상 커밋 `3da6c1e`.
> **컨트롤러가 직접 고치지 않는다**(헌법 §7 hand-patch 금지). 색 토큰 3건은 컨트롤러 커밋이라 `07c1255` 로 이미 닫았고 이 목록에 없다.

| # | 우선 | 과제 | 구현 변경 | 종료 증거 |
|---|---|---|---|---|
| 1 | P0 | `web/src/components/social/GoalCoverPicker.tsx` 가 형식검사·서명 발급·Presigned PUT·최종 확정 네 실패를 같은 `error` 상태 하나로 접고, 모든 경우에 "파일 형식과 크기를 확인해 주세요" 를 띄운다. 프리셋 선택 실패도 같은 문구다. 구간별 코드(`format`/`sign`/`put`/`finalize`)와 문구를 가르고 각 실패에 서버 응답 코드를 포함한 로그 1줄을 남겨라. 업로드 중 프리셋 클릭도 막아라(지금 `state === "saving"` 만 본다). | 예 | 네 실패를 각각 유발한 네 번의 실행 출력과 화면 문구 4종 · 재시도 안내 존재 |
| 2 | P0 | `web/src/components/common/ClampText.tsx` 가 절대 클램프되지 않는다. `Collapsible` 이 `enabled` 가 false 일 때 `children(true)` 를 주므로 `clamp-text` 가 안 붙고, 그래서 `scrollHeight === clientHeight` 가 되어 `overflows` 가 영원히 false 다. 자기참조 측정 데드락이다. 결과로 긴 응원 메시지가 제한 없이 전부 렌더되고 셰브론이 안 나온다(종전 `truncate` + `title` 보다 후퇴). 클램프를 먼저 적용한 상태에서 측정해라. | 예 | 3줄 이상 메시지에서 2줄 말줄임 + 셰브론 노출을 렌더로 관찰한 출력 · 그 경우를 고정하는 테스트 1개 |
| 3 | P0 | `supabase/migrations/20261020010000_storage_cleanup_worker.sql` 171~205행이 cron 등록 실패를 `RAISE NOTICE` 로 삼킨다. 운영에서 `pg_net`·Vault 가 없거나 권한이 모자라면 **마이그레이션은 성공하고 cron job 은 존재하지 않으며 아무 신호도 남지 않는다.** 또 그 cron 이 읽는 Vault 시크릿 3종(`storage_cleanup_worker_url`·`edge_invoke_publishable_key`·`storage_cleanup_internal_token`)을 등록하는 코드가 레포에 없고 `qa/contracts/deploy-env.contract.json` 에도 없다. | 예 | cron job 2개 존재를 검증하는 스크립트 실행 출력 · Vault 3종이 배포 env 계약에 등재 · 등록 실패가 `ops_event` 행으로 남는 것을 관찰 |
| 4 | P0 | `web/src/lib/social/contracts.ts` 118~124행이 여분 키를 전부 거부한다. 웹과 마이그레이션은 따로 배포되므로 **웹이 먼저 올라가면 구 RPC 가 6필드를 주고 초대 화면이 오류 없이 빈다.** 바이럴 루프 유입 입구가 배포 창 동안 죽는다. 여분 키는 버리고 통과시키되(pick) 유출 검사는 서버 응답을 상대로 테스트·린트에서 해라. `contracts.test.ts` 가 지금 이 거부를 의도로 고정하고 있다. | 예 | 6필드 응답에서도 화면이 렌더되는 테스트 · 3필드 응답 테스트 유지 · null 일 때 로그 1줄 |
| 5 | P0 | `web/src/lib/auth/protected-routes.json` 이 승인 설계가 지정한 경로가 아니다. `architecture-v1.2.3.md` 94행·`design-patterns-v1.2.3.md` 41행·`folder-structure-v1.2.2.md` 95·139행·`test-cases-v1.2.4.md` 699·790행과 D-040 §2 가 전부 `qa/contracts/protected-routes.json` 을 지정하고 "판정과 테스트가 같은 파일을 읽는다" 고 못박았다. 그리고 설계가 요구한 **폴더 스캔 대조 린트가 없다**(그 파일을 읽는 스크립트 0건). 경로를 되돌리고 린트를 만들어라. | 예 | `qa/contracts/protected-routes.json` 실재 · `proxy.ts` 와 테스트가 그 파일을 읽음 · 보호 라우트 누락을 린트가 반려하는 실행 출력 |
| 6 | P1 | `web/src/proxy.ts` 66~83행이 `process.env.NEXT_PUBLIC_SUPABASE_URL!` 비널 단정에 try/catch 가 없다. Supabase Auth 가 끊기면 `/me`·`/my`·`/friends`·`/cashout`·`/wordmap` 전부가 흰 500 이 되고 로그인 유도로 degrade 하지 않는다. | 예 | Auth 실패를 흉내낸 상태에서 랜딩 리다이렉트를 관찰한 출력 |
| 7 | P1 | 점유 모델이 미완성이다. `claim_storage_cleanup_batch(p_limit, p_lease)` 가 `p_lease` 를 **행에 저장하지 않아** 유효기간이 "다음 호출자가 들고 온 값" 이다. 수동 드레인 스크립트가 짧은 lease 로 호출하면 Storage DELETE 가 두 worker 에서 동시에 돈다. `lease_until timestamptz` 를 claim 시점에 써 넣고 판정을 `lease_until < now()` 로만 해라. | 예 | lease 탈취가 막히는 pgTAP 1개 · 짧은 lease 호출로 탈취를 시도한 실행 출력 |
| 8 | P1 | 포이즌 1건이 배치 전체를 영구 정체시킨다. `storage-cleanup-worker/index.ts` 83~87행이 `remove()` 에러 시 그 버킷의 전 클레임을 실패 처리하고 `attempts` 를 올린다. claim 조건이 `attempts < 5` 라 정상 199건이 5회 만에 영구 제외된다. `FAILED` 를 보는 뷰·알림·재처리 경로가 0이다. | 예 | 포이즌 1건 + 정상 N건 배치에서 정상분이 성공하는 실행 출력 · dead-letter 뷰 또는 `ops_event` 존재 |
| 9 | P1 | `CheerList.tsx` 에서 사유 없이 사라진 것 4종을 되살리거나 삭제 사유를 거버넌스에 적어라: ①"N개 더 있음" 숨은 개수 카피 ②접기 버튼과 그 핸들러의 `setSearchOpen(false)`(지금은 접힌 상태에서 검색 폼이 열린 채 남는다) ③`aria-label`·`aria-expanded`·`aria-controls` 연결 ④`title={cheer.message}` 툴팁. 2026-08-10 부품 15개 삭제 사고와 같은 축이다. | 예 | 되살린 경우 렌더 관찰 출력 · 삭제를 유지하는 경우 `wiki/거버넌스/결정.md` 에 사유 1줄 · 왕복 상태를 `scripts/qa/fixtures/interact-scenarios.json` 에 시나리오 1줄 |
| 10 | P1 | `web/src/components/receiver/CheerList.tsx` 123행 `cheer-overflow-summary` 에 대응하는 CSS 규칙이 **0건**이다. 보조 요약 줄이 브라우저 기본 16px `--ink` 로 렌더된다. 그리고 **`web/src` 를 대상으로 하는 무효 class 검사가 없다**(`verify-prototype-css.mjs` 는 프로토타입만 본다). 규칙을 넣고 그 검사를 web/src 에도 걸어 출고 조건에 올려라. | 예 | 그 class 의 CSS 실재 · web/src 무효 class 검사 실행 출력 0건 |
| 11 | P1 | `supabase/tests/social_storage_cleanup.test.sql` 73~79행 CV-10 "겹친 claim" 이 **같은 세션·같은 트랜잭션에서 순차 호출**이라 `FOR UPDATE SKIP LOCKED` 경로가 한 번도 실행되지 않았다. stale lease 테스트도 시간을 손으로 조작한 단일 세션이다. 실제 병렬 두 세션으로 돌려 교집합 0 을 보이거나, 못 하면 제목에서 "겹친 claim" 을 빼고 **"동시성 미검증"** 을 출고 판정 맨 위에 적어라. | 예 | 두 세션 병렬 claim 의 교집합 0 출력, 또는 미검증 명시 |
| 12 | P2 | `DROP CONSTRAINT storage_cleanup_queue_reason_check` 에 `IF EXISTS` 가 없어 재실행이 막힌다(같은 파일의 다른 DDL 은 전부 멱등). 그리고 세 마이그레이션 모두 되돌리기 경로가 없다. `cron.unschedule` 2건과 `settle_storage_cleanup` 의 하드 삭제(`DELETE FROM goal_cover_asset`)에 대한 보존 전제를 `wiki/ops/인프라.md` 에 롤백 스니펫으로 남겨라. | 예 | 마이그레이션 2회 연속 적용 성공 출력 · 롤백 스니펫 실재 |
| 13 | P2 | `20261020012000_social_dashboard_cheer_summary.sql` 의 `cheer_ranked` 가 소유 목표의 CONFIRMED 응원을 전건 적재해 윈도우 정렬하는데 인덱스를 1건도 추가하지 않았다. 상위 3 아바타와 최근 1건만 쓴다. 부분 인덱스를 넣어라. | 예 | `EXPLAIN` 출력에서 인덱스 사용 확인 |
| 14 | P2 | `web/src/lib/legal/exposure.ts` 의 `LEGAL_EXPOSURE.receiverShell` 키가 어느 분기에서도 도달하지 않는다(죽은 항목). `/my` 목록 1단과 `/my/legal` 전문이 구별되지 않는다. `protected-routes.json` 의 `/invite` 가 exact 에만 있고 prefix 에 없는 암묵 규칙도 데이터에 주석으로 남겨라. | 예 | 죽은 키 제거 또는 도달 경로 추가 · 의도 주석 실재 |
| 15 | P3 | `scripts/qa/render-mermaid-evidence.mjs` 가 Chrome 실행 경로를 하드코딩하고 블록 수 15 를 단정한다. 기계 환경이 바뀌면 반드시 실패한다. **남은 시간이 부족하면 건너뛰고 보고해라.** | 아니오 | 경로를 env 로 뺀 뒤 1회 실행 출력, 또는 건너뛴 사실 보고 |

## 종료 판정, 2026-10-20 20:36 KST

| # | 판정 | 종료 증거 |
|---|---|---|
| 1 | 닫힘 | `GoalCoverPicker.test.tsx` GC-01~05. format·sign·PUT·finalize 문구와 상태 로그, 업로드 중 preset 차단 5/5 |
| 2 | 닫힘 | Storybook `receiver-ui-cheerlist--overflow`, 390×844: `lineClamp=2`, `clientHeight=32`, `scrollHeight=80`, 셰브론 노출, console error 0 |
| 3 | 닫힘 | `verify-storage-cleanup-schedules.mjs`: active cron 2, Vault 계약 누락 0, 실패 이벤트 `STORAGE_CLEANUP_SCHEDULE_FAILED|verification` |
| 4 | 닫힘 | 구 6필드 pick·현 3필드·null 로그 계약과 초대 카드 렌더 테스트 포함 전체 Vitest 367/367 |
| 5 | 닫힘 | `qa/contracts/protected-routes.json` 단일 정본. `lint-protected-routes.mjs`: roots 5, missing 0, invite public true |
| 6 | 닫힘 | proxy AU-05가 Supabase env·Auth 실패에서 `/` 리다이렉트를 관찰. 관련 테스트 10/10 |
| 7 | 닫힘 | pgTAP lease 저장·탈취 거절. 병렬 실행: `short_lease_during_lock=0`, `short_lease_after_commit=0` |
| 8 | 닫힘 | Deno `CV-11 포이즌 1건` 테스트 PASS. 정상 객체 개별 삭제와 5회 실패 `STORAGE_CLEANUP_DEAD_LETTER` 이벤트 구현 |
| 9 | 닫힘 | CheerList 5/5와 prototype interact `scenarioFails=[]`. 숨은 개수·접기 시 검색 닫기·ARIA·title 복원 |
| 10 | 닫힘 | `.cheer-overflow-summary` CSS 실재. web class lint `used=59 missing=0`이며 `npm test` 계약에 편입 |
| 11 | 닫힘 | 독립 PostgreSQL 세션 병렬 claim 결과 `intersection=[]` |
| 12 | 닫힘 | 동일 migration 직접 2회 적용 모두 rc=0. `wiki/ops/인프라.md`에 cron unschedule과 하드 삭제 보존 전제 기록 |
| 13 | 닫힘 | `EXPLAIN`: `Index Only Scan using cheer_social_summary_recent_idx` |
| 14 | 닫힘 | `receiverShell` 제거. 보호 라우트 계약에 `/invite` exact-only public 주석과 linter assertion 추가 |
| 15 | 건너뜀 | 발주에서 P3 시간 부족 시 허용했고 Mermaid 재렌더를 명시 금지했다. 기존 SVG 15개는 변경하지 않음 |

> STAMP: 생성 2026-10-20 20:0x KST. 모델 claude-opus-5[1m]. 역할 컨트롤러. 근거 = Claude code-reviewer 교차 리뷰 판정과 컨트롤러 직접 재확인(MAJOR-1·2·3 은 grep·파일 목록·코드 읽기로 실재 확인). 상태 발주 대기.

> STAMP: 종료 2026-10-20 20:36 KST. 모델 gpt-6.1-sol. 역할 code-builder. 스킬 haenael-supabase-build. 근거 = 로컬 Supabase 런타임, Vitest, pgTAP, Storybook 헤드리스 렌더, 계약 린트. 운영 미반영.
