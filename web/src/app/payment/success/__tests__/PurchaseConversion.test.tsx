import { act, render } from "@testing-library/react";
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

it("로컬 provider 큐 적재만으로 ack하지 않고 lease 만료 뒤 같은 eventId로 재예약한다", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-07T00:00:00.000Z"));
  const replaceState = vi.spyOn(window.history, "replaceState");
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      conversionDelivery: {
        state: "leased",
        lease: {
          leaseToken: "lease-2",
          eventId: lease.eventId,
          expiresAt: "2026-11-07T00:10:00.000Z",
        },
      },
    }),
  });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <PurchaseConversion
      orderId="order-1"
      paymentKey="payment-key-1"
      value={3000}
      cleanPath="/g/friend-goal"
      initialLease={{ ...lease, expiresAt: "2026-11-07T00:00:01.000Z" }}
    />,
  );

  expect(replaceState).toHaveBeenCalledWith(window.history.state, "", "/g/friend-goal");
  await act(async () => Promise.resolve());
  expect(fetchMock).not.toHaveBeenCalled();
  expect(trackPurchaseMock).toHaveBeenCalledWith("order-1", 3000, lease.eventId);
  expect(trackEventMock).toHaveBeenCalledWith("payment_success", {
    event_id: lease.eventId,
    value: 3000,
    currency: "KRW",
  });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1_250);
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    action: "lease_conversion",
    orderId: "order-1",
    paymentKey: "payment-key-1",
  });
  expect(trackPurchaseMock).toHaveBeenCalledTimes(2);
});

it("provider 예외를 catch하고 lease 만료 뒤 stable eventId로 재시도한다", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-07T00:00:00.000Z"));
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      conversionDelivery: {
        state: "leased",
        lease: {
          leaseToken: "lease-after-provider-error",
          eventId: lease.eventId,
          expiresAt: "2026-11-07T00:10:00.000Z",
        },
      },
    }),
  });
  vi.stubGlobal("fetch", fetchMock);
  trackPurchaseMock.mockRejectedValueOnce(new Error("provider unavailable")).mockResolvedValue(true);

  render(
    <PurchaseConversion
      orderId="order-1"
      paymentKey="payment-key-1"
      value={3000}
      cleanPath="/"
      initialLease={{ ...lease, expiresAt: "2026-11-07T00:00:01.000Z" }}
    />,
  );

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1_250);
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(trackPurchaseMock).toHaveBeenNthCalledWith(1, "order-1", 3000, lease.eventId);
  expect(trackPurchaseMock).toHaveBeenNthCalledWith(2, "order-1", 3000, lease.eventId);
});

it("lease 갱신 fetch reject를 catch하고 pending 재예약을 계속한다", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-07T00:00:00.000Z"));
  const fetchMock = vi.fn()
    .mockRejectedValueOnce(new Error("network down"))
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        conversionDelivery: {
          state: "leased",
          lease: {
            leaseToken: "lease-after-fetch-error",
            eventId: lease.eventId,
            expiresAt: "2026-11-07T00:10:00.000Z",
          },
        },
      }),
    });
  vi.stubGlobal("fetch", fetchMock);

  render(
    <PurchaseConversion
      orderId="order-1"
      paymentKey="payment-key-1"
      value={3000}
      cleanPath="/"
      initialLease={{ ...lease, expiresAt: "2026-11-06T23:59:59.000Z" }}
    />,
  );

  await act(async () => {
    await vi.advanceTimersByTimeAsync(5_001);
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(trackPurchaseMock).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).action).toBe("lease_conversion");
});

it("신뢰 가능한 서버 전송자가 DB에 반영한 sent 상태는 terminal로 인식한다", async () => {
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

it("분석 동의 전에는 provider 전송과 lease 갱신을 시작하지 않는다", () => {
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
