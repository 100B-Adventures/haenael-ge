// auth-kakao — 카카오 OAuth 콜백 → 토큰교환 → Supabase 세션 발급
// 슬라이스 #1 scaffold: entry point stub. 실구현은 슬라이스 #3.
// architecture §1: 카카오는 Supabase 네이티브 미지원 → 커스텀 어댑터 필요.

import { withRegionHeader } from "../_shared/region.ts";

Deno.serve(async (_req: Request) => {
  // TODO(slice-3): 카카오 OAuth code 수신 → 토큰교환 → Supabase signInWithIdToken
  return new Response(
    JSON.stringify({ error: "Not implemented — 슬라이스 #3 에서 구현" }),
    {
      status: 501,
      headers: withRegionHeader(new Headers({ "Content-Type": "application/json" })),
    },
  );
});
