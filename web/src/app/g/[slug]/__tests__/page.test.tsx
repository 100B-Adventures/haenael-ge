// g/[slug]/page.test.tsx — owner bar 노출 스코프 검증(개인정보 유출 방지 핵심).
// 서버 컴포넌트(async 함수)를 직접 호출해 resolve된 React 엘리먼트를 RTL로 렌더한다.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";

function chainable<T>(result: T) {
  const obj: Record<string, unknown> & PromiseLike<T> = {
    select: () => obj,
    eq: () => obj,
    neq: () => obj,
    is: () => obj,
    order: () => obj,
    limit: () => obj,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: T) => unknown) => Promise.resolve(result).then(resolve),
  } as unknown as Record<string, unknown> & PromiseLike<T>;
  return obj;
}

const GOAL_PUBLIC_ROW = {
  id: 1,
  slug: "dogyeong",
  title: "다이어트 해낼게",
  reason: "건강해지려고",
  due_date: "2026-12-31",
  status: "ACTIVE",
  cheer_count: 3,
};

function buildSupabase({
  user,
  ownGoal,
  cheers,
}: {
  user: { id: string } | null;
  ownGoal: { id: number } | null;
  cheers: Array<{ created_at: string }>;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: [] }),
    from: vi.fn((table: string) => {
      if (table === "goal_public") {
        return chainable({ data: GOAL_PUBLIC_ROW, error: null });
      }
      if (table === "goal") {
        return chainable({ data: ownGoal, error: null });
      }
      if (table === "cheer") {
        return chainable({ data: cheers, error: null });
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

describe("/g/[slug] owner bar 노출 스코프", () => {
  beforeEach(() => {
    vi.mocked(createServerSupabaseClient).mockReset();
  });

  it(
    "본인 세션이면 owner bar를 렌더한다",
    async () => {
      // 전체 스위트 동시 실행 시 환경 준비(설정 로드) 지연으로 기본 5s를 초과하는 경우가
      // 있어 넉넉히 확보(단위 로직 자체는 격리 실행 시 ~3s).
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        buildSupabase({
          user: { id: "owner-uid" },
          ownGoal: { id: 1 },
          cheers: [{ created_at: new Date().toISOString() }],
        }) as never,
      );

      const { default: GoalPublicPage } = await import("../page");
      const element = await GoalPublicPage({
        params: Promise.resolve({ slug: "dogyeong" }),
      });
      render(element);

      expect(screen.getByTestId("owner-bar")).toBeInTheDocument();
    },
    15000,
  );

  it("타인이 로그인 상태로 남의 목표를 열람하면 owner bar가 없다 (핵심 유출방지)", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase({
        user: { id: "stranger-uid" },
        ownGoal: null, // RLS goal_select_own이 남의 goal을 걸러 null 반환
        cheers: [],
      }) as never,
    );

    const { default: GoalPublicPage } = await import("../page");
    const element = await GoalPublicPage({
      params: Promise.resolve({ slug: "dogyeong" }),
    });
    render(element);

    expect(screen.queryByTestId("owner-bar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cheer-item-amount")).not.toBeInTheDocument();
    expect(screen.queryByText("나만 보임")).not.toBeInTheDocument();
  });

  it("비로그인 열람이면 owner bar가 없다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase({ user: null, ownGoal: null, cheers: [] }) as never,
    );

    const { default: GoalPublicPage } = await import("../page");
    const element = await GoalPublicPage({
      params: Promise.resolve({ slug: "dogyeong" }),
    });
    render(element);

    expect(screen.queryByTestId("owner-bar")).not.toBeInTheDocument();
  });

  it("갭B(2026-07-20): 비로그인 열람이면 footer 재로그인 링크가 뜬다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase({ user: null, ownGoal: null, cheers: [] }) as never,
    );

    const { default: GoalPublicPage } = await import("../page");
    const element = await GoalPublicPage({
      params: Promise.resolve({ slug: "dogyeong" }),
    });
    render(element);

    const link = screen.getByTestId("relogin-link");
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/auth/kakao/start?redirect=/me");
  });

  it("갭B: 로그인+본인(owner)이면 owner bar만 뜨고 footer 재로그인 링크는 없다(상호배타)", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase({
        user: { id: "owner-uid" },
        ownGoal: { id: 1 },
        cheers: [{ created_at: new Date().toISOString() }],
      }) as never,
    );

    const { default: GoalPublicPage } = await import("../page");
    const element = await GoalPublicPage({
      params: Promise.resolve({ slug: "dogyeong" }),
    });
    render(element);

    expect(screen.getByTestId("owner-bar")).toBeInTheDocument();
    expect(screen.queryByTestId("relogin-link")).not.toBeInTheDocument();
  });

  it("갭B: 로그인했지만 타인 목표 열람이면 owner bar도 footer 재로그인 링크도 없다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase({
        user: { id: "stranger-uid" },
        ownGoal: null,
        cheers: [],
      }) as never,
    );

    const { default: GoalPublicPage } = await import("../page");
    const element = await GoalPublicPage({
      params: Promise.resolve({ slug: "dogyeong" }),
    });
    render(element);

    expect(screen.queryByTestId("owner-bar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("relogin-link")).not.toBeInTheDocument();
  });
});
