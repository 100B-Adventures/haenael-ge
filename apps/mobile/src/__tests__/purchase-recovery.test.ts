import { describe, expect, it, vi } from "vitest";
import {
  enqueueAlternativePurchase,
  enqueuePendingPurchase,
  recoverAlternativePurchases,
  recoverPendingPurchases,
  type PurchaseQueueStorage,
} from "../lib/purchase-recovery";

function memoryStorage(): PurchaseQueueStorage {
  let value: string | null = null;
  return {
    getItem: async () => value,
    setItem: async (_key, next) => { value = next; },
    removeItem: async () => { value = null; },
  };
}

describe("미완료 스토어 구매 복구", () => {
  it("TC-APP-02-9 Android 재실행은 원 intent로 멱등 재전송하고 클라이언트 consume을 하지 않는다", async () => {
    const storage = memoryStorage();
    await enqueuePendingPurchase(storage, {
      provider: "GOOGLE_PLAY", intentId: "intent-1", accountBinding: "account-1",
      productId: "haenael.cheer.clover.3", requestKey: "request-1", goalId: 9,
      cloverAmount: 3, message: "응원", anonymous: false,
    });
    const verify = vi.fn().mockResolvedValue({ purchase_id: 1 });
    const finish = vi.fn();
    const result = await recoverPendingPurchases({
      storage,
      availablePurchases: [{ productId: "haenael.cheer.clover.3", purchaseToken: "token-1", id: "order-1" }],
      verify,
      finishIosTransaction: finish,
    });
    expect(result).toEqual({ recovered: 1, pending: 0 });
    expect(verify).toHaveBeenCalledWith(expect.objectContaining({ intentId: "intent-1", receipt: "token-1" }));
    expect(finish).not.toHaveBeenCalled();
  });

  it("TC-APP-02-10 대체결제 응답 유실 뒤 같은 intent와 request key를 재전송한다", async () => {
    const storage = memoryStorage();
    await enqueueAlternativePurchase(storage, {
      intentId: "00000000-0000-0000-0000-000000000111",
      accountBinding: "00000000-0000-0000-0000-000000000112",
      requestKey: "toss-request-0001",
      paymentKey: "payment-key-0001",
      orderId: "order-0001",
      externalTransactionToken: "external-token-0001",
      message: "응원",
      anonymous: false,
    });
    const confirm = vi.fn().mockResolvedValue({ purchase_id: 91 });
    expect(await recoverAlternativePurchases({ storage, confirm })).toEqual({ recovered: 1, pending: 0 });
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      intentId: "00000000-0000-0000-0000-000000000111",
      requestKey: "toss-request-0001",
      paymentKey: "payment-key-0001",
    }));
  });

  it("TC-APP-02-17 복구 중 새 결제를 추가해도 새 큐 항목을 보존한다", async () => {
    const storage = memoryStorage();
    const purchase = (suffix: string) => ({
      intentId: `00000000-0000-0000-0000-0000000001${suffix}`,
      accountBinding: `00000000-0000-0000-0000-0000000002${suffix}`,
      requestKey: `toss-request-${suffix}`,
      paymentKey: `payment-key-${suffix}`,
      orderId: `order-${suffix}`,
      externalTransactionToken: `external-token-${suffix}`,
      message: "응원",
      anonymous: false,
    });
    await enqueueAlternativePurchase(storage, purchase("11"));
    let release!: () => void;
    const delayed = new Promise<void>((resolve) => { release = resolve; });
    const confirm = vi.fn(async () => delayed);
    const recovering = recoverAlternativePurchases({ storage, confirm });
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    await enqueueAlternativePurchase(storage, purchase("22"));
    release();
    await recovering;

    const retry = vi.fn().mockRejectedValue(new Error("network"));
    expect(await recoverAlternativePurchases({ storage, confirm: retry }))
      .toEqual({ recovered: 0, pending: 1 });
    expect(retry).toHaveBeenCalledWith(expect.objectContaining({
      requestKey: "toss-request-22",
    }));
  });
});
