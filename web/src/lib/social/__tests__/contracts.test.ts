import { describe, expect, it, vi } from "vitest";
import {
  asFriendGoalDetail,
  asFriendGoals,
  asInviteCreated,
  asInvitePreview,
  asMySocialDashboard,
  observeInvitePreview,
  FORBIDDEN_SOCIAL_KEYS,
} from "../contracts";

describe("V2 social contracts", () => {
  it("CT-01 현재 FriendGoalsResponse가 my_friend_goals fixture를 읽는다", () => {
    const parsed = asFriendGoals({
      friends: [{
        friend_member_id: "friend-a",
        nickname: "서연",
        profile_image: null,
        relationship_direction: "I_CHEERED",
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
  it("CT-06 preview는 배포 창의 구 6필드 응답을 3필드로 pick한다", () => {
    const value = {
      inviter_nickname: "서연",
      goal_title: "달리기",
      cover_preset_key: "c1",
    };
    expect(Object.keys(asInvitePreview(value) ?? {}).sort()).toEqual(
      Object.keys(value).sort(),
    );
    expect(asInvitePreview({
      ...value,
      expires_at: "2026-10-21T00:00:00Z",
      visibility: "PUBLIC",
      invite_id: "legacy-id",
    })).toEqual(value);
  });
  it("CT-06 null 응답은 관측 로그 한 줄을 남긴다", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(observeInvitePreview(null)).toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("friend_invite_preview_invalid"));
    error.mockRestore();
  });
  it("CT-24 social fixture에 금액 결제 환전 key가 없다", () => {
    const serialized = JSON.stringify(asFriendGoals({ friends: [] }));
    for (const key of FORBIDDEN_SOCIAL_KEYS) {
      expect(serialized).not.toContain(key);
    }
  });

  it("QA-V2-SEC-01 회귀: private Storage 경로 키는 social 계약 금지 목록이다", () => {
    expect(FORBIDDEN_SOCIAL_KEYS).toContain("cover_storage_path");
    expect(FORBIDDEN_SOCIAL_KEYS).toContain("quarantine_path");
  });

  it("CT-MY-01 마이페이지 집계와 소속감 큐 계약을 읽는다", () => {
    const parsed = asMySocialDashboard({
      profile: { nickname: "서연", profile_image: null },
      goals: [{
        goal_id: 1,
        slug: "run",
        title: "달리기",
        due_date: "2026-12-01",
        status: "ACTIVE",
        cover_preset_key: "c1",
        cheer_count: 0,
        supporter_avatars: [],
        recent_cheer: null,
      }],
      friend_count: 3,
      achievements: {
        completed_goal_count: 2,
        received_cheer_count: 7,
        connected_friend_count: 3,
      },
      belonging_queue: [{
        friend_member_id: "friend-a",
        nickname: "도경",
        goal_id: 2,
        slug: "study",
        title: "시험 준비",
        due_date: "2026-12-20",
        cover_preset_key: "c3",
      }],
    });

    expect(parsed?.achievements).toEqual({
      completed_goal_count: 2,
      received_cheer_count: 7,
      connected_friend_count: 3,
    });
    expect(parsed?.belonging_queue[0].goal_id).toBe(2);
  });

  it("CT-MY-02 불완전한 집계 응답은 거절한다", () => {
    expect(asMySocialDashboard({ profile: {}, goals: [] })).toBeNull();
  });
});
