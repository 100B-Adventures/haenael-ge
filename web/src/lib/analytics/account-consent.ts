import { createClient } from "@/lib/supabase/client";
import {
  type AnalyticsConsent,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "@/lib/analytics/consent";

function isAnalyticsConsent(value: unknown): value is AnalyticsConsent {
  return value === "granted" || value === "denied";
}

function isMissingSession(error: { name?: string; code?: string } | null): boolean {
  return error?.name === "AuthSessionMissingError" || error?.code === "session_not_found";
}

export function hasSupabaseBrowserConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function resolveAnalyticsConsentFromAccount(): Promise<AnalyticsConsent | null> {
  const localConsent = getAnalyticsConsent();
  if (!hasSupabaseBrowserConfig()) return localConsent;
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return localConsent;

  const { data: member, error: readError } = await supabase
    .from("member")
    .select("analytics_consent")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (readError) return localConsent;

  if (isAnalyticsConsent(member?.analytics_consent)) {
    if (member.analytics_consent !== localConsent) setAnalyticsConsent(member.analytics_consent);
    return member.analytics_consent;
  }

  if (localConsent) {
    const { data: updated, error: updateError } = await supabase
      .from("member")
      .update({ analytics_consent: localConsent })
      .eq("id", authData.user.id)
      .select("analytics_consent")
      .maybeSingle();
    if (!updateError && updated?.analytics_consent === localConsent) return localConsent;
  }

  return null;
}

export async function persistAnalyticsConsent(consent: AnalyticsConsent): Promise<void> {
  if (!hasSupabaseBrowserConfig()) {
    setAnalyticsConsent(consent);
    return;
  }
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && !isMissingSession(authError)) throw new Error("AUTH_LOOKUP_FAILED");

  if (authData.user) {
    const { data: updated, error: updateError } = await supabase
      .from("member")
      .update({ analytics_consent: consent })
      .eq("id", authData.user.id)
      .select("analytics_consent")
      .maybeSingle();
    if (updateError || updated?.analytics_consent !== consent) {
      throw new Error("ACCOUNT_CONSENT_SAVE_FAILED");
    }
  }

  setAnalyticsConsent(consent);
}
