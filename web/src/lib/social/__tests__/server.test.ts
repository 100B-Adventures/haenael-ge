import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FriendGoalDetail } from "../contracts";

vi.mock("server-only", () => ({}));

const { createServiceRoleClient } = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));

import {
  resolveFriendCheerHistory,
  resolveFriendDetailCover,
} from "../server";

const VIEWER_ID = "51000000-0000-0000-0000-000000000001";
const FRIEND_ID = "51000000-0000-0000-0000-000000000002";
const OTHER_ID = "51000000-0000-0000-0000-000000000003";

const detail: FriendGoalDetail = {
  goal_id: 17,
  slug: "friends-goal",
  title: "친구 목표",
  reason: "함께 해내기",
  due_date: "2026-12-31",
  cover_preset_key: "c1",
  cover_public_path: null,
  cheer_count: 2,
  supporter_avatars: [],
  wordmap: [],
};

function serviceFixture({
  goalOwnerId = FRIEND_ID,
  signError = false,
  assetGoalId = 17,
  assetOwnerId = FRIEND_ID,
  signedPath = "owner/goal/friends.webp",
}: {
  goalOwnerId?: string;
  signError?: boolean;
  assetGoalId?: number;
  assetOwnerId?: string;
  signedPath?: string;
} = {}) {
  const createSignedUrls = vi.fn(async () => signError
    ? { data: null, error: { message: "storage unavailable" } }
    : {
      data: [{
        path: signedPath,
        signedUrl: "http://127.0.0.1:54321/storage/v1/object/sign/goal-cover-quarantine/friends.webp?token=redacted",
        error: null,
      }],
      error: null,
    });
  const getPublicUrl = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === "friend_connection") {
      return {
        select: () => ({
          eq: () => ({
            or: async () => ({
              data: [{
                member_low_id: VIEWER_ID,
                member_high_id: FRIEND_ID,
                status: "ACTIVE",
              }],
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "goal") {
      return {
        select: () => ({
          in: async () => ({
            data: [{
              id: 17,
              member_id: goalOwnerId,
              visibility: "FRIENDS",
              active_cover_asset_id: "asset-1",
            }],
            error: null,
          }),
        }),
      };
    }
    if (table === "goal_cover_asset") {
      return {
        select: () => ({
          in: () => ({
            eq: async () => ({
              data: [{
                id: "asset-1",
                goal_id: assetGoalId,
                owner_member_id: assetOwnerId,
                quarantine_path: "owner/goal/friends.webp",
                public_path: null,
                status: "APPROVED",
              }],
              error: null,
            }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  });
  return {
    client: {
      from,
      storage: {
        from: () => ({ createSignedUrls, getPublicUrl }),
      },
    },
    createSignedUrls,
  };
}

describe("친구 커버 서버 경계", () => {
  beforeEach(() => vi.clearAllMocks());

  it("QA-V2-SEC-01 정상: ACTIVE 관계 재확인 후 Presigned URL만 반환한다", async () => {
    const fixture = serviceFixture();
    createServiceRoleClient.mockReturnValue(fixture.client);

    const result = await resolveFriendDetailCover(detail, VIEWER_ID, FRIEND_ID);

    expect(result.cover_url).toContain("/object/sign/");
    expect(JSON.stringify(result)).not.toContain("cover_storage_path");
    expect(JSON.stringify(result)).not.toContain("quarantine_path");
    expect(fixture.createSignedUrls).toHaveBeenCalledWith(
      ["owner/goal/friends.webp"],
      120,
    );
  });

  it("QA-V2-FLOW-01 거절: URL friendId와 목표 소유자가 다르면 숨긴다", async () => {
    const fixture = serviceFixture({ goalOwnerId: OTHER_ID });
    createServiceRoleClient.mockReturnValue(fixture.client);

    await expect(resolveFriendDetailCover(detail, VIEWER_ID, FRIEND_ID))
      .rejects.toThrow("friend_goal_not_found");
    expect(fixture.createSignedUrls).not.toHaveBeenCalled();
  });

  it("QA-V2-SEC-01 거절: asset의 goal 또는 owner 결합이 다르면 URL을 발급하지 않는다", async () => {
    const fixture = serviceFixture({ assetOwnerId: OTHER_ID });
    createServiceRoleClient.mockReturnValue(fixture.client);

    await expect(resolveFriendDetailCover(detail, VIEWER_ID, FRIEND_ID))
      .rejects.toThrow("friend_goal_not_found");
    expect(fixture.createSignedUrls).not.toHaveBeenCalled();
  });

  it("QA-V2-COVER-ERR-01 거절: Presigned URL 발급 실패를 cover 없음으로 축약하지 않는다", async () => {
    const fixture = serviceFixture({ signError: true });
    createServiceRoleClient.mockReturnValue(fixture.client);

    await expect(resolveFriendDetailCover(detail, VIEWER_ID, FRIEND_ID))
      .rejects.toThrow("friend_cover_signing_failed");
  });

  it("QA-V2-PERF-01 거절: batch 응답 path가 요청 path와 다르면 null로 축약하지 않는다", async () => {
    const fixture = serviceFixture({ signedPath: "unexpected/path.webp" });
    createServiceRoleClient.mockReturnValue(fixture.client);

    await expect(resolveFriendDetailCover(detail, VIEWER_ID, FRIEND_ID))
      .rejects.toThrow("friend_cover_signing_failed");
  });
});

function historyServiceFixture({ active = true }: { active?: boolean } = {}) {
  const cheerEq = vi.fn();
  const goalIn = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === "friend_connection") {
      return {
        select: () => ({
          eq: () => ({
            or: async () => ({
              data: active ? [{
                member_low_id: VIEWER_ID,
                member_high_id: FRIEND_ID,
                status: "ACTIVE",
              }] : [],
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "goal") {
      const result = {
        data: [
          { id: 17, member_id: FRIEND_ID },
          { id: 18, member_id: VIEWER_ID },
        ],
        error: null,
      };
      const builder = {
        in: goalIn,
        is: vi.fn(),
        neq: vi.fn(async () => result),
      };
      goalIn.mockReturnValue(builder);
      builder.is.mockReturnValue(builder);
      return {
        select: () => builder,
      };
    }
    if (table === "social_cheer_member_attribution") {
      return {
        select: () => ({
          in: async () => ({
            data: [
              { cheer_id: 101, supporter_member_id: VIEWER_ID },
              { cheer_id: 102, supporter_member_id: FRIEND_ID },
            ],
            error: null,
          }),
        }),
      };
    }
    if (table === "cheer") {
      const result = {
        data: [
          { id: 102, goal_id: 18, message: "받은 응원", created_at: "2026-11-08T12:00:00Z", is_anonymous: false },
          { id: 101, goal_id: 17, message: "보낸 응원", created_at: "2026-11-07T12:00:00Z", is_anonymous: false },
        ],
        error: null,
      };
      const builder = {
        in: vi.fn(),
        eq: cheerEq,
        is: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(async () => result),
      };
      builder.in.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.is.mockReturnValue(builder);
      builder.order.mockReturnValue(builder);
      return { select: () => builder };
    }
    throw new Error(`unexpected table: ${table}`);
  });
  return { client: { from }, from, cheerEq, goalIn };
}

describe("친구 응원 이력 서버 경계", () => {
  beforeEach(() => vi.clearAllMocks());

  it("D050 정상: 활성 친구의 회원 귀속 양방향 응원만 방향과 함께 반환한다", async () => {
    const fixture = historyServiceFixture();
    createServiceRoleClient.mockReturnValue(fixture.client);

    const result = await resolveFriendCheerHistory(VIEWER_ID, FRIEND_ID);

    expect(result).toEqual([
      {
        cheer_id: 102,
        message: "받은 응원",
        created_at: "2026-11-08T12:00:00Z",
        direction: "RECEIVED",
      },
      {
        cheer_id: 101,
        message: "보낸 응원",
        created_at: "2026-11-07T12:00:00Z",
        direction: "SENT",
      },
    ]);
    expect(fixture.goalIn).toHaveBeenCalledWith("visibility", ["PUBLIC", "FRIENDS"]);
    expect(fixture.cheerEq).toHaveBeenCalledWith("is_anonymous", false);
    expect(JSON.stringify(result)).not.toMatch(/supporter_member_id|clover_amount|payment/);
  });

  it("D050 거절: 활성 친구 관계가 아니면 응원과 계정 존재를 숨긴다", async () => {
    const fixture = historyServiceFixture({ active: false });
    createServiceRoleClient.mockReturnValue(fixture.client);

    await expect(resolveFriendCheerHistory(VIEWER_ID, FRIEND_ID))
      .rejects.toThrow("friend_goal_not_found");
    expect(fixture.from).not.toHaveBeenCalledWith("social_cheer_member_attribution");
  });
});
