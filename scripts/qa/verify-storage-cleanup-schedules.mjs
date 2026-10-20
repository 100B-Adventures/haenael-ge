#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repo = resolve(new URL("../..", import.meta.url).pathname);
const container = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_haenael-ge";
const contract = JSON.parse(readFileSync(resolve(repo, "qa/contracts/deploy-env.contract.json"), "utf8"));
const source = readFileSync(new URL(import.meta.url), "utf8");
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
    position('x-cleanup-internal-token' in (SELECT command FROM cron.job WHERE jobname='drain-storage-cleanup-queue')) > 0;
`);
const destructiveDeletes = [
  /DELETE\s+FROM\s+vault\.secrets/i,
  /DELETE\s+FROM\s+(?:public\.)?ops_event/i,
].filter((pattern) => pattern.test(source)).length;
const after = fingerprint();

const result = {
  cron_jobs_active: jobs.filter((row) => row.includes("|1|")).length,
  vault_contract_missing: missingContract,
  command_contracts: commandContracts,
  vault_and_ops_unchanged: before === after,
  destructive_delete_statements: destructiveDeletes,
};
console.log(JSON.stringify(result));
if (
  jobs.length !== expectedJobs.length ||
  result.cron_jobs_active !== expectedJobs.length ||
  missingContract.length ||
  commandContracts !== "t|t|t" ||
  before !== after ||
  destructiveDeletes !== 0
) process.exit(1);
