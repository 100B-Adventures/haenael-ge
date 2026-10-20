import {
  constantTimeEqual,
  MIN_TOKEN_LENGTH,
  sha256,
} from "./notify-auth.ts";

export type CleanupAuthResult =
  | { ok: true }
  | {
    ok: false;
    status: 401 | 403 | 503;
    code: "auth_required" | "forbidden" | "missing_internal_token";
  };

export async function authorizeCleanupRequest(
  providedToken: string | null,
  expectedToken: string | undefined,
): Promise<CleanupAuthResult> {
  const expected = expectedToken?.trim() ?? "";
  if (expected.length < MIN_TOKEN_LENGTH) {
    return { ok: false, status: 503, code: "missing_internal_token" };
  }

  const provided = providedToken?.trim() ?? "";
  if (!provided) {
    return { ok: false, status: 401, code: "auth_required" };
  }

  const [providedHash, expectedHash] = await Promise.all([
    sha256(provided),
    sha256(expected),
  ]);
  if (!constantTimeEqual(providedHash, expectedHash)) {
    return { ok: false, status: 403, code: "forbidden" };
  }
  return { ok: true };
}
