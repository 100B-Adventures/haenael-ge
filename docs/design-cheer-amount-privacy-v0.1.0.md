<!-- STAMP
파일: docs/design-cheer-amount-privacy-v0.1.0.md
생성: 2026-07-19 (분단위) · 모델: Opus 4.8 (1M) · 에이전트: tech-architect
스킬: SKILLS_SKIPPED(방향+SQL초안 설계노트 — 파일산출 스킬 diagram/document-generate 불요, 아래 §끝 선언)
근거: Codex 크로스리뷰 High 발견 + init_schema.sql:107/310/338/439/447/559 직접 Read
고민 한 줄: "anon SELECT를 막되 공개 워드맵·응원자 이름·집계가 안 깨지는가"가 전부다 — 의존처 전수분석이 본체.
-->

# 개인정보 유출 차단 설계 — cheer.clover_amount (해낼게)

> 회장 결정 B(2026-07-19): **받는사람 본인만** 개별 클로버 금액 확인, 제3자·공개엔 비노출.
> 등급: High(개인정보 유출) · 대상: DB 정책(RLS/GRANT/뷰) · 코드 변경 불필요(아래 §2 검증).
> 상태: **설계 초안 — 아직 미적용**. SQL은 승인 후 `supabase/migrations/`로 이동해 적용.

---

## 0. 유출의 정확한 정체 (2겹이다 — anon만이 아니다)

`cheer` 테이블에 걸린 SELECT 권한이 두 경로로 개별 금액을 노출한다:

| 경로 | 근거(파일:라인) | 노출 대상 | 노출 컬럼 |
|---|---|---|---|
| **anon 직접 REST** | `GRANT SELECT ON cheer TO anon` (init:559) + 정책 `cheer_select_confirmed`(init:439, `TO` 없음=PUBLIC) | 비로그인 누구나 | `clover_amount`, `supporter_ci`, `display_name`, `message` |
| **authenticated 비소유자** | `GRANT SELECT ON cheer TO authenticated`(init:559) + 같은 PUBLIC 정책 | **아무 로그인 유저나 남의 목표** | 위와 동일 |

`cheer_select_confirmed` 정책은 `USING (status='CONFIRMED' AND deleted_at IS NULL)` 뿐 — **목표 소유 조건이 없다.** `TO` 절이 없어 anon·authenticated 모두에 적용된다. 즉 `GET /rest/v1/cheer?goal_id=eq.<남의목표>&select=clover_amount,supporter_ci`를 anon 키로도, 아무 로그인 유저로도 그대로 조회 가능.

`supporter_ci`(후원자 본인확인 CI = 주민 수준 식별자)까지 새는 건 clover_amount보다 더 심각하다 — 이 설계는 그 컬럼도 함께 닫는다.

---

## 1. 의존처 전수 분석 (선행 — "막으면 뭐가 깨지나")

`cheer` 테이블을 SELECT 하는 **모든** 경로와 각 경로가 의존하는 권한:

| # | 경로 | 파일:라인 | 실행 role | 의존 정책/권한 | anon 직접 grant 필요? |
|---|---|---|---|---|---|
| 1 | 공개 목표페이지 owner 바 | `web/src/app/g/[slug]/page.tsx:126-130` | authenticated, **본인 goal만**(`.eq member_id`) | `cheer_select_goal_owner`(init:447) | ❌ |
| 2 | 받는사람 홈 응원목록 | `web/src/app/(receiver)/home/page.tsx:130-137` | authenticated, 본인 goal | `cheer_select_goal_owner` | ❌ |
| 3 | 워드맵 풀뷰 응원자 수 | `web/src/app/(receiver)/wordmap/[goalId]/page.tsx:59-64` | authenticated, **소유자만 진입**(page.tsx:39 `member_id=user.id`) | `cheer_select_goal_owner` | ❌ |
| 4 | 공개 목표페이지 집계(cheer_count) | `goal_public` 뷰 내부 subquery (init:320-326), page.tsx:54 | anon/authenticated가 **뷰**를 조회 | 뷰 소유자(postgres) 권한으로 실행 → **RLS·base grant 우회** | ❌ (뷰 grant만 필요, 있음 init:547) |
| 5 | 공개 워드맵 | `get_wordmap` RPC (init:338, `SECURITY DEFINER`) | 정의자 권한 → RLS·base grant 우회 | 함수 EXECUTE grant(init:550) | ❌ |
| 6 | wordmap-render EF | `supabase/functions/wordmap-render/index.ts:204` | service_role | RLS 전면 우회 | ❌ |
| 7 | report EF | `supabase/functions/report/index.ts:86` | service_role | RLS 전면 우회 | ❌ |

### 결론: anon의 직접 `cheer` SELECT에 의존하는 코드 경로는 **0개**.
- 공개면(집계 #4·워드맵 #5)은 전부 **뷰(정의자 권한)** 또는 **SECURITY DEFINER RPC**로 우회 조회 → base 테이블 anon grant가 없어도 동작.
- 소유자 열람(#1·#2·#3)은 전부 `cheer_select_goal_owner` 정책(auth.uid()=goal.member_id)으로 커버 → PUBLIC 정책이 사라져도 무손상.
- EF(#6·#7)는 service_role → RLS 무관.

> ⚠️ 유일한 미래 의존: `g/[slug]/page.tsx:178` 주석 "최근 응원자 리스트는 공개 RLS/정렬 정책 확정 후 연결" — **공개 응원자 목록(이름·메시지, 금액 제외)** 이 계획되어 있다. 이건 `cheer` 직접 anon SELECT가 아니라 **금액 제외 공개 뷰**로 서빙해야 한다(옵션A가 이걸 미리 깐다).

---

## 2. 차단 방식 옵션 (되돌리기 비싼 것부터 · 트레이드오프)

RLS는 행 단위라 **컬럼 마스킹 불가** — "행은 보이되 금액 컬럼만 가림"은 RLS로 못 한다. 그래서 선택지는 "행 접근 자체를 소유자로 좁히고, 공개가 필요한 조각만 별도 표면(뷰/함수)으로 노출"이 된다.

### 옵션 A — 소유자 전용 RLS + 금액 제외 공개 뷰 (권장)
- `cheer_select_confirmed` PUBLIC 정책 **DROP**, `GRANT SELECT ON cheer FROM anon **REVOKE**`.
- 남는 base 접근 = `cheer_select_goal_owner`(소유자만) + authenticated grant.
- 공개 응원자 목록 대비 `cheer_public` 뷰 신설: `display_name, message, is_anonymous, created_at`만(clover_amount·supporter_ci **컬럼 자체 부재**), anon GRANT.
- **되돌림 비용**: 낮음(정책/grant 재선언 1줄씩). **기존 기능 영향**: 0(§1 분석). **마이그레이션 난이도**: 낮음.
- **장점**: Supabase 공식 권장 패턴(GRANT/REVOKE at role level + RLS 병행) 그대로. 금액을 아예 표면에서 제거 → 실수로 다시 새기 어려움. 미래 공개 응원자 목록까지 커버.
- **단점**: authenticated는 여전히 base `cheer` grant 보유 → 비소유자 authenticated는 정책상 0행이지만, 표면이 남아있음(정책 방어). → SEC 테스트로 회귀 고정.

### 옵션 B — 금액 컬럼 물리 분리 (별도 테이블)
- `clover_amount`(+`supporter_ci`)를 `cheer_private` 테이블로 이전, FK 1:1.
- **되돌림 비용**: 높음(스키마 이전 + 결제 confirm RPC `confirm_cheer_payment`·cashout 집계·홈 조회 전부 조인 재작성). **영향**: 결제/정산 핵심 경로 다수 수정. **난이도**: 높음(데이터 마이그레이션 + RPC 재작성 + 롤백 어려움).
- **장점**: 가장 강한 격리(금액이 물리적으로 다른 테이블). **단점**: 오버킬 — §1에서 금액 노출 경로는 단일 정책 결함이지 스키마 결함이 아니다. 되돌리기 비싼 변경을 실익 없이 감수.

### 옵션 C — 컬럼 레벨 GRANT (`GRANT SELECT (col…) `)
- anon/authenticated에 `clover_amount`·`supporter_ci` 제외 컬럼만 GRANT.
- **단점**: Supabase 공식이 "advanced, not recommended" 명시 — `SELECT *`(PostgREST 기본 `select=*`) 사용 시 즉시 42501, 클라이언트가 컬럼 명시 강제됨. 정책은 그대로 PUBLIC이라 행 노출 범위는 안 좁혀짐(소유자 격리 안 됨). 유지보수 함정.

### 추천 = **옵션 A**
근거: ①§1에서 깨지는 기능 0 확인 ②Supabase 공식 권장 조합(REVOKE + RLS, [Column Level Security 문서]가 컬럼 grant를 비권장) ③미래 공개 응원자 목록을 금액 제외 뷰로 선제 확보 ④되돌림 1줄. 옵션 B는 실익 대비 되돌림 비용 과다, C는 공식 비권장 + 행 격리 미해결.

---

## 3. 마이그레이션 SQL 초안 (미적용 — 승인 후 `supabase/migrations/20260719000000_cheer_amount_privacy.sql`로 이동)

```sql
-- 20260719000000_cheer_amount_privacy.sql
-- High 개인정보 유출 차단: cheer 개별 clover_amount·supporter_ci를 소유자로 격리.
-- 회장 결정 B(2026-07-19). 의존처 전수분석: docs/design-cheer-amount-privacy-v0.1.0.md §1 (깨지는 기능 0).

BEGIN;

-- (1) PUBLIC(anon+authenticated 비소유자)에 개별 응원 전체를 열어주던 정책 제거.
--     goal_public 집계(뷰=정의자권한)·get_wordmap(SECURITY DEFINER)는 영향 없음.
DROP POLICY IF EXISTS "cheer_select_confirmed" ON cheer;

-- (2) anon의 base 테이블 직접 SELECT 권한 회수. 공개면은 goal_public 뷰 + get_wordmap RPC로만.
REVOKE SELECT ON cheer FROM anon;

-- (3) 남는 접근: cheer_select_goal_owner(소유자만, init:447) + authenticated grant.
--     authenticated grant는 유지하되 정책이 소유자 행만 통과시키므로 비소유자는 0행.
--     (base 표면 최소화를 원하면 아래 주석 해제 — 단 소유자 조회는 정책+grant 둘 다 필요하므로 유지 권장)
-- REVOKE SELECT ON cheer FROM authenticated;  -- ❌ 하지 말 것: home/wordmap 소유자 조회가 grant 필요

-- (4) 미래 "공개 응원자 목록"용 금액 제외 뷰 (g/[slug]/page.tsx:178 계획).
--     clover_amount·supporter_ci 컬럼 자체 부재 → 실수로도 금액이 안 샌다.
--     기본 security_invoker OFF(정의자 권한) → 내부 cheer 접근에 anon base grant 불필요.
CREATE OR REPLACE VIEW cheer_public AS
SELECT
  c.id,
  c.goal_id,
  CASE WHEN c.is_anonymous THEN NULL ELSE c.display_name END AS display_name,
  c.is_anonymous,
  c.message,
  c.created_at
FROM cheer c
WHERE c.status = 'CONFIRMED'
  AND c.deleted_at IS NULL;

COMMENT ON VIEW cheer_public IS
  '공개 응원자 목록 뷰. clover_amount·supporter_ci 컬럼 부재(금액 3층 a). 익명이면 display_name NULL. anon SELECT 허용.';

GRANT SELECT ON cheer_public TO anon, authenticated;

COMMIT;
```

> 검증 포인트(적용 후): `\d+ cheer_public`에 `clover_amount` 없음 확인 / anon 키로 `cheer?select=clover_amount` → 401·empty / owner 홈 응원목록 정상.

---

## 4. pgTAP 테스트 초안 (기존 `supabase/tests/rls_policy.test.sql` 컨벤션 — plan 수 +5, 픽스처 재사용)

> 픽스처: A=`aaaa…001`, B=`bbbb…002`. `goal-a-live`·`goal-b-live` 존재. 아래는 SEC-2 블록 뒤에 삽입, `SELECT plan(52)` → `plan(57)`.
> **추가 픽스처 필요**: A의 goal에 CONFIRMED cheer 1건(금액 5클로버). payment FK 때문에 payment 먼저.

```sql
-- =========================================================================
-- SEC-5: cheer.clover_amount 개별 금액은 소유자만 (High 유출 차단, 결정 B)
-- =========================================================================

-- 픽스처: A 목표에 CONFIRMED 응원 1건 (payment FK 선행)
INSERT INTO payment (order_id, amount_krw, status, method)
VALUES ('hnl_sec5_pay', 5000, 'DONE', 'CARD');

INSERT INTO cheer (goal_id, supporter_ci, display_name, is_anonymous,
                   message, clover_amount, payment_id, status)
SELECT
  (SELECT id FROM goal WHERE slug = 'goal-a-live'),
  'ci_supporter_secret', '응원친구', false,
  '넌 할 수 있어', 5,
  (SELECT id FROM payment WHERE order_id = 'hnl_sec5_pay'),
  'CONFIRMED';

-- SEC-5a: anon은 cheer 테이블 직접 SELECT 불가 (grant 회수)
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT clover_amount FROM cheer$$,
  '42501',
  NULL,
  'SEC-5a: anon은 cheer 직접 SELECT 불가 (개별 금액·CI 차단)'
);
RESET ROLE;

-- SEC-5b: 사용자B(로그인, 비소유자)는 A 목표의 개별 응원 금액 조회 불가 (0행)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"bbbbbbbb-0000-0000-0000-000000000002","iss":"supabase-demo"}', true);
SELECT is(
  (SELECT count(*)::integer FROM cheer
   WHERE goal_id = (SELECT id FROM goal WHERE slug = 'goal-a-live')),
  0,
  'SEC-5b: 비소유자 authenticated는 남의 목표 개별 응원(금액) 조회 불가'
);
RESET ROLE;

-- SEC-5c: 소유자 A는 자기 목표의 개별 응원 금액 조회 가능 (기능 보존)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","iss":"supabase-demo"}', true);
SELECT is(
  (SELECT clover_amount FROM cheer
   WHERE goal_id = (SELECT id FROM goal WHERE slug = 'goal-a-live') LIMIT 1),
  5,
  'SEC-5c: 소유자는 자기 목표 개별 응원 금액 조회 가능(본인만 노출 — 결정 B)'
);
RESET ROLE;

-- SEC-5d: 공개 뷰 cheer_public에 clover_amount·supporter_ci 컬럼 부재 (금액 3층 a)
SELECT hasnt_column('public', 'cheer_public', 'clover_amount',
  'SEC-5d: cheer_public에 clover_amount 컬럼 없음');
SELECT hasnt_column('public', 'cheer_public', 'supporter_ci',
  'SEC-5d: cheer_public에 supporter_ci 컬럼 없음');

-- SEC-5e: 공개면 집계(goal_public.cheer_count)·워드맵은 정책 제거 후에도 동작 (회귀 방어)
SET LOCAL ROLE anon;
SELECT is(
  (SELECT cheer_count FROM goal_public WHERE slug = 'goal-a-live'),
  1,
  'SEC-5e: anon은 goal_public 집계 cheer_count 정상 조회(뷰=정의자권한, 개별금액 아님)');
RESET ROLE;
```

> plan 증가: SEC-5a~5e = 6 assertion → `plan(52)` → `plan(58)`. (5d 2건 포함)

---

## 5. 셀프심문 (CoVe) — "이 차단이 공개 기능을 깨뜨리는가?"

- **Q: anon `cheer` grant를 회수하면 공개 워드맵이 깨지나?** → 아니다. `get_wordmap`은 `SECURITY DEFINER`(init:342)라 정의자(postgres) 권한으로 cheer를 읽는다. anon base grant 무관. EXECUTE grant(init:550)만 있으면 됨. **근거 확인**.
- **Q: 공개 목표페이지의 응원 개수(cheer_count)가 깨지나?** → 아니다. `goal_public` 뷰의 subquery(init:320)는 뷰 소유자 권한으로 실행(security_invoker 미설정=OFF). anon은 뷰 grant(init:547)만 필요. **근거 확인**.
- **Q: `cheer_select_confirmed` DROP이 소유자 응원목록(home/g/[slug])을 깨나?** → 아니다. 소유자는 `cheer_select_goal_owner`(init:447)로 통과. 세 페이지 모두 `member_id=user.id`로 이중 스코프(page.tsx:116·home:133·wordmap:39). **근거 확인**.
- **Q: 응원자 이름·메시지 공개(미래)가 막히나?** → 오히려 `cheer_public` 뷰로 정식 표면을 깔아준다(금액·CI 제외). 익명이면 이름 NULL 처리. **설계 반영**.
- **Q: 0번 게이트 — 매칭 스킬을 호출했나?** → 이 산출물은 단일 설계노트(분석+옵션+SQL/테스트 초안)로, `diagram`(다이어그램 파일)·`document-generate`(문서 자동생성)는 이 SQL 보안설계에 부적합. 손코딩 아닌 분석·계약 텍스트라 SKILLS_SKIPPED 선언.

## 6. 레드팀 (회의적 보안리뷰어 관점)
- 공격: "authenticated grant를 남겨두면 정책 버그 한 줄에 다시 전원 노출된다." → 반영: base 표면 최소화 대안(REVOKE authenticated)을 명시하되, 소유자 조회가 grant를 요구하므로 유지 + **SEC-5b 회귀 테스트로 비소유자 0행을 CI 고정**. 정책이 유일 방어선이 되지 않게 테스트가 2차 방어.
- 공격: "cheer_public 뷰가 security_invoker OFF면 미래에 민감 컬럼 추가 시 자동 노출." → 반영: 뷰 컬럼을 화이트리스트로 명시(SELECT * 금지), 금액·CI는 물리적으로 뷰에서 제외. 컬럼 추가는 명시적 ALTER VIEW를 거쳐야만 노출.
- 잔여 리스크(회수): supabase Advisor의 `security_definer_view` lint가 `cheer_public`을 경고할 수 있음 — 공개 뷰는 정의자권한이 의도이므로 `security_invoker` 트레이드오프를 적용 전 1회 확인 권장.

---

## ⛔ 회수 필요 (회장 결정)
1. **authenticated base grant 유지 vs 회수**: 유지(추천 — 소유자 조회에 필요, 정책+테스트로 방어) vs 회수(표면 0이지만 소유자 조회를 뷰/RPC로 재설계 필요). → 추천: **유지 + SEC-5b 테스트 고정**.
2. **`cheer_public` 뷰 지금 만들까**: 공개 응원자 목록이 곧 나온다면 지금(추천), 아니면 유출 차단만(옵션A의 1·2번만) 먼저. → 추천: **뷰 포함**(선제, 되돌림 저렴).

---

SKILLS_USED: 없음
SKILLS_SKIPPED: diagram·document-generate — 본 산출물은 SQL 보안설계 분석+계약 초안(다이어그램 파일/문서 자동생성 대상 아님)이라 부적합. spec은 대화형이라 메인세션 전용.

SOURCES/MODEL: opus-4-8[1m] / 근거 파일: supabase/migrations/20260705163137_init_schema.sql(cheer:107, goal_public:310, get_wordmap:338, cheer_select_confirmed:439, cheer_select_goal_owner:447, grants:544-586), web/src/app/g/[slug]/page.tsx:126, web/src/app/(receiver)/home/page.tsx:130, web/src/app/(receiver)/wordmap/[goalId]/page.tsx:39-64, supabase/functions/{wordmap-render,report}/index.ts, supabase/tests/rls_policy.test.sql(픽스처·SEC 컨벤션), ~/.claude/standards/dev.md. 벤치마크: Supabase Column Level Security 문서(컬럼 grant 비권장), Securing your data 문서(REVOKE+RLS 병행 권장) — https://supabase.com/docs/guides/database/postgres/column-level-security · https://supabase.com/docs/guides/database/secure-data
