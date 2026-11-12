import { expect, test } from "@playwright/test";

const CONSENT_KEY = "haenael_analytics_consent_v1";
const SEEN_KEY = "haenael_whats_new_last_seen_version";

test.describe("2.2.0 새로운 기능 안내", () => {
  test("TC-WHATS-NEW-CTA-01 카드 닫기 뒤 홈 핵심 CTA를 사용할 수 있다", async ({ page }) => {
    await page.addInitScript(({ consentKey, seenKey }) => {
      window.localStorage.setItem(consentKey, "denied");
      window.localStorage.removeItem(seenKey);
    }, { consentKey: CONSENT_KEY, seenKey: SEEN_KEY });

    await page.goto("/", { waitUntil: "load" });
    await expect(page.getByTestId("whats-new-card")).toBeVisible();
    await page.getByRole("button", { name: "새로운 기능 안내 닫기" }).click();
    await expect(page.getByTestId("whats-new-card")).toBeHidden();
    await page.getByTestId("landing-cta").click();
    await expect(page).toHaveURL(/\/onboarding(?:\?|$)/);
  });

  test("TC-WHATS-NEW-FEEDBACK-01 도착 화면 rating이 GA4 collect에 실린다", async ({ page }) => {
    await page.addInitScript((consentKey) => {
      window.localStorage.setItem(consentKey, "granted");
    }, CONSENT_KEY);
    const collectRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return /google-analytics\.com$/.test(url.hostname) &&
        url.pathname.endsWith("/g/collect") &&
        url.searchParams.get("en") === "whats_new_feedback";
    });

    await page.goto("/updates#feedback", { waitUntil: "load" });
    await page.getByRole("button", { name: "좋아요" }).click();
    const request = await collectRequest;
    const params = new URL(request.url()).searchParams;
    expect(params.get("ep.rating")).toBe("like");
    expect(params.get("ep.release")).toBe("2.2.0");
    await expect(page.getByRole("status")).toHaveText("의견을 보냈어요. 고맙습니다.");
  });
});
