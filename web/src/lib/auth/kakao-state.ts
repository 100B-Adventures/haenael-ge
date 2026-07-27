// lib/auth/kakao-state.ts — 카카오 OAuth state/nonce 유틸
//
// 보안 결함 수정 (Codex 2nd-pass 결함1 — 로그인 CSRF/세션 고정):
// 기존 buildKakaoOAuthUrl은 state에 redirect 경로만 담고, callback이 state를
// 브라우저 세션과 대조하지 않았다. 공격자가 자기 인가코드로 만든 콜백 링크를
// 피해자에게 보내면(코드 재사용 불가라 실제로는 자기 계정 링크지만, state가
// 없으면 CSRF로 임의 콜백 흐름을 트리거할 수 있음) 피해자가 클릭 시 원치 않는
// 계정 상태로 전이될 수 있다.
//
// 수정: /auth/kakao/start 에서 암호학적 랜덤 nonce를 생성해 httpOnly 쿠키에
// 저장하고, state = `${nonce}.${encodeURIComponent(path)}` 로 인코딩한다.
// callback에서 쿠키의 nonce와 state의 nonce를 상수시간 비교로 대조한다.

import { isSafeRedirectPath } from "./redirect-path";

export const KAKAO_OAUTH_NONCE_COOKIE = "kakao_oauth_nonce";

/** 암호학적으로 안전한 랜덤 nonce (base64url, 32바이트 → 43자). */
export function generateOAuthNonce(): string {
  const bytes = new Uint8Array(32);
  // Web Crypto — Next.js Route Handler(node/edge 런타임) 양쪽에서 사용 가능.
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** state = nonce + "." + encodeURIComponent(redirectPath) */
export function buildOAuthState(nonce: string, redirectPath: string): string {
  return `${nonce}.${encodeURIComponent(redirectPath)}`;
}

export interface ParsedOAuthState {
  nonce: string;
  redirectPath: string;
}

/**
 * state 문자열을 nonce + redirectPath 로 파싱한다.
 * redirectPath는 이 지점에서도 화이트리스트 검증한다(이중 방어 — 결함2).
 */
export function parseOAuthState(state: unknown): ParsedOAuthState | null {
  if (typeof state !== "string" || !state) return null;
  const dotIndex = state.indexOf(".");
  if (dotIndex <= 0) return null;

  const nonce = state.slice(0, dotIndex);
  const encodedPath = state.slice(dotIndex + 1);
  if (!nonce) return null;

  let redirectPath: string;
  try {
    redirectPath = decodeURIComponent(encodedPath);
  } catch {
    return null;
  }

  if (!isSafeRedirectPath(redirectPath)) return null;

  return { nonce, redirectPath };
}

/**
 * 상수시간 문자열 비교(timing attack 방지).
 * 길이가 다르면 즉시 false를 반환하되, 그 자체가 정보 유출로 악용되기엔
 * nonce가 고정 길이(43자, base64url 32바이트)라 실질 위험 없음.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
