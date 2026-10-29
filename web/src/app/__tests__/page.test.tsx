// app/page.test.tsx — 루트 랜딩 세션 리다이렉트(user-flow.md §1.3 (a)).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const redirectMock = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";
import LandingPage from "../page";

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

function buildSupabase(user: { id: string } | null, goals: Array<{ id: number }>) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn((table: string) => {
      if (table === "goal") return chainable({ data: goals, error: null });
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

describe("루트 / 세션 리다이렉트", () => {
  beforeEach(() => {
    vi.mocked(createServerSupabaseClient).mockReset();
    redirectMock.mockClear();
  });

  it("로그인 세션 + 본인 goal 존재 → /me 리다이렉트", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase({ id: "owner-uid" }, [{ id: 1 }]) as never,
    );

    await expect(LandingPage()).rejects.toThrow("NEXT_REDIRECT:/me");
    expect(redirectMock).toHaveBeenCalledWith("/me");
  });

  it("비로그인 → 리다이렉트 없이 기존 랜딩 렌더", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase(null, []) as never,
    );

    const element = await LandingPage();
    render(element);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("landing-cta")).toBeInTheDocument();
    expect(screen.getByTestId("brand-logo-link")).toHaveAttribute("href", "/");
    expect(
      within(screen.getByTestId("brand-logo-link")).getByText("게."),
    ).toHaveClass("[color:var(--clover-bright)]!");
    expect(screen.getByTestId("landing-relogin-link")).toBeInTheDocument();
    expect(screen.queryByTestId("lead-form")).not.toBeInTheDocument();
  });

  it("로그인했지만 goal 없음 → 리다이렉트 없이 랜딩 렌더(온보딩 유도는 기존 CTA)", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      buildSupabase({ id: "owner-uid" }, []) as never,
    );

    const element = await LandingPage();
    render(element);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("landing-cta")).toBeInTheDocument();
    expect(screen.getByTestId("brand-logo-link")).toHaveAttribute("href", "/me");
  });
});
