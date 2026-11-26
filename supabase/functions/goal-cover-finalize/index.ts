import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  COVER_CORS_HEADERS,
  COVER_MAX_BYTES,
  coverErrorStatus,
  coverJson,
  detectImageMime,
  sha256Hex,
} from "../_shared/goal-cover.ts";
import { sendSlackAlert } from "../_shared/slack.ts";
import {
  goalCoverAdminUrl,
  notifyGoalCoverPublished,
} from "../_shared/goal-cover-alert.ts";

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
  let copiedPath: string | null = null;
  let service: ReturnType<typeof createClient> | null = null;
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
    service = createClient(
      url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user } } = await caller.auth.getUser();
    if (!user) throw new Error("auth_required");
    const { data: asset } = await service.from("goal_cover_asset").select(
      "id,goal_id,owner_member_id,quarantine_path,status,content_sha256,mime_type,byte_size",
    ).eq("id", assetId).eq("owner_member_id", user.id).maybeSingle();
    if (!asset) throw new Error("asset_not_found");
    const coverAsset = asset as {
      id: string;
      goal_id: number;
      owner_member_id: string;
      quarantine_path: string;
      status: string;
      content_sha256: string;
      mime_type: string;
      byte_size: number;
    };
    if (coverAsset.status !== "UPLOADING") throw new Error("asset_not_reviewable");
    const { data: blob, error: downloadError } = await service.storage.from(
      "goal-cover-quarantine",
    ).download(coverAsset.quarantine_path);
    if (downloadError || !blob) throw new Error("asset_not_found");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (
      bytes.length < 1 || bytes.length > COVER_MAX_BYTES ||
      bytes.length !== Number(coverAsset.byte_size)
    ) {
      throw new Error(
        bytes.length > COVER_MAX_BYTES ? "file_too_large" : "invalid_file_size",
      );
    }
    const actualMime = detectImageMime(bytes);
    if (!actualMime || actualMime !== coverAsset.mime_type) {
      throw new Error("unsupported_media_type");
    }
    const actualHash = await sha256Hex(bytes);
    if (actualHash !== expectedHash || actualHash !== coverAsset.content_sha256) {
      throw new Error("hash_mismatch");
    }
    const { data: goal, error: goalError } = await service.from("goal")
      .select("visibility,title").eq("id", coverAsset.goal_id).maybeSingle();
    if (goalError || !goal) throw new Error("asset_not_found");
    const coverGoal = goal as { visibility: string; title: string };
    let publicUrl: string | null = null;
    if (coverGoal.visibility === "PUBLIC") {
      const extension = coverAsset.quarantine_path.split(".").pop() ?? "webp";
      const candidatePath = `${coverAsset.goal_id}/${coverAsset.id}.${extension}`;
      const { error: copyError } = await service.storage.from("goal-cover-public")
        .upload(candidatePath, blob, { contentType: coverAsset.mime_type, upsert: true });
      if (copyError) throw new Error("public_copy_failed");
      copiedPath = candidatePath;
      const { data: published } = service.storage.from("goal-cover-public")
        .getPublicUrl(copiedPath);
      publicUrl = published.publicUrl || null;
      if (!publicUrl) throw new Error("public_copy_failed");
    }
    const { error: publishError } = await service.rpc("auto_publish_goal_cover", {
      p_asset_id: assetId,
      p_owner_id: user.id,
      p_public_path: copiedPath,
    });
    if (publishError) throw new Error("asset_finalize_failed");
    await notifyGoalCoverPublished(sendSlackAlert, {
      assetId,
      goalId: coverAsset.goal_id,
      visibility: coverGoal.visibility,
      adminUrl: goalCoverAdminUrl(
        Deno.env.get("NEXT_PUBLIC_APP_URL") ?? undefined,
      ),
    });
    return coverJson(200, {
      asset_id: assetId,
      status: "APPROVED",
      active_cover_changed: true,
      public_url: publicUrl,
    });
  } catch (error) {
    if (copiedPath && service) {
      const { error: cleanupError } = await service.storage.from("goal-cover-public")
        .remove([copiedPath]);
      if (cleanupError) console.error("[goal-cover-finalize] public cleanup failed");
    }
    const code = error instanceof Error
      ? error.message
      : "cover_finalize_failed";
    return coverJson(coverErrorStatus(code), { error: { code } });
  }
});
