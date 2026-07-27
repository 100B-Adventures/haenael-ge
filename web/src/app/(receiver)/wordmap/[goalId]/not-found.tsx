// (receiver)/wordmap/[goalId]/not-found.tsx — 존재하지 않는/권한 없는 워드맵
// g/[slug]/not-found.tsx 패턴 복제(DESIGN.md §6: dead-end 0 — 친절한 안내 + 홈 링크).
// page.tsx의 notFound() 호출(goalId 유효성/조회 실패/미소유 시)에 대한 브랜딩 폴백.

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "목표를 찾을 수 없어요 — 해낼게",
};

export default function WordmapNotFound() {
  return (
    <main
      className="min-h-svh flex flex-col items-center justify-center px-[22px] text-center"
      style={{ background: "#FBFAF7" }}
      data-testid="wordmap-not-found"
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
        워드맵을 찾을 수 없어요
      </p>
      <p className="text-[14px] leading-relaxed mb-8" style={{ color: "#6F6A60" }}>
        목표가 삭제됐거나 접근 권한이 없을 수 있어요.
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
