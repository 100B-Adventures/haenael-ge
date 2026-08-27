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
      className="min-h-svh flex flex-col items-center justify-center px-[22px] text-center [background-color:var(--background)]!"
      data-testid="wordmap-not-found"
    >
      <p className="font-extrabold mb-6 [font-size:12.5px]! [color:var(--clover-bright)]!">
        해낼게.
      </p>

      <p className="font-black mb-2 [font-size:24px]! [letter-spacing:-0.5px]! [color:var(--foreground)]!">
        워드맵을 찾을 수 없어요
      </p>
      <p className="text-[14px] leading-relaxed mb-8 [color:var(--muted-foreground)]!">
        목표가 삭제됐거나 접근 권한이 없을 수 있어요.
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
