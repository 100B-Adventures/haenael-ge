#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const node = process.execPath;

function verifyVercelPackageBoundary() {
  const packageRoot = mkdtempSync(join(tmpdir(), "haenael-vercel-package-"));
  try {
    cpSync(join(repoRoot, "web/package.json"), join(packageRoot, "package.json"));
    cpSync(join(repoRoot, "web/scripts"), join(packageRoot, "scripts"), { recursive: true });
    cpSync(join(repoRoot, "web/qa"), join(packageRoot, "qa"), { recursive: true });
    cpSync(join(repoRoot, "web/src"), join(packageRoot, "src"), { recursive: true });

    const names = readFileSync(join(repoRoot, "qa/fixtures/vercel-production-env.names"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const env = { ...process.env, VERCEL: "1", VERCEL_ENV: "production" };
    for (const name of names) env[name] = "contract-test-value";

    const baseline = spawnSync("npm", ["run", "prebuild"], { cwd: packageRoot, env, encoding: "utf8" });
    const missingEnv = { ...env };
    delete missingEnv.SUPABASE_SERVICE_ROLE_KEY;
    const mutation = spawnSync("npm", ["run", "prebuild"], { cwd: packageRoot, env: missingEnv, encoding: "utf8" });
    const baselineOutput = `${baseline.stdout ?? ""}\n${baseline.stderr ?? ""}`;
    const mutationOutput = `${mutation.stdout ?? ""}\n${mutation.stderr ?? ""}`;

    return [
      {
        id: "VERCEL-PACKAGE-BASELINE",
        passed: baseline.status === 0 && baselineOutput.includes("ENV_TARGET_PASS missing=0"),
        detail: `expected_rc=0 actual_rc=${baseline.status ?? 2}`,
      },
      {
        id: "VERCEL-PACKAGE-MISSING-ENV",
        passed: mutation.status === 1 && mutationOutput.includes("ENV_TARGET_FAIL missing_names=SUPABASE_SERVICE_ROLE_KEY"),
        detail: `expected_rc=1 actual_rc=${mutation.status ?? 2}`,
      },
    ];
  } finally {
    rmSync(packageRoot, { recursive: true, force: true });
  }
}

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
    id: "CASHOUT-BASELINE",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: [],
    expected: 0,
    expectedOutput: "CASHOUT_CONTRACT_PASS",
  },
  {
    id: "MUTATION-LAYER-UI-THRESHOLD",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "ui-payable-threshold"],
    expected: 1,
    expectedOutput: "FAIL minimum.web-total-threshold",
  },
  {
    id: "MUTATION-LAYER-DB-THRESHOLD",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "db-request-threshold"],
    expected: 1,
    expectedOutput: "FAIL minimum.db-request-lower-bound",
  },
  {
    id: "MUTATION-LAYER-FEE-RATE",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "db-fee-rate"],
    expected: 1,
    expectedOutput: "FAIL amount.db-fee",
  },
  {
    id: "MUTATION-COPY-FORM-BINDING",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "drop-form-copy-binding"],
    expected: 1,
    expectedOutput: "FAIL copy.web-zero-payable-binding",
  },
  {
    id: "MUTATION-COPY-STATUS-BINDING",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "drop-status-copy-binding"],
    expected: 1,
    expectedOutput: "FAIL copy.status-threshold-template-binding",
  },
  {
    id: "MUTATION-COPY-TERMS-CASHOUT-BINDING",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "drop-terms-cashout-binding"],
    expected: 1,
    expectedOutput: "FAIL terms.cashout-active-binding",
  },
  {
    id: "MUTATION-COPY-TERMS-ELIGIBILITY-BINDING",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "drop-terms-eligibility-binding"],
    expected: 1,
    expectedOutput: "FAIL terms.kyc-absence-allowed-binding",
  },
  {
    id: "MUTATION-COPY-TERMS-PAYOUT-BINDING",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "drop-terms-payout-binding"],
    expected: 1,
    expectedOutput: "FAIL terms.manual-account-payout-binding",
  },
  {
    id: "MUTATION-COPY-TERMS-TAX-BINDING",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "drop-terms-tax-binding"],
    expected: 1,
    expectedOutput: "FAIL terms.tax-boundary-binding",
  },
  {
    id: "MUTATION-COPY-TERMS-SWAPPED-BINDINGS",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "swap-terms-copy-bindings"],
    expected: 1,
    expectedOutput: "FAIL terms.cashout-active-binding",
  },
  {
    id: "MUTATION-COPY-FORM-CONTENT",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "corrupt-form-copy"],
    expected: 1,
    expectedOutput: "FAIL copy.web-zero-payable-explains-welcome",
  },
  {
    id: "MUTATION-COPY-STATUS-CONTENT",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "corrupt-status-copy"],
    expected: 1,
    expectedOutput: "FAIL copy.status-total-threshold",
  },
  {
    id: "MUTATION-COPY-TERMS-CASHOUT-CONTENT",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "corrupt-terms-cashout-copy"],
    expected: 1,
    expectedOutput: "FAIL terms.cashout-active",
  },
  {
    id: "MUTATION-COPY-TERMS-ELIGIBILITY-CONTENT",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "corrupt-terms-eligibility-copy"],
    expected: 1,
    expectedOutput: "FAIL terms.kyc-absence-allowed",
  },
  {
    id: "MUTATION-COPY-TERMS-PAYOUT-CONTENT",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "corrupt-terms-payout-copy"],
    expected: 1,
    expectedOutput: "FAIL terms.manual-account-payout",
  },
  {
    id: "MUTATION-COPY-TERMS-TAX-CONTENT",
    script: "scripts/qa/check-cashout-layer-contract.mjs",
    args: ["--mutation", "corrupt-terms-tax-copy"],
    expected: 1,
    expectedOutput: "FAIL terms.tax-boundary",
  },
  {
    id: "MUTATION-NOTIFY-SWALLOWED-FAILURE",
    script: "scripts/qa/check-cashout-notification-contract.mjs",
    args: ["--mutation", "swallow-notify-failure"],
    expected: 1,
  },
];

let failed = 0;
const packageBoundaryResults = verifyVercelPackageBoundary();
for (const result of packageBoundaryResults) {
  console.log(`${result.passed ? "PASS" : "FAIL"} ${result.id} ${result.detail}`);
  if (!result.passed) failed += 1;
}
for (const testCase of cases) {
  const result = spawnSync(node, [join(repoRoot, testCase.script), ...testCase.args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const actual = result.status ?? 2;
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const outputMatched = !testCase.expectedOutput || output.includes(testCase.expectedOutput);
  const passed = actual === testCase.expected && outputMatched;
  console.log(`${passed ? "PASS" : "FAIL"} ${testCase.id} expected_rc=${testCase.expected} actual_rc=${actual} expected_output=${testCase.expectedOutput ?? "n/a"} output_matched=${outputMatched}`);
  if (!passed) failed += 1;
}

console.log(`MUTATION_SUMMARY cases=${cases.length + packageBoundaryResults.length} failures=${failed}`);
process.exit(failed ? 1 : 0);
