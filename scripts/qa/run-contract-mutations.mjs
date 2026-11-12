#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const node = process.execPath;

function verifyVercelPackageBoundary() {
  const packageRoot = mkdtempSync(join(tmpdir(), "haenael-vercel-package-"));
  try {
    const manifest = spawnSync("git", [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      "web",
    ], { cwd: repoRoot, encoding: "utf8" });
    if (manifest.status !== 0) {
      return [{
        id: "VERCEL-PACKAGE-MANIFEST",
        passed: false,
        detail: `expected_rc=0 actual_rc=${manifest.status ?? 2}`,
      }];
    }
    const packageFiles = manifest.stdout.split(/\r?\n/).filter(Boolean);
    for (const sourcePath of packageFiles) {
      const destination = join(packageRoot, relative("web", sourcePath));
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(join(repoRoot, sourcePath), destination, { verbatimSymlinks: true });
    }

    const dependencies = spawnSync("npm", [
      "ci",
      "--prefer-offline",
      "--no-audit",
      "--no-fund",
    ], { cwd: packageRoot, encoding: "utf8" });
    if (dependencies.status !== 0) {
      return [{
        id: "VERCEL-PACKAGE-DEPENDENCIES",
        passed: false,
        detail: `expected_rc=0 actual_rc=${dependencies.status ?? 2}`,
      }];
    }

    const names = readFileSync(join(repoRoot, "qa/fixtures/vercel-production-env.names"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const env = {
      ...process.env,
      VERCEL: "1",
      VERCEL_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
    };
    for (const name of names) env[name] = "contract-test-value";
    Object.assign(env, {
      NEXT_PUBLIC_APP_URL: "https://haenael-package-boundary.example",
      NEXT_PUBLIC_SUPABASE_URL: "https://package-boundary.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "package-boundary-anon-key",
      NEXT_PUBLIC_PAYMENTS_ENABLED: "false",
      CASHOUT_ENABLED: "false",
      CASHOUT_ACCOUNT_ACTIVE_KEY_VERSION: "v1",
      CASHOUT_ACCOUNT_ENCRYPTION_KEYS: JSON.stringify({
        v1: Buffer.alloc(32, "package-boundary").toString("base64"),
      }),
      CASHOUT_ACCOUNT_FINGERPRINT_KEY: Buffer.alloc(32, "fingerprint").toString("base64"),
    });

    const runBoundary = () => spawnSync(node, ["scripts/qa/check-web-package-boundary.mjs"], {
      cwd: packageRoot,
      env,
      encoding: "utf8",
    });
    const outputOf = (result) => `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    const resultFor = (id, result, expected, expectedOutput) => {
      const output = outputOf(result);
      const passed = result.status === expected && (!expectedOutput || output.includes(expectedOutput));
      if (!passed) {
        console.error(`PACKAGE_BOUNDARY_DIAGNOSTIC id=${id}\n${output.split("\n").slice(-40).join("\n")}`);
      }
      return {
        id,
        passed,
        detail: `expected_rc=${expected} actual_rc=${result.status ?? 2} expected_output=${expectedOutput ?? "n/a"}`,
      };
    };
    const mutate = (id, path, transform, expectedOutput) => {
      const original = readFileSync(path, "utf8");
      const mutated = transform(original);
      // 치환 대상 문자열이 원본에서 사라지면 변이가 적용되지 않아 "막혀야 할 것이 통과" 하는 거짓 FAIL/PASS 가 된다.
      if (mutated === original) {
        return { id, passed: false, detail: `mutation_not_applied path=${path}` };
      }
      try {
        writeFileSync(path, mutated);
        return resultFor(id, runBoundary(), 1, expectedOutput);
      } finally {
        writeFileSync(path, original);
      }
    };

    const baselineBoundary = runBoundary();
    const baselinePrebuild = spawnSync("npm", ["run", "prebuild"], { cwd: packageRoot, env, encoding: "utf8" });
    const missingEnv = { ...env };
    delete missingEnv.SUPABASE_SERVICE_ROLE_KEY;
    const missingEnvResult = spawnSync("npm", ["run", "prebuild"], {
      cwd: packageRoot,
      env: missingEnv,
      encoding: "utf8",
    });
    const isolatedBuild = spawnSync("npm", ["run", "build"], { cwd: packageRoot, env, encoding: "utf8" });

    const proxyPath = join(packageRoot, "src/proxy.ts");
    const nextConfigPath = join(packageRoot, "next.config.ts");
    const packageJsonPath = join(packageRoot, "package.json");
    const buildTsconfigPath = join(packageRoot, "tsconfig.build.json");
    const generatedMutationPath = join(packageRoot, "src/lib/copy/generated/package-boundary-mutation.ts");
    writeFileSync(generatedMutationPath, 'import value from "../../../../../../outside.json";\nexport default value;\n');
    const generatedMutation = resultFor(
      "MUTATION-PACKAGE-GENERATED-IMPORT",
      runBoundary(),
      1,
      "source-import-outside",
    );
    rmSync(generatedMutationPath);

    const rootContract = join(repoRoot, "qa/contracts/protected-routes.json");
    const canonicalContract = join(repoRoot, "web/qa/contracts/protected-routes.json");
    const contractAligned = lstatSync(rootContract).isSymbolicLink() &&
      realpathSync(rootContract) === realpathSync(canonicalContract);
    const rootBoundaryChecker = join(repoRoot, "scripts/qa/check-web-package-boundary.mjs");
    const canonicalBoundaryChecker = join(repoRoot, "web/scripts/qa/check-web-package-boundary.mjs");
    const boundaryCheckerAligned = lstatSync(rootBoundaryChecker).isSymbolicLink() &&
      realpathSync(rootBoundaryChecker) === realpathSync(canonicalBoundaryChecker);

    return [
      {
        id: "VERCEL-PACKAGE-MANIFEST",
        passed: packageFiles.length > 0,
        detail: `candidate_files=${packageFiles.length}`,
      },
      resultFor("VERCEL-PACKAGE-CLEAN-INSTALL", dependencies, 0),
      resultFor("VERCEL-PACKAGE-BOUNDARY", baselineBoundary, 0, "WEB_PACKAGE_BOUNDARY_PASS"),
      resultFor("VERCEL-PACKAGE-PREBUILD", baselinePrebuild, 0, "ENV_TARGET_PASS missing=0"),
      resultFor("VERCEL-PACKAGE-MISSING-ENV", missingEnvResult, 1, "ENV_TARGET_FAIL missing_names=SUPABASE_SERVICE_ROLE_KEY"),
      resultFor("VERCEL-PACKAGE-BUILD", isolatedBuild, 0),
      mutate(
        "MUTATION-PACKAGE-SOURCE-IMPORT",
        proxyPath,
        (source) => source.replace('"../qa/contracts/protected-routes.json"', '"../../qa/contracts/protected-routes.json"'),
        "source-import-outside",
      ),
      mutate(
        "MUTATION-PACKAGE-SOURCE-ABSOLUTE-IMPORT",
        proxyPath,
        (source) => source.replace(
          '"../qa/contracts/protected-routes.json"',
          JSON.stringify(rootContract),
        ),
        "source-import-outside",
      ),
      mutate(
        "MUTATION-PACKAGE-SOURCE-TEMPLATE-IMPORT",
        proxyPath,
        (source) => source.replace(
          'import protectedRoutes from "../qa/contracts/protected-routes.json";',
          'const protectedRoutes = (await import(`../../qa/contracts/protected-routes.json`)).default;',
        ),
        "source-import-outside",
      ),
      mutate(
        "MUTATION-PACKAGE-SOURCE-REQUIRE-RESOLVE",
        proxyPath,
        (source) => `${source}\nrequire.resolve("../../outside.js");\n`,
        "source-import-outside",
      ),
      mutate(
        "MUTATION-PACKAGE-SOURCE-ASSET-URL",
        proxyPath,
        (source) => `${source}\nnew URL("../../outside.svg", import.meta.url);\n`,
        "source-import-outside",
      ),
      mutate(
        "MUTATION-PACKAGE-NEXT-CONFIG-IMPORT",
        nextConfigPath,
        (source) => `import "../qa/contracts/protected-routes.json";\n${source}`,
        "next-config-import-outside",
      ),
      mutate(
        "MUTATION-PACKAGE-NEXT-CONFIG-FILESYSTEM",
        nextConfigPath,
        (source) => `${source}\nreadFileSync(path.join(__dirname, "../outside.json"), "utf8");\n`,
        "next-config-path-outside",
      ),
      mutate(
        "MUTATION-PACKAGE-NEXT-ROOT",
        nextConfigPath,
        (source) => source.replace("root: __dirname", 'root: path.join(__dirname, "..")'),
        "next-config-root-not-web",
      ),
      mutate(
        "MUTATION-PACKAGE-NEXT-ROOT-ALIAS",
        nextConfigPath,
        (source) => source.replace("root: __dirname", "root: path.dirname(__dirname)"),
        "next-config-root-not-web",
      ),
      mutate(
        "MUTATION-PACKAGE-NEXT-ROOT-COMMENT-MASK",
        nextConfigPath,
        (source) => source.replace(
          "root: __dirname",
          "root: path.dirname(__dirname), // root: __dirname",
        ),
        "next-config-root-not-web",
      ),
      mutate(
        "MUTATION-PACKAGE-BUILD-TSCONFIG-BINDING",
        nextConfigPath,
        (source) => source.replace(
          'isDevelopment ? "tsconfig.json" : "tsconfig.build.json"',
          'isDevelopment ? "tsconfig.json" : "tsconfig.json"',
        ),
        "next-config-build-tsconfig-missing",
      ),
      mutate(
        "MUTATION-PACKAGE-TSCONFIG-EXTENDS",
        buildTsconfigPath,
        (source) => source.replace('"extends": "./tsconfig.json"', '"extends": "../tsconfig.json"'),
        "tsconfig-path-outside",
      ),
      mutate(
        "MUTATION-PACKAGE-TSCONFIG-PATH-ALIAS",
        buildTsconfigPath,
        (source) => source.replace(
          '"incremental": true,',
          '"incremental": true,\n    "paths": { "@outside/*": ["../supabase/*"] },',
        ),
        "tsconfig-path-outside",
      ),
      mutate(
        "MUTATION-PACKAGE-DEPLOY-SCRIPT",
        packageJsonPath,
        (source) => source.replace("node scripts/qa/check-web-package-boundary.mjs", "node ../scripts/qa/check-web-package-boundary.mjs"),
        "deploy-script-outside",
      ),
      mutate(
        "MUTATION-PACKAGE-UNCLASSIFIED-SCRIPT",
        packageJsonPath,
        (source) => source.replace('"lint": "oxlint ."', '"lint": "node ../scripts/qa/lint-web-custom-classes.mjs"'),
        "package-script-unclassified",
      ),
      mutate(
        "MUTATION-PACKAGE-SCRIPT-PARENT-DIRECTORY",
        packageJsonPath,
        (source) => source.replace('"lint": "oxlint ."', '"lint": "cd .. && true"'),
        "package-script-unclassified",
      ),
      mutate(
        "MUTATION-PACKAGE-SCRIPT-NESTED-PARENT",
        packageJsonPath,
        (source) => source.replace('"lint": "oxlint ."', '"lint": "node scripts/../../outside.mjs"'),
        "package-script-unclassified",
      ),
      mutate(
        "MUTATION-PACKAGE-DEPLOY-SCRIPT-TRANSITIVE",
        packageJsonPath,
        (source) => source.replace(
          '"prebuild": "',
          '"prebuild": "npm run test:qa-contracts && ',
        ),
        "deploy-script-depends-outside",
      ),
      mutate(
        "MUTATION-PACKAGE-DEPLOY-SCRIPT-TRANSITIVE-OPTION",
        packageJsonPath,
        (source) => source.replace(
          '"prebuild": "',
          '"prebuild": "npm --silent run qa:verify-production && ',
        ),
        "deploy-script-depends-outside",
      ),
      mutate(
        "MUTATION-PACKAGE-DEPLOY-SCRIPT-TRANSITIVE-RUN-OPTION",
        packageJsonPath,
        (source) => source.replace(
          '"prebuild": "',
          '"prebuild": "npm run --silent qa:verify-production && ',
        ),
        "deploy-script-depends-outside",
      ),
      generatedMutation,
      {
        id: "PROTECTED-ROUTES-SSOT",
        passed: contractAligned,
        detail: `root_symlink=${lstatSync(rootContract).isSymbolicLink()} canonical_aligned=${contractAligned}`,
      },
      {
        id: "PACKAGE-BOUNDARY-CHECKER-SSOT",
        passed: boundaryCheckerAligned,
        detail: `root_symlink=${lstatSync(rootBoundaryChecker).isSymbolicLink()} canonical_aligned=${boundaryCheckerAligned}`,
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
