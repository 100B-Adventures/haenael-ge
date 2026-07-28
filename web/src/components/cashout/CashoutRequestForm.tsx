"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Clock3, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";

type CashoutHistoryItem = {
  id: number;
  clover_amount: number;
  gross_krw: number;
  withholding_krw: number;
  net_krw: number;
  status: string;
  requested_at: string;
  paid_at: string | null;
};

type Props = {
  cashoutEnabled: boolean;
  reachedThreshold: boolean;
  payableAmount: number;
  minCashoutClover: number;
  history: CashoutHistoryItem[];
};

const BANKS = [
  ["KB", "KB국민은행"],
  ["SHINHAN", "신한은행"],
  ["WOORI", "우리은행"],
  ["HANA", "하나은행"],
  ["NH", "NH농협은행"],
  ["IBK", "IBK기업은행"],
  ["KAKAO", "카카오뱅크"],
  ["TOSS", "토스뱅크"],
  ["KBANK", "케이뱅크"],
  ["SC", "SC제일은행"],
  ["BUSAN", "부산은행"],
  ["DAEGU", "iM뱅크(대구은행)"],
  ["GWANGJU", "광주은행"],
  ["JEONBUK", "전북은행"],
  ["JEJU", "제주은행"],
] as const;

const statusLabels: Record<string, string> = {
  REQUESTED: "지급 대기",
  PAID: "지급 완료",
  REJECTED: "반려",
};

function formatKrw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function createRequestKey() {
  return `cashout_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function CashoutRequestForm({
  cashoutEnabled,
  reachedThreshold,
  payableAmount,
  minCashoutClover,
  history,
}: Props) {
  const [cloverAmount, setCloverAmount] = useState(
    Math.min(Math.max(minCashoutClover, 0), payableAmount),
  );
  const [bankCode, setBankCode] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState<{
    requestId: number;
    status: string;
    grossKrw: number;
    withholdingKrw: number;
    netKrw: number;
  } | null>(null);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const grossKrw = cloverAmount * 1000;
  // 요청 총액의 3.3%를 계산한 뒤 원 미만 절사 — 서버/DB와 동일 규칙.
  const withholdingKrw = Math.floor(grossKrw * 0.033);
  const netKrw = grossKrw - withholdingKrw;
  const canRequest =
    cashoutEnabled &&
    reachedThreshold &&
    payableAmount >= minCashoutClover;

  const normalizedAccountNo = useMemo(
    () => accountNo.replaceAll(/[\s-]/g, ""),
    [accountNo],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccess(null);

    if (
      !Number.isInteger(cloverAmount) ||
      cloverAmount < minCashoutClover ||
      cloverAmount > payableAmount
    ) {
      setErrorMessage(
        `${minCashoutClover}~${payableAmount}클로버 사이로 입력해주세요.`,
      );
      return;
    }
    if (!bankCode) {
      setErrorMessage("은행을 선택해주세요.");
      return;
    }
    if (!/^[0-9]{8,20}$/.test(normalizedAccountNo)) {
      setErrorMessage("계좌번호를 숫자로 정확히 입력해주세요.");
      return;
    }
    if (accountHolder.trim().length < 2 || accountHolder.trim().length > 40) {
      setErrorMessage("예금주명을 정확히 입력해주세요.");
      return;
    }

    const fingerprint = [
      cloverAmount,
      bankCode,
      normalizedAccountNo,
      accountHolder.trim(),
    ].join("|");
    if (idempotencyRef.current?.fingerprint !== fingerprint) {
      idempotencyRef.current = { fingerprint, key: createRequestKey() };
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("cashout", {
        body: {
          mode: "request",
          cloverAmount,
          bankCode,
          accountNo: normalizedAccountNo,
          accountHolder: accountHolder.trim(),
          requestKey: idempotencyRef.current.key,
        },
      });

      if (error || !data || data.error) {
        setErrorMessage(
          data?.error?.message ??
            "환전 신청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.",
        );
        return;
      }

      setSuccess({
        requestId: data.requestId,
        status: data.status,
        grossKrw: data.grossKrw,
        withholdingKrw: data.withholdingKrw,
        netKrw: data.netKrw,
      });
      trackEvent("cashout_initiated", {
        clover_amount: cloverAmount,
        status: data.status,
      });
      setAccountNo("");
    } catch {
      setErrorMessage(
        "환전 신청 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {canRequest ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[16px] border border-[#E8E4DC] bg-white p-4"
          data-testid="cashout-request-form"
        >
          <div>
            <label
              htmlFor="cashout-clover-amount"
              className="mb-1.5 block text-[12.5px] font-bold text-[#16140F]"
            >
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
            <label
              htmlFor="cashout-bank"
              className="mb-1.5 block text-[12.5px] font-bold text-[#16140F]"
            >
              은행
            </label>
            <select
              id="cashout-bank"
              value={bankCode}
              onChange={(event) => setBankCode(event.target.value)}
              className="w-full rounded-xl border border-[#D8D2C8] bg-white px-3 py-3 text-sm outline-none focus:border-[#1B8A4F]"
              required
            >
              <option value="">은행을 선택해주세요</option>
              {BANKS.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="cashout-account"
              className="mb-1.5 block text-[12.5px] font-bold text-[#16140F]"
            >
              계좌번호
            </label>
            <input
              id="cashout-account"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={accountNo}
              onChange={(event) => setAccountNo(event.target.value)}
              className="w-full rounded-xl border border-[#D8D2C8] px-3 py-3 text-sm outline-none focus:border-[#1B8A4F]"
              placeholder="숫자만 입력"
              required
            />
          </div>

          <div>
            <label
              htmlFor="cashout-holder"
              className="mb-1.5 block text-[12.5px] font-bold text-[#16140F]"
            >
              예금주
            </label>
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
          </div>

          <div className="rounded-xl bg-[#E7F4EC] p-3" data-testid="cashout-live-preview">
            <p className="text-[12px] leading-6 text-[#3D7A5A]">
              {formatKrw(grossKrw)} 요청 → 원천징수 {formatKrw(withholdingKrw)} →{" "}
              <strong className="text-[#14613A]">{formatKrw(netKrw)} 입금</strong>
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-[#6F6A60]">
              계좌번호는 암호화해 저장하며, 회장이 직접 송금한 뒤 지급 완료로
              표시합니다.{" "}
              <Link href="/privacy" className="font-semibold underline">
                개인정보처리방침
              </Link>
            </p>
          </div>

          {errorMessage && (
            <p role="alert" className="text-[12px] font-semibold text-[#B42318]">
              {errorMessage}
            </p>
          )}
          {success && (
            <div
              role="status"
              className="rounded-xl border border-[#B7DFC5] bg-[#F1FAF4] p-3"
              data-testid="cashout-request-success"
            >
              <p className="text-[13px] font-extrabold text-[#14613A]">
                환전 요청이 접수됐어요
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#3D7A5A]">
                요청 #{success.requestId} · {statusLabels[success.status] ?? success.status}
                <br />
                {formatKrw(success.grossKrw)} 요청 → 원천징수{" "}
                {formatKrw(success.withholdingKrw)} →{" "}
                {formatKrw(success.netKrw)} 입금 예정
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || Boolean(success)}
            className="flex w-full items-center justify-center rounded-[15px] bg-[#1B8A4F] py-4 text-[15.5px] font-extrabold text-white shadow-[0_6px_16px_rgba(27,138,79,.22)] disabled:cursor-not-allowed disabled:opacity-60"
            data-testid="cashout-confirm-button"
          >
            {submitting ? (
              <>
                <LoaderCircle className="mr-2 animate-spin" size={18} aria-hidden="true" />
                신청 중
              </>
            ) : (
              `${formatKrw(netKrw)} 환전 신청하기`
            )}
          </button>
        </form>
      ) : (
        <div
          className="flex flex-col items-center rounded-[15px] bg-[#F4EFE6] py-5 text-center"
          data-testid="cashout-confirm-disabled"
        >
          <Clock3 className="mb-2 text-[#1B8A4F]" size={22} aria-hidden="true" />
          <p className="text-[13.5px] font-bold text-[#16140F]">
            {!cashoutEnabled
              ? "환전 기능을 준비하고 있어요"
              : "친구 응원분 30클로버부터 신청할 수 있어요"}
          </p>
          <p className="mt-1 max-w-[260px] text-[11.5px] leading-relaxed text-[#6F6A60]">
            환전은 최소 30클로버(30,000원)부터 가능해요. 지금 쌓인 클로버는
            그대로 보관됩니다.
          </p>
        </div>
      )}

      {history.length > 0 && (
        <section className="mt-6" aria-labelledby="cashout-history-title">
          <h2 id="cashout-history-title" className="mb-3 text-[15px] font-extrabold text-[#16140F]">
            환전 요청 내역
          </h2>
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#E8E4DC] bg-white p-3"
                data-testid={`cashout-history-${item.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12.5px] font-bold text-[#16140F]">
                    {formatKrw(item.gross_krw)} 요청
                  </p>
                  <span className="rounded-full bg-[#E7F4EC] px-2 py-1 text-[10.5px] font-bold text-[#14613A]">
                    {statusLabels[item.status] ?? item.status}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#6F6A60]">
                  원천징수 {formatKrw(item.withholding_krw)} · 실지급{" "}
                  {formatKrw(item.net_krw)}
                </p>
                <p className="mt-1 text-[10px] text-[#9C968B]">
                  {new Date(item.requested_at).toLocaleString("ko-KR")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
