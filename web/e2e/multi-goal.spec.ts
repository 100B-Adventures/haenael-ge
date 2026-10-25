// e2e/multi-goal.spec.ts — 다중 목표(설계 §4.4~4.6, 2026-09-21) 핵심 플로우
//
// 목표 2개를 실제로 생성해 /me에 둘 다 표시되는지 확인한다. 로컬 Supabase에
// 서비스 롤로 QA 전용 인증 유저를 만들고(production-auth-readonly.spec.ts와
// 같은 기법 — 진짜 로그인 세션 쿠키를 발급받아 브라우저 컨텍스트에 주입),
// 그 세션으로 /onboarding에서 두 번 저장한다.
//
// 로컬 Supabase + `npm run test:e2e` 조합에서만 완전 실행된다(NEXT_PUBLIC_SUPABASE_URL이
// 이 스펙이 쓰는 로컬 URL과 일치하는 .next 빌드가 필요 — 다른 URL로 빌드된 .next를
// 재사용하면 세션이 전부 로그아웃으로 실패한다).

import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { execFileSync } from "node:child_process";
import { test, expect, type BrowserContext } from "@playwright/test";

// 시크릿 리터럴을 커밋하지 않는다 — 값은 로컬 .env.local/셸 env로만 주입한다.
// (로컬 supabase start 표준 데모 키를 쓰더라도 문자열로 박제하지 않는다.)
function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} 미설정 — 로컬 supabase status 값을 env로 주입해야 한다.`);
  }
  return value;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const APP_ORIGIN = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").origin;
const LOCAL_DB_CONTAINER = process.env.LOCAL_DB_CONTAINER ?? "supabase_db_haenael-ge";
const E2E_ENVIRONMENT = process.env.E2E_ENVIRONMENT ?? "local";
const IS_STAGING = E2E_ENVIRONMENT === "staging";
const STAGING_PROJECT_REF = "ezzklgotgydwxqebfoys";
const PRODUCTION_WEB_HOSTS = new Set([
  "haenael-ge.vercel.app",
  "haenael-ge-100-b.vercel.app",
  "web-two-theta-bmil2ljwdg.vercel.app",
  "haenael-ge-git-main-100-b.vercel.app",
  "haenael-2y3gnz5cy-100-b.vercel.app",
]);

const QA_PASSWORD = "multi-goal-e2e-pw-1234!";

type CapturedCookie = { name: string; value: string; options?: { maxAge?: number } };

function assertStagingGuards() {
  if (!IS_STAGING) return;
  const projectRef = requiredEnv("SUPABASE_STAGING_PROJECT_REF");
  const stagingBaseUrl = requiredEnv("STAGING_WEB_BASE_URL");
  if (projectRef !== STAGING_PROJECT_REF) throw new Error("staging_project_ref_mismatch");
  if (new URL(SUPABASE_URL).hostname.split(".")[0] !== projectRef) throw new Error("staging_supabase_url_mismatch");
  if (APP_ORIGIN !== new URL(stagingBaseUrl).origin) throw new Error("staging_web_base_url_mismatch");
  if (PRODUCTION_WEB_HOSTS.has(new URL(APP_ORIGIN).hostname.toLowerCase())) throw new Error("production_web_base_url_forbidden");
}

async function assertStagingRuntime() {
  if (!IS_STAGING) return;
  assertStagingGuards();
  const response = await fetch(`${APP_ORIGIN}/api/health`, { redirect: "error" });
  if (!response.ok) throw new Error(`staging_health_failed:${response.status}`);
  const health = await response.json() as { supabaseProjectRef?: string };
  if (health.supabaseProjectRef !== STAGING_PROJECT_REF) throw new Error("staging_runtime_project_ref_mismatch");
}

async function routeStagingOriginWithoutToolbar(context: BrowserContext) {
  if (!IS_STAGING) return;
  await context.route(`${APP_ORIGIN}/**`, async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        "x-vercel-skip-toolbar": "1",
      },
    });
  });
}

async function runFixtureSql(sql: string) {
  if (!IS_STAGING) {
    return execFileSync("docker", [
      "exec", LOCAL_DB_CONTAINER, "psql", "-U", "postgres", "-d", "postgres",
      "-v", "ON_ERROR_STOP=1", "-q", "-t", "-A", "-c", sql,
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  }
  assertStagingGuards();
  const response = await fetch(`https://api.supabase.com/v1/projects/${STAGING_PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("SUPABASE_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!response.ok) throw new Error(`staging_fixture_sql_failed:${response.status}`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("staging_fixture_sql_invalid_response");
  const rows = payload as Array<Record<string, unknown>>;
  const first = rows[0];
  return first ? String(Object.values(first)[0] ?? "") : "";
}

async function deleteFixtureRows(memberId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) throw new Error("invalid_fixture_member_id");
  return runFixtureSql(`
    DELETE FROM public.cheer WHERE goal_id IN (SELECT id FROM public.goal WHERE member_id='${memberId}'::uuid);
    DELETE FROM public.goal WHERE member_id='${memberId}'::uuid;
    DELETE FROM public.member WHERE id='${memberId}'::uuid;
    SELECT
      (SELECT count(*) FROM public.member WHERE id='${memberId}'::uuid) +
      (SELECT count(*) FROM public.goal WHERE member_id='${memberId}'::uuid) AS remaining;
  `);
}

test.describe("다중 목표: 목표 2개 생성 → /me에 둘 다 표시", () => {
  test.skip(
    IS_STAGING ? process.env.RUN_STAGING_SUPABASE_E2E !== "1" : !process.env.RUN_LOCAL_SUPABASE_E2E,
    "RUN_LOCAL_SUPABASE_E2E 또는 staging 실행 플래그가 필요",
  );

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let qaEmail: string;
  let userId: string;

  test.beforeAll(async ({ request }) => {
    test.setTimeout(90_000);
    await assertStagingRuntime();
    const response = await request.get("/onboarding");
    expect(response.ok()).toBeTruthy();
  });

  test.beforeEach(async ({ browserName: _browserName }, testInfo) => {
    qaEmail = `multi-goal-e2e-${Date.now()}-${testInfo.retry}-${testInfo.workerIndex}@test.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email: qaEmail,
      password: QA_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`QA 계정 생성 실패: ${error?.message}`);
    }
    userId = data.user.id;

    const { error: memberError } = await admin
      .from("member")
      .insert({ id: userId, nickname: "다중목표E2E" });
    if (memberError) {
      throw new Error(`member 행 생성 실패: ${memberError.message}`);
    }
  });

  test.afterEach(async () => {
    if (!userId) return;
    const cleanupErrors: string[] = [];
    try {
      // service_role 제품 권한을 넓히지 않고, 실행 환경별 DB 관리 채널에서 이 userId fixture만 지운다.
      const remainingRows = await deleteFixtureRows(userId);
      if (remainingRows !== "0") cleanupErrors.push(`rows-remain:${remainingRows}`);
    } catch (error) {
      cleanupErrors.push(`rows:${error instanceof Error ? error.message : String(error)}`);
    }
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) cleanupErrors.push(`auth:${authError.message}`);
    if (!authError) {
      const remainingAuth = await runFixtureSql(`SELECT count(*) AS remaining FROM auth.users WHERE id='${userId}'::uuid;`);
      if (remainingAuth !== "0") cleanupErrors.push(`auth-remain:${remainingAuth}`);
    }
    userId = "";
    if (cleanupErrors.length) {
      throw new Error(`QA fixture 정리 실패: ${cleanupErrors.join(" | ")}`);
    }
  });

  test("목표 2개를 만들면 /me에 둘 다 표시된다(기존 단일 목표 화면 무회귀 포함)", async ({ browser }) => {
    const cookieJar = new Map<string, CapturedCookie>();
    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: true },
    });

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: qaEmail,
      password: QA_PASSWORD,
    });
    if (signInError) throw new Error(`QA 로그인 실패: ${signInError.message}`);

    const context: BrowserContext = await browser.newContext({
      baseURL: APP_ORIGIN,
    });
    await routeStagingOriginWithoutToolbar(context);
    const nowSeconds = Math.floor(Date.now() / 1000);
    await context.addCookies(
      [...cookieJar.values()]
        .filter(({ value, options }) => value && options?.maxAge !== 0)
        .map(({ name, value, options }) => ({
          name,
          value,
          url: APP_ORIGIN,
          httpOnly: false,
          secure: false,
          sameSite: "Lax" as const,
          expires: nowSeconds + (options?.maxAge ?? 60 * 60),
        })),
    );

    const page = await context.newPage();

    // ── 목표 1 ──────────────────────────────────────────────────────────────
    await page.goto("/onboarding");
    await page.getByTestId("goal-title-input").fill("편입 평점 4.0");
    await page.getByTestId("goal-due-date-input").fill("2030-01-01");
    await page.getByTestId("save-goal-button").click();
    await expect(page.getByTestId("share-link-card")).toBeVisible();

    // ── 목표 2: 온보딩은 항상 열려 있어야 한다(설계 §4.5 — /me로 쫓아내지 않음) ──
    await page.goto("/onboarding");
    await expect(page.getByTestId("onboarding-form")).toBeVisible();
    await page.getByTestId("goal-title-input").fill("토익 900");
    await page.getByTestId("goal-due-date-input").fill("2030-02-01");
    await page.getByTestId("save-goal-button").click();
    await expect(page.getByTestId("share-link-card")).toBeVisible();

    // ── /me: 두 목표 모두 표시 ────────────────────────────────────────────────
    await page.goto("/me");
    await expect(page.getByTestId("receiver-home-page")).toBeVisible();
    // 최근 응원 도착순 정렬(§4.3-1)에서 응원이 둘 다 없으면 생성 역순 —
    // 나중에 만든 "토익 900"이 primary(goal-title)로 온다.
    await expect(page.getByTestId("goal-title")).toContainText("토익 900");
    await expect(page.getByTestId("other-goals-section")).toBeVisible();
    await expect(page.getByText(/편입 평점 4\.0/)).toBeVisible();

    await context.close();
  });

  test("상한(3개) 도달 시 온보딩 저장이 명시 안내로 거부되고 입력을 유지한다", async ({ browser }) => {
    const cookieJar = new Map<string, CapturedCookie>();
    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: true },
    });
    await supabase.auth.signInWithPassword({ email: qaEmail, password: QA_PASSWORD });

    // 이 테스트가 자기 fixture를 전부 만든다. 다른 테스트의 성공 여부나 실행 순서에 의존하지 않는다.
    for (const [index, title] of ["첫번째", "두번째", "세번째"].entries()) {
      const { error } = await supabase.rpc("create_goal", {
        p_title: title,
        p_reason: "",
        p_due_date: `2030-0${index + 1}-01`,
      });
      if (error) throw new Error(`상한 fixture 생성 실패(${title}): ${error.message}`);
    }

    const context: BrowserContext = await browser.newContext({
      baseURL: APP_ORIGIN,
    });
    await routeStagingOriginWithoutToolbar(context);
    const nowSeconds = Math.floor(Date.now() / 1000);
    await context.addCookies(
      [...cookieJar.values()]
        .filter(({ value, options }) => value && options?.maxAge !== 0)
        .map(({ name, value, options }) => ({
          name,
          value,
          url: APP_ORIGIN,
          httpOnly: false,
          secure: false,
          sameSite: "Lax" as const,
          expires: nowSeconds + (options?.maxAge ?? 60 * 60),
        })),
    );
    const page = await context.newPage();

    await page.goto("/onboarding");
    await page.getByTestId("goal-title-input").fill("네번째 목표");
    await page.getByTestId("goal-due-date-input").fill("2030-04-01");
    await page.getByTestId("save-goal-button").click();

    await expect(page.getByText(/진행 중인 목표가 이미 3개예요/)).toBeVisible();
    // 쓴 글을 날리지 않는다.
    await expect(page.getByTestId("goal-title-input")).toHaveValue("네번째 목표");

    await context.close();
  });
});
