// (receiver)/me/page.test.tsx — 개별 클로버 개수(🍀 N) 노출 + 익명도 노출 검증.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
      }),
    }),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  useRouter: () => ({ push: vi.fn() }),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const cheerIlike = vi.fn();

function chainable<T>(result: T) {
  const obj: Record<string, unknown> & PromiseLike<T> = {
    select: () => obj,
    eq: () => obj,
    neq: () => obj,
    is: () => obj,
    in: () => obj,
    order: () => obj,
    limit: () => obj,
    ilike: (column: string, value: string) => {
      cheerIlike(column, value);
      return obj;
    },
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: T) => unknown) => Promise.resolve(result).then(resolve),
  } as unknown as Record<string, unknown> & PromiseLike<T>;
  return obj;
}

const GOAL_ROW = {
  id: 1,
  slug: "dogyeong",
  title: "다이어트 해낼게",
  reason: "건강해지려고",
  due_date: "2026-12-31",
  status: "ACTIVE",
};

function buildSupabase(
  cheers: Array<Record<string, unknown>>,
  phone: string | null = "01012345678",
  eligibility: Record<string, unknown> = { reached_threshold: false },
  cheerCount = cheers.length,
  wordmap: Array<{ word: string; word_count: number }> = [],
  goalRows: Array<Record<string, unknown>> = [GOAL_ROW],
) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner-uid" } } }) },
    rpc: vi.fn().mockImplementation((fn: string) => {
      if (fn === "clover_eligibility") {
        return Promise.resolve({ data: [eligibility], error: null });
      }
      if (fn === "get_wordmap") {
        return Promise.resolve({ data: wordmap, error: null });
      }
      if (fn === "my_social_dashboard") {
        const goals = goalRows.map((goal) => {
          const goalCheers = cheers
            .filter((cheer) => cheer.goal_id === goal.id)
            .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
          const recent = goalCheers[0];
          return {
            goal_id: goal.id,
            slug: goal.slug,
            title: goal.title,
            due_date: goal.due_date,
            status: goal.status,
            cover_preset_key: goal.cover_preset_key ?? "c1",
            cheer_count: goalCheers.length,
            supporter_avatars: [],
            recent_cheer: recent
              ? {
                  supporter_name: recent.display_name ?? null,
                  message: recent.message ?? null,
                  created_at: recent.created_at,
                  is_anonymous: recent.is_anonymous ?? false,
                }
              : null,
          };
        });
        return Promise.resolve({
          data: {
            profile: { nickname: "Owner", bio: null, profile_image: null },
            goals,
            received_cheers: [],
            sent_cheers: [],
            friend_count: 0,
            achievements: {
              completed_goal_count: 0,
              received_cheer_count: cheers.length,
              connected_friend_count: 0,
            },
            belonging_queue: [],
          },
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    }),
    from: vi.fn((table: string) => {
      if (table === "goal") return chainable({ data: goalRows, error: null });
      if (table === "cheer") return chainable({ data: cheers, count: cheerCount, error: null });
      if (table === "member") return chainable({ data: { phone }, error: null });
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

describe("/me 응원 목록 — 개별 클로버 개수", () => {
  beforeEach(() => {
    vi.mocked(createServerSupabaseClient).mockReset();
    cheerIlike.mockReset();
  });

  it(
    "홈 카드에는 금액 없이 응원 인원과 최근 메시지를 노출하고 관리로 연결한다",
    async () => {
      // 전체 스위트 병렬 실행에서는 첫 Next.js 서버 컴포넌트 import가 5초를 넘길 수 있다.
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        buildSupabase([
          {
            id: 1,
            goal_id: 1,
            display_name: "민지",
            is_anonymous: false,
            message: "화이팅",
            clover_amount: 5,
            created_at: new Date(Date.now() - 125 * 60_000).toISOString(),
          },
        ]) as never,
      );

      const { default: ReceiverHomePage } = await import("../page");
      const element = await ReceiverHomePage();
      render(element);
      expect(screen.getByTestId("cheer-summary-bar")).toHaveTextContent("1명이 응원했어요");
      expect(screen.getByTestId("cheer-summary-bar")).toHaveTextContent("민지: 화이팅");
      expect(screen.getByTestId("my-goal-list-card-detail-link")).toHaveAttribute("href", "/me/goal/1");
      expect(document.body).not.toHaveTextContent("🍀 5");
    },
    15000,
  );

  it("익명 응원도 홈 요약에는 신원·금액 없이 인원수만 표시한다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([
        {
          id: 2,
          goal_id: 1,
          display_name: null,
          is_anonymous: true,
          message: null,
          clover_amount: 3,
          created_at: new Date().toISOString(),
        },
      ]) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    const element = await ReceiverHomePage();
    render(element);
    expect(screen.getByTestId("cheer-summary-bar")).toHaveTextContent("1명이 응원했어요");
    expect(screen.queryByText("🍀 3")).not.toBeInTheDocument();
  });

  it("응원이 없으면 개별 프라이버시 라벨을 만들지 않는다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([]) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    const element = await ReceiverHomePage();
    render(element);

    expect(screen.queryByTestId("cheer-item-ordinal")).not.toBeInTheDocument();
  });

  it("갭C(2026-07-20): 내 응원 링크 공유 동작이 /me 카드에 항상 렌더된다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([]) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    const element = await ReceiverHomePage();
    render(element);

    expect(screen.getByTestId("my-link-copy-button")).toBeInTheDocument();
    expect(screen.getByTestId("my-link-copy-button")).toHaveTextContent("응원 링크 공유");
  });

  it("목표의 why를 홈 카드에서 읽고 목표 관리 편집 화면으로 이동할 수 있다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([]) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage());
    expect(screen.getByText("건강해지려고")).toBeInTheDocument();
    expect(screen.getByTestId("my-goal-list-card-manage-link")).toHaveAttribute("href", "/me/goal/1");
  });

  it("전화번호가 없는 회원에게만 카카오 재동의 안내를 보여준다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([], null) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage());

    expect(screen.getByTestId("phone-consent-notice")).toHaveTextContent(
      "알림 받으려면 전화번호 동의가 필요해요",
    );
    expect(screen.getByTestId("phone-consent-cta")).toHaveAttribute(
      "href",
      "/auth/kakao/start?redirect=%2Fme",
    );
  });

  it("전화번호가 있는 회원에게는 카카오 재동의 안내를 보여주지 않는다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([], "01012345678") as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage());

    expect(screen.queryByTestId("phone-consent-notice")).not.toBeInTheDocument();
  });

  it("TC-OV-02 정상 경로: /me 검색은 대표 목표의 서버 검색 경로로 전달한다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([
        {
          id: 121,
          display_name: "오래된 응원자",
          is_anonymous: false,
          message: "121번째 응원 메시지",
          clover_amount: 2,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ], "01012345678", { reached_threshold: false }, 121) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    await expect(ReceiverHomePage({ searchParams: Promise.resolve({ q: "121번째" }) }))
      .rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/me/goal/1?q=121%EB%B2%88%EC%A7%B8");
  });

  it("TC-OV-02 빈 결과도 같은 목표 관리 검색 경로에서 판정하도록 전달한다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([], "01012345678", { reached_threshold: false }, 121) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    await expect(ReceiverHomePage({ searchParams: Promise.resolve({ q: "없는응원" }) }))
      .rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/me/goal/1?q=%EC%97%86%EB%8A%94%EC%9D%91%EC%9B%90");
  });

  it("TC-OV-03 거절 경로: 검색 필터 메타문자만 들어오면 서버 검색을 실행하지 않는다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([], "01012345678", { reached_threshold: false }, 121) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage({ searchParams: Promise.resolve({ q: "%_\\" }) }));

    expect(cheerIlike).not.toHaveBeenCalled();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
  });

  it("TC-V37-03 정상 경로: 워드맵은 홈에 중복하지 않고 목표 관리 경로로 연결한다", async () => {
    const words = Array.from({ length: 100 }, (_, index) => ({
      word: `응원 ${index + 1}`,
      word_count: 100 - index,
    }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([], "01012345678", { reached_threshold: false }, 0, words) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage());
    expect(screen.queryByTestId("wordmap-mini-preview")).not.toBeInTheDocument();
    expect(screen.getByTestId("my-goal-list-card-detail-link")).toHaveAttribute("href", "/me/goal/1");
  });

  it("TC-V37-03 거절 경로: 워드가 없으면 빈 미리보기 카드를 만들지 않는다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([], "01012345678", { reached_threshold: false }, 0, []) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage());

    expect(screen.queryByTestId("wordmap-mini-preview")).not.toBeInTheDocument();
    expect(screen.queryByTestId("wordmap-overflow-summary")).not.toBeInTheDocument();
  });

  // 컨트롤러 3차 리뷰 MINOR: clover_eligibility 목이 reached_threshold만 갖고 있어서
  // available/locked가 항상 0으로 떨어졌다 — page.tsx가 total/locked/available을 서로
  // 바꿔 넘겨도 이 회귀망이 못 잡는 상태였다. 잠김이 있는 목을 추가해 SplitBalanceCard로
  // 넘어가는 세 값이 각각 제자리(스왑 없이)인지 직접 단언한다.
  it("잠김이 있으면 사용가능/잠김 개수가 서로 바뀌지 않고 각자 제자리에 렌더된다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([], "01012345678", {
        total_balance: 52,
        locked_amount: 40,
        available_amount: 12,
        reached_threshold: true,
      }) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage());

    expect(screen.getByTestId("split-balance-total")).toHaveTextContent("🍀 52");
    expect(screen.getByTestId("split-balance-available")).toHaveTextContent("🍀 12개");
    expect(screen.getByTestId("split-balance-locked")).toHaveTextContent("🍀 40개");
    expect(screen.getByTestId("split-balance-block")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 다중 목표(설계 §4.4~4.6, 2026-09-21) — 목록·정렬·지난 목표 접힘
// ─────────────────────────────────────────────────────────────────────────
describe("/me 다중 목표 목록", () => {
  beforeEach(() => {
    vi.mocked(createServerSupabaseClient).mockReset();
    cheerIlike.mockReset();
  });

  it("진행 중 목표가 여러 개면 최근 응원 도착순으로 카드가 나열된다(PRD §4.3-1)", async () => {
    const goalA = { ...GOAL_ROW, id: 1, slug: "goal-a", title: "목표A 해낼게", due_date: "2030-01-01", created_at: "2026-01-01T00:00:00Z" };
    const goalB = { ...GOAL_ROW, id: 2, slug: "goal-b", title: "목표B 해낼게", due_date: "2030-02-01", created_at: "2026-02-01T00:00:00Z" };
    // 목표A는 응원이 최근(2026-09-20), 목표B는 응원이 더 이전(2026-09-01)
    // → 최근 응원 도착순이면 A가 먼저(primary), B가 "다른 목표" 카드로.
    const cheers = [
      { id: 10, goal_id: 1, status: "CONFIRMED", created_at: "2026-09-20T00:00:00Z" },
      { id: 11, goal_id: 2, status: "CONFIRMED", created_at: "2026-09-01T00:00:00Z" },
    ];

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase(cheers, "01012345678", { reached_threshold: false }, 1, [], [goalA, goalB]) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage());

    // 승인 계약의 홈 목표 목록에 최근 응원 도착순으로 목표가 모두 렌더됨.
    const goalList = screen.getByTestId("home-goal-list");
    expect(screen.getByTestId("home-progress-summary")).toHaveTextContent("2개의 목표를 향해 가는 중이에요");
    expect(within(goalList).getByText(/목표A/)).toBeInTheDocument();
    expect(within(goalList).getByText(/목표B/)).toBeInTheDocument();
    const cards = within(goalList).getAllByTestId("my-goal-list-card");
    expect(cards[0]).toHaveTextContent("목표A");
    expect(cards[1]).toHaveTextContent("목표B");
  });

  it("마감 지난 목표는 '지난 목표' 접힘 구역에 들어가고 기본은 닫혀 있다", async () => {
    const activeGoal = { ...GOAL_ROW, id: 1, slug: "goal-active", title: "진행중 해낼게", due_date: "2030-01-01", created_at: "2026-01-01T00:00:00Z" };
    const pastGoal = { ...GOAL_ROW, id: 2, slug: "goal-past", title: "지난목표 해낼게", due_date: "2020-01-01", created_at: "2019-01-01T00:00:00Z" };

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([], "01012345678", { reached_threshold: false }, 0, [], [activeGoal, pastGoal]) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage());

    // 첫 카드는 진행 중 목표다.
    expect(screen.getByTestId("home-goal-list")).toHaveTextContent("진행중");

    const pastSection = screen.getByTestId("past-goals-section");
    expect(pastSection).toBeInTheDocument();
    // <details>는 open 속성이 없으면 기본적으로 접혀 있다.
    expect(pastSection).not.toHaveAttribute("open");
    expect(screen.getByText(/지난목표/)).toBeInTheDocument();
  });

  it("목표가 하나뿐이어도 홈 목표 목록을 렌더하고 지난 목표 섹션은 만들지 않는다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([]) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage());

    expect(screen.getByTestId("home-goal-list")).toBeInTheDocument();
    expect(screen.getByTestId("home-progress-summary")).toHaveTextContent("1개의 목표를 향해 가는 중이에요");
    expect(screen.queryByTestId("past-goals-section")).not.toBeInTheDocument();
  });
});
