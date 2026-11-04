"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-social-accountwithdrawalbutton";

type WithdrawalEligibility = {
  eligible: boolean;
  clover_balance: number;
  pending_cashout_count: number;
  support_request_required: true;
  blocked_reasons: {
    clover_balance?: "nonzero_clover_balance";
    cashout?: "cashout_in_progress";
  };
};

export function AccountWithdrawalButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<WithdrawalEligibility | null>(null);
  const [error, setError] = useState(false);

  async function openWithdrawal() {
    setLoading(true);
    setError(false);
    try {
      const { data, error: rpcError } = await createClient().rpc("account_withdrawal_eligibility");
      if (rpcError || !data) {
        setError(true);
        return;
      }
      setEligibility(data as WithdrawalEligibility);
      setOpen(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="account-withdrawal-button" disabled={loading} onClick={() => void openWithdrawal()}>
        {loading ? PRODUCT_COPY.TEXT_001 : PRODUCT_COPY.TEXT_002}
      </button>
      {error && <p className="social-error" role="alert">{PRODUCT_COPY.TEXT_003}</p>}
      {open && eligibility && (
        <div className="account-withdrawal-dialog" role="dialog" aria-modal="true" aria-labelledby="account-withdrawal-title">
          <div>
            <h3 id="account-withdrawal-title">{PRODUCT_COPY.TEXT_004}</h3>
            {eligibility.eligible
              ? <p>{PRODUCT_COPY.TEXT_005}</p>
              : (
                <div className="account-withdrawal-reasons" role="status">
                  {eligibility.blocked_reasons.clover_balance && <p>{PRODUCT_COPY.TEXT_006}</p>}
                  {eligibility.blocked_reasons.cashout && <p>{PRODUCT_COPY.TEXT_007}</p>}
                </div>
              )}
            <Link href="/privacy">{PRODUCT_COPY.TEXT_008}</Link>
            <button type="button" onClick={() => setOpen(false)}>{PRODUCT_COPY.TEXT_009}</button>
          </div>
        </div>
      )}
    </>
  );
}
