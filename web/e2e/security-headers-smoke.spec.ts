import { expect, test } from "@playwright/test";

test("SEC-HEADERS-E2E-01 실제 화면: 보안 헤더를 강제하고 홈을 콘솔 오류 없이 렌더한다", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);

  const headers = response?.headers() ?? {};
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-powered-by"]).toBeUndefined();

  await expect(page).toHaveTitle(/해낼게/);
  await expect(page.locator("body")).toContainText("응원");
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
