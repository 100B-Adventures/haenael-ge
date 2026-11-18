export type GoogleExternalTransactionRow = {
  purchase_id: number;
  external_transaction_token_enc: string;
  external_transaction_id: string;
  transaction_time: string;
  pretax_amount_minor: number;
  tax_amount_minor: number;
  user_tax_region: string;
  attempt_count: number;
};

export type GoogleExternalReportDeps = {
  internalToken?: string;
  claim(limit: number): Promise<GoogleExternalTransactionRow[]>;
  report(row: GoogleExternalTransactionRow): Promise<void>;
  settle(input: {
    purchaseId: number;
    success: boolean;
    permanent: boolean;
    errorCode: string | null;
  }): Promise<void>;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "x-region": "ap-northeast-2" },
  });
}

export function permanentGoogleReportFailure(error: unknown): boolean {
  const status = error && typeof error === "object" && "status" in error
    ? Number((error as { status?: unknown }).status)
    : 0;
  return status === 400 || status === 422;
}

export async function handleGoogleExternalReport(
  req: Request,
  deps: GoogleExternalReportDeps,
): Promise<Response> {
  if (req.method !== "POST") {
    return json(405, { error: { code: "method_not_allowed" } });
  }
  if (
    !deps.internalToken ||
    req.headers.get("x-google-report-internal-token") !== deps.internalToken
  ) {
    return json(401, { error: { code: "unauthorized" } });
  }
  const rows = await deps.claim(100);
  let reported = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await deps.report(row);
      await deps.settle({
        purchaseId: row.purchase_id,
        success: true,
        permanent: false,
        errorCode: null,
      });
      reported += 1;
    } catch (error) {
      const permanent = permanentGoogleReportFailure(error);
      const errorCode = error instanceof Error
        ? error.message.slice(0, 120)
        : "google_report_failed";
      await deps.settle({
        purchaseId: row.purchase_id,
        success: false,
        permanent,
        errorCode,
      });
      failed += 1;
    }
  }
  return json(failed ? 207 : 200, {
    data: { claimed: rows.length, reported, failed },
  });
}
