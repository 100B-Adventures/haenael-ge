import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Collapsible, shouldCollapse } from "../Collapsible";

it("CP-01 세 조건이 모두 참일 때만 접는다", () => {
  expect(shouldCollapse({ auxiliary: true, exceedsLimit: true, hasCollapsedContext: true })).toBe(true);
  expect(shouldCollapse({ auxiliary: false, exceedsLimit: true, hasCollapsedContext: true })).toBe(false);
  expect(shouldCollapse({ auxiliary: true, exceedsLimit: false, hasCollapsedContext: true })).toBe(false);
  expect(shouldCollapse({ auxiliary: true, exceedsLimit: true, hasCollapsedContext: false })).toBe(false);
});

it("CP-03 토글은 꺾쇠 하나로 왕복한다", async () => {
  render(
    <Collapsible policy={{ auxiliary: true, exceedsLimit: true, hasCollapsedContext: true }}>
      {(expanded) => <span>{expanded ? "열림" : "닫힘"}</span>}
    </Collapsible>,
  );
  expect(screen.getByText("닫힘")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "내용 펼치기" }));
  expect(screen.getByText("열림")).toBeInTheDocument();
});

it("CP-06 서버 컴포넌트가 넘긴 정적 ReactNode를 펼침 상태로 교체한다", async () => {
  render(
    <Collapsible
      policy={{ auxiliary: true, exceedsLimit: true, hasCollapsedContext: true }}
      collapsedContent={<p>접힌 내용</p>}
      expandedContent={<p>펼친 내용</p>}
    />,
  );
  expect(screen.getByText("접힌 내용")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "내용 펼치기" }));
  expect(screen.getByText("펼친 내용")).toBeInTheDocument();
});

it("CP-01 조건이 빠지면 접지 않고 개발 경고를 남긴다", () => {
  const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  render(
    <Collapsible warnWhenDisabled policy={{ auxiliary: true, exceedsLimit: false, hasCollapsedContext: true }}>
      {(expanded) => <span>{expanded ? "전체" : "축약"}</span>}
    </Collapsible>,
  );
  expect(screen.getByText("전체")).toBeInTheDocument();
  expect(warning).toHaveBeenCalled();
  warning.mockRestore();
});
