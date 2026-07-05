// (receiver)/home/page.tsx — 받는사람 홈
// 슬라이스 #9 실구현. 인증 필수.
// DESIGN.md §6 금액 3층 b: 클로버 개수(🍀 N개)만, ₩ 환산 X.
// wireframe: docs/WIREFRAMES/receiver-home.html + wordmap-share.html (1. 내 목표 홈).
// 단일 CTA: "워드맵 보기" → /wordmap/{goalId}.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DdayChip, StatusChip } from "@/components/goal/DdayChip";
import { CheerCount } from "@/components/goal/CheerCount";

// ─── 응원자 행 ─────────────────────────────────────────────────────────────────

function CheerItem({
  displayName,
  isAnonymous,
  message,
}: {
  displayName: string | null;
  isAnonymous: boolean;
  message: string | null;
}) {
  const name = isAnonymous || !displayName ? "익명의 누군가" : displayName;
  const initial = isAnonymous || !displayName ? "?" : displayName[0];

  return (
    <div
      className="flex items-start gap-3 py-[10px] border-b"
      style={{ borderColor: "#E8E4DC" }}
      data-testid="cheer-item"
    >
      {/* 아바타 */}
      <div
        className="w-[26px] h-[26px] rounded-full flex-shrink-0 flex items-center justify-center font-semibold"
        style={{
          background: isAnonymous || !displayName ? "#ECEAE4" : "#d8e8dd",
          color: isAnonymous || !displayName ? "#9C968B" : "#14613A",
          fontSize: 11,
        }}
      >
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold" style={{ fontSize: 12.5, color: "#16140F" }}>
          {name}
        </p>
        {message && (
          <p
            className="mt-0.5 truncate"
            style={{ fontSize: 11, color: "#6F6A60" }}
          >
            {message}
          </p>
        )}
      </div>
      {/* 금액 절대 비노출 (DESIGN.md §6 금액 3층 b) */}
    </div>
  );
}

// ─── 페이지 ───────────────────────────────────────────────────────────────────

export default async function ReceiverHomePage() {
  const supabase = await createServerSupabaseClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // G3: 본인 목표 (최신 1개, 삭제 제외)
  const { data: goals } = await supabase
    .from("goal")
    .select("id, slug, title, reason, due_date, status")
    .eq("member_id", user.id)
    .neq("status", "DELETED")
    .order("created_at", { ascending: false })
    .limit(1);

  const goal = goals?.[0];

  // 목표 없으면 온보딩으로
  if (!goal) {
    redirect("/onboarding");
  }

  // K1: 클로버 잔액 (개수만)
  const { data: balance } = await supabase
    .from("clover_balance")
    .select("clover_count")
    .eq("member_id", user.id)
    .single();

  const cloverCount = balance?.clover_count ?? 0;

  // cheer_select_goal_owner: 응원 목록 (CONFIRMED + not deleted, 최근 8개)
  const { data: cheers } = await supabase
    .from("cheer")
    .select("id, display_name, is_anonymous, message, created_at")
    .eq("goal_id", goal.id)
    .eq("status", "CONFIRMED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(8);

  const cheerCount = cheers?.length ?? 0;

  // 워드맵 미니 프리뷰 단어 (최대 6개)
  const { data: wordmapRaw } = await supabase.rpc("get_wordmap", {
    p_goal_id: goal.id,
  });

  const previewWords: Array<{ word: string; word_count: number }> = (wordmapRaw ?? [])
    .slice(0, 6)
    .map((w: { word: string; word_count: number }) => ({
      word: w.word,
      word_count: Number(w.word_count),
    }));

  const maxCount =
    previewWords.length > 0
      ? Math.max(...previewWords.map((w) => w.word_count))
      : 1;

  const cleanTitle = (goal.title ?? "").replace(/\s*해낼게\s*$/, "").trim();

  return (
    <main
      className="min-h-svh pb-[80px]"
      style={{ background: "#FBFAF7" }}
      data-testid="receiver-home-page"
    >
      <div className="px-[22px] pt-10">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <p
            className="font-extrabold"
            style={{ fontSize: 12.5, letterSpacing: "-0.2px", color: "#16140F" }}
          >
            해낼게<span style={{ color: "#1F9E5A" }}>.</span>
          </p>
          <button
            type="button"
            aria-label="알림"
            data-testid="notification-bell"
            style={{ fontSize: 18 }}
          >
            🔔
          </button>
        </div>

        {/* 목표 제목 */}
        <p
          className="font-extrabold leading-[1.32] mb-2"
          style={{ fontSize: 22, letterSpacing: "-0.4px", color: "#16140F" }}
          data-testid="goal-title"
        >
          {cleanTitle}
          <br />
          해낼게
        </p>

        {/* D-day 칩 */}
        {goal.due_date && (
          <div className="flex gap-2 mb-4">
            <DdayChip dueDate={goal.due_date} />
            {goal.status !== "ACTIVE" && (
              <StatusChip status={goal.status as "ACTIVE" | "CLOSED" | "DELETED"} />
            )}
          </div>
        )}

        {/* 클로버 잔액 — 🍀 개수만 (DESIGN.md §6 금액 3층 b) */}
        <div
          className="flex items-center justify-between rounded-[14px] p-4 mb-3"
          style={{ background: "#fff", border: "1px solid #E8E4DC" }}
          data-testid="clover-balance-card"
        >
          <div>
            <p className="mb-1" style={{ fontSize: 10.5, color: "#9C968B" }}>
              모인 클로버
            </p>
            <p
              className="font-extrabold"
              style={{ fontSize: 20, color: "#14613A" }}
              data-testid="clover-count"
            >
              🍀 {cloverCount}
              <small
                className="font-semibold ml-0.5"
                style={{ fontSize: 11, color: "#6F6A60" }}
              >
                개
              </small>
            </p>
          </div>
          {/* 환전 버튼 자리 — 슬라이스 #8에서 활성화 */}
          <button
            type="button"
            disabled
            className="rounded-[10px] px-3 py-2 font-bold text-white"
            style={{
              background: "#1B8A4F",
              fontSize: 12,
              opacity: 0.45,
              cursor: "not-allowed",
            }}
            data-testid="cashout-button-disabled"
          >
            환전
          </button>
        </div>

        {/* 응원자 수 */}
        <div className="mb-3">
          <CheerCount count={cheerCount} />
        </div>

        {/* 워드맵 미니 프리뷰 */}
        {previewWords.length > 0 && (
          <div
            className="rounded-[14px] px-4 py-4 mb-4 text-center leading-relaxed"
            style={{ background: "#E7F4EC" }}
            data-testid="wordmap-mini-preview"
          >
            {previewWords.map((w) => {
              const ratio = maxCount > 0 ? w.word_count / maxCount : 0;
              const fontSize = Math.round(13 + ratio * 8);
              return (
                <span
                  key={w.word}
                  className="inline-block mx-1.5"
                  style={{ color: "#2c7a4f", fontSize }}
                >
                  {w.word}
                </span>
              );
            })}
          </div>
        )}

        {/* 응원자 목록 (이름/익명, 금액 X) */}
        {cheers && cheers.length > 0 && (
          <div className="mb-4">
            <p
              className="font-semibold mb-2"
              style={{ fontSize: 11, color: "#6F6A60" }}
            >
              응원한 사람
            </p>
            {cheers.map((c) => (
              <CheerItem
                key={c.id}
                displayName={c.display_name}
                isAnonymous={c.is_anonymous}
                message={c.message}
              />
            ))}
          </div>
        )}
      </div>

      {/* 하단 고정: 워드맵 보기 단일 CTA */}
      <div
        className="fixed left-0 right-0 bottom-0 px-[22px]"
        style={{
          paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
          paddingTop: 14,
          background:
            "linear-gradient(180deg, rgba(251,250,247,0) 0%, #FBFAF7 34%)",
        }}
      >
        <Link
          href={`/wordmap/${goal.id}`}
          className="block w-full text-center font-extrabold rounded-[16px]"
          style={{
            padding: "16px",
            fontSize: 15,
            letterSpacing: "-0.2px",
            background: "#fff",
            color: "#16140F",
            border: "1px solid #E8E4DC",
          }}
          data-testid="wordmap-view-cta"
        >
          워드맵 보기
        </Link>
      </div>
    </main>
  );
}
