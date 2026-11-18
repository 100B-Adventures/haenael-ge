#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const container = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_haenael-ge";
const psqlArgs = ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"];
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
    ? resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
    : reject(new Error(stderr.trim())));
  child.stdin.end(statement);
});

const channelCases = [
  { channel: "APPLE", family: "verify-store-purchase" },
  { channel: "GOOGLE_PLAY", family: "verify-store-purchase" },
  { channel: "TOSS_IAP", family: "Toss IAP" },
  { channel: "GOOGLE_ALTERNATIVE", family: "confirm-alternative-payment" },
  { channel: "WEB_TOSS", family: "web payment confirmation" },
];
const deletionStages = ["REQUEST", "EXTERNAL_REVOKED", "DATA_DELETE"];
const memberSides = ["SUPPORTER", "RECIPIENT"];
const results = [];

async function runCase(channelCase, deletionStage, memberSide) {
  const supporterId = randomUUID();
  const recipientId = randomUUID();
  const targetId = memberSide === "SUPPORTER" ? supporterId : recipientId;
  const intentId = randomUUID();
  const accountBinding = randomUUID();
  const requestKey = `qa${randomUUID().replaceAll("-", "")}`;
  const slug = `credit-race-${randomUUID()}`;
  const orderId = `credit-race-${randomUUID()}`;
  const reference = channelCase.channel === "WEB_TOSS" ? orderId : intentId;
  const caseKey = `${channelCase.channel}:${deletionStage}:${memberSide}:${reference}`;
  const payload = channelCase.channel === "WEB_TOSS" ? "{}" : JSON.stringify({
    verified_member_id: supporterId,
    account_binding: accountBinding,
    request_key: requestKey,
  });

  try {
    sql(`
      INSERT INTO auth.users(id,email) VALUES
        ('${supporterId}','${supporterId}@credit-race.test'),
        ('${recipientId}','${recipientId}@credit-race.test');
      INSERT INTO public.member(id,nickname) VALUES
        ('${supporterId}','Credit Race Supporter'),
        ('${recipientId}','Credit Race Recipient');
      INSERT INTO public.goal(member_id,slug,title,due_date)
      VALUES ('${recipientId}','${slug}','Credit Race Goal',current_date + 30);
      UPDATE public.clover_balance SET clover_count=0
      WHERE member_id IN ('${supporterId}','${recipientId}');
      ${channelCase.channel === "WEB_TOSS" ? `
        INSERT INTO public.payment(order_id,amount_krw,status,pg_customer_key)
        VALUES ('${orderId}',1000,'READY','qa-credit-race');
        INSERT INTO public.cheer(goal_id,payment_id,is_anonymous,clover_amount,status)
        VALUES ((SELECT id FROM public.goal WHERE slug='${slug}'),
          (SELECT id FROM public.payment WHERE order_id='${orderId}'),false,1,'PENDING');
        INSERT INTO public.social_cheer_member_attribution(cheer_id,supporter_member_id)
        VALUES ((SELECT id FROM public.cheer WHERE payment_id=(SELECT id FROM public.payment WHERE order_id='${orderId}')),'${supporterId}');
      ` : `
        INSERT INTO public.store_purchase_intent(
          id,supporter_member_id,goal_id,provider,product_id,clover_amount,
          request_key,account_binding,expires_at
        ) VALUES ('${intentId}','${supporterId}',
          (SELECT id FROM public.goal WHERE slug='${slug}'),'${channelCase.channel}',
          'haenael.cheer.clover.1',1,'${requestKey}','${accountBinding}',now()+interval '10 minutes');
      `}
    `);

    const holder = runSession(`
      SELECT pg_advisory_lock(hashtextextended('member_settlement:${targetId}',0));
      SET ROLE service_role;
      SELECT set_config('request.jwt.claim.role','service_role',false);
      SELECT operation_status FROM public.credit_purchase('BEGIN','${channelCase.channel}','${reference}','${payload}'::jsonb,NULL);
      ${deletionStage === "REQUEST" ? "" : `
        INSERT INTO public.account_deletion_job(member_id,status)
        VALUES ('${targetId}','${deletionStage === "DATA_DELETE" ? "EXTERNAL_REVOKED" : "REQUESTED"}')
        ON CONFLICT (member_id) DO UPDATE SET status=EXCLUDED.status;
      `}
      RESET ROLE;
      INSERT INTO public.qa_credit_deletion_ready(case_key) VALUES ('${caseKey}');
      SELECT pg_sleep(0.45);
      SELECT pg_advisory_unlock(hashtextextended('member_settlement:${targetId}',0));
    `);
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (sql(`SELECT count(*) FROM public.qa_credit_deletion_ready WHERE case_key='${caseKey}';`) === "1") break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    const started = Date.now();
    let outcome = "";
    try {
      const contender = await runSession(`
        SET ROLE service_role;
        SELECT set_config('request.jwt.claim.role','service_role',false);
        SELECT ${deletionStage === "REQUEST"
          ? `public.request_account_deletion('${targetId}')`
          : deletionStage === "EXTERNAL_REVOKED"
          ? `public.mark_account_deletion_external_revoked('${targetId}')`
          : `public.delete_account_data('${targetId}')`};
        RESET ROLE;
      `);
      outcome = contender.stdout.match(/BLOCKED_PENDING_PAYMENT|REQUESTED|EXTERNAL_REVOKED|DATA_DELETED/)?.[0] ?? "MISSING";
    } catch (error) {
      outcome = error instanceof Error && error.message.includes("account_settlement_pending")
        ? "ACCOUNT_SETTLEMENT_PENDING" : "UNEXPECTED_ERROR";
    }
    const waitedMs = Date.now() - started;
    await holder;
    const expected = deletionStage === "DATA_DELETE" ? "ACCOUNT_SETTLEMENT_PENDING" : "BLOCKED_PENDING_PAYMENT";
    results.push({ family: channelCase.family, channel: channelCase.channel,
      deletion_stage: deletionStage, member_side: memberSide,
      waited_ms: waitedMs, outcome, passed: waitedMs >= 250 && outcome === expected });
  } finally {
    sql(`
      DELETE FROM public.qa_credit_deletion_ready WHERE case_key='${caseKey}';
      DELETE FROM public.purchase_credit_operation WHERE operation_key='${channelCase.channel}:${reference}';
      DELETE FROM public.alternative_payment_confirmation WHERE intent_id='${intentId}';
      DELETE FROM public.account_deletion_job WHERE member_id IN ('${supporterId}','${recipientId}');
      DELETE FROM public.social_cheer_member_attribution WHERE supporter_member_id='${supporterId}';
      DELETE FROM public.cheer
      WHERE goal_id=(SELECT id FROM public.goal WHERE slug='${slug}')
         OR payment_id IN (SELECT id FROM public.payment WHERE order_id='${orderId}');
      DELETE FROM public.payment WHERE order_id='${orderId}';
      DELETE FROM public.store_purchase_intent WHERE id='${intentId}';
      DELETE FROM public.goal WHERE slug='${slug}';
      DELETE FROM public.member WHERE id IN ('${supporterId}','${recipientId}');
      DELETE FROM auth.users WHERE id IN ('${supporterId}','${recipientId}');
    `);
  }
}

sql("CREATE UNLOGGED TABLE IF NOT EXISTS public.qa_credit_deletion_ready(case_key text PRIMARY KEY);");
try {
  for (const channelCase of channelCases) {
    for (const deletionStage of deletionStages) {
      for (const memberSide of memberSides) await runCase(channelCase, deletionStage, memberSide);
    }
  }
} finally {
  sql("DROP TABLE IF EXISTS public.qa_credit_deletion_ready;");
}

console.log(JSON.stringify({ cases: results.length, results }, null, 2));
if (results.some((result) => !result.passed)) process.exitCode = 1;
