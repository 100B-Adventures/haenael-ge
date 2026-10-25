import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GoalManagementActions } from "../GoalManagementActions";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockRpc = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ rpc: mockRpc }),
}));

describe("GoalManagementActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockRpc.mockResolvedValue({ data: { goal_id: 7, status: "CLOSED", closed_at: "2026-10-25T00:00:00Z" }, error: null });
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("GOAL-ACTION-01 공개 미리보기와 응원 링크 복사가 실제 동작한다", async () => {
    render(<GoalManagementActions goalId={7} slug="goal-slug" active />);
    expect(screen.getByRole("link", { name: /친구 화면 미리보기/ })).toHaveAttribute("href", "/g/goal-slug");
    fireEvent.click(screen.getByRole("button", { name: "응원 링크 복사" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringMatching(/\/g\/goal-slug$/)));
    expect(screen.getByRole("button", { name: "응원 링크 복사됨" })).toBeInTheDocument();
  });

  it("GOAL-ACTION-02 종료 확인 뒤 본인 활성 목표만 CLOSED로 바꾸고 홈으로 이동한다", async () => {
    render(<GoalManagementActions goalId={7} slug="goal-slug" active />);
    fireEvent.click(screen.getByRole("button", { name: "이 목표 종료하기" }));
    await waitFor(() => expect(mockRpc).toHaveBeenCalledWith("close_my_goal", { p_goal_id: 7 }));
    expect(mockPush).toHaveBeenCalledWith("/me");
  });

  it("GOAL-ACTION-03 종료 요청이 거절되면 화면에 오류를 남기고 이동하지 않는다", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "denied" } });
    render(<GoalManagementActions goalId={7} slug="goal-slug" active />);
    fireEvent.click(screen.getByRole("button", { name: "이 목표 종료하기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("목표를 종료하지 못했어요");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("GOAL-ACTION-04 종료된 목표에는 종료 CTA를 다시 노출하지 않는다", () => {
    render(<GoalManagementActions goalId={7} slug="goal-slug" active={false} />);
    expect(screen.queryByRole("button", { name: "이 목표 종료하기" })).not.toBeInTheDocument();
  });
});
