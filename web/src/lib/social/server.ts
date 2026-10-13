import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { FriendGoalDetail, FriendGoalsResponse } from "./contracts";

const FRIEND_COVER_TTL_SECONDS = 120;

async function resolveCover<
  T extends {
    cover_public_path?: string | null;
    cover_storage_path?: string | null;
  },
>(goal: T): Promise<T & { cover_url: string | null }> {
  const service = createServiceRoleClient();
  if (goal.cover_storage_path) {
    const { data } = await service.storage.from("goal-cover-quarantine")
      .createSignedUrl(goal.cover_storage_path, FRIEND_COVER_TTL_SECONDS);
    return {
      ...goal,
      cover_storage_path: null,
      cover_url: data?.signedUrl ?? null,
    };
  }
  if (goal.cover_public_path) {
    const { data } = service.storage.from("goal-cover-public").getPublicUrl(
      goal.cover_public_path,
    );
    return { ...goal, cover_url: data.publicUrl };
  }
  return { ...goal, cover_url: null };
}

export async function resolveFriendGoalCovers(
  response: FriendGoalsResponse,
): Promise<FriendGoalsResponse> {
  return {
    friends: await Promise.all(response.friends.map(async (friend) => ({
      ...friend,
      goals: await Promise.all(friend.goals.map(resolveCover)),
    }))),
  };
}

export async function resolveFriendDetailCover(
  detail: FriendGoalDetail,
): Promise<FriendGoalDetail> {
  return resolveCover(detail);
}
