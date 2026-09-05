import { redirect } from "next/navigation";
import {
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";
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

  // 조회 실패를 잔액 0·신청 없음으로 그리면, 실제로 잔액이 있는 사람이
  // "환전 불가"로 읽는다. 돈 화면에서 실패는 실패로 보여야 한다(감사 P1, 오류 처리).
  const loadFailed = Boolean(
    eligibilityResult.error || statusResult.error || historyResult.error,
  );
  if (loadFailed) {
    return (
      <ReceiverPageShell testId="cashout-load-error-page">
        <ReceiverTopBar variant="detail" />
        <div className="rounded-md border border-border bg-card p-6 text-center">
          <h1 className="text-xl font-black text-foreground">
            환전 화면을 불러오지 못했어요
          </h1>
          <p
            className="mt-2 text-sm text-muted-foreground"
            data-testid="cashout-load-error"
          >
            잔액이 0이라는 뜻이 아니에요. 잠시 뒤 새로고침 해주세요.
          </p>
        </div>
      </ReceiverPageShell>
    );
  }

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
