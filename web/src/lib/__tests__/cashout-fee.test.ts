import { describe, expect, it } from "vitest";
import {
  calcCashoutFee,
  KRW_PER_CLOVER,
  SERVICE_FEE_PERCENT,
  VAT_PERCENT,
  WITHHOLDING_PERMILLE,
} from "../cashout-fee";

describe("calcCashoutFee", () => {
  it("정책 상수는 이용료 10% · VAT 10% · 원천징수 33/1000 · 1클로버 1,000원이다", () => {
    expect(SERVICE_FEE_PERCENT).toBe(10);
    expect(VAT_PERCENT).toBe(10);
    expect(WITHHOLDING_PERMILLE).toBe(33);
    expect(KRW_PER_CLOVER).toBe(1000);
  });

  // 회장 확정 기준값. 이 표가 Deno(withholding.ts)·DB RPC와의 동치 계약이다.
  it.each([
    { gross: 10_000, fee: 1_000, vat: 100, feeTotal: 1_100, withhold: 293, net: 8_607 },
    { gross: 27_000, fee: 2_700, vat: 270, feeTotal: 2_970, withhold: 792, net: 23_238 },
    { gross: 30_000, fee: 3_000, vat: 300, feeTotal: 3_300, withhold: 881, net: 25_819 },
    { gross: 40_000, fee: 4_000, vat: 400, feeTotal: 4_400, withhold: 1_174, net: 34_426 },
    { gross: 50_000, fee: 5_000, vat: 500, feeTotal: 5_500, withhold: 1_468, net: 43_032 },
    { gross: 100_000, fee: 10_000, vat: 1_000, feeTotal: 11_000, withhold: 2_937, net: 86_063 },
  ])("$gross원 → 이용료 $feeTotal · 원천징수 $withhold · 실지급 $net", (c) => {
    expect(calcCashoutFee(c.gross)).toEqual({
      grossKrw: c.gross,
      feeKrw: c.fee,
      vatKrw: c.vat,
      feeTotalKrw: c.feeTotal,
      withholdingKrw: c.withhold,
      netKrw: c.net,
    });
  });

  it("공제 합계는 항상 환산액과 맞아떨어진다", () => {
    for (let clover = 0; clover <= 300; clover += 1) {
      const r = calcCashoutFee(clover * KRW_PER_CLOVER);
      expect(r.feeTotalKrw + r.withholdingKrw + r.netKrw).toBe(r.grossKrw);
      expect(r.feeKrw + r.vatKrw).toBe(r.feeTotalKrw);
      expect(r.netKrw).toBeGreaterThanOrEqual(0);
    }
  });

  it("0원·음수·NaN은 0원으로 다룬다 (미리보기 안전)", () => {
    for (const bad of [0, -1, Number.NaN]) {
      expect(calcCashoutFee(bad)).toEqual({
        grossKrw: 0,
        feeKrw: 0,
        vatKrw: 0,
        feeTotalKrw: 0,
        withholdingKrw: 0,
        netKrw: 0,
      });
    }
  });

  it("원 미만은 각 단계에서 절사한다", () => {
    // 31,000 → fee 3,100 / vat 310 / feeTotal 3,410 / (31,000-3,410)*0.033=910.47 → 910
    expect(calcCashoutFee(31_000)).toMatchObject({
      feeKrw: 3_100,
      vatKrw: 310,
      feeTotalKrw: 3_410,
      withholdingKrw: 910,
      netKrw: 26_680,
    });
  });
});
