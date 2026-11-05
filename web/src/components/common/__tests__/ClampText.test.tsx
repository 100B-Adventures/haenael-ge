import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ClampText } from "../ClampText";

afterEach(() => vi.restoreAllMocks());

it("CP-04 3줄 이상 메시지는 clamp 상태로 측정하고 셰브론을 노출한다", () => {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(72);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(40);
  render(<ClampText controlsId="cheer-message-7" toggleLabel="7번째 응원 내용">첫째 줄 둘째 줄 셋째 줄 넷째 줄까지 이어지는 긴 응원 메시지입니다.</ClampText>);
  expect(screen.getByText(/첫째 줄/)).toHaveClass("clamp-text");
  expect(screen.getByRole("button", { name: "7번째 응원 내용 펼치기" })).toHaveAttribute("aria-controls", "cheer-message-7");
  expect(screen.getByText(/첫째 줄/).parentElement).toHaveAttribute("data-collapsible", "enabled");
});

it("CP-05 짧은 메시지는 첫 렌더부터 셰브론을 만들지 않는다", () => {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(24);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(24);
  render(<ClampText>짧은 응원</ClampText>);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("CL-01~04 긴 메시지는 펼친 뒤에도 토글을 보존해 다시 접힌다", async () => {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(72);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("clamp-text") ? 40 : 72;
  });

  render(<ClampText>첫째 줄 둘째 줄 셋째 줄 넷째 줄까지 이어지는 긴 응원 메시지입니다.</ClampText>);
  const message = screen.getByText(/첫째 줄/);

  await userEvent.click(screen.getByRole("button", { name: "내용 펼치기" }));
  expect(message).not.toHaveClass("clamp-text");
  const collapseButton = screen.getByRole("button", { name: "내용 접기" });
  expect(collapseButton).toHaveAttribute("aria-expanded", "true");

  await userEvent.click(collapseButton);
  expect(message).toHaveClass("clamp-text");
  expect(screen.getByRole("button", { name: "내용 펼치기" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});
