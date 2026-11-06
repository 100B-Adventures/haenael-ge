#!/usr/bin/env bash
# 경합 assertion이 실제로 nonzero를 반환하는지 검증하는 의도적 실패 fixture.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE_LOG="$(mktemp)"

cleanup() {
  rm -f "$FIXTURE_LOG"
}
trap cleanup EXIT

fixture_rc=0
if PAYMENT_CONVERSION_EXPECT_TRUE_COUNT=2 \
    bash "$SCRIPT_DIR/payment_conversion_claim_race.sh" >"$FIXTURE_LOG" 2>&1; then
  fixture_rc=0
else
  fixture_rc=$?
fi

if [ "$fixture_rc" -eq 0 ]; then
  printf 'PAYMENT_CONVERSION_FAILURE_FIXTURE_FAILED expected_nonzero actual=0\n' >&2
  exit 1
fi
if ! grep -q 'PAYMENT_CONVERSION_ASSERTION_FAILED' "$FIXTURE_LOG"; then
  printf 'PAYMENT_CONVERSION_FAILURE_FIXTURE_FAILED missing_assertion_marker rc=%s\n' \
    "$fixture_rc" >&2
  exit 1
fi

printf 'PAYMENT_CONVERSION_FAILURE_FIXTURE_PASS expected_nonzero actual=%s\n' "$fixture_rc"
