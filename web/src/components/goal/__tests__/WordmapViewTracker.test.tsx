// WordmapViewTracker.test.tsx — 5차 라운드: wordmap_viewed GA4 배선 단위 테스트

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { WordmapViewTracker } from "../WordmapViewTracker";

const mockTrackEvent = vi.fn();
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

describe("WordmapViewTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("마운트 시 wordmap_viewed 이벤트를 1회 발사한다", () => {
    render(<WordmapViewTracker goalId={42} />);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith("wordmap_viewed", { goal_id: "42" });
  });

  it("렌더 결과는 없음(null)", () => {
    const { container } = render(<WordmapViewTracker goalId={1} />);
    expect(container).toBeEmptyDOMElement();
  });
});
