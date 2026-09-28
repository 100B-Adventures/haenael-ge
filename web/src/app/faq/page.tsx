import type { Metadata } from "next";
import Link from "next/link";
import { JsonLdScript } from "@/components/seo/JsonLdScript";
import { createFaqPageJsonLd, FAQ_ITEMS } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "자주 묻는 질문 — 해낼게",
  description:
    "해낼게의 목표 선언, 링크 공유, 클로버와 워드맵 이용 방법을 확인하세요.",
  alternates: {
    canonical: "/faq",
  },
};

export default function FaqPage() {
  return (
    <main
      className="mx-auto w-full max-w-2xl px-6 py-16"
      data-testid="faq-page"
    >
      <JsonLdScript id="faq-page-jsonld" data={createFaqPageJsonLd()} />

      <header className="mb-10">
        <p className="mb-3 text-sm font-bold text-primary">해낼게 도움말</p>
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          자주 묻는 질문
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          목표를 선언하고 친구의 응원을 받는 과정에서 궁금한 내용을 모았어요.
        </p>
      </header>

      <section className="space-y-3" aria-label="자주 묻는 질문 목록">
        {FAQ_ITEMS.map(({ question, answer }, index) => (
          <details
            key={question}
            className="group rounded-md border border-border bg-card px-5"
            data-testid="faq-item"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-bold text-foreground marker:content-none">
              <span>
                <span className="mr-2 text-primary" aria-hidden="true">
                  Q{index + 1}.
                </span>
                {question}
              </span>
              <span
                className="text-xl font-medium text-muted-foreground transition-transform group-open:rotate-45"
                aria-hidden="true"
              >
                +
              </span>
            </summary>
            <p className="border-t border-border py-4 leading-relaxed text-muted-foreground">
              {answer}
            </p>
          </details>
        ))}
      </section>

      <div className="mt-10 rounded-md bg-accent p-5">
        <p className="font-bold text-accent-foreground">
          처음이라면 사용법부터 확인해 보세요.
        </p>
        <Link
          href="/how"
          className="mt-3 inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4"
          data-testid="faq-how-link"
        >
          해낼게 사용법 보기
        </Link>
      </div>
    </main>
  );
}
