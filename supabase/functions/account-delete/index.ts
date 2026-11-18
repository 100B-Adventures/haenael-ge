import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { withRegionHeader } from "../_shared/region.ts";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withRegionHeader(
      new Headers({ "Content-Type": "application/json", ...CORS }),
    ),
  });
}

export function parseAccountDeleteRequest(
  value: unknown,
): { requestKey: string } {
  const body = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const requestKey = typeof body.request_key === "string"
    ? body.request_key.trim()
    : "";
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(requestKey)) {
    throw new Error("invalid_request_key");
  }
  return { requestKey };
}

export function mapAccountDeletionError(
  error: unknown,
): { status: number; code: string } {
  const message = error instanceof Error ? error.message : String(error);
  for (
    const code of [
      "account_balance_remaining",
      "cashout_in_progress",
      "account_settlement_pending",
    ]
  ) {
    if (message.includes(code)) return { status: 409, code };
  }
  if (message.includes("member_not_found")) {
    return { status: 404, code: "member_not_found" };
  }
  if (message.includes("account_deletion_in_progress")) {
    return { status: 409, code: "account_deletion_in_progress" };
  }
  return { status: 503, code: "account_delete_failed" };
}

async function removeOwnedStorageObjects(
  admin: SupabaseClient,
  memberId: string,
): Promise<void> {
  const byBucket = new Map<string, string[]>();
  const addPath = (bucket: string, path: unknown) => {
    if (typeof path !== "string" || !path) return;
    const paths = byBucket.get(bucket) ?? [];
    if (!paths.includes(path)) paths.push(path);
    byBucket.set(bucket, paths);
  };

  const [{ data: owned, error }, { data: avatars }, { data: covers }] =
    await Promise.all([
      admin.schema("storage").from("objects").select("bucket_id,name")
        .or(`owner.eq.${memberId},owner_id.eq.${memberId}`).limit(1000),
      admin.from("profile_avatar_asset").select("object_path").eq(
        "owner_member_id",
        memberId,
      ),
      admin.from("goal_cover_asset").select("quarantine_path,public_path").eq(
        "owner_member_id",
        memberId,
      ),
    ]);
  if (error) throw new Error("account_storage_cleanup_failed");
  for (const row of owned ?? []) {
    const paths = byBucket.get(row.bucket_id) ?? [];
    if (!paths.includes(row.name)) paths.push(row.name);
    byBucket.set(row.bucket_id, paths);
  }
  for (const avatar of avatars ?? []) {
    addPath("profile-avatars", avatar.object_path);
  }
  for (const cover of covers ?? []) {
    addPath("goal-cover-quarantine", cover.quarantine_path);
    addPath("goal-cover-public", cover.public_path);
  }
  for (const [bucket, paths] of byBucket) {
    for (let offset = 0; offset < paths.length; offset += 100) {
      const { error: removeError } = await admin.storage.from(bucket).remove(
        paths.slice(offset, offset + 100),
      );
      if (removeError) throw new Error("account_storage_cleanup_failed");
    }
  }
  const [{ error: avatarDeleteError }, { error: coverDeleteError }] =
    await Promise.all([
      admin.from("profile_avatar_asset").delete().eq(
        "owner_member_id",
        memberId,
      ),
      admin.from("goal_cover_asset").delete().eq("owner_member_id", memberId),
    ]);
  if (avatarDeleteError || coverDeleteError) {
    throw new Error("account_storage_cleanup_failed");
  }
}

export async function handleAccountDelete(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return json(405, { error: { code: "method_not_allowed" } });
  }
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return json(401, { error: { code: "unauthorized" } });
  }
  let input: { requestKey: string };
  try {
    input = parseAccountDeleteRequest(await req.json());
  } catch {
    return json(400, { error: { code: "invalid_request" } });
  }
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return json(503, { error: { code: "service_configuration_missing" } });
  }
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(
    authorization.slice(7),
  );
  if (userError || !userData.user) {
    return json(401, { error: { code: "unauthorized" } });
  }
  const memberId = userData.user.id;

  const { error: prepareError } = await admin.rpc("prepare_account_deletion", {
    p_member_id: memberId,
    p_request_key: input.requestKey,
  });
  if (prepareError) {
    const mapped = mapAccountDeletionError(new Error(prepareError.message));
    return json(mapped.status, { error: { code: mapped.code } });
  }

  try {
    await removeOwnedStorageObjects(admin, memberId);
  } catch {
    return json(503, { error: { code: "account_storage_cleanup_failed" } });
  }
  const { error: deleteError } = await admin.auth.admin.deleteUser(memberId);
  if (deleteError) {
    return json(503, { error: { code: "account_auth_delete_failed" } });
  }

  const { error: completeError } = await admin.rpc(
    "complete_account_deletion",
    {
      p_member_id: memberId,
      p_request_key: input.requestKey,
    },
  );
  if (completeError) console.error("[account-delete] audit completion failed");
  return json(200, { data: { deleted: true } });
}

if (import.meta.main) Deno.serve(handleAccountDelete);
