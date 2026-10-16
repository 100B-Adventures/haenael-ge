// 프로토타입 화면 캡처 + 모션 GIF 녹화. 390 CSS px / deviceScaleFactor 3.
// 회장 2026-10-16 "폰 캡처 2배 이상" (ev-20261016-02) · D-028-C 모션은 캡처와 같은 짝 안에.
import { mkdir, rm, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const require = createRequire(resolve("web/package.json"));
const { chromium } = require("playwright");

const OUT = resolve("docs/design/boards/shots/v2-design-revision-v3");
const CUR = "file://" + resolve("docs/design/prototypes/social-viral-loop-v3-opus5.html");
const PREV = "file://" + resolve("docs/design/prototypes/.prev-for-compare.html");
const SCREENS = ["landing","goalpublic","mypage","goaldetail","onboarding","friends","belong","status","mywordmap","home","cashout"];
const MOTION = ["mypage","goaldetail","onboarding","status","mywordmap"];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

async function shoot(url, tag) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const pg = await ctx.newPage();
  await pg.goto(url); await pg.waitForLoadState("load"); await pg.waitForTimeout(900);
  // 검수 셸(왼쪽 전역 플로우 레일·상단 콘솔·우측 검수 패널)은 제품 화면이 아니다. 캡처에서 걷어낸다.
  await pg.addStyleTag({ content: ".flowrail,.console,.review,.stagehint{display:none !important}body{padding-left:0 !important}.stage{padding:14px 0 !important;margin:0 !important;gap:0 !important}" });
  await pg.waitForTimeout(300);
  for (const id of SCREENS) {
    await pg.evaluate((s) => window.go(s), id);
    await pg.waitForTimeout(1400);
    await pg.evaluate(() => { const f = document.querySelector(".screen.active .app"); if (f) f.scrollTop = 0; });
    const el = await pg.$(`#${id} .frame`);
    if (!el) { console.log(`MISS ${tag} ${id}`); continue; }
    // 프레임 안을 끝까지 담는다(풀페이지). .app 의 스크롤 높이만큼 프레임을 늘려 한 장으로 찍는다.
    const h = await pg.evaluate((id) => {
      const fr = document.querySelector(`#${id} .frame`); const app = fr.querySelector(".app");
      const full = Math.max(844, app ? app.scrollHeight + 120 : 844);
      fr.style.height = full + "px"; if (app) app.style.overflow = "visible";
      return full;
    }, id);
    await pg.setViewportSize({ width: 390, height: Math.min(h + 40, 4200) });
    await pg.waitForTimeout(260);
    await el.screenshot({ path: `${OUT}/${id}-${tag}-390-full.png` });
    await pg.evaluate((id) => { const fr = document.querySelector(`#${id} .frame`); fr.style.height = ""; const app = fr.querySelector(".app"); if (app) app.style.overflow = ""; }, id);
    await pg.setViewportSize({ width: 390, height: 844 });
    console.log(`ok ${tag} ${id}`);
  }
  await ctx.close();
}

await shoot(PREV, "v2");
await shoot(CUR, "v3");

// ── 모션 GIF: 화면 진입 애니메이션을 실제로 녹화한다(정지 캡처로는 판정 불가) ──
const vdir = resolve("/tmp/haenael-v3-motion");
await rm(vdir, { recursive: true, force: true });
for (const id of MOTION) {
  const ctx = await browser.newContext({
    viewport: { width: 440, height: 800 }, deviceScaleFactor: 2,
    recordVideo: { dir: vdir, size: { width: 440, height: 800 } },
  });
  const pg = await ctx.newPage();
  await pg.goto(CUR); await pg.waitForLoadState("load"); await pg.waitForTimeout(700);
  await pg.addStyleTag({ content: ".flowrail,.console,.review,.stagehint{display:none !important}body{padding-left:0 !important}.stage{padding:14px 0 !important;margin:0 !important;gap:0 !important}" });
  await pg.evaluate((s) => window.go(s), id);
  await pg.waitForTimeout(3200);
  if (id === "goaldetail" || id === "mypage" || id === "onboarding") {
    // 배너 선택기를 실제로 열고 프리셋을 눌러 배너가 바뀌는 것을 녹화한다(D-028-A)
    const host = await pg.$(`#${id} [data-cover-pick]`);
    if (host) {
      const cover = await pg.$(`#${id} .cover.photo`);
      if (cover) { await cover.click({ force: true }).catch(() => {}); await pg.waitForTimeout(900); }
      await pg.evaluate((id) => {
        const h = document.querySelector(`#${id} [data-cover-pick]`); if (h) h.style.display = "block";
        const c = document.querySelector(`#${id} .cover.photo`); if (c) c.scrollIntoView({ block: "center" });
      }, id);
      await pg.waitForTimeout(900);
      for (const ck of ["run", "money"]) {
        await pg.evaluate(({ id, ck }) => {
          const o = document.querySelector(`#${id} [data-cover-pick] .cp-opt[data-ck="${ck}"]`); if (o) o.click();
        }, { id, ck });
        await pg.waitForTimeout(1500);
      }
    }
  }
  const video = pg.video();
  await ctx.close();
  const src = await video.path();
  // 앞 2.4초는 셸(콘솔·플로우 레일)이 아직 떠 있는 적재 구간이라 잘라낸다
  execFileSync("ffmpeg", ["-y", "-ss", "2.4", "-i", src, "-vf", "fps=10,scale=440:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse", "-loop", "0", `${OUT}/${id}-v3-motion.gif`], { stdio: "ignore" });
  console.log(`gif ${id}`);
}
await browser.close();
console.log((await readdir(OUT)).length + " files");
