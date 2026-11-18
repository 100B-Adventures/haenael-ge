export type AccountDeletionStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const MEMBER_STORAGE_KEY = "haenael.account-deletion-member.v2";

export async function getAccountDeletionMember(
  storage: AccountDeletionStorage,
): Promise<string | null> {
  const value = await storage.getItem(MEMBER_STORAGE_KEY);
  return value?.trim() || null;
}

export async function beginAccountDeletionForMember(
  storage: AccountDeletionStorage,
  memberId: string,
): Promise<void> {
  const current = await getAccountDeletionMember(storage);
  if (current && current !== memberId) await storage.removeItem(MEMBER_STORAGE_KEY);
  await storage.setItem(MEMBER_STORAGE_KEY, memberId);
}

export async function clearAccountDeletionMember(
  storage: AccountDeletionStorage,
): Promise<void> {
  await storage.removeItem(MEMBER_STORAGE_KEY);
}

export async function discardAccountDeletionIfSessionChanged(
  storage: AccountDeletionStorage,
  currentMemberId: string | null,
): Promise<void> {
  const deletionMemberId = await getAccountDeletionMember(storage);
  if (deletionMemberId && deletionMemberId !== currentMemberId) {
    await clearAccountDeletionMember(storage);
  }
}

type AccountDeletionAttempt =
  | { ok: true }
  | { ok: false; code?: string; error?: unknown };

export async function retryAccountDeletionAfterAppleReauthentication(args: {
  memberId: string;
  storage: AccountDeletionStorage;
  invokeDelete(): Promise<AccountDeletionAttempt>;
  reauthenticateApple(): Promise<{ memberId: string }>;
}): Promise<void> {
  let result = await args.invokeDelete();
  if (result.ok) return;
  if (result.code !== "apple_reauthentication_required") {
    throw result.error ?? new Error(result.code ?? "account_delete_failed");
  }
  const reauthenticated = await args.reauthenticateApple();
  if (reauthenticated.memberId !== args.memberId) {
    await clearAccountDeletionMember(args.storage);
    throw new Error("account_session_changed");
  }
  result = await args.invokeDelete();
  if (!result.ok) {
    throw result.error ?? new Error(result.code ?? "account_delete_failed");
  }
}
