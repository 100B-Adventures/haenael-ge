import * as SecureStore from "expo-secure-store";
import { appConfig } from "./config";
import { AppError } from "./errors";
import { supabase } from "./supabase";
import { canDeleteAccount } from "./policy";
import {
  beginAccountDeletionForMember,
  clearAccountDeletionMember,
  retryAccountDeletionAfterAppleReauthentication,
} from "./account-delete-recovery";
import { reauthenticateAppleForDeletion } from "./auth";

const deletionStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

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
  const { data: sessionData } = await supabase.auth.getSession();
  const memberId = sessionData.session?.user.id;
  if (!memberId) throw new AppError("authentication_required", "다시 로그인해 주세요.");
  await beginAccountDeletionForMember(deletionStorage, memberId);
  await retryAccountDeletionAfterAppleReauthentication({
    memberId,
    storage: deletionStorage,
    invokeDelete: async () => {
      const { error } = await supabase.functions.invoke("account-delete", {
        body: {},
      });
      if (!error) return { ok: true };
      let code: string | undefined;
      const context = (error as { context?: unknown }).context;
      if (context instanceof Response) {
        try {
          const body = await context.clone().json() as { error?: { code?: string } };
          code = body.error?.code;
        } catch { /* Use the original Supabase error below. */ }
      }
      return { ok: false, code, error };
    },
    reauthenticateApple: reauthenticateAppleForDeletion,
  });
  await clearAccountDeletionMember(deletionStorage);
  await supabase.auth.signOut({ scope: "local" });
}
