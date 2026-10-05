import { describe, expect, it, vi } from "vitest";
import {
  assertProviderLookupSucceeded,
  generateVerifiedMagicLink,
  rollbackCreatedAuthUser,
} from "./security";

describe("auth-kakao 보안 경계", () => {
  it("AUTH-NEG-01 잘못된 user_id로 생성된 링크는 거부한다", async () => {
    await expect(
      generateVerifiedMagicLink("expected-user", {
        getUserById: vi.fn().mockResolvedValue({
          user: { id: "expected-user", email: "stored@example.com" },
          error: null,
        }),
        generateMagicLink: vi.fn().mockResolvedValue({
          user: { id: "attacker-user", email: "stored@example.com" },
          hashedToken: "wrong-user-token",
          error: null,
        }),
      }),
    ).rejects.toThrow("generated link user mismatch");
  });

  it("AUTH-OK-01 요청에서 계산한 이메일이 아니라 Auth 저장 이메일로 링크를 발급한다", async () => {
    const generateMagicLink = vi.fn().mockResolvedValue({
      user: { id: "expected-user", email: "stored@example.com" },
      hashedToken: "verified-token",
      error: null,
    });

    await expect(
      generateVerifiedMagicLink("expected-user", {
        getUserById: vi.fn().mockResolvedValue({
          user: { id: "expected-user", email: "stored@example.com" },
          error: null,
        }),
        generateMagicLink,
      }),
    ).resolves.toBe("verified-token");
    expect(generateMagicLink).toHaveBeenCalledWith("stored@example.com");
  });

  it("AUTH-NEG-02 기존 계정 분기에서는 member 저장 실패여도 Auth 사용자를 삭제하지 않는다", async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    await rollbackCreatedAuthUser(false, "existing-user", deleteUser);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("AUTH-OK-02 이번 호출에서 만든 사용자만 보상 삭제한다", async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    await rollbackCreatedAuthUser(true, "new-user", deleteUser);
    expect(deleteUser).toHaveBeenCalledWith("new-user");
  });

  it("AUTH-NEG-03 provider 조회 오류를 없는 회원으로 취급하지 않고 즉시 거부한다", () => {
    expect(() => assertProviderLookupSucceeded({ message: "db timeout" }))
      .toThrow("provider lookup failed");
  });
});
