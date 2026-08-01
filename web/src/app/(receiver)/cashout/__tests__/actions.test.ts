import { beforeEach, describe, expect, it, vi } from "vitest";

const { callerGetUser, serviceRpc, revalidatePath } = vi.hoisted(() => ({
  callerGetUser: vi.fn(),
  serviceRpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: callerGetUser } })),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: vi.fn(() => ({ rpc: serviceRpc })),
  getCashoutAccountEncryptionKey: vi.fn(() => "k".repeat(40)),
  isCashoutEnabled: vi.fn(() => true),
}));

import { createCashoutRequest } from "../actions";

describe("createCashoutRequest Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callerGetUser.mockResolvedValue({ data: { user: { id: "member-uid" } } });
    serviceRpc.mockResolvedValue({
      data: [{
        cashout_request_id: 71,
        status: "REQUESTED",
        clover_amount: 30,
        gross_krw: 30_000,
        fee_krw: 0,
        withholding_krw: 990,
        net_krw: 29_010,
        requested_at: "2026-08-02T00:00:00.000Z",
        is_replay: false,
      }],
      error: null,
    });
  });

  it("세션 member_id를 고정하고 계좌·예금주를 서버에서 정규화한다", async () => {
    const result = await createCashoutRequest({
      cloverAmount: 30,
      bankCode: " kb ",
      accountNo: "123-456 78-9012",
      accountHolder: "  홍길동   님 ",
      requestKey: "cashout_action_01",
    });

    expect(result.ok).toBe(true);
    expect(serviceRpc).toHaveBeenCalledWith("create_cashout_request", {
      p_member_id: "member-uid",
      p_clover_amount: 30,
      p_bank_code: "KB",
      p_account_no: "123456789012",
      p_account_holder: "홍길동 님",
      p_request_key: "cashout_action_01",
      p_account_key: "k".repeat(40),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/cashout/status");
  });

  it("비로그인 요청은 service role RPC 전에 거부한다", async () => {
    callerGetUser.mockResolvedValueOnce({ data: { user: null } });
    const result = await createCashoutRequest({
      cloverAmount: 30,
      bankCode: "KB",
      accountNo: "123456789012",
      accountHolder: "홍길동",
      requestKey: "cashout_action_02",
    });
    expect(result.ok).toBe(false);
    expect(serviceRpc).not.toHaveBeenCalled();
  });
});
