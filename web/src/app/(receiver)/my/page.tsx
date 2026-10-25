import { redirect } from "next/navigation";
import { MyPageOverview } from "@/components/social/MyPageOverview";
import { NotificationBadge } from "@/components/common/NotificationBadge";
import {
  ReceiverPageShell,
} from "@/components/receiver/ReceiverShell";
import { asMySocialDashboard } from "@/lib/social/contracts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data, error }, { data: preference }] = await Promise.all([
    supabase.rpc("my_social_dashboard"),
    supabase.from("member_preference")
      .select("notify_cheer,notify_marketing")
      .eq("member_id", user.id)
      .maybeSingle(),
  ]);
  const dashboard = asMySocialDashboard(data);

  return (
    <ReceiverPageShell testId="my-page" bottomSafe>
      <header className="my-page-head">
        <h1 className="receiver-page-title">마이페이지</h1>
        <div><span className="my-page-wordmark">해낼<span>게</span></span><NotificationBadge /></div>
      </header>
      {error || !dashboard
        ? (
          <section className="social-empty" data-testid="my-page-error">
            <h2>마이페이지를 불러오지 못했어요.</h2>
            <p className="social-description">잠시 뒤 다시 시도해 주세요.</p>
          </section>
        )
        : (
          <MyPageOverview
            dashboard={dashboard}
            receivedCheers={(dashboard.received_cheers ?? []).map((row) => ({
              id: row.id,
              displayName: row.is_anonymous ? null : row.display_name,
              profileImage: row.is_anonymous ? null : row.profile_image,
              message: row.message,
              createdAt: row.created_at,
              isAnonymous: row.is_anonymous,
            }))}
            initialPreferences={{
              notifyCheer: preference?.notify_cheer ?? true,
              notifyMarketing: preference?.notify_marketing ?? false,
            }}
          />
        )}
    </ReceiverPageShell>
  );
}
