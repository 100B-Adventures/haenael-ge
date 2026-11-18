import { appConfig } from "./config";
import { AppError } from "./errors";
import { createRequestKey } from "./request-key";
import { supabase } from "./supabase";
import { unregisterPushToken } from "./notifications";
import { canDeleteAccount } from "./policy";

export type WithdrawalEligibility = {
  eligible: boolean;
  clover_balance: number;
  pending_cashout_count: number;
  blocked_reasons: { clover_balance?: string; cashout?: string };
};

export async function loadWithdrawalEligibility() {
  if (appConfig.demoMode) {
    return { eligible: true, clover_balance: 0, pending_cashout_count: 0, blocked_reasons: {} } as WithdrawalEligibility;
  }
  const { data, error } = await supabase.rpc("account_withdrawal_eligibility");
  if (error) throw error;
  return data as WithdrawalEligibility;
}

export async function deleteAccountInApp() {
  if (appConfig.demoMode) throw new AppError("demo_write_blocked", "데모에서는 계정을 삭제하지 않아요.");
  const eligibility = await loadWithdrawalEligibility();
  if (!canDeleteAccount(eligibility)) throw new AppError("withdrawal_blocked", "남은 클로버나 진행 중인 환전을 먼저 정리해 주세요.");
  const { error } = await supabase.functions.invoke("account-delete", {
    body: { request_key: createRequestKey("account_delete") }
  });
  if (error) throw error;
  await unregisterPushToken();
  await supabase.auth.signOut({ scope: "local" });
}
