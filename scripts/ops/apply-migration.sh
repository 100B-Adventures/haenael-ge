#!/usr/bin/env bash
# 이전 운영 DB 덤프를 현재 운영 DB 에 복원한다. pg_dump / psql 표준 경로다.
#
# 선행 조건 하나: 현재 운영 프로젝트의 데이터베이스 비밀번호가 키체인에 있어야 한다.
#   security add-generic-password -U -s supabase-db-password -a haenael-ge-new -w
#
# 쓰는 법: bash scripts/ops/apply-migration.sh
#
# 순서
#   1. auth.users 를 먼저 넣는다. member.id 가 auth.users(id) 를 참조한다.
#   2. public 스키마 데이터 덤프를 복원한다.
#   3. 양쪽 행 수를 대조한다.

set -euo pipefail

B="${1:-$HOME/.sj-agent-harness/backups/haenael-ge-old-db-20261012}"
REF=ossvejipdivgxzcqszbw
HOST=aws-0-ap-southeast-1.pooler.supabase.com

PGPASSWORD="$(security find-generic-password -s supabase-db-password -a haenael-ge-new -w 2>/dev/null || true)"
if [ -z "$PGPASSWORD" ]; then
  echo "현재 운영 DB 비밀번호가 키체인에 없다. 아래 한 줄을 먼저 실행해라." >&2
  echo "  security add-generic-password -U -s supabase-db-password -a haenael-ge-new -w" >&2
  exit 2
fi
export PGPASSWORD PGHOST="$HOST" PGUSER="postgres.$REF" PGDATABASE=postgres PGPORT=5432

echo "대상 $REF 접속 확인"
psql -tAc "select 1" >/dev/null

if [ -f "$B/old-auth-data.sql" ]; then
  echo "auth 스키마 복원"
  psql -v ON_ERROR_STOP=1 -q -f "$B/old-auth-data.sql"
else
  echo "auth 덤프가 없다. member 복원이 외래키에서 실패하면 이것부터 받아라." >&2
fi

echo "public 스키마 복원"
psql -v ON_ERROR_STOP=1 -q -f "$B/old-public-data.sql"

echo
psql -tA -c "select 'users='||(select count(*) from auth.users)||' members='||(select count(*) from public.member)||' goals='||(select count(*) from public.goal)||' cheers='||(select count(*) from public.cheer)||' payments='||(select count(*) from public.payment)||' ledger='||(select count(*) from public.clover_ledger)||' cashouts='||(select count(*) from public.cashout_request)"
echo "기대값  users=3 members=2 goals=15 cheers=41 payments=28 ledger=44 cashouts=4"
