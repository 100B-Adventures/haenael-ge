"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Clock3, LoaderCircle, ShieldCheck } from "lucide-react";
import { createCashoutRequest } from "@/app/(receiver)/cashout/actions";
import { trackEvent } from "@/lib/analytics";
import { normalizeKoreanMobilePhone } from "@/lib/phone";
import {
  CASHOUT_BANKS,
  CASHOUT_STATUS_LABELS,
  type CashoutRecord,
  cashoutBankName,
  formatCashoutKrw,
  maskAccountNumber,
} from "@/lib/cashout";

type Props = {
  cashoutEnabled: boolean;
  reachedThreshold: boolean;
  payableAmount: number;
  minCashoutClover: number;
  currentCashout: CashoutRecord | null;
  history: CashoutRecord[];
  initialPhone: string | null;
};

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
  minCashoutClover,
  currentCashout,
  history,
  initialPhone,
}: Props) {
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [cloverAmount, setCloverAmount] = useState(
    Math.min(Math.max(minCashoutClover, 0), payableAmount),
  );
  const [bankCode, setBankCode] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState<Success | null>(null);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);

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
  const grossKrw = cloverAmount * 1000;
  const withholdingKrw = Math.floor((grossKrw * 33) / 1000);
  const netKrw = grossKrw - withholdingKrw;
  const hasPendingCashout = currentCashout?.status === "REQUESTED";
  const canRequest =
    cashoutEnabled &&
    reachedThreshold &&
    payableAmount >= minCashoutClover &&
    !hasPendingCashout;

  function validate() {
    if (
      !Number.isInteger(cloverAmount) ||
      cloverAmount < minCashoutClover ||
      cloverAmount > payableAmount
    ) {
      return `${minCashoutClover}~${payableAmount}클로버 사이로 입력해주세요.`;
    }
    if (!bankCode) return "은행을 선택해주세요.";
    if (!/^[0-9]{8,20}$/.test(normalizedAccountNo)) {
      return "계좌번호를 숫자로 정확히 입력해주세요.";
    }
    if (normalizedHolder.length < 2 || normalizedHolder.length > 40) {
      return "예금주명을 정확히 입력해주세요.";
    }
    if (!normalizedPhone) {
      return "전화번호를 숫자로 정확히 입력해주세요.";
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
    setStep("confirm");
  }

  async function submitConfirmed() {
    const validationError = validate();
    setErrorMessage(validationError);
    if (validationError || !idempotencyRef.current) {
      setStep("form");
      return;
    }

    setSubmitting(true);
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
        setErrorMessage(result.message);
        if (result.code === "request_key_conflict") {
          idempotencyRef.current = null;
          setStep("form");
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
      setStep("done");
      trackEvent("cashout_initiated", {
        clover_amount: cloverAmount,
        status: result.data.status,
      });
    } catch {
      setErrorMessage("환전 신청 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {hasPendingCashout && currentCashout ? (
        <div className="rounded-[16px] border border-[#E8D3A6] bg-[#FBF1DD] p-4" data-testid="cashout-pending-block">
          <p className="text-[14px] font-extrabold text-[#B4791F]">
            이미 처리 중인 신청이 있어요
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#8A6218]">
            {new Date(currentCashout.requested_at).toLocaleDateString("ko-KR")}에 신청한{" "}
            <strong>{formatCashoutKrw(currentCashout.net_krw)}</strong> 건을 확인하고 있어요.
            한 번에 한 건씩만 신청할 수 있어요.
          </p>
          <Link
            href="/cashout/status"
            className="mt-4 block rounded-[14px] bg-[#1B8A4F] px-4 py-3 text-center text-[13px] font-extrabold text-white"
          >
            진행 상태 보기
          </Link>
        </div>
      ) : canRequest && step === "form" ? (
        <form
          onSubmit={review}
          className="space-y-4 rounded-[16px] border border-[#E8E4DC] bg-white p-4 sm:p-5"
          data-testid="cashout-request-form"
        >
          <div>
            <label htmlFor="cashout-clover-amount" className="mb-1.5 block text-[12.5px] font-bold text-[#16140F]">
              환전할 클로버
            </label>
            <div className="flex items-center gap-2">
              <input
                id="cashout-clover-amount"
                type="number"
                min={minCashoutClover}
                max={payableAmount}
                step={1}
                value={cloverAmount}
                onChange={(event) => setCloverAmount(Number(event.target.value))}
                className="min-w-0 flex-1 rounded-xl border border-[#D8D2C8] px-3 py-3 text-sm outline-none focus:border-[#1B8A4F]"
                required
              />
              <span className="text-sm font-bold text-[#14613A]">클로버</span>
            </div>
            <p className="mt-1 text-[11px] text-[#6F6A60]">
              최소 {minCashoutClover}개 · 현재 지급 가능 {payableAmount}개
            </p>
          </div>

          <div>
            <label htmlFor="cashout-bank" className="mb-1.5 block text-[12.5px] font-bold text-[#16140F]">은행</label>
            <select
              id="cashout-bank"
              value={bankCode}
              onChange={(event) => setBankCode(event.target.value)}
              className="w-full rounded-xl border border-[#D8D2C8] bg-white px-3 py-3 text-sm outline-none focus:border-[#1B8A4F]"
              required
            >
              <option value="">은행을 선택해주세요</option>
              {CASHOUT_BANKS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="cashout-account" className="mb-1.5 block text-[12.5px] font-bold text-[#16140F]">계좌번호</label>
            <input
              id="cashout-account"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={accountNo}
              onChange={(event) => setAccountNo(event.target.value)}
              className="w-full rounded-xl border border-[#D8D2C8] px-3 py-3 text-sm outline-none focus:border-[#1B8A4F]"
              placeholder="하이픈 없이 숫자만 입력"
              required
            />
          </div>

          <div>
            <label htmlFor="cashout-holder" className="mb-1.5 block text-[12.5px] font-bold text-[#16140F]">예금주</label>
            <input
              id="cashout-holder"
              type="text"
              autoComplete="name"
              maxLength={40}
              value={accountHolder}
              onChange={(event) => setAccountHolder(event.target.value)}
              className="w-full rounded-xl border border-[#D8D2C8] px-3 py-3 text-sm outline-none focus:border-[#1B8A4F]"
              required
            />
            <p className="mt-1 text-[10.5px] leading-relaxed text-[#9C968B]">
              본인 명의 계좌만 입금할 수 있어요. 예금주가 다르면 반려돼요.
            </p>
          </div>

          <div>
            <label htmlFor="cashout-phone" className="mb-1.5 block text-[12.5px] font-bold text-[#16140F]">전화번호</label>
            <input
              id="cashout-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              aria-required="true"
              className="w-full rounded-xl border border-[#D8D2C8] px-3 py-3 text-sm outline-none focus:border-[#1B8A4F]"
              placeholder="010-1234-5678"
              data-testid="cashout-phone"
            />
            <p className="mt-1 text-[10.5px] leading-relaxed text-[#9C968B]">
              지급 완료 안내를 보내드릴 번호예요. 신청할 때 최신 번호로 저장해요.
            </p>
          </div>

          <div className="rounded-xl bg-[#E7F4EC] p-3" data-testid="cashout-live-preview">
            <p className="text-[12px] leading-6 text-[#3D7A5A]">
              {formatCashoutKrw(grossKrw)} 요청 → 원천징수 {formatCashoutKrw(withholdingKrw)} →{" "}
              <strong className="text-[#14613A]">{formatCashoutKrw(netKrw)} 입금</strong>
            </p>
          </div>
          <div className="flex gap-2 rounded-xl bg-[#F4EFE6] p-3 text-[11px] leading-relaxed text-[#6F6A60]">
            <ShieldCheck size={17} className="shrink-0 text-[#1B8A4F]" aria-hidden="true" />
            <p>
              계좌는 암호화해 보관하고 입금 처리에만 사용해요. 관리자가 전체 계좌를 보면 열람 기록이 남아요.{" "}
              <Link href="/privacy" className="font-semibold underline">개인정보처리방침</Link>
            </p>
          </div>

          {errorMessage && <p role="alert" className="text-[12px] font-semibold text-[#B42318]">{errorMessage}</p>}
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-[15px] bg-[#1B8A4F] py-4 text-[15px] font-extrabold text-white"
            data-testid="cashout-confirm-button"
          >
            환전 신청하기
          </button>
        </form>
      ) : canRequest && step === "confirm" ? (
        <section className="space-y-4" data-testid="cashout-confirm-step">
          <div className="rounded-[16px] border border-[#E8E4DC] bg-white p-4">
            <h2 className="text-[16px] font-black text-[#16140F]">이 계좌가 맞나요?</h2>
            <dl className="mt-3 divide-y divide-[#F2EEE6] text-[12.5px]">
              <div className="flex justify-between gap-4 py-3"><dt className="text-[#6F6A60]">보내는 곳</dt><dd className="text-right font-bold">{cashoutBankName(bankCode)} {accountNo}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-[#6F6A60]">예금주</dt><dd className="font-bold">{normalizedHolder}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-[#6F6A60]">받으실 금액</dt><dd className="text-[15px] font-extrabold text-[#14613A]">{formatCashoutKrw(netKrw)}</dd></div>
            </dl>
          </div>
          <div className="rounded-[14px] border border-[#E8D3A6] bg-[#FBF1DD] p-4">
            <p className="text-[13.5px] font-extrabold text-[#B4791F]">신청하면 클로버 {cloverAmount}개가 잠겨요</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#8A6218]">지급이 끝날 때까지 잔액에 환전 진행중으로 보여요. 반려되면 그대로 돌아옵니다.</p>
          </div>
          {errorMessage && <p role="alert" className="text-[12px] font-semibold text-[#B42318]">{errorMessage}</p>}
          <button
            type="button"
            onClick={submitConfirmed}
            disabled={submitting}
            className="flex w-full items-center justify-center rounded-[15px] bg-[#1B8A4F] py-4 text-[15px] font-extrabold text-white disabled:opacity-60"
            data-testid="cashout-submit-button"
          >
            {submitting ? <><LoaderCircle className="mr-2 animate-spin" size={18} aria-hidden="true" />신청 중</> : "이 계좌로 신청하기"}
          </button>
          <button type="button" onClick={() => setStep("form")} className="w-full rounded-[15px] border border-[#E8E4DC] bg-white py-3 text-[13px] font-bold text-[#6F6A60]">계좌 다시 입력</button>
        </section>
      ) : canRequest && step === "done" && success ? (
        <section className="space-y-4" data-testid="cashout-request-success" role="status">
          <div className="rounded-[16px] border border-[#B7DFC5] bg-[#F1FAF4] p-6 text-center">
            <p className="text-[30px]">🍀</p>
            <h2 className="mt-2 text-[17px] font-black text-[#14613A]">환전 신청이 접수됐어요</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-[#3D7A5A]">
              {cashoutBankName(success.bankCode)} {success.accountMasked} ({success.accountHolder})<br />
              <strong className="text-[15px]">{formatCashoutKrw(success.netKrw)}</strong>을 1~3영업일 안에 보내드릴게요.
            </p>
          </div>
          <Link href="/cashout/status" className="block rounded-[15px] bg-[#1B8A4F] py-4 text-center text-[14px] font-extrabold text-white">진행 상태 보기</Link>
          <Link href="/me" className="block rounded-[15px] border border-[#E8E4DC] bg-white py-3 text-center text-[13px] font-bold text-[#6F6A60]">홈으로</Link>
        </section>
      ) : (
        <div className="flex flex-col items-center rounded-[15px] bg-[#F4EFE6] py-5 text-center" data-testid="cashout-confirm-disabled">
          <Clock3 className="mb-2 text-[#1B8A4F]" size={22} aria-hidden="true" />
          <p className="text-[13.5px] font-bold text-[#16140F]">
            {!cashoutEnabled ? "환전 기능을 준비하고 있어요" : "친구 응원분 30클로버부터 신청할 수 있어요"}
          </p>
          <p className="mt-1 max-w-[260px] text-[11.5px] leading-relaxed text-[#6F6A60]">환전은 최소 30클로버부터 가능해요. 지금 쌓인 클로버는 그대로 보관됩니다.</p>
        </div>
      )}

      {history.length > 0 && step !== "done" && (
        <section className="mt-6" aria-labelledby="cashout-history-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="cashout-history-title" className="text-[15px] font-extrabold text-[#16140F]">환전 내역</h2>
            <Link href="/cashout/history" className="text-[11.5px] font-bold text-[#1B8A4F]">전체 보기 ›</Link>
          </div>
          <div className="space-y-2">
            {history.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href={item.status === "REQUESTED" ? "/cashout/status" : "/cashout/history"}
                className="block rounded-xl border border-[#E8E4DC] bg-white p-3"
                data-testid={`cashout-history-${item.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12.5px] font-bold text-[#16140F]">{formatCashoutKrw(item.net_krw)}</p>
                  <span className="rounded-full bg-[#E7F4EC] px-2 py-1 text-[10.5px] font-bold text-[#14613A]">{CASHOUT_STATUS_LABELS[item.status]}</span>
                </div>
                <p className="mt-1 text-[10px] text-[#9C968B]">{new Date(item.requested_at).toLocaleString("ko-KR")}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
