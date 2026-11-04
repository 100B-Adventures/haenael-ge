import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Wordmap } from "@/components/goal/Wordmap";
import { ReceiverPageShell } from "@/components/receiver/ReceiverShell";
import { asFriendGoalDetail, asFriendGoals } from "@/lib/social/contracts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-receiver-friends-friendid-wordmap-page";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export default async function FriendWordmapPage(
  { params, searchParams }: {
    params: Promise<{ friendId: string }>;
    searchParams: Promise<{ goal?: string }>;
  },
) {
  const [{ friendId }, query] = await Promise.all([params, searchParams]);
  const goalId = Number(query.goal);
  if (!UUID_PATTERN.test(friendId) || !Number.isSafeInteger(goalId) || goalId <= 0) notFound();

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data, error }, { data: listData, error: listError }] = await Promise.all([
    supabase.rpc("friend_goal_detail", { goal_id: goalId }),
    supabase.rpc("my_friend_goals"),
  ]);
  if (error || listError) notFound();
  const detail = asFriendGoalDetail(data);
  const friend = asFriendGoals(listData).friends.find((candidate) =>
    candidate.friend_member_id === friendId
  );
  if (!detail || !friend || !friend.goals.some((goal) => goal.goal_id === goalId)) notFound();

  const displayName = friend.nickname?.trim() || "친구";
  return (
    <ReceiverPageShell testId="friend-wordmap-page" bottomSafe>
      <header className="social-detail-head">
        <Link href={`/friends/${friendId}?goal=${goalId}`} aria-label="친구 목표로 돌아가기"><ChevronLeft aria-hidden="true" /></Link>
        <strong>{PRODUCT_COPY.TEXT_001}</strong>
        <span aria-hidden="true" />
      </header>
      <section className="friend-wordmap-full">
        <h1>{displayName}{PRODUCT_COPY.TEXT_002}</h1>
        <p>{PRODUCT_COPY.TEXT_003}<strong>{detail.cheer_count}{PRODUCT_COPY.TEXT_004}</strong>{PRODUCT_COPY.TEXT_005}</p>
        <Wordmap
          words={detail.wordmap.map((item) => ({ word: item.word, word_count: item.weight }))}
          ownerName={displayName}
          goalTitle={detail.title}
        />
        <p>{PRODUCT_COPY.TEXT_006}</p>
      </section>
    </ReceiverPageShell>
  );
}
