import type { SupabaseClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type Browser, type BrowserContext, type Locator, expect } from "@playwright/test";

type ScenarioArgs = {
  admin: SupabaseClient;
  authContext: (browser: Browser, email: string) => Promise<BrowserContext>;
  browser: Browser;
  email: string;
  ids: { owner: string; friend: string };
  friendPublicGoal: number;
  friendFriendsGoal: number;
  runId: number;
  isoDateFromNow: (days: number) => string;
};

async function waitForLoadedImage(image: Locator) {
  await expect.poll(async () => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  return image.evaluate((node) => {
    const element = node as HTMLImageElement;
    return { naturalWidth: element.naturalWidth, currentSrc: element.currentSrc };
  });
}

export async function runFriendGoalAlignmentScenario({
  admin,
  authContext,
  browser,
  email,
  ids,
  friendPublicGoal,
  friendFriendsGoal,
  runId,
  isoDateFromNow,
}: ScenarioArgs) {
  const message = `새 목표 전용 응원 ${runId}`;
  const captureDir = process.env.E2E_CAPTURE_DIR ??
    "test-results/friend-goal-alignment";
  mkdirSync(captureDir, { recursive: true });
  const originalProfile = "/images/social-viral/dogyeong.png";
  const kakaoHttpAvatar = "http://k.kakaocdn.net/e2e/avatar.png";
  let paymentId = 0;
  let cheerId = 0;
  let welcomeOnlyGoal = 0;
  const context = await authContext(browser, email);
  await context.route("https://k.kakaocdn.net/e2e/avatar.png", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: readFileSync(resolve(process.cwd(), "public/images/social-viral/dogyeong.png")),
    });
  });
  const page = await context.newPage();
  try {
    const { data: payment, error: paymentError } = await admin.from("payment")
      .insert({
        order_id: `friend-align-${runId}`,
        amount_krw: 1000,
        status: "DONE",
        payment_key: `friend-align-key-${runId}`,
        pg_customer_key: "SOCIAL_E2E",
      }).select("id").single();
    if (paymentError || !payment) throw paymentError ?? new Error("alignment_payment_failed");
    paymentId = payment.id;
    const { data: cheer, error: cheerError } = await admin.from("cheer").insert({
      goal_id: friendFriendsGoal,
      display_name: "서연",
      is_anonymous: false,
      message,
      clover_amount: 1,
      payment_id: paymentId,
      status: "CONFIRMED",
      created_at: new Date(Date.now() + 60_000).toISOString(),
    }).select("id").single();
    if (cheerError || !cheer) throw cheerError ?? new Error("alignment_cheer_failed");
    cheerId = cheer.id;
    const { error: attributionError } = await admin.from("social_cheer_member_attribution")
      .insert({ cheer_id: cheerId, supporter_member_id: ids.owner });
    if (attributionError) throw attributionError;
    const { error: profileError } = await admin.from("member")
      .update({ profile_image: kakaoHttpAvatar }).eq("id", ids.friend);
    if (profileError) throw profileError;
    const { error: coverPresetError } = await admin.from("goal")
      .update({ cover_preset_key: "health" }).eq("id", friendFriendsGoal);
    if (coverPresetError) throw coverPresetError;
    const { data: welcomeGoal, error: welcomeGoalError } = await admin.from("goal")
      .insert({
        member_id: ids.friend,
        slug: `welcome-only-${runId}`,
        title: "환영 응원만 있는 목표",
        due_date: isoDateFromNow(40),
        visibility: "PUBLIC",
        cover_preset_key: "c1",
      }).select("id").single();
    if (welcomeGoalError || !welcomeGoal) throw welcomeGoalError ?? new Error("welcome_goal_failed");
    welcomeOnlyGoal = welcomeGoal.id;

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/friends", { waitUntil: "domcontentloaded" });
    const card = page.getByTestId("friend-card").filter({ hasText: "윤도경" });
    await expect(card.getByTestId("friend-goal-link")).toContainText("매달 책 한 권 읽을게");
    await expect(card.getByTestId("friend-goal-link")).toHaveAttribute(
      "href",
      `/friends/${ids.friend}?goal=${friendFriendsGoal}`,
    );
    await expect(card.locator(".friend-list-news-message")).toContainText(message);
    const listAvatar = await waitForLoadedImage(card.getByTestId("friend-list-avatar-image"));
    expect(listAvatar.naturalWidth).toBeGreaterThan(0);
    expect(listAvatar.currentSrc.startsWith("https://")).toBe(true);

    await page.goto(`/friends/${ids.friend}?goal=${friendPublicGoal}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".friend-recent-cheer").filter({ hasText: message })).toHaveCount(0);
    const historyItem = page.getByTestId("friend-cheer-history-item").filter({ hasText: message });
    await expect(historyItem).toContainText("매달 책 한 권 읽을게");
    const detailAvatar = await waitForLoadedImage(page.getByTestId("friend-detail-avatar-image"));
    expect(detailAvatar.naturalWidth).toBeGreaterThan(0);
    expect(detailAvatar.currentSrc.startsWith("https://")).toBe(true);
    await page.screenshot({
      path: `${captureDir}/friend-detail-vertical-avatar-390.png`,
      fullPage: true,
    });

    await page.getByRole("link", { name: /매달 책 한 권 읽을게/ }).click();
    await expect(page).toHaveURL(new RegExp(`goal=${friendFriendsGoal}$`));
    await expect(page.getByTestId("goal-cover")).toHaveAttribute("data-preset", "health");
    const cover = await waitForLoadedImage(page.locator(".goal-cover-image"));
    expect(cover.naturalWidth).toBeGreaterThan(0);
    expect(cover.currentSrc).toContain("cover-health");

    await page.goto(`/friends/${ids.friend}?goal=${welcomeOnlyGoal}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".friend-together-card")).toContainText("0명이");
    await expect(page.locator(".friend-supporter-stack")).toHaveCount(0);
    console.info("FRIEND_IMAGE_METRICS", JSON.stringify({
      listNaturalWidth: listAvatar.naturalWidth,
      listCurrentSrcHttps: listAvatar.currentSrc.startsWith("https://"),
      detailNaturalWidth: detailAvatar.naturalWidth,
      detailCurrentSrcHttps: detailAvatar.currentSrc.startsWith("https://"),
      coverNaturalWidth: cover.naturalWidth,
      capture: `${captureDir}/friend-detail-vertical-avatar-390.png`,
    }));
  } finally {
    await context.close();
    await admin.from("member").update({ profile_image: originalProfile }).eq("id", ids.friend);
    await admin.from("goal").update({ cover_preset_key: "c3" }).eq("id", friendFriendsGoal);
    if (cheerId) await admin.from("social_cheer_member_attribution").delete().eq("cheer_id", cheerId);
    if (cheerId) await admin.from("cheer").delete().eq("id", cheerId);
    if (paymentId) await admin.from("payment").delete().eq("id", paymentId);
    if (welcomeOnlyGoal) await admin.from("goal").delete().eq("id", welcomeOnlyGoal);
  }
}
