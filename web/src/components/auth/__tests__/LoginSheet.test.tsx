// LoginSheet.test.tsx — vitest + React Testing Library
// 로컬 Supabase 없이 순수 컴포넌트 단위 테스트.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginSheet } from "../LoginSheet";
import { buildOAuthRedirectTo, GoogleLoginButton, AppleLoginButton } from "../LoginSheet";

// Supabase 클라이언트 모킹 — signInWithOAuth 호출 검증용
const mockSignInWithOAuth = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

// 환경 변수 모킹
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_REST_API_KEY", "test_kakao_key_12345");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  mockSignInWithOAuth.mockReset();
  mockSignInWithOAuth.mockResolvedValue({ data: { url: null, provider: "google" }, error: null });
});

// window.location.href mock (jsdom 에서 직접 할당 불가)
const mockAssign = vi.fn();
Object.defineProperty(window, "location", {
  value: {
    ...window.location,
    origin: "http://localhost:3000",
    get href() {
      return "http://localhost:3000";
    },
    set href(url: string) {
      mockAssign(url);
    },
  },
  writable: true,
});

describe("LoginSheet", () => {
  it("open=false 일 때 렌더링 안 됨", () => {
    render(<LoginSheet open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("login-sheet-overlay")).not.toBeInTheDocument();
  });

  it("open=true 일 때 오버레이와 패널 렌더링", () => {
    render(<LoginSheet open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("login-sheet-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("login-sheet-panel")).toBeInTheDocument();
  });

  it("카카오 로그인 버튼이 표시됨", () => {
    render(<LoginSheet open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("kakao-login-button")).toBeInTheDocument();
    expect(screen.getByText("카카오로 계속하기")).toBeInTheDocument();
  });

  it("카카오 단일 통일(2026-07-19) — 구글/애플 버튼은 렌더에서 숨겨짐, '또는' 구분선도 없음", () => {
    render(<LoginSheet open={true} onClose={vi.fn()} />);
    expect(screen.queryByTestId("google-login-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("apple-login-button")).not.toBeInTheDocument();
    expect(screen.queryByText("또는")).not.toBeInTheDocument();
  });

  it("goalTitle 있을 때 draft 제목 표시", () => {
    render(
      <LoginSheet open={true} onClose={vi.fn()} goalTitle="올해 안에 책 10권 읽기" />,
    );
    expect(screen.getByTestId("login-sheet-goal-title")).toHaveTextContent(
      "올해 안에 책 10권 읽기",
    );
  });

  it("goalTitle 없을 때 기본 안내 메시지 표시", () => {
    render(<LoginSheet open={true} onClose={vi.fn()} />);
    expect(screen.getByText(/로그인하면 목표를 저장하고/)).toBeInTheDocument();
  });

  it("오버레이 클릭 시 onClose 호출", () => {
    const onClose = vi.fn();
    render(<LoginSheet open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("login-sheet-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ESC 키 누를 때 onClose 호출", () => {
    const onClose = vi.fn();
    render(<LoginSheet open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("카카오 버튼 클릭 시 서버 라우트 /auth/kakao/start 로 이동 (CSRF 방지 — nonce는 서버가 생성)", () => {
    // 보안 결함1 수정: 클라이언트는 카카오 인가 URL을 직접 만들지 않는다.
    // /auth/kakao/start 가 서버에서 nonce를 생성해 state에 실어야 CSRF/세션
    // 고정을 막을 수 있으므로, 클라이언트는 이 서버 라우트로만 위임한다.
    mockAssign.mockClear();
    render(<LoginSheet open={true} onClose={vi.fn()} redirectAfterLogin="/onboarding" />);
    fireEvent.click(screen.getByTestId("kakao-login-button"));

    expect(mockAssign).toHaveBeenCalledTimes(1);
    const calledUrl = mockAssign.mock.calls[0][0] as string;

    expect(calledUrl).toBe(
      `/auth/kakao/start?redirect=${encodeURIComponent("/onboarding")}`,
    );
    // 클라이언트가 카카오 도메인이나 client_id를 직접 다루지 않음을 보장
    expect(calledUrl).not.toContain("kauth.kakao.com");
    expect(calledUrl).not.toContain("client_id");
  });

  // 회장 결정(2026-07-19): 카카오 단일 통일로 LoginSheet 렌더에서는 숨겼지만,
  // GoogleLoginButton/AppleLoginButton 컴포넌트와 signInWithOAuth 로직은
  // 앱 출시 시 부활을 위해 보존한다. 아래 테스트는 그 로직이 여전히 정상
  // 동작함을 컴포넌트를 직접 렌더해 검증한다(회귀 방지).
  it("[보존] 구글 로그인 버튼 클릭 시 Supabase signInWithOAuth(google)를 /auth/callback redirectTo로 호출", async () => {
    render(<GoogleLoginButton redirectAfterLogin="/onboarding" />);
    fireEvent.click(screen.getByTestId("google-login-button"));

    await waitFor(() => expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1));
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `http://localhost:3000/auth/callback?next=${encodeURIComponent("/onboarding")}`,
      },
    });
  });

  it("[보존] 애플 로그인 버튼 클릭 시 Supabase signInWithOAuth(apple)를 /auth/callback redirectTo로 호출", async () => {
    render(<AppleLoginButton redirectAfterLogin="/onboarding" />);
    fireEvent.click(screen.getByTestId("apple-login-button"));

    await waitFor(() => expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1));
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "apple",
      options: {
        redirectTo: `http://localhost:3000/auth/callback?next=${encodeURIComponent("/onboarding")}`,
      },
    });
  });

  it("[보존] Google provider 미설정 등 에러 반환 시 alert로 친절한 메시지 표시(raw 에러 노출 금지)", async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { url: null, provider: "google" },
      error: { message: "Unsupported provider: provider is not enabled", status: 400 },
    });
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<GoogleLoginButton redirectAfterLogin="/onboarding" />);
    fireEvent.click(screen.getByTestId("google-login-button"));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(alertSpy.mock.calls[0][0]).toContain("Google");
    alertSpy.mockRestore();
  });

  it("buildOAuthRedirectTo는 안전하지 않은 경로를 /onboarding으로 폴백한다", () => {
    expect(buildOAuthRedirectTo("http://localhost:3000", "//evil.example")).toBe(
      `http://localhost:3000/auth/callback?next=${encodeURIComponent("/onboarding")}`,
    );
    expect(buildOAuthRedirectTo("http://localhost:3000", "/goal/abc")).toBe(
      `http://localhost:3000/auth/callback?next=${encodeURIComponent("/goal/abc")}`,
    );
  });

  it("약관/개인정보 링크가 존재함", () => {
    render(<LoginSheet open={true} onClose={vi.fn()} />);
    expect(screen.getByText("이용약관")).toHaveAttribute("href", "/terms");
    expect(screen.getByText("개인정보처리방침")).toHaveAttribute("href", "/privacy");
  });
});
