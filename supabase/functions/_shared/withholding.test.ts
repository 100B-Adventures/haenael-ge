import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calcCashout,
  MIN_CASHOUT_KRW,
  WITHHOLDING_RATE,
} from "./withholding.ts";

Deno.test("원천징수 정책 상수는 30,000원과 3.3%다", () => {
  assertEquals(MIN_CASHOUT_KRW, 30_000);
  assertEquals(WITHHOLDING_RATE, 0.033);
});

Deno.test("30,000원 요청은 원천징수 990원, 실지급 29,010원이다", () => {
  assertEquals(calcCashout(30_000), {
    grossAmount: 30_000,
    platformFee: 0,
    withholdingTax: 990,
    netAmount: 29_010,
  });
});

Deno.test("원 미만은 절사한다", () => {
  assertEquals(calcCashout(31_000).withholdingTax, 1_023);
});

Deno.test("최소 미달·천원 단위 아님·비정수는 거부한다", () => {
  assertThrows(() => calcCashout(29_000), Error, "invalid_cashout_amount");
  assertThrows(() => calcCashout(30_001), Error, "invalid_cashout_amount");
  assertThrows(() => calcCashout(30_000.5), Error, "invalid_cashout_amount");
});
