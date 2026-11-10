// (receiver)/wordmap/[goalId]/page.tsx — 워드맵 풀뷰 + 공유 아이콘
// 슬라이스 #9 실구현. 인증 필수(goal 소유자만 진입).
// DESIGN.md §6 금액 3층 b: 클로버 개수만, ₩ 없음.
// wireframe 진실원: docs/design/WIREFRAMES/wordmap-share.html (단계 2).

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Wordmap, type WordmapWord } from "@/components/goal/Wordmap";
import { WordmapShareIcons } from "@/components/goal/WordmapShareIcons";
import { WordmapViewTracker } from "@/components/goal/WordmapViewTracker";
import { DdayChip, StatusChip } from "@/components/goal/DdayChip";
import { ReceiverPageShell } from "@/components/receiver/ReceiverShell";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-receiver-wordmap-goalid-page";

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
    .select("id, slug, title, status, due_date, member_id")
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
    <ReceiverPageShell testId="wordmap-fullview-page" bottomSafe className="flex min-h-svh flex-col">
      <WordmapViewTracker goalId={goalIdNum} />
      <header className="social-detail-head">
        <Link href={`/me/goal/${goalIdNum}`} aria-label="목표 관리로 돌아가기" data-testid="back-button"><ChevronLeft aria-hidden="true" /></Link>
        <strong>응원 워드맵</strong>
        <span aria-hidden="true" />
      </header>

      {/* 워드맵 풀뷰 카드 */}
      <div className="flex flex-1 flex-col pb-4">
        <section className="rounded-[20px] border border-border bg-card px-5 py-4" data-testid="wordmap-goal-summary">
          <div className="flex flex-wrap gap-2">
            {goal.status === "ACTIVE" && goal.due_date && <DdayChip dueDate={goal.due_date} />}
            <StatusChip status={goal.status} />
          </div>
          <h1 className="mt-3 text-xl font-black text-foreground">{displayTitle}</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">친구들이 보내준 응원이 단어로 쌓였어요.</p>
        </section>
        <p className="my-4 text-sm text-muted-foreground" data-testid="wordmap-supporter-count">
          지금까지 <strong className="text-foreground">{cheerCount ?? 0}명</strong>이 이 단어들로 응원했어요.
        </p>
        <div
          className="flex-1 flex flex-col rounded-[20px] px-5 pt-5 pb-4 [background-image:linear-gradient(165deg,_var(--muted)_0%,_var(--accent)_100%)]! [min-height:320px]!"
          data-testid="wordmap-fullview-card"
        >
          {/* 워드맵 (flex-1 채움) */}
          <div className="flex-1 flex items-center justify-center py-2">
            <div className="w-full" data-testid="wordmap-fullview-cloud">
              <Wordmap words={words} ownerName={cleanTitle || undefined} />
            </div>
          </div>

          {/* 워터마크 */}
          <p className="text-right font-extrabold mt-2 [font-size:var(--text-meta-micro)]! [color:var(--accent-foreground)]! [opacity:0.8]!">{PRODUCT_COPY.TEXT_003}</p>
        </div>
      </div>

      {/* 공유 아이콘 바 */}
      <div className="pb-[max(28px,env(safe-area-inset-bottom,28px))] pb-[max(28px,_env(safe-area-inset-bottom,_28px))]!">
        <h2 className="mb-2 text-[length:var(--text-meta-micro)]! font-bold text-muted-foreground">워드맵 내보내기</h2>
        <WordmapShareIcons
          goalId={goalIdNum}
          goalSlug={goal.slug}
          goalTitle={goal.title ?? PRODUCT_COPY.TEXT_004}
        />
      </div>
    </ReceiverPageShell>
  );
}
