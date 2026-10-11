// auth-kakao 보안 경계를 Deno.serve에서 분리한 순수 함수.
// Vitest에서 실제 분기 계약을 검증하고 Edge Function은 이 함수를 그대로 호출한다.

interface AuthUserRecord {
  id: string;
  email?: string | null;
}

interface AuthOperationError {
  message?: string;
}

interface StoredUserResult {
  user: AuthUserRecord | null;
  error: AuthOperationError | null;
}

interface GeneratedLinkResult {
  user: AuthUserRecord | null;
  hashedToken: string | null;
  error: AuthOperationError | null;
}

export interface MagicLinkAdminPort {
  getUserById(userId: string): Promise<StoredUserResult>;
  generateMagicLink(email: string): Promise<GeneratedLinkResult>;
}

export function assertProviderLookupSucceeded(
  error: AuthOperationError | null,
): void {
  if (error) {
    throw new Error("provider lookup failed");
  }
}

export async function rollbackCreatedAuthUser(
  createdAuthUser: boolean,
  userId: string,
  deleteUser: (userId: string) => Promise<{ error: AuthOperationError | null }>,
): Promise<void> {
  if (!createdAuthUser) return;

  const { error } = await deleteUser(userId);
  if (error) {
    throw new Error("new auth user rollback failed");
  }
}

export async function generateVerifiedMagicLink(
  expectedUserId: string,
  admin: MagicLinkAdminPort,
): Promise<string> {
  const stored = await admin.getUserById(expectedUserId);
  if (stored.error || !stored.user || stored.user.id !== expectedUserId) {
    throw new Error("auth user lookup failed");
  }

  const storedEmail = stored.user.email?.trim();
  if (!storedEmail) {
    throw new Error("auth user email missing");
  }

  const generated = await admin.generateMagicLink(storedEmail);
  if (generated.error || !generated.hashedToken || !generated.user) {
    throw new Error("generateLink failed");
  }
  if (generated.user.id !== expectedUserId) {
    throw new Error("generated link user mismatch");
  }

  return generated.hashedToken;
}
