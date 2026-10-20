#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const repo = resolve(new URL("../..", import.meta.url).pathname);
const sourceRoot = resolve(repo, "web/src");
const css = readFileSync(resolve(sourceRoot, "app/globals.css"), "utf8");
const prefixes = /^(?:social|cheer|receiver|landing|guest|collapse|clamp|legal|business|my-cheer)-/;
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
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/className=(?:"([^"]+)"|`([^`]+)`)/g)) {
    for (const token of (match[1] ?? match[2] ?? "").split(/\s+/)) {
      if (prefixes.test(token)) used.add(token);
    }
  }
}
const missing = [...used].filter((token) => !css.includes(`.${token}`)).sort();
console.log(`WEB_CUSTOM_CLASS_LINT used=${used.size} missing=${missing.length}`);
if (missing.length) {
  console.error(`WEB_CUSTOM_CLASS_LINT_FAIL ${missing.join(",")}`);
  process.exit(1);
}
console.log("WEB_CUSTOM_CLASS_LINT_PASS missing=0");
