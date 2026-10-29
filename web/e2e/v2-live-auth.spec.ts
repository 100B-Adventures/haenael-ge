import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { chromium } from "@playwright/test";

const evidenceDirectory = "../docs/qa/evidence/v2-goal-round4-20261029/auth";

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`required_environment_missing:${name}`);
  return value;
}

function assertLiveStagingContract() {
  expect(requiredEnvironment("E2E_ENVIRONMENT")).toBe("staging");
  expect(requiredEnvironment("RUN_STAGING_SUPABASE_E2E")).toBe("1");
  expect(requiredEnvironment("RUN_LIVE_KAKAO_E2E")).toBe("1");
}

async function addExistingKakaoSession(context: BrowserContext) {
  const preferredPort = process.env.KAKAO_CDP_PORT?.trim() || "9342";
  const ports = [...new Set([preferredPort, "9342", "9334"])];
  const failures: string[] = [];

  for (const port of ports) {
    try {
      const sourceBrowser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
      const sourceContext = sourceBrowser.contexts()[0];
      if (!sourceContext) {
        await sourceBrowser.close();
        failures.push(`${port}:context_missing`);
        continue;
      }

      const kakaoCookies = (await sourceContext.cookies()).filter((cookie) =>
        cookie.domain === ".kakao.com" || cookie.domain.endsWith(".kakao.com")
      );
      await sourceBrowser.close();

      if (kakaoCookies.length === 0) {
        failures.push(`${port}:kakao_cookie_missing`);
        continue;
      }

      await context.addCookies(kakaoCookies);
      console.log(`LIVE_KAKAO_SESSION source=existing-profile cookies=${kakaoCookies.length}`);
      return;
    } catch (error) {
      const reason = error instanceof Error ? error.message.split("\n", 1)[0] : "unknown";
      failures.push(`${port}:${reason}`);
    }
  }

  throw new Error(`external_kakao_session_unavailable:${failures.join("|")}`);
}

async function completeConsentIfRequired(page: Page, appOrigin: string) {
  const appOriginUrl = new URL(appOrigin);
  const returnedToApp = () => page.url().startsWith(appOriginUrl.origin);

  if (returnedToApp()) return;
  await expect.poll(() => new URL(page.url()).hostname, { timeout: 30_000 }).toMatch(/kakao\.com$/);

  const passwordField = page.locator('input[type="password"]:visible');
  if (await passwordField.count()) {
    throw new Error("external_kakao_session_expired:interactive_login_required");
  }

  const allConsent = page.getByText(/모두 동의|전체 동의/, { exact: false }).first();
  if (await allConsent.isVisible().catch(() => false)) await allConsent.click();

  const continueButton = page.getByRole("button", {
    name: /동의하고 (계속|시작|로그인)|계속하기|허용하기/,
  }).first();
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click();
  }
}

function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`page:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
  return errors;
}

test.describe("G4-AUTH live Kakao OAuth", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("G4-AUTH-01 LIVE-KAKAO-SUCCESS 실제 Kakao 동의부터 Supabase 제품 세션까지 왕복한다", async ({
    browser,
    baseURL,
  }) => {
    assertLiveStagingContract();
    expect(baseURL).toBe(requiredEnvironment("STAGING_WEB_BASE_URL"));

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const pageErrors = collectPageErrors(page);

    try {
      await addExistingKakaoSession(context);
      await page.goto(`${baseURL}/auth/kakao/start?redirect=/my`, {
        waitUntil: "domcontentloaded",
      });
      await completeConsentIfRequired(page, baseURL!);

      await page.waitForURL(`${baseURL}/my`, { timeout: 60_000, waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("my-page")).toBeVisible();
      await expect(page.getByRole("heading", { name: "마이페이지" })).toBeVisible();
      await expect(page).not.toHaveURL(/auth_error=/);

      const sessionCookies = (await context.cookies(baseURL)).filter((cookie) =>
        cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")
      );
      expect(sessionCookies.length).toBeGreaterThan(0);

      const protectedResponse = await context.request.get(`${baseURL}/my`, { maxRedirects: 0 });
      expect(protectedResponse.status()).toBe(200);
      expect(pageErrors).toEqual([]);

      await page.screenshot({
        path: `${evidenceDirectory}/live-kakao-success-390.png`,
        fullPage: true,
      });
      console.log("LIVE_KAKAO_SUCCESS callback=/auth/kakao/callback product=/my session=present");
    } finally {
      await context.close();
    }
  });

  test("G4-AUTH-02 LIVE-KAKAO-EDGE 취소·잘못된 state·비인증 보호 라우트가 개인정보를 노출하지 않는다", async ({
    browser,
    baseURL,
  }) => {
    assertLiveStagingContract();
    expect(baseURL).toBe(requiredEnvironment("STAGING_WEB_BASE_URL"));

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const pageErrors = collectPageErrors(page);

    try {
      const startResponse = await context.request.get(
        `${baseURL}/auth/kakao/start?redirect=/my`,
        { maxRedirects: 0 },
      );
      expect(startResponse.status()).toBe(307);
      const authorizationLocation = startResponse.headers().location;
      expect(authorizationLocation).toBeTruthy();
      const state = new URL(authorizationLocation!).searchParams.get("state");
      expect(state).toBeTruthy();

      await page.goto(
        `${baseURL}/auth/kakao/callback?error=access_denied&error_description=user_cancelled&state=${encodeURIComponent(state!)}`,
        { waitUntil: "domcontentloaded" },
      );
      await expect(page).toHaveURL(`${baseURL}/?auth_error=cancelled`);
      await expect(page.getByTestId("landing-relogin-link")).toBeVisible();

      const protectedResponse = await context.request.get(`${baseURL}/my`, { maxRedirects: 0 });
      expect(protectedResponse.status()).toBe(307);
      const protectedLocation = protectedResponse.headers().location;
      expect(protectedLocation).toBeTruthy();
      expect(new URL(protectedLocation!, baseURL).href).toBe(`${baseURL}/?next=%2Fmy`);
      const protectedBody = await protectedResponse.text();
      expect(protectedBody).not.toContain("my-page");
      expect(protectedBody).not.toContain("my-page-overview");

      const sessionCookies = (await context.cookies(baseURL)).filter((cookie) =>
        cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")
      );
      expect(sessionCookies).toHaveLength(0);

      const invalidStateContext = await browser.newContext();
      try {
        const invalidStateResponse = await invalidStateContext.request.get(
          `${baseURL}/auth/kakao/callback?code=not-a-real-code&state=invalid-state`,
          { maxRedirects: 0 },
        );
        expect(invalidStateResponse.status()).toBe(307);
        expect(invalidStateResponse.headers().location).toBe(`${baseURL}/?auth_error=invalid_state`);
        expect(
          (await invalidStateContext.cookies(baseURL)).filter((cookie) =>
            cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")
          ),
        ).toHaveLength(0);
      } finally {
        await invalidStateContext.close();
      }

      expect(pageErrors).toEqual([]);
      await page.screenshot({
        path: `${evidenceDirectory}/live-kakao-cancelled-390.png`,
        fullPage: true,
      });
      console.log("LIVE_KAKAO_EDGE cancelled=landing invalid_state=rejected protected_my=307 session=absent");
    } finally {
      await context.close();
    }
  });
});
