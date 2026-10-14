import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
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
const E2E_BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
type CookieRow = { name: string; value: string; options?: { maxAge?: number } };

const LOCAL_DB_CONTAINER = process.env.LOCAL_DB_CONTAINER ??
  "supabase_db_haenael-ge";

function runLocalSql(sql: string) {
  execFileSync("docker", [
    "exec",
    LOCAL_DB_CONTAINER,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-q",
    "-c",
    sql,
  ], { stdio: "pipe" });
}

function ensureLocalStorageCompatibility() {
  execFileSync("docker", [
    "exec",
    LOCAL_DB_CONTAINER,
    "sh",
    "-c",
    'PGPASSWORD="$POSTGRES_PASSWORD" psql -h 127.0.0.1 -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q -c "set role supabase_storage_admin; create unique index if not exists local_verify_storage_objects_name_bucket on storage.objects(name, bucket_id);"',
  ], { stdio: "pipe" });
}

function uuidList(values: string[]) {
  for (const value of values) {
    if (!/^[0-9a-f-]{36}$/i.test(value)) throw new Error("invalid_fixture_uuid");
  }
  return values.map((value) => `'${value}'::uuid`).join(",");
}

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
      url: E2E_BASE_URL,
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
  let friendPublicGoal = 0;
  let friendFriendsGoal = 0;
  let publicSlug = "";
  let smokeInviteToken = "";
  const paymentIds: number[] = [];

  test.beforeAll(async () => {
    ensureLocalStorageCompatibility();
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
    const fixtureNicknames: Record<keyof typeof emails, string> = {
      owner: "해내는 민지",
      friend: "꾸준한 준호",
      admin: "운영자",
      acceptA: "소영",
      acceptB: "도윤",
    };
    const { error: memberError } = await admin.from("member").insert(
      Object.entries(ids).map(([key, id]) => ({
        id,
        nickname: fixtureNicknames[key as keyof typeof emails],
        profile_image: key === "owner"
          ? "/images/social-viral/seoyeon.png"
          : key === "friend"
          ? "/images/social-viral/dogyeong.png"
          : null,
      })),
    );
    if (memberError) throw memberError;
    runLocalSql(
      `insert into public.admin_member(member_id) values('${ids.admin}'::uuid) on conflict do nothing;`,
    );
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
    const { data: friendGoals, error: friendGoalsError } = await admin.from(
      "goal",
    ).insert([
      {
        member_id: ids.friend,
        slug: `friend-public-${runId}`,
        title: "아침마다 달릴게",
        reason: "건강한 습관을 만들고 싶어요",
        due_date: "2030-12-31",
        visibility: "PUBLIC",
        cover_preset_key: "c2",
      },
      {
        member_id: ids.friend,
        slug: `friend-friends-${runId}`,
        title: "매달 책 한 권 읽을게",
        reason: "친구들과 독서 기록을 나누고 싶어요",
        due_date: "2030-12-31",
        visibility: "FRIENDS",
        cover_preset_key: "c3",
      },
      {
        member_id: ids.friend,
        slug: `friend-private-${runId}`,
        title: "매일 감사 한 줄 쓸게",
        reason: "하루를 다정하게 마무리하고 싶어요",
        due_date: "2030-12-31",
        visibility: "PRIVATE",
        cover_preset_key: "c4",
      },
    ]).select("id,slug");
    if (friendGoalsError || !friendGoals) {
      throw friendGoalsError ?? new Error("friend_goals_failed");
    }
    friendPublicGoal = friendGoals.find(({ slug }) =>
      slug === `friend-public-${runId}`
    )?.id ?? 0;
    friendFriendsGoal = friendGoals.find(({ slug }) =>
      slug === `friend-friends-${runId}`
    )?.id ?? 0;
    if (!friendPublicGoal || !friendFriendsGoal) {
      throw new Error("friend_goal_fixture_missing");
    }
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
      paymentIds.push(payment.id);
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
    if (ids.owner && ownerGoal) {
      const prefix = `${ids.owner}/${ownerGoal}`;
      const { data: privateObjects } = await admin.storage.from(
        "goal-cover-quarantine",
      ).list(prefix);
      if (privateObjects?.length) {
        await admin.storage.from("goal-cover-quarantine").remove(
          privateObjects.map((object) => `${prefix}/${object.name}`),
        );
      }
      const { data: publicObjects } = await admin.storage.from(
        "goal-cover-public",
      ).list(String(ownerGoal));
      if (publicObjects?.length) {
        await admin.storage.from("goal-cover-public").remove(
          publicObjects.map((object) => `${ownerGoal}/${object.name}`),
        );
      }
    }
    const memberIds = Object.values(ids).filter(Boolean);
    if (memberIds.length) {
      const members = uuidList(memberIds);
      const payments = paymentIds.length ? paymentIds.join(",") : "NULL";
      runLocalSql(`
        delete from public.cheer where goal_id in (
          select id from public.goal where member_id in (${members})
        );
        delete from public.admin_member where member_id in (${members});
        delete from public.member where id in (${members});
        delete from public.payment where id in (${payments});
      `);
    }
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

  test("AUTH-GOAL-01 비로그인 목표 관리는 권한없음 상태이고 로그아웃을 노출하지 않는다", async ({ page }) => {
    await page.goto(`/me/goal/${ownerGoal}`);
    await expect(page.getByTestId("goal-access-required")).toBeVisible();
    await expect(page.getByText("권한이 필요한 화면이에요.")).toBeVisible();
    await expect(page.getByRole("button", { name: "로그아웃" })).toHaveCount(0);
    await expect(page.getByTestId("receiver-bottom-nav").locator("a").nth(3))
      .toHaveAttribute("href", "/");
  });

  test("MY-01 마이페이지는 프로필, 목표, 친구 수, 업적, 소속감 큐와 활성 탭을 렌더한다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/my");
    await expect(page.getByTestId("my-page-overview")).toBeVisible();
    await expect(page.getByTestId("my-profile-summary")).toContainText("해내는 민지");
    await expect(page.getByTestId("my-profile-summary")).toContainText("친구 1명");
    await expect(page.getByTestId("my-goal-summary-card")).toHaveCount(1);
    await expect(page.getByTestId("achievement-received_cheer_count")).toContainText("3");
    await expect(page.getByTestId("achievement-connected_friend_count")).toContainText("1");
    await expect(page.getByTestId("belonging-queue-item")).toHaveCount(2);
    const myTab = page.getByTestId("receiver-bottom-nav").getByRole("link", { name: /마이/ });
    await expect(myTab).toHaveAttribute("href", "/my");
    await expect(myTab).toHaveAttribute("aria-current", "page");
    const horizontalOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(horizontalOverflow).toBe(0);
    const ergonomics = await page.evaluate(() => {
      const visible = (element: Element) => {
        const node = element as HTMLElement;
        const rect = node.getBoundingClientRect();
        return node.offsetParent !== null && rect.width > 0 && rect.height > 0;
      };
      const textSizes = Array.from(document.querySelectorAll("body *"))
        .filter((element) =>
          visible(element) &&
          !["SCRIPT", "STYLE", "SVG", "PATH"].includes(element.tagName) &&
          Array.from(element.childNodes).some((node) =>
            node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
          )
        )
        .map((element) => Number.parseFloat(getComputedStyle(element).fontSize))
        .sort((left, right) => left - right);
      const taps = Array.from(document.querySelectorAll(
        'a[href],button,[role="button"],input:not([type="hidden"]),select,textarea,summary,label[for]',
      )).filter(visible);
      const activeSelectors: string[] = [];
      const walk = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
          const selector = (rule as CSSStyleRule).selectorText ?? "";
          if (selector.includes(":active")) {
            activeSelectors.push(...selector.split(",").map((item) =>
              item.replaceAll(":active", "").trim()
            ));
          }
          const nested = (rule as CSSGroupingRule).cssRules;
          if (nested?.length) walk(nested);
        }
      };
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          walk(sheet.cssRules);
        } catch {
          // The product stylesheet is same-origin; cross-origin sheets are irrelevant here.
        }
      }
      const activeCovered = taps.filter((element) =>
        activeSelectors.some((selector) => {
          try {
            return Boolean(selector) && element.matches(selector);
          } catch {
            return false;
          }
        })
      ).length;
      return {
        fontBelow13: textSizes.filter((size) => size < 13).length,
        medianFont: textSizes[Math.floor(textSizes.length / 2)] ?? 0,
        tapBelow44: taps.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 43.5 || rect.height < 43.5;
        }).length,
        activeRatio: taps.length ? activeCovered / taps.length : 1,
      };
    });
    console.info("MY-01 ergonomics", JSON.stringify({
      width: 390,
      horizontalOverflow,
      ...ergonomics,
      consoleErrors: consoleErrors.length,
    }));
    expect(ergonomics.fontBelow13).toBe(0);
    expect(ergonomics.medianFont).toBeGreaterThanOrEqual(16);
    expect(ergonomics.tapBelow44).toBe(0);
    expect(ergonomics.activeRatio).toBeGreaterThanOrEqual(0.9);
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
    const currentCover = page.getByTestId("goal-cover-picker").getByTestId(
      "goal-cover",
    ).first();
    const initialPreset = await currentCover.getAttribute("data-preset");
    expect(initialPreset).toBeTruthy();
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const signResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/functions/v1/goal-cover-sign-upload")
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: png,
    });
    const signResponse = await signResponsePromise;
    const signBody = await signResponse.json() as { upload_url?: string };
    expect(
      signResponse.status(),
      "sign response must succeed",
    ).toBe(200);
    expect(signBody.upload_url).toBeTruthy();
    expect(new URL(signBody.upload_url!).origin).toBe(SUPABASE_URL);
    await expect(page.getByText(/검수 대기열/)).toBeVisible();
    await expect(currentCover).toHaveAttribute("data-preset", initialPreset!);
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
      "/my",
      "/friends",
      `/friends/${ids.friend}?goal=${friendPublicGoal}`,
      "/invite",
    ];
    for (const route of ownerRoutes) {
      await ownerPage.goto(route);
      await expect(ownerPage.locator("body")).toBeVisible();
      await expect(ownerPage.locator("body")).not.toContainText(
        "Application error",
      );
      const overflow = await ownerPage.evaluate(() => ({
        delta: document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
        offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName,
              testId: element.dataset.testid ?? "",
              className: typeof element.className === "string"
                ? element.className.slice(0, 120)
                : "",
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            };
          })
          .filter(({ left, right }) => left < 0 || right > window.innerWidth)
          .slice(0, 12),
      }));
      if (overflow.delta !== 0) {
        console.log(`OVERFLOW_DIAGNOSTIC ${route} ${JSON.stringify(overflow)}`);
      }
      expect(overflow.delta, route).toBe(0);
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
      labelSize: "13px",
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

  test("QA-REVERIFY-SEC-01 친구 응답은 private path를 숨기고 signed URL만 노출하며 admin 검수는 경로를 받는다", async ({ browser }) => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const privatePath = `${ids.friend}/${friendFriendsGoal}/reverify-${runId}.png`;
    const reviewPath = `${ids.owner}/${ownerGoal}/admin-reverify-${runId}.png`;
    let approvedAssetId = "";
    let reviewAssetId = "";
    try {
      const { error: privateUploadError } = await admin.storage.from(
        "goal-cover-quarantine",
      ).upload(privatePath, png, { contentType: "image/png", upsert: false });
      expect(privateUploadError).toBeNull();
      const { error: reviewUploadError } = await admin.storage.from(
        "goal-cover-quarantine",
      ).upload(reviewPath, png, { contentType: "image/png", upsert: false });
      expect(reviewUploadError).toBeNull();

      const { data: approvedAsset, error: approvedAssetError } = await admin
        .from("goal_cover_asset")
        .insert({
          goal_id: friendFriendsGoal,
          owner_member_id: ids.friend,
          quarantine_path: privatePath,
          public_path: null,
          status: "APPROVED",
          content_sha256: "a".repeat(64),
          mime_type: "image/png",
          byte_size: png.length,
          reviewed_by: ids.admin,
          reviewed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      expect(approvedAssetError).toBeNull();
      approvedAssetId = approvedAsset!.id;
      const { error: activateError } = await admin.from("goal").update({
        active_cover_asset_id: approvedAssetId,
      }).eq("id", friendFriendsGoal);
      expect(activateError).toBeNull();

      const { data: reviewAsset, error: reviewAssetError } = await admin
        .from("goal_cover_asset")
        .insert({
          goal_id: ownerGoal,
          owner_member_id: ids.owner,
          quarantine_path: reviewPath,
          public_path: null,
          status: "REVIEW",
          content_sha256: "b".repeat(64),
          mime_type: "image/png",
          byte_size: png.length,
        })
        .select("id")
        .single();
      expect(reviewAssetError).toBeNull();
      reviewAssetId = reviewAsset!.id;

      const ownerClient = createClient(SUPABASE_URL, ANON_KEY);
      const { error: ownerAuthError } = await ownerClient.auth
        .signInWithPassword({ email: emails.owner, password });
      expect(ownerAuthError).toBeNull();
      const [{ data: friendList, error: friendListError }, {
        data: friendDetail,
        error: friendDetailError,
      }] = await Promise.all([
        ownerClient.rpc("my_friend_goals"),
        ownerClient.rpc("friend_goal_detail", { goal_id: friendFriendsGoal }),
      ]);
      expect(friendListError).toBeNull();
      expect(friendDetailError).toBeNull();
      const friendPayload = JSON.stringify({ friendList, friendDetail });
      expect(friendPayload).not.toContain("cover_storage_path");
      expect(friendPayload).not.toContain("quarantine_path");
      expect(friendPayload).not.toContain(privatePath);
      expect((friendDetail as { cover_public_path: string | null })
        .cover_public_path).toBeNull();

      const directDownload = await ownerClient.storage.from(
        "goal-cover-quarantine",
      ).download(privatePath);
      expect(directDownload.data).toBeNull();
      expect(directDownload.error).not.toBeNull();

      const ownerContext = await authContext(browser, emails.owner);
      const ownerPage = await ownerContext.newPage();
      const response = await ownerPage.goto(
        `/friends/${ids.friend}?goal=${friendFriendsGoal}`,
      );
      expect(response?.status()).toBe(200);
      const cover = ownerPage.getByRole("img", { name: /목표 커버/ });
      await expect(cover).toBeVisible();
      const coverUrl = await cover.getAttribute("src");
      expect(coverUrl).toContain(
        "/storage/v1/object/sign/goal-cover-quarantine/",
      );
      expect(coverUrl).not.toContain("cover_storage_path");
      const signedResponse = await ownerPage.request.get(coverUrl!);
      expect(signedResponse.status()).toBe(200);
      await ownerContext.close();

      const adminClient = createClient(SUPABASE_URL, ANON_KEY);
      const { error: adminAuthError } = await adminClient.auth
        .signInWithPassword({ email: emails.admin, password });
      expect(adminAuthError).toBeNull();
      const { data: adminRows, error: adminRowsError } = await adminClient.rpc(
        "admin_list_goal_covers",
        { p_limit: 100 },
      );
      expect(adminRowsError).toBeNull();
      const reviewRow = (adminRows as Array<{
        asset_id: string;
        quarantine_path: string;
      }>).find(({ asset_id }) => asset_id === reviewAssetId);
      expect(reviewRow?.quarantine_path).toBe(reviewPath);
    } finally {
      await admin.from("goal").update({ active_cover_asset_id: null }).eq(
        "id",
        friendFriendsGoal,
      );
      if (approvedAssetId || reviewAssetId) {
        await admin.from("goal_cover_asset").delete().in(
          "id",
          [approvedAssetId, reviewAssetId].filter(Boolean),
        );
      }
      await admin.storage.from("goal-cover-quarantine").remove([
        privatePath,
        reviewPath,
      ]);
    }
  });

  test("QA-REVERIFY-FLOW-01 friendId와 목표 소유자가 다르면 실제 HTTP 404다", async ({ browser }) => {
    const [memberLowId, memberHighId] = [ids.owner, ids.acceptA].sort();
    await admin.from("friend_connection").upsert({
      member_low_id: memberLowId,
      member_high_id: memberHighId,
      status: "ACTIVE",
      blocked_by_member_id: null,
    }, { onConflict: "member_low_id,member_high_id" });
    try {
      const context = await authContext(browser, emails.owner);
      const page = await context.newPage();
      const response = await page.goto(
        `/friends/${ids.acceptA}?goal=${friendPublicGoal}`,
      );
      expect(response?.status()).toBe(404);
      await expect(page.getByTestId("friend-goal-detail")).toHaveCount(0);
      await context.close();
    } finally {
      await admin.from("friend_connection").delete()
        .eq("member_low_id", memberLowId)
        .eq("member_high_id", memberHighId);
    }
  });

  test("QA-REVERIFY-VIEWPORT-01 운영 모드 신규 화면은 390px과 1280px에서 console error와 가로 overflow가 없다", async ({ browser }) => {
    test.setTimeout(180_000);
    const evidenceDir = "../docs/qa/evidence/v2-approved-build-v1.0.0";
    const realignmentEvidenceDir =
      "../docs/qa/evidence/v2-approved-build-realignment-v2.0.0";
    const captureWidths = process.env.APPROVED_CAPTURE_WIDTHS === "390"
      ? [390]
      : [390, 1280];
    mkdirSync(evidenceDir, { recursive: true });
    mkdirSync(realignmentEvidenceDir, { recursive: true });
    if (process.env.RUN_MOBILE_ERGONOMICS === "1") {
      const dataCheck = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await dataCheck.goto(`/g/${publicSlug}`);
      expect(await dataCheck.locator("[data-testid=wordmap] [data-wordmap-tier]").count())
        .toBeGreaterThanOrEqual(3);
      await dataCheck.close();
      for (const width of [360, 390, 412, 600, 700, 780, 820, 900, 1000]) {
        const result = execFileSync("node", [
          "/Users/sj/.claude/harness/bin/mobile-ergonomics-measure.mjs",
          `${E2E_BASE_URL}/g/${publicSlug}`,
          "--width",
          String(width),
          "--json",
        ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
        console.log(`MOBILE_ERGONOMICS ${result.trim()}`);
      }
    }
    const routes = [
      ["goal-detail", `/me/goal/${ownerGoal}`],
      ["mypage", "/my"],
      ["friends", "/friends"],
      ["belong", `/friends/${ids.friend}?goal=${friendPublicGoal}`],
      ["connect", "/invite"],
    ] as const;
    for (const width of captureWidths) {
      const context = await authContext(browser, emails.owner);
      for (const [label, route] of routes) {
        const page = await context.newPage();
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        const consoleErrors: string[] = [];
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.on("pageerror", (error) => consoleErrors.push(error.message));
        const response = await page.goto(route);
        expect(response?.status(), `${width}px ${route}`).toBe(200);
        await expect(page.locator("body")).not.toContainText("Application error");
        const overflow = await page.evaluate(() =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
        );
        expect(overflow, `${width}px ${route}`).toBe(0);
        expect(consoleErrors, `${width}px ${route}`).toEqual([]);
        await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
        await page.screenshot({
          path: `${evidenceDir}/dev-${label}-${width}.png`,
        });
        if (width === 390) {
          await page.screenshot({
            path: `${realignmentEvidenceDir}/dev-${label}-${width}.png`,
          });
        }
        await page.close();
      }
      await context.close();

      const invitePage = await browser.newPage({
        viewport: { width, height: width === 390 ? 844 : 900 },
      });
      const inviteErrors: string[] = [];
      invitePage.on("console", (message) => {
        if (message.type() === "error") inviteErrors.push(message.text());
      });
      invitePage.on("pageerror", (error) => inviteErrors.push(error.message));
      const inviteResponse = await invitePage.goto(`/invite/${smokeInviteToken}`);
      expect(inviteResponse?.status()).toBe(200);
      expect(await invitePage.evaluate(() =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
      )).toBe(0);
      expect(inviteErrors).toEqual([]);
      await invitePage.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await invitePage.screenshot({
        path: `${evidenceDir}/dev-inviteaccept-${width}.png`,
      });
      if (width === 390) {
        await invitePage.screenshot({
          path: `${realignmentEvidenceDir}/dev-inviteaccept-${width}.png`,
        });
      }
      await invitePage.close();

      for (const [label, route] of [
        ["landing", "/"],
        ["goalpublic", `/g/${publicSlug}`],
      ] as const) {
        const guestPage = await browser.newPage({
          viewport: { width, height: width === 390 ? 844 : 900 },
        });
        const guestErrors: string[] = [];
        guestPage.on("console", (message) => {
          if (message.type() === "error") guestErrors.push(message.text());
        });
        guestPage.on("pageerror", (error) => guestErrors.push(error.message));
        const guestResponse = await guestPage.goto(route);
        expect(guestResponse?.status(), `${width}px ${route}`).toBe(200);
        await expect(guestPage.getByTestId("receiver-bottom-nav")).toBeVisible();
        expect(await guestPage.evaluate(() =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
        )).toBe(0);
        expect(guestErrors, `${width}px ${route}`).toEqual([]);
        await guestPage.addStyleTag({ content: "nextjs-portal{display:none!important}" });
        await guestPage.screenshot({
          path: `${evidenceDir}/dev-${label}-${width}.png`,
        });
        if (width === 390) {
          await guestPage.screenshot({
            path: `${realignmentEvidenceDir}/dev-${label}-${width}.png`,
          });
        }
        await guestPage.close();
      }

      const adminContext = await authContext(browser, emails.admin);
      const adminPage = await adminContext.newPage();
      await adminPage.setViewportSize({
        width,
        height: width === 390 ? 844 : 900,
      });
      const adminErrors: string[] = [];
      adminPage.on("console", (message) => {
        if (message.type() === "error") adminErrors.push(message.text());
      });
      adminPage.on("pageerror", (error) => adminErrors.push(error.message));
      const adminResponse = await adminPage.goto("/admin");
      expect(adminResponse?.status()).toBe(200);
      expect(await adminPage.evaluate(() =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
      )).toBe(0);
      expect(adminErrors).toEqual([]);
      await adminPage.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await adminPage.screenshot({
        path: `${evidenceDir}/dev-cover-review-${width}.png`,
      });
      await adminContext.close();
    }
  });

  test("PW-05 admin 승인 후 owner와 public 화면에 승인 커버만 보인다", async ({ browser }) => {
    const { count: pendingCount } = await admin.from("goal_cover_asset")
      .select("id", { head: true, count: "exact" })
      .eq("goal_id", ownerGoal)
      .eq("status", "REVIEW");
    if (!pendingCount) {
      const ownerContext = await authContext(browser, emails.owner);
      const ownerPage = await ownerContext.newPage();
      await ownerPage.goto(`/me/goal/${ownerGoal}`);
      await ownerPage.locator('input[type="file"]').setInputFiles({
        name: "cover-for-review.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
      });
      await expect(ownerPage.getByText(/검수 대기열/)).toBeVisible();
      await ownerContext.close();
    }
    const context = await authContext(browser, emails.admin);
    const page = await context.newPage();
    await page.goto("/admin");
    await expect(page.getByTestId("goal-cover-review-queue")).toBeVisible();
    const reviewResponse = page.waitForResponse((response) =>
      response.url().includes("/functions/v1/admin-review-goal-cover")
    );
    await page.getByRole("button", { name: "승인" }).click();
    const response = await reviewResponse;
    const responseBody = await response.text();
    expect(response.ok(), `admin review ${response.status()} ${responseBody}`)
      .toBe(true);
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
    await expect(anon.getByText("매일 기록할게")).toHaveCount(0);
    await ownerPage.getByRole("button", { name: "비공개" }).click();
    await expect(ownerPage.getByText(/나만 볼 수 있고/)).toBeVisible();
    await anon.reload();
    await expect(anon.getByTestId("goal-public-page")).toHaveCount(0);
    await anon.close();
    await ownerContext.close();
  });

  test("PW-07 anon 공개 route는 PUBLIC만 노출한다", async ({ page }) => {
    await page.goto(`/g/friend-public-${runId}`);
    await expect(page.getByText(/아침마다 달릴게/).first()).toBeVisible();
    await page.goto(`/g/friend-friends-${runId}`);
    await expect(page.getByText(/매달 책 한 권 읽을게/)).toHaveCount(0);
    await page.goto(`/g/friend-private-${runId}`);
    await expect(page.getByText(/매일 감사 한 줄 쓸게/)).toHaveCount(0);
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
    const winnerId = results[0].error ? ids.acceptB : ids.acceptA;
    const [memberLowId, memberHighId] = [ids.owner, winnerId].sort();
    const { count } = await admin.from("friend_connection").select("id", {
      head: true,
      count: "exact",
    }).eq("member_low_id", memberLowId).eq("member_high_id", memberHighId);
    expect(count).toBe(1);
    const { data: acceptedInvite, error: acceptedInviteError } = await admin
      .from("friend_invite")
      .select("accepted_by,accepted_at")
      .eq("accepted_by", winnerId)
      .single();
    expect(acceptedInviteError).toBeNull();
    expect(acceptedInvite?.accepted_by).toBe(winnerId);
    expect(acceptedInvite?.accepted_at).toBeTruthy();
  });

  test("ORDER-ATTR-01 replay는 최초 회원 응원 귀속을 다른 사용자로 바꾸지 않는다", async () => {
    const supporterA = createClient(SUPABASE_URL, ANON_KEY);
    const supporterB = createClient(SUPABASE_URL, ANON_KEY);
    const [{ data: authA, error: authAError }, { data: authB, error: authBError }] =
      await Promise.all([
        supporterA.auth.signInWithPassword({ email: emails.acceptA, password }),
        supporterB.auth.signInWithPassword({ email: emails.acceptB, password }),
      ]);
    if (authAError || authBError || !authA.session || !authB.session) {
      throw authAError ?? authBError ?? new Error("supporter_auth_failed");
    }
    const body = {
      goalId: friendPublicGoal,
      amountKrw: 1000,
      displayName: "첫 응원자",
      isAnonymous: false,
      message: "귀속 보안 검증",
      customerKey: `attr_${runId}`,
      requestKey: `attr-${runId}`,
    };
    const createOrder = (accessToken: string) =>
      fetch(`${SUPABASE_URL}/functions/v1/cheer-order`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    const freshResponse = await createOrder(authA.session.access_token);
    const freshBody = await freshResponse.json() as {
      cheerId: number;
      paymentId: number;
    };
    expect(freshResponse.status).toBe(201);
    paymentIds.push(freshBody.paymentId);
    const replayResponse = await createOrder(authB.session.access_token);
    expect(replayResponse.status).toBe(200);
    const { data: attribution, error: attributionError } = await admin
      .from("social_cheer_member_attribution")
      .select("supporter_member_id")
      .eq("cheer_id", freshBody.cheerId)
      .single();
    expect(attributionError).toBeNull();
    expect(attribution?.supporter_member_id).toBe(ids.acceptA);
  });
});
