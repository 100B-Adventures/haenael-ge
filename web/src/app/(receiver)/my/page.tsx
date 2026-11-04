import { redirect } from "next/navigation";
import { MyPageOverview } from "@/components/social/MyPageOverview";
import { NotificationBadge } from "@/components/common/NotificationBadge";
import {
  ReceiverPageShell,
} from "@/components/receiver/ReceiverShell";
import { asMySocialDashboard } from "@/lib/social/contracts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-receiver-my-page";

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
        <h1 className="receiver-page-title">{PRODUCT_COPY.TEXT_001}</h1>
        <div><span className="my-page-wordmark">{PRODUCT_COPY.TEXT_002}<span>{PRODUCT_COPY.TEXT_003}</span></span><NotificationBadge /></div>
      </header>
      {error || !dashboard
        ? (
          <section className="social-empty" data-testid="my-page-error">
            <h2>{PRODUCT_COPY.TEXT_004}</h2>
            <p className="social-description">{PRODUCT_COPY.TEXT_005}</p>
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
