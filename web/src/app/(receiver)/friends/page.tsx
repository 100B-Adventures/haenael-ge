import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { FriendGoalList } from "@/components/social/FriendGoalList";
import {
  ReceiverPageShell,
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
  const response = await resolveFriendGoalCovers(asFriendGoals(data), user.id);
  return (
    <ReceiverPageShell testId="friends-page" bottomSafe>
      <header className="friends-page-head">
        <h1 className="receiver-page-title">친구</h1>
        <Link href="/invite" aria-label="친구 초대">
          <Plus aria-hidden="true" />
        </Link>
      </header>
      <FriendGoalList friends={response.friends} />
    </ReceiverPageShell>
  );
}
