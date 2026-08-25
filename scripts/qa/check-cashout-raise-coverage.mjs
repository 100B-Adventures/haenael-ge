#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationsDir = join(repoRoot, "supabase/migrations");
const latest = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .reverse()
  .find((name) => readFileSync(join(migrationsDir, name), "utf8").includes("CREATE OR REPLACE FUNCTION public.create_cashout_request"));

if (!latest) process.exit(2);
const migration = readFileSync(join(migrationsDir, latest), "utf8");
const test = readFileSync(join(repoRoot, "supabase/tests/cashout_manual.test.sql"), "utf8");
const raised = new Set([...migration.matchAll(/RAISE EXCEPTION '([^']+)'/g)].map((match) => match[1]));
const covered = new Set([...test.matchAll(/'[0-9A-Z]{5}',\s*'([^']+)'/g)].map((match) => match[1]));
const missing = [...raised].filter((code) => !covered.has(code)).sort();

for (const code of [...raised].sort()) {
  console.log(`${covered.has(code) ? "PASS" : "FAIL"} RAISE ${code}`);
}
console.log(`RAISE_COVERAGE source=${latest} unique=${raised.size} covered=${raised.size - missing.length} missing=${missing.length}`);
if (missing.length) {
  console.error(`RAISE_COVERAGE_FAIL missing=${missing.join(",")}`);
  process.exit(1);
}
console.log("RAISE_COVERAGE_PASS");
