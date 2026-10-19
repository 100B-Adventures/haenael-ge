# 해낼게 V2 소셜 바이럴 루프 웹 우선 ERD
| 항목 | 값 |
|---|---|
| 버전 | **v1.2.2** (Codex 4차 15/25 반려 반영: 문서 내부 모순 전수 제거) |
| 작성일 | v1.1.0 2026-10-13 02:42 KST · **v1.2.x 개정 2026-10-19 16:3x KST** |
| 작성자/모델 | v1.1.0 tech-architect / gpt-5-codex · **v1.2.0 tech-architect / claude-opus-5[1m]** |
| 작업 라인 | v2 |
| 상태 | **운영 적용 완료분의 현황 기록 + 추가 변경 계약.** v1.1.0 은 미적용 전제였으나 실측상 적용됐다(§A.1) |
| 상류 핀 | `docs/design/prototypes/social-viral-loop-v3-opus5.html` **3.0.0** sha256 `f9398150755d42b2afbf5bdd7b6d982fd52b10ba8b6dd7da9b1ff72b3b9dca0c` · `DESIGN.md` sha256 `0ddeed8caff763de7b91ed5a0c178bf406c59a6ccefa65dcf5f057929e04c24a` · `docs/design/standard-ux-writing.md` sha256 `06e4ba1007bbb37c552d6c56a4fdfe4abbe86bcc06c9776dc4579b009fe26ece` · 동급 설계 `fdd-social-viral-loop-web-first-v1.2.2.md` · 운영 기준 `supabase/migrations/` 전 49건 · `DESIGN.md` sha256 `0ddeed8caff7…` |
| 기반 포맷 | `docs/eng-design/erd-social-viral-loop-web-first-v1.1.0.md` (v1.1.0, sha256 `df77ccfe23ba…`) |

> STAMP: 생성 2026-10-13 02:42 KST. 모델 gpt-5-codex. 에이전트 tech-architect. 스킬 docs. 근거는 현재 운영 스키마, D-003·D-018·D-SOCIAL-V6, Supabase·PostgreSQL 공식 문서다. 가장 오래 고민한 지점은 친구공개를 기존 정의자 권한 view와 함수에서 누락 없이 강제하는 방법이었다.

> PATCH v1.0.1 사유: D-019 확정에 맞춰 FRIENDS 커버의 `public_path`를 금지하고 private object path와 120초 Presigned URL 경계를 명시했다.

> v1.1.0 사유: D-022 집계의 호출자 귀속을 위해 client 비공개 attribution 테이블과 `my_social_dashboard()` read model을 추가했다. 업적 자체를 저장하는 테이블은 만들지 않고 기존 원장에서 매번 집계한다.

## 목차
- [A. v1.2.x 개정 (운영 적용 현황과 추가 변경)](#a-v12-개정-운영-적용-현황과-추가-변경)
  - [A.1 운영 적용 실측표](#a1-운영-적용-실측표)
  - [A.2 D-024 로 바뀐 관계 생성 경로](#a2-d-024-로-바뀐-관계-생성-경로)
  - [A.3 이번 개정의 스키마 변경 (3건, 전부 비파괴)](#a3-이번-개정의-스키마-변경-3건-전부-비파괴)
  - [A.4 중단분 정리 실행 계약](#a4-중단분-정리-실행-계약)
    - [A.4.1 삭제 순서](#a41-삭제-순서-행을-먼저-deleted-로-객체는-나중에-채택)
    - [A.4.2 큐 소비자 계약](#a42-큐-소비자-계약-storage_cleanup_queue-를-비우는-주체)
  - [A.5 되돌리는 법](#a5-되돌리는-법)
  - [A.6 운영 `goal_cover_asset` 스키마 전수 (관찰됨)](#a6-운영-goal_cover_asset-스키마-전수-관찰됨)
- [0. 요약](#0-요약)
- [1. 기존 스키마 재사용](#1-기존-스키마-재사용)
- [2. ERD](#2-erd)
- [3. 기존 테이블 변경](#3-기존-테이블-변경)
- [4. 신규 테이블](#4-신규-테이블)
- [5. 공개범위·RLS 행렬](#5-공개범위-rls-행렬)
- [6. Storage 계약](#6-storage-계약)
- [7. 무결성·인덱스·동시성](#7-무결성-인덱스-동시성)
- [8. 마이그레이션과 롤백](#8-마이그레이션과-롤백)
- [9. 데이터 안전 수용기준](#9-데이터-안전-수용기준)
- [10. 비범위](#10-비범위)
- [11. 개정 이력](#11-개정-이력)

## A. v1.2 개정 (운영 적용 현황과 추가 변경)
> 이 장이 이 문서의 **데이터 계약 정본**이다. 같은 사실을 두 번 적지 않는다(전수 대조 결과 = §A.7). 대상은 **운영 중인 Supabase(`ossvejipdivgxzcqszbw`)** 이고 v1 환전 라인이 같은 DB 를 쓴다. **파괴적 변경은 하지 않는다.**

### A.1 운영 적용 실측표
v1.1.0 은 "additive migration 계약"(앞으로 적용할 것)으로 쓰였고 `pipeline-state.v2.md` 의 build 핀도 두 migration 을 "운영 미적용" 으로 적었다. **실측 결과 이미 적용돼 있다.** 그 주석이 낡았다.

| 대상 | 운영 상태 | 확인 명령 | 등급 |
|---|---|---|---|
| `friend_invite` | 존재 | `GET /rest/v1/friend_invite?select=id&limit=0` (anon) → 42501 `permission denied for table public.friend_invite` = **테이블 실재 + anon 차단 정상** | 관찰됨 |
| `friend_connection` | 존재 | 같음 → 42501 | 관찰됨 |
| `goal_cover_asset` | 존재 | 같음 → 42501 | 관찰됨 |
| `member_preference` | 존재 | 같음 → 42703 `column member_preference.id does not exist` = **테이블 실재**(PK 가 `member_id`) | 관찰됨 |
| `social_cheer_member_attribution` | 존재 | 같음 → 42703 = **테이블 실재**(PK 가 `cheer_id`) | 관찰됨 |
| `cheer_public` 뷰 | 존재, anon 200 | `GET /rest/v1/cheer_public?select=id&limit=0` → 200 `[]` | 관찰됨 |
| `cheer` 기반 테이블 | anon 직접 SELECT 차단 | → 42501 | 관찰됨 |
| `goal`·`member` | anon 200(기존 공개 경로) | → 200 `[]` | 관찰됨 |
| 적용 migration | `20261013050000`·`20261013060000`·`20261015010000`·`20261016021000` | 위 테이블 실재와 RPC 10종 응답으로 역추론 | 근거 확인 |
| `goal-cover-public` 버킷 | 존재 | `GET /storage/v1/object/public/goal-cover-public/probe.png` → `NoSuchKey` | 관찰됨 |
| `goal-cover-quarantine` 버킷 | **미검증**(비공개 버킷은 공개 경로에서 `NoSuchBucket`) | 같음 | **미검증** |
| migration 정의상 버킷 | 2/2 정의됨 | `supabase/migrations/20261013050000_social_viral_loop_web_first.sql:145` | 근거 확인 |

측정일 2026-10-19. 운영 쓰기 0건. **`supabase_migrations.schema_migrations` 를 직접 읽지 못했다**(관리 API 403, PostgREST 미노출). 그래서 적용 여부는 테이블·함수 실재로 역추론했고 등급을 `근거 확인` 으로 적는다. 목록 자체를 보려면 회장 계정의 Supabase 콘솔이 필요하다.

### A.2 D-024 로 바뀐 관계 생성 경로
v1.1.0 §4.3 은 `friend_connection.origin_invite_id` 만 두고 **관계가 초대로만 생긴다**고 전제했다. D-024(2026-10-14)가 이것을 뒤집었다: **확정 응원이 그 순간 양방향 친구를 만든다.** 운영에는 이미 그 구현이 있다.

| 항목 | v1.1.0 전제 | 현재 운영(실측·migration) |
|---|---|---|
| 생성 경로 | 초대 수락 1개 | **확정 응원**(`social_connect_confirmed_cheer_trigger`·`social_connect_attributed_cheer_trigger`) + 초대 수락 |
| 과거 이력 | 해당 없음 | `social_backfill_confirmed_cheer_friendships()` 가 소급 적용 |
| 방향 | 없음 | `20261016021000_friend_relationship_direction.sql` 이 추가 |
| `origin_invite_id` | 필수 관계 근거 | **nullable 유지.** 응원으로 맺어진 행은 `NULL` 이다 |

**정렬된 쌍 유니크 제약(`member_low_id < member_high_id` + UNIQUE)이 두 경로를 동시에 안전하게 만든다.** 응원과 초대가 같은 쌍에 대해 동시에 들어와도 관계는 1건이다. 이 제약을 약화하지 않는다.

**관계 방향은 저장하지 않고 판정한다.** `relationship_direction` 을 컬럼으로 두면 응원이 추가될 때마다 갱신해야 하고 그 갱신이 빠지면 화면이 거짓을 말한다. 확정 응원 기록에서 매번 계산한다(`social_has_confirmed_cheer` 재사용). 입력은 응원의 **유무**뿐이고 금액은 쓰지 않는다(D-003).

### A.3 이번 개정의 스키마 변경 (3건, 전부 비파괴)
6차 개정 R1~R10 중 **스키마를 요구하는 것은 없다.** R1 법적 고지는 정적, R2 비회원 미리보기는 **클라이언트 상수**(회장 확정: 서버 호출 0), R3·R9·R10 은 CSS, R4 는 카피, R5 는 클라이언트, R6 은 기존 테이블 조회, R7 은 UI 제거, R8 은 컴포넌트, D-034 는 `proxy.ts` 다.

**신설 RPC·테이블은 0건이다.** v1.2.0 이 후보로 둔 `platform_social_stats()` 는 회장이 집계 수치 안을 택하지 않아 **폐기**됐다.

**그럼에도 3건이 필요하다.** 중단된 업로드를 치우는 작업에 쓸 자리가 운영에 없다. "서버 변경 0" 이라고 적으면 사실과 다르다.

| # | 변경 | 종류 | 왜 필요한가 | 파괴적 |
|---|---|---|---|---|
| 1 | `storage_cleanup_queue.reason` CHECK 에 `ABANDONED_UPLOAD` 추가 | 제약 교체 | 현재 허용값이 3개(`VISIBILITY_DOWNGRADE`·`ASSET_REPLACED`·`ASSET_REJECTED`)뿐이라 **중단 업로드를 큐에 넣을 수 없다**(`migration:79`) | 아니다. 허용값만 늘린다. 기존 행은 전부 그대로 유효 |
| 2 | 정리 함수 1개 + 부분 인덱스 1개 + 명명된 cron job 1개 | 신규 함수·인덱스·job | 정책만 있고 **실행 주체가 레포에 0건** | 아니다. `DROP` 으로 완전 되돌림 |
| 3 | **Storage 큐 소비자** 엣지 함수 1개 + cron job 1개 + `storage_cleanup_queue.locked_at` 컬럼 1개 | 신규 함수·job·컬럼 | **DB 행 삭제는 Storage 객체를 지우지 않는다.** 객체를 지우는 주체가 레포에 0건이라 큐만 쌓인다(§A.4.2) | 아니다. 컬럼 추가는 비파괴, 함수·job 은 삭제 가능 |

```sql
-- ① 정리 큐 사유 추가 (비파괴: 허용값만 늘린다)
ALTER TABLE public.storage_cleanup_queue
  DROP CONSTRAINT storage_cleanup_queue_reason_check;
ALTER TABLE public.storage_cleanup_queue
  ADD CONSTRAINT storage_cleanup_queue_reason_check
  CHECK (reason IN ('VISIBILITY_DOWNGRADE', 'ASSET_REPLACED', 'ASSET_REJECTED', 'ABANDONED_UPLOAD'));

-- ② 24시간 경과 중단분 조회용 부분 인덱스
CREATE INDEX IF NOT EXISTS goal_cover_asset_abandoned_idx
  ON public.goal_cover_asset(created_at)
  WHERE status = 'UPLOADING';

-- ③ 정리 함수. 객체 삭제는 큐가 맡고 이 함수는 큐 등록과 상태 전이만 한다.
CREATE OR REPLACE FUNCTION public.purge_abandoned_goal_covers(p_older_than interval DEFAULT interval '24 hours')
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_count integer := 0;
BEGIN
  WITH target AS (
    SELECT a.id, a.goal_id, a.quarantine_path
    FROM public.goal_cover_asset AS a
    WHERE a.status = 'UPLOADING'
      AND a.created_at < now() - p_older_than
      AND NOT EXISTS (
        SELECT 1 FROM public.goal AS g
        WHERE g.active_cover_asset_id = a.id      -- 활성 커버는 어떤 경우에도 건드리지 않는다
      )
    FOR UPDATE SKIP LOCKED
  ), queued AS (
    INSERT INTO public.storage_cleanup_queue (goal_id, bucket_id, object_path, reason)
    SELECT t.goal_id, 'goal-cover-quarantine', t.quarantine_path, 'ABANDONED_UPLOAD'
    FROM target AS t
    RETURNING 1
  ), marked AS (
    UPDATE public.goal_cover_asset AS a
    SET status = 'DELETED'
    WHERE a.id IN (SELECT id FROM target)
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM marked;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_abandoned_goal_covers(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_abandoned_goal_covers(interval) TO service_role;
```

**왜 상태를 `DELETED` 로 두고 행을 지우지 않나**: 행을 먼저 지우면 격리 객체가 고아가 된다. 상태만 `DELETED` 로 바꾸고 객체 삭제는 큐가 맡는다. `DELETED` 는 **운영 CHECK 가 이미 허용하는 값**이라(`migration:56`) 추가 변경이 없다. 그리고 `goal_cover_asset_state_check` 가 `SUPERSEDED`·`DELETED` 에는 칸 제약을 걸지 않으므로(`migration:68`) 전이가 제약에 막히지 않는다.

### A.4 중단분 정리 실행 계약
v1.2.0 은 "`cashout-account-purge-scheduler.md` 와 같은 방식" 한 줄만 적었다. **job 이름·주기·명령·권한·재시도·관측이 없었다**(Codex 반려 2번). 그 선례 문서와 같은 수준으로 적는다.

| 항목 | 값 |
|---|---|
| 실행 수단 | **Supabase Cron(`pg_cron`)** 으로 DB 함수를 직접 호출한다. 대상과 함수가 같은 DB 에 있어 네트워크·HTTP 인증·별도 런타임이 없다 |
| job 이름 | `purge-abandoned-goal-covers` (고정. 같은 이름 job 이 있으면 새로 만들지 않고 기존 job 의 schedule·command 를 확인한다) |
| 주기 | `17 4 * * *` (매일 04:17 UTC = 13:17 KST). 기존 `purge-expired-cashout-accounts`(03:17 UTC)와 시각을 겹치지 않게 둔다 |
| 명령 | `SELECT public.purge_abandoned_goal_covers();` |
| 실행 권한 | `service_role` 만 EXECUTE. `anon`·`authenticated`·PUBLIC 은 revoke |
| 대상 조건 | `status='UPLOADING' AND created_at < now() - interval '24 hours'` **그리고 활성 커버가 아닌 것** |
| 건드리지 않는 것 | `REVIEW`·`APPROVED`·`REJECTED`·`SUPERSEDED` 행, `goal.active_cover_asset_id` 가 가리키는 자산, 24시간 미경과 행 |
| 객체 삭제 순서 | 함수는 **큐 등록 + 상태 전이만** 한다. 실제 객체 삭제는 `storage_cleanup_queue` 소비자가 한다. 객체가 지워진 뒤에만 큐 행이 `DONE` 이 된다 |
| 재시도 | 큐 소비자가 실패하면 `attempts` 를 1 증가시키고 `status='FAILED'` 로 남긴다. 다음 실행이 `FAILED`·`PENDING` 을 함께 집는다. **고아 객체를 만들지 않기 위해 행을 먼저 지우지 않는다** |
| 동시성 | `FOR UPDATE SKIP LOCKED`. 작업이 겹쳐 돌아도 같은 자산을 두 번 처리하지 않는다 |
| 관측 | `cron.job_run_details` 의 그 job 최근 실행 `status='succeeded'` 와 `return_message`. 큐 쪽은 `storage_cleanup_queue` 의 `status='FAILED' AND attempts >= 3` 건수 |
| 미등록 대비 | `pg_cron` 확장·job 등록 권한이 없으면 migration 이 NOTICE 만 남기고 건너뛴다(기존 두 migration 과 같은 패턴). **그래서 배포 후 아래 조회로 실제 등록을 확인하는 것이 종료 조건이다** |

```sql
-- 등록
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'purge-abandoned-goal-covers',
  '17 4 * * *',
  $$SELECT public.purge_abandoned_goal_covers();$$
);

-- 등록 확인 (종료 증거 ①)
SELECT jobid, jobname, schedule, command, active
FROM cron.job WHERE jobname = 'purge-abandoned-goal-covers';

-- 실행 이력 확인 (종료 증거 ②)
SELECT jobid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'purge-abandoned-goal-covers')
ORDER BY start_time DESC LIMIT 5;
```

**종료 증거 3개** ①job 1개가 `active=true` 이고 schedule·command 가 위 값과 같다 ②최초 실행의 `status='succeeded'` 가 관찰된다 ③**25시간 fixture 를 넣고 함수를 직접 호출해 그 자산만 `DELETED` 가 되고 큐에 `ABANDONED_UPLOAD` 로 들어가는 것을 관찰한다**(TC = CV-08). 정책이 문서에 있다는 것으로 통과하지 않는다.

**선례와 다른 점**: 환전 계좌 파기는 함수 하나가 삭제까지 끝내지만, 커버는 **DB 행과 Storage 객체가 둘이라** 한 트랜잭션으로 묶을 수 없다. 그래서 큐를 중간에 둔다. 이 비대칭 때문에 순서를 한쪽으로 못박아야 한다. 채택한 순서와 이유는 §A.4.1 이다.

#### A.4.1 삭제 순서: 행을 먼저 `DELETED` 로, 객체는 나중에 (채택)
**Supabase 에서 DB 행 삭제는 Storage 객체를 지우지 않는다.** 객체는 Storage API 로 따로 지워야 한다(공식 문서). 둘을 한 트랜잭션으로 묶을 수 없으므로 어느 쪽이 먼저든 부분 실패가 생긴다. 그래서 **한쪽을 택하고 그 실패 모양을 감당 가능하게** 만든다.

| 순서 | 부분 실패 시 남는 것 | 그것이 무엇을 뜻하나 | 판정 |
|---|---|---|---|
| **① 행을 `DELETED` 로 표시 → ② 객체 삭제 → ③ 큐 `DONE`** | 큐에 `PENDING`·`FAILED` 행이 남고 객체도 남는다 | **치울 대상이 큐에 기록돼 있다.** 다음 실행이 반드시 다시 집는다. 유실 0 | **채택** |
| 객체 삭제 → 행 삭제 | 객체는 지워졌는데 행이 남거나, 객체 삭제 후 행 삭제가 실패 | 행이 가리키는 객체가 없는 상태. 더 나쁜 것은 **큐에 기록을 남기기 전에 객체를 지우면 무엇을 지웠는지 추적이 없다** | 미채택 |

**채택 이유 한 줄**: 고아 객체는 큐가 기억하므로 결국 치워지지만, 기록 없이 지운 객체는 되돌릴 수도 추적할 수도 없다. **남는 쓰레기보다 추적 불가가 더 비싸다.**

**행은 즉시 하드 삭제하지 않는다.** `status='DELETED'` 로 두고 큐가 `DONE` 이 된 뒤에만 하드 삭제한다(또는 보존한다). 행을 먼저 지우면 `quarantine_path` 를 잃어 무엇을 지워야 하는지 알 수 없다.

#### A.4.2 큐 소비자 계약 (`storage_cleanup_queue` 를 비우는 주체)
v1.2.1 은 "별도 소비자가 객체를 삭제한다" 고만 적었다. **그 소비자의 파일·실행·잠금·재시도·`DONE` 전이가 없었다.** 구현자가 DB 예약 작업만 만들면 job 은 성공하고 객체는 계속 남는다. 그 상태로 테스트가 통과하면 **허위 완료**다. 레포 전수 검색에서 `PENDING`·`FAILED` 큐를 읽어 Storage `remove()` 를 호출하는 구현은 **0건**이다.

| 항목 | 계약 |
|---|---|
| 구현 위치 | **`supabase/functions/storage-cleanup-worker/index.ts`** (신규 엣지 함수). DB 함수로는 할 수 없다. Storage 삭제는 Storage API 호출이다 |
| 실행 트리거 | Supabase Cron job **`drain-storage-cleanup-queue`**, `*/10 * * * *`(10분). 호출은 `pg_net` 으로 위 엣지 함수에 POST. 내부 토큰(`NOTIFY_INTERNAL_TOKEN` 과 같은 방식)으로 인증하고 `service_role` 키는 함수 안에만 둔다 |
| 입력 배치 | `status IN ('PENDING','FAILED') AND attempts < 5` 를 `created_at` 오름차순으로 **최대 200행**. 한 실행이 큐 전체를 쥐지 않는다 |
| 잠금 | 집는 즉시 `FOR UPDATE SKIP LOCKED` 로 선택하고 처리 중 표시를 둔다. 10분 주기가 겹쳐도 같은 행을 두 번 처리하지 않는다 |
| 삭제 호출 | 같은 `bucket_id` 끼리 묶어 Storage API `remove([paths])` **1회 일괄**. 행마다 호출하지 않는다 |
| 멱등성 | **이미 없는 객체의 삭제는 성공으로 본다.** Storage `remove()` 는 없는 키에 오류를 내지 않으므로 재시도가 같은 객체를 다시 지워도 결과가 같다. 따라서 재시도는 안전하다 |
| 성공 전이 | 객체 삭제가 확인되면 `status='DONE'`, `completed_at=now()`. 그리고 그 객체를 가리키던 `goal_cover_asset` 행이 `DELETED` 면 그때 하드 삭제한다 |
| 실패 전이 | `attempts = attempts + 1`, `status='FAILED'`. **큐 행을 지우지 않는다.** 다음 실행이 다시 집는다 |
| 포기 조건 | `attempts >= 5` 면 더 시도하지 않고 `FAILED` 로 남긴다. **그 건수가 운영 알림 대상이다**(조용히 사라지면 고아 객체를 영원히 모른다) |
| 관측 | `cron.job_run_details` 의 `drain-storage-cleanup-queue` 최근 실행 + `SELECT status, count(*) FROM storage_cleanup_queue GROUP BY 1` + `attempts >= 5` 건수 |
| 권한 | 엣지 함수만 `storage_cleanup_queue` 를 UPDATE 한다. 클라이언트 권한 0 |

**필요한 추가물(이번 개정의 신설 목록에 포함)**

| 추가 | 종류 |
|---|---|
| `supabase/functions/storage-cleanup-worker/` | 엣지 함수 1개 |
| `drain-storage-cleanup-queue` cron job | job 1개 |
| `storage_cleanup_queue` 에 `locked_at timestamptz` nullable | 컬럼 1개(비파괴) |

```sql
-- 처리 중 표시용 컬럼. 기존 행은 NULL 이고 의미가 바뀌지 않는다.
ALTER TABLE public.storage_cleanup_queue
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- 10분 주기 소비자 호출. 엣지 함수가 Storage API 를 쓴다.
CREATE EXTENSION IF NOT EXISTS pg_net;
SELECT cron.schedule(
  'drain-storage-cleanup-queue',
  '*/10 * * * *',
  $$SELECT net.http_post(
      url := current_setting('app.settings.storage_cleanup_worker_url', true),
      headers := jsonb_build_object('Content-Type','application/json',
                                    'x-internal-token', current_setting('app.settings.internal_token', true)),
      body := '{}'::jsonb
    );$$
);
```

**종료 증거(이 계약이 실제로 돈다는 증거)** ①`cron.job` 에 `drain-storage-cleanup-queue` 가 `active=true` ②큐에 넣은 객체가 **Storage 에서 실제로 사라지는 것을 조회로 확인**(행이 `DONE` 이 된 것만으로는 부족하다) ③삭제 실패를 주입해 `attempts` 가 증가하고 다음 실행이 다시 집는 것을 관찰. 테스트 = CV-08·CV-09.

**현재 레포 실물(관찰됨, 2026-10-19)**: `purge_abandoned_goal_covers` 함수·`goal_cover_asset_abandoned_idx` 인덱스·`purge-abandoned-goal-covers` job·`storage-cleanup-worker` 엣지 함수·`drain-storage-cleanup-queue` job **5건 전부 0건**이다. `storage_cleanup_queue` 테이블과 `storage_cleanup_queue_pending_idx`(`migration:124`)는 실재한다. 즉 **큐는 있고 중단 업로드를 그 큐에 넣는 길만 없다.**

### A.5 되돌리는 법
품질헌법 §1-4(데이터 안전). 이번 개정이 추가하는 것은 **제약 교체 1건 + 함수·인덱스·job 3건**이라 되돌림이 단순하다.

| 추가물 | 되돌리는 명령 | 데이터 손실 |
|---|---|---|
| `storage_cleanup_queue_reason_check` 교체 | 기존 3값 CHECK 로 되돌린다. **단 `ABANDONED_UPLOAD` 행이 이미 있으면 먼저 처리하거나 사유를 `ASSET_REPLACED` 로 옮긴다**(그러지 않으면 제약 추가가 실패한다) | 없음. 되돌리기 전 확인 필요 |
| `goal_cover_asset_abandoned_idx` | `DROP INDEX IF EXISTS public.goal_cover_asset_abandoned_idx;` | 없음 |
| `purge_abandoned_goal_covers(interval)` | `DROP FUNCTION IF EXISTS public.purge_abandoned_goal_covers(interval);` | 없음 |
| `purge-abandoned-goal-covers` job | `SELECT cron.unschedule('purge-abandoned-goal-covers');` | 없음 |
| `drain-storage-cleanup-queue` job | `SELECT cron.unschedule('drain-storage-cleanup-queue');` | 없음. 단 중지하면 **큐가 쌓이고 고아 객체가 남는다**. 중지는 임시 조치이고 되돌림이 아니다 |
| `storage-cleanup-worker` 엣지 함수 | `supabase functions delete storage-cleanup-worker` | 없음 |
| `storage_cleanup_queue.locked_at` | `ALTER TABLE … DROP COLUMN locked_at;` | 없음(처리 중 표시 전용) |
| 이미 `DELETED` 로 바뀐 자산 | **복구 불가.** 다만 그것은 24시간 넘게 업로드가 끝나지 않은 미사용 자산이고 활성 커버가 가리키지 않는 행만 대상이다 | 미사용 자산만 |

**되돌림 순서**: job 중지 → 함수 삭제 → 인덱스 삭제 → 제약 되돌리기. 반대로 하면 job 이 없는 함수를 부른다.

**이미 운영에 있는 V2 테이블·함수는 이번 개정에서 drop 하지 않는다.** v1.1.0 §8.2 의 forward rollback 원칙(테이블·컬럼을 지우지 않고 기능 플래그만 닫는다)을 그대로 유지한다.

### A.6 운영 `goal_cover_asset` 스키마 전수 (관찰됨)
Codex 가 "설계 상태기계가 운영 스키마와 맞는지 직접 대조해라" 를 요구했다. 대조 결과다.

| 컬럼 | 타입·제약(운영) | 설계가 전제한 것 | 판정 |
|---|---|---|---|
| `id` | uuid PK DEFAULT `extensions.gen_random_uuid()` | 같음 | 일치 |
| `goal_id` | bigint NOT NULL FK `goal(id)` ON DELETE CASCADE | 같음 | 일치 |
| `owner_member_id` | uuid NOT NULL FK `member(id)` ON DELETE CASCADE | v1.2.0 이 명시 안 함 | **보강**(소유권 검사의 근거 컬럼) |
| `quarantine_path` | text NOT NULL **UNIQUE** | NOT NULL 만 적었음 | **보강.** UNIQUE 라 같은 경로 재사용 불가 |
| `public_path` | text UNIQUE (nullable) | 같음 | 일치 |
| `status` | text NOT NULL CHECK **6값** | v1.2.0 은 `PENDING_UPLOAD` 포함 4값 | **불일치 → 교정 완료** |
| `content_sha256` | text NOT NULL CHECK `^[0-9a-f]{64}$` | 있음 | 일치 |
| `mime_type` | text NOT NULL CHECK jpeg·png·webp | 있음 | 일치 |
| `byte_size` | bigint NOT NULL CHECK `BETWEEN 1 AND 5242880` | 5MB 상한만 적었음 | **보강**(하한 1 도 제약이다) |
| `reviewed_by` · `reviewed_at` · `rejection_code` | nullable. `rejection_code` CHECK 5값 | v1.2.0 이 명시 안 함 | **보강** |
| `created_at` | timestamptz NOT NULL DEFAULT `now()` | 정리 기준 컬럼으로 사용 | 일치 |
| `goal_cover_asset_state_check` | 상태별 칸 조합 강제(§api-contract A.4) | 없었음 | **보강** |
| 인덱스 | `(goal_id, status, created_at DESC)` · `(content_sha256)` | 없었음 | **보강.** 중단분 조회용 부분 인덱스만 추가가 필요하다 |

근거 = `supabase/migrations/20261013050000_social_viral_loop_web_first.sql:52~70, 96~97`. **설계가 운영 스키마를 바꿀 필요는 §A.3 의 2건뿐이다.**

## 0. 요약
기존 `goal`, `cheer`, `member`, `notification`을 유지하고 `friend_connection`, `friend_invite`, `goal_cover_asset`, `member_preference`, `social_cheer_member_attribution`을 신설한다. `goal`에는 공개범위와 커버 포인터 세 컬럼만 additive로 붙인다. 앱인토스 다중 신원 `member_identity`는 모바일 2차 migration으로 남긴다.

## 1. 기존 스키마 재사용
| 실물 | 재사용 | 변경 |
|---|---|---|
| `member` | 친구 양끝, 초대자·수락자, 선호 소유자 | 없음 |
| `goal` | 친구 목표와 커버의 소유 집합 | `visibility`, `cover_preset_key`, `active_cover_asset_id` 추가 |
| `cheer` | 응원 인원과 워드맵 원천 | 금액 컬럼은 기존 receiver 경로에만 유지 |
| `notification` | 추후 초대·친구 알림 확장 가능 | 1차 migration에서 새 타입 강제하지 않음 |
| `goal_public`, `cheer_public` | 공개 화면 projection | visibility 필터·필드 최소화 |
| `get_wordmap` | 공개 워드맵 | 공개범위 검사와 search path 보강 |
| `wordmap_render_cache` | 공유 이미지 캐시 | 비공개 전환 시 동기 무효화 |
| cashout 전 테이블 | 그대로 유지 | 변경 0 |

## 2. ERD
```mermaid
erDiagram
  MEMBER ||--o{ GOAL : owns
  MEMBER ||--o| MEMBER_PREFERENCE : configures
  MEMBER ||--o{ FRIEND_INVITE : creates
  MEMBER ||--o{ FRIEND_CONNECTION : participates
  GOAL ||--o{ FRIEND_INVITE : contextualizes
  GOAL ||--o{ GOAL_COVER_ASSET : owns
  GOAL }o--o| GOAL_COVER_ASSET : active_cover
  FRIEND_INVITE ||--o| FRIEND_CONNECTION : establishes

  MEMBER_PREFERENCE {
    uuid member_id PK, FK
    boolean notify_cheer
    boolean notify_marketing
    timestamptz updated_at
  }
  FRIEND_INVITE {
    uuid id PK
    uuid inviter_member_id FK
    bigint goal_id FK "nullable"
    bytea token_hash UK
    text channel
    timestamptz expires_at
    uuid accepted_by FK "nullable"
    timestamptz accepted_at "nullable"
    timestamptz revoked_at "nullable"
    timestamptz created_at
  }
  FRIEND_CONNECTION {
    uuid id PK
    uuid member_low_id FK
    uuid member_high_id FK
    text status
    uuid origin_invite_id FK
    uuid blocked_by_member_id FK "nullable"
    timestamptz connected_at
    timestamptz updated_at
  }
  GOAL_COVER_ASSET {
    uuid id PK
    bigint goal_id FK
    uuid owner_member_id FK
    text quarantine_path UK
    text public_path UK "nullable"
    text status
    text content_sha256
    text mime_type
    bigint byte_size
    uuid reviewed_by FK "nullable"
    timestamptz reviewed_at "nullable"
    text rejection_code "nullable"
    timestamptz created_at
  }
```

## 3. 기존 테이블 변경
### 3.1 `goal`
| 컬럼 | 타입 | 제약·기본값 | 의미 |
|---|---|---|---|
| `visibility` | text | NOT NULL DEFAULT `PUBLIC`, CHECK `PUBLIC|FRIENDS|PRIVATE` | 조회 경계 |
| `cover_preset_key` | text | NOT NULL DEFAULT `c1`, CHECK `c1`부터 `c6` | 커버 fallback |
| `active_cover_asset_id` | uuid | NULL FK `goal_cover_asset(id)` ON DELETE SET NULL | 승인 커스텀 커버 |

기존 goal은 모두 `PUBLIC`, `c1`, `NULL`로 backfill한다. 기존 `/g/[slug]` 접근성을 바꾸지 않는다. `active_cover_asset_id`는 같은 goal에 속하고 `status='APPROVED'`인 asset만 가리켜야 한다. 일반 UPDATE로는 바꿀 수 없고 승인 함수만 변경한다.

### 3.2 공개 projection
`goal_public`은 `visibility='PUBLIC' AND deleted_at IS NULL`만 내보낸다. 공개 필드는 기존 목록에 `cover_preset_key`, PUBLIC 승인 asset의 `public_path`만 더한다. FRIENDS 승인 asset은 `public_path=NULL`이어야 하며 private `quarantine_path`는 공개 projection에 포함하지 않는다. `visibility`, `active_cover_asset_id`, owner 내부 ID는 노출하지 않는다.

`cheer_public`과 `get_wordmap`은 PUBLIC goal에만 결과를 반환한다. FRIENDS는 `friend_goal_detail`의 인증 projection으로만 제공한다.

`wordmap_render_cache`는 PUBLIC 전용이다. 목표가 FRIENDS 또는 PRIVATE으로 바뀌면 해당 goal 캐시 행을 같은 transaction에서 삭제하고, Storage object 삭제 작업을 재시도 큐에 넣는다.

## 4. 신규 테이블
### 4.1 `member_preference`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| `member_id` | uuid | PK, FK `member(id)` ON DELETE CASCADE |
| `notify_cheer` | boolean | NOT NULL DEFAULT true |
| `notify_marketing` | boolean | NOT NULL DEFAULT false |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() |

본인만 SELECT 가능하다. write는 `update_member_preferences` RPC만 허용한다. 마케팅은 opt-in이다.

### 4.2 `friend_invite`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() |
| `inviter_member_id` | uuid | NOT NULL FK `member(id)` ON DELETE CASCADE |
| `goal_id` | bigint | NULL FK `goal(id)` ON DELETE SET NULL |
| `token_hash` | bytea | NOT NULL UNIQUE, `digest(token,'sha256')` |
| `channel` | text | NOT NULL CHECK `WEB|KAKAO|LINK|INTOSS` |
| `expires_at` | timestamptz | NOT NULL, 생성 시 now()+7 days |
| `accepted_by` | uuid | NULL FK `member(id)` ON DELETE CASCADE |
| `accepted_at` | timestamptz | NULL |
| `revoked_at` | timestamptz | NULL |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

Check constraints:

- `expires_at > created_at`
- `(accepted_by IS NULL) = (accepted_at IS NULL)`
- `accepted_by IS NULL OR accepted_by <> inviter_member_id`
- 수락 가능 상태는 `accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()`를 함수 안에서 검사한다. `now()`는 CHECK에 두지 않는다.

토큰 생성은 `gen_random_bytes(32)`를 base64url로 변환한다. 평문은 함수 응답에서만 한 번 반환하며 DB·로그·analytics에 저장하지 않는다.

### 4.3 `friend_connection`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() |
| `member_low_id` | uuid | NOT NULL FK `member(id)` ON DELETE CASCADE |
| `member_high_id` | uuid | NOT NULL FK `member(id)` ON DELETE CASCADE |
| `status` | text | NOT NULL DEFAULT `ACTIVE`, CHECK `ACTIVE|REMOVED|BLOCKED` |
| `origin_invite_id` | uuid | NULL FK `friend_invite(id)` ON DELETE SET NULL |
| `blocked_by_member_id` | uuid | NULL FK `member(id)` ON DELETE SET NULL |
| `connected_at` | timestamptz | NOT NULL DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() |

Constraints:

- CHECK `member_low_id < member_high_id`
- UNIQUE `(member_low_id, member_high_id)`
- `status='BLOCKED'`일 때만 `blocked_by_member_id`가 관계 당사자 중 하나다.
- `ACTIVE|REMOVED`일 때 `blocked_by_member_id IS NULL`이다.

관계 해제는 row 삭제가 아니라 `REMOVED`다. 새 초대를 상대가 수락하면 REMOVED를 ACTIVE로 복원할 수 있다. BLOCKED는 차단자 해제 전 재활성화할 수 없다. 이번 UI는 `remove_friend`만 노출하고 BLOCKED UI는 다음 안전 슬라이스에 둔다. BLOCKED 상태 계약은 미리 넣어 우회 재초대를 막는다.

### 4.4 `goal_cover_asset`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() |
| `goal_id` | bigint | NOT NULL FK `goal(id)` ON DELETE CASCADE |
| `owner_member_id` | uuid | NOT NULL FK `member(id)` ON DELETE CASCADE |
| `quarantine_path` | text | NOT NULL UNIQUE |
| `public_path` | text | NULL UNIQUE |
| `status` | text | NOT NULL CHECK `UPLOADING|REVIEW|APPROVED|REJECTED|SUPERSEDED|DELETED` |
| `content_sha256` | text | NOT NULL CHECK 64 lowercase hex |
| `mime_type` | text | NOT NULL CHECK `image/jpeg|image/png|image/webp` |
| `byte_size` | bigint | NOT NULL CHECK `1..5242880` |
| `reviewed_by` | uuid | NULL FK `member(id)` ON DELETE SET NULL |
| `reviewed_at` | timestamptz | NULL |
| `rejection_code` | text | NULL CHECK `adult|violence|personal_info|copyright|other` |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

State constraints:

- APPROVED: `reviewed_by`, `reviewed_at`은 NOT NULL이고 rejection은 NULL이다. `public_path`는 PUBLIC 목표만 NOT NULL이며 FRIENDS·PRIVATE는 NULL이다.
- REJECTED: reviewer·time·rejection 모두 NOT NULL, public path NULL.
- UPLOADING·REVIEW: public path NULL.
- 승인 전·반려 asset이 현재 active cover가 될 수 없다.
- 한 goal의 APPROVED active asset은 `goal.active_cover_asset_id` 하나뿐이다. 이전 승인본은 `SUPERSEDED`로 전환한다.

### 4.5 `social_cheer_member_attribution`
| 컬럼 | 타입 | 제약 |
|---|---|---|
| `cheer_id` | bigint | PK, FK `cheer(id)` ON DELETE CASCADE |
| `supporter_member_id` | uuid | NOT NULL FK `member(id)` ON DELETE CASCADE |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

`cheer-order`가 유효한 회원 access token을 확인한 경우 service role로만 upsert한다. anon·authenticated는 SELECT를 포함한 직접 권한이 0이다. 큐 제외 판정은 attribution만으로 끝내지 않고 연결된 `cheer.status='CONFIRMED' AND deleted_at IS NULL`을 다시 확인한다. 비회원 결제는 attribution 없이 기존 계약대로 유지한다.

## 5. 공개범위 RLS 행렬
### 5.1 테이블 정책
| 테이블 | anon | authenticated SELECT | authenticated write | service/admin |
|---|---|---|---|---|
| `friend_invite` | 직접 접근 0 | 직접 접근 0 | 0, RPC only | 필요한 작업만 |
| `friend_connection` | 0 | 직접 접근 0 | 0, RPC only | 관리 목적 최소 |
| `goal_cover_asset` | 0 | owner의 메타만. public URL은 APPROVED만 | 0, EF only | 검수·전환 |
| `member_preference` | 0 | 본인 1행 | 0, RPC only | 없음 |
| `social_cheer_member_attribution` | 0 | 0 | 0 | service role만 |
| `goal` | 기존 owner 정책 | owner 직접 조회만 | 기존 owner RPC | 기존 유지 |

### 5.2 조회 경로 전수표
| 경로 | PUBLIC | FRIENDS | PRIVATE | 강제 위치 |
|---|---:|---:|---:|---|
| `goal_public` | 허용 | 0행 | 0행 | view WHERE |
| `/g/[slug]` | 허용 | 404 | 404 | goal_public 결과 |
| `get_wordmap` anon | 허용 | 0행 | 0행 | 함수 내부 |
| `wordmap_render_cache` anon | 허용 | 0행 | 0행 | 캐시 생성·무효화 |
| 워드맵 Storage | 허용 | 삭제 | 삭제 | object cleanup |
| `my_friend_goals` | 허용 | ACTIVE 친구만 | 0행 | 함수 내부 |
| `friend_goal_detail` | 허용 | ACTIVE 친구만 | 0행 | 함수 내부 |
| owner detail | 허용 | 허용 | 허용 | owner query |

`friend_goal_detail`은 `cheer_count`와 공개 가능한 message word projection만 반환한다. `cheer.clover_amount`, payment, supporter_ci, cashout 관계는 join하지 않는다.

PRIVATE 목표에는 goal 연결 초대를 만들 수 없다. PUBLIC 또는 FRIENDS 목표가 PRIVATE으로 바뀌면 그 goal의 미사용 초대를 같은 transaction에서 revoke한다.

### 5.3 함수 보안
- `SECURITY DEFINER SET search_path = ''`.
- relation과 함수 이름은 `public.goal`처럼 완전 수식한다.
- `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` 후 필요한 함수만 role별 grant한다.
- 소유권과 `auth.uid()` NULL을 함수 첫 단계에서 검사한다.
- 같은 이름의 overload를 만들지 않는다. PostgREST 호출 모호성을 막는다.

## 6. Storage 계약
| bucket | public | upload | read | delete |
|---|---:|---|---|---|
| `goal-cover-quarantine` | false | signed URL, owner path only | owner·admin, FRIENDS는 ACTIVE 친구 확인 후 서버 발급 120초 Presigned URL | service cleanup |
| `goal-cover-public` | true | PUBLIC 승인 시 service only | PUBLIC object만 익명 read | service only |

Object path:

```text
goal-cover-quarantine/{member_id}/{goal_id}/{asset_id}.{ext}
goal-cover-public/{goal_id}/{asset_id}.{ext}
```

브라우저는 public bucket에 직접 write하지 못한다. signed upload 발급 시 goal owner를 재검사한다. upsert와 동일 path overwrite는 금지한다. 승인 함수는 quarantine의 실제 MIME, byte size, SHA-256을 asset row와 비교한다. PUBLIC 목표만 public bucket으로 복사한다. FRIENDS 목표는 private object를 유지하고 `friend_goal_detail`의 ACTIVE 친구 확인 후 120초 Presigned URL로만 내려준다. private Storage object 직접 GET은 owner 외 RLS로 차단한다.

## 7. 무결성 인덱스 동시성
| 대상 | 인덱스·잠금 | 이유 |
|---|---|---|
| `friend_invite.token_hash` | UNIQUE btree | 추측·충돌·중복 토큰 차단 |
| `friend_invite(inviter_member_id, created_at desc)` | btree | 시간당 10개 rate limit |
| `friend_invite(expires_at)` WHERE unused | partial btree | 만료 cleanup |
| `friend_connection(low, high)` | UNIQUE | 양방향 중복 방지 |
| `friend_connection(low, status)`와 `(high, status)` | btree | 친구목록 양방향 조회 |
| `social_cheer_member_attribution(supporter_member_id, cheer_id)` | btree | 회원별 확정 응원 존재 검사 |
| `goal(visibility, status)` | btree | 공개·친구 목표 필터 |
| `goal_cover_asset(goal_id, status, created_at desc)` | btree | 검수·활성 커버 조회 |
| `goal_cover_asset(content_sha256)` | btree | 같은 파일 재업로드 관측 |

초대 수락은 `SELECT ... FOR UPDATE`로 invite row를 잠근다. 이어서 ordered pair UNIQUE에 `INSERT ... ON CONFLICT ...`를 사용한다. 같은 token을 동시에 두 계정이 수락하면 한 transaction만 accepted_by를 기록하고 다른 transaction은 `invite_already_used`로 끝난다.

`set_goal_visibility`은 현 `update_goal`과 같은 소유권 검사와 advisory lock 관습을 따른다. goal 변경, 캐시 행 삭제, cleanup job enqueue는 한 transaction이다.

## 8. 마이그레이션과 롤백
### 8.1 적용 순서
1. `pgcrypto` 존재 확인. 없을 때만 extension 추가.
2. 신규 테이블을 FK 의존 순서로 생성하고 즉시 RLS enable.
3. `goal` nullable 컬럼 추가 후 기존 row backfill.
4. `goal` 세 컬럼을 NOT NULL·FK·CHECK로 고정.
5. 인덱스와 table policies 생성.
6. 기존 공개 view·함수·캐시 정책을 같은 migration에서 교체.
7. RPC와 exact grants 생성.
8. Storage bucket·policy와 cleanup queue 생성.
9. pgTAP이 green인 뒤에만 web feature flag를 연다.

### 8.2 롤백
- UI와 RPC grant를 먼저 닫는다.
- `goal_public`, `cheer_public`, `get_wordmap`은 migration 전 정의로 되돌리되 PUBLIC row만 보이던 기존 의미를 보존한다.
- 신규 데이터가 생긴 뒤에는 table·column을 drop하지 않는다. orphan 데이터를 남기고 feature flag만 닫는 forward rollback을 사용한다.
- Storage bucket은 삭제하지 않는다. public object 접근을 닫고 cleanup한다.
- PUBLIC backfill은 기존 공개 동작과 같으므로 역변환하지 않는다.

### 8.3 영향 0 확인 대상
- `create_goal`과 다중 목표 상한 3.
- cashout 전 테이블·function·trigger·index.
- `cheer_public`의 금액 컬럼 부재.
- 기존 payment·notification·report 경로.

## 9. 데이터 안전 수용기준
| ID | Given / When / Then |
|---|---|
| DB-AC-01 | Given FRIENDS 목표, When anon이 view·함수·cache·Storage 모든 경로를 조회, Then 제목·이유·커버·워드맵이 0건이다. |
| DB-AC-02 | Given A-B ACTIVE와 A-C 무관계, When B와 C가 A 목표를 조회, Then B만 FRIENDS 목표를 받고 둘 다 금액 필드는 받지 않는다. |
| DB-AC-03 | Given 동일 token 동시 수락 2건, When commit, Then accepted_by와 ACTIVE 관계는 각각 1건이다. |
| DB-AC-04 | Given REVIEW 커버, When 공개 URL 추정, Then public bucket object가 없어 404다. |
| DB-AC-05 | Given PUBLIC에서 PRIVATE 전환, When commit 완료, Then cache row는 0이고 object cleanup은 완료 또는 명시적 retry 상태다. |
| DB-AC-06 | Given 기존 goal 15행, When migration, Then 모두 PUBLIC·c1이고 기존 slug 응답 상태가 유지된다. |
| DB-AC-07 | Given social RPC response, When JSON key 전수 검사, Then amount·clover·rank·payment·cashout key가 0개다. |
| DB-AC-08 | Given 본인 원장, When `my_social_dashboard`, Then CLOSED 목표·non-welcome CONFIRMED 응원·ACTIVE 친구 집계가 원장 count와 일치한다. |
| DB-AC-09 | Given ACTIVE 친구 목표, When 본인 CONFIRMED attribution이 있거나 관계·공개범위가 닫힌다, Then 해당 목표는 belonging queue에서 0건이다. |
| DB-AC-10 | Given anon 또는 authenticated client, When attribution 원본 테이블을 직접 조회, Then 권한이 0이다. |

## 10. 비범위
- `member_identity`: 토스 로그인과 함께 모바일 2차에 추가한다.
- timeline, boost table: 이번 슬라이스에서 만들지 않는다.
- achievement table: 만들지 않는다. D-022에 따라 기존 원장의 반증 가능한 집계만 사용한다.
- contact sync, recommendation graph: 만들지 않는다.
- cashout schema: 변경하지 않는다.
- 자동 moderation result JSON: 공급자 결정 전 만들지 않는다. 수동 review 메타만 저장한다.

## 11. 개정 이력
| 버전 | 일자 | 변경 | 작성자 |
|---|---|---|---|
| **v1.2.1** | **2026-10-19** | **Codex 재검수 반영. 커버 상태명을 운영 실물 6값으로 교정하고 §A.6 에 `goal_cover_asset` 컬럼·제약·인덱스 전수 대조표 신설. 중단분 정리를 정책에서 **실행 계약**으로 승격(§A.4: job 이름·주기·명령·권한·재시도·동시성·관측·종료 증거 3개 + SQL). `storage_cleanup_queue.reason` CHECK 에 `ABANDONED_UPLOAD` 가 필요함을 발견해 스키마 변경을 0건 → 2건으로 정정. `platform_social_stats()` 폐기(회장이 집계 수치 안을 택하지 않음): **신설 RPC·테이블 0건**. 되돌림 순서와 전제 명시** | **tech-architect / claude-opus-5[1m]** |
| **v1.2.0** | **2026-10-19** | **운영 적용 실측표 신설(테이블 5종·공개 버킷 1종 직접 확인, 격리 버킷 미검증). D-024 로 바뀐 관계 생성 경로 반영(응원 트리거 + 초대, `origin_invite_id` nullable 유지, 방향은 저장하지 않고 판정). 이번 개정의 스키마 변경을 최대 1건(함수 1개, D-OPEN-1 종속)으로 한정. `goal_cover_asset` 중단분 정리 규칙과 부분 인덱스 신설. 되돌리는 법 표 추가. 파괴적 변경 0** | **tech-architect / claude-opus-5[1m]** |
| v1.1.0 | 2026-10-13 | D-022 service-role attribution과 저장 없는 업적·소속감 큐 집계 모델 | code-builder / gpt-5-codex |
| v1.0.1 | 2026-10-13 | D-019 반영. FRIENDS 커버의 private Storage와 Presigned URL 경계 명시 | code-builder / gpt-5-codex |
| v1.0.0 | 2026-10-13 | 웹 우선 친구·초대·커버·선호 스키마 계약 | tech-architect / gpt-5-codex |

KNOWLEDGE_QUERY: BRAIN의 공유장벽·신뢰 마찰을 조회하고, 외부에서 Supabase RLS·security definer, PostgreSQL row security·pgcrypto, OWASP single-use token을 조회.

HITS_USED: 신뢰를 위해 수락·검수라는 명시적 마찰을 유지. Supabase의 기본 거부와 함수 권한 최소화, PostgreSQL의 CSPRNG·row policy, OWASP의 token 만료·1회성을 스키마 불변식으로 채택.

HITS_REJECTED: 자동 친구 추천과 공격적 바이럴은 개인정보·신뢰 비용이 커 미채택. 외부 moderation 공급자 메타는 공급자 미결이라 미채택.

CONFLICTS: 기존 공개 view와 SECURITY DEFINER 함수는 RLS를 우회할 수 있어 단순 table policy만으로는 친구공개를 보장하지 못한다. 이에 view·함수·cache·Storage를 한 migration 단위로 묶었다.

SKILLS_USED: docs. ERD 전달 문서 구조·표·수용기준에 적용.

SKILLS_SKIPPED: diagram 스킬은 현재 available-skills에 없어 Mermaid erDiagram을 직접 작성하고 정적 검증한다.

RUBRIC_SCORE: 완결5 정밀5 벤치5 추적5 톤5 total=25/25

WEAKEST_LINE: "BLOCKED UI는 1차에 없지만 우회 재초대를 막기 위해 상태 계약만 선반영한다."

PRESENTATION_CHECK: 내부 태그 잔재 0 / 목차 앵커 PASS / Mermaid ERD 실제 렌더 PASS / 컨트롤러 표시용 창은 열지 않음

SOURCES/MODEL: gpt-5/codex | `fdd-social-viral-loop-web-first-v1.0.0.md`; `docs/eng-design/erd-social-viral-loop-v0.1.0.md`; `docs/eng-design/eng-design-goal-visibility-supporter-v1.0.0-claude-opus.md`; `supabase/migrations/20260705163137_init_schema.sql`; `wiki/거버넌스/결정.md`; `miniapp/src/gateway.ts`; `~/SJ_BRAIN_wiki/wiki/business/마케팅/concept-공유장벽-선언vs요청-UGC바이럴.md`; `~/SJ_BRAIN_wiki/wiki/business/마케팅/question-전환-마찰-제거인가-신뢰-마찰-추가인가.md`; https://supabase.com/docs/guides/database/postgres/row-level-security; https://supabase.com/docs/guides/database/functions; https://supabase.com/docs/guides/storage/security/access-control; https://www.postgresql.org/docs/current/ddl-rowsecurity.html; https://www.postgresql.org/docs/17/pgcrypto.html; https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
