#!/usr/bin/env bash
# =============================================================================
# lead_dedup_race.sh — capture_lead 이메일/인스타그램 dedup 동시성 실검증
# =============================================================================
# 목적: 20260716120000_release_v1_hardening_fix.sql이 capture_lead의
# SELECT-then-INSERT 이메일/인스타그램 dedup 레이스(Codex 2nd-pass REJECT #4,
# 2026-07-16)를 email/instagram 값 기준 pg_advisory_xact_lock(고정순서:
# email 먼저 → instagram 나중, request_key_race.sh와 동일한 패턴)으로 실제로
# 고쳤는지 실제 여러 DB 커넥션(백그라운드 psql, 순차 아님)으로 검증한다.
#
# pgTAP(release_v1.test.sql)은 단일 커넥션 내 순차 실행이라 이 레이스를
# 재현하지 못한다 — 이 스크립트는 진짜 별도 세션을 동시에(백그라운드 & +
# pg_sleep(0.3) 배리어 + wait, 사이에 추가 sleep 없음) 띄워서 검증한다.
#
# 시나리오: 동일 신규 이메일 + 서로 다른 submitter_hash(=서로 다른 제출자를
# 시뮬레이션, 동일 hash를 쓰면 lead_rate_limited(시간당 5건)에 걸려 이 테스트가
# 검증하려는 dedup 레이스와 무관한 실패가 섞인다)로 10개 동시 호출
#   → 전부 에러 없이 성공해야 함(승자 1명은 진짜 INSERT, 나머지 9명은
#     is_duplicate=true로 안전하게 수렴).
#   → DB에는 그 이메일을 가진 lead 행이 정확히 1개만 있어야 함.
#   → raw 23505/duplicate key 예외가 호출자에게 노출되면 FAIL.
#
# 실행: supabase start 후 ./supabase/tests/concurrency/lead_dedup_race.sh
# =============================================================================
set -uo pipefail

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL="psql $DB_URL -v ON_ERROR_STOP=1 -q -t -A"

DEDUP_EMAIL="race-lead-dedup-$$@example.com"
ATTEMPTS=10

WORKDIR="$(mktemp -d)"
FAIL=0

cleanup() {
  echo "--- cleanup: 테스트 fixture 삭제 ---"
  psql "$DB_URL" -v ON_ERROR_STOP=0 -q <<SQL
DELETE FROM lead WHERE lower(email) = lower('${DEDUP_EMAIL}');
SQL
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

echo "=== 1. 동일 신규 이메일(${DEDUP_EMAIL})로 ${ATTEMPTS}개 동시 발사(서로 다른 submitter_hash) ==="
for i in $(seq 1 "$ATTEMPTS"); do
  (
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A <<SQL > "${WORKDIR}/attempt_${i}.out" 2> "${WORKDIR}/attempt_${i}.err"
SELECT pg_sleep(0.3);
SELECT * FROM capture_lead(
  '${DEDUP_EMAIL}', NULL, now(), 'race-test', NULL, NULL, NULL, NULL, '/',
  'race-lead-dedup-hash-$$-${i}'
);
SQL
    echo $? > "${WORKDIR}/attempt_${i}.exit"
  ) &
done
wait

echo "=== 2. 결과 검증 ==="

ROW_COUNT=$($PSQL -c "SELECT count(*) FROM lead WHERE lower(email) = lower('${DEDUP_EMAIL}')")
NONZERO_EXIT=0
RAW_23505=0
DUP_TRUE_COUNT=0
DUP_FALSE_COUNT=0

for i in $(seq 1 "$ATTEMPTS"); do
  ec=$(cat "${WORKDIR}/attempt_${i}.exit")
  if [ "$ec" -ne 0 ]; then
    NONZERO_EXIT=$((NONZERO_EXIT + 1))
    echo "  attempt_${i} 실패(exit=${ec}): $(cat "${WORKDIR}/attempt_${i}.err")"
  fi
  if grep -qi 'duplicate key\|23505' "${WORKDIR}/attempt_${i}.err" 2>/dev/null; then
    RAW_23505=$((RAW_23505 + 1))
    echo "  attempt_${i} raw 23505 노출: $(cat "${WORKDIR}/attempt_${i}.err")"
  fi
  # capture_lead는 "lead_id|is_duplicate" 형태(-t -A, 파이프 구분)로 출력됨.
  # 첫 줄은 pg_sleep(void)의 빈 결과이므로 마지막 줄만 본다.
  out="$(cat "${WORKDIR}/attempt_${i}.out" 2>/dev/null | tail -1)"
  case "$out" in
    *"|t") DUP_TRUE_COUNT=$((DUP_TRUE_COUNT + 1)) ;;
    *"|f") DUP_FALSE_COUNT=$((DUP_FALSE_COUNT + 1)) ;;
    *) [ "$ec" -eq 0 ] && echo "  attempt_${i} 예상 밖 출력: '${out}'" ;;
  esac
done

echo "lead 행 수(email=${DEDUP_EMAIL}) = ${ROW_COUNT}, 실패 호출 = ${NONZERO_EXIT}, raw 23505 노출 = ${RAW_23505}"
echo "is_duplicate=false(승자) = ${DUP_FALSE_COUNT}, is_duplicate=true(중복) = ${DUP_TRUE_COUNT}"

if [ "$ROW_COUNT" -ne 1 ]; then
  echo "FAIL: lead 행이 정확히 1개가 아님(${ROW_COUNT}) — 동일 이메일 동시 신규 제출이 중복 생성됨"
  FAIL=1
else
  echo "PASS: 동일 이메일 ${ATTEMPTS}개 동시 신규 제출이 lead 행 1개로 수렴"
fi

if [ "$NONZERO_EXIT" -ne 0 ]; then
  echo "FAIL: ${NONZERO_EXIT}건이 에러로 실패함(동시 신규 제출은 전부 성공해야 함 — 승자 1 + 중복 나머지)"
  FAIL=1
else
  echo "PASS: ${ATTEMPTS}개 전부 에러 없이 성공"
fi

if [ "$RAW_23505" -ne 0 ]; then
  echo "FAIL: raw 23505/duplicate key 예외가 호출자에게 노출됨(${RAW_23505}건)"
  FAIL=1
else
  echo "PASS: raw 23505/duplicate key 노출 0건"
fi

if [ "$DUP_FALSE_COUNT" -eq 1 ] && [ "$DUP_TRUE_COUNT" -eq $((ATTEMPTS - 1)) ]; then
  echo "PASS: 승자 1명(is_duplicate=false) + 나머지 ${DUP_TRUE_COUNT}명(is_duplicate=true)으로 정확히 수렴"
else
  echo "FAIL: is_duplicate 분포가 예상과 다름(false=${DUP_FALSE_COUNT}, true=${DUP_TRUE_COUNT}, 기대값 false=1/true=$((ATTEMPTS - 1)))"
  FAIL=1
fi

echo "=== 결과 ==="
if [ "$FAIL" -eq 0 ]; then
  echo "ALL PASS — capture_lead 이메일 dedup 동시성 레이스 안전 확인"
  exit 0
else
  echo "FAIL — 위 로그 확인. 각 psql 호출 stderr는 ${WORKDIR}/*.err 에 있었음(cleanup 전 임시본)"
  exit 1
fi
