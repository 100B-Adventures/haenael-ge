"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markCashoutPaid, rejectCashout, revealCashoutAccount } from "@/app/admin/actions";

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
  account_masked: string | null;
  account_holder: string | null;
  status: string;
  processing_note: string | null;
  requested_at: string;
  paid_at: string | null;
  rejected_at: string | null;
};

type Filter = "REQUESTED" | "ALL" | "PAID" | "REJECTED";
type ModalState = {
  cashout: AdminCashout;
  action: "paid" | "rejected";
  accountNo?: string;
} | null;

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
const statusLabels: Record<string, string> = { REQUESTED: "지급 대기", PAID: "지급 완료", REJECTED: "반려" };

function formatDateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "—";
}

function formatKrw(value: number) {
  return `${numberFormatter.format(value)}원`;
}

function shortId(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function statusClass(status: string) {
  if (status === "REQUESTED") return "bg-[#FBF1DD] text-[#B4791F]";
  if (status === "REJECTED") return "bg-[#FBEAE7] text-[#D9483B]";
  return "bg-[#E7F4EC] text-[#14613A]";
}

export function CashoutQueue({ cashouts }: { cashouts: AdminCashout[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("REQUESTED");
  const [revealedAccounts, setRevealedAccounts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [modal, setModal] = useState<ModalState>(null);
  const [paidConfirmed, setPaidConfirmed] = useState(false);

  const filtered = filter === "ALL" ? cashouts : cashouts.filter((cashout) => cashout.status === filter);
  const counts = {
    REQUESTED: cashouts.filter((item) => item.status === "REQUESTED").length,
    ALL: cashouts.length,
    PAID: cashouts.filter((item) => item.status === "PAID").length,
    REJECTED: cashouts.filter((item) => item.status === "REJECTED").length,
  };

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
        setErrors((current) => ({ ...current, [requestId]: result.ok ? "계좌번호가 없습니다." : result.message }));
        return;
      }
      setErrors((current) => ({ ...current, [requestId]: "" }));
      setRevealedAccounts((current) => ({ ...current, [requestId]: result.accountNo! }));
    });
  }

  function openModal(cashout: AdminCashout, action: "paid" | "rejected") {
    setErrors((current) => ({ ...current, [cashout.id]: "" }));
    setPaidConfirmed(false);
    if (action === "rejected") {
      setModal({ cashout, action });
      return;
    }

    // 지급 확인 모달을 열 때마다 서버에서 전체 계좌를 다시 읽는다. 이 성공 열람이
    // DB 감사로그에 남고, 같은 관리자의 10분 이내 로그만 PAID 전이를 허용한다.
    startTransition(async () => {
      const result = await revealCashoutAccount(cashout.id);
      if (!result.ok || !result.accountNo) {
        setErrors((current) => ({
          ...current,
          [cashout.id]: result.ok ? "계좌번호가 없습니다." : result.message,
        }));
        return;
      }
      setRevealedAccounts((current) => ({ ...current, [cashout.id]: result.accountNo! }));
      setModal({ cashout, action, accountNo: result.accountNo });
    });
  }

  function processSelected() {
    if (!modal) return;
    const requestId = modal.cashout.id;
    if (modal.action === "paid" && !paidConfirmed) return;
    if (modal.action === "rejected" && (notes[requestId] ?? "").trim().length < 2) {
      setErrors((current) => ({ ...current, [requestId]: "반려 사유를 2자 이상 입력해주세요." }));
      return;
    }

    startTransition(async () => {
      const result = modal.action === "paid"
        ? await markCashoutPaid(requestId, notes[requestId] ?? "")
        : await rejectCashout(requestId, notes[requestId] ?? "");
      if (!result.ok) {
        setErrors((current) => ({ ...current, [requestId]: result.message }));
        setModal(null);
        return;
      }
      setErrors((current) => ({ ...current, [requestId]: "" }));
      setModal(null);
      setRevealedAccounts((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
      router.refresh();
    });
  }

  function processingControls(cashout: AdminCashout) {
    if (cashout.status !== "REQUESTED") {
      return <p className="text-xs leading-5 text-muted-foreground">{cashout.processing_note || "처리 메모 없음"}</p>;
    }
    return (
      <div className="w-full min-w-0">
        <input
          type="text"
          maxLength={500}
          value={notes[cashout.id] ?? ""}
          onChange={(event) => setNotes((current) => ({ ...current, [cashout.id]: event.target.value }))}
          className="w-full rounded-lg border bg-background px-2 py-2 text-xs"
          placeholder="처리 메모 (반려 시 필수)"
          aria-label={`환전 요청 ${cashout.id} 처리 메모`}
        />
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => openModal(cashout, "paid")} disabled={pending} className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">지급 완료</button>
          <button type="button" onClick={() => openModal(cashout, "rejected")} disabled={pending} className="flex-1 rounded-lg border border-destructive px-3 py-2 text-xs font-bold text-destructive disabled:opacity-50">반려</button>
        </div>
        {errors[cashout.id] && <p role="alert" className="mt-2 text-xs font-semibold text-destructive">{errors[cashout.id]}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" aria-label="환전 상태 필터">
        {([
          ["REQUESTED", "지급 대기"],
          ["ALL", "전체"],
          ["PAID", "지급 완료"],
          ["REJECTED", "반려"],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${filter === value ? "border-[#16140F] bg-[#16140F] text-white" : "border-[#E8E4DC] bg-white text-[#6F6A60]"}`}>{label} <span className="opacity-70">{counts[value]}</span></button>
        ))}
      </div>

      <div className="space-y-3 md:hidden" data-testid="cashout-mobile-cards">
        {filtered.length === 0 ? <div className="rounded-[14px] border border-[#E8E4DC] bg-white p-8 text-center text-sm text-muted-foreground">지급 대기 중인 신청이 없어요.</div> : filtered.map((cashout) => (
          <article key={cashout.id} className={`rounded-[14px] border bg-white p-4 ${cashout.status === "REQUESTED" ? "border-[#E8D3A6]" : "border-[#E8E4DC]"}`}>
            <div className="flex items-start justify-between gap-3"><div><p className="font-bold">{cashout.nickname || "미설정"} <span className="font-mono text-xs text-muted-foreground">#{cashout.id}</span></p><p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(cashout.requested_at)}</p></div><span className={`rounded-full px-2 py-1 text-[10.5px] font-extrabold ${statusClass(cashout.status)}`}>{statusLabels[cashout.status] ?? cashout.status}</span></div>
            <dl className="mt-3 divide-y divide-[#F2EEE6] text-xs">
              <div className="flex justify-between py-2"><dt className="text-muted-foreground">친구 응원분</dt><dd className="font-bold">🍀 {cashout.clover_amount} · {formatKrw(cashout.gross_krw)}</dd></div>
              <div className="flex justify-between py-2"><dt className="text-muted-foreground">원천징수</dt><dd>−{formatKrw(cashout.withholding_krw)}</dd></div>
              <div className="flex justify-between py-2"><dt className="text-muted-foreground">실지급액</dt><dd className="font-extrabold text-primary">{formatKrw(cashout.net_krw)}</dd></div>
              <div className="flex justify-between gap-3 py-2"><dt className="text-muted-foreground">계좌</dt><dd className="text-right font-mono">{cashout.bank_code} {revealedAccounts[cashout.id] ?? cashout.account_masked}<br /><span className="font-sans text-muted-foreground">{cashout.account_holder}</span></dd></div>
            </dl>
            <button type="button" onClick={() => reveal(cashout.id)} disabled={pending && !revealedAccounts[cashout.id]} className="mt-2 text-xs font-semibold text-primary underline disabled:opacity-50">{revealedAccounts[cashout.id] ? "다시 가리기" : "전체 계좌 보기"}</button>
            <div className="mt-3">{processingControls(cashout)}</div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1420px] border-separate border-spacing-0 text-left text-sm">
          <caption className="sr-only">환전 요청 목록</caption>
          <thead><tr className="text-xs text-muted-foreground"><th className="border-b px-4 py-3">요청일</th><th className="border-b px-4 py-3">요청자</th><th className="border-b px-4 py-3 text-right">친구 응원분</th><th className="border-b px-4 py-3 text-right">원천징수</th><th className="border-b px-4 py-3 text-right">실지급액</th><th className="border-b px-4 py-3">계좌(예금주)</th><th className="border-b px-4 py-3">상태</th><th className="border-b px-4 py-3">처리</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">지급 대기 중인 신청이 없어요.</td></tr> : filtered.map((cashout) => (
              <tr key={cashout.id} className="align-top hover:bg-muted/40">
                <td className="border-b px-4 py-3 whitespace-nowrap">{formatDateTime(cashout.requested_at)}<p className="mt-1 font-mono text-xs text-muted-foreground">#{cashout.id}</p></td>
                <td className="border-b px-4 py-3"><p className="font-semibold">{cashout.nickname || "미설정"}</p><p className="font-mono text-xs text-muted-foreground" title={cashout.member_id}>{shortId(cashout.member_id)}</p></td>
                <td className="border-b px-4 py-3 text-right whitespace-nowrap"><p className="font-bold">🍀 {cashout.clover_amount} · {formatKrw(cashout.gross_krw)}</p></td>
                <td className="border-b px-4 py-3 text-right whitespace-nowrap">−{formatKrw(cashout.withholding_krw)}</td>
                <td className="border-b px-4 py-3 text-right font-extrabold text-primary whitespace-nowrap">{formatKrw(cashout.net_krw)}</td>
                <td className="border-b px-4 py-3 whitespace-nowrap"><p className="font-mono">{cashout.bank_code} {revealedAccounts[cashout.id] ?? cashout.account_masked}</p><p className="mt-1 text-xs text-muted-foreground">{cashout.account_holder}</p><button type="button" onClick={() => reveal(cashout.id)} disabled={pending && !revealedAccounts[cashout.id]} className="mt-1 text-xs font-semibold text-primary underline disabled:opacity-50">{revealedAccounts[cashout.id] ? "다시 가리기" : "전체 계좌 보기"}</button></td>
                <td className="border-b px-4 py-3 whitespace-nowrap"><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass(cashout.status)}`}>{statusLabels[cashout.status] ?? cashout.status}</span>{(cashout.paid_at || cashout.rejected_at) && <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(cashout.paid_at ?? cashout.rejected_at)}</p>}</td>
                <td className="border-b px-4 py-3"><div className="w-[240px]">{processingControls(cashout)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="cashout-modal-title">
          <div className="w-full max-w-[430px] rounded-[20px] bg-white p-5 shadow-2xl">
            <h3 id="cashout-modal-title" className="text-[17px] font-black">이 건을 <span className={modal.action === "paid" ? "text-[#14613A]" : "text-[#D9483B]"}>{modal.action === "paid" ? "지급 완료" : "반려"}</span>로 확정할까요?</h3>
            <div className="mt-4 rounded-[12px] bg-[#F4EFE6] p-4 text-[12.5px]">
              <div className="flex justify-between py-1"><span>신청자</span><strong>{modal.cashout.nickname} ({modal.cashout.account_holder})</strong></div>
              <div className="flex justify-between gap-4 py-1"><span>입금 계좌</span><strong className="text-right">{modal.cashout.bank_code} {modal.action === "paid" ? modal.accountNo : modal.cashout.account_masked}</strong></div>
              <div className="flex justify-between py-1"><span>실지급액</span><strong className="text-[15px] text-[#14613A]">{formatKrw(modal.cashout.net_krw)}</strong></div>
            </div>
            {modal.action === "paid" ? (
              <label className="mt-4 flex gap-2 text-[12.5px] leading-relaxed text-[#6F6A60]"><input type="checkbox" checked={paidConfirmed} onChange={(event) => setPaidConfirmed(event.target.checked)} className="mt-1 size-4 accent-[#1B8A4F]" /><span>은행 앱에서 위 계좌로 <strong>{formatKrw(modal.cashout.net_krw)} 이체를 실제로 마쳤습니다.</strong></span></label>
            ) : (
              <div className="mt-4"><label htmlFor="cashout-reject-note" className="text-[11.5px] font-bold text-[#6F6A60]">반려 사유 <span className="text-[#D9483B]">*필수</span></label><textarea id="cashout-reject-note" rows={3} maxLength={500} value={notes[modal.cashout.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [modal.cashout.id]: event.target.value }))} className="mt-2 w-full rounded-[12px] border border-[#E8E4DC] p-3 text-[12.5px]" /></div>
            )}
            {errors[modal.cashout.id] && <p role="alert" className="mt-2 text-xs font-semibold text-destructive">{errors[modal.cashout.id]}</p>}
            <div className="mt-5 flex gap-2"><button type="button" onClick={() => setModal(null)} className="flex-1 rounded-[14px] border border-[#E8E4DC] py-3 text-sm font-bold">취소</button><button type="button" onClick={processSelected} disabled={pending || (modal.action === "paid" && !paidConfirmed)} className={`flex-1 rounded-[14px] py-3 text-sm font-extrabold text-white disabled:opacity-40 ${modal.action === "paid" ? "bg-[#1B8A4F]" : "bg-[#D9483B]"}`}>{modal.action === "paid" ? "지급 완료 확정" : "반려하고 복원"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
