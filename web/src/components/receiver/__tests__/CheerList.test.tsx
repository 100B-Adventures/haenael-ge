import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CheerList, type ReceiverCheer } from "../CheerList";

function cheers(count: number): ReceiverCheer[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    display_name: `응원자 ${index + 1}`,
    is_anonymous: false,
    message: `${index + 1}번째 응원 메시지`,
    clover_amount: index + 1,
    created_at: "2026-08-24T00:00:00.000Z",
  }));
}

describe("TC-OV-01 응원 목록 오버플로", () => {
  it("정상 경로: 9번째 응원부터 더 보기로 펼쳐 최대 20행까지 보여준다", () => {
    render(<CheerList cheers={cheers(20)} totalCount={20} />);

    expect(screen.getAllByTestId("cheer-item")).toHaveLength(8);
    expect(screen.getByTestId("receiver-cheer-card")).toContainElement(screen.getByTestId("cheer-overflow-summary"));
    expect(screen.getByTestId("cheer-overflow-summary")).toHaveTextContent("12개 더 있음");
    expect(screen.getByRole("button", { name: "응원 목록 펼치기" })).toHaveAttribute("aria-controls", "receiver-cheer-list");

    fireEvent.click(screen.getByRole("button", { name: "응원 목록 펼치기" }));

    expect(screen.getAllByTestId("cheer-item")).toHaveLength(20);
    expect(screen.getByRole("button", { name: "응원 목록 접기" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByTestId("cheer-item-ordinal")[10]).toHaveTextContent("11번째");
  });

  it("거절 경로: 100건이어도 DOM 표시 상한을 20행으로 지키고 카드 안에서 서버 검색을 연다", () => {
    render(<CheerList cheers={cheers(100)} totalCount={100} />);
    fireEvent.click(screen.getByRole("button", { name: "응원 목록 펼치기" }));

    expect(screen.getAllByTestId("cheer-item")).toHaveLength(20);
    expect(screen.getByTestId("cheer-overflow-summary")).toHaveTextContent("전체 목록도 20개까지 보여줘요");
    expect(screen.getByTestId("cheer-search-trigger")).toHaveTextContent("80개는 검색으로 찾기");

    fireEvent.click(screen.getByTestId("cheer-search-trigger"));
    const form = screen.getByRole("search");
    expect(screen.getByTestId("receiver-cheer-card")).toContainElement(form);
    expect(form).toHaveAttribute("action", "/me");
    expect(form).toHaveAttribute("method", "get");
    expect(screen.getByTestId("cheer-search-input")).toBeRequired();
    expect(screen.getByTestId("cheer-search-input")).toHaveAttribute("maxlength", "80");

    fireEvent.click(screen.getByRole("button", { name: "응원 목록 접기" }));
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "응원 목록 펼치기" })).toHaveAttribute("aria-expanded", "false");
  });

  it("TC-OV-04 정상 경로: 시안의 12px 행 패딩과 12px 간격을 쓰고 우측 하단에 순번을 보여준다", () => {
    render(<CheerList cheers={cheers(2)} totalCount={2} />);

    const [firstRow] = screen.getAllByTestId("cheer-item");
    expect(firstRow).toHaveClass("gap-3", "py-3");
    expect(screen.getAllByTestId("cheer-item-ordinal")[0]).toHaveTextContent("1번째");
    expect(screen.getAllByTestId("cheer-item-ordinal")[1]).toHaveTextContent("2번째");
    expect(screen.queryByText("날짜 미상")).not.toBeInTheDocument();
    expect(screen.getByText("1번째 응원 메시지")).toHaveAttribute("title", "1번째 응원 메시지");
  });

  it("TC-OV-05 거절 경로: 잘못된 생성 시간이어도 상대 시간을 만들지 않고 목록 순번을 유지한다", () => {
    const invalidDateCheer = [{ ...cheers(1)[0], created_at: "invalid" }];
    render(<CheerList cheers={invalidDateCheer} totalCount={1} />);

    expect(screen.getByTestId("cheer-item-ordinal")).toHaveTextContent("1번째");
    expect(screen.queryByText(/전$/)).not.toBeInTheDocument();
    expect(screen.queryByText("날짜 미상")).not.toBeInTheDocument();
  });

  it("정상 경로: 서버가 돌려준 121번째 응원을 검색 결과 카드에 표시한다", () => {
    const result = cheers(121).slice(120);
    render(<CheerList cheers={result} totalCount={121} searchQuery="121번째" />);

    expect(screen.getAllByTestId("cheer-item")).toHaveLength(1);
    expect(screen.getByTestId("receiver-cheer-list")).toHaveTextContent("121번째 응원 메시지");
    expect(screen.getByTestId("cheer-overflow-summary")).toHaveTextContent("1개 찾았어요");
    expect(screen.getByTestId("cheer-search-input")).toHaveValue("121번째");
  });
});
