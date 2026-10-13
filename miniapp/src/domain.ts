export type CoverPreset = "c1" | "c2" | "c3" | "c4" | "c5" | "c6";

export interface GoalSummary {
  goalId: number;
  slug: string;
  title: string;
  ownerName: string;
  dueLabel: string;
  cheerCount: number;
  coverPreset: CoverPreset;
  coverUrl: string | null;
  message: string;
  words: string[];
}

export interface FriendGoalGroup {
  friendMemberId: string;
  nickname: string;
  profileImage: string | null;
  goals: GoalSummary[];
}

export interface MemberPreferences {
  notifyCheer: boolean;
  notifyMarketing: boolean;
}

export interface SessionMember {
  memberId: string;
  nickname: string;
  isNew: boolean;
}

export interface FriendInvite {
  token: string;
  intossPath: string;
  expiresAt: string;
}

export interface AppGateway {
  signInWithToss(): Promise<SessionMember>;
  listFriendGoals(): Promise<FriendGoalGroup[]>;
  getFriendGoal(slug: string): Promise<GoalSummary>;
  updateCover(goalId: number, preset: CoverPreset): Promise<void>;
  updatePreferences(preferences: MemberPreferences): Promise<MemberPreferences>;
  createInvite(goalId: number | null): Promise<FriendInvite>;
}

export class GatewayError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "GatewayError";
  }
}
