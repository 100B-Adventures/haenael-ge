#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const repo = resolve(new URL("../..", import.meta.url).pathname);
const contract = JSON.parse(readFileSync(resolve(repo, "qa/contracts/protected-routes.json"), "utf8"));
const receiverRoot = resolve(repo, "web/src/app/(receiver)");
const actualRoots = readdirSync(receiverRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith("("))
  .map((entry) => `/${entry.name}`)
  .sort();
const publicRoutes = new Set(contract.scanRoots);
const missing = actualRoots.filter((root) => {
  const fullyProtected = contract.exact.includes(root) && contract.prefix.includes(`${root}/`);
  const fullyPublic = publicRoutes.has(root);
  const protectedRootWithPublicChildren = contract.exact.includes(root) && publicRoutes.has(`${root}/`);
  return !fullyProtected && !fullyPublic && !protectedRootWithPublicChildren;
});
const invitePublic = contract.exact.includes("/invite") && !contract.prefix.includes("/invite/");
console.log(`PROTECTED_ROUTE_LINT actual_roots=${actualRoots.length} public_entries=${publicRoutes.size} missing=${missing.length} invite_public=${invitePublic}`);
if (missing.length || !invitePublic) {
  console.error(`PROTECTED_ROUTE_LINT_FAIL missing=${missing.join(",") || "none"}`);
  process.exit(1);
}
console.log("PROTECTED_ROUTE_LINT_PASS missing=0");
