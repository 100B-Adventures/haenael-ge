// toss-confirm — POST: 서버승인 + payment DONE + cheer CONFIRMED + ledger EARN
// 슬라이스 #1 scaffold: entry point stub. 실구현은 슬라이스 #6 [강모델·리뷰].
// architecture: 토스 서버승인(paymentKey+orderId+amount) → 원장 EARN → cheer CONFIRMED 원자적.

import { withRegionHeader } from "../_shared/region.ts";

Deno.serve(async (_req: Request) => {
  // TODO(slice-6)[강모델·리뷰]: TossClient.confirmPayment → appendLedger(EARN) → payment/cheer 상태 업데이트
  return new Response(
    JSON.stringify({ error: "Not implemented — 슬라이스 #6 [강모델·리뷰] 에서 구현" }),
    {
      status: 501,
      headers: withRegionHeader(new Headers({ "Content-Type": "application/json" })),
    },
  );
});
