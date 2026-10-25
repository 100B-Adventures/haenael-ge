import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { MyGoalListCard } from "../MyGoalListCard";

it("CS-UI-01 내 목표 카드에 금액·순위 없이 응원 요약을 표시한다", () => {
  render(
    <MyGoalListCard
      goal={{
        id: 7,
        slug: "run-three-times",
        title: "매주 세 번 달리기",
        due_date: "2026-12-31",
        status: "ACTIVE",
        coverPresetKey: "c1",
        cheerSummary: {
          cheer_count: 5,
          supporter_avatars: [
            { profile_image: null, is_anonymous: true },
            { profile_image: null, is_anonymous: false },
          ],
          recent_cheer: {
            supporter_name: null,
            profile_image: null,
            message: "꾸준히 가요.",
            created_at: "2026-10-20T00:00:00Z",
            is_anonymous: true,
          },
        },
      }}
    />,
  );

  expect(screen.getByTestId("cheer-summary-bar")).toHaveTextContent("5명이 응원했어요");
  expect(screen.getByTestId("cheer-summary-bar")).toHaveTextContent("+3");
  expect(screen.getByText(/익명의 누군가: 꾸준히 가요/)).toBeInTheDocument();
  expect(document.body).not.toHaveTextContent(/₩|\d[\d,]*원|순위/);
});
