import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { GoalCoverReviewQueue } from "../GoalCoverReviewQueue";

const invoke = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ functions: { invoke } }),
}));

it("ADMIN-COPY-02 저장소와 파일 형식 같은 구현 세부를 노출하지 않는다", () => {
  render(
    <GoalCoverReviewQueue
      initialItems={[{
        asset_id: "asset-1",
        goal_id: 1,
        goal_title: "토익 900 해낼게",
        owner_nickname: "서연",
        quarantine_path: "private/path/file.webp",
        mime_type: "image/webp",
        byte_size: 1024,
        content_sha256: "a".repeat(64),
        created_at: "2026-10-15T00:00:00Z",
      }]}
    />,
  );

  expect(screen.getByText(/기존 검수 대기 사진과 자동 공개된 사진/))
    .toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(
    /private bucket|public bucket|PUBLIC|image\/webp|private\/path/,
  );
});

it("QA-TC-GOAL-COVER-01 관리자는 이미 공개된 목표 사진을 내린다", async () => {
  render(<GoalCoverReviewQueue initialItems={[{
    asset_id: "asset-published",
    goal_id: 2,
    goal_title: "매일 달리기",
    owner_nickname: "민서",
    quarantine_path: "private/cover.webp",
    public_path: "2/asset-published.webp",
    status: "APPROVED",
    mime_type: "image/webp",
    byte_size: 2048,
    content_sha256: "b".repeat(64),
    created_at: "2026-11-26T00:00:00Z",
  }]} />);

  await userEvent.click(screen.getByRole("button", { name: "사진 내리기" }));
  expect(invoke).toHaveBeenCalledWith("admin-review-goal-cover", {
    body: { asset_id: "asset-published", decision: "REMOVE", rejection_code: null },
  });
  expect(screen.queryByText("매일 달리기")).not.toBeInTheDocument();
});
