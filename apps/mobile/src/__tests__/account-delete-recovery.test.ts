import { describe, expect, it } from "vitest";
import {
  clearAccountDeletionRequestKey,
  getOrCreateAccountDeletionRequestKey,
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

describe("계정 삭제 재개", () => {
  it("TC-APP-09-7 실패 뒤 재시도는 성공 전까지 같은 request key를 보존한다", async () => {
    const storage = memoryStorage();
    const first = await getOrCreateAccountDeletionRequestKey(storage, () => "account-delete-fixed");
    const retry = await getOrCreateAccountDeletionRequestKey(storage, () => "must-not-be-used");
    expect(retry).toBe(first);
    await clearAccountDeletionRequestKey(storage);
    expect(await getOrCreateAccountDeletionRequestKey(storage, () => "account-delete-next"))
      .toBe("account-delete-next");
  });
});
