// (receiver)/me/page.test.tsx — 개별 클로버 개수(🍀 N) 노출 + 익명도 노출 검증.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

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
            profile: { nickname: "Owner", profile_image: null },
            goals,
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
    "응원마다 clover_amount(🍀 N)와 '나만 보임'을 인접해 노출한다",
    async () => {
      // 전체 스위트 병렬 실행에서는 첫 Next.js 서버 컴포넌트 import가 5초를 넘길 수 있다.
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        buildSupabase([
          {
            id: 1,
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

      expect(screen.getByTestId("cheer-item-amount")).toHaveTextContent("🍀 5");
      expect(
        screen.getByRole("group", { name: "클로버 5개, 1번째 응원, 나만 보임" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("cheer-item-ordinal")).toHaveTextContent("1번째");
    },
    15000,
  );

  it("익명 응원도 개수와 '나만 보임'은 표시한다(익명=신원 은닉, 수입 은닉 아님)", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([
        {
          id: 2,
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

    expect(screen.getByText("익명의 누군가")).toBeInTheDocument();
    expect(screen.getByTestId("cheer-item-amount")).toHaveTextContent("🍀 3");
    expect(
      screen.getByRole("group", { name: "클로버 3개, 1번째 응원, 나만 보임" }),
    ).toBeInTheDocument();
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

  it("갭C(2026-07-20): 내 응원 링크 복사 카드가 /me에 항상 렌더된다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([]) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    const element = await ReceiverHomePage();
    render(element);

    expect(screen.getByTestId("my-link-card")).toBeInTheDocument();
    expect(screen.getByTestId("my-link-url")).toHaveTextContent("/g/dogyeong");
    expect(screen.getByTestId("my-link-copy-button")).toBeInTheDocument();
  });

  it("목표의 why를 내 페이지에서 조회하고 편집 시트를 열 수 있다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([]) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage());

    expect(screen.getByTestId("goal-reason")).toHaveTextContent("건강해지려고");
    expect(screen.getByTestId("open-goal-edit-sheet")).toBeInTheDocument();
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

  it("TC-OV-02 정상 경로: 121번째 응원 검색을 이름과 메시지 서버 쿼리로 실행한다", async () => {
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
    render(await ReceiverHomePage({ searchParams: Promise.resolve({ q: "121번째" }) }));

    expect(cheerIlike).toHaveBeenCalledWith("display_name", "%121번째%");
    expect(cheerIlike).toHaveBeenCalledWith("message", "%121번째%");
    expect(screen.getByTestId("receiver-cheer-list")).toHaveTextContent("121번째 응원 메시지");
    expect(screen.getByTestId("cheer-overflow-summary")).toHaveTextContent("1개 찾았어요");
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

  it("TC-V37-03 정상 경로: 워드 100개 중 미리보기는 승인 시안대로 6개만 표시한다", async () => {
    const words = Array.from({ length: 100 }, (_, index) => ({
      word: `응원 ${index + 1}`,
      word_count: 100 - index,
    }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([], "01012345678", { reached_threshold: false }, 0, words) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage());

    expect(screen.getByTestId("wordmap-mini-preview").querySelectorAll("span")).toHaveLength(6);
    expect(screen.getByTestId("wordmap-overflow-summary")).toHaveTextContent(
      "6개 표시 · 94개는 전체 워드맵에서 확인",
    );
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

    // primary = 목표A(최근 응원 도착)
    expect(screen.getByTestId("goal-title")).toHaveTextContent("목표A");
    // 목표B는 "다른 진행 중 목표" 섹션의 간단 카드로 렌더됨
    expect(screen.getByTestId("other-goals-section")).toBeInTheDocument();
    expect(screen.getByText(/목표B/)).toBeInTheDocument();
  });

  it("마감 지난 목표는 '지난 목표' 접힘 구역에 들어가고 기본은 닫혀 있다", async () => {
    const activeGoal = { ...GOAL_ROW, id: 1, slug: "goal-active", title: "진행중 해낼게", due_date: "2030-01-01", created_at: "2026-01-01T00:00:00Z" };
    const pastGoal = { ...GOAL_ROW, id: 2, slug: "goal-past", title: "지난목표 해낼게", due_date: "2020-01-01", created_at: "2019-01-01T00:00:00Z" };

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([], "01012345678", { reached_threshold: false }, 0, [], [activeGoal, pastGoal]) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage());

    // primary는 진행 중 목표.
    expect(screen.getByTestId("goal-title")).toHaveTextContent("진행중");

    const pastSection = screen.getByTestId("past-goals-section");
    expect(pastSection).toBeInTheDocument();
    // <details>는 open 속성이 없으면 기본적으로 접혀 있다.
    expect(pastSection).not.toHaveAttribute("open");
    expect(screen.getByText(/지난목표/)).toBeInTheDocument();
  });

  it("목표가 하나뿐이면 다른 목표·지난 목표 섹션을 렌더하지 않는다(회귀 방지)", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([]) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    render(await ReceiverHomePage());

    expect(screen.queryByTestId("other-goals-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("past-goals-section")).not.toBeInTheDocument();
  });
});
