import Link from "next/link";
import { redirect } from "next/navigation";
import {
  type CashoutRecord,
  cashoutBankName,
  formatCashoutKrw,
} from "@/lib/cashout";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SplitBalanceCard } from "@/components/goal/SplitBalanceCard";

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

  // FDD §12 매핑 3 갭: clover_balance 직접 조회를 clover_eligibility로 교체.
  // 총량·잠김이 같은 스냅샷에서 나와야 I1(available = total - locked)이 보장된다.
  const [{ data: statusRaw }, { data: eligibilityRaw, error: eligibilityError }] = await Promise.all([
    supabase.rpc("my_cashout_status" as never),
    supabase.rpc("clover_eligibility", { p_member_id: user.id }),
  ]);
  const cashout = ((((statusRaw ?? []) as unknown) as CashoutRecord[])[0]) ?? null;
  const eligibility = Array.isArray(eligibilityRaw) ? eligibilityRaw[0] : eligibilityRaw;
  // 컨트롤러 3차 리뷰 MINOR: 조회 실패를 0으로 그리면 "🍀 0개"가 정상처럼 보인다
  // (DESIGN.md §6 상태 가시성: 침묵 금지). balanceLoadFailed로 실패를 실패로 그린다.
  const balanceLoadFailed = Boolean(eligibilityError) || !eligibility;
  const totalBalance = eligibility?.total_balance ?? 0;
  const lockedAmount = eligibility?.locked_amount ?? 0;
  const availableAmount = eligibility?.available_amount ?? totalBalance;

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
  // DESIGN.md v1.12.0 §6-(d) 필수 3단: ①이유("잠겨 있던 N개는 이 돈으로 바뀌었어요")
  // ②감소 전후 대조("모인 클로버가 A개에서 B개가 됐어요") ③회수 경로(환전 내역) 안내.
  // 컨트롤러 재검증 MAJOR1: A·B는 라이브 총량에서 역산(totalBalance + clover_amount)하지 않는다
  // — 지급 후 새 응원이 도착하면 존재한 적 없는 숫자가 나온다. my_cashout_status가 실어 내리는
  // CASHOUT_SETTLED 원장 스냅샷(settled_balance_before/after)이 확정 시점 값의 유일한 진실원이다.
  const beforeBalance = cashout.settled_balance_before ?? null;
  const afterBalance = cashout.settled_balance_after ?? null;
  const banner = isPaid
    ? {
        box: "border-[#B7DFC5] bg-[#F1FAF4]",
        title: "text-[#14613A]",
        heading: `${formatCashoutKrw(cashout.net_krw)}이 입금됐어요`,
        body:
          beforeBalance !== null && afterBalance !== null
            ? `잠겨 있던 ${cashout.clover_amount}개는 이 돈으로 바뀌었어요. 그래서 모인 클로버가 ${beforeBalance}개에서 ${afterBalance}개가 됐어요. 이 내역은 환전 내역에서 계속 확인할 수 있어요.`
            : `잠겨 있던 ${cashout.clover_amount}개는 이 돈으로 바뀌었어요. 이 내역은 환전 내역에서 계속 확인할 수 있어요.`,
      }
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
            <div className="rounded-[14px] border border-[#E8E4DC] bg-white p-4" data-testid="status-balance-card">
              {/* 컨트롤러 3차 리뷰 ★1: 여기 있던 "지금 내 클로버" 라벨을 지웠다. SplitBalanceCard가
                  이미 "모인 클로버"를 헤더로 찍는데, 이 라벨은 A안에서 총량(52)을 "지금 쓸 수 있는
                  것"으로 오해시켜 DESIGN.md §6-(d)가 경계한 바로 그 혼동을 만들었다(실제 사용 가능은
                  12). 부품이 이미 헤더를 갖고 있어 페이지가 또 찍을 필요가 없다. */}
              {/* 컨트롤러 재검증 MAJOR4: 이 화면은 잠김이 반드시 존재하는(REQUESTED) 또는
                  방금 없어진(PAID/REJECTED) 상태다. DESIGN.md §6-(d)가 요구하는 분할 막대 +
                  두 줄 라벨을 /me와 같은 SplitBalanceCard로 그린다(부품 이원화 금지). */}
              {balanceLoadFailed ? (
                <p className="text-[12px] text-[#B23225]" data-testid="status-balance-error">
                  🍀 잔액을 불러오지 못했어요. 새로고침 해주세요.
                </p>
              ) : (
                <>
                  <SplitBalanceCard
                    total={totalBalance}
                    locked={lockedAmount}
                    available={availableAmount}
                    pendingNetKrw={cashout.status === "REQUESTED" ? cashout.net_krw : null}
                  />
                  {/* 컨트롤러 3차 리뷰 ★2: REQUESTED 분기 노트를 지웠다. SplitBalanceCard가 잠김>0일 때
                      이미 "모은 N개는 그대로예요 … 반려되면 잠금만 풀려요"를 렌더하므로 여기서 같은
                      사실을 또 말하면 중복이다. REJECTED/PAID 분기는 잠김이 0이라 부품 노트가 사라지므로
                      중복이 아니어서 그대로 둔다. */}
                  {cashout.status === "REQUESTED" ? null : isRejected ? (
                    <p className="mt-3 text-[11px] leading-relaxed text-[#14613A]">잠겨 있던 {cashout.clover_amount}개의 잠금이 풀렸어요. 모은 개수는 그대로예요.</p>
                  ) : (
                    <p className="mt-3 text-[11px] leading-relaxed text-[#6F6A60]">잠겨 있던 {cashout.clover_amount}개는 이 돈으로 바뀌었어요.</p>
                  )}
                </>
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
