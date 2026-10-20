export type SocialGoal = {
  goal_id: number;
  slug: string;
  title: string;
  due_date: string;
  cover_preset_key: string;
  cover_public_path: string | null;
  cover_url?: string | null;
  cheer_count: number;
};

export type RelationshipDirection =
  | "I_CHEERED"
  | "CHEERED_ME"
  | "MUTUAL"
  | "INVITED";

export const RELATIONSHIP_DIRECTION_LABEL: Record<RelationshipDirection, string> = {
  I_CHEERED: "내가 응원함",
  CHEERED_ME: "응원받음",
  MUTUAL: "서로 응원",
  INVITED: "초대로 연결",
};

export type SocialFriend = {
  friend_member_id: string;
  nickname: string | null;
  profile_image: string | null;
  relationship_direction: RelationshipDirection;
  goals: SocialGoal[];
};

export type FriendGoalsResponse = { friends: SocialFriend[] };

export type FriendGoalDetail = SocialGoal & {
  reason: string | null;
  wordmap: Array<{ word: string; weight: number }>;
};

export type InvitePreview = {
  inviter_nickname: string | null;
  goal_title: string | null;
  cover_preset_key: string;
};

export type InviteCreated = {
  invite_id: string;
  token: string;
  web_path: string;
  intoss_path: string;
  expires_at: string;
};

export type MySocialGoal = {
  goal_id: number;
  slug: string;
  title: string;
  due_date: string;
  status: "ACTIVE" | "CLOSED";
  cover_preset_key: string;
  cheer_count: number;
  supporter_avatars: Array<{
    profile_image: string | null;
    is_anonymous: boolean;
  }>;
  recent_cheer: {
    supporter_name: string | null;
    message: string | null;
    created_at: string;
    is_anonymous: boolean;
  } | null;
};

export type BelongingQueueGoal = {
  friend_member_id: string;
  nickname: string | null;
  goal_id: number;
  slug: string;
  title: string;
  due_date: string;
  cover_preset_key: string;
};

export type MySocialDashboard = {
  profile: {
    nickname: string | null;
    profile_image: string | null;
  };
  goals: MySocialGoal[];
  friend_count: number;
  achievements: {
    completed_goal_count: number;
    received_cheer_count: number;
    connected_friend_count: number;
  };
  belonging_queue: BelongingQueueGoal[];
};

export function asFriendGoals(value: unknown): FriendGoalsResponse {
  if (!value || typeof value !== "object") return { friends: [] };
  const friends = (value as { friends?: unknown }).friends;
  return { friends: Array.isArray(friends) ? friends as SocialFriend[] : [] };
}

export function asFriendGoalDetail(value: unknown): FriendGoalDetail | null {
  if (
    !value || typeof value !== "object" ||
    typeof (value as { goal_id?: unknown }).goal_id !== "number"
  ) return null;
  return value as FriendGoalDetail;
}

export function asInvitePreview(value: unknown): InvitePreview | null {
  if (
    !value || typeof value !== "object" ||
    !("inviter_nickname" in value) ||
    !("goal_title" in value) ||
    typeof (value as { cover_preset_key?: unknown }).cover_preset_key !== "string"
  ) return null;
  const candidate = value as Record<string, unknown>;
  const exactKeys = ["inviter_nickname", "goal_title", "cover_preset_key"];
  if (
    Object.keys(candidate).some((key) => !exactKeys.includes(key)) ||
    (candidate.inviter_nickname !== null && typeof candidate.inviter_nickname !== "string") ||
    (candidate.goal_title !== null && typeof candidate.goal_title !== "string")
  ) return null;
  return candidate as InvitePreview;
}

export function asInviteCreated(value: unknown): InviteCreated | null {
  if (
    !value || typeof value !== "object" ||
    typeof (value as { token?: unknown }).token !== "string"
  ) return null;
  return value as InviteCreated;
}

export function asMySocialDashboard(value: unknown): MySocialDashboard | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<MySocialDashboard>;
  if (
    !candidate.profile || !candidate.achievements ||
    !Array.isArray(candidate.goals) ||
    !Array.isArray(candidate.belonging_queue) ||
    typeof candidate.friend_count !== "number" ||
    typeof candidate.achievements.completed_goal_count !== "number" ||
    typeof candidate.achievements.received_cheer_count !== "number" ||
    typeof candidate.achievements.connected_friend_count !== "number"
  ) return null;
  return candidate as MySocialDashboard;
}

export const FORBIDDEN_SOCIAL_KEYS = [
  "clover_amount",
  "payment",
  "cashout",
  "supporter_ci",
  "supporter_member_id",
  "gross_krw",
  "net_krw",
  "cover_storage_path",
  "quarantine_path",
] as const;
