#!/usr/bin/env bash
# D-024 concurrency: confirmation and attribution may commit in either order.
# Two real database sessions overlap each ordering. The cheer row lock in the
# projector must make both executions converge to one ACTIVE canonical pair.
set -uo pipefail

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
OWNER_ID="58000000-0000-0000-0000-000000000001"
SUPPORTER_A_ID="58000000-0000-0000-0000-000000000002"
SUPPORTER_B_ID="58000000-0000-0000-0000-000000000003"
RUN_KEY="$$"
TASK_TMP_DIR="$(mktemp -d)"
FAIL=0

cleanup() {
  psql "$DB_URL" -v ON_ERROR_STOP=0 -q <<SQL
DELETE FROM public.friend_connection
WHERE member_low_id IN ('${OWNER_ID}', '${SUPPORTER_A_ID}', '${SUPPORTER_B_ID}')
   OR member_high_id IN ('${OWNER_ID}', '${SUPPORTER_A_ID}', '${SUPPORTER_B_ID}');
DELETE FROM public.cheer
WHERE display_name IN ('race-attr-first-${RUN_KEY}', 'race-status-first-${RUN_KEY}');
DELETE FROM public.payment
WHERE order_id IN ('race-attr-first-${RUN_KEY}', 'race-status-first-${RUN_KEY}');
DELETE FROM public.goal
WHERE slug IN ('race-attr-first-${RUN_KEY}', 'race-status-first-${RUN_KEY}');
DELETE FROM public.member
WHERE id IN ('${OWNER_ID}', '${SUPPORTER_A_ID}', '${SUPPORTER_B_ID}');
DELETE FROM auth.users
WHERE id IN ('${OWNER_ID}', '${SUPPORTER_A_ID}', '${SUPPORTER_B_ID}');
SQL
  rm -rf "$TASK_TMP_DIR"
}
trap cleanup EXIT

psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL
INSERT INTO auth.users(
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
) VALUES
  ('${OWNER_ID}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'race-owner-${RUN_KEY}@test.local', '', now(), now(), '', '', '', '{}', '{}', false, false),
  ('${SUPPORTER_A_ID}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'race-a-${RUN_KEY}@test.local', '', now(), now(), '', '', '', '{}', '{}', false, false),
  ('${SUPPORTER_B_ID}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'race-b-${RUN_KEY}@test.local', '', now(), now(), '', '', '', '{}', '{}', false, false);
INSERT INTO public.member(id, nickname) VALUES
  ('${OWNER_ID}', 'RaceOwner'),
  ('${SUPPORTER_A_ID}', 'RaceA'),
  ('${SUPPORTER_B_ID}', 'RaceB');
INSERT INTO public.goal(member_id, slug, title, due_date, status, visibility) VALUES
  ('${OWNER_ID}', 'race-attr-first-${RUN_KEY}', 'attribution first', '2030-12-31', 'ACTIVE', 'PUBLIC'),
  ('${OWNER_ID}', 'race-status-first-${RUN_KEY}', 'status first', '2030-12-31', 'ACTIVE', 'PUBLIC');
INSERT INTO public.payment(order_id, amount_krw, status, pg_customer_key) VALUES
  ('race-attr-first-${RUN_KEY}', 1000, 'READY', 'FRIENDSHIP-RACE'),
  ('race-status-first-${RUN_KEY}', 1000, 'READY', 'FRIENDSHIP-RACE');
INSERT INTO public.cheer(goal_id, payment_id, display_name, is_anonymous, message, clover_amount, status)
SELECT goal.id, payment.id, payment.order_id, false, '함께', 1, 'PENDING'
FROM public.goal AS goal
JOIN public.payment AS payment ON payment.order_id = goal.slug
WHERE goal.slug IN ('race-attr-first-${RUN_KEY}', 'race-status-first-${RUN_KEY}');
SQL

CHEER_A_ID="$(psql "$DB_URL" -q -t -A -c "SELECT id FROM public.cheer WHERE display_name='race-attr-first-${RUN_KEY}'")"
CHEER_B_ID="$(psql "$DB_URL" -q -t -A -c "SELECT id FROM public.cheer WHERE display_name='race-status-first-${RUN_KEY}'")"

# Scenario A: attribution transaction owns the cheer lock before confirmation.
(
  timeout 15 psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL > "$TASK_TMP_DIR/attr_a.out" 2> "$TASK_TMP_DIR/attr_a.err"
BEGIN;
SET LOCAL statement_timeout = '10s';
INSERT INTO public.social_cheer_member_attribution(cheer_id, supporter_member_id)
VALUES (${CHEER_A_ID}, '${SUPPORTER_A_ID}');
SELECT pg_sleep(0.8);
COMMIT;
SQL
  echo $? > "$TASK_TMP_DIR/attr_a.exit"
) &
(
  timeout 15 psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL > "$TASK_TMP_DIR/status_a.out" 2> "$TASK_TMP_DIR/status_a.err"
BEGIN;
SET LOCAL statement_timeout = '10s';
SELECT pg_sleep(0.2);
UPDATE public.cheer SET status='CONFIRMED' WHERE id=${CHEER_A_ID};
COMMIT;
SQL
  echo $? > "$TASK_TMP_DIR/status_a.exit"
) &
wait

# Scenario B: confirmation transaction owns the cheer lock before attribution.
(
  timeout 15 psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL > "$TASK_TMP_DIR/status_b.out" 2> "$TASK_TMP_DIR/status_b.err"
BEGIN;
SET LOCAL statement_timeout = '10s';
UPDATE public.cheer SET status='CONFIRMED' WHERE id=${CHEER_B_ID};
SELECT pg_sleep(0.8);
COMMIT;
SQL
  echo $? > "$TASK_TMP_DIR/status_b.exit"
) &
(
  timeout 15 psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL > "$TASK_TMP_DIR/attr_b.out" 2> "$TASK_TMP_DIR/attr_b.err"
BEGIN;
SET LOCAL statement_timeout = '10s';
SELECT pg_sleep(0.2);
INSERT INTO public.social_cheer_member_attribution(cheer_id, supporter_member_id)
VALUES (${CHEER_B_ID}, '${SUPPORTER_B_ID}');
COMMIT;
SQL
  echo $? > "$TASK_TMP_DIR/attr_b.exit"
) &
wait

for exit_file in "$TASK_TMP_DIR"/*.exit; do
  if [ "$(cat "$exit_file")" -ne 0 ]; then
    echo "FAIL: $(basename "$exit_file") nonzero"
    FAIL=1
  fi
done

PAIR_A_COUNT="$(psql "$DB_URL" -q -t -A -c "SELECT count(*) FROM public.friend_connection WHERE member_low_id='${OWNER_ID}' AND member_high_id='${SUPPORTER_A_ID}' AND status='ACTIVE'")"
PAIR_B_COUNT="$(psql "$DB_URL" -q -t -A -c "SELECT count(*) FROM public.friend_connection WHERE member_low_id='${OWNER_ID}' AND member_high_id='${SUPPORTER_B_ID}' AND status='ACTIVE'")"

if [ "$PAIR_A_COUNT" -ne 1 ] || [ "$PAIR_B_COUNT" -ne 1 ]; then
  echo "FAIL: concurrent projection attr-first=${PAIR_A_COUNT} status-first=${PAIR_B_COUNT}"
  FAIL=1
else
  echo "PASS: both concurrent event orderings converged to one ACTIVE pair"
fi

exit "$FAIL"
