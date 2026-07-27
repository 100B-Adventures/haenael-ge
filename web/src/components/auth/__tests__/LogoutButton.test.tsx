// LogoutButton.test.tsx — vitest + React Testing Library
// 클릭 시 /auth/logout POST 호출 + window.location.href 이동을 검증한다.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LogoutButton } from "../LogoutButton";

const mockAssign = vi.fn();

beforeEach(() => {
  mockAssign.mockClear();
  Object.defineProperty(window, "location", {
    value: {
      ...window.location,
      get href() {
        return "http://localhost:3000/me";
      },
      set href(url: string) {
        mockAssign(url);
      },
    },
    writable: true,
  });
});

describe("LogoutButton", () => {
  it("렌더링 시 로그아웃 버튼 표시", () => {
    render(<LogoutButton />);
    expect(screen.getByTestId("logout-button")).toBeInTheDocument();
    expect(screen.getByText("로그아웃")).toBeInTheDocument();
  });

  it("클릭 시 POST /auth/logout 호출 후 랜딩으로 이동", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      redirected: true,
      url: "http://localhost:3000/",
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LogoutButton />);
    fireEvent.click(screen.getByTestId("logout-button"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/auth/logout",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledWith("http://localhost:3000/");
    });
  });

  it("fetch 실패해도 \"/\"로 이동(dead-end 방지)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    render(<LogoutButton />);
    fireEvent.click(screen.getByTestId("logout-button"));

    await waitFor(() => {
      expect(mockAssign).toHaveBeenCalledWith("/");
    });
  });
});
