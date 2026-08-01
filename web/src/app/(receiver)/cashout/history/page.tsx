import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CASHOUT_STATUS_LABELS,
  type CashoutRecord,
  cashoutBankName,
  formatCashoutKrw,
} from "@/lib/cashout";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CashoutHistoryPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase.rpc("my_cashout_history" as never, { p_limit: 100 } as never);
  const history = ((data ?? []) as unknown) as CashoutRecord[];
  const paid = history.filter((item) => item.status === "PAID");
  const paidTotal = paid.reduce((sum, item) => sum + item.net_krw, 0);
  const pendingCount = history.filter((item) => item.status === "REQUESTED").length;

  return (
    <main className="min-h-svh bg-[#FBFAF7] px-[22px] py-10" data-testid="cashout-history-page">
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-[13px] font-extrabold text-[#1B8A4F]">해낼게.</p>
        <h1 className="mt-2 text-[22px] font-black text-[#16140F] sm:text-[30px]">환전 내역</h1>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[14px] border border-[#E8E4DC] bg-white p-4"><p className="text-[11px] text-[#9C968B]">지금까지 받은 금액</p><p className="mt-1 text-[20px] font-extrabold text-[#14613A]">{formatCashoutKrw(paidTotal)}</p></div>
          <div className="rounded-[14px] border border-[#E8E4DC] bg-white p-4"><p className="text-[11px] text-[#9C968B]">지급 완료</p><p className="mt-1 text-[20px] font-extrabold text-[#14613A]">{paid.length}건</p></div>
          <div className="rounded-[14px] border border-[#E8E4DC] bg-white p-4"><p className="text-[11px] text-[#9C968B]">진행중</p><p className="mt-1 text-[20px] font-extrabold text-[#B4791F]">{pendingCount}건</p></div>
        </div>

        <section className="mt-5 rounded-[14px] border border-[#E8E4DC] bg-white px-4">
          {history.length === 0 ? (
            <div className="py-14 text-center"><p className="text-[14px] font-bold text-[#6F6A60]">아직 환전 내역이 없어요</p><p className="mt-1 text-[11.5px] text-[#9C968B]">신청하면 이곳에 처리 상태가 남아요.</p></div>
          ) : history.map((item) => (
            <Link key={item.id} href={item.status === "REQUESTED" ? "/cashout/status" : "#"} className="flex items-start justify-between gap-4 border-b border-[#E8E4DC] py-4 last:border-0">
              <div>
                <p className="text-[10.5px] text-[#9C968B]">{new Date(item.requested_at).toLocaleDateString("ko-KR")} · #{item.id}</p>
                <p className="mt-1 text-[14px] font-bold text-[#16140F]">{formatCashoutKrw(item.net_krw)}</p>
                <p className="mt-1 text-[11px] text-[#6F6A60]">
                  {item.status === "REJECTED" ? item.processing_note ?? "반려됨" : `${cashoutBankName(item.bank_code)} ${item.account_masked}`}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${item.status === "REQUESTED" ? "bg-[#FBF1DD] text-[#B4791F]" : item.status === "REJECTED" ? "bg-[#FBEAE7] text-[#D9483B]" : "bg-[#E7F4EC] text-[#14613A]"}`}>{CASHOUT_STATUS_LABELS[item.status]}{item.status === "REQUESTED" ? " ›" : ""}</span>
            </Link>
          ))}
        </section>

        <div className="mt-4 rounded-[12px] bg-[#F4EFE6] p-3 text-[11px] leading-relaxed text-[#6F6A60]">🧾 원천징수 3.3%가 제외된 실지급액이에요. 세금 신고 자료가 필요하면 고객센터로 문의해 주세요.</div>
        <div className="mt-5 flex gap-2"><Link href="/cashout" className="flex-1 rounded-[14px] border border-[#E8E4DC] bg-white py-3 text-center text-[13px] font-bold text-[#16140F]">환전 화면</Link><Link href="/me" className="flex-1 rounded-[14px] border border-[#E8E4DC] bg-white py-3 text-center text-[13px] font-bold text-[#16140F]">홈으로</Link></div>
      </div>
    </main>
  );
}
