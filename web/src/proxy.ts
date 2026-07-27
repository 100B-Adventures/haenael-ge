// proxy.ts — canonical 도메인 강제 (Next.js 16 "middleware" → "proxy" 개명, 2026-07-19)
//
// 근본원인: /auth/kakao/start 가 여러 vercel.app 도메인(web-two-theta-bmil2ljwdg.vercel.app,
// haenaelge.vercel.app 등)에서 열리는데 콜백은 NEXT_PUBLIC_APP_URL 한 도메인(canonical)
// 고정 → nonce 쿠키가 도메인 경계를 못 넘어 100% invalid_state.
//
// 해결: canonical 도메인(haenael-ge.vercel.app) 이외의 *.vercel.app "production" 별칭
// 호스트로 들어오면 동일 path+query로 canonical에 308 permanent redirect.
// → start가 항상 canonical에서 실행되고, nonce 쿠키도 canonical에 세팅되며, 콜백도
//   canonical이라 도메인이 일치한다.
//
// 예외(리다이렉트 금지 — 정확 매칭만 리다이렉트, 그 외 전부 통과):
//   - localhost / 127.0.0.1 (로컬 개발)
//   - Vercel preview 배포 도메인 (예: *-git-*.vercel.app, 해시 프리뷰
//     web-abc123xyz.vercel.app) — canonical과 정확히 일치하지 않는 모든 프리뷰/기타
//     호스트는 무조건 통과시킨다. "리다이렉트 대상"은 미리 알려진 레거시 production
//     별칭 호스트만 화이트리스트로 명시한다 — 아는 것만 리다이렉트, 모르는 건 통과.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL_HOST = "haenael-ge.vercel.app";

// 서버 로그로 확정된, canonical과 다른 레거시 production 별칭 호스트만 화이트리스트.
// (프리뷰 해시 도메인은 여기 넣지 않는다 — 매번 바뀌므로 정확 매칭 화이트리스트가
// 아니라 "canonical이 아니면 다 통과"가 기본이고, 이 목록은 알려진 레거시 별칭만
// 명시적으로 리다이렉트 대상에 포함하기 위한 것이다.)
const KNOWN_LEGACY_HOSTS = new Set([
  "web-two-theta-bmil2ljwdg.vercel.app",
  "haenaelge.vercel.app",
]);

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

// Vercel preview 별칭 패턴: {project}-git-{branch}-{team}.vercel.app,
// {project}-{hash}-{team}.vercel.app 등 — canonical과 정확 일치하지 않으면
// 전부 preview/기타로 간주해 통과. 단, "알려진 레거시 production 별칭"만은
// 예외적으로 리다이렉트 대상.
function shouldRedirectToCanonical(hostname: string): boolean {
  if (hostname === CANONICAL_HOST) return false;
  if (isLocalHost(hostname)) return false;
  return KNOWN_LEGACY_HOSTS.has(hostname);
}

export function proxy(request: NextRequest) {
  const url = new URL(request.url);
  const hostname = url.hostname;

  if (shouldRedirectToCanonical(hostname)) {
    const canonicalUrl = new URL(url.pathname + url.search, `https://${CANONICAL_HOST}`);
    return NextResponse.redirect(canonicalUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  // 정적자산(_next/static, _next/image, favicon 등)은 제외 — canonical 강제는
  // 페이지·API·auth 라우트에만 필요하고 자산까지 걸면 프리뷰 배포의 리소스 로딩이
  // 불필요하게 canonical로 튄다(그리고 리소스는 302 체인이 캐시를 깨뜨릴 수 있음).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
