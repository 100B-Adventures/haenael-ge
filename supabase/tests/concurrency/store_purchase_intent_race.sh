#!/usr/bin/env bash
# 동일 회원·request_key의 구매 intent 동시 재전송이 1행으로 수렴하고 모두 성공하는지 실측한다.
set -uo pipefail

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
SUPPORTER_ID="00000000-0000-0000-0000-000000000093"
OWNER_ID="00000000-0000-0000-0000-000000000094"
GOAL_SLUG="store-intent-race-$$"
REQUEST_KEY="store-intent-race-$$-key"
ATTEMPTS=10
RUN_DIR="$(mktemp -d)"
FAIL=0

cleanup() {
  psql "$DB_URL" -v ON_ERROR_STOP=0 -q <<SQL
DELETE FROM public.store_purchase_intent WHERE supporter_member_id='${SUPPORTER_ID}' AND request_key='${REQUEST_KEY}';
DELETE FROM public.social_cheer_member_attribution
WHERE cheer_id IN (SELECT id FROM public.cheer WHERE goal_id IN (SELECT id FROM public.goal WHERE slug='${GOAL_SLUG}'));
DELETE FROM public.cheer WHERE goal_id IN (SELECT id FROM public.goal WHERE slug='${GOAL_SLUG}');
DELETE FROM public.goal WHERE slug='${GOAL_SLUG}';
DELETE FROM public.member WHERE id IN ('${SUPPORTER_ID}','${OWNER_ID}');
DELETE FROM auth.users WHERE id IN ('${SUPPORTER_ID}','${OWNER_ID}');
SQL
  find "$RUN_DIR" -type f -delete
  rmdir "$RUN_DIR"
}
trap cleanup EXIT

psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL
INSERT INTO auth.users(id,email) VALUES
  ('${SUPPORTER_ID}','store-intent-supporter-$$@example.test'),
  ('${OWNER_ID}','store-intent-owner-$$@example.test');
INSERT INTO public.member(id,nickname) VALUES
  ('${SUPPORTER_ID}','intent 경합 응원자'),
  ('${OWNER_ID}','intent 경합 수취인');
INSERT INTO public.goal(member_id,slug,title,due_date)
VALUES ('${OWNER_ID}','${GOAL_SLUG}','intent 경합 시험',current_date+30);
UPDATE public.app_channel_release_gate SET sandbox_enabled=true WHERE channel='APPLE';
SQL

GOAL_ID="$(psql "$DB_URL" -q -t -A -c "SELECT id FROM public.goal WHERE slug='${GOAL_SLUG}'")"

for attempt in $(seq 1 "$ATTEMPTS"); do
  (
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A >"${RUN_DIR}/${attempt}.out" 2>"${RUN_DIR}/${attempt}.err" <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claim.sub','${SUPPORTER_ID}',true);
SELECT pg_sleep(0.3);
SELECT is_replay FROM public.create_store_purchase_intent(
  ${GOAL_ID},'APPLE','haenael.cheer.clover.3',3,'${REQUEST_KEY}'
);
COMMIT;
SQL
    echo "$?" >"${RUN_DIR}/${attempt}.exit"
  ) &
done
wait

for attempt in $(seq 1 "$ATTEMPTS"); do
  if [ "$(sed -n '1p' "${RUN_DIR}/${attempt}.exit")" -ne 0 ]; then
    FAIL=1
    sed -n '1,8p' "${RUN_DIR}/${attempt}.err"
  fi
done

ROW_COUNT="$(psql "$DB_URL" -q -t -A -c "SELECT count(*) FROM public.store_purchase_intent WHERE supporter_member_id='${SUPPORTER_ID}' AND request_key='${REQUEST_KEY}'")"
if [ "$ROW_COUNT" -ne 1 ]; then
  echo "FAIL: intent row count=${ROW_COUNT}, expected=1"
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  echo "FAIL: TC-APP-01-4 동일 request_key 동시 intent 재전송 중 실패가 발생했다"
  exit 1
fi

echo "PASS: TC-APP-01-4 ${ATTEMPTS}개 동시 intent 요청이 오류 없이 1행으로 수렴했다"
