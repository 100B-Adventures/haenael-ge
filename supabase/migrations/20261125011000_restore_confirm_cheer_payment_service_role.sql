-- confirm_cheer_payment was replaced after its original privilege grant.
-- Reassert the production contract: only the Toss confirmation Edge Function's
-- service role may execute the payment finalization transaction.

BEGIN;

REVOKE ALL ON FUNCTION public.confirm_cheer_payment(
  text, text, integer, text, timestamptz, text, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_cheer_payment(
  text, text, integer, text, timestamptz, text, jsonb
) TO service_role;

COMMIT;
