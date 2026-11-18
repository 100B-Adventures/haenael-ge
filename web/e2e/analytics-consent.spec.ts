import { expect, test } from "@playwright/test";

const ANALYTICS_URL = /(?:googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com\/tr|clarity\.ms)/;

function loadedProviders(urls: string[]) {
  return new Set(urls.flatMap((url) => [
    url.includes("googletagmanager.com") ? "GA4" : "",
    url.includes("connect.facebook.net") ? "Meta" : "",
    url.includes("clarity.ms") ? "Clarity" : "",
  ]).filter(Boolean));
}

test("AN-CONSENT-01 동의 전 Google 태그만 denied 기본값으로 적재하고 동의 후 전체 분석 도구를 로드한다", async ({ page }) => {
  // 비운영 호스트에서는 운영 측정 ID 를 싣지 않는다. 배선 확인용 명시 플래그를 켜고, 아래 route 가 모든 분석 요청을 abort 한다.
  await page.addInitScript(() => window.localStorage.setItem("haenael_analytics_e2e_intercepted_v1", "1"));
  const analyticsRequests: string[] = [];
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (ANALYTICS_URL.test(url)) {
      analyticsRequests.push(url);
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto("/");
  await expect(page.getByTestId("analytics-consent-banner")).toHaveCount(0);
  await page.waitForTimeout(700);
  expect([...loadedProviders(analyticsRequests)]).toEqual(["GA4"]);
  await expect.poll(() => page.evaluate(() => {
    const calls = (window.dataLayer ?? []) as Array<ArrayLike<unknown>>;
    return calls.some((call) =>
      call[0] === "consent" &&
      call[1] === "default" &&
      (call[2] as Record<string, unknown> | undefined)?.analytics_storage === "denied" &&
      (call[2] as Record<string, unknown> | undefined)?.ad_storage === "denied"
    );
  })).toBe(true);

  await page.goto("/privacy");
  await page.getByTestId("analytics-consent-controls").getByRole("button", {
    name: "분석·국외 이전에 동의",
  }).click();
  await expect.poll(() => loadedProviders(analyticsRequests).size).toBe(3);
  await expect(page.getByTestId("analytics-consent-controls")).toContainText("동의됨");

  analyticsRequests.length = 0;
  await Promise.all([
    page.waitForEvent("load"),
    page.getByTestId("analytics-consent-controls").getByRole("button", {
      name: "동의 철회",
    }).click(),
  ]);
  await page.waitForTimeout(700);
  expect([...loadedProviders(analyticsRequests)]).toEqual(["GA4"]);
  await expect(page.getByTestId("analytics-consent-controls")).toContainText("거부됨");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("haenael_analytics_consent_v1")))
    .toBe("denied");
});

test("AN-CONSENT-02 동의 상태여도 민감 경로에서는 분석 도구를 로드하지 않는다", async ({ page }) => {
  const analyticsRequests: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem("haenael_analytics_consent_v1", "granted");
  });
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (ANALYTICS_URL.test(url)) {
      analyticsRequests.push(url);
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto("/invite/private-token");
  await page.waitForTimeout(700);
  expect(analyticsRequests).toHaveLength(0);
});

test("AN-CONSENT-03 비로그인 모바일에서는 동의 배너 없이 하단 탭을 조작할 수 있다", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");

  const banner = page.getByTestId("analytics-consent-banner");
  const bottomNav = page.getByTestId("receiver-bottom-nav");
  await expect(banner).toHaveCount(0);
  await expect(bottomNav).toBeVisible();

  await bottomNav.getByRole("button", { name: "친구" }).click();
  await expect(page.getByTestId("guest-teaser-sheet")).toBeVisible();
  await expect(banner).toHaveCount(0);
});
