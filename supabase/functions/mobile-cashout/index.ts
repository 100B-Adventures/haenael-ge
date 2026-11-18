import { createClient } from "npm:@supabase/supabase-js@2";
import { withRegionHeader } from "../_shared/region.ts";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type MobileCashoutRequest = {
  cloverAmount: number;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  requestKey: string;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withRegionHeader(
      new Headers({ "Content-Type": "application/json", ...CORS }),
    ),
  });
}

export function parseMobileCashoutRequest(
  value: unknown,
): MobileCashoutRequest {
  const body = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const cloverAmount = body.clover_amount;
  const bankCode = typeof body.bank_code === "string"
    ? body.bank_code.trim()
    : "";
  const accountNumber = typeof body.account_number === "string"
    ? body.account_number.replace(/[\s-]/g, "")
    : "";
  const accountHolder = typeof body.account_holder === "string"
    ? body.account_holder.normalize("NFKC").trim().replace(/\s+/g, " ")
    : "";
  const requestKey = typeof body.request_key === "string"
    ? body.request_key.trim()
    : "";
  if (!Number.isSafeInteger(cloverAmount) || Number(cloverAmount) < 1) {
    throw new Error("cashout_amount_invalid");
  }
  if (
    !/^[0-9]{3}$/.test(bankCode) ||
    !/^[0-9]{6,20}$/.test(accountNumber) ||
    accountHolder.length < 2 || accountHolder.length > 40
  ) throw new Error("cashout_account_invalid");
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(requestKey)) {
    throw new Error("invalid_request");
  }
  return {
    cloverAmount: Number(cloverAmount),
    bankCode,
    accountNumber,
    accountHolder,
    requestKey,
  };
}

export function isMobileCashoutAllowedMember(memberId: string): boolean {
  if (
    Deno.env.get("CASHOUT_ENABLED") !== "true" ||
    Deno.env.get("MOBILE_CASHOUT_ENABLED") !== "true" ||
    !(Deno.env.get("MOBILE_CASHOUT_APPROVAL_REFERENCE") ?? "").trim()
  ) return false;
  const allowed = (Deno.env.get("CASHOUT_ALLOWED_MEMBER_IDS") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => /^[0-9a-f-]{36}$/.test(value));
  return allowed.includes(memberId.toLowerCase());
}

function cashoutSecrets(): {
  version: number;
  key: string;
  fingerprintKey: string;
} {
  const activeVersion = Number(
    Deno.env.get("CASHOUT_ACCOUNT_ACTIVE_KEY_VERSION") ?? "1",
  );
  const serialized = Deno.env.get("CASHOUT_ACCOUNT_ENCRYPTION_KEYS") ?? "";
  const fingerprintKey = Deno.env.get("CASHOUT_ACCOUNT_FINGERPRINT_KEY") ?? "";
  let key = "";
  try {
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    const candidate = parsed[String(activeVersion)];
    key = typeof candidate === "string" ? candidate : "";
  } catch {
    throw new Error("cashout_configuration_missing");
  }
  if (
    !Number.isInteger(activeVersion) || activeVersion < 1 ||
    activeVersion > 32767 || key.length < 32 || fingerprintKey.length < 32
  ) {
    throw new Error("cashout_configuration_missing");
  }
  return { version: activeVersion, key, fingerprintKey };
}

function mapCashoutError(message: string): { status: number; code: string } {
  if (message.includes("request_key_conflict")) {
    return { status: 409, code: "request_key_conflict" };
  }
  if (message.includes("cashout_already_requested")) {
    return { status: 409, code: "cashout_in_progress" };
  }
  if (
    message.includes("cashout_below_minimum") ||
    message.includes("cashout_insufficient_balance") ||
    message.includes("cashout_minor_not_allowed")
  ) return { status: 422, code: "cashout_not_eligible" };
  if (message.includes("invalid_cashout_amount")) {
    return { status: 400, code: "cashout_amount_invalid" };
  }
  if (
    message.includes("invalid_bank_code") ||
    message.includes("invalid_account_number") ||
    message.includes("invalid_account_holder")
  ) return { status: 400, code: "cashout_account_invalid" };
  return { status: 503, code: "cashout_request_failed" };
}

export async function handleMobileCashout(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return json(405, { error: { code: "method_not_allowed" } });
  }
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return json(401, { error: { code: "unauthorized" } });
  }
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return json(503, { error: { code: "service_configuration_missing" } });
  }
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(
    authorization.slice(7),
  );
  if (userError || !userData.user) {
    return json(401, { error: { code: "unauthorized" } });
  }
  const memberId = userData.user.id;
  const cashoutEnabled = isMobileCashoutAllowedMember(memberId);

  if (req.method === "GET") {
    const { data, error } = await admin.rpc("clover_eligibility", {
      p_member_id: memberId,
    });
    const eligibility = Array.isArray(data) ? data[0] : data;
    if (error || !eligibility) {
      return json(503, { error: { code: "eligibility_unavailable" } });
    }
    return json(200, {
      data: {
        ...eligibility,
        cashout_enabled: cashoutEnabled,
        gift_exchange_enabled:
          Deno.env.get("MOBILE_GIFT_EXCHANGE_ENABLED") === "true",
      },
    });
  }

  if (!cashoutEnabled) {
    return json(403, { error: { code: "cashout_channel_disabled" } });
  }
  let input: MobileCashoutRequest;
  try {
    input = parseMobileCashoutRequest(await req.json());
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_request";
    return json(400, { error: { code } });
  }
  try {
    const secrets = cashoutSecrets();
    const { data, error } = await admin.rpc("create_cashout_request", {
      p_member_id: memberId,
      p_clover_amount: input.cloverAmount,
      p_bank_code: input.bankCode,
      p_account_no: input.accountNumber,
      p_account_holder: input.accountHolder,
      p_request_key: input.requestKey,
      p_account_key_version: secrets.version,
      p_account_key: secrets.key,
      p_account_fingerprint_key: secrets.fingerprintKey,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) {
      const mapped = mapCashoutError(error?.message ?? "unknown");
      return json(mapped.status, { error: { code: mapped.code } });
    }
    return json(200, { data: row });
  } catch (error) {
    const code = error instanceof Error &&
        error.message === "cashout_configuration_missing"
      ? error.message
      : "cashout_request_failed";
    return json(503, { error: { code } });
  }
}

if (import.meta.main) Deno.serve(handleMobileCashout);
