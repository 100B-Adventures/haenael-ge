import { execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { openSync, closeSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("../..", import.meta.url).pathname;
const dbContainer = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_haenael-ge";
const statusText = execFileSync("supabase", ["status", "-o", "env"], {
  cwd: repo,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
});
const local = Object.fromEntries(statusText.split("\n").flatMap((line) => {
  const match = line.match(/^([A-Z_]+)=(?:"([^"]*)"|(.*))$/);
  return match ? [[match[1], match[2] ?? match[3] ?? ""]] : [];
}));
const apiUrl = local.API_URL;
const anonKey = local.ANON_KEY;
const serviceKey = local.SERVICE_ROLE_KEY;
if (!apiUrl || !anonKey || !serviceKey) throw new Error("local_supabase_status_missing");
const apiHost = new URL(apiUrl).hostname;
if (apiHost !== "127.0.0.1" && apiHost !== "localhost") {
  throw new Error(`local_supabase_required_${apiHost}`);
}
const containerProject = execFileSync(
  "docker",
  ["inspect", "--format", "{{ index .Config.Labels \"com.supabase.cli.project\" }}", dbContainer],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
).trim();
if (!containerProject) throw new Error("supabase_cli_container_required");

const cleanupToken = randomBytes(32).toString("hex");
const secretDir = mkdtempSync(join(tmpdir(), "haenael-cleanup-"));
const secretFile = join(secretDir, "runtime.env");
writeFileSync(secretFile, `STORAGE_CLEANUP_INTERNAL_TOKEN=${cleanupToken}\n`, { mode: 0o600 });
const logFd = openSync("/tmp/haenael-storage-cleanup-function.log", "w");
const server = spawn("supabase", ["functions", "serve", "storage-cleanup-worker", "--no-verify-jwt", "--env-file", secretFile], {
  cwd: repo,
  env: { ...process.env, STORAGE_CLEANUP_INTERNAL_TOKEN: cleanupToken },
  stdio: ["ignore", logFd, logFd],
});
let serverExit = null;
server.once("exit", (code, signal) => {
  serverExit = { code, signal };
});

const functionUrl = `${apiUrl}/functions/v1/storage-cleanup-worker`;
async function fetchWithRetry(input, init, attempts = 4) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(12000) });
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

const invoke = (token, apikey = anonKey, attempts = 4, timeoutMs = 12000) => fetchWithRetry(functionUrl, {
  method: "POST",
  headers: {
    apikey,
    "Content-Type": "application/json",
    ...(token === null ? {} : { "x-cleanup-internal-token": token }),
  },
  body: "{}",
  signal: AbortSignal.timeout(timeoutMs),
}, attempts);

function sql(statement) {
  return execFileSync(
    "docker",
    ["exec", "-i", dbContainer, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
    { input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
}

const encodedSqlText = (value) => `convert_from(decode('${Buffer.from(value).toString("base64")}','base64'),'UTF8')`;

async function waitForFunction() {
  let lastObservation = "no_response";
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (serverExit) {
      throw new Error(`function_serve_exited_${serverExit.code ?? "signal"}_${serverExit.signal ?? "none"}_${functionLogTail()}`);
    }
    try {
      const response = await invoke(cleanupToken, anonKey, 1, 5000);
      if (response.status === 200) return;
      const body = await response.text();
      lastObservation = `http_${response.status}_${body.slice(0, 240)}`;
    } catch (error) {
      lastObservation = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`function_serve_timeout_${lastObservation}_${functionLogTail()}`);
}

function functionLogTail() {
  try {
    return readFileSync("/tmp/haenael-storage-cleanup-function.log", "utf8")
      .replaceAll(cleanupToken, "[cleanup-token-redacted]")
      .replaceAll(serviceKey, "[service-key-redacted]")
      .replaceAll(anonKey, "[anon-key-redacted]")
      .split("\n")
      .slice(-30)
      .join(" | ")
      .slice(-4000);
  } catch (error) {
    return `log_unavailable_${error instanceof Error ? error.message : String(error)}`;
  }
}

async function putObject(path, bytes) {
  const response = await fetchWithRetry(`${apiUrl}/storage/v1/object/goal-cover-quarantine/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "image/png",
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!response.ok) throw new Error(`storage_upload_${response.status}`);
}

async function objectExists(path) {
  const response = await fetchWithRetry(`${apiUrl}/storage/v1/object/goal-cover-quarantine/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  return response.ok;
}

const runId = randomBytes(6).toString("hex");
const owner = randomUUID();
const asset = randomUUID();
const concurrentAsset = randomUUID();
const tombstoneAsset = randomUUID();
const pairAsset = randomUUID();
const goalSlug = `runtime-cleanup-${runId}`;
const objectPath = `runtime-cleanup/${runId}/cv09.png`;
const concurrentPath = `runtime-cleanup/${runId}/cv09-concurrent.png`;
const tombstonePath = `runtime-cleanup/${runId}/cv12-tombstone.png`;
const pairPath = `runtime-cleanup/${runId}/same-path.png`;
const bytes = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const hash = createHash("sha256").update(bytes).digest("hex");
const temporaryCronJobIds = new Set();

const functionInvocationCount = () => {
  try {
    return (readFileSync("/tmp/haenael-storage-cleanup-function.log", "utf8").match(/serving the request with supabase\/functions\/storage-cleanup-worker/g) ?? []).length;
  } catch {
    return 0;
  }
};

async function observeCronInvocation() {
  const jobName = `qa-drain-storage-cleanup-${runId}`;
  const baselineResponseId = Number(sql("SELECT coalesce(max(id),0) FROM net._http_response;"));
  const baselineInvocations = functionInvocationCount();
  const command = `SELECT net.http_post(
    url := 'http://kong:8000/functions/v1/storage-cleanup-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', ${encodedSqlText(anonKey)},
      'x-cleanup-internal-token', ${encodedSqlText(cleanupToken)}
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );`;
  const jobId = Number(sql(`SELECT cron.schedule('${jobName}', '2 seconds', ${encodedSqlText(command)});`));
  temporaryCronJobIds.add(jobId);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const row = sql(`
      SELECT d.runid||'|'||d.status||'|'||coalesce(r.status_code,0)
      FROM cron.job_run_details d
      LEFT JOIN LATERAL (
        SELECT status_code FROM net._http_response
        WHERE id > ${baselineResponseId}
        ORDER BY id DESC LIMIT 1
      ) r ON true
      WHERE d.jobid=${jobId}
      ORDER BY d.runid DESC LIMIT 1;
    `);
    if (!row) continue;
    const [runId, runStatus, httpStatus] = row.split("|");
    const invocationDelta = functionInvocationCount() - baselineInvocations;
    if (runStatus === "succeeded" && httpStatus === "200" && invocationDelta >= 1) {
      sql(`SELECT cron.unschedule(${jobId});`);
      temporaryCronJobIds.delete(jobId);
      return { job_name: jobName, run_id: Number(runId), run_status: runStatus, http_status: Number(httpStatus), function_log_delta: invocationDelta, authorization_header_sent: false };
    }
  }
  throw new Error("cron_worker_observation_timeout");
}

async function waitForPgNetResponse(requestId) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const response = sql(`
      SELECT jsonb_build_object(
        'status', status_code,
        'error', error_msg
      )::text
      FROM net._http_response
      WHERE id=${requestId};
    `);
    if (response) return JSON.parse(response);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`pg_net_response_timeout_${requestId}`);
}

async function injectDrainFailureProbe({ name, url, token, expectedStatus }) {
  const objectPath = `runtime-cleanup/${runId}/r11-${name}.png`;
  const queueId = Number(sql(`
    WITH inserted AS (
      INSERT INTO public.storage_cleanup_queue(
        goal_id, bucket_id, object_path, reason
      )
      SELECT id, 'goal-cover-quarantine', '${objectPath}', 'ABANDONED_UPLOAD'
      FROM public.goal WHERE slug='${goalSlug}'
      RETURNING id
    )
    SELECT id FROM inserted;
  `));
  const requestId = Number(sql(`
    SELECT net.http_post(
      url := ${encodedSqlText(url)},
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', ${encodedSqlText(anonKey)},
        'x-cleanup-internal-token', ${encodedSqlText(token)}
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 5000
    );
  `));
  const response = await waitForPgNetResponse(requestId);
  if (response.status !== expectedStatus) {
    throw new Error(`r11_probe_failed_${name}_${response.status}`);
  }
  return {
    injected: name,
    queue_id: queueId,
    request_id: requestId,
    http_status: response.status,
  };
}

async function observeMonitorCron({ eventBaseline, expectedStalledCount }) {
  const jobName = `qa-monitor-storage-cleanup-${runId}`;
  const command = "SELECT public.monitor_storage_cleanup_drain(interval '1 second');";
  const jobId = Number(sql(`SELECT cron.schedule('${jobName}', '2 seconds', ${encodedSqlText(command)});`));
  temporaryCronJobIds.add(jobId);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const run = sql(`
      SELECT runid||'|'||status||'|'||coalesce(return_message,'')
      FROM cron.job_run_details
      WHERE jobid=${jobId}
      ORDER BY runid DESC LIMIT 1;
    `);
    if (!run) continue;
    const event = sql(`
      SELECT id||'|'||event_type||'|'||(details->>'stalled_count')||'|'||(details->>'stale_after_seconds')
      FROM public.ops_event
      WHERE id>${eventBaseline}
        AND event_type='STORAGE_CLEANUP_DRAIN_STALLED'
      ORDER BY id DESC LIMIT 1;
    `);
    if (run.includes("|succeeded|") && event) {
      const [eventId, eventType, stalledCount, staleAfterSeconds] = event.split("|");
      sql(`SELECT cron.unschedule(${jobId});`);
      temporaryCronJobIds.delete(jobId);
      if (Number(stalledCount) !== expectedStalledCount || staleAfterSeconds !== "1") {
        throw new Error(`monitor_cron_alert_mismatch_${stalledCount}_${staleAfterSeconds}`);
      }
      return {
        job_name: jobName,
        job_run: run,
        event_id: Number(eventId),
        event_type: eventType,
        stalled_count: Number(stalledCount),
        stale_after_seconds: Number(staleAfterSeconds),
        received_by: "public.ops_event",
      };
    }
  }
  throw new Error("monitor_cron_observation_timeout");
}

try {
  await waitForFunction();
  const cronObservation = await observeCronInvocation();
  const ea01 = await invoke(cleanupToken);
  const ea02 = await invoke(cleanupToken, "invalid-publishable-key");
  const ea03 = await invoke(null);
  const ea04 = await invoke("wrong-token-with-more-than-thirty-two-characters");
  const [ea03Body, ea04Body] = await Promise.all([ea03.json(), ea04.json()]);
  if (
    ea01.status !== 200 || ea02.status !== 200 || ea03.status !== 401 || ea04.status !== 403 ||
    ea03Body?.error?.code !== "auth_required" || ea04Body?.error?.code !== "forbidden"
  ) {
    throw new Error(`auth_contract_${ea01.status}_${ea03.status}_${ea04.status}`);
  }

  sql(`
    INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,raw_app_meta_data,raw_user_meta_data,is_super_admin,is_anonymous)
    VALUES('${owner}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','runtime-cleanup-${runId}@test.local','',now(),now(),'','','','{}','{}',false,false);
    INSERT INTO public.member(id,nickname) VALUES('${owner}','Runtime Cleanup');
    INSERT INTO public.goal(member_id,slug,title,due_date,status) VALUES('${owner}','${goalSlug}','런타임 정리','2026-12-31','ACTIVE');
    INSERT INTO public.goal_cover_asset(id,goal_id,owner_member_id,quarantine_path,status,content_sha256,mime_type,byte_size,created_at)
    SELECT '${asset}',id,'${owner}','${objectPath}','DELETED','${hash}','image/png',${bytes.length},now()-interval '25 hours' FROM public.goal WHERE slug='${goalSlug}';
    INSERT INTO public.storage_cleanup_queue(goal_id,bucket_id,object_path,reason)
    SELECT id,'goal-cover-quarantine','${objectPath}','ABANDONED_UPLOAD' FROM public.goal WHERE slug='${goalSlug}';
  `);
  await putObject(objectPath, bytes);
  const cv09 = await invoke(cleanupToken);
  const cv09Body = await cv09.json();
  const dbState = sql(`SELECT q.status||':'||CASE WHEN a.id IS NULL THEN 'asset-absent' ELSE 'asset-present' END FROM public.storage_cleanup_queue q LEFT JOIN public.goal_cover_asset a ON a.id='${asset}' WHERE q.object_path='${objectPath}' ORDER BY q.id DESC LIMIT 1;`);
  if (cv09.status !== 200 || await objectExists(objectPath) || dbState !== "DONE:asset-absent") {
    throw new Error(`cv09_delete_failed_${cv09.status}_${dbState}`);
  }
  const idempotent = await invoke(cleanupToken);
  const idempotentBody = await idempotent.json();
  if (idempotentBody.claimed !== 0) throw new Error("cv09_not_idempotent");

  sql(`
    INSERT INTO public.goal_cover_asset(id,goal_id,owner_member_id,quarantine_path,status,content_sha256,mime_type,byte_size,created_at)
    SELECT '${concurrentAsset}',id,'${owner}','${concurrentPath}','DELETED','${hash}','image/png',${bytes.length},now()-interval '25 hours' FROM public.goal WHERE slug='${goalSlug}';
    INSERT INTO public.storage_cleanup_queue(goal_id,bucket_id,object_path,reason)
    SELECT id,'goal-cover-quarantine','${concurrentPath}','ABANDONED_UPLOAD' FROM public.goal WHERE slug='${goalSlug}';
  `);
  await putObject(concurrentPath, bytes);
  const concurrent = await Promise.all([invoke(cleanupToken), invoke(cleanupToken)]);
  if (concurrent.some((response) => response.status !== 200) || await objectExists(concurrentPath)) {
    throw new Error("cv09_concurrent_failed");
  }

  sql(`
    INSERT INTO public.storage_cleanup_queue(goal_id,bucket_id,object_path,reason)
    SELECT id,'goal-cover-quarantine','runtime-cleanup/${runId}/cv10-a.png','ABANDONED_UPLOAD' FROM public.goal WHERE slug='${goalSlug}'
    UNION ALL
    SELECT id,'goal-cover-quarantine','runtime-cleanup/${runId}/cv10-b.png','ABANDONED_UPLOAD' FROM public.goal WHERE slug='${goalSlug}';
  `);
  const [claimOneId, claimOneToken] = sql("SELECT id||'|'||lock_token FROM public.claim_storage_cleanup_batch(1,interval '15 minutes');").split("|");
  const [claimTwoId] = sql("SELECT id||'|'||lock_token FROM public.claim_storage_cleanup_batch(1,interval '15 minutes');").split("|");
  const beforeLease = sql("SELECT count(*) FROM public.claim_storage_cleanup_batch(1,interval '15 minutes');");
  if (!claimOneId || !claimTwoId || claimOneId === claimTwoId || beforeLease !== "0") {
    throw new Error("cv10_claim_overlap");
  }
  sql(`UPDATE public.storage_cleanup_queue SET locked_at=now()-interval '16 minutes', lease_until=now()-interval '1 second' WHERE id=${claimOneId};`);
  const [reclaimedId, reclaimedToken] = sql("SELECT id||'|'||lock_token FROM public.claim_storage_cleanup_batch(1,interval '15 minutes');").split("|");
  const lateSettle = sql(`SELECT public.settle_storage_cleanup(${claimOneId},'${claimOneToken}',true);`);
  const currentSettle = sql(`SELECT public.settle_storage_cleanup(${reclaimedId},'${reclaimedToken}',false);`);
  const failedState = sql(`SELECT status||':'||attempts FROM public.storage_cleanup_queue WHERE id=${reclaimedId};`);
  if (reclaimedId !== claimOneId || reclaimedToken === claimOneToken || lateSettle !== "f" || currentSettle !== "t" || failedState !== "FAILED:1") {
    throw new Error(`cv10_lease_or_ownership_${reclaimedId}_${lateSettle}_${failedState}`);
  }
  sql(`DELETE FROM public.storage_cleanup_queue WHERE object_path LIKE 'runtime-cleanup/${runId}/cv10-%';`);

  sql(`
    INSERT INTO public.goal_cover_asset(id,goal_id,owner_member_id,quarantine_path,status,content_sha256,mime_type,byte_size,created_at)
    SELECT '${tombstoneAsset}',id,'${owner}','${tombstonePath}','DELETED','${hash}','image/png',${bytes.length},now()-interval '25 hours' FROM public.goal WHERE slug='${goalSlug}';
  `);
  const requeued = sql("SELECT public.requeue_orphan_cover_tombstones();");
  const tombstoneBeforeSettle = sql(`SELECT q.status||':'||CASE WHEN a.id IS NULL THEN 'asset-absent' ELSE 'asset-present' END FROM public.storage_cleanup_queue q LEFT JOIN public.goal_cover_asset a ON a.id='${tombstoneAsset}' WHERE q.bucket_id='goal-cover-quarantine' AND q.object_path='${tombstonePath}';`);
  const [tombstoneQueueId, tombstoneToken] = sql("SELECT id||'|'||lock_token FROM public.claim_storage_cleanup_batch(1,interval '15 minutes');").split("|");
  const tombstoneSettled = sql(`SELECT public.settle_storage_cleanup(${tombstoneQueueId},'${tombstoneToken}',true);`);
  const tombstoneAfterSettle = sql(`SELECT q.status||':'||CASE WHEN a.id IS NULL THEN 'asset-absent' ELSE 'asset-present' END FROM public.storage_cleanup_queue q LEFT JOIN public.goal_cover_asset a ON a.id='${tombstoneAsset}' WHERE q.id=${tombstoneQueueId};`);
  if (requeued !== "1" || tombstoneBeforeSettle !== "PENDING:asset-present" || tombstoneSettled !== "t" || tombstoneAfterSettle !== "DONE:asset-absent") {
    throw new Error(`cv12_atomic_or_requeue_${requeued}_${tombstoneBeforeSettle}_${tombstoneAfterSettle}`);
  }

  sql(`
    INSERT INTO public.goal_cover_asset(id,goal_id,owner_member_id,quarantine_path,status,content_sha256,mime_type,byte_size,created_at)
    SELECT '${pairAsset}',id,'${owner}','${pairPath}','DELETED','${hash}','image/png',${bytes.length},now()-interval '25 hours' FROM public.goal WHERE slug='${goalSlug}';
    INSERT INTO public.storage_cleanup_queue(goal_id,bucket_id,object_path,reason)
    SELECT id,'goal-cover-public','${pairPath}','ASSET_REPLACED' FROM public.goal WHERE slug='${goalSlug}';
  `);
  const [publicQueueId, publicToken] = sql("SELECT id||'|'||lock_token FROM public.claim_storage_cleanup_batch(1,interval '15 minutes');").split("|");
  const publicSettled = sql(`SELECT public.settle_storage_cleanup(${publicQueueId},'${publicToken}',true);`);
  const afterPublicPair = sql(`SELECT CASE WHEN EXISTS(SELECT 1 FROM public.goal_cover_asset WHERE id='${pairAsset}') THEN 'asset-present' ELSE 'asset-absent' END;`);
  sql(`INSERT INTO public.storage_cleanup_queue(goal_id,bucket_id,object_path,reason) SELECT id,'goal-cover-quarantine','${pairPath}','ABANDONED_UPLOAD' FROM public.goal WHERE slug='${goalSlug}';`);
  const [quarantineQueueId, quarantineToken] = sql("SELECT id||'|'||lock_token FROM public.claim_storage_cleanup_batch(1,interval '15 minutes');").split("|");
  const quarantineSettled = sql(`SELECT public.settle_storage_cleanup(${quarantineQueueId},'${quarantineToken}',true);`);
  const afterQuarantinePair = sql(`SELECT CASE WHEN EXISTS(SELECT 1 FROM public.goal_cover_asset WHERE id='${pairAsset}') THEN 'asset-present' ELSE 'asset-absent' END;`);
  if (publicSettled !== "t" || afterPublicPair !== "asset-present" || quarantineSettled !== "t" || afterQuarantinePair !== "asset-absent") {
    throw new Error(`cv13_bucket_pair_${afterPublicPair}_${afterQuarantinePair}`);
  }

  const eventBaseline = Number(sql("SELECT coalesce(max(id),0) FROM public.ops_event;"));
  const wrongUrlProbe = await injectDrainFailureProbe({
    name: "wrong-url",
    url: "http://kong:8000/functions/v1/not-storage-cleanup-worker",
    token: cleanupToken,
    expectedStatus: 404,
  });
  const permissionDeniedProbe = await injectDrainFailureProbe({
    name: "permission-denied",
    url: "http://kong:8000/functions/v1/storage-cleanup-worker",
    token: "wrong-token-with-more-than-thirty-two-characters",
    expectedStatus: 403,
  });
  const preCronAlertCount = Number(sql(`SELECT count(*) FROM public.ops_event WHERE id>${eventBaseline} AND event_type='STORAGE_CLEANUP_DRAIN_STALLED';`));
  if (preCronAlertCount !== 0) throw new Error("monitor_alert_created_before_cron");
  const monitorCronObservation = await observeMonitorCron({
    eventBaseline,
    expectedStalledCount: 2,
  });

  const denoContracts = execFileSync(
    "deno",
    ["test", "--allow-env", "supabase/functions/_shared/cleanup-auth.test.ts", "supabase/functions/_shared/storage-cleanup.test.ts"],
    { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (!denoContracts.includes("ok |")) throw new Error("deno_contracts_not_observed");
  console.log(JSON.stringify({
    EA01: { status: ea01.status, authorization_header_sent: false },
    EA02_observed: ea02.status,
    EA03: { status: ea03.status, code: ea03Body.error.code },
    EA04: { status: ea04.status, code: ea04Body.error.code, constant_time_and_fail_closed_unit: "PASS" },
    CV09: { http: cv09.status, claimed: cv09Body.claimed, storage_absent: true, db: dbState },
    CV09_idempotent: idempotentBody,
    CV09_concurrent: { responses: concurrent.map((response) => response.status), storage_absent: true },
    CV10: { distinct_claims: true, pre_lease_reclaim: 0, stale_reclaimed: true, late_settle: false, current_state: failedState },
    CV11: { injected_partial_success_contract: "PASS", source: "production classifyRemovalResults" },
    CV12: { orphan_requeued: Number(requeued), before: tombstoneBeforeSettle, after: tombstoneAfterSettle },
    CV13: { public_pair: afterPublicPair, quarantine_pair: afterQuarantinePair },
    R11: { wrong_url: wrongUrlProbe, permission_denied: permissionDeniedProbe, alert_before_cron: preCronAlertCount, monitor_cron: monitorCronObservation },
    CRON01: cronObservation,
  }));
} finally {
  try {
    for (const jobId of temporaryCronJobIds) {
      try { sql(`SELECT cron.unschedule(${jobId});`); } catch {}
    }
    sql(`
      DELETE FROM public.storage_cleanup_queue WHERE object_path LIKE 'runtime-cleanup/${runId}/%';
      DELETE FROM public.goal_cover_asset WHERE goal_id=(SELECT id FROM public.goal WHERE slug='${goalSlug}');
      DELETE FROM public.social_cheer_member_attribution WHERE cheer_id IN (SELECT id FROM public.cheer WHERE goal_id=(SELECT id FROM public.goal WHERE slug='${goalSlug}'));
      DELETE FROM public.cheer WHERE goal_id=(SELECT id FROM public.goal WHERE slug='${goalSlug}');
      DELETE FROM public.goal WHERE slug='${goalSlug}';
      DELETE FROM public.member WHERE id='${owner}';
      DELETE FROM auth.users WHERE id='${owner}';
    `);
  } catch {}
  server.kill("SIGTERM");
  closeSync(logFd);
  rmSync(secretDir, { recursive: true, force: true });
}
