import { execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
if (!["127.0.0.1", "localhost"].includes(new URL(apiUrl).hostname)) {
  throw new Error("local_supabase_required");
}

const runId = randomBytes(6).toString("hex");
const password = "Runtime-profile-2026!";
// Keep the env file inside Supabase's bind-mounted project directory. On macOS,
// Docker cannot reliably reopen a host /var/folders temp path when the local
// Edge Runtime reloads the worker.
const envDir = mkdtempSync(join(repo, "supabase", ".temp", "profile-runtime-"));
const envFile = join(envDir, "runtime.env");
writeFileSync(envFile, `PROFILE_PUBLIC_BASE_URL=${apiUrl}\n`, { mode: 0o600 });
const logPath = `/tmp/haenael-profile-functions-${runId}.log`;
const logFd = openSync(logPath, "w");
const server = spawn(
  "supabase",
  ["functions", "serve", "profile-update", "--no-verify-jwt", "--env-file", envFile],
  {
    cwd: repo,
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      PROFILE_PUBLIC_BASE_URL: apiUrl,
      SUPABASE_INTERNAL_IMAGE_REGISTRY:
        process.env.SUPABASE_INTERNAL_IMAGE_REGISTRY ?? "ghcr.io",
    },
    stdio: ["ignore", logFd, logFd],
  },
);
let serverExit = null;
server.once("exit", (code, signal) => {
  serverExit = { code, signal };
});

const serviceHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};
const functionUrl = `${apiUrl}/functions/v1/profile-update`;
let ownerId = "";
let otherId = "";
const assetIds = new Set();
const objectPaths = new Set();

function sql(statement) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_haenael-ge",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ],
    { input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim();
}

async function fetchWithRetry(input, init, attempts = 4) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetch(input, {
        ...init,
        signal: init?.signal ?? AbortSignal.timeout(12000),
      });
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

function logTail() {
  try {
    return readFileSync(logPath, "utf8")
      .replaceAll(serviceKey, "[service-key-redacted]")
      .replaceAll(anonKey, "[anon-key-redacted]")
      .split("\n")
      .slice(-30)
      .join(" | ")
      .slice(-4000);
  } catch {
    return "log_unavailable";
  }
}

async function waitForFunction() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (serverExit) {
      throw new Error(
        `profile_function_exited_${serverExit.code ?? "signal"}_${logTail()}`,
      );
    }
    try {
      const response = await fetchWithRetry(functionUrl, {
        method: "POST",
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: "{}",
      }, 1);
      if (response.status === 401) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`profile_function_timeout_${logTail()}`);
}

async function createRuntimeUser(label) {
  const email = `profile-${label}-${runId}@test.local`;
  const response = await fetchWithRetry(`${apiUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const user = await response.json();
  if (!response.ok || !user.id) throw new Error(`user_create_${label}_${response.status}`);
  const memberResponse = await fetchWithRetry(`${apiUrl}/rest/v1/member`, {
    method: "POST",
    headers: { ...serviceHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({ id: user.id, nickname: `Runtime ${label}` }),
  });
  if (!memberResponse.ok) throw new Error(`member_create_${label}_${memberResponse.status}`);
  const login = await fetchWithRetry(`${apiUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await login.json();
  if (!login.ok || !session.access_token) throw new Error(`login_${label}_${login.status}`);
  return { id: user.id, token: session.access_token };
}

function authHeaders(token) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function invoke(token, body) {
  const response = await fetchWithRetry(functionUrl, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

async function signAvatar(token, bytes, mimeType = "image/png") {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const signed = await invoke(token, {
    action: "sign_avatar",
    file_name: "runtime.png",
    mime_type: mimeType,
    byte_size: bytes.length,
    content_sha256: sha256,
  });
  if (!signed.response.ok || !signed.body.asset_id || !signed.body.upload_url) {
    throw new Error(
      `profile_sign_${signed.response.status}_${signed.body.error?.code ?? "unknown"}`,
    );
  }
  assetIds.add(signed.body.asset_id);
  objectPaths.add(signed.body.object_path);
  return { ...signed.body, sha256 };
}

async function uploadSigned(signed, bytes) {
  return fetchWithRetry(signed.upload_url, {
    method: "PUT",
    headers: { "Content-Type": "image/png", "x-upsert": "false" },
    body: bytes,
  });
}

try {
  await waitForFunction();
  const owner = await createRuntimeUser("owner");
  const other = await createRuntimeUser("other");
  ownerId = owner.id;
  otherId = other.id;

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  const valid = await signAvatar(owner.token, png);
  const uploaded = await uploadSigned(valid, png);
  if (!uploaded.ok) throw new Error(`profile_put_${uploaded.status}`);

  const [correct, wrongHash] = await Promise.all([
    invoke(owner.token, {
      action: "finalize_avatar",
      asset_id: valid.asset_id,
      content_sha256: valid.sha256,
    }),
    invoke(owner.token, {
      action: "finalize_avatar",
      asset_id: valid.asset_id,
      content_sha256: "b".repeat(64),
    }),
  ]);
  if (
    correct.response.status !== 200 ||
    ![409, 422].includes(wrongHash.response.status) ||
    !correct.body.profile_image
  ) {
    throw new Error(
      `profile_concurrent_finalize_${correct.response.status}_${wrongHash.response.status}`,
    );
  }

  const assetRows = await (await fetchWithRetry(
    `${apiUrl}/rest/v1/profile_avatar_asset?id=eq.${valid.asset_id}&select=status,public_url,object_path`,
    { headers: serviceHeaders },
  )).json();
  const memberRows = await (await fetchWithRetry(
    `${apiUrl}/rest/v1/member?id=eq.${owner.id}&select=profile_image`,
    { headers: serviceHeaders },
  )).json();
  const activeObject = await fetchWithRetry(
    `${apiUrl}/storage/v1/object/profile-avatars/${valid.object_path}`,
    { headers: serviceHeaders },
  );
  if (
    assetRows[0]?.status !== "ACTIVE" || !activeObject.ok ||
    assetRows[0]?.public_url !== memberRows[0]?.profile_image ||
    memberRows[0]?.profile_image !== correct.body.profile_image
  ) {
    throw new Error("profile_active_state_mismatch");
  }

  const otherFinalize = await invoke(other.token, {
    action: "finalize_avatar",
    asset_id: valid.asset_id,
    content_sha256: valid.sha256,
  });
  if (
    otherFinalize.response.status !== 404 ||
    otherFinalize.body.error?.code !== "avatar_asset_not_found"
  ) {
    throw new Error(`profile_cross_owner_${otherFinalize.response.status}`);
  }

  const fakePng = Buffer.from("not-a-real-png");
  const invalid = await signAvatar(owner.token, fakePng);
  const invalidPut = await uploadSigned(invalid, fakePng);
  if (!invalidPut.ok) throw new Error(`invalid_profile_put_${invalidPut.status}`);
  const rejected = await invoke(owner.token, {
    action: "finalize_avatar",
    asset_id: invalid.asset_id,
    content_sha256: invalid.sha256,
  });
  if (
    rejected.response.status !== 415 ||
    rejected.body.error?.code !== "unsupported_media_type"
  ) {
    throw new Error(`invalid_magic_not_rejected_${rejected.response.status}`);
  }
  const reusedPut = await uploadSigned(invalid, fakePng);
  const invalidState = sql(`
    SELECT a.status||'|'||q.status||'|'||(q.available_at > now())::text
    FROM public.profile_avatar_asset a
    JOIN public.storage_cleanup_queue q ON q.profile_avatar_asset_id=a.id
    WHERE a.id='${invalid.asset_id}'
    ORDER BY q.id DESC LIMIT 1;
  `);
  if (reusedPut.ok || invalidState !== "DELETED|PENDING|true") {
    throw new Error(`signed_token_tombstone_${reusedPut.status}_${invalidState}`);
  }

  console.log(JSON.stringify({
    sign: 200,
    signed_put: uploaded.status,
    concurrent_finalize: {
      correct: correct.response.status,
      wrong_hash: wrongHash.response.status,
      active_object: "present",
      metadata_matches_member: true,
    },
    cross_owner_finalize: {
      status: otherFinalize.response.status,
      code: otherFinalize.body.error.code,
    },
    invalid_magic: {
      status: rejected.response.status,
      code: rejected.body.error.code,
      second_signed_put_blocked: reusedPut.status,
      delayed_cleanup_state: invalidState,
    },
  }));
} finally {
  for (const objectPath of objectPaths) {
    await fetchWithRetry(`${apiUrl}/storage/v1/object/profile-avatars/${objectPath}`, {
      method: "DELETE",
      headers: serviceHeaders,
    }).catch(() => undefined);
  }
  try {
    if (assetIds.size > 0) {
      const ids = [...assetIds].map((id) => `'${id}'`).join(",");
      sql(`
        DELETE FROM public.storage_cleanup_queue WHERE profile_avatar_asset_id IN (${ids});
        DELETE FROM public.profile_avatar_asset WHERE id IN (${ids});
      `);
    }
    for (const userId of [ownerId, otherId].filter(Boolean)) {
      sql(`DELETE FROM public.member WHERE id='${userId}'; DELETE FROM auth.users WHERE id='${userId}';`);
    }
  } catch {}
  const signalServer = (signal) => {
    try {
      if (process.platform !== "win32" && server.pid) {
        process.kill(-server.pid, signal);
      } else {
        server.kill(signal);
      }
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
  };
  if (server.exitCode === null && server.signalCode === null) {
    signalServer("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  }
  if (server.exitCode === null && server.signalCode === null) {
    signalServer("SIGKILL");
  }
  closeSync(logFd);
  rmSync(envDir, { recursive: true, force: true });
}
