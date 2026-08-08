# DB 레벨 테스트 (pgTAP)

RLS 정책·트리거·함수를 실제 Postgres에서 직접 검증. `supabase test db` 로 실행.

## 파일 목록

| 파일 | 검증 대상 |
|---|---|
| `rls_policy.test.sql` | RLS 정책 — member/goal/cheer/notification/report 행 단위 보안 |

## 실행

```bash
# 로컬 Supabase 실행 중이어야 함
supabase start

# 전체 DB 테스트 실행
supabase test db
```

## 동시성(concurrency) 실검증

pgTAP은 단일 커넥션 내 순차 실행이라 진짜 동시 요청 레이스(rate-limit count↔insert,
request_key SELECT↔INSERT)를 재현하지 못한다. `create_cheer_order` 같은 동시성
민감 RPC는 `supabase/tests/concurrency/*.sh`로 별도 검증한다(백그라운드 psql로 여러
DB 커넥션을 실제 동시에 띄움). `supabase start` 후 실행:

```bash
./supabase/tests/concurrency/rate_limit_race.sh    # customer_key/goal rate-limit 레이스
./supabase/tests/concurrency/request_key_race.sh   # request_key 멱등 동시 경합 레이스
```

각 스크립트는 자기가 만든 테스트 goal/member/payment/cheer 행을 종료 시 자동 정리한다.

## pgTAP 기초

```sql
-- 예: 인증 유저가 본인 goal만 볼 수 있는지 확인
SELECT ok(
  (SELECT count(*) FROM goal WHERE id = my_goal_id) = 1,
  '본인 goal SELECT 가능'
);
```
