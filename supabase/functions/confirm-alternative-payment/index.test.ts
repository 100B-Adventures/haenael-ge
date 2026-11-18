import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  beginAlternativePaymentConfirmation,
  handleConfirmAlternativePayment,
  normalizeAlternativePayment,
  parseAlternativePaymentRequest,
  recordCompensationFailure,
} from "./index.ts";

Deno.test("TC-APP-09-5 공급자 호출 전 결제 확인 작업을 회원 잠금 RPC로 시작한다", async () => {
  const calls: unknown[] = [];
  const state = await beginAlternativePaymentConfirmation({
    rpc: (name: string, args: unknown) => {
      calls.push({ name, args });
      return Promise.resolve({ data: "CONFIRMING", error: null });
    },
  } as never, {
    intentId: "00000000-0000-0000-0000-000000000111",
    memberId: "00000000-0000-0000-0000-000000000113",
    requestKey: "request-key-0001",
  });
  assertEquals(state, "CONFIRMING");
  assertEquals(calls, [{
    name: "begin_alternative_payment_confirmation",
    args: {
      p_intent_id: "00000000-0000-0000-0000-000000000111",
      p_member_id: "00000000-0000-0000-0000-000000000113",
      p_request_key: "request-key-0001",
    },
  }]);
});

Deno.test("TC-APP-02-4 인증 없는 대체결제 승인은 공급자 호출 전에 거절한다", async () => {
  const response = await handleConfirmAlternativePayment(
    new Request("http://local", { method: "POST", body: "{}" }),
  );
  assertEquals(response.status, 401);
});

Deno.test("TC-APP-02-5 대체결제 요청은 클라이언트 금액을 받지 않는다", () => {
  const parsed = parseAlternativePaymentRequest({
    intent_id: "00000000-0000-0000-0000-000000000111",
    account_binding: "00000000-0000-0000-0000-000000000112",
    payment_key: "payment-key-00000001",
    order_id: "order-00000001",
    external_transaction_token: "external-token-00000001",
    request_key: "request-key-0001",
    amount: 1,
  });
  assertEquals(Object.hasOwn(parsed, "amount"), false);
});

Deno.test("TC-APP-02-6 서버 카탈로그 1,100원과 토스 승인 결합값을 모두 대조한다", () => {
  const result = normalizeAlternativePayment({
    paymentKey: "payment-key-00000001",
    orderId: "order-00000001",
    status: "DONE",
    totalAmount: 1100,
    method: "간편결제",
    approvedAt: "2026-11-18T06:10:00Z",
    mId: "haenael-alt-mid",
    orderName: "haenael.cheer.clover.1",
    metadata: {
      accountBinding: "00000000-0000-0000-0000-000000000112",
      productId: "haenael.cheer.clover.1",
    },
  }, {
    paymentKey: "payment-key-00000001",
    orderId: "order-00000001",
    accountBinding: "00000000-0000-0000-0000-000000000112",
    productId: "haenael.cheer.clover.1",
    expectedAmount: 1100,
    expectedMid: "haenael-alt-mid",
  });
  assertEquals(result.grossAmountMinor, 1100);
  assertEquals(result.pretaxAmountMinor, 1000);
  assertEquals(result.taxAmountMinor, 100);
});

Deno.test("TC-APP-02-7 토스 승인 금액이 서버 카탈로그와 다르면 적립 전에 거절한다", () => {
  assertThrows(
    () =>
      normalizeAlternativePayment({
        paymentKey: "payment-key-00000001",
        orderId: "order-00000001",
        status: "DONE",
        totalAmount: 1,
        method: "간편결제",
        approvedAt: "2026-11-18T06:10:00Z",
        mId: "haenael-alt-mid",
        orderName: "haenael.cheer.clover.1",
        metadata: {
          accountBinding: "00000000-0000-0000-0000-000000000112",
          productId: "haenael.cheer.clover.1",
        },
      }, {
        paymentKey: "payment-key-00000001",
        orderId: "order-00000001",
        accountBinding: "00000000-0000-0000-0000-000000000112",
        productId: "haenael.cheer.clover.1",
        expectedAmount: 1100,
        expectedMid: "haenael-alt-mid",
      }),
    Error,
    "payment_amount_mismatch",
  );
});

Deno.test("TC-APP-02-8 외부거래 토큰 누락은 환경변수나 DB를 읽기 전에 422로 거절한다", async () => {
  const response = await handleConfirmAlternativePayment(
    new Request("http://local", {
      method: "POST",
      headers: { Authorization: "Bearer fixture" },
      body: JSON.stringify({
        intent_id: "00000000-0000-0000-0000-000000000111",
        account_binding: "00000000-0000-0000-0000-000000000112",
        payment_key: "payment-key-00000001",
        order_id: "order-00000001",
        request_key: "request-key-0001",
      }),
    }),
  );
  assertEquals(response.status, 422);
  assertEquals(await response.json(), {
    error: { code: "external_transaction_token_required" },
  });
});

Deno.test("TC-APP-02-12 승인과 취소가 엇갈리면 복구 원장 RPC를 원 결제 결합값으로 호출한다", async () => {
  const calls: unknown[] = [];
  const admin = {
    rpc: (name: string, args: unknown) => {
      calls.push({ name, args });
      return Promise.resolve({ error: null });
    },
  };
  await recordCompensationFailure(admin as never, {
    intentId: "00000000-0000-0000-0000-000000000111",
    memberId: "00000000-0000-0000-0000-000000000113",
    paymentKey: "payment-key-00000001",
    orderId: "order-00000001",
    requestKey: "request-key-0001",
  });
  assertEquals(calls, [{
    name: "record_alternative_payment_recovery",
    args: {
      p_intent_id: "00000000-0000-0000-0000-000000000111",
      p_member_id: "00000000-0000-0000-0000-000000000113",
      p_payment_key: "payment-key-00000001",
      p_order_id: "order-00000001",
      p_request_key: "request-key-0001",
    },
  }]);
});
