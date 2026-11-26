import { describe, expect, it, vi } from "vitest";
import { notifyGoalCoverPublished } from "./goal-cover-alert";

describe("목표 사진 운영 알림", () => {
  it("QA-TC-GOAL-COVER-ALERT-01 공개 직후 식별자와 공개 범위만 Slack 알림으로 보낸다", async () => {
    const send = vi.fn().mockResolvedValue(true);

    await expect(notifyGoalCoverPublished(send, {
      assetId: "asset-safe-id",
      goalId: 17,
      visibility: "PUBLIC",
    })).resolves.toBe(true);

    expect(send).toHaveBeenCalledWith({
      event: "goal_cover_published",
      severity: "info",
      summary: "목표 사진이 자동 파일 검사를 통과해 공개 상태로 반영됐습니다.",
      fields: {
        asset_id: "asset-safe-id",
        goal_id: 17,
        visibility: "PUBLIC",
      },
    });
    expect(JSON.stringify(send.mock.calls)).not.toMatch(/webhook|token|secret/i);
  });
});
