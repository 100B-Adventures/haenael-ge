// OnboardingGoalForm.test.tsx — 회장 지시(2026-07-19) "링크는 로그인 이후에만 발급하라" 회귀 테스트
// + 다중 목표(설계 §4.4~4.6, 2026-09-21) create_goal RPC 전환 + 상한 안내 테스트
//
// 결함이었던 동작: 마운트 effect가 draft가 있고 user(기존 세션)가 존재하면
// "저장" 버튼을 누른 적이 없어도 자동으로 saveGoalToDB를 호출해 링크를 발급했다.
// 카카오 SSO 세션이 살아있으면 onboarding 재방문만으로 링크가 생기는 문제.
//
// 수정: "저장하고 내 링크 받기" 버튼을 실제로 눌렀을 때만 draft.utils의
// saveSaveIntent()로 의도를 마킹하고, 마운트 effect는 hasSaveIntent()가
// true인 draft만 로그인 후 1회 자동 커밋한다.
//
// 다중 목표 전환(2026-09-21): 직접 INSERT가 create_goal RPC 호출로 바뀌었다
// (DB가 테이블 직접 INSERT 권한을 회수했다). 상한 초과는 goal_limit_reached
// 오류로 오고, 온보딩 폼은 /me로 쫓아내지 않고 draft를 보존한 채 인라인 안내만 한다.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { OnboardingGoalForm } from "../OnboardingGoalForm";
import { loadDraft, hasSaveIntent, clearDraft, clearSaveIntent } from "@/lib/utils/draft";

const mockRpc = vi.fn();
const mockTrackEvent = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));

// 기본값은 성공(slug 반환). 상한 초과 테스트만 이 값을 override.
let mockRpcResult: { data: unknown; error: { message: string } | null } = {
  data: [{ slug: "test-slug" }],
  error: null,
};

vi.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { onAuthStateChange: mockOnAuthStateChange },
    rpc: (...args: unknown[]) => {
      mockRpc(...args);
      return Promise.resolve(mockRpcResult);
    },
  }),
}));

const fakeUser = { id: "user-1", email: "test@example.com" } as unknown as User;

function fillForm() {
  fireEvent.change(screen.getByTestId("goal-title-input"), {
    target: { value: "편입 평점 4.0" },
  });
  fireEvent.change(screen.getByTestId("goal-due-date-input"), {
    target: { value: "2026-12-31" },
  });
}

describe("OnboardingGoalForm — 링크는 로그인 이후에만 발급 (회장 2026-07-19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockRpcResult = { data: [{ slug: "test-slug" }], error: null };
  });

  it("① 미인증 상태에서 저장 클릭 → LoginSheet만 뜨고 DB 저장은 안 함", async () => {
    render(<OnboardingGoalForm initialUser={null} />);
    fillForm();
    fireEvent.click(screen.getByTestId("save-goal-button"));

    await waitFor(() => {
      expect(screen.getByTestId("login-sheet-overlay")).toBeInTheDocument();
    });
    expect(mockRpc).not.toHaveBeenCalled();

    // draft는 저장되고, 저장 "의도"도 마킹돼야 로그인 후 자동커밋이 성립
    expect(loadDraft()?.title).toBe("편입 평점 4.0");
    expect(hasSaveIntent()).toBe(true);
  });

  it("② [핵심 회귀] 저장 버튼을 누른 적 없이 draft+세션만 있는 재방문 → 마운트 시 자동 커밋 안 함", async () => {
    // 사용자가 예전에 입력만 하고 창을 닫았다가(저장 클릭 없음), 이후 다른 탭에서
    // 카카오 세션이 살아있는 채로 /onboarding을 재방문하는 시나리오를 재현.
    localStorage.setItem(
      "haenael_goal_draft",
      JSON.stringify({
        title: "편입 평점 4.0",
        reason: "",
        due_date: "2026-12-31",
        savedAt: new Date().toISOString(),
      }),
    );
    // saveSaveIntent()를 호출하지 않음 = 저장 버튼을 누른 적 없음.
    expect(hasSaveIntent()).toBe(false);

    render(<OnboardingGoalForm initialUser={fakeUser} />);

    // 자동저장이 발생하면 isSaving 스피너("saving-state")가 뜨는데, 발생하면 안 됨.
    await waitFor(() => {
      expect(screen.getByTestId("onboarding-form")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("saving-state")).not.toBeInTheDocument();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalledWith(
      "goal_created",
      expect.anything(),
    );
  });

  it("③ 저장 의도가 있던 draft가 로그인 후 복귀 시 1회 자동 커밋됨", async () => {
    localStorage.setItem(
      "haenael_goal_draft",
      JSON.stringify({
        title: "편입 평점 4.0",
        reason: "",
        due_date: "2026-12-31",
        savedAt: new Date().toISOString(),
      }),
    );
    localStorage.setItem("haenael_save_intent", "1"); // 저장 버튼을 눌렀던 흔적

    render(<OnboardingGoalForm initialUser={fakeUser} />);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });
    expect(mockRpc).toHaveBeenCalledWith(
      "create_goal",
      expect.objectContaining({ p_title: "편입 평점 4.0" }),
    );
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith("goal_created", {
        source: "oauth_return",
      });
    });

    // 커밋 후 draft/의도 플래그는 정리돼 재커밋되지 않아야 함
    expect(hasSaveIntent()).toBe(false);
  });

  it("이미 로그인된 사용자가 저장 버튼을 누르면 즉시 저장(정상 유지)", async () => {
    render(<OnboardingGoalForm initialUser={fakeUser} />);
    fillForm();
    fireEvent.click(screen.getByTestId("save-goal-button"));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });
    expect(hasSaveIntent()).toBe(false);
  });

  it("④ [다중 목표 설계 §4.6] 상한(3개) 도달 시 /me로 쫓아내지 않고 draft를 보존한 채 인라인 안내", async () => {
    mockRpcResult = {
      data: null,
      error: { message: "goal_limit_reached" },
    };
    render(<OnboardingGoalForm initialUser={fakeUser} />);
    fillForm();
    fireEvent.click(screen.getByTestId("save-goal-button"));

    await waitFor(() => {
      expect(
        screen.getByText(/진행 중인 목표가 이미 3개예요/),
      ).toBeInTheDocument();
    });
    // 쓴 글을 날리지 않는다: 폼이 그대로 남아 입력값을 유지해야 함.
    expect(screen.getByTestId("onboarding-form")).toBeInTheDocument();
    expect(screen.getByTestId("goal-title-input")).toHaveValue("편입 평점 4.0");
  });
});

// 테스트 격리를 위한 사후 정리 (localStorage.clear()로 충분하지만 명시적으로 유틸도 호출)
afterEach(() => {
  clearDraft();
  clearSaveIntent();
});
