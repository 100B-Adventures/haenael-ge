import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FriendGoalDetail } from "../contracts";

vi.mock("server-only", () => ({}));

const { createServiceRoleClient } = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}));
vi.mock("@/lib/supabase/service", () => ({ createServiceRoleClient }));

import { resolveFriendDetailCover } from "../server";

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
  wordmap: [],
};

function serviceFixture({
  goalOwnerId = FRIEND_ID,
  signError = false,
}: { goalOwnerId?: string; signError?: boolean } = {}) {
  const createSignedUrls = vi.fn(async () => signError
    ? { data: null, error: { message: "storage unavailable" } }
    : {
      data: [{
        path: "owner/goal/friends.webp",
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

  it("QA-V2-COVER-ERR-01 거절: Presigned URL 발급 실패를 cover 없음으로 축약하지 않는다", async () => {
    const fixture = serviceFixture({ signError: true });
    createServiceRoleClient.mockReturnValue(fixture.client);

    await expect(resolveFriendDetailCover(detail, VIEWER_ID, FRIEND_ID))
      .rejects.toThrow("friend_cover_signing_failed");
  });
});
