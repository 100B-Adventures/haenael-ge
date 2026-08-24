import { redirect } from "next/navigation";
import { CashoutPageView } from "@/components/cashout/CashoutPageView";
import { type CashoutRecord } from "@/lib/cashout";
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
  return (
    <CashoutPageView
      cashoutEnabled={isCashoutEnabled()}
      reachedThreshold={reachedThreshold}
      payableAmount={payableAmount}
      totalBalance={totalBalance}
      welcomeAmount={welcomeAmount}
      minCashoutClover={minCashoutClover}
      currentCashout={currentCashout}
      history={history}
      initialPhone={memberResult.data?.phone ?? null}
    />
  );
}
