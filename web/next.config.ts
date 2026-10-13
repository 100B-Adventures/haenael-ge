import { readFileSync } from "node:fs";
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
function localSupabaseCspOrigins(supabaseUrl: string | undefined) {
  if (!supabaseUrl) return [];
  try {
    const url = new URL(supabaseUrl);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return [];
    if (!["http:", "https:"].includes(url.protocol)) return [];
    const websocketProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    return [url.origin, `${websocketProtocol}//${url.host}`];
  } catch {
    return [];
  }
}

export function buildContentSecurityPolicy(
  development: boolean,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
) {
  const localQaOrigins = localSupabaseCspOrigins(supabaseUrl);
  return [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://*.tosspayments.com https://*.toss.im",
  [
    "script-src 'self' 'unsafe-inline'",
    development ? "'unsafe-eval'" : "",
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
    ...localQaOrigins,
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

export const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy(
  isDevelopment,
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

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

// 운영 /api/health 의 version 은 Vercel 환경변수를 손으로 관리했다. 그 값이 40일간
// 1.0.0 에 멈춘 채 릴리즈 매니페스트만 앞서가는 사고가 2026-08-28 에 있었다
// (매니페스트의 존재 이유가 "지금 운영에 뭐가 올라가 있나"인데 그 답이 틀렸다).
// package.json 을 유일한 진실원으로 삼아 빌드 시각에 주입한다. 환경변수는 더 이상
// 읽지 않는다. 읽으면 낡은 값이 다시 이겨서 같은 사고가 반복된다.
const APP_VERSION = (
  JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf8")) as { version: string }
).version;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_APP_VERSION: APP_VERSION },
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
