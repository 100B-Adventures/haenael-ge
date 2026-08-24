import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReceiverHomeLoading from "../loading";

vi.mock("@/components/common/NotificationBadge", () => ({ NotificationBadge: () => null }));
vi.mock("@/components/auth/LogoutButton", () => ({ LogoutButton: () => null }));

describe("TC-LD-02 잔액 조회 로딩", () => {
  it("정상 경로: 숫자를 추정하지 않고 잔액 조회 중임을 알린다", () => {
    render(<ReceiverHomeLoading />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("클로버 잔액을 불러오는 중이에요");
    expect(status).not.toHaveTextContent(/🍀\s*0개/);
  });

  it("거절 경로: 로딩 화면에 환전 가능 금액이나 신청 버튼을 노출하지 않는다", () => {
    render(<ReceiverHomeLoading />);
    expect(screen.queryByText("환전 신청하기")).not.toBeInTheDocument();
    expect(screen.queryByText(/원 상당/)).not.toBeInTheDocument();
  });
});
