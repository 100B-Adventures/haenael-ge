// e2e/cashout-manual.spec.ts: 수동 환전 브라우저 E2E.
//
// 운영 DB 쓰기 금지 원칙 때문에 스펙 내부의 격리된 Supabase 계약 서버를 사용한다.
// 실제 Next.js 화면/RSC/Server Action은 그대로 실행하고, DB 함수의 상태 전이는 pgTAP이 맡는다.
// 인증은 기존 스펙의 조건부 실세션 관례를 보완해 @supabase/ssr 쿠키를 로컬 컨텍스트에만 주입한다.

import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import path from "node:path";
import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const APP_PORT = 3461;
const SUPABASE_PORT = 54329;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const SUPABASE_URL = `http://127.0.0.1:${SUPABASE_PORT}`;
const FULL_ACCOUNT = "123456789012";
const VISUAL_ACCOUNT = "81220104448421";
const FORM_MASKED_ACCOUNT = "********9012";
const VISUAL_MASKED_ACCOUNT = "**********8421";
const PERSISTED_MASKED_ACCOUNT = "••••••9012";

const USERS = {
  below: randomUUID(),
  invalid: randomUUID(),
  happy: randomUUID(),
  duplicate: randomUUID(),
  general: randomUUID(),
} as const;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 미설정 — 로컬 Supabase 환경이 필요합니다.`);
  return value;
}

const BUILD_SUPABASE_URL = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const BUILD_SUPABASE_ANON_KEY = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const BUILD_SUPABASE_SERVICE_ROLE_KEY = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const buildSupabaseOrigin = new URL(BUILD_SUPABASE_URL).origin;
const buildSupabaseHost = new URL(BUILD_SUPABASE_URL).hostname;

if (!["127.0.0.1", "localhost", "::1"].includes(buildSupabaseHost)) {
  throw new Error("cashout-manual E2E는 운영 Auth에 테스트 사용자를 만들지 않습니다. 로컬 Supabase URL을 사용하세요.");
}

type CashoutRecord = {
  id: number;
  status: "REQUESTED" | "PAID" | "REJECTED";
  clover_amount: number;
  net_krw: number;
  bank_code: string;
  account_masked: string;
  account_holder: string;
  requested_at: string;
  paid_at: string | null;
  rejected_at: string | null;
  processing_note: string | null;
};

type UserFixtureState = {
  totalBalance: number;
  welcomeAmount: number;
  // A안(FDD §9.3): 신청은 총량을 건드리지 않고 잠금만 건다. payableAmount는
  // "신청 가능한 잔여분"(잠김을 뺀 값)이고, lockedAmount가 잠긴 클로버의 진실원이다.
  payableAmount: number;
  lockedAmount: number;
  pendingCashout: CashoutRecord | null;
  phone: string | null;
};

type CapturedCookie = {
  name: string;
  value: string;
  options?: { maxAge?: number };
};

const fixtureByUser = new Map<string, UserFixtureState>();
const authCookiesByUser = new Map<string, CapturedCookie[]>();
const INITIAL_FIXTURE_BY_USER = new Map<string, UserFixtureState>([
  [USERS.below, {
    totalBalance: 29,
    welcomeAmount: 0,
    payableAmount: 29,
    lockedAmount: 0,
    pendingCashout: null,
    phone: null,
  }],
  [USERS.invalid, {
    totalBalance: 40,
    welcomeAmount: 0,
    payableAmount: 40,
    lockedAmount: 0,
    pendingCashout: null,
    phone: null,
  }],
  [USERS.happy, {
    totalBalance: 52,
    welcomeAmount: 12,
    payableAmount: 40,
    lockedAmount: 0,
    pendingCashout: null,
    phone: "01012345678",
  }],
  [USERS.duplicate, {
    // 컨트롤러 재검증 MINOR 수정: total=10·locked=30은 I2(locked<=total)를 위반하는
    // 자기모순 상태였다(B안 시절 값이 남아 있었다). total=40으로 올려 locked=30 ·
    // payable=10(=40-0-30)이 실제로 성립하게 맞춘다.
    totalBalance: 40,
    welcomeAmount: 0,
    payableAmount: 10,
    lockedAmount: 30, // existingDuplicate()의 clover_amount와 정합(진행 중 신청 = 잠김)
    pendingCashout: existingDuplicate(),
    phone: "01087654321",
  }],
  [USERS.general, {
    totalBalance: 35,
    welcomeAmount: 5,
    payableAmount: 30,
    lockedAmount: 0,
    pendingCashout: null,
    phone: "01011112222",
  }],
]);
let mockServer: Server;
let nextProcess: ChildProcess;
let cashoutDelayMs = 0;
let eligibilityDelayMs = 0;
let cheerSearchRequests: string[] = [];
let cheerFixtureCount = 100;
const CAPTURE_DIR = path.resolve(
  process.env.CASHOUT_CAPTURE_DIR ?? "../artifacts/qa-cashout-core-20260824/build-fix",
);

async function provisionLocalAuthSessions() {
  const admin = createClient(BUILD_SUPABASE_URL, BUILD_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const userId of Object.values(USERS)) {
    const email = `cashout-e2e-${userId}@test.local`;
    const password = `cashout-e2e-${userId}-pw`;
    const { error: createError } = await admin.auth.admin.createUser({
      id: userId,
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw new Error(`cashout QA 계정 생성 실패: ${createError.message}`);

    const cookieJar = new Map<string, CapturedCookie>();
    const authClient = createBrowserClient(BUILD_SUPABASE_URL, BUILD_SUPABASE_ANON_KEY, {
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
    const { error: signInError } = await authClient.auth.signInWithPassword({ email, password });
    if (signInError) throw new Error(`cashout QA 로그인 실패: ${signInError.message}`);
    authCookiesByUser.set(userId, [...cookieJar.values()]);
  }
}

async function removeLocalAuthUsers() {
  const admin = createClient(BUILD_SUPABASE_URL, BUILD_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  for (const userId of Object.values(USERS)) {
    await admin.auth.admin.deleteUser(userId);
  }
}

function userIdFromRequest(request: IncomingMessage) {
  const authorization = request.headers.authorization ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token.includes(".")) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

async function requestJson(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) as Record<string, unknown> : {};
}

function json(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function eligibility(userId: string | null) {
  const fixture = userId ? fixtureByUser.get(userId) : undefined;
  const totalBalance = fixture?.totalBalance ?? 0;
  const welcomeAmount = fixture?.welcomeAmount ?? 0;
  const payableAmount = fixture?.payableAmount ?? 0;
  const lockedAmount = fixture?.lockedAmount ?? 0;
  return [{
    total_balance: totalBalance,
    welcome_amount: welcomeAmount,
    locked_amount: lockedAmount,
    available_amount: Math.max(totalBalance - lockedAmount, 0),
    payable_amount: payableAmount,
    min_cashout_clover: 30,
    reached_threshold: totalBalance >= 30,
  }];
}

function existingDuplicate(): CashoutRecord {
  return {
    id: 8004,
    status: "REQUESTED",
    clover_amount: 30,
    net_krw: 25_819, // 30,000 − 이용료 3,300(VAT 포함) − 원천징수 881
    bank_code: "KB",
    account_masked: "••••••0042",
    account_holder: "중복회원",
    requested_at: "2026-08-04T00:00:00.000Z",
    paid_at: null,
    rejected_at: null,
    processing_note: null,
  };
}

function resetFixtureState() {
  fixtureByUser.clear();
  for (const [userId, initialFixture] of INITIAL_FIXTURE_BY_USER) {
    fixtureByUser.set(userId, structuredClone(initialFixture));
  }
}

async function handleMockSupabase(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", SUPABASE_URL);
  const userId = userIdFromRequest(request);

  if (url.pathname === "/auth/v1/user") {
    if (!userId) return json(response, 401, { message: "invalid token" });
    return json(response, 200, {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: `${userId}@test.local`,
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      created_at: "2026-08-04T00:00:00.000Z",
    });
  }

  if (url.pathname === "/rest/v1/rpc/clover_eligibility") {
    if (eligibilityDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, eligibilityDelayMs));
    }
    const body = await requestJson(request);
    const memberId = typeof body.p_member_id === "string" ? body.p_member_id : userId;
    return json(response, 200, eligibility(memberId));
  }

  if (url.pathname === "/rest/v1/rpc/my_cashout_status") {
    const current = userId ? fixtureByUser.get(userId)?.pendingCashout : null;
    return json(response, 200, current ? [current] : []);
  }

  if (url.pathname === "/rest/v1/rpc/my_cashout_history") {
    const current = userId ? fixtureByUser.get(userId)?.pendingCashout : null;
    return json(response, 200, current ? [current] : []);
  }

  if (url.pathname === "/rest/v1/rpc/create_cashout_request") {
    if (cashoutDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, cashoutDelayMs));
    }
    const body = await requestJson(request);
    const memberId = String(body.p_member_id ?? "");
    const fixture = fixtureByUser.get(memberId);
    if (!fixture) {
      return json(response, 400, {
        code: "P0001",
        message: "cashout_fixture_user_missing",
      });
    }
    if (fixture.pendingCashout) {
      return json(response, 400, {
        code: "55000",
        message: "cashout_already_requested",
      });
    }

    const cloverAmount = Number(body.p_clover_amount);
    const grossKrw = cloverAmount * 1000;
    // 서비스 이용료 10% + 부가세 10% → 원천징수는 이용료 차감 후 3.3%.
    const feeKrw = Math.floor((grossKrw * 10) / 100);
    const feeTotalKrw = feeKrw + Math.floor((feeKrw * 10) / 100);
    const withholdingKrw = Math.floor(((grossKrw - feeTotalKrw) * 33) / 1000);
    const requestedAt = "2026-08-04T01:23:45.000Z";
    const record: CashoutRecord = {
      id: 8103,
      status: "REQUESTED",
      clover_amount: cloverAmount,
      net_krw: grossKrw - feeTotalKrw - withholdingKrw,
      bank_code: String(body.p_bank_code),
      account_masked: PERSISTED_MASKED_ACCOUNT,
      account_holder: String(body.p_account_holder),
      requested_at: requestedAt,
      paid_at: null,
      rejected_at: null,
      processing_note: null,
    };
    fixture.pendingCashout = record;
    // A안(FDD T1): 신청은 총량을 줄이지 않는다. 잠금만 늘고 payable(신청 가능 잔여분)만 준다.
    fixture.lockedAmount += cloverAmount;
    fixture.payableAmount -= cloverAmount;

    // 실제 RPC 계약처럼 응답에는 계좌 원문·암호문을 포함하지 않는다.
    return json(response, 200, [{
      cashout_request_id: record.id,
      status: record.status,
      clover_amount: cloverAmount,
      gross_krw: grossKrw,
      fee_krw: feeTotalKrw,
      withholding_krw: withholdingKrw,
      net_krw: record.net_krw,
      requested_at: requestedAt,
      is_replay: false,
    }]);
  }

  if (url.pathname === "/rest/v1/member") {
    const fixture = userId ? fixtureByUser.get(userId) : null;
    if (!userId || !fixture) return json(response, 401, { message: "unauthorized" });

    if (request.method === "PATCH") {
      const body = await requestJson(request);
      fixture.phone = typeof body.phone === "string" ? body.phone : null;
      return json(response, 200, { id: userId });
    }

    return json(response, 200, { phone: fixture.phone });
  }

  if (url.pathname === "/rest/v1/goal") {
    return json(response, 200, [{
      id: 9001,
      slug: "e2e-overflow",
      title: "토익 900점과 영어 인터뷰 자신감을 함께 만들고 올해 안에 해외 고객 앞에서 당당하게 발표하는 목표를 반드시 해낼게",
      reason: "해외 고객 앞에서 직접 발표하기 위해",
      due_date: "2026-09-05",
      status: "ACTIVE",
    }]);
  }

  if (url.pathname === "/rest/v1/cheer") {
    let rows = Array.from({ length: cheerFixtureCount }, (_, index) => ({
      id: index + 1,
      display_name: `응원자 ${index + 1}`,
      is_anonymous: index % 3 === 0,
      message: index === 0
        ? "매일 쌓아 온 시간이 결국 도경님 편이 될 거예요. 점수가 잠깐 흔들려도 끝까지 응원할게요."
        : `${index + 1}번째 응원 메시지예요`,
      clover_amount: (index % 10) + 1,
      created_at: new Date(Date.UTC(2026, 7, 24, 0, 0, 0) - index * 60_000).toISOString(),
    }));
    const readIlike = (column: "display_name" | "message") => {
      const filter = url.searchParams.get(column);
      if (!filter?.startsWith("ilike.")) return null;
      return filter.slice("ilike.".length).replace(/^%|%$/g, "").toLocaleLowerCase("ko-KR");
    };
    const displayNameQuery = readIlike("display_name");
    const messageQuery = readIlike("message");
    if (displayNameQuery) {
      cheerSearchRequests.push(`display_name:${displayNameQuery}`);
      rows = rows.filter((row) => !row.is_anonymous && row.display_name.toLocaleLowerCase("ko-KR").includes(displayNameQuery));
    }
    if (messageQuery) {
      cheerSearchRequests.push(`message:${messageQuery}`);
      rows = rows.filter((row) => row.message.toLocaleLowerCase("ko-KR").includes(messageQuery));
    }
    const range = request.headers.range?.match(/^(\d+)-(\d+)$/);
    const from = range ? Number(range[1]) : 0;
    const to = range ? Number(range[2]) : rows.length - 1;
    const selectedRows = rows.slice(from, to + 1);
    const rangeEnd = selectedRows.length > 0 ? from + selectedRows.length - 1 : from;
    return json(response, 200, selectedRows, { "content-range": `${from}-${rangeEnd}/${rows.length}` });
  }

  if (url.pathname === "/rest/v1/rpc/get_wordmap") {
    const words = ["꾸준한", "용감한", "단단한", "따뜻한", "빛나는", "성실한", "정직한", "집중한", "성장한", "발표한", "영어한", "완주한"];
    return json(response, 200, Array.from({ length: 100 }, (_, index) => ({
      word: index < words.length ? words[index] : `응원단어 ${index + 1}`,
      word_count: Math.max(100 - index, 1),
    })));
  }

  if (url.pathname === "/rest/v1/notification") {
    return json(response, 200, [], { "content-range": "*/0" });
  }

  if (url.pathname === "/rest/v1/clover_balance") {
    return json(response, 200, {
      clover_count: userId ? fixtureByUser.get(userId)?.totalBalance ?? 0 : 0,
    });
  }

  return json(response, 404, { message: `unhandled e2e fixture: ${url.pathname}` });
}

async function waitForApp(url: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Next dev server did not start: ${String(lastError)}`);
}

async function authenticate(context: BrowserContext, userId: string) {
  const cookies = authCookiesByUser.get(userId);
  if (!cookies?.length) throw new Error(`cashout QA 세션 없음: ${userId}`);
  const nowSeconds = Math.floor(Date.now() / 1000);
  await context.addCookies(cookies.map(({ name, value, options }) => ({
    name,
    value,
    url: APP_URL,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
    expires: nowSeconds + (options?.maxAge ?? 60 * 60),
  })));
}

async function routeFixtureData(page: Page) {
  await page.route("**/rest/v1/**", async (route) => {
    const source = new URL(route.request().url());
    if (source.origin !== buildSupabaseOrigin) return route.fallback();
    const target = new URL(`${source.pathname}${source.search}`, SUPABASE_URL);
    await route.continue({ url: target.toString() });
  });
}

async function openCashout(page: Page, userId: string) {
  await routeFixtureData(page);
  await authenticate(page.context(), userId);
  await page.goto(`${APP_URL}/cashout`);
  await expect(page.getByTestId("cashout-page")).toBeVisible();
}

test.beforeAll(async () => {
  mockServer = createServer((request, response) => {
    void handleMockSupabase(request, response).catch((error) => {
      json(response, 500, { message: error instanceof Error ? error.message : "fixture failed" });
    });
  });
  await new Promise<void>((resolve, reject) => {
    mockServer.once("error", reject);
    mockServer.listen(SUPABASE_PORT, "127.0.0.1", resolve);
  });
  await provisionLocalAuthSessions();

  nextProcess = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(APP_PORT)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        // production 번들은 localhost를 기준으로 만들고 실제 브라우저는 127.0.0.1로
        // 접속한다. MyLinkCard는 첫 hydration을 같은 값으로 시작한 뒤 actual host로 갱신해야 한다.
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        CASHOUT_E2E_SUPABASE_SOURCE_URL: BUILD_SUPABASE_URL,
        CASHOUT_E2E_SUPABASE_TARGET_URL: SUPABASE_URL,
        NODE_OPTIONS: [
          process.env.NODE_OPTIONS,
          `--require=${path.resolve("e2e/support/cashout-fetch-redirect.cjs")}`,
        ].filter(Boolean).join(" "),
        CASHOUT_ENABLED: "true",
        CASHOUT_ALLOWED_MEMBER_IDS: [
          USERS.below,
          USERS.invalid,
          USERS.happy,
          USERS.duplicate,
        ].join(","),
        CASHOUT_ACCOUNT_ENCRYPTION_KEY: "e".repeat(40),
        CASHOUT_ACCOUNT_FINGERPRINT_KEY: "f".repeat(40),
      },
      stdio: "inherit",
    },
  );
  await waitForApp(`${APP_URL}/`);
});

test.beforeEach(() => {
  resetFixtureState();
  cashoutDelayMs = 0;
  eligibilityDelayMs = 0;
  cheerSearchRequests = [];
  cheerFixtureCount = 100;
});

test.afterAll(async () => {
  nextProcess?.kill("SIGTERM");
  await removeLocalAuthUsers();
  await new Promise<void>((resolve) => mockServer?.close(() => resolve()));
});

test.describe("수동 환전: happy + edge", () => {
  test("P0-01 일반 계정은 잔액을 회수하지만 신청 폼은 열리지 않는다", async ({ page }) => {
    await openCashout(page, USERS.general);

    await expect(page.getByTestId("cashout-breakdown-table")).toBeVisible();
    await expect(page.getByTestId("cashout-confirm-disabled")).toContainText(
      "환전 기능을 준비하고 있어요",
    );
    await expect(page.getByTestId("cashout-request-form")).toHaveCount(0);
  });

  test("전화번호가 없는 회원에게 카카오 재동의 안내를 노출한다", async ({ page }) => {
    await openCashout(page, USERS.invalid);

    await expect(page.getByTestId("phone-consent-notice")).toContainText(
      "환전 안내를 받을 전화번호가 필요해요",
    );
  });

  test("전화번호가 있는 회원에게는 카카오 재동의 안내를 노출하지 않는다", async ({ page }) => {
    await openCashout(page, USERS.happy);

    await expect(page.getByTestId("phone-consent-notice")).toHaveCount(0);
  });

  test("재동의 CTA는 현재 환전 경로를 담아 카카오 시작 라우트로 간다", async ({ page }) => {
    await openCashout(page, USERS.invalid);

    const href = await page.getByTestId("phone-consent-cta").getAttribute("href");
    const target = new URL(href ?? "", APP_URL);
    expect(target.pathname).toBe("/auth/kakao/start");
    expect(target.searchParams.get("redirect")).toBe("/cashout");
  });

  test("재동의 후에도 번호가 없으면 직접 입력 폴백을 안내한다", async ({ page }) => {
    await openCashout(page, USERS.invalid);
    await page.evaluate(() => {
      window.sessionStorage.setItem("haenael_phone_consent_pending", "/cashout");
    });
    await page.reload();

    await expect(page.getByTestId("phone-consent-notice")).toContainText(
      "카카오에서 전화번호를 받지 못했어요",
    );
    await expect(page.getByTestId("phone-consent-notice")).toContainText(
      "아래에 전화번호를 직접 입력해 주세요.",
    );
    await expect(page.getByTestId("phone-consent-cta")).toHaveCount(0);
    await expect(page.getByTestId("cashout-phone")).toBeVisible();
  });

  test("잔액 29클로버 미달이면 안내를 노출하고 신청을 차단한다", async ({ page }) => {
    await openCashout(page, USERS.below);

    await expect(page.getByTestId("cashout-below-threshold-banner")).toContainText("1개");
    await expect(page.getByTestId("cashout-confirm-disabled")).toBeVisible();
    await expect(page.getByTestId("cashout-confirm-button")).toHaveCount(0);
  });

  test("저장된 전화번호가 없으면 환전 신청을 인라인에서 거부한다", async ({ page }) => {
    await openCashout(page, USERS.invalid);

    await page.locator("#cashout-bank").selectOption("KB");
    await page.locator("#cashout-account").fill(FULL_ACCOUNT);
    await page.locator("#cashout-holder").fill("홍길동");
    await expect(page.getByTestId("cashout-phone")).toHaveValue("");
    await page.getByTestId("cashout-confirm-button").click();

    await expect(page.getByTestId("cashout-request-form").getByRole("alert"))
      .toHaveText("입금 완료 안내를 받을 휴대전화 번호를 입력해 주세요.");
    await expect(page.getByTestId("cashout-confirm-step")).toHaveCount(0);
  });

  test("저장된 전화번호가 있으면 환전 신청 폼에 미리 채운다", async ({ page }) => {
    await openCashout(page, USERS.happy);

    await expect(page.getByTestId("cashout-phone")).toHaveValue("01012345678");
  });

  test("미리보기 박스가 서비스 이용료 10%(VAT 포함)와 이용료 차감 후 원천징수를 렌더한다", async ({ page }) => {
    await openCashout(page, USERS.happy);

    // payable 40클로버 = 40,000원 → 이용료 4,000 + VAT 400 = 4,400,
    // 원천징수 floor((40,000 − 4,400) × 33/1000) = 1,174, 실지급 34,426.
    const preview = page.getByTestId("cashout-net-preview");
    await expect(preview).toContainText("서비스 이용료 (부가세 포함)");
    await expect(page.getByTestId("cashout-fee-amount")).toHaveText("− 4,400원");
    await expect(page.getByTestId("cashout-withholding-amount")).toHaveText("− 1,174원");
    await expect(page.getByTestId("cashout-net-amount")).toHaveText("34,426원");
    await expect(preview).not.toContainText("플랫폼 수수료 없이");
    await expect(preview).toContainText("서비스 이용료는 커피 한 잔 값이에요.");

    // 같은 화면 안의 신청 폼도 30클로버 기준값을 정확히 재현해야 한다.
    // 기본값은 지급가능액 전부이므로 30을 직접 입력해 수수료 계약을 고정한다.
    await page.locator("#cashout-clover-amount").fill("30");
    await expect(page.getByTestId("cashout-live-preview")).toContainText("서비스 이용료 3,300원");
    await expect(page.getByTestId("cashout-live-preview")).toContainText("원천징수 881원");
    await expect(page.getByTestId("cashout-live-preview")).toContainText("25,819원 입금");
    await expect(page.getByTestId("cashout-page")).not.toContainText("29,010원");
  });

  test("잘못된 계좌 형식과 신청량 0개를 인라인에서 거부한다", async ({ page }) => {
    await openCashout(page, USERS.invalid);
    const requestForm = page.getByTestId("cashout-request-form");
    const cloverAmountInput = page.locator("#cashout-clover-amount");

    await expect(cloverAmountInput).toHaveAttribute("min", "1");
    await page.locator("#cashout-bank").selectOption("KB");
    await page.locator("#cashout-account").fill("1234-ABCD");
    await page.locator("#cashout-holder").fill("홍길동");
    await page.locator("#cashout-phone").fill("010-5555-6666");
    await cloverAmountInput.fill("0");
    await page.getByTestId("cashout-confirm-button").click();
    await expect(requestForm.getByRole("alert")).toHaveText(
      "환전할 클로버를 한 개 이상 입력해 주세요.",
    );
    expect(
      await cloverAmountInput.evaluate(
        (input) => (input as HTMLInputElement).validationMessage,
      ),
    ).toBe(
      "환전할 클로버를 한 개 이상 입력해 주세요.",
    );

    await cloverAmountInput.fill("30");
    await page.getByTestId("cashout-confirm-button").click();
    await expect(requestForm.getByRole("alert")).toHaveText("계좌번호를 하이픈 없이 숫자 8~20자로 입력해 주세요.");
    await expect(page.getByTestId("cashout-confirm-step")).toHaveCount(0);
  });

  test("계좌 신청 후 REQUESTED 상태·마스킹 응답·상태/이력을 렌더한다", async ({ page }) => {
    await openCashout(page, USERS.happy);

    await page.getByTestId("cashout-phone").fill("010-9999-8888");
    await page.locator("#cashout-clover-amount").fill("40");
    await page.locator("#cashout-bank").selectOption("KB");
    await page.locator("#cashout-account").fill(VISUAL_ACCOUNT);
    await page.locator("#cashout-holder").fill("조도경");
    await page.getByTestId("cashout-confirm-button").click();
    await expect(page.getByTestId("cashout-confirm-step")).toBeVisible();

    let actionBody = "";
    await page.route(`${APP_URL}/cashout`, async (route) => {
      const request = route.request();
      if (request.method() !== "POST" || !request.headers()["next-action"]) {
        return route.fallback();
      }
      const response = await route.fetch();
      actionBody = await response.text();
      await route.fulfill({ response, body: actionBody });
    });
    await page.getByTestId("cashout-submit-button").click();

    await expect(page.getByTestId("cashout-request-success")).toBeVisible();
    expect(fixtureByUser.get(USERS.happy)?.phone).toBe("01099998888");
    await expect(page.getByTestId("cashout-request-success")).toContainText(VISUAL_MASKED_ACCOUNT);
    await expect(page.getByTestId("cashout-page")).not.toContainText(VISUAL_ACCOUNT);
    expect(actionBody).toContain("REQUESTED");
    expect(actionBody).not.toContain(VISUAL_ACCOUNT);

    const statusResponse = await page.goto(`${APP_URL}/cashout/status`);
    const statusDocument = await statusResponse?.text();
    await expect(page.getByTestId("cashout-status-page")).toBeVisible();
    await expect(page.getByTestId("cashout-status-page")).toContainText("접수됨");
    await expect(page.getByTestId("cashout-status-page")).toContainText(PERSISTED_MASKED_ACCOUNT);
    await expect(page.getByTestId("cashout-status-page")).not.toContainText(FULL_ACCOUNT);
    expect(statusDocument).not.toContain(FULL_ACCOUNT);

    const historyResponse = await page.goto(`${APP_URL}/cashout/history`);
    const historyDocument = await historyResponse?.text();
    await expect(page.getByTestId("cashout-history-page")).toBeVisible();
    await expect(page.getByTestId("cashout-history-page")).toContainText("지급 대기");
    await expect(page.getByTestId("cashout-history-page")).toContainText(PERSISTED_MASKED_ACCOUNT);
    await expect(page.getByTestId("cashout-history-page")).not.toContainText(FULL_ACCOUNT);
    expect(historyDocument).not.toContain(FULL_ACCOUNT);
  });

  test("진행 중 신청이 있으면 폼 대신 중복 신청 차단 상태를 표시한다", async ({ page }) => {
    await openCashout(page, USERS.duplicate);

    await expect(page.getByTestId("cashout-pending-block")).toContainText("이미 처리 중인 신청");
    await expect(page.getByTestId("cashout-pending-block")).toContainText("한 번에 한 건씩만");
    await expect(page.getByTestId("cashout-request-form")).toHaveCount(0);
    await expect(page.getByTestId("cashout-pending-block")).not.toContainText(FULL_ACCOUNT);
  });

  test("TC-E2E-V37 로그인 세션으로 공용 shell·제출 loading·응원 overflow를 실제 렌더하고 캡처한다", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    mkdirSync(CAPTURE_DIR, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await routeFixtureData(page);
    await authenticate(page.context(), USERS.happy);

    eligibilityDelayMs = 1_000;
    await page.goto(`${APP_URL}/me`, { waitUntil: "commit" });
    await expect(page.getByTestId("receiver-home-loading")).toBeVisible();
    await page.screenshot({ path: path.join(CAPTURE_DIR, "me-balance-loading-390.png"), fullPage: true });
    await expect(page.getByTestId("receiver-home-page")).toBeVisible();
    eligibilityDelayMs = 0;
    await expect(page.getByTestId("receiver-cheer-list").getByTestId("cheer-item")).toHaveCount(8);
    await expect(page.getByTestId("wordmap-mini-preview").locator("span")).toHaveCount(6);
    await expect(page.getByTestId("wordmap-overflow-summary")).toHaveText("6개 표시 · 94개는 전체 워드맵에서 확인");
    await page.screenshot({ path: path.join(CAPTURE_DIR, "me-390.png"), fullPage: true });

    await page.getByRole("button", { name: "응원 목록 펼치기" }).click();
    await expect(page.getByTestId("receiver-cheer-list").getByTestId("cheer-item")).toHaveCount(20);
    await expect(page.getByTestId("receiver-cheer-card")).toContainText("80개는 검색으로 찾기");
    const cheerCardBox = await page.getByTestId("receiver-cheer-card").boundingBox();
    const wordmapCtaBox = await page.getByTestId("wordmap-view-cta").boundingBox();
    expect(cheerCardBox).not.toBeNull();
    expect(wordmapCtaBox).not.toBeNull();
    expect(wordmapCtaBox!.y).toBeGreaterThanOrEqual(cheerCardBox!.y + cheerCardBox!.height);
    await page.screenshot({ path: path.join(CAPTURE_DIR, "me-overflow-100-390.png"), fullPage: true });

    await page.getByTestId("cheer-search-trigger").click();
    cheerFixtureCount = 121;
    await page.getByTestId("cheer-search-input").fill("121번째");
    await Promise.all([
      page.waitForURL(`${APP_URL}/me?q=121%EB%B2%88%EC%A7%B8`),
      page.getByRole("button", { name: "찾기", exact: true }).click(),
    ]);
    await expect(page.getByTestId("receiver-cheer-list")).toContainText("121번째 응원 메시지예요");
    await expect(page.getByTestId("cheer-overflow-summary")).toHaveText("1개 찾았어요");
    await expect(page.getByRole("link", { name: "전체 목록" })).toBeVisible();
    expect(cheerSearchRequests).toContain("message:121번째");
    await expect(page.getByTestId("receiver-home-loading")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(CAPTURE_DIR, "me-search-121-of-121-390.png"), fullPage: true });

    await page.goto(`${APP_URL}/cashout`);
    await expect(page.getByTestId("cashout-page")).toBeVisible();
    await page.screenshot({ path: path.join(CAPTURE_DIR, "cashout-390.png"), fullPage: true });

    await page.locator("#cashout-clover-amount").fill("40");
    await page.locator("#cashout-bank").selectOption("KB");
    await page.locator("#cashout-account").fill(VISUAL_ACCOUNT);
    await page.locator("#cashout-holder").fill("조도경");
    await page.getByTestId("cashout-confirm-button").click();
    await expect(page.getByRole("heading", { name: "이 계좌가 맞나요?" })).toBeVisible();
    await expect(page.getByTestId("cashout-form-breakdown")).toHaveCount(0);
    const confirmBox = await page.getByTestId("cashout-page").boundingBox();
    expect(confirmBox).not.toBeNull();
    expect(Math.abs((confirmBox?.height ?? 0) - 509.09375)).toBeLessThanOrEqual(4);
    await page.getByTestId("cashout-page").screenshot({ path: path.join(CAPTURE_DIR, "cashout-confirm-390.png") });
    cashoutDelayMs = 1_000;
    await page.getByTestId("cashout-submit-button").click();
    await expect(page.getByTestId("cashout-submitting-state")).toBeVisible();
    await expect(page.getByRole("heading", { name: "잠깐 기다리는 동안에도 지금 하는 일을 알려드려요" })).toBeVisible();
    await expect(page.getByTestId("cashout-confirm-banner")).toHaveCount(0);
    const submittingBox = await page.getByTestId("cashout-page").boundingBox();
    expect(submittingBox).not.toBeNull();
    expect(Math.abs((submittingBox?.height ?? 0) - 622.8125)).toBeLessThanOrEqual(4);
    await page.getByTestId("cashout-page").screenshot({ path: path.join(CAPTURE_DIR, "cashout-submitting-390.png") });
    console.log(JSON.stringify({
      cashoutVisualMetrics: {
        viewport: "390x844",
        confirmHeight: confirmBox?.height,
        submittingHeight: submittingBox?.height,
      },
    }));
    await expect(page.getByTestId("cashout-request-success")).toBeVisible();

    await page.goto(`${APP_URL}/cashout/status`);
    await expect(page.getByTestId("cashout-status-page")).toBeVisible();
    await page.screenshot({ path: path.join(CAPTURE_DIR, "cashout-status-390.png"), fullPage: true });
    expect(consoleErrors.filter((message) => /hydration|server rendered text didn't match/i.test(message))).toEqual([]);
  });
});
