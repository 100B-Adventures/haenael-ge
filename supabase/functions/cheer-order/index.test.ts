import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleCheerOrder } from "./index.ts";

const SUPPORTER_ID = "61000000-0000-0000-0000-000000000001";

function setSupabaseEnv() {
  Deno.env.set("SUPABASE_URL", "http://127.0.0.1:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
}

function dependencies({
  user = { id: SUPPORTER_ID },
  authError = null,
  nickname = "이다솔",
  rpc = async () => ({
    data: [{ payment_id: 1, cheer_id: 2, order_id: "hnl_test_order", is_replay: false }],
    error: null,
  }),
}: {
  user?: { id: string } | null;
  authError?: { message: string } | null;
  nickname?: string | null;
  rpc?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
} = {}) {
  const memberQuery = {
    select: () => memberQuery,
    eq: () => memberQuery,
    maybeSingle: async () => ({
      data: nickname === null ? null : { nickname },
      error: null,
    }),
  };
  return {
    createSupabaseClient: (() => ({
      auth: { getUser: async () => ({ data: { user }, error: authError }) },
      from: (table: string) => {
        if (table !== "member") throw new Error(`unexpected table: ${table}`);
        return memberQuery;
      },
      rpc,
    })) as never,
  };
}

Deno.test("D057-AUTH-01 로그인 토큰이 없으면 login_required를 반환한다", async () => {
  Deno.env.set("PAYMENTS_ENABLED", "true");

  const response = await handleCheerOrder(
    new Request("https://f.test/cheer-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId: 1, amountKrw: 1000 }),
    }),
  );

  assertEquals(response.status, 401);
  assertEquals(await response.json(), { error: { code: "login_required" } });
});

Deno.test(
  "결제가 비활성화되면 code-only 오류를 반환하고 외부 결제를 호출하지 않는다",
  async () => {
    Deno.env.set("PAYMENTS_ENABLED", "false");

    const response = await handleCheerOrder(
      new Request("https://f.test/cheer-order", {
        method: "POST",
        headers: { Authorization: "Bearer test" },
      }),
    );

    assertEquals(response.status, 503);
    assertEquals(await response.json(), {
      error: { code: "payments_disabled" },
    });
  },
);

Deno.test("D057-AUTH-02 유효하지 않은 토큰은 주문 전에 거절한다", async () => {
  Deno.env.set("PAYMENTS_ENABLED", "true");
  setSupabaseEnv();

  const response = await handleCheerOrder(
    new Request("https://f.test/cheer-order", {
      method: "POST",
      headers: { Authorization: "Bearer expired" },
    }),
    dependencies({ user: null, authError: { message: "expired" } }),
  );

  assertEquals(response.status, 401);
  assertEquals(await response.json(), { error: { code: "login_required" } });
});

Deno.test("주문 요청 형식 오류는 code-only 오류를 반환한다", async () => {
  Deno.env.set("PAYMENTS_ENABLED", "true");
  setSupabaseEnv();

  const response = await handleCheerOrder(
    new Request("https://f.test/cheer-order", {
      method: "POST",
      headers: {
        Authorization: "Bearer test",
        "Content-Type": "application/json",
      },
      body: "not-json",
    }),
    dependencies(),
  );

  assertEquals(response.status, 400);
  assertEquals(await response.json(), { error: { code: "invalid_json" } });
});

Deno.test("D057-AUTH-03 회원 주문은 귀속 포함 원자 RPC만 호출한다", async () => {
  Deno.env.set("PAYMENTS_ENABLED", "true");
  setSupabaseEnv();
  let calledName = "";
  let calledArgs: Record<string, unknown> = {};

  const response = await handleCheerOrder(
    new Request("https://f.test/cheer-order", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        goalId: 1,
        amountKrw: 1000,
        isAnonymous: true,
        requestKey: "d057_request_key",
      }),
    }),
    dependencies({
      rpc: async (name, args) => {
        calledName = name;
        calledArgs = args;
        return {
          data: [{ payment_id: 1, cheer_id: 2, order_id: "hnl_test_order", is_replay: false }],
          error: null,
        };
      },
    }),
  );

  assertEquals(response.status, 201);
  assertEquals(calledName, "create_member_cheer_order");
  assertEquals(calledArgs.p_supporter_member_id, SUPPORTER_ID);
  assertEquals(calledArgs.p_display_name, "");
});

Deno.test("D057-NAME-01 비익명 표시 이름은 요청값이 아니라 로그인 회원 이름으로 고정한다", async () => {
  Deno.env.set("PAYMENTS_ENABLED", "true");
  setSupabaseEnv();
  let calledArgs: Record<string, unknown> = {};

  const response = await handleCheerOrder(
    new Request("https://f.test/cheer-order", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        goalId: 1,
        amountKrw: 1000,
        displayName: "마음대로 바꾼 이름",
        isAnonymous: false,
      }),
    }),
    dependencies({
      nickname: "이다솔",
      rpc: async (_name, args) => {
        calledArgs = args;
        return {
          data: [{ payment_id: 1, cheer_id: 2, order_id: "hnl_test_order", is_replay: false }],
          error: null,
        };
      },
    }),
  );

  assertEquals(response.status, 201);
  assertEquals(calledArgs.p_display_name, "이다솔");
});

Deno.test("D057-NAME-03 이름 없는 로그인 회원도 익명 응원은 주문할 수 있다", async () => {
  Deno.env.set("PAYMENTS_ENABLED", "true");
  setSupabaseEnv();
  let calledArgs: Record<string, unknown> = {};

  const response = await handleCheerOrder(
    new Request("https://f.test/cheer-order", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        goalId: 1,
        amountKrw: 1000,
        isAnonymous: true,
      }),
    }),
    dependencies({
      nickname: null,
      rpc: async (_name, args) => {
        calledArgs = args;
        return {
          data: [{ payment_id: 1, cheer_id: 2, order_id: "hnl_test_order", is_replay: false }],
          error: null,
        };
      },
    }),
  );

  assertEquals(response.status, 201);
  assertEquals(calledArgs.p_is_anonymous, true);
  assertEquals(calledArgs.p_display_name, "");
});

Deno.test("D057-NAME-04 이름 없는 로그인 회원의 비익명 응원은 거절한다", async () => {
  Deno.env.set("PAYMENTS_ENABLED", "true");
  setSupabaseEnv();

  const response = await handleCheerOrder(
    new Request("https://f.test/cheer-order", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        goalId: 1,
        amountKrw: 1000,
        isAnonymous: false,
      }),
    }),
    dependencies({ nickname: null }),
  );

  assertEquals(response.status, 409);
  assertEquals(await response.json(), { error: { code: "profile_name_required" } });
});
