// e2e/cheer-payment.spec.ts — 친구 응원 결제 flow E2E (돈 경로).
// 커버: /g/{slug} → 응원 CTA → 결제 시트 → 금액 입력 → 제출 → 주문 생성 → Toss 결제창 로드.
// 카드 최종 승인은 자동화 불가(카드번호 입력 금지 + Toss 창 iframe) → 결제창 렌더까지 검증.
// prod 대상 실행: E2E_BASE_URL=https://haenael-ge.vercel.app E2E_GOAL_SLUG=knirdtaq npx playwright test cheer-payment
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const slug = process.env.E2E_GOAL_SLUG ?? "knirdtaq";
const createdOrderIds: string[] = [];

test.afterAll(async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || createdOrderIds.length === 0) return;
  const hostname = new URL(supabaseUrl).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(hostname)) return;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: payments } = await admin
    .from("payment")
    .select("id")
    .in("order_id", createdOrderIds);
  const paymentIds = (payments ?? []).map(({ id }) => id);
  if (paymentIds.length === 0) return;
  await admin.from("cheer").delete().in("payment_id", paymentIds);
  await admin.from("payment").delete().in("id", paymentIds);
});

test.describe("친구 응원 결제 flow (돈 경로)", () => {
  test("결제 CTA 활성 → 시트 오픈 → 자유금액 입력 → Toss 결제창 로드", async ({ page }) => {
    await page.goto(`${baseUrl}/g/${slug}`);

    // 1) 친구뷰 렌더 + 결제 CTA 활성(kill switch on)
    const cta = page.getByTestId("cheer-cta");
    await expect(cta).toBeVisible();
    await expect(cta).toBeEnabled();

    // 2) 시트 오픈
    await cta.click();
    await expect(page.getByTestId("cheer-payment-sheet")).toBeVisible();

    // 3) 자유금액 20클로버 입력(과거 화이트리스트 버그 회귀 방지: 20은 프리셋 밖)
    await page.getByTestId("cheer-custom-clover-input").fill("20");
    await expect(page.getByTestId("cheer-selected-summary")).toContainText("20클로버");
    const orderResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/functions/v1/cheer-order") && response.request().method() === "POST",
    );
    await page.getByTestId("cheer-payment-submit").click();
    const orderResponse = await orderResponsePromise;
    const orderBody = await orderResponse.json() as { orderId?: string };
    if (orderBody.orderId) createdOrderIds.push(orderBody.orderId);

    // 4) Toss 결제창 로드 — SDK가 iframe으로 결제 UI를 붙인다. "결제 방법을 선택해주세요"가 뜨거나
    //    tosspayments iframe/스크립트가 로드되면 주문 생성→결제창 진입 성공으로 판정.
    const paymentWindow = page
      .frameLocator("iframe")
      .getByText("결제 방법을 선택해주세요", { exact: false });
    await expect(async () => {
      const iframeCount = await page.locator('iframe[src*="tosspayments"], iframe[id*="toss"]').count();
      const bodyText = await page.locator("body").innerText();
      expect(
        iframeCount > 0 || bodyText.includes("결제 방법") || bodyText.includes("결제창 여는"),
      ).toBeTruthy();
    }).toPass({ timeout: 15000 });
    // 에러 문구(구 화이트리스트)가 뜨지 않았는지 = 자유금액 정상 처리 회귀 확인
    await expect(page.getByText("amountKrw must be 1000")).toHaveCount(0);
  });

  test("입력검증: 0클로버는 제출 비활성", async ({ page }) => {
    await page.goto(`${baseUrl}/g/${slug}`);
    await page.getByTestId("cheer-cta").click();
    await expect(page.getByTestId("cheer-payment-sheet")).toBeVisible();
    await page.getByTestId("cheer-custom-clover-input").fill("0");
    await expect(page.getByTestId("cheer-payment-submit")).toBeDisabled();
  });
});
