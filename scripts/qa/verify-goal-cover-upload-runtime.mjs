import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { openSync, closeSync, mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("../..", import.meta.url).pathname;
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

const envDir = mkdtempSync(join(tmpdir(), "haenael-cover-"));
const envFile = join(envDir, "runtime.env");
writeFileSync(envFile, `COVER_PUBLIC_BASE_URL=${apiUrl}\n`, { mode: 0o600 });
const logFd = openSync("/tmp/haenael-cover-functions.log", "w");
const server = spawn("supabase", ["functions", "serve", "--env-file", envFile], {
  cwd: repo,
  env: { ...process.env, COVER_PUBLIC_BASE_URL: apiUrl },
  stdio: ["ignore", logFd, logFd],
});
const email = `cover-runtime-${Date.now()}@test.local`;
const password = "Runtime-cover-2026!";
let userId = "";
let goalId = 0;
let assetId = "";
let objectPath = "";

const serviceHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

function sql(statement) {
  return execFileSync(
    "docker",
    ["exec", "-i", "supabase_db_haenael-ge", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
    { input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
}

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

async function waitForServeProcess() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const log = readFileSync("/tmp/haenael-cover-functions.log", "utf8");
      if (log.includes("Using supabase-edge-runtime")) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("cover_function_process_timeout");
}

async function waitForFunction() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetchWithRetry(`${apiUrl}/functions/v1/goal-cover-sign-upload`, { method: "POST", headers: { apikey: anonKey } });
      if ([401, 400, 422].includes(response.status)) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("cover_function_serve_timeout");
}

try {
  await waitForServeProcess();
  await waitForFunction();
  const userResponse = await fetchWithRetry(`${apiUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { nickname: "커버 런타임" } }),
  });
  const user = await userResponse.json();
  if (!userResponse.ok || !user.id) throw new Error(`auth_user_create_${userResponse.status}`);
  userId = user.id;

  await fetchWithRetry(`${apiUrl}/rest/v1/member?on_conflict=id`, {
    method: "POST",
    headers: { ...serviceHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: userId, nickname: "커버 런타임" }),
  });
  const goalResponse = await fetchWithRetry(`${apiUrl}/rest/v1/goal`, {
    method: "POST",
    headers: { ...serviceHeaders, Prefer: "return=representation" },
    body: JSON.stringify({ member_id: userId, slug: `cover-runtime-${Date.now()}`, title: "커버 업로드 확인", due_date: "2026-12-31", status: "ACTIVE" }),
  });
  const goals = await goalResponse.json();
  if (!goalResponse.ok || !goals[0]?.id) throw new Error(`goal_create_${goalResponse.status}`);
  goalId = goals[0].id;

  const loginResponse = await fetchWithRetry(`${apiUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await loginResponse.json();
  if (!loginResponse.ok || !session.access_token) throw new Error(`auth_login_${loginResponse.status}`);

  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const authHeaders = { apikey: anonKey, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" };
  const signResponse = await fetchWithRetry(`${apiUrl}/functions/v1/goal-cover-sign-upload`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ goal_id: goalId, file_name: "runtime.png", mime_type: "image/png", byte_size: bytes.length, content_sha256: sha256 }),
  });
  const signed = await signResponse.json();
  if (!signResponse.ok || !signed.upload_url || !signed.asset_id) throw new Error(`sign_upload_${signResponse.status}_${signed.error?.code ?? "unknown"}`);
  assetId = signed.asset_id;
  objectPath = signed.object_path;

  const uploadResponse = await fetchWithRetry(signed.upload_url, {
    method: "PUT",
    headers: { "Content-Type": "image/png", "x-upsert": "false" },
    body: bytes,
  });
  if (!uploadResponse.ok) throw new Error(`signed_put_${uploadResponse.status}`);

  const finalizeResponse = await fetchWithRetry(`${apiUrl}/functions/v1/goal-cover-finalize`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ asset_id: signed.asset_id, content_sha256: sha256 }),
  });
  const finalized = await finalizeResponse.json();
  if (!finalizeResponse.ok || finalized.status !== "REVIEW") throw new Error(`finalize_${finalizeResponse.status}_${finalized.error?.code ?? "unknown"}`);

  const assetResponse = await fetchWithRetry(`${apiUrl}/rest/v1/goal_cover_asset?id=eq.${signed.asset_id}&select=status,quarantine_path`, { headers: serviceHeaders });
  const assets = await assetResponse.json();
  const storageResponse = await fetchWithRetry(`${apiUrl}/storage/v1/object/goal-cover-quarantine/${objectPath}`, { headers: serviceHeaders });
  if (assets[0]?.status !== "REVIEW" || !storageResponse.ok) throw new Error("cover_runtime_state_mismatch");

  console.log(JSON.stringify({ sign: signResponse.status, signed_put: uploadResponse.status, finalize: finalizeResponse.status, asset_status: assets[0].status, storage_object: "present" }));
} finally {
  if (objectPath) {
    await fetchWithRetry(`${apiUrl}/storage/v1/object/goal-cover-quarantine/${objectPath}`, { method: "DELETE", headers: serviceHeaders }).catch(() => undefined);
  }
  if (userId && goalId) {
    try {
      sql(`
        DELETE FROM public.cheer WHERE goal_id=${goalId};
        DELETE FROM public.friend_invite WHERE goal_id=${goalId};
        DELETE FROM public.share_event WHERE goal_id=${goalId};
        DELETE FROM public.wordmap_render_cache WHERE goal_id=${goalId};
        DELETE FROM public.storage_cleanup_queue WHERE goal_id=${goalId};
        DELETE FROM public.goal_cover_asset WHERE goal_id=${goalId};
        DELETE FROM public.goal WHERE id=${goalId};
        DELETE FROM public.member WHERE id='${userId}';
        DELETE FROM auth.users WHERE id='${userId}';
      `);
    } catch {}
  }
  server.kill("SIGTERM");
  closeSync(logFd);
  rmSync(envDir, { recursive: true, force: true });
}
