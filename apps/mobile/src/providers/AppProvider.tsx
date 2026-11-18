import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import NetInfo from "@react-native-community/netinfo";
import * as Application from "expo-application";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { appConfig } from "../lib/config";
import { supabase } from "../lib/supabase";
import { discardAccountDeletionIfSessionChanged } from "../lib/account-delete-recovery";
import { decideUpdate, type UpdateDecision } from "../lib/update-policy";

type AppState = {
  session: Session | null;
  loading: boolean;
  online: boolean;
  demoMode: boolean;
  introSeen: boolean;
  update: UpdateDecision;
  markIntroSeen: () => Promise<void>;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [introSeen, setIntroSeen] = useState(false);
  const [update, setUpdate] = useState<UpdateDecision>({ required: false });

  useEffect(() => {
    let mounted = true;
    Promise.all([supabase.auth.getSession(), AsyncStorage.getItem("haenael.intro-seen")]).then(
      async ([auth, seen]) => {
        if (!mounted) return;
        await discardAccountDeletionIfSessionChanged({
          getItem: (key) => SecureStore.getItemAsync(key),
          setItem: (key, value) => SecureStore.setItemAsync(key, value),
          removeItem: (key) => SecureStore.deleteItemAsync(key),
        }, auth.data.session?.user.id ?? null);
        if (!mounted) return;
        setSession(auth.data.session);
        setIntroSeen(seen === "true");
        setLoading(false);
      }
    );
    const auth = supabase.auth.onAuthStateChange((_event, next) => {
      void discardAccountDeletionIfSessionChanged({
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      }, next?.user.id ?? null);
      setSession(next);
    });
    const network = NetInfo.addEventListener((state) => setOnline(state.isConnected !== false));
    return () => {
      mounted = false;
      auth.data.subscription.unsubscribe();
      network();
    };
  }, []);

  useEffect(() => {
    if (!appConfig.minimumVersionUrl) return;
    const controller = new AbortController();
    fetch(appConfig.minimumVersionUrl, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("minimum_version_unavailable"))))
      .then((payload: { minimumVersion: string; storeUrl?: string }) => {
        if (!payload.minimumVersion) return;
        setUpdate(
          decideUpdate(Application.nativeApplicationVersion ?? "0.1.0", {
            minimumVersion: payload.minimumVersion,
            storeUrl: payload.storeUrl || appConfig.storeUrl
          })
        );
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const value = useMemo<AppState>(
    () => ({
      session,
      loading,
      online,
      demoMode: appConfig.demoMode,
      introSeen,
      update,
      markIntroSeen: async () => {
        await AsyncStorage.setItem("haenael.intro-seen", "true");
        setIntroSeen(true);
      }
    }),
    [introSeen, loading, online, session, update]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppProvider is missing");
  return value;
}
