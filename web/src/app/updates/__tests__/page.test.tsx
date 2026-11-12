import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UpdatesPage from "../page";

describe("공개 업데이트 기록", () => {
  it("RELEASE.md에서 생성한 최신 3개를 최신순으로 렌더한다", () => {
    render(<UpdatesPage />);

    const items = within(screen.getByRole("list", { name: "최근 업데이트" })).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("버전 2.1.5");
    expect(items[1]).toHaveTextContent("버전 2.1.4");
    expect(items[2]).toHaveTextContent("버전 2.1.3");
    expect(screen.getByRole("heading", { name: "새로 달라진 점을 확인하세요" })).toBeInTheDocument();
  });
});
