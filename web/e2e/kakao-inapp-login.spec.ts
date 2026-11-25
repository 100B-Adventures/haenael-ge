import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const APP_ORIGIN = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").origin;
const KAKAOTALK_UA = "Mozilla/5.0 (iPhone) KAKAOTALK 11.4.2";
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

test("KAKAO-E2E-01: KAKAOTALK UA는 외부 브라우저 링크와 기존 fallback을 함께 만든다", async ({
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
  expect(response.headers().location).toBe(
    `${APP_ORIGIN}/auth/kakao/external?redirect=%2Fonboarding`,
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
  await expect(page.getByTestId("kakao-external-fallback-link")).toHaveAttribute(
    "href",
    "/auth/kakao/start?redirect=%2Fonboarding&external_browser=1",
  );
  expect(consoleErrors).toEqual([]);
  await context.close();
});

test.describe("외부 로그인 후 온보딩 복귀", () => {
  test.skip(
    process.env.RUN_LOCAL_SUPABASE_E2E !== "1",
    "RUN_LOCAL_SUPABASE_E2E=1 로컬 Supabase 계약 시험",
  );

  test("KAKAO-E2E-02: 다른 탭에서 세션이 생긴 뒤 focus 복귀하면 저장 의도를 한 번 자동 저장한다", async ({
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
      const consent = onboarding.getByTestId("analytics-consent-banner");
      if (await consent.isVisible()) {
        await consent
          .getByRole("button", { name: "국외 이전에 동의하지 않음" })
          .click();
        await expect(consent).toBeHidden();
      }
      await onboarding.getByTestId("goal-title-input").fill("외부 로그인 복귀");
      await onboarding.getByTestId("goal-due-date-input").fill("2030-12-31");
      await onboarding.getByTestId("save-goal-button").click();
      await expect(onboarding.getByTestId("login-sheet-overlay")).toBeVisible();

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
      await context.addCookies([...cookieJar.values()].map(({ name, value, options }) => ({
        name,
        value,
        url: APP_ORIGIN,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
        expires: nowSeconds + (options?.maxAge ?? 60 * 60),
      })));

      const loginTab = await context.newPage();
      loginTab.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      loginTab.on("pageerror", (error) => consoleErrors.push(error.message));
      await loginTab.goto("/me");
      await loginTab.close();
      await onboarding.evaluate(() => window.dispatchEvent(new Event("focus")));

      await expect(onboarding.getByTestId("share-link-card")).toBeVisible();
      const { count, error: goalError } = await admin
        .from("goal")
        .select("id", { count: "exact", head: true })
        .eq("member_id", userId);
      expect(goalError).toBeNull();
      expect(count).toBe(1);
      expect(consoleErrors).toEqual([]);
    } finally {
      await admin.from("goal").delete().eq("member_id", userId);
      await admin.from("member").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      await context.close();
    }
  });
});
