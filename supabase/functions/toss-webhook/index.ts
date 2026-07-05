// toss-webhook — POST: 토스 웹훅 서명검증·상태 재동기(보상)
// 슬라이스 #1 scaffold: entry point stub. 실구현은 슬라이스 #7 [강모델·리뷰].
// architecture: HMAC-SHA256 서명검증 필수 → 상태 불일치 시 원장 REVERSAL.

import { withRegionHeader } from "../_shared/region.ts";

Deno.serve(async (_req: Request) => {
  // TODO(slice-7)[강모델·리뷰]: 웹훅 서명검증(TOSS_WEBHOOK_SECRET) → 상태 재동기 → 필요 시 REVERSAL
  return new Response(
    JSON.stringify({ error: "Not implemented — 슬라이스 #7 [강모델·리뷰] 에서 구현" }),
    {
      status: 501,
      headers: withRegionHeader(new Headers({ "Content-Type": "application/json" })),
    },
  );
});
