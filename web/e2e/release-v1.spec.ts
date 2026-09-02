import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3456";

test("health reports v1 and database ok", async ({ request }) => {
  const response = await request.get(`${baseUrl}/api/health`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toMatchObject({ status: "ok", version: "1.0.0", database: "ok" });
});

test("cashout remains visibly unavailable", async ({ page }) => {
  await page.goto(`${baseUrl}/cashout`);
  await expect(page.getByRole("heading", { name: "환전 기능을 준비하고 있어요" })).toBeVisible();
  await expect(page.getByText("지금 쌓인 클로버는 그대로 보관됩니다.")).toBeVisible();
});

