#!/usr/bin/env node
/**
 * measure-web-vitals.mjs
 * 읽기 전용 Core Web Vitals 측정 스크립트 (haenael-ge perf QA).
 *
 * 대상: 비로그인으로 접근 가능한 공개 경로만 (기본: /, /terms).
 * 폭: 390px(모바일), 1024px(데스크톱) 두 조건.
 * 측정: LCP, CLS를 PerformanceObserver로 페이지 컨텍스트에서 수집.
 *       TBT(Total Blocking Time)를 long task 합산으로 근사(INP 대체 — 실사용 상호작용이 없는
 *       read-only 측정이라 진짜 INP는 측정 불가. 이 대체는 report에 명시한다).
 *
 * 절대 쓰기 요청을 유발하지 않는다 — GET 네비게이션만 수행, 폼 제출/로그인 없음.
 *
 * 사용:
 *   node scripts/qa/measure-web-vitals.mjs \
 *     --base https://haenael-ge.vercel.app \
 *     --paths /,/terms \
 *     --out /tmp/vitals.json
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { base: "https://haenael-ge.vercel.app", paths: ["/", "/terms"], out: null, runs: 3 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base") out.base = argv[++i];
    else if (a === "--paths") out.paths = argv[++i].split(",");
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--runs") out.runs = Number(argv[++i]);
  }
  return out;
}

const VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844, isMobile: true },
  { name: "desktop-1024", width: 1024, height: 800, isMobile: false },
];

// 페이지에 주입해 LCP/CLS/long-task를 수집하는 함수. load 완료 후 evaluate로 값을 뽑는다.
const COLLECTOR_INIT_SCRIPT = `
(() => {
  window.__vitals = { lcp: 0, cls: 0, longTaskTotal: 0, longTaskCount: 0 };
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) window.__vitals.lcp = last.renderTime || last.loadTime || last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch (e) { window.__vitals.lcpError = String(e); }
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__vitals.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch (e) { window.__vitals.clsError = String(e); }
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__vitals.longTaskCount += 1;
        window.__vitals.longTaskTotal += Math.max(0, entry.duration - 50);
      }
    }).observe({ type: "longtask", buffered: true });
  } catch (e) { window.__vitals.longtaskError = String(e); }
})();
`;

async function measureOnce(browser, base, urlPath, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    userAgent: viewport.isMobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : undefined,
  });
  const page = await context.newPage();
  await page.addInitScript(COLLECTOR_INIT_SCRIPT);

  const url = new URL(urlPath, base).toString();
  const navStart = Date.now();
  const response = await page.goto(url, { waitUntil: "load", timeout: 30000 });
  const status = response ? response.status() : null;

  // LCP/CLS는 이후 상호작용/스크롤 전까지 계속 갱신될 수 있으므로 안정화 대기.
  await page.waitForTimeout(2000);

  const vitals = await page.evaluate(() => window.__vitals);
  const nav = await page.evaluate(() => {
    const [entry] = performance.getEntriesByType("navigation");
    if (!entry) return null;
    return {
      domContentLoaded: entry.domContentLoadedEventEnd,
      loadEventEnd: entry.loadEventEnd,
      ttfb: entry.responseStart,
    };
  });

  const wallMs = Date.now() - navStart;

  await context.close();

  return {
    path: urlPath,
    viewport: viewport.name,
    httpStatus: status,
    wallMs,
    lcpMs: Number((vitals?.lcp ?? 0).toFixed(1)),
    cls: Number((vitals?.cls ?? 0).toFixed(4)),
    tbtApproxMs: Number((vitals?.longTaskTotal ?? 0).toFixed(1)),
    longTaskCount: vitals?.longTaskCount ?? 0,
    ttfbMs: nav ? Number(nav.ttfb.toFixed(1)) : null,
    domContentLoadedMs: nav ? Number(nav.domContentLoaded.toFixed(1)) : null,
    loadEventEndMs: nav ? Number(nav.loadEventEnd.toFixed(1)) : null,
    errors: {
      lcp: vitals?.lcpError ?? null,
      cls: vitals?.clsError ?? null,
      longtask: vitals?.longtaskError ?? null,
    },
  };
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const pick = (p) => {
    if (sorted.length === 0) return null;
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[idx];
  };
  return { p50: pick(50), p95: pick(95), min: sorted[0] ?? null, max: sorted[sorted.length - 1] ?? null };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const browser = await chromium.launch();
  const allResults = [];

  for (const urlPath of args.paths) {
    for (const viewport of VIEWPORTS) {
      const runs = [];
      for (let i = 0; i < args.runs; i++) {
        try {
          const r = await measureOnce(browser, args.base, urlPath, viewport);
          runs.push(r);
        } catch (e) {
          runs.push({ path: urlPath, viewport: viewport.name, error: String(e) });
        }
      }
      allResults.push(...runs);
    }
  }

  await browser.close();

  // 경로×뷰포트별 집계
  const grouped = {};
  for (const r of allResults) {
    const key = `${r.path}__${r.viewport}`;
    grouped[key] ??= [];
    grouped[key].push(r);
  }

  const summary = Object.entries(grouped).map(([key, runs]) => {
    const [urlPath, viewport] = key.split("__");
    const ok = runs.filter((r) => !r.error);
    return {
      path: urlPath,
      viewport,
      samples: runs.length,
      okSamples: ok.length,
      lcpMs: summarize(ok.map((r) => r.lcpMs)),
      cls: summarize(ok.map((r) => r.cls)),
      tbtApproxMs: summarize(ok.map((r) => r.tbtApproxMs)),
      ttfbMs: summarize(ok.map((r) => r.ttfbMs)),
      raw: runs,
    };
  });

  const output = { measuredAt: new Date().toISOString(), base: args.base, runsPerCell: args.runs, summary };

  const json = JSON.stringify(output, null, 2);
  if (args.out) {
    fs.writeFileSync(args.out, json);
    console.error(`written: ${args.out}`);
  }
  console.log(json);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
