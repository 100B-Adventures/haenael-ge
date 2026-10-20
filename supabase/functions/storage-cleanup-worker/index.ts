import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
// Edge Function implementation token: storage-cleanup-worker
import { authorizeCleanupRequest } from "../_shared/cleanup-auth.ts";
import {
  type CleanupClaim,
  groupCleanupClaims,
  removeCleanupClaims,
  splitStoragePath,
} from "../_shared/storage-cleanup.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function objectIsAbsent(
  storage: ReturnType<typeof createClient>["storage"],
  bucketId: string,
  objectPath: string,
): Promise<boolean> {
  const { folder, name } = splitStoragePath(objectPath);
  const { data, error } = await storage.from(bucketId).list(folder, {
    limit: 100,
    search: name,
  });
  if (error) return false;
  return !(data ?? []).some((object) => object.name === name);
}

export async function handleStorageCleanup(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json(405, { error: { code: "method_not_allowed" } });
  }

  const auth = await authorizeCleanupRequest(
    req.headers.get("x-cleanup-internal-token"),
    Deno.env.get("STORAGE_CLEANUP_INTERNAL_TOKEN"),
  );
  if (!auth.ok) return json(auth.status, { error: { code: auth.code } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json(503, { error: { code: "missing_service_configuration" } });
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await service.rpc("claim_storage_cleanup_batch", {
    p_limit: 200,
    p_lease: "15 minutes",
  });
  if (error) return json(500, { error: { code: "claim_failed" } });

  const claims = (data ?? []) as CleanupClaim[];
  let succeeded = 0;
  let failed = 0;
  let ownershipLost = 0;

  async function settle(claim: CleanupClaim, ok: boolean) {
    const result = await service.rpc("settle_storage_cleanup", {
      p_id: claim.id,
      p_lock_token: claim.lock_token,
      p_ok: ok,
    });
    if (result.error) {
      failed += 1;
      return;
    }
    if (result.data !== true) {
      ownershipLost += 1;
      return;
    }
    if (ok) succeeded += 1;
    else failed += 1;
  }

  for (const [bucketId, bucketClaims] of groupCleanupClaims(claims)) {
    const bucket = service.storage.from(bucketId);
    const outcomes = await removeCleanupClaims(
      bucketClaims,
      (paths) => bucket.remove(paths),
      (claim) => objectIsAbsent(service.storage, bucketId, claim.object_path),
    );
    for (const claim of bucketClaims) {
      await settle(claim, outcomes.get(claim.id) === true);
    }
  }

  console.log(JSON.stringify({
    event: "storage_cleanup_run",
    claimed: claims.length,
    succeeded,
    failed,
    ownership_lost: ownershipLost,
  }));

  return json(200, {
    claimed: claims.length,
    succeeded,
    failed,
    ownership_lost: ownershipLost,
  });
}

if (import.meta.main) Deno.serve(handleStorageCleanup);
