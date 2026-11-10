// g/[slug]/not-found.tsx — 잘못된 링크/존재하지 않는 slug
// DESIGN.md §6: dead-end 0 — 친절한 안내 + 홈 링크.
// user-flow §2.2: "잘못된 링크 404 → 친절한 404 + 홈 링크"

import Link from "next/link";
import type { Metadata } from "next";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-g-slug-not-found";

export const metadata: Metadata = {
  title: "목표를 찾을 수 없어요 — 해낼게",
};

export default function GoalNotFound() {
  return (
    <main
      className="min-h-svh flex flex-col items-center justify-center px-[22px] text-center [background-color:var(--background)]!"
      data-testid="goal-not-found"
    >
      <p className="font-extrabold mb-6 [font-size:var(--text-wordmark)]! [color:var(--clover-bright)]!">{PRODUCT_COPY.TEXT_001}</p>

      <p className="font-black mb-2 [font-size:24px]! [letter-spacing:-0.5px]! [color:var(--foreground)]!">{PRODUCT_COPY.TEXT_002}</p>
      <p className="text-[14px] leading-relaxed mb-8 [color:var(--muted-foreground)]!">{PRODUCT_COPY.TEXT_003}<br />{PRODUCT_COPY.TEXT_004}</p>

      <Link
        href="/"
        className="inline-block py-4 px-8 rounded-[15px] font-extrabold text-[15px] [background-color:var(--primary)]! [color:var(--card)]! [box-shadow:0_6px_16px_rgba(27,138,79,.22)]! [letter-spacing:-0.2px]!"
        data-testid="not-found-home-link"
      >{PRODUCT_COPY.TEXT_005}</Link>
    </main>
  );
}
