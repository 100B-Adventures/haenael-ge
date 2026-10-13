import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  FriendGoalDetail,
  FriendGoalsResponse,
  SocialGoal,
} from "./contracts";

const FRIEND_COVER_TTL_SECONDS = 120;

type CoverBinding = {
  goal: SocialGoal;
  expectedOwnerId: string;
};

function otherMemberId(
  relation: { member_low_id: string; member_high_id: string },
  viewerMemberId: string,
) {
  if (relation.member_low_id === viewerMemberId) return relation.member_high_id;
  if (relation.member_high_id === viewerMemberId) return relation.member_low_id;
  return null;
}

async function resolveCovers(
  bindings: CoverBinding[],
  viewerMemberId: string,
): Promise<Map<number, string | null>> {
  if (bindings.length === 0) return new Map();
  const service = createServiceRoleClient();

  const expectedOwnerByGoal = new Map(
    bindings.map(({ goal, expectedOwnerId }) => [goal.goal_id, expectedOwnerId]),
  );
  const expectedOwners = new Set(expectedOwnerByGoal.values());
  const [{ data: relations, error: relationError }, { data: goals, error: goalError }] =
    await Promise.all([
      service.from("friend_connection")
        .select("member_low_id,member_high_id,status")
        .eq("status", "ACTIVE")
        .or(
          `member_low_id.eq.${viewerMemberId},member_high_id.eq.${viewerMemberId}`,
        ),
      service.from("goal")
        .select("id,member_id,visibility,active_cover_asset_id")
        .in("id", [...expectedOwnerByGoal.keys()]),
    ]);

  if (relationError || goalError) throw new Error("friend_cover_access_check_failed");

  const activeFriendIds = new Set(
    (relations ?? []).map((relation) => otherMemberId(relation, viewerMemberId))
      .filter((memberId): memberId is string => memberId !== null),
  );
  for (const expectedOwnerId of expectedOwners) {
    if (!activeFriendIds.has(expectedOwnerId)) {
      throw new Error("friend_goal_not_found");
    }
  }

  const goalRows = goals ?? [];
  if (goalRows.length !== expectedOwnerByGoal.size) {
    throw new Error("friend_goal_not_found");
  }
  for (const goal of goalRows) {
    if (
      goal.member_id !== expectedOwnerByGoal.get(goal.id) ||
      !["PUBLIC", "FRIENDS"].includes(goal.visibility)
    ) {
      throw new Error("friend_goal_not_found");
    }
  }

  const assetIds = goalRows.flatMap((goal) =>
    goal.active_cover_asset_id ? [goal.active_cover_asset_id] : []
  );
  const { data: assets, error: assetError } = assetIds.length
    ? await service.from("goal_cover_asset")
      .select("id,quarantine_path,public_path,status")
      .in("id", assetIds)
      .eq("status", "APPROVED")
    : { data: [], error: null };
  if (assetError) throw new Error("friend_cover_lookup_failed");

  const assetById = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  const privatePaths = goalRows.flatMap((goal) => {
    const asset = goal.active_cover_asset_id
      ? assetById.get(goal.active_cover_asset_id)
      : null;
    return goal.visibility === "FRIENDS" && asset?.quarantine_path
      ? [asset.quarantine_path]
      : [];
  });
  const signedUrlByPath = new Map<string, string>();
  if (privatePaths.length > 0) {
    const { data, error } = await service.storage.from("goal-cover-quarantine")
      .createSignedUrls([...new Set(privatePaths)], FRIEND_COVER_TTL_SECONDS);
    if (error || !data) throw new Error("friend_cover_signing_failed");
    for (const signed of data) {
      if (signed.error || !signed.path || !signed.signedUrl) {
        throw new Error("friend_cover_signing_failed");
      }
      signedUrlByPath.set(signed.path, signed.signedUrl);
    }
    if (signedUrlByPath.size !== new Set(privatePaths).size) {
      throw new Error("friend_cover_signing_failed");
    }
  }

  return new Map<number, string | null>(goalRows.map((goal): [number, string | null] => {
    const asset = goal.active_cover_asset_id
      ? assetById.get(goal.active_cover_asset_id)
      : null;
    if (!asset) return [goal.id, null];
    if (goal.visibility === "FRIENDS") {
      return [goal.id, signedUrlByPath.get(asset.quarantine_path) ?? null];
    }
    if (!asset.public_path) return [goal.id, null];
    const { data } = service.storage.from("goal-cover-public")
      .getPublicUrl(asset.public_path);
    return [goal.id, data.publicUrl];
  }));
}

export async function resolveFriendGoalCovers(
  response: FriendGoalsResponse,
  viewerMemberId: string,
): Promise<FriendGoalsResponse> {
  const bindings = response.friends.flatMap((friend) =>
    friend.goals.map((goal) => ({
      goal,
      expectedOwnerId: friend.friend_member_id,
    }))
  );
  const covers = await resolveCovers(bindings, viewerMemberId);
  return {
    friends: response.friends.map((friend) => ({
      ...friend,
      goals: friend.goals.map((goal) => ({
        ...goal,
        cover_url: covers.get(goal.goal_id) ?? null,
      })),
    })),
  };
}

export async function resolveFriendDetailCover(
  detail: FriendGoalDetail,
  viewerMemberId: string,
  expectedOwnerId: string,
): Promise<FriendGoalDetail> {
  const covers = await resolveCovers(
    [{ goal: detail, expectedOwnerId }],
    viewerMemberId,
  );
  return { ...detail, cover_url: covers.get(detail.goal_id) ?? null };
}
