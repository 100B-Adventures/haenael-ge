// GoalCard.test.tsx — GoalCard + DdayChip + StatusChip 단위 테스트
// vitest + React Testing Library

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoalCard } from "../GoalCard";
import { DdayChip, StatusChip } from "../DdayChip";

// ─── DdayChip ─────────────────────────────────────────────────────────────────

describe("DdayChip", () => {
  it("미래 날짜: D-{n} 형식 표시", () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    render(<DdayChip dueDate={future.toISOString().split("T")[0]} />);
    const chip = screen.getByTestId("dday-chip");
    expect(chip.textContent).toMatch(/^D-\d+$/);
  });

  it("오늘 날짜: D-day 표시", () => {
    const today = new Date().toISOString().split("T")[0];
    render(<DdayChip dueDate={today} />);
    expect(screen.getByTestId("dday-chip").textContent).toBe("D-day");
  });

  it("과거 날짜: D+{n} 형식 표시", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    render(<DdayChip dueDate={past.toISOString().split("T")[0]} />);
    expect(screen.getByTestId("dday-chip").textContent).toMatch(/^D\+\d+$/);
  });
});

// ─── StatusChip ──────────────────────────────────────────────────────────────

describe("StatusChip", () => {
  it("ACTIVE → 진행 중", () => {
    render(<StatusChip status="ACTIVE" />);
    expect(screen.getByTestId("status-chip").textContent).toBe("진행 중");
  });
  it("CLOSED → 마감됨", () => {
    render(<StatusChip status="CLOSED" />);
    expect(screen.getByTestId("status-chip").textContent).toBe("마감됨");
  });
  it("DELETED → 종료됨", () => {
    render(<StatusChip status="DELETED" />);
    expect(screen.getByTestId("status-chip").textContent).toBe("종료됨");
  });
});

// ─── GoalCard ────────────────────────────────────────────────────────────────

describe("GoalCard", () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDate = tomorrow.toISOString().split("T")[0];

  it("제목 렌더 + '해낼게' suffix", () => {
    render(
      <GoalCard
        title="편입 평점 4.0"
        reason="8개월째 새벽 도서관"
        dueDate={dueDate}
        status="ACTIVE"
        nickname="도경"
      />,
    );
    expect(screen.getByTestId("goal-title")).toHaveTextContent("편입 평점 4.0");
    expect(screen.getByTestId("goal-title")).toHaveTextContent("해낼게");
  });

  it("닉네임 표시", () => {
    render(
      <GoalCard
        title="목표"
        reason={null}
        dueDate={dueDate}
        status="ACTIVE"
        nickname="민지"
      />,
    );
    expect(screen.getByText("민지")).toBeInTheDocument();
  });

  it("닉네임 없으면 '익명' 표시", () => {
    render(
      <GoalCard title="목표" reason={null} dueDate={dueDate} status="ACTIVE" />,
    );
    expect(screen.getByText("익명")).toBeInTheDocument();
  });

  it("reason이 있으면 WHY 섹션 렌더", () => {
    render(
      <GoalCard title="목표" reason="이유입니다" dueDate={dueDate} status="ACTIVE" />,
    );
    expect(screen.getByText("WHY")).toBeInTheDocument();
    expect(screen.getByText("이유입니다")).toBeInTheDocument();
  });

  it("reason null이면 WHY 섹션 없음", () => {
    render(
      <GoalCard title="목표" reason={null} dueDate={dueDate} status="ACTIVE" />,
    );
    expect(screen.queryByText("WHY")).not.toBeInTheDocument();
  });

  it("ACTIVE: DdayChip 표시", () => {
    render(
      <GoalCard title="목표" reason={null} dueDate={dueDate} status="ACTIVE" />,
    );
    expect(screen.getByTestId("dday-chip")).toBeInTheDocument();
  });

  it("CLOSED: DdayChip 숨김", () => {
    render(
      <GoalCard title="목표" reason={null} dueDate={dueDate} status="CLOSED" />,
    );
    expect(screen.queryByTestId("dday-chip")).not.toBeInTheDocument();
  });

  it("금액 노출 없음 — 금액·클로버 수치 렌더 안 됨", () => {
    const { container } = render(
      <GoalCard title="목표" reason={null} dueDate={dueDate} status="ACTIVE" />,
    );
    expect(container.textContent).not.toMatch(/₩|원|클로버|🍀/);
  });
});
