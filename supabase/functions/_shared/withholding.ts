// withholding.ts — 환전 서비스 이용료(10%) + 부가세(10%) + 사업소득 원천징수(3.3%) 계산
// ⚠️ 정본 계산식. web/src/lib/cashout-fee.ts(Next.js 런타임 정본)와 동일한 순서·절사여야 한다.
//    런타임(Deno vs Next.js)이 달라 한 파일을 공유할 수 없으므로 양쪽 테스트가 기준값으로 동치를 고정한다.

/** 서비스 이용료율 10% (정수 연산: gross * 10 / 100) */
export const SERVICE_FEE_PERCENT = 10;

/** 서비스 이용료에 대한 부가가치세 10% (정수 연산: fee * 10 / 100) */
export const VAT_PERCENT = 10;

/** 3.3% 원천징수(소득세 3% + 지방소득세 0.3%) */
export const WITHHOLDING_RATE = 0.033;

/** 최소 환전 금액 (KRW) */
export const MIN_CASHOUT_KRW = 30_000;

export interface CashoutCalcResult {
  grossAmount: number;
  /** 서비스 이용료 (부가세 제외) */
  platformFee: number;
  /** 서비스 이용료에 대한 부가가치세 */
  vat: number;
  /** 서비스 이용료 + 부가가치세 (화면에 표시하는 "서비스 이용료(부가세 포함)") */
  feeTotal: number;
  withholdingTax: number;
  netAmount: number;
}

/**
 * 환전 시 공제 계산.
 *
 *   fee      = floor(gross * 10 / 100)
 *   vat      = floor(fee * 10 / 100)
 *   feeTotal = fee + vat
 *   withhold = floor((gross - feeTotal) * 33 / 1000)   // 이용료(VAT 포함) 차감 후 기준
 *   net      = gross - feeTotal - withhold
 */
export function calcCashout(grossAmount: number): CashoutCalcResult {
  if (
    !Number.isSafeInteger(grossAmount) ||
    grossAmount < MIN_CASHOUT_KRW ||
    grossAmount % 1000 !== 0
  ) {
    throw new Error("invalid_cashout_amount");
  }
  const platformFee = Math.floor((grossAmount * SERVICE_FEE_PERCENT) / 100);
  const vat = Math.floor((platformFee * VAT_PERCENT) / 100);
  const feeTotal = platformFee + vat;
  const withholdingTax = Math.floor(((grossAmount - feeTotal) * 33) / 1000);
  const netAmount = grossAmount - feeTotal - withholdingTax;
  return { grossAmount, platformFee, vat, feeTotal, withholdingTax, netAmount };
}
