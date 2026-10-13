# 해낼게 V2 QA 반려 수정 보고

> **판정: build 수정과 로컬 재검증 완료, QA 재승인 전.** Critical 1건과 Major 3건은 코드·로컬 실행으로 해소했고, 커버리지 Major는 과장된 선행 문서를 사실대로 정정했다. Minor 2건은 같은 서버 경계 수정으로 해소했다. 전역 `design-lint.sh` 종료코드 문제는 이 repo 밖 공유 하네스 변경이라 이번 worker 범위에서 수정하지 않았다.
>
> **STAMP:** 생성시각 2026-10-13 18:47 KST · 모델 gpt-5-codex · 에이전트 code-builder · 스킬 haenael-supabase-build · 기반 포맷 `docs/qa/v2-social-viral-loop-qa-v1.0.0-gpt-codex-20261013-1804.md` · 근거 URL [Supabase private Storage](https://supabase.com/docs/guides/storage/serving/downloads), [Next.js headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers), [Next.js security advisories](https://github.com/vercel/next.js/security/advisories) · 고민 한 줄: private object path를 client 계약에서 제거하면서도 ACTIVE 관계와 목표 소유자를 서버에서 다시 검증하고 Storage 호출을 batch로 제한했다.

## 1. 상황과 의미

직전 QA는 DB RLS 통과와 UI 선별 테스트 통과만으로는 D-019를 만족하지 않는다고 판정했다. private Storage object path가 RPC JSON에 남으면 직접 다운로드 RLS가 막혀 있어도 client가 내부 object 식별자를 알게 되고, "ACTIVE 친구에게 Presigned URL만 반환"하는 승인 API 계약을 어긴다.

이번 수정은 RPC projection에서 private path key를 제거했다. Next.js server boundary는 service role로 관계, 목표 소유자, 공개범위, 승인 asset을 다시 조회한 뒤 private asset에 120초 Presigned URL을 발급한다. 따라서 client가 받는 social data에는 object path가 없고, URL의 `friendId`와 goal owner가 다르면 URL 발급 전에 404 경계로 닫힌다.

## 2. 결함별 수정 전후

| 결함 ID | 수정 전 | 수정 후 | 판정 |
|---|---|---|---|
| QA-V2-SEC-01 | `my_friend_goals`, `friend_goal_detail` JSON에 `cover_storage_path` key 존재 | 두 RPC에서 key 제거. pgTAP 금지 key regex에 `cover_storage_path`, `quarantine_path` 추가. server에서만 asset path 조회 후 Presigned URL 발급 | 테스트됨 |
| QA-V2-FLOW-01 | URL `friendId`와 goal owner를 독립 조회 | server가 ACTIVE relation과 `goal.member_id === friendId`를 함께 검증. 불일치는 `friend_goal_not_found`, page는 404 | 테스트됨 |
| QA-V2-QA-01 | `NODE_ENV=production`이면 local Supabase origin이 CSP에서 빠짐 | `NEXT_PUBLIC_SUPABASE_URL`이 정확한 loopback hostname일 때만 해당 HTTP·WebSocket origin 추가. 외부 production origin은 기존 CSP 유지 | 관찰됨 |
| QA-V2-DEP-01 | production audit 4건, Next 16.3.3 direct critical 1건 | Next 16.4.0과 non-breaking transitive update. production audit 0건 | 테스트됨 |
| QA-V2-COVERAGE-01 | 선별 social spec 11/11을 전체 범위처럼 읽을 수 있게 기록 | `docs/build-log.md`, `docs/구현현황.md`에 84건 중 47 통과·8 부분·2 실패·27 미검증을 명시하고 미검증 ID 전수 기록 | 근거 확인 |
| QA-V2-COVER-ERR-01 | signed URL 실패를 `cover_url=null`로 축약 | Storage error, item error, 누락 URL을 `friend_cover_signing_failed`로 반환 | 테스트됨 |
| QA-V2-PERF-01 | 목표별 `createSignedUrl` N회 | private path dedupe 뒤 `createSignedUrls` batch 1회. 관계·goal·asset도 목록 단위 query | 테스트됨, 대량 부하 미검증 |
| QA-V2-DESIGN-01 | 공유 `design-lint.sh`가 3종 위반을 출력하고 exit 0. repo 검사에도 신규 색상 리터럴 2건 존재 | 신규 리터럴 3곳을 `text-muted-foreground` token으로 교체하고 baseline을 74→71로 낮춤. repo CI는 신규 위반 0. 공유 하네스 exit 0은 controller 자산이라 미수정 | 부분 해소 |

## 3. 실행 증거

| 증거 등급 | 명령 | 결과 |
|---|---|---|
| 테스트됨 | `supabase db reset --local` | 운영 미적용 migration 2건 포함 전체 migration 적용 성공 |
| 테스트됨 | `supabase test db` | 18 files, 322 tests, PASS |
| 테스트됨 | `npx vitest run ...contracts.test.ts ...server.test.ts` | 2 files, 11 tests, PASS. private key 0, owner mismatch 거절, signed URL 실패 분기 포함 |
| 테스트됨 | `npm test` | 53 files, 317 tests, PASS |
| 테스트됨 | `npm audit --omit=dev --json` | production 취약점 4건에서 0건으로 감소 |
| 테스트됨 | `npm run qa:design-tokens` | 검사 파일 162개, baseline 71건, 신규 위반 0 |
| 테스트됨 | `HEAVY_SLOT_MAX_WAIT=60 heavy-slot.sh npm run build` | Next.js 16.4.0 production build, TypeScript, static pages 17/17 PASS |
| 관찰됨 | production-mode `next start` + local Supabase + Playwright | social spec 11/11 PASS, MY-01 console error 0, 390px overflow 0 |
| 관찰됨 | production-mode `/my` response header | CSP `connect-src`에 local build의 `http://127.0.0.1:54321`, `ws://127.0.0.1:54321` 포함. `'unsafe-eval'` 없음 |
| 근거 확인 | `git diff f36cc66..HEAD --` 보호 파일 3종 | 환전 수수료 공식, A안 lock, 계좌 마스킹 관련 파일 변경 0 |

첫 Playwright 재시도는 `RUN_LOCAL_SUPABASE_E2E` 누락으로 11건이 전부 skip되어 증거로 채택하지 않았다. 두 번째는 port 3010의 hostname이 test cookie의 `localhost`와 달라 인증이 빠져 실패했다. 최종 실행은 `http://localhost:3000`으로 맞춰 11/11을 실제 실행했다.

## 4. 커버리지 정직성

이번 build 수정은 27건을 모두 새 자동화로 채웠다고 주장하지 않는다. 직전 QA의 미검증 27건은 PG-14, CT-04·05·08·10·11·12, PW-01·08~17, CC-02·03, ST-01~05, REG-CASH-01, REG-PUB-03이다. 선행 문서의 과장 표현을 정정하는 선택지를 적용했으며, 위 케이스는 QA 재실행 또는 후속 test implementation 전까지 미검증이다.

현재 production-mode social spec 11/11 재실행은 QA-V2-QA-01과 기존 선별 경로의 회귀를 검증하지만, 승인 test plan 84건 전체를 대체하지 않는다.

## 5. 변경 규모와 불변식

- 기준 range: `f36cc66..HEAD`
- 변경 규모: 18 files, +544/-220. 이 보고서 추가 전 수치다.
- DB: 기존 `20261013050000_social_viral_loop_web_first.sql` 직접 수정. 새 migration 없음. 운영 DB 적용 없음.
- 배포: 없음.
- 미결정 하단 탭 라벨 10px 대 13px: 변경 없음.
- core 라인 환전 공식, advisory lock, `REQUESTED` 조건, 계좌 마스킹 테스트: 변경 없음. full pgTAP에서 cashout test 2종 PASS.

## 6. 자체 검증

셀프심문: 이 수정이 틀렸다면 가장 가능성 높은 이유는 service role query가 RPC보다 넓은 권한을 가지므로 owner binding 하나가 빠지는 경우다. 그래서 URL의 `friendId`, ACTIVE relation 상대, `goal.member_id`, `visibility`, APPROVED asset을 각각 검증하고 owner mismatch에서 Storage 호출이 0회인지 테스트했다.

레드팀: 공격자는 PUBLIC goal ID를 FRIENDS 관계가 있는 다른 사람의 `friendId`와 조합하거나, 관계 해제 직후 이미 받은 페이지를 재요청할 수 있다. 전자는 owner binding에서, 후자는 매 요청의 ACTIVE relation recheck에서 차단된다. 이미 발급된 Presigned URL은 최대 120초 유효하므로 즉시 revoke는 보장하지 않으며, 이는 승인 D-019 TTL 계약의 residual risk다.

## 7. 남은 것

1. QA가 미검증 27건과 신규 server boundary를 독립 재실행해야 한다.
2. QA-V2-PERF-01은 batch 호출 unit evidence는 있으나 다량 친구·목표 fixture의 latency와 Storage request count 실측은 남았다.
3. QA-V2-DESIGN-01의 repo 신규 위반은 0으로 해소했다. 공유 하네스 소유자는 `design-lint.sh`에 strict/baseline 계약을 정해야 하며, 현재 repo CI는 `qa:design-tokens`로 신규 token 위반을 차단한다.
4. 운영 배포와 운영 DB migration 적용은 하지 않았다.

KNOWLEDGE_QUERY: BRAIN business index에서 해낼게·친구·바이럴·신뢰·공개범위 관련 문서를 조회했고, 외부에서는 Supabase private Storage signed URL, Next.js CSP headers, Next.js security advisory를 공식 문서로 조회했다.

HITS_USED: Supabase의 private bucket은 server-side time-limited signed URL로 제공할 수 있다는 공식 계약을 D-019 구현 근거로 채택했다. Next.js의 `headers()` CSP 설정과 production build 검증 권고를 local production-mode QA 분리 근거로 채택했다.

HITS_REJECTED: BRAIN의 마케팅 바이럴 전략은 이번 작업이 승인 설계의 버그 수정이므로 제품 방향 변경에 사용하지 않았다. 일반 블로그와 비공식 보안 요약은 공식 문서·GitHub advisory보다 권위가 낮아 제외했다.

CONFLICTS: Supabase 일반 계약은 authenticated download도 허용하지만 승인 D-019는 ACTIVE 관계 재확인 뒤 Presigned URL-only로 더 엄격하다. 제품 정본을 우선했다.

SKILLS_USED: haenael-supabase-build, migration→server boundary→unit·pgTAP→production build·Playwright 순서와 운영 DB 무적용 경계에 사용.

SKILLS_SKIPPED: review는 독립 code-reviewer가 별도 수행 중이므로 보고서 작성 시점에는 결과 미반영. qa는 build 반려 수정 단계이며 QA 판정 자체는 다음 단계의 qa-verifier 소유라 호출하지 않음.

PRESENTATION_CHECK: 내부 태그 잔재 없음 확인, Markdown 웹 렌더는 출고 전 수행.

SOURCES/MODEL: gpt-5-codex | `pipeline-state.v2.md` | 승인 eng-design v1.1.0 5종 | `docs/qa/v2-social-viral-loop-qa-v1.0.0-gpt-codex-20261013-1804.md` | `DESIGN.md` | `wiki/거버넌스/결정.md`·`실수.md`·`요청.md` | `~/SJ_BRAIN_wiki/wiki/business/index.md` | https://supabase.com/docs/guides/storage/serving/downloads | https://supabase.com/docs/guides/storage/buckets/fundamentals | https://nextjs.org/docs/app/api-reference/config/next-config-js/headers | https://github.com/vercel/next.js/security/advisories
