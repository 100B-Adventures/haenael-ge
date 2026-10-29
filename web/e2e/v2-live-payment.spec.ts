import { createClient } from "@supabase/supabase-js";
import {
  devices,
  type Page,
  type Response,
  expect,
  test,
} from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 미설정`);
  return value;
}

const RUN_LIVE = process.env.RUN_LIVE_TOSS_SANDBOX_E2E === "1";
const APPROVED_STAGING_PROJECT_REF = "ezzklgotgydwxqebfoys";
const BASE_URL = RUN_LIVE
  ? requiredEnv("E2E_BASE_URL")
  : "http://localhost:3000";
const SUPABASE_URL = RUN_LIVE
  ? requiredEnv("NEXT_PUBLIC_SUPABASE_URL")
  : "http://127.0.0.1:54321";
const ANON_KEY = RUN_LIVE
  ? requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  : "unused";
const SERVICE_KEY = RUN_LIVE
  ? requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  : "unused";
const ACCESS_TOKEN = RUN_LIVE ? requiredEnv("SUPABASE_ACCESS_TOKEN") : "unused";
const TOSS_CLIENT_KEY = RUN_LIVE
  ? requiredEnv("TOSS_CLIENT_KEY")
  : "test_ck_mock";
const PROJECT_REF = RUN_LIVE
  ? requiredEnv("SUPABASE_STAGING_PROJECT_REF")
  : "unused";
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const email = `payment-owner-${runId}@test.local`;
const password = `Payment-${runId}-A9!`;
const goalSlug = `payment-${runId}`;
const evidenceDir = resolve(
  process.cwd(),
  "../docs/qa/evidence/v2-goal-round4-20261029/payment",
);
const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type CreatedOrder = {
  orderId: string;
  paymentId: number;
  cheerId: number;
  amountKrw: number;
};

const createdOrders: CreatedOrder[] = [];
let ownerId = "";
let goalId = 0;

async function runFixtureSql(sql: string) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  if (!response.ok) {
    throw new Error(`staging_fixture_sql_failed:${response.status}`);
  }
  const payload = (await response.json()) as Array<Record<string, unknown>>;
  const first = payload[0];
  return first ? String(Object.values(first)[0] ?? "") : "";
}

async function waitForPaymentState(
  orderId: string,
  expectedPayment: "READY" | "DONE",
  expectedCheer: "PENDING" | "CONFIRMED",
) {
  let last = "missing";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data: payment, error: paymentError } = await admin
      .from("payment")
      .select("id,order_id,payment_key,amount_krw,status")
      .eq("order_id", orderId)
      .maybeSingle();
    const { data: cheer, error: cheerError } = payment
      ? await admin
          .from("cheer")
          .select("id,payment_id,clover_amount,status")
          .eq("payment_id", payment.id)
          .maybeSingle()
      : { data: null, error: null };
    if (paymentError || cheerError) {
      throw paymentError ?? cheerError;
    }
    last = `${payment?.status ?? "missing"}/${cheer?.status ?? "missing"}`;
    if (
      payment?.status === expectedPayment &&
      cheer?.status === expectedCheer
    ) {
      return { payment, cheer };
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  throw new Error(`payment_state_timeout:${orderId}:${last}`);
}

async function startSandboxPayment(
  page: Page,
  responses: TossResponseEvidence[] = [],
) {
  await page.goto(`${BASE_URL}/g/${goalSlug}`, { waitUntil: "networkidle" });
  const cta = page.getByTestId("cheer-cta");
  await expect(cta).toBeVisible();
  await expect(cta).toBeEnabled();
  await cta.click();
  await expect(page.getByTestId("cheer-payment-sheet")).toBeVisible();
  await page.getByTestId("cheer-preset-1").click();

  const orderResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/functions/v1/cheer-order") &&
      response.request().method() === "POST",
  );
  await page.getByTestId("cheer-payment-submit").click();
  const orderResponse = await orderResponsePromise;
  const orderBody = (await orderResponse.json()) as CreatedOrder & {
    error?: { code?: string };
  };
  expect(
    orderResponse.status(),
    `cheer-order:${orderBody.error?.code ?? "unknown"}`,
  ).toBe(201);
  expect(orderBody.orderId).toMatch(/^hnl_[a-f0-9]{24}$/);
  createdOrders.push(orderBody);
  await expect
    .poll(
      async () => {
        const hasTossSurface = (await tossPaymentFrames(page)).length > 0;
        if (hasTossSurface) return "toss-surface";
        const visibleError = await page
          .getByTestId("cheer-payment-sheet")
          .locator('p[class*="B3261E"], [role=alert]')
          .allTextContents()
          .catch(() => []);
        return visibleError.find((text) => text.trim()) ?? "waiting";
      },
      {
        message: "Toss 결제창 또는 SDK 오류가 나타나야 한다",
        timeout: 10_000,
      },
    )
    .not.toBe("waiting");
  const sdkError = await page
    .getByTestId("cheer-payment-sheet")
    .locator('p[class*="B3261E"], [role=alert]')
    .allTextContents()
    .catch(() => []);
  const sdkErrorMessage = sdkError.find((text) => text.trim());
  if (sdkErrorMessage) {
    throw new Error(
      `toss_sdk_rejected:${sdkErrorMessage}:${JSON.stringify({
        responses: responses.slice(-20),
      })}`,
    );
  }
  return orderBody;
}

async function tossPaymentFrames(page: Page) {
  return page
    .context()
    .pages()
    .flatMap((candidatePage) => candidatePage.frames())
    .filter((frame) => /tosspayments\.com/i.test(frame.url()));
}

type TossResponseEvidence = {
  method: string;
  skipAuth: "FORCE_SUCCESS" | "FORCE_FAIL" | "absent";
  status: number;
  url: string;
  detail?: string;
};

function observeTossResponses(page: Page) {
  const entries: TossResponseEvidence[] = [];
  const listener = (response: Response) => {
    if (!/tosspayments\.com|toss\.im|bankpay/i.test(response.url())) return;
    const url = new URL(response.url());
    const requestText = `${response.request().url()} ${response.request().postData() ?? ""}`;
    const entry: TossResponseEvidence = {
      method: response.request().method(),
      skipAuth: requestText.includes("FORCE_SUCCESS")
        ? "FORCE_SUCCESS"
        : requestText.includes("FORCE_FAIL")
          ? "FORCE_FAIL"
          : "absent",
      status: response.status(),
      url: `${url.origin}${url.pathname}`,
    };
    entries.push(entry);
    if (response.status() >= 400) {
      void response
        .text()
        .then((body) => {
          entry.detail = body.slice(0, 500);
        })
        .catch(() => undefined);
    }
  };
  page.context().on("response", listener);
  return {
    entries,
    stop: () => page.context().removeListener("response", listener),
  };
}

async function tossSurfaceEvidence(page: Page) {
  return Promise.all(
    (await tossPaymentFrames(page)).map(async (frame) => ({
      url: (() => {
        const url = new URL(frame.url());
        return `${url.origin}${url.pathname}`;
      })(),
      headings: await frame
        .locator("h1:visible, h2:visible, [role=heading]:visible")
        .allTextContents()
        .catch(() => []),
      bodyText: await frame
        .locator("body")
        .innerText()
        .then((text) => text.slice(0, 2_000))
        .catch(() => ""),
      fields: await frame
        .locator("input:visible")
        .evaluateAll((inputs) =>
          inputs.map((input) => {
            const element = input as HTMLInputElement;
            return {
              type: element.type,
              placeholder: element.placeholder,
              ariaLabel: element.getAttribute("aria-label"),
              required: element.required,
              checked: element.checked,
              ariaInvalid: element.getAttribute("aria-invalid"),
              validationMessage: element.validationMessage,
            };
          }),
        )
        .catch(() => []),
      comboboxes: await frame
        .getByRole("combobox")
        .evaluateAll((elements) =>
          elements.map((element) => element.outerHTML.slice(0, 1_000)),
        )
        .catch(() => []),
      buttons: await frame
        .getByRole("button")
        .allTextContents()
        .catch(() => []),
    })),
  );
}

async function submitActualTossPaymentWindow(page: Page) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    for (const frame of await tossPaymentFrames(page)) {
      const cardMethod = frame
        .getByRole("button")
        .filter({ hasText: /신용.*체크카드/ })
        .first();
      if (await cardMethod.count()) {
        await cardMethod.click();
        await expect(cardMethod).toHaveAttribute(
          "aria-label",
          /신용·체크카드 결제 수단 선택됨/,
        );
        console.log(
          "TOSS_CARD_METHOD_DOM",
          await cardMethod.evaluate((element) =>
            element.outerHTML.slice(0, 1_000),
          ),
        );
        const issuerSelect = frame.getByRole("combobox", {
          name: "카드사 선택",
        });
        await expect(issuerSelect).toHaveCount(1);
        console.log(
          "TOSS_CARD_ISSUER_SELECT_DOM",
          await issuerSelect.evaluate((element) =>
            element.outerHTML.slice(0, 1_000),
          ),
        );
        await issuerSelect.selectOption({ label: "신한" });
        await expect(issuerSelect).toHaveValue("CARD__SHINHAN");
      }
      const email = frame
        .locator('input[type="email"], input[placeholder*="이메일"]')
        .first();
      if (await email.isVisible().catch(() => false)) {
        await email.fill("payment-e2e@haenael.test");
      }
      const submit = frame.getByRole("button", { name: /^결제하기$/ }).first();
      if (await submit.isVisible().catch(() => false)) {
        console.log(
          "TOSS_PAYMENT_WINDOW_SURFACE",
          JSON.stringify(await tossSurfaceEvidence(page)),
        );
        await expect(submit).toBeEnabled();
        await submit.click();
        return;
      }
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(
    `toss_payment_window_submit_not_found:${JSON.stringify({
      pages: page
        .context()
        .pages()
        .map((candidate) => candidate.url()),
      surfaces: await tossSurfaceEvidence(page),
    })}`,
  );
}

async function awaitActualTossCardOutcome(
  page: Page,
  responses: TossResponseEvidence[],
) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (/\/payment\/(?:success|fail)/.test(page.url())) return;
    const cardGatewayFrames = page
      .context()
      .pages()
      .flatMap((candidatePage) => candidatePage.frames())
      .filter((frame) => frame.url() && frame.url() !== "about:blank");
    for (const frame of cardGatewayFrames) {
      const bodyText = await frame
        .locator("body")
        .innerText()
        .catch(() => "");
      if (/신한\s*super\s*SOL|신한SOL-Pay|신한카드/.test(bodyText)) {
        const evidence = {
          issuer: "SHINHAN",
          gatewayUrl: (() => {
            const url = new URL(frame.url());
            return `${url.origin}${url.pathname.split(";")[0]}`;
          })(),
          bodyText: bodyText.slice(0, 500),
          responses: responses.slice(-20),
        };
        console.log("TOSS_CARD_EXTERNAL_AUTH", JSON.stringify(evidence));
        throw new Error(
          `toss_card_external_auth_required:${JSON.stringify(evidence)}`,
        );
      }
    }
    await page.waitForTimeout(250);
  }
  throw new Error(
    `toss_card_outcome_not_reached:${JSON.stringify({
      surfaces: await tossSurfaceEvidence(page),
      responses: responses.slice(-20),
    })}`,
  );
}

async function completeTossSandboxCheckout(
  page: Page,
  expectedPath: "/payment/success" | "/payment/fail",
  responses: TossResponseEvidence[],
) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (page.url().includes(expectedPath)) return;

    let acted = false;
    for (const frame of await tossPaymentFrames(page)) {
      const requiredAgreements = frame.getByRole("checkbox", {
        name: /\[필수\]/,
      });
      for (
        let index = 0;
        index < (await requiredAgreements.count());
        index += 1
      ) {
        const agreement = requiredAgreements.nth(index);
        if (
          (await agreement.isVisible().catch(() => false)) &&
          !(await agreement.isChecked().catch(() => false))
        ) {
          await agreement.check();
          acted = true;
        }
      }
      for (const input of await frame.locator("input").all()) {
        if (!(await input.isVisible().catch(() => false))) continue;
        if (await input.isDisabled().catch(() => false)) continue;
        const type = await input.getAttribute("type");
        const placeholder = await input.getAttribute("placeholder");
        if (type === "tel" || /휴대폰/.test(placeholder ?? "")) {
          await input.fill("01000000000");
          acted = true;
        } else if (type === "email" || /이메일/.test(placeholder ?? "")) {
          await input.fill("payment-e2e@haenael.test");
          acted = true;
        }
      }

      const next = frame
        .getByRole("button", { name: /^(?:다음|확인|동의하고 계속|결제하기)$/ })
        .last();
      if (
        (await next.isVisible().catch(() => false)) &&
        (await next.isEnabled().catch(() => false))
      ) {
        acted = true;
        await next
          .evaluate((element) => (element as HTMLElement).click())
          .catch(() => undefined);
        break;
      }
    }

    await page.waitForTimeout(acted ? 500 : 250);
  }

  const remainingFrames = await tossPaymentFrames(page);
  const surface = remainingFrames.map((frame) => frame.url()).join(",");
  throw new Error(
    `toss_sandbox_callback_not_reached:${expectedPath}:${surface}:${JSON.stringify(
      {
        surfaces: await tossSurfaceEvidence(page),
        responses: responses.slice(-20),
      },
    )}`,
  );
}

async function closeActualTossPaymentWindow(page: Page) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (page.url().includes("/payment/fail?")) return;
    const tossSurfaces = await tossPaymentFrames(page);

    for (const frame of tossSurfaces) {
      const candidates = [
        frame.getByRole("button", { name: /닫기|취소|close/i }),
        frame.locator(
          '[aria-label*="닫기"], [aria-label*="취소"], [aria-label*="close" i]',
        ),
      ];
      for (const candidate of candidates) {
        const count = await candidate.count();
        for (let index = 0; index < count; index += 1) {
          const target = candidate.nth(index);
          if (await target.isVisible().catch(() => false)) {
            await target.evaluate((element) =>
              (element as HTMLElement).click(),
            );
            return;
          }
        }
      }
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  const observedFrames = page
    .context()
    .pages()
    .flatMap((candidatePage) =>
      candidatePage.frames().map((frame) => frame.url()),
    )
    .filter(Boolean)
    .join(",");
  throw new Error(`toss_payment_window_close_not_found:${observedFrames}`);
}

async function confirmedSideEffectCounts(paymentId: number, cheerId: number) {
  const [{ count: doneLogs }, { count: ledgerRows }] = await Promise.all([
    admin
      .from("payment_log")
      .select("id", { head: true, count: "exact" })
      .eq("payment_id", paymentId)
      .eq("to_status", "DONE"),
    admin
      .from("clover_ledger")
      .select("id", { head: true, count: "exact" })
      .eq("ref_type", "cheer")
      .eq("ref_id", cheerId),
  ]);
  return { doneLogs: doneLogs ?? 0, ledgerRows: ledgerRows ?? 0 };
}

async function memberPaymentEffects(memberId: string) {
  const [
    { data: balance, error: balanceError },
    { count: notifications, error: notificationError },
  ] = await Promise.all([
    admin
      .from("clover_balance")
      .select("clover_count")
      .eq("member_id", memberId)
      .maybeSingle(),
    admin
      .from("notification")
      .select("id", { head: true, count: "exact" })
      .eq("member_id", memberId)
      .eq("type", "CHEER_RECEIVED"),
  ]);
  if (balanceError || notificationError) {
    throw balanceError ?? notificationError;
  }
  return {
    cloverBalance: balance?.clover_count ?? 0,
    cheerNotifications: notifications ?? 0,
  };
}

async function assertPendingRemainsStable(order: CreatedOrder) {
  const initialMemberEffects = await memberPaymentEffects(ownerId);
  const initial = await waitForPaymentState(order.orderId, "READY", "PENDING");
  const initialEffects = await confirmedSideEffectCounts(
    initial.payment.id,
    initial.cheer.id,
  );
  expect(initialEffects).toEqual({ doneLogs: 0, ledgerRows: 0 });
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000));
  const stable = await waitForPaymentState(order.orderId, "READY", "PENDING");
  expect(stable.payment.payment_key).toBeNull();
  expect(
    await confirmedSideEffectCounts(stable.payment.id, stable.cheer.id),
  ).toEqual(initialEffects);
  expect(await memberPaymentEffects(ownerId)).toEqual(initialMemberEffects);
}

test.describe("Toss Payments test-key sandbox callback", () => {
  test.skip(!RUN_LIVE, "RUN_LIVE_TOSS_SANDBOX_E2E=1 필요");

  test.beforeAll(async () => {
    test.setTimeout(60_000);
    expect(new URL(BASE_URL).hostname).toBe(
      "haenael-ge-v2-staging-100-b.vercel.app",
    );
    expect(PROJECT_REF).toBe(APPROVED_STAGING_PROJECT_REF);
    expect(TOSS_CLIENT_KEY).toMatch(/^test_(?:gck|ck)_/);
    expect(new URL(SUPABASE_URL).hostname).toBe(
      `${APPROVED_STAGING_PROJECT_REF}.supabase.co`,
    );
    mkdirSync(evidenceDir, { recursive: true });

    const { data: auth, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError || !auth.user) {
      throw authError ?? new Error("payment_owner_create_failed");
    }
    ownerId = auth.user.id;
    const { error: memberError } = await admin.from("member").insert({
      id: ownerId,
      nickname: "결제 검증 목표 주인",
    });
    if (memberError) throw memberError;
    const dueDate = new Date(Date.now() + 30 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const { data: goal, error: goalError } = await admin
      .from("goal")
      .insert({
        member_id: ownerId,
        slug: goalSlug,
        title: "Toss sandbox 종단 결제 검증 해낼게",
        reason: "테스트 키 승인 callback과 데이터베이스 반영을 검증합니다.",
        due_date: dueDate,
        status: "ACTIVE",
        visibility: "PUBLIC",
        cover_preset_key: "c1",
      })
      .select("id")
      .single();
    if (goalError || !goal) {
      throw goalError ?? new Error("payment_goal_create_failed");
    }
    goalId = goal.id;
  });

  test.afterAll(async () => {
    test.setTimeout(60_000);
    if (!ownerId || !/^[0-9a-f-]{36}$/i.test(ownerId)) return;
    const paymentIds = createdOrders
      .map(({ paymentId }) => paymentId)
      .filter((id) => Number.isSafeInteger(id) && id > 0);
    const ids = paymentIds.length ? paymentIds.join(",") : "NULL";
    const fixtureRows = await runFixtureSql(`
      create temporary table qa_payment_goals on commit drop as
      select id from public.goal
      where slug='${goalSlug}' and member_id='${ownerId}'::uuid;
      create temporary table qa_payment_cheers on commit drop as
      select id,payment_id from public.cheer
      where payment_id in (${ids})
         or goal_id in (select id from qa_payment_goals);
      delete from public.social_cheer_member_attribution
        where cheer_id in (select id from qa_payment_cheers);
      delete from public.clover_ledger
        where ref_type='cheer' and ref_id in (select id from qa_payment_cheers);
      delete from public.payment_log
        where payment_id in (select payment_id from qa_payment_cheers);
      delete from public.cheer where id in (select id from qa_payment_cheers);
      delete from public.payment
        where id in (select payment_id from qa_payment_cheers) or id in (${ids});
      delete from public.goal where id in (select id from qa_payment_goals);
      delete from public.member where id='${ownerId}'::uuid;
      delete from auth.users where id='${ownerId}'::uuid;
      select
        (select count(*) from public.payment where id in (${ids})) +
        (select count(*) from public.cheer where payment_id in (${ids})) +
        (select count(*) from public.goal where slug='${goalSlug}') +
        (select count(*) from public.member where id='${ownerId}'::uuid) +
        (select count(*) from auth.users where id='${ownerId}'::uuid);
    `);
    expect(fixtureRows).toBe("0");
  });

  test("G4-PAY-01 LIVE-TOSS-SUCCESS 실제 sandbox 승인 callback은 주문·결제·원장 상태를 원자적으로 반영한다", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const tossObserver = observeTossResponses(page);
    const effectsBefore = await memberPaymentEffects(ownerId);
    const order = await startSandboxPayment(page, tossObserver.entries);
    await submitActualTossPaymentWindow(page);
    await awaitActualTossCardOutcome(page, tossObserver.entries);
    await completeTossSandboxCheckout(
      page,
      "/payment/success",
      tossObserver.entries,
    );
    tossObserver.stop();
    await page.waitForURL("**/payment/success?**", { timeout: 30_000 });
    await expect(page.getByTestId("payment-success-page")).toContainText(
      "응원이 전달됐어요",
    );

    const { payment, cheer } = await waitForPaymentState(
      order.orderId,
      "DONE",
      "CONFIRMED",
    );
    expect(payment.amount_krw).toBe(1000);
    expect(payment.payment_key).toBeTruthy();
    expect(cheer.clover_amount).toBe(1);
    const effects = await confirmedSideEffectCounts(payment.id, cheer.id);
    expect(effects).toEqual({ doneLogs: 1, ledgerRows: 1 });
    expect(await memberPaymentEffects(ownerId)).toEqual({
      cloverBalance: effectsBefore.cloverBalance + 1,
      cheerNotifications: effectsBefore.cheerNotifications + 1,
    });
    await page.screenshot({
      path: `${evidenceDir}/live-toss-success-390.png`,
      fullPage: true,
    });
  });

  test("G4-PAY-02 LIVE-TOSS-EDGE-CANCEL-MISMATCH 취소와 금액 변조를 안전하게 처리한다", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const cancelPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const canceledOrder = await startSandboxPayment(cancelPage);
    await closeActualTossPaymentWindow(cancelPage);
    await expect(cancelPage).toHaveURL(new RegExp(`/g/${goalSlug}$`));
    await expect(
      cancelPage.getByText("결제를 취소했어요. 다시 시도할 수 있어요."),
    ).toBeVisible();
    await expect(cancelPage.getByTestId("cheer-payment-submit")).toBeEnabled();
    await expect(cancelPage.getByTestId("cheer-payment-sheet")).toBeVisible();
    await expect(cancelPage.getByTestId("cheer-payment-submit")).toContainText(
      "결제하고 응원하기",
    );
    await assertPendingRemainsStable(canceledOrder);
    await cancelPage.screenshot({
      path: `${evidenceDir}/live-toss-cancel-390.png`,
      fullPage: true,
    });

    const mismatchResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/toss-confirm`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey: "test_payment_key_amount_mismatch",
          orderId: canceledOrder.orderId,
          amount: canceledOrder.amountKrw + 1000,
        }),
      },
    );
    expect(mismatchResponse.status).toBe(400);
    const mismatchBody = (await mismatchResponse.json()) as {
      error?: { code?: string };
    };
    expect(mismatchBody.error?.code).toBe("amount_mismatch");
    await assertPendingRemainsStable(canceledOrder);
    await cancelPage.close();
  });

  test("G4-PAY-02 LIVE-TOSS-EDGE-FAIL failUrl callback은 주문을 승인하지 않는다", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const failContext = await browser.newContext({ ...devices["iPhone 13"] });
    const failPage = await failContext.newPage();
    const failTossObserver = observeTossResponses(failPage);
    let phase = "fixture";
    try {
      console.log("LIVE_TOSS_FAIL_PHASE", phase);
      const failedOrder = await startSandboxPayment(
        failPage,
        failTossObserver.entries,
      );
      phase = "card-submit";
      console.log("LIVE_TOSS_FAIL_PHASE", phase);
      await submitActualTossPaymentWindow(failPage);
      phase = "sandbox-response";
      console.log("LIVE_TOSS_FAIL_PHASE", phase);
      await expect
        .poll(
          () =>
            failTossObserver.entries.some((entry) =>
              /(?:^|\.)payment-gateway-sandbox\.tosspayments\.com$/i.test(
                new URL(entry.url).hostname,
              ),
            ),
          { message: "실결제 전 sandbox Toss Payments 응답을 관찰해야 한다" },
        )
        .toBe(true);
      phase = "external-card-auth";
      console.log("LIVE_TOSS_FAIL_PHASE", phase);
      await awaitActualTossCardOutcome(failPage, failTossObserver.entries);
      phase = "payment-window-close";
      console.log("LIVE_TOSS_FAIL_PHASE", phase);
      await closeActualTossPaymentWindow(failPage);
      phase = "fail-callback";
      console.log("LIVE_TOSS_FAIL_PHASE", phase);
      await failPage.waitForURL("**/payment/fail?**", { timeout: 10_000 });

      const actualFailCallback = new URL(failPage.url());
      expect(actualFailCallback.pathname).toBe("/payment/fail");
      expect(actualFailCallback.searchParams.get("code")).toBe(
        "PAY_PROCESS_CANCELED",
      );
      expect(actualFailCallback.searchParams.get("message")).toBeTruthy();
      // Toss 공식 계약: 인증 전 사용자 취소는 주문번호를 failUrl에 싣지 않는다.
      expect(actualFailCallback.searchParams.get("orderId")).toBeNull();
      await expect(failPage.getByTestId("payment-fail-page")).toContainText(
        "결제가 멈췄어요",
      );
      await assertPendingRemainsStable(failedOrder);
      await failPage.screenshot({
        path: `${evidenceDir}/live-toss-fail-390.png`,
        fullPage: true,
      });
    } finally {
      failTossObserver.stop();
      await failContext.close().catch(() => undefined);
    }
  });

  test("G4-PAY-02 LIVE-TOSS-EDGE-IDEMPOTENT 실제 카드 성공 callback 중복은 원장 효과를 늘리지 않는다", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const successPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const memberEffectsBeforeSuccess = await memberPaymentEffects(ownerId);
    const successOrder = await startSandboxPayment(successPage);
    const successTossObserver = observeTossResponses(successPage);
    await submitActualTossPaymentWindow(successPage);
    await awaitActualTossCardOutcome(successPage, successTossObserver.entries);
    await completeTossSandboxCheckout(
      successPage,
      "/payment/success",
      successTossObserver.entries,
    );
    successTossObserver.stop();
    await successPage.waitForURL("**/payment/success?**", { timeout: 30_000 });
    await expect(successPage.getByTestId("payment-success-page")).toContainText(
      "응원이 전달됐어요",
    );
    const callbackUrl = successPage.url();
    const firstState = await waitForPaymentState(
      successOrder.orderId,
      "DONE",
      "CONFIRMED",
    );
    const beforeReplay = await confirmedSideEffectCounts(
      firstState.payment.id,
      firstState.cheer.id,
    );
    const memberEffectsBeforeReplay = await memberPaymentEffects(ownerId);
    expect(memberEffectsBeforeReplay).toEqual({
      cloverBalance: memberEffectsBeforeSuccess.cloverBalance + 1,
      cheerNotifications: memberEffectsBeforeSuccess.cheerNotifications + 1,
    });

    await successPage.goto(callbackUrl, { waitUntil: "networkidle" });
    await expect(successPage.getByTestId("payment-success-page")).toContainText(
      "응원이 전달됐어요",
    );
    const afterReplay = await confirmedSideEffectCounts(
      firstState.payment.id,
      firstState.cheer.id,
    );
    expect(afterReplay).toEqual(beforeReplay);
    expect(await memberPaymentEffects(ownerId)).toEqual(
      memberEffectsBeforeReplay,
    );

    await waitForPaymentState(successOrder.orderId, "DONE", "CONFIRMED");
    expect(
      await confirmedSideEffectCounts(
        firstState.payment.id,
        firstState.cheer.id,
      ),
    ).toEqual(beforeReplay);
    expect(await memberPaymentEffects(ownerId)).toEqual(
      memberEffectsBeforeReplay,
    );
    await successPage.screenshot({
      path: `${evidenceDir}/live-toss-idempotent-390.png`,
      fullPage: true,
    });
    await successPage.close();
  });
});
