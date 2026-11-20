// 렌더: 각 안 x 각 데이터 = 1200x630 PNG. 브라우저 1개만 띄우고 끝나면 닫는다.
// 검사: data-t 글자 상자가 카카오 2:1 크롭 안전영역(y 15~615) 안인지, 가로·세로 넘침(scroll>client) 0인지.
const { chromium } = require("playwright");
const path = require("path"); const fs = require("fs");
const dir = __dirname; const OG = require(path.join(dir, "cards.js"));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const report = [];
  for (const v of OG.VARIANTS) for (const k of Object.keys(OG.DATA)) {
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:Pretendard;src:url(assets/PretendardVariable.woff2) format("woff2");font-weight:100 900;}html,body{margin:0;padding:0;}</style></head><body>${v.fn(OG.DATA[k])}</body></html>`;
    const tmp = path.join(dir, `_tmp.html`); fs.writeFileSync(tmp, html);
    await page.goto("file://" + tmp, { waitUntil: "domcontentloaded", timeout: 120000 }); await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); });
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll("[data-t]").forEach((el) => {
        const b = el.getBoundingClientRect();
        if (b.left < 0 || b.right > 1200 || b.top < 15 || b.bottom > 615) bad.push(`out:${el.textContent.trim().slice(0,12)} ${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.right)},${Math.round(b.bottom)}`);
        if (el.scrollWidth > el.clientWidth + 1 && !el.style.webkitLineClamp) bad.push(`hscroll:${el.textContent.trim().slice(0,12)} ${el.scrollWidth}>${el.clientWidth}`);
        if (el.scrollHeight > el.clientHeight + 2 && !el.style.webkitLineClamp) bad.push(`vscroll:${el.textContent.trim().slice(0,12)}`);
        if (!el.style.webkitLineClamp && el.tagName !== "IMG" && el.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(el); const tops = new Set([...rg.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top / 4))); if (tops.size > 1) bad.push(`wrap:${el.textContent.trim().slice(0,12)} lines=${tops.size}`); }
      });
      document.querySelectorAll('.og div').forEach((el)=>{if(el.closest('[data-bleed]'))return;const b=el.getBoundingClientRect(); if(b.width<1199 && (b.bottom>630.5||b.right>1200.5||b.left<-0.5||b.top<-0.5)) bad.push(`box-out:${(el.textContent||'').trim().slice(0,10)} ${Math.round(b.right)},${Math.round(b.bottom)}`);});
      const fontOk = document.fonts.check('800 40px Pretendard');
      return { bad, fontOk };
    });
    const out = path.join(dir, "png", `${v.id}-${k}.png`);
    await page.screenshot({ path: out });
    report.push(`${v.id}-${k}\tfont=${r.fontOk}\tissues=${r.bad.length}\t${r.bad.join(" | ")}`);
  }
  fs.unlinkSync(path.join(dir, "_tmp.html"));
  await browser.close();
  fs.writeFileSync(path.join(dir, "render-check.log"), report.join("\n") + "\n");
  console.log(report.join("\n"));
})();
