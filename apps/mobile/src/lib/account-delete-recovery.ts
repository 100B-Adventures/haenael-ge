export type AccountDeletionStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const REQUEST_KEY_STORAGE_KEY = "haenael.account-deletion-request.v1";

export async function getOrCreateAccountDeletionRequestKey(
  storage: AccountDeletionStorage,
  create: () => string,
): Promise<string> {
  const existing = await storage.getItem(REQUEST_KEY_STORAGE_KEY);
  if (existing && /^[A-Za-z0-9_-]{8,128}$/.test(existing)) return existing;
  const next = create();
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(next)) throw new Error("invalid_request_key");
  await storage.setItem(REQUEST_KEY_STORAGE_KEY, next);
  return next;
}

export async function clearAccountDeletionRequestKey(
  storage: AccountDeletionStorage,
): Promise<void> {
  await storage.removeItem(REQUEST_KEY_STORAGE_KEY);
}

type AccountDeletionAttempt =
  | { ok: true }
  | { ok: false; code?: string; error?: unknown };

export async function retryAccountDeletionAfterAppleReauthentication(args: {
  requestKey: string;
  invokeDelete(requestKey: string): Promise<AccountDeletionAttempt>;
  reauthenticateApple(): Promise<void>;
}): Promise<void> {
  let result = await args.invokeDelete(args.requestKey);
  if (result.ok) return;
  if (result.code !== "apple_reauthentication_required") {
    throw result.error ?? new Error(result.code ?? "account_delete_failed");
  }
  await args.reauthenticateApple();
  result = await args.invokeDelete(args.requestKey);
  if (!result.ok) {
    throw result.error ?? new Error(result.code ?? "account_delete_failed");
  }
}
