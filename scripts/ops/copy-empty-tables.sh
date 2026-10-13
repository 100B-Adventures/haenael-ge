#!/usr/bin/env bash
# 아직 한 행도 들어가지 않은 테이블만 이전 운영 DB 에서 현재 운영 DB 로 복사한다.
#
# 앞선 적재에서 member·goal·payment·cashout_request 는 이미 들어갔다.
# cheer·clover_ledger·clover_balance 는 적재 중 트리거가 만든 행이 자리를 차지해
# 그 행을 지우기 전에는 넣을 수 없다. 그래서 이 스크립트는 건드리지 않는다.
#
# 적재 중 트리거를 끈다. 원본을 1:1 로 복제하는 것이므로 파생 행이 생기면 안 된다.
#
# 실행 위치: 온프렘 VM. 입력: 표준입력 첫 줄 원본 비밀번호, 둘째 줄 대상 비밀번호.

set -euo pipefail

read -r SRC_PW
read -r DST_PW

SRC_HOST=aws-1-ap-northeast-2.pooler.supabase.com
SRC_USER=postgres.gmpwrcxpvgylmllasoqy
DST_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DST_USER=postgres.ossvejipdivgxzcqszbw

TABLES="cheer clover_balance clover_ledger"

for t in $TABLES; do
  printf '%-26s ' "$t"
  docker run --rm -i -e PGPASSWORD="$SRC_PW" postgres:17-alpine \
    psql -h "$SRC_HOST" -U "$SRC_USER" -d postgres -p 5432 \
    -c "\\copy (select * from public.$t) to stdout" \
  | docker run --rm -i -e PGPASSWORD="$DST_PW" postgres:17-alpine \
    psql -v ON_ERROR_STOP=1 -q -h "$DST_HOST" -U "$DST_USER" -d postgres -p 5432 \
    -c "set session_replication_role = replica;" \
    -c "\\copy public.$t from stdin"
  echo "완료"
done

echo
docker run --rm -i -e PGPASSWORD="$DST_PW" postgres:17-alpine \
  psql -tA -h "$DST_HOST" -U "$DST_USER" -d postgres -p 5432 -c "
select 'payment_log=' || (select count(*) from public.payment_log)
    || ' notification=' || (select count(*) from public.notification)
    || ' lead=' || (select count(*) from public.lead)
    || ' report=' || (select count(*) from public.report);
"
echo "기대값 payment_log=56 notification=17 lead=8 report=4"
