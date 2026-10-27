import { chromium } from "playwright";

const BASE = "https://haenael-ge.vercel.app";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();

const consoleErrors = [];
p.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });

// 1) 랜딩 로드 + 스크롤 실측
const r1 = await p.goto(BASE + "/", { waitUntil: "networkidle" });
const bodyLen = (await p.innerText("body")).length;
const y0 = await p.evaluate(() => window.scrollY);
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(600);
const y1 = await p.evaluate(() => window.scrollY);
const docH = await p.evaluate(() => document.body.scrollHeight);
const overflowX = await p.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);

// 2) CTA 클릭 전 상태 -> 클릭 -> 주소 변화 실측 (로그인 입력 없음, 이동만)
await p.evaluate(() => window.scrollTo(0, 0));
const cta = p.locator('text=시작하기').first();
const ctaVisible = await cta.isVisible();
const urlBefore = p.url();
await cta.click();
await p.waitForTimeout(2500);
const urlAfter = p.url();

// 3) 404 공유링크 페이지 실측
const p2 = await ctx.newPage();
const r3 = await p2.goto(BASE + "/g/does-not-exist-probe", { waitUntil: "networkidle" });
const t404 = await p2.innerText("body");

// 4) 빈 탭 수
const pages = ctx.pages();
let blank = 0;
for (const pg of pages) { const t = (await pg.innerText("body")).trim(); if (t.length < 20) blank++; }

console.log(JSON.stringify({
  LANDING_STATUS: r1.status(),
  BODY_TEXT_LEN: bodyLen,
  SCROLLY_BEFORE: y0,
  SCROLLY_AFTER: y1,
  SCROLLY_DELTA: y1 - y0,
  DOC_HEIGHT: docH,
  OVERFLOW_X: overflowX,
  CTA_VISIBLE: ctaVisible,
  URL_BEFORE: urlBefore,
  URL_AFTER: urlAfter,
  URL_CHANGED: urlBefore !== urlAfter,
  SHARE_404_STATUS: r3.status(),
  SHARE_404_HAS_MSG: t404.includes("링크를 찾을 수 없어요"),
  SHARE_404_TEXT_LEN: t404.length,
  OPEN_PAGES: pages.length,
  BLANK_TABS: blank,
  CONSOLE_ERRORS: consoleErrors.length,
  CONSOLE_SAMPLE: consoleErrors.slice(0, 3),
}, null, 2));

await b.close();
