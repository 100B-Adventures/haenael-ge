import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { Collapsible, shouldCollapse } from "../Collapsible";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:tsx|jsx)$/.test(entry.name) ? [path] : [];
  });
}

it("CP-01 세 조건이 모두 참일 때만 접는다", () => {
  expect(
    shouldCollapse({
      auxiliary: true,
      exceedsLimit: true,
      hasCollapsedContext: true,
    }),
  ).toBe(true);
  expect(
    shouldCollapse({
      auxiliary: false,
      exceedsLimit: true,
      hasCollapsedContext: true,
    }),
  ).toBe(false);
  expect(
    shouldCollapse({
      auxiliary: true,
      exceedsLimit: false,
      hasCollapsedContext: true,
    }),
  ).toBe(false);
  expect(
    shouldCollapse({
      auxiliary: true,
      exceedsLimit: true,
      hasCollapsedContext: false,
    }),
  ).toBe(false);
});

it("CP-03 토글은 꺾쇠 하나로 왕복한다", async () => {
  render(
    <Collapsible
      policy={{
        auxiliary: true,
        exceedsLimit: true,
        hasCollapsedContext: true,
      }}
    >
      {(expanded) => <span>{expanded ? "열림" : "닫힘"}</span>}
    </Collapsible>,
  );
  expect(screen.getByText("닫힘")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "내용 펼치기" }));
  expect(screen.getByText("열림")).toBeInTheDocument();
});

it("CP-04 제품 화면은 details·직접 토글·지역 접기 상태 없이 Collapsible로 단일화한다", () => {
  const sources = sourceFiles(resolve(process.cwd(), "src"))
    .filter((path) => !path.includes(`${sep}__tests__${sep}`))
    .map((path) => ({ path, source: readFileSync(path, "utf8") }));
  const detailsViolations = sources
    .filter(({ source }) => source.includes("<details"))
    .map(({ path }) => path);
  const directToggleViolations = sources
    .filter(({ path }) => !path.endsWith(`${sep}common${sep}Collapsible.tsx`))
    .filter(({ source }) => /["'`](?:[^"'`]|\\.)*(?:접기|펼치기)(?:[^"'`]|\\.)*["'`]/.test(source))
    .map(({ path }) => path);
  const localStateViolations = sources
    .filter(({ path }) => !path.endsWith(`${sep}common${sep}Collapsible.tsx`))
    .filter(({ source }) =>
      /const\s*\[\s*(?:is)?(?:expanded|collapsed|showMore|showAll)\b/i.test(
        source,
      ),
    )
    .map(({ path }) => path);

  expect({
    detailsViolations,
    directToggleViolations,
    localStateViolations,
  }).toEqual({
    detailsViolations: [],
    directToggleViolations: [],
    localStateViolations: [],
  });
});

it("CP-06 서버 컴포넌트가 넘긴 정적 ReactNode를 펼침 상태로 교체한다", async () => {
  render(
    <Collapsible
      policy={{
        auxiliary: true,
        exceedsLimit: true,
        hasCollapsedContext: true,
      }}
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
    <Collapsible
      warnWhenDisabled
      policy={{
        auxiliary: true,
        exceedsLimit: false,
        hasCollapsedContext: true,
      }}
    >
      {(expanded) => <span>{expanded ? "전체" : "축약"}</span>}
    </Collapsible>,
  );
  expect(screen.getByText("전체")).toBeInTheDocument();
  expect(warning).toHaveBeenCalled();
  warning.mockRestore();
});
