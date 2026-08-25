#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const node = process.execPath;

const cases = [
  {
    id: "ENV-BASELINE",
    script: "scripts/qa/check-deploy-env.mjs",
    args: ["--target", "vercel-production", "--source", "file", "--names-file", "qa/fixtures/vercel-production-env.names"],
    expected: 0,
  },
  {
    id: "MUTATION-ENV-SERVICE-ROLE",
    script: "scripts/qa/check-deploy-env.mjs",
    args: ["--target", "vercel-production", "--source", "file", "--names-file", "qa/fixtures/vercel-production-env.names", "--mutation", "drop:SUPABASE_SERVICE_ROLE_KEY"],
    expected: 1,
  },
  {
    id: "MUTATION-ENV-NOTIFY-TOKEN-VERCEL",
    script: "scripts/qa/check-deploy-env.mjs",
    args: ["--target", "vercel-production", "--source", "file", "--names-file", "qa/fixtures/vercel-production-env.names", "--mutation", "drop:NOTIFY_INTERNAL_TOKEN"],
    expected: 1,
  },
  {
    id: "MUTATION-ENV-NOTIFY-TOKEN-SUPABASE",
    script: "scripts/qa/check-deploy-env.mjs",
    args: ["--target", "supabase-production", "--source", "file", "--names-file", "qa/fixtures/supabase-production-env.names", "--mutation", "drop:NOTIFY_INTERNAL_TOKEN"],
    expected: 1,
  },
  {
    id: "MUTATION-LAYER-UI-THRESHOLD",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "ui-payable-threshold"],
    expected: 1,
  },
  {
    id: "MUTATION-LAYER-DB-THRESHOLD",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "db-request-threshold"],
    expected: 1,
  },
  {
    id: "MUTATION-LAYER-FEE-RATE",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "db-fee-rate"],
    expected: 1,
  },
  {
    id: "MUTATION-NOTIFY-SWALLOWED-FAILURE",
    script: "scripts/qa/check-cashout-notification-contract.mjs",
    args: ["--mutation", "swallow-notify-failure"],
    expected: 1,
  },
];

let failed = 0;
for (const testCase of cases) {
  const result = spawnSync(node, [join(repoRoot, testCase.script), ...testCase.args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const actual = result.status ?? 2;
  const passed = actual === testCase.expected;
  console.log(`${passed ? "PASS" : "FAIL"} ${testCase.id} expected_rc=${testCase.expected} actual_rc=${actual}`);
  if (!passed) failed += 1;
}

console.log(`MUTATION_SUMMARY cases=${cases.length} failures=${failed}`);
process.exit(failed ? 1 : 0);
