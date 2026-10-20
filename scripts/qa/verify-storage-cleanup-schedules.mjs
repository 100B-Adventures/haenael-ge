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
sql("DELETE FROM public.ops_event WHERE event_type='STORAGE_CLEANUP_SCHEDULE_FAILED' AND details->>'stage'='verification';");
// service_role은 cron schema를 읽을 수 없다. 실제 insufficient_privilege를
// migration과 같은 EXCEPTION 분기로 통과시켜 실패 이벤트가 남는지 본다.
sql(`
  SET ROLE service_role;
  DO $verify$
  BEGIN
    BEGIN
      PERFORM 1 FROM cron.job LIMIT 1;
    EXCEPTION WHEN insufficient_privilege THEN
      PERFORM public.record_storage_cleanup_schedule_failure('verification', SQLSTATE, SQLERRM);
    END;
  END
  $verify$;
  RESET ROLE;
`);
const eventId = sql("SELECT id FROM public.ops_event WHERE event_type='STORAGE_CLEANUP_SCHEDULE_FAILED' AND details->>'stage'='verification' ORDER BY id DESC LIMIT 1;");
const event = sql(`SELECT event_type||'|'||(details->>'stage')||'|'||(details->>'sqlstate') FROM public.ops_event WHERE id=${Number(eventId)};`);
sql(`DELETE FROM public.ops_event WHERE id=${Number(eventId)};`);

console.log(JSON.stringify({ cron_jobs_active: Number(jobs), vault_contract_missing: missing, failure_event: event }));
if (jobs !== "2" || missing.length || event !== "STORAGE_CLEANUP_SCHEDULE_FAILED|verification|42501") process.exit(1);
