// WordmapShareIcons.test.tsx — 슬라이스 #9 공유 아이콘 단위 테스트

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WordmapShareIcons } from "../WordmapShareIcons";

// ── Supabase 클라이언트 모킹 ──────────────────────────────────────────────────
const mockGetSession = vi.fn();
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: mockGetSession },
    from: mockFrom,
  }),
}));

// ── 환경 변수 모킹 ────────────────────────────────────────────────────────────
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");

// ── fetch 모킹 ────────────────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ── clipboard 모킹 ────────────────────────────────────────────────────────────
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  configurable: true,
  writable: true,
});

// ── Canvas 모킹 (jsdom에 미구현) ──────────────────────────────────────────────
const mockToBlob = vi.fn((cb: BlobCallback) => cb(new Blob(["png"], { type: "image/png" })));
const mockGetContext = vi.fn(() => ({
  fillStyle: "",
  fillRect: vi.fn(),
  drawImage: vi.fn(),
}));
HTMLCanvasElement.prototype.getContext = mockGetContext as unknown as typeof HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.toBlob = mockToBlob;

// ── URL 모킹 ─────────────────────────────────────────────────────────────────
const mockCreateObjectURL = vi.fn(() => "blob:mock");
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

const DEFAULT_PROPS = {
  goalId: 1,
  goalSlug: "test-slug",
  goalTitle: "편입 평점 4.0 해낼게",
};

describe("WordmapShareIcons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "mock-token" } },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () =>
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect/></svg>`,
      json: async () => ({ imageUrl: "http://localhost:54321/storage/v1/object/public/wordmap-images/goal-1/wordmap.svg" }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 렌더 ─────────────────────────────────────────────────────────────────

  it("공유 아이콘 3종 렌더", () => {
    render(<WordmapShareIcons {...DEFAULT_PROPS} />);
    expect(screen.getByTestId("wordmap-share-icons")).toBeInTheDocument();
    expect(screen.getByTestId("share-save-image")).toBeInTheDocument();
    expect(screen.getByTestId("share-instagram")).toBeInTheDocument();
    expect(screen.getByTestId("share-copy-link")).toBeInTheDocument();
  });

  it("aria-label 확인", () => {
    render(<WordmapShareIcons {...DEFAULT_PROPS} />);
    expect(screen.getByRole("button", { name: "이미지 저장" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "인스타 공유" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "링크 복사" })).toBeInTheDocument();
  });

  it("초기 토스트 없음", () => {
    render(<WordmapShareIcons {...DEFAULT_PROPS} />);
    expect(screen.queryByTestId("share-toast")).not.toBeInTheDocument();
  });

  // ── 링크 복사 ─────────────────────────────────────────────────────────────

  it("링크 복사 클릭 → clipboard.writeText 호출", async () => {
    render(<WordmapShareIcons {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByTestId("share-copy-link"));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining("/g/test-slug"),
      );
    });
  });

  it("링크 복사 성공 → 토스트 표시", async () => {
    render(<WordmapShareIcons {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByTestId("share-copy-link"));

    await waitFor(() => {
      expect(screen.getByTestId("share-toast")).toBeInTheDocument();
      expect(screen.getByTestId("share-toast")).toHaveTextContent(
        "링크가 복사됐어요.",
      );
    });
  });

  it("링크 복사 → share_event INSERT(LINK) 호출", async () => {
    render(<WordmapShareIcons {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByTestId("share-copy-link"));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("share_event");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ goal_id: 1, channel: "LINK" }),
      );
    });
  });

  // ── clipboard 실패 ────────────────────────────────────────────────────────

  it("clipboard 실패 → 에러 토스트", async () => {
    mockWriteText.mockRejectedValueOnce(new Error("denied"));
    render(<WordmapShareIcons {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByTestId("share-copy-link"));

    await waitFor(() => {
      expect(screen.getByTestId("share-toast")).toHaveTextContent(
        "복사에 실패했어요",
      );
    });
  });

  // ── 금액 비노출 ───────────────────────────────────────────────────────────

  it("금액·클로버 수치 노출 없음", () => {
    const { container } = render(<WordmapShareIcons {...DEFAULT_PROPS} />);
    expect(container.textContent).not.toMatch(/₩|[0-9]+원|클로버 [0-9]+개/);
  });
});
