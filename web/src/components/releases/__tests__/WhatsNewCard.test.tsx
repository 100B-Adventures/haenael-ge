import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_CONSENT_KEY } from "@/lib/analytics/consent";
import { WHATS_NEW_LAST_SEEN_KEY, WhatsNewCard } from "../WhatsNewCard";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

beforeEach(() => {
  window.localStorage.clear();
  delete window.haenaelGtagPending;
  window.haenaelGtagMeasurementId = "G-TEST123";
  window.gtag = vi.fn();
});
describe("버전별 새로운 기능 카드", () => {
  it("첫 방문에 한 번 보이고 닫은 버전을 기억한다", async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "granted");
    const first = render(<WhatsNewCard />);

    expect(await screen.findByTestId("whats-new-card")).toBeInTheDocument();
    expect(window.localStorage.getItem(WHATS_NEW_LAST_SEEN_KEY)).toBe("2.1.5");
    fireEvent.click(screen.getByRole("button", { name: "새로운 기능 안내 닫기" }));
    expect(screen.queryByTestId("whats-new-card")).toBeNull();

    first.unmount();
    render(<WhatsNewCard />);
    await waitFor(() => expect(screen.queryByTestId("whats-new-card")).toBeNull());
  });

  it("동의 시 보기·써 보기·의견 이벤트 3종을 GA4로 보낸다", async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "granted");
    render(<WhatsNewCard />);

    await screen.findByTestId("whats-new-card");
    fireEvent.click(screen.getByRole("link", { name: "써 보기" }));
    fireEvent.click(screen.getByRole("link", { name: "의견 남기기" }));

    expect(window.gtag).toHaveBeenNthCalledWith(1, "event", "whats_new_view", { release: "2.1.5" });
    expect(window.gtag).toHaveBeenNthCalledWith(2, "event", "whats_new_try", { release: "2.1.5" });
    expect(window.gtag).toHaveBeenNthCalledWith(3, "event", "whats_new_feedback", { release: "2.1.5" });
  });

  it("분석 동의를 거부해도 카드는 보이지만 GA4로 보내지 않는다", async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "denied");
    render(<WhatsNewCard />);

    await screen.findByTestId("whats-new-card");
    fireEvent.click(screen.getByRole("link", { name: "써 보기" }));
    fireEvent.click(screen.getByRole("link", { name: "의견 남기기" }));

    expect(window.gtag).not.toHaveBeenCalled();
    expect(window.haenaelGtagPending).toBeUndefined();
  });
});
