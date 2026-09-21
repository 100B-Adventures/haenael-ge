// layout.tsx — 루트 레이아웃: Pretendard·Toaster(Sonner)
// folder-structure.md: "루트: Pretendard·토큰·Toaster(Sonner)"

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { Footer } from "@/components/common/Footer";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";
import "./globals.css";

// Pretendard Variable — 한국어 웹 표준 가변 폰트
// 소스: npm pretendard → public/fonts/PretendardVariable.woff2
const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "해낼게 — 응원은 돈으로 하는 겁니다",
  description:
    "친구의 목표에 조용히 클로버로 응원하세요. 응원이 쌓이면 예쁜 워드맵이 됩니다.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://haenael.app",
  ),
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "해낼게",
  },
  // 홈 화면 추가용. 매니페스트는 app/manifest.ts 가 만든다.
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "해낼게",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  // design-token-lint-allow: 메타 태그는 CSS 변수를 못 읽는다. globals.css 의 --primary 값 그대로다.
  themeColor: "#1B8A4F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-[family-name:var(--font-pretendard)]!">
        <GoogleAnalytics />
        <RegisterServiceWorker />
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
