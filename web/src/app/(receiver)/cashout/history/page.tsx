import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CASHOUT_STATUS_LABELS,
  type CashoutRecord,
  cashoutBankName,
  formatCashoutKrw,
} from "@/lib/cashout";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";

export const dynamic = "force-dynamic";

export default async function CashoutHistoryPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase.rpc(
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
    <ReceiverPageShell testId="cashout-history-page">
      <ReceiverTopBar variant="detail" />
      <h1 className="receiver-page-title mt-2 sm:text-[length:var(--text-page-title-desktop)]!">
        환전 내역
      </h1>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-[11px] text-[var(--faint)]">지금까지 받은 금액</p>
          <p className="mt-1 text-xl font-extrabold text-accent-foreground">
            {formatCashoutKrw(paidTotal)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-[11px] text-[var(--faint)]">입금 완료</p>
          <p className="mt-1 text-xl font-extrabold text-accent-foreground">
            {paid.length}건
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-[11px] text-[var(--faint)]">진행중</p>
          <p className="mt-1 text-xl font-extrabold text-amber-ink">
            {pendingCount}건
          </p>
        </div>
      </div>

      <section className="mt-5 rounded-md border border-border bg-card px-4">
        {history.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm font-bold text-muted-foreground">
              아직 환전 내역이 없어요
            </p>
            <p className="mt-1 text-[length:var(--text-label-small)]! text-[var(--faint)]">
              신청하면 이곳에 처리 상태가 남아요.
            </p>
          </div>
        ) : (
          history.map((item) => (
            <Link
              key={item.id}
              href={item.status === "REQUESTED" ? "/cashout/status" : "#"}
              className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-0"
            >
              <div>
                <p className="text-[length:var(--text-meta-micro)]! text-[var(--faint)]">
                  {new Date(item.requested_at).toLocaleDateString("ko-KR")} · #
                  {item.id}
                </p>
                <p className="mt-1 text-sm font-bold text-foreground">
                  {formatCashoutKrw(item.net_krw)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.status === "REJECTED"
                    ? (item.processing_note ?? "반려됨")
                    : `${cashoutBankName(item.bank_code)} ${item.account_masked}`}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[length:var(--text-meta-micro)]! font-extrabold ${item.status === "REQUESTED" ? "bg-amber-soft text-amber-ink" : item.status === "REJECTED" ? "bg-danger-soft text-danger-ink" : "bg-accent text-accent-foreground"}`}
              >
                {CASHOUT_STATUS_LABELS[item.status]}
                {item.status === "REQUESTED" ? " ›" : ""}
              </span>
            </Link>
          ))
        )}
      </section>

      <div className="mt-4 rounded-sm bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">
        🧾 원천징수 3.3%가 제외된 실지급액이에요. 세금 신고 자료가 필요하면
        고객센터로 문의해 주세요.
      </div>
      <div className="mt-5 flex gap-2">
        <Link
          href="/cashout"
          className="flex-1 rounded-md border border-border bg-card py-3 text-center text-[13px] font-bold text-foreground"
        >
          환전 화면
        </Link>
        <Link
          href="/me"
          className="flex-1 rounded-md border border-border bg-card py-3 text-center text-[13px] font-bold text-foreground"
        >
          홈으로
        </Link>
      </div>
    </ReceiverPageShell>
  );
}
