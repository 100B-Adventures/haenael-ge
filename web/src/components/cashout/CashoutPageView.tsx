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
        <h1 className="receiver-page-title mb-6 sm:text-[length:var(--text-page-title-desktop)]!">
          환전 전에
          <br className="sm:hidden" /> 정직하게 보여드릴게요
        </h1>
      ) : screen === "confirm" ? (
        <h1 className="receiver-page-title mb-4 sm:text-[length:var(--text-page-title-desktop)]!">
          이 계좌가 맞나요?
        </h1>
      ) : screen === "submitting" ? (
        <h1 className="receiver-page-title mb-4 sm:text-[length:var(--text-page-title-desktop)]!">
          잠깐 기다리는 동안에도 지금 하는 일을 알려드려요
        </h1>
      ) : null}

      {isFormScreen && !reachedThreshold && (
        <div
          className="mb-4 rounded-md border border-border bg-muted px-4 py-3"
          data-testid="cashout-below-threshold-banner"
          role="status"
        >
          <p className="text-sm font-bold text-foreground">
            조금만 더 모으면 환전할 수 있어요
          </p>
          <p className="mt-1 text-[length:var(--text-label-small)]! leading-relaxed text-muted-foreground">
            지금 🍀 {totalBalance}개(웰컴 포함) · 최소 환전 {minCashoutClover}
            개까지{" "}
            <strong className="text-accent-foreground">{remaining}개</strong>{" "}
            남았어요. 쌓인 클로버는 그대로 보관돼요.
          </p>
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
                <span className="text-[13px] text-muted-foreground">
                  모인 클로버 (웰컴 포함)
                </span>
                <span
                  className="text-[13px] font-bold text-foreground"
                  data-testid="breakdown-total"
                >
                  🍀 {totalBalance}개
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] text-[var(--faint)]">
                  − 해낼게 웰컴 (지급 대상 아님)
                </span>
                <span
                  className="text-[13px] font-bold text-[var(--faint)]"
                  data-testid="breakdown-welcome"
                >
                  − 🍀 {welcomeAmount}개
                </span>
              </div>
              <div className="my-2 border-t border-border" />
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] font-bold text-foreground">
                  친구 응원분 (지급 대상)
                </span>
                <span
                  className="text-sm font-extrabold text-accent-foreground"
                  data-testid="breakdown-payable"
                >
                  🍀 {payableAmount}개
                </span>
              </div>
            </div>

            <div
              className="mb-4 rounded-md bg-accent p-4 sm:p-6"
              data-testid="cashout-net-preview"
            >
              <div className="flex items-center justify-between py-1.5 text-[12.5px] text-accent-foreground">
                <span>환산 (🍀1개 = 1,000원)</span>
                <strong>{formatCashoutKrw(grossKrw)}</strong>
              </div>
              <div className="flex items-center justify-between py-1.5 text-[12.5px] text-accent-foreground">
                <span>서비스 이용료 (부가세 포함)</span>
                <strong data-testid="cashout-fee-amount">
                  − {formatCashoutKrw(feeTotalKrw)}
                </strong>
              </div>
              <div className="flex items-center justify-between py-1.5 text-[12.5px] text-accent-foreground">
                <span>사업소득 원천징수 3.3%</span>
                <strong data-testid="cashout-withholding-amount">
                  − {formatCashoutKrw(withholdingKrw)}
                </strong>
              </div>
              <div className="my-2 border-t border-accent-foreground/20" />
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm font-bold text-foreground">
                  받으실 금액
                </span>
                <strong
                  className="text-lg font-extrabold text-accent-foreground"
                  data-testid="cashout-net-amount"
                >
                  {formatCashoutKrw(netKrwPreview)}
                </strong>
              </div>
              <p className="mt-2 text-[length:var(--text-meta-micro)]! leading-relaxed text-muted-foreground">
                서비스 이용료는 커피 한 잔 값이에요. 카드 결제 수수료, 응원 알림
                발송, 계좌 확인과 송금에 쓰입니다. 소득세는 저희가 가져가는 돈이
                아니라 국세청에 대신 내드리는 금액이에요. 다음 해 5월에
                종합소득세 신고하시면 돌려받으실 수도 있어요. 실제 지급액은 신청
                시점에 다시 확정합니다.
              </p>
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

      {isFormScreen && <BackHomeLink />}
    </ReceiverPageShell>
  );
}
