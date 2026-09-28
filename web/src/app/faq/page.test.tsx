import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FAQ_ITEMS } from "@/lib/seo/structured-data";
import FaqPage from "./page";

describe("SEO-FAQ-01 자주 묻는 질문 페이지", () => {
  it("SEO-FAQ-01-정상 질문 10개와 답변을 사람이 읽는 페이지에 렌더한다", () => {
    render(<FaqPage />);

    expect(screen.getByRole("heading", { name: "자주 묻는 질문" })).toBeInTheDocument();
    expect(screen.getAllByTestId("faq-item")).toHaveLength(10);

    FAQ_ITEMS.forEach(({ question, answer }) => {
      expect(screen.getByText(question)).toBeInTheDocument();
      expect(screen.getByText(answer)).toBeInTheDocument();
    });
  });

  it("SEO-FAQ-01-거절 FAQ 구조화 데이터가 화면 데이터 외의 답변을 만들지 않는다", () => {
    const { container } = render(<FaqPage />);
    const script = container.querySelector('script[type="application/ld+json"]');

    expect(script).not.toBeNull();
    const schema = JSON.parse(script?.textContent ?? "{}");
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity).toHaveLength(FAQ_ITEMS.length);
    expect(container.textContent).not.toContain("실제 돈으로 환전");
  });
});
