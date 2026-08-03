import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("admin_service_unavailable");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type CashoutAccountEncryptionConfig = {
  activeVersion: number;
  activeKey: string;
  keys: Record<string, string>;
};

function assertCashoutSecret(value: string | undefined, errorCode: string) {
  if (!value || value.length < 32) {
    throw new Error(errorCode);
  }
  return value;
}

export function getCashoutAccountEncryptionConfig(): CashoutAccountEncryptionConfig {
  // 계약 W-12: Vercel Preview/Development에는 이 키를 등록하지 않는다.
  // 실수로 연결돼도 preview 런타임에서는 사용을 거부한다. 로컬 검증은 VERCEL_ENV가 없다.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    throw new Error("cashout_encryption_unavailable");
  }

  const serializedKeyring = process.env.CASHOUT_ACCOUNT_ENCRYPTION_KEYS;
  const legacyKey = process.env.CASHOUT_ACCOUNT_ENCRYPTION_KEY;
  let keys: Record<string, string>;

  try {
    const parsed = serializedKeyring
      ? JSON.parse(serializedKeyring) as unknown
      : legacyKey
        ? { "1": legacyKey }
        : null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid_keyring");
    }
    keys = Object.fromEntries(
      Object.entries(parsed).map(([version, key]) => {
        if (!/^[1-9][0-9]{0,4}$/.test(version) || Number(version) > 32767) {
          throw new Error("invalid_key_version");
        }
        return [version, assertCashoutSecret(
          typeof key === "string" ? key : undefined,
          "cashout_encryption_unavailable",
        )];
      }),
    );
  } catch {
    throw new Error("cashout_encryption_unavailable");
  }

  const activeVersion = Number(process.env.CASHOUT_ACCOUNT_ACTIVE_KEY_VERSION ?? "1");
  if (!Number.isInteger(activeVersion) || activeVersion < 1 || activeVersion > 32767) {
    throw new Error("cashout_encryption_unavailable");
  }
  const activeKey = keys[String(activeVersion)];
  if (!activeKey) throw new Error("cashout_encryption_unavailable");

  return { activeVersion, activeKey, keys };
}

export function getCashoutAccountFingerprintKey() {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    throw new Error("cashout_fingerprint_unavailable");
  }
  return assertCashoutSecret(
    process.env.CASHOUT_ACCOUNT_FINGERPRINT_KEY,
    "cashout_fingerprint_unavailable",
  );
}

export function isCashoutEnabled() {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return false;
  }
  return process.env.CASHOUT_ENABLED === "true";
}
