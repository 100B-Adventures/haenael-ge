export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_UPLOAD_TTL_SECONDS = 300;
export const COVER_SIGNED_READ_TTL_SECONDS = 120;
export const COVER_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type CoverMime = (typeof COVER_MIME_TYPES)[number];

export type CoverUploadInput = {
  goalId: number;
  fileName: string;
  mimeType: CoverMime;
  byteSize: number;
  contentSha256: string;
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function parseCoverUploadInput(raw: unknown): CoverUploadInput {
  if (!raw || typeof raw !== "object") throw new Error("invalid_request");
  const input = raw as Record<string, unknown>;
  const goalId = Number(input.goal_id);
  const fileName = String(input.file_name ?? "").trim();
  const mimeType = String(input.mime_type ?? "") as CoverMime;
  const byteSize = Number(input.byte_size);
  const contentSha256 = String(input.content_sha256 ?? "");
  if (!Number.isSafeInteger(goalId) || goalId <= 0) {
    throw new Error("goal_not_found");
  }
  if (!fileName || fileName.length > 180) throw new Error("invalid_file_name");
  if (!COVER_MIME_TYPES.includes(mimeType)) {
    throw new Error("unsupported_media_type");
  }
  if (!Number.isSafeInteger(byteSize) || byteSize < 1) {
    throw new Error("invalid_file_size");
  }
  if (byteSize > COVER_MAX_BYTES) throw new Error("file_too_large");
  if (!SHA256_PATTERN.test(contentSha256)) {
    throw new Error("invalid_content_hash");
  }
  return { goalId, fileName, mimeType, byteSize, contentSha256 };
}

export function extensionForMime(mime: CoverMime): "jpg" | "png" | "webp" {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  return "webp";
}

export function detectImageMime(bytes: Uint8Array): CoverMime | null {
  if (
    bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) return "image/jpeg";
  if (
    bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 &&
    bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d &&
    bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  return null;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const source = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest)).map((value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
}

export const COVER_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function coverJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...COVER_CORS_HEADERS },
  });
}

export function coverErrorStatus(code: string): number {
  if (code === "auth_required") return 401;
  if (code === "goal_forbidden" || code === "admin_forbidden") return 403;
  if (code === "goal_not_found" || code === "asset_not_found") return 404;
  if (code === "file_too_large") return 413;
  if (code === "unsupported_media_type") return 415;
  if (code === "hash_mismatch" || code.startsWith("invalid_")) return 422;
  if (code === "asset_not_reviewable") return 409;
  return 500;
}
