import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calcCashout,
  MIN_CASHOUT_KRW,
  SERVICE_FEE_PERCENT,
  VAT_PERCENT,
  WITHHOLDING_RATE,
} from "./withholding.ts";

Deno.test("정책 상수는 최소 30,000원 · 이용료 10% · VAT 10% · 원천징수 3.3%다", () => {
  assertEquals(MIN_CASHOUT_KRW, 30_000);
  assertEquals(SERVICE_FEE_PERCENT, 10);
  assertEquals(VAT_PERCENT, 10);
  assertEquals(WITHHOLDING_RATE, 0.033);
});

Deno.test("30,000원 요청은 이용료 3,300원(VAT 포함) · 원천징수 881원 · 실지급 25,819원이다", () => {
  assertEquals(calcCashout(30_000), {
    grossAmount: 30_000,
    platformFee: 3_000,
    vat: 300,
    feeTotal: 3_300,
    withholdingTax: 881,
    netAmount: 25_819,
  });
});

Deno.test("기준값 표와 정확히 일치한다 (floor 절사 지점 고정)", () => {
  const cases = [
    { gross: 10_000, feeTotal: 1_100, withhold: 293, net: 8_607 },
    { gross: 30_000, feeTotal: 3_300, withhold: 881, net: 25_819 },
    { gross: 50_000, feeTotal: 5_500, withhold: 1_468, net: 43_032 },
    { gross: 100_000, feeTotal: 11_000, withhold: 2_937, net: 86_063 },
  ];
  for (const c of cases) {
    // 10,000원은 최소 환전액 미만이라 계산식 자체를 직접 검증한다.
    const fee = Math.floor((c.gross * 10) / 100);
    const vat = Math.floor((fee * 10) / 100);
    const feeTotal = fee + vat;
    const withhold = Math.floor(((c.gross - feeTotal) * 33) / 1000);
    assertEquals(feeTotal, c.feeTotal, `feeTotal @ ${c.gross}`);
    assertEquals(withhold, c.withhold, `withhold @ ${c.gross}`);
    assertEquals(c.gross - feeTotal - withhold, c.net, `net @ ${c.gross}`);

    if (c.gross >= MIN_CASHOUT_KRW) {
      const r = calcCashout(c.gross);
      assertEquals(r.feeTotal, c.feeTotal);
      assertEquals(r.withholdingTax, c.withhold);
      assertEquals(r.netAmount, c.net);
    }
  }
});

Deno.test("원 미만은 절사한다", () => {
  // 31,000 → fee 3,100 / vat 310 / feeTotal 3,410 / (31,000-3,410)*0.033 = 910.47 → 910
  const r = calcCashout(31_000);
  assertEquals(r.feeTotal, 3_410);
  assertEquals(r.withholdingTax, 910);
  assertEquals(r.netAmount, 26_680);
});

Deno.test("최소 미달·천원 단위 아님·비정수는 거부한다", () => {
  assertThrows(() => calcCashout(29_000), Error, "invalid_cashout_amount");
  assertThrows(() => calcCashout(30_001), Error, "invalid_cashout_amount");
  assertThrows(() => calcCashout(30_000.5), Error, "invalid_cashout_amount");
});
