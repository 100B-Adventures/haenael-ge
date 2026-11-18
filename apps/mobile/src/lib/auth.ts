import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";
import { AppError } from "./errors";

WebBrowser.maybeCompleteAuthSession();

async function exchangeAppleSession(requireRevocationCredential: boolean) {
  const redirectTo = Linking.createURL("/auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo, skipBrowserRedirect: true }
  });
  if (error || !data.url) throw new AppError("apple_login_failed", "Apple 로그인을 시작하지 못했어요.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") throw new AppError("apple_login_cancelled", "Apple 로그인이 취소됐어요.");
  const code = new URL(result.url).searchParams.get("code");
  if (!code) throw new AppError("apple_login_invalid", "로그인 응답을 확인하지 못했어요.");
  const exchanged = await supabase.auth.exchangeCodeForSession(code);
  if (exchanged.error) throw new AppError("apple_login_failed", "Apple 로그인을 완료하지 못했어요.");
  const session = exchanged.data.session;
  const providerToken = session?.provider_refresh_token ?? session?.provider_token;
  const tokenTypeHint = session?.provider_refresh_token ? "refresh_token" : "access_token";
  if (providerToken) {
    const registered = await supabase.functions.invoke("register-apple-revocation-token", {
      body: { provider_token: providerToken, token_type_hint: tokenTypeHint },
    });
    if (registered.error) {
      throw new AppError(
        "apple_token_registration_failed",
        "Apple 로그인 보안 처리를 완료하지 못했어요. 다시 시도해 주세요.",
      );
    }
  } else if (requireRevocationCredential) {
    throw new AppError(
      "apple_reauthentication_required",
      "계정 삭제를 위해 Apple 로그인을 한 번 더 확인해 주세요.",
    );
  }
  return session;
}

export async function signInWithApple() {
  try {
    return await exchangeAppleSession(false);
  } catch (error) {
    if (error instanceof AppError && error.code === "apple_token_registration_failed") {
      await supabase.auth.signOut({ scope: "local" });
    }
    throw error;
  }
}

export async function reauthenticateAppleForDeletion(): Promise<void> {
  await exchangeAppleSession(true);
}

export async function sendMagicLink(email: string) {
  const value = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(value)) throw new AppError("email_invalid", "이메일 주소를 확인해 주세요.");
  const { error } = await supabase.auth.signInWithOtp({
    email: value,
    options: { emailRedirectTo: Linking.createURL("/auth/callback") }
  });
  if (error) throw new AppError("magic_link_failed", "로그인 메일을 보내지 못했어요.");
}
