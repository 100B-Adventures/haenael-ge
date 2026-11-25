import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import { type Browser, type BrowserContext, expect, test } from "@playwright/test";

const ANALYTICS_URL = /(?:googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|facebook\.com\/tr|clarity\.ms)/;

function requestCounts(urls: string[]) {
  return {
    google: urls.filter((url) => /googletagmanager\.com|google-analytics\.com/.test(url)).length,
    microsoft: urls.filter((url) => url.includes("clarity.ms")).length,
    facebook: urls.filter((url) => /connect\.facebook\.net|facebook\.com\/tr/.test(url)).length,
  };
}

test("AN-CONSENT-01 비회원은 배너와 국외 분석 요청이 모두 0이다", async ({ page }) => {
  // 비운영 호스트에서는 운영 측정 ID 를 싣지 않는다. 배선 확인용 명시 플래그를 켜고, 아래 route 가 모든 분석 요청을 abort 한다.
  await page.addInitScript(() => window.localStorage.setItem("haenael_analytics_e2e_intercepted_v1", "1"));
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
  await expect(page.getByTestId("analytics-consent-banner")).toHaveCount(0);
  await page.waitForTimeout(700);
  expect(requestCounts(analyticsRequests)).toEqual({ google: 0, microsoft: 0, facebook: 0 });
  console.info("AN_CONSENT_GUEST_METRICS", JSON.stringify({
    bannerCount: await page.getByTestId("analytics-consent-banner").count(),
    ...requestCounts(analyticsRequests),
  }));
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

test("AN-CONSENT-03 모바일 비회원은 하단 탭을 써도 배너가 0개다", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");

  const banner = page.getByTestId("analytics-consent-banner");
  const bottomNav = page.getByTestId("receiver-bottom-nav");
  await expect(banner).toHaveCount(0);
  await expect(bottomNav).toBeVisible();
  if (process.env.E2E_CAPTURE_DIR) {
    mkdirSync(process.env.E2E_CAPTURE_DIR, { recursive: true });
    await page.screenshot({
      path: `${process.env.E2E_CAPTURE_DIR}/analytics-consent-360.png`,
      fullPage: true,
    });
  }

  await bottomNav.getByRole("button", { name: "친구" }).click();
  await expect(page.getByTestId("guest-teaser-sheet")).toBeVisible();
  await expect(banner).toHaveCount(0);
});

const localSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const localAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const localServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;
const e2eBaseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const accountPassword = "analytics-consent-e2e-1234!";

async function authenticatedCookies(email: string) {
  if (!localAnonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY 미설정");
  const jar = new Map<string, { name: string; value: string; maxAge?: number }>();
  const client = createBrowserClient(localSupabaseUrl, localAnonKey, {
    isSingleton: false,
    cookies: {
      getAll: () => [...jar.values()].map(({ name, value }) => ({ name, value })),
      setAll: (rows) => rows.forEach((row) => {
        if (!row.value || row.options?.maxAge === 0) jar.delete(row.name);
        else jar.set(row.name, { name: row.name, value: row.value, maxAge: row.options?.maxAge });
      }),
    },
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: true },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: accountPassword });
  if (error) throw error;
  const now = Math.floor(Date.now() / 1000);
  const cookies = [...jar.values()].map(({ name, value, maxAge }) => ({
    name,
    value,
    url: e2eBaseUrl,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
    expires: now + (maxAge ?? 3600),
  }));
  if (cookies.length === 0) throw new Error("인증 쿠키 생성 실패");
  console.info("AN_CONSENT_AUTH_COOKIE_METRICS", JSON.stringify({
    count: cookies.length,
    names: cookies.map(({ name }) => name),
    baseUrl: e2eBaseUrl,
  }));
  return cookies;
}

async function authenticatedContext(browser: Browser, email: string): Promise<BrowserContext> {
  const context = await browser.newContext();
  await context.addCookies(await authenticatedCookies(email));
  return context;
}

test.describe("분석 동의 계정 복원", () => {
  test.skip(process.env.RUN_LOCAL_SUPABASE_E2E !== "1", "RUN_LOCAL_SUPABASE_E2E 필요");
  const email = `analytics-consent-${Date.now()}@test.local`;
  const sharedDeviceEmail = `analytics-consent-shared-${Date.now()}@test.local`;
  let userId = "";
  let sharedDeviceUserId = "";

  test.beforeAll(async () => {
    if (!localServiceKey) throw new Error("SERVICE_ROLE_KEY 미설정");
    const admin = createClient(localSupabaseUrl, localServiceKey);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: accountPassword,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("사용자 생성 실패");
    userId = data.user.id;
    const { error: memberError } = await admin.from("member").insert({ id: userId, nickname: "분석동의검증" });
    if (memberError) throw memberError;
    const { data: sharedData, error: sharedError } = await admin.auth.admin.createUser({
      email: sharedDeviceEmail,
      password: accountPassword,
      email_confirm: true,
    });
    if (sharedError || !sharedData.user) throw sharedError ?? new Error("공용 기기 사용자 생성 실패");
    sharedDeviceUserId = sharedData.user.id;
    const { error: sharedMemberError } = await admin.from("member").insert({
      id: sharedDeviceUserId,
      nickname: "공용기기검증",
    });
    if (sharedMemberError) throw sharedMemberError;
    const { error: goalError } = await admin.from("goal").insert([
      {
        member_id: userId,
        slug: `analytics-consent-a-${Date.now()}`,
        title: "분석 동의 A 목표",
        due_date: "2027-12-31",
        visibility: "PUBLIC",
      },
      {
        member_id: sharedDeviceUserId,
        slug: `analytics-consent-b-${Date.now()}`,
        title: "분석 동의 B 목표",
        due_date: "2027-12-31",
        visibility: "PUBLIC",
      },
    ]);
    if (goalError) throw goalError;
  });

  test.afterAll(async () => {
    if (!localServiceKey) return;
    const admin = createClient(localSupabaseUrl, localServiceKey);
    if (userId) await admin.auth.admin.deleteUser(userId);
    if (sharedDeviceUserId) await admin.auth.admin.deleteUser(sharedDeviceUserId);
  });

  test("AN-CONSENT-04 선택 후 사라지고 새 브라우저에서도 다시 묻지 않는다", async ({ browser }) => {
    const first = await authenticatedContext(browser, email);
    const firstPage = await first.newPage();
    const requests: string[] = [];
    await firstPage.route("**/*", async (route) => {
      const url = route.request().url();
      if (ANALYTICS_URL.test(url)) {
        requests.push(url);
        await route.abort();
      } else await route.continue();
    });
    await firstPage.goto("/");
    const banner = firstPage.getByTestId("analytics-consent-banner");
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "분석 정보 국외 이전에 동의하지 않음" }).click();
    await expect(banner).toHaveCount(0);
    await firstPage.reload();
    await expect(firstPage.getByTestId("analytics-consent-banner")).toHaveCount(0);
    expect(requestCounts(requests)).toEqual({ google: 0, microsoft: 0, facebook: 0 });
    await first.close();

    const second = await authenticatedContext(browser, email);
    const secondPage = await second.newPage();
    await secondPage.goto("/");
    await expect(secondPage.getByTestId("analytics-consent-banner")).toHaveCount(0);
    await expect.poll(() => secondPage.evaluate(() => localStorage.getItem("haenael_analytics_consent_v1")))
      .toBe("denied");
    await second.close();
  });

  test("AN-CONSENT-05 공용 기기 A의 동의는 로그아웃 뒤 B 계정에 승계되지 않는다", async ({ browser }) => {
    const admin = createClient(localSupabaseUrl, localServiceKey!);
    const { error: resetError } = await admin.from("member")
      .update({ analytics_consent: null })
      .eq("id", userId);
    if (resetError) throw resetError;
    const context = await authenticatedContext(browser, email);
    const page = await context.newPage();
    await page.addInitScript(() => window.localStorage.setItem("haenael_analytics_e2e_intercepted_v1", "1"));
    const analyticsRequests: string[] = [];
    await page.route("**/*", async (route) => {
      const url = route.request().url();
      if (ANALYTICS_URL.test(url)) {
        analyticsRequests.push(url);
        await route.abort();
      } else await route.continue();
    });

    await page.goto("/");
    const banner = page.getByTestId("analytics-consent-banner");
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "분석 정보 국외 이전에 동의", exact: true }).click();
    await expect(banner).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => localStorage.getItem("haenael_analytics_consent_v1")))
      .toBe("granted");

    await page.getByTestId("logout-button").click();
    await expect(page).toHaveURL(new RegExp("/$"));
    await expect.poll(() => page.evaluate(() => localStorage.getItem("haenael_analytics_consent_v1")))
      .toBeNull();

    await context.clearCookies();
    await context.addCookies(await authenticatedCookies(sharedDeviceEmail));
    analyticsRequests.length = 0;
    await page.goto("/");
    await expect(page.getByTestId("analytics-consent-banner")).toBeVisible();
    await page.waitForTimeout(700);
    const { data: sharedMember, error: sharedMemberError } = await admin
      .from("member")
      .select("analytics_consent")
      .eq("id", sharedDeviceUserId)
      .single();
    if (sharedMemberError) throw sharedMemberError;
    expect(sharedMember.analytics_consent).toBeNull();
    expect(requestCounts(analyticsRequests)).toEqual({ google: 0, microsoft: 0, facebook: 0 });
    console.info("AN_CONSENT_SHARED_DEVICE_METRICS", JSON.stringify({
      localConsentAfterLogout: await page.evaluate(() => localStorage.getItem("haenael_analytics_consent_v1")),
      accountBConsent: sharedMember.analytics_consent,
      bannerBCount: await page.getByTestId("analytics-consent-banner").count(),
      ...requestCounts(analyticsRequests),
    }));
    await context.close();
  });
});
