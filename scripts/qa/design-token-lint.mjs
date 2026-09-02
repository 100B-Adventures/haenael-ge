#!/usr/bin/env node
// 디자인 토큰 준수 검사기.
//
// 배경: QA 리포트 v1 이 세 컴포넌트의 토큰 위반을 지적했는데, 이 저장소에
// 검사기가 없어서 "검증 불가"로 남았다. 사람이 그때그때 파일을 열어 세는
// 방식은 다음 사람이 안 하면 그대로 무너진다. 위반을 세는 일을 고정한다.
//
// 이미 81건이 쌓인 코드베이스에 전면 금지를 걸면 매번 빨간불이라 아무도
// 안 본다. 그래서 기준선(baseline)을 두고 "새로 늘어난 위반"만 실패로 본다.
// 기존 항목은 목록에 남아 있어 줄여나갈 대상으로 보인다.
//
//   node scripts/qa/design-token-lint.mjs                  검사
//   node scripts/qa/design-token-lint.mjs --update-baseline 기준선 갱신
//
// 예외를 영구히 두려면 그 줄 또는 바로 윗줄에 사유를 적는다.
//   design-token-lint-allow: 카카오 브랜드 규정 색상

import { readFileSync, writeFileSync, globSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const baselinePath = resolve(import.meta.dirname, "design-token-lint.baseline.json");

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/;
const INLINE_STYLE = /style=\{\{/;
const ALLOW = /design-token-lint-allow:/;

function collect() {
  const found = [];
  const files = globSync("web/src/**/*.{ts,tsx}", { cwd: repoRoot }).sort();
  for (const rel of files) {
    const lines = readFileSync(resolve(repoRoot, rel), "utf8").split("\n");
    lines.forEach((line, i) => {
      if (ALLOW.test(line) || (i > 0 && ALLOW.test(lines[i - 1]))) return;
      if (COLOR_LITERAL.test(line)) found.push(`${rel}\t색상 리터럴\t${line.trim().slice(0, 100)}`);
      if (INLINE_STYLE.test(line)) found.push(`${rel}\t인라인 스타일\t${line.trim().slice(0, 100)}`);
    });
  }
  return { files: files.length, found };
}

const { files, found } = collect();

if (process.argv.includes("--update-baseline")) {
  writeFileSync(baselinePath, `${JSON.stringify(found, null, 2)}\n`);
  console.log(`기준선 갱신. 검사 파일 ${files}개, 기록된 위반 ${found.length}건.`);
  process.exit(0);
}

const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : [];
const baseCount = new Map();
for (const entry of baseline) baseCount.set(entry, (baseCount.get(entry) ?? 0) + 1);

const added = [];
for (const entry of found) {
  const left = baseCount.get(entry) ?? 0;
  if (left > 0) baseCount.set(entry, left - 1);
  else added.push(entry);
}
const removed = [...baseCount.entries()].reduce((sum, [, n]) => sum + n, 0);

if (added.length === 0) {
  const note = removed > 0 ? ` 기준선 대비 ${removed}건 줄었다. --update-baseline 으로 기준선을 낮춰라.` : "";
  console.log(`디자인 토큰 검사 통과. 검사 파일 ${files}개, 기존 위반 ${found.length}건, 신규 0건.${note}`);
  process.exit(0);
}

console.error(`디자인 토큰 신규 위반 ${added.length}건. (기존 ${baseline.length}건은 기준선에 있다.)\n`);
for (const entry of added) {
  const [rel, kind, text] = entry.split("\t");
  console.error(`${rel}  ${kind}`);
  console.error(`  ${text}`);
}
console.error(`\n토큰으로 옮기거나, 불가피하면 그 줄 위에 design-token-lint-allow: <사유> 를 적어라.`);
process.exit(1);
