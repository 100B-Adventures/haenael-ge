import { afterEach, describe, expect, it } from "vitest";
import { ANALYTICS_E2E_INTERCEPT_KEY, CANONICAL_HOST, isAnalyticsProductionHost } from "@/lib/site-host";

describe("isAnalyticsProductionHost", () => {
  afterEach(() => window.localStorage.removeItem(ANALYTICS_E2E_INTERCEPT_KEY));
  it("E2E 가로채기 플래그가 있을 때만 비운영 호스트에서 참이다", () => {
    window.localStorage.setItem(ANALYTICS_E2E_INTERCEPT_KEY, "1");
    expect(isAnalyticsProductionHost("haenael-ge-v2-staging-100-b.vercel.app")).toBe(true);
    window.localStorage.setItem(ANALYTICS_E2E_INTERCEPT_KEY, "true");
    expect(isAnalyticsProductionHost("haenael-ge-v2-staging-100-b.vercel.app")).toBe(false);
  });
  it("운영 canonical 호스트에서만 참이다", () => {
    expect(isAnalyticsProductionHost(CANONICAL_HOST)).toBe(true);
  });
  it.each([
    "haenael-ge-v2-staging-100-b.vercel.app",
    "haenael-abc123-100-b.vercel.app",
    "localhost",
    "127.0.0.1",
    "",
  ])("%s 에서는 운영 측정 ID 를 싣지 않는다", (host) => {
    expect(isAnalyticsProductionHost(host)).toBe(false);
  });
});
