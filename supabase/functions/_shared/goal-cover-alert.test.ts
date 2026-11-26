import { describe, expect, it, vi } from "vitest";
import { goalCoverAdminUrl, notifyGoalCoverPublished } from "./goal-cover-alert";

describe("목표 사진 운영 알림", () => {
  it("QA-TC-GOAL-COVER-ALERT-01 공개 직후 식별자와 공개 범위만 Slack 알림으로 보낸다", async () => {
    const send = vi.fn().mockResolvedValue(true);

    await expect(notifyGoalCoverPublished(send, {
      assetId: "asset-safe-id",
      goalId: 17,
      visibility: "PUBLIC",
      adminUrl: "https://haenael.app/admin",
    })).resolves.toBe(true);

    expect(send).toHaveBeenCalledWith({
      event: "goal_cover_published",
      severity: "info",
      summary: "목표 사진이 자동 파일 검사를 통과해 공개 상태로 반영됐습니다.",
      fields: {
        asset_id: "asset-safe-id",
        goal_id: 17,
        visibility: "PUBLIC",
        admin_url: "https://haenael.app/admin",
      },
    });
    expect(JSON.stringify(send.mock.calls)).not.toMatch(/webhook|token|secret/i);
  });

  it("QA-TC-GOAL-COVER-ALERT-02 관리자 링크에는 서명값과 비밀값을 싣지 않는다", () => {
    expect(goalCoverAdminUrl("https://haenael.app/path?token=secret#hash"))
      .toBe("https://haenael.app/admin");
    expect(goalCoverAdminUrl()).toBe("https://haenael-ge.vercel.app/admin");
    expect(goalCoverAdminUrl("not-a-url")).toBe("https://haenael-ge.vercel.app/admin");
  });
});
