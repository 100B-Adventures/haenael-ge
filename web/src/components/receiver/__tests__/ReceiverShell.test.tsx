import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BackHomeLink, ReceiverPageShell, ReceiverTopBar } from "../ReceiverShell";

vi.mock("@/components/common/NotificationBadge", () => ({ NotificationBadge: () => <span data-testid="notification-action" /> }));
vi.mock("@/components/auth/LogoutButton", () => ({ LogoutButton: () => <span data-testid="logout-action" /> }));

describe("TC-SH-01 receiver 공용 shell", () => {
  it("정상 경로: 모든 화면이 같은 최대 폭과 정렬선 클래스를 상속한다", () => {
    render(<ReceiverPageShell testId="test-shell"><p>본문</p></ReceiverPageShell>);
    expect(screen.getByTestId("test-shell")).toHaveClass("receiver-page-frame");
    expect(screen.getByText("본문")).toBeInTheDocument();
  });

  it("거절 경로: 하위 화면 회수 링크는 /me 외 경로로 이탈하지 않는다", () => {
    render(<BackHomeLink />);
    expect(screen.getByRole("link", { name: "홈으로 돌아가기" })).toHaveAttribute("href", "/me");
  });

  it("정상 경로: 홈 상단만 알림과 로그아웃을 표시하고 상세 화면은 브랜드만 표시한다", () => {
    const { rerender } = render(<ReceiverTopBar variant="home" />);
    expect(screen.getByTestId("receiver-top-bar-home")).toBeInTheDocument();
    expect(screen.getByTestId("notification-action")).toBeInTheDocument();
    expect(screen.getByTestId("logout-action")).toBeInTheDocument();

    rerender(<ReceiverTopBar variant="detail" />);
    expect(screen.getByTestId("receiver-top-bar-detail")).toBeInTheDocument();
    expect(screen.queryByTestId("notification-action")).not.toBeInTheDocument();
    expect(screen.queryByTestId("logout-action")).not.toBeInTheDocument();
  });
});
