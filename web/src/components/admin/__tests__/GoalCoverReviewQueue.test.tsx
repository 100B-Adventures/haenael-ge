import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { GoalCoverReviewQueue } from "../GoalCoverReviewQueue";

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

  expect(screen.getByText(/승인한 사진만 목표 커버에 반영/))
    .toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(
    /private bucket|public bucket|PUBLIC|image\/webp|private\/path/,
  );
});
