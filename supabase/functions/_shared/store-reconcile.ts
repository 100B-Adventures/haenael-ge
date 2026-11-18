import type { NormalizedStoreRefund } from "./store-refund.ts";

export interface ReconcilePurchase {
  id: number;
  provider: "APPLE" | "GOOGLE_PLAY" | "GOOGLE_ALTERNATIVE" | "TOSS_IAP";
  provider_transaction_id: string;
  product_id: string;
  clover_amount: number;
  gross_amount_minor: number;
  refunded_amount_minor: number;
  refunded_clover_amount: number;
  currency: string;
  supporter_member_id: string;
}

export interface StoreReconcileDeps {
  internalToken?: string;
  listPurchasePage(cursor: string | null): Promise<{
    purchases: ReconcilePurchase[];
    nextCursor: string | null;
  }>;
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
  let refunds = 0;
  let scanned = 0;
  const failures: string[] = [];
  let cursor: string | null = null;
  const visitedCursors = new Set<string>();
  do {
    if (cursor && visitedCursors.has(cursor)) {
      return json(500, { error: { code: "reconcile_cursor_cycle" } });
    }
    if (cursor) visitedCursors.add(cursor);
    const page = await deps.listPurchasePage(cursor);
    for (const purchase of page.purchases) {
      scanned += 1;
      try {
        const refund = await deps.inspectPurchase(purchase);
        if (!refund) continue;
        await deps.reverseRefund(refund);
        refunds += 1;
      } catch {
        failures.push(`${purchase.provider}:${purchase.provider_transaction_id}`);
      }
    }
    cursor = page.nextCursor;
  } while (cursor !== null);
  return json(failures.length ? 207 : 200, {
    data: { scanned, refunds, failures: failures.length },
  });
}
