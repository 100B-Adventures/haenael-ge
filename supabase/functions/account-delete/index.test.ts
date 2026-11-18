import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  handleAccountDelete,
  mapAccountDeletionError,
  parseAccountDeleteRequest,
} from "./index.ts";

Deno.test("TC-APP-09-3 인증 없는 계정 삭제는 준비 RPC 전에 거절한다", async () => {
  const response = await handleAccountDelete(
    new Request("http://local", { method: "POST", body: "{}" }),
  );
  assertEquals(response.status, 401);
});

Deno.test("TC-APP-09-4 계정 삭제는 request_key만 받고 회원 ID를 무시한다", () => {
  assertEquals(
    parseAccountDeleteRequest({
      request_key: "account-delete-0001",
      member_id: "00000000-0000-0000-0000-000000000121",
    }),
    { requestKey: "account-delete-0001" },
  );
});

Deno.test("TC-APP-09-5 짧은 멱등키는 삭제 준비 전에 거절한다", () => {
  assertThrows(
    () => parseAccountDeleteRequest({ request_key: "short" }),
    Error,
    "invalid_request_key",
  );
});

Deno.test("TC-APP-09-6 잔액·환전·정산 보류를 안정적인 409 오류로 변환한다", () => {
  assertEquals(
    mapAccountDeletionError(new Error("account_balance_remaining")),
    {
      status: 409,
      code: "account_balance_remaining",
    },
  );
  assertEquals(mapAccountDeletionError(new Error("cashout_in_progress")), {
    status: 409,
    code: "cashout_in_progress",
  });
  assertEquals(
    mapAccountDeletionError(new Error("account_settlement_pending")),
    {
      status: 409,
      code: "account_settlement_pending",
    },
  );
});
