import type { MetadataRoute } from "next";

const SITEMAP_URL = "https://haenael-ge.vercel.app/sitemap.xml";

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== "production") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/how", "/terms", "/privacy", "/child-safety"],
      disallow: [
        "/admin",
        "/api",
        "/auth",
        "/cashout",
        "/friends",
        "/g/",
        "/invite",
        "/me",
        "/my",
        "/onboarding",
        "/payment",
        "/wordmap",
      ],
    },
    sitemap: SITEMAP_URL,
  };
}

