import { notFound, redirect } from "next/navigation";
import { FriendGoalDetail } from "@/components/social/FriendGoalDetail";
import {
  BackHomeLink,
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { asFriendGoalDetail, asFriendGoals } from "@/lib/social/contracts";
import { resolveFriendDetailCover } from "@/lib/social/server";

export const dynamic = "force-dynamic";

export default async function FriendDetailPage(
  { params, searchParams }: {
    params: Promise<{ friendId: string }>;
    searchParams: Promise<{ goal?: string }>;
  },
) {
  const [{ friendId }, query] = await Promise.all([params, searchParams]);
  const goalId = Number(query.goal);
  if (!Number.isSafeInteger(goalId) || goalId <= 0) notFound();
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const [{ data, error }, { data: listData }] = await Promise.all([
    supabase.rpc("friend_goal_detail", { goal_id: goalId }),
    supabase.rpc("my_friend_goals"),
  ]);
  if (error) notFound();
  const parsed = asFriendGoalDetail(data);
  if (!parsed) notFound();
  const detail = await resolveFriendDetailCover(parsed);
  const nickname =
    asFriendGoals(listData).friends.find((friend) =>
      friend.friend_member_id === friendId
    )?.nickname ?? null;
  return (
    <ReceiverPageShell testId="friend-detail-page" bottomSafe>
      <ReceiverTopBar variant="detail" />
      <FriendGoalDetail
        friendId={friendId}
        nickname={nickname}
        detail={detail}
      />
      <BackHomeLink label="친구 목록으로" />
    </ReceiverPageShell>
  );
}
