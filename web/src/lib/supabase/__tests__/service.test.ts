import { afterEach, describe, expect, it, vi } from "vitest";

import { isCashoutAllowedMember } from "../service";

const ALLOWED_MEMBER_ID = "11111111-1111-4111-8111-111111111111";
const GENERAL_MEMBER_ID = "22222222-2222-4222-8222-222222222222";

describe("cashout server allowlist", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("P0-01 허용 계정은 전역 스위치와 서버 allowlist가 모두 맞을 때만 통과한다", () => {
    vi.stubEnv("CASHOUT_ENABLED", "true");
    vi.stubEnv("CASHOUT_ALLOWED_MEMBER_IDS", ` ${ALLOWED_MEMBER_ID.toUpperCase()} `);

    expect(isCashoutAllowedMember(ALLOWED_MEMBER_ID)).toBe(true);
  });

  it("P0-01 일반 계정과 빈 allowlist는 기본 거부한다", () => {
    vi.stubEnv("CASHOUT_ENABLED", "true");
    vi.stubEnv("CASHOUT_ALLOWED_MEMBER_IDS", ALLOWED_MEMBER_ID);
    expect(isCashoutAllowedMember(GENERAL_MEMBER_ID)).toBe(false);

    vi.stubEnv("CASHOUT_ALLOWED_MEMBER_IDS", "");
    expect(isCashoutAllowedMember(ALLOWED_MEMBER_ID)).toBe(false);
  });

  it("P0-01 전역 스위치가 꺼지거나 잘못된 ID면 allowlist 값과 무관하게 거부한다", () => {
    vi.stubEnv("CASHOUT_ALLOWED_MEMBER_IDS", ALLOWED_MEMBER_ID);
    vi.stubEnv("CASHOUT_ENABLED", "false");
    expect(isCashoutAllowedMember(ALLOWED_MEMBER_ID)).toBe(false);

    vi.stubEnv("CASHOUT_ENABLED", "true");
    expect(isCashoutAllowedMember("not-a-member-id")).toBe(false);
  });

  it("P0-01 preview 환경은 allowlist 일치 여부와 무관하게 거부한다", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CASHOUT_ENABLED", "true");
    vi.stubEnv("CASHOUT_ALLOWED_MEMBER_IDS", ALLOWED_MEMBER_ID);

    expect(isCashoutAllowedMember(ALLOWED_MEMBER_ID)).toBe(false);
  });

  it("P0-01 빈 구분자는 무시하고 잘못된 항목은 값 없이 경고한다", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("CASHOUT_ENABLED", "true");
    vi.stubEnv(
      "CASHOUT_ALLOWED_MEMBER_IDS",
      `, ${ALLOWED_MEMBER_ID}, not-a-uuid,`,
    );

    expect(isCashoutAllowedMember(ALLOWED_MEMBER_ID)).toBe(true);
    expect(warning).toHaveBeenCalledWith(
      "[cashout-gate] invalid allowlist member ids ignored",
      { invalidCount: 1 },
    );
    warning.mockRestore();
  });
});
