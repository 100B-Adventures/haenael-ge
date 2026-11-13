#!/usr/bin/env bash
# 해낼게 운영 Supabase(ossvejipdivgxzcqszbw) 매일 암호화 덤프. 114 crontab 이 매일 04:10 KST 에 부른다.
# 왜: Supabase 무료 요금제는 자동 백업이 없다. 회장 2026-11-13 13:3x "일단은 돈을 안 쓰는 쪽으로" → 114 pg_dump.
# 방식: postgres:17 컨테이너의 pg_dump(서버 17, 로컬 pg_dump 16 은 거부됨) → gpg AES256(대칭, 맥 dr-snapshot 과 같은 암호) → /mnt/hdd, 14일 보관.
# 비밀값: secrets/keychain-mirror.env 의 SUPABASE_DB_PASSWORD_HAENAEL_GE_NEW, secrets/dr-backup.env 의 SJ_DR_BACKUP_PASSPHRASE. 값은 출력·로그에 남기지 않는다.
# 실패하면 notify-ops p2. 성공·실패 모두 $DEST/backup.log 에 한 줄.
# 복원: gpg -d <파일> | pg_restore ... (docs/ops/인프라.md 의 복원 절차 참고)
set -uo pipefail

DEST="${HAENAEL_BACKUP_DEST:-/mnt/hdd/backups/haenael-ge-prod-db}"
SECRETS="${HAENAEL_BACKUP_SECRETS:-$HOME/.sj-agent-harness/secrets/keychain-mirror.env}"
DR_SECRETS="${HAENAEL_BACKUP_DR_SECRETS:-$HOME/.sj-agent-harness/secrets/dr-backup.env}"
NOTIFY="${HAENAEL_BACKUP_NOTIFY:-$HOME/.claude/harness/bin/notify-ops.sh}"
RETAIN_DAYS="${HAENAEL_BACKUP_RETAIN_DAYS:-14}"
HOST=aws-0-ap-southeast-1.pooler.supabase.com
PORT=5432   # Supavisor session mode. transaction mode(6543)는 pg_dump 에 쓰지 않는다.
USER_=postgres.ossvejipdivgxzcqszbw
STAMP=$(TZ=Asia/Seoul date +%Y%m%d-%H%M)
OUT="$DEST/haenael-ge-prod-$STAMP.dump.gpg"
LOG="$DEST/backup.log"

mkdir -p "$DEST" && chmod 700 "$DEST"

log() { printf '%s %s\n' "$(TZ=Asia/Seoul date '+%F %T KST')" "$*" >> "$LOG"; }
fail() {
  log "FAIL $*"
  rm -f "$OUT.tmp"
  "$NOTIFY" p2 "해낼게 운영 DB 백업 실패" "$* (114 $0, 로그 $LOG)" >/dev/null 2>&1 || true
  exit 1
}

secret() { grep -h "^$1=" "$SECRETS" "$DR_SECRETS" 2>/dev/null | head -1 | cut -d= -f2-; }
DBPASS=$(secret SUPABASE_DB_PASSWORD_HAENAEL_GE_NEW)
PASSPHRASE=$(secret SJ_DR_BACKUP_PASSPHRASE)
[ -n "$DBPASS" ] || fail "DB 비밀번호 키 없음(SUPABASE_DB_PASSWORD_HAENAEL_GE_NEW)"
[ -n "$PASSPHRASE" ] || fail "암호화 암호 키 없음(SJ_DR_BACKUP_PASSPHRASE)"

# 덤프 → 암호화. 평문은 디스크에 쓰지 않는다.
docker run --rm -e PGPASSWORD="$DBPASS" postgres:17 \
  pg_dump "host=$HOST port=$PORT dbname=postgres user=$USER_ sslmode=require" \
  --format=custom --no-owner --no-privileges \
  2>"$DEST/.pg_dump.err" \
  | gpg --batch --yes --quiet --pinentry-mode loopback --symmetric --cipher-algo AES256 \
      --passphrase-fd 3 -o "$OUT.tmp" 3<<<"$PASSPHRASE"
rc=("${PIPESTATUS[@]}")
[ "${rc[0]}" = 0 ] || fail "pg_dump rc=${rc[0]}: $(head -c 300 "$DEST/.pg_dump.err" | tr '\n' ' ')"
[ "${rc[1]}" = 0 ] || fail "gpg rc=${rc[1]}"
size=$(stat -c %s "$OUT.tmp" 2>/dev/null || echo 0)
[ "$size" -gt 10000 ] || fail "결과 파일이 너무 작다(${size}B)"
mv "$OUT.tmp" "$OUT" && chmod 600 "$OUT"
rm -f "$DEST/.pg_dump.err"

# 보관 기간이 지난 것만 지운다(이 스크립트가 만든 이름 규칙의 파일만).
find "$DEST" -maxdepth 1 -type f -name 'haenael-ge-prod-*.dump.gpg' -mtime +"$RETAIN_DAYS" -delete

log "OK $(basename "$OUT") ${size}B kept=$(find "$DEST" -maxdepth 1 -name 'haenael-ge-prod-*.dump.gpg' | wc -l)"
echo "$OUT"
