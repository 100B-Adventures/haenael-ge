import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // qa-verifier 2026-07-14: /Users/sj/package-lock.json(무관 스트레이 파일)이
  // Turbopack의 workspace-root 추정을 오염시켜 dev 모드 500(React Client Manifest
  // 모듈 미발견) 유발 — 명시적으로 이 web/ 디렉토리를 root로 고정해 해결.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
