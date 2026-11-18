import { NextResponse } from "next/server";
import { loadAlternativeCheckoutSession } from "../checkout-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("checkout_token") ?? "";
  const resolved = await loadAlternativeCheckoutSession(token);
  if (!resolved) return NextResponse.json({ error: "checkout_session_invalid" }, { status: 410 });
  const returnUrl = new URL(resolved.session.return_url);
  if (url.searchParams.get("failed") === "1") {
    returnUrl.searchParams.set("status", "failed");
    return NextResponse.redirect(returnUrl);
  }
  const paymentKey = url.searchParams.get("paymentKey") ?? "";
  const orderId = url.searchParams.get("orderId") ?? "";
  const amount = Number(url.searchParams.get("amount"));
  if (
    paymentKey.length < 6 || orderId !== resolved.session.order_id ||
    amount !== resolved.catalog.gross_amount_minor
  ) return NextResponse.json({ error: "checkout_result_invalid" }, { status: 409 });
  returnUrl.searchParams.set("paymentKey", paymentKey);
  returnUrl.searchParams.set("orderId", orderId);
  return NextResponse.redirect(returnUrl);
}
