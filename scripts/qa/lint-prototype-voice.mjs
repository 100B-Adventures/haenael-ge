#!/usr/bin/env node
// lint-prototype-voice.mjs — 프로토타입 제품 화면의 말투(하우스 보이스) 위반을 기계로 잡는다.
// 2026-10-19 신설(R4). 왜: 회장이 "네 응원이 여기 쌓였어요" 한 줄을 직접 짚었는데,
//   전수 점검을 돌리니 25화면에서 21곳이 같은 계열이었다. 못 잡는 종류가 아니라 검사가 없었다.
//   규칙 정본 = docs/design/standard-ux-writing.md "말투 규칙".
//
// 검출 3축
//   A 2인칭 반말   '네/너/너의/당신' 이 제품 문구에 나오면 결함. 사용자가 쓴 말(응원 메시지·초대 문안)은 제외.
//   B 말투 혼용    제품 화면은 해요체. '-습니다/-입니다/-됩니다/-합니다' 는 약관·개인정보·관리자 화면에서만 허용.
//   C 금지 사전    은유·조어·내부 동작 노출. 적발된 실제 사례만 넣는다(추측으로 늘리지 않는다).
//
// 범위: section.screen 안의 .frame 만. 검수 셸(우측 패널·플로우맵·콘솔·모션 도크·STAMP)은 제품이 아니다.
// 사용: cd web && node ../scripts/qa/lint-prototype-voice.mjs [프로토타입] [--json]
import { createRequire } from 'node:module';
const require_ = createRequire(process.cwd() + '/x.js');
const { chromium } = require_('playwright');
import path from 'node:path';

const argv = process.argv.slice(2);
const AS_JSON = argv.includes('--json');
const rest = argv.filter((a) => !a.startsWith('--'));
const target = path.resolve(rest[0] || '../docs/design/prototypes/social-viral-loop-v3-opus5.html');

// 합니다체가 정상인 화면. 법률 문서와 운영자 화면이다.
const FORMAL_SCREENS = ['terms', 'privacy', 'admin'];
// 사용자가 쓴 말이 담기는 자리. 반말·구어가 그대로 들어간다(규칙 예외).
const USER_CONTENT = '.wm-word, .news, .msg-more, .kprev, .cheer-msg, .nmsg, .wm-goalword, .wc-goal, .cov-cap';
// 합니다체가 정상인 자리(화면 단위 예외로는 좁힐 수 없는 블록).
//   .sheet .legal = 로그인 동의 문구. "이용약관과 개인정보처리방침에 동의합니다" 는 사용자의 의사표시 선언이고
//   법적 동의 문구의 표준 형태다. 여기를 해요체로 바꾸면 동의의 효력 표현이 흐려진다.
const FORMAL_BLOCKS = '.sheet .legal, .legal-doc';

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
await pg.goto('file://' + target);
await pg.waitForLoadState('load');

const res = await pg.evaluate(
  ({ FORMAL_SCREENS, USER_CONTENT, FORMAL_BLOCKS }) => {
    const BANNED = [
      ['얹혀', '쌓여요 — 얹히다는 쌓임을 뜻하지 않는다'],
      ['밀어줘', '응원해요 — 밀어주다는 우리가 만든 말이다'],
      ['밀어준', '응원한 — 같은 이유'],
      ['이 자리에', '이 목록에 / 삭제 — D-028 이 금지한 "열리는 자리" 계열'],
      ['푸시로', '삭제 — 내부 전송 수단 노출'],
      ['운영팀이', '삭제 — 내부 조직 노출'],
      ['미니 목록', '목록 — 내부 용어'],
      ['할 수 있는 것', '구체 명사 — 모호한 명사화'],
      ['열리는 것', '구체 명사 — D-028 금지'],
      ['마음 구름', '응원 워드맵 — 용어 정본 위반'],
      ['금액도 순위도', '삭제 — 없는 것을 설명하지 않는다'],
    ];
    // 2인칭 반말. 조사가 붙은 형태만 센다('네' 는 '네 번째'·'서연이네' 같은 오탐이 많다).
    // '네' 는 서수(네 번째·네 번)와 겹친다. 수사 용법을 먼저 걷어낸다.
    const ORDINAL = /(^|[\s"“'(])네\s*번/;
    const SECOND = [/(^|[\s"“'(])네\s/, /(^|[\s"“'(])너(는|를|의|랑|한테|에게|라면)/, /(^|[\s"“'(])당신/];
    const FORMAL = /(습니다|입니다|됩니다|합니다|십시오)/;

    const out = [];
    document.querySelectorAll('section.screen').forEach((scr) => {
      const frame = scr.querySelector('.frame');
      if (!frame) return;
      const formalOk = FORMAL_SCREENS.includes(scr.id);
      const walker = document.createTreeWalker(frame, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const txt = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (txt.length < 2) continue;
        const el = node.parentElement;
        if (!el) continue;
        if (el.closest(USER_CONTENT)) continue; // 사용자가 쓴 말은 규칙 밖
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const push = (kind, detail) => out.push({ screen: scr.id, kind, text: txt.slice(0, 60), detail });
        const padded = ' ' + txt;
        if (!ORDINAL.test(padded) && SECOND.some((r) => r.test(padded)))
          push('2인칭 반말', '이름·1인칭 소유로 바꾸거나 주어를 생략한다');
        if (!formalOk && !el.closest(FORMAL_BLOCKS) && FORMAL.test(txt))
          push('말투 혼용', '제품 화면은 해요체. 약관·개인정보·관리자·동의 문구만 합니다체');
        for (const [w, fix] of BANNED) if (txt.includes(w)) push('금지 사전', `"${w}" → ${fix}`);
      }
    });
    return out;
  },
  { FORMAL_SCREENS, USER_CONTENT, FORMAL_BLOCKS }
);

await b.close();

if (AS_JSON) {
  console.log(JSON.stringify(res, null, 2));
} else {
  console.log('대상:', target);
  console.log(`말투 위반 ${res.length}건`);
  const byScreen = {};
  for (const r of res) (byScreen[r.screen] ||= []).push(r);
  for (const [sid, list] of Object.entries(byScreen)) {
    console.log(`\n[${sid}]`);
    for (const r of list) console.log(`  ${r.kind}  «${r.text}»\n    → ${r.detail}`);
  }
  console.log(`\n판정: ${res.length ? 'FAIL' : 'PASS'} (${res.length}건)`);
}
process.exit(res.length ? 1 : 0);
