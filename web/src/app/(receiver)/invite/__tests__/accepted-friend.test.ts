import { beforeEach, expect, it, vi } from "vitest";

const from = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => ({ from }),
}));

import { loadLatestActiveAcceptedFriend } from "../accepted-friend";

beforeEach(() => from.mockReset());

it("CT-INVITE-05 최신 수락 관계가 해제돼도 이전 ACTIVE 수락 친구를 표시한다", async () => {
  const activeIds = ["friend-active"];
  const inviteIn = vi.fn();
  from.mockImplementation((table: string) => {
    if (table === "friend_connection") {
      return {
        select: () => ({
          eq: () => ({
            or: vi.fn().mockResolvedValue({
              data: [{ member_low_id: "owner", member_high_id: "friend-active" }],
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "friend_invite") {
      const chain = {
        eq: () => chain,
        not: () => chain,
        in: (column: string, ids: string[]) => {
          inviteIn(column, ids);
          return chain;
        },
        order: () => chain,
        limit: () => chain,
        maybeSingle: vi.fn().mockResolvedValue({ data: { accepted_by: "friend-active" }, error: null }),
      };
      return { select: () => chain };
    }
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { nickname: "활성 친구", profile_image: "/avatar.png" },
            error: null,
          }),
        }),
      }),
    };
  });

  await expect(loadLatestActiveAcceptedFriend("owner")).resolves.toEqual({
    nickname: "활성 친구",
    profileImage: "/avatar.png",
  });
  expect(inviteIn).toHaveBeenCalledWith("accepted_by", activeIds);
});

it("CT-INVITE-06 수락 패널 조회가 실패해도 핵심 초대 화면용 결과는 null로 복구한다", async () => {
  from.mockReturnValue({
    select: () => ({
      eq: () => ({
        or: vi.fn().mockRejectedValue(new Error("temporary failure")),
      }),
    }),
  });

  await expect(loadLatestActiveAcceptedFriend("owner")).resolves.toBeNull();
});
