#!/usr/bin/env node
// lint-prototype-overflow.mjs — 프로토타입 제품 화면의 가로 넘침·고아 줄바꿈을 기계로 잡는다.
// 2026-10-19 신설. 왜: 회장이 직접 본 결함 11건 중 대부분이 텍스트 넘침·고아 줄바꿈이었고,
//   사후 전수 검사를 돌리니 26화면 19곳에서 44건이 그대로 검출됐다. 즉 "못 잡는" 결함이 아니라
//   "출고 전에 안 돌린" 결함이다. 그래서 출고 조건(0건)으로 못박는다.
//
// 검출 2축(회장 보고 본문의 정의 그대로):
//   A 가로 넘침   element.scrollWidth > element.clientWidth (+1px 허용). 의도적 가로 스크롤 요소는 제외.
//   B 고아 줄바꿈 Range.getClientRects() 로 실제 줄박스를 재고, 2줄 이상인데 마지막 줄 폭이 28px 미만.
//                 (= "지금까지 받은 금"/"액" 처럼 한두 글자만 떨어지는 그 모양)
//
// 범위: 제품 화면(section.screen 안의 .frame) 만. 검수 셸(우측 패널·좌측 플로우맵·콘솔·모션 도크·STAMP)은
//   제품이 아니므로 제외한다. 단 좌측 플로우맵은 회장이 직접 넘침을 지적했으므로 --shell 로 따로 본다.
//
// 사용: cd web && node ../scripts/qa/lint-prototype-overflow.mjs [프로토타입] [--shell] [--json]
import { createRequire } from 'node:module';
const require_ = createRequire(process.cwd() + '/x.js');
const { chromium } = require_('playwright');
import path from 'node:path';

const argv = process.argv.slice(2);
const WITH_SHELL = argv.includes('--shell');
const AS_JSON = argv.includes('--json');
const rest = argv.filter((a) => !a.startsWith('--'));
const target = path.resolve(rest[0] || '../docs/design/prototypes/social-viral-loop-v3-opus5.html');

const ORPHAN_MIN = 28;   // 마지막 줄 폭 하한(px). 이보다 좁으면 글자 한두 개만 떨어진 것.
const SLACK = 1;         // 가로 넘침 허용 오차(px). 서브픽셀 반올림 흡수.

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await pg.goto('file://' + target);
await pg.waitForLoadState('load');

await pg.addScriptTag({ content: `
window.__lint = function(rootSel, orphanMin, slack){
  const root = document.querySelector(rootSel);
  const out = { overflow: [], orphan: [] };
  if(!root) return out;
  const EXCL = '.review, .flowmap, .flowrail, .console, .motionbar, .stamp, .changelog, .coverage, .notes';
  const label = (el) => {
    const t = (el.textContent || '').replace(/\\s+/g,' ').trim().slice(0,40);
    const cls = el.className && typeof el.className === 'string' ? '.' + el.className.split(/\\s+/).filter(Boolean).slice(0,2).join('.') : '';
    return el.tagName.toLowerCase() + cls + (t ? ' «' + t + '»' : '');
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const els = [root, ...root.querySelectorAll('*')];
  for (const el of els) {
    if (el !== root && el.closest(EXCL)) continue;
    if (el.tagName === 'SVG' || el.tagName === 'svg' || el.closest('svg')) continue;
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    // A) 가로 넘침 — 의도적으로 가로 스크롤하는 캐러셀·탭 레일은 제외
    const scrollable = cs.overflowX === 'auto' || cs.overflowX === 'scroll';
    // overflow:hidden/clip 은 "잘림" 이다. 장식(그림자용 가상요소·scale 된 사진)이 잘리는 건 의도이므로 넘기고,
    // 글자가 잘리는 것만 결함으로 센다. 관리자 대시보드의 "88,964원" 이 44px 원에 갇힌 사고가 이 경우였다.
    const clipped = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (clipped && !hasOwnText) continue;
    if (!scrollable && el.scrollWidth > el.clientWidth + slack && el.clientWidth > 0) {
      out.overflow.push({ sel: label(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
    }
    // B) 고아 줄바꿈 — 텍스트만 담은 잎 요소에서 실제 줄박스를 잰다
    const kids = [...el.childNodes];
    const textKids = kids.filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (!textKids.length) continue;
    if (kids.some((n) => n.nodeType === 1 && getComputedStyle(n).display !== 'inline' && visible(n))) continue;
    if (cs.whiteSpace === 'nowrap' || cs.whiteSpace === 'pre') continue;
    const rg = document.createRange();
    rg.selectNodeContents(el);
    const rects = [...rg.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (rects.length < 2) continue;
    // 같은 줄로 묶는다. 인라인 자식 때문에 한 줄이 여러 rect 로 쪼개지고, 글자 크기가 다르면 top 도 다르다.
    // (예: 21px 제목 끝의 13px 편집 아이콘. top 이 달라도 같은 줄이다.) 그래서 세로 겹침으로 판정한다.
    const lines = [];
    for (const r of rects) {
      const ln = lines.find((l) => {
        const ov = Math.min(l.bottom, r.bottom) - Math.max(l.top, r.top);
        return ov > 0.5 * Math.min(l.bottom - l.top, r.bottom - r.top);
      });
      if (ln) { ln.left = Math.min(ln.left, r.left); ln.right = Math.max(ln.right, r.right);
                ln.top = Math.min(ln.top, r.top); ln.bottom = Math.max(ln.bottom, r.bottom); }
      else lines.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
    }
    if (lines.length < 2) continue;
    const last = lines[lines.length - 1];
    const w = last.right - last.left;
    if (w < orphanMin) {
      out.orphan.push({ sel: label(el), lines: lines.length, lastWidth: Math.round(w) });
    }
  }
  return out;
};
`});

const ids = await pg.evaluate(() =>
  [...document.querySelectorAll('section.screen')].map((s) => s.id).filter((i) => document.querySelector('#' + i + ' .frame')));

const report = [];
for (const id of ids) {
  await pg.evaluate((i) => window.go(i), id);
  await pg.waitForTimeout(650);   // 진입 모션(400ms)+stagger 가 끝난 뒤
  // 레이아웃을 재기 전에 애니메이션을 멈춘다. 카운트업 bump(scale 1.18)·부유 루프의 transform 이
  // 스크롤 영역을 순간적으로 넓혀 "넘침" 으로 잡히는데, 그건 레이아웃 결함이 아니라 그 순간의 변형이다.
  await pg.evaluate(() => document.getAnimations().forEach((a) => { try { a.cancel(); } catch {} }));
  await pg.waitForTimeout(120);
  const r = await pg.evaluate(([s, m, k]) => window.__lint(s, m, k), [`#${id} .frame`, ORPHAN_MIN, SLACK]);
  if (r.overflow.length || r.orphan.length) report.push({ id, ...r });
}

let shell = null;
if (WITH_SHELL) {
  shell = await pg.evaluate(([m, k]) => {
    const rail = document.querySelector('.flowmap') || document.querySelector('.flowrail');
    if (!rail) return null;
    const out = { overflow: [], orphan: [] };
    for (const el of [rail, ...rail.querySelectorAll('*')]) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
      if (el.scrollWidth > el.clientWidth + k && el.clientWidth > 0) {
        out.overflow.push({ sel: el.tagName.toLowerCase() + '.' + String(el.className || ''), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, text: (el.textContent||'').trim().slice(0,30) });
      }
    }
    return out;
  }, [ORPHAN_MIN, SLACK]);
}

await b.close();

const nOver = report.reduce((a, r) => a + r.overflow.length, 0);
const nOrph = report.reduce((a, r) => a + r.orphan.length, 0);
const nShell = shell ? shell.overflow.length : 0;

if (AS_JSON) {
  console.log(JSON.stringify({ target, screens: ids.length, nOver, nOrph, nShell, report, shell }, null, 2));
} else {
  console.log(`대상: ${target}`);
  console.log(`화면 ${ids.length}개 · 가로넘침 ${nOver}건 · 고아줄바꿈 ${nOrph}건` + (shell ? ` · 검수셸(플로우맵) 넘침 ${nShell}건` : ''));
  for (const r of report) {
    console.log(`\n[${r.id}]`);
    for (const o of r.overflow) console.log(`  넘침  ${o.scrollWidth} > ${o.clientWidth}  ${o.sel}`);
    for (const o of r.orphan) console.log(`  고아  ${r.id} ${o.lines}줄 · 마지막 ${o.lastWidth}px  ${o.sel}`);
  }
  if (shell) for (const o of shell.overflow) console.log(`\n[검수셸·플로우맵] 넘침 ${o.scrollWidth} > ${o.clientWidth}  ${o.text}`);
  console.log(`\n판정: ${nOver + nOrph + nShell === 0 ? 'PASS (0건)' : 'FAIL (' + (nOver + nOrph + nShell) + '건)'}`);
}
process.exit(nOver + nOrph + nShell === 0 ? 0 : 1);
