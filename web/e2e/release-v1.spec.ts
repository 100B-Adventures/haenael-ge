import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3456";

test("health reports v1 and database ok", async ({ request }) => {
  const response = await request.get(`${baseUrl}/api/health`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toMatchObject({ status: "ok", version: "1.0.0", database: "ok" });
});

test("cashout not accessible to anonymous (redirect to landing)", async ({ page }) => {
  // 환전 페이지는 로그인 필수 — 비로그인은 랜딩으로 리다이렉트되어 환전 신청에 도달 못 함.
  // (2026-07: 환전 페이지 진입은 미달도 허용하되 실지급 CTA는 게이트. 비로그인은 애초 redirect("/").)
  await page.goto(`${baseUrl}/cashout`);
  await expect(page).toHaveURL(`${baseUrl}/`);
  // 실제 환전 신청 버튼(활성)이 익명 사용자에게 노출되지 않음을 확인
  await expect(page.getByTestId("cashout-confirm-button")).toHaveCount(0);
});

