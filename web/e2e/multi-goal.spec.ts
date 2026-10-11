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

// 로컬 전용 QA 계정 — 매 실행 고유 이메일(병렬/재실행 충돌 방지).
const QA_EMAIL = `multi-goal-e2e-${Date.now()}@test.local`;
const QA_PASSWORD = "multi-goal-e2e-pw-1234!";

type CapturedCookie = { name: string; value: string; options?: { maxAge?: number } };

test.describe("다중 목표: 목표 2개 생성 → /me에 둘 다 표시", () => {
  test.skip(
    !process.env.RUN_LOCAL_SUPABASE_E2E,
    "RUN_LOCAL_SUPABASE_E2E 미설정 — 로컬 Supabase + dev 서버 가동 상태에서 수동 실행",
  );

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  let userId: string;

  test.beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: QA_EMAIL,
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

  test.afterAll(async () => {
    if (!userId) return;
    await admin.from("goal").delete().eq("member_id", userId);
    await admin.from("member").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
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
      email: QA_EMAIL,
      password: QA_PASSWORD,
    });
    if (signInError) throw new Error(`QA 로그인 실패: ${signInError.message}`);

    const context: BrowserContext = await browser.newContext();
    const nowSeconds = Math.floor(Date.now() / 1000);
    await context.addCookies(
      [...cookieJar.values()]
        .filter(({ value, options }) => value && options?.maxAge !== 0)
        .map(({ name, value, options }) => ({
          name,
          value,
          url: "http://localhost:3000",
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
    await supabase.auth.signInWithPassword({ email: QA_EMAIL, password: QA_PASSWORD });

    // 이전 테스트에서 이미 2개를 만들었으므로 3번째 생성 RPC를 직접 호출해 상한을 채운다.
    await supabase.rpc("create_goal", {
      p_title: "세번째",
      p_reason: "",
      p_due_date: "2030-03-01",
    });

    const context: BrowserContext = await browser.newContext();
    const nowSeconds = Math.floor(Date.now() / 1000);
    await context.addCookies(
      [...cookieJar.values()]
        .filter(({ value, options }) => value && options?.maxAge !== 0)
        .map(({ name, value, options }) => ({
          name,
          value,
          url: "http://localhost:3000",
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
