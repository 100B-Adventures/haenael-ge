"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { asInviteCreated } from "@/lib/social/contracts";

export type SocialActionResult<T = undefined> = { ok: true; data: T } | {
  ok: false;
  code: string;
};

function safeCode(message: string | undefined) {
  const known = [
    "auth_required",
    "goal_not_found",
    "goal_forbidden",
    "invalid_visibility",
    "invalid_preset",
    "invite_not_found",
    "invite_expired",
    "invite_revoked",
    "invite_already_used",
    "self_invite",
    "blocked_relationship",
    "invite_rate_limited",
    "friend_not_found",
  ];
  return known.find((code) => message?.includes(code)) ??
    "social_request_failed";
}

export async function createFriendInviteAction(
  goalId: number,
): Promise<
  SocialActionResult<NonNullable<ReturnType<typeof asInviteCreated>>>
> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_friend_invite", {
    goal_id: goalId,
    channel: "WEB",
  });
  const parsed = asInviteCreated(data);
  return error || !parsed
    ? { ok: false, code: safeCode(error?.message) }
    : { ok: true, data: parsed };
}

export async function acceptFriendInviteAction(
  token: string,
): Promise<SocialActionResult<Record<string, unknown>>> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("accept_friend_invite", { token });
  if (error) return { ok: false, code: safeCode(error.message) };
  revalidatePath("/friends");
  return { ok: true, data: (data ?? {}) as Record<string, unknown> };
}

export async function setGoalCoverPresetAction(
  goalId: number,
  presetKey: string,
): Promise<SocialActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("set_goal_cover_preset", {
    goal_id: goalId,
    preset_key: presetKey,
  });
  if (error) return { ok: false, code: safeCode(error.message) };
  revalidatePath("/me");
  revalidatePath(`/me/goal/${goalId}`);
  return { ok: true, data: undefined };
}

export async function setGoalVisibilityAction(
  goalId: number,
  visibility: string,
): Promise<SocialActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("set_goal_visibility", {
    goal_id: goalId,
    visibility,
  });
  if (error) return { ok: false, code: safeCode(error.message) };
  revalidatePath("/me");
  revalidatePath(`/me/goal/${goalId}`);
  return { ok: true, data: undefined };
}

export async function removeFriendAction(
  friendId: string,
): Promise<SocialActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("remove_friend", {
    friend_member_id: friendId,
  });
  if (error) return { ok: false, code: safeCode(error.message) };
  revalidatePath("/friends");
  return { ok: true, data: undefined };
}

export async function updateMemberPreferencesAction(
  notifyCheer: boolean,
  notifyMarketing: boolean,
): Promise<SocialActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("update_member_preferences", {
    notify_cheer: notifyCheer,
    notify_marketing: notifyMarketing,
  });
  if (error) return { ok: false, code: safeCode(error.message) };
  revalidatePath("/my");
  return { ok: true, data: undefined };
}
