import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { GoalVisibilityControl } from "../GoalVisibilityControl";

const action = vi.fn(async (_goalId: number, _visibility: string) => ({
  ok: true as const,
  data: undefined,
}));
vi.mock(
  "@/app/(receiver)/social-actions",
  () => ({
    setGoalVisibilityAction: (goalId: number, visibility: string) =>
      action(goalId, visibility),
  }),
);

it("CT-09 변경 중 이중 클릭이 RPC 1회다", async () => {
  let release: () => void = () => {};
  action.mockImplementationOnce(() =>
    new Promise((resolve) => {
      release = () => resolve({ ok: true, data: undefined });
    })
  );
  render(<GoalVisibilityControl goalId={1} initialVisibility="PUBLIC" />);
  const target = screen.getByRole("button", { name: "친구 공개" });
  await userEvent.click(target);
  await userEvent.click(target);
  expect(action).toHaveBeenCalledTimes(1);
  await act(async () => release());
});
