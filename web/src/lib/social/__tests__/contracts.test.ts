import { describe, expect, it } from "vitest";
import {
  asFriendGoalDetail,
  asFriendGoals,
  asInviteCreated,
  asInvitePreview,
  FORBIDDEN_SOCIAL_KEYS,
} from "../contracts";

describe("V2 social contracts", () => {
  it("CT-01 현재 FriendGoalsResponse가 my_friend_goals fixture를 읽는다", () => {
    const parsed = asFriendGoals({
      friends: [{
        friend_member_id: "friend-a",
        nickname: "서연",
        profile_image: null,
        goals: [{
          goal_id: 1,
          slug: "run",
          title: "달리기",
          due_date: "2026-12-01",
          cover_preset_key: "c1",
          cover_public_path: null,
          cheer_count: 3,
        }],
      }],
    });
    expect(parsed.friends[0].goals[0].goal_id).toBe(1);
  });
  it("CT-02 detail reason cheer_count wordmap을 보존한다", () => {
    const parsed = asFriendGoalDetail({
      goal_id: 1,
      slug: "run",
      title: "달리기",
      reason: "꾸준히",
      due_date: "2026-12-01",
      cover_preset_key: "c1",
      cover_public_path: null,
      cheer_count: 3,
      wordmap: [{ word: "꾸준함", weight: 2 }],
    });
    expect(parsed).toMatchObject({
      reason: "꾸준히",
      cheer_count: 3,
      wordmap: [{ word: "꾸준함", weight: 2 }],
    });
  });
  it("CT-03 create invite token intoss_path expires_at을 읽는다", () => {
    expect(
      asInviteCreated({
        invite_id: "i",
        token: "t",
        web_path: "/invite/t",
        intoss_path: "intoss://haenael/invite?token=t",
        expires_at: "2026-10-20T00:00:00Z",
      }),
    ).toMatchObject({
      token: "t",
      intoss_path: "intoss://haenael/invite?token=t",
    });
  });
  it("CT-06 preview 최소 필드만 허용하는 fixture다", () => {
    const value = {
      inviter_nickname: "서연",
      goal_title: "달리기",
      cover_preset_key: "c1",
      cover_public_path: null,
      expires_at: "2026-10-20T00:00:00Z",
      requires_login: true,
    };
    expect(Object.keys(asInvitePreview(value) ?? {}).sort()).toEqual(
      Object.keys(value).sort(),
    );
  });
  it("CT-24 social fixture에 금액 결제 환전 key가 없다", () => {
    const serialized = JSON.stringify(asFriendGoals({ friends: [] }));
    for (const key of FORBIDDEN_SOCIAL_KEYS) {
      expect(serialized).not.toContain(key);
    }
  });
});
