# QA Tracker — haenael-ge

## 2026-08-02 — 수동환전 계좌수집 슬라이스

**판정: ❌ NG 유지 / web·구 Edge 진입점은 🔧 전환, DB 상태전이는 미검증**

- 2026-08-02 관리자 pgTAP 후반부 일괄 보정: `admin_reveal_cashout_account`는 운영 계약대로 `service_role`에서 호출하고, 목록·지급·반려는 `authenticated` 관리자 JWT로 복귀시켰다. `authenticated` 관리자가 RLS로 타인 `cashout_request`를 직접 조회하던 RPC 인자와 원장 검증도 제거했다. 신청 시 service_role이 두 request id를 트랜잭션 로컬 설정에 캡처하고, 상태 전이는 관리자 JWT, 원장·잔액은 service_role, 비공개 감사로그는 migration owner가 각각 검증한다. 앱 역할의 운영 GRANT는 넓히지 않았다.
- 최종 직접 실행: 확장 설치와 개별 pgTAP 모두 `127.0.0.1:54322 ... Operation not permitted`로 SQL 실행 전 종료(`exit 2`). 이어 `DO_NOT_TRACK=1 supabase db reset`은 Docker 소켓 `operation not permitted`(`exit 1`), `DO_NOT_TRACK=1 supabase test db`는 `LegacyDbConnectError`(`exit 1`). 따라서 요청 수치 `cashout_manual 31/31`과 나머지 6파일 ok는 여전히 **미검증**이며 NG를 해제하지 않는다.
- 2026-08-02 pgTAP 147행 후속 보정: `is(record, record)`의 기대 레코드 문자열 2개가 `unknown`으로 남아 실제 컬럼 `text`와 비교를 중단했다. `account_masked`·`account_holder`의 기대값을 모두 `::text`로 고정했고 `key_version`의 기존 `::smallint`는 유지했다.
- 실행 차단 증거: 지시된 `psql` 확장 설치·개별 테스트는 `127.0.0.1:54322 ... Operation not permitted`, Unix socket은 `Operation not permitted`, Docker socket은 `connect: operation not permitted`로 SQL 실행 전 차단됐다. 요청된 최종 명령도 `supabase db reset` **exit 1**, `supabase test db` **exit 1 (`LegacyDbConnectError`)**이다. 따라서 ERROR 0줄·`cashout_manual 31/31`·나머지 6파일 ok는 **미검증**이며 NG를 해제하지 않는다.
- 2026-08-02 로컬 DB 후속 실패 2건: `cashout_manual.test.sql`은 앱 역할에 실행권한이 없는 내부 토글 `cashout_require_kyc()`를 `service_role`로 직접 호출해 31건 전체가 시작 전 중단됐고, `update_goal.test.sql` UG6은 비소유자 RLS가 검증용 `SELECT`도 숨겨 실제 저장값 대신 NULL을 비교했다.
- 🔧 테스트 수정: KYC 토글 값은 migration owner 권한에서 확인한 뒤 T1~T14 실제 RPC는 종전 service/authenticated 역할로 실행한다. 목표 fixture는 고정 ID로 비소유 RPC에 전달해 UG5가 실제 타인 행을 겨냥하게 했고, UG6 저장값은 owner 권한에서 확인한다. 계약 assertion 수는 31·12로 유지했다.
- 2026-08-02 추가 근본원인·🔧 수정: `20260728010000_cashout_manual_payout.sql:172`의 `pg_catalog.normalize(..., NFKC)`가 PostgreSQL의 특수 `normalize` 문법을 깨뜨려 `42703 column nfkc does not exist`를 발생시켰다. 저장소 내 동일 패턴은 이 1건뿐이며, `SET search_path = ''`를 유지한 채 암묵적 `pg_catalog` 탐색이 적용되도록 `normalize(..., NFKC)`로 한정자만 제거했다.
- 후속 실행 차단: 이 Codex 샌드박스에서 `DO_NOT_TRACK=1 supabase test db`는 `LegacyDbConnectError`, Docker socket·기존 PostgreSQL socket은 `operation not permitted`, 독립 `initdb`는 `shmget ... operation not permitted`로 DB 접속 전에 차단됐다. 따라서 31/31·12/12와 전체 무회귀는 아직 **미검증**이며 NG를 해제하지 않는다.
- 2026-08-02 잔여 실에러: 정상 신청 경로의 `clover_ledger` INSERT가 기존 AFTER INSERT 트리거 `sync_clover_balance()`를 호출했고, 호출자의 빈 `search_path`를 상속한 트리거가 한정되지 않은 `clover_balance`를 찾지 못해 `relation clover_balance does not exist`로 중단됐다. 앞선 `throws_ok` 3건은 INSERT 전 예외라 이 결함을 가렸다.
- 🔧 근본 수정: 수동환전 migration에서 `public.sync_clover_balance()`를 `CREATE OR REPLACE`하고 `SET search_path = ''`를 고정했다. 내부 영속 객체는 `public.clover_balance`, 내장 함수는 `pg_catalog.now()`로 전부 한정해 수동환전뿐 아니라 기존 모든 ledger INSERT 호출자의 search path와 분리했다.
- fresh 검증 시도: `DO_NOT_TRACK=1 supabase db reset`은 Docker socket `operation not permitted`, 이어 `DO_NOT_TRACK=1 supabase test db`는 `LegacyDbConnectError`로 테스트 실행 전 차단됐다. 정적 plan은 cashout 31 + 나머지 6파일 157 = 전체 188 assertion이나, 실행 수치가 아니므로 **31/31·6파일 ok는 미검증**이고 NG를 유지한다.
- 범위: `cashout-manual-account-engdesign-decisions-v1-opus5.md` v1.2의 W-1~W-12, 수동환전 신청 Server Action, 관리자 지급·반려 상태전이, 경계 테스트 T1~T15.
- 근본원인: DB migration은 v1.2 계약으로 교체됐지만 web 신청 폼·관리자 페이지가 구 Edge Function/전건 복호화 RPC/`p_actor_id` 계약에 남아 있어 호출 체인이 서로 달랐다.
- 🔧 전환한 범위: 신청 폼을 인증된 Server Action 1개로 고정, Edge Function 계좌 경로 410 폐기, 관리자 목록 마스킹 전용, 지급·반려를 `auth.uid()` RPC로 교체, 상태·이력·마이페이지 HOLD 표시 연결, Vercel Preview에서 암호화 키 사용 거부.
- 직접 증거: web Vitest 32 files / 199 tests PASS, webpack production build PASS(신규 `/cashout/status`·`/cashout/history` 포함), Deno legacy handler 2/2 PASS, Deno check PASS, 빌드 산출물 내 임시 계좌키 문자열 검색 0건, T1~T15 존재·pgTAP plan 31=assertion 31·동시성 스크립트 `bash -n` PASS.
- 전체 NG 잔여: 샌드박스가 Docker socket·localhost bind를 거부해 migration 실제 적용, pgTAP 31건, T15 병렬 psql, 로그인 브라우저 신청→관리자 지급/반려 실제 상태전이는 실행하지 못했다. 대리지표로 통과 처리하지 않는다.
- 해제 조건: migration 실제 적용, T1~T15 전건 PASS, web unit/build, 실제 브라우저 신청 경로, 돈 코드 2nd-pass를 직접 관찰하고 증거를 이 항목에 기록한다.
- 제한: 프로덕션 DB에는 적용하지 않는다. 로컬 파일 작성과 로컬 검증까지만 수행한다.

## 2026-07-27 — 결제·환전 전체 플로우 오픈 판정

**판정: ❌ NG / 실결제 오픈 NO-GO**

- 범위: 친구 `/g/[slug]` 응원 결제 → Toss 승인 → payment/cheer/ledger/notification → 본인 `/cashout` → KYC/HOLD/payout/SETTLED.
- fresh PASS:
  - Next.js production build·TypeScript PASS.
  - Web Vitest 2차 **192/192 PASS**. 1차는 `/cashout` 5초 timeout으로 191/192였으나 격리 1/1, 전체 재실행 192/192 PASS — 환경 부하 민감 테스트로 기록.
  - Deno unit **31/31 PASS**.
  - `cheer-order`, `toss-confirm`, `cashout`, `cashout-payout`, `withholding` Deno check PASS.
  - 운영 `/api/health` curl 2회 HTTP **200**, DB `ok`.
- fresh FAIL/불가:
  - `toss-webhook` Deno check TS2322, `auth-kakao` Deno check TS2353.
  - pgTAP·seed: sandbox의 Docker socket/localhost 접근 거부로 실행 불가. `supabase test db` DB 연결 실패.
  - Playwright: Chromium MachPort 권한 거부가 6회 반복돼 assertion 전 실행 불가. 앱 FAIL로 각색하지 않음.
  - Maestro/mobile: 대상 프로젝트·flow 없음.
- 결제 NG:
  - Toss test secret으로 결제창→서버승인 `DONE` 실왕복 증거 없음.
  - 운영 `PAYMENTS_ENABLED`/`NEXT_PUBLIC_PAYMENTS_ENABLED` 동시 true 상태 미검증.
  - EF 401 `"Authorization required"` 및 `/payment/fail` query message가 사용자 화면에 노출될 수 있는 코드 경로 확인.
- 환전 NG:
  - `cashout`, `cashout-payout`, `kyc-verify`는 HTTP 501 스텁. KYC/PASS·ledger HOLD·실지급·SETTLED·지급명세·REVERSAL 전부 미구현.
  - `_shared/withholding.ts` 직접 실행: 최소 30,000원, 3.3%, 30,000원 기준 placeholder 수수료 1,500원·원천징수 940원·실수령 27,560원.
  - 웹 미리보기는 플랫폼 수수료를 제외하고 총액의 3.3%를 계산해 shared 계산식과 불일치. 웰컴 포함 도달/웰컴 제외 지급액의 30클로버 경계 계약도 미확정.
- 법률 NG: `docs/risks.md#1` 전자금융거래법·선불충전금·개인 정산 법률의견서 미확보.
- 🔧 전환 가능 TC: **0건** — 실제 Toss·환전 E2E 관찰이 없어 build/unit/health를 완료 대리지표로 쓰지 않음.
- 근본원인: 결제 적립까지만 구현하고 환전 돈 이동 슬라이스를 501 스텁으로 남긴 채, 화면·원장·kill switch 존재를 서비스 전체 준비도로 오인할 수 있는 구조. 재발방지는 “친구 결제 + 본인 실지급”을 하나의 QA exit로 묶는 것.
- 상세 증거: `docs/qa-report-payment-cashout-2026-07-27.md`.

## 2026-07-27 — 목표 수정 RPC 누락

**판정: 🔧 수정됨 / 실제 Supabase DB QA 미검증**

- 증상: `web/src/components/goal/GoalEditSheet.tsx`가 `update_goal(bigint,text,text,date)` RPC를 호출하지만 대응 DB 함수 migration이 없어 실제 저장 경로가 실패한다.
- 원인: 직전 웹 슬라이스에서 클라이언트 호출과 생성 타입은 추가됐으나 DB 함수·pgTAP 검증이 같은 슬라이스의 완료조건으로 묶이지 않았다.
- 수정 범위: 본인 소유 `ACTIVE` 목표만 수정하는 `SECURITY DEFINER` RPC, 생성 경로와 동일한 `" 해낼게"` suffix 규칙, 권한·입력 경계 pgTAP.
- 조치: `20260727010000_update_goal_rpc.sql`과 전용 `update_goal.test.sql` 추가. 소유자·`ACTIVE`·title 2자·due date·reason NULL 규칙을 DB 경계에서 강제한다.
- 재발 방지: 클라이언트 RPC 추가 시 함수 시그니처·반환형·권한·본인/비본인/입력 경계를 같은 슬라이스의 pgTAP으로 묶었다(12 assertions).
- 증거:
  - **테스트됨** — `GoalEditSheet.test.tsx` 3/3 PASS.
  - **테스트됨** — Next.js production build + TypeScript PASS.
  - **근거 확인** — migration/test `git diff --check` PASS, pgTAP assertion count 12 = `plan(12)`.
  - **미검증** — 로컬 Supabase `54322` 비가동, Docker 비가동, 샌드박스가 PostgreSQL shared memory를 차단해 migration 실제 적용과 `supabase test db`는 실행하지 못함.
- 다음 QA: 로컬 Supabase 가동 환경에서 `supabase migration up --local && supabase test db`; 종료증거는 신규 migration 적용 성공 + `update_goal.test.sql` 12/12 포함 전체 pgTAP PASS.

## 2026-07-16 (2차) — qa-verifier release_v1_hardening_fix 재검증 (build REOPEN→재승인 직후, qa 단계 재진입)

**배경**: 직전 라운드(같은 날 03:25)가 Codex money-code 2nd-pass로 REJECT 4건 발견 → 회장 "tracked 상태로 출시 거부" → build REOPEN → code-builder가 `20260716120000_release_v1_hardening_fix.sql`로 4건 전부 수정 → Codex 1라운드 PASS → 컨트롤러 fresh 회귀(88/88, 109/109, build PASS, 동시성 4종 PASS, release E2E 3/3) → build 05:33 재승인. 이번 라운드는 컨트롤러의 재확인을 그대로 믿지 않고 qa-verifier가 **처음부터 독립 재검증**.

**판정: PASS-with-gaps** — §7 구조적 prod 갭 2건 외 전 항목 GREEN. 정적 코드리뷰에서 새 Codex 독립 패스가 REJECT 판정을 냈으나, 재검증 결과 실제 도달 가능한 launch blocker는 0건(아래 §8 상세).

### 1. 빌드
- `cd web && NEXT_PUBLIC_APP_VERSION=1.0.0 npm run build`: **PASS**, TS 오류 0. **테스트됨.**

### 2. DB
- `supabase migration up --local`: `{"applied":[],"message":"Migrations applied"}` — 드리프트 0. **관찰됨.**
- `supabase test db`: **109/109 PASS** (`Files=3, Tests=109` — payment_abuse_guard 20 + release_v1 37 + rls_policy 52, 사전 예상과 정확히 일치). **테스트됨.**

### 3. web unit
- `cd web && npm test`: **88/88 PASS** (11 test files, 86+신규2 사전 예상과 일치). `toss-webhook.test.ts` 17/17(신규 review_required 분기 4b/6/6b/6c 포함). **테스트됨.**

### 4. 신규 하드닝 4건 — 직접 재현 (psql/curl, pgTAP과 별개 독립 fixture로 재확인)

**① `reconcile_canceled_payment` payment_key NULL 우회 거부** — 독립 fixture(payment id=995001, payment_key='payment_qadirect_nullkey_001') 생성 후 `p_payment_key=NULL`로 직접 호출:
```sql
SELECT * FROM reconcile_canceled_payment('hnl_qadirect_nullkey_001', NULL, 3000, '{"qa":"direct-verify"}'::jsonb);
ERROR:  payment_key_mismatch
구문:  PL/pgSQL function reconcile_canceled_payment(text,text,integer,jsonb) line 17 at RAISE
```
**관찰됨** — `IS DISTINCT FROM`이 NULL 우회를 정확히 차단.

**② DONE 취소 + 잔액부족 → durable marker 수렴 + 멱등 재시도** — clover_balance 0인 회원의 DONE 결제(5000원, cheer 필요량 5000)를 취소 RPC 호출:
```sql
SELECT * FROM reconcile_canceled_payment('hnl_qadirect_balance_001', 'payment_qadirect_balance_001', 5000, '{...}'::jsonb);
 payment_id | payment_status | idempotent | review_required
       995002 | DONE           | f          | t          -- 예외 없이 커밋, review_required=true
```
후속 확인: `payment.status='DONE'`(강제취소 안 함) + `cancel_reconcile_required_at IS NOT NULL` + `risk_event(PAYMENT_CANCEL_BALANCE_INSUFFICIENT)` **1건**. 동일 order_id로 재호출 → `idempotent=true, review_required=true`, risk_event count **여전히 1**(재시도 시 증가 안 함, 멱등 확인). **관찰됨.**

**③ `capture_lead` NULL/빈 submitter_hash 거부** — 직접 호출:
```sql
SELECT * FROM capture_lead('qa-null-hash@example.com', NULL, now(), ..., NULL);
ERROR:  submitter_hash_required
SELECT * FROM capture_lead('qa-empty-hash@example.com', NULL, now(), ..., '');
ERROR:  submitter_hash_required
```
NULL·빈문자열 둘 다 거부 확인. **관찰됨.**

**④ `lead_dedup_race.sh` fresh 재실행** — 동일 이메일 10동시 신규 제출(서로 다른 submitter_hash):
```
lead 행 수 = 1, 실패 호출 = 0, raw 23505 노출 = 0
is_duplicate=false(승자) = 1, is_duplicate=true(중복) = 9
ALL PASS — capture_lead 이메일 dedup 동시성 레이스 안전 확인
```
**관찰됨.** 기존 3종(`rate_limit_race`·`request_key_race`·`request_key_fingerprint_race`)도 함께 fresh 재실행 — **전부 ALL PASS**(회귀 없음).

**⑤ `toss-webhook` EF curl 교차확인** — 로컬 `TOSS_SECRET_KEY` 미설정(구조적, 실 Toss 샌드박스 크리덴셜 없음)이라 `getPayment()`가 실제 Toss API를 호출하는 완전한 E2E curl 200은 **로컬에서 물리적으로 불가**(prod 갭과 동일 성격 — mock 대체 금지 원칙 적용, 로컬 대체 안 함). 대신:
- 게이팅 레이어는 실 curl로 확인: 오token→401, 정상 이벤트타입 불일치→200 `{"ignored":true}`, CANCELED 페이로드+`TOSS_SECRET_KEY` 없음→503 `missing_server_env`(정상 가드). **관찰됨.**
- CANCELED `review_required=true` → `200 {"processed":true,"reviewRequired":true}` 응답 로직 자체는 EF가 호출하는 것과 **동일한 `handleTossWebhook` 함수**를 mock supabase/toss 클라이언트로 요청 단위 검증하는 vitest `toss-webhook.test.ts` 6b/6c 케이스로 교차 확인(17/17 PASS, §3). **테스트됨(단위, 실 Toss 왕복 아님 — 갭으로 명기).**

### 5. `/api/health` (프로덕션 모드, `next build && next start -p 3470`, `next dev` 미사용)
- 기존 stale 프로세스(3470, PID 71414, curl 무응답) 확인 후 kill, 완전 fresh 재기동.
- **관찰됨:** `GET /api/health` → **200** `{"status":"ok","version":"1.0.0","database":"ok","responseTimeMs":12,"timestamp":"2026-07-15T20:39:02.089Z"}`.

### 6. Playwright E2E — `web/e2e/` 전체 4개 spec (프로덕션 모드, 포트 3470)
- 시딩: goal(id=9001, slug=qa-verifier-smoke)+member+auth.user psql 직접 생성.
- **31/32 PASS, 1 FAIL(기지 사항)**: `goal-flow.spec.ts` "결제 CTA 활성 + 응원 시트 열림" — `NEXT_PUBLIC_PAYMENTS_ENABLED` kill switch가 canonical 빌드(플래그 미설정=off)에서 정상 `disabled`로 렌더(지시사항대로 재조사 없이 기지의 테스트부채로 처리, 코드버그 아님).
- `release-v1.spec.ts` 3/3, `report-flow.spec.ts` 9/9(EF 실호출 3건 포함), `wordmap-share.spec.ts` 전체 PASS — 전부 이상 없음.
- 정리: goal/member/auth.user/report/lead 전부 psql DELETE, 잔여 0건 쿼리로 확인. `next start` 프로세스 종료 확인.

### 7. prod 증거 갭 — 구조적 미충족 (변동 없음)
- **`prod-health-200`: 미검증 — 구조적 불가.** Supabase 클라우드 프로젝트 미생성.
- **`prod-demo-login-200`: 미검증 — 구조적 불가.** Vercel 배포 미실행.
- mock/로컬 대체 없음.

### 8. 정적 코드리뷰 — Claude 5축 + Codex 독립 재실행(고위험 코드 필수, 이전 라운드 Codex 세션과 별개 신규 fresh pass)

대상: `20260716120000_release_v1_hardening_fix.sql`(신규), `toss-webhook-handler.ts`(CANCELED/review_required 분기).

**Claude 5축:**
- 버그: `cancel_reconcile_required_at IS NOT NULL` 멱등 체크가 `status NOT IN ('READY','DONE')` 가드보다 먼저 위치 — 재시도 시 상태 재검증 없이 올바르게 단락(short-circuit). 정상.
- 예외처리: `capture_lead` NULL 가드가 advisory lock 획득 **이전**에 위치(무의미한 락 방지) — 설계 의도대로 정확.
- 성능: DROP+CREATE FUNCTION 방식(반환타입 변경으로 불가피)은 로컬/단일 배포 마이그레이션에서 문제 없음. `lead_submitter_recent_idx` 부분 인덱스로 100만 건 스케일도 인덱스 스캔.
- 보안: `SEARCH_PATH = public, pg_temp` 고정 + `SECURITY DEFINER` + `REVOKE ALL ... GRANT service_role`만 — 서치패스 하이재킹·권한 우회 경로 없음. 동적 SQL 없음(injection 벡터 없음).
- 가독성: 기존 `record_partial_cancel_review` 패턴과 일관, 주석 충실.

**Codex 독립 재실행 (`codex exec`, review-only, 이전 build-log 기록 세션과 무관한 신규 컨텍스트):**

판정: **REJECT** 3건 — 아래는 qa-verifier가 코드 직접 대조로 재검증한 결과.

| 등급(Codex) | 위치 | Codex 주장 | qa-verifier 재검증 결과 |
|---|---|---|---|
| P1 | `toss-webhook-handler.ts:204-211` | `sendSlackAlert` 예외 미포착 → Slack 장애 시 500 재발, 재시도 루프 재현 | **무효(false positive) — 관찰됨.** `_shared/slack.ts:8-37` 확인: `fetch`를 `try/catch`로 감싸고 실패 시 `false` 반환, webhook URL 미설정도 조기 `return false` — **어떤 경로로도 throw하지 않음**. Codex가 놓친 기존 방어 확인, 수정 불필요 |
| P1 | `20260716120000...sql:122-132` | `p_amount_krw` NULL이면 `!=` 비교가 NULL(=false)로 검증 우회(`amount_mismatch` 미발동) — payment_key와 동일한 NULL-bypass 클래스 | **관찰됨(코드 대조) — 실재하는 결함, 이번 하드닝 대상 4건에는 없었음(신규 발견).** 단, `grep` 확인 결과 이 줄은 `20260714110000` 원본부터 존재(이번 마이그레이션이 새로 만든 결함 아님). 유일 호출부(`toss-webhook-handler.ts:186` `p_amount_krw: payment.totalAmount`)의 `payment`는 `_shared/toss.ts:52-53` `getPayment()`에서 `Number.isInteger(totalAmount)` 아니면 즉시 throw — **현재 단일 호출자 기준 NULL 도달 불가**(payment_key와 동일한 리스크 프로필). Launch blocker 아님, 다음 라운드 `IS DISTINCT FROM` 전환 권고(일관성·향후 호출자 대비) |
| P2 | `20260716120000...sql:163-170` | `p_detail`이 object 계약 없이 `\|\| jsonb_build_object`와 결합 — 배열/스칼라 시 audit JSON 구조 깨짐 | **관찰됨.** `p_detail`은 전부 서버 코드(`toss-webhook-handler.ts`)가 리터럴 객체로 생성해 전달 — 사용자 입력 아님, 현재 도달 불가. 낮은 우선순위 권고사항으로만 기록 |

**qa-verifier 종합 판정:** Codex REJECT 3건 중 1건(Slack 500)은 코드 대조로 **무효 확정**(기존 방어 존재), 나머지 2건은 실재하나 **launch blocker 아님**(단일 호출자 기준 도달 불가, payment_key 수정과 동일한 방어 계약 결함 클래스 — 다음 라운드 권고 항목에 추가). 이번 세션 4대 하드닝(payment_key NULL·잔액부족 마커·submitter_hash NULL·lead dedup 레이스)은 **전부 코드 대조 + 직접 재현으로 확인 완료, 회귀 없음.**

### 발견 및 조치 필요 (다음 build 라운드용, 누적)
1. **[신규, 비블로커]** `reconcile_canceled_payment`의 `amount_krw != p_amount_krw` NULL-unsafe 비교 — `IS DISTINCT FROM` 전환 권고(payment_key와 동일 패턴 통일).
2. **[정보]** Codex의 Slack-500 주장은 무효 — `sendSlackAlert`가 이미 전 경로 예외 포착, 액션 불필요.
3. (기존 이월) `reconcile_canceled_payment` 잔액부족 durable marker → cashout 출시 전 실제 상계/수동정산 운영 플로우 설계 필요(v1.0.0 범위 밖, cashout 미출시로 도달 불가 유지).
4. (기존 이월) `goal-flow.spec.ts` 결제 CTA 테스트가 kill switch 기본값(off) 미반영 — 테스트 스위트 채무, 코드 버그 아님.

### Review
- `qa-verifier`(이 세션): build REOPEN→재승인 이후 qa 단계 재진입 — 컨트롤러의 자체 회귀 재확인을 신뢰하지 않고 처음부터 독립 fresh 재검증(빌드→마이그레이션→pgTAP→unit→4대 하드닝 직접 psql/curl 재현→동시성 4종→prod 모드 E2E→정적리뷰). Codex를 이전 세션과 무관한 신규 컨텍스트로 재실행해 새 관점의 REJECT 3건을 발견했고, 그중 1건은 코드 대조로 오탐 확정, 2건은 실재하나 비블로커로 재평가 — "Codex PASS라고 했으니 통과"로 자체보고를 그대로 신뢰하지 않음.

---

## 2026-07-16 — qa-verifier v1.0.0 전체 재검증 (build 재승인 직후, toss-webhook Codex 3라운드 반영분 포함)

**판정: PASS-with-gaps** — 이전 컨트롤러/code-builder 자체보고를 신뢰하지 않고 빌드→DB→unit→EF curl→prod 모드 E2E까지 fresh 처음부터 재실행. §7 구조적 prod 갭 2건 외에 **신규 Codex 정적리뷰 REJECT 1건**(P0/P1, 상세 §6)을 이번 세션에서 처음 발견 — 이전 회차 보고에는 없던 gap.

### 1. 빌드
- `cd web && NEXT_PUBLIC_APP_VERSION=1.0.0 npm run build`: **PASS**, TS 오류 0. **테스트됨.**

### 2. DB
- `supabase migration up --local`: `{"applied":[],"message":"Migrations applied"}` — 드리프트 0. **관찰됨.**
- `supabase test db`: **95/95 PASS** (`Files=3, Tests=95` — payment_abuse_guard 20 + release_v1 23 + rls_policy 52, 사전 예상과 정확히 일치). **테스트됨.**

### 3. web unit
- `cd web && npm test`: **86/86 PASS** (11 test files, 사전 예상 71+15=86과 일치). `NotificationBadge` act() 경고 잔존(비차단, 기존 인지 항목). **테스트됨.**

### 4. EF smoke (curl, `supabase functions serve --env-file supabase/functions/.env`)
- `lead-capture`: 신규 이메일 제출 → **201** `{"accepted":true,"duplicate":false,"leadId":56}`. 동일 이메일 재제출(동일 IP) → **200** `{"duplicate":true}` 동일 leadId. 동일 IP로 서로 다른 이메일 5건 제출 후 6번째 → **429** `{"error":{"code":"rate_limited"}}` — 시간당 5건 제한 실동작 확인. `LEAD_RATE_LIMIT_SALT` 로컬 부재 확인 후 `supabase/functions/.env`(gitignored)에 로컬 전용 값 추가해 검증. **관찰됨.**
- `toss-webhook`: `TOSS_WEBHOOK_TOKEN` 로컬 부재 확인 후 동일 방식으로 로컬 전용 값 추가.
  - 토큰 없음 → **401** `unauthorized`. 틀린 토큰 → **401**. **관찰됨.**
  - 맞는 토큰 + `null` body → **400** `invalid_payload`. + 배열 body → **400** `invalid_payload`. + 원시값(string) body → **400** `invalid_payload` — 이번 Codex 2라운드 수정사항을 EF 레벨에서 3종 전부 교차 확인. **관찰됨.**
  - 맞는 토큰 + eventType 불일치 → **200** `{"ignored":true}`. + paymentKey 없음 → **400** `payment_key_required`. + paymentKey 있음(TOSS_SECRET_KEY 미설정) → **503** `missing_server_env`. **관찰됨.**
- `cheer-order`/`toss-confirm`: 기본 로컬 상태(`PAYMENTS_ENABLED` 미설정)에서 둘 다 **503** `payments_disabled` — v1.0.0 kill switch 정상 동작(코드 `Deno.env.get("PAYMENTS_ENABLED") !== "true"` 가드 확인). 기존 멱등 회귀를 검증하기 위해 `PAYMENTS_ENABLED=true`로 일시 전환해 재확인: 동일 requestKey 2회 호출 → 1차 **201**(orderId=hnl_3c900bb3..., paymentId=337), 2차 **200** + `idempotent:true` + 동일 orderId/paymentId/cheerId. toss-confirm은 `TOSS_SECRET_KEY` 미설정 시 **503** `missing_toss_secret`로 정상 가드. 검증 후 `PAYMENTS_ENABLED` 라인 제거해 로컬 기본 상태(off) 복원. **관찰됨.**
- `auth-kakao`: 카카오 시크릿 미설정 → **503** `missing_env`(원문 노출 없음). **관찰됨.**
- `notify`: 빈 바디 → **400** `validation_error`("memberId required"). **관찰됨.**
- `wordmap-render`: 비인증 anon 호출 → **403** `forbidden`. **관찰됨.**
- `report`: §5 Playwright E2E 실호출로 커버(201/400/401 전부 PASS, 아래 참조).

### 5. `/api/health` (프로덕션 모드, `next build && next start -p 3470`)
- **관찰됨:** `GET /api/health` → **200** `{"status":"ok","version":"1.0.0","database":"ok","responseTimeMs":81,"timestamp":"..."}`. dev 모드(`next dev`) 아닌 프로덕션 모드로 실행(2026-07-14 발견된 Turbopack HMR 하이드레이션 버그 회피, 지시사항 준수).

### 6. Playwright E2E — `web/e2e/` 전체 4개 spec (프로덕션 모드 서버, 포트 3470)
- 시딩: `psql`로 `auth.users`(id=`1111...1111`)+`member`+`goal(id=9001, slug=qa-verifier-smoke)` 직접 생성. env: `E2E_BASE_URL`/`PLAYWRIGHT_BASE_URL=http://localhost:3470`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `E2E_GOAL_SLUG=qa-verifier-smoke`, `E2E_GOAL_ID=9001`.
- **1차 실행(canonical 빌드, `NEXT_PUBLIC_PAYMENTS_ENABLED` 미설정): 31/32 PASS, 1 FAIL.**
  - FAIL: `goal-flow.spec.ts` "goal page: 결제 CTA 활성 + 응원 시트 열림" — `cheer-cta` 버튼이 `disabled` 상태로 남아 있어 클릭 실패.
  - **근본원인 확정(관찰됨):** `CheerPaymentButton.tsx:38` `const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true"` — 클라이언트 kill switch가 v1.0.0 신규 기능이고, `NEXT_PUBLIC_*`은 빌드 타임에 인라인되는데 canonical 빌드 커맨드(`NEXT_PUBLIC_APP_VERSION=1.0.0 npm run build`)에는 이 플래그가 없어 기본 off로 빌드됨 — CTA는 `disabled` + "응원 결제 준비 중" 라벨(정상 UX, 죽은 버튼 아님, 코드 145-158줄 확인)로 정확히 동작.
  - **검증(관찰됨):** `NEXT_PUBLIC_PAYMENTS_ENABLED=true`로 재빌드 후 동일 테스트만 격리 재실행 → **PASS**. 앱 버그 아님, 확정.
  - **결론:** 이 E2E 테스트는 kill switch 신설(v1.0.0) 이전에 작성된 것으로, 새 기본값(off)을 반영하지 못하는 **테스트 스위트 채무**. 코드 결함 아님 — 재검증 후 canonical 빌드(플래그 미설정)로 복원.
- `release-v1.spec.ts` 3/3 PASS(리드 제출·health·cashout 비활성 화면).
- `report-flow.spec.ts` 9/9 PASS — EF 실호출 3건(201/400/401) 포함.
- `wordmap-share.spec.ts` 전체 PASS(E2E_GOAL_ID/SLUG 설정으로 조건부 fullview 2건도 포함, 스킵 0건).
- edge 커버: 비로그인 목표페이지 열람·금액 비노출(₩ 없음)·404 not-found·CTA disabled 라벨·응원시트(플래그 on 시)·신고 400/401·wordmap redirect 등 happy+edge 전부.
- **최종 정리:** goal(9001)+member+auth.user+lead(12건, rate-limit 테스트용 포함)+report 전부 psql DELETE로 원복, 잔여 0건 쿼리로 확인. `next start`(3470)·`supabase functions serve` 프로세스 전부 종료 확인.

### 7. prod 증거 갭 — 구조적 미충족 (mock/로컬 대체 금지, §3 준수, 변동 없음)
- **`prod-health-200`: 미검증 — 구조적 불가.** Supabase 클라우드 프로젝트 자체가 아직 없음(회장 로그인/콘솔 액션 필요, 이 세션 권한 밖).
- **`prod-demo-login-200`: 미검증 — 구조적 불가.** Vercel 배포 자체가 아직 없음.
- 로컬/mock으로 "충족" 위장하지 않음.

### 8. 정적 코드리뷰 — Claude 5축 + Codex 교차 리뷰(고위험 코드 필수)
대상: `toss-webhook-handler.ts`(신규 가드), `lead-capture/index.ts`, `_shared/slack.ts`, `20260714090000_lead_capture.sql`, `20260714110000_payment_webhook_reconciliation.sql`, `20260714130000_release_review_fixes.sql`.

**Claude 5축:**
- 버그/예외처리: `toss-webhook-handler.ts` null/배열/원시값 가드 정확 확인(§4 EF smoke로 교차검증). `constantTimeEqual` 타이밍 세이프 토큰 비교 정확. 원문 노출: 클라이언트 응답에 Postgres/Toss 벤더 원문 없음(화이트리스트 에러코드만).
- 성능: `lead_submitter_recent_idx (submitter_hash, created_at DESC) WHERE submitter_hash IS NOT NULL` 부분 인덱스로 rate-limit count 쿼리가 100만 건 스케일에서도 인덱스 레인지 스캔 — 풀스캔 없음.
- 보안: 3개 함수 전부 `PUBLIC/anon/authenticated` 실행권한 회수, `service_role`만 허용 확인.
- 가독성: 특이사항 없음.

**Codex 교차 리뷰 (money-code 2nd-pass, review-only, `codex exec`) — SQL 마이그레이션 2건, 신규 발견:**

> ⚠️ `toss-webhook` Codex 2nd-pass(§build-log 2026-07-16)는 `index.ts`/`toss-webhook-handler.ts`만 명시 대상이었고, 이 RPC들을 호출하는 SQL 마이그레이션(`20260714110000`, `20260714130000`)이 그 라운드에 포함됐는지 build-log상 불명확 — dev.md §1.4("마이그레이션=고위험, Codex 필수")에 따라 이번 세션에서 별도로 Codex 리뷰를 돌려 갭을 닫음.

**Codex 판정: REJECT.** (P0 2건·P1 2건·P2 1건 — 아래 리스크 재평가 포함)

| 등급 | 위치 | 내용 | qa-verifier 리스크 재평가(교차검증) |
|---|---|---|---|
| P0(Codex) → **P1(재평가)** | `20260714110000_payment_webhook_reconciliation.sql:41-48` | `DONE` 취소 시 `clover_balance < 환불액`이면 예외로 트랜잭션 전체 롤백 — Toss는 CANCELED인데 DB는 DONE에 영구 고착, 웹훅 재시도도 영구 500 | **관찰됨:** `grep`으로 전체 마이그레이션 검색 결과 `clover_count`를 감소시키는 코드는 이 함수가 유일. v1.0.0은 `CASHOUT_ENABLED=false`로 클로버 소비 경로 자체가 없어 이 케이스는 **v1.0.0 범위에서 도달 불가**. 단, cashout 기능 출시 전 반드시 수정 필요(음수/채무 원장 또는 부분 상계 로직) — build-log ⛔ 회수 필요 항목에 추가 권고 |
| P0(Codex) → **P1(재평가)** | `20260714110000...sql:23-25` | `IF v_payment.payment_key IS NOT NULL AND v_payment.payment_key != p_payment_key` — `p_payment_key`가 NULL이면 우변이 NULL이 되어 `!=` 비교 결과가 NULL(=false 취급)이 되어 **키 불일치 검증 자체가 통과됨**(NULL 우회) | **관찰됨(코드 대조):** 실제 코드 확인 — Codex 지적 정확. 유일한 실 호출부(`toss-webhook-handler.ts:150` `p_payment_key: payment.paymentKey`)는 Toss 공식 API 응답의 필수 문자열 필드라 NULL이 실제로 전달될 경로는 현재 없음(익스플로잇 불가, 현재 단일 호출자 기준) — 그러나 `SECURITY DEFINER` 금전 RPC 자체의 방어 계약이 깨져 있어 향후 다른 호출자(운영 콘솔 등) 추가 시 위험. `IS DISTINCT FROM`으로 즉시 수정 권고 |
| P1(Codex) | `20260714130000...sql:13-15` | `capture_lead`가 `p_submitter_hash` NULL/빈값을 거부하지 않아 advisory lock+rate-limit이 무력화될 수 있음 | **관찰됨:** 유일한 호출부 `lead-capture/index.ts:80-81`이 `if (!hash) return 503`으로 이미 선차단 — 현재 익스플로잇 불가하나 RPC 자체가 fail-open이라 계약 방어 아님 |
| P1(Codex) | `20260714130000...sql:17-24` | 중복 조회(SELECT)-INSERT 사이 레이스 — 서로 다른 IP가 동일 이메일을 동시 제출하면 한쪽이 UNIQUE 위반 raw 23505로 500 | **관찰됨(Claude 5축에서도 독립 발견):** 실제 재현 가능한 레이스. 클라이언트엔 `save_failed`만 노출(원문 미노출, §3 정보노출은 안전)이나 정상 "duplicate:true" 대신 500 오응답 — `INSERT ... ON CONFLICT` 전환 권고 |
| P2(Codex) | `20260714130000...sql:17-21` | 이메일·인스타 각각 다른 기존 행과 매칭 시 `LIMIT 1`이 임의 행 반환 | 마케팅 리드 한정, 낮은 리스크. 권고사항으로만 기록 |

**qa-verifier 종합 판정:** Codex REJECT를 그대로 릴레이하되, 실제 도달 가능성을 재평가해 **v1.0.0 출시를 막는 즉시 블로커는 없음**(모든 항목이 "현재 단일 호출자 기준 도달 불가" 또는 "cashout 미출시로 도달 불가")으로 결론. 다만 **결제 RPC의 방어 계약 결함(payment_key NULL 우회)과 lead-capture 레이스**는 코드리뷰 기준 REJECT 상태로 남아 있어 **다음 build 라운드에서 반드시 수정 후 재검증 필요** — "이상 없음"으로 보고할 수 없음.

### 발견 및 조치 필요 (이번 세션, code-builder 인계)
1. **[재확인 필요]** `reconcile_canceled_payment`의 payment_key NULL 우회(P1) — `IS DISTINCT FROM`으로 즉시 수정 권고, cashout 미출시라 launch blocker는 아니나 다음 라운드 필수.
2. **[재확인 필요]** `reconcile_canceled_payment`의 잔액부족 영구롤백(P1, cashout 출시 전 필수) — v1.0.0 범위 밖.
3. **[재확인 필요]** `capture_lead` NULL submitter_hash fail-open(P1) — RPC 계약 레벨 방어 추가 권고.
4. **[재확인 필요]** `capture_lead` 이메일 중복 레이스(P1) — `ON CONFLICT` 전환 권고.
5. **[정보]** `goal-flow.spec.ts` "결제 CTA 활성" 테스트가 v1.0.0 kill switch 기본값(off)을 반영 못함 — 테스트 스위트 채무, 코드 버그 아님. `NEXT_PUBLIC_PAYMENTS_ENABLED=true` 빌드 매트릭스 추가 또는 kill-switch-aware skip 권고.

### Review
- `qa-verifier`(이 세션): B1+B2+v1.0.0 신규기능 전체 독립 fresh 재검증(빌드→마이그레이션→pgTAP→unit→EF curl→prod 모드 E2E→시딩/정리). Codex money-code 2nd-pass를 payment_webhook_reconciliation.sql + release_review_fixes.sql에 대해 처음으로 별도 실행해 REJECT 4건(재평가 후 launch-blocker 0건, next-round 필수 4건) 발견 — 이전 회차 미검증 갭을 닫음.

---

## 2026-07-14 — qa-verifier 독립 재검증 (Stage Controller qa 단계, B1+B2 전체 재실행)

**판정: PASS-with-gaps** — prod 미배포로 인한 구조적 갭 2건(하기)을 제외한 전 항목 GREEN. 이전 build 단계 보고를 신뢰하지 않고 코드베이스·DB부터 처음부터 재실행(빌드→시드→curl→E2E)한 fresh 재검증.

### 1. 빌드
- `cd web && npm run build`: **PASS**, TS 오류 0. (재검증 중 발견한 실버그 1건 수정 후 재확인 — 아래 "발견 및 수정" 참조.)

### 2. DB
- `supabase migration up --local`: `{"applied":[],"message":"Migrations applied"}` — 드리프트 0(전 마이그레이션 이미 적용 상태 확인).
- `supabase test db`: **72/72 PASS** (`payment_abuse_guard.test.sql` + `rls_policy.test.sql`, `Files=2, Tests=72, Result: PASS`) — 사전 예상(20+52=72)과 정확히 일치.

### 3. web unit
- `cd web && npm test`: **69/69 PASS** (9 test files). 기존 `NotificationBadge` act() 경고 잔존(비차단, 사전 인지된 항목).

### 4. EF smoke (curl, `supabase functions serve`)
- `cheer-order` 멱등 재요청: 동일 payload(고정 customerKey+requestKey) 2회 호출 → 1차 `201`(orderId=hnl_04abf3d4..., paymentId=587), 2차 `200` + `idempotent:true` + **동일 orderId/paymentId/cheerId** 반환. **관찰됨.**
  - ⚠️ 참고: customerKey를 비워 anonymous 랜덤값으로 2회 호출하면 `409 request_key_conflict` 발생 — 이는 버그가 아니라 2026-07-13 request_fingerprint 강화(customer_key도 fingerprint에 포함)의 **의도된 동작**(정적 코드리뷰에서 마이그레이션 원문 대조 확인).
- `toss-confirm`: `TOSS_SECRET_KEY` 미설정 상태 → `503 {"error":{"code":"missing_toss_secret"}}` — 정상 가드 동작. **관찰됨.**
- `auth-kakao`: 카카오 시크릿 미설정 → `503 {"error":{"code":"missing_env"}}` — 원문 노출 없이 안내 메시지. **관찰됨.**
- `notify`: 빈 바디 → `400 {"error":{"code":"validation_error","message":"memberId required"}}`. **관찰됨.**
- `wordmap-render`: POST + `{"goal_id":103}`(GET/camelCase 시도는 각각 405/400으로 정확히 가드) → 비인증 anon 호출은 `403 forbidden` — 소유자 인증 없이 렌더 차단 정상 동작. **관찰됨.**
- `report` EF는 Playwright E2E(§5)에서 실호출로 커버(201/400/401 전부 PASS).

### 5. Playwright E2E (로컬 dev 서버, `web/e2e/` 전체 3개 spec)
- 시딩: `psql`로 `auth.users`+`member`+`goal(slug=qa-verifier-smoke, id=103)` 직접 생성 → 테스트 종료 후 `cheer`/`payment`/`payment_log`/`report`/`goal`/`member`/`auth.users` 전부 DELETE로 원복 완료(잔여 0건 확인 쿼리로 검증).
- **최초 전체 실행에서 실버그 1건 발견**: dev 서버(`next dev -p 3456`)가 `/g/[slug]` 등 동적 라우트에서 `500`(React Client Manifest 모듈 미발견) — 원인은 이 레포와 무관한 `/Users/sj/package-lock.json`(다른 세션이 생성한 스트레이 파일)이 Turbopack의 workspace-root 추정을 오염시킨 것. `web/next.config.ts`에 `turbopack.root` 명시 고정으로 수정, `npm run build` 재확인 PASS, dev 서버 재기동 후 `/`·`/g/qa-verifier-smoke` 전부 `200` 확인.
- 수정 후 전체 실행: **28/29 PASS**, 1건(`goal not-found: 홈 링크 → 랜딩으로 이동`) 병렬실행 중 브라우저 컨텍스트 종료로 flake — 단독 재실행(`-g` 필터, `--retries=2`) 시 **즉시 PASS** 확인. 진짜 회귀 아님(플레이크).
- 카카오 로그인 필요 케이스: 이 spec 세트엔 실 카카오 OAuth E2E 없음(LoginSheet는 UI만 검증, 실 provider 호출 없음) — 스킵 대상 없음.
- edge 커버: 비로그인 목표페이지 열람·금액 비노출(₩ 없음)·404 not-found·CTA 활성화·응원시트·신고 400/401·wordmap redirect 등 happy+edge 전부 포함.

### 5-보정. 컨트롤러 독립 재검증 — E2E 결과 정정 (2026-07-14, qa-verifier 보고 사후 검증)

qa-verifier의 "28/29 PASS·1건 flake" 주장을 그대로 릴레이하지 않고 컨트롤러가 직접 `E2E_BASE_URL=http://127.0.0.1:3456 E2E_GOAL_SLUG=7druulwd npx playwright test`(전체 3 spec)를 **독립적으로 2회 재실행**했다. 결과는 **10/29 PASS, 17 failed** — qa-verifier 보고와 정면 불일치. 대리보고를 신뢰하지 않고 직접 근본원인까지 추적했다.

**근본원인 확정(관찰됨):** 실패는 앱 버그가 아니라 **`next dev`(Turbopack) 개발서버의 HMR WebSocket 핸드셰이크 간헐적 실패**(`ws://.../_next/webpack-hmr` → `ERR_INVALID_HTTP_RESPONSE`)였다. 이 실패가 발생하면 React 클라이언트 하이드레이션이 완료되지 않아(`document.querySelector(btn)`에 `__react*` fiber prop 부재로 직접 확인) 버튼 클릭 등 모든 클라이언트 인터랙션이 무반응 상태가 된다. SSR HTML 자체(GET 200)는 정상이라 curl/헬스체크만으로는 안 잡히고, Playwright의 클릭 기반 테스트에서만 드러난다. 재현성: 컨트롤러의 독립 실행 2회 모두 재현(17 failed 동일 패턴) — qa-verifier가 본 "1건 flake"보다 훨씬 광범위하고 심각한 간헐적 버그로 판단.

**추가 발견 2건(환경 설정 갭, 앱 버그 아님):**
1. `supabase functions serve`가 검증 도중 꺼져 있어 `report` EF가 게이트웨이 503을 반환 — `report-flow.spec.ts` 9개 테스트가 전부 이 때문에 실패. 재기동으로 해결.
2. `report-flow.spec.ts`는 다른 두 spec(`E2E_BASE_URL` 사용)과 달리 **`PLAYWRIGHT_BASE_URL`**(기본값 `localhost:3001`, 이 프로젝트가 실제 쓰는 3456과 다름)과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 별도로 요구 — env var 네이밍이 spec 파일마다 달라 커맨드 한 줄로 전체 스위트를 못 돌리는 기존 기술부채. 버그는 아니나 향후 QA 러너 스크립트에 3개 env var를 전부 명시하도록 표준화 권장.

**최종 권위 있는 재실행(모든 근본원인 해소 후, fresh):**
- `npm run build` → `next start -p 3456`(dev 모드 대신 **프로덕션 서버**로 전환 — HMR 자체가 없어 이 버그 클래스가 원천 차단됨) + `supabase functions serve` 기동 + `PLAYWRIGHT_BASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`E2E_GOAL_SLUG` 전부 명시.
- 결과: **27 passed, 2 skipped(E2E_GOAL_ID 미설정으로 인한 wordmap fullview 조건부 스킵 — 정상), 0 failed.** 재현 확인을 위한 개별 hydration 진단 스크립트(`window` 내 `__react*` fiber 확인)로 prod 모드에서 하이드레이션 정상(`hydrated: true`) 직접 확인.
- **권고:** 이 레포의 E2E는 앞으로 `next dev`가 아니라 `next build && next start`로 고정 실행할 것 — dev 서버 HMR 경합은 이 세션에서 재현된 실제 리스크이며, 운영 배포도 어차피 prod 빌드이므로 prod 모드 E2E가 더 대표성 있는 증거이기도 하다.
- 테스트 데이터(goal `7druulwd`+member+auth.user+report 1건)는 검증 후 psql로 직접 DELETE, 프로세스(next start·functions serve)도 전부 종료 확인.

**정정된 §5 결론: e2e-happy·e2e-edge 증거 = 위 27/29(2 정당스킵/0 failed) 재실행이 진실원.** qa-verifier의 28/29 수치는 폐기하고 이 재실행으로 대체한다.

### 6. 정적 코드리뷰 (결제 경로 + 최근 4개 마이그레이션)
대상: `cheer-order/index.ts`, `toss-confirm/index.ts`, `_shared/toss.ts`, `_shared/errors.ts`, `20260710051000_cheer_order_abuse_guard.sql`, `20260713180819_cheer_order_concurrency_fix.sql`, `20260713190000_cheer_order_request_fingerprint.sql`, `20260710042000_payment_compensation_audit.sql`.
- **이상 없음.** 원문 노출: `toPublicError`/`toPublicHttpStatus` 화이트리스트로 Postgres/Toss 벤더 원문이 클라이언트 응답에 전혀 실리지 않음(서버 `console.error`에만) — 직접 코드 대조 확인.
- 동시성: `pg_advisory_xact_lock` customer→goal 고정 순서로 데드락 불가 설계, `INSERT ... ON CONFLICT DO NOTHING`으로 request_key 레이스의 raw 23505 노출 경로 0개 — 마이그레이션 주석과 실제 SQL 로직 일치 확인(주석만 그럴듯하고 코드가 다른 경우 없음).
- request_fingerprint: `IS DISTINCT FROM` NULL-safe 비교로 goal_id/customer_key/amount/displayName/isAnonymous/message 전체를 replay 판정에 포함 — 위 EF smoke의 409 응답이 바로 이 로직의 실제 동작 확인.
- 미사용 변수·타입 불일치: 없음(`npm run build`의 TS strict 통과로 교차 확인).

### 7. prod 증거 갭 — 구조적 미충족 (mock/로컬 대체 금지, §3 준수)
- **`prod-health-200`: 미검증 — 구조적 불가.** `supabase projects list` → `LegacyPlatformAuthRequiredError`(access token 없음, 클라우드 프로젝트 자체가 아직 없음).
- **`prod-demo-login-200`: 미검증 — 구조적 불가.** `web/.vercel` 디렉토리 부재(Vercel 프로젝트 링크 전무) — 배포 자체가 아직 없어 물리적으로 데모 로그인 엔드포인트가 존재하지 않음.
- 위 2건은 로컬/mock으로 대체 채움 금지 지침에 따라 "충족"으로 위장하지 않음. Supabase 클라우드 프로젝트 생성 + Vercel 링크 + 배포가 선행돼야 채울 수 있는 ship 단계 밑돌.

### 발견 및 수정 (이 세션)
1. **[수정 완료]** `web/next.config.ts`: `turbopack.root` 미고정으로 인한 dev 모드 500 — E2E 실행 자체를 막는 blocker였음. 고정 후 build/dev 모두 재확인 PASS.

### Covered B2 Controls (2026-07-10 기록 유지 + 재확인)
- `payment READY -> DONE`, `cheer PENDING -> CONFIRMED`, `clover_ledger EARN`.
- Amount tamper rejection. DONE retry idempotency, `payment_key` mismatch rejection.
- `payment.payment_key` partial unique index. Receiver balance serialization.
- `create_cheer_order`/`confirm_cheer_payment` execute grants restricted to `service_role`.
- Authenticated clients cannot directly select raw `payment` rows.
- PG-success/DB-failure compensation durable (CANCELED/FAILED + audit).
- (신규) request_key 재요청 남용 방지(rate limit customer/goal 이중 + advisory lock 직렬화 + fingerprint semantic replay) — 이번 세션 curl+마이그레이션 대조로 실검증.

### Not Yet QA Exit (변동 없음)
- 실 Toss stage/test-key 결제 E2E, `toss-webhook` 운영 재조회/보상 replay.
- 환전/PASS/payout/legal/privacy.
- Supabase cloud/Vercel 배포, 환경 시크릿, Toss/Kakao redirect URL(§7 구조적 갭).

### Review
- `qa-verifier`(이 세션): B1+B2 전체 독립 fresh 재검증. 이전 build 단계 self-report를 그대로 신뢰하지 않고 빌드→마이그레이션→pgTAP→unit→EF curl→E2E 시딩/정리까지 처음부터 재실행. 실버그 1건 발견·수정·재검증까지 완료.

## 2026-07-15 — v1.0.0 출시 기능 재검증

- **테스트됨:** `supabase test db` 95/95 PASS. 리드 RLS·시간당 5건 제한, Toss 전액취소 원장 반전, 부분취소 검토 마커와 중복 웹훅 멱등성을 포함한다.
- **테스트됨:** `npm test` 71/71 PASS. GA4 `page_path`에서 query/hash를 제거하는 개인정보 회귀 테스트 2건을 포함한다.
- **테스트됨:** `NEXT_PUBLIC_APP_VERSION=1.0.0 npm run build` PASS.
- **관찰됨:** 프로덕션 모드 서버 `GET /api/health` 200, `status=ok`, `version=1.0.0`, `database=ok`.
- **관찰됨:** 출시 E2E 3/3 PASS: 랜딩 리드 제출, DB health, 환전 비활성 화면. 브라우저 제출 리드가 DB에 `source=playwright`, `medium=e2e`로 저장된 것을 직접 확인했다.
- **미검증:** 실 Toss test 결제·취소 왕복, Slack 실웹훅, GA4 DebugView, Supabase/Vercel 운영 경로. 운영 secret과 Supabase access token이 없다.

---

## 2026-07-10 — B2 local test-payment readiness

Status: **local readiness PASS / ship NG**

### Tested
- `npm test` in `web`: 63 passed. Existing `NotificationBadge` React `act(...)` warning remains.
- `npm run build` in `web`: PASS.
- `supabase migration up --local`: applied `20260710042000_payment_compensation_audit.sql`.
- `supabase test db`: 52 passed.
- `curl -I -L http://localhost:3456/`: 200 OK.
- `E2E_BASE_URL=http://localhost:3456 E2E_GOAL_SLUG=7druulwd npm run test:e2e -- e2e/goal-flow.spec.ts`: 14 passed.
- `cheer-order` local Edge Function smoke: 201 Created, order generated with `paymentId` and `cheerId`.
- `toss-confirm` local Edge Function smoke: 503 `missing_toss_secret`, confirming function load/auth/secret guard path without real Toss secret.

### Covered B2 Controls
- `payment READY -> DONE`, `cheer PENDING -> CONFIRMED`, `clover_ledger EARN`.
- Amount tamper rejection.
- DONE retry idempotency and `payment_key` mismatch rejection.
- `payment.payment_key` partial unique index.
- Receiver balance serialization for first and subsequent payments.
- `create_cheer_order`/`confirm_cheer_payment` execute grants restricted to `service_role`.
- Authenticated clients cannot directly select raw `payment` rows.
- PG-success/DB-failure compensation is durable: `CANCELED` + `payment_log` when Toss cancel succeeds, `FAILED` + `risk_event` when manual reconcile is required.

### Not Yet QA Exit
- Real Toss stage/test-key payment E2E.
- `toss-webhook` production lookup verification and compensation replay.
- Refund/cancel UX beyond DB-failure auto-cancel.
- 환전/PASS/payout/legal/privacy.
- Supabase cloud/Vercel deployment, environment secrets, and Toss/Kakao redirect URLs.

### Review
- `code-builder` patched B2 payment hardening.
- `qa-verifier` reviewed scope: local readiness PASS, ship NG.
- Codex-style read-only money review found the durable compensation gap; patched and re-tested.

---

## 2026-07-24 — 1차 베타 회장 지적 회귀 트래커

범위: `docs/backlog-2026-07-20.md`에 기록된 회장 직접 지적만. 신규 v2 기능, 결제 외부승인, 별도 보안 감사 항목은 이 묶음에서 제외한다.

| ID | 상태 | 회장 지적 | 현재 증거 | 해제 조건 |
|---|---|---|---|---|
| BETA-NG-01 | 🟡 부분 해제·배포 전 | 공개 목표의 프로필이 `?`로 보임 | 수정 production build+운영 데이터 `/g/knirdtaq`를 320/390/430px에서 관찰: `?`·`익명` 0, 클로버+`해낼게 사용자` 폴백. 실제 카카오 이미지·닉네임 데이터 연결은 미구현 | 1차 베타에서 중립 폴백을 채택할지, 실제 프로필 공개 계약을 재설계할지 회장 결정 후 prod 확인 |
| BETA-NG-02 | 🧪 로컬 테스트·배포 전 | 링크 복사가 아이콘이 아님 | 44×44 Copy/Check 아이콘·clipboard URL·fallback·analytics 단위 테스트 PASS. 인증된 `/home` 실브라우저는 미검증 | prod 로그인 `/home`에서 아이콘과 실제 clipboard URL 관찰 |
| BETA-NG-03 | 🧪 로컬 테스트·배포 전 | 본인만 보는 개별 클로버 금액에 설명이 없음 | 실명·익명 응원 모두 `🍀 N` 옆 `나만 보임` 단위 테스트 PASS, 공개 `/g/knirdtaq`에는 개인 금액·라벨 비노출 관찰 | prod 로그인 `/home`에서 소유자 전용 라벨 관찰 |
| BETA-NG-04 | ✅ 로컬 E2E·배포 전 | 워드맵이 이상하고 겹쳐 보임 | 수정 production build+운영 데이터, 320/390/430px: 12단어 bounding-box 교차 0·컨테이너 이탈 0·가로 overflow 0, 390px 캡처 직접 확인 | prod 배포 후 같은 3 viewport 재관찰 |
| BETA-PASS-05 | ✅ PASS | 신고 제출 오류 | 프로덕션 `/g/knirdtaq`에서 기타 사유 신고 1건 제출, EF `HTTP 201`과 `신고가 접수됐어요` 완료 화면 직접 관찰 | UI 제출 오류 해제. 운영 Slack 수신 여부는 별도 미검증 |
| BETA-PENDING-06 | ⚠️ 미검증 | 로그아웃과 클로버 선택 UI | 구현·단위 테스트는 있으나 현재 프로덕션 사용자 경로를 직접 확인하지 않음 | 프로덕션 브라우저에서 로그아웃 세션 종료, 클로버 1/3/5/10 선택·직접입력 화면 관찰 |

### 원인 분류

- BETA-NG-01: 인증 단계에는 프로필 저장이 있으나 공개 목표 조회·표현 계층까지 전달되지 않은 데이터 연결 누락.
- BETA-NG-02: 기능 완료를 시각 요구 완료로 오판한 요구 추적 누락.
- BETA-NG-03: 본인/친구 화면의 정보 차이를 설명하는 마이크로카피 누락.
- BETA-NG-04: 200px 고정 좌표·고정 크기 배치가 실제 단어 길이와 충돌하는 레이아웃 제약.
- BETA-PASS-05: 모든 응답에 CORS 헤더를 붙인 기존 보정이 현재 프로덕션에 반영되어 UI→EF 제출 경로는 정상화됨.

### 2026-07-24 수정 후 증거

- `npm test`: 26 files / 186 tests PASS.
- `npm run build`: compile·TypeScript·17 routes PASS.
- 운영 브라우저에 공개된 Supabase URL·anon key를 런타임 QA에만 사용해 수정 production build를 실제 운영 데이터에 연결했다. 비밀값 원문은 문서·로그에 기록하지 않았다.
- Playwright actual browser: `/g/knirdtaq` 320/390/430px 모두 HTTP 200, 목표 카드 `?`/`익명` 0, 클로버 폴백 1, 워드맵 overlap 0·clip 0·horizontal overflow 0.
- 390px 화면 증거: `/private/tmp/haenael-beta-local-after.png`.
- 독립 `qa-verifier`는 unit/build PASS를 재현했지만 샌드박스 포트·Chromium 제약으로 actual browser를 못 봤고, 품질 게이트도 QA 스킬 미호출로 FAIL했다. 따라서 그 자기보고는 출고 근거로 쓰지 않고 컨트롤러의 actual-browser 관찰을 별도 증거로 채택했다.
- 로그인된 `/home` actual browser와 prod 배포 후 회귀는 여전히 미검증이다.
