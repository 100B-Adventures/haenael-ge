import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { withRegionHeader } from "../_shared/region.ts";
import { encryptSecret } from "../_shared/secret-box.ts";
import { TossClient, type TossConfirmResponse } from "../_shared/toss.ts";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AlternativePaymentRequest = {
  intentId: string;
  accountBinding: string;
  paymentKey: string;
  orderId: string;
  externalTransactionToken: string;
  requestKey: string;
  message: string;
  anonymous: boolean;
};

type AlternativePaymentExpectation = {
  paymentKey: string;
  orderId: string;
  accountBinding: string;
  productId: string;
  expectedAmount: number;
  expectedMid: string;
};

type AlternativePaymentNormalized = {
  grossAmountMinor: number;
  pretaxAmountMinor: number;
  taxAmountMinor: number;
  purchasedAt: string;
};

export async function recordCompensationFailure(
  admin: Pick<SupabaseClient, "rpc">,
  input: {
    intentId: string;
    memberId: string;
    paymentKey: string;
    orderId: string;
    requestKey: string;
  },
): Promise<void> {
  const { error } = await admin.rpc("record_alternative_payment_recovery", {
    p_intent_id: input.intentId,
    p_member_id: input.memberId,
    p_payment_key: input.paymentKey,
    p_order_id: input.orderId,
    p_request_key: input.requestKey,
  });
  if (error) throw new Error("payment_recovery_record_failed");
}

export async function beginAlternativePaymentConfirmation(
  admin: Pick<SupabaseClient, "rpc">,
  input: { intentId: string; memberId: string; requestKey: string },
): Promise<string> {
  const { data, error } = await admin.rpc(
    "begin_alternative_payment_confirmation",
    {
      p_intent_id: input.intentId,
      p_member_id: input.memberId,
      p_request_key: input.requestKey,
    },
  );
  if (error) throw new Error(error.message);
  return data as string;
}

async function settleAlternativeConfirmation(
  admin: SupabaseClient,
  input: { intentId: string; memberId: string },
  status: "CANCELED" | "RECONCILIATION_REQUIRED",
): Promise<void> {
  const { error } = await admin.rpc("settle_alternative_payment_confirmation", {
    p_intent_id: input.intentId,
    p_member_id: input.memberId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withRegionHeader(
      new Headers({ "Content-Type": "application/json", ...CORS }),
    ),
  });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseAlternativePaymentRequest(
  value: unknown,
): AlternativePaymentRequest {
  const body = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const parsed = {
    intentId: text(body.intent_id),
    accountBinding: text(body.account_binding),
    paymentKey: text(body.payment_key),
    orderId: text(body.order_id),
    externalTransactionToken: text(body.external_transaction_token),
    requestKey: text(body.request_key),
    message: text(body.message),
    anonymous: body.anonymous === true,
  };
  if (
    !/^[0-9a-f-]{36}$/i.test(parsed.intentId) ||
    !/^[0-9a-f-]{36}$/i.test(parsed.accountBinding) ||
    parsed.paymentKey.length < 6 || parsed.paymentKey.length > 200 ||
    !/^[A-Za-z0-9_=-]{6,64}$/.test(parsed.orderId) ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(parsed.requestKey) ||
    parsed.message.length > 140
  ) {
    throw new Error("invalid_request");
  }
  if (!parsed.externalTransactionToken) {
    throw new Error("external_transaction_token_required");
  }
  return parsed;
}

export function normalizeAlternativePayment(
  payment: TossConfirmResponse,
  expected: AlternativePaymentExpectation,
): AlternativePaymentNormalized {
  if (
    payment.paymentKey !== expected.paymentKey ||
    payment.orderId !== expected.orderId
  ) {
    throw new Error("payment_identity_mismatch");
  }
  if (payment.status !== "DONE") throw new Error("payment_not_completed");
  if (payment.totalAmount !== expected.expectedAmount) {
    throw new Error("payment_amount_mismatch");
  }
  if (payment.mId !== expected.expectedMid) {
    throw new Error("payment_merchant_mismatch");
  }
  if (
    payment.orderName !== expected.productId ||
    payment.metadata?.productId !== expected.productId
  ) {
    throw new Error("payment_product_mismatch");
  }
  if (payment.metadata?.accountBinding !== expected.accountBinding) {
    throw new Error("payment_account_mismatch");
  }
  const vat = Math.round(payment.totalAmount / 11);
  return {
    grossAmountMinor: payment.totalAmount,
    pretaxAmountMinor: payment.totalAmount - vat,
    taxAmountMinor: vat,
    purchasedAt: payment.approvedAt,
  };
}

async function replayResponse(
  admin: SupabaseClient,
  intent: Record<string, unknown>,
  input: AlternativePaymentRequest,
): Promise<Response | null> {
  if (intent.status !== "CONSUMED") return null;
  const { data: purchase } = await admin.from("store_purchase")
    .select(
      "id,cheer_id,clover_amount,provider_transaction_id,request_key,status",
    )
    .eq("intent_id", input.intentId).maybeSingle();
  if (
    !purchase || purchase.provider_transaction_id !== input.paymentKey ||
    purchase.request_key !== input.requestKey
  ) {
    return json(409, { error: { code: "transaction_binding_mismatch" } });
  }
  const [{ data: maturity }, { data: external }] = await Promise.all([
    admin.from("clover_maturity").select("available_at").eq(
      "purchase_id",
      purchase.id,
    ).maybeSingle(),
    admin.from("google_external_transaction").select(
      "external_transaction_id,report_status",
    )
      .eq("purchase_id", purchase.id).maybeSingle(),
  ]);
  if (!external || external.external_transaction_id !== input.orderId) {
    return json(409, { error: { code: "transaction_binding_mismatch" } });
  }
  return json(200, {
    data: {
      purchase_id: purchase.id,
      status: "CREDITED",
      cheer_id: purchase.cheer_id,
      clover_amount: purchase.clover_amount,
      available_at: maturity?.available_at ?? null,
      is_replay: true,
      report_status: external.report_status,
    },
  });
}

export async function handleConfirmAlternativePayment(
  req: Request,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return json(405, { error: { code: "method_not_allowed" } });
  }
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return json(401, { error: { code: "unauthorized" } });
  }

  let input: AlternativePaymentRequest;
  try {
    input = parseAlternativePaymentRequest(await req.json());
  } catch (error) {
    const code = error instanceof Error &&
        error.message === "external_transaction_token_required"
      ? error.message
      : "invalid_request";
    return json(code === "external_transaction_token_required" ? 422 : 400, {
      error: { code },
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const tossSecret = Deno.env.get("TOSS_SECRET_KEY");
  const expectedMid = Deno.env.get("TOSS_ALTERNATIVE_MID");
  const tokenKey = Deno.env.get("GOOGLE_ALTERNATIVE_TOKEN_ENCRYPTION_KEY");
  if (
    !url || !serviceKey || !tossSecret || !expectedMid || !tokenKey ||
    Deno.env.get("PAYMENTS_ENABLED") !== "true"
  ) {
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

  const { data: intent } = await admin.from("store_purchase_intent").select("*")
    .eq("id", input.intentId).maybeSingle();
  if (
    !intent || intent.supporter_member_id !== userData.user.id ||
    intent.provider !== "GOOGLE_ALTERNATIVE"
  ) {
    return json(409, { error: { code: "transaction_owner_mismatch" } });
  }
  if (
    intent.account_binding !== input.accountBinding ||
    intent.request_key !== input.requestKey
  ) {
    return json(409, { error: { code: "transaction_binding_mismatch" } });
  }
  const replay = await replayResponse(admin, intent, input);
  if (replay) return replay;
  if (
    intent.status !== "CREATED" ||
    new Date(intent.expires_at).getTime() <= Date.now()
  ) {
    return json(422, { error: { code: "purchase_intent_invalid" } });
  }

  const environment = tossSecret.startsWith("test_") ? "SANDBOX" : "PRODUCTION";
  const [{ data: catalog }, { data: gate }] = await Promise.all([
    admin.from("store_product_catalog").select(
      "product_id,clover_amount,currency,gross_amount_minor",
    )
      .eq("provider", "GOOGLE_ALTERNATIVE").eq("product_id", intent.product_id)
      .eq("active", true).maybeSingle(),
    admin.from("app_channel_release_gate").select(
      "sandbox_enabled,production_enabled",
    )
      .eq("channel", "GOOGLE_ALTERNATIVE").maybeSingle(),
  ]);
  if (!catalog || catalog.clover_amount !== intent.clover_amount) {
    return json(422, { error: { code: "product_catalog_mismatch" } });
  }
  const enabled = environment === "SANDBOX"
    ? gate?.sandbox_enabled
    : gate?.production_enabled;
  if (!enabled) {
    return json(503, { error: { code: "channel_release_disabled" } });
  }

  let confirmationState: string;
  try {
    confirmationState = await beginAlternativePaymentConfirmation(admin, {
      intentId: input.intentId,
      memberId: userData.user.id,
      requestKey: input.requestKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = message.includes("account_deletion_in_progress")
      ? "account_deletion_in_progress"
      : message.includes("purchase_intent_invalid")
      ? "purchase_intent_invalid"
      : "payment_confirmation_unavailable";
    return json(code === "payment_confirmation_unavailable" ? 503 : 409, {
      error: { code },
    });
  }
  if (confirmationState !== "CONFIRMING") {
    return json(409, { error: { code: "payment_confirmation_state_invalid" } });
  }

  const toss = new TossClient(tossSecret);
  let paymentApproved = false;
  try {
    const confirmed = await toss.confirmPayment({
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      amount: catalog.gross_amount_minor,
    });
    paymentApproved = true;
    normalizeAlternativePayment(confirmed, {
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      accountBinding: input.accountBinding,
      productId: catalog.product_id,
      expectedAmount: catalog.gross_amount_minor,
      expectedMid,
    });
    const encryptedToken = await encryptSecret(
      input.externalTransactionToken,
      tokenKey,
    );
    const { data, error } = await admin.rpc(
      "credit_alternative_store_purchase",
      {
        p_intent_id: input.intentId,
        p_verified_member_id: userData.user.id,
        p_account_binding: input.accountBinding,
        p_payment_key: input.paymentKey,
        p_order_id: input.orderId,
        p_product_id: catalog.product_id,
        p_environment: environment,
        p_message: input.message,
        p_is_anonymous: input.anonymous,
        p_request_key: input.requestKey,
        p_purchased_at: confirmed.approvedAt,
        p_external_transaction_token_enc: encryptedToken,
        p_user_tax_region: "KR",
      },
    );
    if (error || !data?.[0]) throw new Error(error?.message ?? "credit_failed");
    const row = data[0];
    return json(row.is_replay ? 200 : 201, {
      data: {
        purchase_id: row.purchase_id,
        status: "CREDITED",
        cheer_id: row.cheer_id,
        clover_amount: row.clover_amount,
        available_at: row.available_at,
        is_replay: row.is_replay,
        report_status: row.report_status,
      },
    });
  } catch (error) {
    const { data: latestIntent } = await admin.from("store_purchase_intent")
      .select("*").eq("id", input.intentId).maybeSingle();
    if (latestIntent) {
      const completedByConcurrentRequest = await replayResponse(
        admin,
        latestIntent,
        input,
      );
      if (completedByConcurrentRequest) return completedByConcurrentRequest;
    }
    if (paymentApproved) {
      try {
        await toss.cancelPayment(input.paymentKey, "해낼게 대체결제 적립 실패");
        await settleAlternativeConfirmation(admin, {
          intentId: input.intentId,
          memberId: userData.user.id,
        }, "CANCELED");
      } catch {
        try {
          await recordCompensationFailure(admin, {
            intentId: input.intentId,
            memberId: userData.user.id,
            paymentKey: input.paymentKey,
            orderId: input.orderId,
            requestKey: input.requestKey,
          });
        } catch {
          console.error(
            "[confirm-alternative-payment] recovery ledger write failed",
          );
          return json(503, {
            error: { code: "payment_recovery_record_failed" },
          });
        }
        return json(503, {
          error: { code: "payment_compensation_failed" },
        });
      }
    } else {
      try {
        await settleAlternativeConfirmation(admin, {
          intentId: input.intentId,
          memberId: userData.user.id,
        }, "RECONCILIATION_REQUIRED");
      } catch {
        console.error(
          "[confirm-alternative-payment] reconciliation state write failed",
        );
        return json(503, {
          error: { code: "payment_recovery_record_failed" },
        });
      }
    }
    const message = error instanceof Error
      ? error.message
      : "provider_unavailable";
    const code = message.includes("amount")
      ? "payment_amount_mismatch"
      : message.includes("account") || message.includes("owner")
      ? "transaction_owner_mismatch"
      : message.includes("product") || message.includes("merchant") ||
          message.includes("binding")
      ? "transaction_binding_mismatch"
      : message.includes("channel_release_disabled")
      ? "channel_release_disabled"
      : "provider_unavailable";
    return json(
      code === "channel_release_disabled"
        ? 503
        : code.includes("mismatch")
        ? 409
        : 502,
      {
        error: { code },
      },
    );
  }
}

if (import.meta.main) Deno.serve(handleConfirmAlternativePayment);
