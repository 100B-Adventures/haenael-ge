import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const appConfig = {
  supabaseUrl,
  supabaseAnonKey,
  demoMode:
    process.env.EXPO_PUBLIC_DEMO_MODE === "true" ||
    !supabaseUrl ||
    !supabaseAnonKey,
  minimumVersionUrl: process.env.EXPO_PUBLIC_MINIMUM_VERSION_URL?.trim() ?? "",
  tossCheckoutUrl: process.env.EXPO_PUBLIC_TOSS_CHECKOUT_URL?.trim() ?? "",
  storeUrl:
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_IOS_STORE_URL?.trim() ?? ""
      : process.env.EXPO_PUBLIC_ANDROID_STORE_URL?.trim() ?? ""
};
