import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GoalSupporterList, type GoalSupporter } from "../GoalSupporterList";

const RENDERED_AT = "2026-10-25T00:00:00.000Z";

function supporters(count: number): GoalSupporter[] {
  return Array.from({ length: count }, (_, index) => ({
    supporter_key: `supporter-${index}`,
    display_name: index === 1 ? null : `응원자 ${index + 1}`,
    is_anonymous: index === 1,
    profile_image: index === 0 ? "/images/social-viral/dogyeong.png" : null,
    message: `${index + 1}번째 응원 메시지`,
    cheer_count: index + 1,
    latest_at: new Date(Date.parse(RENDERED_AT) - index * 60 * 60 * 1000).toISOString(),
  }));
}

describe("GoalSupporterList", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    Object.defineProperty(document, "execCommand", { configurable: true, value: vi.fn(() => true) });
  });

  it("GOAL-CHEER-01 8명 미리보기 뒤 20명까지 펼치고 응원 횟수·최근 시점을 표시한다", () => {
    render(<GoalSupporterList goalId={7} slug="goal" supporters={supporters(20)} totalCount={20} renderedAt={RENDERED_AT} />);
    expect(screen.getAllByTestId("goal-supporter-item")).toHaveLength(8);
    expect(screen.getByText("🍀 1번")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "응원 목록 펼치기" }));
    expect(screen.getAllByTestId("goal-supporter-item")).toHaveLength(20);
  });

  it("GOAL-CHEER-02 20명 초과는 목표 범위 검색 폼을 열고 익명 사진을 노출하지 않는다", () => {
    render(<GoalSupporterList goalId={7} slug="goal" supporters={supporters(20)} totalCount={24} renderedAt={RENDERED_AT} />);
    fireEvent.click(screen.getByRole("button", { name: "응원 목록 펼치기" }));
    fireEvent.click(screen.getByRole("button", { name: "지난 응원 찾기" }));
    expect(screen.getByRole("search")).toHaveAttribute("action", "/me/goal/7");
    expect(screen.getByText("익명의 누군가").closest("article")).not.toContainElement(screen.queryByRole("img", { name: /익명/ }));
  });

  it("GOAL-CHEER-03 응원 0명은 빈 상태와 실제 링크 복사 CTA를 표시한다", async () => {
    render(<GoalSupporterList goalId={7} slug="goal" supporters={[]} totalCount={0} renderedAt={RENDERED_AT} />);
    expect(screen.getByText("아직 응원이 없어요")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "응원 링크 복사하기" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringMatching(/\/g\/goal$/));
    expect(await screen.findByRole("button", { name: "응원 링크 복사됨" })).toBeInTheDocument();
  });

  it("GOAL-CHEER-04 클립보드와 fallback이 모두 실패하면 재시도 오류를 표시한다", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("denied"));
    vi.mocked(document.execCommand).mockReturnValue(false);
    render(<GoalSupporterList goalId={7} slug="goal" supporters={[]} totalCount={0} renderedAt={RENDERED_AT} />);
    fireEvent.click(screen.getByRole("button", { name: "응원 링크 복사하기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("링크를 복사하지 못했어요");
  });

  it("GOAL-CHEER-05 SSR과 브라우저 timezone이 달라도 한국 날짜를 동일하게 표시한다", () => {
    const [supporter] = supporters(1);
    render(
      <GoalSupporterList
        goalId={7}
        slug="goal"
        supporters={[{ ...supporter, latest_at: "2026-10-16T23:30:00.000Z" }]}
        totalCount={1}
        renderedAt={RENDERED_AT}
      />,
    );
    expect(screen.getByText("10. 17.")).toBeInTheDocument();
  });
});
