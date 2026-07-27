// OwnerBar.test.tsx — 본인 열람 시 노출되는 owner bar. localStorage 기준 "새 응원 N개" 계산.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { OwnerBar } from "../OwnerBar";
import { HOME_LAST_SEEN_KEY } from "@/lib/home-seen";

describe("OwnerBar", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("last-seen 이후 생성된 cheer만 새 응원으로 센다", async () => {
    const now = Date.now();
    window.localStorage.setItem(HOME_LAST_SEEN_KEY, String(now - 1000));

    render(
      <OwnerBar
        cheerCreatedAts={[
          new Date(now - 2000).toISOString(), // 이전 방문 전 — 카운트 X
          new Date(now + 1000).toISOString(), // 이후 — 카운트 O
          new Date(now + 2000).toISOString(), // 이후 — 카운트 O
        ]}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("owner-bar-status")).toHaveTextContent(
        "새 응원 2개",
      ),
    );
  });

  it("last-seen 기록이 없으면(첫 방문) 전체를 새 응원으로 센다", async () => {
    render(
      <OwnerBar
        cheerCreatedAts={[
          new Date().toISOString(),
          new Date().toISOString(),
        ]}
      />,
    );

    await waitFor(() =>
      expect(screen.getByTestId("owner-bar-status")).toHaveTextContent(
        "새 응원 2개",
      ),
    );
  });

  it("새 응원이 없으면 empty 문구를 보여준다", async () => {
    window.localStorage.setItem(HOME_LAST_SEEN_KEY, String(Date.now() + 5000));

    render(<OwnerBar cheerCreatedAts={[new Date().toISOString()]} />);

    await waitFor(() =>
      expect(screen.getByTestId("owner-bar-status")).toHaveTextContent(
        "받은 응원을 여기서 관리해요",
      ),
    );
  });

  it("/me로 가는 CTA 링크를 렌더한다", () => {
    render(<OwnerBar cheerCreatedAts={[]} />);
    const cta = screen.getByTestId("owner-bar-cta");
    expect(cta).toHaveAttribute("href", "/me");
  });
});
