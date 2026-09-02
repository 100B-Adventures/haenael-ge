#!/usr/bin/env bash
# =============================================================================
# rate_limit_race.sh — create_cheer_order rate-limit 동시성 실검증
# =============================================================================
# 목적: 20260710051000_cheer_order_abuse_guard.sql의 customer_key/goal 기준
# rate-limit(count→insert)에 잠금이 없어 정확히 동시에 N개 요청이 들어오면 전부
# "상한 미달"을 관측하고 통과해버리는 blocker(Codex 리뷰 2026-07-13)를
# 20260713180819_cheer_order_concurrency_fix.sql이 pg_advisory_xact_lock으로
# 고쳤는지 실제 여러 DB 커넥션(백그라운드 psql)으로 검증한다.
#
# pgTAP은 단일 커넥션 내 순차 실행이라 이 레이스를 재현하지 못한다 — 이 스크립트는
# 진짜 별도 세션을 동시에(백그라운드 & + sleep 배리어 + wait, 사이에 추가 sleep 없음)
# 띄워서 검증한다.
#
# 실행: supabase start 후 ./supabase/tests/concurrency/rate_limit_race.sh
# =============================================================================
set -uo pipefail

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL="psql $DB_URL -v ON_ERROR_STOP=1 -q -t -A"

MEMBER_ID="eeeeeeee-0000-0000-0000-0000000000e1"
CUSTOMER_GOAL_SLUG="race-rl-customer-$$"
GOAL_GOAL_SLUG="race-rl-goal-$$"
CUSTOMER_ORDER_PREFIX="race-cust-$$"
GOAL_ORDER_PREFIX="race-goal-$$"

CUSTOMER_LIMIT=5
CUSTOMER_ATTEMPTS=10   # 상한(5)보다 확실히 많이 쏴서 직렬화 여부를 드러낸다
GOAL_LIMIT=20
GOAL_ATTEMPTS=30       # 상한(20)보다 확실히 많이 쏴서 직렬화 여부를 드러낸다

WORKDIR="$(mktemp -d)"
FAIL=0

cleanup() {
  echo "--- cleanup: 테스트 fixture 삭제 ---"
  psql "$DB_URL" -v ON_ERROR_STOP=0 -q <<SQL
DELETE FROM cheer WHERE goal_id IN (SELECT id FROM goal WHERE slug IN ('${CUSTOMER_GOAL_SLUG}', '${GOAL_GOAL_SLUG}'));
DELETE FROM payment WHERE order_id LIKE '${CUSTOMER_ORDER_PREFIX}-%' OR order_id LIKE '${GOAL_ORDER_PREFIX}-%';
DELETE FROM goal WHERE slug IN ('${CUSTOMER_GOAL_SLUG}', '${GOAL_GOAL_SLUG}');
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
  'race_rl_$$@test.local', '', now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO member (id, nickname, kyc_status) VALUES ('${MEMBER_ID}', '레이스테스트', 'NONE')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO goal (member_id, slug, title, due_date, status, deleted_at) VALUES
  ('${MEMBER_ID}', '${CUSTOMER_GOAL_SLUG}', 'customer rl race', now()::date + 30, 'ACTIVE', NULL),
  ('${MEMBER_ID}', '${GOAL_GOAL_SLUG}', 'goal rl race', now()::date + 30, 'ACTIVE', NULL);
SQL

CUSTOMER_GOAL_ID=$($PSQL -c "SELECT id FROM goal WHERE slug = '${CUSTOMER_GOAL_SLUG}'")
GOAL_GOAL_ID=$($PSQL -c "SELECT id FROM goal WHERE slug = '${GOAL_GOAL_SLUG}'")
echo "customer-race goal_id=${CUSTOMER_GOAL_ID}  goal-race goal_id=${GOAL_GOAL_ID}"

echo "=== 2. customer_key 기준 rate-limit 레이스: 동일 customer_key로 ${CUSTOMER_ATTEMPTS}개 동시 발사(상한 ${CUSTOMER_LIMIT}) ==="
for i in $(seq 1 "$CUSTOMER_ATTEMPTS"); do
  (
    # sleep 배리어: 모든 백그라운드 세션이 연결을 마칠 시간을 준 뒤 거의 동시에
    # 실제 RPC를 쏜다 — 순수 순차 실행이 아니라 진짜 겹치는 호출을 만들기 위함.
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A <<SQL > "${WORKDIR}/cust_${i}.out" 2> "${WORKDIR}/cust_${i}.err"
SELECT pg_sleep(0.3);
SELECT * FROM create_cheer_order(
  ${CUSTOMER_GOAL_ID}, '${CUSTOMER_ORDER_PREFIX}-${i}', 3000, 3000, '', true, '',
  'race_customer_shared_$$', NULL
);
SQL
    echo $? > "${WORKDIR}/cust_${i}.exit"
  ) &
done
wait

echo "=== 3. goal 기준 rate-limit 레이스: 동일 goal + 서로 다른 customer_key로 ${GOAL_ATTEMPTS}개 동시 발사(상한 ${GOAL_LIMIT}) ==="
for i in $(seq 1 "$GOAL_ATTEMPTS"); do
  (
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A <<SQL > "${WORKDIR}/goal_${i}.out" 2> "${WORKDIR}/goal_${i}.err"
SELECT pg_sleep(0.3);
SELECT * FROM create_cheer_order(
  ${GOAL_GOAL_ID}, '${GOAL_ORDER_PREFIX}-${i}', 1000, 1000, '', true, '',
  'race_goal_customer_${i}_$$', NULL
);
SQL
    echo $? > "${WORKDIR}/goal_${i}.exit"
  ) &
done
wait

echo "=== 4. 결과 검증 ==="

CUSTOMER_READY_COUNT=$($PSQL -c "SELECT count(*) FROM payment WHERE order_id LIKE '${CUSTOMER_ORDER_PREFIX}-%' AND status = 'READY'")
CUSTOMER_TOTAL_COUNT=$($PSQL -c "SELECT count(*) FROM payment WHERE order_id LIKE '${CUSTOMER_ORDER_PREFIX}-%'")
CUSTOMER_RATE_LIMITED=$(grep -l 'rate_limited' "${WORKDIR}"/cust_*.err 2>/dev/null | wc -l | tr -d ' ')

echo "customer-key race: 생성된 payment 행 = ${CUSTOMER_TOTAL_COUNT} (READY=${CUSTOMER_READY_COUNT}), rate_limited 거부 = ${CUSTOMER_RATE_LIMITED}"

if [ "$CUSTOMER_READY_COUNT" -ne "$CUSTOMER_LIMIT" ]; then
  echo "FAIL: customer_key rate-limit race — READY payment 행 수(${CUSTOMER_READY_COUNT})가 상한(${CUSTOMER_LIMIT})과 다름 (동시성 레이스로 상한이 뚫렸거나 과도하게 막힘)"
  FAIL=1
else
  echo "PASS: customer_key rate-limit race — READY payment 행이 정확히 상한(${CUSTOMER_LIMIT})만큼만 생성됨"
fi

EXPECTED_CUSTOMER_REJECTED=$((CUSTOMER_ATTEMPTS - CUSTOMER_LIMIT))
if [ "$CUSTOMER_RATE_LIMITED" -ne "$EXPECTED_CUSTOMER_REJECTED" ]; then
  echo "FAIL: customer_key rate-limit race — rate_limited 거부 수(${CUSTOMER_RATE_LIMITED})가 기대치(${EXPECTED_CUSTOMER_REJECTED})와 다름"
  FAIL=1
else
  echo "PASS: customer_key rate-limit race — 나머지 ${EXPECTED_CUSTOMER_REJECTED}건 모두 rate_limited로 안전하게 거부됨"
fi

GOAL_READY_COUNT=$($PSQL -c "SELECT count(*) FROM payment p JOIN cheer c ON c.payment_id = p.id WHERE p.order_id LIKE '${GOAL_ORDER_PREFIX}-%' AND p.status = 'READY' AND c.goal_id = ${GOAL_GOAL_ID}")
GOAL_TOTAL_COUNT=$($PSQL -c "SELECT count(*) FROM payment WHERE order_id LIKE '${GOAL_ORDER_PREFIX}-%'")
GOAL_RATE_LIMITED=$(grep -l 'rate_limited' "${WORKDIR}"/goal_*.err 2>/dev/null | wc -l | tr -d ' ')

echo "goal race: 생성된 payment 행 = ${GOAL_TOTAL_COUNT} (goal 기준 READY=${GOAL_READY_COUNT}), rate_limited 거부 = ${GOAL_RATE_LIMITED}"

if [ "$GOAL_READY_COUNT" -ne "$GOAL_LIMIT" ]; then
  echo "FAIL: goal rate-limit race — 이 goal의 READY payment 행 수(${GOAL_READY_COUNT})가 상한(${GOAL_LIMIT})과 다름 (customer_key를 다 다르게 써도 goal 상한이 뚫렸거나 과도하게 막힘)"
  FAIL=1
else
  echo "PASS: goal rate-limit race — customer_key를 전부 다르게 써도 goal 상한(${GOAL_LIMIT})만큼만 생성됨"
fi

EXPECTED_GOAL_REJECTED=$((GOAL_ATTEMPTS - GOAL_LIMIT))
if [ "$GOAL_RATE_LIMITED" -ne "$EXPECTED_GOAL_REJECTED" ]; then
  echo "FAIL: goal rate-limit race — rate_limited 거부 수(${GOAL_RATE_LIMITED})가 기대치(${EXPECTED_GOAL_REJECTED})와 다름"
  FAIL=1
else
  echo "PASS: goal rate-limit race — 나머지 ${EXPECTED_GOAL_REJECTED}건 모두 rate_limited로 안전하게 거부됨"
fi

echo "=== 결과 ==="
if [ "$FAIL" -eq 0 ]; then
  echo "ALL PASS — rate-limit 동시성 레이스 안전 확인"
  exit 0
else
  echo "FAIL — 위 로그 확인. 각 psql 호출 stderr는 ${WORKDIR}/*.err 에 있었음(cleanup 전 임시본)"
  exit 1
fi
