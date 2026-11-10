// (receiver)/me/page.tsx — 받는사람 내 페이지
// 슬라이스 #9 실구현. 인증 필수.
// DESIGN.md §6 금액 3층 b: 클로버 개수(🍀 N개)만, ₩ 환산 X.
// wireframe: docs/design/WIREFRAMES/receiver-home.html + wordmap-share.html (1. 내 목표 홈).
// 단일 CTA: "워드맵 보기" → /wordmap/{goalId}.
// 슬라이스 #10: NotificationBadge 통합.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PhoneConsentNotice } from "@/components/auth/PhoneConsentNotice";
import { HomeSeenTracker } from "@/components/goal/HomeSeenTracker";
import { MyGoalListCard } from "@/components/goal/MyGoalListCard";
import { SplitBalanceCard } from "@/components/goal/SplitBalanceCard";
import { type CashoutRecord } from "@/lib/cashout";
import { Collapsible } from "@/components/common/Collapsible";
import { asMySocialDashboard, type MySocialGoal } from "@/lib/social/contracts";
import {
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-receiver-me-page";

// ─── 페이지 ───────────────────────────────────────────────────────────────────

type ReceiverHomePageProps = {
  searchParams?: Promise<{ q?: string | string[] }>;
};

function normalizeCheerSearch(rawQuery: string | string[] | undefined) {
  const query = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery;
  return (query ?? "")
    .normalize("NFC")
    .replace(/[%_\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export default async function ReceiverHomePage({
  searchParams,
}: ReceiverHomePageProps = {}) {
  const supabase = await createServerSupabaseClient();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const cheerSearchQuery = normalizeCheerSearch(resolvedSearchParams?.q);

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // 다중 목표(설계 §4.4~4.6): 계정당 진행 중 목표 상한은 3개이지만 지난(마감)
  // 목표는 소프트삭제되지 않고 그대로 남으므로 상한과 무관하게 여러 개일 수
  // 있다. 진행 중/지난을 한 번에 가져와 화면에서 나눈다.
  const todayIso = new Date().toISOString().slice(0, 10);
  // 이 다섯 조회는 모두 user.id만 필요하다. 직렬 await로 두면 Supabase RTT가
  // 그대로 누적되므로 인증 경계 뒤에서 한 batch로 시작한다.
  const [
    { data: allGoals },
    { data: socialDashboardRaw },
    { data: member },
    { data: eligibilityRaw, error: eligibilityError },
    { data: cashoutStatusRaw },
  ] = await Promise.all([
    supabase
      .from("goal")
      .select("id, slug, title, reason, due_date, status, created_at, cover_preset_key")
      .eq("member_id", user.id)
      .neq("status", "DELETED")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.rpc("my_social_dashboard"),
    supabase
      .from("member")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("clover_eligibility", { p_member_id: user.id }),
    supabase.rpc("my_cashout_status" as never),
  ]);

  // 목표가 하나도 없으면 온보딩으로(설계 §4.6 "목표 0개" 경계).
  if (!allGoals || allGoals.length === 0) {
    redirect("/onboarding");
  }

  const inProgressGoalsRaw = allGoals.filter((g) => g.due_date >= todayIso);
  const pastGoals = allGoals.filter((g) => g.due_date < todayIso);

  // 진행 중 목표가 전부 마감이면(예: 상태 갱신 지연) 온보딩으로 보내지 않고
  // "지난 목표"만 보여준다(설계 §4.6 "목표 전부 마감" 경계) — 이 경우 primary는 없음.
  // R6: 목표별 응원 수·아바타·최근 응원은 my_social_dashboard 단일 호출에서 받는다.
  // 금액과 순위는 이 응답에 포함하지 않는다.
  const socialDashboard = asMySocialDashboard(socialDashboardRaw);
  const cheerSummaryByGoal = new Map<number, MySocialGoal>(
    (socialDashboard?.goals ?? []).map((socialGoal) => [socialGoal.goal_id, socialGoal]),
  );
  const lastCheerAtByGoal = new Map<number, string>(
    (socialDashboard?.goals ?? []).flatMap((socialGoal) =>
      socialGoal.recent_cheer
        ? [[socialGoal.goal_id, socialGoal.recent_cheer.created_at] as const]
        : []
    ),
  );
  const emptyCheerSummary = {
    cheer_count: 0,
    supporter_avatars: [],
    recent_cheer: null,
  } satisfies Pick<MySocialGoal, "cheer_count" | "supporter_avatars" | "recent_cheer">;

  const stripSuffix = (title: string | null) =>
    (title ?? "").replace(/\s*해낼게\s*$/, "").trim();

  const inProgressGoals = [...inProgressGoalsRaw].sort((a, b) => {
    const lastA = lastCheerAtByGoal.get(a.id);
    const lastB = lastCheerAtByGoal.get(b.id);
    if (lastA && lastB) return lastA > lastB ? -1 : lastA < lastB ? 1 : 0;
    if (lastA && !lastB) return -1;
    if (!lastA && lastB) return 1;
    // 응원 도착이 둘 다 없으면 생성 역순(최신 먼저).
    return a.created_at > b.created_at ? -1 : a.created_at < b.created_at ? 1 : 0;
  });

  // 대표 목표도 목록 카드로만 표시하고, 검색·워드맵·수정·친구뷰 미리보기는
  // 승인된 목표 관리 경로(`/me/goal/{id}`)에서 제공한다. 지난 목표도 같은 카드 계약을 쓴다.
  const goal = inProgressGoals[0] ?? pastGoals[0];

  // K1: 클로버 잔액 (개수 — 주표기) + 환전 잠금(A안, FDD §9.1): total/locked/available을
  // clover_eligibility 한 함수 한 스냅샷에서 받는다(clover_balance 직접 조회 폐기 — I1 보장).
  const eligibility = Array.isArray(eligibilityRaw)
    ? eligibilityRaw[0]
    : eligibilityRaw;
  // 컨트롤러 3차 리뷰 MINOR: 조회가 실패해도 여기서 그냥 0으로 떨어지면 "🍀 0개"가 정상
  // 상태처럼 보인다(DESIGN.md §6 상태 가시성: 침묵 금지 위반). balanceLoadFailed를 화면이
  // 직접 분기해서 실패를 실패로 그린다.
  const balanceLoadFailed = Boolean(eligibilityError) || !eligibility;
  const cloverCount = eligibility?.total_balance ?? 0;
  const lockedAmount = eligibility?.locked_amount ?? 0;
  const availableAmount = eligibility?.available_amount ?? cloverCount;

  // 수동환전 계약 §0-1-7: 홈은 진행 중 1건 또는 최근 종결 1건을 상태 RPC로 읽는다.
  // account_no_enc는 RPC 반환형에 없어 브라우저/RSC 경계로 넘어오지 않는다.
  const cashoutStatus =
    ((cashoutStatusRaw ?? []) as unknown as CashoutRecord[])[0] ?? null;
  const pendingCashout =
    cashoutStatus?.status === "REQUESTED" ? cashoutStatus : null;

  if (cheerSearchQuery) {
    redirect(`/me/goal/${goal.id}?q=${encodeURIComponent(cheerSearchQuery)}`);
  }
  const renderPastGoals = (limit?: number) => (
    <div className="mt-2">
      {pastGoals
        .filter((pastGoal) => pastGoal.id !== goal.id)
        .slice(0, limit)
        .map((pastGoal) => (
          <MyGoalListCard
            key={pastGoal.id}
            goal={{
              id: pastGoal.id,
              slug: pastGoal.slug,
              title: stripSuffix(pastGoal.title),
              reason: pastGoal.reason,
              due_date: pastGoal.due_date,
              status: pastGoal.status as "ACTIVE" | "CLOSED" | "DELETED",
              cheerSummary: cheerSummaryByGoal.get(pastGoal.id) ?? emptyCheerSummary,
              coverPresetKey: pastGoal.cover_preset_key,
            }}
          />
        ))}
    </div>
  );

  return (
    <>
      <HomeSeenTracker />
      <ReceiverPageShell testId="receiver-home-page">
        <ReceiverTopBar variant="home" title="내 목표" />

        {member && (
          <PhoneConsentNotice
            hasPhone={Boolean(member.phone)}
            redirectPath="/me"
            context="me"
          />
        )}

        <p className="mb-3 text-sm text-muted-foreground" data-testid="home-progress-summary">
          {socialDashboard?.profile.nickname ? `${socialDashboard.profile.nickname}님, ` : ""}
          <strong className="text-foreground">{inProgressGoals.length}개</strong>의 목표를 향해 가는 중이에요.
        </p>

        <div
          className="mb-4 overflow-hidden rounded-md border border-border bg-card p-4"
          data-testid="clover-balance-card"
        >
          {balanceLoadFailed ? (
            <p className="text-[length:var(--text-meta-micro)]! text-danger-ink" data-testid="clover-balance-error">{PRODUCT_COPY.TEXT_004}</p>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <SplitBalanceCard
                  total={cloverCount}
                  locked={lockedAmount}
                  available={availableAmount}
                  pendingNetKrw={pendingCashout?.net_krw ?? null}
                />
              </div>
              <Link href="/me/achievements" className="shrink-0 text-[length:var(--text-meta-micro)]! font-extrabold text-accent-foreground">내 업적 보기 ›</Link>
            </div>
          )}
        </div>

        {inProgressGoals.length > 0 && (
          <section className="mb-6" data-testid="home-goal-list">
            {inProgressGoals.map((listedGoal) => (
              <MyGoalListCard
                key={listedGoal.id}
                goal={{
                  id: listedGoal.id,
                  slug: listedGoal.slug,
                  title: stripSuffix(listedGoal.title),
                  reason: listedGoal.reason,
                  due_date: listedGoal.due_date,
                  status: listedGoal.status as "ACTIVE" | "CLOSED" | "DELETED",
                  cheerSummary: cheerSummaryByGoal.get(listedGoal.id) ?? emptyCheerSummary,
                  coverPresetKey: listedGoal.cover_preset_key,
                }}
              />
            ))}
          </section>
        )}

        <div className="mb-5 grid gap-2">
          <Link href="/onboarding" className="w-full rounded-md bg-primary px-3 py-3 text-center text-sm font-extrabold text-primary-foreground">＋ 새 목표 만들기</Link>
          <Link
            href={pendingCashout ? "/cashout/status" : "/cashout"}
            className="flex w-full items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-sm font-extrabold text-foreground"
            data-testid={pendingCashout ? "cashout-button-pending" : eligibility?.reached_threshold ? "cashout-button-enabled" : "cashout-button-belowthreshold"}
          ><span>🍀 모은 클로버로 환전하기</span><span>{pendingCashout ? "환전 진행 보기 ›" : `${availableAmount}개 지급 가능 ›`}</span></Link>
        </div>

        {/* 지난 목표 — 마감(due_date < 오늘) 목표를 접어서 둔다(설계 §4.5). */}
        {pastGoals.length > 0 && (
          <section className="mt-6" data-testid="past-goals-section">
            <p className="py-2 text-[13px] font-bold text-muted-foreground">{PRODUCT_COPY.TEXT_015}{pastGoals.length}{PRODUCT_COPY.TEXT_016}</p>
            <Collapsible
              policy={{ auxiliary: true, exceedsLimit: pastGoals.length > 8, hasCollapsedContext: true }}
              collapsedContent={renderPastGoals(8)}
              expandedContent={renderPastGoals()}
            />
          </section>
        )}
      </ReceiverPageShell>
    </>
  );
}
