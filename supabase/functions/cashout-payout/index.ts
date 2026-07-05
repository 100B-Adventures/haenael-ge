// cashout-payout — 지급대행 호출·SETTLED·지급명세·정산주기 D+n
// 슬라이스 #1 scaffold: entry point stub. 실구현은 슬라이스 #8 [강모델·리뷰].
// ⛔ 정산주기 D+n 실값 = legal·BM 확정 후.

import { withRegionHeader } from "../_shared/region.ts";

Deno.serve(async (_req: Request) => {
  // TODO(slice-8)[강모델·리뷰]: TossPayoutClient.requestPayout → SETTLED → 지급명세 기록
  return new Response(
    JSON.stringify({ error: "Not implemented — 슬라이스 #8 [강모델·리뷰] 에서 구현" }),
    {
      status: 501,
      headers: withRegionHeader(new Headers({ "Content-Type": "application/json" })),
    },
  );
});
