import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "@/providers/AppProvider";
import { UpdateGate } from "@/components/UpdateGate";
import { colors } from "@/lib/tokens";
import { startNativePurchaseRecovery } from "@/lib/native-iap";
import { useEffect } from "react";

function PurchaseRecoveryGate() {
  useEffect(() => startNativePurchaseRecovery(), []);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Head>
          <style>{`button:active, a:active, input:active, [role="button"]:active, [role="tab"]:active, [role="radio"]:active { opacity: 0.76; }`}</style>
        </Head>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper }, animation: "slide_from_right" }} />
        <PurchaseRecoveryGate />
        <UpdateGate />
      </AppProvider>
    </SafeAreaProvider>
  );
}
