import { describe, expect, it } from "vitest";
import { demoGateway } from "./gateway";

describe("공개 데이터 최소화 계약", () => {
  it("TC-AIT-008 친구 조회 정상 응답에는 금액과 순위 필드가 없다", async () => {
    const response = await demoGateway.listFriendGoals();
    const serialized = JSON.stringify(response);
    expect(response).toHaveLength(3);
    expect(serialized).not.toMatch(/amount|balance|rank|price/i);
  });

  it("TC-AIT-009 모르는 목표 slug는 goal_not_found로 거절한다", async () => {
    await expect(demoGateway.getFriendGoal("unknown")).rejects.toMatchObject({ code: "goal_not_found" });
  });
});
