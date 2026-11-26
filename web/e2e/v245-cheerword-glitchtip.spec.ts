import { expect, test, type Browser } from "@playwright/test";

const APP_URL = process.env.V245_APP_URL;
const GOAL_SLUG = process.env.V245_GOAL_SLUG;
const VIEWPORTS = [
  { width: 390, height: 664 },
  { width: 360, height: 640 },
] as const;

async function measureCheerwordClearance(
  browser: Browser,
  viewport: (typeof VIEWPORTS)[number],
  reducedMotion: "no-preference" | "reduce",
) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion });
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const response = await page.goto(`${APP_URL}/g/${GOAL_SLUG}`, {
    waitUntil: "networkidle",
  });
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("wordmap")).toHaveAttribute(
    "data-layout-ready",
    "true",
  );

  const measurement = await page.evaluate(() => {
    const action = document.querySelector<HTMLElement>(
      ".receiver-fixed-action.receiver-public-action",
    );
    const items = Array.from(
      document.querySelectorAll<HTMLElement>("[data-wordmap-item]"),
    );
    if (!action || items.length === 0) {
      throw new Error("wordmap_or_fixed_action_missing");
    }
    return {
      actionTop: action.getBoundingClientRect().top,
      itemBottoms: items.map((item) => item.getBoundingClientRect().bottom),
      scrollY: window.scrollY,
    };
  });

  expect(measurement.scrollY).toBe(0);
  expect(Math.max(...measurement.itemBottoms)).toBeLessThan(
    measurement.actionTop,
  );
  expect(consoleErrors).toEqual([]);
  await context.close();
  return measurement;
}

test.describe("2.4.5 공개 목표 첫 화면 응원 문구", () => {
  for (const viewport of VIEWPORTS) {
    for (const reducedMotion of ["no-preference", "reduce"] as const) {
      test(`QA-TC-245-CHEERWORD-01 ${viewport.width}×${viewport.height} ${reducedMotion}에서 고정 버튼 위에 보인다`, async ({ browser }) => {
        test.skip(!APP_URL || !GOAL_SLUG, "V245_APP_URL 또는 V245_GOAL_SLUG 미설정");
        const measurement = await measureCheerwordClearance(
          browser,
          viewport,
          reducedMotion,
        );
        console.log(JSON.stringify({ viewport, reducedMotion, ...measurement }));
      });
    }
  }
});
