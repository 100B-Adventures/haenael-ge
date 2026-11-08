import type { SupabaseClient } from "@supabase/supabase-js";

export const GOAL_COVER_MAX_BYTES = 5 * 1024 * 1024;

export type GoalCoverUploadFailureStage =
  | "format"
  | "sign"
  | "put"
  | "finalize";

export type GoalCoverUploadResult =
  | { ok: true }
  | {
      ok: false;
      stage: GoalCoverUploadFailureStage;
      code: string;
      status: number | null;
    };

export function isValidGoalCoverFile(file: File) {
  return Boolean(
    file.type.match(/^image\/(jpeg|png|webp)$/) &&
      file.size >= 1 &&
      file.size <= GOAL_COVER_MAX_BYTES,
  );
}

function functionStatus(error: unknown) {
  const context = (error as { context?: unknown } | null)?.context;
  return context instanceof Response ? context.status : null;
}

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadGoalCoverFile(
  supabase: SupabaseClient,
  goalId: number,
  file: File,
): Promise<GoalCoverUploadResult> {
  if (!isValidGoalCoverFile(file)) {
    return { ok: false, stage: "format", code: "invalid_file", status: null };
  }

  let contentSha256: string;
  try {
    contentSha256 = await sha256Hex(file);
  } catch {
    return { ok: false, stage: "sign", code: "hash_failed", status: null };
  }

  let signData: { upload_url?: string; asset_id?: string } | null = null;
  try {
    const { data, error: signError } = await supabase.functions.invoke(
      "goal-cover-sign-upload",
      {
        body: {
          goal_id: goalId,
          file_name: file.name,
          mime_type: file.type,
          byte_size: file.size,
          content_sha256: contentSha256,
        },
      },
    );
    if (signError || !data?.upload_url || !data?.asset_id) {
      return {
        ok: false,
        stage: "sign",
        code: signError ? "edge_function_error" : "invalid_sign_response",
        status: functionStatus(signError),
      };
    }
    signData = data;
  } catch {
    return { ok: false, stage: "sign", code: "network_error", status: null };
  }

  if (!signData?.upload_url || !signData.asset_id) {
    return { ok: false, stage: "sign", code: "invalid_sign_response", status: null };
  }

  try {
    const uploadResponse = await fetch(signData.upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.type, "x-upsert": "false" },
      body: file,
    });
    if (!uploadResponse.ok) {
      return {
        ok: false,
        stage: "put",
        code: "storage_put_failed",
        status: uploadResponse.status,
      };
    }
  } catch {
    return { ok: false, stage: "put", code: "network_error", status: null };
  }

  try {
    const { error: finalizeError } = await supabase.functions.invoke(
      "goal-cover-finalize",
      { body: { asset_id: signData.asset_id, content_sha256: contentSha256 } },
    );
    if (finalizeError) {
      return {
        ok: false,
        stage: "finalize",
        code: "edge_function_error",
        status: functionStatus(finalizeError),
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, stage: "finalize", code: "network_error", status: null };
  }
}
