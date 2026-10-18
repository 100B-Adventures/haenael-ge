#!/usr/bin/env node
// measure-motion-v4.mjs — 프로토타입 모션을 "회장이 보는 조건" 으로 잰다. 2026-10-17 신설, 10-18 screencast 전환.
//
// ★ 왜 screencast 인가 (이 함정에 다시 빠지지 마라)
//   CDP `Page.captureScreenshot`(= playwright page.screenshot)은 **compositor 스레드에서 도는
//   transform·opacity 애니메이션을 캡처하지 못한다.** 2026-10-17 실측: 워터마크가 9px 움직이고
//   점 opacity 가 0.999→0.74 로 변하는 동안에도 PNG 가 바이트 동일했다. 그래서 스크린샷 비교로
//   "픽셀 변화 0" 이 나와도 모션 부재가 아니다. 합성 결과를 보려면 `Page.startScreencast` 로
//   프레임을 받아야 하고, 그것이 회장 눈과 같은 경로다.
//
// 측정(화면마다):
//   1) 화면 이동 후 1.5초 대기 → 실행 중 애니메이션 수(정지 상태)
//   2) 그 상태로 1.3초 screencast → 프레임 수 / 고유 프레임 수   ← 지속 모션 판정
//   3) "▶ 다시 재생" 클릭(4초 타임아웃) + 1.2초 screencast → 고유 프레임 수   ← 다시 재생 판정
//   2-b) 같은 정지 상태에서 "화면 안에 보이는 요소의 렌더 값" 을 1초간 3회 샘플해 변화를 센다(DOM 진실).
//        헤드리스는 입력이 없고 합성 애니메이션만 도는 화면에서 프레임 생산을 멈춘다(2026-10-18 실측:
//        해낼게 관리·환전 내역이 정지 1.3초에 프레임 1개, 같은 세션의 다시 재생 구간에서는 37개).
//        실제 브라우저는 계속 그리므로 screencast 0 이 곧 정지가 아니다. 그래서 두 축을 함께 본다.
//   판정: (screencast 고유 ≥ 2 또는 렌더 값 변화 ≥ 1) 그리고 다시 재생 고유 ≥ 2.
//
// 사용: cd web && node ../scripts/qa/measure-motion-v4.mjs [프로토타입] [화면id ...] [--all]
//   인자 없으면 핵심 14화면(약 70초). --all 은 25화면 전수.
import { createRequire } from 'node:module';
const require_ = createRequire(process.cwd() + '/x.js');
const { chromium } = require_('playwright');
import path from 'node:path';

const argv = process.argv.slice(2);
const ALL = argv.includes('--all');
const rest = argv.filter((a) => !a.startsWith('--'));
const target = path.resolve(rest[0] || '../docs/design/prototypes/social-viral-loop-v3-opus5.html');
const only = rest.slice(1);
const CORE = ['home', 'goaldetail', 'mywordmap', 'connect', 'inviteaccept', 'friends', 'status', 'mypage',
  'cashhistory', 'belong', 'dopamine', 'landing', 'goalpublic', 'login'];

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = [];
pg.on('pageerror', (e) => errs.push(String(e.message)));
pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await pg.goto('file://' + target);
await pg.waitForLoadState('load');

// CDP 세션은 한 번만 연다. 화면마다 새로 열면 첫 프레임만 받고 끝난다(2026-10-17 시행착오).
const cdp = await pg.context().newCDPSession(pg);
let frames = [];
cdp.on('Page.screencastFrame', async (f) => {
  frames.push(f.data.length);
  try { await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
});
const record = async (ms, during) => {
  frames = [];
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 60, everyNthFrame: 1 });
  if (during) await during();
  await pg.waitForTimeout(ms);
  await cdp.send('Page.stopScreencast');
  return { n: frames.length, uniq: new Set(frames).size };
};

const all = await pg.evaluate(() => [...document.querySelectorAll('section.screen')].map((s) => s.id)
  .filter((i) => document.querySelector('#' + i + ' .frame')));
const ids = only.length ? only : (ALL ? all : CORE.filter((i) => all.includes(i)));
const rows = [];
for (const id of ids) {
  await pg.evaluate((i) => window.go(i), id);
  await pg.evaluate(() => { const c = document.getElementById('moLoop'); if (c && c.checked) { c.checked = false; window.toggleMotionLoop(c); } });
  await pg.waitForTimeout(1500);
  const running = await pg.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  const idle = await record(1300);
  // 2-b DOM 진실: 화면 안에 보이는 애니메이션 요소의 렌더 값이 실제로 변하는가
  const styleDelta = await pg.evaluate(async () => {
    const scr = document.querySelector('.screen.active');
    const fr = scr.querySelector('.frame').getBoundingClientRect();
    const targets = document.getAnimations()
      .filter((a) => a.playState === 'running' && a.effect && a.effect.target)
      .map((a) => a.effect.target)
      .filter((t) => { const r = t.getBoundingClientRect(); return r.width > 0 && r.top < Math.min(fr.bottom, innerHeight) && r.bottom > Math.max(fr.top, 0); });
    const extra = [...scr.querySelectorAll('.amb-float')].filter((t) => { const r = t.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight && r.bottom > 0; });
    const els = [...new Set([...targets, ...extra])];
    const snap = () => els.map((e) => { const c = getComputedStyle(e); return [c.transform, c.opacity, c.backgroundColor, c.color, c.marginTop, Math.round(e.getBoundingClientRect().top * 10)].join('|'); }).join(';');
    const a = snap();
    await new Promise((r) => setTimeout(r, 500));
    const b2 = snap();
    await new Promise((r) => setTimeout(r, 500));
    const c = snap();
    return { tracked: els.length, changes: (a !== b2 ? 1 : 0) + (b2 !== c ? 1 : 0) };
  });
  let clickOk = true;
  const replay = await record(1200, async () => {
    try { await pg.click('.motionbar .mb-play', { timeout: 4000 }); } catch { clickOk = false; }
  });
  const bar = await pg.evaluate(() => {
    const el = document.querySelector('.motionbar'); if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), inViewport: r.top >= 0 && r.bottom <= innerHeight + 1 };
  });
  const row = { id, running, idleFrames: idle.n, idleUniq: idle.uniq, tracked: styleDelta.tracked, styleChanges: styleDelta.changes, clickOk, replayUniq: replay.uniq, barTop: bar && bar.top, barInViewport: bar && bar.inViewport };
  rows.push(row);
  console.log(`${id.padEnd(14)} 실행중=${String(running).padStart(2)} 정지캐스트=${idle.uniq}/${idle.n} · 렌더값변화=${styleDelta.changes}/2(추적 ${styleDelta.tracked}) · 다시재생=${clickOk ? 'OK' : 'FAIL'} ${replay.uniq}고유 · 바top=${bar && bar.top}`);
}
await cdp.detach();
await b.close();
console.log('\nJSON=' + JSON.stringify(rows));
console.log('CONSOLE_ERRORS=' + errs.length);
const fail = rows.filter((r) => (r.idleUniq < 2 && r.styleChanges < 1) || !r.clickOk || r.replayUniq < 2);
console.log('미달 화면=' + (fail.length ? fail.map((r) => r.id).join(',') : '없음'));
process.exit(fail.length ? 1 : 0);
