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
  const key = process.env.CASHOUT_ACCOUNT_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("cashout_encryption_unavailable");
  }
  return key;
}
