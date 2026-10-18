#!/usr/bin/env node
// lint-prototype-interact.mjs — 프로토타입을 "재지" 말고 "눌러본다".
//
// 2026-10-19 신설. 왜 이 검사가 생겼나(회장 지적 ev-20261019-04):
//   출고 전 자가검수 3종(overflow lint · CSS 매칭 · motion screencast)은 전부 **정적 단일 화면의 1축**만
//   측정한다. 회장이 직접 조작해 찾은 결함 8건 중 그 3종에 걸린 것은 0건이었다. 걸릴 수가 없다.
//     - fixed CTA 가 스크롤 콘텐츠를 덮는 것은 z축 교차이고 scrollWidth 와 무관하다
//     - cover picker 의 선택 상태 리셋·체크 2개는 클릭 **후**에만 나타난다
//     - 인칭·높임 혼용은 레이아웃이 아니라 문자열이다
//     - onclick 이 붙었지만 아무것도 안 하는 컨트롤은 렌더만 보면 정상이다
//   그래서 구멍마다 검사를 하나 더 만드는 대신(§9 주먹구구 금지) **상호작용을 실제로 실행하는 단일 검사**로
//   네 축을 한 번에 본다. 새 결함 종류가 나오면 이 파일에 축을 추가하고 스크립트를 새로 만들지 않는다.
//
// 검출 4축:
//   A 겹침(z축)   position:fixed|sticky 요소의 사각형이 같은 화면 스크롤 콘텐츠의 마지막 블록과 교차.
//                 = "워드맵이랑 응원 버튼 겹치는데?" 그 모양. 콘텐츠 하단 여백이 CTA 높이를 못 덮은 것.
//   B 단일선택 위반  하나만 켜져야 하는 그룹(role=radio / [data-pick] / .cover-opt 류)에서 선택 표시가 2개 이상.
//                 클릭 전과 클릭 후 둘 다 본다. = "체크표시는 두개냐고" 그 모양.
//   C 죽은 조작    클릭 가능 요소를 눌렀는데 ①화면 전환 0 ②DOM 변화 0 ③스크롤 변화 0. 아무 반응이 없는 컨트롤.
//   D 카피 규칙    인칭·높임 혼용(반말 지시어 + 존댓말 종결), em dash, AI 투 상투어.
//                 = "네 응원이 여기 쌓였어요" 그 모양.
//   F 여백 비대칭  **카드 안에서만** 본다. 카드(배경·테두리·둥근 모서리를 가진 박스)의 위아래 padding 이
//                 다르거나, 카드 안 한 줄 캡션의 위 공간과 아래 공간이 다르다.
//                 = "'카카오톡으로 이렇게 전해져요' 위 여백은 아래 여백이랑 다른거냐" 그 모양.
//                 2026-10-19 실측: connect 화면의 .kprev 카드 안에서 캡션 위 18px, 아래 8px.
//                 ★범위를 카드로 좁힌 이유: 처음에 모든 컨테이너를 보니 77건이 나왔고 대부분 오탐이었다.
//                 섹션 제목(h1~h6) 위를 넓게 두는 것은 타이포그래피 표준이고, 화면 전체 패딩에서
//                 하단을 더 주는 것도 표준 관행이다. 의도와 실수를 기계가 구별할 수 있는 범위가
//                 "한 카드 안의 대칭" 이다. 카드는 테두리가 눈에 보이므로 비대칭이 바로 읽힌다.
//                 ★그런데 카드로 좁혀도 8건 중 회장 지적과 일치하는 것은 1건이고 6건은 "라벨 + 그 값"
//                 묶음(위 11px / 아래 3px 처럼 작게 벌어진 것)으로 정상이었다. 의도와 실수를 이 축이
//                 안정적으로 구별하지 못한다. 그래서 **F 는 경고이고 종료코드에 넣지 않는다.**
//                 거짓 경보를 차단 조건으로 세우면 린트 전체가 무시되고, 그것이 린트를 죽이는 길이다.
//                 근본 처방은 수직 간격을 spacing scale 토큰으로 정의하고 카드 내부 여백을 그 토큰으로
//                 통일하는 것이다(DESIGN.md 과제). 토큰이 생기면 이 축을 "토큰 밖 값" 검사로 바꾼다.
//   E 왕복 상태소실 선택을 바꾼 뒤 다른 화면을 거쳐 돌아오면 그 선택이 기본값으로 되돌아간다.
//                 = "내 사진 올리기 하려고 하면 왜 자동으로 다시 포인터 세팅되고" 그 모양.
//                 2026-10-19 실측: bannerupload 에서 사진을 적용하고 온보딩으로 돌아오면
//                 선택이 사용자가 고른 것이 아니라 기본 프리셋(공부·시험)으로 리셋된다.
//
// 범위: 제품 화면(section.screen 안의 .frame)만. 검수 셸(우측 패널·플로우맵·콘솔·모션 도크·STAMP)은 제품이 아니다.
// 사용: cd web && node ../scripts/qa/lint-prototype-interact.mjs [프로토타입] [--json] [--axis=A,B,C,D]
import { createRequire } from 'node:module';
const require_ = createRequire(process.cwd() + '/x.js');
const { chromium } = require_('playwright');
import path from 'node:path';

const argv = process.argv.slice(2);
const AS_JSON = argv.includes('--json');
const axisArg = (argv.find((a) => a.startsWith('--axis=')) || '').slice(7);
const AXES = new Set((axisArg || 'A,B,C,D,E,F').split(',').map((s) => s.trim().toUpperCase()));
const rest = argv.filter((a) => !a.startsWith('--'));
const target = path.resolve(rest[0] || '../docs/design/prototypes/social-viral-loop-v3-opus5.html');

const OVERLAP_MIN = 4;
const SPACING_MIN_DIFF = 8;   // 위아래 공간 차이 하한(px). 이보다 작으면 시각적으로 비대칭으로 읽히지 않는다.        // 교차 높이 하한(px). 서브픽셀·테두리 겹침은 결함이 아니다.
const CLICK_BUDGET = 14;      // 화면당 클릭 상한. 전수는 조합 폭발이라 상위 N개만 본다.

const SHELL = '.review, .flowmap, .flowrail, .console, .motionbar, .stamp, .changelog, .coverage, .notes';

// ── 자기검증(self-test): 본 검사 전에 픽스처를 먼저 돌린다 ──────────────────────────
// 왜: 2026-10-19 이 린트를 신설한 직후, addScriptTag 의 템플릿 리터럴이 정규식 이스케이프를
//   먹어(백틱 문자열에서 백슬래시 s 는 그냥 s 가 된다) 카피 축이 조용히 전건 PASS 를 냈다.
//   "결함 0건" 과 "린트 고장" 은 출력이 똑같아서 구별할 수단이 없었다. 구별할 수단이 없는
//   검사는 장식이고, 장식을 통과로 세면 그 자리에서 회장이 first QA 를 하게 된다.
//   그래서 4축 각각에 알려진 결함을 심은 픽스처를 두고, 매 실행 전에 그것을 못 잡으면 본 검사를
//   아예 돌리지 않고 종료코드 2 로 멈춘다. 끄기 = SKIP_SELFTEST=1 (CI 에서는 끄지 마라).
async function selfTest(){
  const fx = path.resolve(new URL('./fixtures/interact-known-defects.html', import.meta.url).pathname);
  const { execFileSync } = await import('node:child_process');
  let out;
  try {
    out = execFileSync(process.execPath,
      [new URL(import.meta.url).pathname, fx, '--json'],
      { env: { ...process.env, SKIP_SELFTEST: '1' }, encoding: 'utf8', timeout: 180000 });
  } catch (e) {
    out = (e.stdout || '').toString();          // 픽스처는 FAIL 이 정상이므로 비0 종료를 흡수한다
  }
  let r;
  try { r = JSON.parse(out); } catch { return { ok:false, why:'픽스처 실행 출력을 파싱할 수 없다' }; }
  const dead = ['A','B','C','D','E','F'].filter((k,i)=>[r.nA,r.nB,r.nC,r.nD,r.nE,r.nF][i] === 0);
  return dead.length
    ? { ok:false, why:`픽스처에 심어 둔 결함을 축 ${dead.join('·')} 가 잡지 못했다(각 축 >=1 이어야 한다). 린트가 고장난 것이지 결함이 없는 것이 아니다.`, counts:r }
    : { ok:true, counts:{ A:r.nA, B:r.nB, C:r.nC, D:r.nD, E:r.nE, F:r.nF } };
}

const IS_FIXTURE = /interact-known-defects\.html$/.test(target);
if (!IS_FIXTURE && process.env.SKIP_SELFTEST !== '1') {
  const st = await selfTest();
  if (!st.ok) {
    console.error(`\u26d4 자기검증 실패: ${st.why}`);
    process.exit(2);
  }
  if (!AS_JSON) console.log(`자기검증 통과(픽스처 A${st.counts.A}·B${st.counts.B}·C${st.counts.C}·D${st.counts.D}·E${st.counts.E}·F${st.counts.F})`);
}


// ── 시나리오: 다중 단계 경로 회귀 ────────────────────────────────────────────────
// 축 검사(A~E)는 한 화면 또는 단순 왕복만 본다. 회장이 조작으로 찾은 결함 중에는
// "화면 A 에서 고르고 -> 화면 B 로 가서 적용하고 -> 화면 A 로 돌아오니 선택이 리셋" 처럼
// 여러 단계를 거쳐야 드러나는 것이 있다. 그런 경로는 fixtures/interact-scenarios.json 에
// 한 줄로 추가한다. 새 검사 스크립트를 만들지 않는다(CLAUDE.md §9).
async function runScenarios(page){
  const fs = await import('node:fs');
  const file = new URL('./fixtures/interact-scenarios.json', import.meta.url).pathname;
  if(!fs.existsSync(file)) return [];
  const { scenarios } = JSON.parse(fs.readFileSync(file,'utf8'));
  const fails = [];
  for(const sc of scenarios||[]){
    const marks = {};
    let failed = null;
    for(const st of sc.steps||[]){
      try {
        if(st.go){ await page.evaluate((x)=>window.go(x), st.go); await page.waitForTimeout(520); }
        else if(st.click){
          const ok = await page.evaluate((sel)=>{ const el=document.querySelector(sel); if(!el) return false;
            el.scrollIntoView({block:'center'}); el.click(); return true; }, st.click);
          if(!ok){ failed = `단계 실패: 선택자를 찾지 못했다 (${st.click})`; break; }
          await page.waitForTimeout(400);
        }
        else if(st.call){
          const ok = await page.evaluate((fn)=>{ if(typeof window[fn]!=='function') return false; window[fn](); return true; }, st.call);
          if(!ok){ failed = `단계 실패: 전역 함수가 없다 (${st.call}())`; break; }
          await page.waitForTimeout(520);
        }
        else if(st.wait){ await page.waitForTimeout(st.wait); }
        else if(st.mark){ marks[st.mark] = await page.evaluate((s2)=>window.__ix.pickFingerprint(s2), st.fingerprint); }
        else if(st.expect){
          const now = await page.evaluate((s2)=>window.__ix.pickFingerprint(s2), st.expect.fingerprintOf);
          if(st.expect.notMatches){
            if(new RegExp(st.expect.notMatches).test(now)){
              failed = `${st.expect.message||'기대와 다르다'} (해시 "${now}" 가 금지 패턴 /${st.expect.notMatches}/ 에 걸렸다)`; break;
            }
          } else {
            const want = String(st.expect.equals||'').startsWith('mark:')
              ? marks[String(st.expect.equals).slice(5)] : st.expect.equals;
            if(now !== want){ failed = `${st.expect.message||'기대와 다르다'} (기대 "${want}" / 실제 "${now}")`; break; }
          }
        }
      } catch(e){ failed = `단계 예외: ${String(e.message||e).slice(0,90)}`; break; }
    }
    if(failed) fails.push({ id: sc.id, why: sc.why, detail: failed });
  }
  return fails;
}

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await pg.goto('file://' + target);
await pg.waitForLoadState('load');

// String.raw 필수: 평범한 템플릿 리터럴은 정규식의 백슬래시 s·d 를 먹어 버린다.
// 2026-10-19 실측: 이것 때문에 카피 축이 조용히 전건 PASS 를 냈다.
await pg.addScriptTag({ content: String.raw`
window.__ix = {
  shellSel: ${JSON.stringify(SHELL)},

  // ── A 겹침: fixed/sticky 가 스크롤 콘텐츠의 마지막 블록을 덮는가 ─────────────
  overlap(frameSel, minH){
    const frame = document.querySelector(frameSel);
    if(!frame) return [];
    const out = [];
    const fixed = [...frame.querySelectorAll('*')].filter(el=>{
      if(el.closest(this.shellSel)) return false;
      const cs = getComputedStyle(el);
      // absolute + z-index 도 떠 있는 레이어다. 폰 프레임을 모사하는 프로토타입에서는
      // 하단 고정 CTA 가 fixed 가 아니라 absolute + z-index 로 구현된다(.gp-cta z=12).
      const floats = cs.position==='fixed' || cs.position==='sticky'
                  || (cs.position==='absolute' && cs.zIndex!=='auto' && Number(cs.zIndex) >= 2);
      if(!floats) return false;
      if(cs.display==='none' || cs.visibility==='hidden' || parseFloat(cs.opacity)===0) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 120 && r.height >= 24;   // 장식용 작은 absolute 는 레이어로 세지 않는다
    });
    if(!fixed.length) return out;
    // 스크롤 콘텐츠의 "마지막으로 보이는 블록" 후보: frame 안의 블록 요소 중 가장 아래 있는 것들
    const blocks = [...frame.querySelectorAll('*')].filter(el=>{
      if(el.closest(this.shellSel)) return false;
      if(fixed.includes(el) || fixed.some(f=>f.contains(el))) return false;
      const cs = getComputedStyle(el);
      if(cs.display==='none' || cs.visibility==='hidden') return false;
      if(cs.position==='fixed'||cs.position==='sticky') return false;
      const r = el.getBoundingClientRect();
      if(r.width<=0 || r.height<=0) return false;
      // 텍스트나 이미지를 직접 들고 있는 말단만(컨테이너 전체를 세면 노이즈)
      const hasOwnText = [...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim());
      return hasOwnText || el.tagName==='IMG' || el.tagName==='CANVAS' || el.tagName==='SVG';
    });
    for(const f of fixed){
      const fr = f.getBoundingClientRect();
      for(const el of blocks){
        const r = el.getBoundingClientRect();
        const ih = Math.min(fr.bottom, r.bottom) - Math.max(fr.top, r.top);
        const iw = Math.min(fr.right, r.right) - Math.max(fr.left, r.left);
        if(ih>=minH && iw>=minH){
          out.push({
            fixed: f.tagName.toLowerCase()+'.'+String(f.className||'').split(' ')[0],
            fixedText: (f.textContent||'').trim().slice(0,24),
            covered: el.tagName.toLowerCase()+'.'+String(el.className||'').split(' ')[0],
            coveredText: (el.textContent||'').trim().slice(0,30),
            overlapPx: Math.round(ih)
          });
        }
      }
    }
    // 같은 fixed 가 여러 블록을 덮으면 가장 큰 것 하나만 보고(노이즈 억제)
    const best = new Map();
    for(const o of out){ const k=o.fixed; if(!best.has(k)||best.get(k).overlapPx<o.overlapPx) best.set(k,o); }
    return [...best.values()];
  },

  // ── B 단일선택 위반: 하나만 켜져야 하는 그룹에 선택 표시가 둘 이상 ──────────
  multiSelect(frameSel){
    const frame = document.querySelector(frameSel);
    if(!frame) return [];
    const ON = '.on,.sel,.selected,.active,.checked,.is-on,[aria-checked="true"],[aria-selected="true"],[data-selected="true"]';
    const out = [];
    // 그룹은 셀렉터 목록으로 못박지 않고 구조에서 유도한다. 하드코딩 목록은 class 이름이
    // 다른 그룹을 조용히 통과시킨다(2026-10-19 실측: .cp-opt.sel 을 놓쳤다).
    // 유도 규칙 = "같은 부모 아래, 같은 선두 class 를 가진 형제가 3개 이상인 묶음" 을 단일선택 후보로 본다.
    const groups = new Set([
      ...frame.querySelectorAll('[role="radiogroup"],[data-pick],[data-cover-pick],.cover-pick,.picker,.seg,.chips')
    ]);
    for(const parent of frame.querySelectorAll('*')){
      if(parent.closest(this.shellSel)) continue;
      const kids = [...parent.children];
      if(kids.length < 3) continue;
      const tally = new Map();
      for(const k of kids){
        const lead = String(k.className||'').split(' ')[0];
        if(!lead) continue;
        tally.set(lead, (tally.get(lead)||0) + 1);
      }
      for(const [,n] of tally) if(n >= 3){ groups.add(parent); break; }
    }
    for(const g of groups){
      if(g.closest(this.shellSel)) continue;
      const on = [...g.querySelectorAll(ON)].filter(el=>{
        // 중첩 그룹의 자손이 섞이지 않게 자기 그룹 소속만 본다
        if(el.parentElement && el.parentElement.closest('[role="radiogroup"],[data-cover-pick]') &&
           !g.contains(el.parentElement.closest('[role="radiogroup"],[data-cover-pick]'))) return false;
        const cs=getComputedStyle(el);
        return cs.display!=='none' && cs.visibility!=='hidden';
      });
      // 같은 깊이(형제 레벨)에서 둘 이상 켜진 경우만 위반. 조상-자손 동시 on 은 구조상 정상일 수 있다.
      const byParent = new Map();
      for(const el of on){ const k=el.parentElement; byParent.set(k,(byParent.get(k)||[]).concat([el])); }
      for(const [,list] of byParent){
        if(list.length>1){
          out.push({
            group: g.tagName.toLowerCase()+'.'+String(g.className||'').split(' ')[0],
            count: list.length,
            items: list.map(e=>(e.textContent||'').trim().slice(0,18) || String(e.className||'').split(' ')[0])
          });
        }
      }
    }
    return out;
  },

  // ── 클릭 후보 열거 ─────────────────────────────────────────────────────────
  clickables(frameSel, budget){
    const frame = document.querySelector(frameSel);
    if(!frame) return [];
    const sel = 'button,[onclick],a[href^="#"],a:not([href]),[role="switch"],[role="button"],[role="tab"],summary,label[for],input[type="radio"],input[type="checkbox"],[data-pick] > *,[data-cover-pick] > *';
    const list = [...frame.querySelectorAll(sel)].filter(el=>{
      if(el.closest(this.shellSel)) return false;
      const cs = getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden'||cs.pointerEvents==='none') return false;
      const r = el.getBoundingClientRect();
      return r.width>=8 && r.height>=8;
    });
    // 중복 제거: 조상이 이미 후보면 자손은 뺀다
    const top = list.filter(el=>!list.some(o=>o!==el && o.contains(el)));
    return top.slice(0,budget).map((el,i)=>{
      el.setAttribute('data-ixid', String(i));
      return { ixid:i, tag:el.tagName.toLowerCase(), cls:String(el.className||'').split(' ')[0],
               text:(el.textContent||'').trim().slice(0,28) };
    });
  },

  // ── E 왕복 상태소실: 켜져 있는 선택의 해시 ──────────────────────────────────
  // "무엇이 몇 개 켜졌나" 가 아니라 "어느 항목이 켜졌나" 를 비교해야 리셋을 잡는다.
  // 개수만 보면 study -> health 리셋이 1개 -> 1개 라서 통과한다(2026-10-19 실측).
  pickFingerprint(frameSel){
    const frame = document.querySelector(frameSel);
    if(!frame) return '';
    const ON = '.on,.sel,.selected,.checked,.is-on,[aria-checked="true"],[aria-selected="true"]';
    // 모달(바텀시트·다이얼로그)은 '선택' 이 아니라 떠 있는 레이어다. 화면을 떠나면 닫히는 것이 정상 동작이므로
    // 왕복 비교에서 제외한다. 역할로 판정한다(class 이름으로 예외를 두면 다음 컴포넌트에서 또 샌다).
    const MODAL = '[role="dialog"],[aria-modal="true"]';
    return [...frame.querySelectorAll(ON)]
      .filter(el=>!el.closest(MODAL))
      .filter(el=>{ const cs=getComputedStyle(el); return cs.display!=='none' && cs.visibility!=='hidden'; })
      .map(el=>String(el.className||'').split(' ')[0]+':'+((el.dataset&&el.dataset.ck)||(el.textContent||'').trim().slice(0,12)))
      .sort().join('|');
  },

  // ── F 여백 비대칭 ───────────────────────────────────────────────────────────
  // 두 가지만 본다. 오탐을 줄이려고 "의도적으로 다를 수 있는" 경우는 제외한다.
  //   F1 컨테이너의 padding-top 과 padding-bottom 이 다름(차이 >= minDiff)
  //   F2 한 줄 라벨(짧은 텍스트, 1줄)의 위 공간과 아래 공간이 다름(차이 >= minDiff)
  //      위 공간 = 이전 형제와의 간격, 없으면 부모 padding-top
  //      아래 공간 = 다음 형제와의 간격, 없으면 부모 padding-bottom
  // 섹션 제목처럼 위를 넓게 두는 것이 의도인 경우가 있으므로 라벨은 24자 이하 1줄만 본다.
  spacing(frameSel, minDiff){
    const frame = document.querySelector(frameSel);
    if(!frame) return [];
    const out = [];
    const px = v => parseFloat(v) || 0;
    // 카드 = 배경이 깔렸거나 테두리가 있거나 모서리가 둥근 박스. 테두리가 눈에 보이므로 비대칭이 읽힌다.
    const isCard = (el) => {
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor || '';
      const hasBg = bg && bg !== 'transparent' && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(bg);
      const hasBorder = px(cs.borderTopWidth) > 0 || px(cs.borderLeftWidth) > 0;
      const hasRadius = px(cs.borderTopLeftRadius) >= 6;
      const hasShadow = cs.boxShadow && cs.boxShadow !== 'none';
      return (hasBg || hasBorder || hasShadow) && hasRadius;
    };
    for(const el of frame.querySelectorAll('*')){
      if(el.closest(this.shellSel)) continue;
      const cs = getComputedStyle(el);
      if(cs.display==='none' || cs.visibility==='hidden') continue;
      const r = el.getBoundingClientRect();
      if(r.width < 80 || r.height <= 0) continue;

      // F1 카드 자신의 위아래 padding 비대칭
      if(el.children.length >= 2 && isCard(el)){
        const pt = px(cs.paddingTop), pb = px(cs.paddingBottom);
        if(pt>0 && pb>0 && Math.abs(pt-pb) >= minDiff){
          out.push({ kind:'카드 위아래 padding 비대칭', sel:el.tagName.toLowerCase()+'.'+String(el.className||'').split(' ')[0],
                     top:Math.round(pt), bottom:Math.round(pb), text:(el.textContent||'').trim().slice(0,24) });
        }
      }

      // F2 카드 안 한 줄 캡션의 위아래 공간 비대칭
      if(/^H[1-6]$/.test(el.tagName)) continue;          // 제목은 위를 넓게 두는 것이 표준이다
      const txt = (el.textContent||'').trim();
      const ownText = [...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim());
      if(!ownText || txt.length===0 || txt.length>24) continue;
      if(r.height > 30) continue;
      const parent = el.parentElement; if(!parent) continue;
      if(!isCard(parent)) continue;                      // 카드 안이 아니면 보지 않는다
      const pcs = getComputedStyle(parent);
      if(pcs.display === 'flex' || pcs.display === 'grid') continue;
      const prev = el.previousElementSibling, next = el.nextElementSibling;
      const above = prev ? Math.round(r.top - prev.getBoundingClientRect().bottom) : Math.round(px(pcs.paddingTop));
      const below = next ? Math.round(next.getBoundingClientRect().top - r.bottom) : Math.round(px(pcs.paddingBottom));
      if(above >= 0 && below >= 0 && Math.abs(above-below) >= minDiff){
        out.push({ kind:'카드 안 캡션 위아래 공간 비대칭', sel:el.tagName.toLowerCase()+'.'+String(el.className||'').split(' ')[0],
                   top:above, bottom:below, text:txt.slice(0,24) });
      }
    }
    const seen = new Set();
    return out.filter(o=>{ const k=o.kind+'|'+o.sel+'|'+o.text; if(seen.has(k)) return false; seen.add(k); return true; });
  },

  snapshot(frameSel){
    const frame = document.querySelector(frameSel);
    const sc = frame ? frame.querySelector('[class*=scroll],.body,.sheet') : null;
    return {
      screen: (document.querySelector('section.screen.active')||{}).id || '',
      html: frame ? frame.innerHTML.length : 0,
      onCount: frame ? frame.querySelectorAll('.on,.sel,.selected,.active,[aria-checked="true"]').length : 0,
      scroll: sc ? sc.scrollTop : (window.scrollY||0)
    };
  },

  // ── D 카피 규칙 ────────────────────────────────────────────────────────────
  copy(frameSel){
    const frame = document.querySelector(frameSel);
    if(!frame) return [];
    const out = [];
    const AI = ['열리는 것들','열리는 자리','당신만의','특별한 순간을','여정을 시작','함께 만들어가','새로운 가능성'];
    const walk = document.createTreeWalker(frame, NodeFilter.SHOW_TEXT);
    let n;
    while((n = walk.nextNode())){
      const el = n.parentElement;
      if(!el || el.closest(this.shellSel)) continue;
      const cs = getComputedStyle(el);
      if(cs.display==='none'||cs.visibility==='hidden') continue;
      const t = n.textContent.trim();
      if(t.length < 4) continue;
      // 인칭·높임 혼용: 반말 2인칭 지시어와 존댓말 종결이 같은 문장에
      for(const s of t.split(/(?<=[.!?。])\s+/)){
        // "네" 는 2인칭 소유격일 때만 반말이다. 수사(네 번째·네 개)·감탄(네!)·종결(~네요)은 아니다.
        // 2026-10-19 실측 오탐: status 화면 "네 번째 메달을 받았어요" 가 혼용으로 잡혔다.
        const casual = /(^|[\s"'“(])(너|너의|니)([\s가-힣]|$)/.test(s)
          || (/(^|[\s"'“(])네\s/.test(s) && !/네\s*(번째|개|명|가지|번|자리|살)/.test(s));
        const polite = /(요|습니다|세요|예요|에요)[.!?"'”)]?\s*$/.test(s.trim());
        if(casual && polite) out.push({ kind:'인칭·높임 혼용', text:s.trim().slice(0,70), sel:el.tagName.toLowerCase()+'.'+String(el.className||'').split(' ')[0] });
      }
      if(/[—–]/.test(t)) out.push({ kind:'em dash', text:t.slice(0,70), sel:el.tagName.toLowerCase()+'.'+String(el.className||'').split(' ')[0] });
      for(const a of AI) if(t.includes(a)) out.push({ kind:'AI 투 상투어: '+a, text:t.slice(0,70), sel:el.tagName.toLowerCase()+'.'+String(el.className||'').split(' ')[0] });
    }
    // 같은 문장이 여러 노드에 중복되면 한 번만
    const seen = new Set();
    return out.filter(o=>{ const k=o.kind+'|'+o.text; if(seen.has(k)) return false; seen.add(k); return true; });
  }
};
`});

const ids = await pg.evaluate(() =>
  [...document.querySelectorAll('section.screen')].map((s) => s.id).filter((i) => document.querySelector('#' + i + ' .frame')));

const report = [];
for (const id of ids) {
  const frameSel = `#${id} .frame`;
  await pg.evaluate((i) => window.go(i), id);
  await pg.waitForTimeout(650);
  await pg.evaluate(() => document.getAnimations().forEach((a) => { try { a.cancel(); } catch {} }));
  await pg.waitForTimeout(100);

  const row = { id, overlap: [], multi: [], dead: [], copy: [], lost: [], space: [] };

  if (AXES.has('A')) row.overlap = await pg.evaluate(([s, m]) => window.__ix.overlap(s, m), [frameSel, OVERLAP_MIN]);
  if (AXES.has('D')) row.copy = await pg.evaluate((s) => window.__ix.copy(s), frameSel);
  if (AXES.has('F')) row.space = await pg.evaluate(([s, m]) => window.__ix.spacing(s, m), [frameSel, SPACING_MIN_DIFF]);
  if (AXES.has('B')) row.multi = await pg.evaluate((s) => window.__ix.multiSelect(s), frameSel);

  if (AXES.has('B') || AXES.has('C')) {
    const cands = await pg.evaluate(([s, b2]) => window.__ix.clickables(s, b2), [frameSel, CLICK_BUDGET]);
    for (const c of cands) {
      // 매 클릭 전에 화면을 원점으로 되돌린다(앞 클릭이 만든 상태가 다음 판정을 오염시키지 않게)
      await pg.evaluate((i) => window.go(i), id);
      await pg.waitForTimeout(260);
      const before = await pg.evaluate((s) => window.__ix.snapshot(s), frameSel);
      const hit = await pg.evaluate(([s, ix]) => {
        const el = document.querySelector(`${s} [data-ixid="${ix}"]`);
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        el.click();
        return true;
      }, [frameSel, c.ixid]).catch(() => false);
      if (!hit) continue;
      await pg.waitForTimeout(340);
      const after = await pg.evaluate((s) => window.__ix.snapshot(s), frameSel);

      if (AXES.has('C')) {
        const changed = before.screen !== after.screen || before.html !== after.html
          || before.onCount !== after.onCount || Math.abs(before.scroll - after.scroll) > 2;
        if (!changed) row.dead.push({ ...c });
      }
      if (AXES.has('B') && before.screen === after.screen) {
        const m = await pg.evaluate((s) => window.__ix.multiSelect(s), frameSel);
        for (const v of m) row.multi.push({ ...v, after: c.text || c.cls });
      }
    }
  }

  // ── E 왕복 상태소실 ──────────────────────────────────────────────────────────
  if (AXES.has('E')) {
    const picks = await pg.evaluate((s2) => {
      const frame = document.querySelector(s2);
      if (!frame) return [];
      const ON = '.on,.sel,.selected,.checked,[aria-checked="true"]';
      // 선택 표시를 가진 요소의 "형제들" 이 선택 그룹이다. 그 그룹에서 지금 안 켜진 것을 하나 고른다.
      const on = [...frame.querySelectorAll(ON)].find((el) => {
        const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden';
      });
      if (!on || !on.parentElement) return [];
      // 그룹의 형제를 선두 class 로만 찾으면, 선택 class 가 유일한 class 인 형태
      // (<div class="on"> 과 <div>)에서 형제를 못 찾는다. 같은 tagName 이면 형제로 본다.
      const lead = String(on.className || '').split(' ')[0];
      const sibs = [...on.parentElement.children].filter((el) => el !== on && (
        el.tagName === on.tagName ||
        (lead && String(el.className || '').split(' ')[0] === lead)
      ));
      if (!sibs.length) return [];
      sibs[Math.min(1, sibs.length - 1)].setAttribute('data-ixpick', '1');
      return [{ lead, text: (sibs[Math.min(1, sibs.length - 1)].textContent || '').trim().slice(0, 18) }];
    }, frameSel);

    if (picks.length) {
      const clicked = await pg.evaluate((s2) => {
        const el = document.querySelector(`${s2} [data-ixpick="1"]`);
        if (!el) return false;
        el.scrollIntoView({ block: 'center' }); el.click(); return true;
      }, frameSel).catch(() => false);
      if (clicked) {
        await pg.waitForTimeout(380);
        const fpBefore = await pg.evaluate((s2) => window.__ix.pickFingerprint(s2), frameSel);
        const wentTo = await pg.evaluate(() => (document.querySelector('section.screen.active') || {}).id || '');
        if (wentTo === id && fpBefore) {
          // 다른 화면을 한 번 거쳐 돌아온다
          const other = ids.find((x) => x !== id) || 'home';
          await pg.evaluate((x) => window.go(x), other);
          await pg.waitForTimeout(300);
          await pg.evaluate((x) => window.go(x), id);
          await pg.waitForTimeout(450);
          const fpAfter = await pg.evaluate((s2) => window.__ix.pickFingerprint(s2), frameSel);
          if (fpAfter !== fpBefore) {
            row.lost.push({ picked: picks[0].text || picks[0].lead, before: fpBefore.slice(0, 60), after: fpAfter.slice(0, 60), via: other });
          }
        }
      }
    }
  }

  // 같은 위반이 클릭마다 반복 보고되는 것 억제
  const seen = new Set();
  row.multi = row.multi.filter((v) => { const k = v.group + '|' + v.count + '|' + (v.items || []).join(','); if (seen.has(k)) return false; seen.add(k); return true; });

  if (row.overlap.length || row.multi.length || row.dead.length || row.copy.length || row.lost.length || row.space.length) report.push(row);
}

// 시나리오는 축 검사가 끝난 뒤 깨끗한 상태에서 돌린다
let scenarioFails = [];
if (!IS_FIXTURE && !argv.includes('--no-scenarios')) {
  await pg.goto('file://' + target);
  await pg.waitForLoadState('load');
  await pg.addScriptTag({ content: String.raw`
    window.__ix = window.__ix || {};
    window.__ix.pickFingerprint = function(frameSel){
      const frame = document.querySelector(frameSel);
      if(!frame) return '';
      const ON = '.on,.sel,.selected,.checked,.is-on,[aria-checked="true"],[aria-selected="true"]';
      return [...frame.querySelectorAll(ON)]
        .filter(el=>{ const cs=getComputedStyle(el); return cs.display!=='none' && cs.visibility!=='hidden'; })
        .map(el=>String(el.className||'').split(' ')[0]+':'+((el.dataset&&el.dataset.ck)||(el.textContent||'').trim().slice(0,12)))
        .sort().join('|');
    };
  ` });
  scenarioFails = await runScenarios(pg);
}

await pg.evaluate(() => window.go('home')).catch(() => {});
await b.close();

const tally = (k) => report.reduce((a, r) => a + r[k].length, 0);
const nA = tally('overlap'), nB = tally('multi'), nC = tally('dead'), nD = tally('copy'), nE = tally('lost'), nF = tally('space');
const nS = scenarioFails.length;
// F 는 경고라서 total 에 넣지 않는다(위 주석 참조). 판정 줄에 따로 센다.
const total = nA + nB + nC + nD + nE + nS;

if (AS_JSON) {
  console.log(JSON.stringify({ target, screens: ids.length, nA, nB, nC, nD, nE, nF, nS, total, report, scenarioFails }, null, 2));
} else {
  console.log(`대상: ${target}`);
  console.log(`화면 ${ids.length}개 · A 겹침 ${nA} · B 단일선택위반 ${nB} · C 죽은조작 ${nC} · D 카피 ${nD} · E 왕복상태소실 ${nE} · F 여백비대칭 ${nF}(경고)`);
  for (const r of report) {
    console.log(`\n[${r.id}]`);
    for (const o of r.overlap) console.log(`  A 겹침 ${o.overlapPx}px  ${o.fixed}("${o.fixedText}") 가 ${o.covered}("${o.coveredText}") 를 덮음`);
    for (const o of r.multi)   console.log(`  B 단일선택위반 ${o.group} 에 ${o.count}개 켜짐 [${(o.items||[]).join(' / ')}]${o.after ? `  (클릭: ${o.after})` : ''}`);
    for (const o of r.dead)    console.log(`  C 죽은조작 ${o.tag}.${o.cls} "${o.text}"`);
    for (const o of r.copy)    console.log(`  D ${o.kind}  "${o.text}"  ${o.sel}`);
    for (const o of r.space)   console.log(`  F ${o.kind}  위 ${o.top}px / 아래 ${o.bottom}px  ${o.sel} "${o.text}"`);
    for (const o of r.lost)    console.log(`  E 왕복상태소실 "${o.picked}" 선택 후 ${o.via} 경유 복귀하니 선택이 바뀜 [${o.before} -> ${o.after}]`);
  }
  for (const f of scenarioFails) {
    console.log(`\n[시나리오 ${f.id}]`);
    console.log(`  S 실패  ${f.detail}`);
    if (f.why) console.log(`  근거    ${f.why.slice(0, 160)}`);
  }
  console.log(`\n판정: ${total === 0 ? 'PASS (0건)' : 'FAIL (' + total + '건)'}`
    + (nF ? `  · F 경고 ${nF}건은 차단하지 않는다(라벨과 값 묶음이 정상인 경우가 섞인다). 눈으로 판단하고, 근본 처방은 간격 토큰화다.` : ''));
}
process.exit(total === 0 ? 0 : 1);
