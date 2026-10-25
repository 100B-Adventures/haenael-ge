import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service";

export type AcceptedFriend = {
  nickname: string;
  profileImage: string | null;
};

export async function loadLatestActiveAcceptedFriend(
  inviterId: string,
): Promise<AcceptedFriend | null> {
  try {
    const service = createServiceRoleClient();
    const { data: connections, error: connectionError } = await service
      .from("friend_connection")
      .select("member_low_id,member_high_id")
      .eq("status", "ACTIVE")
      .or(`member_low_id.eq.${inviterId},member_high_id.eq.${inviterId}`);
    if (connectionError || !connections?.length) return null;

    const activeFriendIds = connections.map((connection) =>
      connection.member_low_id === inviterId
        ? connection.member_high_id
        : connection.member_low_id
    );
    const { data: acceptedInvite, error: acceptedInviteError } = await service
      .from("friend_invite")
      .select("accepted_by")
      .eq("inviter_member_id", inviterId)
      .not("accepted_at", "is", null)
      .in("accepted_by", activeFriendIds)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (acceptedInviteError || !acceptedInvite?.accepted_by) return null;

    const { data: member, error: memberError } = await service
      .from("member")
      .select("nickname,profile_image")
      .eq("id", acceptedInvite.accepted_by)
      .maybeSingle();
    if (memberError || !member) return null;
    return {
      nickname: member.nickname?.trim() || "친구",
      profileImage: member.profile_image,
    };
  } catch {
    // 수락 완료 패널은 부가 정보다. 조회 실패 시 민감정보는 노출하지 않고
    // 기존 초대 생성·공유 흐름은 계속 제공한다.
    return null;
  }
}
