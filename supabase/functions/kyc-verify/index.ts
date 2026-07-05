// kyc-verify — PASS 본인인증·만19+·실명·CI 게이트
// 슬라이스 #1 scaffold: entry point stub. 실구현은 슬라이스 #8 [강모델·리뷰].

import { withRegionHeader } from "../_shared/region.ts";

Deno.serve(async (_req: Request) => {
  // TODO(slice-8)[강모델·리뷰]: verifyPassKyc → kyc_verification INSERT → is_adult 플래그 저장
  return new Response(
    JSON.stringify({ error: "Not implemented — 슬라이스 #8 에서 구현 (PASS 벤더 계약 후)" }),
    {
      status: 501,
      headers: withRegionHeader(new Headers({ "Content-Type": "application/json" })),
    },
  );
});
