// ShareLinkCard.test.tsx — 5차 라운드: 링크 복사 시 share_link_copied GA4 배선 단위 테스트

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareLinkCard } from "../ShareLinkCard";

const mockTrackEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

const mockWriteText = vi.fn().mockResolvedValue(undefined);

describe("ShareLinkCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: mockWriteText },
      configurable: true,
      writable: true,
    });
  });

  it("링크 복사 클릭 → share_link_copied GA4 이벤트 배선", async () => {
    render(<ShareLinkCard slug="test-slug" goalTitle="편입 평점 4.0" />);
    fireEvent.click(screen.getByTestId("copy-link-button"));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith("share_link_copied", { source: "share_link_card" });
    });
  });

  it("링크 복사 성공 → 버튼 텍스트 변경", async () => {
    render(<ShareLinkCard slug="test-slug" goalTitle="편입 평점 4.0" />);
    fireEvent.click(screen.getByTestId("copy-link-button"));

    await waitFor(() => {
      expect(screen.getByTestId("copy-link-button")).toHaveTextContent("복사됐어요");
    });
  });
});
