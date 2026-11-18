import { Platform } from "react-native";
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase
} from "expo-iap";
import { AppError } from "./errors";
import { createRequestKey } from "./request-key";
import { createPurchaseIntent, verifyStorePurchase } from "./purchases";
import { productForAmount, type StoreProvider } from "./purchase-catalog";

function waitForPurchase(productId: string, start: () => Promise<unknown>) {
  return new Promise<Purchase>((resolve, reject) => {
    const timer = setTimeout(() => done(() => reject(new AppError("store_timeout", "스토어 응답이 늦어지고 있어요. 구매 내역에서 다시 확인해 주세요.", true))), 90_000);
    const updated = purchaseUpdatedListener((purchase) => {
      if (purchase.productId === productId) done(() => resolve(purchase));
    });
    const failed = purchaseErrorListener((error) => done(() => reject(new AppError(String(error.code ?? "purchase_error"), error.message))));
    function done(callback: () => void) {
      clearTimeout(timer);
      updated.remove();
      failed.remove();
      callback();
    }
    void start().catch((error) => done(() => reject(error)));
  });
}

export async function completeNativePurchase(args: {
  goalId: number;
  cloverAmount: number;
  message: string;
  anonymous: boolean;
}) {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    throw new AppError("native_store_required", "스토어 결제는 iOS 또는 Android 앱에서 진행해 주세요.");
  }
  const provider: StoreProvider = Platform.OS === "ios" ? "APPLE" : "GOOGLE_PLAY";
  const product = productForAmount(args.cloverAmount);
  const requestKey = createRequestKey("store");
  const intent = await createPurchaseIntent({
    goalId: args.goalId,
    provider,
    cloverAmount: args.cloverAmount,
    requestKey
  });
  await initConnection();
  try {
    const products = await fetchProducts({ skus: [product.productId], type: "in-app" });
    if (!products?.some((item) => item.id === product.productId)) {
      throw new AppError("product_unavailable", "이 상품은 현재 스토어에서 살 수 없어요.");
    }
    const purchase = await waitForPurchase(product.productId, () =>
      requestPurchase({
        request: {
          apple: {
            sku: product.productId,
            appAccountToken: intent.account_binding,
            quantity: 1
          },
          google: {
            skus: [product.productId],
            obfuscatedAccountId: intent.account_binding
          }
        },
        type: "in-app"
      })
    );
    const receipt = purchase.purchaseToken;
    const transactionId = "transactionId" in purchase ? purchase.transactionId ?? purchase.id : purchase.id;
    if (!receipt || !transactionId) throw new AppError("receipt_missing", "스토어 영수증을 확인하지 못했어요.");
    const verified = await verifyStorePurchase({
      provider,
      intentId: intent.intent_id,
      productId: product.productId,
      providerTransactionId: transactionId,
      receipt,
      goalId: args.goalId,
      message: args.message,
      anonymous: args.anonymous,
      requestKey
    });
    await finishTransaction({ purchase, isConsumable: true });
    return verified;
  } finally {
    await endConnection().catch(() => undefined);
  }
}
