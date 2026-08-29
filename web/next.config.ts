import path from "node:path";
import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Browser integration inventory:
 * - Supabase REST/Auth/Storage/Edge Functions and optional Realtime websocket
 * - Toss Payments v2 SDK and its hosted payment UI
 * - Google Analytics 4 (gtag.js)
 * - Arbitrary HTTPS profile images stored by connected identity providers
 *
 * Kakao OAuth is a top-level redirect, not an embedded resource. Vercel Analytics
 * is not installed, so neither receives a CSP exception.
 */
export function buildContentSecurityPolicy(development: boolean) {
  return [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://*.tosspayments.com https://*.toss.im",
  [
    "script-src 'self' 'unsafe-inline'",
    isDevelopment ? "'unsafe-eval'" : "",
    "https://js.tosspayments.com",
    "https://www.googletagmanager.com",
  ]
    .filter(Boolean)
    .join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    development ? "http://127.0.0.1:54321" : "",
    development ? "ws://127.0.0.1:54321" : "",
    development ? "http://localhost:54321" : "",
    development ? "ws://localhost:54321" : "",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://*.tosspayments.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://www.googletagmanager.com",
  ].filter(Boolean).join(" "),
  "frame-src https://*.tosspayments.com https://*.toss.im",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "manifest-src 'self'",
  ].join("; ");
}

export const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy(isDevelopment);

export const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), accelerometer=(), gyroscope=(), magnetometer=(), usb=(), browsing-topics=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
] as const;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [...SECURITY_HEADERS],
      },
    ];
  },
  // qa-verifier 2026-07-14: /Users/sj/package-lock.json(무관 스트레이 파일)이
  // Turbopack의 workspace-root 추정을 오염시켜 dev 모드 500(React Client Manifest
  // 모듈 미발견) 유발 — 명시적으로 이 web/ 디렉토리를 root로 고정해 해결.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
