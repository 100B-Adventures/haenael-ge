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

  it("GD-INLINE-01 날짜·목표·WHY는 각 자리를 눌렀을 때 해당 필드만 편집한다", () => {
    render(
      <GoalEditSheet
        goalId={7}
        initialTitle="편입 합격"
        initialReason="이번에는 끝을 보려고요."
        initialDueDate="2026-12-31"
        status="ACTIVE"
        editable
      />,
    );

    expect(screen.getByTestId("goal-reason")).toHaveTextContent(
      "이번에는 끝을 보려고요.",
    );
    expect(screen.getByTestId("goal-inline-title")).toHaveTextContent(
      "편입 합격 해낼게",
    );

    fireEvent.click(screen.getByRole("button", { name: "마감일 편집" }));
    expect(screen.getByTestId("edit-goal-due-date-input")).toHaveValue("2026-12-31");
    expect(screen.queryByTestId("edit-goal-title-input")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    fireEvent.click(screen.getByTestId("open-goal-edit-sheet"));
    expect(screen.getByTestId("edit-goal-title-input")).toHaveValue("편입 합격");
    expect(screen.queryByTestId("edit-goal-due-date-input")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    fireEvent.click(screen.getByRole("button", { name: "WHY 편집" }));
    expect(screen.getByTestId("edit-goal-reason-input")).toHaveValue(
      "이번에는 끝을 보려고요.",
    );
    expect(screen.queryByTestId("edit-goal-title-input")).not.toBeInTheDocument();
  });

  it("suffix를 중복하지 않고 update_goal RPC로 저장한 뒤 서버 화면을 갱신한다", async () => {
    render(
      <GoalEditSheet
        goalId={7}
        initialTitle="편입 합격"
        initialReason={null}
        initialDueDate="2026-12-31"
        status="ACTIVE"
        editable
      />,
    );

    fireEvent.click(screen.getByTestId("open-goal-edit-sheet"));
    fireEvent.change(screen.getByTestId("edit-goal-title-input"), {
      target: { value: "  체력 만들기 해낼게  " },
    });
    fireEvent.click(screen.getByTestId("save-goal-edit"));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("update_goal", {
        p_goal_id: 7,
        p_title: "체력 만들기",
        p_reason: "",
        p_due_date: "2026-12-31",
      });
    });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId("goal-edit-sheet")).not.toBeInTheDocument();
      expect(screen.getByTestId("goal-inline-title")).toHaveTextContent("체력 만들기 해낼게");
    });
  });

  it("GD-INLINE-02 빈 목표와 유효하지 않은 D-day는 각각 RPC 호출 전에 막는다", () => {
    render(
      <GoalEditSheet
        goalId={7}
        initialTitle="편입 합격"
        initialReason={null}
        initialDueDate="2026-12-31"
        status="ACTIVE"
        editable
      />,
    );

    fireEvent.click(screen.getByTestId("open-goal-edit-sheet"));
    fireEvent.change(screen.getByTestId("edit-goal-title-input"), {
      target: { value: "해낼게" },
    });
    fireEvent.click(screen.getByTestId("save-goal-edit"));

    expect(screen.getByText("목표를 입력해 주세요.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    fireEvent.click(screen.getByRole("button", { name: "마감일 편집" }));
    fireEvent.change(screen.getByTestId("edit-goal-due-date-input"), { target: { value: "" } });
    fireEvent.click(screen.getByTestId("save-goal-edit"));
    expect(screen.getByText("올바른 마감일을 선택해 주세요.")).toBeInTheDocument();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("TITLE-02 게 또는 구두점으로 끝나는 목표는 해낼게 suffix를 중복하지 않는다", () => {
    render(
      <GoalEditSheet
        goalId={7}
        initialTitle="토익 900 넘길게!"
        initialReason={null}
        initialDueDate="2026-12-31"
        status="ACTIVE"
        editable
      />,
    );

    expect(screen.getByTestId("goal-inline-title")).toHaveTextContent("토익 900 넘길게!");
    expect(screen.getByTestId("goal-inline-title")).not.toHaveTextContent("넘길게! 해낼게");
  });

  it("종료 목표는 실제 상태를 표시하고 편집 진입을 숨긴다", () => {
    render(
      <GoalEditSheet
        goalId={7}
        initialTitle="편입 합격"
        initialReason={null}
        initialDueDate="2026-12-31"
        status="CLOSED"
        editable={false}
      />,
    );

    expect(screen.getByText("마감됨")).toBeInTheDocument();
    expect(screen.getByTestId("dday-chip")).toBeInTheDocument();
    expect(screen.queryByTestId("open-goal-edit-sheet")).not.toBeInTheDocument();
  });
});
