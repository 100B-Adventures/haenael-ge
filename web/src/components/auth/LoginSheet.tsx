"use client";

// LoginSheet.tsx — write-first 온보딩: 저장 시점에 노출되는 로그인 바텀시트
// 슬라이스 #3 실구현.
//
// UX 원칙:
//   - 사용자가 목표를 쓰고 저장하려 할 때만 등장(강제 진입 X)
//   - draft 타이틀을 표시해 "내 글이 안 날아간다"는 안심 제공
//   - 카카오 primary + 구글/애플 secondary (DESIGN.md §2)
//   - localStorage draft는 Zustand store가 관리 (이 컴포넌트에서 읽기만)
//
// 로그인 후 리다이렉트: state 파라미터로 /onboarding 전달 → draft 복원 후 저장
//
// 회장 결정 (2026-07-19): 로그인을 카카오 단일로 통일. 구글/애플 버튼은
// UI에서 숨기되(SHOW_SOCIAL_LOGIN=false), signInWithOAuth 로직·/auth/callback
// route·테스트는 그대로 보존한다 (나중 앱 출시 시 부활 예정 — 삭제 금지).

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSafeRedirectPath } from "@/lib/auth/redirect-path";
// useAppStore: draft 상태 읽기 용도 (이 컴포넌트에서 직접 사용하진 않으나 향후 확장점)
// import { useAppStore } from "@/store";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface LoginSheetProps {
  /** 시트 표시 여부 */
  open: boolean;
  /** 시트 닫기 (사용자 취소) */
  onClose: () => void;
  /** write-first: 작성 중인 목표 제목 (안심 메시지용) */
  goalTitle?: string;
  /** 로그인 후 돌아올 경로 (default: /onboarding) */
  redirectAfterLogin?: string;
}

// ─── 카카오 OAuth 시작 URL 생성 ────────────────────────────────────────────────
//
// 보안 결함 수정 (Codex 2nd-pass 결함1 — 로그인 CSRF/세션 고정):
// 카카오 인가 URL을 클라이언트에서 직접 만들지 않고, 서버 라우트
// /auth/kakao/start 를 경유한다. 그 라우트가 암호학적 nonce를 생성해
// httpOnly 쿠키에 저장하고 state에 실어 카카오로 리다이렉트한다.
// callback은 쿠키의 nonce와 state의 nonce를 대조(CSRF 방지).

function buildKakaoStartUrl(redirectAfterLogin: string): string {
  return `/auth/kakao/start?redirect=${encodeURIComponent(redirectAfterLogin)}`;
}

// ─── 구글/애플 OAuth (Supabase 네이티브) ────────────────────────────────────
//
// api-contract A1b: supabase.auth.signInWithOAuth(google/apple) — 카카오와 달리
// 커스텀 EF 없이 Supabase Auth가 provider 왕복을 전담한다. 클라이언트가
// 직접 signInWithOAuth를 호출하고, redirectTo로 /auth/callback(신규,
// exchangeCodeForSession 처리)을 지정해 세션을 확립한다.

/** redirectAfterLogin(내부 경로)을 /auth/callback?next=... 절대 URL로 인코딩 */
export function buildOAuthRedirectTo(
  origin: string,
  redirectAfterLogin: string,
): string {
  const nextPath = isSafeRedirectPath(redirectAfterLogin)
    ? redirectAfterLogin
    : "/onboarding";
  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

/** provider(google/apple) 미설정/실패 시 사용자에게 보여줄 친절한 메시지(카카오 방어 패턴 재사용) */
function describeOAuthError(providerLabel: string, message?: string): string {
  return (
    `${providerLabel} 로그인을 지금은 이용할 수 없어요.\n` +
    `(${message ?? "provider 설정을 확인해주세요"})`
  );
}

// ─── 소셜 로그인 노출 플래그 ───────────────────────────────────────────────────
//
// false = 구글/애플 버튼 숨김(카카오 단일 UX). 코드는 보존 — 이 플래그만 true로
// 되돌리면 즉시 복원된다. 관련 컴포넌트(GoogleLoginButton/AppleLoginButton)는
// 아래에서 계속 정의되며 eslint no-unused-vars 방지를 위해 여전히 참조된다.
const SHOW_SOCIAL_LOGIN = false;

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function LoginSheet({
  open,
  onClose,
  goalTitle,
  redirectAfterLogin = "/onboarding",
}: LoginSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // 바디 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // 카카오 로그인 — 전체 페이지 리다이렉트
  const handleKakaoLogin = () => {
    if (!process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY) {
      // ⛔ 카카오 앱 키 미설정: 회수 필요
      console.warn(
        "[LoginSheet] NEXT_PUBLIC_KAKAO_REST_API_KEY 미설정. 카카오 디벨로퍼에서 REST API 키를 발급하고 .env.local에 추가하세요.",
      );
      alert(
        "카카오 로그인 설정이 필요합니다.\n(개발 환경: NEXT_PUBLIC_KAKAO_REST_API_KEY를 .env.local에 추가하세요)",
      );
      return;
    }
    window.location.href = buildKakaoStartUrl(redirectAfterLogin);
  };

  // 배경 클릭으로 닫기
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!open) return null;

  return (
    // 오버레이
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center [background-color:rgba(22,_20,_15,_0.48)]!"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-label="로그인"
      data-testid="login-sheet-overlay"
    >
      {/* 바텀시트 패널 */}
      <div
        className="w-full max-w-md bg-white flex flex-col gap-0 animate-in slide-in-from-bottom-4 duration-200 rounded-tl-[20px]! rounded-tr-[20px]! pb-[env(safe-area-inset-bottom,_24px)]!"
        data-testid="login-sheet-panel"
      >
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="rounded-full [width:36px]! [height:4px]! [background-color:var(--border)]!" />
        </div>

        {/* 본문 */}
        <div className="px-6 pt-4 pb-6 flex flex-col gap-6">
          {/* 안내 메시지 */}
          <div className="flex flex-col gap-1.5">
            <p
              className="font-bold text-lg leading-snug [color:var(--foreground)]! [letter-spacing:-0.3px]!"
              // --ink
            >
              저장하려면 로그인이 필요해요
            </p>

            {goalTitle ? (
              <p
                className="text-sm leading-relaxed [color:var(--muted-foreground)]!"
                // --muted
              >
                작성 중인{" "}
                <span
                  className="font-semibold [color:var(--foreground)]!"
                  data-testid="login-sheet-goal-title"
                >
                  &ldquo;{goalTitle}&rdquo;
                </span>{" "}
                은(는) 로그인 후에도 그대로 있어요.
              </p>
            ) : (
              <p className="text-sm leading-relaxed [color:var(--muted-foreground)]!">
                로그인하면 목표를 저장하고 나만의 링크를 받을 수 있어요.
              </p>
            )}
          </div>

          {/* 로그인 버튼들 */}
          <div className="flex flex-col gap-3">
            {/* 카카오 — primary */}
            <button
              type="button"
              onClick={handleKakaoLogin}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl font-semibold text-sm h-13 transition-opacity active:opacity-80 [background-color:#FEE500]! [color:#000000]! [height:52px]! [border-radius:14px]!"
              data-testid="kakao-login-button"
              aria-label="카카오로 로그인"
            >
              {/* 카카오 아이콘 (SVG 인라인 — 공식 로고 없이 텍스트만) */}
              <KakaoIcon />
              <span>카카오로 계속하기</span>
            </button>

            {/* 구글/애플 — 회장 결정(2026-07-19)으로 카카오 단일 통일, 숨김.
                코드는 보존(SHOW_SOCIAL_LOGIN=false) — 앱 출시 시 부활 예정. */}
            {SHOW_SOCIAL_LOGIN && (
              <>
                {/* 구분선 */}
                <div
                  className="flex items-center gap-3 [color:var(--faint)]!"
                  // --faint
                >
                  <div className="flex-1 h-px [background-color:var(--border)]!" />
                  <span className="text-xs">또는</span>
                  <div className="flex-1 h-px [background-color:var(--border)]!" />
                </div>

                {/* 구글 — secondary */}
                <GoogleLoginButton redirectAfterLogin={redirectAfterLogin} />

                {/* 애플 — secondary (iOS Safari 등) */}
                <AppleLoginButton redirectAfterLogin={redirectAfterLogin} />
              </>
            )}
          </div>

          {/* 약관 고지 */}
          <p
            className="text-center text-xs leading-relaxed [color:var(--faint)]!"
            // --faint
          >
            로그인 시{" "}
            <a
              href="/terms"
              className="underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              이용약관
            </a>{" "}
            및{" "}
            <a
              href="/privacy"
              className="underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              개인정보처리방침
            </a>
            에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

function KakaoIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      {/* 카카오 말풍선 심볼 단순화 버전 */}
      <ellipse cx="10" cy="9" rx="8.5" ry="7.5" fill="#000000" />
      <path
        d="M6 13.5 C5.5 15 5 16 5 16 C6 15.5 7.5 14.5 8.5 13.8"
        fill="#000000"
      />
    </svg>
  );
}

// export: 카카오 단일 통일로 렌더에서는 숨겨졌지만(SHOW_SOCIAL_LOGIN),
// 로직 자체는 보존 — 테스트가 이 컴포넌트를 직접 렌더해 회귀를 검증한다.
export function GoogleLoginButton({
  redirectAfterLogin,
}: {
  redirectAfterLogin: string;
}) {
  const [pending, setPending] = useState(false);

  const handleGoogleLogin = async () => {
    if (pending) return;
    setPending(true);
    try {
      const supabase = createClient();
      const redirectTo = buildOAuthRedirectTo(
        window.location.origin,
        redirectAfterLogin,
      );
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        // 프로젝트에서 Google provider가 비활성화된 경우 등 — 카카오 방어 패턴과 동일하게
        // raw 에러를 그대로 노출하지 않고 친절한 메시지로 대체.
        console.warn("[LoginSheet] Google signInWithOAuth error:", error);
        alert(describeOAuthError("Google", error.message));
        setPending(false);
      }
      // 성공 시 이 지점부터 전체 페이지 리다이렉트가 일어나므로 setPending(false) 불필요
    } catch (err) {
      console.error("[LoginSheet] Google 로그인 예외:", err);
      alert(describeOAuthError("Google"));
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={pending}
      className="w-full flex items-center justify-center gap-2.5 rounded-xl font-medium text-sm transition-opacity active:opacity-80 disabled:opacity-60 [height:48px]! [border-radius:14px]! [background-color:var(--card)]! [color:var(--foreground)]! [border:1px_solid_var(--border)]!"
      data-testid="google-login-button"
      aria-label="구글로 로그인"
    >
      <GoogleIcon />
      <span>Google로 계속하기</span>
    </button>
  );
}

export function AppleLoginButton({
  redirectAfterLogin,
}: {
  redirectAfterLogin: string;
}) {
  const [pending, setPending] = useState(false);

  const handleAppleLogin = async () => {
    if (pending) return;
    setPending(true);
    try {
      const supabase = createClient();
      const redirectTo = buildOAuthRedirectTo(
        window.location.origin,
        redirectAfterLogin,
      );
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo },
      });

      if (error) {
        // Apple은 Supabase 프로젝트 + Apple Developer(Services ID·Team ID·Key) 설정이
        // 별도 필요 — 미설정 시 Supabase가 반환하는 에러를 그대로 방어 처리.
        console.warn("[LoginSheet] Apple signInWithOAuth error:", error);
        alert(describeOAuthError("Apple", error.message));
        setPending(false);
      }
    } catch (err) {
      console.error("[LoginSheet] Apple 로그인 예외:", err);
      alert(describeOAuthError("Apple"));
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleAppleLogin}
      disabled={pending}
      className="w-full flex items-center justify-center gap-2.5 rounded-xl font-medium text-sm transition-opacity active:opacity-80 disabled:opacity-60 [height:48px]! [border-radius:14px]! [background-color:var(--foreground)]! [color:var(--card)]!"
      data-testid="apple-login-button"
      aria-label="애플로 로그인"
    >
      <AppleIcon />
      <span>Apple로 계속하기</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7963 2.7164v2.2581h2.9087C16.6582 14.0127 17.64 11.8 17.64 9.2045z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1814l-2.9087-2.2581c-.8059.54-1.8368.8595-3.0477.8595-2.3441 0-4.3282-1.5836-5.036-3.7105H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9573C.3468 6.1732 0 7.5477 0 9s.3468 2.8268.9573 4.0418L3.964 10.71z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5814-2.5814C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1632 6.6559 3.5795 9 3.5795z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.3258 0C11.2567 0.0671875 9.99986 0.740625 9.25736 1.63437C8.58236 2.45156 8.03548 3.66875 8.27736 4.85312C9.44173 4.88906 10.6511 4.19531 11.3705 3.28125C12.042 2.43125 12.5417 1.22656 12.3258 0Z" />
      <path d="M16.1548 6.06992C15.2235 4.97617 13.9251 4.33867 12.6938 4.33867C11.0579 4.33867 10.3704 5.10742 9.22663 5.10742C8.04788 5.10742 7.15976 4.34102 5.74413 4.34102C4.36226 4.34102 2.88726 5.21133 1.95288 6.67383C0.621634 8.76992 0.848509 12.7137 3.00163 16.0387C3.80163 17.2809 4.87663 18.6762 6.28913 18.6887C7.54601 18.7012 7.89288 17.9043 9.24413 17.8965C10.5954 17.8887 10.9173 18.7012 12.1704 18.6887C13.5829 18.6762 14.7204 17.1106 15.5204 15.8684C16.0923 14.9965 16.3048 14.5574 16.7548 13.5715C13.5923 12.3293 13.0813 7.7543 16.1548 6.06992Z" />
    </svg>
  );
}
