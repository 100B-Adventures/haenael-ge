import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  COVER_CORS_HEADERS,
  coverErrorStatus,
  coverJson,
} from "../_shared/goal-cover.ts";

const REJECTION_CODES = [
  "adult",
  "violence",
  "personal_info",
  "copyright",
  "other",
];

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
      !["APPROVE", "REJECT"].includes(decision)
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
    const { data: asset } = await service.from("goal_cover_asset").select(
      "id,goal_id,quarantine_path,mime_type,status,goal!inner(visibility)",
    ).eq("id", assetId).maybeSingle();
    if (!asset) throw new Error("asset_not_found");
    if (asset.status !== "REVIEW") throw new Error("asset_not_reviewable");
    const goal = Array.isArray(asset.goal) ? asset.goal[0] : asset.goal;
    if (decision === "APPROVE" && goal?.visibility === "PUBLIC") {
      const extension = asset.quarantine_path.split(".").pop() ?? "webp";
      copiedPath = `${asset.goal_id}/${asset.id}.${extension}`;
      const { data: source, error: sourceError } = await service.storage.from(
        "goal-cover-quarantine",
      ).download(asset.quarantine_path);
      if (sourceError || !source) throw new Error("asset_not_found");
      const { error: copyError } = await service.storage.from(
        "goal-cover-public",
      ).upload(copiedPath, source, {
        contentType: asset.mime_type,
        upsert: false,
      });
      if (copyError) throw new Error("public_copy_failed");
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
          : "review_apply_failed",
      );
    }
    return coverJson(200, result);
  } catch (error) {
    if (copiedPath) {
      await service.storage.from("goal-cover-public").remove([copiedPath]);
    }
    const code = error instanceof Error ? error.message : "cover_review_failed";
    return coverJson(coverErrorStatus(code), { error: { code } });
  }
});
