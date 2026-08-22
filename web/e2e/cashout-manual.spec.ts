// e2e/cashout-manual.spec.ts — 수동 환전 브라우저 E2E.
//
// 운영 DB 쓰기 금지 원칙 때문에 스펙 내부의 격리된 Supabase 계약 서버를 사용한다.
// 실제 Next.js 화면/RSC/Server Action은 그대로 실행하고, DB 함수의 상태 전이는 pgTAP이 맡는다.
// 인증은 기존 스펙의 조건부 실세션 관례를 보완해 @supabase/ssr 쿠키를 로컬 컨텍스트에만 주입한다.

import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const APP_PORT = 3461;
const SUPABASE_PORT = 54329;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const SUPABASE_URL = `http://127.0.0.1:${SUPABASE_PORT}`;
const AUTH_COOKIE = "sb-127-auth-token";
const FULL_ACCOUNT = "123456789012";
const FORM_MASKED_ACCOUNT = "********9012";
const PERSISTED_MASKED_ACCOUNT = "••••••9012";

const USERS = {
  below: "ca5e2e00-0000-0000-0000-000000000001",
  invalid: "ca5e2e00-0000-0000-0000-000000000002",
  happy: "ca5e2e00-0000-0000-0000-000000000003",
  duplicate: "ca5e2e00-0000-0000-0000-000000000004",
} as const;

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

const fixtureByUser = new Map<string, UserFixtureState>();
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
    totalBalance: 40,
    welcomeAmount: 0,
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
]);
let mockServer: Server;
let nextProcess: ChildProcess;

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function accessTokenFor(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  return [
    base64Url(JSON.stringify({ alg: "none", typ: "JWT" })),
    base64Url(JSON.stringify({
      aud: "authenticated",
      exp: now + 3600,
      iat: now,
      role: "authenticated",
      sub: userId,
    })),
    "e2e-signature",
  ].join(".");
}

function authCookieValue(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const session = {
    access_token: accessTokenFor(userId),
    refresh_token: `refresh-${userId}`,
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: "bearer",
    user: {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      email: `${userId}@test.local`,
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      created_at: "2026-08-04T00:00:00.000Z",
    },
  };
  return `base64-${base64Url(JSON.stringify(session))}`;
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

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
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
  await context.addCookies([{
    name: AUTH_COOKIE,
    value: authCookieValue(userId),
    url: APP_URL,
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }]);
}

async function openCashout(page: Page, userId: string) {
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

  nextProcess = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(APP_PORT)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_PUBLIC_APP_URL: APP_URL,
        NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "e2e-service-role-key",
        CASHOUT_ENABLED: "true",
        CASHOUT_ACCOUNT_ENCRYPTION_KEY: "e".repeat(40),
        CASHOUT_ACCOUNT_FINGERPRINT_KEY: "f".repeat(40),
      },
      stdio: "ignore",
    },
  );
  await waitForApp(`${APP_URL}/`);
});

test.beforeEach(() => {
  resetFixtureState();
});

test.afterAll(async () => {
  nextProcess?.kill("SIGTERM");
  await new Promise<void>((resolve) => mockServer?.close(() => resolve()));
});

test.describe("수동 환전 — happy + edge", () => {
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
      .toHaveText("전화번호를 숫자로 정확히 입력해주세요.");
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

    // 같은 화면 안의 신청 폼 미리보기도 같은 계산식이어야 한다(옛 29,010원 잔존 금지).
    // 폼 기본 신청량은 최소 30클로버 = 30,000원 → 이용료 3,300 · 원천징수 881 · 실지급 25,819.
    await expect(page.getByTestId("cashout-live-preview")).toContainText("서비스 이용료 3,300원");
    await expect(page.getByTestId("cashout-live-preview")).toContainText("25,819원 입금");
    await expect(page.getByTestId("cashout-page")).not.toContainText("29,010원");
  });

  test("잘못된 계좌 형식과 최소 수량 미만을 인라인에서 거부한다", async ({ page }) => {
    await openCashout(page, USERS.invalid);
    const requestForm = page.getByTestId("cashout-request-form");
    const cloverAmountInput = page.locator("#cashout-clover-amount");

    await expect(cloverAmountInput).toHaveAttribute("min", "30");
    await page.locator("#cashout-bank").selectOption("KB");
    await page.locator("#cashout-account").fill("1234-ABCD");
    await page.locator("#cashout-holder").fill("홍길동");
    await page.locator("#cashout-phone").fill("010-5555-6666");
    // type=number의 native min 검증은 submit 이벤트 자체를 막는다. 이 케이스는
    // React validate()의 인라인 문구를 검증하므로 테스트 DOM에서만 native min을
    // 해제해 애플리케이션 submit handler까지 도달시킨다.
    await cloverAmountInput.evaluate((input) => input.removeAttribute("min"));
    await cloverAmountInput.fill("29");
    await page.getByTestId("cashout-confirm-button").click();
    await expect(requestForm.getByRole("alert")).toHaveText("30~40클로버 사이로 입력해주세요.");

    await cloverAmountInput.fill("30");
    await page.getByTestId("cashout-confirm-button").click();
    await expect(requestForm.getByRole("alert")).toHaveText("계좌번호를 숫자로 정확히 입력해주세요.");
    await expect(page.getByTestId("cashout-confirm-step")).toHaveCount(0);
  });

  test("계좌 신청 후 REQUESTED 상태·마스킹 응답·상태/이력을 렌더한다", async ({ page }) => {
    await openCashout(page, USERS.happy);

    await page.getByTestId("cashout-phone").fill("010-9999-8888");
    await page.locator("#cashout-clover-amount").fill("30");
    await page.locator("#cashout-bank").selectOption("KB");
    await page.locator("#cashout-account").fill(FULL_ACCOUNT);
    await page.locator("#cashout-holder").fill("홍길동");
    await page.getByTestId("cashout-confirm-button").click();
    await expect(page.getByTestId("cashout-confirm-step")).toBeVisible();

    const actionResponsePromise = page.waitForResponse((response) =>
      response.url().startsWith(APP_URL) && response.request().method() === "POST",
    );
    await page.getByTestId("cashout-submit-button").click();
    const actionResponse = await actionResponsePromise;
    const actionBody = await actionResponse.text();

    await expect(page.getByTestId("cashout-request-success")).toBeVisible();
    expect(fixtureByUser.get(USERS.happy)?.phone).toBe("01099998888");
    await expect(page.getByTestId("cashout-request-success")).toContainText(FORM_MASKED_ACCOUNT);
    await expect(page.getByTestId("cashout-page")).not.toContainText(FULL_ACCOUNT);
    expect(actionBody).toContain("REQUESTED");
    expect(actionBody).not.toContain(FULL_ACCOUNT);

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
});
