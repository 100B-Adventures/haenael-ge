#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "../..");
const workspaceCandidate = resolve(projectRoot, "..");
const workspaceRoot = existsSync(join(workspaceCandidate, "web/src")) ? workspaceCandidate : projectRoot;
const contractPath = join(projectRoot, "qa/contracts/deploy-env.contract.json");
const contract = JSON.parse(readFileSync(contractPath, "utf8"));
const args = process.argv.slice(2);
const dbContainer = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_haenael-ge";

function argValue(name, fallback = undefined) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function extractCodeEnvNames() {
  const names = new Set();
  const processPattern = /process\.env\.([A-Z][A-Z0-9_]*)/g;
  const denoPattern = /Deno\.env\.get\(["']([A-Z][A-Z0-9_]*)["']\)/g;
  for (const sourceRoot of contract.sourceRoots) {
    const workspacePath = join(workspaceRoot, sourceRoot);
    const packagedPath = join(projectRoot, sourceRoot.startsWith("web/") ? sourceRoot.slice("web/".length) : sourceRoot);
    const resolvedSourceRoot = existsSync(workspacePath) ? workspacePath : packagedPath;
    for (const path of walk(resolvedSourceRoot)) {
      if (!/\.(?:ts|tsx|js|mjs)$/.test(path) || /(?:\.test\.|__tests__)/.test(path)) continue;
      const source = readFileSync(path, "utf8");
      for (const pattern of [processPattern, denoPattern]) {
        pattern.lastIndex = 0;
        for (const match of source.matchAll(pattern)) names.add(match[1]);
      }
    }
  }
  return names;
}

function assertInventoryClassified() {
  const discovered = extractCodeEnvNames();
  const declared = new Set(Object.keys(contract.variables));
  const system = new Set(contract.systemVariables);
  const unclassified = [...discovered].filter((name) => !declared.has(name) && !system.has(name)).sort();
  console.log(`ENV_CODE_INVENTORY discovered=${discovered.size} classified=${discovered.size - unclassified.length}`);
  if (unclassified.length) {
    console.error(`ENV_CONTRACT_FAIL unclassified=${unclassified.join(",")}`);
    return false;
  }
  console.log(`ENV_CONTRACT_CONDITIONAL ${conditionallyRequired().join(" ") || "none"}`);
  console.log("ENV_CONTRACT_PASS unclassified=0");
  return true;
}

function requiredForTarget(targetName) {
  const target = contract.targets[targetName];
  if (!target) throw new Error(`unknown target: ${targetName}`);
  const enabled = new Set(target.features);
  return Object.entries(contract.variables)
    .filter(([, rule]) => !rule.optional)
    .filter(([, rule]) => rule.targets.includes(targetName))
    .filter(([, rule]) => rule.features.some((feature) => enabled.has(feature)))
    .map(([name, rule]) => ({ name, features: rule.features.filter((feature) => enabled.has(feature)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// 조건부 필수: 다른 변수의 값에 따라 필수가 되는 항목이다. 이 검사는 변수 존재만
// 보고 값은 못 읽으므로(운영 값은 Secret) 차단하지 않고 목록으로 드러낸다.
// 값으로 판정하는 자리는 런타임 경고다(web/src/lib/supabase/service.ts 의 빈 목록 경고).
function conditionallyRequired() {
  return Object.entries(contract.variables)
    .filter(([, rule]) => rule.requiredWhen)
    .map(([name, rule]) => `${name}(${rule.requiredWhen})`)
    .sort();
}

function requiredVaultForTarget(targetName) {
  const target = contract.targets[targetName];
  if (!target) throw new Error(`unknown target: ${targetName}`);
  const enabled = new Set(target.features);
  return (contract.vaultSecrets ?? [])
    .filter((rule) => enabled.has(rule.feature))
    .map((rule) => rule.name)
    .sort();
}

function parseDotenvValues(source) {
  const values = new Map();
  for (const line of source.split(/\r?\n/)) {
    const normalized = line.trim().replace(/^export\s+/, "");
    if (!normalized || normalized.startsWith("#")) continue;
    const separator = normalized.indexOf("=");
    if (separator < 1) continue;
    const name = normalized.slice(0, separator).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) continue;
    let value = normalized.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values.set(name, value);
  }
  return values;
}

function parseProviderEnvironment(targetName) {
  const provider = contract.targets[targetName].provider;
  try {
    if (provider === "vercel") {
      const binary = join(projectRoot, "node_modules/.bin/vercel");
      const tempDirectory = mkdtempSync(join(tmpdir(), "haenael-vercel-env-"));
      const outputPath = join(tempDirectory, "production.env");
      try {
        execFileSync(binary, [
          "env",
          "pull",
          outputPath,
          "--environment",
          "production",
          "--yes",
          "--cwd",
          workspaceRoot,
        ], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        });
        const values = parseDotenvValues(readFileSync(outputPath, "utf8"));
        return { names: new Set(values.keys()), values, valueCheck: "pulled" };
      } finally {
        rmSync(tempDirectory, { recursive: true, force: true });
      }
    }
    if (provider === "supabase") {
      const raw = execFileSync("supabase", ["secrets", "list", "--output-format", "json"], {
        cwd: workspaceRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed) ? parsed : parsed.secrets ?? [];
      const names = new Set(rows.map((row) => row.name ?? row.key).filter(Boolean));
      return { names, values: new Map(), valueCheck: "unavailable" };
    }
  } catch {
    console.error(`ENV_PROVIDER_QUERY_FAILED target=${targetName}`);
    process.exit(3);
  }
  throw new Error(`unsupported provider: ${provider}`);
}

function namesFromFile(path) {
  return new Set(readFileSync(resolve(process.cwd(), path), "utf8").split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
}

function invalidValueReason(value) {
  const normalized = value.trim();
  if (!normalized) return "empty";
  if (
    /^eyJ2Ijoid[A-Za-z0-9_=-]{24,}$/.test(normalized) ||
    /^\{\s*"v"\s*:\s*"[A-Za-z0-9_=-]{24,}"/.test(normalized) ||
    /^vercel:encrypted:[A-Za-z0-9_=-]{24,}$/i.test(normalized)
  ) return "encrypted_blob";
  return null;
}

async function parseVaultNames(source) {
  if (source === "file") return namesFromFile(argValue("--vault-names-file"));
  if (source === "local-db") {
    const raw = execFileSync(
      "docker",
      ["exec", "-i", dbContainer, "psql", "-U", "postgres", "-d", "postgres", "-At", "-c", "SELECT name FROM vault.secrets ORDER BY name;"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return new Set(raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  }
  if (source === "provider") {
    const projectRef = process.env.SUPABASE_PROJECT_REF;
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (!projectRef || !accessToken) {
      console.error("VAULT_PROVIDER_QUERY_FAILED missing=SUPABASE_PROJECT_REF,SUPABASE_ACCESS_TOKEN");
      process.exit(3);
    }
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "SELECT name FROM vault.secrets ORDER BY name" }),
    });
    if (!response.ok) {
      console.error(`VAULT_PROVIDER_QUERY_FAILED status=${response.status}`);
      process.exit(3);
    }
    const rows = await response.json();
    return new Set((Array.isArray(rows) ? rows : rows.result ?? []).map((row) => row.name).filter(Boolean));
  }
  throw new Error(`unsupported vault source: ${source}`);
}

let ok = assertInventoryClassified();
if (args.includes("--static-only")) process.exit(ok ? 0 : 1);

if (args.includes("--only-if-vercel") && process.env.VERCEL !== "1" && !process.env.VERCEL_ENV) {
  console.log("ENV_TARGET_CHECK_SKIPPED reason=not-vercel-runtime");
  process.exit(ok ? 0 : 1);
}

// 운영 기준을 preview·development 빌드에 들이대면 그 빌드는 영구히 실패한다.
// 운영에 등록한 변수는 그 환경에 없는 것이 정상이기 때문이다(계약이 운영만 대상으로 적는다).
// 운영 배포는 VERCEL_ENV=production 이므로 보호는 그대로 유지된다.
if (
  args.includes("--only-if-vercel") &&
  argValue("--target") === "vercel-production" &&
  process.env.VERCEL_ENV &&
  process.env.VERCEL_ENV !== "production"
) {
  console.log(`ENV_TARGET_CHECK_SKIPPED reason=non-production-vercel-env env=${process.env.VERCEL_ENV}`);
  process.exit(ok ? 0 : 1);
}

const targetName = argValue("--target");
if (!targetName) {
  console.error("usage: check-deploy-env.mjs --target <target> --source provider|runtime|file");
  process.exit(2);
}

const source = argValue("--source", "provider");
let snapshot;
if (source === "provider") snapshot = parseProviderEnvironment(targetName);
else if (source === "runtime") {
  snapshot = {
    names: new Set(Object.keys(process.env)),
    values: new Map(Object.entries(process.env).filter((entry) => entry[1] !== undefined)),
    valueCheck: "runtime",
  };
} else if (source === "file") {
  const valuesFile = argValue("--values-file");
  const values = valuesFile
    ? parseDotenvValues(readFileSync(resolve(process.cwd(), valuesFile), "utf8"))
    : new Map();
  snapshot = {
    names: valuesFile ? new Set(values.keys()) : namesFromFile(argValue("--names-file")),
    values,
    valueCheck: valuesFile ? "file" : "unavailable",
  };
}
else throw new Error(`unsupported source: ${source}`);

const mutation = argValue("--mutation");
if (mutation?.startsWith("drop:")) snapshot.names.delete(mutation.slice("drop:".length));
if (mutation?.startsWith("blob:")) {
  const name = mutation.slice("blob:".length);
  snapshot.names.add(name);
  snapshot.values.set(name, "eyJ2IjoidGVzdC1lbmNyeXB0ZWQtYmxvYi1zYW1wbGUtMTIzNDU2Nzg5MCJ9");
  snapshot.valueCheck = "mutation";
}

const required = requiredForTarget(targetName);
const missing = required.filter(({ name }) => !snapshot.names.has(name));
const invalid = required.flatMap(({ name }) => {
  if (!snapshot.names.has(name) || !snapshot.values.has(name)) return [];
  const reason = invalidValueReason(snapshot.values.get(name));
  return reason ? [{ name, reason }] : [];
});
console.log(`ENV_TARGET target=${targetName} source=${source} required=${required.length} present=${required.length - missing.length} missing=${missing.length}`);
for (const { name, features } of required) {
  const invalidEntry = invalid.find((entry) => entry.name === name);
  const status = !snapshot.names.has(name) ? "MISSING" : invalidEntry ? "INVALID" : "PRESENT";
  console.log(`${status} ${name} feature=${features.join("+")}${invalidEntry ? ` reason=${invalidEntry.reason}` : ""}`);
}
if (missing.length) {
  console.error(`ENV_TARGET_FAIL missing_names=${missing.map(({ name }) => name).join(",")}`);
  ok = false;
}
if (invalid.length) {
  console.error(`ENV_TARGET_FAIL invalid=${invalid.map(({ name, reason }) => `${name}:${reason}`).join(",")}`);
  ok = false;
}
if (!missing.length && !invalid.length) {
  console.log(`ENV_TARGET_PASS missing=0 invalid=0 value_check=${snapshot.valueCheck}`);
}

const requiredVault = requiredVaultForTarget(targetName);
if (requiredVault.length) {
  const vaultSource = argValue("--vault-source");
  if (!vaultSource) {
    console.error(`VAULT_TARGET_FAIL target=${targetName} reason=vault-source-required missing_names=${requiredVault.join(",")}`);
    ok = false;
  } else {
    const vaultPresent = await parseVaultNames(vaultSource);
    const vaultMissing = requiredVault.filter((name) => !vaultPresent.has(name));
    console.log(`VAULT_TARGET target=${targetName} source=${vaultSource} required=${requiredVault.length} present=${requiredVault.length - vaultMissing.length} missing=${vaultMissing.length}`);
    if (vaultMissing.length) {
      console.error(`VAULT_TARGET_FAIL missing_names=${vaultMissing.join(",")}`);
      ok = false;
    } else {
      console.log("VAULT_TARGET_PASS missing=0");
    }
  }
}

process.exit(ok ? 0 : 1);
