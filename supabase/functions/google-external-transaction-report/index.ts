import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleAuth } from "npm:google-auth-library@10";
import {
  handleGoogleExternalReport,
  type GoogleExternalTransactionRow,
} from "../_shared/google-external-report.ts";
import { decryptSecret } from "../_shared/secret-box.ts";

const url = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const admin = url && serviceKey
  ? createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : undefined;

async function accessToken(): Promise<string> {
  const raw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("google_not_configured");
  const auth = new GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const token = await auth.getAccessToken();
  if (!token) throw new Error("google_not_configured");
  return token;
}

async function report(row: GoogleExternalTransactionRow): Promise<void> {
  const packageName = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME");
  const encryptionKey = Deno.env.get(
    "GOOGLE_ALTERNATIVE_TOKEN_ENCRYPTION_KEY",
  );
  if (!packageName || !encryptionKey) throw new Error("google_not_configured");
  const externalTransactionToken = await decryptSecret(
    row.external_transaction_token_enc,
    encryptionKey,
  );
  const endpoint =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/externalTransactions` +
    `?externalTransactionId=${encodeURIComponent(row.external_transaction_id)}`;
  const authorization = `Bearer ${await accessToken()}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      originalPreTaxAmount: {
        currency: "KRW",
        priceMicros: String(row.pretax_amount_minor * 1_000_000),
      },
      originalTaxAmount: {
        currency: "KRW",
        priceMicros: String(row.tax_amount_minor * 1_000_000),
      },
      transactionTime: row.transaction_time,
      oneTimeTransaction: { externalTransactionToken },
      userTaxAddress: { regionCode: row.user_tax_region },
    }),
  });
  if (response.ok) return;
  if (response.status === 409) {
    const existing = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/externalTransactions/${encodeURIComponent(row.external_transaction_id)}`,
      { headers: { Authorization: authorization } },
    );
    if (existing.ok) return;
  }
  const failure = new Error(`google_external_report_http_${response.status}`) as Error & {
    status: number;
  };
  failure.status = response.status;
  throw failure;
}

if (import.meta.main) {
  Deno.serve((req) => handleGoogleExternalReport(req, {
    internalToken: Deno.env.get("GOOGLE_EXTERNAL_REPORT_INTERNAL_TOKEN"),
    async claim(limit) {
      if (!admin) throw new Error("service_configuration_missing");
      const { data, error } = await admin.rpc(
        "claim_google_external_transaction_batch",
        { p_limit: limit },
      );
      if (error) throw error;
      return (data ?? []) as GoogleExternalTransactionRow[];
    },
    report,
    async settle(input) {
      if (!admin) throw new Error("service_configuration_missing");
      const { error } = await admin.rpc("settle_google_external_transaction", {
        p_purchase_id: input.purchaseId,
        p_success: input.success,
        p_permanent: input.permanent,
        p_error_code: input.errorCode,
      });
      if (error) throw error;
    },
  }));
}
