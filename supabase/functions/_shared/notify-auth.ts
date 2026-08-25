export type NotifyAuthResult =
  | { ok: true }
  | {
    ok: false;
    status: 401 | 403 | 503;
    code: "unauthorized" | "forbidden" | "missing_notify_internal_token";
    message: string;
  };

const MIN_TOKEN_LENGTH = 32;

async function sha256(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }
  return mismatch === 0;
}

export async function authorizeNotifyRequest(
  providedToken: string | null,
  expectedToken: string | undefined,
): Promise<NotifyAuthResult> {
  const expected = expectedToken?.trim() ?? "";
  if (expected.length < MIN_TOKEN_LENGTH) {
    return {
      ok: false,
      status: 503,
      code: "missing_notify_internal_token",
      message: "Notify internal token missing",
    };
  }

  const provided = providedToken?.trim() ?? "";
  if (!provided) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      message: "Internal notify token required",
    };
  }

  const [providedHash, expectedHash] = await Promise.all([
    sha256(provided),
    sha256(expected),
  ]);
  if (!constantTimeEqual(providedHash, expectedHash)) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      message: "Internal notify token required",
    };
  }

  return { ok: true };
}
