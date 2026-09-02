import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getCashoutAccountEncryptionConfig,
  getCashoutAccountFingerprintKey,
} from "../service";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("cashout server-only secret configuration", () => {
  it("활성 버전과 과거 버전을 함께 보존한 keyring을 파싱한다", () => {
    process.env.CASHOUT_ACCOUNT_ENCRYPTION_KEYS = JSON.stringify({
      1: "o".repeat(40),
      2: "n".repeat(40),
    });
    process.env.CASHOUT_ACCOUNT_ACTIVE_KEY_VERSION = "2";

    expect(getCashoutAccountEncryptionConfig()).toEqual({
      activeVersion: 2,
      activeKey: "n".repeat(40),
      keys: { "1": "o".repeat(40), "2": "n".repeat(40) },
    });
  });

  it("활성 버전 키가 keyring에 없으면 fail closed 한다", () => {
    process.env.CASHOUT_ACCOUNT_ENCRYPTION_KEYS = JSON.stringify({
      1: "o".repeat(40),
    });
    process.env.CASHOUT_ACCOUNT_ACTIVE_KEY_VERSION = "2";

    expect(() => getCashoutAccountEncryptionConfig()).toThrow(
      "cashout_encryption_unavailable",
    );
  });

  it("fingerprint 키는 별도 환경변수에서만 읽고 32자 미만을 거부한다", () => {
    process.env.CASHOUT_ACCOUNT_FINGERPRINT_KEY = "short";
    expect(() => getCashoutAccountFingerprintKey()).toThrow(
      "cashout_fingerprint_unavailable",
    );

    process.env.CASHOUT_ACCOUNT_FINGERPRINT_KEY = "f".repeat(40);
    expect(getCashoutAccountFingerprintKey()).toBe("f".repeat(40));
  });
});
