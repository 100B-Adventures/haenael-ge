"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markCashoutPaid,
  rejectCashout,
  revealCashoutAccount,
} from "@/app/admin/actions";

export type AdminCashout = {
  id: number;
  member_id: string;
  nickname: string | null;
  clover_amount: number;
  gross_krw: number;
  fee_krw: number;
  withholding_krw: number;
  net_krw: number;
  bank_code: string | null;
  account_masked: string;
  account_holder: string | null;
  status: string;
  processing_note: string | null;
  requested_at: string;
  paid_at: string | null;
  rejected_at: string | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});
const numberFormatter = new Intl.NumberFormat("ko-KR");

const statusLabels: Record<string, string> = {
  REQUESTED: "지급 대기",
  PAID: "지급 완료",
  REJECTED: "반려",
};

function formatDateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "—";
}

function formatKrw(value: number) {
  return `${numberFormatter.format(value)}원`;
}

function shortId(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function CashoutQueue({ cashouts }: { cashouts: AdminCashout[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [revealedAccounts, setRevealedAccounts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  function reveal(requestId: number) {
    if (revealedAccounts[requestId]) {
      setRevealedAccounts((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
      return;
    }
    startTransition(async () => {
      const result = await revealCashoutAccount(requestId);
      if (!result.ok || !result.accountNo) {
        setErrors((current) => ({
          ...current,
          [requestId]: result.ok ? "계좌번호가 없습니다." : result.message,
        }));
        return;
      }
      setErrors((current) => ({ ...current, [requestId]: "" }));
      setRevealedAccounts((current) => ({
        ...current,
        [requestId]: result.accountNo!,
      }));
    });
  }

  function process(
    requestId: number,
    action: "paid" | "rejected",
  ) {
    if (
      action === "paid" &&
      !window.confirm("은행 송금을 실제로 마친 요청만 지급 완료로 표시해주세요.")
    ) {
      return;
    }
    if (
      action === "rejected" &&
      !window.confirm("이 요청을 반려하고 보류한 클로버를 복원할까요?")
    ) {
      return;
    }

    startTransition(async () => {
      const result =
        action === "paid"
          ? await markCashoutPaid(requestId, notes[requestId] ?? "")
          : await rejectCashout(requestId, notes[requestId] ?? "");
      if (!result.ok) {
        setErrors((current) => ({ ...current, [requestId]: result.message }));
        return;
      }
      setErrors((current) => ({ ...current, [requestId]: "" }));
      router.refresh();
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1560px] border-separate border-spacing-0 text-left text-sm">
        <caption className="sr-only">환전 요청 목록</caption>
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="border-b px-4 py-3 font-semibold">요청일</th>
            <th className="border-b px-4 py-3 font-semibold">요청자</th>
            <th className="border-b px-4 py-3 text-right font-semibold">요청액</th>
            <th className="border-b px-4 py-3 text-right font-semibold">원천징수</th>
            <th className="border-b px-4 py-3 text-right font-semibold">실지급액</th>
            <th className="border-b px-4 py-3 font-semibold">은행</th>
            <th className="border-b px-4 py-3 font-semibold">계좌</th>
            <th className="border-b px-4 py-3 font-semibold">예금주</th>
            <th className="border-b px-4 py-3 font-semibold">상태</th>
            <th className="border-b px-4 py-3 font-semibold">처리</th>
          </tr>
        </thead>
        <tbody>
          {cashouts.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                조회된 환전 요청이 없습니다.
              </td>
            </tr>
          ) : (
            cashouts.map((cashout) => (
              <tr key={cashout.id} className="align-top hover:bg-muted/40">
                <td className="border-b px-4 py-3 whitespace-nowrap">
                  {formatDateTime(cashout.requested_at)}
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    #{cashout.id}
                  </p>
                </td>
                <td className="border-b px-4 py-3">
                  <p className="font-semibold">{cashout.nickname || "미설정"}</p>
                  <p
                    className="mt-0.5 font-mono text-xs text-muted-foreground"
                    title={cashout.member_id}
                  >
                    {shortId(cashout.member_id)}
                  </p>
                </td>
                <td className="border-b px-4 py-3 text-right whitespace-nowrap">
                  <p className="font-bold">{formatKrw(cashout.gross_krw)}</p>
                  <p className="text-xs text-muted-foreground">
                    {numberFormatter.format(cashout.clover_amount)}클로버
                  </p>
                </td>
                <td className="border-b px-4 py-3 text-right whitespace-nowrap">
                  {formatKrw(cashout.withholding_krw)}
                </td>
                <td className="border-b px-4 py-3 text-right font-extrabold text-primary whitespace-nowrap">
                  {formatKrw(cashout.net_krw)}
                </td>
                <td className="border-b px-4 py-3 whitespace-nowrap">
                  {cashout.bank_code || "—"}
                </td>
                <td className="border-b px-4 py-3 whitespace-nowrap">
                  <p className="font-mono">
                    {revealedAccounts[cashout.id] ?? cashout.account_masked}
                  </p>
                  <button
                    type="button"
                    onClick={() => reveal(cashout.id)}
                    disabled={pending}
                    className="mt-1 text-xs font-semibold text-primary underline disabled:opacity-50"
                  >
                    {revealedAccounts[cashout.id] ? "다시 가리기" : "전체 계좌 보기"}
                  </button>
                </td>
                <td className="border-b px-4 py-3 font-semibold">
                  {cashout.account_holder || "—"}
                </td>
                <td className="border-b px-4 py-3 whitespace-nowrap">
                  <span className="rounded-full bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                    {statusLabels[cashout.status] ?? cashout.status}
                  </span>
                  {(cashout.paid_at || cashout.rejected_at) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(cashout.paid_at ?? cashout.rejected_at)}
                    </p>
                  )}
                </td>
                <td className="border-b px-4 py-3">
                  {cashout.status === "REQUESTED" ? (
                    <div className="w-[240px]">
                      <input
                        type="text"
                        maxLength={500}
                        value={notes[cashout.id] ?? ""}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [cashout.id]: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border bg-background px-2 py-2 text-xs"
                        placeholder="처리 메모 (반려 시 필수)"
                        aria-label={`환전 요청 ${cashout.id} 처리 메모`}
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => process(cashout.id, "paid")}
                          disabled={pending}
                          className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                        >
                          지급 완료
                        </button>
                        <button
                          type="button"
                          onClick={() => process(cashout.id, "rejected")}
                          disabled={pending}
                          className="rounded-lg border border-destructive px-3 py-2 text-xs font-bold text-destructive disabled:opacity-50"
                        >
                          반려
                        </button>
                      </div>
                      {errors[cashout.id] && (
                        <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
                          {errors[cashout.id]}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="max-w-[240px] text-xs leading-5 text-muted-foreground">
                      {cashout.processing_note || "처리 메모 없음"}
                    </p>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
