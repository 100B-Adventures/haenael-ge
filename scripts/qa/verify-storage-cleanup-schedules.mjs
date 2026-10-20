#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(new URL("../..", import.meta.url).pathname);
const container = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_haenael-ge";
const contract = JSON.parse(readFileSync(resolve(repo, "qa/contracts/deploy-env.contract.json"), "utf8"));
const suiteDir = dirname(fileURLToPath(import.meta.url));
const suiteSources = readdirSync(suiteDir)
  .filter((name) => /^verify-storage-cleanup-.*\.mjs$/.test(name))
  .sort()
  .map((name) => ({ name, source: readFileSync(resolve(suiteDir, name), "utf8") }));
const sql = (statement) => execFileSync(
  "docker",
  ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
  { input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
).trim();

const expectedSecrets = [
  "storage_cleanup_worker_url",
  "edge_invoke_publishable_key",
  "storage_cleanup_internal_token",
];
const expectedJobs = [
  "purge-abandoned-goal-covers",
  "drain-storage-cleanup-queue",
  "monitor-storage-cleanup-drain",
];
const fingerprint = () => sql(`
  SELECT jsonb_build_object(
    'vault_count', (SELECT count(*) FROM vault.secrets WHERE name = ANY(ARRAY['${expectedSecrets.join("','")}'])),
    'vault_hash', (SELECT md5(COALESCE(string_agg(name||':'||decrypted_secret, '|' ORDER BY name), '')) FROM vault.decrypted_secrets WHERE name = ANY(ARRAY['${expectedSecrets.join("','")}'])),
    'ops_count', (SELECT count(*) FROM public.ops_event),
    'ops_hash', (SELECT md5(COALESCE(string_agg(id::text||':'||event_type||':'||severity||':'||details::text||':'||created_at::text, '|' ORDER BY id), '')) FROM public.ops_event)
  )::text;
`);

const before = fingerprint();
const declared = new Set((contract.vaultSecrets ?? []).map((row) => row.name));
const missingContract = expectedSecrets.filter((name) => !declared.has(name));
const jobs = sql(`
  SELECT jobname||'|'||active::integer||'|'||schedule
  FROM cron.job
  WHERE jobname = ANY(ARRAY['${expectedJobs.join("','")}'])
  ORDER BY jobname;
`).split("\n").filter(Boolean);
const commandContracts = sql(`
  SELECT
    position('monitor_storage_cleanup_drain' in (SELECT command FROM cron.job WHERE jobname='monitor-storage-cleanup-drain')) > 0,
    position('Authorization' in (SELECT command FROM cron.job WHERE jobname='drain-storage-cleanup-queue')) = 0,
    position('x-cleanup-internal-token' in (SELECT command FROM cron.job WHERE jobname='drain-storage-cleanup-queue')) > 0,
    position('STORAGE_CLEANUP_QUEUE_EMPTY_WITH_CANDIDATES' in pg_get_functiondef('public.monitor_storage_cleanup_drain(interval)'::regprocedure)) > 0,
    (SELECT active FROM cron.job WHERE jobname='monitor-storage-cleanup-drain');
`);
const monitorRun = sql(`
  SELECT COALESCE((
    SELECT d.status||'|'||coalesce(d.return_message,'')
    FROM cron.job_run_details AS d
    WHERE d.jobid=(SELECT jobid FROM cron.job WHERE jobname='monitor-storage-cleanup-drain')
    ORDER BY d.runid DESC LIMIT 1
  ), 'never');
`);
// R20: inspect every storage-cleanup verifier, not only this file. Report all
// destructive axes and reject durable audit/credential mutation. Fixture-row
// cleanup remains allowed only when its delete has an explicit WHERE scope.
const mutationPatterns = {
  delete: new RegExp(["DE", "LETE\\s+FROM\\s+([a-zA-Z0-9_.]+)[^;]*;"].join(""), "gi"),
  update: new RegExp(["UP", "DATE\\s+([a-zA-Z0-9_.]+)[^;]*;"].join(""), "gi"),
  truncate: new RegExp(["TRUN", "CATE(?:\\s+TABLE)?\\s+([a-zA-Z0-9_.]+)[^;]*;"].join(""), "gi"),
  vault_delete_secret: new RegExp(["vault", "\\.delete_secret\\s*\\("].join(""), "gi"),
};
const mutationFindings = [];
for (const { name, source } of suiteSources) {
  for (const [axis, pattern] of Object.entries(mutationPatterns)) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const statement = match[0].replace(/\s+/g, " ").trim();
      const target = match[1] ?? "vault.delete_secret";
      mutationFindings.push({
        file: name,
        axis,
        target,
        scoped: axis !== "delete" || /\bWHERE\b/i.test(statement),
        durable: /(?:^|\.)(?:ops_event|secrets)$/i.test(target) || axis === "vault_delete_secret",
      });
    }
  }
}
const mutationAxisCounts = Object.fromEntries(
  Object.keys(mutationPatterns).map((axis) => [
    axis,
    mutationFindings.filter((finding) => finding.axis === axis).length,
  ]),
);
const unscopedDeletes = mutationFindings.filter((finding) => finding.axis === "delete" && !finding.scoped);
const forbiddenDurableMutations = mutationFindings.filter((finding) => finding.durable);
const after = fingerprint();

const result = {
  cron_jobs_active: jobs.filter((row) => row.includes("|1|")).length,
  vault_contract_missing: missingContract,
  command_contracts: commandContracts,
  monitor_recent_run: monitorRun,
  monitor_recent_run_axis: monitorRun === "never" ? "fresh-database" : "observed",
  vault_and_ops_unchanged: before === after,
  scanned_cleanup_verifiers: suiteSources.map(({ name }) => name),
  mutation_axis_counts: mutationAxisCounts,
  unscoped_delete_statements: unscopedDeletes,
  forbidden_durable_mutations: forbiddenDurableMutations,
};
console.log(JSON.stringify(result));
if (
  jobs.length !== expectedJobs.length ||
  result.cron_jobs_active !== expectedJobs.length ||
  missingContract.length ||
  commandContracts !== "t|t|t|t|t" ||
  (monitorRun !== "never" && !monitorRun.startsWith("succeeded|") && !monitorRun.startsWith("running|")) ||
  before !== after ||
  unscopedDeletes.length !== 0 ||
  forbiddenDurableMutations.length !== 0
) process.exit(1);
