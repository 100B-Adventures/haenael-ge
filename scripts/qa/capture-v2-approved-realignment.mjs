import { chromium } from "../../web/node_modules/playwright/index.mjs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const prototypePath = join(
  repoRoot,
  "docs/design/prototypes/social-viral-loop-v2-opus48.html",
);
const evidenceDir = join(
  repoRoot,
  "docs/qa/evidence/v2-approved-build-realignment-v3.0.0",
);
const screens = [
  ["landing", "landing"],
  ["goalpublic", "goalpublic"],
  ["mypage", "mypage"],
  ["connect", "connect"],
  ["friends", "friends"],
  ["belong", "belong"],
  ["inviteaccept", "inviteaccept"],
];

await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1680, height: 1100 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(pathToFileURL(prototypePath).href, { waitUntil: "load" });
  await page.addStyleTag({
    content: ".console,.flowrail,.review,.statusbar{display:none!important}.frame{border:0!important;border-radius:0!important;box-shadow:none!important}",
  });
  for (const [screenId, label] of screens) {
    await page.evaluate((id) => globalThis.go(id), screenId);
    await page.evaluate((id) => {
      document.querySelectorAll(`#${id} [data-count]`).forEach((element) => {
        if (element._raf) cancelAnimationFrame(element._raf);
        element.textContent = element.getAttribute("data-count") ?? "";
      });
    }, screenId);
    const frame = page.locator(`#${screenId} .frame`);
    await frame.waitFor({ state: "visible" });
    const box = await frame.boundingBox();
    if (!box || Math.round(box.width) !== 390 || Math.round(box.height) !== 844) {
      throw new Error(`${screenId}: expected 390x844 frame, got ${JSON.stringify(box)}`);
    }
    await frame.screenshot({
      path: join(evidenceDir, `spec-${label}-390.png`),
      animations: "disabled",
    });
  }
} finally {
  await browser.close();
}

console.log(`captured ${screens.length} approved 390px frames: ${evidenceDir}`);
