import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { appConfig } from "./config";

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key)
};

const serverMemory = new Map<string, string>();
const serverStorage = {
  getItem: async (key: string) => serverMemory.get(key) ?? null,
  setItem: async (key: string, value: string) => { serverMemory.set(key, value); },
  removeItem: async (key: string) => { serverMemory.delete(key); }
};

const authStorage = Platform.OS === "web"
  ? typeof window === "undefined" ? serverStorage : AsyncStorage
  : secureStorage;

export const supabase = createClient(
  appConfig.supabaseUrl || "http://127.0.0.1:54321",
  appConfig.supabaseAnonKey || "demo-anon-key",
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce"
    }
  }
);

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
