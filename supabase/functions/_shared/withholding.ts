// withholding.ts — 회장 수동 지급 환전의 3.3% 원천징수 계산

/** 3.3% 원천징수(소득세 3% + 지방소득세 0.3%) */
export const WITHHOLDING_RATE = 0.033;

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
 * 원천징수액은 요청 총액의 3.3%를 계산한 뒤 원 미만을 Math.floor로 절사한다.
 * 이번 수동 지급 슬라이스에는 플랫폼 수수료가 없으므로 platformFee는 0이다.
 */
export function calcCashout(grossAmount: number): CashoutCalcResult {
  if (
    !Number.isSafeInteger(grossAmount) ||
    grossAmount < MIN_CASHOUT_KRW ||
    grossAmount % 1000 !== 0
  ) {
    throw new Error("invalid_cashout_amount");
  }
  const platformFee = 0;
  const withholdingTax = Math.floor(grossAmount * WITHHOLDING_RATE);
  const netAmount = grossAmount - withholdingTax;
  return { grossAmount, platformFee, withholdingTax, netAmount };
}
