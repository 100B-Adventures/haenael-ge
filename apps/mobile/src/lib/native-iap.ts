import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isBillingProgramAvailableAndroid,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  userChoiceBillingListenerAndroid,
  type Purchase
} from "expo-iap";
import { appConfig } from "./config";
import { AppError } from "./errors";
import {
  attachPendingReceipt,
  enqueuePendingPurchase,
  recoverAlternativePurchases,
  recoverPendingPurchases,
  removePendingPurchase,
} from "./purchase-recovery";
import { createRequestKey } from "./request-key";
import {
  confirmAlternativePayment,
  createPurchaseIntent,
  startTossAlternativePayment,
  verifyStorePurchase,
} from "./purchases";
import {
  clientFinishesStoreTransaction,
  productForAmount,
  type StoreProvider,
} from "./purchase-catalog";

const purchaseQueueStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

type PurchaseChoice =
  | { kind: "store"; purchase: Purchase }
  | { kind: "alternative"; externalTransactionToken: string };

function waitForPurchase(
  productId: string,
  userChoiceBillingEnabled: boolean,
  start: () => Promise<unknown>,
) {
  return new Promise<PurchaseChoice>((resolve, reject) => {
    const timer = setTimeout(() => done(() => reject(new AppError("store_timeout", "스토어 응답이 늦어지고 있어요. 구매 내역에서 다시 확인해 주세요.", true))), 90_000);
    const updated = purchaseUpdatedListener((purchase) => {
      if (purchase.productId === productId) {
        done(() => resolve({ kind: "store", purchase }));
      }
    });
    const failed = purchaseErrorListener((error) => done(() => reject(new AppError(String(error.code ?? "purchase_error"), error.message))));
    const alternative = userChoiceBillingEnabled
      ? userChoiceBillingListenerAndroid((details) => {
        if (details.products.includes(productId)) {
          done(() => resolve({
            kind: "alternative",
            externalTransactionToken: details.externalTransactionToken,
          }));
        }
      })
      : { remove: () => undefined };
    function done(callback: () => void) {
      clearTimeout(timer);
      updated.remove();
      failed.remove();
      alternative.remove();
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
  await enqueuePendingPurchase(purchaseQueueStorage, {
    provider,
    intentId: intent.intent_id,
    accountBinding: intent.account_binding,
    productId: product.productId,
    requestKey,
    goalId: args.goalId,
    cloverAmount: args.cloverAmount,
    message: args.message,
    anonymous: args.anonymous,
  });
  const userChoiceBillingEnabled = Platform.OS === "android" &&
    appConfig.googleUserChoiceBillingEnabled;
  await initConnection(userChoiceBillingEnabled
    ? { enableBillingProgramAndroid: "user-choice-billing" }
    : undefined);
  if (userChoiceBillingEnabled) {
    const availability = await isBillingProgramAvailableAndroid(
      "user-choice-billing",
    );
    if (!availability.isAvailable) {
      throw new AppError(
        "user_choice_billing_unavailable",
        "Google Play 결제 선택 기능을 현재 사용할 수 없어요.",
      );
    }
  }
  try {
    const products = await fetchProducts({ skus: [product.productId], type: "in-app" });
    if (!products?.some((item) => item.id === product.productId)) {
      throw new AppError("product_unavailable", "이 상품은 현재 스토어에서 살 수 없어요.");
    }
    const choice = await waitForPurchase(
      product.productId,
      userChoiceBillingEnabled,
      () =>
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
    if (choice.kind === "alternative") {
      return await startTossAlternativePayment({
        ...args,
        externalTransactionToken: choice.externalTransactionToken,
        replacedStoreIntentId: intent.intent_id,
      });
    }
    const purchase = choice.purchase;
    const receipt = purchase.purchaseToken;
    const transactionId = "transactionId" in purchase ? purchase.transactionId ?? purchase.id : purchase.id;
    if (!receipt || !transactionId) throw new AppError("receipt_missing", "스토어 영수증을 확인하지 못했어요.");
    await attachPendingReceipt(
      purchaseQueueStorage,
      intent.intent_id,
      receipt,
      transactionId,
    );
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
    if (clientFinishesStoreTransaction(provider)) {
      await finishTransaction({ purchase, isConsumable: true });
    }
    await removePendingPurchase(purchaseQueueStorage, intent.intent_id);
    return verified;
  } catch (error) {
    throw error;
  }
}

export function startNativePurchaseRecovery(): () => void {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return () => undefined;
  let stopped = false;
  let listener: { remove(): void } | undefined;
  const recoverStorePurchases = async (purchases: Purchase[]) => {
    if (stopped) return;
    await recoverPendingPurchases({
      storage: purchaseQueueStorage,
      availablePurchases: purchases,
      verify: verifyStorePurchase,
      finishIosTransaction: async (purchase) => {
        await finishTransaction({ purchase: purchase as Purchase, isConsumable: true });
      },
    });
  };
  const recoverAlternative = async () => {
    if (stopped) return;
    await recoverAlternativePurchases({
      storage: purchaseQueueStorage,
      confirm: confirmAlternativePayment,
    });
  };
  const ready = (async () => {
    // Alternative checkout recovery does not depend on a Play Billing
    // connection. Replay it first so an unavailable store cannot strand an
    // already approved Toss payment.
    await recoverAlternative();
    await initConnection(
      Platform.OS === "android" && appConfig.googleUserChoiceBillingEnabled
        ? { enableBillingProgramAndroid: "user-choice-billing" }
        : undefined,
    );
    if (stopped) return;
    listener = purchaseUpdatedListener((purchase) => {
      void recoverStorePurchases([purchase]);
    });
    await recoverStorePurchases(await getAvailablePurchases());
  })().catch(() => undefined);
  return () => {
    stopped = true;
    listener?.remove();
    void ready.finally(() => endConnection().catch(() => undefined));
  };
}
