import Link from "next/link";
import { redirect } from "next/navigation";
import {
  type CashoutRecord,
  cashoutBankName,
  formatCashoutKrw,
} from "@/lib/cashout";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

export default async function CashoutStatusPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: statusRaw }, { data: balance }] = await Promise.all([
    supabase.rpc("my_cashout_status" as never),
    supabase.from("clover_balance").select("clover_count").eq("member_id", user.id).single(),
  ]);
  const cashout = ((((statusRaw ?? []) as unknown) as CashoutRecord[])[0]) ?? null;

  if (!cashout) {
    return (
      <main className="min-h-svh bg-[#FBFAF7] px-[22px] py-10">
        <div className="mx-auto max-w-xl rounded-[16px] border border-[#E8E4DC] bg-white p-6 text-center">
          <h1 className="text-[20px] font-black text-[#16140F]">아직 환전 신청이 없어요</h1>
          <p className="mt-2 text-[12px] text-[#6F6A60]">친구 응원분이 30클로버 이상이면 신청할 수 있어요.</p>
          <Link href="/cashout" className="mt-5 block rounded-[14px] bg-[#1B8A4F] py-3 text-[13px] font-extrabold text-white">환전 화면으로</Link>
        </div>
      </main>
    );
  }

  const isPaid = cashout.status === "PAID";
  const isRejected = cashout.status === "REJECTED";
  const checking = cashout.status === "REQUESTED" && Date.now() - new Date(cashout.requested_at).getTime() >= 86_400_000;
  const banner = isPaid
    ? { box: "border-[#B7DFC5] bg-[#F1FAF4]", title: "text-[#14613A]", heading: `${formatCashoutKrw(cashout.net_krw)}이 입금됐어요`, body: "이 내역은 환전 내역에 계속 남아 있어요." }
    : isRejected
      ? { box: "border-[#E9B7B0] bg-[#FBEAE7]", title: "text-[#D9483B]", heading: "환전이 반려됐어요", body: cashout.processing_note ?? "계좌 정보를 다시 확인해 주세요." }
      : { box: "border-[#E8D3A6] bg-[#FBF1DD]", title: "text-[#B4791F]", heading: checking ? "계좌를 확인하고 있어요" : "신청이 접수됐어요", body: checking ? "담당자가 입금 계좌를 확인 중이에요. 따로 하실 일은 없어요." : "1~3영업일 안에 입금해 드릴게요." };

  return (
    <main className="min-h-svh bg-[#FBFAF7] px-[22px] py-10" data-testid="cashout-status-page">
      <div className="mx-auto w-full max-w-4xl">
        <p className="text-[13px] font-extrabold text-[#1B8A4F]">해낼게.</p>
        <h1 className="mt-2 text-[22px] font-black text-[#16140F] sm:text-[30px]">환전 진행 상태</h1>
        <p className="mt-1 text-[11.5px] text-[#9C968B]">{dateTime.format(new Date(cashout.requested_at))} 신청 · 신청번호 #{cashout.id}</p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <section>
            <div className={`rounded-[14px] border p-4 ${banner.box}`} role="status">
              <h2 className={`text-[15px] font-extrabold ${banner.title}`}>{banner.heading}</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6F6A60]">{banner.body}</p>
            </div>

            <div className="mt-3 rounded-[14px] border border-[#E8E4DC] bg-white p-4">
              <ol className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                <li className="text-[#14613A]"><span className="mx-auto mb-2 flex size-7 items-center justify-center rounded-full bg-[#1B8A4F] text-white">1</span>접수됨</li>
                <li className={isRejected ? "text-[#14613A]" : cashout.status === "REQUESTED" ? "text-[#B4791F]" : "text-[#14613A]"}><span className={`mx-auto mb-2 flex size-7 items-center justify-center rounded-full ${cashout.status === "REQUESTED" ? "border-2 border-[#B4791F] bg-white" : "bg-[#1B8A4F] text-white"}`}>2</span>확인중</li>
                <li className={isRejected ? "text-[#D9483B]" : isPaid ? "text-[#14613A]" : "text-[#9C968B]"}><span className={`mx-auto mb-2 flex size-7 items-center justify-center rounded-full ${isRejected ? "bg-[#D9483B] text-white" : isPaid ? "bg-[#1B8A4F] text-white" : "border border-[#E8E4DC] bg-[#F4EFE6]"}`}>3</span>{isRejected ? "반려됨" : "입금완료"}</li>
              </ol>
            </div>

            <dl className="mt-3 divide-y divide-[#F2EEE6] rounded-[14px] border border-[#E8E4DC] bg-white px-4">
              <div className="flex justify-between gap-4 py-3 text-[13px]"><dt className="text-[#6F6A60]">{isPaid ? "입금된 금액" : "받으실 금액"}</dt><dd className="font-extrabold text-[#14613A]">{formatCashoutKrw(cashout.net_krw)}</dd></div>
              <div className="flex justify-between gap-4 py-3 text-[13px]"><dt className="text-[#6F6A60]">입금 계좌</dt><dd className="text-right font-bold">{cashoutBankName(cashout.bank_code)} {cashout.account_masked}</dd></div>
              <div className="flex justify-between gap-4 py-3 text-[13px]"><dt className="text-[#6F6A60]">예금주</dt><dd className="font-bold">{cashout.account_holder}</dd></div>
              {cashout.paid_at && <div className="flex justify-between gap-4 py-3 text-[13px]"><dt className="text-[#6F6A60]">입금 완료</dt><dd className="font-bold">{dateTime.format(new Date(cashout.paid_at))}</dd></div>}
            </dl>
          </section>

          <aside>
            <div className="rounded-[14px] border border-[#E8E4DC] bg-white p-4">
              <p className="text-[10.5px] text-[#9C968B]">지금 내 클로버</p>
              <p className="mt-1 text-[20px] font-extrabold text-[#14613A]">🍀 {balance?.clover_count ?? 0}개</p>
              {cashout.status === "REQUESTED" ? (
                <div className="mt-3 border-t border-dashed border-[#E8E4DC] pt-3">
                  <div className="flex justify-between text-[12px]"><span className="text-[#6F6A60]">🔒 환전 진행중</span><strong className="text-[#B4791F]">🍀 {cashout.clover_amount}개</strong></div>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#6F6A60]">없어진 게 아니라 지급 대기 중이에요.</p>
                </div>
              ) : isRejected ? (
                <p className="mt-3 text-[11px] leading-relaxed text-[#14613A]">보류됐던 {cashout.clover_amount}개가 잔액으로 돌아왔어요.</p>
              ) : (
                <p className="mt-3 text-[11px] leading-relaxed text-[#6F6A60]">보류됐던 {cashout.clover_amount}개는 지급으로 확정됐어요.</p>
              )}
            </div>
            <div className="mt-3 rounded-[12px] bg-[#F4EFE6] p-3 text-[11px] leading-relaxed text-[#6F6A60]">💬 지급이 끝나면 카카오톡 알림으로 알려드릴 예정이에요. 문의할 때는 신청번호 #{cashout.id}을 알려주세요.</div>
            <Link href="/cashout/history" className="mt-4 block rounded-[14px] border border-[#E8E4DC] bg-white py-3 text-center text-[13px] font-bold text-[#16140F]">환전 내역 보기</Link>
            {isRejected && <Link href="/cashout" className="mt-2 block rounded-[14px] bg-[#1B8A4F] py-3 text-center text-[13px] font-extrabold text-white">계좌 고쳐서 다시 신청하기</Link>}
            <Link href="/me" className="mt-2 block py-2 text-center text-[12px] font-semibold text-[#9C968B]">홈으로</Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
