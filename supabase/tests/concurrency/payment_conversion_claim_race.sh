#!/usr/bin/env bash
# 결제 전환 lease 경합 검증. 각 경합에서 pending lease는 1건만 발급되고 sent 뒤에는 0건이어야 한다.
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

run_race() {
  local round="$1"
  rm -f "$RACE_DIR"/*.out "$RACE_DIR"/*.err "$RACE_DIR"/*.exit
  for attempt in $(seq 1 "$ATTEMPTS"); do
    (
      psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A \
        -c "SELECT eligible FROM public.lease_payment_conversion('${ORDER_ID}', '${PAYMENT_KEY}', 300)" \
        >"$RACE_DIR/$attempt.out" 2>"$RACE_DIR/$attempt.err"
      printf '%s\n' "$?" >"$RACE_DIR/$attempt.exit"
    ) &
  done
  wait

  local true_count=0 false_count=0 error_count=0 result
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
  printf 'PAYMENT_CONVERSION_LEASE_RACE round=%s attempts=%s true=%s false=%s errors=%s\n' \
    "$round" "$ATTEMPTS" "$true_count" "$false_count" "$error_count"
  [ "$true_count" -eq 1 ] && [ "$false_count" -eq 9 ] && [ "$error_count" -eq 0 ]
}

run_race first
FIRST_EVENT_ID="$(psql "$DB_URL" -q -t -A -c \
  "SELECT raw_response #>> '{browserConversionDelivery,eventId}' FROM public.payment WHERE order_id='${ORDER_ID}'")"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -c \
  "UPDATE public.payment SET raw_response=jsonb_set(raw_response,'{browserConversionDelivery,leaseExpiresAt}',to_jsonb((clock_timestamp()-interval '1 second')::text)) WHERE order_id='${ORDER_ID}'"
run_race retry

read -r LEASE_TOKEN EVENT_ID < <(psql "$DB_URL" -q -t -A -F ' ' -c \
  "SELECT raw_response #>> '{browserConversionDelivery,leaseToken}', raw_response #>> '{browserConversionDelivery,eventId}' FROM public.payment WHERE order_id='${ORDER_ID}'")
[ "$FIRST_EVENT_ID" = "$EVENT_ID" ]
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A -c \
  "SELECT public.ack_payment_conversion('${ORDER_ID}','${PAYMENT_KEY}','${LEASE_TOKEN}','${EVENT_ID}')" \
  | grep -qx 't'

FINAL_ELIGIBLE="$(psql "$DB_URL" -v ON_ERROR_STOP=1 -q -t -A -c \
  "SELECT eligible FROM public.lease_payment_conversion('${ORDER_ID}','${PAYMENT_KEY}',300)")"
printf 'PAYMENT_CONVERSION_SENT_REPLAY eligible=%s event_id_stable=true\n' "$FINAL_ELIGIBLE"
[ "$FINAL_ELIGIBLE" = "f" ]
