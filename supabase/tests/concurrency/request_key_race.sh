#!/usr/bin/env bash
# =============================================================================
# request_key_race.sh — create_cheer_order 멱등키(request_key) 동시성 실검증
# =============================================================================
# 목적: 20260710051000_cheer_order_abuse_guard.sql의 request_key SELECT-then-INSERT
# 패턴이 동일 request_key로 정확히 동시에 두 요청이 오면 둘 다 "없음"을 보고 둘 다
# INSERT를 시도해 패자가 raw 23505(UNIQUE 위반)로 실패하는 blocker(Codex 리뷰
# 2026-07-13)를 20260713180819_cheer_order_concurrency_fix.sql이
# INSERT ... ON CONFLICT (request_key) DO NOTHING 안전망으로 고쳤는지 실제 여러 DB
# 커넥션(백그라운드 psql)으로 검증한다.
#
# 시나리오 A: 동일 request_key + 동일 amount(+2026-07-13 fingerprint 강화 후:
#   customer_key/goal_id/displayName/isAnonymous/message까지 전부 동일 — 진짜
#   재시도는 클라이언트가 order_id만 새로 생성하고 나머지 요청 필드는 그대로
#   재전송하기 때문)로 N개 동시 호출
#   → 전부 에러 없이 성공해야 함(승자 1명은 진짜 생성, 나머지는 is_replay=true 재생).
#   → DB에는 그 request_key를 가진 payment 행이 정확히 1개만 있어야 함.
#
# 시나리오 B: 동일 request_key + 서로 다른 amount(두 그룹, 그룹 내부는 customer_key
#   등 나머지 필드 동일 — fingerprint가 amount 하나만으로 그룹을 가르는지 보기 위함)
#   로 N개 동시 호출
#   → 정확히 1개(먼저 커밋된 것, 어느 그룹이든 무관)만 성공/재생, 나머지는
#     request_key_conflict로 안전하게 실패해야 함(raw 23505/duplicate key 노출 금지).
#   → 승자 쪽 amount와 같은 그룹은 전부 exit 0, 다른 그룹은 전부 request_key_conflict.
#
# 실행: supabase start 후 ./supabase/tests/concurrency/request_key_race.sh
# =============================================================================
set -uo pipefail

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL="psql $DB_URL -v ON_ERROR_STOP=1 -q -t -A"

MEMBER_ID="eeeeeeee-0000-0000-0000-0000000000e2"
GOAL_SLUG="race-rk-$$"
SAME_ORDER_PREFIX="race-rk-same-$$"
DIFF_ORDER_PREFIX="race-rk-diff-$$"
RK_SAME="req-key-same-$$-aaaaaaaa"
RK_DIFF="req-key-diff-$$-bbbbbbbb"

SAME_ATTEMPTS=10
DIFF_ATTEMPTS_PER_GROUP=5   # amount 3000 그룹 5개 + amount 5000 그룹 5개 = 총 10개 동시

WORKDIR="$(mktemp -d)"
FAIL=0

cleanup() {
  echo "--- cleanup: 테스트 fixture 삭제 ---"
  psql "$DB_URL" -v ON_ERROR_STOP=0 -q <<SQL
DELETE FROM cheer WHERE goal_id IN (SELECT id FROM goal WHERE slug = '${GOAL_SLUG}');
DELETE FROM payment WHERE request_key IN ('${RK_SAME}', '${RK_DIFF}');
DELETE FROM goal WHERE slug = '${GOAL_SLUG}';
DELETE FROM member WHERE id = '${MEMBER_ID}';
DELETE FROM auth.users WHERE id = '${MEMBER_ID}';
SQL
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

echo "=== 1. fixture 준비 ==="
psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_anonymous
) VALUES (
  '${MEMBER_ID}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'race_rk_$$@test.local', '', now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO member (id, nickname, kyc_status) VALUES ('${MEMBER_ID}', '멱등레이스', 'NONE')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO goal (member_id, slug, title, due_date, status, deleted_at) VALUES
  ('${MEMBER_ID}', '${GOAL_SLUG}', 'request_key race', now()::date + 30, 'ACTIVE', NULL);
SQL

GOAL_ID=$($PSQL -c "SELECT id FROM goal WHERE slug = '${GOAL_SLUG}'")
echo "goal_id=${GOAL_ID}"

echo "=== 2. 시나리오 A: 동일 request_key(${RK_SAME}) + 동일 amount(3000)로 ${SAME_ATTEMPTS}개 동시 발사 ==="
for i in $(seq 1 "$SAME_ATTEMPTS"); do
  (
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A <<SQL > "${WORKDIR}/same_${i}.out" 2> "${WORKDIR}/same_${i}.err"
SELECT pg_sleep(0.3);
SELECT * FROM create_cheer_order(
  ${GOAL_ID}, '${SAME_ORDER_PREFIX}-${i}', 3000, 3000, '', true, '',
  'rk_same_customer_shared_$$', '${RK_SAME}'
);
SQL
    echo $? > "${WORKDIR}/same_${i}.exit"
  ) &
done
wait

echo "=== 3. 시나리오 B: 동일 request_key(${RK_DIFF}) + amount 3000그룹 ${DIFF_ATTEMPTS_PER_GROUP}개 / amount 5000그룹 ${DIFF_ATTEMPTS_PER_GROUP}개 동시 발사 ==="
for i in $(seq 1 "$DIFF_ATTEMPTS_PER_GROUP"); do
  (
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A <<SQL > "${WORKDIR}/diffA_${i}.out" 2> "${WORKDIR}/diffA_${i}.err"
SELECT pg_sleep(0.3);
SELECT * FROM create_cheer_order(
  ${GOAL_ID}, '${DIFF_ORDER_PREFIX}-a-${i}', 3000, 3000, '', true, '',
  'rk_diff_a_customer_shared_$$', '${RK_DIFF}'
);
SQL
    echo $? > "${WORKDIR}/diffA_${i}.exit"
  ) &
done
for i in $(seq 1 "$DIFF_ATTEMPTS_PER_GROUP"); do
  (
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A <<SQL > "${WORKDIR}/diffB_${i}.out" 2> "${WORKDIR}/diffB_${i}.err"
SELECT pg_sleep(0.3);
SELECT * FROM create_cheer_order(
  ${GOAL_ID}, '${DIFF_ORDER_PREFIX}-b-${i}', 5000, 5000, '', true, '',
  'rk_diff_b_customer_shared_$$', '${RK_DIFF}'
);
SQL
    echo $? > "${WORKDIR}/diffB_${i}.exit"
  ) &
done
wait

echo "=== 4. 결과 검증 ==="

# --- 시나리오 A ---
SAME_ROW_COUNT=$($PSQL -c "SELECT count(*) FROM payment WHERE request_key = '${RK_SAME}'")
SAME_NONZERO_EXIT=0
SAME_RAW_23505=0
for i in $(seq 1 "$SAME_ATTEMPTS"); do
  ec=$(cat "${WORKDIR}/same_${i}.exit")
  if [ "$ec" -ne 0 ]; then
    SAME_NONZERO_EXIT=$((SAME_NONZERO_EXIT + 1))
    echo "  same_${i} 실패(exit=${ec}): $(cat "${WORKDIR}/same_${i}.err")"
  fi
  if grep -qi 'duplicate key\|23505' "${WORKDIR}/same_${i}.err" 2>/dev/null; then
    SAME_RAW_23505=$((SAME_RAW_23505 + 1))
  fi
done

echo "시나리오 A: payment 행 수(request_key=${RK_SAME}) = ${SAME_ROW_COUNT}, 실패 호출 = ${SAME_NONZERO_EXIT}, raw 23505 노출 = ${SAME_RAW_23505}"

if [ "$SAME_ROW_COUNT" -ne 1 ]; then
  echo "FAIL: 시나리오 A — payment 행이 정확히 1개가 아님(${SAME_ROW_COUNT}) — 동일 request_key인데 중복 생성됨"
  FAIL=1
else
  echo "PASS: 시나리오 A — 동일 request_key ${SAME_ATTEMPTS}개 동시 요청이 payment 행 1개로 수렴"
fi

if [ "$SAME_NONZERO_EXIT" -ne 0 ]; then
  echo "FAIL: 시나리오 A — 동일 request_key+동일 amount인데 ${SAME_NONZERO_EXIT}건이 에러로 실패함(멱등 재시도는 항상 성공해야 함)"
  FAIL=1
else
  echo "PASS: 시나리오 A — ${SAME_ATTEMPTS}개 전부 에러 없이 성공(승자 1 + 재생 $((SAME_ATTEMPTS - 1)))"
fi

if [ "$SAME_RAW_23505" -ne 0 ]; then
  echo "FAIL: 시나리오 A — raw 23505/duplicate key 예외가 호출자에게 노출됨(${SAME_RAW_23505}건)"
  FAIL=1
fi

# --- 시나리오 B ---
DIFF_ROW_COUNT=$($PSQL -c "SELECT count(*) FROM payment WHERE request_key = '${RK_DIFF}'")
WINNER_AMOUNT=$($PSQL -c "SELECT amount_krw FROM payment WHERE request_key = '${RK_DIFF}'")
DIFF_RAW_23505=0

echo "시나리오 B: payment 행 수(request_key=${RK_DIFF}) = ${DIFF_ROW_COUNT}, 승자 amount = ${WINNER_AMOUNT}"

if [ "$DIFF_ROW_COUNT" -ne 1 ]; then
  echo "FAIL: 시나리오 B — payment 행이 정확히 1개가 아님(${DIFF_ROW_COUNT})"
  FAIL=1
else
  echo "PASS: 시나리오 B — 서로 다른 amount로 동시 경합해도 payment 행 1개로 수렴"
fi

if [ "$WINNER_AMOUNT" = "3000" ]; then
  WINNER_GROUP="diffA"; LOSER_GROUP="diffB"
elif [ "$WINNER_AMOUNT" = "5000" ]; then
  WINNER_GROUP="diffB"; LOSER_GROUP="diffA"
else
  echo "FAIL: 시나리오 B — 승자 amount(${WINNER_AMOUNT})가 3000/5000 둘 다 아님(row 없음?)"
  FAIL=1
  WINNER_GROUP=""; LOSER_GROUP=""
fi

WINNER_NONZERO=0
LOSER_MISSING_CONFLICT=0
if [ -n "$WINNER_GROUP" ]; then
  for i in $(seq 1 "$DIFF_ATTEMPTS_PER_GROUP"); do
    ec=$(cat "${WORKDIR}/${WINNER_GROUP}_${i}.exit")
    if [ "$ec" -ne 0 ]; then
      WINNER_NONZERO=$((WINNER_NONZERO + 1))
      echo "  ${WINNER_GROUP}_${i}(승자 amount 그룹) 실패(exit=${ec}): $(cat "${WORKDIR}/${WINNER_GROUP}_${i}.err")"
    fi
    if grep -qi 'duplicate key\|23505' "${WORKDIR}/${WINNER_GROUP}_${i}.err" 2>/dev/null; then
      DIFF_RAW_23505=$((DIFF_RAW_23505 + 1))
    fi
  done

  for i in $(seq 1 "$DIFF_ATTEMPTS_PER_GROUP"); do
    ec=$(cat "${WORKDIR}/${LOSER_GROUP}_${i}.exit")
    if [ "$ec" -eq 0 ]; then
      LOSER_MISSING_CONFLICT=$((LOSER_MISSING_CONFLICT + 1))
      echo "  ${LOSER_GROUP}_${i}(패자 amount 그룹) 가 에러 없이 성공함(request_key_conflict로 거부돼야 함)"
    elif ! grep -qi 'request_key_conflict' "${WORKDIR}/${LOSER_GROUP}_${i}.err" 2>/dev/null; then
      LOSER_MISSING_CONFLICT=$((LOSER_MISSING_CONFLICT + 1))
      echo "  ${LOSER_GROUP}_${i}(패자 amount 그룹) 실패했지만 request_key_conflict가 아님: $(cat "${WORKDIR}/${LOSER_GROUP}_${i}.err")"
    fi
    if grep -qi 'duplicate key\|23505' "${WORKDIR}/${LOSER_GROUP}_${i}.err" 2>/dev/null; then
      DIFF_RAW_23505=$((DIFF_RAW_23505 + 1))
    fi
  done

  if [ "$WINNER_NONZERO" -ne 0 ]; then
    echo "FAIL: 시나리오 B — 승자와 같은 amount(${WINNER_AMOUNT}) 그룹(${WINNER_GROUP}) 중 ${WINNER_NONZERO}건이 실패함(replay는 항상 성공해야 함)"
    FAIL=1
  else
    echo "PASS: 시나리오 B — 승자와 같은 amount 그룹은 전부 성공(재생 포함)"
  fi

  if [ "$LOSER_MISSING_CONFLICT" -ne 0 ]; then
    echo "FAIL: 시나리오 B — 승자와 다른 amount 그룹(${LOSER_GROUP}) 중 ${LOSER_MISSING_CONFLICT}건이 request_key_conflict로 안전하게 거부되지 않음"
    FAIL=1
  else
    echo "PASS: 시나리오 B — 승자와 다른 amount 그룹은 전부 request_key_conflict로 안전하게 거부됨"
  fi
fi

if [ "$DIFF_RAW_23505" -ne 0 ]; then
  echo "FAIL: 시나리오 B — raw 23505/duplicate key 예외가 호출자에게 노출됨(${DIFF_RAW_23505}건)"
  FAIL=1
fi

echo "=== 결과 ==="
if [ "$FAIL" -eq 0 ]; then
  echo "ALL PASS — request_key 멱등 동시성 레이스 안전 확인"
  exit 0
else
  echo "FAIL — 위 로그 확인. 각 psql 호출 stderr는 ${WORKDIR}/*.err 에 있었음(cleanup 전 임시본)"
  exit 1
fi
