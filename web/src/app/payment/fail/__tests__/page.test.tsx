import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import PaymentFailPage from "../page";

it("PAY-FAIL-01 외부 결제 오류 원문을 사용자 화면에 노출하지 않는다", async () => {
  const element = await PaymentFailPage({
    searchParams: Promise.resolve({
      code: "PG_INTERNAL_ERROR",
      message: "sensitive upstream database error",
      orderId: "order-secret",
    }),
  });
  render(element);

  expect(screen.getByText(/결제 수단을 확인한 뒤 다시 시도/))
    .toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(
    /sensitive upstream database error|PG_INTERNAL_ERROR|order-secret/,
  );
});
