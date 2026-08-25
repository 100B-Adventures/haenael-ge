import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  callerGetUser,
  callerRpc,
  serviceFrom,
  notificationInsert,
  notifyInvoke,
  revalidatePath,
} = vi.hoisted(() => ({
  callerGetUser: vi.fn(),
  callerRpc: vi.fn(),
  serviceFrom: vi.fn(),
  notificationInsert: vi.fn(),
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
    vi.stubEnv("NOTIFY_INTERNAL_TOKEN", "n".repeat(48));
    callerGetUser.mockResolvedValue({ data: { user: { id: "admin-uid" } } });
    callerRpc.mockImplementation(async (name: string) =>
      name === "is_admin" ? { data: true, error: null } : { data: null, error: null }
    );
    serviceFrom.mockImplementation((table: string) => {
      if (table === "cashout_request") {
        return queryResult({ member_id: "member-uid", bank_code: "KB" });
      }
      if (table === "notification") {
        return { insert: notificationInsert };
      }
      return queryResult({ phone: "01012345678" });
    });
    notifyInvoke.mockResolvedValue({ data: { channel: "ALIMTALK" }, error: null });
    notificationInsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ALT-PAID-01 지급 완료 후 내부 토큰과 수신자 최소정보만 notify에 전달한다", async () => {
    const result = await markCashoutPaid(71, "이체 완료");

    expect(result).toEqual({ ok: true });
    expect(notifyInvoke).toHaveBeenCalledWith("notify", {
      headers: { "x-notify-internal-token": "n".repeat(48) },
      body: {
        memberId: "member-uid",
        type: "CASHOUT_PAID",
        phone: "01012345678",
        bankName: "KB국민은행",
        cashoutRequestId: 71,
      },
    });
    const body = notifyInvoke.mock.calls[0][1].body;
    expect(body).not.toHaveProperty("accountNo");
    expect(body).not.toHaveProperty("amount");
  });

  it("ALT-PAID-02 지급 완료 알림 실패를 기록하고 원래 성공 응답을 유지한다", async () => {
    notifyInvoke.mockRejectedValueOnce(new Error("notify unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await markCashoutPaid(71, "이체 완료");

    expect(result).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
    expect(notificationInsert).toHaveBeenCalledWith({
      member_id: "member-uid",
      type: "CASHOUT_PAID",
      channel: "INAPP",
      alimtalk_status: "FAILED",
      read: false,
    });
    consoleError.mockRestore();
  });
});
