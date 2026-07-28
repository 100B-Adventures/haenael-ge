// cashout — 회장 수동 지급 모델의 환전 견적/신청
// 신청 RPC가 잔액 검증 + cashout_request insert + CASHOUT_HOLD를 한 트랜잭션으로 처리한다.
// TossPayoutClient/cashout-payout은 이번 슬라이스에서 호출하지 않는다.

import { createClient } from "npm:@supabase/supabase-js@2";
import { toPublicError, toPublicHttpStatus } from "../_shared/errors.ts";
import { withRegionHeader } from "../_shared/region.ts";
import { noOpRiskHook } from "../_shared/risk.ts";
import { calcCashout } from "../_shared/withholding.ts";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REQUEST_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const BANK_CODE_PATTERN = /^[A-Za-z0-9_-]{2,20}$/;
const MAX_CASHOUT_CLOVER = 2_000_000;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withRegionHeader(
      new Headers({ "Content-Type": "application/json", ...CORS_HEADERS }),
    ),
  });
}

function normalizeAccountNumber(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const normalized = input.replaceAll(/[\s-]/g, "");
  return /^[0-9]{8,20}$/.test(normalized) ? normalized : null;
}

function normalizeHolder(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const normalized = input.normalize("NFKC").trim().replaceAll(/\s+/g, " ");
  return normalized.length >= 2 && normalized.length <= 40 ? normalized : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: withRegionHeader(new Headers(CORS_HEADERS)),
    });
  }
  if (req.method !== "POST") {
    return json(405, {
      error: { code: "method_not_allowed", message: "지원하지 않는 요청입니다." },
    });
  }

  if (Deno.env.get("CASHOUT_ENABLED") !== "true") {
    return json(503, {
      error: { code: "cashout_disabled", message: "환전 기능을 준비하고 있습니다." },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, {
      error: { code: "unauthorized", message: "로그인 후 다시 시도해주세요." },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, {
      error: { code: "invalid_json", message: "입력 정보를 다시 확인해주세요." },
    });
  }

  const cloverAmount = Number(body.cloverAmount);
  if (
    !Number.isSafeInteger(cloverAmount) ||
    cloverAmount < 1 ||
    cloverAmount > MAX_CASHOUT_CLOVER
  ) {
    return json(400, { error: toPublicError("invalid_cashout_amount") });
  }

  let quote;
  try {
    quote = calcCashout(cloverAmount * 1000);
  } catch {
    return json(422, { error: toPublicError("cashout_below_minimum") });
  }

  if (body.mode === "quote") {
    return json(200, {
      cloverAmount,
      grossKrw: quote.grossAmount,
      feeKrw: quote.platformFee,
      withholdingKrw: quote.withholdingTax,
      netKrw: quote.netAmount,
    });
  }

  const bankCode =
    typeof body.bankCode === "string" ? body.bankCode.trim().toUpperCase() : "";
  const accountNo = normalizeAccountNumber(body.accountNo);
  const accountHolder = normalizeHolder(body.accountHolder);
  const requestKey =
    typeof body.requestKey === "string" ? body.requestKey.trim() : "";

  if (!BANK_CODE_PATTERN.test(bankCode)) {
    return json(400, { error: toPublicError("invalid_bank_code") });
  }
  if (!accountNo) {
    return json(400, { error: toPublicError("invalid_account_number") });
  }
  if (!accountHolder) {
    return json(400, { error: toPublicError("invalid_account_holder") });
  }
  if (!REQUEST_KEY_PATTERN.test(requestKey)) {
    return json(400, { error: toPublicError("invalid_request_key") });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accountKey = Deno.env.get("CASHOUT_ACCOUNT_ENCRYPTION_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey || !accountKey) {
    return json(503, { error: toPublicError("cashout_encryption_unavailable") });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error: authError,
  } = await callerClient.auth.getUser();
  if (authError || !user) {
    return json(401, {
      error: { code: "unauthorized", message: "로그인 후 다시 시도해주세요." },
    });
  }

  const riskDecision = await noOpRiskHook.evaluate({
    userId: user.id,
    amount: quote.grossAmount,
    action: "CASHOUT",
  });
  if (riskDecision !== "CLEAR") {
    return json(409, {
      error: { code: "cashout_review_required", message: "환전 요청을 확인하고 있어요." },
    });
  }

  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await serviceClient.rpc("create_cashout_request", {
    p_member_id: user.id,
    p_clover_amount: cloverAmount,
    p_bank_code: bankCode,
    p_account_no: accountNo,
    p_account_holder: accountHolder,
    p_request_key: requestKey,
    p_account_key: accountKey,
  });

  if (error || !data?.[0]) {
    const publicError = toPublicError(error?.message);
    // 계좌번호·예금주·요청 body는 로그에 절대 남기지 않는다.
    console.error("[cashout] request RPC failed", {
      dbCode: error?.code ?? "unknown",
      publicCode: publicError.code,
    });
    return json(toPublicHttpStatus(error?.message), { error: publicError });
  }

  const row = data[0] as {
    cashout_request_id: number;
    status: "REQUESTED";
    clover_amount: number;
    gross_krw: number;
    fee_krw: number;
    withholding_krw: number;
    net_krw: number;
    requested_at: string;
    is_replay: boolean;
  };

  return json(row.is_replay ? 200 : 201, {
    requestId: row.cashout_request_id,
    status: row.status,
    cloverAmount: row.clover_amount,
    grossKrw: row.gross_krw,
    feeKrw: row.fee_krw,
    withholdingKrw: row.withholding_krw,
    netKrw: row.net_krw,
    requestedAt: row.requested_at,
    ...(row.is_replay ? { idempotent: true } : {}),
  });
});
