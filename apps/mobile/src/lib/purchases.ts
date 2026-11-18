import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import { appConfig } from "./config";
import { supabase } from "./supabase";
import { AppError } from "./errors";
import { createRequestKey } from "./request-key";
import { productForAmount, type PurchaseProvider, type StoreProvider } from "./purchase-catalog";
import {
  enqueueAlternativePurchase,
  removeAlternativePurchase,
  removePendingPurchase,
  type PendingAlternativePurchase,
} from "./purchase-recovery";
export { cloverProducts, productForAmount, type PurchaseProvider, type StoreProvider } from "./purchase-catalog";

export type PurchaseIntent = {
  intent_id: string;
  account_binding: string;
  expires_at: string;
  is_replay: boolean;
};

export async function createPurchaseIntent(args: {
  goalId: number;
  provider: PurchaseProvider;
  cloverAmount: number;
  requestKey: string;
}) {
  if (appConfig.demoMode) throw new AppError("demo_write_blocked", "데모에서는 결제를 진행하지 않아요.");
  const product = productForAmount(args.cloverAmount);
  const { data, error } = await supabase.rpc("create_store_purchase_intent", {
    p_goal_id: args.goalId,
    p_provider: args.provider,
    p_product_id: product.productId,
    p_clover_amount: args.cloverAmount,
    p_request_key: args.requestKey
  });
  if (error) throw error;
  const value = Array.isArray(data) ? data[0] : data;
  if (!value) throw new AppError("intent_missing", "결제 준비 결과를 확인하지 못했어요.");
  return value as PurchaseIntent;
}

export type VerifiedPurchase = {
  purchase_id: number;
  status: string;
  cheer_id: number;
  clover_amount: number;
  available_at: string;
  is_replay: boolean;
};

const alternativeQueueStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export async function confirmAlternativePayment(input: PendingAlternativePurchase) {
  const { data, error } = await supabase.functions.invoke("confirm-alternative-payment", {
    body: {
      intent_id: input.intentId,
      account_binding: input.accountBinding,
      payment_key: input.paymentKey,
      order_id: input.orderId,
      external_transaction_token: input.externalTransactionToken,
      request_key: input.requestKey,
      message: input.message || null,
      anonymous: input.anonymous,
    },
  });
  if (error) throw error;
  const value = data?.data ?? data;
  if (!value?.purchase_id) throw new AppError("verification_invalid", "결제 확인 결과를 확인하지 못했어요.");
  return value as VerifiedPurchase;
}

export async function verifyStorePurchase(args: {
  provider: StoreProvider;
  intentId: string;
  productId: string;
  providerTransactionId: string;
  receipt: string;
  goalId: number;
  message: string;
  anonymous: boolean;
  requestKey: string;
}) {
  if (!args.receipt || !args.providerTransactionId) {
    throw new AppError("invalid_receipt", "스토어 영수증을 확인하지 못했어요.");
  }
  const { data, error } = await supabase.functions.invoke("verify-store-purchase", {
    body: {
      provider: args.provider,
      intent_id: args.intentId,
      product_id: args.productId,
      provider_transaction_id: args.providerTransactionId,
      receipt: args.receipt,
      goal_id: args.goalId,
      message: args.message || null,
      anonymous: args.anonymous,
      request_key: args.requestKey
    }
  });
  if (error) throw error;
  const value = data?.data ?? data;
  if (!value?.purchase_id) throw new AppError("verification_invalid", "결제 확인 결과를 확인하지 못했어요.");
  return value as VerifiedPurchase;
}

export async function startTossAlternativePayment(args: {
  goalId: number;
  cloverAmount: number;
  message: string;
  anonymous: boolean;
  externalTransactionToken: string;
  replacedStoreIntentId?: string;
}) {
  if (!appConfig.tossCheckoutUrl) {
    throw new AppError("toss_checkout_unconfigured", "토스페이먼츠 결제 준비가 아직 끝나지 않았어요.");
  }
  const requestKey = createRequestKey("toss");
  const intent = await createPurchaseIntent({
    goalId: args.goalId,
    provider: "GOOGLE_ALTERNATIVE",
    cloverAmount: args.cloverAmount,
    requestKey
  });
  const returnUrl = Linking.createURL("/payment/alternative-return");
  const prepared = await supabase.functions.invoke("prepare-alternative-checkout", {
    body: {
      intent_id: intent.intent_id,
      account_binding: intent.account_binding,
      request_key: requestKey,
      return_url: returnUrl,
    },
  });
  if (prepared.error || !prepared.data?.data?.checkout_token) {
    throw prepared.error ?? new AppError("checkout_prepare_failed", "결제창을 준비하지 못했어요.");
  }
  const url = new URL(appConfig.tossCheckoutUrl);
  url.searchParams.set("checkout_token", prepared.data.data.checkout_token);
  const result = await WebBrowser.openAuthSessionAsync(url.toString(), returnUrl);
  if (result.type !== "success") throw new AppError("payment_cancelled", "결제가 취소됐어요.");
  const returned = new URL(result.url);
  const paymentKey = returned.searchParams.get("paymentKey");
  const orderId = returned.searchParams.get("orderId");
  if (!paymentKey || !orderId || !args.externalTransactionToken) {
    throw new AppError("alternative_result_invalid", "결제 승인 정보를 확인하지 못했어요.");
  }
  const pending: PendingAlternativePurchase = {
    intentId: intent.intent_id,
    accountBinding: intent.account_binding,
    paymentKey,
    orderId,
    externalTransactionToken: args.externalTransactionToken,
    requestKey,
    message: args.message,
    anonymous: args.anonymous,
  };
  await enqueueAlternativePurchase(alternativeQueueStorage, pending);
  if (args.replacedStoreIntentId) {
    await removePendingPurchase(alternativeQueueStorage, args.replacedStoreIntentId);
  }
  const verified = await confirmAlternativePayment(pending);
  await removeAlternativePurchase(alternativeQueueStorage, intent.intent_id);
  return verified;
}
