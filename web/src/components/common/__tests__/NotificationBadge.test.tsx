// NotificationBadge.test.tsx — vitest + RTL
// Supabase 클라이언트 모킹해 컴포넌트 렌더·인터랙션 테스트.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationBadge } from "../NotificationBadge";

// Supabase 클라이언트 모킹
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockUpdate = vi.fn();
const mockIn = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "notification") {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {};
    },
  }),
}));

// 알림 클릭 라우팅(2026-07-21) 검증용 — next/navigation useRouter 모킹.
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  vi.clearAllMocks();

  // 기본: 빈 알림 목록
  mockSelect.mockReturnValue({
    order: mockOrder.mockReturnValue({
      limit: mockLimit.mockResolvedValue({ data: [], error: null }),
    }),
  });
  mockUpdate.mockReturnValue({
    in: mockIn.mockResolvedValue({ error: null }),
    eq: mockEq.mockResolvedValue({ error: null }),
  });
});

describe("NotificationBadge", () => {
  it("로딩 상태에서 렌더됨", () => {
    render(<NotificationBadge />);
    // 로딩 or 버튼 중 하나
    const loading = screen.queryByTestId("notification-badge-loading");
    const button = screen.queryByTestId("notification-badge-button");
    expect(loading !== null || button !== null).toBe(true);
  });

  it("알림 없으면 배지 숫자 표시 안 함", async () => {
    render(<NotificationBadge />);
    await waitFor(() => {
      expect(screen.getByTestId("notification-badge-button")).toBeTruthy();
    });
    expect(screen.queryByTestId("notification-unread-count")).toBeNull();
  });

  it("읽지 않은 알림이 있으면 숫자 배지 표시", async () => {
    const fakeNotifs = [
      {
        id: 1,
        member_id: "uuid-1",
        type: "CHEER_RECEIVED",
        channel: "INAPP",
        alimtalk_status: null,
        read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        member_id: "uuid-1",
        type: "CHEER_RECEIVED",
        channel: "INAPP",
        alimtalk_status: null,
        read: false,
        created_at: new Date().toISOString(),
      },
    ];

    mockSelect.mockReturnValue({
      order: mockOrder.mockReturnValue({
        limit: mockLimit.mockResolvedValue({ data: fakeNotifs, error: null }),
      }),
    });

    render(<NotificationBadge />);
    await waitFor(() => {
      expect(screen.getByTestId("notification-unread-count")).toBeTruthy();
    });

    const badge = screen.getByTestId("notification-unread-count");
    expect(badge.textContent).toBe("2");
  });

  it("읽지 않은 알림 9개 초과 시 '9+' 표시", async () => {
    const fakeNotifs = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      member_id: "uuid-1",
      type: "CHEER_RECEIVED",
      channel: "INAPP",
      alimtalk_status: null,
      read: false,
      created_at: new Date().toISOString(),
    }));

    mockSelect.mockReturnValue({
      order: mockOrder.mockReturnValue({
        limit: mockLimit.mockResolvedValue({ data: fakeNotifs, error: null }),
      }),
    });

    render(<NotificationBadge />);
    await waitFor(() => {
      expect(screen.getByTestId("notification-unread-count")).toBeTruthy();
    });

    const badge = screen.getByTestId("notification-unread-count");
    expect(badge.textContent).toBe("9+");
  });

  it("버튼 클릭 시 드롭다운 열림", async () => {
    render(<NotificationBadge />);
    await waitFor(() => {
      expect(screen.getByTestId("notification-badge-button")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("notification-badge-button"));
    await waitFor(() => {
      expect(screen.getByTestId("notification-dropdown")).toBeTruthy();
    });
  });

  it("빈 알림 목록 — empty 상태 표시", async () => {
    render(<NotificationBadge />);
    await waitFor(() => {
      expect(screen.getByTestId("notification-badge-button")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("notification-badge-button"));
    await waitFor(() => {
      expect(screen.getByTestId("notification-empty")).toBeTruthy();
    });

    expect(screen.getByTestId("notification-empty").textContent).toContain(
      "알림이 없어요",
    );
  });

  it("알림 있으면 목록 항목 렌더", async () => {
    const fakeNotifs = [
      {
        id: 1,
        member_id: "uuid-1",
        type: "CHEER_RECEIVED",
        channel: "ALIMTALK",
        alimtalk_status: "SENT",
        read: true,
        created_at: new Date().toISOString(),
      },
    ];
    mockSelect.mockReturnValue({
      order: mockOrder.mockReturnValue({
        limit: mockLimit.mockResolvedValue({ data: fakeNotifs, error: null }),
      }),
    });

    render(<NotificationBadge />);
    await waitFor(() => {
      expect(screen.getByTestId("notification-badge-button")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("notification-badge-button"));
    await waitFor(() => {
      expect(screen.getAllByTestId("notification-item").length).toBe(1);
    });
  });

  // 2026-07-21 회장 지시: 알림 클릭 → 해당 링크(받는사람 홈)로 라우팅.
  it("알림 클릭 시 /me로 라우팅한다", async () => {
    const fakeNotifs = [
      {
        id: 1,
        member_id: "uuid-1",
        type: "CHEER_RECEIVED",
        channel: "INAPP",
        alimtalk_status: null,
        read: false,
        created_at: new Date().toISOString(),
      },
    ];
    mockSelect.mockReturnValue({
      order: mockOrder.mockReturnValue({
        limit: mockLimit.mockResolvedValue({ data: fakeNotifs, error: null }),
      }),
    });

    render(<NotificationBadge />);
    await waitFor(() => {
      expect(screen.getByTestId("notification-badge-button")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("notification-badge-button"));
    await waitFor(() => {
      expect(screen.getAllByTestId("notification-item").length).toBe(1);
    });

    fireEvent.click(screen.getAllByTestId("notification-item")[0]);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/me");
    });
  });
});
