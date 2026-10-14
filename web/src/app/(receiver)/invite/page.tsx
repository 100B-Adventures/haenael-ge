import { redirect } from "next/navigation";
import { FriendInviteCard } from "@/components/social/FriendInviteCard";
import {
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InvitePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data, error } = await supabase.from("goal").select(
    "id,title,visibility",
  ).eq("member_id", user.id).in("visibility", ["PUBLIC", "FRIENDS"]).neq(
    "status",
    "DELETED",
  ).is("deleted_at", null).order("created_at", { ascending: false });
  if (error) throw new Error("초대할 목표를 불러오지 못했습니다.");
  return (
    <ReceiverPageShell testId="invite-page" bottomSafe>
      <ReceiverTopBar variant="home" />
      <div className="mb-6">
        <p className="social-eyebrow">함께 응원할 친구 부르기</p>
        <h1 className="receiver-page-title">친구를 초대해 함께 응원해요</h1>
        <p className="social-description">
          내가 고른 친구에게 링크를 보내면 서로의 목표를 보고 조용히 응원할 수 있어요.
        </p>
      </div>
      <FriendInviteCard goals={data ?? []} />
    </ReceiverPageShell>
  );
}
