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
