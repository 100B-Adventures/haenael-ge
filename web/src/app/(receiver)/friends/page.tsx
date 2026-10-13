import { redirect } from "next/navigation";
import { FriendGoalList } from "@/components/social/FriendGoalList";
import {
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { asFriendGoals } from "@/lib/social/contracts";
import { resolveFriendGoalCovers } from "@/lib/social/server";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data, error } = await supabase.rpc("my_friend_goals");
  if (error) throw new Error("친구 목록을 불러오지 못했습니다.");
  const response = await resolveFriendGoalCovers(asFriendGoals(data));
  return (
    <ReceiverPageShell testId="friends-page" bottomSafe>
      <ReceiverTopBar variant="home" />
      <div className="mb-6">
        <p className="social-eyebrow">함께 해내는 사람들</p>
        <h1 className="receiver-page-title">친구의 해낼게</h1>
        <p className="social-description">
          금액과 순위 없이, 친구가 공개한 목표와 응원만 보여요.
        </p>
      </div>
      <FriendGoalList friends={response.friends} />
    </ReceiverPageShell>
  );
}
