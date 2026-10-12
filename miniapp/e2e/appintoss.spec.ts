import { expect, test } from "@playwright/test";

test("TC-AIT-E2E-001 로그인 진입에서 친구 응원 상세까지 렌더한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const consoleErrors: string[] = [];
  const failedResponses: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });

  const loginResponse = await page.goto("/login?demo=1&next=/friends");
  expect(loginResponse?.status()).toBe(200);
  await expect(page.getByTestId("toss-login-button")).toBeVisible();
  await page.getByTestId("toss-login-button").click();
  await expect(page.getByTestId("friend-goal-card")).toHaveCount(3);
  await page.getByTestId("friend-goal-card").first().getByRole("button").click();
  await expect(page.getByTestId("support-flow")).toBeVisible();
  await page.screenshot({ path: "test-results/appintoss-support.png", fullPage: true });
  expect(failedResponses).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("TC-AIT-E2E-002 공개 응원 화면은 금액과 순위를 노출하지 않는다", async ({ page }) => {
  const response = await page.goto("/goals/seoyeon-running?demo=1");
  expect(response?.status()).toBe(200);
  await expect(page.getByTestId("support-flow")).toBeVisible();
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/₩|금액|잔액|순위|보유 클로버/);
});
