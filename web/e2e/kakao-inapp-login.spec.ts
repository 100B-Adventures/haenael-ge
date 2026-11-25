import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const APP_ORIGIN = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").origin;
const KAKAOTALK_UA = "Mozilla/5.0 (iPhone) KAKAOTALK 11.4.2";
const KAKAOTALK_ANDROID_UA = "Mozilla/5.0 (Linux; Android 15) KAKAOTALK 11.4.2";
const QA_PASSWORD = "kakao-return-e2e-pw-1234!";

type CapturedCookie = {
  name: string;
  value: string;
  options?: { maxAge?: number };
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 미설정`);
  return value;
}

test("KAKAO-E2E-01: iOS KAKAOTALK UA는 외부 링크와 수동 전환 안내를 만든다", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: APP_ORIGIN,
    userAgent: KAKAOTALK_UA,
  });
  const response = await context.request.get(
    "/auth/kakao/start?redirect=%2Fonboarding",
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(307);
  const redirectLocation = new URL(response.headers().location);
  expect(`${redirectLocation.pathname}${redirectLocation.search}`).toBe(
    "/auth/kakao/external?redirect=%2Fonboarding",
  );

  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto("/auth/kakao/external?redirect=%2Fonboarding&auto=0");
  await expect(page.getByTestId("kakao-external-browser-link")).toHaveAttribute(
    "href",
    /^kakaotalk:\/\/web\/openExternal\?url=/,
  );
  const externalHref = await page
    .getByTestId("kakao-external-browser-link")
    .getAttribute("href");
  expect(externalHref).toBeTruthy();
  const encodedUrl = externalHref?.replace(
    "kakaotalk://web/openExternal?url=",
    "",
  );
  expect(decodeURIComponent(encodedUrl ?? "")).toBe(
    `${APP_ORIGIN}/auth/kakao/start?redirect=%2Fonboarding&external_browser=1`,
  );
  await expect(page.getByTestId("kakao-device-instruction")).toContainText(
    "Safari로 열기",
  );
  await expect(page.getByTestId("kakao-draft-warning")).toContainText(
    "외부 브라우저로 옮겨지지 않아요",
  );
  await expect(page.getByTestId("kakao-external-fallback-countdown")).toBeVisible();
  await expect(page.getByTestId("kakao-external-fallback-link")).toHaveAttribute(
    "href",
    `${APP_ORIGIN}/auth/kakao/start?redirect=%2Fonboarding&external_browser=1`,
    { timeout: 7_000 },
  );
  expect(consoleErrors).toEqual([]);
  await context.close();
});

test("KAKAO-E2E-02: Android KAKAOTALK UA는 다른 브라우저 열기 절차를 안내한다", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: APP_ORIGIN,
    userAgent: KAKAOTALK_ANDROID_UA,
  });
  const page = await context.newPage();

  await page.goto("/auth/kakao/external?redirect=%2Fonboarding&auto=0");

  await expect(page.getByTestId("kakao-device-instruction")).toContainText(
    "다른 브라우저로 열기",
  );
  await context.close();
});

test("KAKAO-E2E-NOJS-01: JavaScript 비활성 외부 안내도 실행 가능한 링크를 제공한다", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: APP_ORIGIN,
    userAgent: KAKAOTALK_UA,
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.route("**/auth/kakao/start?**", async (route) => {
    await route.fulfill({ status: 200, body: "oauth-start-link-reached" });
  });

  await page.goto("/auth/kakao/external?redirect=%2Fonboarding&auto=0");

  await expect(page.getByTestId("kakao-external-browser-link")).toHaveAttribute(
    "href",
    /^kakaotalk:\/\/web\/openExternal\?url=/,
  );
  await expect(page.getByTestId("kakao-device-instruction")).toContainText(
    "공유 버튼",
  );
  const noScriptLink = page.getByTestId("kakao-external-noscript-link");
  await expect(noScriptLink).toHaveAttribute(
    "href",
    `${APP_ORIGIN}/auth/kakao/start?redirect=%2Fonboarding&external_browser=1`,
  );
  await noScriptLink.click();
  await expect(page.locator("body")).toContainText("oauth-start-link-reached");
  await context.close();
});

test("KAKAO-E2E-03: 비공식 스킴 fallback은 인앱 OAuth로 가지 않고 안내 화면에 머문다", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: APP_ORIGIN,
    userAgent: KAKAOTALK_UA,
  });
  const page = await context.newPage();

  await page.goto("/auth/kakao/external?redirect=%2Fonboarding");
  await page.waitForTimeout(1_500);
  await expect(page).toHaveURL(/\/auth\/kakao\/external\?redirect=%2Fonboarding(?:&auto=0)?$/);
  await expect(page.getByTestId("kakao-device-instruction")).toContainText(
    "Safari로 열기",
  );
  await expect(page).not.toHaveURL(/kauth\.kakao\.com/);
  await context.close();
});

test("KAKAO-E2E-04: auth_error 복귀 화면은 실패 사실과 재시도 행동을 보여 준다", async ({
  page,
}) => {
  await page.goto("/?auth_error=session_failed&redirect=%2Fonboarding");
  await expect(page.getByTestId("auth-error-notice")).toContainText(
    "로그인을 마치지 못했어요",
  );
  await expect(page.getByTestId("auth-error-retry")).toHaveAttribute(
    "href",
    "/auth/kakao/start?redirect=%2Fonboarding",
  );
  await expect(page.getByTestId("landing-relogin-link")).toHaveCount(0);
});

test.describe("외부 로그인 후 온보딩 복귀", () => {
  test.skip(
    process.env.RUN_LOCAL_SUPABASE_E2E !== "1",
    "RUN_LOCAL_SUPABASE_E2E=1 로컬 Supabase 계약 시험",
  );

  test("KAKAO-E2E-05: callback 서버 세션과 다른 탭 복귀가 JavaScript 유무와 관계없이 한 번만 저장한다", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const qaEmail = `kakao-return-${Date.now()}@test.local`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: qaEmail,
      password: QA_PASSWORD,
      email_confirm: true,
    });
    if (createError || !created.user) {
      throw new Error(`QA 계정 생성 실패: ${createError?.message}`);
    }
    const userId = created.user.id;
    const context = await browser.newContext({ baseURL: APP_ORIGIN });
    let noJsContext: Awaited<ReturnType<typeof browser.newContext>> | null = null;
    await context.addInitScript(() => {
      window.localStorage.setItem("haenael_analytics_consent_v1", "denied");
    });

    try {
      const { error: memberError } = await admin
        .from("member")
        .insert({ id: userId, nickname: "카카오복귀E2E" });
      if (memberError) throw new Error(`member 생성 실패: ${memberError.message}`);

      const onboarding = await context.newPage();
      const consoleErrors: string[] = [];
      onboarding.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      onboarding.on("pageerror", (error) => consoleErrors.push(error.message));
      await onboarding.goto("/onboarding");
      await expect(onboarding.getByTestId("analytics-consent-banner")).toBeHidden();
      await onboarding.getByTestId("goal-title-input").fill("외부 로그인 복귀");
      await onboarding.getByTestId("goal-due-date-input").fill("2030-12-31");
      await onboarding.getByTestId("save-goal-button").click();
      await expect(onboarding.getByTestId("login-sheet-overlay")).toBeVisible();

      const duplicateTab = await context.newPage();
      duplicateTab.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      duplicateTab.on("pageerror", (error) => consoleErrors.push(error.message));
      await duplicateTab.goto("/onboarding");
      await expect(duplicateTab.getByTestId("goal-title-input")).toHaveValue(
        "외부 로그인 복귀",
      );

      const cookieJar = new Map<string, CapturedCookie>();
      const authClient = createBrowserClient(supabaseUrl, anonKey, {
        isSingleton: false,
        cookies: {
          getAll: () => [...cookieJar.values()].map(({ name, value }) => ({ name, value })),
          setAll: (cookies) => {
            for (const cookie of cookies) {
              if (!cookie.value || cookie.options?.maxAge === 0) cookieJar.delete(cookie.name);
              else cookieJar.set(cookie.name, cookie as CapturedCookie);
            }
          },
        },
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: true,
        },
      });
      const { error: signInError } = await authClient.auth.signInWithPassword({
        email: qaEmail,
        password: QA_PASSWORD,
      });
      if (signInError) throw new Error(`QA 로그인 실패: ${signInError.message}`);

      const nowSeconds = Math.floor(Date.now() / 1000);
      const browserCookies = [...cookieJar.values()].map(({ name, value, options }) => ({
        name,
        value,
        url: APP_ORIGIN,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
        expires: nowSeconds + (options?.maxAge ?? 60 * 60),
      }));
      await context.addCookies(browserCookies);

      noJsContext = await browser.newContext({
        baseURL: APP_ORIGIN,
        javaScriptEnabled: false,
      });
      await noJsContext.addCookies(browserCookies);
      const noJsPending = await noJsContext.newPage();
      await noJsPending.goto("/auth/kakao/pending?redirect=%2Ffriends");
      await expect(noJsPending).toHaveURL(`${APP_ORIGIN}/friends`);
      await expect(noJsPending.locator("body")).not.toContainText("로그인 상태를 확인하고 있어요");
      await noJsContext.close();
      noJsContext = null;

      const loginTab = await context.newPage();
      loginTab.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      loginTab.on("pageerror", (error) => consoleErrors.push(error.message));
      await loginTab.goto("/auth/kakao/pending?redirect=%2Ffriends");
      await expect(loginTab).toHaveURL(`${APP_ORIGIN}/friends`);
      await expect(loginTab.locator("body")).not.toContainText("로그인이 필요");
      await loginTab.close();
      await Promise.all([
        onboarding.evaluate(() => window.dispatchEvent(new Event("focus"))),
        duplicateTab.evaluate(() => window.dispatchEvent(new Event("focus"))),
      ]);

      await expect.poll(async () => Number(
        await onboarding.getByTestId("share-link-card").isVisible().catch(() => false),
      ) + Number(
        await duplicateTab.getByTestId("share-link-card").isVisible().catch(() => false),
      )).toBe(1);
      const { count, error: goalError } = await admin
        .from("goal")
        .select("id", { count: "exact", head: true })
        .eq("member_id", userId);
      expect(goalError).toBeNull();
      expect(count).toBe(1);
      expect(consoleErrors).toEqual([]);
    } finally {
      if (noJsContext) await noJsContext.close();
      await admin.from("goal").delete().eq("member_id", userId);
      await admin.from("member").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      await context.close();
    }
  });
});
