import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const command = process.argv[2];
const statePath = process.env.V1_V2_FIXTURE_STATE ??
  "/tmp/haenael-v1-v2-fixture.json";
const evidenceDir = resolve(
  process.env.V1_V2_EVIDENCE_DIR ??
    "../docs/qa/evidence/v1-vs-v2-decision-v1-gpt-codex",
);
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");
const password = "haenael-v1-v2-local-fixture-2026!";
const dbContainer = process.env.LOCAL_DB_CONTAINER ?? "supabase_db_haenael-ge";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} missing`);
  return value;
}

function localSql(sql) {
  execFileSync(
    "docker",
    [
      "exec",
      dbContainer,
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
    ],
    { stdio: "pipe" },
  );
}

function assertUuid(value) {
  if (!/^[0-9a-f-]{36}$/i.test(value)) throw new Error("invalid fixture uuid");
  return value;
}

function futureDate(days) {
  const date = new Date("2026-10-15T00:00:00+09:00");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
    },
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

async function seed() {
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const stamp = Date.now();
  const ownerEmail = `v1-v2-owner-${stamp}@test.local`;
  const friendEmail = `v1-v2-friend-${stamp}@test.local`;
  const createdUsers = [];
  for (const email of [ownerEmail, friendEmail]) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("fixture user missing");
    createdUsers.push(data.user.id);
  }
  const [ownerId, friendId] = createdUsers;
  const { error: memberError } = await admin.from("member").insert([
    {
      id: ownerId,
      nickname: "서연",
      profile_image: "/images/social-viral/seoyeon.png",
    },
    {
      id: friendId,
      nickname: "윤도경",
      profile_image: "/images/social-viral/dogyeong.png",
    },
  ]);
  if (memberError) throw memberError;

  const ownerSlug = `v1-v2-owner-${stamp}`;
  const { data: goals, error: goalError } = await admin.from("goal").insert([
    {
      member_id: ownerId,
      slug: ownerSlug,
      title: "토익 900 넘길게",
      reason: "교환학생 지원 마감 전에 점수를 만들고 싶어요.",
      due_date: futureDate(30),
      status: "ACTIVE",
      visibility: "PUBLIC",
      cover_preset_key: "c1",
    },
    {
      member_id: ownerId,
      slug: `v1-v2-completed-${stamp}`,
      title: "첫 목표 완료",
      reason: "업적 화면 검증용 완료 목표",
      due_date: futureDate(-10),
      status: "CLOSED",
      closed_at: new Date().toISOString(),
      visibility: "PRIVATE",
      cover_preset_key: "c5",
    },
    {
      member_id: friendId,
      slug: `v1-v2-friend-${stamp}`,
      title: "이번 학기 평점 4.0 해낼게",
      reason: "중간고사 두 과목 A를 받았어요. 끝까지 해낼게요.",
      due_date: futureDate(60),
      status: "ACTIVE",
      visibility: "PUBLIC",
      cover_preset_key: "c3",
    },
  ]).select("id,slug,member_id,status");
  if (goalError || !goals) throw goalError ?? new Error("fixture goals missing");
  const ownerGoal = goals.find((goal) => goal.slug === ownerSlug);
  const friendGoal = goals.find((goal) => goal.member_id === friendId);
  if (!ownerGoal || !friendGoal) throw new Error("fixture goal lookup failed");

  const low = [ownerId, friendId].sort()[0];
  const high = [ownerId, friendId].sort()[1];
  const { error: friendError } = await admin.from("friend_connection").insert({
    member_low_id: low,
    member_high_id: high,
    status: "ACTIVE",
  });
  if (friendError) throw friendError;

  const words = [
    "꾸준함", "용기", "성장", "집중", "도전", "응원",
    "할수있어", "끝까지", "한걸음", "자신감", "성실", "합격",
  ];
  const paymentRows = Array.from({ length: 39 }, (_, index) => ({
    order_id: `v1-v2-${stamp}-${index}`,
    amount_krw: 1000,
    status: "DONE",
    pg_customer_key: "V1_V2_LOCAL_FIXTURE",
  }));
  const { data: payments, error: paymentError } = await admin.from("payment")
    .insert(paymentRows).select("id");
  if (paymentError || !payments) {
    throw paymentError ?? new Error("fixture payments missing");
  }
  const cheers = payments.map((payment, index) => ({
    goal_id: index < 35 ? ownerGoal.id : friendGoal.id,
    display_name: index < 35 ? `응원자 ${index + 1}` : "서연",
    is_anonymous: false,
    message: words[index % words.length],
    clover_amount: 1,
    payment_id: payment.id,
    status: "CONFIRMED",
    created_at: new Date(Date.now() - index * 3_600_000).toISOString(),
  }));
  const { data: insertedCheers, error: cheerError } = await admin.from("cheer")
    .insert(cheers).select("id,goal_id");
  if (cheerError || !insertedCheers?.length) {
    throw cheerError ?? new Error("fixture cheers missing");
  }
  const { error: ledgerError } = await admin.from("clover_ledger").insert({
    member_id: ownerId,
    entry_type: "EARN",
    clover_delta: 35,
    ref_type: "cheer",
    ref_id: insertedCheers[0].id,
    balance_after: 35,
  });
  if (ledgerError) throw ledgerError;

  const ownerClient = createClient(supabaseUrl, anonKey);
  const { error: signInError } = await ownerClient.auth.signInWithPassword({
    email: ownerEmail,
    password,
  });
  if (signInError) throw signInError;
  const { data: invite, error: inviteError } = await ownerClient.rpc(
    "create_friend_invite",
    { goal_id: ownerGoal.id, channel: "WEB" },
  );
  if (inviteError || !invite?.token) {
    throw inviteError ?? new Error("fixture invite missing");
  }

  const state = {
    ownerEmail,
    ownerId,
    friendId,
    ownerGoalId: ownerGoal.id,
    ownerSlug,
    friendGoalId: friendGoal.id,
    inviteToken: invite.token,
    paymentIds: payments.map(({ id }) => id),
  };
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  console.log("fixture seeded");
}

async function capture() {
  const variant = required("CAPTURE_VARIANT");
  const baseUrl = required("CAPTURE_BASE_URL");
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  mkdirSync(evidenceDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const authCookieRows = await authCookies(state.ownerEmail);
  const results = [];

  const common = [
    ["landing", "/", false, "body"],
    ["goal", `/g/${state.ownerSlug}`, false, "[data-testid=goal-public-page]"],
    ["me", "/me", true, "[data-testid=receiver-home-page]"],
    ["cashout", "/cashout", true, "body"],
    ["wordmap", `/wordmap/${state.ownerGoalId}`, true, "[data-testid=wordmap-fullview-page]"],
  ];
  const v2Only = [
    ["invite-create", "/invite", true, "[data-testid=invite-page]"],
    ["invite-accept", `/invite/${state.inviteToken}`, false, "body"],
    ["friends", "/friends", true, "[data-testid=friends-page]"],
    ["friend-detail", `/friends/${state.friendId}?goal=${state.friendGoalId}`, true, "[data-testid=friend-detail-page]"],
    ["achievements", "/me/achievements", true, "[data-testid=achievements-page]"],
  ];
  const routes = variant === "v2" ? [...common, ...v2Only] : common;

  for (const [label, path, authenticated, selector] of routes) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      // v1.2.1 production CSP does not admit the local Supabase loopback host.
      // The comparison browser bypasses CSP for both versions so the same local
      // fixture is rendered without changing either tagged or current source.
      bypassCSP: true,
      locale: "ko-KR",
      timezoneId: "Asia/Seoul",
      reducedMotion: "reduce",
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
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.locator(selector).first().waitFor({ state: "visible", timeout: 20_000 });
    await page.addStyleTag({
      content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images].map((image) => image.complete
          ? Promise.resolve()
          : new Promise((done) => {
              image.addEventListener("load", done, { once: true });
              image.addEventListener("error", done, { once: true });
            })),
      );
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    const metrics = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      title: document.title,
    }));
    const file = `${variant}-${label}-390.png`;
    await page.screenshot({ path: resolve(evidenceDir, file), fullPage: false });
    results.push({
      variant,
      label,
      path,
      status: response?.status() ?? null,
      consoleErrors,
      pageErrors,
      metrics,
      file,
    });
    await context.close();
  }
  await browser.close();
  writeFileSync(
    resolve(evidenceDir, `${variant}-capture-results.json`),
    `${JSON.stringify(results, null, 2)}\n`,
  );
  const failures = results.filter((result) =>
    result.status !== 200 || result.consoleErrors.length ||
    result.pageErrors.length || result.metrics.overflowX ||
    result.metrics.width !== 390 || result.metrics.height !== 844
  );
  console.log(`${variant} captures=${results.length} failures=${failures.length}`);
  if (failures.length) process.exitCode = 2;
}

async function cleanup() {
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  const ownerId = assertUuid(state.ownerId);
  const friendId = assertUuid(state.friendId);
  const paymentIds = state.paymentIds.map((value) => Number(value));
  if (paymentIds.some((value) => !Number.isSafeInteger(value) || value <= 0)) {
    throw new Error("invalid payment ids");
  }
  localSql(`
    delete from public.cheer where goal_id in (
      select id from public.goal where member_id in ('${ownerId}'::uuid, '${friendId}'::uuid)
    );
    delete from public.member where id in ('${ownerId}'::uuid, '${friendId}'::uuid);
    delete from public.payment where id in (${paymentIds.join(",")});
  `);
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  for (const id of [ownerId, friendId]) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw error;
  }
  console.log("fixture cleaned");
}

if (command === "seed") await seed();
else if (command === "capture") await capture();
else if (command === "cleanup") await cleanup();
else throw new Error("usage: node capture-v1-v2-decision.mjs seed|capture|cleanup");
