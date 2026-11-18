export type PurchaseQueueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type PendingPurchase = {
  provider: "APPLE" | "GOOGLE_PLAY";
  intentId: string;
  accountBinding: string;
  productId: string;
  requestKey: string;
  goalId: number;
  cloverAmount: number;
  message: string;
  anonymous: boolean;
  receipt?: string;
  providerTransactionId?: string;
};

type RecoverablePurchase = {
  productId: string;
  purchaseToken?: string | null;
  id: string;
  transactionId?: string | null;
};

const QUEUE_KEY = "haenael.pending-store-purchases.v1";

async function readQueue(storage: PurchaseQueueStorage): Promise<PendingPurchase[]> {
  const raw = await storage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as PendingPurchase[] : [];
  } catch {
    return [];
  }
}

async function writeQueue(
  storage: PurchaseQueueStorage,
  queue: PendingPurchase[],
): Promise<void> {
  if (queue.length === 0) {
    await storage.removeItem(QUEUE_KEY);
    return;
  }
  await storage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueuePendingPurchase(
  storage: PurchaseQueueStorage,
  pending: PendingPurchase,
): Promise<void> {
  const queue = (await readQueue(storage)).filter(
    (item) => item.intentId !== pending.intentId,
  );
  queue.push(pending);
  await writeQueue(storage, queue);
}

export async function attachPendingReceipt(
  storage: PurchaseQueueStorage,
  intentId: string,
  receipt: string,
  providerTransactionId: string,
): Promise<void> {
  const queue = await readQueue(storage);
  const pending = queue.find((item) => item.intentId === intentId);
  if (!pending) return;
  pending.receipt = receipt;
  pending.providerTransactionId = providerTransactionId;
  await writeQueue(storage, queue);
}

export async function removePendingPurchase(
  storage: PurchaseQueueStorage,
  intentId: string,
): Promise<void> {
  await writeQueue(
    storage,
    (await readQueue(storage)).filter((item) => item.intentId !== intentId),
  );
}

export async function recoverPendingPurchases(args: {
  storage: PurchaseQueueStorage;
  availablePurchases: RecoverablePurchase[];
  verify(input: {
    provider: "APPLE" | "GOOGLE_PLAY";
    intentId: string;
    productId: string;
    providerTransactionId: string;
    receipt: string;
    goalId: number;
    message: string;
    anonymous: boolean;
    requestKey: string;
  }): Promise<unknown>;
  finishIosTransaction(purchase: RecoverablePurchase): Promise<void>;
}): Promise<{ recovered: number; pending: number }> {
  const queue = await readQueue(args.storage);
  const remaining: PendingPurchase[] = [];
  let recovered = 0;
  for (const pending of queue) {
    const purchase = args.availablePurchases.find(
      (candidate) => candidate.productId === pending.productId &&
        (!pending.receipt || candidate.purchaseToken === pending.receipt),
    );
    const receipt = pending.receipt ?? purchase?.purchaseToken ?? undefined;
    const providerTransactionId = pending.providerTransactionId ??
      purchase?.transactionId ?? purchase?.id;
    if (!receipt || !providerTransactionId) {
      remaining.push(pending);
      continue;
    }
    try {
      await args.verify({
        provider: pending.provider,
        intentId: pending.intentId,
        productId: pending.productId,
        providerTransactionId,
        receipt,
        goalId: pending.goalId,
        message: pending.message,
        anonymous: pending.anonymous,
        requestKey: pending.requestKey,
      });
      if (pending.provider === "APPLE" && purchase) {
        await args.finishIosTransaction(purchase);
      }
      recovered += 1;
    } catch {
      remaining.push({ ...pending, receipt, providerTransactionId });
    }
  }
  await writeQueue(args.storage, remaining);
  return { recovered, pending: remaining.length };
}
