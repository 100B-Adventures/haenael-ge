// g/[slug]/not-found.tsx — 잘못된 링크/존재하지 않는 slug
// DESIGN.md §6: dead-end 0 — 친절한 안내 + 홈 링크.
// user-flow §2.2: "잘못된 링크 404 → 친절한 404 + 홈 링크"

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "목표를 찾을 수 없어요 — 해낼게",
};

export default function GoalNotFound() {
  return (
    <main
      className="min-h-svh flex flex-col items-center justify-center px-[22px] text-center [background-color:var(--background)]!"
      data-testid="goal-not-found"
    >
      <p className="font-extrabold mb-6 [font-size:12.5px]! [color:var(--clover-bright)]!">
        해낼게.
      </p>

      <p className="font-black mb-2 [font-size:24px]! [letter-spacing:-0.5px]! [color:var(--foreground)]!">
        링크를 찾을 수 없어요
      </p>
      <p className="text-[14px] leading-relaxed mb-8 [color:var(--muted-foreground)]!">
        목표가 삭제됐거나 주소가 잘못됐을 수 있어요.
        <br />
        나만의 목표를 만들어보는 건 어때요?
      </p>

      <Link
        href="/"
        className="inline-block py-4 px-8 rounded-[15px] font-extrabold text-[15px] [background-color:var(--primary)]! [color:var(--card)]! [box-shadow:0_6px_16px_rgba(27,138,79,.22)]! [letter-spacing:-0.2px]!"
        data-testid="not-found-home-link"
      >
        내 목표 만들기
      </Link>
    </main>
  );
}
