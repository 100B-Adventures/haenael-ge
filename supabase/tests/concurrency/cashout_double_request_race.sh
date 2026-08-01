#!/usr/bin/env bash
# T15 — 같은 회원의 병렬 환전 신청 2건은 정확히 1건만 성공해야 한다.
set -uo pipefail

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
MEMBER_ID="ca5d0000-0000-0000-0000-000000000001"
KEY_A="cashout-race-a-$$"
KEY_B="cashout-race-b-$$"
TASK_TMP_DIR="$(mktemp -d)"
FAIL=0

cleanup() {
  psql "$DB_URL" -v ON_ERROR_STOP=0 -q <<SQL
DELETE FROM public.clover_ledger WHERE member_id = '${MEMBER_ID}';
DELETE FROM public.cashout_request WHERE member_id = '${MEMBER_ID}';
DELETE FROM public.member WHERE id = '${MEMBER_ID}';
DELETE FROM auth.users WHERE id = '${MEMBER_ID}';
SQL
  rm -rf "$TASK_TMP_DIR"
}
trap cleanup EXIT

psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
) VALUES (
  '${MEMBER_ID}', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'cashout-request-race-$$@test.local', '',
  now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
);
INSERT INTO public.member(id, nickname, kyc_status)
VALUES ('${MEMBER_ID}', '환전신청레이스', 'NONE');
INSERT INTO public.clover_ledger(
  member_id, entry_type, clover_delta, ref_type, ref_id, balance_after
) VALUES ('${MEMBER_ID}', 'EARN', 60, 'test', 1, 60);
SQL

for suffix in A B; do
  if [ "$suffix" = "A" ]; then REQUEST_KEY="$KEY_A"; else REQUEST_KEY="$KEY_B"; fi
  (
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A <<SQL \
      > "$TASK_TMP_DIR/request_${suffix}.out" 2> "$TASK_TMP_DIR/request_${suffix}.err"
SET ROLE service_role;
SELECT * FROM public.create_cashout_request(
  '${MEMBER_ID}', 30, 'KB', repeat('1', 12), '환전신청레이스',
  '${REQUEST_KEY}', repeat('k', 40)
);
RESET ROLE;
SQL
    echo $? > "$TASK_TMP_DIR/request_${suffix}.exit"
  ) &
done
wait

SUCCESS_COUNT=$(grep -l '|REQUESTED|' "$TASK_TMP_DIR"/request_*.out 2>/dev/null | wc -l | tr -d ' ')
BLOCKED_COUNT=$(grep -l 'cashout_already_requested' "$TASK_TMP_DIR"/request_*.err 2>/dev/null | wc -l | tr -d ' ')
REQUEST_ROWS=$(psql "$DB_URL" -q -t -A -c "SELECT count(*) FROM public.cashout_request WHERE member_id='${MEMBER_ID}'")
HOLD_ROWS=$(psql "$DB_URL" -q -t -A -c "SELECT count(*) FROM public.clover_ledger WHERE member_id='${MEMBER_ID}' AND entry_type='CASHOUT_HOLD'")
BALANCE=$(psql "$DB_URL" -q -t -A -c "SELECT clover_count FROM public.clover_balance WHERE member_id='${MEMBER_ID}'")

echo "T15 results: success=${SUCCESS_COUNT}, blocked=${BLOCKED_COUNT}, requests=${REQUEST_ROWS}, holds=${HOLD_ROWS}, balance=${BALANCE}"

if [ "$SUCCESS_COUNT" -ne 1 ] || [ "$BLOCKED_COUNT" -ne 1 ] ||
   [ "$REQUEST_ROWS" -ne 1 ] || [ "$HOLD_ROWS" -ne 1 ] || [ "$BALANCE" -lt 0 ]; then
  echo "FAIL — T15 병렬 신청이 1건으로 수렴하지 않음"
  FAIL=1
else
  echo "ALL PASS — T15 병렬 신청 2건 중 1건만 성공, 잔액 음수 없음"
fi

exit "$FAIL"
