#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const repo = resolve(new URL("../..", import.meta.url).pathname);
const contract = JSON.parse(readFileSync(resolve(repo, "qa/contracts/protected-routes.json"), "utf8"));
const receiverRoot = resolve(repo, "web/src/app/(receiver)");
const adminRoot = resolve(repo, "web/src/app/admin");
const publicRoutes = new Set(contract.scanRoots);
const routeFromRelativePage = (page) => {
  const parts = page.split(sep).slice(0, -1)
    .filter((part) => !part.startsWith("(") && !part.startsWith("_") && part !== "admin-root");
  return `/${parts.join("/")}`.replace(/\/$/, "") || "/";
};
const pages = [];
function walk(root, directory = root, prefix = "") {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(root, path, prefix);
    else if (entry.name === "page.tsx") pages.push(routeFromRelativePage(`${prefix}${relative(root, path)}`));
  }
}
walk(receiverRoot);
walk(adminRoot, adminRoot, `admin${sep}`);
const actualRoutes = [...new Set(pages)].sort();
const isProtected = (route) => contract.exact.includes(route) || contract.prefix.some((prefix) => route.startsWith(prefix));
const isPublic = (route) => contract.scanRoots.some((entry) => entry.endsWith("/") ? route.startsWith(entry) : route === entry);
const missing = actualRoutes.filter((route) => !isProtected(route) && !isPublic(route));
const nestedFixtureRoute = routeFromRelativePage(`(zzgroup)${sep}zz-hidden${sep}page.tsx`);
const nestedFixtureCaught = !isProtected(nestedFixtureRoute) && !isPublic(nestedFixtureRoute);
const invitePublic = contract.exact.includes("/invite") && !contract.prefix.includes("/invite/");
const adminScanned = actualRoutes.includes("/admin") && isProtected("/admin") && isProtected("/admin/example");
console.log(`PROTECTED_ROUTE_FIXTURE nested_route=${nestedFixtureRoute} caught=${nestedFixtureCaught}`);
console.log(`PROTECTED_ROUTE_LINT actual_routes=${actualRoutes.length} public_entries=${publicRoutes.size} missing=${missing.length} invite_public=${invitePublic} admin_scanned=${adminScanned}`);
if (missing.length || !invitePublic || !nestedFixtureCaught || !adminScanned) {
  console.error(`PROTECTED_ROUTE_LINT_FAIL missing=${missing.join(",") || "none"}`);
  process.exit(1);
}
console.log("PROTECTED_ROUTE_LINT_PASS missing=0");
