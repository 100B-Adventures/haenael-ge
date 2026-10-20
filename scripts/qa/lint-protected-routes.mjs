#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repo = resolve(new URL("../..", import.meta.url).pathname);
const contract = JSON.parse(readFileSync(resolve(repo, "qa/contracts/protected-routes.json"), "utf8"));
const missing = [];
for (const root of contract.scanRoots) {
  const relative = root.slice(1);
  const directory = resolve(repo, `web/src/app/(receiver)/${relative}`);
  if (!existsSync(directory)) continue;
  const covered = contract.exact.includes(root) && contract.prefix.includes(`${root}/`);
  if (!covered) missing.push(root);
}
const invitePublic = contract.exact.includes("/invite") && !contract.prefix.includes("/invite/");
console.log(`PROTECTED_ROUTE_LINT roots=${contract.scanRoots.length} missing=${missing.length} invite_public=${invitePublic}`);
if (missing.length || !invitePublic) {
  console.error(`PROTECTED_ROUTE_LINT_FAIL missing=${missing.join(",") || "none"}`);
  process.exit(1);
}
console.log("PROTECTED_ROUTE_LINT_PASS missing=0");
