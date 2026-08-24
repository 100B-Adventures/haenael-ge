import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  callerGetUser,
  callerFrom,
  callerUpdate,
  callerEq,
  callerSelect,
  callerMaybeSingle,
  serviceRpc,
  notifyInvoke,
  revalidatePath,
} = vi.hoisted(() => ({
  callerGetUser: vi.fn(),
  callerFrom: vi.fn(),
  callerUpdate: vi.fn(),
  callerEq: vi.fn(),
  callerSelect: vi.fn(),
  callerMaybeSingle: vi.fn(),
  serviceRpc: vi.fn(),
  notifyInvoke: vi.fn(),
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
  createServiceRoleClient: vi.fn(() => ({
    rpc: serviceRpc,
    functions: { invoke: notifyInvoke },
  })),
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
    callerMaybeSingle.mockResolvedValue({
      data: { id: "member-uid", phone: "01012345678" },
      error: null,
    });
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
    notifyInvoke.mockResolvedValue({ data: { channel: "ALIMTALK" }, error: null });
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
    expect(notifyInvoke).toHaveBeenCalledWith("notify", {
      body: {
        memberId: "member-uid",
        type: "CASHOUT_REQUESTED",
        phone: "01012345678",
      },
    });
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
  });

  it("TC-ERR-02 일반 서버 예외의 내부 snake_case 코드는 공개하지 않는다", async () => {
    serviceRpc.mockRejectedValueOnce(new Error("admin_service_unavailable"));

    const result = await createCashoutRequest({
      cloverAmount: 30,
      bankCode: "KB",
      accountNo: "123456789012",
      accountHolder: "홍길동",
      phone: "01012345678",
      requestKey: "cashout_action_internal_error",
    });

    expect(result).toEqual({ ok: false, code: "cashout_request_failed" });
  });

  it.each([
    ["invalid_member", "22023"],
    ["cashout_below_minimum", "22023"],
    ["invalid_bank_code", "22023"],
    ["invalid_account_number", "22023"],
    ["invalid_account_holder", "22023"],
    ["invalid_request_key", "22023"],
    ["cashout_key_version_unavailable", "55000"],
    ["cashout_encryption_unavailable", "55000"],
    ["cashout_fingerprint_unavailable", "55000"],
    ["cashout_kyc_required", "42501"],
    ["cashout_minor_not_allowed", "42501"],
    ["request_key_conflict", "22023"],
    ["cashout_already_requested", "55000"],
    ["cashout_insufficient_balance", "22023"],
  ])("TC-ERR-01 DB RAISE 코드 %s를 실제 코드로 전달한다", async (dbCode, sqlstate) => {
    serviceRpc.mockResolvedValueOnce({
      data: null,
      error: { code: sqlstate, message: dbCode },
    });

    const result = await createCashoutRequest({
      cloverAmount: 30,
      bankCode: "KB",
      accountNo: "123456789012",
      accountHolder: "홍길동",
      phone: "01012345678",
      requestKey: "cashout_action_error_codes",
    });

    expect(result).toEqual({ ok: false, code: dbCode });
    expect(JSON.stringify(result)).toMatch(/^[\x00-\x7F]+$/);
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

  it("환전 신청 후 알림 호출이 실패해도 원래 성공 응답을 유지한다", async () => {
    notifyInvoke.mockRejectedValueOnce(new Error("notify unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createCashoutRequest({
      cloverAmount: 30,
      bankCode: "KB",
      accountNo: "123456789012",
      accountHolder: "홍길동",
      phone: "01012345678",
      requestKey: "cashout_action_05",
    });

    expect(result).toMatchObject({ ok: true, data: { requestId: 71 } });
    expect(revalidatePath).toHaveBeenCalledWith("/cashout/status");
    consoleError.mockRestore();
  });

  it("멱등 재호출은 신청 알림을 중복 발송하지 않는다", async () => {
    serviceRpc.mockResolvedValueOnce({
      data: [{
        cashout_request_id: 71,
        status: "REQUESTED",
        clover_amount: 30,
        gross_krw: 30_000,
        fee_krw: 0,
        withholding_krw: 990,
        net_krw: 29_010,
        requested_at: "2026-08-02T00:00:00.000Z",
        is_replay: true,
      }],
      error: null,
    });

    const result = await createCashoutRequest({
      cloverAmount: 30,
      bankCode: "KB",
      accountNo: "123456789012",
      accountHolder: "홍길동",
      phone: "01012345678",
      requestKey: "cashout_action_06",
    });

    expect(result).toMatchObject({ ok: true, data: { isReplay: true } });
    expect(notifyInvoke).not.toHaveBeenCalled();
  });
});
