import { createClient } from "npm:@supabase/supabase-js@2";
import { withRegionHeader } from "../_shared/region.ts";
import { sendSlackAlert } from "../_shared/slack.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: withRegionHeader(new Headers({ "Content-Type": "application/json", ...CORS_HEADERS })),
  });
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().slice(0, max);
  return normalized || null;
}

function normalizeEmail(value: unknown): string | null {
  const email = clean(value, 254)?.toLowerCase() ?? null;
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function normalizeInstagram(value: unknown): string | null {
  const handle = clean(value, 31)?.replace(/^@/, "").toLowerCase() ?? null;
  return handle && /^[a-z0-9._]{1,30}$/.test(handle) ? handle : null;
}

async function submitterHash(req: Request): Promise<string | null> {
  const salt = Deno.env.get("LEAD_RATE_LIMIT_SALT");
  const ip = req.headers.get("cf-connecting-ip")?.trim()
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!salt || !ip) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: withRegionHeader(new Headers(CORS_HEADERS)) });
  if (req.method !== "POST") return json(405, { error: { code: "method_not_allowed", message: "POST only" } });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: { code: "invalid_json", message: "JSON 형식이 아닙니다." } });
  }

  const email = normalizeEmail(body.email);
  const instagramHandle = normalizeInstagram(body.instagramHandle);
  if (!email && !instagramHandle) {
    return json(400, { error: { code: "contact_required", message: "이메일 또는 인스타그램 아이디를 입력해 주세요." } });
  }
  if (body.consent !== true) {
    return json(400, { error: { code: "consent_required", message: "연락 수신 동의가 필요합니다." } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json(503, { error: { code: "service_unavailable", message: "잠시 후 다시 시도해 주세요." } });

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const row = {
    email,
    instagram_handle: instagramHandle,
    consented_at: new Date().toISOString(),
    source: clean(body.source, 80) ?? "landing",
    medium: clean(body.medium, 80),
    campaign: clean(body.campaign, 120),
    content: clean(body.content, 120),
    referrer: clean(body.referrer, 500),
    landing_path: clean(body.landingPath, 500),
  };

  const hash = await submitterHash(req);
  if (!hash) return json(503, { error: { code: "rate_limit_unavailable", message: "잠시 후 다시 시도해 주세요." } });
  const { data, error } = await supabase.rpc("capture_lead", {
    p_email: email, p_instagram_handle: instagramHandle, p_consented_at: row.consented_at,
    p_source: row.source, p_medium: row.medium, p_campaign: row.campaign, p_content: row.content,
    p_referrer: row.referrer, p_landing_path: row.landing_path, p_submitter_hash: hash,
  });
  if (error?.message?.includes("lead_rate_limited")) return json(429, { error: { code: "rate_limited", message: "잠시 후 다시 시도해 주세요." } });
  if (error || !data) {
    console.error("[lead-capture] insert failed", error?.code);
    await sendSlackAlert({ event: "lead_capture_failed", severity: "warning", summary: "Lead insert failed", fields: { code: error?.code ?? "unknown" } });
    return json(500, { error: { code: "save_failed", message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." } });
  }

  const result = data[0];
  if (!result.is_duplicate) {
    await sendSlackAlert({ event: "lead_captured", summary: "A new launch lead was stored", fields: { leadId: result.lead_id, hasEmail: Boolean(email), hasInstagram: Boolean(instagramHandle) } });
  }
  return json(result.is_duplicate ? 200 : 201, { accepted: true, duplicate: result.is_duplicate, leadId: result.lead_id });
});
