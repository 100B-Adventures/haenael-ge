import {
  COVER_MAX_BYTES,
  COVER_MIME_TYPES,
  type CoverMime,
  extensionForMime,
} from "./goal-cover.ts";

export const PROFILE_AVATAR_BUCKET = "profile-avatars";
export const PROFILE_AVATAR_MAX_BYTES = COVER_MAX_BYTES;
export const PROFILE_AVATAR_MIME_TYPES = COVER_MIME_TYPES;
// Supabase createSignedUploadUrl tokens are valid for 2 hours.
export const PROFILE_AVATAR_UPLOAD_TTL_SECONDS = 2 * 60 * 60;

export const PROFILE_IMAGE_PRESETS = [
  "/images/social-viral/seoyeon.png",
  "/images/social-viral/dogyeong.png",
  "/images/social-viral/jimin.png",
  "/images/social-viral/supporter.png",
] as const;

type SaveProfileInput = {
  action: "save";
  nickname: string;
  bio: string | null;
  profileImage: string | null;
};

type SignAvatarInput = {
  action: "sign_avatar";
  fileName: string;
  mimeType: CoverMime;
  byteSize: number;
  contentSha256: string;
};

type FinalizeAvatarInput = {
  action: "finalize_avatar";
  assetId: string;
  contentSha256: string;
};

export type ProfileRequest =
  | SaveProfileInput
  | SignAvatarInput
  | FinalizeAvatarInput;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseProfileRequest(raw: unknown): ProfileRequest {
  if (!raw || typeof raw !== "object") throw new Error("invalid_request");
  const input = raw as Record<string, unknown>;
  const action = String(input.action ?? "");

  if (action === "save") {
    if (typeof input.nickname !== "string") throw new Error("invalid_nickname");
    const nickname = input.nickname.trim();
    if (nickname.length < 1 || nickname.length > 30) {
      throw new Error("invalid_nickname");
    }
    if (input.bio !== null && typeof input.bio !== "string") {
      throw new Error("invalid_bio");
    }
    const bio = typeof input.bio === "string" ? input.bio.trim() || null : null;
    if (bio && (bio.length > 80 || /[\u0000-\u001f\u007f]/u.test(bio))) {
      throw new Error("invalid_bio");
    }
    if (input.profile_image !== null && typeof input.profile_image !== "string") {
      throw new Error("invalid_profile_image");
    }
    const profileImage = typeof input.profile_image === "string"
      ? input.profile_image.trim() || null
      : null;
    if (profileImage && profileImage.length > 2048) {
      throw new Error("invalid_profile_image");
    }
    return { action, nickname, bio, profileImage };
  }

  if (action === "sign_avatar") {
    const fileName = String(input.file_name ?? "").trim();
    const mimeType = String(input.mime_type ?? "") as CoverMime;
    const byteSize = Number(input.byte_size);
    const contentSha256 = String(input.content_sha256 ?? "");
    if (!fileName || fileName.length > 180) throw new Error("invalid_file_name");
    if (!PROFILE_AVATAR_MIME_TYPES.includes(mimeType)) {
      throw new Error("unsupported_media_type");
    }
    if (!Number.isSafeInteger(byteSize) || byteSize < 1) {
      throw new Error("invalid_file_size");
    }
    if (byteSize > PROFILE_AVATAR_MAX_BYTES) throw new Error("file_too_large");
    if (!SHA256_PATTERN.test(contentSha256)) {
      throw new Error("invalid_content_hash");
    }
    return { action, fileName, mimeType, byteSize, contentSha256 };
  }

  if (action === "finalize_avatar") {
    const assetId = String(input.asset_id ?? "");
    const contentSha256 = String(input.content_sha256 ?? "");
    if (!UUID_PATTERN.test(assetId) || !SHA256_PATTERN.test(contentSha256)) {
      throw new Error("invalid_request");
    }
    return { action, assetId, contentSha256 };
  }

  throw new Error("invalid_action");
}

export function avatarObjectPath(
  userId: string,
  assetId: string,
  mimeType: CoverMime,
): string {
  return `${userId}/${assetId}.${extensionForMime(mimeType)}`;
}

export const PROFILE_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function profileJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...PROFILE_CORS_HEADERS },
  });
}

export function profileErrorStatus(code: string): number {
  if (code === "auth_required") return 401;
  if (code === "profile_not_found" || code === "avatar_asset_not_found") return 404;
  if (code === "file_too_large") return 413;
  if (code === "unsupported_media_type") return 415;
  if (code === "avatar_asset_not_finalizable") return 409;
  if (
    code === "hash_mismatch" || code.startsWith("invalid_") ||
    code === "file_size_mismatch"
  ) return 422;
  return 500;
}

