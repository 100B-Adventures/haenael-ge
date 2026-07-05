// notify — 카카오 알림톡 발송(응원 도착 등 정보성) + 인앱 폴백
// 슬라이스 #1 scaffold: entry point stub. 실구현은 슬라이스 #10.
// ⚠️ 정보성만(마케팅/광고성 금지) — 카카오 비즈채널 + 템플릿 사전심사 필요.

import { withRegionHeader } from "../_shared/region.ts";

Deno.serve(async (_req: Request) => {
  // TODO(slice-10): sendAlimtalk(정보성 템플릿) → 실패 시 인앱 notification 폴백
  return new Response(
    JSON.stringify({ error: "Not implemented — 슬라이스 #10 에서 구현 (카카오 비즈채널 심사 후)" }),
    {
      status: 501,
      headers: withRegionHeader(new Headers({ "Content-Type": "application/json" })),
    },
  );
});
