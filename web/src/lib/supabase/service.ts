import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isLocalSupabase = Boolean(
    supabaseUrl && ["127.0.0.1", "localhost"].includes(new URL(supabaseUrl).hostname),
  );
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ??
    (isLocalSupabase ? process.env.SERVICE_ROLE_KEY : undefined);
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

const CASHOUT_STAGING_TEST_ORIGIN = "https://ezzklgotgydwxqebfoys.supabase.co";

type CashoutRuntimeMode = "standard" | "staging-test" | "disabled-preview";

function cashoutRuntimeMode(): CashoutRuntimeMode {
  if (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production") {
    return "standard";
  }
  if (process.env.VERCEL_ENV !== "preview") return "disabled-preview";

  try {
    const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
    return origin === CASHOUT_STAGING_TEST_ORIGIN &&
      process.env.CASHOUT_STAGING_TEST_ENABLED === "true"
      ? "staging-test"
      : "disabled-preview";
  } catch {
    return "disabled-preview";
  }
}

function assertCashoutSecret(value: string | undefined, errorCode: string) {
  if (!value || value.length < 32) {
    throw new Error(errorCode);
  }
  return value;
}

export function getCashoutAccountEncryptionConfig(): CashoutAccountEncryptionConfig {
  const mode = cashoutRuntimeMode();
  if (mode === "disabled-preview") {
    throw new Error("cashout_encryption_unavailable");
  }

  // D-053: 격리 staging은 운영 이름의 키를 읽거나 fallback하지 않는다.
  if (mode === "staging-test") {
    const activeKey = assertCashoutSecret(
      process.env.CASHOUT_STAGING_TEST_ACCOUNT_ENCRYPTION_KEY,
      "cashout_encryption_unavailable",
    );
    return { activeVersion: 1, activeKey, keys: { "1": activeKey } };
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
  const mode = cashoutRuntimeMode();
  if (mode === "disabled-preview") {
    throw new Error("cashout_fingerprint_unavailable");
  }
  if (mode === "staging-test") {
    return assertCashoutSecret(
      process.env.CASHOUT_STAGING_TEST_ACCOUNT_FINGERPRINT_KEY,
      "cashout_fingerprint_unavailable",
    );
  }
  return assertCashoutSecret(
    process.env.CASHOUT_ACCOUNT_FINGERPRINT_KEY,
    "cashout_fingerprint_unavailable",
  );
}

export function isCashoutEnabled() {
  const mode = cashoutRuntimeMode();
  if (mode === "disabled-preview") return false;
  if (mode === "staging-test") return true;
  return process.env.CASHOUT_ENABLED === "true";
}

export function isCashoutStagingTestMode() {
  return cashoutRuntimeMode() === "staging-test";
}

const MEMBER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * D-017 temporary cashout gate.
 *
 * The allowlist is intentionally server-only and deny-by-default. A global
 * feature switch can stop cashout for everyone, but turning it on must never
 * grant access to every authenticated account while the tax contract remains
 * unresolved.
 */
export function isCashoutAllowedMember(memberId: string) {
  if (!isCashoutEnabled() || !MEMBER_ID_PATTERN.test(memberId)) return false;

  const stagingTest = isCashoutStagingTestMode();
  if (stagingTest) {
    try {
      getCashoutAccountEncryptionConfig();
      getCashoutAccountFingerprintKey();
    } catch {
      return false;
    }
  }

  const allowlistName = stagingTest
    ? "CASHOUT_STAGING_TEST_ALLOWED_MEMBER_IDS"
    : "CASHOUT_ALLOWED_MEMBER_IDS";
  const rawEntries = (process.env[allowlistName] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowedMemberIds = rawEntries.filter((value) => MEMBER_ID_PATTERN.test(value));
  const invalidCount = rawEntries.length - allowedMemberIds.length;
  if (invalidCount > 0) {
    console.warn("[cashout-gate] invalid allowlist member ids ignored", {
      invalidCount,
    });
  }
  // 전역 스위치가 켜졌는데 허용 목록이 비면 전원 거부다. 운영자가 스위치만 켜고
  // 목록을 잊으면 아무도 모르므로 그 조합을 로그로 드러낸다(교차 리뷰 지적).
  if (allowedMemberIds.length === 0) {
    console.warn("[cashout-gate] cashout is enabled but the allowlist is empty: denying everyone");
  }

  return new Set(allowedMemberIds).has(memberId.toLowerCase());
}
