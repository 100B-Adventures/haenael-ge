#!/usr/bin/env bash
# cashout_double_paid_race.sh — 같은 REQUESTED 환전의 병렬 PAID 전이 실측
set -uo pipefail

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
MEMBER_ID="ca5c0000-0000-0000-0000-000000000001"
ADMIN_ID="ca5c0000-0000-0000-0000-000000000002"
REQUEST_KEY="cashout-race-$$"
ACCOUNT_KEY_VERSION="1"
ACCOUNT_KEY="kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk"
ACCOUNT_FINGERPRINT_KEY="ffffffffffffffffffffffffffffffffffffffff"
WORKDIR="$(mktemp -d)"
FAIL=0

cleanup() {
  psql "$DB_URL" -v ON_ERROR_STOP=0 -q <<SQL
DELETE FROM public.clover_ledger WHERE member_id = '${MEMBER_ID}';
DELETE FROM public.cashout_account_access_log WHERE actor_id = '${ADMIN_ID}';
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
  '${REQUEST_KEY}', '${ACCOUNT_KEY_VERSION}'::smallint,
  '${ACCOUNT_KEY}', '${ACCOUNT_FINGERPRINT_KEY}'
);
COMMIT;
RESET ROLE;
SQL

REQUEST_ID=$(psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A \
  -c "SELECT id FROM public.cashout_request WHERE request_key = '${REQUEST_KEY}'")

# 실제 운영과 동일하게 같은 관리자의 성공 계좌 열람을 먼저 남긴다.
psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL
SET ROLE service_role;
BEGIN;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT public.admin_reveal_cashout_account(
  ${REQUEST_ID}, '${ADMIN_ID}',
  jsonb_build_object('${ACCOUNT_KEY_VERSION}', '${ACCOUNT_KEY}')
);
COMMIT;
RESET ROLE;
SQL

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
# A안(FDD §10·§16-R1): SETTLED가 delta=-N이 되면서 이중 실행 = 이중 차감 위험이 신규
# 발생했다. 예전엔 SETTLED delta=0이라 잔액을 볼 이유가 없었지만 이제는 필수 단언이다.
# member는 EARN 30만 있었고(총량 30) 30클로버를 신청·지급했으므로 정확히 1회만 감소하면 0.
FINAL_BALANCE=$(psql "$DB_URL" -q -t -A \
  -c "SELECT COALESCE(clover_count, -999) FROM public.clover_balance WHERE member_id='${MEMBER_ID}'")

echo "parallel PAID results: success=${SUCCESS_COUNT}, blocked=${REJECT_COUNT}, paid_rows=${PAID_ROWS}, settled_rows=${SETTLED_ROWS}, final_balance=${FINAL_BALANCE}"

if [ "$SUCCESS_COUNT" -ne 1 ] || [ "$REJECT_COUNT" -ne 1 ] ||
   [ "$PAID_ROWS" -ne 1 ] || [ "$SETTLED_ROWS" -ne 1 ] ||
   [ "$FINAL_BALANCE" -ne 0 ]; then
  echo "FAIL — 병렬 지급완료가 정확히 1건으로 수렴하지 않거나 잔액이 이중 차감됨(기대 0, 실측 ${FINAL_BALANCE})"
  FAIL=1
else
  echo "ALL PASS — 병렬 지급완료 2건 중 1건만 성공, PAID/SETTLED 각 1건, 잔액 정확히 1회만 감소(30→0)"
fi

exit "$FAIL"
