import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GoalCover } from "../GoalCover";
import { automaticGoalCoverKey } from "../goal-cover-presets";

describe("GoalCover 사진 프리셋", () => {
  it("GC-PRESET-01 명시 선택은 제목 자동 선택보다 우선한다", () => {
    render(<GoalCover presetKey="travel" title="토익 공부" />);
    expect(screen.getByTestId("goal-cover")).toHaveAttribute("data-preset", "travel");
    expect(screen.getByRole("img")).toHaveAttribute("src", expect.stringContaining("cover-travel.jpg"));
  });

  it("GC-PRESET-02 선택값이 없으면 목표 제목으로 기본 사진을 고른다", () => {
    render(<GoalCover presetKey={null} title="아침마다 5km 달리기" />);
    expect(screen.getByTestId("goal-cover")).toHaveAttribute("data-preset", "run");
    expect(automaticGoalCoverKey("매일 가계부 쓰고 저축")).toBe("money");
  });

  it("GC-PRESET-03 기존 c1부터 c6은 대응 사진으로 계속 렌더한다", () => {
    render(<GoalCover presetKey="c3" title="기존 목표" />);
    expect(screen.getByTestId("goal-cover")).toHaveAttribute("data-preset", "health");
  });
});
