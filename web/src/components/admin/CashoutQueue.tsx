"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markCashoutPaid,
  rejectCashout,
  revealCashoutAccount,
} from "@/app/admin/actions";
import { Collapsible } from "@/components/common/Collapsible";

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
const statusLabels: Record<string, string> = {
  REQUESTED: "지급 예정",
  PAID: "지급 완료",
  REJECTED: "반려",
};

function formatDateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "없음";
}

function formatKrw(value: number) {
  return `${numberFormatter.format(value)}원`;
}

function statusClass(status: string) {
  if (status === "REQUESTED") return "text-muted-foreground";
  if (status === "REJECTED") return "bg-danger-soft text-danger-ink";
  return "bg-accent text-accent-foreground";
}

export function CashoutQueue({ cashouts }: { cashouts: AdminCashout[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [modal, setModal] = useState<ModalState>(null);
  const [paidConfirmed, setPaidConfirmed] = useState(false);

  const requested = cashouts.filter(
    (cashout) => cashout.status === "REQUESTED",
  );
  const handled = cashouts.filter((cashout) => cashout.status !== "REQUESTED");

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
      setModal({ cashout, action, accountNo: result.accountNo });
    });
  }

  function processSelected() {
    if (!modal) return;
    const requestId = modal.cashout.id;
    if (modal.action === "paid" && !paidConfirmed) return;
    if (
      modal.action === "rejected" &&
      (notes[requestId] ?? "").trim().length < 2
    ) {
      setErrors((current) => ({
        ...current,
        [requestId]: "반려 사유를 2자 이상 입력해주세요.",
      }));
      return;
    }

    startTransition(async () => {
      const result =
        modal.action === "paid"
          ? await markCashoutPaid(requestId, notes[requestId] ?? "")
          : await rejectCashout(requestId, notes[requestId] ?? "");
      if (!result.ok) {
        setErrors((current) => ({ ...current, [requestId]: result.message }));
        setModal(null);
        return;
      }
      setErrors((current) => ({ ...current, [requestId]: "" }));
      setModal(null);
      router.refresh();
    });
  }

  function processingControls(cashout: AdminCashout) {
    if (cashout.status !== "REQUESTED") {
      return (
        <p className="text-xs leading-5 text-muted-foreground">
          {cashout.processing_note || "처리 메모 없음"}
        </p>
      );
    }
    return (
      <div className="w-full min-w-0">
        <div className="admin-cashout-action-row">
          <button
            type="button"
            onClick={() => openModal(cashout, "paid")}
            disabled={pending}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            지급 완료
          </button>
          <button
            type="button"
            onClick={() => openModal(cashout, "rejected")}
            disabled={pending}
            className="flex-1 rounded-lg bg-danger-soft px-3 py-2 text-xs font-bold text-danger-ink disabled:opacity-50"
          >
            반려
          </button>
        </div>
        {errors[cashout.id] && (
          <p
            role="alert"
            className="mt-2 text-xs font-semibold text-destructive"
          >
            {errors[cashout.id]}
          </p>
        )}
      </div>
    );
  }

  function cashoutCard(cashout: AdminCashout) {
    return (
      <article
        key={cashout.id}
        className={`admin-cashout-card ${cashout.status === "REQUESTED" ? "is-requested" : ""}`}
        data-testid="cashout-request-card"
      >
        <div className="admin-cashout-head">
          <div>
            <strong>
              <span>{cashout.nickname || "미설정"}</span> · {cashout.bank_code}{" "}
              {cashout.account_masked}
            </strong>
            <small>
              신청 {formatDateTime(cashout.requested_at)} · {cashout.status}
            </small>
          </div>
          <div className="admin-cashout-value">
            <strong>{formatKrw(cashout.net_krw)}</strong>
            <span className={statusClass(cashout.status)}>
              {statusLabels[cashout.status] ?? cashout.status}
            </span>
          </div>
        </div>
        <div className="admin-cashout-controls">
          {processingControls(cashout)}
        </div>
      </article>
    );
  }

  return (
    <div>
      <div className="admin-cashout-list" data-testid="cashout-mobile-cards">
        {requested.length === 0 ? (
          <div className="admin-record-empty">
            지급 대기 중인 신청이 없어요.
          </div>
        ) : (
          requested.map(cashoutCard)
        )}
      </div>
      {handled.length > 0 && (
        <section className="admin-cashout-history" aria-label="처리한 요청">
          <Collapsible
            policy={{
              auxiliary: true,
              exceedsLimit: handled.length > 8,
              hasCollapsedContext: true,
            }}
            controlsId="admin-cashout-history-list"
            toggleLabel="처리한 요청"
          >
            {(expanded) => (
              <div id="admin-cashout-history-list" className="admin-cashout-list">
                {(expanded ? handled : handled.slice(0, 8)).map(cashoutCard)}
              </div>
            )}
          </Collapsible>
        </section>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cashout-modal-title"
        >
          <div className="w-full max-w-md rounded-lg bg-card p-5 shadow-2xl">
            <h3 id="cashout-modal-title" className="text-[17px] font-black">
              이 건을{" "}
              <span
                className={
                  modal.action === "paid"
                    ? "text-accent-foreground"
                    : "text-danger-ink"
                }
              >
                {modal.action === "paid" ? "지급 완료" : "반려"}
              </span>
              로 확정할까요?
            </h3>
            <div className="mt-4 rounded-sm bg-muted p-4 text-[12.5px]">
              <div className="flex justify-between py-1">
                <span>신청자</span>
                <strong>
                  {modal.cashout.nickname} ({modal.cashout.account_holder})
                </strong>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <span>입금 계좌</span>
                <strong className="text-right">
                  {modal.cashout.bank_code}{" "}
                  {modal.action === "paid"
                    ? modal.accountNo
                    : modal.cashout.account_masked}
                </strong>
              </div>
              <div className="flex justify-between py-1">
                <span>친구 응원분</span>
                <strong>
                  🍀 {modal.cashout.clover_amount} ·{" "}
                  {formatKrw(modal.cashout.gross_krw)}
                </strong>
              </div>
              <div className="flex justify-between py-1">
                <span>원천징수</span>
                <strong>−{formatKrw(modal.cashout.withholding_krw)}</strong>
              </div>
              <div className="flex justify-between py-1">
                <span>실지급액</span>
                <strong className="text-[15px] text-accent-foreground">
                  {formatKrw(modal.cashout.net_krw)}
                </strong>
              </div>
            </div>
            {modal.action === "paid" ? (
              <label className="mt-4 flex gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
                <input
                  type="checkbox"
                  checked={paidConfirmed}
                  onChange={(event) => setPaidConfirmed(event.target.checked)}
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  은행 앱에서 위 계좌로{" "}
                  <strong>
                    {formatKrw(modal.cashout.net_krw)} 이체를 실제로 마쳤습니다.
                  </strong>
                </span>
              </label>
            ) : (
              <div className="mt-4">
                {/* 정본 = 프로토 v3.7 관리자 반려 확인 모달. A안에서 반려는 잠금 해제일 뿐이다. */}
                <p
                  className="rounded-sm bg-danger-soft p-3 text-[11.5px] leading-relaxed text-danger-ink"
                  data-testid="cashout-reject-warning"
                >
                  반려하면 친구 응원분 🍀{modal.cashout.clover_amount}개에 걸린{" "}
                  <strong>잠금이 풀려요.</strong> 총량은 애초에 줄지 않았으므로
                  되돌릴 잔액이 없습니다. 신청자는 사유를 보고 다시 신청할 수
                  있어요.
                </p>
                <label
                  htmlFor="cashout-reject-note"
                  className="mt-3 block text-[11.5px] font-bold text-muted-foreground"
                >
                  반려 사유 <span className="text-danger-ink">*필수</span>
                </label>
                <textarea
                  id="cashout-reject-note"
                  rows={3}
                  maxLength={500}
                  value={notes[modal.cashout.id] ?? ""}
                  onChange={(event) =>
                    setNotes((current) => ({
                      ...current,
                      [modal.cashout.id]: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-sm border border-border p-3 text-[12.5px]"
                />
              </div>
            )}
            {errors[modal.cashout.id] && (
              <p
                role="alert"
                className="mt-2 text-xs font-semibold text-destructive"
              >
                {errors[modal.cashout.id]}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 rounded-md border border-border py-3 text-sm font-bold"
              >
                취소
              </button>
              <button
                type="button"
                onClick={processSelected}
                disabled={
                  pending || (modal.action === "paid" && !paidConfirmed)
                }
                className={`flex-1 rounded-md py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-40 ${modal.action === "paid" ? "bg-primary" : "bg-destructive"}`}
                data-testid="cashout-modal-confirm-button"
              >
                {modal.action === "paid"
                  ? "지급 완료 확정"
                  : "반려하고 잠금 해제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
