// g/[slug]/page.tsx — ② 친구 목표페이지 (공유 링크 타깃, 비로그인 SSR)
// URL: /g/{slug} · goal_public 뷰 (금액 필드 부재) · RLS anon SELECT 허용.
// DESIGN.md: GoalCard + CheerCount + Wordmap + 결제 CTA(자리만·비활성, 슬라이스 #5 연결).
// 슬라이스 #4 실구현.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GoalCard } from "@/components/goal/GoalCard";
import { CheerCount } from "@/components/goal/CheerCount";
import { Wordmap, type WordmapWord } from "@/components/goal/Wordmap";

type Props = { params: Promise<{ slug: string }> };

// ─── OG 메타데이터 (goal_public 읽기) ────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: goal } = await supabase
    .from("goal_public")
    .select("title, reason")
    .eq("slug", slug)
    .single();

  if (!goal) {
    return { title: "목표를 찾을 수 없어요 — 해낼게" };
  }

  const titleText = goal.title ?? slug;
  return {
    title: `${titleText} — 해낼게`,
    description: goal.reason ?? "친구의 목표를 조용히 응원하세요.",
    openGraph: {
      title: titleText,
      description: goal.reason ?? "친구의 목표를 조용히 응원하세요.",
    },
  };
}

// ─── 페이지 ───────────────────────────────────────────────────────────────────

export default async function GoalPublicPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  // G2: goal_public 뷰 (금액 필드 없음)
  const { data: goal, error } = await supabase
    .from("goal_public")
    .select("id, slug, title, reason, due_date, status, cheer_count")
    .eq("slug", slug)
    .single();

  if (error || !goal || !goal.due_date) {
    notFound();
  }

  // 삭제/비공개 목표
  if (goal.status === "DELETED") {
    return (
      <main
        className="min-h-svh px-[22px] py-12 flex flex-col items-center justify-center text-center"
        style={{ background: "#FBFAF7" }}
        data-testid="goal-deleted-page"
      >
        <p className="text-[20px] font-bold mb-2" style={{ color: "#16140F" }}>
          종료된 목표예요
        </p>
        <p className="text-[14px] mb-6" style={{ color: "#6F6A60" }}>
          이 목표는 더 이상 활성화되어 있지 않아요.
        </p>
        <Link
          href="/"
          className="inline-block py-3 px-6 rounded-[14px] text-[14px] font-semibold"
          style={{ background: "#1B8A4F", color: "#fff" }}
        >
          나도 목표 만들기
        </Link>
      </main>
    );
  }

  // G5: 워드맵 집계 RPC
  const { data: wordmapRaw } = await supabase.rpc("get_wordmap", {
    p_goal_id: goal.id!,
  });

  const words: WordmapWord[] = (wordmapRaw ?? []).map((w: { word: string; word_count: number }) => ({
    word: w.word,
    word_count: Number(w.word_count),
  }));

  const cheerCount = goal.cheer_count ?? 0;

  // 목표 제목에서 "해낼게" suffix 제거 (GoalCard가 다시 붙임)
  const rawTitle = (goal.title ?? "").replace(/\s*해낼게\s*$/, "").trim();

  return (
    <main
      className="min-h-svh pb-32"
      style={{ background: "#FBFAF7" }}
      data-testid="goal-public-page"
    >
      {/* 스크롤 영역 */}
      <div className="px-[22px] pt-12 pb-4">
        {/* BrandMark */}
        <p
          className="font-extrabold mb-5"
          style={{ fontSize: 12.5, letterSpacing: "-0.2px", color: "#16140F" }}
        >
          해낼게<span style={{ color: "#1F9E5A" }}>.</span>
        </p>

        {/* GoalCard */}
        <GoalCard
          title={rawTitle}
          reason={goal.reason ?? null}
          dueDate={goal.due_date}
          status={(goal.status as "ACTIVE" | "CLOSED" | "DELETED") ?? "ACTIVE"}
        />

        {/* CheerCount */}
        <div className="mt-2 mb-3">
          <CheerCount count={cheerCount} />
        </div>

        {/* Wordmap */}
        <div className="mb-4">
          <Wordmap words={words} />
        </div>

        {/* 최근 응원자 리스트 (있으면) — 슬라이스 #4 범위: 더미 없음, 실 데이터만 */}
        {/* 슬라이스 #5(결제) 완료 후 cheer SELECT RLS 조회 연결 */}
      </div>

      {/* ─── 하단 고정 CTA (토스식) ─────────────────────────────────────────── */}
      <div
        className="fixed left-0 right-0 bottom-0 px-[22px]"
        style={{
          paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
          paddingTop: 14,
          background:
            "linear-gradient(180deg, rgba(251,250,247,0) 0%, #FBFAF7 34%)",
        }}
      >
        {/* 결제 CTA: 슬라이스 #5 전까지 비활성 (자리 확보) */}
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-center gap-2 rounded-[16px] font-extrabold"
          style={{
            padding: "17px",
            fontSize: 16,
            background: "#A8D0BC", // clover 비활성 (투명도 처리 대신 옅은 그린)
            color: "#fff",
            letterSpacing: "-0.2px",
            cursor: "not-allowed",
            opacity: 0.7,
          }}
          data-testid="cheer-cta-disabled"
          aria-label="결제 기능 준비 중"
          title="결제 기능은 곧 오픈해요"
        >
          {/* 클로버 아이콘 */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
            <path d="M12 12c-1.2-3.6-6-4.8-7.2-1.2s2.4 6 7.2 1.2zm0 0c1.2-3.6 6-4.8 7.2-1.2s-2.4 6-7.2 1.2zm0 0c-3.6 1.2-4.8 6-1.2 7.2s6-2.4 1.2-7.2zm0 0c3.6 1.2 4.8 6 1.2 7.2s-6-2.4-1.2-7.2z" />
          </svg>
          조용히 밀어줄게{" "}
          <span
            className="ml-1 text-[11px] font-semibold rounded-full px-2 py-0.5"
            style={{ background: "rgba(255,255,255,0.3)", letterSpacing: "0.1px" }}
          >
            곧
          </span>
        </button>

        {/* role-transition: "나도 해낼게 만들래" */}
        <Link
          href="/"
          className="block w-full text-center font-semibold mt-1"
          style={{
            fontSize: 12,
            color: "#9C968B",
            padding: "9px 0 0",
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          data-testid="role-transition-link"
        >
          나도 해낼게 만들래 →
        </Link>
      </div>
    </main>
  );
}
