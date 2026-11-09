import { beforeEach, describe, expect, it, vi } from "vitest";

const { isCashoutStagingTestMode } = vi.hoisted(() => ({
  isCashoutStagingTestMode: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: vi.fn(),
  isCashoutStagingTestMode,
}));

import { deliverCashoutNotification } from "../cashout-notifications";

const INPUT = {
  memberId: "11111111-1111-4111-8111-111111111111",
  type: "CASHOUT_REQUESTED" as const,
  phone: "01012345678",
  cashoutRequestId: 71,
  cloverAmount: 30,
  netKrw: 25_819,
  requestedAt: "2026-11-09T12:00:00.000Z",
  adminUrl: "https://haenael.app/admin",
};

describe("cashout external notification boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NOTIFY_INTERNAL_TOKEN", "n".repeat(48));
  });

  it("D053-NOTIFY staging test는 외부 notify와 실패 기록을 모두 호출하지 않는다", async () => {
    isCashoutStagingTestMode.mockReturnValue(true);
    const invoke = vi.fn();
    const insert = vi.fn();
    const client = {
      functions: { invoke },
      from: vi.fn(() => ({ insert })),
    };

    await deliverCashoutNotification(client as never, INPUT);

    expect(invoke).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("D053-NOTIFY production은 기존 notify 호출을 보존한다", async () => {
    isCashoutStagingTestMode.mockReturnValue(false);
    const invoke = vi.fn().mockResolvedValue({ data: {}, error: null });
    const client = {
      functions: { invoke },
      from: vi.fn(),
    };

    await deliverCashoutNotification(client as never, INPUT);

    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith("notify", expect.objectContaining({ body: INPUT }));
  });
});
