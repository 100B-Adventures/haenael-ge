import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service";

type SessionRow = {
  id: string;
  intent_id: string;
  member_id: string;
  order_id: string;
  return_url: string;
  expires_at: string;
};
type IntentRow = {
  supporter_member_id: string;
  account_binding: string;
  product_id: string;
  clover_amount: number;
  provider: string;
  status: string;
  expires_at: string;
};
type CatalogRow = {
  product_id: string;
  clover_amount: number;
  gross_amount_minor: number;
  currency: string;
  active: boolean;
};

export async function loadAlternativeCheckoutSession(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  // The migration and runtime route land together. The generated application
  // Database type is refreshed at release packaging, so this server-only
  // client intentionally uses the untyped Supabase surface for the new table.
  const admin = createServiceRoleClient() as unknown as SupabaseClient;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: rawSession } = await admin.from("alternative_checkout_session")
    .select("id,intent_id,member_id,order_id,return_url,expires_at")
    .eq("token_hash", tokenHash).maybeSingle();
  const session = rawSession as SessionRow | null;
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) return null;
  const [{ data: rawIntent }, { data: rawCatalog }] = await Promise.all([
    admin.from("store_purchase_intent").select(
      "supporter_member_id,account_binding,product_id,clover_amount,provider,status,expires_at",
    ).eq("id", session.intent_id).maybeSingle(),
    admin.from("store_product_catalog").select(
      "product_id,clover_amount,gross_amount_minor,currency,active",
    ).eq("provider", "GOOGLE_ALTERNATIVE").eq("active", true),
  ]);
  const intent = rawIntent as IntentRow | null;
  const catalog = (rawCatalog as CatalogRow[] | null)?.find(
    (row) => row.product_id === intent?.product_id,
  );
  if (
    !intent || !catalog || intent.supporter_member_id !== session.member_id ||
    intent.provider !== "GOOGLE_ALTERNATIVE" || intent.status !== "CREATED" ||
    intent.clover_amount !== catalog.clover_amount || catalog.currency !== "KRW" ||
    new Date(intent.expires_at).getTime() <= Date.now()
  ) return null;
  await admin.from("alternative_checkout_session").update({ opened_at: new Date().toISOString() })
    .eq("id", session.id);
  return { session, intent, catalog };
}
