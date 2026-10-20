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

// 모순표(§A.9 "같은 사실이 두 곳에 적혔던 자리") 구간의 줄 번호를 모은다.
// 왜: 그 표는 **설계상 두 서술을 나란히 적는 곳**이다. 거기에 옛 값과 새 값이 함께 있는 것은 모순이 아니라
//   기록이다. 2026-10-20 에 F14 를 등재하자 그 표의 14행이 바로 오탐으로 잡혔다. 줄마다 표지를 거는 방식은
//   표의 모든 행에 표지를 요구하므로 작성자에게 부담이고 빠뜨리면 다시 오탐이 난다. 구간으로 면제한다.
function tableRanges(docs) {
  const RE = /같은 사실이 두 곳에 적혔?던 자리/;
  const out = new Map();
  for (const d of docs) {
    const lines = d.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!RE.test(lines[i]) || !/^#{2,4}\s/.test(lines[i])) continue;
      let end = i + 1;
      while (end < lines.length && !/^#{2,4}\s/.test(lines[end])) end++;
      out.set(d.name, [i + 1, end]);
      break;
    }
  }
  return out;
}

function scan(reg, docs) {
  const marks = reg.회고_면제_표지 || [];
  const ranges = tableRanges(docs);
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
        const rg = ranges.get(d.name);
        const inTable = rg && i + 1 >= rg[0] && i + 1 <= rg[1];
        const retro = inTable || marks.some((k) => line.includes(k)) || exempt.some((r) => r.test(line));
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

// ── D 필드 집합 불일치 ────────────────────────────────────────────────────────
// 왜: B축은 "한 사실의 값" 을 보므로 "여러 필드의 집합" 을 보지 못한다. 그래서 같은 응답의 필드 목록이
//   허용 목록·정상 응답 JSON·테스트에 서로 다르게 적힌 것을 한 번도 잡지 못했다(Codex 5차 P0-1).
//   OWASP 가 요구하는 것은 응답 스키마 강제이고, 같은 응답의 필드가 세 갈래면 그 보호가 작동하지 않는다.
//   각 source 의 앵커 줄부터 span 줄까지에서 snake_case 토큰을 모아 집합으로 만들고 서로 비교한다.
function scanFieldSets(reg, docs) {
  const out = [];
  for (const fs of reg.field_sets || []) {
    const ignore = new Set(fs.ignore || []);
    const ex = new RegExp(fs.extract, 'g');
    const sets = [];
    for (const src of fs.sources) {
      const are = new RegExp(src.anchor);
      const found = new Set();
      let seenAt = null;
      for (const d of docs) {
        const lines = d.text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (!are.test(lines[i])) continue;
          seenAt = `${d.name}:${i + 1}`;
          for (let j = i; j < Math.min(lines.length, i + 1 + (src.span || 5)); j++) {
            ex.lastIndex = 0;
            let m;
            while ((m = ex.exec(lines[j]))) {
              const tok = m[1];
              if (!ignore.has(tok)) found.add(tok);
              if (ex.lastIndex === m.index) ex.lastIndex++;
            }
          }
          break;
        }
        if (seenAt) break;
      }
      if (seenAt) sets.push({ name: src.name, at: seenAt, fields: found });
    }
    if (sets.length < 2) continue;
    // 모든 집합이 같은가. 다르면 각 쌍의 차집합을 보고한다.
    const base = sets[0];
    const diffs = [];
    for (let i = 1; i < sets.length; i++) {
      const a = base.fields, b = sets[i].fields;
      const onlyA = [...a].filter((x) => !b.has(x));
      const onlyB = [...b].filter((x) => !a.has(x));
      if (onlyA.length || onlyB.length) diffs.push({ pair: `${base.name} 대 ${sets[i].name}`, onlyA, onlyB, atA: base.at, atB: sets[i].at });
    }
    if (diffs.length) out.push({ fs, sets, diffs });
  }
  return out;
}

// ── E·F·G 범용 축: 문서 구조 불변식 ────────────────────────────────────────────
// 왜 레지스트리 없이 범용으로 도나 (2026-10-20, Codex 6차 반려):
//   Codex 가 "자동 모순 검사 PASS 뒤에 숨어 있던" 불일치 3종을 찾았다. 문서 상단 버전이 v1.2.2 인데
//   변경 이력은 v1.2.3 · 목차 앵커 3개 깨짐 · 적어 둔 테스트 수(48건·106개)가 실제 계수(51개·109개)와 다름.
//   셋 다 "같은 사실의 두 값" 이고 내 B축이 봐야 할 종류인데, **레지스트리에 그 사실이 없어서 못 봤다.**
//   사실을 하나씩 등재하는 방식은 이 종류를 따라가지 못한다. 문서마다 생기고 판마다 바뀌기 때문이다.
//   그래서 등재가 필요 없는 불변식으로 만든다. 헌법 §9 의 "구멍 하나에 검사 하나를 만들지 마라" 는
//   도메인 사실에는 레지스트리를, 구조 불변식에는 범용 축을 쓰라는 뜻으로 읽는다.
//
//   그리고 이 셋은 **작성자 자기신고를 대체한다.** 설계자가 "목차 앵커 146/146" 을 매 판 적었고 컨트롤러는
//   그것을 실측하지 않았고 Codex 가 세 판 연속 그 자리를 깼다. 자기신고는 증거가 아니다(헌법 §3).

// GitHub 의 헤딩 앵커 규칙. 소문자화하고, 공백을 하이픈으로, 영숫자·하이픈·밑줄·유니코드 글자 외를 버린다.
// 버려진 자리에 하이픈을 넣지 않기 때문에 `+`·`~`·`=` 가 섞인 제목은 **이중 하이픈이 남는다.**
// 2026-10-20 에 깨진 링크 3개가 전부 그 경우였다(`FR-W12~21` 등).
function ghSlug(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim()
    .toLowerCase()
    .replace(/[ \t]/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '');
}

function scanStructure(docs) {
  const out = [];
  for (const d of docs) {
    const lines = d.text.split('\n');

    // ── E축: 파일명 버전 · 상단 버전 표기 · 변경 이력 최신 행이 같은가 ─────────────
    const fnV = (d.name.match(/v(\d+\.\d+\.\d+)/) || [])[1];
    let headV = null, histV = null;
    for (let i = 0; i < Math.min(lines.length, 40); i++) {
      const m = lines[i].match(/버전[^\n]{0,20}?v?(\d+\.\d+\.\d+)/);
      if (m) { headV = m[1]; break; }
    }
    // 변경 이력 표에서 가장 높은 버전을 집는다(최신순·과거순 어느 쪽이어도 된다).
    const hist = [...d.text.matchAll(/^\|\s*\**v?(\d+\.\d+\.\d+)\**\s*\|/gm)].map((m) => m[1]);
    if (hist.length) {
      histV = hist.sort((a, b) => {
        const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
        return pb[0] - pa[0] || pb[1] - pa[1] || pb[2] - pa[2];
      })[0];
    }
    const vs = [['파일명', fnV], ['상단 버전 표기', headV], ['변경 이력 최신', histV]].filter((x) => x[1]);
    const distinct = [...new Set(vs.map((x) => x[1]))];
    if (vs.length >= 2 && distinct.length > 1) {
      out.push({ axis: 'E', file: d.name, note: `버전이 ${distinct.length} 값으로 갈렸다: ` + vs.map((x) => `${x[0]}=${x[1]}`).join(' / '),
        why: '파일명만 올리고 문서 안 버전 표기를 안 고치면, 구현자가 문서 상단을 보고 구 계약으로 짓는다. Codex 6차가 api-contract·architecture 두 문서에서 이것을 잡았다.' });
    }

    // ── F축: 목차 앵커가 실제 헤딩에서 생성되는 앵커와 맞는가 ─────────────────────
    const heads = new Set();
    for (const l of lines) {
      const m = l.match(/^#{2,6}\s+(.*)$/);
      if (m) heads.add(ghSlug(m[1]));
    }
    if (heads.size) {
      const broken = [];
      for (let i = 0; i < lines.length; i++) {
        for (const m of lines[i].matchAll(/\[[^\]]*\]\(#([^)]+)\)/g)) {
          const a = m[1].toLowerCase();
          if (!heads.has(a)) broken.push({ line: i + 1, anchor: a });
        }
      }
      if (broken.length) {
        out.push({ axis: 'F', file: d.name, note: `목차 앵커 ${broken.length}개가 어느 헤딩에도 닿지 않는다: ` + broken.slice(0, 5).map((b) => `${b.line}행 #${b.anchor}`).join(', ') + (broken.length > 5 ? ' …' : ''),
          why: 'standard-doc-review 구조 규격은 링크 하나라도 무효면 통과가 아니다. `+`·`~`·`=` 가 섞인 제목은 그 자리에 하이픈이 남지 않아 이중 하이픈이 생기고, 목차가 그것을 반영하지 않으면 깨진다.' });
      }
    }
  }

  // ── G축: 문서가 적어 둔 테스트 수치가 실제 계수와 맞는가 ───────────────────────
  // 정의 = `### <ID>` 형태의 고유 테스트 ID. 참조 = 문서 전체에서 쓰인 테스트 ID.
  const corpus = docs.map((d) => d.text).join('\n');
  const defined = new Set([...corpus.matchAll(/^#{2,4}\s+([A-Z]{2,3}-\d{2})\b/gm)].map((m) => m[1]));
  const referenced = new Set([...corpus.matchAll(/\b([A-Z]{2,3}-\d{2})\b/g)].map((m) => m[1]));
  for (const d of docs) {
    for (const m of d.text.matchAll(/(?:TC|테스트)[^\n]{0,24}?(\d+)\s*(?:건|개)/g)) {
      const claimed = Number(m[1]);
      if (claimed !== defined.size && Math.abs(claimed - defined.size) <= 20 && defined.size > 0) {
        out.push({ axis: 'G', file: d.name, note: `적어 둔 테스트 수 ${claimed} 와 실제 고유 정의 ${defined.size} 가 다르다 ("${m[0].trim()}")`,
          why: '수치를 손으로 적고 판이 바뀔 때 갱신하지 않으면 그 숫자가 곧 거짓이 된다. Codex 6차가 test-plan 의 48건과 실제 51개를 잡았다. 테스트가 48개만 돌면 3개는 검증되지 않는다.' });
      }
    }
    for (const m of d.text.matchAll(/참조[^\n]{0,16}?ID[^\n]{0,12}?(\d+)\s*(?:개|건)/g)) {
      const claimed = Number(m[1]);
      if (claimed !== referenced.size && Math.abs(claimed - referenced.size) <= 30 && referenced.size > 0) {
        out.push({ axis: 'G', file: d.name, note: `적어 둔 참조 테스트 ID 수 ${claimed} 와 실제 ${referenced.size} 가 다르다 ("${m[0].trim()}")`,
          why: '같은 이유다. 검사 출력을 문서에 옮겨 적었으면 판이 바뀔 때 다시 돌려 갱신해야 한다.' });
      }
    }
  }
  return out;
}

// ── H축: 설계가 선언한 신설 서버 자산의 구현 참조 계수 ───────────────────────────
// 왜 (2026-10-20): 회장이 같은 것을 두 번 지적했다. "미니앱을 저장소 반영 완료로 보고했는데 그 화면이
//   부르는 엣지 함수와 RPC 5종이 운영에 0건이라 껍데기였다"(10-13), "커버 업로드용 엣지 함수 3종이
//   운영에 배포되지 않은 채 화면만 올라갔다"(10-14). 헌법 §5 가 "기능 완료를 말하기 전 그 기능이 기대는
//   서버 실물을 세라" 로 박혀 있지만 **세는 주체가 사람이었다.** 그래서 설계자가 같은 목록을 10건이라
//   적었다가 다음 판에 13건으로 고쳤다. 손으로 세면 낡는다.
//   이 축은 막지 않고 표면화한다. 설계 단계에서 전부 0 은 정상이고(계획이므로) build 단계에서 0 이면
//   그것이 "화면만 있음" 이다. 같은 표가 설계의 선언 검사와 build 의 진척 계수를 겸한다.
function scanPlannedAssets(reg, repo) {
  const rows = [];
  for (const a of reg.planned_assets || []) {
    let hits = 0;
    const files = new Set();
    for (const dir of a.expect_in) {
      const base = path.join(repo, dir);
      if (!fs.existsSync(base)) continue;
      const stack = [base];
      while (stack.length) {
        const cur = stack.pop();
        let st;
        try { st = fs.statSync(cur); } catch { continue; }
        if (st.isDirectory()) {
          if (/node_modules|\.next|\.git/.test(cur)) continue;
          for (const e of fs.readdirSync(cur)) stack.push(path.join(cur, e));
          continue;
        }
        if (!/\.(ts|tsx|sql|toml|js|mjs)$/.test(cur)) continue;
        try {
          if (fs.readFileSync(cur, 'utf8').includes(a.token)) { hits++; files.add(path.relative(repo, cur)); }
        } catch {}
      }
    }
    rows.push({ ...a, hits, files: [...files].slice(0, 2) });
  }
  return rows;
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
const fsFindings = scanFieldSets(reg, docs);
const stFindings = scanStructure(docs);
const paRows = scanPlannedAssets(reg, repo);

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
  if (fsFindings.length) {
    console.log(`D 필드 집합 불일치 ${fsFindings.length}건`);
    for (const f of fsFindings) {
      console.log(`\n  D ${f.fs.id}  ${f.fs.대상}`);
      for (const d of f.diffs) {
        console.log(`     ${d.pair}`);
        if (d.onlyA.length) console.log(`       앞에만: ${d.onlyA.join(', ')}  (${d.atA})`);
        if (d.onlyB.length) console.log(`       뒤에만: ${d.onlyB.join(', ')}  (${d.atB})`);
      }
      console.log(`     왜 중요한가: ${f.fs.why}`);
    }
  } else if ((reg.field_sets || []).length) {
    console.log(`D 필드 집합 ${reg.field_sets.length}대상 일치`);
  }
  if (stFindings.length) {
    const byAxis = { E: '버전 표기 불일치', F: '목차 앵커 깨짐', G: '적어 둔 수치 불일치' };
    for (const ax of ['E', 'F', 'G']) {
      const g = stFindings.filter((x) => x.axis === ax);
      if (!g.length) continue;
      console.log(`\n${ax} ${byAxis[ax]} ${g.length}건`);
      for (const x of g) {
        console.log(`     ${path.basename(x.file)}: ${x.note}`);
        console.log(`     왜 중요한가: ${x.why}`);
      }
    }
  } else {
    console.log('E 버전 표기 · F 목차 앵커 · G 적어 둔 수치: 0건');
  }
  if (paRows.length) {
    const done = paRows.filter((r) => r.hits > 0).length;
    console.log(`\nH 선언한 신설 서버 자산 ${paRows.length}건 중 구현 참조 있는 것 ${done}건 (막지 않는다)`);
    for (const r of paRows) {
      const mark = r.hits > 0 ? `있음(${r.hits}곳: ${r.files.join(', ')})` : '0곳';
      console.log(`     ${r.id} ${r.종류} \`${r.token}\` ${mark}`);
    }
    if (done === 0) console.log('     설계 단계에서는 전부 0 이 정상이다. build 단계에서 0 이면 그것이 화면만 있음이다.');
  }
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
  const tot = findings.length + fsFindings.length + stFindings.length;
  console.log(`\n판정: ${tot === 0 ? 'PASS (0건)' : 'FAIL (' + tot + '건)'}`);
}
process.exit(findings.length === 0 && fsFindings.length === 0 && stFindings.length === 0 ? 0 : 1);
