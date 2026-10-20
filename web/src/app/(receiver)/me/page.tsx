// (receiver)/me/page.tsx — 받는사람 내 페이지
// 슬라이스 #9 실구현. 인증 필수.
// DESIGN.md §6 금액 3층 b: 클로버 개수(🍀 N개)만, ₩ 환산 X.
// wireframe: docs/design/WIREFRAMES/receiver-home.html + wordmap-share.html (1. 내 목표 홈).
// 단일 CTA: "워드맵 보기" → /wordmap/{goalId}.
// 슬라이스 #10: NotificationBadge 통합.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DdayChip, StatusChip } from "@/components/goal/DdayChip";
import { CheerCount } from "@/components/goal/CheerCount";
import { PhoneConsentNotice } from "@/components/auth/PhoneConsentNotice";
import { HomeSeenTracker } from "@/components/goal/HomeSeenTracker";
import { MyLinkCard } from "@/components/goal/MyLinkCard";
import { GoalEditSheet } from "@/components/goal/GoalEditSheet";
import { MyGoalListCard } from "@/components/goal/MyGoalListCard";
import { SplitBalanceCard } from "@/components/goal/SplitBalanceCard";
import { type CashoutRecord } from "@/lib/cashout";
import { CheerList, type ReceiverCheer } from "@/components/receiver/CheerList";
import { Collapsible } from "@/components/common/Collapsible";
import { CheerSummaryBar } from "@/components/social/CheerSummaryBar";
import { asMySocialDashboard, type MySocialGoal } from "@/lib/social/contracts";
import {
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";

// ─── 페이지 ───────────────────────────────────────────────────────────────────

type ReceiverHomePageProps = {
  searchParams?: Promise<{ q?: string | string[] }>;
};

const CHEER_SELECT =
  "id, display_name, is_anonymous, message, clover_amount, created_at";
const CHEER_RESULT_LIMIT = 20;
const WORDMAP_PREVIEW_LIMIT = 6;

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
  const { data: allGoals } = await supabase
    .from("goal")
    .select("id, slug, title, reason, due_date, status, created_at, cover_preset_key")
    .eq("member_id", user.id)
    .neq("status", "DELETED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

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
  const { data: socialDashboardRaw } = await supabase.rpc("my_social_dashboard");
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

  // 목록 최상단 카드(primary) — 기존 단일 목표 화면의 상세 UI(응원 검색·워드맵
  // 미리보기·수정·친구뷰 미리보기)를 그대로 유지한다. 나머지 진행 중 목표와
  // 지난 목표는 설계 §4.5 표대로 간단 카드(제목·D-day·응원수·링크복사)로만 둔다.
  const goal = inProgressGoals[0] ?? pastGoals[0];
  const otherInProgressGoals = inProgressGoals.slice(1);

  const { data: member } = await supabase
    .from("member")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();

  // K1: 클로버 잔액 (개수 — 주표기) + 환전 잠금(A안, FDD §9.1): total/locked/available을
  // clover_eligibility 한 함수 한 스냅샷에서 받는다(clover_balance 직접 조회 폐기 — I1 보장).
  const { data: eligibilityRaw, error: eligibilityError } = await supabase.rpc(
    "clover_eligibility",
    { p_member_id: user.id },
  );
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
  const reachedThreshold = eligibility?.reached_threshold ?? false;

  // 수동환전 계약 §0-1-7: 홈은 진행 중 1건 또는 최근 종결 1건을 상태 RPC로 읽는다.
  // account_no_enc는 RPC 반환형에 없어 브라우저/RSC 경계로 넘어오지 않는다.
  const { data: cashoutStatusRaw } = await supabase.rpc(
    "my_cashout_status" as never,
  );
  const cashoutStatus =
    ((cashoutStatusRaw ?? []) as unknown as CashoutRecord[])[0] ?? null;
  const pendingCashout =
    cashoutStatus?.status === "REQUESTED" ? cashoutStatus : null;

  // cheer_select_goal_owner: 응원 목록 (CONFIRMED + not deleted, 최근 20개).
  // DESIGN.md v2.0.0 §6.1: 첫 8개 뒤 같은 자리에서 20개까지 펼치고,
  // 나머지는 서버 검색으로 접근한다. 브라우저 배열 상한과 검색 범위를 결합하지 않는다.
  // DESIGN.md §6-(b′): 본인 한정 clover_amount 노출. goal.id는 위에서 member_id=user.id로
  // 스코프된 본인 목표이고, RLS cheer_select_goal_owner도 goal.member_id=auth.uid()만 허용 —
  // 이중 스코프로 남의 목표 cheer 금액이 섞일 수 없다.
  const ownerCheerQuery = () =>
    supabase
      .from("cheer")
      .select(CHEER_SELECT, { count: "exact" })
      .eq("goal_id", goal.id)
      .eq("status", "CONFIRMED")
      .is("deleted_at", null);

  const recentCheerResult = await ownerCheerQuery()
    .order("created_at", { ascending: false }) // 🔒 시간순 고정, 금액순 정렬/랭킹 금지
    .limit(CHEER_RESULT_LIMIT);
  const cheerCount =
    recentCheerResult.count ?? recentCheerResult.data?.length ?? 0;

  let cheers = (recentCheerResult.data ?? []) as ReceiverCheer[];
  if (cheerSearchQuery) {
    // PostgREST의 raw `or()` 문자열에 사용자 입력을 넣지 않는다. 이름과 메시지를
    // 각각 파라미터화된 ilike로 조회한 뒤 id로 합쳐 필터 구문 주입과 중복을 함께 막는다.
    const searchPattern = `%${cheerSearchQuery}%`;
    const [nameMatches, messageMatches] = await Promise.all([
      ownerCheerQuery()
        .eq("is_anonymous", false)
        .ilike("display_name", searchPattern)
        .order("created_at", { ascending: false })
        .limit(CHEER_RESULT_LIMIT),
      ownerCheerQuery()
        .ilike("message", searchPattern)
        .order("created_at", { ascending: false })
        .limit(CHEER_RESULT_LIMIT),
    ]);
    const uniqueMatches = new Map<number, ReceiverCheer>();
    [...(nameMatches.data ?? []), ...(messageMatches.data ?? [])].forEach(
      (cheer) => {
        uniqueMatches.set(cheer.id, cheer as ReceiverCheer);
      },
    );
    cheers = Array.from(uniqueMatches.values())
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, CHEER_RESULT_LIMIT);
  }

  // DESIGN.md v2.0.0 오버플로 계약: 홈 미니맵은 6개, 전체 워드맵은 12개다.
  const { data: wordmapRaw } = await supabase.rpc("get_wordmap", {
    p_goal_id: goal.id,
  });

  const previewWords: Array<{ word: string; word_count: number }> = (
    wordmapRaw ?? []
  )
    .slice(0, WORDMAP_PREVIEW_LIMIT)
    .map((w: { word: string; word_count: number }) => ({
      word: w.word,
      word_count: Number(w.word_count),
    }));
  const wordmapTotal = wordmapRaw?.length ?? previewWords.length;

  const maxCount =
    previewWords.length > 0
      ? Math.max(...previewWords.map((w) => w.word_count))
      : 1;

  const cleanTitle = (goal.title ?? "").replace(/\s*해낼게\s*$/, "").trim();
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
        <ReceiverTopBar variant="home" />

        {member && (
          <PhoneConsentNotice
            hasPhone={Boolean(member.phone)}
            redirectPath="/me"
            context="me"
          />
        )}

        {/* 목표 제목 */}
        <p className="receiver-goal-title mb-2" data-testid="goal-title">
          {cleanTitle}
          <br />
          해낼게
        </p>

        {/* D-day 칩 */}
        {goal.due_date && (
          <div className="flex gap-2 mb-4">
            <DdayChip dueDate={goal.due_date} />
            {goal.status !== "ACTIVE" && (
              <StatusChip
                status={goal.status as "ACTIVE" | "CLOSED" | "DELETED"}
              />
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

        <CheerSummaryBar goal={cheerSummaryByGoal.get(goal.id) ?? emptyCheerSummary} />

        <Link
          href={`/me/goal/${goal.id}`}
          className="mb-3 flex min-h-11 items-center justify-center rounded-sm bg-accent px-4 text-[13px] font-bold text-accent-foreground"
          data-testid="primary-goal-manage-link"
        >
          이 목표 관리
        </Link>

        {/* 내 응원 링크 재접근 (user-flow.md §1.3 갭3, 2026-07-20) */}
        <MyLinkCard slug={goal.slug} />

        {/* 친구에게 보이는 화면 미리보기 (본인 방문 시 OwnerBar 표시) */}
        <Link
          href={`/g/${goal.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 block rounded-sm bg-muted px-4 py-3 text-center text-[13px] font-semibold text-accent-foreground"
          data-testid="friend-view-preview-link"
        >
          👀 친구에게 이렇게 보여요 (미리보기)
        </Link>

        {/* 클로버 잔액 — 환전 잠금(A안) 분할 표시. DESIGN.md §6-(d) · §4 SplitBalanceCard */}
        <div
          className="mb-3 overflow-hidden rounded-md border border-border bg-card p-4"
          data-testid="clover-balance-card"
        >
          {balanceLoadFailed ? (
            <p
              className="text-xs text-danger-ink"
              data-testid="clover-balance-error"
            >
              🍀 잔액을 불러오지 못했어요. 새로고침 해주세요.
            </p>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <SplitBalanceCard
                  total={cloverCount}
                  locked={lockedAmount}
                  available={availableAmount}
                  pendingNetKrw={pendingCashout?.net_krw ?? null}
                />
              </div>
              {/* 환전 페이지 진입은 미달이어도 항상 허용. 실제 신청은 Server Action의 서버측 CASHOUT_ENABLED와 DB 계약으로 게이트한다. */}
              <Link
                href={pendingCashout ? "/cashout/status" : "/cashout"}
                className={`ml-3 flex shrink-0 flex-col items-center gap-0.5 rounded-sm px-3 py-2 text-center text-xs font-bold ${
                  pendingCashout
                    ? "bg-amber-soft text-amber-ink"
                    : "bg-primary text-primary-foreground"
                } ${pendingCashout || reachedThreshold ? "opacity-100" : "opacity-60"}`}
                data-testid={
                  pendingCashout
                    ? "cashout-button-pending"
                    : reachedThreshold
                      ? "cashout-button-enabled"
                      : "cashout-button-belowthreshold"
                }
              >
                <span>{pendingCashout ? "진행중" : "환전"}</span>
                {pendingCashout && (
                  <small className="text-[length:var(--text-meta-micro)]! font-bold opacity-85">
                    상태 보기
                  </small>
                )}
              </Link>
            </div>
          )}
        </div>

        {cashoutStatus && (
          <Link
            href="/cashout/history"
            className="mb-3 flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-[13px] font-bold text-foreground"
            data-testid="cashout-history-link"
          >
            <span>환전 내역</span>
            <span className="text-[length:var(--text-label-small)]! font-medium text-[var(--muted-color)]">
              최근 #{cashoutStatus.id} ›
            </span>
          </Link>
        )}

        {/* 응원자 수 */}
        <div className="mb-3">
          <CheerCount count={cheerCount} />
        </div>

        {/* 응원자 목록 (이름/익명 + 본인 한정 클로버 개수, ₩ 환산 X) */}
        <CheerList
          cheers={cheers}
          totalCount={cheerCount}
          searchQuery={cheerSearchQuery}
        />

        {/* 워드맵 미니 상한. 승인 v3.7처럼 응원 목록 다음에 6개와 초과 수를 함께 둔다. */}
        {previewWords.length > 0 && (
          <div
            className="mb-4 overflow-hidden rounded-md border border-border bg-card leading-relaxed"
            data-testid="wordmap-mini-preview"
          >
            <div className="px-4 py-4">
              <p className="mb-2 text-[length:var(--text-label-small)]! font-bold text-muted-foreground">
                워드맵 과다 데이터
              </p>
              <div className="flex flex-wrap gap-2">
                {previewWords.map((w) => {
                  const emphasized = maxCount > 0 && w.word_count === maxCount;
                  return (
                    <span
                      key={w.word}
                      className={`inline-block max-w-full truncate rounded-lg border border-primary bg-accent px-3 py-2 text-[length:var(--text-label-small)]! text-accent-foreground ${emphasized ? "font-extrabold" : "font-bold"}`}
                      title={w.word}
                    >
                      {w.word}
                    </span>
                  );
                })}
              </div>
            </div>
            {wordmapTotal > WORDMAP_PREVIEW_LIMIT && (
              <p
                className="border-t border-border px-4 py-3 text-[length:var(--text-label-small)]! text-muted-foreground"
                data-testid="wordmap-overflow-summary"
              >
                <strong className="text-accent-foreground">
                  {WORDMAP_PREVIEW_LIMIT}개 표시
                </strong>{" "}
                · {wordmapTotal - WORDMAP_PREVIEW_LIMIT}개는 전체 워드맵에서
                확인
              </p>
            )}
          </div>
        )}

        {/* 목록을 가리지 않는 문서 흐름 CTA. 긴 응원에서도 검색 카드 아래에만 나타난다. */}
        <Link
          href={`/wordmap/${goal.id}`}
          className="block w-full rounded-md border border-border bg-card p-4 text-center text-[15px] font-extrabold tracking-[-0.2px] text-foreground"
          data-testid="wordmap-view-cta"
        >
          워드맵 보기
        </Link>

        {/* 다중 목표(설계 §4.5): 진행 중인 다른 목표들 — 세로 스택, 간단 카드 */}
        {otherInProgressGoals.length > 0 && (
          <div className="mt-6" data-testid="other-goals-section">
            <p className="mb-2 text-[length:var(--text-label-small)]! font-bold text-muted-foreground">
              진행 중인 다른 목표
            </p>
            {otherInProgressGoals.map((g) => (
              <MyGoalListCard
                key={g.id}
                goal={{
                  id: g.id,
                  slug: g.slug,
                  title: stripSuffix(g.title),
                  due_date: g.due_date,
                  status: g.status as "ACTIVE" | "CLOSED" | "DELETED",
                  cheerSummary: cheerSummaryByGoal.get(g.id) ?? emptyCheerSummary,
                  coverPresetKey: g.cover_preset_key,
                }}
              />
            ))}
          </div>
        )}

        {/* 지난 목표 — 마감(due_date < 오늘) 목표를 접어서 둔다(설계 §4.5). */}
        {pastGoals.length > 0 && (
          <section className="mt-6" data-testid="past-goals-section">
            <p className="py-2 text-[13px] font-bold text-muted-foreground">지난 목표 {pastGoals.length}개</p>
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
