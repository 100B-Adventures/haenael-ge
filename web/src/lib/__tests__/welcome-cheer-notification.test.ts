import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deliverWelcomeCheerNotification,
  WELCOME_CHEER_NOTIFICATION,
} from "../welcome-cheer-notification";

const INPUT = {
  memberId: "11111111-1111-4111-8111-111111111111",
  goalId: 42,
  displayName: "다솔",
  goalTitle: "첫 목표 해낼게",
  goalSlug: "abc123",
  phone: "01012345678",
};

describe("목표 생성 웰컴 응원 알림", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NOTIFY_INTERNAL_TOKEN", "n".repeat(48));
  });

  it("WCN-U01 GOAL_CREATED 템플릿과 서버 조회 변수를 한 통으로 전달한다", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: {}, error: null });
    const client = { functions: { invoke }, from: vi.fn() };

    await expect(
      deliverWelcomeCheerNotification(client as never, INPUT),
    ).resolves.toBe("delivered");

    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith("notify", {
      headers: { "x-notify-internal-token": "n".repeat(48) },
      body: {
        memberId: INPUT.memberId,
        type: WELCOME_CHEER_NOTIFICATION.type,
        phone: INPUT.phone,
        displayName: INPUT.displayName,
        goalTitle: INPUT.goalTitle,
        goalSlug: INPUT.goalSlug,
      },
    });
  });

  it("WCN-U02 notify 실패를 흡수하고 INAPP 실패 기록을 남긴다", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("notify unavailable"),
    });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      functions: { invoke },
      from: vi.fn(() => ({ insert })),
    };

    await expect(
      deliverWelcomeCheerNotification(client as never, INPUT),
    ).resolves.toBe("failed");

    expect(insert).toHaveBeenCalledWith({
      member_id: INPUT.memberId,
      type: "GOAL_CREATED",
      channel: "INAPP",
      alimtalk_status: "FAILED",
      read: false,
    });
  });

  it("WCN-U03 내부 토큰 누락도 목표 흐름으로 예외를 전파하지 않는다", async () => {
    vi.stubEnv("NOTIFY_INTERNAL_TOKEN", "");
    const invoke = vi.fn();
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      functions: { invoke },
      from: vi.fn(() => ({ insert })),
    };

    await expect(
      deliverWelcomeCheerNotification(client as never, INPUT),
    ).resolves.toBe("failed");
    expect(invoke).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledOnce();
  });

  it.each([
    ["빈 서버 닉네임", { ...INPUT, displayName: "" }],
    ["안전하지 않은 서버 목표 slug", { ...INPUT, goalSlug: "../other" }],
  ])("WCN-U08 %s이면 notify를 건너뛰고 INAPP 실패 기록을 남긴다", async (_label, input) => {
    const invoke = vi.fn();
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      functions: { invoke },
      from: vi.fn(() => ({ insert })),
    };

    await expect(
      deliverWelcomeCheerNotification(client as never, input),
    ).resolves.toBe("failed");
    expect(invoke).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith({
      member_id: INPUT.memberId,
      type: "GOAL_CREATED",
      channel: "INAPP",
      alimtalk_status: "FAILED",
      read: false,
    });
  });
});
