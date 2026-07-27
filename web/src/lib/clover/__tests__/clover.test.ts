// clover.test.ts — 클로버 환산 규약(1클로버=1,000원) 단위 테스트.
// 이 비율이 깨지면 결제 적립/me 원화표기/환전 도달판정이 전부 어긋나므로 고정한다.

import { describe, it, expect } from "vitest";
import { KRW_PER_CLOVER, cloverFromKrw, krwFromClover } from "../index";

describe("clover 환산 (1클로버 = 1,000원)", () => {
  it("KRW_PER_CLOVER 상수는 1000", () => {
    expect(KRW_PER_CLOVER).toBe(1000);
  });

  it.each([
    [1000, 1],
    [3000, 3],
    [5000, 5],
    [10000, 10],
  ])("cloverFromKrw(%i원) = %i클로버", (krw, clover) => {
    expect(cloverFromKrw(krw)).toBe(clover);
  });

  it.each([
    [1, 1000],
    [3, 3000],
    [5, 5000],
    [10, 10000],
    [30, 30000], // 환전 최소액 min_cashout_clover()=30개=30,000원
  ])("krwFromClover(%i클로버) = %i원", (clover, krw) => {
    expect(krwFromClover(clover)).toBe(krw);
  });

  it("허용 금액 4종은 왕복 변환이 항등", () => {
    for (const krw of [1000, 3000, 5000, 10000]) {
      expect(krwFromClover(cloverFromKrw(krw))).toBe(krw);
    }
  });

  // 2026-07-21 회장 지시: "1000개가 아니고 1개, 더 큰 금액 예 1만개도 보낼수있게" —
  // 자유입력 클로버(1개 최소 ~ 서버 상한 100,000개=1억원)가 정확히 환산되는지 회귀.
  describe("자유입력 클로버 (2026-07-21 클로버 개수 기반 응원)", () => {
    it("1클로버 = 1,000원 (최소 프리셋)", () => {
      expect(krwFromClover(1)).toBe(1000);
    });

    it("10,000클로버(1만개) = 1천만원", () => {
      expect(krwFromClover(10_000)).toBe(10_000_000);
    });

    it("서버 상한 100,000클로버 = 1억원", () => {
      expect(krwFromClover(100_000)).toBe(100_000_000);
    });

    it("큰 수 왕복 변환이 항등(1만클로버)", () => {
      const krw = krwFromClover(10_000);
      expect(cloverFromKrw(krw)).toBe(10_000);
    });
  });
});
