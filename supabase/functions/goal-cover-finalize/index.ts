import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  COVER_CORS_HEADERS,
  COVER_MAX_BYTES,
  coverErrorStatus,
  coverJson,
  detectImageMime,
  sha256Hex,
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
    const body = await req.json() as Record<string, unknown>;
    const assetId = String(body.asset_id ?? "");
    const expectedHash = String(body.content_sha256 ?? "");
    if (
      !/^[0-9a-f-]{36}$/.test(assetId) || !/^[0-9a-f]{64}$/.test(expectedHash)
    ) throw new Error("invalid_request");
    const url = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const service = createClient(
      url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user } } = await caller.auth.getUser();
    if (!user) throw new Error("auth_required");
    const { data: asset } = await service.from("goal_cover_asset").select(
      "id,owner_member_id,quarantine_path,status,content_sha256,mime_type,byte_size",
    ).eq("id", assetId).eq("owner_member_id", user.id).maybeSingle();
    if (!asset) throw new Error("asset_not_found");
    if (asset.status !== "UPLOADING") throw new Error("asset_not_reviewable");
    const { data: blob, error: downloadError } = await service.storage.from(
      "goal-cover-quarantine",
    ).download(asset.quarantine_path);
    if (downloadError || !blob) throw new Error("asset_not_found");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (
      bytes.length < 1 || bytes.length > COVER_MAX_BYTES ||
      bytes.length !== Number(asset.byte_size)
    ) {
      throw new Error(
        bytes.length > COVER_MAX_BYTES ? "file_too_large" : "invalid_file_size",
      );
    }
    const actualMime = detectImageMime(bytes);
    if (!actualMime || actualMime !== asset.mime_type) {
      throw new Error("unsupported_media_type");
    }
    const actualHash = await sha256Hex(bytes);
    if (actualHash !== expectedHash || actualHash !== asset.content_sha256) {
      throw new Error("hash_mismatch");
    }
    const { error: updateError } = await service.from("goal_cover_asset")
      .update({ status: "REVIEW" }).eq("id", assetId).eq("status", "UPLOADING");
    if (updateError) throw new Error("asset_finalize_failed");
    return coverJson(200, {
      asset_id: assetId,
      status: "REVIEW",
      active_cover_changed: false,
    });
  } catch (error) {
    const code = error instanceof Error
      ? error.message
      : "cover_finalize_failed";
    return coverJson(coverErrorStatus(code), { error: { code } });
  }
});
