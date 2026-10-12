import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AppGateway,
  CoverPreset,
  FriendGoalGroup,
  FriendInvite,
  GoalSummary,
  MemberPreferences,
  SessionMember,
} from "./domain";
import { GatewayError } from "./domain";

const demoGoals: GoalSummary[] = [
  {
    goalId: 101,
    slug: "seoyeon-running",
    title: "이번 달엔 세 번씩 꼭 달릴게",
    ownerName: "서연",
    dueLabel: "12월 1일까지",
    cheerCount: 13,
    coverPreset: "c1",
    coverUrl: "/avatars/seoyeon.png",
    message: "작게 시작해도 계속 이어가는 중이에요.",
    words: ["꾸준함", "할 수 있어", "같이 가자"],
  },
  {
    goalId: 102,
    slug: "jimin-portfolio",
    title: "미뤄 둔 포트폴리오를 이번엔 완성할게",
    ownerName: "지민",
    dueLabel: "11월 20일까지",
    cheerCount: 8,
    coverPreset: "c3",
    coverUrl: "/avatars/jimin.png",
    message: "하루 한 장씩 채우고 있어요.",
    words: ["기대돼", "멋지다", "끝까지"],
  },
  {
    goalId: 103,
    slug: "dogyeong-study",
    title: "매일 30분씩 영어로 말해 볼게",
    ownerName: "도경",
    dueLabel: "12월 31일까지",
    cheerCount: 21,
    coverPreset: "c5",
    coverUrl: "/avatars/dogyeong.png",
    message: "완벽하지 않아도 입 밖으로 꺼내는 연습 중이에요.",
    words: ["용기", "좋은 습관", "응원해"],
  },
];

export const demoGateway: AppGateway = {
  async signInWithToss() {
    return { memberId: "demo-member", nickname: "해낼 사람", isNew: true };
  },
  async listFriendGoals() {
    return demoGoals.map((goal) => ({
      friendMemberId: `demo-${goal.goalId}`,
      nickname: goal.ownerName,
      profileImage: goal.coverUrl,
      goals: [goal],
    }));
  },
  async getFriendGoal(slug) {
    const goal = demoGoals.find((candidate) => candidate.slug === slug);
    if (!goal) throw new GatewayError("goal_not_found", "목표를 찾지 못했어요.");
    return goal;
  },
  async updateCover(_goalId, _preset) {
    return undefined;
  },
  async updatePreferences(preferences) {
    return preferences;
  },
  async createInvite() {
    return {
      token: "demo-invite",
      intossPath: "intoss://haenael/invite?token=demo-invite",
      expiresAt: "2026-10-20T00:00:00Z",
    };
  },
};

interface FriendGoalsResponse {
  friends: Array<{
    friend_member_id: string;
    nickname: string;
    profile_image: string | null;
    goals: Array<{
      goal_id: number;
      slug: string;
      title: string;
      due_date: string;
      cover_preset_key: CoverPreset;
      cover_public_path: string | null;
      cheer_count: number;
    }>;
  }>;
}

interface AuthTossResponse {
  access_token: string;
  refresh_token: string;
  member_id: string;
  is_new: boolean;
}

const toGoal = (raw: FriendGoalsResponse["friends"][number]["goals"][number], ownerName: string): GoalSummary => ({
  goalId: raw.goal_id,
  slug: raw.slug,
  title: raw.title,
  ownerName,
  dueLabel: `${raw.due_date}까지`,
  cheerCount: raw.cheer_count,
  coverPreset: raw.cover_preset_key,
  coverUrl: raw.cover_public_path,
  message: "친구가 조용히 이어가는 목표예요.",
  words: [],
});

class SupabaseGateway implements AppGateway {
  private readonly client: SupabaseClient;
  private readonly functionsUrl: string;

  constructor(client: SupabaseClient, functionsUrl: string) {
    this.client = client;
    this.functionsUrl = functionsUrl;
  }

  async signInWithToss(): Promise<SessionMember> {
    const { TossAuth } = await import("@apps-in-toss/web-framework");
    const login = await TossAuth.login();
    const response = await fetch(`${this.functionsUrl}/functions/v1/auth-toss`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorization_code: login.authorizationCode,
        request_key: crypto.randomUUID(),
      }),
    });
    if (!response.ok) throw new GatewayError("toss_exchange_failed", "토스 로그인을 마치지 못했어요.");
    const session = (await response.json()) as AuthTossResponse;
    const { error } = await this.client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (error) throw new GatewayError("session_failed", "로그인 세션을 열지 못했어요.");
    return { memberId: session.member_id, nickname: "해낼 사람", isNew: session.is_new };
  }

  async listFriendGoals(): Promise<FriendGoalGroup[]> {
    const { data, error } = await this.client.rpc("my_friend_goals");
    if (error) throw new GatewayError(error.code, "친구 목표를 불러오지 못했어요.");
    const payload = data as FriendGoalsResponse;
    return payload.friends.map((friend) => ({
      friendMemberId: friend.friend_member_id,
      nickname: friend.nickname,
      profileImage: friend.profile_image,
      goals: friend.goals.map((goal) => toGoal(goal, friend.nickname)),
    }));
  }

  async getFriendGoal(slug: string): Promise<GoalSummary> {
    const groups = await this.listFriendGoals();
    const summary = groups.flatMap((group) => group.goals).find((candidate) => candidate.slug === slug);
    if (!summary) throw new GatewayError("goal_not_found", "목표를 찾지 못했어요.");
    const { data, error } = await this.client.rpc("friend_goal_detail", { goal_id: summary.goalId });
    if (error) throw new GatewayError(error.code, "친구 목표를 불러오지 못했어요.");
    const detail = data as {
      title?: string;
      reason?: string | null;
      message?: string | null;
      cheer_count?: number;
      wordmap?: Array<string | { word: string }>;
    };
    return {
      ...summary,
      title: detail.title ?? summary.title,
      message: detail.reason ?? detail.message ?? summary.message,
      cheerCount: detail.cheer_count ?? summary.cheerCount,
      words: (detail.wordmap ?? []).map((item) => typeof item === "string" ? item : item.word),
    };
  }

  async updateCover(goalId: number, preset: CoverPreset): Promise<void> {
    const { error } = await this.client.rpc("set_goal_cover_preset", { goal_id: goalId, preset_key: preset });
    if (error) throw new GatewayError(error.code, "커버를 바꾸지 못했어요.");
  }

  async updatePreferences(preferences: MemberPreferences): Promise<MemberPreferences> {
    const { data, error } = await this.client.rpc("update_member_preferences", {
      notify_cheer: preferences.notifyCheer,
      notify_marketing: preferences.notifyMarketing,
    });
    if (error) throw new GatewayError(error.code, "알림 설정을 저장하지 못했어요.");
    const updated = data as { notify_cheer: boolean; notify_marketing: boolean };
    return { notifyCheer: updated.notify_cheer, notifyMarketing: updated.notify_marketing };
  }

  async createInvite(goalId: number | null): Promise<FriendInvite> {
    const { data, error } = await this.client.rpc("create_friend_invite", { goal_id: goalId, channel: "INTOSS" });
    if (error) throw new GatewayError(error.code, "초대 링크를 만들지 못했어요.");
    const invite = data as { token: string; intoss_path: string; expires_at: string };
    return { token: invite.token, intossPath: invite.intoss_path, expiresAt: invite.expires_at };
  }
}

export const createGateway = (): AppGateway => {
  const query = new URLSearchParams(window.location.search);
  if (query.get("demo") === "1" || import.meta.env.VITE_APPINTOSS_MODE === "demo") return demoGateway;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return new Proxy({} as AppGateway, {
      get() {
        return async () => {
          throw new GatewayError("configuration_missing", "앱 연결 설정을 확인해 주세요.");
        };
      },
    });
  }
  return new SupabaseGateway(createClient(url, anonKey), url);
};
