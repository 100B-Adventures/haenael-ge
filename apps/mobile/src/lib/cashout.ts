import { AppError } from "./errors";
import { appConfig } from "./config";
import { createRequestKey } from "./request-key";
import { supabase } from "./supabase";

export type MobileCashoutEligibility = {
  total_balance: number;
  welcome_amount: number;
  locked_amount: number;
  available_amount: number;
  payable_amount: number;
  min_cashout_clover: number;
  reached_threshold: boolean;
  maturity_locked_amount: number;
  gift_locked_amount: number;
  next_maturity_at: string | null;
  cashout_enabled: boolean;
  gift_exchange_enabled: boolean;
};

export async function loadMobileCashout(): Promise<MobileCashoutEligibility> {
  if (appConfig.demoMode) {
    return {
      total_balance: 0,
      welcome_amount: 0,
      locked_amount: 0,
      available_amount: 0,
      payable_amount: 0,
      min_cashout_clover: 30,
      reached_threshold: false,
      maturity_locked_amount: 0,
      gift_locked_amount: 0,
      next_maturity_at: null,
      cashout_enabled: false,
      gift_exchange_enabled: false,
    };
  }
  const { data, error } = await supabase.functions.invoke("mobile-cashout", {
    method: "GET",
  });
  if (error) throw error;
  const value = data?.data ?? data;
  if (!value || typeof value.payable_amount !== "number") {
    throw new AppError("eligibility_unavailable", "환전 가능 잔액을 확인하지 못했어요.", true);
  }
  return value as MobileCashoutEligibility;
}

export async function submitMobileCashout(input: {
  cloverAmount: number;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
}) {
  if (appConfig.demoMode) {
    throw new AppError("demo_write_blocked", "데모에서는 환전을 신청하지 않아요.");
  }
  const { data, error } = await supabase.functions.invoke("mobile-cashout", {
    body: {
      clover_amount: input.cloverAmount,
      bank_code: input.bankCode,
      account_number: input.accountNumber,
      account_holder: input.accountHolder,
      request_key: createRequestKey("cashout"),
    },
  });
  if (error) throw error;
  const value = data?.data ?? data;
  if (!value?.cashout_request_id) {
    throw new AppError("cashout_request_failed", "환전 신청 결과를 확인하지 못했어요.", true);
  }
  return value;
}
