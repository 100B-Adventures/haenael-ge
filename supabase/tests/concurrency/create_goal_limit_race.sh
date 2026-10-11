#!/usr/bin/env bash
# 동시 목표 생성 2건이 상한(3)을 넘기지 않는지 검증한다.
# 사전 상태: 이미 진행 중 목표 2개(상한 -1). 동시에 2건을 더 넣으면
# advisory lock으로 직렬화되어 정확히 1건만 성공하고 1건은 goal_limit_reached여야 한다.
set -uo pipefail

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
MEMBER_ID="c6a90000-0000-0000-0000-000000000001"
TASK_TMP_DIR="$(mktemp -d)"
FAIL=0

cleanup() {
  psql "$DB_URL" -v ON_ERROR_STOP=0 -q <<SQL
-- goal 생성 시 웰컴 클로버 트리거가 cheer 행을 함께 만들므로 goal보다 먼저 지운다.
DELETE FROM public.cheer WHERE goal_id IN (SELECT id FROM public.goal WHERE member_id = '${MEMBER_ID}');
DELETE FROM public.goal WHERE member_id = '${MEMBER_ID}';
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
  'authenticated', 'authenticated', 'goal-limit-race-$$@test.local', '',
  now(), now(), '', '', '', '{}'::jsonb, '{}'::jsonb, false, false
);
INSERT INTO public.member(id, nickname, kyc_status)
VALUES ('${MEMBER_ID}', '레이스회원', 'NONE');
SQL

# 사전 진행 중 목표 2개 (상한 3의 -1). owner 권한으로 직접 삽입해 create_goal 경로와 분리한다.
psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL
INSERT INTO public.goal (member_id, title, due_date)
VALUES
  ('${MEMBER_ID}', '사전목표1 해낼게', DATE '2030-01-01'),
  ('${MEMBER_ID}', '사전목표2 해낼게', DATE '2030-01-01');
SQL

for suffix in A B; do
  if [ "$suffix" = "A" ]; then DUE_DAY="01"; else DUE_DAY="02"; fi
  (
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A <<SQL \
      > "$TASK_TMP_DIR/create_${suffix}.out" 2> "$TASK_TMP_DIR/create_${suffix}.err"
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"${MEMBER_ID}","iss":"supabase-demo"}',
  true
);
SELECT * FROM public.create_goal('레이스목표${suffix}', '', DATE '2030-06-${DUE_DAY}');
COMMIT;
SQL
    echo $? > "$TASK_TMP_DIR/create_${suffix}.exit"
  ) &
done
wait

SUCCESS_COUNT=0
for f in "$TASK_TMP_DIR"/create_*.exit; do
  [ "$(cat "$f")" = "0" ] && SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
done
BLOCKED_COUNT=$(grep -l 'goal_limit_reached' "$TASK_TMP_DIR"/create_*.err 2>/dev/null | wc -l | tr -d ' ')
TOTAL_ROWS=$(psql "$DB_URL" -q -t -A -c "SELECT count(*) FROM public.goal WHERE member_id='${MEMBER_ID}'")

echo "create_goal_limit_race results: success=${SUCCESS_COUNT}, blocked=${BLOCKED_COUNT}, total_rows=${TOTAL_ROWS}"

if [ "$BLOCKED_COUNT" -ne 1 ] || [ "$TOTAL_ROWS" -ne 3 ]; then
  echo "FAIL — 동시 생성 2건 중 정확히 1건만 거부되고 총 3개로 수렴해야 하는데 실측 total=${TOTAL_ROWS}, blocked=${BLOCKED_COUNT}"
  FAIL=1
else
  echo "ALL PASS — 동시 생성 레이스에서 상한 3개가 지켜짐(advisory lock 직렬화)"
fi

exit "$FAIL"
