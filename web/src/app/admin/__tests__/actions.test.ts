import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  callerGetUser,
  callerRpc,
  serviceFrom,
  notifyInvoke,
  revalidatePath,
} = vi.hoisted(() => ({
  callerGetUser: vi.fn(),
  callerRpc: vi.fn(),
  serviceFrom: vi.fn(),
  notifyInvoke: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: callerGetUser },
    rpc: callerRpc,
  })),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: serviceFrom,
    functions: { invoke: notifyInvoke },
  })),
  getCashoutAccountEncryptionConfig: vi.fn(() => ({
    keys: { "1": "k".repeat(40) },
  })),
}));

import { markCashoutPaid } from "../actions";

function queryResult(data: unknown, error: unknown = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data, error })),
      })),
    })),
  };
}

describe("markCashoutPaid Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callerGetUser.mockResolvedValue({ data: { user: { id: "admin-uid" } } });
    callerRpc.mockImplementation(async (name: string) =>
      name === "is_admin" ? { data: true, error: null } : { data: null, error: null }
    );
    serviceFrom.mockImplementation((table: string) =>
      table === "cashout_request"
        ? queryResult({ member_id: "member-uid", bank_code: "KB" })
        : queryResult({ phone: "01012345678" })
    );
    notifyInvoke.mockResolvedValue({ data: { channel: "ALIMTALK" }, error: null });
  });

  it("지급 완료 후 수신자 전화번호·은행명만 notify에 전달한다", async () => {
    const result = await markCashoutPaid(71, "이체 완료");

    expect(result).toEqual({ ok: true });
    expect(notifyInvoke).toHaveBeenCalledWith("notify", {
      body: {
        memberId: "member-uid",
        type: "CASHOUT_PAID",
        phone: "01012345678",
        bankName: "KB국민은행",
      },
    });
    const body = notifyInvoke.mock.calls[0][1].body;
    expect(body).not.toHaveProperty("accountNo");
    expect(body).not.toHaveProperty("amount");
  });

  it("지급 완료 후 알림 호출이 실패해도 원래 성공 응답을 유지한다", async () => {
    notifyInvoke.mockRejectedValueOnce(new Error("notify unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await markCashoutPaid(71, "이체 완료");

    expect(result).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    consoleError.mockRestore();
  });
});
