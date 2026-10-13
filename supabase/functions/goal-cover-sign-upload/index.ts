import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  COVER_CORS_HEADERS,
  COVER_UPLOAD_TTL_SECONDS,
  coverErrorStatus,
  coverJson,
  externalizeSignedStorageUrl,
  extensionForMime,
  parseCoverUploadInput,
} from "../_shared/goal-cover.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: COVER_CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return coverJson(405, { error: { code: "method_not_allowed" } });
  }
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return coverJson(401, { error: { code: "auth_required" } });
  }
  try {
    const input = parseCoverUploadInput(await req.json());
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const service = createClient(url, serviceKey);
    const { data: { user } } = await caller.auth.getUser();
    if (!user) throw new Error("auth_required");
    const { data: goal } = await service.from("goal").select("id,member_id").eq(
      "id",
      input.goalId,
    ).eq("member_id", user.id).is("deleted_at", null).maybeSingle();
    if (!goal) throw new Error("goal_forbidden");
    const assetId = crypto.randomUUID();
    const objectPath = `${user.id}/${input.goalId}/${assetId}.${
      extensionForMime(input.mimeType)
    }`;
    const { error: insertError } = await service.from("goal_cover_asset")
      .insert({
        id: assetId,
        goal_id: input.goalId,
        owner_member_id: user.id,
        quarantine_path: objectPath,
        status: "UPLOADING",
        content_sha256: input.contentSha256,
        mime_type: input.mimeType,
        byte_size: input.byteSize,
      });
    if (insertError) throw new Error("asset_create_failed");
    const { data: signed, error: signError } = await service.storage.from(
      "goal-cover-quarantine",
    ).createSignedUploadUrl(objectPath, { upsert: false });
    if (signError || !signed?.signedUrl) {
      await service.from("goal_cover_asset").delete().eq("id", assetId);
      throw new Error("signed_upload_failed");
    }
    return coverJson(200, {
      asset_id: assetId,
      upload_url: externalizeSignedStorageUrl(
        signed.signedUrl,
        req.url,
        req.headers,
        Deno.env.get("COVER_PUBLIC_BASE_URL"),
      ),
      object_path: objectPath,
      expires_in_seconds: COVER_UPLOAD_TTL_SECONDS,
      max_bytes: 5242880,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "cover_upload_failed";
    return coverJson(coverErrorStatus(code), { error: { code } });
  }
});
