import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ClampText } from "../ClampText";

afterEach(() => vi.restoreAllMocks());

it("CP-04 3줄 이상 메시지는 clamp 상태로 측정하고 셰브론을 노출한다", () => {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(72);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(40);
  render(<ClampText>첫째 줄 둘째 줄 셋째 줄 넷째 줄까지 이어지는 긴 응원 메시지입니다.</ClampText>);
  expect(screen.getByText(/첫째 줄/)).toHaveClass("clamp-text");
  expect(screen.getByRole("button", { name: "내용 펼치기" })).toBeInTheDocument();
});
