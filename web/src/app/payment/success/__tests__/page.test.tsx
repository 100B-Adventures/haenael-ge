import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PaymentSuccessPage from "../page";

async function renderCodeOnlyFailure(code: string) {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ error: { code } }),
  }));
  render(await PaymentSuccessPage({
    searchParams: Promise.resolve({ paymentKey: "pk", orderId: "order", amount: "3000" }),
  }));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("VO-04 비카드 오류는 server message 없이 client copy로 표시한다", async () => {
  await renderCodeOnlyFailure("unsupported_payment_method");
  expect(screen.getByText("카드 결제만 지원합니다.")).toBeInTheDocument();
});

it("VO-04 비카드 보상 실패는 server message 없이 client copy로 표시한다", async () => {
  await renderCodeOnlyFailure("non_card_compensation_failed");
  expect(screen.getByText("허용되지 않은 결제수단을 안전하게 정리하지 못했습니다.")).toBeInTheDocument();
});
