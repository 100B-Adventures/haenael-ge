import Link from "next/link";
import { notFound } from "next/navigation";
import { GoalSupporterList } from "@/components/goal/GoalSupporterList";
import { ChevronLeft } from "lucide-react";
import {
  ReceiverBrandMark,
  ReceiverPageShell,
} from "@/components/receiver/ReceiverShell";
import { GoalEditSheet } from "@/components/goal/GoalEditSheet";
import { GoalManagementActions } from "@/components/goal/GoalManagementActions";
import { GoalCoverPicker } from "@/components/social/GoalCoverPicker";
import { Wordmap, type WordmapWord } from "@/components/goal/Wordmap";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { GoalCheerSummary } from "@/lib/social/contracts";

export const dynamic = "force-dynamic";

export default async function GoalManagementPage(
  { params, searchParams }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ q?: string }>;
  },
) {
  const goalId = Number((await params).id);
  const rawQuery = (await searchParams).q;
  const searchQuery = typeof rawQuery === "string" ? rawQuery.trim().slice(0, 50) : "";
  if (!Number.isSafeInteger(goalId) || goalId <= 0) notFound();
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <ReceiverPageShell testId="goal-access-required" bottomSafe>
        <ReceiverBrandMark />
        <section className="social-empty mt-5">
          <h1>권한이 필요한 화면이에요.</h1>
          <p className="social-description">
            내 목표 관리 화면은 로그인한 목표 소유자만 볼 수 있어요.
          </p>
          <Link className="social-primary-action" href="/">
            로그인하러 가기
          </Link>
        </section>
      </ReceiverPageShell>
    );
  }
  const { data: goal, error } = await supabase.from("goal").select(
    "id,slug,title,reason,due_date,status,visibility,cover_preset_key,active_cover_asset_id",
  ).eq("id", goalId).eq("member_id", user.id).is("deleted_at", null)
    .maybeSingle();
  if (error || !goal) notFound();
  const [{ data: cheerSummaryRaw }, { data: eligibilityRaw }, { data: wordmapRaw }] = await Promise.all([
    supabase.rpc("my_goal_cheer_summary", {
      p_goal_id: goal.id,
      p_search: searchQuery || undefined,
      p_limit: 20,
    }),
    supabase.rpc("clover_eligibility", { p_member_id: user.id }),
    supabase.rpc("get_wordmap", { p_goal_id: goal.id }),
  ]);
  const eligibility = Array.isArray(eligibilityRaw)
    ? eligibilityRaw[0]
    : eligibilityRaw;
  const cheerSummary = cheerSummaryRaw as unknown as GoalCheerSummary | null;
  const supporterCount = cheerSummary?.total_count ?? 0;
  const supporters = cheerSummary?.items ?? [];
  const renderedAt = new Date().toISOString();
  let imageUrl: string | null = null;
  if (goal.active_cover_asset_id) {
    const service = createServiceRoleClient();
    const { data: asset } = await service.from("goal_cover_asset").select(
      "quarantine_path,public_path,status",
    ).eq("id", goal.active_cover_asset_id).eq("owner_member_id", user.id).eq(
      "status",
      "APPROVED",
    ).maybeSingle();
    if (asset?.public_path) {
      imageUrl = service.storage.from("goal-cover-public").getPublicUrl(
        asset.public_path,
      ).data.publicUrl;
    } else if (asset?.quarantine_path) {
      imageUrl =
        (await service.storage.from("goal-cover-quarantine").createSignedUrl(
          asset.quarantine_path,
          120,
        )).data?.signedUrl ?? null;
    }
  }
  const cleanTitle = goal.title.replace(/\s*해낼게\s*$/, "").trim();
  const words: WordmapWord[] = (wordmapRaw ?? []).map(
    (item: { word: string; word_count: number }) => ({
      word: item.word,
      word_count: Number(item.word_count),
    }),
  );
  return (
    <ReceiverPageShell testId="goal-management-page" bottomSafe>
      <header className="social-detail-head">
        <Link href="/me" aria-label="홈으로 돌아가기"><ChevronLeft aria-hidden="true" /></Link>
        <strong>목표 관리</strong>
        <span aria-hidden="true" />
      </header>
      <div className="social-stack">
        <GoalCoverPicker
          goalId={goal.id}
          title={cleanTitle}
          initialPreset={goal.cover_preset_key}
          imageUrl={imageUrl}
        />
        <GoalEditSheet
          goalId={goal.id}
          initialTitle={cleanTitle}
          initialReason={goal.reason}
          initialDueDate={goal.due_date}
          status={goal.status as "ACTIVE" | "CLOSED" | "DELETED"}
          editable={goal.status === "ACTIVE"}
        />
        <section className="goal-management-wordmap" data-testid="goal-management-wordmap">
          <h2 className="goal-section-label">응원 워드맵</h2>
          <p className="goal-wordmap-count"><span>지금까지</span><span><strong>{supporterCount}</strong>명이 이 단어들로 응원했어요</span></p>
          <Wordmap words={words} ownerName={cleanTitle} goalTitle={cleanTitle} />
          <p className="goal-wordmap-legend">같은 단어가 쌓일수록 <strong>크게</strong> 자라요.</p>
        </section>
        <section className="goal-supporter-section">
          <h2 className="goal-supporter-heading">이 목표를 응원한 사람</h2>
          <GoalSupporterList
            goalId={goal.id}
            slug={goal.slug}
            supporters={supporters}
            totalCount={supporterCount}
            renderedAt={renderedAt}
            searchQuery={searchQuery}
          />
        </section>
        <section
          className="goal-clover-summary"
          data-testid="goal-clover-summary"
          aria-labelledby="goal-clover-summary-title"
        >
          <h2 id="goal-clover-summary-title">모은 클로버 · 환전</h2>
          <div>
            <span><small>모은 클로버</small><strong>🍀 {eligibility?.total_balance ?? 0}</strong></span>
            <span><small>잠금(진행 중)</small><strong>🍀 {eligibility?.locked_amount ?? 0}</strong></span>
            <span className="is-available"><small>환전 가능</small><strong>🍀 {eligibility?.available_amount ?? 0}</strong></span>
          </div>
          <Link href="/cashout" className="goal-cashout-link">
            <span>🍀 모은 클로버로 환전하기</span>
            <strong>{eligibility?.available_amount ?? 0}개 지급 가능 ›</strong>
          </Link>
        </section>
        <GoalManagementActions goalId={goal.id} slug={goal.slug} active={goal.status === "ACTIVE"} />
      </div>
    </ReceiverPageShell>
  );
}
