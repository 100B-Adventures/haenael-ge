import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getCashoutAccountEncryptionConfig,
  getCashoutAccountFingerprintKey,
  isCashoutAllowedMember,
  isCashoutEnabled,
  isCashoutStagingTestMode,
} from "../service";

const ALLOWED_MEMBER_ID = "11111111-1111-4111-8111-111111111111";
const GENERAL_MEMBER_ID = "22222222-2222-4222-8222-222222222222";
const STAGING_ORIGIN = "https://ezzklgotgydwxqebfoys.supabase.co";
const PROD_ORIGIN = "https://ossvejipdivgxzcqszbw.supabase.co";
const TEST_ENCRYPTION_KEY = "s".repeat(40);
const TEST_FINGERPRINT_KEY = "t".repeat(40);

function stubValidStagingTest() {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", STAGING_ORIGIN);
  vi.stubEnv("CASHOUT_STAGING_TEST_ENABLED", "true");
  vi.stubEnv("CASHOUT_STAGING_TEST_ALLOWED_MEMBER_IDS", ALLOWED_MEMBER_ID);
  vi.stubEnv("CASHOUT_STAGING_TEST_ACCOUNT_ENCRYPTION_KEY", TEST_ENCRYPTION_KEY);
  vi.stubEnv("CASHOUT_STAGING_TEST_ACCOUNT_FINGERPRINT_KEY", TEST_FINGERPRINT_KEY);
}

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

  it.each([
    ["opt-in 없음", STAGING_ORIGIN, undefined],
    ["잘못된 DB", "https://wrong-project.supabase.co", "true"],
    ["운영 DB", PROD_ORIGIN, "true"],
    ["잘못된 protocol", "http://ezzklgotgydwxqebfoys.supabase.co", "true"],
  ])("D053-NEG %s이면 Preview를 거부한다", (_case, url, optIn) => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
    if (optIn) vi.stubEnv("CASHOUT_STAGING_TEST_ENABLED", optIn);
    vi.stubEnv("CASHOUT_STAGING_TEST_ALLOWED_MEMBER_IDS", ALLOWED_MEMBER_ID);
    vi.stubEnv("CASHOUT_STAGING_TEST_ACCOUNT_ENCRYPTION_KEY", TEST_ENCRYPTION_KEY);
    vi.stubEnv("CASHOUT_STAGING_TEST_ACCOUNT_FINGERPRINT_KEY", TEST_FINGERPRINT_KEY);
    vi.stubEnv("CASHOUT_ENABLED", "true");
    vi.stubEnv("CASHOUT_ALLOWED_MEMBER_IDS", ALLOWED_MEMBER_ID);

    expect(isCashoutStagingTestMode()).toBe(false);
    expect(isCashoutEnabled()).toBe(false);
    expect(isCashoutAllowedMember(ALLOWED_MEMBER_ID)).toBe(false);
  });

  it("D053-NEG 일반 Preview는 운영 키와 opt-in이 있어도 거부한다", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://branch-preview.supabase.co");
    vi.stubEnv("CASHOUT_STAGING_TEST_ENABLED", "true");
    vi.stubEnv("CASHOUT_ENABLED", "true");
    vi.stubEnv("CASHOUT_ALLOWED_MEMBER_IDS", ALLOWED_MEMBER_ID);
    vi.stubEnv("CASHOUT_ACCOUNT_ENCRYPTION_KEYS", JSON.stringify({ "1": "p".repeat(40) }));
    vi.stubEnv("CASHOUT_ACCOUNT_FINGERPRINT_KEY", "q".repeat(40));

    expect(isCashoutAllowedMember(ALLOWED_MEMBER_ID)).toBe(false);
  });

  it("D053-NEG 전용 allowlist가 비거나 다른 회원이면 staging도 거부한다", () => {
    stubValidStagingTest();
    vi.stubEnv("CASHOUT_STAGING_TEST_ALLOWED_MEMBER_IDS", "");
    expect(isCashoutAllowedMember(ALLOWED_MEMBER_ID)).toBe(false);

    vi.stubEnv("CASHOUT_STAGING_TEST_ALLOWED_MEMBER_IDS", GENERAL_MEMBER_ID);
    expect(isCashoutAllowedMember(ALLOWED_MEMBER_ID)).toBe(false);
  });

  it.each([
    ["암호화 키 없음", "CASHOUT_STAGING_TEST_ACCOUNT_ENCRYPTION_KEY"],
    ["지문 키 없음", "CASHOUT_STAGING_TEST_ACCOUNT_FINGERPRINT_KEY"],
  ])("D053-NEG %s이면 운영 키로 fallback하지 않고 거부한다", (_case, missing) => {
    stubValidStagingTest();
    vi.stubEnv(missing, "");
    vi.stubEnv("CASHOUT_ACCOUNT_ENCRYPTION_KEYS", JSON.stringify({ "1": "p".repeat(40) }));
    vi.stubEnv("CASHOUT_ACCOUNT_FINGERPRINT_KEY", "q".repeat(40));

    expect(isCashoutAllowedMember(ALLOWED_MEMBER_ID)).toBe(false);
  });

  it("D053-POS 정확한 staging 계약은 전용 키만 선택한다", () => {
    stubValidStagingTest();
    vi.stubEnv("CASHOUT_ACCOUNT_ENCRYPTION_KEYS", "not-json");
    vi.stubEnv("CASHOUT_ACCOUNT_FINGERPRINT_KEY", "short");

    expect(isCashoutStagingTestMode()).toBe(true);
    expect(isCashoutAllowedMember(ALLOWED_MEMBER_ID)).toBe(true);
    expect(getCashoutAccountEncryptionConfig()).toEqual({
      activeVersion: 1,
      activeKey: TEST_ENCRYPTION_KEY,
      keys: { "1": TEST_ENCRYPTION_KEY },
    });
    expect(getCashoutAccountFingerprintKey()).toBe(TEST_FINGERPRINT_KEY);
  });

  it("D053-REG production은 test 키 오염을 무시하고 기존 production 키를 선택한다", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", PROD_ORIGIN);
    vi.stubEnv("CASHOUT_ENABLED", "true");
    vi.stubEnv("CASHOUT_ALLOWED_MEMBER_IDS", ALLOWED_MEMBER_ID);
    vi.stubEnv("CASHOUT_ACCOUNT_ENCRYPTION_KEYS", JSON.stringify({ "2": "p".repeat(40) }));
    vi.stubEnv("CASHOUT_ACCOUNT_ACTIVE_KEY_VERSION", "2");
    vi.stubEnv("CASHOUT_ACCOUNT_FINGERPRINT_KEY", "q".repeat(40));
    vi.stubEnv("CASHOUT_STAGING_TEST_ENABLED", "true");
    vi.stubEnv("CASHOUT_STAGING_TEST_ACCOUNT_ENCRYPTION_KEY", TEST_ENCRYPTION_KEY);
    vi.stubEnv("CASHOUT_STAGING_TEST_ACCOUNT_FINGERPRINT_KEY", TEST_FINGERPRINT_KEY);

    expect(isCashoutAllowedMember(ALLOWED_MEMBER_ID)).toBe(true);
    expect(getCashoutAccountEncryptionConfig().activeKey).toBe("p".repeat(40));
    expect(getCashoutAccountFingerprintKey()).toBe("q".repeat(40));
  });

  it("D053-REG local은 기존 production 이름의 키와 allowlist를 유지한다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("CASHOUT_ENABLED", "true");
    vi.stubEnv("CASHOUT_ALLOWED_MEMBER_IDS", ALLOWED_MEMBER_ID);
    vi.stubEnv("CASHOUT_ACCOUNT_ENCRYPTION_KEY", "l".repeat(40));
    vi.stubEnv("CASHOUT_ACCOUNT_FINGERPRINT_KEY", "m".repeat(40));

    expect(isCashoutAllowedMember(ALLOWED_MEMBER_ID)).toBe(true);
    expect(getCashoutAccountEncryptionConfig().activeKey).toBe("l".repeat(40));
    expect(getCashoutAccountFingerprintKey()).toBe("m".repeat(40));
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
