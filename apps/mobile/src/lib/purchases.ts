import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { appConfig } from "./config";
import { supabase } from "./supabase";
import { AppError } from "./errors";
import { createRequestKey } from "./request-key";
import { productForAmount, type PurchaseProvider, type StoreProvider } from "./purchase-catalog";
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
  const url = new URL(appConfig.tossCheckoutUrl);
  url.searchParams.set("intent_id", intent.intent_id);
  url.searchParams.set("account_binding", intent.account_binding);
  url.searchParams.set("return_url", returnUrl);
  const result = await WebBrowser.openAuthSessionAsync(url.toString(), returnUrl);
  if (result.type !== "success") throw new AppError("payment_cancelled", "결제가 취소됐어요.");
  const returned = new URL(result.url);
  const paymentKey = returned.searchParams.get("paymentKey");
  const orderId = returned.searchParams.get("orderId");
  if (!paymentKey || !orderId || !args.externalTransactionToken) {
    throw new AppError("alternative_result_invalid", "결제 승인 정보를 확인하지 못했어요.");
  }
  const { data, error } = await supabase.functions.invoke("confirm-alternative-payment", {
    body: {
      intent_id: intent.intent_id,
      account_binding: intent.account_binding,
      payment_key: paymentKey,
      order_id: orderId,
      external_transaction_token: args.externalTransactionToken,
      request_key: requestKey,
      message: args.message || null,
      anonymous: args.anonymous
    }
  });
  if (error) throw error;
  return (data?.data ?? data) as VerifiedPurchase;
}
