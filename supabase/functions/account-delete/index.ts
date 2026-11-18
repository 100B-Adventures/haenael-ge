import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { withRegionHeader } from "../_shared/region.ts";
import { decryptSecret } from "../_shared/secret-box.ts";

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

export function mapAccountDeletionError(
  error: unknown,
): { status: number; code: string } {
  const message = error instanceof Error ? error.message : String(error);
  for (
    const code of [
      "account_balance_remaining",
      "cashout_in_progress",
      "account_settlement_pending",
      "account_deletion_in_progress",
      "account_deletion_state_invalid",
    ]
  ) {
    if (message.includes(code)) return { status: 409, code };
  }
  if (message.includes("member_not_found")) {
    return { status: 404, code: "member_not_found" };
  }
  return { status: 503, code: "account_delete_failed" };
}

type AppleRevokeFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export class AppleCredentialRejectedError extends Error {
  constructor() {
    super("apple_revoke_credential_invalid");
    this.name = "AppleCredentialRejectedError";
  }
}

export async function revokeAppleCredential(args: {
  clientId: string;
  clientSecret: string;
  token: string;
  tokenTypeHint: "refresh_token";
  fetcher?: AppleRevokeFetcher;
}): Promise<void> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    token: args.token,
    token_type_hint: args.tokenTypeHint,
  });
  const response = await (args.fetcher ?? fetch)(
    "https://appleid.apple.com/auth/revoke",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (response.ok) return;
  let providerCode = "";
  try {
    const payload = await response.clone().json() as { error?: string };
    providerCode = payload.error ?? "";
  } catch {
    // The HTTP status remains the retry decision when Apple sends no JSON.
  }
  if (providerCode === "invalid_grant") {
    throw new AppleCredentialRejectedError();
  }
  throw new Error(`apple_revoke_http_${response.status}`);
}

type AppleRevocationResult =
  | "not_applicable"
  | "revoked"
  | "manual_required"
  | "retry_required";

async function prepareAppleRevocation(args: {
  admin: SupabaseClient;
  memberId: string;
  isAppleIdentity: boolean;
}): Promise<AppleRevocationResult> {
  if (!args.isAppleIdentity) return "not_applicable";
  const { data: credential, error: credentialError } = await args.admin.from(
    "apple_token_revocation",
  ).select("token_enc,token_type_hint,status,attempt_count").eq(
    "member_id",
    args.memberId,
  ).maybeSingle();
  if (credentialError) return "retry_required";
  if (credential?.status === "REVOKED") return "revoked";
  if (!credential?.token_enc) {
    const { error } = await args.admin.from("apple_token_revocation").upsert({
      member_id: args.memberId,
      token_enc: null,
      status: "MANUAL_REQUIRED",
      attempt_count: credential?.attempt_count ?? 0,
      last_error_code: "provider_refresh_token_missing",
      revoked_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "member_id" });
    return error ? "retry_required" : "manual_required";
  }
  const encryptionKey = Deno.env.get("APPLE_REVOCATION_TOKEN_ENCRYPTION_KEY");
  const clientId = Deno.env.get("APPLE_REVOKE_CLIENT_ID");
  const clientSecret = Deno.env.get("APPLE_REVOKE_CLIENT_SECRET");
  if (!encryptionKey || !clientId || !clientSecret) {
    await args.admin.from("apple_token_revocation").update({
      status: "RETRY_REQUIRED",
      last_error_code: "apple_revoke_configuration_missing",
      updated_at: new Date().toISOString(),
    }).eq("member_id", args.memberId);
    return "retry_required";
  }
  try {
    const token = await decryptSecret(credential.token_enc, encryptionKey);
    await revokeAppleCredential({
      clientId,
      clientSecret,
      token,
      tokenTypeHint: "refresh_token",
    });
    const { error: updateError } = await args.admin.from(
      "apple_token_revocation",
    ).update({
      token_enc: null,
      status: "REVOKED",
      attempt_count: (credential.attempt_count ?? 0) + 1,
      last_error_code: null,
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("member_id", args.memberId);
    return updateError ? "retry_required" : "revoked";
  } catch (error) {
    if (error instanceof AppleCredentialRejectedError) {
      await args.admin.from("apple_token_revocation").update({
        token_enc: null,
        status: "MANUAL_REQUIRED",
        attempt_count: (credential.attempt_count ?? 0) + 1,
        last_error_code: error.message,
        updated_at: new Date().toISOString(),
      }).eq("member_id", args.memberId);
      return "manual_required";
    }
    await args.admin.from("apple_token_revocation").update({
      status: "RETRY_REQUIRED",
      attempt_count: (credential.attempt_count ?? 0) + 1,
      last_error_code: "apple_revoke_failed",
      updated_at: new Date().toISOString(),
    }).eq("member_id", args.memberId);
    return "retry_required";
  }
}

type AccountDeletionState =
  | "REQUESTED"
  | "BLOCKED_PENDING_PAYMENT"
  | "EXTERNAL_REVOKED"
  | "DATA_DELETED"
  | "AUTH_DELETED";

export async function advanceAccountDeletion(args: {
  requestJob(): Promise<AccountDeletionState>;
  revokeExternal(): Promise<AppleRevocationResult>;
  markExternalRevoked(): Promise<AccountDeletionState>;
  deleteStorage(): Promise<void>;
  deleteData(): Promise<AccountDeletionState>;
  deleteAuth(): Promise<void>;
  completeAuth(): Promise<AccountDeletionState>;
}): Promise<AccountDeletionState | "manual_required" | "retry_required"> {
  let state = await args.requestJob();
  if (state === "BLOCKED_PENDING_PAYMENT" || state === "AUTH_DELETED") {
    return state;
  }
  if (state === "REQUESTED") {
    const revocation = await args.revokeExternal();
    if (revocation === "manual_required" || revocation === "retry_required") {
      return revocation;
    }
    state = await args.markExternalRevoked();
    if (state === "BLOCKED_PENDING_PAYMENT") return state;
  }
  if (state === "EXTERNAL_REVOKED") {
    await args.deleteStorage();
    state = await args.deleteData();
  }
  if (state === "DATA_DELETED") {
    await args.deleteAuth();
    state = await args.completeAuth();
  }
  return state;
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
  for (const row of owned ?? []) addPath(row.bucket_id, row.name);
  for (const avatar of avatars ?? []) addPath("profile-avatars", avatar.object_path);
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
}

async function rpcState(
  admin: SupabaseClient,
  name: string,
  memberId: string,
): Promise<AccountDeletionState> {
  const { data, error } = await admin.rpc(name, { p_member_id: memberId });
  if (error) throw new Error(error.message);
  return data as AccountDeletionState;
}

export async function handleAccountDelete(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: { code: "method_not_allowed" } });
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return json(401, { error: { code: "unauthorized" } });
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
  const isAppleIdentity = userData.user.identities?.some(
    (identity) => identity.provider === "apple",
  ) || userData.user.app_metadata?.provider === "apple";

  try {
    const result = await advanceAccountDeletion({
      requestJob: () => rpcState(admin, "request_account_deletion", memberId),
      revokeExternal: () => prepareAppleRevocation({ admin, memberId, isAppleIdentity }),
      markExternalRevoked: () =>
        rpcState(admin, "mark_account_deletion_external_revoked", memberId),
      deleteStorage: () => removeOwnedStorageObjects(admin, memberId),
      deleteData: () => rpcState(admin, "delete_account_data", memberId),
      deleteAuth: async () => {
        const { error } = await admin.auth.admin.deleteUser(memberId);
        if (error) throw new Error("account_auth_delete_failed");
      },
      completeAuth: () =>
        rpcState(admin, "complete_account_deletion_auth", memberId),
    });
    if (result === "manual_required") {
      return json(409, { error: { code: "apple_reauthentication_required" } });
    }
    if (result === "retry_required") {
      return json(503, { error: { code: "apple_token_revocation_pending" } });
    }
    if (result === "BLOCKED_PENDING_PAYMENT") {
      return json(409, { error: { code: "account_settlement_pending" } });
    }
    return json(200, { data: { deleted: result === "AUTH_DELETED", status: result } });
  } catch (error) {
    if (error instanceof Error && error.message === "account_storage_cleanup_failed") {
      return json(503, { error: { code: error.message } });
    }
    if (error instanceof Error && error.message === "account_auth_delete_failed") {
      return json(503, { error: { code: error.message } });
    }
    const mapped = mapAccountDeletionError(error);
    return json(mapped.status, { error: { code: mapped.code } });
  }
}

if (import.meta.main) Deno.serve(handleAccountDelete);
