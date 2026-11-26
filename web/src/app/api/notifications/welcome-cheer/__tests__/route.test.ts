import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  afterMock,
  createServerSupabaseClientMock,
  createServiceRoleClientMock,
  deliverWelcomeCheerNotificationMock,
} = vi.hoisted(() => ({
  afterMock: vi.fn((callback: () => unknown) => callback()),
  createServerSupabaseClientMock: vi.fn(),
  createServiceRoleClientMock: vi.fn(),
  deliverWelcomeCheerNotificationMock: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...await importOriginal<typeof import("next/server")>(),
  after: afterMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: createServiceRoleClientMock,
}));

vi.mock("@/lib/welcome-cheer-notification", () => ({
  deliverWelcomeCheerNotification: deliverWelcomeCheerNotificationMock,
}));

import { POST } from "../route";

const CLAIM = { goal_id: 42, goal_title: "첫 목표 해낼게" };
const post = () => POST(new Request(
  "https://haenael-ge.com/api/notifications/welcome-cheer",
  { method: "POST", body: JSON.stringify({ goalSlug: "abc123" }) },
));

function serviceClient() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { phone: "01012345678" },
            error: null,
          }),
        })),
      })),
    })),
  };
}

describe("POST /api/notifications/welcome-cheer", () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
          error: null,
        }),
      },
      rpc,
    });
    createServiceRoleClientMock.mockReturnValue(serviceClient());
    deliverWelcomeCheerNotificationMock.mockResolvedValue("delivered");
  });

  it("WCN-U04 같은 목표의 두 번째 claim은 알림을 다시 예약하지 않는다", async () => {
    rpc
      .mockResolvedValueOnce({ data: [CLAIM], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    expect((await post()).status).toBe(202);
    expect((await post()).status).toBe(202);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(afterMock).toHaveBeenCalledOnce();
    expect(deliverWelcomeCheerNotificationMock).toHaveBeenCalledOnce();
  });

  it("WCN-U05 본인 목표 claim이 아니면 알림을 예약하지 않는다", async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    expect((await post()).status).toBe(202);

    expect(rpc).toHaveBeenCalledWith(
      "claim_welcome_cheer_notification",
      { p_goal_slug: "abc123" },
    );
    expect(afterMock).not.toHaveBeenCalled();
    expect(deliverWelcomeCheerNotificationMock).not.toHaveBeenCalled();
  });
});
