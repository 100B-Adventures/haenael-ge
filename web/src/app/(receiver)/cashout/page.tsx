import Link from "next/link";
import { redirect } from "next/navigation";
import { CashoutRequestForm } from "@/components/cashout/CashoutRequestForm";
import { type CashoutRecord, formatCashoutKrw } from "@/lib/cashout";
import { KRW_PER_CLOVER, calcCashoutFee } from "@/lib/cashout-fee";
import { isCashoutEnabled } from "@/lib/supabase/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CashoutPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [eligibilityResult, statusResult, historyResult, memberResult] = await Promise.all([
    supabase.rpc("clover_eligibility", { p_member_id: user.id }),
    supabase.rpc("my_cashout_status" as never),
    supabase.rpc("my_cashout_history" as never, { p_limit: 20 } as never),
    supabase.from("member").select("phone").eq("id", user.id).maybeSingle(),
  ]);

  const eligibilityRaw = eligibilityResult.data;
  const eligibility = Array.isArray(eligibilityRaw) ? eligibilityRaw[0] : eligibilityRaw;
  const currentCashout = (((statusResult.data ?? []) as unknown) as CashoutRecord[])[0] ?? null;
  const history = ((historyResult.data ?? []) as unknown) as CashoutRecord[];

  const totalBalance = eligibility?.total_balance ?? 0;
  const welcomeAmount = eligibility?.welcome_amount ?? 0;
  const payableAmount = eligibility?.payable_amount ?? 0;
  const minCashoutClover = eligibility?.min_cashout_clover ?? 30;
  const reachedThreshold = eligibility?.reached_threshold ?? false;
  const remaining = Math.max(minCashoutClover - totalBalance, 0);
  const { grossKrw, feeTotalKrw, withholdingKrw, netKrw: netKrwPreview } = calcCashoutFee(
    payableAmount * KRW_PER_CLOVER,
  );

  return (
    <main className="min-h-svh bg-[#FBFAF7] px-[22px] py-10" data-testid="cashout-page">
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-1 text-[13px] font-extrabold text-[#1B8A4F]">해낼게.</p>
        <h1 className="mb-6 text-[22px] font-black leading-tight tracking-[-0.4px] text-[#16140F] sm:text-[30px]">
          환전 전에<br className="sm:hidden" /> 정직하게 보여드릴게요
        </h1>

        {!reachedThreshold && (
          <div className="mb-4 rounded-[14px] border border-[#E8E4DC] bg-[#F4EFE6] px-4 py-3" data-testid="cashout-below-threshold-banner" role="status">
            <p className="text-[13.5px] font-bold text-[#16140F]">조금만 더 모으면 환전할 수 있어요</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#6F6A60]">
              지금 🍀 {totalBalance}개(웰컴 포함) · 최소 환전 {minCashoutClover}개까지{" "}
              <strong className="text-[#14613A]">{remaining}개</strong> 남았어요. 쌓인 클로버는 그대로 보관돼요.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr] lg:items-start">
          <section>
            <div className="mb-4 rounded-[16px] border border-[#E8E4DC] bg-white p-4 sm:p-6" data-testid="cashout-breakdown-table">
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] text-[#6F6A60]">모인 클로버 (웰컴 포함)</span>
                <span className="text-[13px] font-bold text-[#16140F]" data-testid="breakdown-total">🍀 {totalBalance}개</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] text-[#9C968B]">− 해낼게 웰컴 (지급 대상 아님)</span>
                <span className="text-[13px] font-bold text-[#9C968B]" data-testid="breakdown-welcome">− 🍀 {welcomeAmount}개</span>
              </div>
              <div className="my-2 border-t border-[#E8E4DC]" />
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] font-bold text-[#16140F]">친구 응원분 (지급 대상)</span>
                <span className="text-[14px] font-extrabold text-[#14613A]" data-testid="breakdown-payable">🍀 {payableAmount}개</span>
              </div>
            </div>

            <div className="mb-4 rounded-[16px] bg-[#E7F4EC] p-4 sm:p-6" data-testid="cashout-net-preview">
              <div className="flex items-center justify-between py-1.5 text-[12.5px] text-[#3D7A5A]">
                <span>환산 (🍀1개 = 1,000원)</span><strong>{formatCashoutKrw(grossKrw)}</strong>
              </div>
              <div className="flex items-center justify-between py-1.5 text-[12.5px] text-[#3D7A5A]">
                <span>서비스 이용료 (부가세 포함)</span><strong data-testid="cashout-fee-amount">− {formatCashoutKrw(feeTotalKrw)}</strong>
              </div>
              <div className="flex items-center justify-between py-1.5 text-[12.5px] text-[#3D7A5A]">
                <span>사업소득 원천징수 3.3%</span><strong data-testid="cashout-withholding-amount">− {formatCashoutKrw(withholdingKrw)}</strong>
              </div>
              <div className="my-2 border-t border-[rgba(20,97,58,.18)]" />
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[13.5px] font-bold text-[#16140F]">받으실 금액</span>
                <strong className="text-[18px] font-extrabold text-[#14613A]" data-testid="cashout-net-amount">{formatCashoutKrw(netKrwPreview)}</strong>
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-[#6F6A60]">
                서비스 이용료는 커피 한 잔 값이에요. 카드 결제 수수료, 응원 알림 발송, 계좌 확인과 송금에 쓰입니다. 소득세는 저희가 가져가는 돈이 아니라 국세청에 대신 내드리는 금액이에요. 다음 해 5월에 종합소득세 신고하시면 돌려받으실 수도 있어요. 실제 지급액은 신청 시점에 다시 확정합니다.
              </p>
            </div>
          </section>

          <aside className="lg:sticky lg:top-6">
            <CashoutRequestForm
              cashoutEnabled={isCashoutEnabled()}
              reachedThreshold={reachedThreshold}
              payableAmount={payableAmount}
              totalBalance={totalBalance}
              minCashoutClover={minCashoutClover}
              currentCashout={currentCashout}
              history={history}
              initialPhone={memberResult.data?.phone ?? null}
            />
          </aside>
        </div>

        <Link href="/me" className="mt-6 block text-center text-[12px] font-semibold text-[#9C968B]">홈으로 돌아가기</Link>
      </div>
    </main>
  );
}
