import { renderAlternativeCheckoutHtml } from "./checkout-contract";
import { loadAlternativeCheckoutSession } from "./checkout-session";

export const dynamic = "force-dynamic";

function errorPage(status: number, message: string) {
  return new Response(`<!doctype html><html lang="ko"><meta charset="utf-8"><title>해낼게 결제</title><body><h1>결제를 계속할 수 없어요</h1><p>${message}</p></body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey || !/^(?:test|live)_(?:gck|ck)_/.test(clientKey)) {
    return errorPage(503, "결제 설정을 확인하고 있어요. 잠시 뒤 다시 시도해 주세요.");
  }
  const url = new URL(request.url);
  const token = url.searchParams.get("checkout_token") ?? "";
  const resolved = await loadAlternativeCheckoutSession(token);
  if (!resolved) return errorPage(410, "결제 준비 시간이 지났어요. 앱으로 돌아가 다시 시작해 주세요.");
  const bridge = new URL("/api/mobile/toss-checkout/return", url.origin);
  bridge.searchParams.set("checkout_token", token);
  const failed = new URL(bridge);
  failed.searchParams.set("failed", "1");
  return new Response(renderAlternativeCheckoutHtml({
    clientKey,
    amount: resolved.catalog.gross_amount_minor,
    orderId: resolved.session.order_id,
    productId: resolved.catalog.product_id,
    accountBinding: resolved.intent.account_binding,
    returnUrl: resolved.session.return_url,
    successUrl: bridge.toString(),
    failUrl: failed.toString(),
  }), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline' https://js.tosspayments.com; connect-src https://api.tosspayments.com https://*.tosspayments.com; frame-src https://*.tosspayments.com; style-src 'unsafe-inline'; img-src data: https://*.tosspayments.com",
    },
  });
}
