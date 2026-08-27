/**
 * 운영 인증 읽기 전용 E2E.
 *
 * 이 스펙은 운영 Supabase Auth에서 전용 QA 계정으로 실제 세션을 발급받고,
 * Next.js 운영 서버가 그 세션 쿠키를 읽어 /cashout을 렌더하는지만 확인한다.
 * 환전 신청 버튼은 누르지 않으며 cashout_request의 전후 스냅샷이 같아야 통과한다.
 */

import { createBrowserClient } from "@supabase/ssr";
import { expect, test, type BrowserContext, type Cookie, type Page } from "@playwright/test";

const APP_ENTRY_ORIGIN = "https://haenaelge.vercel.app";
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

async function addCapturedCookies(
  context: BrowserContext,
  cookies: CapturedCookie[],
  appOrigins: string[],
) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const activeCookies: Cookie[] = appOrigins.flatMap((appOrigin) =>
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

test("QA-PROD-AUTH-01 운영 세션으로 환전 읽기 화면을 열고 제품 데이터를 쓰지 않는다", async ({
  browser,
}, testInfo) => {
  const supabaseUrl = requiredEnv("QA_PRODUCTION_SUPABASE_URL");
  const supabaseAnonKey = requiredEnv("QA_PRODUCTION_SUPABASE_ANON_KEY");
  const email = requiredEnv("QA_PRODUCTION_EMAIL");
  const password = requiredEnv("QA_PRODUCTION_PASSWORD");
  const expectedUserId = requiredEnv("QA_PRODUCTION_EXPECTED_USER_ID");

  const supabaseHost = new URL(supabaseUrl);
  expect(supabaseHost.protocol).toBe("https:");
  expect(supabaseHost.hostname.endsWith(".supabase.co")).toBe(true);

  const entryResponse = await fetch(APP_ENTRY_ORIGIN, { redirect: "follow" });
  const resolvedAppOrigin = new URL(entryResponse.url).origin;
  expect(ALLOWED_APP_ORIGINS.has(resolvedAppOrigin)).toBe(true);

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
