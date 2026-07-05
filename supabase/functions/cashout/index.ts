// cashout — POST: 최소환전·PASS만19+·riskHook·HOLD + payout 트리거
// 슬라이스 #1 scaffold: entry point stub. 실구현은 슬라이스 #8 [강모델·리뷰].
// architecture: MIN_CASHOUT=30,000원 · PASS KYC · noOpRiskHook(MVP) · HOLD 후 payout invoke.

import { withRegionHeader } from "../_shared/region.ts";

Deno.serve(async (_req: Request) => {
  // TODO(slice-8)[강모델·리뷰]:
  //   1. 최소환전 금액 체크(MIN_CASHOUT_KRW)
  //   2. kyc_verification PASS 확인(is_adult=true)
  //   3. noOpRiskHook.evaluate → CLEAR면 진행
  //   4. clover_ledger HOLD 기입
  //   5. cashout-payout EF invoke
  return new Response(
    JSON.stringify({ error: "Not implemented — 슬라이스 #8 [강모델·리뷰] 에서 구현" }),
    {
      status: 501,
      headers: withRegionHeader(new Headers({ "Content-Type": "application/json" })),
    },
  );
});
