import { expect, test } from "@playwright/test";

const APP_URL = process.env.V244_APP_URL;
const STORYBOOK_URL = process.env.V244_STORYBOOK_URL;
const GOAL_SLUG = process.env.E2E_GOAL_SLUG;

test.describe("2.4.4 목표 커버와 응원 문구 표시", () => {
  test("QA-TC-244-COVER-01 업로드 표지는 공통 컴포넌트에서 상단을 초점으로 쓴다", async ({ page }) => {
    test.skip(!STORYBOOK_URL, "V244_STORYBOOK_URL 미설정");
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto(
      `${STORYBOOK_URL}/iframe.html?id=social-ui-goalcover--uploaded-portrait-banner&viewMode=story`,
    );
    const uploadedCover = page.locator(".goal-cover-image--uploaded");
    await expect(uploadedCover).toBeVisible();
    await expect(uploadedCover).toHaveCSS("object-position", "50% 0%");
    expect(consoleErrors).toEqual([]);
  });

  test("QA-TC-244-WORDMAP-01 스크립트가 없어도 응원 문구 상자는 비어 보이지 않는다", async ({ browser }) => {
    test.skip(!APP_URL || !GOAL_SLUG, "V244_APP_URL 또는 E2E_GOAL_SLUG 미설정");
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    const response = await page.goto(`${APP_URL}/g/${GOAL_SLUG}`);
    expect(response?.status()).toBe(200);
    const wordmap = page.getByTestId("wordmap");
    await expect(wordmap).toHaveAttribute("data-layout-ready", "false");
    const items = wordmap.locator("[data-wordmap-item]");
    expect(await items.count()).toBeGreaterThan(0);
    await expect(items.first()).toBeVisible();
    expect(await items.first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        opacity: style.opacity,
        position: style.position,
        text: element.textContent?.trim(),
      };
    })).toEqual(expect.objectContaining({
      opacity: "1",
      position: "relative",
      text: expect.stringMatching(/\S/u),
    }));

    await context.close();
  });
});
