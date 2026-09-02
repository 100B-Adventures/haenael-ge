import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  callerGetUser,
  callerRpc,
  serviceRpc,
  revalidatePath,
} = vi.hoisted(() => ({
  callerGetUser: vi.fn(),
  callerRpc: vi.fn(),
  serviceRpc: vi.fn(),
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
  createServiceRoleClient: vi.fn(() => ({ rpc: serviceRpc })),
  getCashoutAccountEncryptionConfig: vi.fn(() => ({
    activeVersion: 2,
    activeKey: "n".repeat(40),
    keys: { "1": "o".repeat(40), "2": "n".repeat(40) },
  })),
}));

import {
  markCashoutPaid,
  revealCashoutAccount,
} from "../actions";

describe("admin cashout Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callerGetUser.mockResolvedValue({ data: { user: { id: "admin-uid" } } });
    callerRpc.mockResolvedValue({ data: true, error: null });
    serviceRpc.mockResolvedValue({ data: "123456789012", error: null });
  });

  it("복호화 RPC에 전체 버전 키링과 세션 관리자 ID를 전달한다", async () => {
    const result = await revealCashoutAccount(71);

    expect(result).toEqual({ ok: true, accountNo: "123456789012" });
    expect(serviceRpc).toHaveBeenCalledWith("admin_reveal_cashout_account", {
      p_request_id: 71,
      p_actor_id: "admin-uid",
      p_account_keys: { "1": "o".repeat(40), "2": "n".repeat(40) },
    });
  });

  it("최근 계좌 열람이 없다는 DB 코드는 고정된 공개 오류로 반환한다", async () => {
    callerRpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "cashout_account_reveal_required" },
      });

    const result = await markCashoutPaid(71, "");

    expect(result).toEqual({
      ok: false,
      code: "cashout_account_reveal_required",
      message: "전체 계좌를 다시 확인한 뒤 지급 완료 처리해주세요.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("허용 목록 밖 DB 오류 원문은 관리자 클라이언트에 노출하지 않는다", async () => {
    callerRpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "duplicate key value violates secret_internal_idx" },
      });

    const result = await markCashoutPaid(71, "");

    expect(result).toMatchObject({ ok: false, code: "cashout_admin_failed" });
    expect(result.ok ? "" : result.message).not.toContain("secret_internal_idx");
  });
});
