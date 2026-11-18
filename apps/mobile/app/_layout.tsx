import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "@/providers/AppProvider";
import { UpdateGate } from "@/components/UpdateGate";
import { colors } from "@/lib/tokens";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Head>
          <style>{`button:active, a:active, [role="button"]:active, [role="tab"]:active, [role="radio"]:active { opacity: 0.76; }`}</style>
        </Head>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper }, animation: "slide_from_right" }} />
        <UpdateGate />
      </AppProvider>
    </SafeAreaProvider>
  );
}
