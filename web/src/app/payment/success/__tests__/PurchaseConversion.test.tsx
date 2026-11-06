import { render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PurchaseConversion } from "../PurchaseConversion";

const { trackEventMock, trackPurchaseMock } = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
  trackPurchaseMock: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({ trackEvent: trackEventMock }));
vi.mock("@/lib/analytics/conversions", () => ({
  trackPurchaseConversion: trackPurchaseMock,
}));

afterEach(() => {
  vi.restoreAllMocks();
  trackEventMock.mockClear();
  trackPurchaseMock.mockClear();
});

it("결제 키가 없는 복귀 주소로 교체한 뒤 GA4·Meta 전환을 보낸다", () => {
  const replaceState = vi.spyOn(window.history, "replaceState");

  render(<PurchaseConversion orderId="order-1" value={3000} cleanPath="/g/friend-goal" />);

  expect(replaceState).toHaveBeenCalledWith(window.history.state, "", "/g/friend-goal");
  expect(trackEventMock).toHaveBeenCalledWith("payment_success", {
    value: 3000,
    currency: "KRW",
  });
  expect(trackPurchaseMock).toHaveBeenCalledWith("order-1", 3000);
  expect(replaceState.mock.invocationCallOrder[0]).toBeLessThan(
    trackEventMock.mock.invocationCallOrder[0],
  );
  expect(replaceState.mock.invocationCallOrder[0]).toBeLessThan(
    trackPurchaseMock.mock.invocationCallOrder[0],
  );
});
