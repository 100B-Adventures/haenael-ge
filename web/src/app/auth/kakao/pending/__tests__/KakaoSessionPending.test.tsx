import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KakaoSessionPending } from "../KakaoSessionPending";

const mockGetUser = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getUser: mockGetUser } }),
}));

describe("KakaoSessionPending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("KAKAO-PENDING-01: callback 쿠키가 적용됐으면 원래 화면으로 이동한다", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    render(<KakaoSessionPending redirectPath="/onboarding" />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/onboarding"));
  });

  it("KAKAO-PENDING-NEG-01: 세션이 끝내 없으면 외부 브라우저 안내 화면에 머문다", async () => {
    vi.useFakeTimers();
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "not_signed_in" },
    });

    render(<KakaoSessionPending redirectPath="/onboarding" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_500);
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "이 화면에는 로그인이 적용되지 않았어요",
    );
    expect(screen.getByTestId("kakao-external-browser-link")).toBeInTheDocument();
  });
});
