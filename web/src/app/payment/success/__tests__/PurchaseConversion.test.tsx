import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PurchaseConversion } from "../PurchaseConversion";

const { consentState, trackEventMock, trackPurchaseMock } = vi.hoisted(() => ({
  consentState: { value: "granted" as "granted" | "denied" | null },
  trackEventMock: vi.fn(),
  trackPurchaseMock: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({ trackEvent: trackEventMock }));
vi.mock("@/lib/analytics/conversions", () => ({
  trackPurchaseConversion: trackPurchaseMock,
}));
vi.mock("@/lib/analytics/useAnalyticsConsent", () => ({
  useAnalyticsConsent: () => consentState.value,
}));

const lease = {
  leaseToken: "lease-1",
  eventId: "haenael-purchase:order-1",
  expiresAt: "2099-01-01T00:00:00.000Z",
};

beforeEach(() => {
  consentState.value = "granted";
  trackEventMock.mockReset().mockReturnValue(true);
  trackPurchaseMock.mockReset().mockResolvedValue(true);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("안전한 주소로 교체하고 provider enqueue 성공 뒤 lease를 ack한다", async () => {
  const replaceState = vi.spyOn(window.history, "replaceState");
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ acknowledged: true }),
  });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <PurchaseConversion
      orderId="order-1"
      paymentKey="payment-key-1"
      value={3000}
      cleanPath="/g/friend-goal"
      initialLease={lease}
    />,
  );

  expect(replaceState).toHaveBeenCalledWith(window.history.state, "", "/g/friend-goal");
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(trackPurchaseMock).toHaveBeenCalledWith("order-1", 3000, lease.eventId);
  expect(trackEventMock).toHaveBeenCalledWith("payment_success", {
    event_id: lease.eventId,
    value: 3000,
    currency: "KRW",
  });
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    action: "ack_conversion",
    orderId: "order-1",
    paymentKey: "payment-key-1",
    leaseToken: "lease-1",
    eventId: lease.eventId,
  });
});

it("provider enqueue 실패면 ack하지 않아 lease 만료 뒤 재시도할 수 있다", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  trackPurchaseMock.mockResolvedValue(false);

  render(
    <PurchaseConversion
      orderId="order-1"
      paymentKey="payment-key-1"
      value={3000}
      cleanPath="/"
      initialLease={lease}
    />,
  );

  await waitFor(() => expect(trackPurchaseMock).toHaveBeenCalledTimes(1));
  expect(fetchMock).not.toHaveBeenCalled();
});

it("provider enqueue 뒤 ack 응답이 유실되면 즉시 3회 재시도한다", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn().mockResolvedValue({ ok: false });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <PurchaseConversion
      orderId="order-1"
      paymentKey="payment-key-1"
      value={3000}
      cleanPath="/"
      initialLease={lease}
    />,
  );

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1_000);
  });
  expect(trackPurchaseMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(3);
  vi.useRealTimers();
});

it("ack가 DB에 반영된 sent 상태는 terminal로 인식해 polling을 끝낸다", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      conversionLease: null,
      conversionDelivery: { state: "sent" },
    }),
  });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <PurchaseConversion
      orderId="order-1"
      paymentKey="payment-key-1"
      value={3000}
      cleanPath="/"
      initialLease={{ ...lease, expiresAt: "2020-01-01T00:00:00.000Z" }}
    />,
  );

  await act(async () => {
    await vi.advanceTimersByTimeAsync(10_000);
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(trackPurchaseMock).not.toHaveBeenCalled();
});

it("분석 동의 전에는 provider 전송과 ack를 시작하지 않는다", () => {
  consentState.value = null;
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  render(
    <PurchaseConversion
      orderId="order-1"
      paymentKey="payment-key-1"
      value={3000}
      cleanPath="/"
      initialLease={lease}
    />,
  );

  expect(trackPurchaseMock).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});
