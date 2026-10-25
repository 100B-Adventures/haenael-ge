"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
        {loading ? "확인 중…" : "회원 탈퇴"}
      </button>
      {error && <p className="social-error" role="alert">탈퇴 가능 여부를 확인하지 못했어요. 다시 시도해 주세요.</p>}
      {open && eligibility && (
        <div className="account-withdrawal-dialog" role="dialog" aria-modal="true" aria-labelledby="account-withdrawal-title">
          <div>
            <h3 id="account-withdrawal-title">회원 탈퇴 안내</h3>
            {eligibility.eligible
              ? <p>회원 탈퇴는 고객센터 문의로 접수해요. 개인정보 보유기간은 개인정보처리방침에서 확인할 수 있어요.</p>
              : (
                <div className="account-withdrawal-reasons" role="status">
                  {eligibility.blocked_reasons.clover_balance && <p>남은 클로버를 먼저 환전하거나 정리해 주세요.</p>}
                  {eligibility.blocked_reasons.cashout && <p>진행 중인 환전이 끝난 뒤 탈퇴를 접수해 주세요.</p>}
                </div>
              )}
            <Link href="/privacy">개인정보처리방침 확인</Link>
            <button type="button" onClick={() => setOpen(false)}>닫기</button>
          </div>
        </div>
      )}
    </>
  );
}
