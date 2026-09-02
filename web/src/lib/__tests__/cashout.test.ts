import { describe, expect, it } from "vitest";
import { maskAccountNumber } from "../cashout";

describe("maskAccountNumber", () => {
  it("8자리와 20자리 계좌를 같은 길이로 마스킹한다", () => {
    const shortAccount = maskAccountNumber("12345678");
    const longAccount = maskAccountNumber("12345678901234567890");

    expect(shortAccount).toBe("••••••5678");
    expect(longAccount).toBe("••••••7890");
    expect(shortAccount).toHaveLength(longAccount.length);
  });
});
