import { describe, expect, it } from "vitest";
import {
  beginAccountDeletionForMember,
  getAccountDeletionMember,
  retryAccountDeletionAfterAppleReauthentication,
  type AccountDeletionStorage,
} from "../lib/account-delete-recovery";

function memoryStorage(): AccountDeletionStorage {
  let value: string | null = null;
  return {
    getItem: async () => value,
    setItem: async (_key, next) => { value = next; },
    removeItem: async () => { value = null; },
  };
}

describe("계정 삭제 서버 작업 재개", () => {
  it("TC-APP-09-3 클라이언트는 요청 키 없이 삭제를 시작한 회원 ID만 보관한다", async () => {
    const storage = memoryStorage();
    await beginAccountDeletionForMember(storage, "member-A");
    expect(await getAccountDeletionMember(storage)).toBe("member-A");
  });

  it("TC-APP-09-10 Apple 재인증이 다른 회원으로 바뀌면 이전 삭제 정보를 폐기하고 재호출하지 않는다", async () => {
    const storage = memoryStorage();
    await beginAccountDeletionForMember(storage, "member-A");
    const calls: string[] = [];

    await expect(retryAccountDeletionAfterAppleReauthentication({
      memberId: "member-A",
      storage,
      invokeDelete: async () => {
        calls.push("delete");
        return { ok: false, code: "apple_reauthentication_required" };
      },
      reauthenticateApple: async () => {
        calls.push("reauthenticate");
        return { memberId: "member-B" };
      },
    })).rejects.toThrow("account_session_changed");

    expect(calls).toEqual(["delete", "reauthenticate"]);
    expect(await getAccountDeletionMember(storage)).toBeNull();
  });

  it("TC-APP-09-8 같은 회원 Apple 재인증은 서버 작업을 회원 ID로 재개한다", async () => {
    const storage = memoryStorage();
    await beginAccountDeletionForMember(storage, "member-A");
    let attempt = 0;
    await retryAccountDeletionAfterAppleReauthentication({
      memberId: "member-A",
      storage,
      invokeDelete: async () => {
        attempt += 1;
        return attempt === 1
          ? { ok: false, code: "apple_reauthentication_required" }
          : { ok: true };
      },
      reauthenticateApple: async () => ({ memberId: "member-A" }),
    });
    expect(attempt).toBe(2);
  });
});
