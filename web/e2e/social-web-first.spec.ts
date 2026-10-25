import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  type Browser,
  type BrowserContext,
  type Page,
  expect,
  test,
} from "@playwright/test";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 미설정`);
  return value;
}

async function waitForVisualReady(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    await expect(page.locator(selector).first()).toBeVisible({ timeout: 15_000 });
  }
  await expect(page.locator("body")).not.toContainText(/(?:로딩|불러오는) 중/);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }
      await image.decode().catch(() => undefined);
    }));
  });
  await page.waitForFunction(() => Array.from(
    document.querySelectorAll<HTMLElement>("[data-wordmap-layout]"),
  ).every((wordmap) => wordmap.dataset.layoutReady === "true"));
  const wordmapCollisions = await page.evaluate(() => Array.from(
    document.querySelectorAll<HTMLElement>("[data-wordmap-layout]"),
  ).flatMap((wordmap) => {
    const items = Array.from(wordmap.querySelectorAll<HTMLElement>("[data-wordmap-item]"));
    return items.flatMap((item, index) => {
      const first = item.getBoundingClientRect();
      return items.slice(index + 1).flatMap((other) => {
        const second = other.getBoundingClientRect();
        const overlaps = !(
          first.right <= second.left || second.right <= first.left
          || first.bottom <= second.top || second.bottom <= first.top
        );
        return overlaps ? [`${item.textContent}:${other.textContent}`] : [];
      });
    });
  }));
  expect(wordmapCollisions, "D-027-E 워드맵 단어 겹침").toEqual([]);
}

async function verifyWordmapMotionEnvelope(page: Page) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const snapshot = () => page.evaluate(() => {
    const items = Array.from(
      document.querySelectorAll<HTMLElement>("[data-wordmap-layout] [data-wordmap-item]"),
    );
    const positions = items.map((item) => {
      const rect = item.getBoundingClientRect();
      return { text: item.textContent ?? "", x: rect.x, y: rect.y };
    });
    const collisions = items.flatMap((item, index) => {
      const first = item.getBoundingClientRect();
      return items.slice(index + 1).flatMap((other) => {
        const second = other.getBoundingClientRect();
        const overlaps = !(
          first.right <= second.left || second.right <= first.left
          || first.bottom <= second.top || second.bottom <= first.top
        );
        return overlaps ? [`${item.textContent}:${other.textContent}`] : [];
      });
    });
    return { positions, collisions };
  });
  const samples = [await snapshot()];
  await page.waitForTimeout(1_500);
  samples.push(await snapshot());
  await page.waitForTimeout(1_500);
  samples.push(await snapshot());
  for (const [index, sample] of samples.entries()) {
    expect(sample.collisions, `D-027-E 모션 ${index}차 단어 겹침`).toEqual([]);
  }
  const moved = samples[0].positions.some((start, index) => {
    const later = samples.slice(1).map((sample) => sample.positions[index]);
    return later.some((point) => point && (
      Math.abs(point.x - start.x) >= 0.5 || Math.abs(point.y - start.y) >= 0.5
    ));
  });
  expect(moved, "D-027-E no-preference 워드맵 모션").toBe(true);
}

async function captureApprovedPrototype(browser: Browser, evidenceDir: string) {
  const prototypePath = resolve(
    process.cwd(),
    "../docs/design/prototypes/social-viral-loop-v3-opus5.html",
  );
  const cleanCss = [
    ".flowrail,.console,.review,.stagehint,.statusbar,.motionbar{display:none!important}",
    ".frame{border:0!important;border-radius:0!important;box-shadow:none!important}",
    "body{padding-left:0!important}",
    ".stage{padding:0!important;margin:0!important;gap:0!important}",
  ].join("");
  const screens = [
    ["goal-detail", "goaldetail"],
    ["mypage", "mypage"],
    ["friends", "friends"],
    ["belong", "belong"],
    ["connect", "connect"],
    ["inviteaccept", "inviteaccept"],
    ["landing", "landing"],
    ["goalpublic", "goalpublic"],
    ["cover-review", "admin"],
  ] as const;
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  const stateMetrics: Array<Record<string, unknown>> = [];
  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(pathToFileURL(prototypePath).href, { waitUntil: "load" });
    await page.addStyleTag({ content: cleanCss });
    for (const [label, screenId] of screens) {
      await page.evaluate((id) => {
        const scope = globalThis as typeof globalThis & {
          go: (screen: string) => void;
          setMotionLoop?: (on: boolean) => void;
          setState?: (state: string) => void;
          wmCloudAll?: (root: Document | Element) => void;
        };
        document.documentElement.classList.remove("force-motion");
        scope.setMotionLoop?.(false);
        scope.go(id);
        scope.setState?.("normal");
        document.querySelectorAll(".notif-pop.open,.notif-dim.open,.teaser-dim.on,.gp-sheet.open")
          .forEach((element) => element.classList.remove("open", "on"));
        document.querySelectorAll<HTMLElement>("[data-count]").forEach((element) => {
          element.textContent = element.dataset.count ?? element.textContent;
        });
        document.querySelectorAll("[data-anim],.wmpop,.wmnudge,.count-bump")
          .forEach((element) => {
            element.removeAttribute("data-anim");
            element.classList.remove("wmpop", "wmnudge", "count-bump");
          });
        const active = document.getElementById(id);
        if (active) scope.wmCloudAll?.(active);
      }, screenId);
      const frame = page.locator(`#${screenId} .frame`);
      await expect(frame).toBeVisible();
      await frame.evaluate(async (element) => {
        const scrollHost = element.querySelector<HTMLElement>(".app");
        if (scrollHost) scrollHost.scrollTop = 0;
        await document.fonts.ready;
        await Promise.all(Array.from(element.querySelectorAll("img")).map(async (image) => {
          if (!image.complete) {
            await new Promise<void>((done) => {
              image.addEventListener("load", () => done(), { once: true });
              image.addEventListener("error", () => done(), { once: true });
            });
          }
          await image.decode().catch(() => undefined);
        }));
      });
      const box = await frame.boundingBox();
      expect(Math.round(box?.width ?? 0), `${screenId} prototype width`).toBe(390);
      expect(Math.round(box?.height ?? 0), `${screenId} prototype height`).toBe(844);
      stateMetrics.push(await frame.evaluate((element) => {
        const style = getComputedStyle(element);
        const sheet = element.querySelector<HTMLElement>(".gp-sheet");
        const visibleOverlays = Array.from(element.querySelectorAll<HTMLElement>(
          ".notif-dim,.notif-pop,.teaser-dim,.gp-sheet",
        )).filter((node) => getComputedStyle(node).display !== "none").map((node) => node.className);
        const inviteAvatar = element.querySelector<HTMLElement>(".ia-ava");
        const inviteCover = inviteAvatar?.previousElementSibling as HTMLElement | null;
        const inviteCard = inviteAvatar?.parentElement;
        const toRect = (node: HTMLElement | null | undefined) => {
          if (!node) return null;
          const rect = node.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        };
        const goalWhy = element.querySelector<HTMLElement>(".gd-hero .greason");
        const goalSection = element.querySelector<HTMLElement>(".gd-sect");
        const goalCount = element.querySelector<HTMLElement>(".wm-count");
        const goalWordmap = element.querySelector<HTMLElement>(".wordmap");
        const goalRect = {
          why: toRect(goalWhy),
          label: toRect(goalSection),
          count: toRect(goalCount),
          wordmap: toRect(goalWordmap),
        };
        const gap = (next: ReturnType<typeof toRect>, previous: ReturnType<typeof toRect>) =>
          next && previous ? next.y - (previous.y + previous.height) : null;
        return {
          screen_id: element.closest<HTMLElement>(".screen")?.id ?? null,
          opacity: style.opacity,
          transform: style.transform,
          goal_public_sheet_display: sheet ? getComputedStyle(sheet).display : null,
          visible_overlays: visibleOverlays,
          invite_accept_card_rect: toRect(inviteCard),
          invite_accept_cover_rect: toRect(inviteCover),
          goal_detail_geometry: goalSection ? {
            ...goalRect,
            why_to_label: gap(goalRect.label, goalRect.why),
            label_to_count: gap(goalRect.count, goalRect.label),
            count_to_wordmap: gap(goalRect.wordmap, goalRect.count),
            why_font_weight: goalWhy ? getComputedStyle(goalWhy).fontWeight : null,
            label_margin: goalSection ? getComputedStyle(goalSection).margin : null,
            count_margin: goalCount ? getComputedStyle(goalCount).margin : null,
            wordmap_margin: goalWordmap ? getComputedStyle(goalWordmap).margin : null,
          } : null,
        };
      }));
      await frame.screenshot({
        path: `${evidenceDir}/approved-${label}-390.png`,
        animations: "disabled",
      });
    }
    const prototypeBytes = readFileSync(prototypePath);
    writeFileSync(
      `${evidenceDir}/approved-capture-manifest.json`,
      `${JSON.stringify({
        captured_at: new Date().toISOString(),
        prototype: "docs/design/prototypes/social-viral-loop-v3-opus5.html",
        prototype_sha256: createHash("sha256").update(prototypeBytes).digest("hex"),
        viewport_css: { width: 390, height: 844 },
        device_scale_factor: 3,
        output_physical: { width: 1170, height: 2532 },
        clean_export_css: cleanCss,
        states: screens.map(([label, screenId], index) => ({
          label,
          screen_id: screenId,
          scroll_top: 0,
          menu: "closed",
          teaser: "closed",
          motion: "reduced-fixed",
          count: "final",
          computed: stateMetrics[index],
        })),
      }, null, 2)}\n`,
    );
  } finally {
    await context.close();
  }
  return stateMetrics;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "http://127.0.0.1:54321";
const ANON_KEY = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ??
  (["127.0.0.1", "localhost"].includes(new URL(SUPABASE_URL).hostname)
    ? requiredEnv("SERVICE_ROLE_KEY")
    : requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
const password = "social-web-first-e2e-1234!";
const runId = Date.now();
const E2E_BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
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
type CookieRow = { name: string; value: string; options?: { maxAge?: number } };

const LOCAL_DB_CONTAINER = process.env.LOCAL_DB_CONTAINER ??
  "supabase_db_haenael-ge";

function runLocalSql(sql: string) {
  return execFileSync("docker", [
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
    "-t",
    "-A",
    "-c",
    sql,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function assertStagingGuards() {
  if (!IS_STAGING) return;
  const projectRef = requiredEnv("SUPABASE_STAGING_PROJECT_REF");
  const stagingBaseUrl = requiredEnv("STAGING_WEB_BASE_URL");
  if (projectRef !== STAGING_PROJECT_REF) throw new Error("staging_project_ref_mismatch");
  if (new URL(SUPABASE_URL).hostname.split(".")[0] !== projectRef) {
    throw new Error("staging_supabase_url_mismatch");
  }
  if (new URL(E2E_BASE_URL).origin !== new URL(stagingBaseUrl).origin) {
    throw new Error("staging_web_base_url_mismatch");
  }
  if (PRODUCTION_WEB_HOSTS.has(new URL(E2E_BASE_URL).hostname.toLowerCase())) {
    throw new Error("production_web_base_url_forbidden");
  }
}

async function assertStagingRuntime() {
  if (!IS_STAGING) return;
  assertStagingGuards();
  const response = await fetch(`${E2E_BASE_URL}/api/health`, { redirect: "error" });
  if (!response.ok) throw new Error(`staging_health_failed:${response.status}`);
  const health = await response.json() as { supabaseProjectRef?: string };
  if (health.supabaseProjectRef !== STAGING_PROJECT_REF) throw new Error("staging_runtime_project_ref_mismatch");
}

async function routeStagingOriginWithoutToolbar(target: BrowserContext | Page) {
  if (!IS_STAGING) return;
  const appOrigin = new URL(E2E_BASE_URL).origin;
  await target.route(`${appOrigin}/**`, async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        "x-vercel-skip-toolbar": "1",
      },
    });
  });
}

async function newRemotePage(
  browser: Browser,
  options: Parameters<Browser["newPage"]>[0] = {},
) {
  const page = await browser.newPage(options);
  await routeStagingOriginWithoutToolbar(page);
  return page;
}

async function runFixtureSql(sql: string) {
  if (!IS_STAGING) return runLocalSql(sql);
  assertStagingGuards();
  let response: Response;
  try {
    response = await fetch(
      `https://api.supabase.com/v1/projects/${STAGING_PROJECT_REF}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${requiredEnv("SUPABASE_ACCESS_TOKEN")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      },
    );
  } catch (error) {
    const rootCause = error && typeof error === "object" && "cause" in error
      ? (error as { cause?: unknown }).cause
      : error;
    const causes = rootCause instanceof AggregateError
      ? rootCause.errors
      : [rootCause];
    const transport = causes.map((cause) => {
      if (!cause || typeof cause !== "object") return "unknown";
      const detail = cause as { code?: unknown; name?: unknown; syscall?: unknown };
      return [detail.name, detail.code, detail.syscall]
        .filter((value): value is string => typeof value === "string")
        .join(":") || "unknown";
    }).join(",");
    throw new Error(`staging_fixture_transport_failed:${transport}`);
  }
  if (!response.ok) {
    const rawError = await response.text();
    let detail = "unknown";
    try {
      const parsed = JSON.parse(rawError) as { message?: unknown; error?: unknown };
      const candidate = parsed.message ?? parsed.error;
      if (typeof candidate === "string") detail = candidate;
    } catch {
      detail = rawError;
    }
    const safeDetail = detail
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
      .slice(0, 240);
    throw new Error(`staging_fixture_sql_failed:${response.status}:${safeDetail}`);
  }
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("staging_fixture_sql_invalid_response");
  const rows = payload as Array<Record<string, unknown>>;
  const first = rows[0];
  return first ? String(Object.values(first)[0] ?? "") : "";
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

function isoDateFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function authContext(
  browser: Browser,
  email: string,
  deviceScaleFactor?: number,
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
  const context = await browser.newContext({
    ...(deviceScaleFactor ? { deviceScaleFactor } : {}),
  });
  await routeStagingOriginWithoutToolbar(context);
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
    IS_STAGING ? process.env.RUN_STAGING_SUPABASE_E2E !== "1" : !process.env.RUN_LOCAL_SUPABASE_E2E,
    "RUN_LOCAL_SUPABASE_E2E 또는 staging 실행 플래그가 필요",
  );
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const emails = {
    owner: `social-owner-${runId}@test.local`,
    friend: `social-friend-${runId}@test.local`,
    friend2: `social-friend2-${runId}@test.local`,
    friend3: `social-friend3-${runId}@test.local`,
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
  let smokeInviteId = "";
  const paymentIds: number[] = [];
  const delayedProfileCleanups: Array<{ queueId: number; assetId: string; objectPath: string; availableAt: string }> = [];

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await assertStagingRuntime();
    const warmup = await fetch(`${E2E_BASE_URL}/admin`);
    if (!warmup.ok) throw new Error(`admin_warmup_failed:${warmup.status}`);
    assertStagingGuards();
    if (!IS_STAGING) ensureLocalStorageCompatibility();
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
      owner: "서연",
      friend: "윤도경",
      friend2: "서연",
      friend3: "정민서",
      admin: "운영자",
      acceptA: "소영",
      acceptB: "도윤",
    };
    const { error: memberError } = await admin.from("member").insert(
      Object.entries(ids).map(([key, id]) => ({
        id,
        nickname: fixtureNicknames[key as keyof typeof emails],
        profile_image: key === "owner" || key === "friend2"
          ? "/images/social-viral/seoyeon.png"
          : key === "friend"
          ? "/images/social-viral/dogyeong.png"
          : key === "friend3"
          ? "/images/social-viral/jimin.png"
          : null,
      })),
    );
    if (memberError) throw memberError;
    for (const [index, memberId] of [ids.acceptA, ids.acceptB].entries()) {
      const memberUuid = uuidList([memberId]);
      const requestKey = `qa-admin-cashout-${runId}-${index + 1}`;
      const fixtureId = Number(await runFixtureSql(`
        with balance_seed as (
          insert into public.clover_balance(member_id,clover_count)
          values (${memberUuid},30)
          on conflict (member_id) do update set clover_count=excluded.clover_count
          returning member_id
        ), cashout_seed as (
          insert into public.cashout_request(
            member_id,clover_amount,gross_krw,fee_krw,withholding_krw,net_krw,
            status,bank_code,account_holder,account_masked,key_version,risk_flag,
            request_key,request_fingerprint
          )
          select member_id,30,30000,3300,881,25819,'REQUESTED','QA',
            'QA 검증회원 ${index + 1}','••••••1234',1,'CLEAR','${requestKey}',
            jsonb_build_object('qa_fixture',true,'run_id','${runId}')
          from balance_seed
          returning id,member_id
        ), ledger_seed as (
          insert into public.clover_ledger(
            member_id,entry_type,clover_delta,ref_type,ref_id,balance_after
          )
          select member_id,'CASHOUT_HOLD',0,'cashout_request',id,30
          from cashout_seed
          returning ref_id
        )
        select ref_id from ledger_seed;
      `));
      if (!Number.isSafeInteger(fixtureId) || fixtureId <= 0) {
        throw new Error("cashout_fixture_failed");
      }
    }
    await runFixtureSql(
      `insert into public.admin_member(member_id) values('${ids.admin}'::uuid) on conflict do nothing;`,
    );
    const { data: ownerGoals, error: ownerError } = await admin.from("goal")
      .insert([{
        member_id: ids.owner,
        slug: `owner-${runId}`,
        title: "토익 900 넘길게",
        reason: "교환학생 지원 마감 전에 점수를 만들어야 해서.",
        due_date: isoDateFromNow(12),
        status: "ACTIVE",
        visibility: "PUBLIC",
        cover_preset_key: "c1",
      }, {
        member_id: ids.owner,
        slug: `owner-second-${runId}`,
        title: "매일 영어 단어 30개 외울게",
        reason: "토익 목표를 매일의 습관으로 이어가려고.",
        due_date: isoDateFromNow(30),
        status: "ACTIVE",
        visibility: "FRIENDS",
        cover_preset_key: "c3",
      }, {
        member_id: ids.owner,
        slug: `owner-completed-a-${runId}`,
        title: "첫 목표 완료",
        reason: "승인 시안의 DB 검증 가능 완료 목표 fixture",
        due_date: isoDateFromNow(-20),
        status: "CLOSED",
        closed_at: new Date().toISOString(),
        visibility: "PRIVATE",
        cover_preset_key: "c5",
      }, {
        member_id: ids.owner,
        slug: `owner-completed-b-${runId}`,
        title: "두 목표 완료",
        reason: "승인 시안의 DB 검증 가능 완료 목표 fixture",
        due_date: isoDateFromNow(-10),
        status: "CLOSED",
        closed_at: new Date().toISOString(),
        visibility: "PRIVATE",
        cover_preset_key: "c6",
      }]).select("id,slug");
    if (ownerError || !ownerGoals?.length) {
      throw ownerError ?? new Error("owner_goal_failed");
    }
    const publicOwnerGoal = ownerGoals.find(({ slug }) =>
      slug === `owner-${runId}`
    );
    if (!publicOwnerGoal) throw new Error("owner_public_goal_missing");
    ownerGoal = publicOwnerGoal.id;
    publicSlug = publicOwnerGoal.slug;
    const { data: friendGoals, error: friendGoalsError } = await admin.from(
      "goal",
    ).insert([
      {
        member_id: ids.friend,
        slug: `friend-public-${runId}`,
        title: "이번 학기 평점 4.0 해낼게",
        reason: "저번 주 중간고사 두 과목 A 나왔어. 응원 덕분에 버텼어 진짜.",
        due_date: isoDateFromNow(70),
        visibility: "PUBLIC",
        cover_preset_key: "c3",
      },
      {
        member_id: ids.friend,
        slug: `friend-friends-${runId}`,
        title: "매달 책 한 권 읽을게",
        reason: "친구들과 독서 기록을 나누고 싶어요",
        due_date: isoDateFromNow(90),
        visibility: "FRIENDS",
        cover_preset_key: "c3",
      },
      {
        member_id: ids.friend,
        slug: `friend-private-${runId}`,
        title: "매일 감사 한 줄 쓸게",
        reason: "하루를 다정하게 마무리하고 싶어요",
        due_date: isoDateFromNow(120),
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
    const extraFriendGoals = [
      {
        member_id: ids.friend2,
        slug: `friend2-public-${runId}`,
        title: "토익 900 넘길게",
        reason: "모의고사 820점에서 한 걸음 더 가려고.",
        due_date: isoDateFromNow(45),
        visibility: "PUBLIC",
        cover_preset_key: "c1",
      },
      {
        member_id: ids.friend3,
        slug: `friend3-public-${runId}`,
        title: "3개월 안에 5kg 감량 해낼게",
        reason: "무리하지 않고 생활 리듬을 바꾸려고.",
        due_date: isoDateFromNow(80),
        visibility: "PUBLIC",
        cover_preset_key: "c4",
      },
    ];
    const { error: extraGoalError } = await admin.from("goal").insert(
      extraFriendGoals,
    );
    if (extraGoalError) throw extraGoalError;
    const connectionRows = [ids.friend, ids.friend2, ids.friend3].map(
      (friendId) => ({
        member_low_id: [ids.owner, friendId].sort()[0],
        member_high_id: [ids.owner, friendId].sort()[1],
        status: "ACTIVE",
      }),
    );
    const { error: connectionError } = await admin.from("friend_connection")
      .insert(connectionRows);
    if (connectionError) throw connectionError;
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
    smokeInviteId = (smokeInvite as { invite_id: string }).invite_id;
    const { data: acceptedPanelInvite, error: acceptedPanelInviteError } =
      await ownerClient.rpc("create_friend_invite", {
        goal_id: ownerGoal,
        channel: "WEB",
      });
    if (acceptedPanelInviteError || !acceptedPanelInvite) {
      throw acceptedPanelInviteError ?? new Error("accepted_panel_invite_failed");
    }
    const acceptedPanelClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: acceptedPanelAuthError } = await acceptedPanelClient.auth
      .signInWithPassword({ email: emails.friend2, password });
    if (acceptedPanelAuthError) throw acceptedPanelAuthError;
    const { error: acceptedPanelError } = await acceptedPanelClient.rpc(
      "accept_friend_invite",
      { token: (acceptedPanelInvite as { token: string }).token },
    );
    if (acceptedPanelError) throw acceptedPanelError;
    const ownerCheerFixtures = [
      ...Array.from({ length: 15 }, (_, index) => ({
        displayName: `응원자${index + 1}`,
        message: ["꾸준함", "용기", "성장"][index % 3],
        createdAt: new Date(Date.now() - (index + 8) * 86_400_000).toISOString(),
      })),
      {
        displayName: "익명의 누군가",
        message: "끝까지 응원할게요",
        createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      },
      {
        displayName: "서연",
        message: "모의고사 820이면 900 금방이야",
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      },
      {
        displayName: "윤도경",
        message: "도서관에서 같이 힘낸다, 넌 할 수 있어",
        createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      },
    ];
    const cheerTargets = [
      ...ownerCheerFixtures.map((fixture) => ({ goalId: ownerGoal, ...fixture })),
      ...Array.from({ length: 13 }, (_, index) => ({
        goalId: friendPublicGoal,
        displayName: `도경 응원자${index + 1}`,
        message: ["꾸준히", "해낼 수 있어", "끝까지"][index % 3],
        createdAt: new Date(Date.now() - (index + 1) * 86_400_000).toISOString(),
      })),
    ];
    for (let index = 0; index < cheerTargets.length; index += 1) {
      const fixture = cheerTargets[index];
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
      const { data: insertedCheer, error: cheerError } = await admin.from("cheer").insert({
        goal_id: fixture.goalId,
        display_name: fixture.displayName,
        is_anonymous: fixture.displayName === "익명의 누군가",
        message: fixture.message,
        clover_amount: 1,
        payment_id: payment.id,
        status: "CONFIRMED",
        created_at: fixture.createdAt,
      }).select("id").single();
      if (cheerError || !insertedCheer) throw cheerError ?? new Error("cheer_fixture_failed");
      const supporterId = fixture.goalId === ownerGoal && fixture.displayName === "윤도경"
        ? ids.friend
        : fixture.goalId === ownerGoal && fixture.displayName === "서연"
        ? ids.friend2
        : fixture.goalId === friendPublicGoal && index === ownerCheerFixtures.length
        ? ids.owner
        : null;
      if (supporterId) {
        const { error: attributionError } = await admin.from("social_cheer_member_attribution").insert({
          cheer_id: insertedCheer.id,
          supporter_member_id: supporterId,
        });
        if (attributionError) throw attributionError;
      }
    }
  });

  test.afterAll(async () => {
    test.setTimeout(120_000);
    const cleanupErrors: string[] = [];
    if (ids.owner && ownerGoal) {
      const prefix = `${ids.owner}/${ownerGoal}`;
      const { data: privateObjects, error: privateListError } = await admin.storage.from(
        "goal-cover-quarantine",
      ).list(prefix);
      if (privateListError) cleanupErrors.push(`private-list:${privateListError.message}`);
      if (privateObjects?.length) {
        const { error } = await admin.storage.from("goal-cover-quarantine").remove(
          privateObjects.map((object) => `${prefix}/${object.name}`),
        );
        if (error) cleanupErrors.push(`private-remove:${error.message}`);
      }
      const { data: publicObjects, error: publicListError } = await admin.storage.from(
        "goal-cover-public",
      ).list(String(ownerGoal));
      if (publicListError) cleanupErrors.push(`public-list:${publicListError.message}`);
      if (publicObjects?.length) {
        const { error } = await admin.storage.from("goal-cover-public").remove(
          publicObjects.map((object) => `${ownerGoal}/${object.name}`),
        );
        if (error) cleanupErrors.push(`public-remove:${error.message}`);
      }
    }
    const memberIds = Object.values(ids).filter(Boolean);
    if (ids.acceptA && ids.acceptB) {
      try {
        const remainingCashoutFixtures = await runFixtureSql(`
          create temporary table qa_cashout_cleanup_ids on commit drop as
          select id
          from public.cashout_request
          where member_id in (${uuidList([ids.acceptA, ids.acceptB])})
            and request_key like 'qa-admin-cashout-${runId}-%'
            and request_fingerprint->>'run_id'='${runId}';
          delete from public.cashout_account_access_log
          where request_id in (select id from qa_cashout_cleanup_ids);
          delete from public.clover_ledger
          where entry_type='CASHOUT_HOLD'
            and ref_type='cashout_request'
            and ref_id in (select id from qa_cashout_cleanup_ids);
          delete from public.cashout_request
          where id in (select id from qa_cashout_cleanup_ids)
            and request_key like 'qa-admin-cashout-${runId}-%'
            and request_fingerprint->>'run_id'='${runId}';
          delete from public.clover_balance
          where member_id in (${uuidList([ids.acceptA, ids.acceptB])});
          select
            (select count(*) from public.cashout_request where id in (select id from qa_cashout_cleanup_ids)) +
            (select count(*) from public.clover_ledger where ref_type='cashout_request' and ref_id in (select id from qa_cashout_cleanup_ids)) +
            (select count(*) from public.cashout_account_access_log where request_id in (select id from qa_cashout_cleanup_ids));
        `);
        if (remainingCashoutFixtures !== "0") {
          cleanupErrors.push(`cashout-remains:${remainingCashoutFixtures}`);
        }
      } catch (error) {
        cleanupErrors.push(`cashout:${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (memberIds.length) {
      const members = uuidList(memberIds);
      const payments = paymentIds.length ? paymentIds.join(",") : "NULL";
      try {
        await runFixtureSql(`
          delete from public.cheer where goal_id in (
            select id from public.goal where member_id in (${members})
          );
          delete from public.admin_member where member_id in (${members});
          delete from public.member where id in (${members});
          delete from public.payment where id in (${payments});
        `);
      } catch (error) {
        cleanupErrors.push(`rows:${error instanceof Error ? error.message : String(error)}`);
      }
      try {
        const remainingRows = await runFixtureSql(`
          select
            (select count(*) from public.member where id in (${members})) +
            (select count(*) from public.goal where member_id in (${members})) +
            (select count(*) from public.payment where order_id like 'social-${runId}-%');
        `);
        if (remainingRows !== "0") cleanupErrors.push(`db-remains:${remainingRows}`);
      } catch (error) {
        cleanupErrors.push(`db-verify:${error instanceof Error ? error.message : String(error)}`);
      }
    }
    for (const expected of delayedProfileCleanups) {
      const { data: queue, error: queueError } = await admin.from("storage_cleanup_queue")
        .select("id,bucket_id,object_path,status,available_at,profile_avatar_asset_id")
        .eq("id", expected.queueId)
        .maybeSingle();
      if (queueError || !queue) {
        cleanupErrors.push(`profile-cleanup-queue:${expected.queueId}:${queueError?.message ?? "missing"}`);
        continue;
      }
      if (queue.bucket_id !== "profile-avatars" || queue.object_path !== expected.objectPath || queue.available_at !== expected.availableAt) {
        cleanupErrors.push(`profile-cleanup-contract:${expected.queueId}`);
      }
      const { data: avatarAsset, error: avatarAssetError } = await admin
        .from("profile_avatar_asset")
        .select("id,owner_member_id,status")
        .eq("id", expected.assetId)
        .maybeSingle();
      if (avatarAssetError) {
        cleanupErrors.push(`profile-avatar-asset:${expected.assetId}:${avatarAssetError.message}`);
      } else if (queue.status === "DONE") {
        if (queue.profile_avatar_asset_id !== null || avatarAsset !== null) {
          cleanupErrors.push(`profile-cleanup-settlement:${expected.queueId}`);
        }
      } else if (
        queue.profile_avatar_asset_id !== expected.assetId ||
        !avatarAsset ||
        avatarAsset.owner_member_id !== null ||
        avatarAsset.status !== "DELETED"
      ) {
        cleanupErrors.push(`profile-cleanup-owner-not-detached:${expected.queueId}`);
      }
      const pathParts = expected.objectPath.split("/");
      const fileName = pathParts.pop();
      const folder = pathParts.join("/");
      const { data: objects, error: listError } = await admin.storage.from("profile-avatars").list(folder, { search: fileName });
      if (listError) cleanupErrors.push(`profile-avatar-list:${listError.message}`);
      const objectExists = Boolean(objects?.some((object) => object.name === fileName));
      if (queue.status === "DONE" ? objectExists : !objectExists) {
        cleanupErrors.push(`profile-avatar-delayed-state:${expected.queueId}:${queue.status}`);
      }
      console.info("PROFILE_AVATAR_DELAYED_CLEANUP_AFTER_FIXTURE", JSON.stringify({
        queueId: expected.queueId,
        assetId: expected.assetId,
        objectPath: expected.objectPath,
        availableAt: expected.availableAt,
        queueStatus: queue.status,
        objectExists,
        expectedDelayed: queue.status !== "DONE",
      }));
    }
    for (const id of Object.values(ids)) {
      if (!id) continue;
      try {
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) cleanupErrors.push(`auth:${id.slice(0, 8)}:${error.message}`);
      } catch (error) {
        cleanupErrors.push(`auth:${id.slice(0, 8)}:${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (memberIds.length) {
      const members = uuidList(memberIds);
      try {
        const remainingAuth = await runFixtureSql(
          `select count(*) from auth.users where id in (${members});`,
        );
        if (remainingAuth !== "0") cleanupErrors.push(`auth-remains:${remainingAuth}`);
      } catch (error) {
        cleanupErrors.push(`auth-verify:${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (ids.owner && ownerGoal) {
      const privatePrefix = `${ids.owner}/${ownerGoal}`;
      try {
        const [{ data: privateObjects, error: privateError }, {
          data: publicObjects,
          error: publicError,
        }] = await Promise.all([
          admin.storage.from("goal-cover-quarantine").list(privatePrefix),
          admin.storage.from("goal-cover-public").list(String(ownerGoal)),
        ]);
        if (privateError) cleanupErrors.push(`private-verify:${privateError.message}`);
        if (publicError) cleanupErrors.push(`public-verify:${publicError.message}`);
        if (privateObjects?.length) cleanupErrors.push(`private-remains:${privateObjects.length}`);
        if (publicObjects?.length) cleanupErrors.push(`public-remains:${publicObjects.length}`);
      } catch (error) {
        cleanupErrors.push(`storage-verify:${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (cleanupErrors.length) {
      throw new Error(`social fixture 정리 실패: ${cleanupErrors.join(" | ")}`);
    }
  });

  test("OPS-ALERT-01 관리자 화면이 ops_event 경보를 실제 수신한다", async ({ browser }) => {
    const { data: inserted, error: insertError } = await admin.from("ops_event")
      .insert({
        event_type: "STORAGE_CLEANUP_DRAIN_STALLED",
        severity: "ERROR",
        details: { stalled_count: 2, source: `playwright-${runId}` },
      })
      .select("id")
      .single();
    if (insertError || !inserted) throw insertError ?? new Error("ops_alert_fixture_failed");
    const opsEventId = Number(inserted.id);
    if (!Number.isSafeInteger(opsEventId) || opsEventId <= 0) {
      throw new Error("invalid_ops_event_fixture_id");
    }

    const context = await authContext(browser, emails.admin);
    let bodyError: unknown;
    let cleanupError: Error | null = null;
    try {
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      await page.goto("/admin");
      const alerts = page.getByTestId("admin-ops-alerts");
      const coverQueue = page.getByTestId("goal-cover-review-queue");
      expect(await coverQueue.evaluate((node, alertNode) =>
        Boolean(node.compareDocumentPosition(alertNode as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
      await alerts.elementHandle())).toBe(true);
      await alerts.locator("summary").click();
      const currentRunAlert = alerts.locator("li").filter({ hasText: `playwright-${runId}` });
      await expect(currentRunAlert).toHaveCount(1);
      await expect(currentRunAlert).toContainText("STORAGE_CLEANUP_DRAIN_STALLED");
      expect(consoleErrors).toEqual([]);
    } catch (error) {
      bodyError = error;
    } finally {
      await context.close().catch((error: unknown) => {
        cleanupError = error instanceof Error ? error : new Error(String(error));
      });
      try {
        const remaining = await runFixtureSql(`
          delete from public.ops_event where id = ${opsEventId};
          select count(*) from public.ops_event where id = ${opsEventId};
        `);
        if (remaining !== "0") {
          cleanupError = new Error(`ops_event fixture 잔존:${remaining}`);
        }
      } catch (error) {
        cleanupError = error instanceof Error ? error : new Error(String(error));
      }
    }
    if (bodyError) throw bodyError;
    if (cleanupError) throw cleanupError;
  });

  test("PW-02 목표 관리는 프로토타입 순서와 필드별 편집, 응원자 집계, 환전·관리 액션을 보존한다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.goto(`/me/goal/${ownerGoal}`);
    await expect(page.getByTestId("goal-management-page")).toBeVisible();
    await expect(page.getByTestId("goal-supporter-list")).toBeVisible();
    await expect(page.getByText("모은 클로버 · 환전")).toBeVisible();
    await expect(page.getByRole("link", { name: /모은 클로버로 환전하기/ })).toHaveAttribute("href", "/cashout");
    await expect(page.getByRole("link", { name: /친구 화면 미리보기/ })).toHaveAttribute("href", `/g/${publicSlug}`);
    await expect(page.getByRole("button", { name: "응원 링크 복사" })).toBeVisible();
    await expect(page.getByRole("button", { name: "이 목표 종료하기" })).toBeVisible();
    await expect(page.getByTestId("open-goal-edit-sheet")).toBeVisible();
    await page.getByRole("button", { name: "마감일 편집" }).click();
    await expect(page.getByTestId("edit-goal-due-date-input")).toBeVisible();
    await expect(page.getByTestId("edit-goal-title-input")).toHaveCount(0);
    await page.getByRole("button", { name: "취소" }).click();
    await page.getByTestId("open-goal-edit-sheet").click();
    await expect(page.getByTestId("edit-goal-title-input")).toBeVisible();
    await expect(page.getByTestId("edit-goal-due-date-input")).toHaveCount(0);
    await page.getByRole("button", { name: "취소" }).click();
    await expect(page.getByTestId("goal-management-wordmap")).toBeVisible();
    await expect(page.getByTestId("goal-management-wordmap")).toContainText(
      /지금까지\s*18명이 이 단어들로 응원했어요/,
    );
    await expect(page.getByTestId("goal-supporter-item")).toHaveCount(8);
    await page.getByRole("button", { name: "응원 목록 펼치기" }).click();
    await expect(page.getByTestId("goal-supporter-item")).toHaveCount(18);
    expect(await page.getByTestId("goal-details-card").evaluate((node, wordmap) =>
      Boolean(node.compareDocumentPosition(wordmap as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
    await page.getByTestId("goal-management-wordmap").elementHandle())).toBe(true);
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
    const accessRequired = page.getByTestId("goal-access-required");
    await expect(accessRequired).toBeVisible();
    await expect(accessRequired.getByText("권한이 필요한 화면이에요."))
      .toBeVisible();
    await expect(accessRequired.getByRole("link", { name: "로그인하러 가기" }))
      .toHaveAttribute("href", "/");
    await expect(page.getByRole("button", { name: "로그아웃" })).toHaveCount(0);
    // D-049는 승인 prototype v3를 화면·동작 SSOT로 고정한다. 목표 관리의
    // 하단 4탭은 유지하되, 비로그인 화면에는 제3자 데이터가 없어야 한다.
    await expect(page.getByTestId("receiver-bottom-nav")).toBeVisible();
    await expect(page.getByTestId("goal-management-page")).toHaveCount(0);
    await expect(page.getByTestId("receiver-cheer-list")).toHaveCount(0);
    await expect(page.getByTestId("split-balance-card")).toHaveCount(0);
    await expect(page.getByTestId("legal-footer")).toHaveCount(0);
    await expect(page.getByTestId("site-footer")).toHaveCount(0);
    await expect(page.getByText("서연", { exact: true })).toHaveCount(0);
    await expect(page.getByText(/클로버|원|응원자/)).toHaveCount(0);
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
    await expect(page.getByTestId("my-profile-summary")).toContainText("서연");
    await expect(page.getByTestId("my-profile-summary")).toContainText("친구 3명");
    await expect(page.getByTestId("my-profile-summary")).toContainText("진행 중 목표 2개");
    await expect(page.getByTestId("my-page-overview")).toContainText("윤도경");
    await expect(page.getByTestId("my-page-overview")).not.toContainText("주 연속");
    await expect(page.getByTestId("my-page-overview")).not.toContainText("번 함께");
    const profileHitGeometry = await page.evaluate(() => {
      const name = document.querySelector<HTMLElement>(".my-profile-name-button");
      const bio = document.querySelector<HTMLElement>(".my-profile-bio-button");
      const meta = document.querySelector<HTMLElement>(".my-profile-copy > small");
      const nameText = name?.querySelector<HTMLElement>("span");
      const bioText = document.querySelector<HTMLElement>(".my-profile-bio-row > span");
      if (!name || !bio || !meta || !nameText || !bioText) {
        throw new Error("profile_edit_targets_missing");
      }
      const nameRect = name.getBoundingClientRect();
      const bioRect = bio.getBoundingClientRect();
      const metaRect = meta.getBoundingClientRect();
      const textRect = (element: HTMLElement) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getBoundingClientRect();
      };
      const nameTextRect = textRect(nameText);
      const bioTextRect = textRect(bioText);
      const intersectionArea = (left: DOMRect, right: DOMRect) =>
        Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left)) *
        Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
      const centerOwner = (element: HTMLElement, rect: DOMRect) =>
        document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          ?.closest("button") === element;
      return {
        nameHeight: nameRect.height,
        bioHeight: bioRect.height,
        nameBioIntersection: intersectionArea(nameRect, bioRect),
        bioMetaIntersection: intersectionArea(bioRect, metaRect),
        nameBioTextIntersection: intersectionArea(nameTextRect, bioTextRect),
        bioMetaTextIntersection: intersectionArea(bioTextRect, metaRect),
        nameOwnsCenter: centerOwner(name, nameRect),
        bioOwnsCenter: centerOwner(bio, bioRect),
      };
    });
    expect(profileHitGeometry.nameHeight).toBeGreaterThanOrEqual(44);
    expect(profileHitGeometry.bioHeight).toBeGreaterThanOrEqual(44);
    expect(profileHitGeometry.nameBioIntersection).toBe(0);
    expect(profileHitGeometry.bioMetaIntersection).toBe(0);
    expect(profileHitGeometry.nameBioTextIntersection).toBe(0);
    expect(profileHitGeometry.bioMetaTextIntersection).toBe(0);
    expect(profileHitGeometry.nameOwnsCenter).toBe(true);
    expect(profileHitGeometry.bioOwnsCenter).toBe(true);
    const profileEvidenceDir = process.env.E2E_CAPTURE_DIR;
    if (profileEvidenceDir) {
      mkdirSync(profileEvidenceDir, { recursive: true });
      await page.screenshot({ path: `${profileEvidenceDir}/dev-mypage-profile-normal-390.png` });
    }
    const myTab = page.getByTestId("receiver-bottom-nav").getByRole("link", { name: /마이/ });
    await expect(myTab).toHaveAttribute("href", "/my");
    await expect(myTab).toHaveAttribute("aria-current", "page");
    const receivedTab = page.getByRole("tab", { name: "받은 응원" });
    await receivedTab.scrollIntoViewIfNeeded();
    const receivedTabBox = await receivedTab.boundingBox();
    expect(receivedTabBox).not.toBeNull();
    const transformBeforePress = await receivedTab.evaluate((element) =>
      getComputedStyle(element).transform
    );
    await page.mouse.move(
      (receivedTabBox?.x ?? 0) + (receivedTabBox?.width ?? 0) / 2,
      (receivedTabBox?.y ?? 0) + (receivedTabBox?.height ?? 0) / 2,
    );
    await page.mouse.down();
    await page.waitForTimeout(50);
    const transformWhilePressed = await receivedTab.evaluate((element) =>
      getComputedStyle(element).transform
    );
    await page.mouse.move(0, 0);
    await page.mouse.up();
    expect(transformWhilePressed).not.toBe(transformBeforePress);
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
      const tokenProbe = document.createElement("span");
      tokenProbe.style.fontSize = "var(--text-body)";
      document.body.appendChild(tokenProbe);
      const tokenBodyValue = getComputedStyle(document.documentElement)
        .getPropertyValue("--text-body").trim();
      const tokenBodyPx = Number.parseFloat(getComputedStyle(tokenProbe).fontSize);
      tokenProbe.remove();
      return {
        fontBelow13: textSizes.filter((size) => size < 13).length,
        medianFont: textSizes[Math.floor(textSizes.length / 2)] ?? 0,
        tokenBodyValue,
        tokenBodyPx,
        tapBelow44: taps.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 43.5 || rect.height < 43.5;
        }).length,
        tapBelow44Sample: taps.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 43.5 || rect.height < 43.5;
        }).slice(0, 6).map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName,
            testId: element.getAttribute("data-testid") ?? "",
            className: typeof element.className === "string"
              ? element.className.slice(0, 80)
              : "",
            label: (element.getAttribute("aria-label") ?? element.textContent ?? "")
              .trim().slice(0, 40),
            width: Math.round(rect.width * 10) / 10,
            height: Math.round(rect.height * 10) / 10,
          };
        }),
        activeRatio: taps.length ? activeCovered / taps.length : 1,
        activeMissing: taps.filter((element) =>
          !activeSelectors.some((selector) => {
            try {
              return Boolean(selector) && element.matches(selector);
            } catch {
              return false;
            }
          })
        ).map((element) => ({
          tag: element.tagName,
          testId: element.getAttribute("data-testid") ?? "",
          className: typeof element.className === "string"
            ? element.className.slice(0, 80)
            : "",
          label: (element.getAttribute("aria-label") ?? element.textContent ?? "")
            .trim().slice(0, 40),
        })),
      };
    });
    console.info("MY-01 ergonomics", JSON.stringify({
      width: 390,
      horizontalOverflow,
      ...ergonomics,
      consoleErrors: consoleErrors.length,
    }));
    expect(ergonomics.fontBelow13).toBe(0);
    expect(ergonomics.tokenBodyValue).not.toBe("");
    expect(ergonomics.tokenBodyPx).toBe(16);
    expect(ergonomics.tapBelow44).toBe(0);
    expect(ergonomics.activeRatio).toBeGreaterThanOrEqual(0.9);
    await expect(page.locator(".my-settings-group .my-preference-row")).toHaveCount(2);
    await page.getByRole("button", { name: "회원 탈퇴" }).click();
    await expect(page.getByRole("dialog", { name: "회원 탈퇴 안내" })).toBeVisible();
    await expect(page.getByText("남은 클로버를 먼저 환전하거나 정리해 주세요.")).toBeVisible();
    await page.getByRole("button", { name: "닫기" }).click();
    let profileBodyError: unknown;
    try {
      const { data: friendProfileBefore, error: friendBeforeError } = await admin
        .from("member").select("nickname,bio,profile_image").eq("id", ids.friend).single();
      if (friendBeforeError) throw friendBeforeError;
      await page.getByTestId("my-profile-summary").getByRole("button", { name: /서연/ }).click();
      await expect(page.locator(".my-profile-bio-button")).toHaveCount(0);
      if (profileEvidenceDir) {
        await page.screenshot({ path: `${profileEvidenceDir}/dev-mypage-profile-name-edit-390.png` });
      }
      await page.getByRole("textbox", { name: "이름" }).fill("서연 QA");
      await page.getByRole("button", { name: "저장" }).click();
      await expect(page.getByTestId("my-profile-summary").getByRole("button", { name: /서연 QA/ }))
        .toBeVisible();
      await page.getByRole("button", { name: "한 줄 소개를 적어 주세요." }).click();
      await expect(page.locator(".my-profile-bio-button")).toHaveCount(0);
      const bioEditGeometry = await page.evaluate(() => {
        const name = document.querySelector<HTMLElement>(".my-profile-name-button");
        const editor = document.querySelector<HTMLElement>(".my-profile-bio-editor");
        if (!name || !editor) throw new Error("bio_edit_geometry_missing");
        const nameRect = name.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();
        return {
          intersection: Math.max(0, Math.min(nameRect.right, editorRect.right) - Math.max(nameRect.left, editorRect.left)) *
            Math.max(0, Math.min(nameRect.bottom, editorRect.bottom) - Math.max(nameRect.top, editorRect.top)),
          nameOwnsCenter: document.elementFromPoint(
            nameRect.left + nameRect.width / 2,
            nameRect.top + nameRect.height / 2,
          )?.closest("button") === name,
        };
      });
      expect(bioEditGeometry.intersection).toBe(0);
      expect(bioEditGeometry.nameOwnsCenter).toBe(true);
      if (profileEvidenceDir) {
        await page.screenshot({ path: `${profileEvidenceDir}/dev-mypage-profile-bio-edit-390.png` });
      }
      await page.getByRole("textbox", { name: "한 줄 소개" }).fill("매일 조금씩 오래 가요");
      await page.getByRole("button", { name: "저장" }).click();
      await expect(page.getByRole("button", { name: /매일 조금씩 오래 가요/ })).toBeVisible();
      await page.getByRole("button", { name: "프로필 사진 바꾸기" }).click();
      await page.getByRole("button", { name: "프로필 사진 3" }).click();
      await page.reload();
      await expect(page.getByTestId("my-profile-summary")).toContainText("서연 QA");
      await expect(page.getByTestId("my-profile-summary")).toContainText("매일 조금씩 오래 가요");
      await expect(page.getByTestId("my-profile-summary").getByRole("img", { name: "서연 QA 프로필" }))
        .toHaveAttribute("src", /jimin\.png/);
      await page.getByRole("tab", { name: "보낸 응원" }).click();
      await expect(page.getByText("윤도경에게")).toBeVisible();
      await expect(page.getByText(/꾸준히/)).toBeVisible();
      await page.getByRole("button", { name: "프로필 사진 바꾸기" }).click();
        const avatarSignResponsePromise = page.waitForResponse((response) => {
          if (!response.url().includes("/functions/v1/profile-update")) return false;
          try {
            return (response.request().postDataJSON() as { action?: string }).action === "sign_avatar";
          } catch {
            return false;
          }
        });
        const png = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        );
        const finalizeResponsePromise = page.waitForResponse((response) => {
          if (!response.url().includes("/functions/v1/profile-update")) return false;
          try {
            return (response.request().postDataJSON() as { action?: string }).action === "finalize_avatar";
          } catch {
            return false;
          }
        });
        await page.locator('.my-profile-avatar-picker input[type="file"]').setInputFiles({
          name: "profile.png",
          mimeType: "image/png",
          buffer: png,
        });
        const avatarSignResponse = await avatarSignResponsePromise;
        expect(avatarSignResponse.status()).toBe(200);
        const avatarSignBody = await avatarSignResponse.json() as { asset_id?: string; object_path?: string };
        expect(avatarSignBody.asset_id).toBeTruthy();
        expect(avatarSignBody.object_path).toBeTruthy();
        const finalizeResponse = await finalizeResponsePromise;
        expect(finalizeResponse.status()).toBe(200);
        const finalizeBody = await finalizeResponse.json() as { profile_image?: string };
        expect(finalizeBody.profile_image).toMatch(/profile-avatars/);
        await expect(page.getByTestId("my-profile-summary").getByRole("img", { name: "서연 QA 프로필" }))
          .toHaveAttribute("src", /profile-avatars/);
        await page.getByRole("button", { name: "프로필 사진 바꾸기" }).click();
        const presetResponsePromise = page.waitForResponse((response) => {
          if (!response.url().includes("/functions/v1/profile-update")) return false;
          try {
            const body = response.request().postDataJSON() as { action?: string; profile_image?: string };
            return body.action === "save" && body.profile_image?.endsWith("jimin.png") === true;
          } catch {
            return false;
          }
        });
        await page.getByRole("button", { name: "프로필 사진 3" }).click();
        const presetResponse = await presetResponsePromise;
        expect(presetResponse.status()).toBe(200);
        expect(await presetResponse.json()).toEqual(expect.objectContaining({ cleanup_pending: true }));
        const { data: cleanupQueue, error: cleanupQueueError } = await admin.from("storage_cleanup_queue")
          .select("id,available_at,status")
          .eq("profile_avatar_asset_id", avatarSignBody.asset_id!)
          .maybeSingle();
        if (cleanupQueueError || !cleanupQueue) throw cleanupQueueError ?? new Error("profile_cleanup_queue_missing");
        delayedProfileCleanups.push({
          queueId: cleanupQueue.id,
          assetId: avatarSignBody.asset_id!,
          objectPath: avatarSignBody.object_path!,
          availableAt: cleanupQueue.available_at,
        });
        console.info("PROFILE_AVATAR_DELAYED_CLEANUP", JSON.stringify(delayedProfileCleanups.at(-1)));
      await page.reload();
      const [{ data: ownerProfileAfter, error: ownerAfterError }, {
        data: friendProfileAfter,
        error: friendAfterError,
      }] = await Promise.all([
        admin.from("member").select("nickname,bio,profile_image").eq("id", ids.owner).single(),
        admin.from("member").select("nickname,bio,profile_image").eq("id", ids.friend).single(),
      ]);
      if (ownerAfterError) throw ownerAfterError;
      if (friendAfterError) throw friendAfterError;
      expect(ownerProfileAfter).toEqual({
        nickname: "서연 QA",
        bio: "매일 조금씩 오래 가요",
        profile_image: "/images/social-viral/jimin.png",
      });
      expect(friendProfileAfter).toEqual(friendProfileBefore);
      const longNickname = "서연의아주긴프로필이름이카드너비를넘지않는지확인";
      const { error: longNicknameError } = await admin.from("member")
        .update({ nickname: longNickname }).eq("id", ids.owner);
      if (longNicknameError) throw longNicknameError;
      await page.reload();
      const longNicknameButton = page.getByTestId("my-profile-summary")
        .getByRole("button", { name: new RegExp(longNickname) });
      const [longButtonBox, profileCardBox] = await Promise.all([
        longNicknameButton.boundingBox(),
        page.getByTestId("my-profile-summary").boundingBox(),
      ]);
      expect(longButtonBox).not.toBeNull();
      expect(profileCardBox).not.toBeNull();
      expect(longButtonBox!.width).toBeGreaterThanOrEqual(44);
      expect(longButtonBox!.x + longButtonBox!.width).toBeLessThanOrEqual(
        profileCardBox!.x + profileCardBox!.width,
      );
      await expect(longNicknameButton.locator("span")).toHaveCSS("text-overflow", "ellipsis");
    } catch (error) {
      profileBodyError = error;
    } finally {
      const { error: restoreError } = await admin.from("member").update({
        nickname: "서연",
        bio: null,
        profile_image: null,
      }).eq("id", ids.owner);
      if (restoreError) throw restoreError;
    }
    if (profileBodyError) throw profileBodyError;
    expect(consoleErrors).toEqual([]);
    await context.close();
  });

  test("PW-03 기존 c1 목표에서 건강 사진을 명시 선택하면 reload와 public 화면에 우선 적용된다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.goto(`/me/goal/${ownerGoal}`);
    await waitForVisualReady(page, ["[data-testid=goal-cover-picker]"]);
    const coverToggle = page.locator(".goal-cover-picker-toggle");
    await expect(coverToggle).toHaveAccessibleName("배너 바꾸기");
    await expect.poll(() => coverToggle.evaluate((element) =>
      Object.keys(element).some((key) => key.startsWith("__reactProps$"))
    )).toBe(true);
    await coverToggle.click();
    await expect(coverToggle).toHaveAttribute("aria-expanded", "true");
    await expect(coverToggle).toHaveAccessibleName("선택 닫기");
    await expect(page.getByTestId("goal-cover-options")).toBeVisible();
    await page.getByRole("button", { name: /건강·식단/ }).click();
    await page.reload();
    await expect(
      page.getByTestId("goal-cover-picker").getByTestId("goal-cover").first(),
    ).toHaveAttribute("data-preset", "health");
    await page.goto(`/g/${publicSlug}`);
    await expect(page.getByTestId("goal-public-page").getByTestId("goal-cover"))
      .toHaveAttribute("data-preset", "health");
    await context.close();
  });

  test("PW-04 custom upload finalize는 REVIEW 안내를 내고 기존 커버를 유지한다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.goto(`/me/goal/${ownerGoal}`);
    await page.getByRole("button", { name: "배너 바꾸기" }).click();
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
    await expect(page.getByTestId("goal-cover-upload-preview")).toBeVisible();
    await page.getByRole("button", { name: "이 사진으로 배너 만들기" }).click();
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
    test.setTimeout(IS_STAGING ? 120_000 : 60_000);
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
      `/friends/${ids.friend}/wordmap?goal=${friendPublicGoal}`,
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
      probe.style.color = "var(--clover-ink)";
      document.body.appendChild(probe);
      const cloverInkResolved = getComputedStyle(probe).color;
      probe.remove();
      return {
        height: nav.getBoundingClientRect().height,
        icon: icon.getBoundingClientRect().width,
        labelSize: getComputedStyle(label).fontSize,
        labelWeight: getComputedStyle(label).fontWeight,
        activeColor: getComputedStyle(active).color,
        cloverColor: root.getPropertyValue("--clover").trim(),
        cloverInkResolved,
        removedLockToken: root.getPropertyValue("--tabbar-lock-size").trim(),
      };
    });
    expect(tabMetrics).toMatchObject({
      height: 64,
      icon: 23,
      labelSize: "13px",
      labelWeight: "700",
      removedLockToken: "",
    });
    expect(tabMetrics.activeColor).toBe(tabMetrics.cloverInkResolved);
    console.log(`DESIGN_METRICS ${JSON.stringify(tabMetrics)}`);
    expect(ownerConsoleErrors).toEqual([]);
    await ownerContext.close();

    const { data: smokeInviteRow, error: smokeInviteRowError } = await admin
      .from("friend_invite")
      .select("accepted_at,revoked_at,expires_at")
      .eq("id", smokeInviteId)
      .single();
    expect(smokeInviteRowError).toBeNull();
    expect(smokeInviteRow?.accepted_at).toBeNull();
    expect(smokeInviteRow?.revoked_at).toBeNull();
    expect(new Date(smokeInviteRow?.expires_at ?? 0).getTime()).toBeGreaterThan(Date.now());

    const invitePage = await newRemotePage(browser, {
      viewport: { width: 390, height: 844 },
    });
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
      await page.goto(`/friends/${ids.friend}?goal=${friendPublicGoal}`);
      await page.getByRole("link", { name: "전체 보기 ›" }).click();
      await expect(page).toHaveURL(new RegExp(`/friends/${ids.friend}/wordmap\\?goal=${friendPublicGoal}$`));
      await expect(page.getByTestId("friend-wordmap-page")).toBeVisible();
      await expect(page.getByTestId("wordmap")).toBeVisible();
      await expect(page.getByRole("button", { name: /응원|결제/ })).toHaveCount(0);

      const response = await page.goto(
        `/friends/${ids.acceptA}?goal=${friendPublicGoal}`,
      );
      expect(response?.status()).toBe(404);
      await expect(page.getByTestId("friend-goal-detail")).toHaveCount(0);
      const wordmapMismatch = await page.goto(
        `/friends/${ids.acceptA}/wordmap?goal=${friendPublicGoal}`,
      );
      expect(wordmapMismatch?.status()).toBe(404);
      await expect(page.getByTestId("friend-wordmap-page")).toHaveCount(0);

      await admin.from("goal").update({ visibility: "PRIVATE" }).eq("id", friendPublicGoal);
      try {
        const privateWordmap = await page.goto(
          `/friends/${ids.friend}/wordmap?goal=${friendPublicGoal}`,
        );
        expect(privateWordmap?.status()).toBe(404);
        await expect(page.getByTestId("friend-wordmap-page")).toHaveCount(0);
      } finally {
        await admin.from("goal").update({ visibility: "PUBLIC" }).eq("id", friendPublicGoal);
      }

      const [ownerLowId, ownerHighId] = [ids.owner, ids.friend].sort();
      await admin.from("friend_connection").update({ status: "REMOVED" })
        .eq("member_low_id", ownerLowId).eq("member_high_id", ownerHighId);
      try {
        const removedWordmap = await page.goto(
          `/friends/${ids.friend}/wordmap?goal=${friendPublicGoal}`,
        );
        expect(removedWordmap?.status()).toBe(404);
        await expect(page.getByTestId("friend-wordmap-page")).toHaveCount(0);
      } finally {
        await admin.from("friend_connection").update({ status: "ACTIVE" })
          .eq("member_low_id", ownerLowId).eq("member_high_id", ownerHighId);
      }
      await context.close();

      const anonymousPage = await newRemotePage(browser);
      await anonymousPage.goto(`/friends/${ids.friend}/wordmap?goal=${friendPublicGoal}`);
      expect(new URL(anonymousPage.url()).pathname).toBe("/");
      await expect(anonymousPage.getByTestId("friend-wordmap-page")).toHaveCount(0);
      await anonymousPage.close();
    } finally {
      await admin.from("friend_connection").delete()
        .eq("member_low_id", memberLowId)
        .eq("member_high_id", memberHighId);
    }
  });

  test("QA-REVERIFY-VIEWPORT-01 운영 모드 신규 화면은 390px과 1280px에서 console error와 가로 overflow가 없다", async ({ browser }) => {
    test.setTimeout(process.env.RUN_MOBILE_ERGONOMICS === "1" ? 420_000 : 300_000);
    const evidenceDir = process.env.E2E_CAPTURE_DIR ??
      "../docs/qa/evidence/v2-goal-20261024/captures";
    const captureWidths = process.env.APPROVED_CAPTURE_WIDTHS === "390"
      ? [390]
      : [390, 1024, 1280];
    const requestedLabels = new Set(
      (process.env.VISUAL_CAPTURE_LABELS ?? "")
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean),
    );
    const shouldCapture = (label: string) =>
      requestedLabels.size === 0 || requestedLabels.has(label);
    mkdirSync(evidenceDir, { recursive: true });
    const approvedMetrics = await captureApprovedPrototype(browser, evidenceDir);
    const approvedGoalDetail = approvedMetrics.find((metric) => metric.screen_id === "goaldetail")
      ?.goal_detail_geometry as {
        why_to_label: number;
        label_to_count: number;
        count_to_wordmap: number;
        why_font_weight: string;
      } | undefined;
    if (process.env.RUN_MOBILE_ERGONOMICS === "1") {
      const dataCheck = await newRemotePage(browser, {
        viewport: { width: 390, height: 844 },
      });
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
      ["friends", "/friends", ["[data-testid=friends-page]", "[data-testid=friend-goal-list]"]],
      ["goal-detail", `/me/goal/${ownerGoal}`, [
        "[data-testid=goal-details-card]",
        "[data-testid=goal-management-wordmap]",
        "[data-testid=goal-clover-summary]",
      ]],
      ["mypage", "/my", ["[data-testid=my-page-overview]", "[data-testid=my-profile-summary]"]],
      ["belong", `/friends/${ids.friend}?goal=${friendPublicGoal}`, [
        "[data-testid=friend-detail-page]",
        "[data-testid=friend-goal-detail]",
        "[data-testid=wordmap]",
      ]],
      [
        "connect",
        "/invite",
        ["[data-testid=invite-page]", "[data-testid=invite-accepted-panel]"],
      ],
    ] as const;
    for (const width of captureWidths) {
      const context = await authContext(browser, emails.owner, 3);
      for (const [label, route, readySelectors] of routes) {
        if (!shouldCapture(label)) continue;
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
        await waitForVisualReady(page, [...readySelectors]);
        if (width === 390 && label === "goal-detail") {
          const sectionGeometry = await page.evaluate(() => {
            const rect = (selector: string) => {
              const element = document.querySelector<HTMLElement>(selector);
              if (!element) return null;
              const value = element.getBoundingClientRect();
              return { top: value.top, bottom: value.bottom, height: value.height };
            };
            const titleRow = document.querySelector<HTMLElement>(".goal-inline-title");
            const whyRow = document.querySelector<HTMLElement>(".goal-inline-why");
            const titleButton = document.querySelector<HTMLElement>("[data-testid=open-goal-edit-sheet]");
            const whyButton = document.querySelector<HTMLElement>("[aria-label='WHY 편집']");
            const titleButtonRect = titleButton?.getBoundingClientRect();
            const whyButtonRect = whyButton?.getBoundingClientRect();
            const titleGlyph = titleButton?.querySelector<SVGElement>("svg");
            const whyGlyph = whyButton?.querySelector<SVGElement>("svg");
            const intersection = titleButtonRect && whyButtonRect
              ? Math.max(0, Math.min(titleButtonRect.right, whyButtonRect.right) - Math.max(titleButtonRect.left, whyButtonRect.left)) *
                Math.max(0, Math.min(titleButtonRect.bottom, whyButtonRect.bottom) - Math.max(titleButtonRect.top, whyButtonRect.top))
              : Number.POSITIVE_INFINITY;
            const ownsCenter = (element: HTMLElement | null, value?: DOMRect) => {
              if (!element || !value) return false;
              const owner = document.elementFromPoint(
                value.left + value.width / 2,
                value.top + value.height / 2,
              );
              return owner === element || Boolean(owner && element.contains(owner));
            };
            return {
              supporter: rect(".goal-supporter-section"),
              balance: rect(".goal-clover-summary"),
              actions: rect(".goal-management-actions"),
              titleRow: rect(".goal-inline-title"),
              whyRow: rect(".goal-inline-why"),
              wordmapLabel: rect(".goal-management-wordmap .goal-section-label"),
              wordmapCount: rect(".goal-management-wordmap .goal-wordmap-count"),
              wordmapCloud: rect(".goal-management-wordmap .wordmap-cloud"),
              titleButton: rect("[data-testid=open-goal-edit-sheet]"),
              whyButton: rect("[aria-label='WHY 편집']"),
              pencilIntersection: intersection,
              titleOwnsCenter: ownsCenter(titleButton, titleButtonRect),
              whyOwnsCenter: ownsCenter(whyButton, whyButtonRect),
              titleGlyphOwned: ownsCenter(titleButton, titleGlyph?.getBoundingClientRect()),
              whyGlyphOwned: ownsCenter(whyButton, whyGlyph?.getBoundingClientRect()),
              whyFontWeight: whyRow ? getComputedStyle(whyRow).fontWeight : null,
              wordmapStyles: {
                sectionPadding: getComputedStyle(document.querySelector<HTMLElement>(".goal-management-wordmap")!).padding,
                labelMargin: getComputedStyle(document.querySelector<HTMLElement>(".goal-section-label")!).margin,
                countMargin: getComputedStyle(document.querySelector<HTMLElement>(".goal-wordmap-count")!).margin,
                wordmapMargin: getComputedStyle(document.querySelector<HTMLElement>(".goal-management-wordmap .wordmap-cloud")!).margin,
              },
            };
          });
          console.info(`GOAL_SECTION_GEOMETRY ${JSON.stringify(sectionGeometry)}`);
          console.info(`APPROVED_GOAL_GEOMETRY ${JSON.stringify(approvedGoalDetail)}`);
          await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
          await page.screenshot({ path: `${evidenceDir}/dev-${label}-${width}.png` });
          expect.soft(sectionGeometry.supporter).not.toBeNull();
          expect.soft(sectionGeometry.balance).not.toBeNull();
          expect.soft(sectionGeometry.actions).not.toBeNull();
          expect.soft(
            (sectionGeometry.balance?.top ?? 0) - (sectionGeometry.supporter?.bottom ?? 0),
          ).toBeGreaterThanOrEqual(20);
          expect.soft(
            (sectionGeometry.actions?.top ?? 0) - (sectionGeometry.balance?.bottom ?? 0),
          ).toBeGreaterThanOrEqual(20);
          expect.soft(sectionGeometry.titleRow?.height).toBeLessThanOrEqual(30);
          expect.soft(sectionGeometry.whyRow?.height).toBeLessThanOrEqual(24);
          expect.soft(sectionGeometry.titleButton?.height).toBeGreaterThanOrEqual(44);
          expect.soft(sectionGeometry.whyButton?.height).toBeGreaterThanOrEqual(44);
          expect.soft(sectionGeometry.pencilIntersection).toBe(0);
          expect.soft(sectionGeometry.titleOwnsCenter).toBe(true);
          expect.soft(sectionGeometry.whyOwnsCenter).toBe(true);
          expect.soft(sectionGeometry.titleGlyphOwned).toBe(true);
          expect.soft(sectionGeometry.whyGlyphOwned).toBe(true);
          expect.soft(sectionGeometry.whyFontWeight).toBe("400");
          expect.soft(sectionGeometry.whyFontWeight).toBe(approvedGoalDetail?.why_font_weight);
          expect.soft(
            (sectionGeometry.wordmapLabel?.top ?? 0) - (sectionGeometry.whyRow?.bottom ?? 0),
          ).toBeCloseTo(approvedGoalDetail?.why_to_label ?? Number.NaN, 0);
          expect.soft(
            (sectionGeometry.wordmapCount?.top ?? 0) - (sectionGeometry.wordmapLabel?.bottom ?? 0),
          ).toBeCloseTo(approvedGoalDetail?.label_to_count ?? Number.NaN, 0);
          expect.soft(
            (sectionGeometry.wordmapCloud?.top ?? 0) - (sectionGeometry.wordmapCount?.bottom ?? 0),
          ).toBeCloseTo(approvedGoalDetail?.count_to_wordmap ?? Number.NaN, 0);
          await page.getByTestId("open-goal-edit-sheet").click();
          await expect(page.getByTestId("edit-goal-title-input")).toBeVisible();
          await page.getByRole("button", { name: "취소" }).click();
          await page.getByRole("button", { name: "WHY 편집" }).click();
          await expect(page.getByTestId("edit-goal-reason-input")).toBeVisible();
          await page.getByRole("button", { name: "취소" }).click();
        }
        if (width === 390 && label === "friends") {
          const friendRows = await page.locator(".friend-list-main").evaluateAll((rows) =>
            rows.slice(0, 3).map((row) => {
              const avatar = row.querySelector<HTMLElement>(".friend-list-avatar");
              const name = row.querySelector<HTMLElement>(".friend-list-name");
              const goal = row.querySelector<HTMLElement>(".friend-list-copy > strong");
              const news = row.querySelector<HTMLElement>(".friend-list-news > span");
              const rect = (element: HTMLElement | null) => {
                if (!element) return null;
                const value = element.getBoundingClientRect();
                return { top: value.top, bottom: value.bottom, height: value.height };
              };
              return {
                alignItems: getComputedStyle(row).alignItems,
                avatar: rect(avatar),
                name: rect(name),
                goal: rect(goal),
                news: rect(news),
                goalFontSize: goal ? getComputedStyle(goal).fontSize : null,
                goalClamp: goal ? getComputedStyle(goal).webkitLineClamp : null,
                newsClamp: news ? getComputedStyle(news).webkitLineClamp : null,
                goalMarginTop: goal ? getComputedStyle(goal).marginTop : null,
                progressMarginTop: row.querySelector<HTMLElement>(".friend-list-progress")
                  ? getComputedStyle(row.querySelector<HTMLElement>(".friend-list-progress")!).marginTop
                  : null,
                newsMarginTop: news ? getComputedStyle(news.closest(".friend-list-news")!).marginTop : null,
              };
            })
          );
          console.info(`FRIEND_ROW_GEOMETRY ${JSON.stringify(friendRows)}`);
          expect(friendRows.length).toBeGreaterThanOrEqual(3);
          for (const row of friendRows) {
            expect(row.alignItems).toBe("flex-start");
            expect(row.goalFontSize).toBe("13px");
            expect(row.goalClamp).toBe("2");
            expect(row.newsClamp).toBe("2");
            expect(row.goalMarginTop).toBe("3px");
            expect(row.progressMarginTop).toBe("9px");
            expect(row.newsMarginTop).toBe("5px");
            expect(Math.abs((row.avatar?.top ?? 0) - (row.name?.top ?? 0))).toBeLessThanOrEqual(2);
          }
        }
        const overflow = await page.evaluate(() => ({
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
          console.log(`CAPTURE_OVERFLOW ${route} ${JSON.stringify(overflow)}`);
        }
        expect(overflow.delta, `${width}px ${route}`).toBe(0);
        await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
        await page.screenshot({
          path: `${evidenceDir}/dev-${label}-${width}.png`,
        });
        expect(consoleErrors, `${width}px ${route}`).toEqual([]);
        if (width === 390 && label === "mypage") {
          await page.getByTestId("my-profile-summary").getByRole("button", { name: /서연/ }).click();
          await expect(page.getByRole("textbox", { name: "이름" })).toBeVisible();
          await page.screenshot({ path: `${evidenceDir}/dev-mypage-name-editor-${width}.png` });
          await page.getByRole("button", { name: "취소" }).click();
          await page.getByRole("button", { name: "프로필 사진 바꾸기" }).click();
          await expect(page.locator(".my-profile-avatar-picker")).toBeVisible();
          await waitForVisualReady(page, [".my-profile-avatar-picker img"]);
          const avatarOptions = page.locator(
            '.my-profile-avatar-picker button[aria-label^="프로필 사진 "]',
          );
          await expect(avatarOptions).toHaveCount(4);
          for (let index = 0; index < 4; index += 1) {
            const geometry = await avatarOptions.nth(index).evaluate((button) => {
              const image = button.querySelector("img");
              const buttonRect = button.getBoundingClientRect();
              const imageRect = image?.getBoundingClientRect();
              const computed = image ? getComputedStyle(image) : null;
              const overhang = imageRect
                ? Math.max(
                  buttonRect.left - imageRect.left,
                  buttonRect.top - imageRect.top,
                  imageRect.right - buttonRect.right,
                  imageRect.bottom - buttonRect.bottom,
                  0,
                )
                : Number.POSITIVE_INFINITY;
              return {
                loaded: Boolean(image?.complete && image.naturalWidth > 0),
                contained: overhang <= 0.5,
                overhang,
                buttonRect: {
                  left: buttonRect.left,
                  top: buttonRect.top,
                  right: buttonRect.right,
                  bottom: buttonRect.bottom,
                  width: buttonRect.width,
                  height: buttonRect.height,
                },
                imageRect: imageRect ? {
                  left: imageRect.left,
                  top: imageRect.top,
                  right: imageRect.right,
                  bottom: imageRect.bottom,
                  width: imageRect.width,
                  height: imageRect.height,
                } : null,
                computed: computed ? {
                  position: computed.position,
                  width: computed.width,
                  height: computed.height,
                  objectFit: computed.objectFit,
                  transform: computed.transform,
                } : null,
                offsetParentClass: image?.offsetParent?.className ?? null,
              };
            });
            console.info(`AVATAR_GEOMETRY ${index + 1} ${JSON.stringify(geometry)}`);
            expect(geometry.loaded).toBe(true);
            expect(geometry.contained, `avatar ${index + 1} overhang=${geometry.overhang}px`).toBe(true);
          }
          await page.screenshot({ path: `${evidenceDir}/dev-mypage-avatar-picker-${width}.png` });
        }
        await page.close();
      }
      await context.close();

      if (shouldCapture("inviteaccept")) {
      const invitePage = await newRemotePage(browser, {
        viewport: { width, height: width === 390 ? 844 : 900 },
        deviceScaleFactor: 3,
      });
      const inviteErrors: string[] = [];
      invitePage.on("console", (message) => {
        if (message.type() === "error") inviteErrors.push(message.text());
      });
      invitePage.on("pageerror", (error) => inviteErrors.push(error.message));
      const inviteResponse = await invitePage.goto(`/invite/${smokeInviteToken}`);
      expect(inviteResponse?.status()).toBe(200);
      await waitForVisualReady(invitePage, ["[data-testid=invite-accept-card]"]);
      if (width === 390) {
        const geometry = await invitePage.evaluate(() => {
          const card = document.querySelector<HTMLElement>("[data-testid=invite-accept-card]");
          const cover = document.querySelector<HTMLElement>("[data-testid=invite-accept-cover]");
          const toRect = (node: HTMLElement | null) => {
            if (!node) return null;
            const rect = node.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
          };
          return { card: toRect(card), cover: toRect(cover) };
        });
        console.info(`INVITE_ACCEPT_GEOMETRY ${JSON.stringify(geometry)}`);
        expect(geometry.card).not.toBeNull();
        expect(geometry.cover).not.toBeNull();
        expect(Math.abs((geometry.card?.y ?? 0) - 60)).toBeLessThanOrEqual(1);
        expect(Math.abs((geometry.cover?.y ?? 0) - 211.921875)).toBeLessThanOrEqual(1);
        expect(Math.abs((geometry.cover?.height ?? 0) - 128)).toBeLessThanOrEqual(1);
      }
      expect(await invitePage.evaluate(() =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
      )).toBe(0);
      expect(inviteErrors).toEqual([]);
      await invitePage.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await invitePage.screenshot({
        path: `${evidenceDir}/dev-inviteaccept-${width}.png`,
      });
      await invitePage.close();
      }

      for (const [label, route] of [
        ["landing", "/"],
        ["goalpublic", `/g/${publicSlug}`],
      ] as const) {
        if (!shouldCapture(label)) continue;
        const guestPage = await newRemotePage(browser, {
          viewport: { width, height: width === 390 ? 844 : 900 },
          deviceScaleFactor: 3,
        });
        const guestErrors: string[] = [];
        guestPage.on("console", (message) => {
          if (message.type() === "error") guestErrors.push(message.text());
        });
        guestPage.on("pageerror", (error) => guestErrors.push(error.message));
        const guestResponse = await guestPage.goto(route);
        expect(guestResponse?.status(), `${width}px ${route}`).toBe(200);
        await expect(guestPage.getByTestId("receiver-bottom-nav")).toBeVisible();
        await waitForVisualReady(
          guestPage,
          label === "goalpublic"
            ? ["[data-testid=goal-card]", "[data-testid=wordmap]", "[data-testid=cheer-count]"]
            : ["main"],
        );
        if (width === 390 && label === "landing") {
          await verifyWordmapMotionEnvelope(guestPage);
          const wordmapHeight = await guestPage.locator(".landing-wordmap-preview").evaluate(
            (element) => element.getBoundingClientRect().height,
          );
          console.info(`LANDING_WORDMAP_HEIGHT ${wordmapHeight}`);
          expect(wordmapHeight).toBeGreaterThanOrEqual(380);
          expect(wordmapHeight).toBeLessThanOrEqual(390);
        }
        if (width === 390 && label === "goalpublic") {
          const textRows = await guestPage.evaluate(() => {
            const textRect = (selector: string) => {
              const element = document.querySelector(selector);
              const text = element?.firstChild;
              if (!text || text.nodeType !== Node.TEXT_NODE) return null;
              const range = document.createRange();
              range.selectNodeContents(text);
              const rect = range.getBoundingClientRect();
              return { top: rect.top, bottom: rect.bottom };
            };
            return {
              wordmark: textRect(".goal-public-wordmark"),
              relogin: textRect("[data-testid=relogin-hint]"),
            };
          });
          expect(textRows.wordmark).not.toBeNull();
          expect(textRows.relogin).not.toBeNull();
          expect(
            (textRows.relogin?.top ?? 0) - (textRows.wordmark?.bottom ?? 0),
          ).toBeGreaterThanOrEqual(8);
        }
        expect(await guestPage.evaluate(() =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
        )).toBe(0);
        expect(guestErrors, `${width}px ${route}`).toEqual([]);
        await guestPage.addStyleTag({ content: "nextjs-portal{display:none!important}" });
        await guestPage.screenshot({
          path: `${evidenceDir}/dev-${label}-${width}.png`,
        });
        await guestPage.close();
      }

      if (shouldCapture("cover-review")) {
      const adminContext = await authContext(browser, emails.admin, 3);
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
      await waitForVisualReady(adminPage, [
        "[data-testid=goal-cover-review-queue]",
        "[data-testid=cashout-mobile-cards]",
      ]);
      const cashoutCards = adminPage.getByTestId("cashout-request-card");
      const cashoutQueue = adminPage.getByTestId("cashout-mobile-cards");
      await expect(cashoutCards).toHaveCount(2);
      await expect(cashoutQueue).toContainText("소영 · QA ••••••1234");
      await expect(cashoutQueue).toContainText("도윤 · QA ••••••1234");
      await expect(cashoutCards).toContainText(["지급 예정", "지급 예정"]);
      await expect(adminPage.getByRole("button", { name: "지급 완료" })).toHaveCount(2);
      await expect(adminPage.getByRole("button", { name: "반려", exact: true })).toHaveCount(2);
      const memberSection = adminPage.getByTestId("admin-members-section");
      const ledgerSection = adminPage.getByTestId("admin-ledger-section");
      const memberCards = memberSection.locator(":scope > .admin-record-list > .admin-member-card");
      const ledgerRows = ledgerSection.locator(":scope > .admin-record-list > .admin-record-row");
      await expect(memberSection.locator(".admin-section-head p")).toHaveCount(0);
      await expect(ledgerSection.locator(".admin-section-head p")).toHaveCount(0);
      expect(await memberCards.count()).toBeGreaterThanOrEqual(3);
      expect(await ledgerRows.count()).toBeGreaterThanOrEqual(3);
      await expect(memberCards.first()).toBeVisible();
      await expect(memberCards.first().locator("details")).not.toHaveAttribute("open", "");
      await expect(memberCards.first().locator(".admin-member-details > div")).not.toBeVisible();
      await adminPage.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await adminPage.screenshot({
        path: `${evidenceDir}/dev-cover-review-${width}.png`,
      });
      const requestedStatusStyle = await cashoutCards.first().locator(".admin-cashout-value > span").evaluate(
        (element) => ({
          backgroundColor: getComputedStyle(element).backgroundColor,
          color: getComputedStyle(element).color,
        }),
      );
      expect.soft(requestedStatusStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
      expect.soft(await adminPage.evaluate(() =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
      )).toBe(0);
      expect.soft(adminErrors).toEqual([]);
      await adminContext.close();
      }
    }
  });

  test("PW-05 admin 승인 후 owner와 public 화면에 승인 커버만 보인다", async ({ browser }) => {
    test.setTimeout(IS_STAGING ? 120_000 : 60_000);
    const { count: pendingCount } = await admin.from("goal_cover_asset")
      .select("id", { head: true, count: "exact" })
      .eq("goal_id", ownerGoal)
      .eq("status", "REVIEW");
    if (!pendingCount) {
      const ownerContext = await authContext(browser, emails.owner);
      const ownerPage = await ownerContext.newPage();
      await ownerPage.goto(`/me/goal/${ownerGoal}`);
      await waitForVisualReady(ownerPage, ["[data-testid=goal-cover-picker]"]);
      const coverToggle = ownerPage.locator(".goal-cover-picker-toggle");
      await expect.poll(() => coverToggle.evaluate((element) =>
        Object.keys(element).some((key) => key.startsWith("__reactProps$"))
      )).toBe(true);
      await coverToggle.click();
      await expect(coverToggle).toHaveAttribute("aria-expanded", "true");
      await expect(ownerPage.getByTestId("goal-cover-options")).toBeVisible();
      await ownerPage.locator('input[type="file"]').setInputFiles({
        name: "cover-for-review.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
      });
      await expect(ownerPage.getByTestId("goal-cover-upload-preview")).toBeVisible();
      const finalizeResponse = ownerPage.waitForResponse((response) =>
        response.url().includes("/functions/v1/goal-cover-finalize") &&
        response.request().method() === "POST"
      );
      await ownerPage.getByRole("button", { name: "이 사진으로 배너 만들기" }).click();
      const finalized = await finalizeResponse;
      expect(finalized.status()).toBe(200);
      await expect(ownerPage.getByRole("status")).toContainText("검수 대기열");
      const { count: reviewCount, error: reviewCountError } = await admin
        .from("goal_cover_asset")
        .select("id", { head: true, count: "exact" })
        .eq("goal_id", ownerGoal)
        .eq("status", "REVIEW");
      if (reviewCountError) throw reviewCountError;
      expect(reviewCount).toBeGreaterThan(0);
      await ownerContext.close();
    }
    const { data: reviewAssets, error: reviewAssetsError } = await admin
      .from("goal_cover_asset")
      .select("id,quarantine_path,status")
      .eq("goal_id", ownerGoal)
      .eq("status", "REVIEW")
      .order("created_at", { ascending: false })
      .limit(1);
    if (reviewAssetsError) throw reviewAssetsError;
    const reviewAsset = reviewAssets?.[0];
    expect(reviewAsset?.status).toBe("REVIEW");
    expect(reviewAsset?.quarantine_path).toBeTruthy();
    const { data: reviewSource, error: reviewSourceError } = await admin.storage
      .from("goal-cover-quarantine")
      .download(reviewAsset!.quarantine_path);
    expect(reviewSourceError).toBeNull();
    expect(reviewSource?.size).toBeGreaterThan(0);
    const context = await authContext(browser, emails.admin);
    const page = await context.newPage();
    await page.goto("/admin");
    await expect(page.getByTestId("goal-cover-review-queue")).toBeVisible();
    const ownerReviewCard = page.locator("[data-testid=goal-cover-review-queue] article")
      .filter({ hasText: "토익 900 넘길게" });
    await expect(ownerReviewCard).toHaveCount(1);
    const reviewResponse = page.waitForResponse((response) =>
      response.url().includes("/functions/v1/admin-review-goal-cover")
    );
    await ownerReviewCard.getByRole("button", { name: "승인" }).click();
    const response = await reviewResponse;
    const responseBody = await response.text();
    expect(response.ok(), `admin review ${response.status()} ${responseBody}`)
      .toBe(true);
    await expect(page.getByText("검수 대기 커버가 없습니다.")).toBeVisible();
    await page.goto(`/g/${publicSlug}`);
    await expect(page.getByRole("img", { name: /목표 커버/ })).toBeVisible();
    await context.close();
  });

  test("PW-06 PUBLIC에서 FRIENDS, PRIVATE RPC 변경 시 공개 경계가 즉시 닫힌다", async ({ browser }) => {
    const ownerApi = createClient(SUPABASE_URL, ANON_KEY);
    const { error: signInError } = await ownerApi.auth.signInWithPassword({
      email: emails.owner,
      password,
    });
    if (signInError) throw signInError;
    const anon = await newRemotePage(browser);
    try {
      const { error: friendsError } = await ownerApi.rpc("set_goal_visibility", {
        goal_id: ownerGoal,
        visibility: "FRIENDS",
      });
      if (friendsError) throw friendsError;
      expect((await anon.goto(`/g/${publicSlug}`))?.status()).toBe(404);
      await expect(anon.getByTestId("goal-public-page")).toHaveCount(0);

      const { error: privateError } = await ownerApi.rpc("set_goal_visibility", {
        goal_id: ownerGoal,
        visibility: "PRIVATE",
      });
      if (privateError) throw privateError;
      expect((await anon.reload())?.status()).toBe(404);
      await expect(anon.getByTestId("goal-public-page")).toHaveCount(0);
    } finally {
      await ownerApi.rpc("set_goal_visibility", {
        goal_id: ownerGoal,
        visibility: "PUBLIC",
      });
      await anon.close();
    }
  });

  test("PW-07 anon 공개 route는 PUBLIC만 노출한다", async ({ page }) => {
    await page.goto(`/g/friend-public-${runId}`);
    await expect(page.getByText(/이번 학기 평점 4.0 해낼게/).first()).toBeVisible();
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
    expect(
      freshResponse.status,
      `cheer-order failed: ${JSON.stringify(freshBody)}`,
    ).toBe(201);
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
