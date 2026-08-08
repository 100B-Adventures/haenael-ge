#!/usr/bin/env bash
# =============================================================================
# request_key_fingerprint_race.sh — request fingerprint 멱등키 동시성 실검증
# =============================================================================
# 목적: Codex 3차 money-code 리뷰(2026-07-13)가 지적한 결함 — request_key replay
# 판정이 amount_krw만 비교해 동일 request_key를 다른 goal_id(또는 customer_key)로
# 재사용해도 기존 주문을 그대로 성공 반환하던 문제를 20260713190000_
# cheer_order_request_fingerprint.sql이 request_fingerprint jsonb 전체 비교로
# 고쳤는지, 실제 여러 DB 커넥션(백그라운드 psql, 순차 아님)으로 검증한다.
#
# 시나리오: 동일 request_key + 서로 다른 goal_id(두 그룹)로 N개 동시 호출
#   → 정확히 1개(먼저 커밋된 쪽, 어느 그룹이든 무관)만 성공/재생, 나머지는
#     request_key_conflict로 안전하게 실패해야 함(raw 23505/duplicate key 노출 금지).
#   → 승자 쪽 goal_id와 같은 그룹은 전부 exit 0, 다른 그룹은 전부 request_key_conflict.
#
# 실행: supabase start 후 ./supabase/tests/concurrency/request_key_fingerprint_race.sh
# =============================================================================
set -uo pipefail

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL="psql $DB_URL -v ON_ERROR_STOP=1 -q -t -A"

MEMBER_ID="eeeeeeee-0000-0000-0000-0000000000e3"
GOAL_SLUG_A="race-fp-a-$$"
GOAL_SLUG_B="race-fp-b-$$"
ORDER_PREFIX_A="race-fp-order-a-$$"
ORDER_PREFIX_B="race-fp-order-b-$$"
RK_FP="req-key-fp-$$-cccccccc"

ATTEMPTS_PER_GROUP=5   # goal A 그룹 5개 + goal B 그룹 5개 = 총 10개 동시, 동일 request_key

WORKDIR="$(mktemp -d)"
FAIL=0

cleanup() {
  echo "--- cleanup: 테스트 fixture 삭제 ---"
  psql "$DB_URL" -v ON_ERROR_STOP=0 -q <<SQL
DELETE FROM cheer WHERE goal_id IN (SELECT id FROM goal WHERE slug IN ('${GOAL_SLUG_A}', '${GOAL_SLUG_B}'));
DELETE FROM payment WHERE request_key = '${RK_FP}';
DELETE FROM goal WHERE slug IN ('${GOAL_SLUG_A}', '${GOAL_SLUG_B}');
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
  'race_fp_$$@test.local', '', now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO member (id, nickname, kyc_status) VALUES ('${MEMBER_ID}', '핑거프린트레이스', 'NONE')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO goal (member_id, slug, title, due_date, status, deleted_at) VALUES
  ('${MEMBER_ID}', '${GOAL_SLUG_A}', 'fingerprint race goal A', now()::date + 30, 'ACTIVE', NULL),
  ('${MEMBER_ID}', '${GOAL_SLUG_B}', 'fingerprint race goal B', now()::date + 30, 'ACTIVE', NULL);
SQL

GOAL_ID_A=$($PSQL -c "SELECT id FROM goal WHERE slug = '${GOAL_SLUG_A}'")
GOAL_ID_B=$($PSQL -c "SELECT id FROM goal WHERE slug = '${GOAL_SLUG_B}'")
echo "goal_id_a=${GOAL_ID_A}  goal_id_b=${GOAL_ID_B}"

echo "=== 2. 동일 request_key(${RK_FP}) + goal_id A(${GOAL_ID_A}) ${ATTEMPTS_PER_GROUP}개 / goal_id B(${GOAL_ID_B}) ${ATTEMPTS_PER_GROUP}개 동시 발사 ==="
echo "    (동일 amount·customer_key·displayName·message — goal_id만 다름: fingerprint 비교가 실제로 goal_id를 보는지 검증)"

for i in $(seq 1 "$ATTEMPTS_PER_GROUP"); do
  (
    # sleep 배리어: 모든 백그라운드 세션이 연결을 마칠 시간을 준 뒤 거의 동시에
    # 실제 RPC를 쏜다 — 순수 순차 실행이 아니라 진짜 겹치는 호출을 만들기 위함.
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A <<SQL > "${WORKDIR}/a_${i}.out" 2> "${WORKDIR}/a_${i}.err"
SELECT pg_sleep(0.3);
SELECT * FROM create_cheer_order(
  ${GOAL_ID_A}, '${ORDER_PREFIX_A}-${i}', 5000, 5000, '고정이름', false, '고정메시지',
  'fp_race_customer_shared_$$', '${RK_FP}'
);
SQL
    echo $? > "${WORKDIR}/a_${i}.exit"
  ) &
done
for i in $(seq 1 "$ATTEMPTS_PER_GROUP"); do
  (
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A <<SQL > "${WORKDIR}/b_${i}.out" 2> "${WORKDIR}/b_${i}.err"
SELECT pg_sleep(0.3);
SELECT * FROM create_cheer_order(
  ${GOAL_ID_B}, '${ORDER_PREFIX_B}-${i}', 5000, 5000, '고정이름', false, '고정메시지',
  'fp_race_customer_shared_$$', '${RK_FP}'
);
SQL
    echo $? > "${WORKDIR}/b_${i}.exit"
  ) &
done
wait

echo "=== 3. 결과 검증 ==="

ROW_COUNT=$($PSQL -c "SELECT count(*) FROM payment WHERE request_key = '${RK_FP}'")
WINNER_FINGERPRINT_GOAL=$($PSQL -c "SELECT request_fingerprint->>'goal_id' FROM payment WHERE request_key = '${RK_FP}'")
RAW_23505=0

echo "payment 행 수(request_key=${RK_FP}) = ${ROW_COUNT}, 승자 fingerprint.goal_id = ${WINNER_FINGERPRINT_GOAL}"

if [ "$ROW_COUNT" -ne 1 ]; then
  echo "FAIL: payment 행이 정확히 1개가 아님(${ROW_COUNT}) — 동일 request_key인데 다른 goal_id로 중복 생성됨"
  FAIL=1
else
  echo "PASS: 동일 request_key + 서로 다른 goal_id 동시 요청 ${ATTEMPTS_PER_GROUP}x2개가 payment 행 1개로 수렴"
fi

if [ "$WINNER_FINGERPRINT_GOAL" = "$GOAL_ID_A" ]; then
  WINNER_GROUP="a"; LOSER_GROUP="b"
elif [ "$WINNER_FINGERPRINT_GOAL" = "$GOAL_ID_B" ]; then
  WINNER_GROUP="b"; LOSER_GROUP="a"
else
  echo "FAIL: 승자 fingerprint.goal_id(${WINNER_FINGERPRINT_GOAL})가 goal A/B 어느 쪽도 아님(row 없음?)"
  FAIL=1
  WINNER_GROUP=""; LOSER_GROUP=""
fi

WINNER_NONZERO=0
LOSER_MISSING_CONFLICT=0
if [ -n "$WINNER_GROUP" ]; then
  for i in $(seq 1 "$ATTEMPTS_PER_GROUP"); do
    ec=$(cat "${WORKDIR}/${WINNER_GROUP}_${i}.exit")
    if [ "$ec" -ne 0 ]; then
      WINNER_NONZERO=$((WINNER_NONZERO + 1))
      echo "  ${WINNER_GROUP}_${i}(승자 goal 그룹) 실패(exit=${ec}): $(cat "${WORKDIR}/${WINNER_GROUP}_${i}.err")"
    fi
    if grep -qi 'duplicate key\|23505' "${WORKDIR}/${WINNER_GROUP}_${i}.err" 2>/dev/null; then
      RAW_23505=$((RAW_23505 + 1))
    fi
  done

  for i in $(seq 1 "$ATTEMPTS_PER_GROUP"); do
    ec=$(cat "${WORKDIR}/${LOSER_GROUP}_${i}.exit")
    if [ "$ec" -eq 0 ]; then
      LOSER_MISSING_CONFLICT=$((LOSER_MISSING_CONFLICT + 1))
      echo "  ${LOSER_GROUP}_${i}(패자 goal 그룹) 가 에러 없이 성공함(request_key_conflict로 거부돼야 함) — 다른 goal_id인데 replay를 허용한 것 = 결함 재발"
    elif ! grep -qi 'request_key_conflict' "${WORKDIR}/${LOSER_GROUP}_${i}.err" 2>/dev/null; then
      LOSER_MISSING_CONFLICT=$((LOSER_MISSING_CONFLICT + 1))
      echo "  ${LOSER_GROUP}_${i}(패자 goal 그룹) 실패했지만 request_key_conflict가 아님: $(cat "${WORKDIR}/${LOSER_GROUP}_${i}.err")"
    fi
    if grep -qi 'duplicate key\|23505' "${WORKDIR}/${LOSER_GROUP}_${i}.err" 2>/dev/null; then
      RAW_23505=$((RAW_23505 + 1))
    fi
  done

  if [ "$WINNER_NONZERO" -ne 0 ]; then
    echo "FAIL: 승자와 같은 goal_id 그룹(${WINNER_GROUP}) 중 ${WINNER_NONZERO}건이 실패함(replay는 항상 성공해야 함)"
    FAIL=1
  else
    echo "PASS: 승자와 같은 goal_id 그룹은 전부 성공(재생 포함)"
  fi

  if [ "$LOSER_MISSING_CONFLICT" -ne 0 ]; then
    echo "FAIL: 승자와 다른 goal_id 그룹(${LOSER_GROUP}) 중 ${LOSER_MISSING_CONFLICT}건이 request_key_conflict로 안전하게 거부되지 않음 — fingerprint가 goal_id를 실제로 비교하지 않고 있을 가능성"
    FAIL=1
  else
    echo "PASS: 승자와 다른 goal_id 그룹은 전부 request_key_conflict로 안전하게 거부됨 — fingerprint가 goal_id 불일치를 정확히 잡음"
  fi
fi

if [ "$RAW_23505" -ne 0 ]; then
  echo "FAIL: raw 23505/duplicate key 예외가 호출자에게 노출됨(${RAW_23505}건)"
  FAIL=1
fi

echo "=== 결과 ==="
if [ "$FAIL" -eq 0 ]; then
  echo "ALL PASS — request fingerprint(goal_id 포함) 멱등 동시성 레이스 안전 확인"
  exit 0
else
  echo "FAIL — 위 로그 확인. 각 psql 호출 stderr는 ${WORKDIR}/*.err 에 있었음(cleanup 전 임시본)"
  exit 1
fi
