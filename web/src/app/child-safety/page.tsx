import type { Metadata } from "next";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-child-safety-page";

export const metadata: Metadata = {
  title: "아동 보호 정책 | 해낼게",
  description: "해낼게의 아동·청소년 보호 원칙과 신고 및 지원 경로입니다.",
};

export default function ChildSafetyPage() {
  return (
    <main
      className="mx-auto max-w-2xl px-6 py-16 text-foreground"
      data-testid="child-safety-page"
    >
      <h1 className="mb-3 text-2xl font-bold">{PRODUCT_COPY.TEXT_001}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{PRODUCT_COPY.TEXT_002}</p>

      <p className="leading-relaxed">{PRODUCT_COPY.TEXT_003}</p>

      <h2 className="mb-3 mt-10 text-lg font-semibold">{PRODUCT_COPY.TEXT_004}</h2>
      <ul className="list-disc space-y-2 pl-5 leading-relaxed">
        <li>{PRODUCT_COPY.TEXT_005}</li>
        <li>{PRODUCT_COPY.TEXT_006}</li>
        <li>{PRODUCT_COPY.TEXT_007}</li>
        <li>{PRODUCT_COPY.TEXT_008}</li>
      </ul>

      <h2 className="mb-3 mt-10 text-lg font-semibold">{PRODUCT_COPY.TEXT_009}</h2>
      <p className="leading-relaxed">{PRODUCT_COPY.TEXT_010}{" "}
        <a
          className="font-semibold text-primary underline"
          href="mailto:haenaelge.official@gmail.com?subject=%5B%EC%95%84%EB%8F%99%20%EB%B3%B4%ED%98%B8%20%EC%8B%A0%EA%B3%A0%5D"
        >
          haenaelge.official@gmail.com
        </a>{PRODUCT_COPY.TEXT_011}</p>

      <h2 className="mb-3 mt-10 text-lg font-semibold">{PRODUCT_COPY.TEXT_012}</h2>
      <ul className="list-disc space-y-2 pl-5 leading-relaxed">
        <li>{PRODUCT_COPY.TEXT_013}</li>
        <li>{PRODUCT_COPY.TEXT_014}</li>
        <li>{PRODUCT_COPY.TEXT_015}</li>
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{PRODUCT_COPY.TEXT_016}</p>
    </main>
  );
}
