import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import {
  AppleCredentialRejectedError,
  advanceAccountDeletion,
  handleAccountDelete,
  mapAccountDeletionError,
  revokeAppleCredential,
} from "./index.ts";

Deno.test("TC-APP-09-1 인증 없는 계정 삭제는 서버 작업 생성 전에 거절한다", async () => {
  const response = await handleAccountDelete(
    new Request("http://local", { method: "POST", body: "{}" }),
  );
  assertEquals(response.status, 401);
});

Deno.test("TC-APP-09-4 서버 상태 기계는 외부 폐기 뒤에만 데이터·Auth를 삭제한다", async () => {
  const calls: string[] = [];
  const result = await advanceAccountDeletion({
    requestJob: async () => { calls.push("request"); return "REQUESTED"; },
    revokeExternal: async () => { calls.push("revoke"); return "revoked"; },
    markExternalRevoked: async () => { calls.push("mark-external"); return "EXTERNAL_REVOKED"; },
    deleteStorage: async () => { calls.push("storage"); },
    deleteData: async () => { calls.push("data"); return "DATA_DELETED"; },
    deleteAuth: async () => { calls.push("auth"); },
    completeAuth: async () => { calls.push("complete"); return "AUTH_DELETED"; },
  });
  assertEquals(result, "AUTH_DELETED");
  assertEquals(calls, ["request", "revoke", "mark-external", "storage", "data", "auth", "complete"]);
});

Deno.test("TC-APP-09-7 Apple 토큰이 없으면 외부 폐기 상태 전에 멈춘다", async () => {
  const calls: string[] = [];
  const result = await advanceAccountDeletion({
    requestJob: async () => "REQUESTED",
    revokeExternal: async () => "manual_required",
    markExternalRevoked: async () => { calls.push("mark-external"); return "EXTERNAL_REVOKED"; },
    deleteStorage: async () => { calls.push("storage"); },
    deleteData: async () => { calls.push("data"); return "DATA_DELETED"; },
    deleteAuth: async () => { calls.push("auth"); },
    completeAuth: async () => "AUTH_DELETED",
  });
  assertEquals(result, "manual_required");
  assertEquals(calls, []);
});

Deno.test("TC-APP-09-8 Apple invalid_grant는 사용자 재인증 대상으로 분류한다", async () => {
  await assertRejects(
    () => revokeAppleCredential({
      clientId: "com.haenael.app",
      clientSecret: "signed-client-secret",
      token: "expired-apple-token",
      tokenTypeHint: "refresh_token",
      fetcher: () => Promise.resolve(new Response(
        JSON.stringify({ error: "invalid_grant" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )),
    }),
    AppleCredentialRejectedError,
    "apple_revoke_credential_invalid",
  );
});

Deno.test("TC-APP-09-2 잔액·환전·정산 보류를 안정적인 409 오류로 변환한다", () => {
  assertEquals(mapAccountDeletionError(new Error("account_balance_remaining")), { status: 409, code: "account_balance_remaining" });
  assertEquals(mapAccountDeletionError(new Error("cashout_in_progress")), { status: 409, code: "cashout_in_progress" });
  assertEquals(mapAccountDeletionError(new Error("account_settlement_pending")), { status: 409, code: "account_settlement_pending" });
});
