import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  detectImageMime,
  externalizeSignedStorageUrl,
  sha256Hex,
} from "../_shared/goal-cover.ts";
import {
  avatarObjectPath,
  parseProfileRequest,
  PROFILE_AVATAR_BUCKET,
  PROFILE_AVATAR_MAX_BYTES,
  PROFILE_AVATAR_UPLOAD_TTL_SECONDS,
  PROFILE_CORS_HEADERS,
  profileErrorStatus,
  profileJson,
} from "../_shared/profile.ts";

type JsonRecord = Record<string, unknown>;

async function rollbackPendingAvatar(
  service: ReturnType<typeof createClient<any>>,
  assetId: string,
  ownerMemberId: string,
  expectedObjectPath: string | null,
): Promise<void> {
  let claim = service.from("profile_avatar_asset")
    .update({ status: "DELETED" })
    .eq("id", assetId)
    .eq("owner_member_id", ownerMemberId)
    .eq("status", "UPLOADING");
  if (expectedObjectPath) claim = claim.eq("object_path", expectedObjectPath);
  const { data: pending } = await claim
    .select("id,object_path,status,created_at")
    .maybeSingle();
  if (!pending) return;
  const tokenExpiryWithMargin = new Date(
    new Date(pending.created_at).getTime() + (2 * 60 + 5) * 60 * 1000,
  ).toISOString();
  await service.from("storage_cleanup_queue").insert({
    goal_id: null,
    profile_avatar_asset_id: pending.id,
    bucket_id: PROFILE_AVATAR_BUCKET,
    object_path: pending.object_path,
    reason: "PROFILE_AVATAR_ABANDONED",
    available_at: tokenExpiryWithMargin,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: PROFILE_CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return profileJson(405, { error: { code: "method_not_allowed" } });
  }
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return profileJson(401, { error: { code: "auth_required" } });
  }

  let rollbackObjectPath: string | null = null;
  let rollbackAssetId: string | null = null;
  let authenticatedUserId: string | null = null;
  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
  });
  const service = createClient(
    url,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const input = parseProfileRequest(await req.json());
    const { data: { user } } = await caller.auth.getUser();
    if (!user) throw new Error("auth_required");
    authenticatedUserId = user.id;

    if (input.action === "save") {
      const { data, error } = await caller.rpc("update_my_profile", {
        p_nickname: input.nickname,
        p_bio: input.bio,
        p_profile_image: input.profileImage,
      });
      if (error) {
        const known = [
          "profile_not_found",
          "invalid_nickname",
          "invalid_bio",
          "invalid_profile_image",
        ].find((code) => error.message.includes(code));
        throw new Error(known ?? "profile_update_failed");
      }
      const result = (data ?? {}) as JsonRecord;
      return profileJson(200, {
        profile: result.profile,
        cleanup_pending: typeof result.stale_avatar_object_path === "string",
      });
    }

    if (input.action === "sign_avatar") {
      const assetId = crypto.randomUUID();
      const objectPath = avatarObjectPath(user.id, assetId, input.mimeType);
      const { error: insertError } = await service.from("profile_avatar_asset")
        .insert({
          id: assetId,
          owner_member_id: user.id,
          object_path: objectPath,
          status: "UPLOADING",
          content_sha256: input.contentSha256,
          mime_type: input.mimeType,
          byte_size: input.byteSize,
        });
      if (insertError) throw new Error("avatar_asset_create_failed");
      rollbackAssetId = assetId;
      const { data: signed, error: signError } = await service.storage.from(
        PROFILE_AVATAR_BUCKET,
      ).createSignedUploadUrl(objectPath, { upsert: false });
      if (signError || !signed?.signedUrl) {
        throw new Error("signed_upload_failed");
      }
      rollbackAssetId = null;
      return profileJson(200, {
        asset_id: assetId,
        upload_url: externalizeSignedStorageUrl(
          signed.signedUrl,
          req.url,
          req.headers,
          Deno.env.get("PROFILE_PUBLIC_BASE_URL"),
        ),
        object_path: objectPath,
        expires_in_seconds: PROFILE_AVATAR_UPLOAD_TTL_SECONDS,
        max_bytes: PROFILE_AVATAR_MAX_BYTES,
      });
    }

    const { data: asset, error: assetError } = await service.from(
      "profile_avatar_asset",
    ).select(
      "id,owner_member_id,object_path,status,content_sha256,mime_type,byte_size",
    ).eq("id", input.assetId).eq("owner_member_id", user.id).maybeSingle();
    if (assetError || !asset) throw new Error("avatar_asset_not_found");
    if (asset.status !== "UPLOADING") {
      throw new Error("avatar_asset_not_finalizable");
    }
    if (input.contentSha256 !== asset.content_sha256) {
      throw new Error("hash_mismatch");
    }
    rollbackObjectPath = asset.object_path;
    rollbackAssetId = asset.id;
    const { data: blob, error: downloadError } = await service.storage.from(
      PROFILE_AVATAR_BUCKET,
    ).download(asset.object_path);
    if (downloadError || !blob) throw new Error("avatar_asset_not_found");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (
      bytes.length < 1 || bytes.length > PROFILE_AVATAR_MAX_BYTES ||
      bytes.length !== Number(asset.byte_size)
    ) {
      throw new Error(
        bytes.length > PROFILE_AVATAR_MAX_BYTES
          ? "file_too_large"
          : "file_size_mismatch",
      );
    }
    const actualMime = detectImageMime(bytes);
    if (!actualMime || actualMime !== asset.mime_type) {
      throw new Error("unsupported_media_type");
    }
    const actualHash = await sha256Hex(bytes);
    if (
      actualHash !== input.contentSha256 ||
      actualHash !== asset.content_sha256
    ) {
      throw new Error("hash_mismatch");
    }
    const { data: publicData } = service.storage.from(PROFILE_AVATAR_BUCKET)
      .getPublicUrl(asset.object_path);
    if (!publicData.publicUrl) throw new Error("profile_update_failed");
    const { data, error } = await service.rpc(
      "activate_my_profile_avatar_service",
      {
        p_asset_id: asset.id,
        p_owner_member_id: user.id,
        p_public_url: publicData.publicUrl,
      },
    );
    if (error) {
      const known = [
        "profile_not_found",
        "avatar_asset_not_found",
        "avatar_asset_not_finalizable",
        "invalid_profile_image",
      ].find((code) => error.message.includes(code));
      throw new Error(known ?? "profile_update_failed");
    }
    rollbackObjectPath = null;
    rollbackAssetId = null;
    const result = (data ?? {}) as JsonRecord;
    const profile = (result.profile ?? {}) as JsonRecord;
    return profileJson(200, {
      asset_id: asset.id,
      object_path: asset.object_path,
      profile,
      profile_image: profile.profile_image ?? null,
      cleanup_pending: typeof result.stale_avatar_object_path === "string",
    });
  } catch (error) {
    if (rollbackAssetId && authenticatedUserId) {
      await rollbackPendingAvatar(
        service,
        rollbackAssetId,
        authenticatedUserId,
        rollbackObjectPath,
      );
    }
    const code = error instanceof Error ? error.message : "profile_update_failed";
    return profileJson(profileErrorStatus(code), { error: { code } });
  }
});
