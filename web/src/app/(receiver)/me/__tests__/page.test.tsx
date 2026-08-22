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
) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner-uid" } } }) },
    rpc: vi.fn().mockImplementation((fn: string) => {
      if (fn === "clover_eligibility") {
        return Promise.resolve({ data: [eligibility], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    }),
    from: vi.fn((table: string) => {
      if (table === "goal") return chainable({ data: [GOAL_ROW], error: null });
      if (table === "cheer") return chainable({ data: cheers, error: null });
      if (table === "member") return chainable({ data: { phone }, error: null });
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

describe("/me 응원 목록 — 개별 클로버 개수", () => {
  beforeEach(() => {
    vi.mocked(createServerSupabaseClient).mockReset();
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
      expect(screen.getByTestId("cheer-item-privacy-label")).toHaveTextContent("나만 보임");
      expect(
        screen.getByRole("group", { name: "클로버 5개, 나만 보임" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("cheer-item-relative-time")).toHaveTextContent(
        "2시간 전",
      );
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
    expect(screen.getByTestId("cheer-item-privacy-label")).toHaveTextContent("나만 보임");
  });

  it("응원이 없으면 개별 프라이버시 라벨을 만들지 않는다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase([]) as never,
    );

    const { default: ReceiverHomePage } = await import("../page");
    const element = await ReceiverHomePage();
    render(element);

    expect(screen.queryByTestId("cheer-item-privacy-label")).not.toBeInTheDocument();
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
