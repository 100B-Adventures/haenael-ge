// SplitBalanceCard.test.tsx — 환전 잠금(A안) 분할 잔액 카드 단위 테스트.
// FDD test-plan §13.4 V1~V3.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SplitBalanceCard } from "../SplitBalanceCard";

describe("SplitBalanceCard", () => {
  // V1: locked=0이면 분할 블록 미렌더 (DESIGN §6-(d))
  it("locked=0이면 분할 블록을 렌더하지 않는다", () => {
    render(<SplitBalanceCard total={52} locked={0} available={52} pendingNetKrw={null} />);
    expect(screen.queryByTestId("split-balance-block")).toBeNull();
    expect(screen.getByTestId("split-balance-total")).toHaveTextContent("🍀 52");
    // 잠김 0일 때는 총량 옆 원화 등가가 그대로 보인다
    expect(screen.getByTestId("clover-krw-equivalent")).toBeInTheDocument();
    // 잠김 0이면 안내 문구도 분할 블록과 함께 사라진다 (DESIGN §6-(d))
    expect(screen.queryByTestId("split-balance-note")).toBeNull();
  });

  // V2: locked>0이면 총량·2행 렌더, 총량 옆 원화 등가 미표시, 잠김 행에 "입금 예정"
  it("locked>0이면 분할 블록을 렌더하고 총량 옆 등가는 숨긴다", () => {
    render(<SplitBalanceCard total={52} locked={40} available={12} pendingNetKrw={34426} />);
    expect(screen.getByTestId("split-balance-total")).toHaveTextContent("🍀 52");
    expect(screen.queryByTestId("clover-krw-equivalent")).toBeNull();

    const block = screen.getByTestId("split-balance-block");
    expect(block).toHaveTextContent("지금 쓸 수 있어요");
    expect(block).toHaveTextContent("🔒 환전으로 잠김");
    expect(screen.getByTestId("split-balance-available")).toHaveTextContent("🍀 12개");
    expect(screen.getByTestId("split-balance-locked")).toHaveTextContent("🍀 40개");
    expect(screen.getByTestId("split-balance-locked-krw")).toHaveTextContent("34,426원 입금 예정");
    expect(screen.getByTestId("split-balance-progress")).toHaveAttribute("value", "12");
    expect(screen.getByTestId("split-balance-progress")).toHaveAttribute("max", "52");

    // 안내 두 문장(DESIGN §6-(d)) — "52개는 왜 12개만 쓰냐" 오해를 닫는 문구
    const note = screen.getByTestId("split-balance-note");
    expect(note).toHaveTextContent("모은 52개는 그대로예요. 그중 40개에 잠금이 걸려 있어요.");
    expect(note).toHaveTextContent("입금이 끝나면 그때 40개가 총량에서 빠지고, 반려되면 잠금만 풀려요.");
  });

  // V3: available은 컴포넌트가 재계산하지 않고 전달받은 값을 그대로 렌더한다.
  it("available은 total-locked로 재계산하지 않고 전달받은 값을 그대로 렌더한다", () => {
    // 의도적으로 total-locked(=12)와 다른 available(=999)을 넘겨, 컴포넌트가 직접
    // 계산하지 않고 props를 그대로 렌더하는지 확인한다.
    render(<SplitBalanceCard total={52} locked={40} available={999} pendingNetKrw={null} />);
    expect(screen.getByTestId("split-balance-available")).toHaveTextContent("🍀 999개");
  });

  it("잠김 0이면 등가 표기가 웰컴 포함 총량 기준으로 렌더된다", () => {
    render(<SplitBalanceCard total={30} locked={0} available={30} pendingNetKrw={null} />);
    expect(screen.getByTestId("clover-krw-equivalent")).toHaveTextContent("30,000원 상당");
  });
});
