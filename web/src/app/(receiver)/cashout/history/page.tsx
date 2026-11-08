import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  CASHOUT_STATUS_LABELS,
  type CashoutRecord,
  cashoutBankName,
  formatCashoutKrw,
} from "@/lib/cashout";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  ReceiverPageShell,
} from "@/components/receiver/ReceiverShell";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-receiver-cashout-history-page";

export const dynamic = "force-dynamic";

export default async function CashoutHistoryPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data, error: historyError } = await supabase.rpc(
    "my_cashout_history" as never,
    { p_limit: 100 } as never,
  );
  const history = (data ?? []) as unknown as CashoutRecord[];
  const paid = history.filter((item) => item.status === "PAID");
  const paidTotal = paid.reduce((sum, item) => sum + item.net_krw, 0);
  const pendingCount = history.filter(
    (item) => item.status === "REQUESTED",
  ).length;

  return (
    <ReceiverPageShell testId="cashout-history-page" bottomSafe>
      <header className="social-detail-head">
        <Link href="/my" aria-label="마이페이지로 돌아가기"><ChevronLeft aria-hidden="true" /></Link>
        <strong>{PRODUCT_COPY.TEXT_001}</strong>
        <span aria-hidden="true" />
      </header>

      <div className="grid grid-cols-3 gap-2" data-testid="cashout-history-summary">
        <div className="rounded-md border border-border bg-card p-3 text-left">
          <p className="whitespace-nowrap text-[11px] text-[var(--muted-color)]">누적 입금</p>
          <p className="mt-1 text-base font-extrabold text-accent-foreground sm:text-xl">
            {formatCashoutKrw(paidTotal)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-3 text-left">
          <p className="text-[11px] text-[var(--muted-color)]">{PRODUCT_COPY.TEXT_003}</p>
          <p className="mt-1 text-base font-extrabold text-accent-foreground sm:text-xl">
            {paid.length}{PRODUCT_COPY.TEXT_004}</p>
        </div>
        <div className="rounded-md border border-border bg-card p-3 text-left">
          <p className="text-[11px] text-[var(--muted-color)]">{PRODUCT_COPY.TEXT_005}</p>
          <p className="mt-1 text-base font-extrabold text-amber-ink sm:text-xl">
            {pendingCount}{PRODUCT_COPY.TEXT_006}</p>
        </div>
      </div>

      <section className="mt-5 rounded-md border border-border bg-card px-4">
        {/* 조회 실패를 "내역 없음"으로 그리면 돈 처리 이력이 사라진 것처럼 보인다.
            실패와 빈 상태는 다른 말이다(감사 P1, 오류 처리). */}
        {historyError ? (
          <div className="py-14 text-center">
            <p
              className="text-sm font-bold text-muted-foreground"
              data-testid="cashout-history-load-error"
            >{PRODUCT_COPY.TEXT_007}</p>
            <p className="mt-1 text-[length:var(--text-label-small)]! text-[var(--muted-color)]">{PRODUCT_COPY.TEXT_008}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm font-bold text-muted-foreground">{PRODUCT_COPY.TEXT_009}</p>
            <p className="mt-1 text-[length:var(--text-label-small)]! text-[var(--muted-color)]">{PRODUCT_COPY.TEXT_010}</p>
          </div>
        ) : (
          history.map((item) => (
            <Link
              key={item.id}
              href={item.status === "REQUESTED" ? "/cashout/status" : "#"}
              className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-0"
            >
              <div>
                <p className="text-[length:var(--text-meta-micro)]! text-[var(--muted-color)]">
                  {new Date(item.requested_at).toLocaleDateString("ko-KR")} · #
                  {item.id}
                </p>
                <p className="mt-1 text-sm font-bold text-foreground">
                  {formatCashoutKrw(item.net_krw)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.status === "REJECTED"
                    ? (item.processing_note ?? PRODUCT_COPY.TEXT_011)
                    : `${cashoutBankName(item.bank_code)} ${item.account_masked}`}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[length:var(--text-meta-micro)]! font-extrabold ${item.status === "REQUESTED" ? "bg-amber-soft text-amber-ink" : item.status === "REJECTED" ? "bg-danger-soft text-danger-ink" : "bg-accent text-accent-foreground"}`}
              >
                {item.status === "REQUESTED"
                  ? "확인중"
                  : item.status === "PAID"
                    ? "입금완료"
                    : CASHOUT_STATUS_LABELS[item.status]}
                {item.status === "REQUESTED" ? " ›" : ""}
              </span>
            </Link>
          ))
        )}
      </section>

      <div className="mt-4 rounded-sm bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">{PRODUCT_COPY.TEXT_012}</div>
      <div className="mt-5 flex gap-2">
        <Link
          href="/cashout"
          className="flex-1 rounded-md border border-border bg-card py-3 text-center text-[13px] font-bold text-foreground"
        >{PRODUCT_COPY.TEXT_013}</Link>
        <Link
          href="/me"
          className="flex-1 rounded-md border border-border bg-card py-3 text-center text-[13px] font-bold text-foreground"
        >{PRODUCT_COPY.TEXT_014}</Link>
      </div>
    </ReceiverPageShell>
  );
}
