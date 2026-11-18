import { assertEquals } from "jsr:@std/assert@1";
import {
  handleMobileCashout,
  isMobileCashoutAllowedMember,
  parseMobileCashoutRequest,
} from "./index.ts";

Deno.test("TC-APP-03-6 모바일 환전은 인증 없이 조회·신청할 수 없다", async () => {
  assertEquals((await handleMobileCashout(new Request("http://local", { method: "GET" }))).status, 401);
});

Deno.test("TC-APP-03-7 모바일 환전 입력은 회원 ID를 받지 않고 계좌 입력을 검증한다", () => {
  assertEquals(parseMobileCashoutRequest({
    clover_amount: 30,
    bank_code: "004",
    account_number: "1234567890",
    account_holder: "홍길동",
    request_key: "mobile-cashout-0001",
    member_id: "00000000-0000-0000-0000-000000000095",
  }), {
    cloverAmount: 30,
    bankCode: "004",
    accountNumber: "1234567890",
    accountHolder: "홍길동",
    requestKey: "mobile-cashout-0001",
  });
});

Deno.test("TC-APP-03-9 D-047 모바일 환전은 전역·채널·승인 근거·회원 허용목록을 모두 요구한다", () => {
  const memberId = "00000000-0000-0000-0000-000000000095";
  const names = [
    "CASHOUT_ENABLED",
    "CASHOUT_ALLOWED_MEMBER_IDS",
    "MOBILE_CASHOUT_ENABLED",
    "MOBILE_CASHOUT_APPROVAL_REFERENCE",
  ] as const;
  const original = Object.fromEntries(names.map((name) => [name, Deno.env.get(name)]));
  try {
    Deno.env.set("CASHOUT_ENABLED", "true");
    Deno.env.set("CASHOUT_ALLOWED_MEMBER_IDS", memberId);
    Deno.env.set("MOBILE_CASHOUT_ENABLED", "true");
    Deno.env.delete("MOBILE_CASHOUT_APPROVAL_REFERENCE");
    assertEquals(isMobileCashoutAllowedMember(memberId), false);
    Deno.env.set("MOBILE_CASHOUT_APPROVAL_REFERENCE", "qa-approval-0001");
    assertEquals(isMobileCashoutAllowedMember(memberId), true);
    assertEquals(
      isMobileCashoutAllowedMember("00000000-0000-0000-0000-000000000096"),
      false,
    );
  } finally {
    for (const name of names) {
      const value = original[name];
      if (typeof value === "string") Deno.env.set(name, value);
      else Deno.env.delete(name);
    }
  }
});
