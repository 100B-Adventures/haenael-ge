// cheer-order — POST: cheer=PENDING + payment 주문·멱등
// 슬라이스 #1 scaffold: entry point stub. 실구현은 슬라이스 #5 [강모델].
// architecture: service_role, 멱등(UNIQUE order_id), 원장 HOLD 없음(주문=PENDING).

import { withRegionHeader } from "../_shared/region.ts";

Deno.serve(async (_req: Request) => {
  // TODO(slice-5)[강모델]: 멱등키 확인 → cheer INSERT(PENDING) → payment INSERT → 토스 위젯 결제 준비
  return new Response(
    JSON.stringify({ error: "Not implemented — 슬라이스 #5 [강모델] 에서 구현" }),
    {
      status: 501,
      headers: withRegionHeader(new Headers({ "Content-Type": "application/json" })),
    },
  );
});
