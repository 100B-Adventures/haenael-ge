import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import {
  type Browser,
  type BrowserContext,
  expect,
  test,
} from "@playwright/test";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 미설정`);
  return value;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "http://127.0.0.1:54321";
const ANON_KEY = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SERVICE_KEY = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const password = "social-web-first-e2e-1234!";
const runId = Date.now();
type CookieRow = { name: string; value: string; options?: { maxAge?: number } };

async function authContext(
  browser: Browser,
  email: string,
): Promise<BrowserContext> {
  const jar = new Map<string, CookieRow>();
  const client = createBrowserClient(SUPABASE_URL, ANON_KEY, {
    isSingleton: false,
    cookies: {
      getAll: () =>
        [...jar.values()].map(({ name, value }) => ({ name, value })),
      setAll: (rows) => {
        for (const row of rows) {
          if (!row.value || row.options?.maxAge === 0) jar.delete(row.name);
          else jar.set(row.name, row as CookieRow);
        }
      },
    },
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const context = await browser.newContext();
  const now = Math.floor(Date.now() / 1000);
  await context.addCookies(
    [...jar.values()].map(({ name, value, options }) => ({
      name,
      value,
      url: "http://localhost:3000",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
      expires: now + (options?.maxAge ?? 3600),
    })),
  );
  return context;
}

test.describe("V2 web-first social slice", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !process.env.RUN_LOCAL_SUPABASE_E2E,
    "로컬 Supabase와 dev server에서만 실행",
  );
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const emails = {
    owner: `social-owner-${runId}@test.local`,
    friend: `social-friend-${runId}@test.local`,
    admin: `social-admin-${runId}@test.local`,
    acceptA: `social-a-${runId}@test.local`,
    acceptB: `social-b-${runId}@test.local`,
  };
  const ids: Record<keyof typeof emails, string> = {} as Record<
    keyof typeof emails,
    string
  >;
  let ownerGoal = 0;
  let publicSlug = "";
  let smokeInviteToken = "";

  test.beforeAll(async () => {
    for (
      const [key, email] of Object.entries(emails) as Array<
        [keyof typeof emails, string]
      >
    ) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user) throw error ?? new Error("user_create_failed");
      ids[key] = data.user.id;
    }
    await admin.from("member").insert(
      Object.entries(ids).map(([key, id]) => ({ id, nickname: `V2-${key}` })),
    );
    await admin.from("admin_member").insert({ member_id: ids.admin });
    const { data: ownerGoals, error: ownerError } = await admin.from("goal")
      .insert({
        member_id: ids.owner,
        slug: `owner-${runId}`,
        title: "매일 기록할게",
        reason: "작게라도 매일",
        due_date: "2030-12-31",
        visibility: "PUBLIC",
        cover_preset_key: "c1",
      }).select("id,slug").single();
    if (ownerError || !ownerGoals) {
      throw ownerError ?? new Error("owner_goal_failed");
    }
    ownerGoal = ownerGoals.id;
    publicSlug = ownerGoals.slug;
    await admin.from("goal").insert([
      {
        member_id: ids.friend,
        slug: `friend-public-${runId}`,
        title: "PUBLIC_SENTINEL 달릴게",
        reason: "PUBLIC_SENTINEL",
        due_date: "2030-12-31",
        visibility: "PUBLIC",
        cover_preset_key: "c2",
      },
      {
        member_id: ids.friend,
        slug: `friend-friends-${runId}`,
        title: "FRIENDS_SENTINEL 읽을게",
        reason: "FRIENDS_SENTINEL",
        due_date: "2030-12-31",
        visibility: "FRIENDS",
        cover_preset_key: "c3",
      },
      {
        member_id: ids.friend,
        slug: `friend-private-${runId}`,
        title: "PRIVATE_SENTINEL 쓸게",
        reason: "PRIVATE_SENTINEL",
        due_date: "2030-12-31",
        visibility: "PRIVATE",
        cover_preset_key: "c4",
      },
    ]);
    await admin.from("friend_connection").insert({
      member_low_id: [ids.owner, ids.friend].sort()[0],
      member_high_id: [ids.owner, ids.friend].sort()[1],
      status: "ACTIVE",
    });
    const ownerClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: ownerAuthError } = await ownerClient.auth.signInWithPassword({
      email: emails.owner,
      password,
    });
    if (ownerAuthError) throw ownerAuthError;
    const { data: smokeInvite, error: smokeInviteError } = await ownerClient.rpc(
      "create_friend_invite",
      { goal_id: ownerGoal, channel: "WEB" },
    );
    if (smokeInviteError || !smokeInvite) {
      throw smokeInviteError ?? new Error("smoke_invite_failed");
    }
    smokeInviteToken = (smokeInvite as { token: string }).token;
    for (let index = 0; index < 3; index += 1) {
      const { data: payment, error: paymentError } = await admin.from("payment")
        .insert({
          order_id: `social-${runId}-${index}`,
          amount_krw: 1000,
          status: "DONE",
          pg_customer_key: "SOCIAL_E2E",
        }).select("id").single();
      if (paymentError || !payment) {
        throw paymentError ?? new Error("payment_failed");
      }
      await admin.from("cheer").insert({
        goal_id: ownerGoal,
        display_name: `응원자${index + 1}`,
        is_anonymous: false,
        message: ["꾸준함", "용기", "성장"][index],
        clover_amount: 1,
        payment_id: payment.id,
        status: "CONFIRMED",
      });
    }
  });

  test.afterAll(async () => {
    for (const id of Object.values(ids)) {
      if (id) await admin.auth.admin.deleteUser(id);
    }
  });

  test("PW-02 목표 관리 화면이 기존 응원, 잔액, 링크, 편집을 보존한다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.goto(`/me/goal/${ownerGoal}`);
    await expect(page.getByTestId("goal-management-page")).toBeVisible();
    await expect(page.getByTestId("receiver-cheer-list")).toBeVisible();
    await expect(page.getByTestId("split-balance-card")).toBeVisible();
    await expect(page.getByTestId("my-link-card")).toBeVisible();
    await expect(page.getByTestId("open-goal-edit-sheet")).toBeVisible();
    expect(
      await page.evaluate(() =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
      ),
    ).toBe(0);
    expect(consoleErrors).toEqual([]);
    await context.close();
  });

  test("PW-03 c1에서 c3 변경 후 reload와 public 화면에 동일 적용된다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.goto(`/me/goal/${ownerGoal}`);
    await page.getByRole("button", { name: "C3" }).click();
    await page.reload();
    await expect(
      page.getByTestId("goal-cover-picker").getByTestId("goal-cover").first(),
    ).toHaveAttribute("data-preset", "c3");
    await page.goto(`/g/${publicSlug}`);
    await expect(page.getByTestId("goal-public-page").getByTestId("goal-cover"))
      .toHaveAttribute("data-preset", "c3");
    await context.close();
  });

  test("PW-04 custom upload finalize는 REVIEW 안내를 내고 기존 커버를 유지한다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.goto(`/me/goal/${ownerGoal}`);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect(page.getByText(/검수 대기열/)).toBeVisible();
    await expect(
      page.getByTestId("goal-cover-picker").getByTestId("goal-cover").first(),
    ).toHaveAttribute("data-preset", "c3");
    await context.close();
  });

  test("SMOKE-01 신규 라우트 전체는 390px에서 console error와 가로 overflow가 없다", async ({ browser }) => {
    const ownerContext = await authContext(browser, emails.owner);
    const ownerPage = await ownerContext.newPage();
    await ownerPage.setViewportSize({ width: 390, height: 844 });
    const ownerConsoleErrors: string[] = [];
    ownerPage.on("console", (message) => {
      if (message.type() === "error") ownerConsoleErrors.push(message.text());
    });
    const ownerRoutes = [
      `/me/goal/${ownerGoal}`,
      "/friends",
      `/friends/${ids.friend}`,
      "/invite",
    ];
    for (const route of ownerRoutes) {
      await ownerPage.goto(route);
      await expect(ownerPage.locator("main")).toBeVisible();
      expect(await ownerPage.evaluate(() =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
      ), route).toBe(0);
    }

    await ownerPage.goto("/friends");
    const tabMetrics = await ownerPage.evaluate(() => {
      const nav = document.querySelector<HTMLElement>(".receiver-tabbar")!;
      const active = nav.querySelector<HTMLElement>("a.is-active")!;
      const icon = active.querySelector<HTMLElement>(".receiver-tabbar-icon")!;
      const label = active.querySelectorAll<HTMLElement>(":scope > span")[1];
      const root = getComputedStyle(document.documentElement);
      const probe = document.createElement("span");
      probe.style.color = "var(--clover)";
      document.body.appendChild(probe);
      const cloverResolved = getComputedStyle(probe).color;
      probe.remove();
      return {
        height: nav.getBoundingClientRect().height,
        icon: icon.getBoundingClientRect().width,
        labelSize: getComputedStyle(label).fontSize,
        labelWeight: getComputedStyle(label).fontWeight,
        activeColor: getComputedStyle(active).color,
        cloverColor: root.getPropertyValue("--clover").trim(),
        cloverResolved,
        lockToken: root.getPropertyValue("--tabbar-lock-size").trim(),
      };
    });
    expect(tabMetrics).toMatchObject({
      height: 64,
      icon: 23,
      labelSize: "10px",
      labelWeight: "700",
      lockToken: "11px",
    });
    expect(tabMetrics.activeColor).toBe(tabMetrics.cloverResolved);
    console.log(`DESIGN_METRICS ${JSON.stringify(tabMetrics)}`);
    expect(ownerConsoleErrors).toEqual([]);
    await ownerContext.close();

    const invitePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const inviteConsoleErrors: string[] = [];
    invitePage.on("console", (message) => {
      if (message.type() === "error") inviteConsoleErrors.push(message.text());
    });
    await invitePage.goto(`/invite/${smokeInviteToken}`);
    await expect(invitePage.getByTestId("invite-accept-card")).toBeVisible();
    expect(await invitePage.evaluate(() =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
    )).toBe(0);
    expect(inviteConsoleErrors).toEqual([]);
    await invitePage.close();

    const adminContext = await authContext(browser, emails.admin);
    const adminPage = await adminContext.newPage();
    await adminPage.setViewportSize({ width: 390, height: 844 });
    const adminConsoleErrors: string[] = [];
    adminPage.on("console", (message) => {
      if (message.type() === "error") adminConsoleErrors.push(message.text());
    });
    await adminPage.goto("/admin");
    await expect(adminPage.getByTestId("goal-cover-review-queue")).toBeVisible();
    expect(await adminPage.evaluate(() =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
    )).toBe(0);
    expect(adminConsoleErrors).toEqual([]);
    await adminContext.close();
  });

  test("PW-05 admin 승인 후 owner와 public 화면에 승인 커버만 보인다", async ({ browser }) => {
    const context = await authContext(browser, emails.admin);
    const page = await context.newPage();
    await page.goto("/admin");
    await expect(page.getByTestId("goal-cover-review-queue")).toBeVisible();
    await page.getByRole("button", { name: "승인" }).click();
    await expect(page.getByText("검수 대기 커버가 없습니다.")).toBeVisible();
    await page.goto(`/g/${publicSlug}`);
    await expect(page.getByRole("img", { name: /목표 커버/ })).toBeVisible();
    await context.close();
  });

  test("PW-06 PUBLIC에서 FRIENDS, PRIVATE 변경 시 공개 경계가 즉시 닫힌다", async ({ browser }) => {
    const ownerContext = await authContext(browser, emails.owner);
    const ownerPage = await ownerContext.newPage();
    await ownerPage.goto(`/me/goal/${ownerGoal}`);
    await ownerPage.getByRole("button", { name: "친구 공개" }).click();
    await expect(ownerPage.getByText("연결된 친구만 볼 수 있어요."))
      .toBeVisible();
    const anon = await browser.newPage();
    await anon.goto(`/g/${publicSlug}`);
    await expect(anon.getByText("PUBLIC_SENTINEL")).toHaveCount(0);
    await ownerPage.getByRole("button", { name: "비공개" }).click();
    await expect(ownerPage.getByText(/나만 볼 수 있고/)).toBeVisible();
    await anon.reload();
    await expect(anon.getByTestId("goal-public-page")).toHaveCount(0);
    await anon.close();
    await ownerContext.close();
  });

  test("PW-07 anon 공개 route는 PUBLIC만 노출한다", async ({ page }) => {
    await page.goto(`/g/friend-public-${runId}`);
    await expect(page.getByText(/PUBLIC_SENTINEL/).first()).toBeVisible();
    await page.goto(`/g/friend-friends-${runId}`);
    await expect(page.getByText(/FRIENDS_SENTINEL/)).toHaveCount(0);
    await page.goto(`/g/friend-private-${runId}`);
    await expect(page.getByText(/PRIVATE_SENTINEL/)).toHaveCount(0);
  });

  test("CC-01 동일 token의 동시 accept는 성공 1, used 1, connection 1이다", async () => {
    const owner = createClient(SUPABASE_URL, ANON_KEY);
    await owner.auth.signInWithPassword({ email: emails.owner, password });
    const { data: invite } = await owner.rpc("create_friend_invite", {
      goal_id: null,
      channel: "WEB",
    });
    const token = (invite as { token: string }).token;
    const actorA = createClient(SUPABASE_URL, ANON_KEY);
    const actorB = createClient(SUPABASE_URL, ANON_KEY);
    await Promise.all([
      actorA.auth.signInWithPassword({ email: emails.acceptA, password }),
      actorB.auth.signInWithPassword({ email: emails.acceptB, password }),
    ]);
    const results = await Promise.all([
      actorA.rpc("accept_friend_invite", { token }),
      actorB.rpc("accept_friend_invite", { token }),
    ]);
    expect(results.filter((result) => !result.error)).toHaveLength(1);
    expect(
      results.filter((result) =>
        result.error?.message.includes("invite_already_used")
      ),
    ).toHaveLength(1);
    const { count } = await admin.from("friend_connection").select("id", {
      head: true,
      count: "exact",
    }).or(`member_low_id.eq.${ids.owner},member_high_id.eq.${ids.owner}`);
    expect(count).toBeGreaterThanOrEqual(2);
  });
});
