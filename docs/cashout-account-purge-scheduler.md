# 환전 계좌정보 90일 파기 스케줄 운영서

> 범위: `public.purge_expired_cashout_accounts(integer)`의 운영 자동 실행 등록과 검증. 이 문서는 등록 절차만 정의하며 프로덕션에는 아직 등록하지 않았다.

## 결론

Supabase 운영 DB에서는 **Supabase Cron(`pg_cron`)으로 DB 함수를 직접 매일 실행**한다. 파기 대상과 함수가 같은 DB에 있어 네트워크·HTTP 인증·별도 런타임이 필요 없고, Supabase Dashboard에서 실행 이력을 확인할 수 있기 때문이다. 외부 스케줄러는 `pg_cron`을 사용할 수 없거나 독립 장애 도메인이 반드시 필요한 경우에만 대체안으로 쓴다.

현재 `20260802010000_cashout_security_hardening.sql`은 `pg_cron`이 가용하면 `purge-expired-cashout-accounts`를 등록하도록 작성되어 있다. 다만 마이그레이션 실행 역할의 확장/cron 권한이 부족하면 NOTICE만 남기고 건너뛰므로, 배포 후 아래 조회로 실제 등록 여부를 반드시 확인한다.

## 선택지 비교

| 선택지 | 장점 | 위험/운영비 | 판정 |
|---|---|---|---|
| Supabase Cron (`pg_cron`) | DB 함수 직접 호출, 별도 비밀값·HTTP 없음, `cron.job_run_details`로 이력 확인 | DB/Cron 장애가 같은 장애 도메인, 확장 및 job 등록 권한 필요 | **기본안** |
| GitHub Actions 외부 스케줄 | DB와 별도 장애 도메인, 실패 알림·재실행 UI 사용 가능 | DB 접속 비밀값 추가, runner 네트워크 의존, 예약 실행 지연/누락 가능 | `pg_cron` 불가 시 폴백 |

파기 함수는 `account_purged_at IS NULL`, 행 잠금과 `SKIP LOCKED`, 한도 제한을 사용하므로 중복 실행해도 이미 파기한 행을 다시 처리하지 않는다. 외부 스케줄러를 병행 등록하지 않고 한 가지 방식만 활성화한다.

## 기본안: Supabase Cron 등록

### Dashboard 등록

1. `https://supabase.com/dashboard/project/<PROJECT_REF>/integrations/cron`에 접속한다.
2. `Integrations → Cron`에서 Cron 모듈과 `pg_cron` 확장을 활성화한다.
3. `Jobs → Create job`을 선택한다.
4. 이름은 `purge-expired-cashout-accounts`, 일정은 `17 3 * * *`(매일 03:17 UTC/12:17 KST), 실행 유형은 SQL snippet으로 설정한다.
5. SQL에는 아래 한 문장만 등록한다.

```sql
SELECT public.purge_expired_cashout_accounts(5000);
```

동일 이름 job이 이미 있으면 새로 하나 더 만들지 말고 기존 job의 schedule/command를 확인한다. SQL로 등록할 때는 다음을 사용한다.

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'purge-expired-cashout-accounts',
  '17 3 * * *',
  $$SELECT public.purge_expired_cashout_accounts(5000);$$
);
```

### 등록·실행 검증

```sql
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'purge-expired-cashout-accounts';

SELECT jobid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job
  WHERE jobname = 'purge-expired-cashout-accounts'
)
ORDER BY start_time DESC
LIMIT 10;
```

종료 증거는 job 1개가 `active=true`, 일정/명령이 위 값과 일치하고, 최초 실행의 `status='succeeded'`가 관찰되는 것이다. 실패 시 job을 중복 생성하지 말고 `return_message`와 Postgres 로그를 확인한다.

### 변경·중지

```sql
-- 일시 비활성화
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'purge-expired-cashout-accounts'),
  active := false
);

-- 완전 삭제
SELECT cron.unschedule('purge-expired-cashout-accounts');
```

## 폴백: GitHub Actions 외부 스케줄

`pg_cron` 확장/권한을 확보할 수 없을 때만 사용한다. 저장소 환경 secret `SUPABASE_DB_URL`에는 파기 함수를 실행할 수 있는 최소 권한 DB 접속 문자열을 저장하고, 실제 값은 workflow나 로그에 쓰지 않는다. 기본 브랜치의 workflow 예시는 다음과 같다.

```yaml
name: Purge expired cashout accounts

on:
  schedule:
    - cron: "17 3 * * *"
  workflow_dispatch:

jobs:
  purge:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Install PostgreSQL client
        run: sudo apt-get update && sudo apt-get install --yes postgresql-client
      - name: Purge expired account data
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "SELECT public.purge_expired_cashout_accounts(5000);"
```

GitHub 예약 workflow는 기본 브랜치에 있어야 하며 부하 시 지연되거나 드물게 누락될 수 있다. 따라서 이 대체안을 쓰면 Actions 실패 알림을 켜고, 주 1회 최근 7일 실행 수가 7건인지 확인한다. `pg_cron`이 복구되면 외부 workflow를 비활성화한 뒤 DB job 하나만 활성화한다.

## 배포 당일 체크리스트

- [ ] 신규 마이그레이션 적용 후 `public.purge_expired_cashout_accounts(integer)` 존재 확인
- [ ] 선택한 스케줄러 한 종류만 활성화
- [ ] 실제 job/워크플로 수동 1회 실행 성공 확인
- [ ] 대상 0건이어도 함수 반환값과 실행 성공 상태 기록
- [ ] 24시간 뒤 예약 실행 이력 재확인
- [ ] 프로덕션 secret 원문이 SQL 기록·workflow 로그·문서에 없는지 확인

## 근거

- Supabase Cron: https://supabase.com/docs/guides/cron
- Supabase Cron Quickstart: https://supabase.com/docs/guides/cron/quickstart
- Supabase `pg_cron` 디버깅: https://supabase.com/docs/guides/troubleshooting/pgcron-debugging-guide-n1KTaz
- GitHub Actions 예약 workflow: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onschedule

---

SKILLS_USED: 없음
SKILLS_SKIPPED: 매칭되는 코드/DB 운영 문서 스킬 없음

SOURCES/MODEL: gpt-5.6 · `supabase/migrations/20260802010000_cashout_security_hardening.sql` · Supabase Cron/pg_cron 공식문서 · GitHub Actions 공식문서
