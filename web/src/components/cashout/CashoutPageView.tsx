"use client";

import { useState } from "react";
import {
  BackHomeLink,
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";
import {
  CashoutRequestForm,
  type CashoutFlowScreen,
} from "@/components/cashout/CashoutRequestForm";
import { type CashoutRecord, formatCashoutKrw } from "@/lib/cashout";
import { KRW_PER_CLOVER, calcCashoutFee } from "@/lib/cashout-fee";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-cashout-cashoutpageview";

type Props = {
  cashoutEnabled: boolean;
  reachedThreshold: boolean;
  payableAmount: number;
  totalBalance: number;
  welcomeAmount: number;
  minCashoutClover: number;
  currentCashout: CashoutRecord | null;
  history: CashoutRecord[];
  initialPhone: string | null;
};

export function CashoutPageView({
  cashoutEnabled,
  reachedThreshold,
  payableAmount,
  totalBalance,
  welcomeAmount,
  minCashoutClover,
  currentCashout,
  history,
  initialPhone,
}: Props) {
  const [screen, setScreen] = useState<CashoutFlowScreen>("form");
  const remaining = Math.max(minCashoutClover - totalBalance, 0);
  const {
    grossKrw,
    feeTotalKrw,
    withholdingKrw,
    netKrw: netKrwPreview,
  } = calcCashoutFee(payableAmount * KRW_PER_CLOVER);
  const isFormScreen = screen === "form";

  return (
    <ReceiverPageShell
      testId="cashout-page"
      className={isFormScreen ? "" : "pb-8"}
    >
      <ReceiverTopBar variant="detail" />
      {isFormScreen ? (
        <h1 className="receiver-page-title mb-6 sm:text-[length:var(--text-page-title-desktop)]!">{PRODUCT_COPY.TEXT_001}<br className="sm:hidden" />{PRODUCT_COPY.TEXT_002}</h1>
      ) : screen === "confirm" ? (
        <h1 className="receiver-page-title mb-4 sm:text-[length:var(--text-page-title-desktop)]!">{PRODUCT_COPY.TEXT_003}</h1>
      ) : screen === "submitting" ? (
        <h1 className="receiver-page-title mb-4 sm:text-[length:var(--text-page-title-desktop)]!">{PRODUCT_COPY.TEXT_004}</h1>
      ) : null}

      {isFormScreen && !reachedThreshold && (
        <div
          className="mb-4 rounded-md border border-border bg-muted px-4 py-3"
          data-testid="cashout-below-threshold-banner"
          role="status"
        >
          <p className="text-sm font-bold text-foreground">{PRODUCT_COPY.TEXT_005}</p>
          <p className="mt-1 text-[length:var(--text-label-small)]! leading-relaxed text-muted-foreground">{PRODUCT_COPY.TEXT_006}{totalBalance}{PRODUCT_COPY.TEXT_007}{minCashoutClover}{PRODUCT_COPY.TEXT_008}{" "}
            <strong className="text-accent-foreground">{remaining}{PRODUCT_COPY.TEXT_009}</strong>{" "}{PRODUCT_COPY.TEXT_010}</p>
        </div>
      )}

      <div
        className={
          isFormScreen
            ? "grid gap-6 lg:grid-cols-[1.08fr_.92fr] lg:items-start"
            : `mx-auto max-w-2xl${screen === "submitting" ? " pt-1" : ""}`
        }
      >
        {isFormScreen && (
          <section data-testid="cashout-form-breakdown">
            <div
              className="mb-4 rounded-md border border-border bg-card p-4 sm:p-6"
              data-testid="cashout-breakdown-table"
            >
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] text-muted-foreground">{PRODUCT_COPY.TEXT_011}</span>
                <span
                  className="text-[13px] font-bold text-foreground"
                  data-testid="breakdown-total"
                >
                  🍀 {totalBalance}{PRODUCT_COPY.TEXT_012}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] text-[var(--muted-color)]">{PRODUCT_COPY.TEXT_013}</span>
                <span
                  className="text-[13px] font-bold text-[var(--muted-color)]"
                  data-testid="breakdown-welcome"
                >
                  − 🍀 {welcomeAmount}{PRODUCT_COPY.TEXT_014}</span>
              </div>
              <div className="my-2 border-t border-border" />
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] font-bold text-foreground">{PRODUCT_COPY.TEXT_015}</span>
                <span
                  className="text-sm font-extrabold text-accent-foreground"
                  data-testid="breakdown-payable"
                >
                  🍀 {payableAmount}{PRODUCT_COPY.TEXT_016}</span>
              </div>
            </div>

            <div
              className="mb-4 rounded-md bg-accent p-4 sm:p-6"
              data-testid="cashout-net-preview"
            >
              <div className="flex items-center justify-between py-1.5 text-[length:var(--text-meta-micro)]! text-accent-foreground">
                <span>{PRODUCT_COPY.TEXT_017}</span>
                <strong>{formatCashoutKrw(grossKrw)}</strong>
              </div>
              <div className="flex items-center justify-between py-1.5 text-[length:var(--text-meta-micro)]! text-accent-foreground">
                <span>{PRODUCT_COPY.TEXT_018}</span>
                <strong data-testid="cashout-fee-amount">
                  − {formatCashoutKrw(feeTotalKrw)}
                </strong>
              </div>
              <div className="flex items-center justify-between py-1.5 text-[length:var(--text-meta-micro)]! text-accent-foreground">
                <span>{PRODUCT_COPY.TEXT_019}</span>
                <strong data-testid="cashout-withholding-amount">
                  − {formatCashoutKrw(withholdingKrw)}
                </strong>
              </div>
              <div className="my-2 border-t border-accent-foreground/20" />
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm font-bold text-foreground">{PRODUCT_COPY.TEXT_020}</span>
                <strong
                  className="text-lg font-extrabold text-accent-foreground"
                  data-testid="cashout-net-amount"
                >
                  {formatCashoutKrw(netKrwPreview)}
                </strong>
              </div>
              <p className="mt-2 text-[length:var(--text-meta-micro)]! leading-relaxed text-muted-foreground">{PRODUCT_COPY.TEXT_021}</p>
            </div>
          </section>
        )}

        <aside className={isFormScreen ? "lg:sticky lg:top-6" : ""}>
          <CashoutRequestForm
            cashoutEnabled={cashoutEnabled}
            reachedThreshold={reachedThreshold}
            payableAmount={payableAmount}
            totalBalance={totalBalance}
            minCashoutClover={minCashoutClover}
            currentCashout={currentCashout}
            history={history}
            initialPhone={initialPhone}
            onScreenChange={setScreen}
          />
        </aside>
      </div>

      {isFormScreen && <BackHomeLink label={PRODUCT_COPY.TEXT_022} href="/my" />}
    </ReceiverPageShell>
  );
}
