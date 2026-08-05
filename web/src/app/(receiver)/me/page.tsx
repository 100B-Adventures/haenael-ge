// (receiver)/me/page.tsx — 받는사람 내 페이지
// 슬라이스 #9 실구현. 인증 필수.
// DESIGN.md §6 금액 3층 b: 클로버 개수(🍀 N개)만, ₩ 환산 X.
// wireframe: docs/WIREFRAMES/receiver-home.html + wordmap-share.html (1. 내 목표 홈).
// 단일 CTA: "워드맵 보기" → /wordmap/{goalId}.
// 슬라이스 #10: NotificationBadge 통합.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DdayChip, StatusChip } from "@/components/goal/DdayChip";
import { CheerCount } from "@/components/goal/CheerCount";
import { NotificationBadge } from "@/components/common/NotificationBadge";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PhoneConsentNotice } from "@/components/auth/PhoneConsentNotice";
import { HomeSeenTracker } from "@/components/goal/HomeSeenTracker";
import { MyLinkCard } from "@/components/goal/MyLinkCard";
import { GoalEditSheet } from "@/components/goal/GoalEditSheet";
import { krwFromClover } from "@/lib/clover";
import { type CashoutRecord, formatCashoutKrw } from "@/lib/cashout";

// ─── 응원자 행 ─────────────────────────────────────────────────────────────────
// DESIGN.md §6-(b′)(2026-07-19 회장 결정 B): 본인 한정 개별 클로버 개수 노출.
// Discreet 유지 장치: 시간순 고정(정렬/랭킹 X) · ₩ 환산 병기 X · 익명도 개수는 표시.

function formatCheerRelativeTime(createdAt: string, now = Date.now()) {
  const createdTime = new Date(createdAt).getTime();
  if (!Number.isFinite(createdTime)) return "날짜 미상";

  const elapsedMs = Math.max(0, now - createdTime);
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(createdTime));
}

function CheerItem({
  displayName,
  isAnonymous,
  message,
  cloverAmount,
  createdAt,
}: {
  displayName: string | null;
  isAnonymous: boolean;
  message: string | null;
  cloverAmount: number;
  createdAt: string;
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
        <time
          dateTime={createdAt}
          className="mt-0.5 block"
          style={{ fontSize: 10.5, color: "#9C968B" }}
          data-testid="cheer-item-relative-time"
        >
          {formatCheerRelativeTime(createdAt)}
        </time>
        {message && (
          <p
            className="mt-0.5 truncate"
            style={{ fontSize: 11, color: "#6F6A60" }}
          >
            {message}
          </p>
        )}
      </div>

      {/* 개별 클로버 개수 (본인만 볼 수 있는 이 화면 한정, ₩ 환산 없음) */}
      <div
        className="flex min-w-[58px] flex-shrink-0 flex-col items-end gap-0.5 text-right"
        role="group"
        aria-label={`클로버 ${cloverAmount}개, 나만 보임`}
      >
        <span
          className="font-bold"
          style={{ fontSize: 11.5, color: "#14613A" }}
          data-testid="cheer-item-amount"
          aria-hidden="true"
        >
          🍀 {cloverAmount}
        </span>
        <span
          className="font-medium"
          style={{ fontSize: 10.5, color: "#6F6A60" }}
          data-testid="cheer-item-privacy-label"
          aria-hidden="true"
        >
          나만 보임
        </span>
      </div>
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
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const goal = goals?.[0];

  // 목표 없으면 온보딩으로
  if (!goal) {
    redirect("/onboarding");
  }

  const { data: member } = await supabase
    .from("member")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  // K1: 클로버 잔액 (개수 — 주표기) + 웰컴 클로버 성장훅(2026-07-18): 원화 등가는 보조표기만.
  const { data: balance } = await supabase
    .from("clover_balance")
    .select("clover_count")
    .eq("member_id", user.id)
    .single();

  const cloverCount = balance?.clover_count ?? 0;

  // 환전 도달판정(웰컴 포함) — 환전 버튼 활성 여부 판단에만 사용, 지급액 계산은 cashout 화면 전담.
  const { data: eligibilityRaw } = await supabase.rpc("clover_eligibility", {
    p_member_id: user.id,
  });
  const eligibility = Array.isArray(eligibilityRaw) ? eligibilityRaw[0] : eligibilityRaw;
  const reachedThreshold = eligibility?.reached_threshold ?? false;
  const krwEquivalent = krwFromClover(cloverCount); // 1클로버=1,000원 등가(고정 환산 표기, 실제 환전액 보증 아님)

  // 수동환전 계약 §0-1-7: 홈은 진행 중 1건 또는 최근 종결 1건을 상태 RPC로 읽는다.
  // account_no_enc는 RPC 반환형에 없어 브라우저/RSC 경계로 넘어오지 않는다.
  const { data: cashoutStatusRaw } = await supabase.rpc("my_cashout_status" as never);
  const cashoutStatus = ((((cashoutStatusRaw ?? []) as unknown) as CashoutRecord[])[0]) ?? null;
  const pendingCashout = cashoutStatus?.status === "REQUESTED" ? cashoutStatus : null;

  // cheer_select_goal_owner: 응원 목록 (CONFIRMED + not deleted, 최근 8개)
  // DESIGN.md §6-(b′): 본인 한정 clover_amount 노출. goal.id는 위에서 member_id=user.id로
  // 스코프된 본인 목표이고, RLS cheer_select_goal_owner도 goal.member_id=auth.uid()만 허용 —
  // 이중 스코프로 남의 목표 cheer 금액이 섞일 수 없다.
  const { data: cheers } = await supabase
    .from("cheer")
    .select("id, display_name, is_anonymous, message, clover_amount, created_at")
    .eq("goal_id", goal.id)
    .eq("status", "CONFIRMED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false }) // 🔒 시간순 고정 — 금액순 정렬/랭킹 금지
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
      <HomeSeenTracker />
      <div className="px-[22px] pt-10">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <p
            className="font-extrabold"
            style={{ fontSize: 12.5, letterSpacing: "-0.2px", color: "#16140F" }}
          >
            해낼게<span style={{ color: "#1F9E5A" }}>.</span>
          </p>
          <div className="flex items-center gap-3">
            <NotificationBadge />
            <LogoutButton />
          </div>
        </div>

        {member && (
          <PhoneConsentNotice
            hasPhone={Boolean(member.phone)}
            redirectPath="/me"
            context="me"
          />
        )}

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

        <GoalEditSheet
          goalId={goal.id}
          initialTitle={cleanTitle}
          initialReason={goal.reason}
          initialDueDate={goal.due_date}
          editable={goal.status === "ACTIVE"}
        />

        {/* 내 응원 링크 재접근 (user-flow.md §1.3 갭3, 2026-07-20) */}
        <MyLinkCard slug={goal.slug} />

        {/* 친구에게 보이는 화면 미리보기 (본인 방문 시 OwnerBar 표시) */}
        <Link
          href={`/g/${goal.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-[12px] px-4 py-3 mb-4 text-center font-semibold"
          style={{ background: "#F4EFE6", color: "#14613A", fontSize: 13 }}
          data-testid="friend-view-preview-link"
        >
          👀 친구에게 이렇게 보여요 (미리보기)
        </Link>

        {/* 클로버 잔액 — 🍀 개수만 (DESIGN.md §6 금액 3층 b) */}
        <div
          className="rounded-[14px] mb-3 overflow-hidden"
          style={{ background: "#fff", border: "1px solid #E8E4DC" }}
          data-testid="clover-balance-card"
        >
          <div className="flex items-center justify-between p-4">
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
            {/* 원화 등가 보조표기(2026-07-18 회장·컨트롤러 확정, DESIGN.md §6 개정) —
                크기·색으로 개수가 여전히 주(主), 이 값은 고정환산 참고치이지 실제 환전액 보증 아님. */}
            <p
              className="mt-0.5"
              style={{ fontSize: 10.5, color: "#9C968B" }}
              data-testid="clover-krw-equivalent"
            >
              ≈{krwEquivalent.toLocaleString("ko-KR")}원 상당
            </p>
          </div>
          {/* 환전 페이지 진입은 미달이어도 항상 허용. 실제 신청은 Server Action의 서버측 CASHOUT_ENABLED와 DB 계약으로 게이트한다. */}
          <Link
            href={pendingCashout ? "/cashout/status" : "/cashout"}
            className="rounded-[10px] px-3 py-2 font-bold text-white text-center"
            style={{
              background: pendingCashout ? "#FBF1DD" : "#1B8A4F",
              color: pendingCashout ? "#B4791F" : "#fff",
              fontSize: 12,
              opacity: pendingCashout || reachedThreshold ? 1 : 0.6,
            }}
            data-testid={pendingCashout ? "cashout-button-pending" : reachedThreshold ? "cashout-button-enabled" : "cashout-button-belowthreshold"}
          >
            {pendingCashout ? "진행중" : "환전"}
          </Link>
          </div>
          {pendingCashout && (
            <div className="flex items-center justify-between border-t border-dashed border-[#E8E4DC] bg-[#FCFBF8] px-4 py-3" data-testid="cashout-hold-line">
              <div>
                <p className="text-[11.5px] text-[#6F6A60]">🔒 환전 진행중 <span className="text-[#9C968B]">(지급되면 사라져요)</span></p>
                <p className="mt-0.5 text-[10.5px] text-[#9C968B]">{formatCashoutKrw(pendingCashout.net_krw)} 입금 예정</p>
              </div>
              <strong className="text-[12.5px] text-[#B4791F]">🍀 {pendingCashout.clover_amount}개</strong>
            </div>
          )}
        </div>

        {cashoutStatus && (
          <Link href="/cashout/history" className="mb-3 flex items-center justify-between rounded-[14px] border border-[#E8E4DC] bg-white px-4 py-3 text-[13px] font-bold text-[#16140F]" data-testid="cashout-history-link">
            <span>환전 내역</span><span className="text-[11.5px] font-medium text-[#9C968B]">최근 #{cashoutStatus.id} ›</span>
          </Link>
        )}

        {/* 응원자 수 */}
        <div className="mb-3">
          <CheerCount count={cheerCount} />
        </div>

        {/* 워드맵 미니 프리뷰 */}
        {previewWords.length > 0 && (
          <div
            className="rounded-[14px] px-4 py-4 mb-4 leading-relaxed"
            style={{ background: "#E7F4EC" }}
            data-testid="wordmap-mini-preview"
          >
            <p className="mb-2 text-[11px] font-bold" style={{ color: "#6F6A60" }}>
              워드맵 미리보기
            </p>
            <div className="text-center">
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
          </div>
        )}

        {/* 응원자 목록 (이름/익명 + 본인 한정 클로버 개수, ₩ 환산 X) */}
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
                cloverAmount={c.clover_amount}
                createdAt={c.created_at}
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
