// LoginSheet.test.tsx — vitest + React Testing Library
// 로컬 Supabase 없이 순수 컴포넌트 단위 테스트.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginSheet } from "../LoginSheet";

// 환경 변수 모킹
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_KAKAO_REST_API_KEY", "test_kakao_key_12345");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
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

  it("구글 로그인 버튼이 표시됨", () => {
    render(<LoginSheet open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("google-login-button")).toBeInTheDocument();
  });

  it("애플 로그인 버튼이 표시됨", () => {
    render(<LoginSheet open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId("apple-login-button")).toBeInTheDocument();
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

  it("카카오 버튼 클릭 시 Kakao OAuth URL로 이동", () => {
    mockAssign.mockClear();
    render(<LoginSheet open={true} onClose={vi.fn()} redirectAfterLogin="/onboarding" />);
    fireEvent.click(screen.getByTestId("kakao-login-button"));

    expect(mockAssign).toHaveBeenCalledTimes(1);
    const calledUrl = mockAssign.mock.calls[0][0] as string;

    // Kakao OAuth URL 검증
    expect(calledUrl).toContain("kauth.kakao.com/oauth/authorize");
    expect(calledUrl).toContain("client_id=test_kakao_key_12345");
    expect(calledUrl).toContain("response_type=code");
    expect(calledUrl).toContain(encodeURIComponent("/auth/kakao/callback"));
    // state에 redirectAfterLogin 인코딩됨
    expect(calledUrl).toContain(encodeURIComponent("/onboarding"));
  });

  it("약관/개인정보 링크가 존재함", () => {
    render(<LoginSheet open={true} onClose={vi.fn()} />);
    expect(screen.getByText("이용약관")).toHaveAttribute("href", "/terms");
    expect(screen.getByText("개인정보처리방침")).toHaveAttribute("href", "/privacy");
  });
});
