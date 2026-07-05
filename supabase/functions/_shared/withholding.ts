// withholding.ts — 3.3% 원천징수·take-rate·최소환전 30,000원
// 슬라이스 #1 scaffold: 상수 + 계산 함수. 실 정책값은 architecture §3 확정.

/** 3.3% 원천징수(소득세 3% + 지방소득세 0.3%) */
export const WITHHOLDING_RATE = 0.033;

/** 플랫폼 take-rate (환전 수수료) — ⛔ 실값은 legal·BM 확정 후 env로 */
export const TAKE_RATE = 0.05; // placeholder: 5%

/** 최소 환전 금액 (KRW) */
export const MIN_CASHOUT_KRW = 30_000;

export interface CashoutCalcResult {
  grossAmount: number;
  platformFee: number;
  withholdingTax: number;
  netAmount: number;
}

/**
 * 환전 시 공제 계산.
 * 공제 순서: 총액 → 플랫폼 수수료 → 원천징수(나머지 기준)
 */
export function calcCashout(grossAmount: number): CashoutCalcResult {
  if (grossAmount < MIN_CASHOUT_KRW) {
    throw new Error(
      `최소 환전 금액은 ${MIN_CASHOUT_KRW.toLocaleString()}원 이상입니다.`,
    );
  }
  const platformFee = Math.floor(grossAmount * TAKE_RATE);
  const afterFee = grossAmount - platformFee;
  const withholdingTax = Math.floor(afterFee * WITHHOLDING_RATE);
  const netAmount = afterFee - withholdingTax;
  return { grossAmount, platformFee, withholdingTax, netAmount };
}
