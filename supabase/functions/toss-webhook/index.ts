// toss-webhook/index.ts — Deno.serve 얇은 래퍼.
// 순수 로직은 ../_shared/toss-webhook-handler.ts(handleTossWebhook)로 이동했다
// (Deno 런타임 없이 vitest에서 요청 단위 회귀테스트를 돌리기 위함, Codex P2 대응).
// 이 파일의 책임은 env 읽기 + 실 client(supabase/toss/slack) 준비 + 핸들러 호출뿐이다.

import { createClient } from "npm:@supabase/supabase-js@2";
import { TossClient } from "../_shared/toss.ts";
import { sendSlackAlert } from "../_shared/slack.ts";
import { firePay } from "../_shared/ops-event.ts";
import { handleTossWebhook } from "../_shared/toss-webhook-handler.ts";

Deno.serve(async (req) => {
  const expectedToken = Deno.env.get("TOSS_WEBHOOK_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const tossSecret = Deno.env.get("TOSS_SECRET_KEY");

  const supabase = supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    : undefined;
  const toss = tossSecret ? new TossClient(tossSecret) : undefined;

  return handleTossWebhook(req, {
    expectedToken,
    requireMerchantId: true,
    requireTransmissionId: true,
    supabase,
    toss,
    sendSlackAlert,
    reportPaid: firePay,
  });
});
