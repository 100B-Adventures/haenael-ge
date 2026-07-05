// risk.ts — riskHook 인터페이스 + noOpRiskHook (항상 CLEAR)
// ⚠️ rule deferred — 실 리스크 룰은 architecture §5 이후 단계.

export type RiskDecision = "CLEAR" | "HOLD" | "BLOCK";

export interface RiskContext {
  userId: string;
  amount: number;
  action: "CASHOUT" | "EARN";
  metadata?: Record<string, unknown>;
}

export interface RiskHook {
  evaluate(ctx: RiskContext): Promise<RiskDecision>;
}

/** MVP: 항상 CLEAR (리스크 룰 미구현). 실 룰 = legal 확정 후 별도 슬라이스. */
export const noOpRiskHook: RiskHook = {
  async evaluate(_ctx: RiskContext): Promise<RiskDecision> {
    return "CLEAR";
  },
};
