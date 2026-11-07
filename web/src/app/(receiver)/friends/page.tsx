import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { FriendGoalList } from "@/components/social/FriendGoalList";
import {
  ReceiverPageShell,
} from "@/components/receiver/ReceiverShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  asFriendGoals,
  asUnlinkedCheerHistory,
} from "@/lib/social/contracts";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-receiver-friends-page";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data, error } = await supabase.rpc("my_friend_page" as never);
  if (error) {
    throw new Error("친구 목록을 불러오지 못했습니다.");
  }
  // 친구 목록은 목표 커버를 렌더하지 않는다. 여기서 service-role로 관계·목표·
  // asset을 다시 조회하고 signed URL까지 만드는 것은 불필요한 server waterfall이다.
  const response = asFriendGoals(data);
  const history = asUnlinkedCheerHistory({
    items: (data as unknown as { history?: unknown } | null)?.history,
  });
  return (
    <ReceiverPageShell testId="friends-page" bottomSafe>
      <header className="friends-page-head">
        <h1 className="receiver-page-title">{PRODUCT_COPY.TEXT_001}</h1>
        <Link href="/invite" aria-label="친구 초대">
          <Plus aria-hidden="true" />
        </Link>
      </header>
      <FriendGoalList friends={response.friends} history={history.items} />
    </ReceiverPageShell>
  );
}
