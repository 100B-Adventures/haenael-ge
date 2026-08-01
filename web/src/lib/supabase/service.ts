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

export function getCashoutAccountEncryptionKey() {
  // 계약 W-12: Vercel Preview/Development에는 이 키를 등록하지 않는다.
  // 실수로 연결돼도 preview 런타임에서는 사용을 거부한다. 로컬 검증은 VERCEL_ENV가 없다.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    throw new Error("cashout_encryption_unavailable");
  }
  const key = process.env.CASHOUT_ACCOUNT_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("cashout_encryption_unavailable");
  }
  return key;
}

export function isCashoutEnabled() {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return false;
  }
  return process.env.CASHOUT_ENABLED === "true";
}
