// g/[slug]/page.tsx — ② 친구 목표페이지 (공유 링크 타깃, 비로그인 SSR)
// URL: /g/{slug} · goal_public 뷰 (금액 필드 부재) · RLS anon SELECT 허용.
// DESIGN.md: GoalCard + CheerCount + Wordmap + Toss test payment CTA.
// 슬라이스 #4 실구현. B2 테스트 결제 CTA + 슬라이스 #10 ReportButton 추가.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GoalCard } from "@/components/goal/GoalCard";
import { CheerCount } from "@/components/goal/CheerCount";
import { Wordmap, type WordmapWord } from "@/components/goal/Wordmap";
import { ReportButton } from "@/components/common/ReportButton";
import { CheerPaymentButton } from "@/components/goal/CheerPaymentButton";
import { OwnerBar } from "@/components/goal/OwnerBar";
import { GoalCover } from "@/components/social/GoalCover";
import { ReceiverAppShell } from "@/components/receiver/ReceiverShell";

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
  // maybeSingle: 0행이면 error 없이 data=null → 진짜 '없음'만 404.
  // 일시적 조회 오류(네트워크/DB)는 error로 오므로 throw해서 error.tsx가 재시도하게 한다
  // (과거: .single()이 일시오류에도 error를 반환 → 전부 notFound()로 처리해 정상 목표가 간헐 404).
  const { data: goal, error } = await supabase
    .from("goal_public")
    .select("id, slug, title, reason, due_date, status, cheer_count, cover_preset_key, cover_public_path")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    // 일시적 조회 실패 — 404가 아니라 재시도 가능한 오류로 올린다.
    throw error;
  }
  if (!goal || !goal.due_date) {
    notFound();
  }

  // 삭제/비공개 목표
  if (goal.status === "DELETED") {
    return (
      <main
        className="min-h-svh px-[22px] py-12 flex flex-col items-center justify-center text-center [background-color:var(--background)]!"
        data-testid="goal-deleted-page"
      >
        <p className="text-[20px] font-bold mb-2 [color:var(--foreground)]!">
          종료된 목표예요
        </p>
        <p className="text-[14px] mb-6 [color:var(--muted-foreground)]!">
          이 목표는 더 이상 활성화되어 있지 않아요.
        </p>
        <Link
          href="/"
          className="inline-block py-3 px-6 rounded-[14px] text-[14px] font-semibold [background-color:var(--primary)]! [color:var(--card)]!"
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

  const words: WordmapWord[] = (wordmapRaw ?? []).map(
    (w: { word: string; word_count: number }) => ({
      word: w.word,
      word_count: Number(w.word_count),
    }),
  );

  const cheerCount = goal.cheer_count ?? 0;
  const coverUrl = goal.cover_public_path
    ? supabase.storage.from("goal-cover-public").getPublicUrl(goal.cover_public_path).data.publicUrl
    : null;

  // ─── owner bar 판정 (user-flow.md §1.3 (b) — 2026-07-19) ──────────────────
  // goal 테이블(RLS goal_select_own: auth.uid()=member_id)로 재조회 —
  // RLS가 "본인 것만" 자동 필터하므로 타인/비로그인은 항상 data=null → isOwner=false.
  // ★ 제3자·비로그인에게 이 블록의 존재/응원 개수/금액이 절대 노출되지 않는다(아래 CoVe 참조).
  let isOwner = false;
  let ownerCheerCreatedAts: string[] = [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: ownGoal } = await supabase
      .from("goal")
      .select("id")
      .eq("slug", slug)
      .eq("member_id", user.id) // RLS와 이중 스코프(방어적 심층방어) — 남의 goal_id로 절대 안 넘어감
      .is("deleted_at", null)
      .maybeSingle();

    if (ownGoal) {
      isOwner = true;

      // cheer_select_goal_owner RLS: goal.member_id = auth.uid()인 경우만 전체 SELECT 허용.
      // 여기서도 goal_id를 ownGoal.id(=본인 소유 확인된 id)로만 스코프해 이중 안전.
      const { data: cheersForOwner } = await supabase
        .from("cheer")
        .select("created_at")
        .eq("goal_id", ownGoal.id)
        .eq("status", "CONFIRMED")
        .is("deleted_at", null);

      ownerCheerCreatedAts = (cheersForOwner ?? []).map(
        (c) => c.created_at as string,
      );
    }
  }

  // 목표 제목에서 "해낼게" suffix 제거 (GoalCard가 다시 붙임)
  const rawTitle = (goal.title ?? "").replace(/\s*해낼게\s*$/, "").trim();

  return (
    <ReceiverAppShell locked={!user} currentPath={`/g/${slug}`}>
    <main
      className="goal-public-approved min-h-svh pb-32 [background-color:var(--background)]!"
      data-testid="goal-public-page"
    >
      {/* 스크롤 영역 */}
      <div className="goal-public-content px-[22px] pt-12 pb-4">
        {/* BrandMark */}
        <p className="font-extrabold mb-5 [font-size:var(--text-wordmark)]! [letter-spacing:-0.2px]! [color:var(--foreground)]!">
          해낼게<span className="[color:var(--clover-bright)]!">.</span>
        </p>

        {/* owner bar — 본인 세션 열람 시에만 렌더(위에서 이미 판정 완료) */}
        {isOwner && <OwnerBar cheerCreatedAts={ownerCheerCreatedAts} />}

        {/* 재로그인 진입 (user-flow.md §1.3 갭2 — 비로그인 전용, owner bar와 서로 배타적) */}
        {!user && (
          <p
            className="text-center mb-3 [font-size:var(--text-wordmark)]! [color:var(--faint)]!"
            data-testid="relogin-hint"
          >
            내 목표가 있으신가요?{" "}
            <Link
              href="/auth/kakao/start?redirect=/me"
              prefetch={false}
              className="inline-flex min-h-[var(--tap-min-size)] min-w-[var(--tap-min-size)] items-center justify-center font-semibold underline underline-offset-2 transition-opacity active:opacity-70 [color:var(--muted-foreground)]!"
              data-testid="relogin-link"
            >
              카카오로 로그인
            </Link>
          </p>
        )}

        <GoalCover
          presetKey={goal.cover_preset_key}
          imageUrl={coverUrl}
          title={goal.title ?? slug}
          size="banner"
          caption="친구의 해낼게"
        />

        {/* GoalCard */}
        <GoalCard
          title={rawTitle}
          reason={goal.reason ?? null}
          dueDate={goal.due_date}
          status={(goal.status as "ACTIVE" | "CLOSED" | "DELETED") ?? "ACTIVE"}
          variant="public"
        />

        {/* CheerCount */}
        <div className="mt-2 mb-3">
          <CheerCount count={cheerCount} variant="public" />
        </div>

        {/* Wordmap */}
        <div className="mb-4">
          <Wordmap words={words} />
        </div>

        {/* 최근 응원자 리스트는 공개 RLS/정렬 정책 확정 후 연결 */}

        {/* 신고 버튼 (F7 — 게스트/비로그인 모두 가능) */}
        <div className="mt-1 flex justify-end">
          <ReportButton targetType="GOAL" targetId={goal.id!} variant="text" />
        </div>
      </div>

      {/* ─── 하단 고정 CTA (토스식) ─────────────────────────────────────────── */}
      <div className="receiver-fixed-action receiver-public-action receiver-bottom-fade">
        <CheerPaymentButton
          goalId={goal.id!}
          goalTitle={rawTitle}
          goalSlug={slug}
        />

        {/* role-transition: "나도 해낼게 만들래" */}
        <Link
          href="/"
          className="block w-full text-center font-semibold mt-1 [font-size:var(--text-wordmark)]! [color:var(--faint)]! p-[9px_0_0]! [min-height:var(--tap-min-size)]! [display:flex]! [align-items:center]! [justify-content:center]! transition-opacity active:opacity-70"
          data-testid="role-transition-link"
        >
          나도 해낼게 만들래 →
        </Link>
      </div>
    </main>
    </ReceiverAppShell>
  );
}
