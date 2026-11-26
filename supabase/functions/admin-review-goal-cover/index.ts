import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  COVER_CORS_HEADERS,
  coverErrorStatus,
  coverJson,
} from "../_shared/goal-cover.ts";
import { serveWithGlitchTip } from "../_shared/glitchtip.ts";

const REJECTION_CODES = [
  "adult",
  "violence",
  "personal_info",
  "copyright",
  "other",
];

serveWithGlitchTip("admin-review-goal-cover", async (req) => {
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
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json() as Record<string, unknown>;
    const assetId = String(body.asset_id ?? "");
    const decision = String(body.decision ?? "");
    const rejectionCode = body.rejection_code == null
      ? null
      : String(body.rejection_code);
    if (
      !/^[0-9a-f-]{36}$/.test(assetId) ||
      !["APPROVE", "REJECT", "REMOVE"].includes(decision)
    ) throw new Error("invalid_request");
    if (
      decision === "REJECT" &&
      (!rejectionCode || !REJECTION_CODES.includes(rejectionCode))
    ) throw new Error("invalid_rejection_code");
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) throw new Error("auth_required");
    const { data: isAdmin } = await caller.rpc("is_admin");
    if (!isAdmin) throw new Error("admin_forbidden");
    const { data: asset, error: assetError } = await service.from(
      "goal_cover_asset",
    ).select(
      "id,goal_id,quarantine_path,mime_type,status",
    ).eq("id", assetId).maybeSingle();
    if (assetError || !asset) throw new Error("asset_not_found");
    if (decision === "REMOVE") {
      if (asset.status !== "APPROVED") throw new Error("asset_not_removable");
      const { data: result, error: removeError } = await service.rpc(
        "admin_remove_goal_cover",
        { p_asset_id: assetId, p_admin_id: user.id },
      );
      if (removeError) {
        throw new Error(
          removeError.message.includes("asset_not_removable")
            ? "asset_not_removable"
            : "review_apply_failed",
        );
      }
      const publicPath = result?.public_path;
      if (typeof publicPath === "string" && publicPath) {
        await service.storage.from("goal-cover-public").remove([publicPath]);
      }
      return coverJson(200, result);
    }
    if (asset.status !== "REVIEW") throw new Error("asset_not_reviewable");
    const { data: goal, error: goalError } = await service.from("goal")
      .select("visibility").eq("id", asset.goal_id).maybeSingle();
    if (goalError || !goal) throw new Error("asset_not_found");
    if (decision === "APPROVE" && goal?.visibility === "PUBLIC") {
      const extension = asset.quarantine_path.split(".").pop() ?? "webp";
      const candidatePath = `${asset.goal_id}/${asset.id}.${extension}`;
      const { data: source, error: sourceError } = await service.storage.from(
        "goal-cover-quarantine",
      ).download(asset.quarantine_path);
      if (sourceError || !source) throw new Error("asset_not_found");
      const { error: copyError } = await service.storage.from(
        "goal-cover-public",
      ).upload(candidatePath, source, {
        contentType: asset.mime_type,
        upsert: true,
      });
      if (copyError) throw new Error("public_copy_failed");
      copiedPath = candidatePath;
      const { data: verified } = service.storage.from("goal-cover-public")
        .getPublicUrl(copiedPath);
      if (!verified.publicUrl) throw new Error("public_copy_failed");
    }
    const { data: result, error: applyError } = await service.rpc(
      "admin_apply_goal_cover_review",
      {
        p_asset_id: assetId,
        p_admin_id: user.id,
        p_decision: decision,
        p_rejection_code: rejectionCode,
        p_public_path: copiedPath,
      },
    );
    if (applyError) {
      throw new Error(
        applyError.message.includes("asset_not_reviewable")
          ? "asset_not_reviewable"
          : applyError.message.includes("asset_stale")
          ? "asset_stale"
          : "review_apply_failed",
      );
    }
    return coverJson(200, result);
  } catch (error) {
    if (copiedPath) {
      const { error: cleanupError } = await service.storage.from("goal-cover-public")
        .remove([copiedPath]);
      if (cleanupError) console.error("[admin-review-goal-cover] public cleanup failed");
    }
    const code = error instanceof Error ? error.message : "cover_review_failed";
    return coverJson(coverErrorStatus(code), { error: { code } });
  }
});
