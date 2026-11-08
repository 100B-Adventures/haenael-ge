import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  ANALYTICS_CONSENT_KEY,
  type AnalyticsConsent,
} from "../src/lib/analytics/consent";
import {
  runStagingFixtureSql,
  STAGING_PROJECT_REF,
} from "./support/staging-fixture-sql";
import { waitForVisualAssets } from "./support/visual-ready";
import {
  type Browser,
  type BrowserContext,
  type Locator,
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

async function expectTwoLineClamp(target: Locator) {
  await expect(target).toBeVisible();
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
    await page.evaluate(() => document.documentElement.classList.remove("force-motion"));
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

async function captureApprovedS1SupporterState(
  browser: Browser,
  capturePath: string,
) {
  const prototypePath = resolve(
    process.cwd(),
    "../docs/design/prototypes/social-viral-loop-v3-opus5.html",
  );
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(pathToFileURL(prototypePath).href, { waitUntil: "load" });
    await page.addStyleTag({ content: [
      ".flowrail,.console,.review,.stagehint,.statusbar,.motionbar{display:none!important}",
      "html,body{margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important}",
      ".stage{padding:0!important;margin:0!important;gap:0!important}",
      ".frame{border:0!important;border-radius:0!important;box-shadow:none!important}",
    ].join("") });
    await page.evaluate(() => {
      const scope = globalThis as typeof globalThis & {
        go: (screen: string) => void;
        setMotionLoop?: (on: boolean) => void;
        setState?: (state: string) => void;
        expandCheers?: (button: HTMLButtonElement) => void;
      };
      scope.setMotionLoop?.(false);
      scope.go("goaldetail");
      scope.setState?.("normal");
      const more = document.querySelector<HTMLButtonElement>(
        '#goaldetail [data-view="normal"] .cheer-more button',
      );
      if (more) scope.expandCheers?.(more);
    });
    const frame = page.locator("#goaldetail .frame");
    const list = frame.locator('[data-view="normal"] .card').first();
    await expect(frame).toBeVisible();
    await expect(list.locator(".fr")).toHaveCount(11);
    await list.evaluate((element) => {
      const frameElement = element.closest<HTMLElement>(".frame");
      const scrollHost = frameElement?.querySelector<HTMLElement>(".app");
      if (!scrollHost) throw new Error("prototype_scroll_host_missing");
      const elementRect = element.getBoundingClientRect();
      const hostRect = scrollHost.getBoundingClientRect();
      scrollHost.scrollTop += elementRect.top - hostRect.top - 72;
    });
    await page.waitForTimeout(50);
    const box = await frame.boundingBox();
    expect(Math.round(box?.width ?? 0)).toBe(390);
    expect(Math.round(box?.height ?? 0)).toBe(844);
    await page.screenshot({ path: capturePath, animations: "disabled" });
    return {
      viewport: { width: 390, height: 844 },
      aligned_element: "supporter list first card",
      aligned_top: 72,
      visible_supporter_rows: await list.locator(".fr:visible").count(),
    };
  } finally {
    await context.close();
  }
}

async function captureS2Step(
  page: Page,
  capturePath: string,
  animations: "allow" | "disabled" = "disabled",
) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((done) => {
          image.addEventListener("load", () => done(), { once: true });
          image.addEventListener("error", () => done(), { once: true });
        });
      }
      await image.decode().catch(() => undefined);
    }));
  });
  await page.screenshot({ path: capturePath, animations });
}

async function captureApprovedS2State(
  browser: Browser,
  state: "mypage" | "goal-health",
  capturePath: string,
) {
  const prototypePath = resolve(
    process.cwd(),
    "../docs/design/prototypes/social-viral-loop-v3-opus5.html",
  );
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(pathToFileURL(prototypePath).href, { waitUntil: "load" });
    await page.addStyleTag({ content: [
      ".flowrail,.console,.review,.stagehint,.statusbar,.motionbar{display:none!important}",
      "html,body{margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important}",
      ".stage{padding:0!important;margin:0!important;gap:0!important}",
      ".frame{border:0!important;border-radius:0!important;box-shadow:none!important}",
    ].join("") });
    await page.evaluate((requestedState) => {
      const scope = globalThis as typeof globalThis & {
        go: (screen: string) => void;
        setMotionLoop?: (on: boolean) => void;
        setState?: (state: string) => void;
        setCover?: (targetId: string, key: string) => unknown;
      };
      scope.setMotionLoop?.(false);
      scope.go(requestedState === "mypage" ? "mypage" : "goaldetail");
      scope.setState?.("normal");
      if (requestedState === "goal-health") {
        scope.setCover?.("gdCover", "health");
        const picker = document.getElementById("gdCoverPick");
        if (picker) picker.style.display = "none";
      }
      const frame = document.querySelector<HTMLElement>(
        `#${requestedState === "mypage" ? "mypage" : "goaldetail"} .frame`,
      );
      const scrollHost = frame?.querySelector<HTMLElement>(".app");
      if (scrollHost) scrollHost.scrollTop = 0;
    }, state);
    const frame = page.locator(`#${state === "mypage" ? "mypage" : "goaldetail"} .frame`);
    await expect(frame).toBeVisible();
    await frame.evaluate(async (element) => {
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
    expect(Math.round(box?.width ?? 0)).toBe(390);
    expect(Math.round(box?.height ?? 0)).toBe(844);
    await frame.screenshot({ path: capturePath, animations: "allow" });
    return {
      viewport: { width: 390, height: 844 },
      state,
      scroll_top: 0,
      reduced_motion: true,
      images_complete: await frame.locator("img").evaluateAll((images) =>
        images.every((image) =>
          (image as HTMLImageElement).complete &&
          (image as HTMLImageElement).naturalWidth > 0
        )
      ),
    };
  } finally {
    await context.close();
  }
}

async function comparePngPixels(
  approvedPath: string,
  actualPath: string,
  interpretation = "동일 viewport·scroll·응원자 목록 영역이며 실제 fixture 데이터와 구현 표현 차이로 픽셀 동일성은 요구하지 않는다.",
) {
  const [approved, actual] = await Promise.all([
    sharp(approvedPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(actualPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  expect(actual.info.width).toBe(approved.info.width);
  expect(actual.info.height).toBe(approved.info.height);
  let changedPixels = 0;
  let absoluteChannelDelta = 0;
  let maxChannelDelta = 0;
  for (let offset = 0; offset < approved.data.length; offset += 4) {
    let pixelChanged = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const delta = Math.abs(approved.data[offset + channel] - actual.data[offset + channel]);
      absoluteChannelDelta += delta;
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      if (delta > 0) pixelChanged = true;
    }
    if (pixelChanged) changedPixels += 1;
  }
  const totalPixels = approved.info.width * approved.info.height;
  return {
    width: approved.info.width,
    height: approved.info.height,
    total_pixels: totalPixels,
    changed_pixels: changedPixels,
    changed_ratio: changedPixels / totalPixels,
    mean_absolute_channel_delta: absoluteChannelDelta / (totalPixels * 4),
    max_channel_delta: maxChannelDelta,
    approved_sha256: createHash("sha256").update(readFileSync(approvedPath)).digest("hex"),
    actual_sha256: createHash("sha256").update(readFileSync(actualPath)).digest("hex"),
    interpretation,
  };
}

async function measureCanonicalErgonomics(page: Page) {
  return page.evaluate(() => {
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
    let activeRules = 0;
    const walk = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        const selector = (rule as CSSStyleRule).selectorText ?? "";
        if (selector.includes(":active")) {
          activeRules += 1;
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
        // Cross-origin stylesheets are not part of the product contract.
      }
    }
    const hasActiveRule = (element: Element) => activeSelectors.some((selector) => {
      try {
        return Boolean(selector) && element.matches(selector);
      } catch {
        return false;
      }
    });
    const fixedElements = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => visible(element) && getComputedStyle(element).position === "fixed");
    const viewportTaps = taps.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    });
    const fixedOverlapWithControls = viewportTaps.filter((tap) => {
      if (fixedElements.some((fixed) => fixed.contains(tap))) return false;
      const tapRect = tap.getBoundingClientRect();
      return fixedElements.some((fixed) => {
        const fixedRect = fixed.getBoundingClientRect();
        return !(
          tapRect.right <= fixedRect.left || fixedRect.right <= tapRect.left ||
          tapRect.bottom <= fixedRect.top || fixedRect.bottom <= tapRect.top
        );
      });
    }).length;
    const tapBelow44 = taps.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width < 43.5 || rect.height < 43.5;
    });
    const fixedBottom = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.position !== "fixed" && style.position !== "sticky") return false;
        const rect = element.getBoundingClientRect();
        return rect.bottom >= innerHeight - 2 && rect.height > 24 && rect.height < innerHeight / 2;
      });
    const fixedBottomHeight = fixedBottom.reduce(
      (height, element) => Math.max(height, element.getBoundingClientRect().height),
      0,
    );
    const mainElement = document.querySelector("main") ?? document.body;
    const bottomClearance = Math.max(
      Number.parseFloat(getComputedStyle(document.body).paddingBottom) || 0,
      Number.parseFloat(getComputedStyle(mainElement).paddingBottom) || 0,
    );
    const tokenProbe = document.createElement("span");
    tokenProbe.className = "font-designer-14r";
    tokenProbe.textContent = "x";
    tokenProbe.style.position = "absolute";
    tokenProbe.style.visibility = "hidden";
    document.body.appendChild(tokenProbe);
    const tokenBodyPx = Number.parseFloat(getComputedStyle(tokenProbe).fontSize);
    tokenProbe.remove();
    return {
      route: location.pathname,
      font_below_13: textSizes.filter((size) => size < 13).length,
      median_font: textSizes[Math.floor(textSizes.length / 2)] ?? 0,
      token_body_px: tokenBodyPx,
      tap_below_44: tapBelow44.length,
      tap_below_44_sample: tapBelow44.slice(0, 5).map((element) => ({
        test_id: element.getAttribute("data-testid") ?? "",
        label: (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40),
      })),
      active_ratio: taps.length ? taps.filter(hasActiveRule).length / taps.length : 1,
      active_rules: activeRules,
      active_missing: taps.filter((element) => !hasActiveRule(element)).map((element) => ({
        test_id: element.getAttribute("data-testid") ?? "",
        class_name: typeof element.className === "string" ? element.className.slice(0, 80) : "",
        label: (element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 40),
      })),
      horizontal_overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      fixed_count: fixedElements.length,
      fixed_overlap_with_controls: fixedOverlapWithControls,
      fixed_bottom_height: fixedBottomHeight,
      bottom_clearance: bottomClearance,
    };
  });
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
  const health = await response.json() as {
    supabaseProjectRef?: string;
    sourceSha?: string | null;
  };
  if (health.supabaseProjectRef !== STAGING_PROJECT_REF) throw new Error("staging_runtime_project_ref_mismatch");
  const expectedSourceSha = process.env.GITHUB_SHA;
  if (expectedSourceSha && health.sourceSha !== expectedSourceSha) {
    throw new Error(
      `staging_runtime_source_mismatch:expected=${expectedSourceSha}:actual=${health.sourceSha ?? "missing"}`,
    );
  }
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

async function initializeSocialAnalyticsConsent(target: BrowserContext | Page) {
  const consent: AnalyticsConsent = "denied";
  await target.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, value);
  }, { key: ANALYTICS_CONSENT_KEY, value: consent });
}

async function newRemotePage(
  browser: Browser,
  options: Parameters<Browser["newPage"]>[0] = {},
) {
  const page = await browser.newPage(options);
  await initializeSocialAnalyticsConsent(page);
  await routeStagingOriginWithoutToolbar(page);
  return page;
}

async function runFixtureSql(sql: string) {
  if (!IS_STAGING) return runLocalSql(sql);
  assertStagingGuards();
  const stagingDatabaseUrl = process.env.STAGING_DATABASE_URL?.trim();
  if (stagingDatabaseUrl) {
    return runStagingFixtureSql(sql, stagingDatabaseUrl);
  }
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
  await initializeSocialAnalyticsConsent(context);
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
  // Playwright config keeps this file on one worker. Individual failures must not
  // suppress the remaining security cases, so do not use serial skip semantics.
  test.describe.configure({ mode: "default" });
  test.beforeEach(async ({ context }) => {
    await initializeSocialAnalyticsConsent(context);
  });
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
  let eightCheerGoal = 0;
  let nineCheerGoal = 0;
  let publicSlug = "";
  let smokeInviteToken = "";
  let smokeInviteId = "";
  const paymentIds: number[] = [];
  const delayedProfileCleanups: Array<{ queueId: number; assetId: string; objectPath: string; availableAt: string }> = [];
  const ownerLongMessage = "익명으로 남기지만 매일 꾸준히 공부하는 모습을 보고 있어요. 오늘도 한 걸음씩 나아가면 분명히 목표를 해낼 수 있으니 끝까지 함께 응원할게요.";
  const friendLongMessage = "중간고사 두 과목에서 좋은 결과를 만든 흐름을 꾸준히 이어가면 이번 학기 평점 목표도 충분히 해낼 수 있어요. 지치지 않게 끝까지 응원할게요.";

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    await assertStagingRuntime();
    console.info("SOCIAL_RUN_NAMESPACE", JSON.stringify({ runId }));
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
    const { data: collapseGoals, error: collapseGoalsError } = await admin.from("goal")
      .insert([
        {
          member_id: ids.acceptA,
          slug: `collapse-eight-${runId}`,
          title: "응원 8개 경계 검증",
          reason: "접기 정책 8개 경계를 검증해요.",
          due_date: isoDateFromNow(20),
          status: "ACTIVE",
          visibility: "PUBLIC",
          cover_preset_key: "c1",
        },
        {
          member_id: ids.acceptA,
          slug: `collapse-nine-${runId}`,
          title: "응원 9개 경계 검증",
          reason: "접기 정책 9개 경계를 검증해요.",
          due_date: isoDateFromNow(21),
          status: "ACTIVE",
          visibility: "PUBLIC",
          cover_preset_key: "c1",
        },
      ]).select("id,slug");
    if (collapseGoalsError || !collapseGoals) {
      throw collapseGoalsError ?? new Error("collapse_goal_fixture_failed");
    }
    eightCheerGoal = collapseGoals.find(({ slug }) => slug === `collapse-eight-${runId}`)?.id ?? 0;
    nineCheerGoal = collapseGoals.find(({ slug }) => slug === `collapse-nine-${runId}`)?.id ?? 0;
    if (!eightCheerGoal || !nineCheerGoal) throw new Error("collapse_goal_fixture_missing");
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
      ...Array.from({ length: 19 }, (_, index) => ({
        displayName: `응원자${index + 1}`,
        message: ["꾸준함", "용기", "성장"][index % 3],
        createdAt: new Date(Date.now() - (index + 8) * 86_400_000).toISOString(),
      })),
      {
        displayName: "익명의 누군가",
        message: ownerLongMessage,
        createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
      },
      {
        displayName: "서연",
        message: "모의고사 820이면 900 금방이야",
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      },
      {
        displayName: "윤도경",
        message: friendLongMessage,
        createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
      },
      {
        displayName: "정민서",
        message: "오늘 정한 분량까지 같이 해내자",
        createdAt: new Date(Date.now() - 4 * 3_600_000).toISOString(),
      },
    ];
    const cheerTargets = [
      ...ownerCheerFixtures.map((fixture) => ({ goalId: ownerGoal, ...fixture })),
      ...Array.from({ length: 13 }, (_, index) => ({
        goalId: friendPublicGoal,
        displayName: `도경 응원자${index + 1}`,
        message: index === 0 ? friendLongMessage : ["꾸준히", "해낼 수 있어", "끝까지"][index % 3],
        createdAt: new Date(Date.now() - (index + 1) * 86_400_000).toISOString(),
      })),
      ...Array.from({ length: 8 }, (_, index) => ({
        goalId: eightCheerGoal,
        displayName: `8경계${index + 1}`,
        message: `8개 경계 응원 ${index + 1}`,
        createdAt: new Date(Date.now() - (index + 1) * 60_000).toISOString(),
      })),
      ...Array.from({ length: 9 }, (_, index) => ({
        goalId: nineCheerGoal,
        displayName: `9경계${index + 1}`,
        message: `9개 경계 응원 ${index + 1}`,
        createdAt: new Date(Date.now() - (index + 1) * 60_000).toISOString(),
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
        : fixture.goalId === ownerGoal && fixture.displayName === "정민서"
        ? ids.friend3
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
          delete from public.goal_cover_asset
          where owner_member_id in (${members})
             or reviewed_by in (${members})
             or goal_id in (
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
      if (objectExists) {
        const { error: removeError } = await admin.storage.from("profile-avatars")
          .remove([expected.objectPath]);
        if (removeError) cleanupErrors.push(`profile-avatar-remove:${expected.queueId}:${removeError.message}`);
      }
      const { error: queueDeleteError } = await admin.from("storage_cleanup_queue")
        .delete().eq("id", expected.queueId);
      if (queueDeleteError) cleanupErrors.push(`profile-cleanup-queue-delete:${expected.queueId}:${queueDeleteError.message}`);
      const { error: assetDeleteError } = await admin.from("profile_avatar_asset")
        .delete().eq("id", expected.assetId);
      if (assetDeleteError) cleanupErrors.push(`profile-avatar-asset-delete:${expected.assetId}:${assetDeleteError.message}`);
      const [{ data: remainingQueue, error: remainingQueueError }, {
        data: remainingAsset,
        error: remainingAssetError,
      }, { data: remainingObjects, error: remainingObjectsError }] = await Promise.all([
        admin.from("storage_cleanup_queue").select("id").eq("id", expected.queueId).maybeSingle(),
        admin.from("profile_avatar_asset").select("id").eq("id", expected.assetId).maybeSingle(),
        admin.storage.from("profile-avatars").list(folder, { search: fileName }),
      ]);
      if (remainingQueueError || remainingQueue) {
        cleanupErrors.push(`profile-cleanup-queue-remains:${expected.queueId}:${remainingQueueError?.message ?? "present"}`);
      }
      if (remainingAssetError || remainingAsset) {
        cleanupErrors.push(`profile-avatar-asset-remains:${expected.assetId}:${remainingAssetError?.message ?? "present"}`);
      }
      if (remainingObjectsError || remainingObjects?.some((object) => object.name === fileName)) {
        cleanupErrors.push(`profile-avatar-object-remains:${expected.objectPath}:${remainingObjectsError?.message ?? "present"}`);
      }
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
    console.info("SOCIAL_FIXTURE_CLEANUP_ZERO", JSON.stringify({
      runId,
      databaseMemberGoalPaymentRows: 0,
      authUsers: 0,
      goalCoverPrivateObjects: 0,
      goalCoverPublicObjects: 0,
      profileAvatarQueues: 0,
      profileAvatarAssets: 0,
      profileAvatarObjects: 0,
    }));
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
      const responsiveGeometry: Array<Record<string, number>> = [];
      const captureDir = process.env.G4_QA_SECOND_BULK_CAPTURE_DIR;
      if (captureDir) mkdirSync(captureDir, { recursive: true });
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      for (const width of [390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/admin", { waitUntil: "domcontentloaded" });
        const alerts = page.getByTestId("admin-ops-alerts");
        const coverQueue = page.getByTestId("goal-cover-review-queue");
        expect(await coverQueue.evaluate((node, alertNode) =>
          Boolean(node.compareDocumentPosition(alertNode as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
        await alerts.elementHandle())).toBe(true);
        const currentRunAlert = alerts.locator("li").filter({ hasText: `playwright-${runId}` });
        await expect(currentRunAlert).toHaveCount(1);
        await expect(currentRunAlert).toContainText("STORAGE_CLEANUP_DRAIN_STALLED");
        const eventType = currentRunAlert.getByText("STORAGE_CLEANUP_DRAIN_STALLED", { exact: true });
        const geometry = await eventType.evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const lineRects = Array.from(range.getClientRects());
          const lineTops = Array.from(new Set(lineRects.map((rect) => Math.round(rect.top))));
          const lastTop = lineTops.at(-1);
          const lastLineRects = lineRects.filter((rect) => Math.round(rect.top) === lastTop);
          const lastWidth = lastLineRects.length
            ? Math.max(...lastLineRects.map((rect) => rect.right)) -
              Math.min(...lastLineRects.map((rect) => rect.left))
            : 0;
          return {
            width: window.innerWidth,
            lines: lineTops.length,
            lastWidth,
            eventWidth: element.getBoundingClientRect().width,
            alertHeight: element.closest("li")?.getBoundingClientRect().height ?? 0,
            pageHeight: document.documentElement.scrollHeight,
            horizontalOverflow: Math.max(
              0,
              document.documentElement.scrollWidth - window.innerWidth,
            ),
          };
        });
        expect(geometry.horizontalOverflow).toBe(0);
        expect(geometry.lines).toBeLessThanOrEqual(3);
        expect(geometry.lines === 1 || geometry.lastWidth >= 28).toBe(true);
        expect(geometry.alertHeight).toBeLessThan(200);
        responsiveGeometry.push(geometry);
        if (captureDir) {
          await page.screenshot({
            path: resolve(captureDir, `admin-${width}.png`),
            fullPage: true,
          });
        }
      }
      if (captureDir) {
        writeFileSync(
          resolve(captureDir, "admin-responsive-geometry.json"),
          `${JSON.stringify(responsiveGeometry, null, 2)}\n`,
        );
      }
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
    test.setTimeout(180_000);
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const captureDir = process.env.S1_DEMO_CAPTURE_DIR?.trim();
    const captureStep = async (fileName: string) => {
      if (!captureDir) return null;
      mkdirSync(captureDir, { recursive: true });
      const path = resolve(captureDir, fileName);
      await page.screenshot({ path, animations: "disabled" });
      return path;
    };
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
    await page.evaluate(() => scrollTo(0, 0));
    await captureStep("01-owner-goal-top-390.png");
    await page.getByRole("button", { name: "마감일 편집" }).click();
    await expect(page.getByTestId("edit-goal-due-date-input")).toBeVisible();
    await expect(page.getByTestId("edit-goal-title-input")).toHaveCount(0);
    await page.getByRole("button", { name: "취소" }).click();
    await page.getByTestId("open-goal-edit-sheet").click();
    await expect(page.getByTestId("edit-goal-title-input")).toBeVisible();
    await expect(page.getByTestId("edit-goal-due-date-input")).toHaveCount(0);
    await captureStep("02-edit-sheet-open-390.png");
    await page.getByTestId("edit-goal-title-input").fill("토익 950 넘길게");
    await captureStep("03-edit-title-filled-390.png");
    await page.getByTestId("save-goal-edit").click();
    await expect(page.getByTestId("goal-edit-sheet")).toHaveCount(0);
    await expect(page.getByTestId("goal-inline-title")).toContainText("토익 950 넘길게");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("goal-management-page")).toBeVisible();
    await expect(page.getByTestId("goal-inline-title")).toContainText("토익 950 넘길게");
    await page.evaluate(() => scrollTo(0, 0));
    await captureStep("04-saved-reloaded-title-390.png");
    await expect(page.getByTestId("goal-management-wordmap")).toBeVisible();
    await expect(page.getByTestId("goal-management-wordmap")).toContainText(
      /지금까지\s*23명이 이 단어들로 응원했어요/,
    );
    await expect(page.getByTestId("goal-supporter-item")).toHaveCount(8);
    await page.getByTestId("goal-supporter-list").scrollIntoViewIfNeeded();
    await captureStep("05-supporters-preview-8-390.png");
    await page.getByRole("button", { name: "응원 목록 펼치기" }).click();
    await expect(page.getByTestId("goal-supporter-item")).toHaveCount(20);
    const supporterPills = page.getByTestId("goal-supporter-cheer-count");
    await expect(supporterPills).toHaveCount(20);
    // Grid item의 inline-flex는 CSS blockification으로 computed display가 flex가 된다.
    await expect(supporterPills.first()).toHaveCSS("display", "flex");
    await expect(supporterPills.first()).toHaveCSS("background-color", "rgb(231, 244, 236)");
    await expect(supporterPills.first()).toHaveCSS("border-radius", "9999px");
    await expect(supporterPills.first()).toHaveCSS("padding", "4px 9px");
    await page.getByTestId("goal-supporter-list").evaluate((element) => {
      scrollTo({ top: element.getBoundingClientRect().top + scrollY - 72 });
    });
    await page.waitForTimeout(50);
    await captureStep("06-supporters-expanded-20-390.png");
    expect(await page.getByTestId("goal-details-card").evaluate((node, wordmap) =>
      Boolean(node.compareDocumentPosition(wordmap as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
    await page.getByTestId("goal-management-wordmap").elementHandle())).toBe(true);
    expect(
      await page.evaluate(() =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
      ),
    ).toBe(0);
    const screenshotPath = process.env.S1_DEMO_SCREENSHOT?.trim();
    if (screenshotPath) {
      mkdirSync(resolve(screenshotPath, ".."), { recursive: true });
      await page.screenshot({ path: screenshotPath });
    }
    const viewportMetrics: Array<Record<string, unknown>> = [];
    for (const width of [360, 390, 412, 600, 700, 780, 820, 900, 1000]) {
      await page.setViewportSize({ width, height: width <= 412 ? 844 : 900 });
      await expect(page.getByTestId("goal-management-page")).toBeVisible();
      await expect(page.getByTestId("goal-supporter-item")).toHaveCount(20);
      const metrics = await measureCanonicalErgonomics(page);
      console.info("S1_GOAL_ERGONOMICS", JSON.stringify({ width, ...metrics }));
      expect(metrics.route).toBe(`/me/goal/${ownerGoal}`);
      expect(metrics.font_below_13, `${width}px font <13`).toBe(0);
      expect(metrics.token_body_px, `${width}px font-designer-14r`).toBeGreaterThanOrEqual(16);
      expect(metrics.tap_below_44, `${width}px tap <44`).toBe(0);
      expect(metrics.active_rules, `${width}px active rules`).toBeGreaterThanOrEqual(1);
      expect(metrics.active_ratio, `${width}px active coverage`).toBeGreaterThanOrEqual(0.9);
      expect(metrics.horizontal_overflow, `${width}px horizontal overflow`).toBe(0);
      expect(
        metrics.fixed_bottom_height === 0 ||
        metrics.bottom_clearance >= metrics.fixed_bottom_height,
        `${width}px fixed bottom clearance`,
      ).toBe(true);
      viewportMetrics.push({ width, ...metrics });
    }
    let visualComparison: Record<string, unknown> | null = null;
    if (captureDir) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByTestId("goal-supporter-list").evaluate((element) => {
        scrollTo({ top: element.getBoundingClientRect().top + scrollY - 72 });
      });
      await page.waitForTimeout(50);
      const approvedPath = resolve(captureDir, "07-approved-supporters-expanded-390.png");
      const actualPath = resolve(captureDir, "08-staging-supporters-expanded-390.png");
      const approvedState = await captureApprovedS1SupporterState(browser, approvedPath);
      await page.screenshot({ path: actualPath, animations: "disabled" });
      visualComparison = {
        approved_state: approvedState,
        actual_state: {
          viewport: { width: 390, height: 844 },
          aligned_element: "supporter list first card",
          aligned_top: 72,
          visible_supporter_rows: await page.getByTestId("goal-supporter-item").count(),
        },
        pixel_data: await comparePngPixels(approvedPath, actualPath),
      };
      writeFileSync(
        resolve(captureDir, "../visual-equivalence.json"),
        `${JSON.stringify(visualComparison, null, 2)}\n`,
      );
    }
    console.info("S1_DEMO", JSON.stringify({
      url: page.url(),
      flow: "owner login -> goal top -> edit input -> save -> reload persisted -> supporters 8 -> supporters 20",
      supporterCount: await supporterPills.count(),
      screenshotPath: screenshotPath ?? null,
      captureDir: captureDir ?? null,
      viewportMetrics,
      visualComparison,
    }));
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
    test.setTimeout(IS_STAGING ? 180_000 : 120_000);
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const s2CaptureDir = process.env.S2_DEMO_CAPTURE_DIR;
    if (s2CaptureDir) mkdirSync(s2CaptureDir, { recursive: true });
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/my", { waitUntil: "domcontentloaded" });
    await waitForVisualReady(page, ["[data-testid=my-page-overview]"]);
    await expect(page.getByTestId("my-page-overview")).toBeVisible();
    await expect(page.getByTestId("my-profile-summary")).toContainText("서연");
    await expect(page.getByTestId("my-profile-summary")).toContainText("친구 3명");
    await expect(page.getByTestId("my-profile-summary")).toContainText("진행 중 목표 2개");
    await expect(page.getByTestId("my-page-overview")).toContainText("윤도경");
    await expect(page.getByTestId("my-page-overview")).not.toContainText("주 연속");
    await expect(page.getByTestId("my-page-overview")).not.toContainText("번 함께");
    const myViewportMetrics: Array<Record<string, unknown>> = [];
    for (const width of [360, 390, 412, 600, 700, 780, 820, 900, 1000]) {
      await page.setViewportSize({ width, height: 844 });
      await waitForVisualReady(page, ["[data-testid=my-page-overview]"]);
      const metrics = await measureCanonicalErgonomics(page);
      console.info("S2_MY_ERGONOMICS", JSON.stringify({ width, ...metrics }));
      expect(metrics.route).toBe("/my");
      expect(metrics.font_below_13, `${width}px font below 13`).toBe(0);
      expect(metrics.token_body_px, `${width}px body token`).toBeGreaterThanOrEqual(16);
      expect(metrics.tap_below_44, `${width}px tap below 44`).toBe(0);
      expect(metrics.active_ratio, `${width}px active coverage`).toBeGreaterThanOrEqual(0.9);
      expect(metrics.horizontal_overflow, `${width}px overflow`).toBe(0);
      expect(metrics.fixed_overlap_with_controls, `${width}px fixed overlap`).toBe(0);
      expect(metrics.bottom_clearance, `${width}px bottom clearance`)
        .toBeGreaterThanOrEqual(metrics.fixed_bottom_height);
      myViewportMetrics.push({ width, ...metrics });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForVisualReady(page, ["[data-testid=my-page-overview]"]);
    if (s2CaptureDir) {
      await captureS2Step(page, `${s2CaptureDir}/01-profile-initial-390.png`);
    }
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
      await page.getByRole("textbox", { name: "이름" }).fill("서연 QA");
      if (profileEvidenceDir) {
        await page.screenshot({ path: `${profileEvidenceDir}/dev-mypage-profile-name-edit-390.png` });
      }
      if (s2CaptureDir) {
        await captureS2Step(page, `${s2CaptureDir}/02-profile-name-input-390.png`);
      }
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
      await page.getByRole("textbox", { name: "한 줄 소개" }).fill("매일 조금씩 오래 가요");
      if (profileEvidenceDir) {
        await page.screenshot({ path: `${profileEvidenceDir}/dev-mypage-profile-bio-edit-390.png` });
      }
      if (s2CaptureDir) {
        await captureS2Step(page, `${s2CaptureDir}/03-profile-bio-input-390.png`);
      }
      await page.getByRole("button", { name: "저장" }).click();
      await expect(page.getByRole("button", { name: /매일 조금씩 오래 가요/ })).toBeVisible();
      await page.getByRole("button", { name: "프로필 사진 바꾸기" }).click();
      const initialPresetResponsePromise = page.waitForResponse((response) => {
        if (!response.url().includes("/functions/v1/profile-update")) return false;
        try {
          const body = response.request().postDataJSON() as {
            action?: string;
            profile_image?: string;
          };
          return body.action === "save" && body.profile_image?.endsWith("jimin.png") === true;
        } catch {
          return false;
        }
      });
      await page.getByRole("button", { name: "프로필 사진 3" }).click();
      const initialPresetResponse = await initialPresetResponsePromise;
      expect(initialPresetResponse.status()).toBe(200);
      await expect(page.getByTestId("my-profile-summary").getByRole("img", {
        name: "서연 QA 프로필",
      })).toHaveAttribute("src", /jimin\.png/);
      await page.reload();
      await expect(page.getByTestId("my-profile-summary")).toContainText("서연 QA");
      await expect(page.getByTestId("my-profile-summary")).toContainText("매일 조금씩 오래 가요");
      await expect(page.getByTestId("my-profile-summary").getByRole("img", { name: "서연 QA 프로필" }))
        .toHaveAttribute("src", /jimin\.png/);
      if (s2CaptureDir) {
        await captureS2Step(page, `${s2CaptureDir}/04-profile-saved-reloaded-390.png`);
      }
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
        const png = readFileSync(resolve(
          process.cwd(),
          "public/images/social-viral/dogyeong.png",
        ));
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
        if (s2CaptureDir) {
          await captureS2Step(page, `${s2CaptureDir}/05-profile-storage-finalized-390.png`);
        }
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
      await waitForVisualReady(page, ["[data-testid=my-profile-summary]"]);
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
      let profileVisualComparison: Record<string, unknown> | null = null;
      if (s2CaptureDir) {
        await captureS2Step(page, `${s2CaptureDir}/06-profile-preset-restored-reloaded-390.png`);
        const approvedPath = resolve(s2CaptureDir, "07-approved-mypage-display-390.png");
        const approvedState = await captureApprovedS2State(browser, "mypage", approvedPath);
        const actualPath = resolve(s2CaptureDir, "06-profile-preset-restored-reloaded-390.png");
        profileVisualComparison = {
          approved_state: approvedState,
          actual_state: {
            viewport: { width: 390, height: 844 },
            state: "mypage-display",
            scroll_top: 0,
            images_complete: await page.locator("img").evaluateAll((images) =>
              images.every((image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0
              )
            ),
          },
          pixel_data: await comparePngPixels(
            approvedPath,
            actualPath,
            "동일 390x844·scroll top·프로필 display 상태다. prototype과 fixture의 이름·소개·사진·집계 데이터 차이를 픽셀 차이에 포함한다.",
          ),
        };
        writeFileSync(
          resolve(s2CaptureDir, "profile-visual-equivalence.json"),
          `${JSON.stringify(profileVisualComparison, null, 2)}\n`,
        );
      }
      console.info("S2_PROFILE_DEMO", JSON.stringify({
        route: "/my",
        flow: "profile initial -> name input/save -> bio input/save -> preset photo/save -> reload persisted -> real Storage avatar finalize -> preset restore/reload",
        viewportMetrics: myViewportMetrics,
        visualComparison: profileVisualComparison,
      }));
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
    test.setTimeout(IS_STAGING ? 180_000 : 120_000);
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const s2CaptureDir = process.env.S2_DEMO_CAPTURE_DIR;
    if (s2CaptureDir) mkdirSync(s2CaptureDir, { recursive: true });
    await page.goto(`/me/goal/${ownerGoal}`, { waitUntil: "domcontentloaded" });
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
    if (s2CaptureDir) {
      await captureS2Step(page, `${s2CaptureDir}/08-cover-picker-open-390.png`);
    }
    await page.getByRole("button", { name: /건강·식단/ }).click();
    await expect(
      page.getByTestId("goal-cover-picker").getByTestId("goal-cover").first(),
    ).toHaveAttribute("data-preset", "health", { timeout: 15_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForVisualReady(page, ["[data-testid=goal-cover-picker]"]);
    await expect(
      page.getByTestId("goal-cover-picker").getByTestId("goal-cover").first(),
    ).toHaveAttribute("data-preset", "health");
    if (s2CaptureDir) {
      await captureS2Step(page, `${s2CaptureDir}/09-cover-preset-saved-reloaded-390.png`);
    }
    const waitForStableCoverImage = async () => {
      const coverImage = page.getByTestId("goal-cover-picker")
        .getByTestId("goal-cover").first().locator("img");
      await expect.poll(() => coverImage.evaluate(async (element) => {
        const image = element as HTMLImageElement;
        const source = image.currentSrc;
        if (!source || !image.complete || image.naturalWidth <= 0) return false;
        try {
          await image.decode();
        } catch {
          return false;
        }
        return image.currentSrc === source && image.complete && image.naturalWidth > 0;
      }), { timeout: 15_000 }).toBe(true);
    };
    const coverViewportMetrics: Array<Record<string, unknown>> = [];
    for (const width of [360, 390, 412, 600, 700, 780, 820, 900, 1000]) {
      await page.setViewportSize({ width, height: 844 });
      await waitForStableCoverImage();
      await waitForVisualReady(page, ["[data-testid=goal-cover-picker]"]);
      const metrics = await measureCanonicalErgonomics(page);
      console.info("S2_COVER_ERGONOMICS", JSON.stringify({ width, ...metrics }));
      expect(metrics.route).toBe(`/me/goal/${ownerGoal}`);
      expect(metrics.font_below_13, `${width}px font below 13`).toBe(0);
      expect(metrics.token_body_px, `${width}px body token`).toBeGreaterThanOrEqual(16);
      expect(metrics.tap_below_44, `${width}px tap below 44`).toBe(0);
      expect(metrics.active_ratio, `${width}px active coverage`).toBeGreaterThanOrEqual(0.9);
      expect(metrics.horizontal_overflow, `${width}px overflow`).toBe(0);
      expect(metrics.fixed_overlap_with_controls, `${width}px fixed overlap`).toBe(0);
      expect(metrics.bottom_clearance, `${width}px bottom clearance`)
        .toBeGreaterThanOrEqual(metrics.fixed_bottom_height);
      coverViewportMetrics.push({ width, ...metrics });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForStableCoverImage();
    await waitForVisualReady(page, ["[data-testid=goal-cover-picker]"]);
    await expect(page.locator(".goal-cover-picker-preview .goal-cover-mark")).toBeHidden();
    await expect(page.getByTestId("wordmap").locator(".wordmap-heart")).toHaveCount(0);
    await expect(page.getByTestId("wordmap").locator(".wordmap-ambient")).toHaveCount(5);
    let coverVisualComparison: Record<string, unknown> | null = null;
    if (s2CaptureDir) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const decorationBoundary = await page.evaluate(() => ({
        reducedMotionMatches: matchMedia("(prefers-reduced-motion: reduce)").matches,
        ownerCoverMarkDisplay: getComputedStyle(
          document.querySelector<HTMLElement>(".goal-cover-picker-preview .goal-cover-mark")!,
        ).display,
        staticHeartCount: document.querySelectorAll("[data-testid=wordmap] .wordmap-heart").length,
        ambient: Array.from(
          document.querySelectorAll<HTMLElement>("[data-testid=wordmap] .wordmap-ambient"),
        ).map((element) => ({
          text: element.textContent,
          display: getComputedStyle(element).display,
          opacity: getComputedStyle(element).opacity,
        })),
        wordItems: Array.from(
          document.querySelectorAll<HTMLElement>("[data-testid=wordmap] [data-wordmap-item]"),
        ).map((element) => element.textContent?.trim()),
      }));
      expect(decorationBoundary.reducedMotionMatches).toBe(true);
      expect(decorationBoundary.ownerCoverMarkDisplay).toBe("none");
      expect(decorationBoundary.staticHeartCount).toBe(0);
      expect(decorationBoundary.ambient).toHaveLength(5);
      expect(decorationBoundary.ambient.every((item) => item.display === "none")).toBe(true);
      console.info("S2_VISUAL_DECORATION_BOUNDARY", JSON.stringify(decorationBoundary));
      const actualPath = resolve(s2CaptureDir, "10-cover-owner-health-display-390.png");
      await captureS2Step(page, actualPath, "allow");
      const approvedPath = resolve(s2CaptureDir, "11-approved-goal-health-display-390.png");
      const approvedState = await captureApprovedS2State(browser, "goal-health", approvedPath);
      coverVisualComparison = {
        approved_state: approvedState,
        actual_state: {
          viewport: { width: 390, height: 844 },
          state: "goal-health",
          scroll_top: 0,
          reduced_motion: true,
          images_complete: await page.locator("img").evaluateAll((images) =>
            images.every((image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0
            )
          ),
        },
        pixel_data: await comparePngPixels(
          approvedPath,
          actualPath,
          "동일 390x844·scroll top·reduced-motion·건강 프리셋 display 상태다. prototype과 fixture의 제목·날짜·집계 데이터 차이를 픽셀 차이에 포함하며, 승인 motion particle DOM은 유지하되 reduced-motion에서는 숨긴다.",
        ),
      };
      writeFileSync(
        resolve(s2CaptureDir, "cover-visual-equivalence.json"),
        `${JSON.stringify(coverVisualComparison, null, 2)}\n`,
      );
    }
    await page.goto(`/g/${publicSlug}`);
    await waitForVisualReady(page, ["[data-testid=goal-public-page]", "[data-testid=goal-cover]"]);
    await expect(page.getByTestId("goal-public-page").getByTestId("goal-cover"))
      .toHaveAttribute("data-preset", "health");
    if (s2CaptureDir) {
      await captureS2Step(page, `${s2CaptureDir}/12-cover-public-health-reflected-390.png`);
    }
    console.info("S2_COVER_DEMO", JSON.stringify({
      ownerRoute: `/me/goal/${ownerGoal}`,
      publicRoute: `/g/${publicSlug}`,
      flow: "open picker -> choose health preset -> reload persisted -> public reflected",
      viewportMetrics: coverViewportMetrics,
      visualComparison: coverVisualComparison,
    }));
    await context.close();
  });

  test("PW-04 custom upload finalize는 REVIEW 안내를 내고 기존 커버를 유지한다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const s2CaptureDir = process.env.S2_DEMO_CAPTURE_DIR;
    if (s2CaptureDir) mkdirSync(s2CaptureDir, { recursive: true });
    await page.goto(`/me/goal/${ownerGoal}`);
    await waitForVisualReady(page, ["[data-testid=goal-cover-picker]"]);
    await page.getByRole("button", { name: "배너 바꾸기" }).click();
    const currentCover = page.getByTestId("goal-cover-picker").getByTestId(
      "goal-cover",
    ).first();
    const initialPreset = await currentCover.getAttribute("data-preset");
    expect(initialPreset).toBeTruthy();
    const uploadedCover = readFileSync(resolve(
      process.cwd(),
      "public/images/v2-cover-presets/cover-health.jpg",
    ));
    const signResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/functions/v1/goal-cover-sign-upload")
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "cover-health.jpg",
      mimeType: "image/jpeg",
      buffer: uploadedCover,
    });
    await expect(page.getByTestId("goal-cover-crop-preview")).toBeVisible();
    if (s2CaptureDir) {
      await captureS2Step(page, `${s2CaptureDir}/13-cover-upload-preview-390.png`);
    }
    const finalizeResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/functions/v1/goal-cover-finalize") &&
      response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "배너로 쓰기" }).click();
    const signResponse = await signResponsePromise;
    const signBody = await signResponse.json() as { upload_url?: string };
    expect(
      signResponse.status(),
      "sign response must succeed",
    ).toBe(200);
    expect(signBody.upload_url).toBeTruthy();
    expect(new URL(signBody.upload_url!).origin).toBe(SUPABASE_URL);
    const finalizeResponse = await finalizeResponsePromise;
    expect(finalizeResponse.status()).toBe(200);
    const finalizeBody = await finalizeResponse.json() as {
      asset_id?: string;
      status?: string;
      active_cover_changed?: boolean;
    };
    expect(finalizeBody).toEqual(expect.objectContaining({
      status: "REVIEW",
      active_cover_changed: false,
    }));
    expect(finalizeBody.asset_id).toBeTruthy();
    const { data: reviewAsset, error: reviewAssetError } = await admin
      .from("goal_cover_asset")
      .select("id,goal_id,owner_member_id,quarantine_path,status")
      .eq("id", finalizeBody.asset_id!)
      .single();
    if (reviewAssetError) throw reviewAssetError;
    expect(reviewAsset).toEqual(expect.objectContaining({
      goal_id: ownerGoal,
      owner_member_id: ids.owner,
      status: "REVIEW",
    }));
    const { data: storedUpload, error: storedUploadError } = await admin.storage
      .from("goal-cover-quarantine")
      .download(reviewAsset.quarantine_path);
    expect(storedUploadError).toBeNull();
    expect(storedUpload?.size).toBeGreaterThan(0);
    expect(storedUpload?.size).toBeLessThanOrEqual(5 * 1024 * 1024);
    await expect(page.getByText(/검수 대기열/)).toBeVisible();
    await expect(currentCover).toHaveAttribute("data-preset", initialPreset!);
    if (s2CaptureDir) {
      await captureS2Step(page, `${s2CaptureDir}/14-cover-review-status-390.png`);
    }
    console.info("S2_UPLOAD_REVIEW_DEMO", JSON.stringify({
      route: `/me/goal/${ownerGoal}`,
      signStatus: signResponse.status(),
      finalizeStatus: finalizeResponse.status(),
      assetId: finalizeBody.asset_id,
      databaseStatus: reviewAsset.status,
      quarantineBytes: storedUpload?.size ?? 0,
      activeCoverChanged: finalizeBody.active_cover_changed,
    }));
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

  test("QA-REVERIFY-FLOW-01A 초대 생성부터 친구 공개 목표 조회까지 실제 UI와 DB가 이어진다", async ({ browser }) => {
    test.setTimeout(IS_STAGING ? 120_000 : 60_000);
    const s3CaptureDir = process.env.S3_DEMO_CAPTURE_DIR;
    const s3EvidenceStamp = process.env.S3_EVIDENCE_STAMP;
    const captureS3 = async (page: Page, step: string, name: string) => {
      if (!s3CaptureDir) return;
      expect(s3EvidenceStamp, "S3 capture filename stamp is required").toMatch(/^\d{8}-\d{4}$/);
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await page.locator("img").evaluateAll(async (images) => {
        await Promise.all(images.map((image) => {
          const node = image as HTMLImageElement;
          if (node.complete && node.naturalWidth > 0) return Promise.resolve();
          return new Promise<void>((resolve) => {
            node.addEventListener("load", () => resolve(), { once: true });
            node.addEventListener("error", () => resolve(), { once: true });
          });
        }));
      });
      await page.screenshot({
        path: `${s3CaptureDir}/haenael-s3-${step}-${name}-v1-gpt-codex-${s3EvidenceStamp}.png`,
        fullPage: true,
        animations: "disabled",
      });
    };

    const [inviteLowId, inviteHighId] = [ids.owner, ids.acceptB].sort();
    let ownerInviteContext: BrowserContext | null = null;
    let acceptInviteContext: BrowserContext | null = null;
    try {
      ownerInviteContext = await authContext(browser, emails.owner);
      await ownerInviteContext.grantPermissions(
        ["clipboard-read", "clipboard-write"],
        { origin: new URL(E2E_BASE_URL).origin },
      );
      const ownerInvitePage = await ownerInviteContext.newPage();
      await ownerInvitePage.setViewportSize({ width: 390, height: 844 });
      await ownerInvitePage.goto("/invite");
      await waitForVisualReady(ownerInvitePage, ["[data-testid=friend-invite-card]"]);
      await captureS3(ownerInvitePage, "01", "invite-create");
      await ownerInvitePage.getByRole("button", { name: "초대 링크 복사" }).click();
      await expect(ownerInvitePage.getByRole("status")).toHaveText("초대 링크를 복사했어요.");
      const invitationUrl = await ownerInvitePage.evaluate(() => navigator.clipboard.readText());
      const invitation = new URL(invitationUrl);
      expect(invitation.origin).toBe(new URL(E2E_BASE_URL).origin);
      expect(invitation.pathname).toMatch(/^\/invite\/[A-Za-z0-9_-]+$/);
      await captureS3(ownerInvitePage, "02", "invite-link-created");

      acceptInviteContext = await authContext(browser, emails.acceptB);
      const acceptInvitePage = await acceptInviteContext.newPage();
      await acceptInvitePage.setViewportSize({ width: 390, height: 844 });
      const inviteResponse = await acceptInvitePage.goto(invitation.pathname);
      expect(inviteResponse?.status()).toBe(200);
      await waitForVisualReady(acceptInvitePage, ["[data-testid=invite-accept-card]"]);
      await expect(acceptInvitePage.getByRole("button", { name: "초대 수락하고 함께하기" })).toBeVisible();
      await captureS3(acceptInvitePage, "03", "invite-accept");
      await Promise.all([
        acceptInvitePage.waitForURL(/\/friends$/, { timeout: 30_000 }),
        acceptInvitePage.getByRole("button", { name: "초대 수락하고 함께하기" }).click(),
      ]);
      const friendListReload = await acceptInvitePage.reload({ waitUntil: "commit" });
      expect(friendListReload?.status()).toBe(200);
      await expect(acceptInvitePage).toHaveURL(/\/friends$/);
      await waitForVisualReady(acceptInvitePage, ["[data-testid=friend-goal-list]"]);
      const [{ data: inviteConnection, error: inviteConnectionError }, {
        data: acceptedInvite,
        error: acceptedInviteError,
      }, { data: currentOwnerGoal, error: currentOwnerGoalError }] = await Promise.all([
        admin.from("friend_connection")
          .select("id,status")
          .eq("member_low_id", inviteLowId)
          .eq("member_high_id", inviteHighId)
          .single(),
        admin.from("friend_invite")
          .select("id,accepted_by,accepted_at")
          .eq("accepted_by", ids.acceptB)
          .order("accepted_at", { ascending: false })
          .limit(1)
          .single(),
        admin.from("goal").select("title").eq("id", ownerGoal).single(),
      ]);
      expect(inviteConnectionError).toBeNull();
      expect(inviteConnection?.status).toBe("ACTIVE");
      expect(acceptedInviteError).toBeNull();
      expect(acceptedInvite?.accepted_by).toBe(ids.acceptB);
      expect(acceptedInvite?.accepted_at).toBeTruthy();
      expect(currentOwnerGoalError).toBeNull();
      expect(currentOwnerGoal?.title).toBeTruthy();
      const expectedFriendGoalPath = `/friends/${ids.owner}?goal=${ownerGoal}`;
      const ownerFriendCard = acceptInvitePage.getByTestId("friend-card")
        .filter({ has: acceptInvitePage.locator(`[data-testid="friend-goal-link"][href="${expectedFriendGoalPath}"]`) });
      await expect(ownerFriendCard).toHaveCount(1);
      await expect(ownerFriendCard).toContainText(currentOwnerGoal!.title);
      await captureS3(acceptInvitePage, "04", "friend-list");
      const ownerGoalLink = ownerFriendCard.getByTestId("friend-goal-link");
      await expect(ownerGoalLink).toHaveAttribute("href", expectedFriendGoalPath);
      await Promise.all([
        acceptInvitePage.waitForURL(
          new RegExp(`/friends/${ids.owner}\\?goal=${ownerGoal}$`),
          { timeout: 30_000 },
        ),
        ownerGoalLink.click(),
      ]);
      await expect(acceptInvitePage.getByTestId("friend-detail-page")).toBeVisible();
      await expect(acceptInvitePage.getByTestId("friend-goal-detail")).toContainText(currentOwnerGoal!.title);
      await captureS3(acceptInvitePage, "05", "friend-public-goal");
      console.info("S3_INVITE_FRIEND_DEMO", JSON.stringify({
        createRoute: "/invite",
        acceptRoute: "/invite/{token}",
        friendListRoute: "/friends",
        friendGoalRoute: `/friends/${ids.owner}?goal=${ownerGoal}`,
        inviteAccepted: true,
        connectionStatus: inviteConnection?.status,
        goalTitle: currentOwnerGoal?.title,
        captureCount: s3CaptureDir ? 5 : 0,
      }));
    } finally {
      await acceptInviteContext?.close();
      await ownerInviteContext?.close();
      await admin.from("friend_connection").delete()
        .eq("member_low_id", inviteLowId)
        .eq("member_high_id", inviteHighId);
      await admin.from("friend_invite").delete().eq("accepted_by", ids.acceptB);
    }
  });

  test("QA-REVERIFY-FLOW-01B friendId와 목표 소유자·공개 범위가 다르면 실제 HTTP 404다", async ({ browser }) => {
    test.setTimeout(IS_STAGING ? 120_000 : 60_000);
    const [memberLowId, memberHighId] = [ids.owner, ids.acceptA].sort();
    await admin.from("friend_connection").upsert({
      member_low_id: memberLowId,
      member_high_id: memberHighId,
      status: "ACTIVE",
      blocked_by_member_id: null,
    }, { onConflict: "member_low_id,member_high_id" });
    let context: BrowserContext | null = null;
    try {
      context = await authContext(browser, emails.owner);
      const page = await context.newPage();
      const detailResponse = await page.goto(
        `/friends/${ids.friend}?goal=${friendPublicGoal}`,
        { waitUntil: "commit" },
      );
      expect(detailResponse?.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`/friends/${ids.friend}\\?goal=${friendPublicGoal}$`));
      await expect(page.getByTestId("friend-goal-detail")).toBeVisible();
      await page.getByRole("link", { name: "전체 보기 ›" }).click();
      await expect(page).toHaveURL(new RegExp(`/friends/${ids.friend}/wordmap\\?goal=${friendPublicGoal}$`));
      await expect(page.getByTestId("friend-wordmap-page")).toBeVisible();
      await expect(page.getByTestId("wordmap")).toBeVisible();
      await expect(page.getByRole("button", { name: /응원|결제/ })).toHaveCount(0);

      const response = await page.goto(
        `/friends/${ids.acceptA}?goal=${friendPublicGoal}`,
        { waitUntil: "commit" },
      );
      expect(response?.status()).toBe(404);
      await expect(page).toHaveURL(new RegExp(`/friends/${ids.acceptA}\\?goal=${friendPublicGoal}$`));
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
      await expect(page.getByTestId("friend-goal-detail")).toHaveCount(0);
      const wordmapMismatch = await page.goto(
        `/friends/${ids.acceptA}/wordmap?goal=${friendPublicGoal}`,
        { waitUntil: "commit" },
      );
      expect(wordmapMismatch?.status()).toBe(404);
      await expect(page).toHaveURL(new RegExp(`/friends/${ids.acceptA}/wordmap\\?goal=${friendPublicGoal}$`));
      await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
      await expect(page.getByTestId("friend-wordmap-page")).toHaveCount(0);

      await admin.from("goal").update({ visibility: "PRIVATE" }).eq("id", friendPublicGoal);
      try {
        const privateWordmap = await page.goto(
          `/friends/${ids.friend}/wordmap?goal=${friendPublicGoal}`,
          { waitUntil: "commit" },
        );
        expect(privateWordmap?.status()).toBe(404);
        await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
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
          { waitUntil: "commit" },
        );
        expect(removedWordmap?.status()).toBe(404);
        await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
        await expect(page.getByTestId("friend-wordmap-page")).toHaveCount(0);
      } finally {
        await admin.from("friend_connection").update({ status: "ACTIVE" })
          .eq("member_low_id", ownerLowId).eq("member_high_id", ownerHighId);
      }
    } finally {
      await context?.close();
      await admin.from("friend_connection").delete()
        .eq("member_low_id", memberLowId)
        .eq("member_high_id", memberHighId);
    }
  });

  test("QA-REVERIFY-FLOW-01C 비인증 친구 워드맵 요청은 HTTP 307 뒤 landing DOM으로 거부된다", async ({ page: anonymousPage }) => {
    await routeStagingOriginWithoutToolbar(anonymousPage);
    const route = `/friends/${ids.friend}/wordmap?goal=${friendPublicGoal}`;
    const boundaryResponse = await anonymousPage.request.get(route, {
      headers: { "x-vercel-skip-toolbar": "1" },
      maxRedirects: 0,
    });
    expect(boundaryResponse.status()).toBe(307);
    const location = boundaryResponse.headers().location;
    expect(location).toBe(`/?next=${encodeURIComponent(route)}`);

    const landingResponse = await anonymousPage.goto(route, { waitUntil: "commit" });
    expect(landingResponse?.status()).toBe(200);
    await expect(anonymousPage).toHaveURL(new URL(location!, E2E_BASE_URL).href);
    await expect(anonymousPage.locator("main")).toBeVisible();
    await expect(anonymousPage.getByTestId("receiver-bottom-nav")).toBeVisible();
    await expect(anonymousPage.getByTestId("friend-wordmap-page")).toHaveCount(0);
    console.info("S3_ANON_REDIRECT_EVIDENCE", JSON.stringify({
      route,
      boundaryStatus: boundaryResponse.status(),
      location,
      landingStatus: landingResponse?.status(),
      finalUrl: anonymousPage.url(),
      forbiddenDomCount: await anonymousPage.getByTestId("friend-wordmap-page").count(),
    }));
  });

  test("QA-REVERIFY-VIEWPORT-01 운영 모드 신규 화면은 390px·768px·1440px에서 시안 위치와 overflow를 검증한다", async ({ browser }) => {
    test.setTimeout(process.env.RUN_MOBILE_ERGONOMICS === "1" ? 420_000 : 300_000);
    const evidenceDir = process.env.E2E_CAPTURE_DIR ??
      "../docs/qa/evidence/v2-goal-20261024/captures";
    const captureWidths = process.env.APPROVED_CAPTURE_WIDTHS === "390"
      ? [390]
      : [390, 768, 1440];
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
      // 로그인 받는사람 화면도 같은 9폭으로 잰다(독립 검증 D5: 공개 목표 1개 경로만 재고 있었다).
      const ergoContext = await authContext(browser, emails.owner);
      for (const [label, route] of [
        ["friends", "/friends"],
        ["mypage", "/my"],
        ["connect", "/invite"],
        ["goal-detail", `/me/goal/${ownerGoal}`],
      ] as const) {
        for (const width of [360, 390, 412, 600, 700, 780, 820, 900, 1000]) {
          const ergoPage = await ergoContext.newPage();
          await ergoPage.setViewportSize({ width, height: 844 });
          const ergoResponse = await ergoPage.goto(route, { waitUntil: "domcontentloaded" });
          expect(ergoResponse?.status(), `${width}px ${route}`).toBe(200);
          await ergoPage.waitForLoadState("networkidle").catch(() => {});
          const metrics = await measureCanonicalErgonomics(ergoPage);
          console.log(`RECEIVER_ERGONOMICS ${JSON.stringify({ label, width, ...metrics, route })}`);
          await ergoPage.close();
        }
      }
      await ergoContext.close();
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
        if (label === "goal-detail") {
          const sectionGeometry = await page.evaluate(() => {
            const rect = (selector: string) => {
              const element = document.querySelector<HTMLElement>(selector);
              if (!element) return null;
              const value = element.getBoundingClientRect();
              return {
                top: value.top,
                right: value.right,
                bottom: value.bottom,
                left: value.left,
                width: value.width,
                height: value.height,
              };
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
          expect.soft(
            Math.abs(
              ((sectionGeometry.whyButton?.top ?? 0) + (sectionGeometry.whyButton?.height ?? 0) / 2) -
              ((sectionGeometry.whyRow?.top ?? 0) + (sectionGeometry.whyRow?.height ?? 0) / 2),
            ),
            `${width}px WHY 편집 버튼은 승인본처럼 WHY 본문 수직 중앙에 붙는다`,
          ).toBeLessThanOrEqual(1);
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
          const friendRows = await page.locator(".friend-list-item").evaluateAll((rows) =>
            rows.slice(0, 3).map((row) => {
              const main = row.querySelector<HTMLElement>(".friend-list-main");
              const avatar = row.querySelector<HTMLElement>(".friend-list-avatar");
              const name = row.querySelector<HTMLElement>(".friend-list-name");
              const goal = row.querySelector<HTMLElement>(".friend-list-copy > strong");
              const news = row.querySelector<HTMLElement>(".friend-list-news-message");
              const rect = (element: HTMLElement | null) => {
                if (!element) return null;
                const value = element.getBoundingClientRect();
                return { top: value.top, bottom: value.bottom, height: value.height };
              };
              return {
                alignItems: main ? getComputedStyle(main).alignItems : null,
                avatar: rect(avatar),
                name: rect(name),
                goal: rect(goal),
                news: rect(news),
                goalFontSize: goal ? getComputedStyle(goal).fontSize : null,
                goalClamp: goal ? getComputedStyle(goal).webkitLineClamp : null,
                newsClamp: news ? getComputedStyle(news).webkitLineClamp : null,
                newsOverflows: news
                  ? news.scrollHeight > news.clientHeight + 1
                  : null,
                newsCollapsible: news
                  ? news.closest("[data-collapsible]")?.getAttribute("data-collapsible")
                  : null,
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
            expect(row.newsClamp).toBe(row.newsOverflows ? "2" : "none");
            expect(row.newsCollapsible).toBe(
              row.newsOverflows ? "enabled" : "disabled",
            );
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
      await expect(cashoutCards.getByRole("button", { name: "지급 완료" })).toHaveCount(2);
      await expect(cashoutCards.getByRole("button", { name: "반려", exact: true })).toHaveCount(2);
      const memberSection = adminPage.getByTestId("admin-members-section");
      const ledgerSection = adminPage.getByTestId("admin-ledger-section");
      const memberCards = memberSection.locator(":scope > .admin-record-list > .admin-member-card");
      const ledgerRows = ledgerSection.locator(":scope > .admin-record-list > .admin-record-row");
      await expect(memberSection.locator(".admin-section-head p")).toHaveCount(0);
      await expect(ledgerSection.locator(".admin-section-head p")).toHaveCount(0);
      expect(await memberCards.count()).toBeGreaterThanOrEqual(3);
      expect(await ledgerRows.count()).toBeGreaterThanOrEqual(3);
      const firstMemberCard = memberCards.first();
      await expect(firstMemberCard).toBeVisible();
      await expect(firstMemberCard.locator("details")).toHaveCount(0);
      await expect(
        firstMemberCard.locator(".admin-record-row strong").first(),
      ).toBeVisible();
      await expect(
        firstMemberCard.locator(".admin-record-row small"),
      ).toContainText(["가입", "보유 클로버"]);
      const memberDetails = firstMemberCard.locator(".admin-member-details");
      const memberDetailsToggle = firstMemberCard.getByRole("button", {
        name: /회원 상세 (?:펼치기|접기)$/,
      });
      await expect(memberDetails).toHaveCount(0);
      await expect(memberDetailsToggle).toHaveAttribute("aria-expanded", "false");
      await memberDetailsToggle.click();
      await expect(memberDetailsToggle).toHaveAttribute("aria-expanded", "true");
      await expect(memberDetails).toBeVisible();
      await expect(memberDetails.locator("p")).toHaveCount(3);
      await memberDetailsToggle.click();
      await expect(memberDetails).toHaveCount(0);

      const memberWithGoal = memberCards.filter({ hasText: "서연" }).first();
      const memberWithGoalToggle = memberWithGoal.getByRole("button", {
        name: /회원 상세 (?:펼치기|접기)$/,
      });
      await memberWithGoalToggle.click();
      await expect(
        memberWithGoal.getByRole("link", { name: "목표 보기" }),
      ).toBeVisible();
      await memberWithGoalToggle.click();
      await adminPage.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await adminPage.screenshot({
        path: `${evidenceDir}/dev-cover-review-${width}.png`,
      });
      const requestedStatusStyle = await cashoutCards
        .first()
        .locator(".admin-cashout-value")
        .evaluate((element) => {
          const amount = element.querySelector("strong");
          const status = element.querySelector("span");
          if (!amount || !status) throw new Error("requested_cashout_value_missing");
          const colorProbe = document.createElement("span");
          colorProbe.style.color = "var(--clover-ink)";
          element.append(colorProbe);
          const cloverInk = getComputedStyle(colorProbe).color;
          colorProbe.remove();
          return {
            amountColor: getComputedStyle(amount).color,
            cloverInk,
            statusBackgroundColor: getComputedStyle(status).backgroundColor,
          };
        });
      expect
        .soft(requestedStatusStyle.amountColor)
        .toBe(requestedStatusStyle.cloverInk);
      expect
        .soft(requestedStatusStyle.statusBackgroundColor)
        .toBe("rgba(0, 0, 0, 0)");
      const adminOverflow = await adminPage.evaluate(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
          .map((element) => ({
            selector: element.className || element.tagName,
            right: Math.ceil(element.getBoundingClientRect().right),
          }))
          .filter(({ right }) => right > viewportWidth)
          .slice(0, 10);
        return {
          delta: document.documentElement.scrollWidth - viewportWidth,
          offenders,
        };
      });
      expect.soft(adminOverflow.delta, JSON.stringify(adminOverflow.offenders)).toBe(0);
      expect.soft(adminErrors).toEqual([]);
      await adminContext.close();
      }
    }
  });

  test("QA-REVERIFY-INVITE-NAV-01 초대 수락 화면은 승인된 하단 탭 component를 유지한다", async ({ browser }) => {
    const page = await newRemotePage(browser, {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
    });
    const response = await page.goto(`/invite/${smokeInviteToken}`, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId("invite-accept-card")).toBeVisible();
    await expect(page.getByTestId("receiver-bottom-nav")).toBeVisible();
    await expect(page.getByRole("button", { name: "초대" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.close();
  });

  test("QA-REVERIFY-ADMIN-ORPHAN-01 관리자 안내문은 768px과 1440px에서 28px 미만 고아 줄바꿈이 없다", async ({ browser }) => {
    const context = await authContext(browser, emails.admin);
    const page = await context.newPage();
    for (const width of [768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto("/admin", { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${width}px /admin`).toBe(200);
      const metrics = await page.locator(".admin-dashboard-head h1 + p").evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const lines = Array.from(range.getClientRects());
        return {
          lineCount: lines.length,
          lastWidth: lines.at(-1)?.width ?? 0,
        };
      });
      console.info("ADMIN_NOTICE_LINE_GEOMETRY", JSON.stringify({ width, ...metrics }));
      expect(metrics.lastWidth, `${width}px ${JSON.stringify(metrics)}`).toBeGreaterThanOrEqual(28);
    }
    await context.close();
  });

  test("QA-TC-LG-01 노출 표에 없는 화면은 법적 고지 DOM이 0개다", async ({ browser }) => {
    test.setTimeout(45_000);
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of [
      "/me",
      `/me/goal/${ownerGoal}`,
      "/me/achievements",
      "/friends",
      `/friends/${ids.friend}`,
      `/friends/${ids.friend}/wordmap`,
      "/invite",
      `/wordmap/${ownerGoal}`,
      "/cashout",
      "/cashout/history",
      "/cashout/status",
    ]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("legal-footer"), route).toHaveCount(0);
      await expect(page.locator(".my-policy-links"), route).toHaveCount(0);
      await expect(page.getByTestId("business-information"), route).toHaveCount(0);
    }
    await context.close();

    const adminContext = await authContext(browser, emails.admin);
    const adminPage = await adminContext.newPage();
    await adminPage.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(adminPage.getByTestId("legal-footer")).toHaveCount(0);
    await expect(adminPage.locator(".my-policy-links")).toHaveCount(0);
    await expect(adminPage.getByTestId("business-information")).toHaveCount(0);
    await adminContext.close();

    const guestPage = await newRemotePage(browser, { viewport: { width: 390, height: 844 } });
    for (const route of [
      "/",
      "/how",
      "/onboarding",
      "/child-safety",
      "/payment/success",
      "/payment/fail",
      `/g/${publicSlug}`,
      `/invite/${smokeInviteToken}`,
    ]) {
      await guestPage.goto(route, { waitUntil: "domcontentloaded" });
      await expect(guestPage.getByTestId("legal-footer"), route).toHaveCount(0);
      await expect(guestPage.locator(".my-policy-links"), route).toHaveCount(0);
      await expect(guestPage.getByTestId("business-information"), route).toHaveCount(0);
    }
    await guestPage.close();
  });

  test("QA-TC-LG-02 마이페이지를 제외한 하단탭 화면에 법적 고지 블록과 링크 나열이 0개다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of [
      "/me",
      `/me/goal/${ownerGoal}`,
      "/me/achievements",
      "/friends",
      `/friends/${ids.friend}`,
      `/friends/${ids.friend}/wordmap`,
      "/invite",
      `/wordmap/${ownerGoal}`,
    ]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("receiver-bottom-nav"), route).toBeVisible();
      await expect(page.getByTestId("legal-footer"), route).toHaveCount(0);
      await expect(page.locator(".my-policy-links"), route).toHaveCount(0);
      await expect(page.getByTestId("business-information"), route).toHaveCount(0);
    }
    await context.close();

    const guestPage = await newRemotePage(browser, { viewport: { width: 390, height: 844 } });
    for (const route of ["/", `/g/${publicSlug}`, `/invite/${smokeInviteToken}`]) {
      await guestPage.goto(route, { waitUntil: "domcontentloaded" });
      await expect(guestPage.getByTestId("receiver-bottom-nav"), route).toBeVisible();
      await expect(guestPage.getByTestId("legal-footer"), route).toHaveCount(0);
      await expect(guestPage.locator(".my-policy-links"), route).toHaveCount(0);
    }
    await guestPage.close();
  });

  test("QA-TC-LG-03 마이페이지 한 단계 아래가 사업자 정보 전문을 소유한다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/my", { waitUntil: "domcontentloaded" });
    const legalLinks = page.locator(".my-policy-links");
    await expect(legalLinks.getByRole("link")).toHaveCount(3);
    await expect(legalLinks.getByRole("link")).toHaveText(["이용약관", "개인정보처리방침", "사업자 정보"]);
    await expect(page.getByTestId("business-information")).toHaveCount(0);
    await legalLinks.getByRole("link", { name: "사업자 정보" }).click();
    await expect(page).toHaveURL(/\/my\/legal$/);
    const information = page.getByTestId("business-information");
    await expect(information).toBeVisible();
    await expect(information.locator("dt")).toHaveText([
      "상호",
      "대표자",
      "사업자등록번호",
      "주소",
      "이메일",
      "개인정보보호책임자",
    ]);
    await page.goto("/how", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("business-information")).toHaveCount(0);
    await expect(page.locator(".my-policy-links")).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
    await context.close();
  });

  test("QA-TC-GT-02 회원 전용 탭 미리보기는 서버 호출 0건이고 클라이언트 상수를 쓴다", async ({ browser }) => {
    const page = await newRemotePage(browser, { viewport: { width: 390, height: 844 } });
    await page.goto("/", { waitUntil: "networkidle" });
    const requests: string[] = [];
    page.on("request", (request) => {
      if (["fetch", "xhr"].includes(request.resourceType())) requests.push(request.url());
    });
    await page.getByTestId("receiver-bottom-nav").getByRole("button", { name: "친구" }).click();
    await expect(page.getByTestId("guest-teaser-sheet")).toBeVisible();
    await page.waitForTimeout(250);
    expect(requests).toEqual([]);
    const sourceSha = requiredEnv("GITHUB_SHA");
    const previewSource = execFileSync("git", [
      "show",
      `${sourceSha}:web/src/lib/copy/guest-preview.ts`,
    ], { encoding: "utf8" });
    expect(previewSource).toContain("GUEST_PREVIEW");
    let rpcReferences = "";
    try {
      rpcReferences = execFileSync("git", [
        "grep",
        "-n",
        "platform_social_stats",
        sourceSha,
        "--",
        "web/src",
        "supabase",
      ], { encoding: "utf8" });
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status !== 1) throw error;
    }
    expect(rpcReferences).toBe("");
    await page.close();
  });

  test("QA-TC-GT-03 비회원 예시 시트는 자물쇠와 흐림 없이 두 행동을 제공한다", async ({ browser }) => {
    const page = await newRemotePage(browser, { viewport: { width: 390, height: 844 } });
    await page.goto("/", { waitUntil: "networkidle" });
    const friendTab = page.getByTestId("receiver-bottom-nav").getByRole("button", { name: "친구" });
    await expect.poll(() => friendTab.evaluate((element) =>
      Object.keys(element).some((key) => key.startsWith("__reactProps$"))
    )).toBe(true);
    await friendTab.click();
    const dialog = page.getByTestId("guest-teaser-sheet");
    await expect(dialog).toHaveAttribute("role", "dialog");
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog.getByRole("link", { name: "카카오로 시작하기" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "먼저 둘러보기" })).toBeVisible();
    await expect(dialog.locator('[aria-label="예시 목표"]')).toBeVisible();
    await expect(dialog).not.toContainText(/자물쇠|잠금/);
    const styleAudit = await dialog.evaluate((element) => ({
      blurred: Array.from(element.querySelectorAll<HTMLElement>("*")).filter((node) => {
        const filter = getComputedStyle(node).filter;
        return filter !== "none" && /blur\(/.test(filter);
      }).length,
      lockToken: getComputedStyle(document.documentElement).getPropertyValue("--tabbar-lock-size").trim(),
    }));
    expect(styleAudit.blurred).toBe(0);
    expect(styleAudit.lockToken).toBe("");
    await page.close();
  });

  test("QA-TC-GT-01 비회원 초대와 공개 목표 응답은 최소 필드만 노출한다", async ({ browser }) => {
    const guestClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
    const { data: preview, error: previewError } = await guestClient.rpc(
      "friend_invite_preview",
      { token: smokeInviteToken },
    );
    expect(previewError).toBeNull();
    expect(preview).not.toBeNull();
    expect(Object.keys(preview as Record<string, unknown>).sort()).toEqual([
      "cover_preset_key",
      "goal_title",
      "inviter_nickname",
    ]);

    const page = await newRemotePage(browser, { viewport: { width: 390, height: 844 } });
    const forbidden = [
      "supporter_ci", "provider_id", "token_hash", "quarantine_path",
      "amount_krw", "clover_amount", "member_id", "goal_id",
    ];
    for (const route of [`/invite/${smokeInviteToken}`, `/g/friend2-public-${runId}`]) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("main"), route).not.toBeEmpty();
      const transferred = `${await response!.text()}\n${await page.locator("html").innerText()}`;
      for (const key of forbidden) expect(transferred, `${route}:${key}`).not.toContain(key);
    }
    await expect(page.getByTestId("goal-public-page")).toContainText("토익 900");
    await expect(page.getByTestId("goal-reason")).toBeVisible();

    for (const slug of [`friend-friends-${runId}`, `friend-private-${runId}`]) {
      const response = await page.goto(`/g/${slug}`, { waitUntil: "domcontentloaded" });
      expect(response?.status(), slug).toBe(404);
      await expect(page.getByTestId("goal-public-page")).toHaveCount(0);
    }
    await page.close();
  });

  test("QA-TC-SP-03 공개 목표의 고정 CTA 자리 예약은 토큰과 일치하고 본문을 가리지 않는다", async ({ browser }) => {
    const page = await newRemotePage(browser, { viewport: { width: 390, height: 844 } });
    await page.goto(`/g/${publicSlug}`, { waitUntil: "domcontentloaded" });
    const main = page.getByTestId("goal-public-page");
    const action = page.locator(".receiver-fixed-action.receiver-public-action");
    const bottomNav = page.getByTestId("receiver-bottom-nav");
    await expect(action).toBeVisible();
    await expect(bottomNav).toBeVisible();
    const measure = async () => page.evaluate(() => {
      const mainElement = document.querySelector<HTMLElement>("[data-testid='goal-public-page']")!;
      const content = mainElement.querySelector<HTMLElement>(".goal-public-content")!;
      const fixed = mainElement.querySelector<HTMLElement>(".receiver-fixed-action")!;
      const bottomNav = document.querySelector<HTMLElement>("[data-testid='receiver-bottom-nav']")!;
      const token = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cta-h"));
      const mainStyle = getComputedStyle(mainElement);
      const fixedRect = fixed.getBoundingClientRect();
      const bottomNavRect = bottomNav.getBoundingClientRect();
      const visibleTextRects: Array<{ rect: DOMRect; parent: Element }> = [];
      const textNodes = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
      const backgroundIsOpaque = (element: Element) => {
        const { backgroundColor, opacity } = getComputedStyle(element);
        if (Number(opacity) < 0.99 || backgroundColor === "transparent") return false;
        const rgba = backgroundColor.match(/^rgba?\((.+)\)$/)?.[1]?.split(",").map((part) => Number(part.trim()));
        return Boolean(rgba && (rgba.length < 4 || rgba[3] >= 0.99));
      };
      const isClippedOut = (rect: DOMRect, element: Element) => {
        let clipTop = 0;
        let clipRight = window.innerWidth;
        let clipBottom = window.innerHeight;
        let clipLeft = 0;
        for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          if (!["hidden", "clip", "scroll", "auto"].includes(style.overflowX)
            && !["hidden", "clip", "scroll", "auto"].includes(style.overflowY)) continue;
          const ancestorRect = ancestor.getBoundingClientRect();
          if (["hidden", "clip", "scroll", "auto"].includes(style.overflowX)) {
            clipLeft = Math.max(clipLeft, ancestorRect.left);
            clipRight = Math.min(clipRight, ancestorRect.right);
          }
          if (["hidden", "clip", "scroll", "auto"].includes(style.overflowY)) {
            clipTop = Math.max(clipTop, ancestorRect.top);
            clipBottom = Math.min(clipBottom, ancestorRect.bottom);
          }
        }
        return rect.right <= clipLeft || rect.left >= clipRight || rect.bottom <= clipTop || rect.top >= clipBottom;
      };
      for (let node = textNodes.nextNode(); node; node = textNodes.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const parent = node.parentElement;
        if (!parent) continue;
        const style = getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        visibleTextRects.push(...[...range.getClientRects()]
          .filter((rect) => !isClippedOut(rect, parent))
          .map((rect) => ({ rect, parent })));
      }
      const viewportTextRects = visibleTextRects.filter(({ rect }) => rect.width > 0 && rect.height > 0
        && rect.bottom > 0 && rect.top < window.innerHeight
        && rect.right > 0 && rect.left < window.innerWidth);
      const visibleTextOverlap = viewportTextRects.some(({ rect, parent }) => {
        if (!(rect.left < fixedRect.right && rect.right > fixedRect.left
          && rect.top < fixedRect.bottom && rect.bottom > fixedRect.top)) return false;
        const probeX = (Math.max(rect.left, fixedRect.left) + Math.min(rect.right, fixedRect.right)) / 2;
        const probeY = (Math.max(rect.top, fixedRect.top) + Math.min(rect.bottom, fixedRect.bottom)) / 2;
        const stack = document.elementsFromPoint(probeX, probeY);
        const actionIndex = stack.findIndex((element) => element === fixed || fixed.contains(element));
        const textIndex = stack.findIndex((element) => element === parent || parent.contains(element) || element.contains(parent));
        // Range는 불투명 CTA 뒤의 글자도 준다. 실제로 읽히는 경우만 실패로 본다:
        // 투명 CTA 뒤의 글자, 또는 CTA보다 위 z-index로 paint된 본문 텍스트.
        return !backgroundIsOpaque(fixed) || (actionIndex >= 0 && textIndex >= 0 && textIndex < actionIndex);
      });
      return {
        token,
        reserved: Number.parseFloat(mainStyle.paddingBottom),
        fixedHeight: fixedRect.height,
        position: getComputedStyle(fixed).position,
        actionInViewport: fixedRect.top >= 0 && fixedRect.bottom <= window.innerHeight,
        actionAboveBottomNav: fixedRect.bottom <= bottomNavRect.top + 1,
        ctaReservation: Number.parseFloat(mainStyle.paddingBottom) - bottomNavRect.height,
        viewportTextCount: viewportTextRects.length,
        visibleTextOverlap,
      };
    });
    const top = await measure();
    expect(["fixed", "sticky"]).toContain(top.position);
    expect(top.actionInViewport).toBe(true);
    expect(top.actionAboveBottomNav).toBe(true);
    expect(top.fixedHeight).toBe(top.token);
    expect(top.ctaReservation).toBe(top.token);
    expect(top.visibleTextOverlap).toBe(false);
    await main.evaluate((element) => element.scrollTo(0, element.scrollHeight));
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const end = await measure();
    expect(["fixed", "sticky"]).toContain(end.position);
    expect(end.actionInViewport).toBe(true);
    expect(end.actionAboveBottomNav).toBe(true);
    expect(end.fixedHeight).toBe(end.token);
    expect(end.ctaReservation).toBe(end.token);
    expect(end.viewportTextCount).toBeGreaterThan(0);
    expect(end.visibleTextOverlap).toBe(false);
    await page.close();
  });

  test("QA-TC-AC-01 업적 화면에는 등급 공개 토글이 없다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/me/achievements", { waitUntil: "domcontentloaded" });
    const achievements = page.getByTestId("achievements-page");
    await expect(achievements).toBeVisible();
    await expect(achievements.getByRole("checkbox")).toHaveCount(0);
    await expect(achievements.getByRole("switch")).toHaveCount(0);
    await expect(achievements.locator("input")).toHaveCount(0);
    await expect(achievements.locator("button")).toHaveCount(0);
    await expect(achievements.locator("button").filter({ hasText: /등급|받는 사람도/ })).toHaveCount(0);
    await context.close();
  });

  test("QA-TC-CP-02-03 응원 목록은 8개에서 펼치고 9개부터 꺾쇠 하나로 왕복한다", async ({ browser }) => {
    const context = await authContext(browser, emails.acceptA);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/me/goal/${eightCheerGoal}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("goal-supporter-list").locator(":scope > article")).toHaveCount(8);
    const eightCard = page.getByTestId("goal-supporter-card");
    await expect(eightCard.locator('[data-collapsible="enabled"]')).toHaveCount(0);
    await expect(eightCard.locator(".collapse-chevron")).toHaveCount(0);

    await page.goto(`/me/goal/${nineCheerGoal}`, { waitUntil: "domcontentloaded" });
    const nineCard = page.getByTestId("goal-supporter-card");
    const toggle = nineCard.locator(".collapse-chevron");
    await expect(page.getByTestId("goal-supporter-list").locator(":scope > article")).toHaveCount(8);
    await expect(toggle).toHaveCount(1);
    await expect(toggle.locator("svg")).toHaveCount(1);
    expect((await toggle.textContent())?.trim()).toBe("");
    await expect(nineCard).not.toContainText(/더보기|접기/);
    await toggle.click();
    await expect(page.getByTestId("goal-supporter-list").locator(":scope > article")).toHaveCount(9);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.click();
    await expect(page.getByTestId("goal-supporter-list").locator(":scope > article")).toHaveCount(8);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await context.close();
  });

  test("QA-TC-CL-01 목표 관리의 긴 응원은 2줄에서 펼치고 다시 접힌다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/me/goal/${ownerGoal}`, { waitUntil: "domcontentloaded" });
    await expectTwoLineClamp(
      page.getByTestId("goal-supporter-list").locator("article").filter({ hasText: ownerLongMessage }).locator("p"),
    );
    await context.close();
  });

  test("QA-TC-CL-02 해낼게 관리의 긴 응원은 2줄에서 펼치고 다시 접힌다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/my", { waitUntil: "domcontentloaded" });
    await expectTwoLineClamp(page.locator(".my-cheer-message").filter({ hasText: ownerLongMessage }));
    await context.close();
  });

  test("QA-TC-CL-03 친구 목록의 긴 응원은 2줄에서 펼치고 다시 접힌다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/friends", { waitUntil: "domcontentloaded" });
    const card = page.getByTestId("friend-card").filter({ hasText: "윤도경" });
    await expectTwoLineClamp(card.locator(".friend-list-news-message").filter({ hasText: friendLongMessage }));
    await context.close();
  });

  test("QA-TC-CL-04 친구 상세의 긴 응원은 2줄에서 펼치고 다시 접힌다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/friends/${ids.friend}?goal=${friendPublicGoal}`, { waitUntil: "domcontentloaded" });
    await expectTwoLineClamp(page.locator(".friend-recent-cheer p").filter({ hasText: friendLongMessage }));
    await context.close();
  });

  test("QA-TC-CS-03-04 23명 요약은 아바타 3개와 +20이고 익명은 비활성 자리표시다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/me", { waitUntil: "domcontentloaded" });
    const summary = page
      .getByTestId("home-goal-list")
      .getByTestId("cheer-summary-bar")
      .filter({ hasText: "23명이 응원했어요" });
    await expect(summary).toBeVisible();
    await expect(summary.locator(".cheer-summary-avatars > span")).toHaveCount(3);
    await expect(summary.locator(".cheer-summary-avatars > strong")).toHaveText("+20");
    await expect(summary.locator(".cheer-summary-recent")).toContainText(`익명의 누군가: ${ownerLongMessage}`);
    const anonymousAvatar = summary.locator('.cheer-summary-avatars > span[title="익명 응원이라 프로필을 열 수 없어요."]');
    await expect(anonymousAvatar).toHaveCount(1);
    await expect(anonymousAvatar).toHaveText("?");
    await expect(anonymousAvatar.locator("a")).toHaveCount(0);
    await context.close();
  });

  test("QA-TC-CS-03 응원 0명 목표는 요약 바 대신 빈 상태를 보인다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/me", { waitUntil: "domcontentloaded" });
    const zeroCard = page.getByTestId("my-goal-list-card").filter({ hasText: "매일 영어 단어 30개" });
    await expect(zeroCard).toBeVisible();
    await expect(zeroCard.getByTestId("cheer-summary-bar")).toHaveCount(0);
    await expect(zeroCard).toContainText(/아직 응원이 없|첫 응원을 기다|응원을 기다/);
    await context.close();
  });

  test("QA-TC-CP-05 정책과 ADR에 선언되지 않은 실제 접힘이 없다", async ({ browser }) => {
    const inspectUndeclared = async (page: Page, route: string) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      return page.locator("[data-collapsible='enabled']").evaluateAll((regions) => regions.flatMap((region) => {
        const declared = region.classList.contains("admin-member-disclosure")
          || region.querySelector(".clamp-text, #receiver-cheer-list, #goal-supporter-list") !== null;
        return declared ? [] : [{ route: location.pathname, className: region.className }];
      }));
    };
    const undeclared: Array<{ route: string; className: string }> = [];
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/me", `/me/goal/${ownerGoal}`, "/friends", `/friends/${ids.friend}`, "/my"])
      undeclared.push(...await inspectUndeclared(page, route));
    await context.close();

    const adminContext = await authContext(browser, emails.admin);
    const adminPage = await adminContext.newPage();
    await adminPage.setViewportSize({ width: 390, height: 844 });
    undeclared.push(...await inspectUndeclared(adminPage, "/admin"));
    const memberCards = adminPage.locator(".admin-member-card");
    const memberDisclosures = adminPage.locator(".admin-member-disclosure[data-collapsible='enabled']");
    expect(await memberDisclosures.count()).toBe(await memberCards.count());
    expect(await memberDisclosures.count()).toBeGreaterThan(0);
    expect(undeclared).toEqual([]);
    await adminContext.close();
  });

  test("QA-TC-CP-03 렌더된 접기 토글 전수는 텍스트 없는 꺾쇠 하나다", async ({ browser }) => {
    const inspect = async (page: Page, route: string) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      return page.locator("[data-collapsible='enabled']").evaluateAll((regions) => regions.map((region) => {
        const toggles = Array.from(region.querySelectorAll<HTMLElement>(":scope > button.collapse-chevron"));
        return {
          toggles: toggles.length,
          svg: toggles[0]?.querySelectorAll("svg").length ?? 0,
          text: toggles[0]?.textContent?.trim() ?? "",
        };
      }));
    };
    const observed: Array<{ toggles: number; svg: number; text: string }> = [];
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/me", `/me/goal/${ownerGoal}`, "/friends", `/friends/${ids.friend}`, "/my"])
      observed.push(...await inspect(page, route));
    await context.close();
    const adminContext = await authContext(browser, emails.admin);
    const adminPage = await adminContext.newPage();
    await adminPage.setViewportSize({ width: 390, height: 844 });
    observed.push(...await inspect(adminPage, "/admin"));
    await adminContext.close();
    expect(observed.length).toBeGreaterThan(0);
    expect(observed.every((item) => item.toggles === 1 && item.svg === 1 && item.text === "")).toBe(true);
  });

  test("QA-TC-SP-02 카드 전수의 상하 안쪽 여백과 가장자리 margin이 대칭이다", async ({ browser }) => {
    test.setTimeout(45_000);
    const violations: Array<Record<string, unknown>> = [];
    const inspect = async (page: Page, route: string) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const found = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>("main *")).flatMap((element) => {
        const tokens = typeof element.className === "string" ? element.className.split(/\s+/) : [];
        const isCard = tokens.some((token) => token === "social-card" || token.endsWith("-card") || token === "bg-card")
          && (tokens.some((token) => token.includes("rounded")) || tokens.some((token) => token.endsWith("-card")));
        if (!isCard || element.offsetParent === null) return [];
        const style = getComputedStyle(element);
        const hasOpaqueBackground = !["transparent", "rgba(0, 0, 0, 0)"].includes(style.backgroundColor);
        const hasBorder = [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]
          .some((width) => Number.parseFloat(width) > 0);
        const hasShadow = style.boxShadow !== "none";
        // `invite-accept-card`처럼 이름만 card인 투명 페이지 정렬 wrapper는 카드 surface가 아니다.
        // DESIGN.md F축도 이런 여백 비대칭을 경고로만 다루므로 차단 census에서 제외한다.
        if (!hasOpaqueBackground && !hasBorder && !hasShadow) return [];
        const first = element.firstElementChild ? getComputedStyle(element.firstElementChild) : null;
        const last = element.lastElementChild ? getComputedStyle(element.lastElementChild) : null;
        const top = Number.parseFloat(style.paddingTop);
        const bottom = Number.parseFloat(style.paddingBottom);
        const firstTop = first ? Number.parseFloat(first.marginTop) : 0;
        const lastBottom = last ? Number.parseFloat(last.marginBottom) : 0;
        return Math.abs((top + firstTop) - (bottom + lastBottom)) > 1
          ? [{ className: tokens.slice(0, 6).join(" "), top, bottom, firstTop, lastBottom }]
          : [];
      }));
      violations.push(...found.map((item) => ({ route, ...item })));
    };
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/me", `/me/goal/${ownerGoal}`, "/me/achievements", `/wordmap/${ownerGoal}`, "/friends", `/friends/${ids.friend}`, `/friends/${ids.friend}/wordmap`, "/invite", "/my", "/cashout", "/cashout/history", "/cashout/status"])
      await inspect(page, route);
    await context.close();

    const adminContext = await authContext(browser, emails.admin);
    const adminPage = await adminContext.newPage();
    await adminPage.setViewportSize({ width: 390, height: 844 });
    await inspect(adminPage, "/admin");
    await adminContext.close();

    const guest = await newRemotePage(browser, { viewport: { width: 390, height: 844 } });
    for (const route of ["/", "/how", "/onboarding", "/child-safety", "/payment/fail", `/g/${publicSlug}`, `/invite/${smokeInviteToken}`])
      await inspect(guest, route);
    await guest.close();
    expect(violations).toEqual([]);
  });

  test("QA-TC-SP-04 제품 화면 전수 표본의 가로 넘침과 28px 미만 고아 줄바꿈이 0건이다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const findings: Array<Record<string, unknown>> = [];
    for (const route of ["/me", `/me/goal/${ownerGoal}`, "/friends", `/friends/${ids.friend}`, "/invite", "/my", "/cashout", "/cashout/history"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const result = await page.evaluate(() => {
        const visible = (element: HTMLElement) => element.offsetParent !== null
          && getComputedStyle(element).visibility !== "hidden"
          && !element.classList.contains("sr-only")
          && element.closest(".sr-only") === null;
        const clippedRect = (source: { left: number; right: number; top: number; bottom: number }, start: HTMLElement) => {
          let { left, right, top, bottom } = source;
          for (let clipper: HTMLElement | null = start; clipper; clipper = clipper.parentElement) {
            const clipStyle = getComputedStyle(clipper);
            const clipsX = ["hidden", "clip", "auto", "scroll"].includes(clipStyle.overflowX);
            const clipsY = ["hidden", "clip", "auto", "scroll"].includes(clipStyle.overflowY);
            if (!clipsX && !clipsY) continue;
            const clipRect = clipper.getBoundingClientRect();
            if (clipsX) {
              left = Math.max(left, clipRect.left + clipper.clientLeft);
              right = Math.min(right, clipRect.left + clipper.clientLeft + clipper.clientWidth);
            }
            if (clipsY) {
              top = Math.max(top, clipRect.top + clipper.clientTop);
              bottom = Math.min(bottom, clipRect.top + clipper.clientTop + clipper.clientHeight);
            }
            if (right <= left || bottom <= top) return null;
          }
          return { left, right, top, bottom };
        };
        const contentBounds = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left + element.clientLeft,
            right: rect.left + element.clientLeft + element.clientWidth,
            top: rect.top + element.clientTop,
            bottom: rect.top + element.clientTop + element.clientHeight,
          };
        };
        const escapesHorizontally = (rect: { left: number; right: number }, bounds: { left: number; right: number }) => rect.left < bounds.left - 1 || rect.right > bounds.right + 1;
        const hasVisibleHorizontalOverflow = (element: HTMLElement) => {
          const ownBounds = contentBounds(element);
          const directText = Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
          if (directText.some((node) => {
            const textRange = document.createRange();
            textRange.selectNode(node);
            return Array.from(textRange.getClientRects())
              .map((rect) => clippedRect(rect, element))
              .some((rect) => rect !== null && escapesHorizontally(rect, ownBounds));
          })) return true;
          return Array.from(element.querySelectorAll<HTMLElement>("*")).some((child) => {
            if (!visible(child)) return false;
            const rect = clippedRect(child.getBoundingClientRect(), child);
            if (!rect) return false;
            let hasOutOfFlowAncestor = false;
            for (let ancestor: HTMLElement | null = child; ancestor && ancestor !== element; ancestor = ancestor.parentElement) {
              if (["absolute", "fixed"].includes(getComputedStyle(ancestor).position)) {
                hasOutOfFlowAncestor = true;
                break;
              }
            }
            const bounds = hasOutOfFlowAncestor && element.parentElement
              ? contentBounds(element.parentElement)
              : ownBounds;
            return escapesHorizontally(rect, bounds);
          });
        };
        const overflow = Array.from(document.querySelectorAll<HTMLElement>("main, main *")).flatMap((element) => {
          if (!visible(element)) return [];
          const style = getComputedStyle(element);
          if (["auto", "scroll"].includes(style.overflowX)) return [];
          const hasOwnText = Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
          if (["hidden", "clip"].includes(style.overflowX) && !hasOwnText) return [];
          return element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1 && hasVisibleHorizontalOverflow(element)
            ? [{ kind: "overflow", tag: element.tagName, className: element.className, text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 80), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }]
            : [];
        });
        const orphan = Array.from(document.querySelectorAll<HTMLElement>("main *")).flatMap((element) => {
          if (!visible(element)) return [];
          const style = getComputedStyle(element);
          if (["nowrap", "pre"].includes(style.whiteSpace)) return [];
          const children = Array.from(element.childNodes);
          if (!children.some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())) return [];
          if (children.some((node) => node.nodeType === Node.ELEMENT_NODE && getComputedStyle(node as Element).display !== "inline" && visible(node as HTMLElement))) return [];
          const range = document.createRange();
          range.selectNodeContents(element);
          // Range 는 line-clamp 뒤에 실제로 그려졌지만 overflow 로 완전히 가려진 줄도 반환한다.
          // 그 rect 를 마지막 줄로 세면 2줄 clamp 의 숨은 3~N줄 끝 글자가 고아 줄로 오인된다.
          // 자신과 조상 scrollport/clip box 를 모두 교차해 실제로 보이는 조각만 줄 기하에 남긴다.
          const rects = Array.from(range.getClientRects()).flatMap((rangeRect) => {
            let left = rangeRect.left;
            let right = rangeRect.right;
            let top = rangeRect.top;
            let bottom = rangeRect.bottom;
            for (let clipper: HTMLElement | null = element; clipper; clipper = clipper.parentElement) {
              const clipStyle = getComputedStyle(clipper);
              const clipsX = ["hidden", "clip", "auto", "scroll"].includes(clipStyle.overflowX);
              const clipsY = ["hidden", "clip", "auto", "scroll"].includes(clipStyle.overflowY);
              if (!clipsX && !clipsY) continue;
              const clipRect = clipper.getBoundingClientRect();
              if (clipsX) {
                left = Math.max(left, clipRect.left + clipper.clientLeft);
                right = Math.min(right, clipRect.left + clipper.clientLeft + clipper.clientWidth);
              }
              if (clipsY) {
                top = Math.max(top, clipRect.top + clipper.clientTop);
                bottom = Math.min(bottom, clipRect.top + clipper.clientTop + clipper.clientHeight);
              }
              if (right <= left || bottom <= top) return [];
            }
            return right > left && bottom > top ? [{ left, right, top, bottom }] : [];
          });
          if (rects.length < 2) return [];
          const lines: Array<{ top: number; bottom: number; left: number; right: number }> = [];
          for (const rect of rects) {
            const line = lines.find((candidate) => {
              const overlap = Math.min(candidate.bottom, rect.bottom) - Math.max(candidate.top, rect.top);
              return overlap > 0.5 * Math.min(candidate.bottom - candidate.top, rect.bottom - rect.top);
            });
            if (line) {
              line.left = Math.min(line.left, rect.left);
              line.right = Math.max(line.right, rect.right);
              line.top = Math.min(line.top, rect.top);
              line.bottom = Math.max(line.bottom, rect.bottom);
            } else {
              lines.push({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
            }
          }
          if (lines.length < 2) return [];
          const last = lines.at(-1)!;
          const lastWidth = last.right - last.left;
          return lastWidth < 28
            ? [{ kind: "orphan", tag: element.tagName, className: element.className, text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 80), lines: lines.length, lastWidth }]
            : [];
        });
        return [...overflow, ...orphan];
      });
      findings.push(...result.map((item) => ({ route, ...item })));
    }
    expect(findings).toEqual([]);
    await context.close();
  });

  test("QA-TC-CV-01 커버 업로드 버튼은 프리셋 스크롤 위치와 무관하게 파일 선택을 연다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/me/goal/${ownerGoal}`, { waitUntil: "domcontentloaded" });
    await page.locator(".goal-cover-picker-toggle").click();
    const grid = page.locator(".cover-preset-grid");
    const upload = page.locator(".cover-picker-upload-entry");
    const max = await grid.evaluate((element) => element.scrollWidth - element.clientWidth);
    for (const target of [0, Math.round(max / 2), max]) {
      await grid.evaluate((element, left) => element.scrollTo({ left, behavior: "instant" }), target);
      const before = await grid.evaluate((element) => element.scrollLeft);
      const chooserPromise = page.waitForEvent("filechooser");
      await upload.click();
      const chooser = await chooserPromise;
      await chooser.setFiles([]);
      await page.waitForTimeout(50);
      const after = await grid.evaluate((element) => element.scrollLeft);
      expect(Math.abs(after - before), `scroll ${target}`).toBeLessThanOrEqual(1);
    }
    await context.close();
  });

  test("QA-TC-CV-02 커버 선택 체크 글리프는 선택을 바꿔도 정확히 하나다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/me/goal/${ownerGoal}`, { waitUntil: "domcontentloaded" });
    await page.locator(".goal-cover-picker-toggle").click();
    const options = page.locator(".cover-preset-grid button");
    for (const index of [1, 4, 2]) {
      await options.nth(index).click();
      await expect(options.nth(index)).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator('.cover-preset-grid button[aria-pressed="true"]')).toHaveCount(1);
      await expect(page.locator(".cover-preset-grid button.is-selected")).toHaveCount(1);
      const selected = page.locator('.cover-preset-grid button[aria-pressed="true"]');
      await expect(selected.locator("svg, [data-testid='selection-check'], .selection-check")).toHaveCount(1);
    }
    await context.close();
  });

  test("QA-TC-CV-06 타인 회원은 소유자 UPLOADING 자산을 확정할 수 없다", async () => {
    const assetId = crypto.randomUUID();
    const hash = "9".repeat(64);
    const { error: insertError } = await admin.from("goal_cover_asset").insert({
      id: assetId,
      goal_id: ownerGoal,
      owner_member_id: ids.owner,
      quarantine_path: `${ids.owner}/${ownerGoal}/${assetId}.webp`,
      status: "UPLOADING",
      content_sha256: hash,
      mime_type: "image/webp",
      byte_size: 10,
    });
    expect(insertError).toBeNull();
    const other = createClient(SUPABASE_URL, ANON_KEY);
    const { data: auth, error: authError } = await other.auth.signInWithPassword({
      email: emails.friend,
      password,
    });
    expect(authError).toBeNull();
    expect(auth.session).not.toBeNull();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/goal-cover-finalize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.session!.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ asset_id: assetId, content_sha256: hash }),
    });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: { code: "asset_not_found" } });
    const { data: persisted, error: persistedError } = await admin.from("goal_cover_asset")
      .select("status,owner_member_id")
      .eq("id", assetId)
      .single();
    expect(persistedError).toBeNull();
    expect(persisted).toEqual({ status: "UPLOADING", owner_member_id: ids.owner });
  });

  test("QA-TC-AU-05 쿠키 없는 Server Action 직접 POST는 인증 실패하고 상태를 바꾸지 않는다", async ({ browser }) => {
    const { data: before, error: beforeError } = await admin.from("goal")
      .select("cover_preset_key")
      .eq("id", ownerGoal)
      .single();
    expect(beforeError).toBeNull();
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/me/goal/${ownerGoal}`, { waitUntil: "domcontentloaded" });
    await page.locator(".goal-cover-picker-toggle").click();
    const authenticatedAction = page.waitForResponse((response) =>
      response.request().method() === "POST" &&
      Boolean(response.request().headers()["next-action"])
    );
    await page.locator(".cover-preset-grid button").nth(1).click();
    const authenticatedResponse = await authenticatedAction;
    expect(authenticatedResponse.status()).toBe(200);
    const authenticatedRequest = authenticatedResponse.request();
    const captured = {
      url: authenticatedRequest.url(),
      headers: authenticatedRequest.headers(),
      body: authenticatedRequest.postData() ?? "",
    };
    await expect.poll(async () => {
      const { data, error } = await admin.from("goal")
        .select("cover_preset_key")
        .eq("id", ownerGoal)
        .single();
      if (error) throw error;
      return data?.cover_preset_key;
    }).toBe("run");
    await context.close();

    const owner = createClient(SUPABASE_URL, ANON_KEY);
    const { error: ownerAuthError } = await owner.auth.signInWithPassword({ email: emails.owner, password });
    expect(ownerAuthError).toBeNull();
    const { error: restoreError } = await owner.rpc("set_goal_cover_preset", {
      goal_id: ownerGoal,
      preset_key: before!.cover_preset_key,
    });
    expect(restoreError).toBeNull();

    const replayHeaders = { ...captured.headers };
    delete replayHeaders.cookie;
    delete replayHeaders.authorization;
    delete replayHeaders["content-length"];
    delete replayHeaders.host;
    const replay = await fetch(captured.url, {
      method: "POST",
      headers: replayHeaders,
      body: captured.body,
      redirect: "manual",
    });
    const replayBody = await replay.text();
    expect(replayBody).toContain('"ok":false');
    expect(replayBody).toMatch(/auth_required|social_request_failed/);
    expect(replayBody).not.toContain(ids.owner);
    const { data: after, error: afterError } = await admin.from("goal")
      .select("cover_preset_key")
      .eq("id", ownerGoal)
      .single();
    expect(afterError).toBeNull();
    expect(after?.cover_preset_key).toBe(before!.cover_preset_key);
  });

  test("PW-05 admin 승인 후 owner와 public 화면에 승인 커버만 보인다", async ({ browser }) => {
    test.setTimeout(IS_STAGING ? 120_000 : 60_000);
    const s2CaptureDir = process.env.S2_DEMO_CAPTURE_DIR;
    if (s2CaptureDir) mkdirSync(s2CaptureDir, { recursive: true });
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
        name: "cover-for-review.jpg",
        mimeType: "image/jpeg",
        buffer: readFileSync(resolve(
          process.cwd(),
          "public/images/v2-cover-presets/cover-health.jpg",
        )),
      });
      await expect(ownerPage.getByTestId("goal-cover-crop-preview")).toBeVisible();
      const finalizeResponse = ownerPage.waitForResponse((response) =>
        response.url().includes("/functions/v1/goal-cover-finalize") &&
        response.request().method() === "POST"
      );
      await ownerPage.getByRole("button", { name: "배너로 쓰기" }).click();
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
      .select("id,quarantine_path,status,goal_id,owner_member_id")
      .eq("goal_id", ownerGoal)
      .eq("status", "REVIEW")
      .order("created_at", { ascending: false })
      .limit(1);
    if (reviewAssetsError) throw reviewAssetsError;
    const reviewAsset = reviewAssets?.[0];
    expect(reviewAsset?.status).toBe("REVIEW");
    expect(reviewAsset?.goal_id).toBe(ownerGoal);
    expect(reviewAsset?.owner_member_id).toBe(ids.owner);
    expect(reviewAsset?.quarantine_path).toBeTruthy();
    const { data: reviewGoal, error: reviewGoalError } = await admin
      .from("goal")
      .select("title")
      .eq("id", ownerGoal)
      .single();
    if (reviewGoalError) throw reviewGoalError;
    const { data: reviewOwner, error: reviewOwnerError } = await admin
      .from("member")
      .select("nickname")
      .eq("id", ids.owner)
      .single();
    if (reviewOwnerError) throw reviewOwnerError;
    const { data: reviewSource, error: reviewSourceError } = await admin.storage
      .from("goal-cover-quarantine")
      .download(reviewAsset!.quarantine_path);
    expect(reviewSourceError).toBeNull();
    expect(reviewSource?.size).toBeGreaterThan(0);
    const context = await authContext(browser, emails.admin);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin");
    await waitForVisualReady(page, ["[data-testid=goal-cover-review-queue]"]);
    const reviewQueue = page.getByTestId("goal-cover-review-queue");
    await expect(reviewQueue).toBeVisible();
    const ownerReviewCard = reviewQueue.locator("article").filter({
      has: page.getByText(reviewGoal.title, { exact: true }),
    });
    await expect(ownerReviewCard).toHaveCount(1);
    await ownerReviewCard.scrollIntoViewIfNeeded();
    await expect(ownerReviewCard.getByText(reviewGoal.title, { exact: true })).toBeVisible();
    await expect(ownerReviewCard).toContainText(reviewOwner.nickname);
    const approveButton = ownerReviewCard.getByRole("button", { name: "승인" });
    await expect(approveButton).toBeVisible();
    const reviewCardBox = await ownerReviewCard.boundingBox();
    expect(reviewCardBox).not.toBeNull();
    expect(reviewCardBox!.y).toBeGreaterThanOrEqual(0);
    expect(reviewCardBox!.y + reviewCardBox!.height).toBeLessThanOrEqual(844);
    if (s2CaptureDir) {
      await captureS2Step(page, `${s2CaptureDir}/15-admin-review-queue-390.png`);
    }
    console.info("S2_ADMIN_REVIEW_TARGET", JSON.stringify({
      goalId: reviewAsset!.goal_id,
      assetId: reviewAsset!.id,
      ownerMemberId: reviewAsset!.owner_member_id,
      goalTitle: reviewGoal.title,
      ownerNickname: reviewOwner.nickname,
      approvalCtaVisible: await approveButton.isVisible(),
    }));
    const reviewResponse = page.waitForResponse((response) =>
      response.url().includes("/functions/v1/admin-review-goal-cover")
    );
    await approveButton.click();
    const response = await reviewResponse;
    const responseBody = await response.text();
    expect(response.ok(), `admin review ${response.status()} ${responseBody}`)
      .toBe(true);
    await expect(page.getByText("검수 대기 커버가 없습니다.")).toBeVisible();
    const { data: approvedAsset, error: approvedAssetError } = await admin
      .from("goal_cover_asset")
      .select("id,status,public_path,goal_id")
      .eq("id", reviewAsset!.id)
      .single();
    if (approvedAssetError) throw approvedAssetError;
    expect(approvedAsset).toEqual(expect.objectContaining({
      status: "APPROVED",
      goal_id: ownerGoal,
    }));
    expect(approvedAsset.public_path).toBeTruthy();
    const { data: approvedGoal, error: approvedGoalError } = await admin
      .from("goal")
      .select("active_cover_asset_id")
      .eq("id", ownerGoal)
      .single();
    if (approvedGoalError) throw approvedGoalError;
    expect(approvedGoal.active_cover_asset_id).toBe(reviewAsset!.id);
    const { data: publicStoredCover, error: publicStoredCoverError } = await admin.storage
      .from("goal-cover-public")
      .download(approvedAsset.public_path!);
    expect(publicStoredCoverError).toBeNull();
    expect(publicStoredCover?.size).toBeGreaterThan(0);
    const ownerContext = await authContext(browser, emails.owner);
    const ownerPage = await ownerContext.newPage();
    await ownerPage.setViewportSize({ width: 390, height: 844 });
    await ownerPage.goto(`/me/goal/${ownerGoal}`);
    await waitForVisualReady(ownerPage, ["[data-testid=goal-cover-picker]", "[data-testid=goal-cover] img"]);
    const ownerApprovedImage = ownerPage.getByTestId("goal-cover-picker")
      .getByTestId("goal-cover").first().getByRole("img", { name: /목표 커버/ });
    await expect(ownerApprovedImage).toHaveAttribute("src", /goal-cover-public/);
    if (s2CaptureDir) {
      await captureS2Step(ownerPage, `${s2CaptureDir}/16-owner-approved-cover-390.png`);
    }
    const ownerImageLoaded = await ownerApprovedImage.evaluate((image) =>
      (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0
    );
    await ownerContext.close();
    await page.goto(`/g/${publicSlug}`);
    await waitForVisualReady(page, ["[data-testid=goal-public-page]", "[data-testid=goal-cover] img"]);
    const publicApprovedImage = page.getByTestId("goal-public-page")
      .getByTestId("goal-cover").getByRole("img", { name: /목표 커버/ });
    await expect(publicApprovedImage).toHaveAttribute("src", /goal-cover-public/);
    if (s2CaptureDir) {
      await captureS2Step(page, `${s2CaptureDir}/17-public-approved-cover-390.png`);
    }
    console.info("S2_ADMIN_APPROVAL_DEMO", JSON.stringify({
      adminRoute: "/admin",
      ownerRoute: `/me/goal/${ownerGoal}`,
      publicRoute: `/g/${publicSlug}`,
      reviewStatus: "REVIEW",
      approvedStatus: approvedAsset.status,
      activeCoverAssetId: approvedGoal.active_cover_asset_id,
      publicPath: approvedAsset.public_path,
      publicStorageBytes: publicStoredCover?.size ?? 0,
      ownerImageLoaded,
      publicImageLoaded: await publicApprovedImage.evaluate((image) =>
        (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0
      ),
    }));
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

  test("QA-TC-FD-03 소급 친구의 방향이 보이고 해제 뒤 양쪽 FRIENDS 조회가 닫힌다", async ({ browser }) => {
    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/friends", { waitUntil: "domcontentloaded" });
    const friendCard = page.getByTestId("friend-card").filter({ hasText: "윤도경" });
    await expect(friendCard.getByTestId("friend-relationship-direction")).toHaveText("서로 응원");
    await page.goto(`/friends/${ids.friend}?goal=${friendFriendsGoal}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("friend-relationship-direction")).toHaveText("서로 응원");
    await context.close();

    const owner = createClient(SUPABASE_URL, ANON_KEY);
    const friend = createClient(SUPABASE_URL, ANON_KEY);
    const [{ error: ownerAuthError }, { error: friendAuthError }] = await Promise.all([
      owner.auth.signInWithPassword({ email: emails.owner, password }),
      friend.auth.signInWithPassword({ email: emails.friend, password }),
    ]);
    expect(ownerAuthError).toBeNull();
    expect(friendAuthError).toBeNull();
    const { error: removeError } = await owner.rpc("remove_friend", { friend_member_id: ids.friend });
    expect(removeError).toBeNull();
    const { data: ownerSecond, error: ownerSecondError } = await admin.from("goal")
      .select("id")
      .eq("slug", `owner-second-${runId}`)
      .single();
    expect(ownerSecondError).toBeNull();
    const [ownerView, friendView] = await Promise.all([
      owner.rpc("friend_goal_detail", { goal_id: friendFriendsGoal }),
      friend.rpc("friend_goal_detail", { goal_id: ownerSecond!.id }),
    ]);
    expect(ownerView.data).toBeNull();
    expect(friendView.data).toBeNull();
    expect(ownerView.error?.message).toMatch(/goal_not_found|friend_goal_forbidden/);
    expect(friendView.error?.message).toMatch(/goal_not_found|friend_goal_forbidden/);
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
      customerKey: `attr_${runId}_member_replay`,
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

  test("G4-FRIEND-HISTORY-01 회원 귀속이 없는 과거 응원은 계정을 추정하지 않고 기록으로 보인다", async ({ browser }) => {
    const owner = createClient(SUPABASE_URL, ANON_KEY);
    const { error: authError } = await owner.auth.signInWithPassword({
      email: emails.owner,
      password,
    });
    expect(authError).toBeNull();
    const { data, error } = await owner.rpc("my_unlinked_cheer_history" as never);
    expect(error).toBeNull();
    const payload = data as unknown as { items: Array<Record<string, unknown>> };
    expect(payload.items.length).toBeGreaterThan(0);
    expect(JSON.stringify(payload)).not.toContain("supporter_member_id");
    expect(JSON.stringify(payload)).not.toContain("friend_member_id");

    const context = await authContext(browser, emails.owner);
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/friends", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId("unlinked-cheer-history")).toBeVisible();
    await expect(page.getByTestId("unlinked-cheer-record")).toHaveCount(
      payload.items.length,
    );
    await expect(page.getByTestId("unlinked-cheer-history"))
      .toContainText("친구 프로필과는 분리");
    // 한국어 안내문은 어절 중간에서 줄을 바꾸지 않는다(독립 검증 D2: "추정하지 않" / "아").
    const historyNote = page.getByTestId("unlinked-cheer-history").locator(":scope > p").first();
    await expect(historyNote).toHaveCSS("word-break", "keep-all");
    await context.close();
  });

  test("G4-PERF-01 주요 화면 TTFB와 Supabase RPC 시간을 cold 후보·warm 반복으로 기록한다", async ({ browser }) => {
    const routes = ["/me", "/friends", `/me/goal/${ownerGoal}`];
    const navigationSamples: Array<Record<string, unknown>> = [];
    for (const route of routes) {
      const context = await authContext(browser, emails.owner);
      const page = await context.newPage();
      await page.setViewportSize({ width: 390, height: 844 });
      for (const pass of ["first", "warm"] as const) {
        const wallStart = performance.now();
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        const wallMs = performance.now() - wallStart;
        expect(response?.status(), `${route} ${pass}`).toBe(200);
        const timing = await page.evaluate(() => {
          const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
          return {
            ttfb_ms: entry.responseStart,
            dom_content_loaded_ms: entry.domContentLoadedEventEnd,
          };
        });
        navigationSamples.push({
          route,
          pass,
          wall_ms: Math.round(wallMs),
          ttfb_ms: Math.round(timing.ttfb_ms),
          dom_content_loaded_ms: Math.round(timing.dom_content_loaded_ms),
          vercel_cache: response?.headers()["x-vercel-cache"] ?? null,
        });
      }
      await context.close();
    }

    const owner = createClient(SUPABASE_URL, ANON_KEY);
    const { error: authError } = await owner.auth.signInWithPassword({
      email: emails.owner,
      password,
    });
    expect(authError).toBeNull();
    const rpcSamples: Array<Record<string, unknown>> = [];
    for (const rpc of ["my_social_dashboard", "my_friend_page"] as const) {
      for (let pass = 1; pass <= 3; pass += 1) {
        const started = performance.now();
        const { error } = await owner.rpc(rpc as never);
        rpcSamples.push({ rpc, pass, duration_ms: Math.round(performance.now() - started) });
        expect(error, `${rpc} ${pass}`).toBeNull();
      }
    }
    for (let pass = 1; pass <= 3; pass += 1) {
      const started = performance.now();
      const { error } = await owner.rpc("get_wordmap", { p_goal_id: ownerGoal });
      rpcSamples.push({
        rpc: "get_wordmap",
        pass,
        duration_ms: Math.round(performance.now() - started),
      });
      expect(error, `get_wordmap ${pass}`).toBeNull();
    }

    console.info("G4_PERF_NAVIGATION", JSON.stringify(navigationSamples));
    console.info("G4_PERF_RPC", JSON.stringify(rpcSamples));
    expect(Math.max(...navigationSamples.map((sample) => Number(sample.ttfb_ms))))
      .toBeLessThan(8_000);
    expect(Math.max(...rpcSamples.map((sample) => Number(sample.duration_ms))))
      .toBeLessThan(3_000);
  });
});
