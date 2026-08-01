// Legacy cashout Edge Function — 수동환전 계좌수집 v1.2에서 폐기된 진입점.
//
// 계좌번호와 암호화 키는 Vercel Server Action 한 곳에서만 취급한다(W-12).
// 이 함수는 기존 배포 URL이 남아 있어도 계좌 body를 읽거나 DB를 호출하지 않는다.

import { withRegionHeader } from "../_shared/region.ts";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: withRegionHeader(
      new Headers({ "Content-Type": "application/json", ...CORS_HEADERS }),
    ),
  });
}

export function handleCashoutRequest(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: withRegionHeader(new Headers(CORS_HEADERS)),
    });
  }

  return response(410, {
    error: {
      code: "cashout_server_action_required",
      message: "웹 환전 화면에서 다시 신청해주세요.",
    },
  });
}

if (import.meta.main) {
  Deno.serve(handleCashoutRequest);
}
