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
      className="min-h-svh flex flex-col items-center justify-center px-[22px] text-center"
      style={{ background: "#FBFAF7" }}
      data-testid="goal-not-found"
    >
      <p
        className="font-extrabold mb-6"
        style={{ fontSize: 12.5, color: "#1F9E5A" }}
      >
        해낼게.
      </p>

      <p
        className="font-black mb-2"
        style={{ fontSize: 24, letterSpacing: "-0.5px", color: "#16140F" }}
      >
        링크를 찾을 수 없어요
      </p>
      <p className="text-[14px] leading-relaxed mb-8" style={{ color: "#6F6A60" }}>
        목표가 삭제됐거나 주소가 잘못됐을 수 있어요.
        <br />
        나만의 목표를 만들어보는 건 어때요?
      </p>

      <Link
        href="/"
        className="inline-block py-4 px-8 rounded-[15px] font-extrabold text-[15px]"
        style={{
          background: "#1B8A4F",
          color: "#fff",
          boxShadow: "0 6px 16px rgba(27,138,79,.22)",
          letterSpacing: "-0.2px",
        }}
        data-testid="not-found-home-link"
      >
        내 목표 만들기
      </Link>
    </main>
  );
}
