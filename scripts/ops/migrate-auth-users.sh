#!/usr/bin/env bash
# 이전 운영 DB 의 auth.users / auth.identities 를 현재 운영 DB 로 옮긴다.
#
# 왜 pg_dump 통짜가 아니라 이 스크립트인가:
#   현재 운영 DB 에는 CI 용 QA 계정이 이미 있고, 이전 DB 에도 같은 이메일이 있어
#   통짜 복사가 users_email_partial_key 중복으로 깨진다. 그 계정만 빼고 옮긴다.
#
# 실행 위치: 온프렘 VM (도커로 postgres:17 클라이언트를 쓴다)
# 입력: 표준입력 첫 줄 = 원본 비밀번호, 둘째 줄 = 대상 비밀번호

set -euo pipefail

read -r SRC_PW
read -r DST_PW

SRC_HOST=aws-1-ap-northeast-2.pooler.supabase.com
SRC_USER=postgres.gmpwrcxpvgylmllasoqy
DST_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DST_USER=postgres.ossvejipdivgxzcqszbw

# CI 전용 QA 계정. 양쪽에 이미 있으므로 옮기지 않는다.
SKIP_EMAIL='qa-production-readonly@haenaelge.invalid'

run_src() { docker run --rm -i -e PGPASSWORD="$SRC_PW" postgres:17-alpine \
  psql -tA -h "$SRC_HOST" -U "$SRC_USER" -d postgres -p 5432 "$@"; }
run_dst() { docker run --rm -i -e PGPASSWORD="$DST_PW" postgres:17-alpine \
  psql -tA -h "$DST_HOST" -U "$DST_USER" -d postgres -p 5432 "$@"; }

echo "== 컬럼 구성 대조 =="
SRC_COLS="$(run_src -c "select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema = 'auth' and table_name = 'users'")"
DST_COLS="$(run_dst -c "select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema = 'auth' and table_name = 'users'")"
if [ "$SRC_COLS" = "$DST_COLS" ]; then
  echo "auth.users 컬럼 구성 동일"
else
  echo "auth.users 컬럼 구성이 다르다. 공통 컬럼만 옮긴다." >&2
fi

# 생성 컬럼(generated column)은 COPY 에 쓸 수 없다. 대상에서 자동으로 채워지므로 뺀다.
GENERATED="$(run_dst -c "select coalesce(string_agg(column_name, ','), '') from information_schema.columns where table_schema = 'auth' and table_name = 'users' and is_generated = 'ALWAYS'")"
echo "생성 컬럼 제외: ${GENERATED:-없음}"

# 양쪽 공통 컬럼만 쓴다. gotrue 버전이 달라도 안전하다.
COMMON="$(python3 - "$SRC_COLS" "$DST_COLS" "$GENERATED" <<'PY'
import sys
a = sys.argv[1].split(",")
b = set(sys.argv[2].split(","))
gen = set(x for x in sys.argv[3].split(",") if x)
print(",".join(c for c in a if c in b and c not in gen))
PY
)"
echo "공통 컬럼 $(echo "$COMMON" | tr ',' '\n' | grep -c .)개"

echo "== auth.users 이관 =="
docker run --rm -i -e PGPASSWORD="$SRC_PW" postgres:17-alpine \
  psql -h "$SRC_HOST" -U "$SRC_USER" -d postgres -p 5432 \
  -c "\\copy (select $COMMON from auth.users where email is distinct from '$SKIP_EMAIL') to stdout" \
| docker run --rm -i -e PGPASSWORD="$DST_PW" postgres:17-alpine \
  psql -v ON_ERROR_STOP=1 -h "$DST_HOST" -U "$DST_USER" -d postgres -p 5432 \
  -c "\\copy auth.users ($COMMON) from stdin"  || echo "auth.users 이관 건너뜀(이미 있음)"

echo "== auth.identities 이관 =="
ID_SRC="$(run_src -c "select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema = 'auth' and table_name = 'identities'")"
ID_DST="$(run_dst -c "select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema = 'auth' and table_name = 'identities'")"
ID_GEN="$(run_dst -c "select coalesce(string_agg(column_name, ','), '') from information_schema.columns where table_schema = 'auth' and table_name = 'identities' and is_generated = 'ALWAYS'")"
echo "identities 생성 컬럼 제외: ${ID_GEN:-없음}"
ID_COMMON="$(python3 - "$ID_SRC" "$ID_DST" "$ID_GEN" <<'PY'
import sys
a = sys.argv[1].split(",")
b = set(sys.argv[2].split(","))
gen = set(x for x in sys.argv[3].split(",") if x)
print(",".join(c for c in a if c in b and c not in gen))
PY
)"
docker run --rm -i -e PGPASSWORD="$SRC_PW" postgres:17-alpine \
  psql -h "$SRC_HOST" -U "$SRC_USER" -d postgres -p 5432 \
  -c "\\copy (select $ID_COMMON from auth.identities where user_id in (select id from auth.users where email is distinct from '$SKIP_EMAIL')) to stdout" \
| docker run --rm -i -e PGPASSWORD="$DST_PW" postgres:17-alpine \
  psql -v ON_ERROR_STOP=1 -h "$DST_HOST" -U "$DST_USER" -d postgres -p 5432 \
  -c "\\copy auth.identities ($ID_COMMON) from stdin"

echo "== 결과 =="
run_dst -c "select 'auth.users=' || count(*) from auth.users"
run_dst -c "select 'auth.identities=' || count(*) from auth.identities"
