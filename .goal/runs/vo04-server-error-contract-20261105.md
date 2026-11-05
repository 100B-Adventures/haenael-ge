# VO04 server error contract verification

- Scope: `cheer-order`, `lead-capture`, and `toss-confirm` Edge Functions only.
- Result: every owned error response now returns only `{"error":{"code":"..."}}`; HTTP statuses, domain codes, and payment compensation writes are unchanged.
- Client check: `CheerPaymentButton.tsx` and `payment/success/page.tsx` now map `error.code` to local copy with an unknown-code fallback; no client renders a server message.
- Safety: tests use mocked Supabase/Toss fetches or pre-validation branches. No real payment, deployment, secret, or production action ran.

Commands and results:

```text
deno test --node-modules-dir=auto --allow-env --allow-net supabase/functions/cheer-order/index.test.ts
2 passed, 0 failed

deno test --node-modules-dir=auto --allow-env --allow-net supabase/functions/lead-capture/index.test.ts
2 passed, 0 failed

deno test --node-modules-dir=auto --allow-env --allow-net supabase/functions/toss-confirm/index.test.ts
3 passed, 0 failed

git diff --check -- <owned files>
passed
```

Client mappings added after the initial check: `cheer-order` maps `payments_disabled` and `invalid_amount` explicitly, with a generic fallback for all other codes. `toss-confirm` maps `payments_disabled`, `payment_not_found`, and `amount_mismatch`, with a generic fallback for all other codes. No client renders a server-provided message.
