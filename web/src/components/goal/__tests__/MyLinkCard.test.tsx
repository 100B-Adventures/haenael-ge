// MyLinkCard.test.tsx — 아이콘 복사·fallback·analytics 회귀 테스트

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MyLinkCard } from "../MyLinkCard";
import { trackEvent } from "@/lib/analytics";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

describe("MyLinkCard", () => {
  beforeEach(() => {
    vi.mocked(trackEvent).mockReset();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });
  });

  it("44×44 Copy 아이콘 버튼과 상태를 설명하는 접근성 이름을 렌더한다", () => {
    const { container } = render(<MyLinkCard slug="dogyeong" />);

    const button = screen.getByRole("button", { name: "내 응원 링크 복사" });
    expect(button).toHaveClass("h-11", "w-11", "flex-shrink-0");
    expect(container.querySelector(".lucide-copy")).toBeInTheDocument();
    expect(screen.getByTestId("my-link-url")).toHaveClass("truncate", "select-text");
  });

  it("clipboard 성공 시 정확한 URL·Check·analytics를 유지한다", async () => {
    const { container } = render(<MyLinkCard slug="dogyeong" />);

    fireEvent.click(screen.getByTestId("my-link-copy-button"));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/g/dogyeong`,
      );
      expect(
        screen.getByRole("button", { name: "내 응원 링크 복사됨" }),
      ).toBeInTheDocument();
    });
    expect(container.querySelector(".lucide-check")).toBeInTheDocument();
    expect(trackEvent).toHaveBeenCalledWith("share_link_copied", {
      source: "home_my_link_card",
    });
  });

  it("clipboard API 실패 시 textarea fallback 성공을 같은 성공 상태로 처리한다", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error("clipboard unavailable"),
    );
    render(<MyLinkCard slug="fallback" />);

    fireEvent.click(screen.getByTestId("my-link-copy-button"));

    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledWith("copy");
      expect(
        screen.getByRole("button", { name: "내 응원 링크 복사됨" }),
      ).toBeInTheDocument();
    });
    expect(trackEvent).toHaveBeenCalledWith("share_link_copied", {
      source: "home_my_link_card",
    });
  });

  it("두 복사 경로가 모두 실패하면 성공·analytics 없이 복구 문구를 표시한다", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error("clipboard unavailable"),
    );
    vi.mocked(document.execCommand).mockReturnValueOnce(false);
    render(<MyLinkCard slug="failed" />);

    fireEvent.click(screen.getByTestId("my-link-copy-button"));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "내 응원 링크 복사 다시 시도" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("my-link-copy-error")).toHaveTextContent(
        "복사하지 못했어요. 링크를 길게 눌러 복사해 주세요.",
      );
    });
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
