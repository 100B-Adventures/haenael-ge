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

  expect(screen.getByText(/돈이 빠져나갔다면 다시 결제하지 말고/))
    .toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(
    /sensitive upstream database error|PG_INTERNAL_ERROR/,
  );
  expect(screen.getByText("주문번호 order-secret")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "해낼게 홈으로" })).toHaveAttribute("href", "/");
  expect(screen.queryByRole("link", { name: "다시 응원하기" })).not.toBeInTheDocument();
});

it("PAY-FAIL-02 유효한 목표 slug가 있을 때만 재응원 경로를 제공한다", async () => {
  const element = await PaymentFailPage({
    searchParams: Promise.resolve({
      code: "PAY_PROCESS_CANCELED",
      goalSlug: "friend-goal",
    }),
  });
  render(element);

  expect(screen.getByRole("link", { name: "다른 결제수단으로 다시 시도하기" })).toHaveAttribute(
    "href",
    "/g/friend-goal",
  );
  expect(screen.getByRole("link", { name: "해낼게 홈으로" })).toHaveAttribute("href", "/");
});

it("PAY-FAIL-03 경로 삽입이 가능한 잘못된 slug는 재응원 링크를 만들지 않는다", async () => {
  const element = await PaymentFailPage({
    searchParams: Promise.resolve({ goalSlug: "../admin" }),
  });
  render(element);

  expect(screen.queryByRole("link", { name: /다시 시도하기/ })).not.toBeInTheDocument();
});

it("PAY-FAIL-04 카드사 거절은 출금되지 않았음과 다른 수단 재시도를 안내한다", async () => {
  const element = await PaymentFailPage({
    searchParams: Promise.resolve({
      code: "REJECT_CARD_COMPANY",
      goalSlug: "friend-goal",
    }),
  });
  render(element);

  expect(screen.getByText(/승인되지 않아 돈은 빠져나가지 않았어요/)).toBeInTheDocument();
  expect(screen.getByTestId("payment-fail-page")).toHaveAttribute(
    "data-payment-state",
    "not-approved",
  );
});
