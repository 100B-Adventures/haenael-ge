import { redirect } from "next/navigation";
import { MyPageOverview } from "@/components/social/MyPageOverview";
import {
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";
import { asMySocialDashboard } from "@/lib/social/contracts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data, error } = await supabase.rpc("my_social_dashboard");
  const dashboard = asMySocialDashboard(data);

  return (
    <ReceiverPageShell testId="my-page" bottomSafe>
      <ReceiverTopBar variant="home" />
      <div className="mb-5">
        <p className="social-eyebrow">내 정보와 활동</p>
        <h1 className="receiver-page-title">마이페이지</h1>
      </div>
      {error || !dashboard
        ? (
          <section className="social-empty" data-testid="my-page-error">
            <h2>마이페이지를 불러오지 못했어요.</h2>
            <p className="social-description">잠시 뒤 다시 시도해 주세요.</p>
          </section>
        )
        : <MyPageOverview dashboard={dashboard} />}
    </ReceiverPageShell>
  );
}
