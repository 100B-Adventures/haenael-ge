// GoalCard.test.tsx — GoalCard + DdayChip + StatusChip 단위 테스트
// vitest + React Testing Library

import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("TITLE-02 이미 '-게'로 끝나는 자연어 목표에는 '해낼게'를 중복하지 않는다", () => {
    render(
      <GoalCard
        title="토익 900 넘길게"
        reason={null}
        dueDate={dueDate}
        status="ACTIVE"
        variant="public"
      />,
    );
    expect(screen.getByTestId("goal-title")).toHaveTextContent("토익 900 넘길게");
    expect(screen.getByTestId("goal-title")).not.toHaveTextContent(
      "토익 900 넘길게 해낼게",
    );
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

  it("프로필 데이터가 없으면 클로버와 '해낼게 사용자'를 표시하고 물음표·익명을 숨긴다", () => {
    render(
      <GoalCard title="목표" reason={null} dueDate={dueDate} status="ACTIVE" />,
    );
    expect(screen.getByTestId("goal-owner-avatar-clover")).toBeInTheDocument();
    expect(screen.getByText("해낼게 사용자")).toBeInTheDocument();
    expect(screen.queryByText("?")).not.toBeInTheDocument();
    expect(screen.queryByText("익명")).not.toBeInTheDocument();
  });

  it("닉네임은 공백을 제거하고 첫 사용자 인식 문자를 이니셜로 표시한다", () => {
    render(
      <GoalCard
        title="목표"
        reason={null}
        dueDate={dueDate}
        status="ACTIVE"
        nickname="  민지  "
      />,
    );
    expect(screen.getByTestId("goal-owner-avatar")).toHaveTextContent("민");
    expect(screen.getByText("민지")).toBeInTheDocument();
  });

  it("프로필 이미지는 56×56 cover로 표시하고 로드 실패 시 닉네임 이니셜로 폴백한다", () => {
    render(
      <GoalCard
        title="목표"
        reason={null}
        dueDate={dueDate}
        status="ACTIVE"
        nickname="도경"
        profileImageUrl="https://example.com/broken-profile.jpg"
      />,
    );

    const image = screen.getByTestId("goal-owner-avatar-image");
    expect(image).toHaveAttribute("width", "56");
    expect(image).toHaveAttribute("height", "56");
    expect(image).toHaveClass("object-cover");

    fireEvent.error(image);

    expect(screen.queryByTestId("goal-owner-avatar-image")).not.toBeInTheDocument();
    expect(screen.getByTestId("goal-owner-avatar")).toHaveTextContent("도");
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
