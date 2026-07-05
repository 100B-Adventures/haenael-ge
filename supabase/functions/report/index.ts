// report — 신고 접수(RLS insert) + 수동 soft-delete 처리
// 슬라이스 #1 scaffold: entry point stub. 실구현은 슬라이스 #10.
// architecture: report 테이블 RLS INSERT(authenticated) → 관리자 수동 soft-delete.

import { withRegionHeader } from "../_shared/region.ts";

Deno.serve(async (_req: Request) => {
  // TODO(slice-10): report INSERT(신고 유형·타깃 goalId·신고자 userId) → 어드민 알림
  return new Response(
    JSON.stringify({ error: "Not implemented — 슬라이스 #10 에서 구현" }),
    {
      status: 501,
      headers: withRegionHeader(new Headers({ "Content-Type": "application/json" })),
    },
  );
});
