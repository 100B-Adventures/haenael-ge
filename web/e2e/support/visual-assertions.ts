import { expect, type Locator, type Page } from "@playwright/test";
import { waitForVisualAssets } from "./visual-ready";

export async function waitForVisualReady(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    await expect(page.locator(selector).first()).toBeVisible({ timeout: 15_000 });
  }
  await expect(page.locator("body")).not.toContainText(/(?:로딩|불러오는) 중/);
  await waitForVisualAssets(page);
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

export async function expectTwoLineClamp(target: Locator) {
  await expect(target).toBeVisible();
  await expect.poll(
    () => target.evaluate((element) => getComputedStyle(element).webkitLineClamp),
    { message: "같은 텍스트 요소에 2줄 clamp CSS가 적용될 때까지 기다린다" },
  ).toBe("2");
  const collapsed = await target.evaluate((element) => ({
    lineClamp: getComputedStyle(element).webkitLineClamp,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(collapsed.lineClamp).toBe("2");
  expect(collapsed.scrollHeight).toBeGreaterThan(collapsed.clientHeight + 1);
  const wrapper = target.locator("xpath=..");
  await expect(wrapper).toHaveAttribute("data-collapsible", "enabled");
  const toggle = wrapper.locator("button.collapse-chevron");
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle.locator("svg")).toHaveCount(1);
  expect((await toggle.textContent())?.trim()).toBe("");
  await toggle.click();
  const liveToggle = target.page().locator("button.collapse-chevron[aria-expanded='true']");
  await expect(liveToggle).toHaveCount(1);
  await expect(liveToggle).toHaveAttribute("aria-expanded", "true");
  const expanded = await target.evaluate((element) => ({
    lineClamp: getComputedStyle(element).webkitLineClamp,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(expanded.lineClamp).toBe("none");
  expect(expanded.clientHeight + 1).toBeGreaterThanOrEqual(expanded.scrollHeight);
  await liveToggle.click();
  await expect(target.page().locator("button.collapse-chevron[aria-expanded='true']")).toHaveCount(0);
}

export async function verifyWordmapMotionEnvelope(page: Page) {
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
