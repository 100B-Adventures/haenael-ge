#!/usr/bin/env node
// capture-v2-design-revision-v4.mjs — 4차 개정 보드용 프로토타입 캡처. 390 CSS px · dSF3 · 프레임 풀스크롤.
// 검수 셸(콘솔·레일·검수패널·모션 도크)은 숨기고 제품 프레임만 찍는다.
// 사용: cd web && node ../scripts/qa/capture-v2-design-revision-v4.mjs <화면id ...>
import { createRequire } from 'node:module';
const require_ = createRequire(process.cwd() + '/x.js');
const { chromium } = require_('playwright');
import path from 'node:path';

const target = path.resolve('../docs/design/prototypes/social-viral-loop-v3-opus5.html');
const out = path.resolve('../docs/design/boards/shots/v2-design-revision-v4');
const screens = process.argv.slice(2);
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 3 });
await pg.goto('file://' + target);
await pg.waitForLoadState('load');
await pg.addStyleTag({ content: `
  .console,.flowrail,.review,.motionbar{display:none!important;}
  body{background:#FBFAF7!important;padding-left:0!important;}
  .stage{padding:0!important;gap:0!important;} .framecol{gap:0!important;}
  .frame{height:auto!important;min-height:844px;border-radius:0!important;border:0!important;box-shadow:none!important;}
  .app{overflow:visible!important;} .screen.active{display:block!important;} .tabbar{position:relative!important;}
`});
for (const id of screens) {
  await pg.evaluate((i) => window.go(i), id);
  await pg.waitForTimeout(400);
  await pg.evaluate((i) => window.wmCloudAll(document.getElementById(i)), id);  // 캡처용 폭 변경 후 워드맵 재배치
  await pg.waitForTimeout(900);
  const el = await pg.$('.screen.active .frame');
  await el.screenshot({ path: path.join(out, `${id}-v4-390-full.png`) });
  console.log('shot', id);
}
await b.close();
