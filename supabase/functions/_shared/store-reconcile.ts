import type { NormalizedStoreRefund } from "./store-refund.ts";

export interface ReconcilePurchase {
  provider: "APPLE" | "GOOGLE_PLAY" | "GOOGLE_ALTERNATIVE" | "TOSS_IAP";
  provider_transaction_id: string;
  product_id: string;
  gross_amount_minor: number;
  refunded_amount_minor: number;
  currency: string;
  supporter_member_id: string;
}

export interface StoreReconcileDeps {
  internalToken?: string;
  listPurchases(): Promise<ReconcilePurchase[]>;
  inspectPurchase(purchase: ReconcilePurchase): Promise<NormalizedStoreRefund | null>;
  reverseRefund(refund: NormalizedStoreRefund): Promise<void>;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "x-region": "ap-northeast-2" },
  });
}

export async function handleStorePurchaseReconcile(req: Request, deps: StoreReconcileDeps): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: { code: "method_not_allowed" } });
  if (!deps.internalToken || req.headers.get("x-reconcile-internal-token") !== deps.internalToken) {
    return json(401, { error: { code: "unauthorized" } });
  }
  const purchases = await deps.listPurchases();
  let refunds = 0;
  const failures: string[] = [];
  for (const purchase of purchases) {
    try {
      const refund = await deps.inspectPurchase(purchase);
      if (!refund) continue;
      await deps.reverseRefund(refund);
      refunds += 1;
    } catch {
      failures.push(`${purchase.provider}:${purchase.provider_transaction_id}`);
    }
  }
  return json(failures.length ? 207 : 200, {
    data: { scanned: purchases.length, refunds, failures: failures.length },
  });
}
