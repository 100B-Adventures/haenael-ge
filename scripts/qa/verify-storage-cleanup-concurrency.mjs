#!/usr/bin/env node

import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";

const container = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_haenael-ge";
const args = ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"];
const sql = (statement) => execFileSync("docker", args, { input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const runSession = (statement) => new Promise((resolve, reject) => {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("close", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim())));
  child.stdin.end(statement);
});

const suffix = randomBytes(5).toString("hex");
const owner = randomUUID();
const slug = `concurrency-${suffix}`;
const r18Function = `block_storage_cleanup_event_${suffix}`;
const r18Trigger = `block_storage_cleanup_event_${suffix}`;
const r18Job = `r18-storage-cleanup-${suffix}`;
let r18JobId = null;
try {
  sql(`
    INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,raw_app_meta_data,raw_user_meta_data,is_super_admin,is_anonymous)
    VALUES('${owner}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','${slug}@test.local','',now(),now(),'','','','{}','{}',false,false);
    INSERT INTO public.member(id,nickname) VALUES('${owner}','Concurrency Owner');
    INSERT INTO public.goal(member_id,slug,title,due_date,status) VALUES('${owner}','${slug}','동시 점유','2026-12-31','ACTIVE');
    INSERT INTO public.storage_cleanup_queue(goal_id,bucket_id,object_path,reason)
    SELECT id,'goal-cover-quarantine','${slug}/'||n||'.webp','ABANDONED_UPLOAD' FROM public.goal, generate_series(1,4) n WHERE slug='${slug}';
  `);
  const statement = "BEGIN; SELECT 'START|'||pg_backend_pid()||'|'||extract(epoch FROM clock_timestamp()); SELECT 'CLAIM|'||id FROM public.claim_storage_cleanup_batch(2, interval '15 minutes'); SELECT pg_sleep(2); SELECT 'END|'||pg_backend_pid()||'|'||extract(epoch FROM clock_timestamp()); COMMIT;";
  const [left, right] = await Promise.all([runSession(statement), runSession(statement)]);
  const ids = (output) => [...output.matchAll(/CLAIM\|(\d+)/g)].map((match) => match[1]);
  const leftIds = ids(left);
  const rightIds = ids(right);
  const overlap = leftIds.filter((id) => rightIds.includes(id));
  const window = (output) => {
    const start = output.match(/START\|(\d+)\|([\d.]+)/);
    const end = output.match(/END\|(\d+)\|([\d.]+)/);
    if (!start || !end || start[1] !== end[1]) throw new Error("parallel_window_missing");
    return { backend_pid: Number(start[1]), start: Number(start[2]), end: Number(end[2]) };
  };
  const leftWindow = window(left);
  const rightWindow = window(right);
  const windowsOverlap = Math.max(leftWindow.start, rightWindow.start) < Math.min(leftWindow.end, rightWindow.end);

  sql(`DELETE FROM public.storage_cleanup_queue WHERE goal_id=(SELECT id FROM public.goal WHERE slug='${slug}'); INSERT INTO public.storage_cleanup_queue(goal_id,bucket_id,object_path,reason) SELECT id,'goal-cover-quarantine','${slug}/lease.webp','ABANDONED_UPLOAD' FROM public.goal WHERE slug='${slug}';`);
  const held = runSession("BEGIN; SELECT 'HELD|'||id FROM public.claim_storage_cleanup_batch(1, interval '15 minutes'); SELECT pg_sleep(2); COMMIT;");
  let observedHeld = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (sql(`SELECT count(*) FROM public.storage_cleanup_queue WHERE object_path='${slug}/lease.webp' AND lease_until > now();`) === "1") {
      observedHeld = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!observedHeld) throw new Error("held_claim_not_observed");
  const duringLock = sql("SELECT count(*) FROM public.claim_storage_cleanup_batch(1, interval '1 millisecond');");
  await held;
  const afterCommit = sql("SELECT count(*) FROM public.claim_storage_cleanup_batch(1, interval '1 millisecond');");

  sql(`
    DELETE FROM public.storage_cleanup_queue WHERE goal_id=(SELECT id FROM public.goal WHERE slug='${slug}');
    DELETE FROM public.ops_event WHERE event_type='STORAGE_CLEANUP_DRAIN_STALLED';
    INSERT INTO public.storage_cleanup_queue(goal_id,bucket_id,object_path,reason,created_at)
    SELECT id,'goal-cover-quarantine','${slug}/stalled.webp','ABANDONED_UPLOAD',now()-interval '21 minutes'
    FROM public.goal WHERE slug='${slug}';
  `);
  const stalledCount = sql("SELECT public.monitor_storage_cleanup_drain(interval '20 minutes');");
  const stalledEvent = sql("SELECT event_type||'|'||(details->>'stalled_count') FROM public.ops_event WHERE event_type='STORAGE_CLEANUP_DRAIN_STALLED' ORDER BY id DESC LIMIT 1;");

  sql(`
    DELETE FROM public.ops_event WHERE event_type='STORAGE_CLEANUP_DRAIN_STALLED';
    CREATE OR REPLACE FUNCTION public.${r18Function}() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.event_type='STORAGE_CLEANUP_DRAIN_STALLED' THEN
        RAISE EXCEPTION 'ops_event logger blocked for R18';
      END IF;
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER ${r18Trigger}
      BEFORE INSERT ON public.ops_event
      FOR EACH ROW EXECUTE FUNCTION public.${r18Function}();
  `);
  const directFailure = spawnSync("docker", args, {
    input: "SELECT public.monitor_storage_cleanup_drain(interval '20 minutes');",
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  const directFailureStderr = directFailure.stderr ?? "";
  const directWarningObserved = directFailureStderr.includes("WARNING:  storage_cleanup_drain_monitor_failed");
  const directErrorObserved = directFailureStderr.includes("ERROR:  ops_event logger blocked for R18");
  r18JobId = Number(sql(`SELECT cron.schedule('${r18Job}','2 seconds',$job$SELECT public.monitor_storage_cleanup_drain(interval '20 minutes');$job$);`));
  let r18Cron = "";
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    r18Cron = sql(`SELECT status||'|'||coalesce(return_message,'') FROM cron.job_run_details WHERE jobid=${r18JobId} ORDER BY runid DESC LIMIT 1;`);
    if (r18Cron.startsWith("failed|")) break;
  }
  const warningFallbackDeclared = sql("SELECT position('RAISE WARNING' in pg_get_functiondef('public.monitor_storage_cleanup_drain(interval)'::regprocedure)) > 0;");
  sql(`SELECT cron.unschedule(${r18JobId}); DROP TRIGGER ${r18Trigger} ON public.ops_event; DROP FUNCTION public.${r18Function}();`);
  r18JobId = null;

  console.log(JSON.stringify({ parallel_left: leftIds, parallel_right: rightIds, intersection: overlap, left_window: leftWindow, right_window: rightWindow, windows_overlap: windowsOverlap, distinct_backends: leftWindow.backend_pid !== rightWindow.backend_pid, short_lease_during_lock: Number(duringLock), short_lease_after_commit: Number(afterCommit), drain_monitor: { stalled_count: Number(stalledCount), ops_event: stalledEvent }, logger_failure: { direct_exit: directFailure.status, warning_observed: directWarningObserved, error_observed: directErrorObserved, cron: r18Cron, warning_fallback_declared: warningFallbackDeclared === "t" } }));
  if (leftIds.length !== 2 || rightIds.length !== 2 || overlap.length || !windowsOverlap || leftWindow.backend_pid === rightWindow.backend_pid || duringLock !== "0" || afterCommit !== "0" || stalledCount !== "1" || stalledEvent !== "STORAGE_CLEANUP_DRAIN_STALLED|1" || directFailure.status === 0 || !directWarningObserved || !directErrorObserved || !r18Cron.startsWith("failed|") || warningFallbackDeclared !== "t") process.exitCode = 1;
} finally {
  try {
    if (r18JobId !== null) sql(`SELECT cron.unschedule(${r18JobId});`);
    sql(`DROP TRIGGER IF EXISTS ${r18Trigger} ON public.ops_event; DROP FUNCTION IF EXISTS public.${r18Function}(); DELETE FROM public.ops_event WHERE event_type='STORAGE_CLEANUP_DRAIN_STALLED' AND details->>'oldest_created_at' IS NOT NULL; DELETE FROM public.storage_cleanup_queue WHERE goal_id=(SELECT id FROM public.goal WHERE slug='${slug}'); DELETE FROM public.cheer WHERE goal_id=(SELECT id FROM public.goal WHERE slug='${slug}'); DELETE FROM public.goal WHERE slug='${slug}'; DELETE FROM public.member WHERE id='${owner}'; DELETE FROM auth.users WHERE id='${owner}';`);
  } catch {}
}
