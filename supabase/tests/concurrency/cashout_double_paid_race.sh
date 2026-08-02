#!/usr/bin/env bash
# cashout_double_paid_race.sh — 같은 REQUESTED 환전의 병렬 PAID 전이 실측
set -uo pipefail

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
MEMBER_ID="ca5c0000-0000-0000-0000-000000000001"
ADMIN_ID="ca5c0000-0000-0000-0000-000000000002"
REQUEST_KEY="cashout-race-$$"
WORKDIR="$(mktemp -d)"
FAIL=0

cleanup() {
  psql "$DB_URL" -v ON_ERROR_STOP=0 -q <<SQL
DELETE FROM public.clover_ledger WHERE member_id = '${MEMBER_ID}';
DELETE FROM public.cashout_request WHERE member_id = '${MEMBER_ID}';
DELETE FROM public.admin_member WHERE member_id = '${ADMIN_ID}';
DELETE FROM public.member WHERE id IN ('${MEMBER_ID}', '${ADMIN_ID}');
DELETE FROM auth.users WHERE id IN ('${MEMBER_ID}', '${ADMIN_ID}');
SQL
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, is_anonymous
) VALUES
  ('${MEMBER_ID}', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'cashout-race-member-$$@test.local', '',
   now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false),
  ('${ADMIN_ID}', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'cashout-race-admin-$$@test.local', '',
   now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false);

INSERT INTO public.member(id, nickname, kyc_status) VALUES
  ('${MEMBER_ID}', '환전레이스', 'NONE'),
  ('${ADMIN_ID}', '환전관리자레이스', 'NONE');
INSERT INTO public.admin_member(member_id) VALUES ('${ADMIN_ID}');
INSERT INTO public.clover_ledger(
  member_id, entry_type, clover_delta, ref_type, ref_id, balance_after
) VALUES ('${MEMBER_ID}', 'EARN', 30, 'test', 1, 30);

SET ROLE service_role;
BEGIN;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  true
);
SELECT * FROM public.create_cashout_request(
  '${MEMBER_ID}', 30, 'KB', repeat('1', 12), '환전레이스',
  '${REQUEST_KEY}', repeat('k', 40)
);
COMMIT;
RESET ROLE;
SQL

REQUEST_ID=$(psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A \
  -c "SELECT id FROM public.cashout_request WHERE request_key = '${REQUEST_KEY}'")

for i in 1 2; do
  (
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A <<SQL \
      > "${WORKDIR}/paid_${i}.out" 2> "${WORKDIR}/paid_${i}.err"
SELECT pg_sleep(0.3);
SET ROLE authenticated;
BEGIN;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"${ADMIN_ID}"}',
  true
);
SELECT * FROM public.admin_mark_cashout_paid(
  ${REQUEST_ID}, '병렬 송금 완료 ${i}'
);
COMMIT;
RESET ROLE;
SQL
    echo $? > "${WORKDIR}/paid_${i}.exit"
  ) &
done
wait

SUCCESS_COUNT=$(grep -l "|PAID|" "${WORKDIR}"/paid_*.out 2>/dev/null | wc -l | tr -d ' ')
REJECT_COUNT=$(grep -El "cashout_already_paid|invalid_cashout_status" \
  "${WORKDIR}"/paid_*.err 2>/dev/null | wc -l | tr -d ' ')
PAID_ROWS=$(psql "$DB_URL" -q -t -A \
  -c "SELECT count(*) FROM public.cashout_request WHERE id=${REQUEST_ID} AND status='PAID'")
SETTLED_ROWS=$(psql "$DB_URL" -q -t -A \
  -c "SELECT count(*) FROM public.clover_ledger WHERE entry_type='CASHOUT_SETTLED' AND ref_type='cashout_request' AND ref_id=${REQUEST_ID}")

echo "parallel PAID results: success=${SUCCESS_COUNT}, blocked=${REJECT_COUNT}, paid_rows=${PAID_ROWS}, settled_rows=${SETTLED_ROWS}"

if [ "$SUCCESS_COUNT" -ne 1 ] || [ "$REJECT_COUNT" -ne 1 ] ||
   [ "$PAID_ROWS" -ne 1 ] || [ "$SETTLED_ROWS" -ne 1 ]; then
  echo "FAIL — 병렬 지급완료가 정확히 1건으로 수렴하지 않음"
  FAIL=1
else
  echo "ALL PASS — 병렬 지급완료 2건 중 1건만 성공, PAID/SETTLED 각 1건"
fi

exit "$FAIL"
