import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GoalEditSheet } from "../GoalEditSheet";

const mockRpc = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ rpc: mockRpc }),
}));

describe("GoalEditSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it("현재 why를 표시하고 title·D-day·why 초기값을 편집 시트에 불러온다", () => {
    render(
      <GoalEditSheet
        goalId={7}
        initialTitle="편입 합격"
        initialReason="이번에는 끝을 보려고요."
        initialDueDate="2026-12-31"
        editable
      />,
    );

    expect(screen.getByTestId("goal-reason")).toHaveTextContent(
      "이번에는 끝을 보려고요.",
    );

    fireEvent.click(screen.getByTestId("open-goal-edit-sheet"));

    expect(screen.getByTestId("edit-goal-title-input")).toHaveValue("편입 합격");
    expect(screen.getByTestId("edit-goal-due-date-input")).toHaveValue("2026-12-31");
    expect(screen.getByTestId("edit-goal-reason-input")).toHaveValue(
      "이번에는 끝을 보려고요.",
    );
  });

  it("suffix를 중복하지 않고 update_goal RPC로 저장한 뒤 서버 화면을 갱신한다", async () => {
    render(
      <GoalEditSheet
        goalId={7}
        initialTitle="편입 합격"
        initialReason={null}
        initialDueDate="2026-12-31"
        editable
      />,
    );

    fireEvent.click(screen.getByTestId("open-goal-edit-sheet"));
    fireEvent.change(screen.getByTestId("edit-goal-title-input"), {
      target: { value: "  체력 만들기 해낼게  " },
    });
    fireEvent.change(screen.getByTestId("edit-goal-due-date-input"), {
      target: { value: "2027-01-31" },
    });
    fireEvent.change(screen.getByTestId("edit-goal-reason-input"), {
      target: { value: "  매일 오래 걷고 싶어서  " },
    });
    fireEvent.click(screen.getByTestId("save-goal-edit"));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("update_goal", {
        p_goal_id: 7,
        p_title: "체력 만들기",
        p_reason: "매일 오래 걷고 싶어서",
        p_due_date: "2027-01-31",
      });
    });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId("goal-edit-sheet")).not.toBeInTheDocument();
      expect(screen.getByTestId("goal-reason")).toHaveTextContent(
        "매일 오래 걷고 싶어서",
      );
    });
  });

  it("빈 목표와 유효하지 않은 D-day는 RPC 호출 전에 막는다", () => {
    render(
      <GoalEditSheet
        goalId={7}
        initialTitle="편입 합격"
        initialReason={null}
        initialDueDate="2026-12-31"
        editable
      />,
    );

    fireEvent.click(screen.getByTestId("open-goal-edit-sheet"));
    fireEvent.change(screen.getByTestId("edit-goal-title-input"), {
      target: { value: "해낼게" },
    });
    fireEvent.change(screen.getByTestId("edit-goal-due-date-input"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByTestId("save-goal-edit"));

    expect(screen.getByText("목표를 입력해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("올바른 마감일을 선택해 주세요.")).toBeInTheDocument();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
