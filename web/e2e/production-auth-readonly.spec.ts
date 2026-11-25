/**
 * 운영 인증 읽기 전용 E2E.
 *
 * 이 스펙은 운영 Supabase Auth에서 전용 QA 계정으로 실제 세션을 발급받고,
 * Next.js 운영 서버가 그 세션 쿠키를 읽어 /cashout을 렌더하는지만 확인한다.
 * 환전 신청 버튼은 누르지 않으며 cashout_request의 전후 스냅샷이 같아야 통과한다.
 */

import { createBrowserClient } from "@supabase/ssr";
import { devices, expect, test, type BrowserContext, type Page } from "@playwright/test";

// 11-24 해낼게 전용 Vercel 계정 이전 뒤 옛 별칭 haenaelge.vercel.app 은 정지된 옛 팀에 남아 402 다. 진입은 운영 정식 주소로 한다.
const APP_ENTRY_ORIGIN = "https://haenael-ge.vercel.app";
const ALLOWED_APP_ORIGINS = new Set([
  APP_ENTRY_ORIGIN,
  "https://haenael-ge.vercel.app",
]);
const QA_ACCOUNT_PURPOSE = "production-readonly-e2e";

type CapturedCookie = {
  name: string;
  value: string;
  options?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: boolean | "lax" | "strict" | "none";
    maxAge?: number;
  };
};

type CashoutSnapshot = {
  id: number;
  status: string;
  requested_at: string;
  paid_at: string | null;
  rejected_at: string | null;
};

type CookieToAdd = Parameters<BrowserContext["addCookies"]>[0][number];
type QaSupabase = ReturnType<typeof createBrowserClient>;

type HealthResponse = {
  status: string;
  version: string;
  sourceSha: string | null;
  database: string;
};

const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
const KAKAO_UA_CONTEXTS = [
  {
    name: "iphone-kakaotalk",
    device: devices["iPhone 13"],
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK/11.2.1",
    expectedUa: /iPhone.*KAKAOTALK/i,
  },
  {
    name: "android-kakaotalk",
    device: devices["Galaxy S9+"],
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36 KAKAOTALK/11.2.1",
    expectedUa: /Android.*KAKAOTALK/i,
  },
] as const;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} 미설정. 운영 인증 경로를 SKIP하지 않고 실패 처리한다.`);
  }
  return value;
}

function playwrightSameSite(options?: CapturedCookie["options"]) {
  const sameSite = options?.sameSite;
  if (sameSite === "strict") return "Strict" as const;
  if (sameSite === "none") return "None" as const;
  return "Lax" as const;
}

function expectedBooleanEnv(name: string) {
  const value = requiredEnv(name);
  if (value !== "true" && value !== "false") {
    throw new Error(`${name}는 true 또는 false여야 한다.`);
  }
  return value === "true";
}

async function productionAppOrigin() {
  const entryResponse = await fetch(APP_ENTRY_ORIGIN, { redirect: "follow" });
  const resolvedAppOrigin = new URL(entryResponse.url).origin;
  expect(ALLOWED_APP_ORIGINS.has(resolvedAppOrigin)).toBe(true);
  return resolvedAppOrigin;
}

async function signInQaAccount() {
  const supabaseUrl = requiredEnv("QA_PRODUCTION_SUPABASE_URL");
  const supabaseAnonKey = requiredEnv("QA_PRODUCTION_SUPABASE_ANON_KEY");
  const email = requiredEnv("QA_PRODUCTION_EMAIL");
  const password = requiredEnv("QA_PRODUCTION_PASSWORD");
  const expectedUserId = requiredEnv("QA_PRODUCTION_EXPECTED_USER_ID");

  const supabaseHost = new URL(supabaseUrl);
  expect(supabaseHost.protocol).toBe("https:");
  expect(supabaseHost.hostname.endsWith(".supabase.co")).toBe(true);

  const cookieJar = new Map<string, CapturedCookie>();
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
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

  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`운영 QA 계정 로그인 실패: ${signInError.code}`);
  expect(signIn.user?.id).toBe(expectedUserId);
  expect(signIn.user?.user_metadata?.purpose).toBe(QA_ACCOUNT_PURPOSE);

  const { data: member, error: memberError } = await supabase
    .from("member")
    .select("id")
    .eq("id", expectedUserId)
    .maybeSingle();
  if (memberError) throw new Error(`QA 계정 제품행 확인 실패: ${memberError.code}`);
  expect(member, "QA 계정은 auth-only여야 하며 member 제품행을 가지면 안 된다").toBeNull();

  return { cookieJar, supabase };
}

async function firstPublicGoalSlug(supabase: QaSupabase) {
  const { data, error } = await supabase
    .from("goal_public")
    .select("slug")
    .eq("status", "ACTIVE")
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`공개 목표 조회 실패: ${error.code}`);
  expect(data?.slug, "운영에 읽기 전용으로 열 공개 ACTIVE 목표가 필요하다").toBeTruthy();
  return data!.slug!;
}

async function assertKakaoSdkInitializes(page: Page) {
  await page.addScriptTag({ url: KAKAO_SDK_URL });
  const initialized = await page.evaluate(() => {
    const kakaoWindow = window as Window & {
      Kakao?: { init(key: string): void; isInitialized(): boolean };
    };
    if (!kakaoWindow.Kakao) return false;
    if (!kakaoWindow.Kakao.isInitialized()) {
      kakaoWindow.Kakao.init("qa-readonly-sdk-initialization-probe");
    }
    return kakaoWindow.Kakao.isInitialized();
  });
  expect(initialized, "카카오 SDK가 CSP 안에서 로드·초기화돼야 한다").toBe(true);
}

async function dismissAnalyticsConsent(page: Page, contextName: string) {
  const banner = page.getByTestId("analytics-consent-banner");
  if (await banner.isVisible()) {
    const rejectButton = banner.getByRole("button", { name: "국외 이전에 동의하지 않음" });
    const deadline = Date.now() + 8_000;
    while (await banner.isVisible() && Date.now() < deadline) {
      await rejectButton.click();
      await page.waitForTimeout(250);
    }
    await expect.soft(
      banner,
      `${contextName}: 분석 동의 거부 버튼 클릭 뒤 배너가 닫혀야 한다`,
    ).toBeHidden();
  }
  return !(await banner.isVisible());
}

async function addCapturedCookies(
  context: BrowserContext,
  cookies: CapturedCookie[],
  appOrigins: string[],
) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const activeCookies: CookieToAdd[] = appOrigins.flatMap((appOrigin) =>
    cookies
      .filter(({ value, options }) => value && options?.maxAge !== 0)
      .map(({ name, value, options }) => ({
        name,
        value,
        url: appOrigin,
        httpOnly: options?.httpOnly ?? false,
        secure: options?.secure ?? true,
        sameSite: playwrightSameSite(options),
        expires: nowSeconds + (options?.maxAge ?? 60 * 60),
      })),
  );

  expect(activeCookies.length, "Supabase SSR 세션 쿠키가 발급돼야 한다").toBeGreaterThan(0);
  await context.addCookies(activeCookies);
}

async function cashoutSnapshot(
  supabase: ReturnType<typeof createBrowserClient>,
): Promise<CashoutSnapshot[]> {
  const { data, error } = await supabase
    .from("cashout_request")
    .select("id,status,requested_at,paid_at,rejected_at")
    .order("id", { ascending: true });

  if (error) throw new Error(`cashout_request 읽기 실패: ${error.code}`);
  return (data ?? []) as CashoutSnapshot[];
}

function watchForbiddenWrites(page: Page) {
  const forbidden: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    const method = request.method();
    const isCashoutServerAction =
      ALLOWED_APP_ORIGINS.has(url.origin) && url.pathname === "/cashout" && method === "POST";
    const isCashoutWriteRpc = url.pathname.includes("/rest/v1/rpc/create_cashout_request");
    const isDirectProductMutation =
      url.pathname.startsWith("/rest/v1/") && ["PATCH", "DELETE"].includes(method);

    if (isCashoutServerAction || isCashoutWriteRpc || isDirectProductMutation) {
      forbidden.push(`${method} ${url.pathname}`);
    }
  });
  return forbidden;
}

test("QA-PROD-PUBLIC-01 /api/health 배포 버전이 기대 버전과 일치한다", async () => {
  const expectedVersion = requiredEnv("QA_PRODUCTION_EXPECTED_APP_VERSION");
  const response = await fetch(`${APP_ENTRY_ORIGIN}/api/health`, { redirect: "follow" });
  expect(response.status).toBe(200);
  const health = await response.json() as HealthResponse;
  expect(health.status).toBe("ok");
  expect(health.database).toBe("ok");
  expect(health.version).toBe(expectedVersion);
  expect(health.sourceSha).toMatch(/^[0-9a-f]{7,40}$/i);
});

test("QA-PROD-PUBLIC-02 iPhone·Android 카카오톡 UA에서 공개 목표가 hydration되고 결제·Kakao SDK가 기대 상태다", async ({
  browser,
}, testInfo) => {
  const paymentsEnabled = expectedBooleanEnv("QA_PRODUCTION_PAYMENTS_ENABLED");
  const resolvedAppOrigin = await productionAppOrigin();
  const { cookieJar, supabase } = await signInQaAccount();
  const goalSlug = await firstPublicGoalSlug(supabase);

  for (const ua of KAKAO_UA_CONTEXTS) {
    const context = await browser.newContext({ ...ua.device, userAgent: ua.userAgent });
    await addCapturedCookies(
      context,
      [...cookieJar.values()],
      [...new Set([APP_ENTRY_ORIGIN, resolvedAppOrigin])],
    );
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const forbiddenWrites = watchForbiddenWrites(page);

    const response = await page.goto(`${APP_ENTRY_ORIGIN}/g/${goalSlug}`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId("goal-public-page")).toBeVisible();
    expect(await page.evaluate(() => navigator.userAgent)).toMatch(ua.expectedUa);
    const consentDismissed = await dismissAnalyticsConsent(page, ua.name);

    if (!consentDismissed) {
      await page.screenshot({
        path: testInfo.outputPath(`production-public-${ua.name}-hydration-failed.png`),
        fullPage: true,
      });
      expect.soft(forbiddenWrites).toEqual([]);
      expect.soft(pageErrors).toEqual([]);
      expect.soft(consoleErrors).toEqual([]);
      await context.close();
      continue;
    }

    const menuTrigger = page.getByRole("button", { name: "이 목표 더보기" });
    await menuTrigger.click();
    await expect(page.getByRole("menu")).toBeVisible();

    const paymentButton = page.locator("button[data-testid=cheer-cta]");
    await expect(paymentButton).toBeVisible();
    if (paymentsEnabled) {
      await expect(paymentButton).toBeEnabled();
      await expect(paymentButton).not.toContainText("응원 결제 준비 중");
      await paymentButton.click();
      await expect(page.getByTestId("cheer-payment-sheet")).toBeVisible();
    } else {
      await expect(paymentButton).toBeDisabled();
      await expect(paymentButton).toContainText("응원 결제 준비 중");
    }

    await assertKakaoSdkInitializes(page);
    await page.screenshot({
      path: testInfo.outputPath(`production-public-${ua.name}.png`),
      fullPage: true,
    });
    expect(forbiddenWrites).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    await context.close();
  }

  await supabase.auth.signOut({ scope: "local" });
});

test("QA-PROD-AUTH-01 운영 세션으로 환전 읽기 화면을 열고 제품 데이터를 쓰지 않는다", async ({
  browser,
}, testInfo) => {
  const resolvedAppOrigin = await productionAppOrigin();
  const { cookieJar, supabase } = await signInQaAccount();

  const before = await cashoutSnapshot(supabase);
  const context = await browser.newContext();
  await addCapturedCookies(
    context,
    [...cookieJar.values()],
    [...new Set([APP_ENTRY_ORIGIN, resolvedAppOrigin])],
  );
  const page = await context.newPage();
  const forbiddenWrites = watchForbiddenWrites(page);

  const response = await page.goto(`${APP_ENTRY_ORIGIN}/cashout`, { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).origin).toBe(resolvedAppOrigin);
  expect(new URL(page.url()).pathname).toBe("/cashout");
  await expect(page.getByTestId("cashout-page")).toBeVisible();
  await expect(page.getByTestId("cashout-below-threshold-banner")).toBeVisible();
  await expect(page.getByTestId("cashout-request-success")).toHaveCount(0);

  await page.screenshot({
    path: testInfo.outputPath("production-auth-cashout.png"),
    fullPage: true,
  });

  const after = await cashoutSnapshot(supabase);
  expect(after).toEqual(before);
  expect(forbiddenWrites).toEqual([]);

  await context.close();
  await supabase.auth.signOut({ scope: "local" });
});
