import { describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

vi.mock("next/font/local", () => ({
  default: () => ({ variable: "--font-pretendard" }),
}));

import { metadata } from "@/app/layout";

describe("검색 엔진 메타데이터", () => {
  it("robots는 공개 정적 페이지를 허용하고 비공개·판단 대기 경로를 차단한다", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://haenael-ge.vercel.app/sitemap.xml");
    expect(result.rules).toEqual({
      userAgent: "*",
      allow: ["/", "/how", "/terms", "/privacy", "/child-safety"],
      disallow: [
        "/admin", "/api", "/auth", "/cashout", "/friends", "/g/", "/invite",
        "/me", "/my", "/onboarding", "/payment", "/wordmap",
      ],
    });
  });

  it("sitemap은 실제 공개 정적 URL과 lastmod만 제공한다", () => {
    const result = sitemap();
    expect(result.map(({ url }) => url)).toEqual([
      "https://haenael-ge.vercel.app",
      "https://haenael-ge.vercel.app/how",
      "https://haenael-ge.vercel.app/terms",
      "https://haenael-ge.vercel.app/privacy",
      "https://haenael-ge.vercel.app/child-safety",
    ]);
    expect(result.every(({ lastModified }) => lastModified instanceof Date)).toBe(true);
    expect(result.some(({ url }) => url.includes("/g/"))).toBe(false);
  });

  it("루트 metadata에 네이버 소유확인 값을 둔다", () => {
    expect(metadata.verification).toMatchObject({
      other: {
        "naver-site-verification": "e360b73dcf21099e19c1acf7aaf3ae67242f68fe",
      },
    });
  });
});
