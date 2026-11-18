import { createClient } from "npm:@supabase/supabase-js@2";
import { handleStoreRefundWebhook } from "../_shared/store-refund.ts";

const url = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : undefined;

if (import.meta.main) {
  Deno.serve((req) => handleStoreRefundWebhook(req, {
    supabase,
    secrets: {
      APPLE: Deno.env.get("APPLE_REFUND_WEBHOOK_SECRET"),
      GOOGLE_PLAY: Deno.env.get("GOOGLE_REFUND_WEBHOOK_SECRET"),
      GOOGLE_ALTERNATIVE: Deno.env.get("GOOGLE_ALTERNATIVE_REFUND_WEBHOOK_SECRET"),
      TOSS_IAP: Deno.env.get("TOSS_IAP_REFUND_WEBHOOK_SECRET"),
    },
  }));
}
