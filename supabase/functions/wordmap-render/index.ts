// wordmap-render — 워드맵 이미지 렌더 → Storage
// 슬라이스 #1 scaffold: entry point stub. 실구현은 슬라이스 #9.

import { withRegionHeader } from "../_shared/region.ts";

Deno.serve(async (_req: Request) => {
  // TODO(slice-9): cheer 메시지 SELECT → wordmap 이미지 렌더(canvas/satori) → Storage PUT
  return new Response(
    JSON.stringify({ error: "Not implemented — 슬라이스 #9 에서 구현" }),
    {
      status: 501,
      headers: withRegionHeader(new Headers({ "Content-Type": "application/json" })),
    },
  );
});
