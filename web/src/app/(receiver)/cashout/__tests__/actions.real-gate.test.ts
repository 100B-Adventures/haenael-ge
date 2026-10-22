import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 교차 리뷰 MAJOR-2.
 *
 * actions.test.ts 는 `isCashoutAllowedMember` 를 목으로 치환해 거부를 단언한다.
 * 그래서 환경변수에서 판정까지 가는 실제 사슬은 그 파일에서 한 번도 실행되지 않는다.
 * 이 파일은 게이트를 목으로 바꾸지 않고 실제 구현을 쓰며, 화면을 거치지 않은
 * Server Action 직접 호출이 환경변수만으로 거부되는 것을 확인한다.
 */

const { callerGetUser, callerFrom, serviceRpc, serviceFrom } = vi.hoisted(() => ({
  callerGetUser: vi.fn(),
  callerFrom: vi.fn(),
  serviceRpc: vi.fn(),
  serviceFrom: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: callerGetUser },
    from: callerFrom,
  })),
}));
vi.mock("@/lib/supabase/service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase/service")>(
    "@/lib/supabase/service",
  );
  return {
    ...actual,
    createServiceRoleClient: vi.fn(() => ({ rpc: serviceRpc, from: serviceFrom })),
  };
});

const ALLOWED = "11111111-2222-3333-4444-555555555555";
const GENERAL = "99999999-8888-7777-6666-555555555555";

const INPUT = {
  cloverAmount: 30,
  bankCode: "KB",
  accountNo: "123456789012",
  accountHolder: "홍길동",
  phone: "01012345678",
  requestKey: "cashout_real_gate_01",
};

describe("환전 Server Action 의 실제 허용 판정 사슬", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    callerGetUser.mockResolvedValue({ data: { user: { id: GENERAL } } });
    process.env.CASHOUT_ENABLED = "true";
    process.env.CASHOUT_ALLOWED_MEMBER_IDS = ALLOWED;
    process.env.CASHOUT_ACCOUNT_ENCRYPTION_KEYS = '{"1":"0123456789abcdef0123456789abcdef"}';
    process.env.CASHOUT_ACCOUNT_ACTIVE_KEY_VERSION = "1";
    process.env.CASHOUT_ACCOUNT_FINGERPRINT_KEY = "0123456789abcdef0123456789abcdef";
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("허용 목록에 없는 계정은 환경변수 판정만으로 거부되고 DB 쓰기를 시작하지 않는다", async () => {
    const { createCashoutRequest } = await import("../actions");
    const result = await createCashoutRequest(INPUT);

    expect(result).toEqual({ ok: false, code: "cashout_disabled" });
    expect(callerFrom).not.toHaveBeenCalled();
    expect(serviceRpc).not.toHaveBeenCalled();
  });

  it("허용 목록이 비어 있으면 전역 스위치가 켜져 있어도 전원 거부다", async () => {
    process.env.CASHOUT_ALLOWED_MEMBER_IDS = "";
    callerGetUser.mockResolvedValue({ data: { user: { id: ALLOWED } } });

    const { createCashoutRequest } = await import("../actions");
    const result = await createCashoutRequest(INPUT);

    expect(result).toEqual({ ok: false, code: "cashout_disabled" });
    expect(serviceRpc).not.toHaveBeenCalled();
  });

  it("전역 스위치가 꺼지면 허용 목록에 있어도 거부다", async () => {
    process.env.CASHOUT_ENABLED = "false";
    callerGetUser.mockResolvedValue({ data: { user: { id: ALLOWED } } });

    const { createCashoutRequest } = await import("../actions");
    const result = await createCashoutRequest(INPUT);

    expect(result).toEqual({ ok: false, code: "cashout_disabled" });
    expect(serviceRpc).not.toHaveBeenCalled();
  });

  it("운영이 아닌 배포 환경에서는 허용 목록에 있어도 거부다", async () => {
    process.env.VERCEL_ENV = "preview";
    callerGetUser.mockResolvedValue({ data: { user: { id: ALLOWED } } });

    const { createCashoutRequest } = await import("../actions");
    const result = await createCashoutRequest(INPUT);

    expect(result).toEqual({ ok: false, code: "cashout_disabled" });
    expect(serviceRpc).not.toHaveBeenCalled();
  });

  it("허용 목록에 있는 계정은 판정을 통과해 DB 쓰기 단계로 넘어간다", async () => {
    callerGetUser.mockResolvedValue({ data: { user: { id: ALLOWED } } });
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: ALLOWED, phone: "01012345678" }, error: null });
    callerFrom.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle })) })),
      })),
    });
    serviceRpc.mockResolvedValue({ data: null, error: { message: "stop here" } });

    const { createCashoutRequest } = await import("../actions");
    const result = await createCashoutRequest(INPUT);

    expect(result.ok).toBe(false);
    expect(result).not.toEqual({ ok: false, code: "cashout_disabled" });
    expect(serviceRpc).toHaveBeenCalled();
  });
});
