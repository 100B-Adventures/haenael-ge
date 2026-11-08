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
  expect(screen.getByTestId("my-goal-list-card-manage-link")).toHaveAttribute(
    "href",
    "/me/goal/7",
  );
  expect(screen.getByTestId("my-goal-list-card-detail-link")).toHaveAttribute(
    "href",
    "/me/goal/7",
  );
  expect(screen.getByRole("button", { name: /링크 복사/ })).toBeInTheDocument();

  const card = screen.getByTestId("my-goal-list-card");
  const manage = screen.getByTestId("my-goal-list-card-manage-link");
  const summary = screen.getByTestId("my-goal-list-card-detail-link");
  expect(card.compareDocumentPosition(manage) & Node.DOCUMENT_POSITION_CONTAINED_BY).toBeTruthy();
  expect(manage.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it("CS-03 응원 0명 목표는 요약 바 대신 빈 상태를 표시한다", () => {
  render(
    <MyGoalListCard
      goal={{
        id: 8,
        slug: "learn-english",
        title: "매일 영어 단어 30개",
        due_date: "2026-12-31",
        status: "ACTIVE",
        coverPresetKey: "c1",
        cheerSummary: {
          cheer_count: 0,
          supporter_avatars: [],
          recent_cheer: null,
        },
      }}
    />,
  );

  expect(screen.queryByTestId("cheer-summary-bar")).not.toBeInTheDocument();
  expect(screen.getByTestId("cheer-summary-empty")).toHaveTextContent("아직 응원이 없어요");
});
