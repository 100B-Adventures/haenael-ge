import { expect, test } from "@playwright/test";

const ANALYTICS_URL = /(?:googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com\/tr|clarity\.ms)/;

function loadedProviders(urls: string[]) {
  return new Set(urls.flatMap((url) => [
    url.includes("googletagmanager.com") ? "GA4" : "",
    url.includes("connect.facebook.net") ? "Meta" : "",
    url.includes("clarity.ms") ? "Clarity" : "",
  ]).filter(Boolean));
}

test("AN-CONSENT-01 동의 전 무전송, 동의 후 로드, 철회 후 재차단", async ({ page }) => {
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

  await page.goto("/privacy");
  await expect(page.getByTestId("analytics-consent-banner")).toBeVisible();
  await page.waitForTimeout(700);
  expect(analyticsRequests).toHaveLength(0);

  await page.getByTestId("analytics-consent-banner").getByRole("button", {
    name: "분석·국외 이전에 동의",
  }).click();
  await expect.poll(() => loadedProviders(analyticsRequests).size).toBe(3);
  await expect(page.getByTestId("analytics-consent-controls")).toContainText("동의됨");

  await Promise.all([
    page.waitForEvent("load"),
    page.getByTestId("analytics-consent-controls").getByRole("button", {
      name: "동의 철회",
    }).click(),
  ]);
  analyticsRequests.length = 0;
  await page.waitForTimeout(700);
  expect(analyticsRequests).toHaveLength(0);
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

test("AN-CONSENT-03 모바일 배너와 하단 탭을 동시에 조작할 수 있다", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");

  const banner = page.getByTestId("analytics-consent-banner");
  const detailLink = banner.getByRole("link", { name: "전송 항목과 국외 이전 상세 보기" });
  const bottomNav = page.getByTestId("receiver-bottom-nav");
  await expect(banner).toBeVisible();
  await expect(bottomNav).toBeVisible();

  const detailBox = await detailLink.boundingBox();
  expect(detailBox).not.toBeNull();
  expect(detailBox!.width).toBeGreaterThanOrEqual(44);
  expect(detailBox!.height).toBeGreaterThanOrEqual(44);

  const [bannerBox, navBox] = await Promise.all([banner.boundingBox(), bottomNav.boundingBox()]);
  expect(bannerBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(bannerBox!.y + bannerBox!.height).toBeLessThanOrEqual(navBox!.y);

  await bottomNav.getByRole("button", { name: "친구" }).click();
  await expect(page.getByTestId("guest-teaser-sheet")).toBeVisible();
  await expect(banner).toBeVisible();
});
