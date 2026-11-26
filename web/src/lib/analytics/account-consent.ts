import { createClient } from "@/lib/supabase/client";
import {
  type AnalyticsConsent,
  clearAnalyticsConsent,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "@/lib/analytics/consent";

export type AnalyticsConsentAccountState = {
  consent: AnalyticsConsent | null;
  isAuthenticated: boolean;
};

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

export async function resolveAnalyticsConsentStateFromAccount(): Promise<AnalyticsConsentAccountState> {
  const localConsent = getAnalyticsConsent();
  if (!hasSupabaseBrowserConfig()) {
    return { consent: null, isAuthenticated: false };
  }
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    clearAnalyticsConsent();
    return { consent: null, isAuthenticated: false };
  }

  const { data: member, error: readError } = await supabase
    .from("member")
    .select("analytics_consent")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (readError) {
    if (localConsent === "granted") clearAnalyticsConsent();
    return {
      consent: localConsent === "denied" ? "denied" : null,
      isAuthenticated: true,
    };
  }

  if (isAnalyticsConsent(member?.analytics_consent)) {
    if (member.analytics_consent !== localConsent) setAnalyticsConsent(member.analytics_consent);
    return { consent: member.analytics_consent, isAuthenticated: true };
  }

  if (localConsent === "denied") {
    const { data: updated, error: updateError } = await supabase
      .from("member")
      .update({ analytics_consent: "denied" })
      .eq("id", authData.user.id)
      .select("analytics_consent")
      .maybeSingle();
    if (!updateError && updated?.analytics_consent === "denied") {
      return { consent: "denied", isAuthenticated: true };
    }
  }

  if (localConsent === "granted") clearAnalyticsConsent();
  return { consent: null, isAuthenticated: true };
}

export async function resolveAnalyticsConsentFromAccount(): Promise<AnalyticsConsent | null> {
  return (await resolveAnalyticsConsentStateFromAccount()).consent;
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
