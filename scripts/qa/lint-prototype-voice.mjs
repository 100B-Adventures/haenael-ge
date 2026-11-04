#!/usr/bin/env node
// Prototype and product voice/copy ownership checker.
// Both surfaces import scripts/qa/voice-rules.mjs so rule changes have one owner.
//
// Usage:
//   node scripts/qa/lint-prototype-voice.mjs [prototype] [--json]
//   node scripts/qa/lint-prototype-voice.mjs --product [--json]
//   node scripts/qa/lint-prototype-voice.mjs --all [prototype] [--json]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { VOICE_EXCEPTIONS, VOICE_RULES } from "./voice-rules.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const requireFromWeb = createRequire(path.join(repoRoot, "web/package.json"));
const { chromium } = requireFromWeb("playwright");
const ts = requireFromWeb("typescript");

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const productOnly = argv.includes("--product");
const all = argv.includes("--all");
const checkPrototype = !productOnly || all;
const checkProduct = productOnly || all;
const positional = argv.filter((arg) => !arg.startsWith("--"));
const prototypeTarget = path.resolve(
  positional[0] || path.join(repoRoot, "docs/design/prototypes/social-viral-loop-v3-opus5.html"),
);

function voiceFindings(text, { formalAllowed = false, userAuthored = false } = {}) {
  if (userAuthored) return [];
  const findings = [];
  const ordinal = new RegExp(VOICE_RULES.ordinalPattern);
  const secondPerson = VOICE_RULES.secondPersonPatterns.map((source) => new RegExp(source));
  const formal = new RegExp(VOICE_RULES.formalPattern);
  const padded = ` ${text}`;
  if (!ordinal.test(padded) && secondPerson.some((pattern) => pattern.test(padded))) {
    findings.push({ kind: "2인칭 반말", detail: "이름 또는 1인칭 소유로 바꾸거나 주어를 생략한다" });
  }
  if (!formalAllowed && formal.test(text)) {
    findings.push({ kind: "말투 혼용", detail: "제품 화면은 해요체. 법률·관리자·동의 문구만 합니다체" });
  }
  for (const [word, detail] of VOICE_RULES.banned) {
    if (text.includes(word)) findings.push({ kind: "금지 사전", detail: `"${word}" → ${detail}` });
  }
  return findings;
}

async function lintPrototype() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`file://${prototypeTarget}`);
  await page.waitForLoadState("load");
  const result = await page.evaluate(
    ({ rules, exceptions }) => {
      const ordinal = new RegExp(rules.ordinalPattern);
      const secondPerson = rules.secondPersonPatterns.map((source) => new RegExp(source));
      const formal = new RegExp(rules.formalPattern);
      const out = [];
      document.querySelectorAll("section.screen").forEach((screen) => {
        const frame = screen.querySelector(".frame");
        if (!frame) return;
        const formalAllowed = exceptions.formalScreens.includes(screen.id);
        const walker = document.createTreeWalker(frame, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const text = (node.nodeValue || "").replace(/\s+/g, " ").trim();
          if (text.length < 2) continue;
          const element = node.parentElement;
          if (!element || element.closest(exceptions.userContentSelectors)) continue;
          const style = getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden") continue;
          const push = (kind, detail) => out.push({
            screen: screen.id,
            kind,
            text: text.slice(0, 60),
            detail,
          });
          const padded = ` ${text}`;
          if (!ordinal.test(padded) && secondPerson.some((pattern) => pattern.test(padded))) {
            push("2인칭 반말", "이름 또는 1인칭 소유로 바꾸거나 주어를 생략한다");
          }
          if (!formalAllowed && !element.closest(exceptions.formalBlocks) && formal.test(text)) {
            push("말투 혼용", "제품 화면은 해요체. 법률·관리자·동의 문구만 합니다체");
          }
          for (const [word, detail] of rules.banned) {
            if (text.includes(word)) push("금지 사전", `"${word}" → ${detail}`);
          }
        }
      });
      return out;
    },
    { rules: VOICE_RULES, exceptions: VOICE_EXCEPTIONS.prototype },
  );
  await browser.close();
  return result;
}

function collectFiles(directory, predicate, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(file, predicate, output);
    else if (predicate(file)) output.push(file);
  }
  return output;
}

function normalized(file) {
  return file.split(path.sep).join("/");
}

function lintProductSource() {
  const sourceRoot = path.join(repoRoot, "web/src");
  const files = collectFiles(sourceRoot, (file) => file.endsWith(".tsx"))
    .filter((file) => !VOICE_EXCEPTIONS.product.testPathMarkers.some((marker) => normalized(file).includes(marker)));
  const accessibility = new Set(VOICE_EXCEPTIONS.product.accessibilityAttributes);
  const direct = [];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const push = (node, kind, text) => direct.push({
      file: normalized(path.relative(repoRoot, file)),
      line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
      kind,
      text: text.slice(0, 80),
    });

    function visit(node, insideJsxExpression = false) {
      if (ts.isJsxAttribute(node)) {
        const name = node.name.getText(sourceFile);
        if (accessibility.has(name)) return;
        const initializer = node.initializer;
        const literal = initializer && (
          ts.isStringLiteral(initializer)
            ? initializer
            : ts.isJsxExpression(initializer) && initializer.expression && ts.isStringLiteral(initializer.expression)
              ? initializer.expression
              : null
        );
        if (literal && /[가-힣]/.test(literal.text)) push(literal, `JSX attribute ${name}`, literal.text);
        return;
      }
      if (ts.isJsxText(node) && /[가-힣]/.test(node.text)) push(node, "JSXText", node.text.trim());
      else if (insideJsxExpression && ts.isStringLiteral(node) && /[가-힣]/.test(node.text)) {
        push(node, "JSX expression string", node.text);
      }
      const nextInside = insideJsxExpression || ts.isJsxExpression(node);
      ts.forEachChild(node, (child) => visit(child, nextInside));
    }
    visit(sourceFile);
  }
  return direct;
}

function lintProductCopy() {
  const copyRoot = path.join(repoRoot, "web/src/lib/copy");
  const files = collectFiles(copyRoot, (file) => file.endsWith(".ts"));
  const findings = [];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    let originalSource = normalized(path.relative(repoRoot, file));
    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (declaration.name.getText(sourceFile) === "PRODUCT_COPY_SOURCE" && declaration.initializer && ts.isStringLiteral(declaration.initializer)) {
          originalSource = declaration.initializer.text;
        }
      }
    }
    const formalAllowed = VOICE_EXCEPTIONS.product.formalSourceMarkers.some((marker) => normalized(originalSource).includes(marker));

    function visit(node) {
      if (ts.isStringLiteral(node) && /[가-힣]/.test(node.text)) {
        const userAuthored = VOICE_EXCEPTIONS.product.userAuthoredCopy.includes(node.text);
        const copyFormalAllowed = formalAllowed || VOICE_EXCEPTIONS.product.formalCopy.includes(node.text);
        for (const issue of voiceFindings(node.text, { formalAllowed: copyFormalAllowed, userAuthored })) {
          findings.push({
            file: normalized(path.relative(repoRoot, file)),
            source: originalSource,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
            text: node.text.slice(0, 80),
            ...issue,
          });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }
  return findings;
}

const report = {};
if (checkPrototype) report.prototype = await lintPrototype();
if (checkProduct) {
  report.product = {
    directCopy: lintProductSource(),
    voice: lintProductCopy(),
    declaredExceptions: {
      accessibilityAttributes: VOICE_EXCEPTIONS.product.accessibilityAttributes,
      testPathMarkers: VOICE_EXCEPTIONS.product.testPathMarkers,
    },
  };
}

const failureCount = (report.prototype?.length ?? 0) +
  (report.product?.directCopy.length ?? 0) +
  (report.product?.voice.length ?? 0);

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  if (report.prototype) {
    console.log(`프로토타입 말투 위반 ${report.prototype.length}건`);
    for (const item of report.prototype) console.log(`[${item.screen}] ${item.kind}: ${item.text} (${item.detail})`);
  }
  if (report.product) {
    console.log(`제품 직접 카피 ${report.product.directCopy.length}건`);
    for (const item of report.product.directCopy) console.log(`${item.file}:${item.line} ${item.kind}: ${item.text}`);
    console.log(`제품 말투 위반 ${report.product.voice.length}건`);
    for (const item of report.product.voice) console.log(`${item.source}:${item.line} ${item.kind}: ${item.text} (${item.detail})`);
    console.log(`선언된 접근성 속성 예외 ${report.product.declaredExceptions.accessibilityAttributes.length}개`);
    console.log(`선언된 테스트 경로 예외 ${report.product.declaredExceptions.testPathMarkers.length}개`);
  }
  console.log(`판정: ${failureCount ? "FAIL" : "PASS"} (${failureCount}건)`);
}
process.exit(failureCount ? 1 : 0);
