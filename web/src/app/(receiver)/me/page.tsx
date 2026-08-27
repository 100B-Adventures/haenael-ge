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
import { PhoneConsentNotice } from "@/components/auth/PhoneConsentNotice";
import { HomeSeenTracker } from "@/components/goal/HomeSeenTracker";
import { MyLinkCard } from "@/components/goal/MyLinkCard";
import { GoalEditSheet } from "@/components/goal/GoalEditSheet";
import { SplitBalanceCard } from "@/components/goal/SplitBalanceCard";
import { type CashoutRecord } from "@/lib/cashout";
import { CheerList, type ReceiverCheer } from "@/components/receiver/CheerList";
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
            <span className="text-[length:var(--text-label-small)]! font-medium text-[var(--faint)]">
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
      </ReceiverPageShell>
    </>
  );
}
