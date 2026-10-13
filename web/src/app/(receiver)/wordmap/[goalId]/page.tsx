// (receiver)/wordmap/[goalId]/page.tsx — 워드맵 풀뷰 + 공유 아이콘
// 슬라이스 #9 실구현. 인증 필수(goal 소유자만 진입).
// DESIGN.md §6 금액 3층 b: 클로버 개수만, ₩ 없음.
// wireframe 진실원: docs/design/WIREFRAMES/wordmap-share.html (단계 2).

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Wordmap, type WordmapWord } from "@/components/goal/Wordmap";
import { WordmapShareIcons } from "@/components/goal/WordmapShareIcons";
import { WordmapViewTracker } from "@/components/goal/WordmapViewTracker";

type Props = { params: Promise<{ goalId: string }> };

export default async function WordmapFullViewPage({ params }: Props) {
  const { goalId: goalIdStr } = await params;
  const goalIdNum = Number(goalIdStr);

  if (!goalIdNum || !Number.isInteger(goalIdNum) || goalIdNum <= 0) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();

  // 인증 확인 (소유자만)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // G3: 본인 소유 goal 확인 (RLS: goal SELECT auth.uid()=member_id)
  const { data: goal, error: goalErr } = await supabase
    .from("goal")
    .select("id, slug, title, status, member_id")
    .eq("id", goalIdNum)
    .eq("member_id", user.id)
    .single();

  if (goalErr || !goal || !goal.slug) {
    notFound();
  }

  // G5: 워드맵 집계 RPC
  const { data: wordmapRaw } = await supabase.rpc("get_wordmap", {
    p_goal_id: goalIdNum,
  });

  const words: WordmapWord[] = (wordmapRaw ?? []).map(
    (w: { word: string; word_count: number }) => ({
      word: w.word,
      word_count: Number(w.word_count),
    }),
  );

  // 응원자 수 (CONFIRMED + not deleted)
  const { count: cheerCount } = await supabase
    .from("cheer")
    .select("*", { count: "exact", head: true })
    .eq("goal_id", goalIdNum)
    .eq("status", "CONFIRMED")
    .is("deleted_at", null);

  const cleanTitle = (goal.title ?? "").replace(/\s*해낼게\s*$/, "").trim();
  const displayTitle = cleanTitle ? `${cleanTitle} 해낼게` : "해낼게";

  return (
    <main
      className="flex flex-col min-h-svh [background-color:var(--background)]!"
      data-testid="wordmap-fullview-page"
    >
      <WordmapViewTracker goalId={goalIdNum} />
      {/* 헤더 */}
      <div className="flex items-center justify-between px-[22px] pt-10 pb-3">
        <Link
          href="/me"
          aria-label="뒤로"
          data-testid="back-button"
          className="flex items-center justify-center w-10 h-10 -ml-2 [color:var(--muted-foreground)]! [font-size:22px]!"
        >
          ‹
        </Link>
        <p className="font-extrabold [font-size:12.5px]! [letter-spacing:-0.2px]! [color:var(--foreground)]!">
          해낼게<span className="[color:var(--clover-bright)]!">.</span>
        </p>
        {/* 균형 spacer */}
        <div className="[width:40px]!" />
      </div>

      {/* 워드맵 풀뷰 카드 */}
      <div className="flex-1 flex flex-col px-[22px] pb-4">
        <div
          className="flex-1 flex flex-col rounded-[20px] px-5 pt-5 pb-4 [background-image:linear-gradient(165deg,_var(--muted)_0%,_var(--accent)_100%)]! [min-height:320px]!"
          data-testid="wordmap-fullview-card"
        >
          {/* 목표 제목 */}
          <p className="font-extrabold text-center [font-size:15px]! [letter-spacing:-0.2px]! [color:var(--foreground)]!">
            {displayTitle}
          </p>

          {/* 응원자 수 */}
          <p className="text-center mt-1 mb-3 [font-size:11px]! [color:var(--muted-foreground)]!">
            {cheerCount != null && cheerCount > 0
              ? `${cheerCount}명이 조용히 응원했어요`
              : "응원이 아직 없어요 — 첫 번째를 기다리고 있어요"}
          </p>

          {/* 워드맵 (flex-1 채움) */}
          <div className="flex-1 flex items-center justify-center py-2">
            <div className="w-full" data-testid="wordmap-fullview-cloud">
              <Wordmap words={words} ownerName={cleanTitle || undefined} />
            </div>
          </div>

          {/* 워터마크 */}
          <p className="text-right font-extrabold mt-2 [font-size:10px]! [color:var(--accent-foreground)]! [opacity:0.8]!">
            해낼게.
          </p>
        </div>
      </div>

      {/* 공유 아이콘 바 */}
      <div className="px-[22px] pb-[max(28px,env(safe-area-inset-bottom,28px))] pb-[max(28px,_env(safe-area-inset-bottom,_28px))]!">
        <WordmapShareIcons
          goalId={goalIdNum}
          goalSlug={goal.slug}
          goalTitle={goal.title ?? "해낼게"}
        />
      </div>
    </main>
  );
}
