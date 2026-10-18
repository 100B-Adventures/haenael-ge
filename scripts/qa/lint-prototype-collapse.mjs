#!/usr/bin/env node
// lint-prototype-collapse.mjs — 접기·펼치기(아코디언) 규칙 위반을 기계로 잡는다.
// 2026-10-19 신설(R8). 왜: 5차에서 목표 관리의 '더보기/접기' 를 없애면서 다른 화면의 접힘은 그대로 뒀다.
//   한 곳에서 지우고 한 곳에서 남긴 기준이 문서에도 코드에도 없었고, 그래서 판마다 다른 답이 나왔다.
//   규칙 정본 = DESIGN.md "접기·펼치기 규칙". 프로토타입 안의 집행자 = COLLAPSE_POLICY + auditCollapse().
//
// 검출 3축
//   A 글자 토글    '더 보기'·'더보기'·'접기'·'펼치기'·'간략히' 가 토글 라벨로 쓰이면 결함. 토글은 꺾쇠(⌄) 하나다.
//   B 미선언 접힘  COLLAPSE_POLICY 에 없는 자리에서 접힘 UI 가 발견되면 결함.
//   C <details>    제품 화면에서 쓰지 않는다(접힌 내용을 summary 만으로 알 수 없고 기본 스타일이 토큰 밖으로 샌다).
//
// 범위: section.screen 안의 .frame 만. 검수 셸은 제품이 아니다.
// 사용: cd web && node ../scripts/qa/lint-prototype-collapse.mjs [프로토타입] [--json]
import { createRequire } from 'node:module';
const require_ = createRequire(process.cwd() + '/x.js');
const { chromium } = require_('playwright');
import path from 'node:path';

const argv = process.argv.slice(2);
const AS_JSON = argv.includes('--json');
const rest = argv.filter((a) => !a.startsWith('--'));
const target = path.resolve(rest[0] || '../docs/design/prototypes/social-viral-loop-v3-opus5.html');

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
await pg.goto('file://' + target);
await pg.waitForLoadState('load');

const res = await pg.evaluate(() => {
  const BANNED = ['더 보기', '더보기', '접기', '펼치기', '간략히'];
  // 프로토타입이 스스로 들고 있는 허용 목록을 읽는다. 검사기가 목록을 따로 들면 둘이 갈라진다.
  const allowed = typeof COLLAPSE_POLICY === 'object' ? Object.keys(COLLAPSE_POLICY) : [];
  const out = { noPolicy: !allowed.length, textToggle: [], undeclared: [], details: [] };
  const sid = (el) => ((el.closest('section.screen') || {}).id || '?');

  document.querySelectorAll('section.screen .frame').forEach((frame) => {
    // A·B 토글 라벨
    frame.querySelectorAll('button, summary, a, [role="button"], .cheer-more-lbl').forEach((el) => {
      const tx = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!BANNED.some((w) => tx === w || tx === '⌃ ' + w || tx === '⌄ ' + w)) return;
      const inPolicy = allowed.some((sel) => el.closest(sel));
      (inPolicy ? out.textToggle : out.undeclared).push({ screen: sid(el), text: tx });
    });
    // C <details>
    frame.querySelectorAll('details').forEach((d) => {
      const sm = d.querySelector('summary');
      out.details.push({ screen: sid(d), summary: (sm ? sm.textContent : '').trim().slice(0, 30) });
    });
  });
  return out;
});

await b.close();

const total = res.textToggle.length + res.undeclared.length + res.details.length + (res.noPolicy ? 1 : 0);

if (AS_JSON) {
  console.log(JSON.stringify(res, null, 2));
} else {
  console.log('대상:', target);
  if (res.noPolicy) console.log('⛔ COLLAPSE_POLICY 상수가 없다. 접힘 허용 목록을 코드에 두지 않으면 규칙이 집행되지 않는다.');
  for (const r of res.textToggle) console.log(`글자 토글   [${r.screen}] "${r.text}" → 꺾쇠(⌄) 하나로 바꾼다`);
  for (const r of res.undeclared) console.log(`미선언 접힘 [${r.screen}] "${r.text}" → COLLAPSE_POLICY 에 선언하거나 접힘을 없앤다`);
  for (const r of res.details) console.log(`<details>   [${r.screen}] "${r.summary}" → 제품 화면에서 쓰지 않는다`);
  console.log(`\n판정: ${total ? 'FAIL' : 'PASS'} (${total}건)`);
}
process.exit(total ? 1 : 0);
