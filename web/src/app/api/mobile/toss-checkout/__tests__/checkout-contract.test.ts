import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderAlternativeCheckoutHtml } from "../checkout-contract";

const loadSession = vi.fn();
vi.mock("../checkout-session", () => ({
  loadAlternativeCheckoutSession: loadSession,
}));

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_TOSS_CLIENT_KEY", "test_ck_fixture");
  loadSession.mockResolvedValue({
    session: {
      order_id: "order-server-0001",
      return_url: "haenael:///payment/alternative-return",
    },
    intent: { account_binding: "00000000-0000-0000-0000-000000000112" },
    catalog: { gross_amount_minor: 1100, product_id: "haenael.cheer.clover.1" },
  });
});

describe("GET /api/mobile/toss-checkout", () => {
  it("TC-APP-02-11 서버 세션의 1,100원·상품·계정 결합값만 결제창에 전달한다", () => {
    const html = renderAlternativeCheckoutHtml({
      clientKey: "test_ck_fixture",
      amount: 1100,
      orderId: "order-server-0001",
      productId: "haenael.cheer.clover.1",
      accountBinding: "00000000-0000-0000-0000-000000000112",
      returnUrl: "haenael://payment/alternative-return",
    });
    expect(html).toContain("1100");
    expect(html).toContain("haenael.cheer.clover.1");
    expect(html).toContain("00000000-0000-0000-0000-000000000112");
    expect(html).not.toContain("searchParams.get(\"amount\")");
  });

  it("TC-APP-02-11-1 실제 GET 라우트가 일회성 token으로 결제 HTML을 반환한다", async () => {
    const { GET } = await import("../route");
    const response = await GET(new Request(
      "https://haenael.app/api/mobile/toss-checkout?checkout_token=" + "a".repeat(64),
    ));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("order-server-0001");
    expect(loadSession).toHaveBeenCalledWith("a".repeat(64));
  });
});
