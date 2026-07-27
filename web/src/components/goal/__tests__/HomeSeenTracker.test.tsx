// HomeSeenTracker.test.tsx — /me 마운트 시 last-seen 타임스탬프 기록.

import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { HomeSeenTracker } from "../HomeSeenTracker";
import { HOME_LAST_SEEN_KEY } from "@/lib/home-seen";

describe("HomeSeenTracker", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("마운트 시 last-seen 타임스탬프를 localStorage에 기록한다", () => {
    const before = Date.now();
    render(<HomeSeenTracker />);
    const stored = Number(window.localStorage.getItem(HOME_LAST_SEEN_KEY));
    expect(stored).toBeGreaterThanOrEqual(before);
  });

  it("렌더 결과는 없음(null)", () => {
    const { container } = render(<HomeSeenTracker />);
    expect(container).toBeEmptyDOMElement();
  });
});
