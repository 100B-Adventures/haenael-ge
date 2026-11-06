#!/usr/bin/env bash
# 결제 전환 claim의 행 잠금 경합 검증. 10개 동시 요청이 true 1건·false 9건으로 수렴해야 한다.
set -uo pipefail

DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
ORDER_ID="payment-conversion-race-$$"
PAYMENT_KEY="payment_key_conversion_race_$$"
RACE_DIR="$(mktemp -d)"
ATTEMPTS=10

cleanup() {
  psql "$DB_URL" -v ON_ERROR_STOP=0 -q \
    -c "DELETE FROM public.payment WHERE order_id = '${ORDER_ID}'" >/dev/null
  rm -rf "$RACE_DIR"
}
trap cleanup EXIT

psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<SQL
INSERT INTO public.payment(
  order_id, payment_key, amount_krw, status, pg_customer_key, raw_response
) VALUES (
  '${ORDER_ID}', '${PAYMENT_KEY}', 3000, 'DONE',
  'customer-conversion-race-$$', '{"source":"toss-webhook","status":"DONE"}'::jsonb
);
SQL

for attempt in $(seq 1 "$ATTEMPTS"); do
  (
    psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A \
      -c "SELECT public.claim_payment_conversion('${ORDER_ID}', '${PAYMENT_KEY}')" \
      >"$RACE_DIR/$attempt.out" 2>"$RACE_DIR/$attempt.err"
    printf '%s\n' "$?" >"$RACE_DIR/$attempt.exit"
  ) &
done
wait

true_count=0
false_count=0
error_count=0
for attempt in $(seq 1 "$ATTEMPTS"); do
  if [ "$(cat "$RACE_DIR/$attempt.exit")" -ne 0 ]; then
    error_count=$((error_count + 1))
    continue
  fi
  result="$(tr -d '[:space:]' <"$RACE_DIR/$attempt.out")"
  if [ "$result" = "t" ]; then
    true_count=$((true_count + 1))
  elif [ "$result" = "f" ]; then
    false_count=$((false_count + 1))
  else
    error_count=$((error_count + 1))
  fi
done

printf 'PAYMENT_CONVERSION_CLAIM_RACE attempts=%s true=%s false=%s errors=%s\n' \
  "$ATTEMPTS" "$true_count" "$false_count" "$error_count"

if [ "$true_count" -ne 1 ] || [ "$false_count" -ne 9 ] || [ "$error_count" -ne 0 ]; then
  exit 1
fi
