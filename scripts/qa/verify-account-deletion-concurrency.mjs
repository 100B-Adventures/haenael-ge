#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const container = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_haenael-ge";
const psqlArgs = [
  "exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres",
  "-v", "ON_ERROR_STOP=1", "-At",
];
const sql = (statement) => execFileSync("docker", psqlArgs, {
  input: statement,
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
}).trim();
const runSession = (statement) => new Promise((resolve, reject) => {
  const child = spawn("docker", psqlArgs, { stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("close", (code) => code === 0
    ? resolve(stdout.trim())
    : reject(new Error(stderr.trim())));
  child.stdin.end(statement);
});

const memberId = randomUUID();
const ownerId = randomUUID();
const intentId = randomUUID();
const readyTable = `qa_account_delete_ready_${memberId.replaceAll("-", "")}`;
try {
  sql(`
    CREATE UNLOGGED TABLE public.${readyTable}(ready boolean PRIMARY KEY);
    INSERT INTO auth.users(id,email) VALUES
      ('${memberId}','account-delete-concurrency@test.local'),
      ('${ownerId}','account-delete-owner@test.local');
    INSERT INTO public.member(id,nickname) VALUES
      ('${memberId}','Concurrency Member'),
      ('${ownerId}','Concurrency Owner');
    INSERT INTO public.goal(member_id,slug,title,due_date)
    VALUES ('${ownerId}','account-delete-${memberId}','Concurrency Goal',current_date + 30);
    INSERT INTO public.store_purchase_intent(
      id,supporter_member_id,goal_id,provider,product_id,clover_amount,
      request_key,account_binding,expires_at
    ) VALUES (
      '${intentId}','${memberId}',
      (SELECT id FROM public.goal WHERE slug='account-delete-${memberId}'),
      'GOOGLE_ALTERNATIVE','haenael.cheer.clover.1',1,
      'concurrency-request-${memberId}','${memberId}',now() + interval '10 minutes'
    );
  `);

  const holder = runSession(`
    SELECT pg_advisory_lock(hashtextextended('member_settlement:${memberId}',0));
    SET ROLE service_role;
    SELECT set_config('request.jwt.claim.role','service_role',false);
    SELECT public.begin_alternative_payment_confirmation(
      '${intentId}','${memberId}','concurrency-request-${memberId}'
    );
    INSERT INTO public.${readyTable}(ready) VALUES (true);
    SELECT pg_sleep(2);
    RESET ROLE;
    SELECT pg_advisory_unlock(hashtextextended('member_settlement:${memberId}',0));
  `);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (sql(`SELECT count(*) FROM public.${readyTable};`) === "1") break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const started = Date.now();
  const deletionOutput = sql(`
    SET ROLE service_role;
    SELECT set_config('request.jwt.claim.role','service_role',false);
    SELECT public.request_account_deletion('${memberId}');
    RESET ROLE;
  `);
  const deletionStatus = deletionOutput.match(
    /BLOCKED_PENDING_PAYMENT|REQUESTED|EXTERNAL_REVOKED|DATA_DELETED|AUTH_DELETED/,
  )?.[0] ?? "MISSING";
  const waitedMs = Date.now() - started;
  await holder;

  console.log(JSON.stringify({ waited_ms: waitedMs, deletion_status: deletionStatus }));
  if (waitedMs < 1500 || deletionStatus !== "BLOCKED_PENDING_PAYMENT") {
    process.exitCode = 1;
  }
} finally {
  try {
    sql(`
      DROP TABLE IF EXISTS public.${readyTable};
      DELETE FROM public.alternative_payment_confirmation WHERE intent_id='${intentId}';
      DELETE FROM public.account_deletion_job WHERE member_id='${memberId}';
      DELETE FROM public.store_purchase_intent WHERE id='${intentId}';
      DELETE FROM public.goal WHERE slug='account-delete-${memberId}';
      DELETE FROM public.member WHERE id IN ('${memberId}','${ownerId}');
      DELETE FROM auth.users WHERE id IN ('${memberId}','${ownerId}');
    `);
  } catch {
    // The red test runs before the migration, so new tables may not exist yet.
  }
}
