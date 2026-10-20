#!/usr/bin/env node
// lint-requirement-coverage.mjs — 추적성 매트릭스가 요구 레지스트리를 전수 덮는지, 그리고 매트릭스가
//   가리키는 테스트 ID 가 테스트 케이스 파일에 실재하는지 대조한다.
//
// 2026-10-19 신설. 왜 이 검사가 생겼나(평가 ev-20261019-23):
//   설계 워커가 "요구 9건 전수 매핑, 추적성 갭 0" 으로 보고했고, 컨트롤러는 매트릭스 9행이 실재하고
//   각 행이 요구에서 테스트까지 닿는 것을 직접 읽어 확인한 뒤 통과시켰다. 그런데 승인 요구는 R1~R10
//   이었고 매트릭스에 **R4·R7·R8 이 없었다.** Codex 재검수가 13/25 로 반려하며 그것을 잡았다.
//
//   **행이 있다는 것과 빠진 행이 없다는 것은 다른 명제다.** 완전성은 대조 기준 목록을 손에 들어야
//   검증된다. 그런데 그때 요구 ID 체계는 위임 프롬프트에만 있었고 저장소에 없었다. 기준이 없으니
//   사람이 기억으로 대조했고, 기억은 없는 것을 보지 못한다. D-032 와 같은 형태다.
//
//   그리고 컨트롤러는 테스트 ID 수가 워커 보고(33)와 자기 실측(18)이 어긋나는 것을 **보고도 넘겼다.**
//   매트릭스가 가리키는 ID 가 파일에 없으면 그 행은 닿은 것이 아니다. 그래서 두 축을 함께 본다.
//
// 검출 2축:
//   A 요구 미커버   레지스트리의 요구 ID 가 추적성 문서에 한 번도 나오지 않는다.
//   B 테스트 미실재 매트릭스가 가리키는 테스트 ID 가 테스트 케이스 파일에 없다.
//
// 새 요구가 생기면 이 스크립트가 아니라 `qa/contracts/design-requirements-v2-r6.json` 에 줄을 추가한다.
//
// 사용: node scripts/qa/lint-requirement-coverage.mjs [추적성문서] [테스트케이스문서] [--json]
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const AS_JSON = argv.includes('--json');
const rest = argv.filter((a) => !a.startsWith('--'));
const repo = path.resolve(new URL('../..', import.meta.url).pathname);

const regPath = path.join(repo, 'qa/contracts/design-requirements-v2-r6.json');
const tracePath = path.resolve(rest[0] || path.join(repo, 'docs/eng-design/fdd-social-viral-loop-web-first-v1.2.0.md'));
const casesPath = path.resolve(rest[1] || path.join(repo, 'docs/eng-design/test-cases-social-viral-loop-web-first-v1.2.0.md'));

for (const [label, p] of [['요구 레지스트리', regPath], ['추적성 문서', tracePath], ['테스트 케이스 문서', casesPath]]) {
  if (!fs.existsSync(p)) {
    console.error(`⛔ ${label}가 없다: ${p}`);
    process.exit(2);
  }
}

const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
const trace = fs.readFileSync(tracePath, 'utf8');
const cases = fs.readFileSync(casesPath, 'utf8');

// ── A 요구 미커버 ─────────────────────────────────────────────────────────────
// 요구 ID 가 추적성 문서 본문에 단어 경계로 나오는지 본다. R1 이 R10 에 부분일치하지 않게
// 뒤에 숫자가 이어지지 않는 경우만 센다.
const uncovered = [];
for (const r of reg.requirements) {
  const id = r.id;
  const re = new RegExp(`(^|[^A-Za-z0-9-])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![0-9])`, 'm');
  if (!re.test(trace)) uncovered.push(r);
}

// ── B 테스트 미실재 ───────────────────────────────────────────────────────────
// 추적성 문서에서 테스트 ID 패턴(대문자 2~3자 + 하이픈 + 두 자리)을 긁어, 테스트 케이스 문서에
// 그 ID 가 있는지 본다. 범위 표기(LG-01~05)는 양 끝만 확인한다.
const idPat = /\b([A-Z]{2,3})-(\d{2})\b/g;
const wanted = new Set();
let m;
while ((m = idPat.exec(trace))) wanted.add(`${m[1]}-${m[2]}`);
// 범위 표기의 끝값도 요구 대상에 넣는다(예: LG-01~05 -> LG-05)
const rangePat = /\b([A-Z]{2,3})-(\d{2})\s*[~-]\s*(\d{2})\b/g;
while ((m = rangePat.exec(trace))) {
  const [, pre, from, to] = m;
  for (let i = Number(from); i <= Number(to); i++) wanted.add(`${pre}-${String(i).padStart(2, '0')}`);
}
// 테스트 ID 는 이번 판 파일에만 사는 것이 아니다. 기존 테스트(WF-·PG-·PW-·MY- 등)는 이전 버전
// 문서와 QA 추적표에 정의돼 있고, 매트릭스가 그것을 가리키는 것은 정상이다. 2026-10-19 첫 실행에서
// 단일 파일만 보고 50건을 미실재로 냈는데 대부분 그 경우였다. 그래서 설계·QA 문서 전체에서 찾는다.
// 어디에도 없으면 그때 비로소 "그 행은 끝까지 닿지 않았다" 가 성립한다.
const searchDirs = [path.join(repo, 'docs/eng-design'), path.join(repo, 'docs/qa'), path.join(repo, 'qa')];
let corpus = cases;
for (const d of searchDirs) {
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    if (!/\.(md|json)$/.test(f)) continue;
    try { corpus += '\n' + fs.readFileSync(path.join(d, f), 'utf8'); } catch {}
  }
}
const missingTests = [...wanted].filter((id) => !new RegExp(`\\b${id}\\b`).test(corpus)).sort();

// ── C 추적성 매트릭스의 빈 칸: 만들지 않았다. 왜 못 만드는지 적는다 ─────────────
// 2026-10-20 Codex 8차 P1 이 이 검사의 공백을 짚었다. "자동 커버리지 검사는 요구 ID 와 테스트 ID 의
//   존재만 확인해 다음 누락을 통과시켰다. R2 행은 초대 미리보기 3필드 축소를 요구하면서 서버 계약을
//   `0건` 으로 적는다. 실제 설계에는 `friend_invite_preview(` 가 있다."
//
// 축을 두 번 시도했고 둘 다 실패했다.
//   ① 같은 행에 함수·라우트 이름이 있으면 모순으로 센다 → 4건 중 Codex 가 지목한 것은 2건이었다.
//      라우트만 있는 행(`/how`·`/my`)은 순수 화면 변경이고 서버 계약 0건이 맞다.
//   ② 함수 이름만 센다 → **0건.** Codex 가 본 것은 "같은 행" 이 아니라 **설계 본문**에 그 함수가
//      있다는 사실이다. 행과 본문을 잇는 데는 그 요구가 서버를 쓰는지에 대한 의미 이해가 필요하다.
//
// 그래서 **만들지 않는다.** 0건만 내는 축은 장식이고, 억지 판정은 오탐이 되어 검사 전체를 무시하게
//   만든다(`lint-doc-contradiction.mjs` 의 J축에서 같은 결론을 냈다). 이 자리는 **교차 리뷰가 보는
//   축**으로 남기고, 그 사실을 여기 적어 다음 사람이 "검사가 통과했으니 추적성 갭 0" 으로 읽지 않게 한다.
//   **존재를 세는 것과 행이 끝까지 닿는지 보는 것은 다른 명제다.**

const total = uncovered.length + missingTests.length;

if (AS_JSON) {
  console.log(JSON.stringify({
    registry: path.relative(repo, regPath),
    trace: path.relative(repo, tracePath),
    cases: path.relative(repo, casesPath),
    requirements: reg.requirements.length,
    uncovered: uncovered.map((r) => r.id),
    testIdsReferenced: wanted.size,
    testIdsMissing: missingTests,
    total,
  }, null, 2));
} else {
  console.log(`요구 레지스트리: ${path.relative(repo, regPath)} (${reg.requirements.length}건)`);
  console.log(`추적성 문서: ${path.relative(repo, tracePath)}`);
  console.log(`테스트 케이스: ${path.relative(repo, casesPath)}`);
  console.log(`\nA 요구 미커버 ${uncovered.length}건 · B 테스트 미실재 ${missingTests.length}건 (참조된 테스트 ID ${wanted.size}개)`);
  console.log('  ※ 이 검사는 ID 의 존재만 본다. 매트릭스 행의 서버 계약 칸이 낡았는지(설계 본문에 함수가 있는데 행은 0건)는 보지 않는다. 그 축은 만들지 못했고 이유를 파일 머리에 적었다. 교차 리뷰가 보는 자리다.');
  for (const r of uncovered) {
    console.log(`\n  A 미커버  ${r.id}  ${r.요구}`);
    console.log(`     회장원문: ${String(r.회장원문).slice(0, 70)}`);
    if (r.note) console.log(`     주의: ${r.note}`);
  }
  if (missingTests.length) {
    console.log(`\n  B 미실재 테스트 ID: ${missingTests.join(', ')}`);
    console.log('     매트릭스가 가리키는 ID 가 테스트 케이스 파일에 없다. 그 행은 끝까지 닿은 것이 아니다.');
  }
  console.log(`\n판정: ${total === 0 ? 'PASS (0건)' : 'FAIL (' + total + '건)'}`);
}
process.exit(total === 0 ? 0 : 1);
