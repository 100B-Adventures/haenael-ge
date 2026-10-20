#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const repo = resolve(new URL("../..", import.meta.url).pathname);
const require = createRequire(import.meta.url);
const ts = require(resolve(repo, "web/node_modules/typescript"));
const sourceRoot = resolve(repo, "web/src");
const css = readFileSync(resolve(sourceRoot, "app/globals.css"), "utf8");
const boundaryFixture = readFileSync(resolve(repo, "scripts/qa/fixtures/web-custom-class-boundary.css"), "utf8");
const prefixes = /^(?:social|cheer|receiver|landing|guest|collapse|clamp|legal|business|my-cheer|tabbar|invite)-/;
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasClassRule = (stylesheet, token) => new RegExp(`\\.${escapeRegExp(token)}(?=[\\s.#:[>+~,({])`).test(stylesheet.replace(/\/\*[\s\S]*?\*\//g, ""));
if (hasClassRule(boundaryFixture, "cheer-list") || !hasClassRule(boundaryFixture, "cheer-list-reset")) {
  console.error("WEB_CUSTOM_CLASS_FIXTURE_FAIL boundary_match");
  process.exit(2);
}
console.log("WEB_CUSTOM_CLASS_FIXTURE_PASS false_positive=cheer-list");
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.tsx?$/.test(name) && !/(?:\.test\.|\.stories\.)/.test(name)) files.push(path);
  }
}
walk(sourceRoot);
const used = new Set();
function addTokens(value) {
  for (const token of value.split(/\s+/)) {
    if (prefixes.test(token) && !token.endsWith("-")) used.add(token);
  }
}
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const variables = new Map();
  const collectVariables = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) variables.set(node.name.text, node.initializer);
    ts.forEachChild(node, collectVariables);
  };
  collectVariables(sourceFile);
  const collectExpression = (node, seen = new Set()) => {
    if (!node) return;
    if (ts.isStringLiteralLike(node)) return addTokens(node.text);
    if (ts.isTemplateExpression(node)) {
      addTokens(node.head.text);
      for (const span of node.templateSpans) addTokens(span.literal.text);
      return;
    }
    if (ts.isIdentifier(node) && variables.has(node.text) && !seen.has(node.text)) {
      const next = new Set(seen).add(node.text);
      return collectExpression(variables.get(node.text), next);
    }
    if (ts.isConditionalExpression(node)) {
      collectExpression(node.whenTrue, seen);
      collectExpression(node.whenFalse, seen);
      return;
    }
    if (ts.isBinaryExpression(node)) {
      collectExpression(node.left, seen);
      collectExpression(node.right, seen);
      return;
    }
    if (ts.isCallExpression(node) || ts.isArrayLiteralExpression(node)) {
      for (const argument of node.arguments ?? node.elements) collectExpression(argument, seen);
      return;
    }
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property)) {
          if (ts.isStringLiteralLike(property.name)) addTokens(property.name.text);
          collectExpression(property.initializer, seen);
        }
      }
    }
  };
  const visit = (node) => {
    if (ts.isJsxAttribute(node) && node.name.text === "className" && node.initializer) {
      if (ts.isStringLiteral(node.initializer)) addTokens(node.initializer.text);
      else if (ts.isJsxExpression(node.initializer)) collectExpression(node.initializer.expression);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}
const missing = [...used].filter((token) => !hasClassRule(css, token)).sort();
console.log(`WEB_CUSTOM_CLASS_LINT used=${used.size} missing=${missing.length}`);
if (missing.length) {
  console.error(`WEB_CUSTOM_CLASS_LINT_FAIL ${missing.join(",")}`);
  process.exit(1);
}
console.log("WEB_CUSTOM_CLASS_LINT_PASS missing=0");
