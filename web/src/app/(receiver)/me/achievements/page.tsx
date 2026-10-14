import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import {
  BackHomeLink,
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";
import { asMySocialDashboard } from "@/lib/social/contracts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data, error } = await supabase.rpc("my_social_dashboard");
  const dashboard = asMySocialDashboard(data);
  if (error || !dashboard) throw new Error("업적을 불러오지 못했습니다.");

  const items = [
    ["달성한 목표", dashboard.achievements.completed_goal_count, "끝까지 마친 목표"],
    ["받은 응원", dashboard.achievements.received_cheer_count, "친구가 보내준 응원"],
    ["서로 응원하는 친구", dashboard.achievements.connected_friend_count, "함께 해내는 사람"],
  ] as const;

  return (
    <ReceiverPageShell testId="achievements-page" bottomSafe>
      <ReceiverTopBar variant="detail" />
      <div className="achievement-hero">
        <span><Trophy aria-hidden="true" /></span>
        <h1>지금까지의 업적</h1>
        <p>목표와 응원 기록이 생길 때마다 차곡차곡 쌓여요.</p>
      </div>
      <div className="achievement-list">
        {items.map(([label, count, description]) => (
          <article key={label}>
            <strong>{count}</strong>
            <div><h2>{label}</h2><p>{description}</p></div>
          </article>
        ))}
      </div>
      <p className="my-quiet-note">금액과 순위는 업적에 반영하지 않아요.</p>
      <BackHomeLink label="마이페이지로" href="/my" />
    </ReceiverPageShell>
  );
}
