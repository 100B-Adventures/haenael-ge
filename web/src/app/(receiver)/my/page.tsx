import { redirect } from "next/navigation";
import { MyPageOverview } from "@/components/social/MyPageOverview";
import { LogoutButton } from "@/components/auth/LogoutButton";
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
  const goalIds = dashboard?.goals.map((goal) => goal.goal_id) ?? [];
  const [{ data: cheerRows }, { data: goalRows }] = goalIds.length
    ? await Promise.all([
      supabase.from("cheer")
        .select("id,goal_id,display_name,is_anonymous,message,created_at")
        .in("goal_id", goalIds)
        .eq("status", "CONFIRMED")
        .eq("is_welcome", false)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("goal").select("id,reason").in("id", goalIds),
    ])
    : [{ data: [] }, { data: [] }];
  const goalCheerCounts = Object.fromEntries(await Promise.all(
    goalIds.map(async (goalId) => {
      const { count } = await supabase.from("cheer")
        .select("id", { count: "exact", head: true })
        .eq("goal_id", goalId)
        .eq("status", "CONFIRMED")
        .eq("is_welcome", false)
        .is("deleted_at", null);
      return [goalId, count ?? 0] as const;
    }),
  ));

  return (
    <ReceiverPageShell testId="my-page" bottomSafe>
      <header className="my-page-head">
        <h1 className="receiver-page-title">해낼게 관리</h1>
        <div><span>해낼게</span><NotificationBadge /><LogoutButton /></div>
      </header>
      {error || !dashboard
        ? (
          <section className="social-empty" data-testid="my-page-error">
            <h2>해낼게 관리를 불러오지 못했어요.</h2>
            <p className="social-description">잠시 뒤 다시 시도해 주세요.</p>
          </section>
        )
        : (
          <MyPageOverview
            dashboard={dashboard}
            receivedCheers={(cheerRows ?? []).map((row) => ({
              id: row.id,
              displayName: row.is_anonymous ? null : row.display_name,
              message: row.message,
              createdAt: row.created_at,
            }))}
            initialPreferences={{
              notifyCheer: preference?.notify_cheer ?? true,
              notifyMarketing: preference?.notify_marketing ?? false,
            }}
            goalCheerCounts={goalCheerCounts}
            goalReasons={Object.fromEntries(
              (goalRows ?? []).map((goal) => [goal.id, goal.reason]),
            )}
          />
        )}
    </ReceiverPageShell>
  );
}
