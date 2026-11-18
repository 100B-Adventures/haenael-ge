import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { exchangeTossLogin, type TossReferrer } from "../_shared/toss-partner.ts";
import { withRegionHeader } from "../_shared/region.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withRegionHeader(new Headers({ "Content-Type": "application/json", ...CORS })),
  });
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function issueSession(
  admin: SupabaseClient,
  anon: SupabaseClient,
  email: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !link.properties.hashed_token) throw new Error("session_link_failed");
  const { data, error } = await anon.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "email",
  });
  if (error || !data.session) throw new Error("session_issue_failed");
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}

export async function handleAuthToss(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: { code: "method_not_allowed" } });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: { code: "invalid_json" } });
  }
  const code = body.authorization_code;
  const referrer = body.referrer;
  if (
    typeof code !== "string" || code.length < 8 || code.length > 2048 ||
    (referrer !== "DEFAULT" && referrer !== "SANDBOX")
  ) {
    return json(400, { error: { code: "invalid_toss_authorization" } });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) {
    return json(503, { error: { code: "service_configuration_missing" } });
  }

  try {
    const identity = await exchangeTossLogin(code, referrer as TossReferrer);
    const providerId = identity.userKey;
    const emailKey = await sha256(identity.userKey);
    const email = `toss-${emailKey}@identity.haenael.invalid`;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: existing, error: lookupError } = await admin
      .from("member")
      .select("id")
      .eq("provider", "TOSS")
      .eq("provider_id", providerId)
      .maybeSingle();
    if (lookupError) throw new Error("identity_lookup_failed");

    let memberId: string;
    let isNew = false;
    if (existing?.id) {
      memberId = existing.id as string;
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { auth_channel: "TOSS" },
      });
      if (createError || !created.user) {
        const { data: raced } = await admin
          .from("member")
          .select("id")
          .eq("provider", "TOSS")
          .eq("provider_id", providerId)
          .maybeSingle();
        if (!raced?.id) throw new Error("identity_create_failed");
        memberId = raced.id as string;
      } else {
        memberId = created.user.id;
        const { error: memberError } = await admin.from("member").insert({
          id: memberId,
          provider: "TOSS",
          provider_id: providerId,
          nickname: "해낼 사람",
        });
        if (memberError) {
          await admin.auth.admin.deleteUser(memberId);
          throw new Error("identity_create_failed");
        }
        isNew = true;
      }
    }

    const authUser = await admin.auth.admin.getUserById(memberId);
    const sessionEmail = authUser.data.user?.email;
    if (!sessionEmail) throw new Error("identity_email_missing");
    const session = await issueSession(admin, anon, sessionEmail);
    return json(200, { ...session, member_id: memberId, is_new: isNew });
  } catch (error) {
    const code = error instanceof Error && error.message.includes("credentials")
      ? "toss_partner_not_configured"
      : "toss_exchange_failed";
    return json(code === "toss_partner_not_configured" ? 503 : 401, { error: { code } });
  }
}

if (import.meta.main) Deno.serve(handleAuthToss);
