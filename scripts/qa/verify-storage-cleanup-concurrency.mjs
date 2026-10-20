#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";

const container = "supabase_db_haenael-ge";
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
try {
  sql(`
    INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,raw_app_meta_data,raw_user_meta_data,is_super_admin,is_anonymous)
    VALUES('${owner}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','${slug}@test.local','',now(),now(),'','','','{}','{}',false,false);
    INSERT INTO public.member(id,nickname) VALUES('${owner}','Concurrency Owner');
    INSERT INTO public.goal(member_id,slug,title,due_date,status) VALUES('${owner}','${slug}','동시 점유','2026-12-31','ACTIVE');
    INSERT INTO public.storage_cleanup_queue(goal_id,bucket_id,object_path,reason)
    SELECT id,'goal-cover-quarantine','${slug}/'||n||'.webp','ABANDONED_UPLOAD' FROM public.goal, generate_series(1,4) n WHERE slug='${slug}';
  `);
  const statement = "BEGIN; SELECT 'CLAIM|'||id FROM public.claim_storage_cleanup_batch(2, interval '15 minutes'); SELECT pg_sleep(2); COMMIT;";
  const [left, right] = await Promise.all([runSession(statement), runSession(statement)]);
  const ids = (output) => [...output.matchAll(/CLAIM\|(\d+)/g)].map((match) => match[1]);
  const leftIds = ids(left);
  const rightIds = ids(right);
  const overlap = leftIds.filter((id) => rightIds.includes(id));

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

  console.log(JSON.stringify({ parallel_left: leftIds, parallel_right: rightIds, intersection: overlap, short_lease_during_lock: Number(duringLock), short_lease_after_commit: Number(afterCommit) }));
  if (leftIds.length !== 2 || rightIds.length !== 2 || overlap.length || duringLock !== "0" || afterCommit !== "0") process.exitCode = 1;
} finally {
  sql(`DELETE FROM public.storage_cleanup_queue WHERE goal_id=(SELECT id FROM public.goal WHERE slug='${slug}'); DELETE FROM public.cheer WHERE goal_id=(SELECT id FROM public.goal WHERE slug='${slug}'); DELETE FROM public.goal WHERE slug='${slug}'; DELETE FROM public.member WHERE id='${owner}'; DELETE FROM auth.users WHERE id='${owner}';`);
}
