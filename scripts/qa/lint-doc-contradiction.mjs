#!/usr/bin/env node
// lint-doc-contradiction.mjs — 한 설계 문서 묶음 안에서 같은 사실이 두 값으로 적힌 자리를 찾는다.
//
// 2026-10-19 신설. 왜 이 검사가 생겼나:
//   Codex 4차 재검수가 기술설계 v1.2.1 을 RUBRIC 15/25 로 반려했고 정밀성이 1/5 였다. 사유는 하나다.
//   설계자가 개정을 상위 §A 절로 덧붙이고 구 본문을 남긴 뒤 "상위가 우선한다" 고 선언했다. 그러면
//   한 문서에 두 계약이 산다. 구현자는 자기가 먼저 읽은 쪽을 따르고 테스트는 다른 쪽을 검사한다.
//
//   같은 판을 컨트롤러의 요구 커버리지 검사는 0건 PASS 로 통과시켰다. 그 검사는 "빠진 것" 을 보고
//   이 검사는 "어긋난 것" 을 본다. **검사가 보는 축과 품질의 축이 다르다.** 커버리지 통과를 설계
//   통과로 읽으면 회장은 전체가 통과한 줄 안다. 그것이 이 파일이 생긴 이유다.
//
// 검출 2축:
//   A 금지값 사용   정본이 정해진 사실에 옛 값이 계약 서술로 쓰였다.
//   B 값 분기       같은 사실의 값이 문서 묶음 안에서 둘 이상으로 갈린다.
//
// 회고 면제: 개정 문서는 "예전에 X 라고 적었고 지금은 Y 다" 를 반드시 남긴다. 그 줄을 모순으로 세면
//   검사가 개정 기록을 지우게 만든다. 레지스트리의 `회고_면제_표지` 가 같은 줄에 있으면 기록으로 본다.
//
// 자기검증: 모순을 심은 픽스처를 매 실행 전에 통과시킨다. 2026-10-19 상호작용 린트가 정규식
//   이스케이프 결함으로 전건 PASS 를 조용히 내놓은 사고에서 배웠다. **린트 고장과 결함 0건은
//   출력이 똑같다.** 그래서 잡아야 할 것을 잡는지 먼저 증명하고 본 검사를 돌린다.
//
// 새 모순이 나오면 이 스크립트가 아니라 `qa/contracts/doc-facts-v2-r6.json` 에 줄을 추가한다
//   (헌법 §9: 구멍 하나에 검사 하나를 만들지 마라).
//
// 사용: node scripts/qa/lint-doc-contradiction.mjs <문서...> [--json] [--registry <경로>]
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const AS_JSON = argv.includes('--json');
const repo = path.resolve(new URL('../..', import.meta.url).pathname);
const regIdx = argv.indexOf('--registry');
const regPath = regIdx >= 0 ? path.resolve(argv[regIdx + 1]) : path.join(repo, 'qa/contracts/doc-facts-v2-r6.json');
const files = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--registry');

function scan(reg, docs) {
  const marks = reg.회고_면제_표지 || [];
  // 계약 서술이 아닌 자리(검사 방법의 grep 인용, 명령줄 전문)를 값 비교에서 뺀다.
  const exempt = (reg.면제_정규식 || []).map((r) => new RegExp(r));
  const findings = [];
  for (const f of reg.facts) {
    // 값마다 '그 값을 말하는 표현' 묶음을 등록하는 variants 가 우선이다. 같은 뜻을 다른 말로 적어도
    // 같은 값으로 분류되므로, 문구가 바뀌어도 모순이 잡힌다. variants 가 없는 사실(주로 숫자)은
    // pattern 의 캡처 그룹 1 을 값으로 쓴다.
    const probes = f.variants
      ? f.variants.flatMap((v) => v.patterns.map((p) => ({ re: new RegExp(p, 'g'), label: v.value })))
      : [{ re: new RegExp(f.pattern, 'g'), label: null }];
    const hits = [];
    for (const d of docs) {
      const lines = d.text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const retro = marks.some((k) => line.includes(k)) || exempt.some((r) => r.test(line));
        for (const pr of probes) {
          pr.re.lastIndex = 0;
          let m;
          while ((m = pr.re.exec(line))) {
            const raw = pr.label ?? (m[1] ?? m[0]).trim();
            hits.push({ file: d.name, line: i + 1, value: raw, retro, text: line.trim().slice(0, 150) });
            if (pr.re.lastIndex === m.index) pr.re.lastIndex++; // 빈 일치 무한루프 방지
            if (pr.label) break; // 한 줄에서 같은 값을 여러 번 세지 않는다
          }
        }
      }
    }
    const live = hits.filter((h) => !h.retro);
    // A 금지값: 회고가 아닌 자리에 forbidden 이 쓰였다.
    for (const h of live) {
      const bad = (f.forbidden || []).some((x) => h.value.replace(/`/g, '') === x.replace(/`/g, ''));
      if (bad) findings.push({ axis: 'A', fact: f, ...h, note: `금지값 '${h.value}' 이 계약 서술로 쓰였다. 정본은 '${f.canonical}' 이다.` });
    }
    // B 값 분기: 회고가 아닌 자리의 값이 둘 이상으로 갈린다.
    const norm = (v) => v.replace(/[`\s]/g, '');
    const distinct = [...new Set(live.map((h) => norm(h.value)))];
    if (distinct.length > 1) {
      findings.push({
        axis: 'B', fact: f, file: '(여러 곳)', line: 0, value: distinct.join(' / '),
        note: `같은 사실이 ${distinct.length} 값으로 갈렸다: ${distinct.join(' / ')}. 정본은 '${f.canonical}' 이다.`,
        where: live.map((h) => `${h.file}:${h.line} = ${h.value}`),
      });
    }
  }
  return findings;
}

// ── 자기검증 ──────────────────────────────────────────────────────────────────
const FIXTURE = path.join(repo, 'scripts/qa/fixtures/doc-contradiction-known.md');
function selfTest() {
  if (!fs.existsSync(FIXTURE)) return { ok: false, why: `픽스처가 없다: ${FIXTURE}` };
  const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  const got = scan(reg, [{ name: 'fixture', text: fs.readFileSync(FIXTURE, 'utf8') }]);
  const axes = new Set(got.map((g) => g.axis));
  if (!axes.has('A')) return { ok: false, why: 'A축(금지값)을 픽스처에서 잡지 못했다' };
  if (!axes.has('B')) return { ok: false, why: 'B축(값 분기)을 픽스처에서 잡지 못했다' };
  const ids = new Set(got.map((g) => g.fact.id));
  if (ids.size < 3) return { ok: false, why: `픽스처에 심은 사실 중 ${ids.size} 건만 잡았다(3 건 이상이어야 한다)` };
  return { ok: true, n: got.length, ids: [...ids] };
}

if (process.env.SKIP_SELFTEST !== '1' && !process.env.IS_FIXTURE) {
  const st = selfTest();
  if (!st.ok) {
    console.error(`⛔ 자기검증 실패: ${st.why}`);
    console.error('   검사가 잡아야 할 것을 잡지 못한다. 결함 0건과 구별되지 않으므로 본 검사를 돌리지 않는다.');
    process.exit(2);
  }
  if (!AS_JSON) console.log(`자기검증 통과: 픽스처에서 ${st.n}건 검출(사실 ${st.ids.join('·')})`);
}

if (!files.length) {
  console.error('사용: node scripts/qa/lint-doc-contradiction.mjs <문서...> [--json]');
  process.exit(2);
}
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
const docs = [];
for (const f of files) {
  const p = path.resolve(f);
  if (!fs.existsSync(p)) { console.error(`⛔ 문서가 없다: ${p}`); process.exit(2); }
  docs.push({ name: path.relative(repo, p), text: fs.readFileSync(p, 'utf8') });
}
const findings = scan(reg, docs);

// ── C 레지스트리 미등재 ───────────────────────────────────────────────────────
// 왜: 이 검사는 등재된 사실만 본다. 설계 문서가 모순표(§A.9 같은 "같은 사실이 두 곳에 적혔던 자리")에
//   행을 더해도 레지스트리에 줄이 늘지 않으면 그 사실은 다음 판에 다시 어긋날 수 있고 검사는 침묵한다.
//   그 연결이 사람 기억에 걸려 있는 것이 바로 D-032 가 금지한 형태다(규칙을 기억에 두면 매 판 재협상된다).
//   그래서 모순표 행수와 등재 사실 수를 대조해 차이를 표면화한다. 막지 않고 알린다. 모순표의 어떤 행은
//   레지스트리로 옮길 값이 아니기 때문이다(예: 문서 수 세기). 숫자가 벌어지면 사람이 판단할 자리다.
const TABLE_RE = /같은 사실이 두 곳에 적혔?던 자리/;
let tableRows = 0, tableDoc = null;
for (const d of docs) {
  const lines = d.text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!TABLE_RE.test(lines[i]) || !/^#{2,4}\s/.test(lines[i])) continue;
    tableDoc = d.name;
    for (let j = i + 1; j < lines.length && !/^#{2,4}\s/.test(lines[j]); j++) {
      // 표 본문 행만 센다(헤더와 구분선 제외).
      if (/^\|/.test(lines[j]) && !/^\|\s*[-:| ]+\|?\s*$/.test(lines[j]) && !/^\|\s*#\s*\|/.test(lines[j])) tableRows++;
    }
    break;
  }
  if (tableDoc) break;
}
const unregistered = tableDoc ? Math.max(0, tableRows - reg.facts.length) : 0;

const A = findings.filter((f) => f.axis === 'A').length;
const B = findings.filter((f) => f.axis === 'B').length;

if (AS_JSON) {
  console.log(JSON.stringify({ registry: path.relative(repo, regPath), docs: docs.map((d) => d.name), facts: reg.facts.length, A, B, total: findings.length, findings: findings.map((f) => ({ axis: f.axis, id: f.fact.id, 사실: f.fact.사실, file: f.file, line: f.line, value: f.value, note: f.note, where: f.where })) }, null, 2));
} else {
  console.log(`\n사실 레지스트리: ${path.relative(repo, regPath)} (${reg.facts.length}건)`);
  console.log(`문서 ${docs.length}종: ${docs.map((d) => path.basename(d.name)).join(', ')}`);
  console.log(`\nA 금지값 ${A}건 · B 값 분기 ${B}건`);
  if (tableDoc) {
    console.log(`C 레지스트리 대조: 모순표 ${tableRows}행(${path.basename(tableDoc)}) 대 등재 사실 ${reg.facts.length}건` +
      (unregistered > 0 ? `  ⚠ ${unregistered}건이 등재되지 않았을 수 있다. 레지스트리에 줄을 추가할지 판단하라(막지 않는다).` : '  일치'));
  }
  for (const f of findings) {
    console.log(`\n  ${f.axis} ${f.fact.id}  ${f.fact.사실}`);
    console.log(`     ${f.note}`);
    if (f.where) for (const w of f.where) console.log(`       · ${w}`);
    else console.log(`       · ${f.file}:${f.line}  ${f.text}`);
    console.log(`     왜 중요한가: ${f.fact.why}`);
  }
  console.log(`\n판정: ${findings.length === 0 ? 'PASS (0건)' : 'FAIL (' + findings.length + '건)'}`);
}
process.exit(findings.length === 0 ? 0 : 1);
