import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(resolve("web/package.json"));
const { createBrowserClient } = require("@supabase/ssr");
const { chromium } = require("playwright");

const baseUrl = required("CAPTURE_BASE_URL");
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const statePath = process.env.V1_V2_FIXTURE_STATE ?? "/tmp/haenael-v1-v2-fixture.json";
const outputDir = resolve(
  process.env.V2_DIRECTIVE_EVIDENCE_DIR ??
    "docs/qa/evidence/v2-directive-build-v2-gpt-codex",
);
const password = "haenael-v1-v2-local-fixture-2026!";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} missing`);
  return value;
}

async function authCookies(email) {
  const jar = new Map();
  const client = createBrowserClient(supabaseUrl, anonKey, {
    isSingleton: false,
    cookies: {
      getAll: () => [...jar.values()].map(({ name, value }) => ({ name, value })),
      setAll: (rows) => {
        for (const row of rows) {
          if (!row.value || row.options?.maxAge === 0) jar.delete(row.name);
          else jar.set(row.name, row);
        }
      },
    },
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: true },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const now = Math.floor(Date.now() / 1000);
  return [...jar.values()].map(({ name, value, options }) => ({
    name,
    value,
    domain: "127.0.0.1",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
    expires: now + (options?.maxAge ?? 3600),
  }));
}

const state = JSON.parse(await readFile(statePath, "utf8"));
const authCookieRows = await authCookies(state.ownerEmail);
const routes = [
  ["landing", "/", false, "body"],
  ["public-goal", `/g/${state.ownerSlug}`, false, "[data-testid=goal-public-page]"],
  ["manage", "/my", true, "[data-testid=my-page]"],
  ["friends", "/friends", true, "[data-testid=friends-page]"],
  ["friend-detail", `/friends/${state.friendId}?goal=${state.friendGoalId}`, true, "[data-testid=friend-detail-page]"],
  ["achievements", "/me/achievements", true, "[data-testid=achievements-page]"],
  ["wordmap", `/wordmap/${state.ownerGoalId}`, true, "[data-testid=wordmap-fullview-page]"],
  ["cashout", "/cashout", true, "[data-testid=cashout-page]"],
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [label, path, authenticated, selector] of routes) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      bypassCSP: true,
      locale: "ko-KR",
      timezoneId: "Asia/Seoul",
      reducedMotion: "no-preference",
    });
    if (authenticated) await context.addCookies(authCookieRows);
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const response = await page.goto(`${baseUrl}${path}`, {
      waitUntil: "networkidle",
      timeout: 45_000,
    });
    await page.locator(selector).first().waitFor({ state: "visible", timeout: 20_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.complete
        ? Promise.resolve()
        : new Promise((done) => {
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
        })));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(650);
    await page.addStyleTag({
      content: "*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}",
    });
    const metrics = await page.evaluate(() => {
      const wordmapText = Array.from(document.querySelectorAll("[data-wordmap-item]"))
        .map((element) => element.textContent ?? "")
        .join(" ");
      const forbiddenFragments = ["건넬게요", "저희가", "차례예요", "클로버는"]
        .filter((fragment) => wordmapText.includes(fragment));
      return {
        width: window.innerWidth,
        viewportHeight: window.innerHeight,
        pageHeight: document.documentElement.scrollHeight,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        bottomNav: Boolean(document.querySelector("[data-testid=receiver-bottom-nav]")),
        wordmapItems: document.querySelectorAll("[data-wordmap-item]").length,
        forbiddenWordmapFragments: forbiddenFragments,
        friendCards: document.querySelectorAll("[data-testid=friend-card]").length,
        sparseFriendNextAction: Boolean(document.querySelector("[data-testid=friends-sparse-next-step]")),
        emptyGoalNextAction: Boolean(document.querySelector("[data-testid=my-goals-empty] a")),
        emptyCheerNextAction: Boolean(document.querySelector("[data-testid=received-cheers-empty] a")),
      };
    });
    // 결정 보드용 full-page 캡처에서는 fixed 하단탭을 문서 맨 아래에 한 번만 둔다.
    // 실제 fixed 동작과 노출 여부는 위 metrics에서 스타일 변경 전에 계측한다.
    await page.addStyleTag({
      content: ".receiver-app-shell{position:relative!important}.receiver-tabbar{position:absolute!important;bottom:0!important}.receiver-fixed-action{position:absolute!important;bottom:var(--tabbar-height)!important}",
    });
    const file = `${label}-390-full.png`;
    await page.screenshot({ path: resolve(outputDir, file), fullPage: true });
    results.push({ label, path, status: response?.status() ?? null, consoleErrors, pageErrors, metrics, file });
    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  resolve(outputDir, "capture-results.json"),
  `${JSON.stringify(results, null, 2)}\n`,
);
const failures = results.filter((result) =>
  result.status !== 200 || result.consoleErrors.length || result.pageErrors.length ||
  result.metrics.overflowX || result.metrics.width !== 390 ||
  result.metrics.forbiddenWordmapFragments.length > 0
);
console.log(`full-page captures=${results.length} failures=${failures.length}`);
if (failures.length) process.exitCode = 2;
