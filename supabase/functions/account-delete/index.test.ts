import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  authorizeAccountDeletion,
  blocksAuthDeletionForAppleRevocation,
  handleAccountDelete,
  mapAccountDeletionError,
  parseAccountDeleteRequest,
  revokeAppleCredential,
} from "./index.ts";

Deno.test("TC-APP-09-3 인증 없는 계정 삭제는 준비 RPC 전에 거절한다", async () => {
  const response = await handleAccountDelete(
    new Request("http://local", { method: "POST", body: "{}" }),
  );
  assertEquals(response.status, 401);
});

Deno.test("TC-APP-09-12 Apple 폐기 확인 전에는 DB 삭제 준비를 호출하지 않는다", async () => {
  const blockedCalls: string[] = [];
  const blocked = await authorizeAccountDeletion({
    prepareAppleRevocation: () => {
      blockedCalls.push("apple");
      return Promise.resolve("manual_required" as const);
    },
    prepareDatabaseDeletion: () => {
      blockedCalls.push("database");
      return Promise.resolve();
    },
  });
  assertEquals(blocked, "manual_required");
  assertEquals(blockedCalls, ["apple"]);

  const allowedCalls: string[] = [];
  const allowed = await authorizeAccountDeletion({
    prepareAppleRevocation: () => {
      allowedCalls.push("apple");
      return Promise.resolve("revoked" as const);
    },
    prepareDatabaseDeletion: () => {
      allowedCalls.push("database");
      return Promise.resolve();
    },
  });
  assertEquals(allowed, "prepared");
  assertEquals(allowedCalls, ["apple", "database"]);
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

Deno.test("TC-APP-09-8 Apple access token도 공식 revoke endpoint에서 폐기한다", async () => {
  let capturedUrl = "";
  let capturedType = "";
  let capturedBody = "";
  await revokeAppleCredential({
    clientId: "com.haenael.app",
    clientSecret: "signed-client-secret",
    token: "apple-access-token",
    tokenTypeHint: "access_token",
    fetcher: (input, init) => {
      const request = new Request(input, init);
      capturedUrl = request.url;
      capturedType = request.headers.get("content-type") ?? "";
      capturedBody = String(init?.body ?? "");
      return Promise.resolve(new Response(null, { status: 200 }));
    },
  });
  assertEquals(capturedUrl, "https://appleid.apple.com/auth/revoke");
  assertEquals(capturedType, "application/x-www-form-urlencoded");
  assertEquals(capturedBody.includes("token_type_hint=access_token"), true);
});

Deno.test("TC-APP-09-11 Apple 토큰 폐기 대기 중에는 Auth 삭제를 차단한다", () => {
  assertEquals(blocksAuthDeletionForAppleRevocation("manual_required"), true);
  assertEquals(blocksAuthDeletionForAppleRevocation("retry_required"), true);
  assertEquals(blocksAuthDeletionForAppleRevocation("revoked"), false);
  assertEquals(blocksAuthDeletionForAppleRevocation("not_applicable"), false);
});
