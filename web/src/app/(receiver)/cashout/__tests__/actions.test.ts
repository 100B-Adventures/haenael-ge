import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  callerGetUser,
  callerFrom,
  callerUpdate,
  callerEq,
  callerSelect,
  callerMaybeSingle,
  serviceRpc,
  revalidatePath,
} = vi.hoisted(() => ({
  callerGetUser: vi.fn(),
  callerFrom: vi.fn(),
  callerUpdate: vi.fn(),
  callerEq: vi.fn(),
  callerSelect: vi.fn(),
  callerMaybeSingle: vi.fn(),
  serviceRpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: callerGetUser },
    from: callerFrom,
  })),
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: vi.fn(() => ({ rpc: serviceRpc })),
  getCashoutAccountEncryptionConfig: vi.fn(() => ({
    activeVersion: 2,
    activeKey: "k".repeat(40),
    keys: { "1": "o".repeat(40), "2": "k".repeat(40) },
  })),
  getCashoutAccountFingerprintKey: vi.fn(() => "f".repeat(40)),
  isCashoutEnabled: vi.fn(() => true),
}));

import { createCashoutRequest } from "../actions";

describe("createCashoutRequest Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callerGetUser.mockResolvedValue({ data: { user: { id: "member-uid" } } });
    callerFrom.mockReturnValue({ update: callerUpdate });
    callerUpdate.mockReturnValue({ eq: callerEq });
    callerEq.mockReturnValue({ select: callerSelect });
    callerSelect.mockReturnValue({ maybeSingle: callerMaybeSingle });
    callerMaybeSingle.mockResolvedValue({ data: { id: "member-uid" }, error: null });
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
      phone: "010-1234-5678",
      requestKey: "cashout_action_01",
    });

    expect(result.ok).toBe(true);
    expect(callerFrom).toHaveBeenCalledWith("member");
    expect(callerUpdate).toHaveBeenCalledWith({ phone: "01012345678" });
    expect(serviceRpc).toHaveBeenCalledWith("create_cashout_request", {
      p_member_id: "member-uid",
      p_clover_amount: 30,
      p_bank_code: "KB",
      p_account_no: "123456789012",
      p_account_holder: "홍길동 님",
      p_request_key: "cashout_action_01",
      p_account_key_version: 2,
      p_account_key: "k".repeat(40),
      p_account_fingerprint_key: "f".repeat(40),
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
      phone: "01012345678",
      requestKey: "cashout_action_02",
    });
    expect(result.ok).toBe(false);
    expect(serviceRpc).not.toHaveBeenCalled();
  });

  it("허용 목록 밖 DB 오류 원문은 고정 코드로 치환한다", async () => {
    serviceRpc.mockResolvedValueOnce({
      data: null,
      error: { code: "XX000", message: "relation secret_internal_table does not exist" },
    });

    const result = await createCashoutRequest({
      cloverAmount: 30,
      bankCode: "KB",
      accountNo: "123456789012",
      accountHolder: "홍길동",
      phone: "01012345678",
      requestKey: "cashout_action_03",
    });

    expect(result).toMatchObject({ ok: false, code: "cashout_request_failed" });
    expect(result.ok ? "" : result.message).not.toContain("secret_internal_table");
  });

  it("전화번호가 없거나 국내 휴대전화 형식이 아니면 저장과 신청 전에 거부한다", async () => {
    const result = await createCashoutRequest({
      cloverAmount: 30,
      bankCode: "KB",
      accountNo: "123456789012",
      accountHolder: "홍길동",
      phone: "02-1234-5678",
      requestKey: "cashout_action_04",
    });

    expect(result).toMatchObject({ ok: false, code: "invalid_phone" });
    expect(callerFrom).not.toHaveBeenCalled();
    expect(serviceRpc).not.toHaveBeenCalled();
  });
});
