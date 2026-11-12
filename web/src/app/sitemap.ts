import type { MetadataRoute } from "next";

const SITE_URL = "https://haenael-ge.vercel.app";
const LAST_MODIFIED = new Date("2026-11-12T00:00:00+09:00");
const PUBLIC_PATHS = ["", "/how", "/terms", "/privacy", "/child-safety", "/updates"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: LAST_MODIFIED,
  }));
}

