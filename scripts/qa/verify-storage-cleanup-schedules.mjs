#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repo = resolve(new URL("../..", import.meta.url).pathname);
const contract = JSON.parse(readFileSync(resolve(repo, "qa/contracts/deploy-env.contract.json"), "utf8"));
const sql = (statement) => execFileSync(
  "docker",
  ["exec", "-i", "supabase_db_haenael-ge", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
  { input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
).trim();

const jobs = sql("SELECT count(*) FROM cron.job WHERE active AND jobname IN ('purge-abandoned-goal-covers','drain-storage-cleanup-queue');");
const expected = ["storage_cleanup_worker_url", "edge_invoke_publishable_key", "storage_cleanup_internal_token"];
const declared = new Set((contract.vaultSecrets ?? []).map((row) => row.name));
const missing = expected.filter((name) => !declared.has(name));
const jobId = Number(sql("SELECT jobid FROM cron.job WHERE jobname='drain-storage-cleanup-queue';"));
const originalSchedule = sql(`SELECT schedule FROM cron.job WHERE jobid=${jobId};`);
const priorRunId = Number(sql(`SELECT COALESCE(max(runid),0) FROM cron.job_run_details WHERE jobid=${jobId};`));
sql(`DELETE FROM vault.secrets WHERE name IN ('${expected.join("','")}');`);
sql("DELETE FROM public.ops_event WHERE event_type='STORAGE_CLEANUP_SCHEDULE_FAILED' AND details->>'stage'='runtime_secret_missing';");

let event = "";
let cronRun = "";
try {
  sql(`SELECT cron.alter_job(${jobId}, schedule := '* * * * *');`);
  const deadline = Date.now() + 75_000;
  while (Date.now() < deadline) {
    event = sql("SELECT event_type||'|'||(details->>'stage')||'|'||(details->>'sqlstate') FROM public.ops_event WHERE event_type='STORAGE_CLEANUP_SCHEDULE_FAILED' AND details->>'stage'='runtime_secret_missing' ORDER BY id DESC LIMIT 1;");
    cronRun = sql(`SELECT status||'|'||COALESCE(return_message,'') FROM cron.job_run_details WHERE jobid=${jobId} AND runid>${priorRunId} ORDER BY runid DESC LIMIT 1;`);
    if (event && cronRun) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
} finally {
  sql(`SELECT cron.alter_job(${jobId}, schedule := '${originalSchedule.replaceAll("'", "''")}');`);
}

console.log(JSON.stringify({ cron_jobs_active: Number(jobs), vault_contract_missing: missing, cron_run: cronRun, failure_event: event }));
if (jobs !== "2" || missing.length || !cronRun.startsWith("succeeded|") || event !== "STORAGE_CLEANUP_SCHEDULE_FAILED|runtime_secret_missing|P0001") process.exit(1);
