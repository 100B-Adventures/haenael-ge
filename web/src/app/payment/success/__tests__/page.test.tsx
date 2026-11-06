import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PaymentSuccessPage from "../page";

const { purchaseConversionMock } = vi.hoisted(() => ({
  purchaseConversionMock: vi.fn(),
}));

const conversionLease = {
  leaseToken: "lease-token",
  eventId: "haenael-purchase:order-new",
  expiresAt: "2099-01-01T00:00:00.000Z",
};

vi.mock("../PurchaseConversion", () => ({
  PurchaseConversion: (props: unknown) => {
    purchaseConversionMock(props);
    return null;
  },
}));

beforeEach(() => {
  purchaseConversionMock.mockClear();
});

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
  expect(screen.getByText("카드 결제만 지원해요.")).toBeInTheDocument();
});

it("VO-04 비카드 보상 실패는 server message 없이 client copy로 표시한다", async () => {
  await renderCodeOnlyFailure("non_card_compensation_failed");
  expect(screen.getByText("허용되지 않은 결제수단을 안전하게 정리하지 못했어요.")).toBeInTheDocument();
});

it("최초 서버 승인은 pending lease를 브라우저 전달 컴포넌트에 넘긴다", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ goalTitle: "편입 합격 해낼게", conversionLease }),
  }));

  render(await PaymentSuccessPage({
    searchParams: Promise.resolve({
      paymentKey: "pk",
      orderId: "order-new",
      amount: "3000",
      goalSlug: "friend-goal",
    }),
  }));

  expect(screen.getByText("편입 합격 목표에 응원이 전달됐습니다.")).toBeInTheDocument();
  expect(purchaseConversionMock).toHaveBeenCalledWith({
    orderId: "order-new",
    paymentKey: "pk",
    value: 3000,
    cleanPath: "/g/friend-goal",
    initialLease: conversionLease,
  });
});

it("sent 또는 활성 lease 재수신은 성공 UI만 복구하고 전환은 보내지 않는다", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      goalTitle: "편입 합격 해낼게",
      idempotent: true,
      conversionLease: null,
    }),
  }));

  render(await PaymentSuccessPage({
    searchParams: Promise.resolve({ paymentKey: "pk", orderId: "order-replay", amount: "3000" }),
  }));

  expect(screen.getByText("응원이 전달됐어요")).toBeInTheDocument();
  expect(purchaseConversionMock).not.toHaveBeenCalled();
});

it("웹훅 선확정이어도 첫 브라우저 delivery lease면 전환을 보낸다", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      goalTitle: "편입 합격 해낼게",
      idempotent: true,
      conversionLease: { ...conversionLease, eventId: "haenael-purchase:order-webhook-first" },
    }),
  }));

  render(await PaymentSuccessPage({
    searchParams: Promise.resolve({
      paymentKey: "pk",
      orderId: "order-webhook-first",
      amount: "3000",
    }),
  }));

  expect(purchaseConversionMock).toHaveBeenCalledWith({
    orderId: "order-webhook-first",
    paymentKey: "pk",
    value: 3000,
    cleanPath: "/",
    initialLease: { ...conversionLease, eventId: "haenael-purchase:order-webhook-first" },
  });
});

it("공개 confirmed 쿼리만으로 성공 화면을 만들 수 없다", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  const forgedParams = {
    confirmed: "1",
    orderId: "forged",
    amount: "3000",
  } as { paymentKey?: string; orderId?: string; amount?: string; goalSlug?: string };

  render(await PaymentSuccessPage({
    searchParams: Promise.resolve(forgedParams),
  }));

  expect(screen.getByText("결제 정보가 부족해요")).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(purchaseConversionMock).not.toHaveBeenCalled();
});
