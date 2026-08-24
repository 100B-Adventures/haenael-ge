// cashout-fee.ts — 환전 공제 계산 (Next.js 런타임 정본)
// ⚠️ supabase/functions/_shared/withholding.ts(Deno 런타임 정본) 및
//    supabase/migrations/20260821000000_cashout_service_fee_10pct.sql(DB 정본)과
//    계산 순서·절사 지점이 반드시 동일해야 한다. 세 곳 모두 같은 기준값 표로 테스트가 고정돼 있다.

/** 서비스 이용료율 10% */
export const SERVICE_FEE_PERCENT = 10;

/** 서비스 이용료에 대한 부가가치세 10% */
export const VAT_PERCENT = 10;

/** 사업소득 원천징수 3.3% (정수 연산: base * 33 / 1000) */
export const WITHHOLDING_PERMILLE = 33;

/** 클로버 1개당 환산 단가 (KRW) */
export const KRW_PER_CLOVER = 1000;

export interface CashoutFeeBreakdown {
  /** 원화 환산액 */
  grossKrw: number;
  /** 서비스 이용료 (부가세 제외) */
  feeKrw: number;
  /** 서비스 이용료에 대한 부가가치세 */
  vatKrw: number;
  /** 서비스 이용료 + 부가가치세 — 화면에 "서비스 이용료 (부가세 포함)"로 표시 */
  feeTotalKrw: number;
  /** 사업소득 원천징수 3.3% (이용료 차감 후 금액 기준) */
  withholdingKrw: number;
  /** 받으실 금액 */
  netKrw: number;
}

/**
 * 환전 공제 계산.
 *
 *   fee      = floor(gross * 10 / 100)
 *   vat      = floor(fee * 10 / 100)
 *   feeTotal = fee + vat
 *   withhold = floor((gross - feeTotal) * 33 / 1000)
 *   net      = gross - feeTotal - withhold
 *
 * 미리보기 화면에서도 쓰이므로 최소 환전액 검증은 하지 않는다(0원도 그대로 0원으로 계산).
 * 신청 시점의 확정 계산은 DB RPC(create_cashout_request)가 다시 수행한다. request_manual_cashout은 임포터 0건 사망 함수로 20260822000000에서 DROP됐다(컨트롤러 재검증 MAJOR1 사고, 2026-08-21).
 */
export function calcCashoutFee(grossKrw: number): CashoutFeeBreakdown {
  const gross = Math.max(Math.floor(grossKrw) || 0, 0);
  const feeKrw = Math.floor((gross * SERVICE_FEE_PERCENT) / 100);
  const vatKrw = Math.floor((feeKrw * VAT_PERCENT) / 100);
  const feeTotalKrw = feeKrw + vatKrw;
  const withholdingKrw = Math.floor(((gross - feeTotalKrw) * WITHHOLDING_PERMILLE) / 1000);
  const netKrw = gross - feeTotalKrw - withholdingKrw;
  return { grossKrw: gross, feeKrw, vatKrw, feeTotalKrw, withholdingKrw, netKrw };
}
