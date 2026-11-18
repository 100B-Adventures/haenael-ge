import type { WithdrawalEligibility } from "./account";

export function canDeleteAccount(value: WithdrawalEligibility) {
  return value.eligible && value.clover_balance === 0 && value.pending_cashout_count === 0;
}

export function isPushCopySafe(body: string) {
  return !/(₩|원\b|클로버\s*\d|🍀\s*\d)/u.test(body);
}
