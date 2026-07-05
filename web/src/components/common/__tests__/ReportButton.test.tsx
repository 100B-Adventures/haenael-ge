// ReportButton.test.tsx — vitest + RTL
// 신고 버튼·시트 렌더 및 인터랙션 테스트.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportButton } from "../ReportButton";

// Supabase 모킹 (report EF는 fetch로 직접 호출)
const mockGetSession = vi.fn().mockResolvedValue({
  data: { session: { access_token: "test-token" } },
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: mockGetSession },
  }),
}));

// fetch 모킹
const mockFetch = vi.fn();
global.fetch = mockFetch;

// env 모킹
beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: "test-token" } },
  });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon");
});

describe("ReportButton", () => {
  it("variant=icon: 🚩 아이콘 버튼 렌더", () => {
    render(
      <ReportButton targetType="GOAL" targetId={1} variant="icon" />,
    );
    const btn = screen.getByTestId("report-button");
    expect(btn).toBeTruthy();
    expect(btn.getAttribute("aria-label")).toBe("신고하기");
  });

  it("variant=text: 신고 텍스트 + 아이콘 렌더", () => {
    render(
      <ReportButton targetType="GOAL" targetId={1} variant="text" />,
    );
    expect(screen.getByTestId("report-button").textContent).toContain("신고");
  });

  it("버튼 클릭 시 ReportSheet 열림", async () => {
    render(<ReportButton targetType="GOAL" targetId={1} />);
    fireEvent.click(screen.getByTestId("report-button"));
    await waitFor(() => {
      expect(screen.getByTestId("report-sheet")).toBeTruthy();
    });
  });

  it("시트 열릴 때 사유 선택지 5개 렌더", async () => {
    render(<ReportButton targetType="GOAL" targetId={1} />);
    fireEvent.click(screen.getByTestId("report-button"));
    await waitFor(() => {
      expect(screen.getByTestId("report-sheet")).toBeTruthy();
    });

    const presets = [
      "스팸 또는 광고",
      "욕설·혐오 표현",
      "개인정보 노출",
      "허위 정보",
      "기타",
    ];
    for (const preset of presets) {
      expect(screen.getByTestId(`report-reason-${preset}`)).toBeTruthy();
    }
  });

  it("사유 선택 전 제출 버튼 비활성", async () => {
    render(<ReportButton targetType="GOAL" targetId={1} />);
    fireEvent.click(screen.getByTestId("report-button"));
    await waitFor(() => {
      expect(screen.getByTestId("report-submit")).toBeTruthy();
    });

    const submitBtn = screen.getByTestId("report-submit");
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
  });

  it("사유 선택 후 제출 버튼 활성", async () => {
    render(<ReportButton targetType="GOAL" targetId={1} />);
    fireEvent.click(screen.getByTestId("report-button"));
    await waitFor(() => {
      expect(screen.getByTestId("report-sheet")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("report-reason-스팸 또는 광고"));
    const submitBtn = screen.getByTestId("report-submit");
    expect(submitBtn.hasAttribute("disabled")).toBe(false);
  });

  it("기타 선택 시 텍스트 입력 필드 노출", async () => {
    render(<ReportButton targetType="GOAL" targetId={1} />);
    fireEvent.click(screen.getByTestId("report-button"));
    await waitFor(() => {
      expect(screen.getByTestId("report-sheet")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("report-reason-기타"));
    expect(screen.getByTestId("report-custom-reason")).toBeTruthy();
  });

  it("취소 버튼 클릭 시 시트 닫힘", async () => {
    render(<ReportButton targetType="GOAL" targetId={1} />);
    fireEvent.click(screen.getByTestId("report-button"));
    await waitFor(() => {
      expect(screen.getByTestId("report-sheet")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("report-cancel"));
    await waitFor(() => {
      expect(screen.queryByTestId("report-sheet")).toBeNull();
    });
  });

  it("CHEER 신고 — '이 응원 메시지를' 텍스트 표시", async () => {
    render(<ReportButton targetType="CHEER" targetId={42} />);
    fireEvent.click(screen.getByTestId("report-button"));
    await waitFor(() => {
      expect(screen.getByTestId("report-sheet")).toBeTruthy();
    });

    expect(screen.getByTestId("report-sheet").textContent).toContain(
      "이 응원 메시지를",
    );
  });

  it("제출 성공 시 완료 메시지 표시", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reportId: 1 }),
    });

    render(<ReportButton targetType="GOAL" targetId={1} />);
    fireEvent.click(screen.getByTestId("report-button"));
    await waitFor(() => {
      expect(screen.getByTestId("report-sheet")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("report-reason-스팸 또는 광고"));
    fireEvent.click(screen.getByTestId("report-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("report-done")).toBeTruthy();
    });
  });
});
