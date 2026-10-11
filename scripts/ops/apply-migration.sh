#!/usr/bin/env bash
# 이관 SQL 을 현재 운영 데이터베이스에 단계별로 적용하고 매 단계 행 수를 대조한다.
#
# 선행 조건: 현재 운영 프로젝트의 데이터베이스 비밀번호가 키체인에 있어야 한다.
#   security add-generic-password -U -s supabase-db-password -a haenael-ge-new -w
#   (-w 뒤에 값을 붙이지 말고 엔터를 치면 가려진 입력으로 받는다. 값이 화면에 남지 않는다.)
#
# 쓰는 법: bash scripts/ops/apply-migration.sh [백업디렉터리]
#
# 안전장치
#   - 각 단계 파일이 begin/commit 으로 감싸여 있어 실패한 테이블은 통째로 되돌아간다.
#   - on conflict do nothing 이라 여러 번 돌려도 중복이 안 생긴다.
#   - ON_ERROR_STOP 으로 첫 실패에서 멈춘다.
#   - SQL 본문을 화면에 찍지 않는다. 단계 이름과 행 수만 찍는다.

set -euo pipefail

BACKUP_DIR="${1:-$HOME/.sj-agent-harness/backups/haenael-ge-old-db-20261012}"
STEPS_DIR="$BACKUP_DIR/steps"
REF="ossvejipdivgxzcqszbw"
HOST="aws-0-ap-southeast-1.pooler.supabase.com"

if [ ! -d "$STEPS_DIR" ]; then
  echo "단계 디렉터리가 없다: $STEPS_DIR" >&2
  echo "먼저: node scripts/ops/build-migration-sql.mjs \"$BACKUP_DIR\"" >&2
  echo "그다음: node scripts/ops/split-migration-sql.mjs \"$BACKUP_DIR/migrate-into-new.sql\"" >&2
  exit 1
fi

PGPASSWORD="$(security find-generic-password -s supabase-db-password -a haenael-ge-new -w 2>/dev/null || true)"
if [ -z "$PGPASSWORD" ]; then
  echo "키체인에 현재 운영 DB 비밀번호가 없다." >&2
  echo "다음 한 줄을 실행해 넣어라(값은 가려져 입력된다):" >&2
  echo "  security add-generic-password -U -s supabase-db-password -a haenael-ge-new -w" >&2
  exit 2
fi
export PGPASSWORD
export PGHOST="$HOST" PGUSER="postgres.$REF" PGDATABASE=postgres PGPORT=5432

echo "대상: $REF ($HOST)"
psql -tAc "select 'ok'" >/dev/null
echo "접속 확인"

for f in "$STEPS_DIR"/*.sql; do
  name="$(basename "$f")"
  printf '%-44s ' "$name"
  if out="$(psql -v ON_ERROR_STOP=1 -tA -f "$f" 2>&1)"; then
    echo "적재후 $(printf '%s' "$out" | tail -1)행"
  else
    echo "실패"
    printf '%s\n' "$out" | tail -5 >&2
    exit 1
  fi
done

echo
echo "최종 대조"
psql -tA -c "select 'users='||(select count(*) from auth.users)||' members='||(select count(*) from public.member)||' goals='||(select count(*) from public.goal)||' cheers='||(select count(*) from public.cheer)||' payments='||(select count(*) from public.payment)||' ledger='||(select count(*) from public.clover_ledger)||' cashouts='||(select count(*) from public.cashout_request)"
echo "기대값  users=3 members=2 goals=15 cheers=41 payments=28 ledger=44 cashouts=4"
