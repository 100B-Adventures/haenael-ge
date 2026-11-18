import { describe, expect, it, vi } from "vitest";
import { enqueuePendingPurchase, recoverPendingPurchases, type PurchaseQueueStorage } from "../lib/purchase-recovery";

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
});
