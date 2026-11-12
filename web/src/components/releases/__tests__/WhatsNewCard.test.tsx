import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_CONSENT_KEY } from "@/lib/analytics/consent";
import { WHATS_NEW_USER_METADATA_KEY } from "@/lib/release-notes";
import { WHATS_NEW_LAST_SEEN_KEY, WhatsNewCard } from "../WhatsNewCard";

const { mockGetUser, mockUpdateUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpdateUser: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, onClick, prefetch: _prefetch, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
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
  mockGetUser.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  mockUpdateUser.mockReset();
  mockUpdateUser.mockResolvedValue({ data: { user: null }, error: null });
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
    expect(window.localStorage.getItem(WHATS_NEW_LAST_SEEN_KEY)).toBe("2.2.0");
    fireEvent.click(screen.getByRole("button", { name: "새로운 기능 안내 닫기" }));
    expect(screen.queryByTestId("whats-new-card")).toBeNull();

    first.unmount();
    render(<WhatsNewCard />);
    await waitFor(() => expect(screen.queryByTestId("whats-new-card")).toBeNull());
  });

  it("동의 시 보기·써 보기 이벤트를 보내고 의견 링크는 제출 화면으로 이동한다", async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "granted");
    render(<WhatsNewCard />);

    await screen.findByTestId("whats-new-card");
    fireEvent.click(screen.getByRole("link", { name: "써 보기" }));
    fireEvent.click(screen.getByRole("link", { name: "의견 남기기" }));

    expect(window.gtag).toHaveBeenNthCalledWith(1, "event", "whats_new_view", { release: "2.2.0" });
    expect(window.gtag).toHaveBeenNthCalledWith(2, "event", "whats_new_try", { release: "2.2.0" });
    expect(window.gtag).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("link", { name: "의견 남기기" })).toHaveAttribute("href", "/updates#feedback");
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

  it("회원은 본 버전을 Auth user_metadata와 localStorage에 함께 저장한다", async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "granted");
    mockGetUser.mockResolvedValue({
      data: { user: { user_metadata: {} } },
      error: null,
    });
    render(<WhatsNewCard />);

    expect(await screen.findByTestId("whats-new-card")).toBeInTheDocument();
    expect(window.localStorage.getItem(WHATS_NEW_LAST_SEEN_KEY)).toBe("2.2.0");
    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: { [WHATS_NEW_USER_METADATA_KEY]: "2.2.0" },
    });
  });

  it("로그인 시 회원 메타데이터와 localStorage 중 최신 본 버전을 사용해 양쪽을 동기화한다", async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "granted");
    window.localStorage.setItem(WHATS_NEW_LAST_SEEN_KEY, "2.1.4");
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          user_metadata: { [WHATS_NEW_USER_METADATA_KEY]: "2.2.0" },
        },
      },
      error: null,
    });
    render(<WhatsNewCard />);

    await waitFor(() => expect(window.localStorage.getItem(WHATS_NEW_LAST_SEEN_KEY)).toBe("2.2.0"));
    expect(screen.queryByTestId("whats-new-card")).toBeNull();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("localStorage가 회원 메타데이터보다 최신이면 회원 메타데이터를 올리고 카드를 다시 띄우지 않는다", async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "granted");
    window.localStorage.setItem(WHATS_NEW_LAST_SEEN_KEY, "2.2.0");
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          user_metadata: { [WHATS_NEW_USER_METADATA_KEY]: "2.1.4" },
        },
      },
      error: null,
    });
    render(<WhatsNewCard />);

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({
      data: { [WHATS_NEW_USER_METADATA_KEY]: "2.2.0" },
    }));
    expect(screen.queryByTestId("whats-new-card")).toBeNull();
  });
});
