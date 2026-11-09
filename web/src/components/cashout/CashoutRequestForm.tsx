"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Clock3, LoaderCircle, ShieldCheck } from "lucide-react";
import { createCashoutRequest } from "@/app/(receiver)/cashout/actions";
import { PhoneConsentNotice } from "@/components/auth/PhoneConsentNotice";
import { PrivacyPolicyLink } from "@/components/common/LegalFooter";
import { trackEvent } from "@/lib/analytics";
import { normalizeKoreanMobilePhone } from "@/lib/phone";
import {
  CASHOUT_BANKS,
  CASHOUT_STATUS_LABELS,
  type CashoutRecord,
  cashoutBankName,
  formatCashoutDate,
  formatCashoutDateTime,
  formatCashoutKrw,
  maskAccountNumber,
} from "@/lib/cashout";
import { KRW_PER_CLOVER, calcCashoutFee } from "@/lib/cashout-fee";
import { getCashoutErrorMessage } from "@/lib/cashout-errors";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-cashout-cashoutrequestform";

type Props = {
  cashoutEnabled: boolean;
  reachedThreshold: boolean;
  payableAmount: number;
  /** 총 클로버(총량). 확인 배너의 "모은 N개는 그대로" 문구용. A안(DESIGN §6-(d)) */
  totalBalance: number;
  minCashoutClover: number;
  currentCashout: CashoutRecord | null;
  history: CashoutRecord[];
  initialPhone: string | null;
  onScreenChange?: (screen: CashoutFlowScreen) => void;
};

export type CashoutFlowScreen = "form" | "confirm" | "submitting" | "done";

type Success = {
  requestId: number;
  status: "REQUESTED";
  grossKrw: number;
  withholdingKrw: number;
  netKrw: number;
  accountMasked: string;
  bankCode: string;
  accountHolder: string;
};

function createRequestKey() {
  return `cashout_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function CashoutRequestForm({
  cashoutEnabled,
  reachedThreshold,
  payableAmount,
  totalBalance,
  minCashoutClover,
  currentCashout,
  history,
  initialPhone,
  onScreenChange,
}: Props) {
  const [screen, setScreen] = useState<CashoutFlowScreen>("form");
  // 최소 환전 기준은 총 보유(웰컴 포함)로 판정하고, 실제 환전액은 친구 응원분으로
  // 제한한다. 그래서 기본값은 payableAmount 를 그대로 쓴다. 최소 기준을 넘겼는데도
  // 웰컴분 때문에 payableAmount 가 minCashoutClover 보다 작을 수 있기 때문이다.
  const [cloverAmount, setCloverAmount] = useState(payableAmount);
  const [bankCode, setBankCode] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState<Success | null>(null);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(
    null,
  );

  const normalizedAccountNo = useMemo(
    () => accountNo.replace(/[\s-]/g, ""),
    [accountNo],
  );
  const normalizedHolder = useMemo(
    () => accountHolder.normalize("NFKC").trim().replace(/\s+/g, " "),
    [accountHolder],
  );
  const normalizedPhone = useMemo(
    () => normalizeKoreanMobilePhone(phone),
    [phone],
  );
  const { grossKrw, feeTotalKrw, withholdingKrw, netKrw } = calcCashoutFee(
    cloverAmount * KRW_PER_CLOVER,
  );
  const hasPendingCashout = currentCashout?.status === "REQUESTED";
  const canRequest =
    cashoutEnabled &&
    reachedThreshold &&
    totalBalance >= minCashoutClover &&
    payableAmount > 0 &&
    !hasPendingCashout;

  function changeScreen(nextScreen: CashoutFlowScreen) {
    setScreen(nextScreen);
    onScreenChange?.(nextScreen);
  }

  function validate() {
    if (!Number.isInteger(cloverAmount)) {
      return "클로버는 한 개 단위로 입력해 주세요.";
    }
    if (cloverAmount < 1) {
      return "환전할 클로버를 한 개 이상 입력해 주세요.";
    }
    if (totalBalance < minCashoutClover) {
      return `환전하려면 클로버가 최소 ${minCashoutClover}개 필요해요.`;
    }
    if (cloverAmount > payableAmount) {
      return `지금 환전할 수 있는 클로버는 ${payableAmount}개예요. ${payableAmount}개 이하로 입력해 주세요.`;
    }
    if (!bankCode) return "입금받을 은행을 선택해 주세요.";
    if (!/^[0-9]{8,20}$/.test(normalizedAccountNo)) {
      return "계좌번호를 하이픈 없이 숫자 8~20자로 입력해 주세요.";
    }
    if (normalizedHolder.length < 2 || normalizedHolder.length > 40) {
      return "예금주 이름을 2~40자로 입력해 주세요.";
    }
    if (!normalizedPhone) {
      return "입금 완료 안내를 받을 휴대전화 번호를 입력해 주세요.";
    }
    return "";
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    setErrorMessage(validationError);
    if (validationError) return;

    const fingerprint = [
      cloverAmount,
      bankCode,
      normalizedAccountNo,
      normalizedHolder,
      normalizedPhone,
    ].join("|");
    if (idempotencyRef.current?.fingerprint !== fingerprint) {
      idempotencyRef.current = { fingerprint, key: createRequestKey() };
    }
    changeScreen("confirm");
  }

  async function submitConfirmed() {
    const validationError = validate();
    setErrorMessage(validationError);
    if (validationError || !idempotencyRef.current) {
      changeScreen("form");
      return;
    }

    setErrorMessage("");
    changeScreen("submitting");
    try {
      const result = await createCashoutRequest({
        cloverAmount,
        bankCode,
        accountNo,
        accountHolder,
        phone,
        requestKey: idempotencyRef.current.key,
      });
      if (!result.ok) {
        setErrorMessage(getCashoutErrorMessage(result.code));
        if (result.code === "request_key_conflict") {
          idempotencyRef.current = null;
          changeScreen("form");
        } else {
          changeScreen("confirm");
        }
        return;
      }

      setSuccess({
        requestId: result.data.requestId,
        status: result.data.status,
        grossKrw: result.data.grossKrw,
        withholdingKrw: result.data.withholdingKrw,
        netKrw: result.data.netKrw,
        accountMasked: maskAccountNumber(normalizedAccountNo),
        bankCode,
        accountHolder: normalizedHolder,
      });
      setAccountNo("");
      changeScreen("done");
      trackEvent("cashout_initiated", {
        clover_amount: cloverAmount,
        status: result.data.status,
      });
    } catch {
      setErrorMessage(
        "환전 신청 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.",
      );
      changeScreen("confirm");
    }
  }

  return (
    <div>
      {screen === "form" && (
        <PhoneConsentNotice
          hasPhone={Boolean(initialPhone)}
          redirectPath="/cashout"
          context="cashout"
        />
      )}
      {hasPendingCashout &&
      currentCashout &&
      !(screen === "done" && success) ? (
        <div
          className="rounded-md border border-amber-line bg-amber-soft p-4"
          data-testid="cashout-pending-block"
        >
          <p className="text-sm font-extrabold text-amber-ink">{PRODUCT_COPY.TEXT_001}</p>
          <p className="mt-1 text-[length:var(--text-meta-micro)]! leading-relaxed text-amber-ink">
            {formatCashoutDate(currentCashout.requested_at)}{PRODUCT_COPY.TEXT_002}{" "}
            <strong>{formatCashoutKrw(currentCashout.net_krw)}</strong>{PRODUCT_COPY.TEXT_003}</p>
          <Link
            href="/cashout/status"
            className="mt-4 block rounded-md bg-primary px-4 py-3 text-center text-[13px] font-extrabold text-primary-foreground"
          >{PRODUCT_COPY.TEXT_004}</Link>
        </div>
      ) : canRequest && screen === "form" ? (
        <form
          onSubmit={review}
          noValidate
          className="space-y-4 rounded-md border border-border bg-card p-4 sm:p-5"
          data-testid="cashout-request-form"
        >
          <div>
            <label
              htmlFor="cashout-clover-amount"
              className="mb-1.5 block text-[12.5px] font-bold text-foreground"
            >{PRODUCT_COPY.TEXT_005}</label>
            <div className="flex items-center gap-2">
              <input
                id="cashout-clover-amount"
                type="number"
                min={1}
                max={payableAmount}
                step={1}
                value={cloverAmount}
                onChange={(event) => {
                  const nextAmount = Number(event.target.value);
                  const browserMessage =
                    nextAmount < 1
                      ? PRODUCT_COPY.TEXT_006
                      : nextAmount > payableAmount
                        ? `지금 환전할 수 있는 클로버는 ${payableAmount}개예요. ${payableAmount}개 이하로 입력해 주세요.`
                        : "";
                  event.currentTarget.setCustomValidity(browserMessage);
                  setCloverAmount(nextAmount);
                }}
                className="min-w-0 flex-1 rounded-sm border border-border px-3 py-3 text-sm outline-none focus:border-primary"
                required
              />
              <span className="text-sm font-bold text-accent-foreground">{PRODUCT_COPY.TEXT_007}</span>
            </div>
            <p className="mt-1 text-[length:var(--text-meta-micro)]! text-muted-foreground">
              {`환전 기준: 모인 클로버 ${minCashoutClover}개 이상 · 지금 지급 가능 ${payableAmount}개`}
            </p>
          </div>

          <div>
            <label
              htmlFor="cashout-bank"
              className="mb-1.5 block text-[12.5px] font-bold text-foreground"
            >{PRODUCT_COPY.TEXT_008}</label>
            <select
              id="cashout-bank"
              value={bankCode}
              onChange={(event) => setBankCode(event.target.value)}
              className="w-full rounded-sm border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary"
              required
            >
              <option value="">{PRODUCT_COPY.TEXT_009}</option>
              {CASHOUT_BANKS.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="cashout-account"
              className="mb-1.5 block text-[12.5px] font-bold text-foreground"
            >{PRODUCT_COPY.TEXT_010}</label>
            <input
              id="cashout-account"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={accountNo}
              onChange={(event) => setAccountNo(event.target.value)}
              className="w-full rounded-sm border border-border px-3 py-3 text-sm outline-none focus:border-primary"
              placeholder={PRODUCT_COPY.TEXT_011}
              required
            />
          </div>

          <div>
            <label
              htmlFor="cashout-holder"
              className="mb-1.5 block text-[12.5px] font-bold text-foreground"
            >{PRODUCT_COPY.TEXT_012}</label>
            <input
              id="cashout-holder"
              type="text"
              autoComplete="name"
              maxLength={40}
              value={accountHolder}
              onChange={(event) => setAccountHolder(event.target.value)}
              className="w-full rounded-sm border border-border px-3 py-3 text-sm outline-none focus:border-primary"
              required
            />
            <p className="mt-1 text-[length:var(--text-meta-micro)]! leading-relaxed text-[var(--muted-color)]">{PRODUCT_COPY.TEXT_013}</p>
          </div>

          <div>
            <label
              htmlFor="cashout-phone"
              className="mb-1.5 block text-[12.5px] font-bold text-foreground"
            >{PRODUCT_COPY.TEXT_014}</label>
            <input
              id="cashout-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              aria-required="true"
              className="w-full rounded-sm border border-border px-3 py-3 text-sm outline-none focus:border-primary"
              placeholder="010-1234-5678"
              data-testid="cashout-phone"
            />
            <p className="mt-1 text-[length:var(--text-meta-micro)]! leading-relaxed text-[var(--muted-color)]">{PRODUCT_COPY.TEXT_015}</p>
          </div>

          <div
            className="rounded-sm bg-accent p-3"
            data-testid="cashout-live-preview"
          >
            <p className="text-[length:var(--text-meta-micro)]! leading-6 text-accent-foreground">
              {formatCashoutKrw(grossKrw)}{PRODUCT_COPY.TEXT_016}{" "}
              {formatCashoutKrw(feeTotalKrw)}{PRODUCT_COPY.TEXT_017}{" "}
              {formatCashoutKrw(withholdingKrw)} →{" "}
              <strong>{formatCashoutKrw(netKrw)}{PRODUCT_COPY.TEXT_018}</strong>
            </p>
          </div>
          <div className="flex gap-2 rounded-sm bg-muted p-3 text-[length:var(--text-meta-micro)]! leading-relaxed text-muted-foreground">
            <ShieldCheck
              size={17}
              className="shrink-0 text-primary"
              aria-hidden="true"
            />
            <p>{PRODUCT_COPY.TEXT_019}{" "}
              <PrivacyPolicyLink className="font-semibold underline" />
            </p>
          </div>

          {errorMessage && (
            <p role="alert" className="text-[length:var(--text-meta-micro)]! font-semibold text-danger-ink">
              {errorMessage}
            </p>
          )}
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-md bg-primary py-4 text-[15px] font-extrabold text-primary-foreground"
            data-testid="cashout-confirm-button"
          >{PRODUCT_COPY.TEXT_021}</button>
        </form>
      ) : canRequest && (screen === "confirm" || screen === "submitting") ? (
        <section
          className="space-y-4"
          data-testid="cashout-confirm-step"
          aria-busy={screen === "submitting"}
        >
          {screen === "submitting" ? (
            <div
              className="space-y-4"
              role="status"
              aria-live="polite"
              aria-busy="true"
              data-testid="cashout-submitting-state"
            >
              <div className="rounded-md border border-border bg-card p-3">
                <dl className="divide-y divide-border text-[12.5px]">
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-muted-foreground">{PRODUCT_COPY.TEXT_022}</dt>
                    <dd className="text-right font-bold">
                      {cashoutBankName(bankCode)}{" "}
                      {maskAccountNumber(normalizedAccountNo)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-muted-foreground">{PRODUCT_COPY.TEXT_023}</dt>
                    <dd className="font-bold">{normalizedHolder}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="font-bold text-foreground">{PRODUCT_COPY.TEXT_024}</dt>
                    <dd className="text-[19px] font-extrabold text-accent-foreground">
                      {formatCashoutKrw(netKrw)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-md border border-border bg-card p-4">
                <p className="text-[length:var(--text-label-small)]! font-bold text-accent-foreground">{PRODUCT_COPY.TEXT_025}</p>
                <p className="mt-2 text-[19px] font-black text-foreground">{PRODUCT_COPY.TEXT_026}</p>
                <p className="mt-2 text-[length:var(--text-meta-micro)]! leading-relaxed text-muted-foreground">{PRODUCT_COPY.TEXT_027}</p>
                <div
                  className="mt-5 flex min-h-14 items-center justify-center gap-2 rounded-md bg-primary text-[15px] font-extrabold text-primary-foreground"
                  aria-disabled="true"
                >
                  <LoaderCircle
                    className="animate-spin"
                    size={18}
                    aria-hidden="true"
                  />{PRODUCT_COPY.TEXT_028}</div>
              </div>
              <p className="rounded-sm bg-muted p-3 text-[length:var(--text-label-small)]! leading-relaxed text-muted-foreground">{PRODUCT_COPY.TEXT_029}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border bg-card p-3">
                <dl className="divide-y divide-border text-[12.5px]">
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-muted-foreground">{PRODUCT_COPY.TEXT_030}</dt>
                    <dd className="text-right font-bold">
                      {cashoutBankName(bankCode)} {accountNo}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-muted-foreground">{PRODUCT_COPY.TEXT_031}</dt>
                    <dd className="font-bold">{normalizedHolder}</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-muted-foreground">{PRODUCT_COPY.TEXT_032}</dt>
                    <dd className="text-[15px] font-extrabold text-accent-foreground">
                      {formatCashoutKrw(netKrw)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div
                className="rounded-md border border-amber-line bg-amber-soft p-3"
                data-testid="cashout-confirm-banner"
              >
                <p className="text-sm font-extrabold text-amber-ink">{PRODUCT_COPY.TEXT_033}{cloverAmount}{PRODUCT_COPY.TEXT_034}</p>
                <p className="mt-1 text-[length:var(--text-label-small)]! leading-relaxed text-amber-ink">{PRODUCT_COPY.TEXT_035}{totalBalance}{PRODUCT_COPY.TEXT_036}{cloverAmount}{PRODUCT_COPY.TEXT_037}{" "}
                  <b>{PRODUCT_COPY.TEXT_038}{cloverAmount}{PRODUCT_COPY.TEXT_039}</b>{PRODUCT_COPY.TEXT_040}</p>
              </div>
              {errorMessage && (
                <p
                  role="alert"
                  className="text-[length:var(--text-meta-micro)]! font-semibold text-danger-ink"
                >
                  {errorMessage}
                </p>
              )}
              <button
                type="button"
                onClick={submitConfirmed}
                className="flex w-full items-center justify-center rounded-md bg-primary py-4 text-[15px] font-extrabold text-primary-foreground"
                data-testid="cashout-submit-button"
              >{PRODUCT_COPY.TEXT_041}</button>
              <button
                type="button"
                onClick={() => changeScreen("form")}
                className="w-full rounded-md border border-border bg-card py-3 text-[13px] font-bold text-muted-foreground"
              >{PRODUCT_COPY.TEXT_042}</button>
            </>
          )}
        </section>
      ) : screen === "done" && success ? (
        <section
          className="space-y-4"
          data-testid="cashout-request-success"
          role="status"
        >
          <div className="rounded-md border border-primary/30 bg-accent p-6 text-center">
            <p className="text-[30px]">🍀</p>
            <h2 className="mt-2 text-[17px] font-black text-accent-foreground">{PRODUCT_COPY.TEXT_043}</h2>
            <p className="mt-2 text-[length:var(--text-meta-micro)]! leading-relaxed text-accent-foreground">
              {cashoutBankName(success.bankCode)} {success.accountMasked} (
              {success.accountHolder})<br />
              <strong className="text-[15px]">
                {formatCashoutKrw(success.netKrw)}
              </strong>{PRODUCT_COPY.TEXT_044}</p>
          </div>
          <Link
            href="/cashout/status"
            className="block rounded-md bg-primary py-4 text-center text-sm font-extrabold text-primary-foreground"
          >{PRODUCT_COPY.TEXT_045}</Link>
          <Link
            href="/me"
            className="block rounded-md border border-border bg-card py-3 text-center text-[13px] font-bold text-muted-foreground"
          >{PRODUCT_COPY.TEXT_046}</Link>
        </section>
      ) : (
        <div
          className="flex flex-col items-center rounded-md bg-muted py-5 text-center"
          data-testid="cashout-confirm-disabled"
        >
          <Clock3 className="mb-2 text-primary" size={22} aria-hidden="true" />
          <p className="text-sm font-bold text-foreground">
            {!cashoutEnabled
              ? PRODUCT_COPY.TEXT_047
              : reachedThreshold
                ? PRODUCT_COPY.TEXT_048
                : PRODUCT_COPY.TEXT_049}
          </p>
          <p className="mt-1 max-w-64 text-[length:var(--text-label-small)]! leading-relaxed text-muted-foreground">
            {!cashoutEnabled
              ? PRODUCT_COPY.TEXT_050
              : reachedThreshold
                ? PRODUCT_COPY.TEXT_051
                : `환전 기준은 모인 클로버 ${minCashoutClover}개 이상이에요. 지금 모인 클로버는 그대로 보관돼요.`}
          </p>
        </div>
      )}

      {history.length > 0 && screen === "form" && (
        <section className="mt-6" aria-labelledby="cashout-history-title">
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="cashout-history-title"
              className="text-[15px] font-extrabold text-foreground"
            >{PRODUCT_COPY.TEXT_052}</h2>
            <Link
              href="/cashout/history"
              className="inline-flex min-h-11 items-center text-[length:var(--text-label-small)]! font-bold text-primary"
            >{PRODUCT_COPY.TEXT_053}</Link>
          </div>
          <div className="space-y-2">
            {history.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href={
                  item.status === "REQUESTED"
                    ? "/cashout/status"
                    : "/cashout/history"
                }
                className="block rounded-sm border border-border bg-card p-3"
                data-testid={`cashout-history-${item.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12.5px] font-bold text-foreground">
                    {formatCashoutKrw(item.net_krw)}
                  </p>
                  <span className="rounded-full bg-accent px-2 py-1 text-[length:var(--text-meta-micro)]! font-bold text-accent-foreground">
                    {CASHOUT_STATUS_LABELS[item.status]}
                  </span>
                </div>
                <p className="mt-1 text-[length:var(--text-meta-micro)]! text-[var(--muted-color)]">
                  {formatCashoutDateTime(item.requested_at)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
